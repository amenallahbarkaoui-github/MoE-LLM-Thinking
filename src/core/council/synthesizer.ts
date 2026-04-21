import type { AgentThought, AIProvider } from "@/types";
import type { ConsensusResult, SynthesisConfig } from "@/types/council";

// ─── Constants ───────────────────────────────────────────────────

const DEFAULT_CONSENSUS_THRESHOLD = 0.5;
const THOUGHT_CHAR_LIMIT = 500;
const TRUNCATE_KEEP = 200;
const CONFIDENCE_MAP: Record<AgentThought["confidence"], number> = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.4,
};

// ─── Weighted Thought ────────────────────────────────────────────

export interface WeightedThought extends AgentThought {
  numericConfidence: number;
  domainRelevance: number;
  weight: number;
}

// ─── Progressive Synthesis Params ────────────────────────────────

export interface ProgressiveSynthesisParams {
  query: string;
  provider: AIProvider;
  model: string;
  totalExpectedAgents: number;
  config?: SynthesisConfig;
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Convert confidence label to numeric value.
 */
function confidenceToNumber(c: AgentThought["confidence"]): number {
  return CONFIDENCE_MAP[c] ?? 0.7;
}

/**
 * Compute weight for a thought: confidence * domainRelevance.
 */
function computeWeight(
  thought: AgentThought,
  domainRelevanceMap?: Record<string, number>
): WeightedThought {
  const numericConfidence = confidenceToNumber(thought.confidence);
  const domainRelevance = domainRelevanceMap?.[thought.agentId] ?? 0.7;
  return {
    ...thought,
    numericConfidence,
    domainRelevance,
    weight: numericConfidence * domainRelevance,
  };
}

/**
 * Classify weight into a human-readable label.
 */
function weightLabel(w: number): string {
  if (w >= 0.7) return "HIGH WEIGHT";
  if (w >= 0.4) return "MODERATE WEIGHT";
  return "LOW WEIGHT";
}

// ─── Response Compression ────────────────────────────────────────

/**
 * Compress verbose agent thoughts. Truncates long thoughts and deduplicates
 * similar content.
 */
export function compressThoughts(thoughts: AgentThought[]): string {
  const compressed = thoughts.map((t) => {
    const text =
      t.thought.length > THOUGHT_CHAR_LIMIT
        ? t.thought.slice(0, TRUNCATE_KEEP) +
          "\n[...truncated...]\n" +
          t.thought.slice(-TRUNCATE_KEEP)
        : t.thought;
    return { ...t, thought: text };
  });

  // Group similar thoughts by finding overlapping keyword sets
  const groups = groupSimilarThoughts(compressed);
  const parts: string[] = [];

  for (const group of groups) {
    if (group.length > 1) {
      const agents = group.map((t) => t.agentName).join(", ");
      parts.push(
        `**[Shared perspective from: ${agents}]**\n` +
          group.map((t) => `- ${t.agentName}: ${t.thought}`).join("\n")
      );
    } else {
      const t = group[0];
      parts.push(`**${t.agentName} (${t.domain}):**\n${t.thought}`);
    }
  }

  return parts.join("\n\n---\n\n");
}

/**
 * Group thoughts that share significant keyword overlap.
 */
function groupSimilarThoughts(thoughts: AgentThought[]): AgentThought[][] {
  const used = new Set<number>();
  const groups: AgentThought[][] = [];
  const keywordSets = thoughts.map((t) => extractKeywords(t.thought));

  for (let i = 0; i < thoughts.length; i++) {
    if (used.has(i)) continue;
    const group: AgentThought[] = [thoughts[i]];
    used.add(i);

    for (let j = i + 1; j < thoughts.length; j++) {
      if (used.has(j)) continue;
      const overlap = keywordOverlap(keywordSets[i], keywordSets[j]);
      if (overlap > 0.35) {
        group.push(thoughts[j]);
        used.add(j);
      }
    }
    groups.push(group);
  }

  return groups;
}

// ─── Consensus Detection ─────────────────────────────────────────

/**
 * Detect consensus and disagreement among agent thoughts.
 */
export function detectConsensus(thoughts: AgentThought[]): ConsensusResult {
  if (thoughts.length === 0) {
    return { consensusPoints: [], disagreementPoints: [], consensusScore: 0 };
  }
  if (thoughts.length === 1) {
    return {
      consensusPoints: extractKeyPhrases(thoughts[0].thought),
      disagreementPoints: [],
      consensusScore: 1,
    };
  }

  const keywordSets = thoughts.map((t) => extractKeywords(t.thought));
  const allKeywords = new Map<string, number>();

  for (const set of keywordSets) {
    for (const kw of set) {
      allKeywords.set(kw, (allKeywords.get(kw) ?? 0) + 1);
    }
  }

  const total = thoughts.length;
  const consensusPoints: string[] = [];
  const disagreementPoints: string[] = [];

  // Keywords appearing in >= 50% of thoughts are consensus
  // Keywords appearing in only 1 thought and total > 2 are divergence
  for (const [keyword, count] of allKeywords) {
    const fraction = count / total;
    if (fraction >= 0.5 && keyword.length > 3) {
      consensusPoints.push(keyword);
    } else if (count === 1 && total > 2 && keyword.length > 3) {
      disagreementPoints.push(keyword);
    }
  }

  // Consensus score: ratio of keywords that appear in majority of thoughts
  const totalUniqueKeywords = allKeywords.size || 1;
  const consensusKeywordCount = [...allKeywords.values()].filter(
    (c) => c / total >= 0.5
  ).length;
  const consensusScore = Math.min(
    1,
    consensusKeywordCount / totalUniqueKeywords + (total === 1 ? 1 : 0)
  );

  return {
    consensusPoints: consensusPoints.slice(0, 15),
    disagreementPoints: disagreementPoints.slice(0, 10),
    consensusScore: Math.round(consensusScore * 100) / 100,
  };
}

// ─── Keyword Extraction Utilities ────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "it", "its",
  "this", "that", "these", "those", "i", "you", "he", "she", "we", "they",
  "me", "him", "her", "us", "them", "my", "your", "his", "our", "their",
  "what", "which", "who", "whom", "where", "when", "why", "how",
  "and", "but", "or", "nor", "not", "so", "if", "then", "than",
  "of", "in", "on", "at", "to", "for", "with", "from", "by", "as",
  "into", "about", "between", "through", "after", "before", "during",
  "also", "just", "more", "most", "very", "too", "only", "such",
]);

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

function extractKeyPhrases(text: string): string[] {
  const keywords = [...extractKeywords(text)];
  return keywords.slice(0, 10);
}

function keywordOverlap(a: Set<string>, b: Set<string>): number {
  const smaller = a.size < b.size ? a : b;
  const larger = a.size < b.size ? b : a;
  let count = 0;
  for (const w of smaller) {
    if (larger.has(w)) count++;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : count / union;
}

// ─── Prompt Building ─────────────────────────────────────────────

function buildWeightedThoughtsSummary(
  thoughts: AgentThought[],
  domainRelevanceMap?: Record<string, number>
): string {
  const weighted = thoughts
    .map((t) => computeWeight(t, domainRelevanceMap))
    .sort((a, b) => b.weight - a.weight);

  return weighted
    .map((t) => {
      const label = weightLabel(t.weight);
      const truncated =
        t.thought.length > THOUGHT_CHAR_LIMIT
          ? t.thought.slice(0, TRUNCATE_KEEP) +
            "\n[...truncated...]\n" +
            t.thought.slice(-TRUNCATE_KEEP)
          : t.thought;
      return `### ${label} (${t.weight.toFixed(2)}): ${t.agentName} — ${t.domain} [Confidence: ${t.confidence}]\n${truncated}`;
    })
    .join("\n\n---\n\n");
}

function buildConsensusSection(consensus: ConsensusResult): string {
  const lines: string[] = [];
  if (consensus.consensusPoints.length > 0) {
    lines.push(
      `**Strong consensus among experts on:** ${consensus.consensusPoints.join(", ")}`
    );
  }
  if (consensus.disagreementPoints.length > 0) {
    lines.push(
      `**Disputed / divergent points:** ${consensus.disagreementPoints.join(", ")}`
    );
  }
  lines.push(
    `**Overall consensus score:** ${(consensus.consensusScore * 100).toFixed(0)}%`
  );
  return lines.join("\n");
}

function buildSynthesisSystemPrompt(
  agentCount: number,
  consensus: ConsensusResult
): string {
  return `You are the Council Leader of the Deep Thinking AI system.
You have received analyses from ${agentCount} specialized expert agents.
Your task is to synthesize their insights into a comprehensive, well-structured response.

## Consensus Analysis
${buildConsensusSection(consensus)}

## Your Responsibilities:
1. Integrate insights from all agents into a coherent response
2. Emphasize points of strong consensus — these carry the most weight
3. Clearly note disagreements and explain the different perspectives
4. Flag minority perspectives (ideas from a single agent) as "minority perspective"
5. Provide clear, actionable recommendations
6. Maintain the highest quality standard

## Output Format:
Provide a well-structured markdown response with:
- A clear executive summary
- Key insights organized by theme (not by agent)
- Areas of consensus and disagreement
- Actionable recommendations
- A confidence assessment

Do NOT list individual agent names in the final response. Instead, weave their insights naturally into a unified analysis.`;
}

function buildSynthesisUserMessage(
  query: string,
  thoughtsSummary: string,
  consensus: ConsensusResult,
  config?: SynthesisConfig,
  context?: string
): string {
  const threshold = config?.consensusThreshold ?? DEFAULT_CONSENSUS_THRESHOLD;

  const minorityNote =
    consensus.disagreementPoints.length > 0
      ? `\n\n## Minority Perspectives (below ${(threshold * 100).toFixed(0)}% threshold)\nThe following points appeared in only a single expert's analysis and should be flagged as minority perspectives: ${consensus.disagreementPoints.join(", ")}`
      : "";

  const contextSection = context ? `\n\n## Additional Context\n${context}` : "";

  return `## Original Query:
${query}

## Expert Council Analyses (sorted by weight):
${thoughtsSummary}

## Consensus Summary
${buildConsensusSection(consensus)}${minorityNote}${contextSection}

Please synthesize these perspectives into a comprehensive response. Give more weight to high-confidence, high-relevance insights and to points with strong consensus.`;
}

// ─── Core Synthesis (original API preserved) ─────────────────────

/**
 * Original synthesis function — still works as before but now uses
 * weighted consensus and compression internally.
 */
export async function synthesizeResponses(
  query: string,
  agentThoughts: AgentThought[],
  provider: AIProvider,
  model: string,
  options?: {
    domainRelevanceMap?: Record<string, number>;
    config?: SynthesisConfig;
    context?: string;
  }
): Promise<{ content: string; consensus: ConsensusResult }> {
  const consensus = detectConsensus(agentThoughts);
  const thoughtsSummary = buildWeightedThoughtsSummary(
    agentThoughts,
    options?.domainRelevanceMap
  );

  const systemPrompt = buildSynthesisSystemPrompt(
    agentThoughts.length,
    consensus
  );
  const userMessage = buildSynthesisUserMessage(
    query,
    thoughtsSummary,
    consensus,
    options?.config,
    options?.context
  );

  const response = await provider.chat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    model,
    temperature: 0.6,
    maxTokens: 4096,
  });

  return { content: response.content, consensus };
}

// ─── Progressive Synthesis ───────────────────────────────────────

/**
 * Yields progressively refined synthesis as more agent thoughts arrive.
 *
 * Usage:
 * ```ts
 * const gen = synthesizeProgressive(params);
 * // feed thoughts in as they arrive
 * gen.next();                     // kickstart
 * gen.next(firstBatchOfThoughts); // early insights
 * gen.next(moreBatchOfThoughts);  // developing analysis
 * gen.next(allThoughts);          // complete analysis
 * ```
 *
 * Alternatively, pass all thoughts upfront via the collector pattern below.
 */
export async function* synthesizeProgressive(
  params: ProgressiveSynthesisParams & {
    domainRelevanceMap?: Record<string, number>;
  }
): AsyncGenerator<
  {
    phase: "early" | "developing" | "complete";
    content: string;
    agentsProcessed: number;
    consensus: ConsensusResult;
  },
  void,
  AgentThought[] | undefined
> {
  const { query, provider, model, totalExpectedAgents, config, domainRelevanceMap } =
    params;

  const collected: AgentThought[] = [];
  const earlyThreshold = Math.min(3, totalExpectedAgents);
  const halfThreshold = Math.ceil(totalExpectedAgents / 2);

  let earlyDone = false;
  let developingDone = false;
  const MAX_ITERATIONS = totalExpectedAgents + 10;
  let iterations = 0;

  // Loop until we have all expected thoughts
  while (collected.length < totalExpectedAgents && iterations < MAX_ITERATIONS) {
    iterations++;
    const incoming: AgentThought[] | undefined = yield undefined as never;
    if (!incoming || incoming.length === 0) continue;

    // Merge new thoughts (deduplicate by agentId)
    const existingIds = new Set(collected.map((t) => t.agentId));
    for (const t of incoming) {
      if (!existingIds.has(t.agentId)) {
        collected.push(t);
        existingIds.add(t.agentId);
      }
    }

    // Early insights phase
    if (!earlyDone && collected.length >= earlyThreshold) {
      earlyDone = true;
      const consensus = detectConsensus(collected);
      const summary = buildWeightedThoughtsSummary(collected, domainRelevanceMap);
      const sys = buildSynthesisSystemPrompt(collected.length, consensus);
      const usr = `## Original Query:\n${query}\n\n## Early Expert Insights (${collected.length} of ${totalExpectedAgents} agents):\n${summary}\n\nProvide early insights based on what we have so far. Be concise — more expert input is incoming.`;

      const res = await provider.chat({
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
        model,
        temperature: 0.6,
        maxTokens: 2048,
      });

      yield {
        phase: "early",
        content: `## Early Insights\n${res.content}`,
        agentsProcessed: collected.length,
        consensus,
      };
    }

    // Developing analysis phase
    if (!developingDone && collected.length >= halfThreshold) {
      developingDone = true;
      const consensus = detectConsensus(collected);
      const summary = buildWeightedThoughtsSummary(collected, domainRelevanceMap);
      const sys = buildSynthesisSystemPrompt(collected.length, consensus);
      const usr = buildSynthesisUserMessage(query, summary, consensus, config);

      const res = await provider.chat({
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `${usr}\n\nNote: ${collected.length} of ${totalExpectedAgents} experts have responded so far. Provide a developing analysis.` },
        ],
        model,
        temperature: 0.6,
        maxTokens: 3072,
      });

      yield {
        phase: "developing",
        content: `## Developing Analysis\n${res.content}`,
        agentsProcessed: collected.length,
        consensus,
      };
    }
  }

  // Complete analysis with all agents
  const consensus = detectConsensus(collected);
  const summary = buildWeightedThoughtsSummary(collected, domainRelevanceMap);
  const sys = buildSynthesisSystemPrompt(collected.length, consensus);
  const usr = buildSynthesisUserMessage(query, summary, consensus, config);

  const res = await provider.chat({
    messages: [
      { role: "system", content: sys },
      { role: "user", content: usr },
    ],
    model,
    temperature: 0.6,
    maxTokens: 4096,
  });

  yield {
    phase: "complete",
    content: `## Complete Analysis\n${res.content}`,
    agentsProcessed: collected.length,
    consensus,
  };
}

/**
 * Simpler progressive synthesis that takes pre-batched thoughts.
 * Useful when the caller already has thoughts grouped by arrival order.
 */
export async function* synthesizeProgressiveFromBatches(
  query: string,
  batches: AgentThought[][],
  provider: AIProvider,
  model: string,
  options?: {
    domainRelevanceMap?: Record<string, number>;
    config?: SynthesisConfig;
  }
): AsyncGenerator<{
  phase: "early" | "developing" | "complete";
  content: string;
  agentsProcessed: number;
  consensus: ConsensusResult;
}> {
  const allThoughts: AgentThought[] = [];
  const totalAgents = batches.reduce((sum, b) => sum + b.length, 0);

  for (let i = 0; i < batches.length; i++) {
    allThoughts.push(...batches[i]);

    const isFirst = i === 0;
    const isLast = i === batches.length - 1;
    const isMid = !isFirst && !isLast;

    const consensus = detectConsensus(allThoughts);
    const summary = buildWeightedThoughtsSummary(
      allThoughts,
      options?.domainRelevanceMap
    );
    const sys = buildSynthesisSystemPrompt(allThoughts.length, consensus);

    let phase: "early" | "developing" | "complete";
    let maxTokens: number;
    let extraNote: string;

    if (isFirst && batches.length > 1) {
      phase = "early";
      maxTokens = 2048;
      extraNote = `\n\nNote: Only ${allThoughts.length} of ${totalAgents} experts have responded. Provide early insights.`;
    } else if (isMid) {
      phase = "developing";
      maxTokens = 3072;
      extraNote = `\n\nNote: ${allThoughts.length} of ${totalAgents} experts have responded. Provide a developing analysis.`;
    } else {
      phase = "complete";
      maxTokens = 4096;
      extraNote = "";
    }

    const usr = buildSynthesisUserMessage(
      query,
      summary,
      consensus,
      options?.config
    );

    const res = await provider.chat({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr + extraNote },
      ],
      model,
      temperature: 0.6,
      maxTokens,
    });

    const heading =
      phase === "early"
        ? "## Early Insights"
        : phase === "developing"
          ? "## Developing Analysis"
          : "## Complete Analysis";

    yield {
      phase,
      content: `${heading}\n${res.content}`,
      agentsProcessed: allThoughts.length,
      consensus,
    };
  }
}
