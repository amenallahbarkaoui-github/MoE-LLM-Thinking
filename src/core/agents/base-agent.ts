import type { AgentDefinition, ChatMessage, AgentThought, IACPMessage, AIProvider, ReasoningBranch, CoTResult, VerificationResult } from "@/types";
import { memoryStore } from "@/core/memory/store";
import { contextManager } from "@/core/memory/context-window";

export class BaseAgent {
  static async think(
    definition: AgentDefinition,
    query: string,
    provider: AIProvider,
    model: string,
    options?: { useMemory?: boolean }
  ): Promise<{ thought: string; confidence: "HIGH" | "MEDIUM" | "LOW" }> {
    const useMemory = options?.useMemory ?? true;

    let messages: ChatMessage[];
    if (useMemory) {
      messages = await this.buildThinkingPromptWithMemory(definition, query);
    } else {
      messages = this.buildThinkingPrompt(definition, query);
    }

    const response = await provider.chat({ messages, model, temperature: 0.7, maxTokens: 1024 });
    const confidence = this.extractConfidence(response.content);

    // Store good responses as memories (fire-and-forget)
    if (useMemory && confidence !== "LOW") {
      this.storeThoughtAsMemory(definition, query, response.content, confidence).catch(() => {});
    }

    return { thought: response.content, confidence };
  }

  static async discuss(
    definition: AgentDefinition,
    query: string,
    ownThought: string,
    otherThoughts: AgentThought[],
    incomingMessages: IACPMessage[],
    provider: AIProvider,
    model: string,
    options?: { useMemory?: boolean }
  ): Promise<{ response: string; iacpMessages: IACPMessage[] }> {
    const useMemory = options?.useMemory ?? true;

    let memoryContext = "";
    if (useMemory) {
      try {
        memoryContext = await contextManager.buildContext(
          definition.id,
          definition.domain,
          query,
          300
        );
      } catch {
        // Memory unavailable — proceed without
      }
    }

    const messages = this.buildDiscussionPrompt(
      definition, query, ownThought, otherThoughts, incomingMessages, memoryContext
    );
    const result = await provider.chat({ messages, model, temperature: 0.7, maxTokens: 1024 });
    const parsed = this.parseDiscussionResponse(result.content, definition);
    return parsed;
  }

  static buildThinkingPrompt(definition: AgentDefinition, query: string): ChatMessage[] {
    return [
      { role: "system", content: definition.systemPrompt },
      { role: "user", content: query },
    ];
  }

  static async buildThinkingPromptWithMemory(
    definition: AgentDefinition,
    query: string
  ): Promise<ChatMessage[]> {
    let memoryContext = "";
    try {
      memoryContext = await contextManager.buildContext(
        definition.id,
        definition.domain,
        query,
        500
      );
    } catch {
      // Memory unavailable — fall back to no context
    }

    const systemContent = memoryContext
      ? `${definition.systemPrompt}\n\n${memoryContext}`
      : definition.systemPrompt;

    return [
      { role: "system", content: systemContent },
      { role: "user", content: query },
    ];
  }

  static buildDiscussionPrompt(
    definition: AgentDefinition,
    query: string,
    ownThought: string,
    otherThoughts: AgentThought[],
    incomingMessages: IACPMessage[],
    memoryContext: string = ""
  ): ChatMessage[] {
    const othersContext = otherThoughts
      .map((t) => `**${t.agentName}** (${t.domain}): ${t.thought.substring(0, 300)}...`)
      .join("\n\n");

    const iacpContext = incomingMessages.length > 0
      ? `\n\n## Messages from other agents:\n${incomingMessages
          .map((m) => `[${m.fromAgentName}] (${m.type}): ${m.content}`)
          .join("\n")}`
      : "";

    const memorySection = memoryContext
      ? `\n\n${memoryContext}\n`
      : "";

    const discussionPrompt = `${definition.systemPrompt}${memorySection}

## Council Discussion Phase
You previously analyzed this query and provided your initial assessment.
Now, review other council members' perspectives and refine your analysis.

## Your Initial Assessment:
${ownThought}

## Other Agents' Perspectives:
${othersContext}
${iacpContext}

## Instructions:
1. Consider other agents' perspectives
2. Refine your analysis if you find compelling points
3. Challenge any claims you disagree with
4. Provide your final refined assessment

Format your response as:
[DISCUSSION]: Your refined analysis
[IACP]: (optional) If you want to send a message to another agent, format as JSON:
[{"to": "AGENT-ID", "type": "CHALLENGE|AGREEMENT|EVIDENCE", "content": "your message"}]`;

    return [
      { role: "system", content: discussionPrompt },
      { role: "user", content: query },
    ];
  }

  static parseDiscussionResponse(
    response: string,
    definition: AgentDefinition
  ): { response: string; iacpMessages: IACPMessage[] } {
    const iacpMatch = response.match(/\[IACP\]:\s*(\[[\s\S]*?\])/);
    let iacpMessages: IACPMessage[] = [];

    if (iacpMatch) {
      try {
        const raw = JSON.parse(iacpMatch[1]) as Array<{
          to: string;
          type: string;
          content: string;
        }>;
        iacpMessages = raw.map((m, i) => ({
          id: `${definition.id}-iacp-${Date.now()}-${i}`,
          fromAgentId: definition.id,
          fromAgentName: definition.name,
          toAgentId: m.to || "ALL",
          type: (m.type as IACPMessage["type"]) || "OPINION_SHARE",
          content: m.content,
          timestamp: Date.now(),
          round: 1,
        }));
      } catch {
        // Failed to parse IACP messages, that's fine
      }
    }

    const discussionMatch = response.match(/\[DISCUSSION\]:\s*([\s\S]*?)(?:\[IACP\]|$)/);
    const cleanResponse = discussionMatch ? discussionMatch[1].trim() : response;

    return { response: cleanResponse, iacpMessages };
  }

  static extractConfidence(text: string): "HIGH" | "MEDIUM" | "LOW" {
    const lower = text.toLowerCase();
    if (lower.includes("confidence level: high") || lower.includes("**high**")) return "HIGH";
    if (lower.includes("confidence level: low") || lower.includes("**low**")) return "LOW";
    return "MEDIUM";
  }

  static generateFallbackResponse(definition: AgentDefinition): string {
    return `As ${definition.name}, I was unable to complete my full analysis within the allocated time. Based on my expertise in ${definition.description}, I recommend consulting additional resources for a thorough assessment of this topic.\n\n**Confidence Level:** LOW - Analysis incomplete`;
  }

  // ─── Tree-of-Thought: Multi-branch reasoning ──────────────────────

  private static readonly BRANCH_INSTRUCTIONS = [
    "Analyze this from your primary expertise perspective.",
    "Consider alternative viewpoints and contrarian analysis.",
    "Focus on edge cases, risks, and unconventional insights.",
  ] as const;

  static async thinkMultiplePaths(
    definition: AgentDefinition,
    query: string,
    systemPrompt: string,
    provider: AIProvider,
    model: string,
    options?: { branchCount?: number; useMemory?: boolean }
  ): Promise<ReasoningBranch[]> {
    const branchCount = options?.branchCount ?? 2;
    const useMemory = options?.useMemory ?? true;

    const branches: ReasoningBranch[] = [];

    for (let i = 0; i < branchCount; i++) {
      const branchInstruction = this.BRANCH_INSTRUCTIONS[i] ?? this.BRANCH_INSTRUCTIONS[0];
      const augmentedPrompt = `${systemPrompt}\n\n## Reasoning Branch ${i + 1}\n${branchInstruction}\n\nAfter your analysis, state your confidence as "Confidence: X/10" where X is 1-10.`;

      let messages: ChatMessage[];
      if (useMemory) {
        try {
          const memCtx = await contextManager.buildContext(
            definition.id, definition.domain, query, 300
          );
          const fullPrompt = memCtx ? `${augmentedPrompt}\n\n${memCtx}` : augmentedPrompt;
          messages = [
            { role: "system", content: fullPrompt },
            { role: "user", content: query },
          ];
        } catch {
          messages = [
            { role: "system", content: augmentedPrompt },
            { role: "user", content: query },
          ];
        }
      } else {
        messages = [
          { role: "system", content: augmentedPrompt },
          { role: "user", content: query },
        ];
      }

      try {
        const response = await provider.chat({ messages, model, temperature: 0.7 + i * 0.1, maxTokens: 1024 });
        const confidence = this.parseNumericConfidence(response.content);
        branches.push({ branch: i + 1, thought: response.content, confidence });
      } catch (err) {
        console.error(`[BaseAgent] Branch ${i + 1} failed for ${definition.id}:`, err instanceof Error ? err.message : err);
        branches.push({ branch: i + 1, thought: `[Branch ${i + 1} failed]`, confidence: 1 });
      }
    }

    return branches;
  }

  // ─── Chain-of-Thought: Step-by-step reasoning ────────────────────

  static async thinkWithCoT(
    definition: AgentDefinition,
    query: string,
    systemPrompt: string,
    provider: AIProvider,
    model: string,
    options?: { useMemory?: boolean }
  ): Promise<CoTResult> {
    const cotPrompt = `${systemPrompt}\n\n## Chain-of-Thought Analysis\nBreak your analysis into clear numbered steps. For each step, state your reasoning and confidence (1-10).\n\nFormat each step as:\nStep N: [Title]\nReasoning: [Your detailed reasoning]\nConfidence: X/10\n\nAfter all steps, provide:\nConclusion: [Your final conclusion]\nOverall Confidence: X/10`;

    let messages: ChatMessage[];
    const useMemory = options?.useMemory ?? true;

    if (useMemory) {
      try {
        const memCtx = await contextManager.buildContext(
          definition.id, definition.domain, query, 300
        );
        const fullPrompt = memCtx ? `${cotPrompt}\n\n${memCtx}` : cotPrompt;
        messages = [
          { role: "system", content: fullPrompt },
          { role: "user", content: query },
        ];
      } catch {
        messages = [
          { role: "system", content: cotPrompt },
          { role: "user", content: query },
        ];
      }
    } else {
      messages = [
        { role: "system", content: cotPrompt },
        { role: "user", content: query },
      ];
    }

    const response = await provider.chat({ messages, model, temperature: 0.5, maxTokens: 2048 });
    return this.parseCoTResponse(response.content);
  }

  // ─── Verification: Fact-checking and claim validation ─────────────

  static async verify(
    definition: AgentDefinition,
    claim: string,
    evidence: string,
    provider: AIProvider,
    model: string,
    options?: { useMemory?: boolean }
  ): Promise<VerificationResult> {
    const verifyPrompt = `${definition.systemPrompt}\n\n## Verification Task\nEvaluate this claim: ${claim}\n\nEvidence provided:\n${evidence}\n\nIdentify any logical fallacies, unsupported assumptions, or factual errors.\n\nRespond in this format:\nAccuracy Score: X/10\nValid: YES or NO\nIssues:\n- [issue 1]\n- [issue 2]\nSuggestions:\n- [suggestion 1]\n- [suggestion 2]`;

    let messages: ChatMessage[];
    const useMemory = options?.useMemory ?? true;

    if (useMemory) {
      try {
        const memCtx = await contextManager.buildContext(
          definition.id, definition.domain, claim, 200
        );
        const fullPrompt = memCtx ? `${verifyPrompt}\n\n${memCtx}` : verifyPrompt;
        messages = [
          { role: "system", content: fullPrompt },
          { role: "user", content: `Verify: ${claim}` },
        ];
      } catch {
        messages = [
          { role: "system", content: verifyPrompt },
          { role: "user", content: `Verify: ${claim}` },
        ];
      }
    } else {
      messages = [
        { role: "system", content: verifyPrompt },
        { role: "user", content: `Verify: ${claim}` },
      ];
    }

    const response = await provider.chat({ messages, model, temperature: 0.3, maxTokens: 1024 });
    return this.parseVerificationResponse(response.content);
  }

  // ─── Parsing helpers ───────────────────────────────────────────────

  static parseNumericConfidence(text: string): number {
    // Match patterns like "Confidence: 8/10", "confidence: 7/10", "Confidence: 9 / 10"
    const match = text.match(/confidence:\s*(\d+)\s*\/\s*10/i);
    if (match) return Math.min(10, Math.max(1, parseInt(match[1], 10)));

    // Estimate from hedging language
    const lower = text.toLowerCase();
    if (lower.includes("highly confident") || lower.includes("very confident") || lower.includes("certainly")) return 9;
    if (lower.includes("confident") || lower.includes("strongly believe")) return 7;
    if (lower.includes("uncertain") || lower.includes("not sure") || lower.includes("possibly")) return 4;
    if (lower.includes("unlikely") || lower.includes("doubtful") || lower.includes("speculative")) return 3;
    return 6; // neutral default
  }

  static parseCoTResponse(text: string): CoTResult {
    const steps: CoTResult["steps"] = [];
    // Match "Step N:" blocks
    const stepRegex = /Step\s+(\d+)[:\s].*?(?:Reasoning:\s*([\s\S]*?))?Confidence:\s*(\d+)\s*\/\s*10/gi;
    let match;
    while ((match = stepRegex.exec(text)) !== null) {
      steps.push({
        step: parseInt(match[1], 10),
        reasoning: (match[2] || "").trim(),
        confidence: Math.min(10, Math.max(1, parseInt(match[3], 10))),
      });
    }

    // If regex didn't capture steps, create a single step from the whole text
    if (steps.length === 0) {
      steps.push({ step: 1, reasoning: text.substring(0, 500), confidence: 5 });
    }

    // Extract conclusion
    const conclusionMatch = text.match(/Conclusion:\s*([\s\S]*?)(?:Overall Confidence|$)/i);
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : text.substring(text.length - 300).trim();

    // Extract overall confidence
    const overallMatch = text.match(/Overall Confidence:\s*(\d+)\s*\/\s*10/i);
    const overallConfidence = overallMatch
      ? Math.min(10, Math.max(1, parseInt(overallMatch[1], 10)))
      : Math.round(steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length);

    return { steps, conclusion, overallConfidence };
  }

  static parseVerificationResponse(text: string): VerificationResult {
    // Parse accuracy score
    const scoreMatch = text.match(/Accuracy Score:\s*(\d+)\s*\/\s*10/i);
    const score = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1], 10))) : 5;

    // Parse valid
    const validMatch = text.match(/Valid:\s*(YES|NO)/i);
    const isValid = validMatch ? validMatch[1].toUpperCase() === "YES" : score >= 5;

    // Parse issues
    const issues: string[] = [];
    const issuesSection = text.match(/Issues:\s*([\s\S]*?)(?:Suggestions:|$)/i);
    if (issuesSection) {
      const issueLines = issuesSection[1].match(/[-*]\s*(.+)/g);
      if (issueLines) {
        for (const line of issueLines) {
          const cleaned = line.replace(/^[-*]\s*/, "").trim();
          if (cleaned) issues.push(cleaned);
        }
      }
    }

    // Parse suggestions
    const suggestions: string[] = [];
    const suggestionsSection = text.match(/Suggestions:\s*([\s\S]*?)$/i);
    if (suggestionsSection) {
      const suggestionLines = suggestionsSection[1].match(/[-*]\s*(.+)/g);
      if (suggestionLines) {
        for (const line of suggestionLines) {
          const cleaned = line.replace(/^[-*]\s*/, "").trim();
          if (cleaned) suggestions.push(cleaned);
        }
      }
    }

    return { isValid, score, issues, suggestions };
  }

  // ─── Memory helpers ────────────────────────────────────────────────

  private static async storeThoughtAsMemory(
    definition: AgentDefinition,
    query: string,
    thought: string,
    confidence: "HIGH" | "MEDIUM" | "LOW"
  ): Promise<void> {
    const scoreMap = { HIGH: 0.9, MEDIUM: 0.6, LOW: 0.3 } as const;
    await memoryStore.storeMemory({
      agentId: definition.id,
      content: thought.substring(0, 2000), // cap stored content
      type: "RESPONSE",
      domain: definition.domain,
      queryHash: memoryStore.hashQuery(query),
      score: scoreMap[confidence],
      usageCount: 0,
    });
  }
}
