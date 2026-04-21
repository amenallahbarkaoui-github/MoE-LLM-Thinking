import { memoryStore, type MemoryEntry } from "./store";

class ContextWindowManager {
  /**
   * Fetch relevant memories and format them as prompt context.
   * Truncates output to fit within maxTokenEstimate (character count).
   */
  async buildContext(
    agentId: string,
    domain: string,
    currentQuery: string,
    maxTokenEstimate: number = 500
  ): Promise<string> {
    const queryHash = memoryStore.hashQuery(currentQuery);

    let memories: MemoryEntry[];
    try {
      memories = await memoryStore.getRelevantMemories(
        agentId,
        domain,
        queryHash,
        10
      );
    } catch {
      return "";
    }

    if (memories.length === 0) return "";

    // Record usage for each memory we're injecting
    for (const mem of memories) {
      memoryStore.recordUsage(mem.id).catch(() => {});
    }

    // Separate few-shot examples from other memories
    const fewShots = memories.filter((m) => m.type === "FEW_SHOT");
    const others = memories.filter((m) => m.type !== "FEW_SHOT");

    const sections: string[] = [];

    if (others.length > 0) {
      const lines = others.map(
        (m) => `- [${m.type}] ${m.content.substring(0, 200)}`
      );
      sections.push(
        `## Relevant Past Insights\n${lines.join("\n")}`
      );
    }

    if (fewShots.length > 0) {
      sections.push(this.formatFewShotExamples(fewShots));
    }

    let result = sections.join("\n\n");

    // Truncate to fit within the character budget
    if (result.length > maxTokenEstimate) {
      result = result.substring(0, maxTokenEstimate - 3) + "...";
    }

    return result;
  }

  /**
   * Format few-shot memories as Q&A examples for the agent.
   */
  formatFewShotExamples(memories: MemoryEntry[]): string {
    if (memories.length === 0) return "";

    const examples = memories.map((m, i) => {
      return `### Example ${i + 1}\n${m.content}`;
    });

    return `## Few-Shot Examples\n${examples.join("\n\n")}`;
  }

  /**
   * Create a brief summary of multiple memories.
   */
  summarizeMemories(memories: MemoryEntry[]): string {
    if (memories.length === 0) return "No prior memories available.";

    const domainCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    let avgScore = 0;

    for (const m of memories) {
      domainCounts.set(m.domain, (domainCounts.get(m.domain) ?? 0) + 1);
      typeCounts.set(m.type, (typeCounts.get(m.type) ?? 0) + 1);
      avgScore += m.score;
    }
    avgScore /= memories.length;

    const domains = [...domainCounts.entries()]
      .map(([d, c]) => `${d} (${c})`)
      .join(", ");
    const types = [...typeCounts.entries()]
      .map(([t, c]) => `${t} (${c})`)
      .join(", ");

    return [
      `Memory Summary: ${memories.length} entries`,
      `Domains: ${domains}`,
      `Types: ${types}`,
      `Average score: ${avgScore.toFixed(2)}`,
      `Top insight: ${memories[0].content.substring(0, 150)}...`,
    ].join("\n");
  }
}

export const contextManager = new ContextWindowManager();
