import type {
  AIProvider,
  AgentDomain,
  AgentInstance,
  AgentThought,
  QueryAnalysis,
  SSEEvent,
  TokenBudgetConfig,
  ReasoningConfig,
  ReasoningBranch,
  VerificationStatus,
} from "@/types";
import { agentRegistry } from "../agents/registry";
import { BaseAgent } from "../agents/base-agent";
import { selectAgents } from "./selector";
import { synthesizeResponses } from "./synthesizer";
import { IACPBus } from "../iacp/bus";
import { ConcurrencyManager } from "../concurrency/manager";
import { withRetry } from "../concurrency/rate-limiter";
import { TokenBudgetTracker } from "../budget/tracker";
import { responseCache } from "@/lib/cache";
import { queryIntelligence } from "@/lib/query-intelligence";
import { metricsTracker } from "@/lib/metrics";

export interface OrchestrateSettings {
  maxAgents: number;
  iacpEnabled: boolean;
  model: string;
  concurrencyLimit: number;
  tokenBudget?: TokenBudgetConfig;
  reasoningConfig?: ReasoningConfig;
}

export class CouncilLeader {
  private provider: AIProvider;
  private settings: OrchestrateSettings;

  constructor(provider: AIProvider, settings: OrchestrateSettings) {
    this.provider = provider;
    this.settings = settings;
  }

  private budgetWarningEmitted = false;

  async orchestrate(
    query: string,
    emit: (event: SSEEvent) => void
  ): Promise<void> {
    const sessionId = `session-${Date.now()}`;
    const startTime = Date.now();
    const budgetConfig = this.settings.tokenBudget;
    const tracker = new TokenBudgetTracker(budgetConfig?.maxTokens ?? 100000);
    const warnThreshold = budgetConfig?.warnThreshold ?? 0.8;
    this.budgetWarningEmitted = false;

    try {
      // ── Cache check ─────────────────────────────────────────────
      const cached = responseCache.get(query);
      if (cached) {
        emit({
          type: "council:cache_hit",
          data: {
            query,
            response: cached.response,
            cachedAt: cached.createdAt,
          },
          timestamp: Date.now(),
        });
        emit({
          type: "council:complete",
          data: {
            response: cached.response,
            totalTime: Date.now() - startTime,
            agentsActivated: cached.agentCount,
            agentsSucceeded: cached.agentCount,
            totalTokens: cached.tokenUsage,
          },
          timestamp: Date.now(),
        });
        return;
      }

      // ── Query intelligence ──────────────────────────────────────
      const qi = queryIntelligence.analyzeQuery(query);

      if (qi.isAmbiguous) {
        emit({
          type: "council:clarification_needed",
          data: {
            suggestions: qi.suggestedClarifications,
            reasons: qi.ambiguityReasons,
            complexity: qi.complexity,
          },
          timestamp: Date.now(),
        });
      }

      // Optimise query text for better agent selection
      const optimisedQuery = queryIntelligence.optimizeQuery(query);

      // Phase 1: Start
      emit({
        type: "council:start",
        data: { sessionId, query: optimisedQuery },
        timestamp: Date.now(),
      });

      // Phase 2: Query Analysis
      const analysis = await this.analyzeQuery(optimisedQuery);

      // Use QI complexity to adjust agent count when not explicitly set
      if (qi.estimatedAgentCount > analysis.suggestedAgentCount) {
        analysis.suggestedAgentCount = Math.min(
          qi.estimatedAgentCount,
          this.settings.maxAgents
        );
      }
      emit({
        type: "council:analysis",
        data: { analysis },
        timestamp: Date.now(),
      });

      // Resolve reasoning config with defaults
      const reasoningConfig: ReasoningConfig = {
        depth: this.settings.reasoningConfig?.depth ?? 'standard',
        enableCoT: this.settings.reasoningConfig?.enableCoT ?? false,
        enableVerification: this.settings.reasoningConfig?.enableVerification ?? true,
        maxVerificationRounds: this.settings.reasoningConfig?.maxVerificationRounds ?? 2,
      };
      const branchCount = reasoningConfig.depth === 'quick' ? 1 : reasoningConfig.depth === 'standard' ? 2 : 3;

      // Phase 3: Agent Selection
      const selection = await selectAgents(analysis, this.settings.maxAgents);
      emit({
        type: "council:selecting",
        data: { selection },
        timestamp: Date.now(),
      });

      // Build agent instances
      const allSelectedIds = [
        ...selection.primary,
        ...selection.secondary,
        ...selection.alwaysActive,
      ];
      const agents: AgentInstance[] = [];

      for (let i = 0; i < allSelectedIds.length; i++) {
        const def = agentRegistry.get(allSelectedIds[i]);
        if (!def) continue;

        const role = selection.alwaysActive.includes(def.id)
          ? ("always-active" as const)
          : selection.primary.includes(def.id)
          ? ("primary" as const)
          : ("secondary" as const);

        const instance: AgentInstance = {
          definition: def,
          role,
          status: "waiting",
          thought: null,
          finalResponse: null,
          confidence: null,
          processingTime: null,
          batchIndex: Math.floor(i / this.settings.concurrencyLimit),
          error: null,
        };
        agents.push(instance);

        emit({
          type: "agent:activated",
          data: {
            agentId: def.id,
            agentName: def.name,
            domain: def.domain,
            role,
            batchIndex: instance.batchIndex,
          },
          timestamp: Date.now(),
        });
      }

      // Phase 4: Agent Thinking (with Tree-of-Thought branching)
      const concurrencyManager = new ConcurrencyManager(
        this.settings.concurrencyLimit
      );

      // Store all branches per agent for synthesis context
      const allBranches = new Map<string, ReasoningBranch[]>();

      const thinkTasks = agents.map((agent) => async () => {
        emit({
          type: "agent:thinking",
          data: {
            agentId: agent.definition.id,
            branch: branchCount > 1 ? 1 : undefined,
            totalBranches: branchCount > 1 ? branchCount : undefined,
          },
          timestamp: Date.now(),
        });

        const startMs = Date.now();
        
        // Tree-of-Thought: multi-branch reasoning when depth !== 'quick'
        if (branchCount > 1) {
          const branches = await withRetry(
            () =>
              BaseAgent.thinkMultiplePaths(
                agent.definition,
                query,
                agent.definition.systemPrompt,
                this.provider,
                this.settings.model,
                { branchCount }
              ),
            { maxRetries: 1 }
          );
        
          allBranches.set(agent.definition.id, branches);
        
          // Emit each branch
          for (const branch of branches) {
            emit({
              type: "agent:branch",
              data: {
                agentId: agent.definition.id,
                branch: branch.branch,
                thought: branch.thought.substring(0, 500),
                confidence: branch.confidence,
              },
              timestamp: Date.now(),
            });
          }
        
          // Pick highest-confidence branch
          const best = branches.reduce((a, b) => a.confidence >= b.confidence ? a : b, branches[0]);
          let primaryThought = best.thought;
          let confidence = this.numericToLabel(best.confidence);
        
          // Chain-of-Thought on the primary branch if enabled
          if (reasoningConfig.enableCoT) {
            try {
              const cotResult = await BaseAgent.thinkWithCoT(
                agent.definition,
                query,
                agent.definition.systemPrompt,
                this.provider,
                this.settings.model
              );
              primaryThought = `${cotResult.conclusion}\n\n## Reasoning Steps:\n${cotResult.steps.map(s => `Step ${s.step}: ${s.reasoning} (Confidence: ${s.confidence}/10)`).join('\n')}`;
              confidence = this.numericToLabel(cotResult.overallConfidence);
            } catch {
              // CoT failed, keep the best branch thought
            }
          }
        
          agent.thought = primaryThought;
          agent.confidence = confidence;
          agent.status = "complete";
          agent.processingTime = Date.now() - startMs;
          return { thought: primaryThought, confidence };
        } else {
          // Quick mode: single-branch thinking (original behavior)
          const result = await withRetry(
            () =>
              BaseAgent.think(
                agent.definition,
                query,
                this.provider,
                this.settings.model
              ),
            { maxRetries: 2 }
          );
          agent.thought = result.thought;
          agent.confidence = result.confidence;
          agent.status = "complete";
          agent.processingTime = Date.now() - startMs;
          return result;
        }
      });

      await concurrencyManager.executeBatch(
        thinkTasks,
        (index, result) => {
          const agent = agents[index];

          // Record token usage from provider after each agent completes
          const tokenUsage = this.provider.getTokenUsage();
          if (tokenUsage) {
            tracker.record(agent.definition.id, tokenUsage);
          }

          // Record agent performance metric
          metricsTracker.recordMetric({
            sessionId,
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            domain: agent.definition.domain,
            responseTime: agent.processingTime || 0,
            tokenCount: tokenUsage?.totalTokens ?? 0,
          }).catch(() => {});

          emit({
            type: "agent:thought",
            data: {
              agentId: agent.definition.id,
              thought: result.thought,
              confidence: result.confidence,
              processingTime: agent.processingTime || 0,
              branches: branchCount > 1 ? branchCount : undefined,
              selectedBranch: branchCount > 1
                ? (() => {
                    const branches = allBranches.get(agent.definition.id);
                    if (!branches || branches.length === 0) return undefined;
                    let bestIdx = 0;
                    for (let i = 1; i < branches.length; i++) {
                      if (branches[i].confidence > branches[bestIdx].confidence) bestIdx = i;
                    }
                    return bestIdx + 1;
                  })()
                : undefined,
            },
            timestamp: Date.now(),
          });
        },
        (index, error) => {
          const agent = agents[index];
          agent.status = "error";
          agent.error = error.message;
          agent.thought = BaseAgent.generateFallbackResponse(agent.definition);
          agent.confidence = "LOW";
          emit({
            type: "agent:error",
            data: {
              agentId: agent.definition.id,
              error: error.message,
              thought: agent.thought,
              confidence: agent.confidence,
            },
            timestamp: Date.now(),
          });
        }
      );

      // Check budget after thinking phase
      this.checkBudgetWarning(tracker, warnThreshold, emit);

      // Phase 5: IACP Discussion (if enabled and budget not exceeded)
      const budgetExceededBeforeDiscussion = tracker.isBudgetExceeded();

      // Emit discussing phase event - either starting discussion or skipping it
      if (!budgetExceededBeforeDiscussion && this.settings.iacpEnabled && agents.length > 1) {
        emit({
          type: "council:phase",
          data: {
            phase: "discussing",
            message: "Agents are discussing their perspectives",
            metadata: { agentCount: agents.length },
          },
          timestamp: Date.now(),
        });

        const iacpBus = new IACPBus(3);
        const thoughts: AgentThought[] = agents
          .filter((a) => a.thought && a.status !== "error")
          .map((a) => ({
            agentId: a.definition.id,
            agentName: a.definition.name,
            domain: a.definition.domain,
            thought: a.thought!,
            confidence: a.confidence || "MEDIUM",
          }));

        // Only primary agents and always-active participate in discussion
        const discussAgents = agents.filter(
          (a) => (a.role === "primary" || a.role === "always-active") && a.status !== "error"
        );

        if (discussAgents.length > 1) {
          const discussTasks = discussAgents.map((agent) => async () => {
            const otherThoughts = thoughts.filter(
              (t) => t.agentId !== agent.definition.id
            );
            const incoming = iacpBus.getMessagesFor(agent.definition.id);

            try {
              const result = await withRetry(
                () =>
                  BaseAgent.discuss(
                    agent.definition,
                    query,
                    agent.thought || "",
                    otherThoughts,
                    incoming,
                    this.provider,
                    this.settings.model
                  ),
                { maxRetries: 1 }
              );

              agent.finalResponse = result.response;
              for (const msg of result.iacpMessages) {
                if (iacpBus.canSend(agent.definition.id)) {
                  iacpBus.post(msg);
                  emit({
                    type: "iacp:message",
                    data: { message: msg },
                    timestamp: Date.now(),
                  });
                }
              }
              return result;
            } catch {
              agent.finalResponse = agent.thought;
              return { response: agent.thought || "", iacpMessages: [] };
            }
          });

          await concurrencyManager.executeBatch(
            discussTasks,
            (index) => {
              const agent = discussAgents[index];
              const tokenUsage = this.provider.getTokenUsage();
              if (tokenUsage) {
                tracker.record(agent.definition.id, tokenUsage);
              }
            }
          );

          // Check budget after discussion phase
          this.checkBudgetWarning(tracker, warnThreshold, emit);
        }
      } else {
        // Discussion phase skipped - emit phase event with reason
        emit({
          type: "council:phase",
          data: {
            phase: "discussing",
            message: budgetExceededBeforeDiscussion
              ? "Discussion skipped due to budget limit"
              : !this.settings.iacpEnabled
              ? "Discussion disabled (IACP not enabled)"
              : "Not enough agents for discussion",
            metadata: {
              skipped: true,
              reason: budgetExceededBeforeDiscussion
                ? "budget_exceeded"
                : !this.settings.iacpEnabled
                ? "iacp_disabled"
                : "insufficient_agents",
              agentCount: agents.length,
            },
          },
          timestamp: Date.now(),
        });
      }

      // Phase 5.5: Verification Loop (between discussion and synthesis)
      const verificationResults = new Map<string, VerificationStatus>();
      const budgetExceededBeforeVerification = tracker.isBudgetExceeded();

      if (
        reasoningConfig.enableVerification &&
        !budgetExceededBeforeVerification
      ) {
        emit({
          type: "council:phase",
          data: {
            phase: "verifying",
            message: "Running verification loops on agent claims",
            metadata: { maxRounds: reasoningConfig.maxVerificationRounds },
          },
          timestamp: Date.now(),
        });

        // Find verifier agents: Fact Checker (CROSS-008) and Critical Thinking Expert (PHI-003)
        const verifierIds = ["CROSS-008", "PHI-003"];
        const verifierAgents = agents.filter((a) => verifierIds.includes(a.definition.id));

        if (verifierAgents.length > 0) {
          // Get top thoughts ranked by confidence (top 5)
          const verifierAgentIds = new Set(verifierAgents.map((v) => v.definition.id));
          const rankedAgents = agents
            .filter((a) => a.thought && !verifierAgentIds.has(a.definition.id))
            .sort((a, b) => {
              const confOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
              return (confOrder[b.confidence || "LOW"] || 0) - (confOrder[a.confidence || "LOW"] || 0);
            })
            .slice(0, 5);

          for (let round = 0; round < reasoningConfig.maxVerificationRounds; round++) {
            // Check budget before each verification round
            if (tracker.isBudgetExceeded()) break;

            for (const targetAgent of rankedAgents) {
              // Skip already verified/disputed in this round
              if (verificationResults.has(targetAgent.definition.id)) continue;
              if (tracker.isBudgetExceeded()) break;

              // Use each verifier agent for verification
              for (const verifierAgent of verifierAgents) {
                if (tracker.isBudgetExceeded()) break;

                try {
                  const claim = targetAgent.thought || "";
                  const evidence = targetAgent.finalResponse || targetAgent.thought || "";

                  const result = await withRetry(
                    () =>
                      BaseAgent.verify(
                        verifierAgent.definition,
                        claim.substring(0, 1000),
                        evidence.substring(0, 1000),
                        this.provider,
                        this.settings.model
                      ),
                    { maxRetries: 1 }
                  );

                  // Record token usage for verification
                  const vTokenUsage = this.provider.getTokenUsage();
                  if (vTokenUsage) {
                    tracker.record(`${verifierAgent.definition.id}-verify`, vTokenUsage);
                  }

                  let status: VerificationStatus = 'unverified';
                  if (result.score >= 7) status = 'verified';
                  else if (result.score < 5) status = 'disputed';

                  verificationResults.set(targetAgent.definition.id, status);

                  emit({
                    type: "agent:verification",
                    data: {
                      agentId: verifierAgent.definition.id,
                      targetAgentId: targetAgent.definition.id,
                      claim: claim.substring(0, 200),
                      score: result.score,
                      status,
                      issues: result.issues,
                      round: round + 1,
                    },
                    timestamp: Date.now(),
                  });
                } catch {
                  verificationResults.set(targetAgent.definition.id, 'unverified');
                }
              }
            }
          }
        }

        // Check budget after verification
        this.checkBudgetWarning(tracker, warnThreshold, emit);
      }

      // Phase 6: Synthesis
      emit({
        type: "council:synthesizing",
        data: { agentCount: agents.length },
        timestamp: Date.now(),
      });

      const agentThoughts: AgentThought[] = agents
        .filter((a) => (a.thought || a.finalResponse) && a.status !== "error")
        .map((a) => ({
          agentId: a.definition.id,
          agentName: a.definition.name,
          domain: a.definition.domain,
          thought: a.finalResponse || a.thought || "",
          confidence: a.confidence || "MEDIUM",
        }));

      // Build verification context for synthesis
      let verificationContext = "";
      if (verificationResults.size > 0) {
        const entries = Array.from(verificationResults.entries());
        const verified = entries.filter(([, s]) => s === 'verified').map(([id]) => id);
        const disputed = entries.filter(([, s]) => s === 'disputed').map(([id]) => id);
        verificationContext = `\n\n## Verification Summary\n`;
        if (verified.length > 0) verificationContext += `Verified claims from: ${verified.join(', ')}\n`;
        if (disputed.length > 0) verificationContext += `Disputed claims from: ${disputed.join(', ')} — treat with caution\n`;
      }

      // Build branches summary for synthesis
      let branchesSummary = "";
      if (allBranches.size > 0) {
        branchesSummary = `\n\n## Reasoning Branches Summary\n`;
        for (const [agentId, branches] of allBranches) {
          const agentName = agents.find(a => a.definition.id === agentId)?.definition.name ?? agentId;
          branchesSummary += `${agentName}: ${branches.length} branches explored (best confidence: ${Math.max(...branches.map(b => b.confidence))}/10)\n`;
        }
      }

      const synthesisContext = verificationContext + branchesSummary;

      const synthesisResult = await withRetry(
        () =>
          synthesizeResponses(
            query,
            agentThoughts,
            this.provider,
            this.settings.model,
            { context: synthesisContext }
          ),
        { maxRetries: 2 }
      );

      const finalResponse = synthesisResult.content;

      // Record synthesis token usage BEFORE caching so token count is accurate
      const synthesisUsage = this.provider.getTokenUsage();
      if (synthesisUsage) {
        tracker.record("__synthesis__", synthesisUsage);
      }

      // ── Store in cache ──────────────────────────────────────────
      try {
        responseCache.set(query, finalResponse, {
          consensus: synthesisResult.consensus ?? null,
          tokenUsage: tracker.getUsageSummary().total.totalTokens,
          agentCount: agents.length,
        });
      } catch {
        // Cache is best-effort — never break the pipeline
      }

      const successCount = agents.filter(
        (a) => a.status === "complete" || a.finalResponse
      ).length;

      const usageSummary = tracker.getUsageSummary();

      emit({
        type: "council:complete",
        data: {
          response: finalResponse,
          totalTime: Date.now() - startTime,
          agentsActivated: agents.length,
          agentsSucceeded: successCount,
          totalTokens: usageSummary.total.totalTokens,
          tokenUsage: usageSummary,
        },
        timestamp: Date.now(),
      });
    } catch (err) {
      emit({
        type: "council:error",
        data: {
          error: err instanceof Error ? err.message : "Unknown error occurred",
        },
        timestamp: Date.now(),
      });
    }
  }

  private checkBudgetWarning(
    tracker: TokenBudgetTracker,
    warnThreshold: number,
    emit: (event: SSEEvent) => void
  ): void {
    if (this.budgetWarningEmitted) return;
    const summary = tracker.getUsageSummary();
    const usagePercent = summary.percentUsed / 100;
    if (usagePercent >= warnThreshold && !tracker.isBudgetExceeded()) {
      this.budgetWarningEmitted = true;
      emit({
        type: "council:budget_warning",
        data: {
          warning: "budget_threshold",
          percentUsed: summary.percentUsed,
          remaining: summary.remaining,
        },
        timestamp: Date.now(),
      });
    }
  }

  private numericToLabel(score: number): "HIGH" | "MEDIUM" | "LOW" {
    if (score >= 7) return "HIGH";
    if (score >= 4) return "MEDIUM";
    return "LOW";
  }

  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    const systemPrompt = `You are a query analyzer for the Deep Thinking AI council system.
Analyze the user's query and determine which domains of expertise are most relevant.

Available domains: technology, business, law, science, creativity, education, philosophy, communication, psychology, economics

Respond in JSON format only:
{
  "detectedDomains": ["domain1", "domain2"],
  "complexity": "simple|moderate|complex",
  "suggestedAgentCount": <number between 3 and 15>,
  "summary": "Brief summary of what the query is about"
}`;

    try {
      const response = await this.provider.chat({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        model: this.settings.model,
        temperature: 0.3,
        maxTokens: 512,
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          query,
          detectedDomains: (parsed.detectedDomains || ["technology"]) as AgentDomain[],
          complexity: parsed.complexity || "moderate",
          suggestedAgentCount: Math.min(
            parsed.suggestedAgentCount || 7,
            this.settings.maxAgents
          ),
          summary: parsed.summary || query.substring(0, 100),
        };
      }
    } catch {
      // Fallback analysis
    }

    return this.fallbackAnalysis(query);
  }

  private fallbackAnalysis(query: string): QueryAnalysis {
    const lower = query.toLowerCase();
    const domains: AgentDomain[] = [];

    const domainKeywords: Record<AgentDomain, string[]> = {
      technology: ["code", "software", "app", "website", "api", "database", "programming", "tech", "system", "server", "frontend", "backend", "deploy", "cloud"],
      business: ["business", "startup", "company", "market", "strategy", "product", "management", "revenue", "customer", "brand", "growth"],
      law: ["legal", "law", "regulation", "compliance", "patent", "copyright", "contract", "privacy", "gdpr"],
      science: ["research", "data", "experiment", "hypothesis", "analysis", "scientific", "study"],
      creativity: ["design", "ui", "ux", "creative", "visual", "brand", "game", "media", "video"],
      education: ["learn", "teach", "course", "education", "training", "curriculum", "student"],
      philosophy: ["ethics", "moral", "logic", "think", "philosophy", "decision"],
      communication: ["write", "communicate", "language", "translate", "document", "content"],
      psychology: ["behavior", "cognitive", "motivation", "psychology", "user experience", "habit"],
      economics: ["economy", "finance", "invest", "market", "price", "crypto", "risk", "money", "budget"],
      cross: [],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (domain === "cross") continue;
      if (keywords.some((kw) => lower.includes(kw))) {
        domains.push(domain as AgentDomain);
      }
    }

    if (domains.length === 0) domains.push("technology", "business");

    return {
      query,
      detectedDomains: domains.slice(0, 4),
      complexity: domains.length > 2 ? "complex" : domains.length > 1 ? "moderate" : "simple",
      suggestedAgentCount: Math.min(7, this.settings.maxAgents),
      summary: query.substring(0, 100),
    };
  }
}
