import type { TokenUsage } from "@/types";

export class TokenBudgetTracker {
  private maxBudget: number;
  private agentUsage: Map<string, TokenUsage> = new Map();

  constructor(maxBudget: number = 100000) {
    this.maxBudget = maxBudget;
  }

  record(agentId: string, usage: TokenUsage): void {
    const existing = this.agentUsage.get(agentId);
    if (existing) {
      this.agentUsage.set(agentId, {
        promptTokens: existing.promptTokens + usage.promptTokens,
        completionTokens: existing.completionTokens + usage.completionTokens,
        totalTokens: existing.totalTokens + usage.totalTokens,
      });
    } else {
      this.agentUsage.set(agentId, { ...usage });
    }
  }

  getTotalUsage(): TokenUsage {
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    for (const usage of this.agentUsage.values()) {
      promptTokens += usage.promptTokens;
      completionTokens += usage.completionTokens;
      totalTokens += usage.totalTokens;
    }

    return { promptTokens, completionTokens, totalTokens };
  }

  getAgentUsage(agentId: string): TokenUsage {
    return this.agentUsage.get(agentId) ?? {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }

  getRemainingBudget(): number {
    const total = this.getTotalUsage();
    return Math.max(0, this.maxBudget - total.totalTokens);
  }

  isBudgetExceeded(): boolean {
    return this.getTotalUsage().totalTokens >= this.maxBudget;
  }

  getUsageSummary(): {
    total: TokenUsage;
    byAgent: Record<string, TokenUsage>;
    remaining: number;
    percentUsed: number;
  } {
    const total = this.getTotalUsage();
    const byAgent: Record<string, TokenUsage> = {};
    for (const [agentId, usage] of this.agentUsage.entries()) {
      byAgent[agentId] = { ...usage };
    }
    return {
      total,
      byAgent,
      remaining: this.getRemainingBudget(),
      percentUsed: this.maxBudget > 0 ? (total.totalTokens / this.maxBudget) * 100 : 0,
    };
  }

  reset(): void {
    this.agentUsage.clear();
  }
}
