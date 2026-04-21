import { prisma } from "@/lib/db";

export interface MemoryEntry {
  id: string;
  agentId: string;
  content: string;
  type: "RESPONSE" | "PATTERN" | "FEW_SHOT";
  domain: string;
  queryHash: string;
  score: number;
  usageCount: number;
  createdAt: Date;
}

class AgentMemoryStore {
  /** Short-term (in-memory) storage for the current session */
  private shortTerm: Map<string, MemoryEntry[]> = new Map();

  /**
   * Store a memory entry. Writes to short-term immediately
   * and persists to the database asynchronously.
   */
  async storeMemory(
    entry: Omit<MemoryEntry, "id" | "createdAt">
  ): Promise<void> {
    const id = this.generateId();
    const now = new Date();
    const full: MemoryEntry = { ...entry, id, createdAt: now };

    // Short-term: keyed by agentId
    const existing = this.shortTerm.get(entry.agentId) ?? [];
    existing.push(full);
    this.shortTerm.set(entry.agentId, existing);

    // Persist to DB (fire-and-forget, errors are swallowed)
    this.persistToDb(full).catch(() => {
      // DB unavailable — short-term still has it
    });
  }

  /**
   * Retrieve relevant memories for a given agent + domain + query.
   * Searches short-term first, then long-term DB.
   * Results are sorted by (score * recency).
   */
  async getRelevantMemories(
    agentId: string,
    domain: string,
    queryHash: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    const results = new Map<string, MemoryEntry>();

    // 1. Short-term matches
    const stEntries = this.shortTerm.get(agentId) ?? [];
    for (const e of stEntries) {
      if (e.domain === domain || e.queryHash === queryHash) {
        results.set(e.id, e);
      }
    }

    // 2. Long-term DB
    try {
      const dbRows = await prisma.agentMemory.findMany({
        where: {
          agentId,
          OR: [{ domain }, { queryHash }],
        },
        orderBy: { score: "desc" },
        take: limit * 2, // over-fetch to merge with short-term
      });

      for (const row of dbRows) {
        if (!results.has(row.id)) {
          results.set(row.id, this.rowToEntry(row));
        }
      }
    } catch {
      // DB unavailable — rely on short-term only
    }

    return this.sortByScoreRecency([...results.values()]).slice(0, limit);
  }

  /**
   * Get all memories for an agent, sorted by score descending.
   */
  async getAgentMemories(
    agentId: string,
    limit: number = 50
  ): Promise<MemoryEntry[]> {
    const results = new Map<string, MemoryEntry>();

    // Short-term
    for (const e of this.shortTerm.get(agentId) ?? []) {
      results.set(e.id, e);
    }

    // Long-term
    try {
      const dbRows = await prisma.agentMemory.findMany({
        where: { agentId },
        orderBy: { score: "desc" },
        take: limit,
      });
      for (const row of dbRows) {
        if (!results.has(row.id)) {
          results.set(row.id, this.rowToEntry(row));
        }
      }
    } catch {
      // DB unavailable
    }

    return [...results.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Increment the usageCount for a memory (both in-memory and DB).
   */
  async recordUsage(memoryId: string): Promise<void> {
    // Update in short-term
    for (const entries of this.shortTerm.values()) {
      const entry = entries.find((e) => e.id === memoryId);
      if (entry) {
        entry.usageCount += 1;
        break;
      }
    }

    // Update in DB
    try {
      await prisma.agentMemory.update({
        where: { id: memoryId },
        data: { usageCount: { increment: 1 } },
      });
    } catch {
      // DB unavailable or record not found
    }
  }

  /**
   * Prune memories for an agent, keeping only the top N by score.
   */
  async pruneMemories(
    agentId: string,
    maxMemories: number = 50
  ): Promise<void> {
    // Prune short-term
    const stEntries = this.shortTerm.get(agentId);
    if (stEntries && stEntries.length > maxMemories) {
      stEntries.sort((a, b) => b.score - a.score);
      this.shortTerm.set(agentId, stEntries.slice(0, maxMemories));
    }

    // Prune DB
    try {
      const allDb = await prisma.agentMemory.findMany({
        where: { agentId },
        orderBy: { score: "desc" },
        select: { id: true },
      });

      if (allDb.length > maxMemories) {
        const idsToDelete = allDb.slice(maxMemories).map((r) => r.id);
        await prisma.agentMemory.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }
    } catch {
      // DB unavailable
    }
  }

  /**
   * Simple hash function for query deduplication.
   */
  hashQuery(query: string): string {
    const normalized = query.toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash + ch) | 0; // Convert to 32bit integer
    }
    return `qh_${(hash >>> 0).toString(36)}`;
  }

  /**
   * Clear all short-term (session) memory.
   */
  clearShortTerm(): void {
    this.shortTerm.clear();
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private async persistToDb(entry: MemoryEntry): Promise<void> {
    await prisma.agentMemory.create({
      data: {
        id: entry.id,
        agentId: entry.agentId,
        agentName: entry.agentId, // best-effort; caller can enrich
        domain: entry.domain,
        queryHash: entry.queryHash,
        content: entry.content,
        type: entry.type,
        score: entry.score,
        usageCount: entry.usageCount,
      },
    });
  }

  private rowToEntry(row: {
    id: string;
    agentId: string;
    content: string;
    type: string;
    domain: string;
    queryHash: string;
    score: number;
    usageCount: number;
    createdAt: Date;
  }): MemoryEntry {
    return {
      id: row.id,
      agentId: row.agentId,
      content: row.content,
      type: row.type as MemoryEntry["type"],
      domain: row.domain,
      queryHash: row.queryHash,
      score: row.score,
      usageCount: row.usageCount,
      createdAt: row.createdAt,
    };
  }

  private sortByScoreRecency(entries: MemoryEntry[]): MemoryEntry[] {
    const now = Date.now();
    return entries.sort((a, b) => {
      const recencyA = 1 / (1 + (now - a.createdAt.getTime()) / 3_600_000); // hour decay
      const recencyB = 1 / (1 + (now - b.createdAt.getTime()) / 3_600_000);
      return b.score * recencyB - a.score * recencyA;
    });
  }

  private generateId(): string {
    return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const memoryStore = new AgentMemoryStore();
