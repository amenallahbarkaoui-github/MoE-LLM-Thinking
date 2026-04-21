import type { IACPMessage, IACPThreadSummary, IACPStats } from "@/types";

/** Agent info used for routing decisions */
interface AgentRoutingInfo {
  domain?: string;
  expertise?: string[];
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  normal: 1,
  low: 2,
};

export class IACPBus {
  private messages: IACPMessage[] = [];
  private messageCounts: Map<string, number> = new Map();
  private maxMessagesPerAgent: number;
  /** Registry of agent routing info for domain/expertise-based routing */
  private agentRegistry: Map<string, AgentRoutingInfo> = new Map();

  constructor(maxMessagesPerAgent = 5) {
    this.maxMessagesPerAgent = maxMessagesPerAgent;
  }

  // ---------------------------------------------------------------------------
  // Agent registry (for routing)
  // ---------------------------------------------------------------------------

  /** Register an agent's domain and expertise so the bus can route to them */
  registerAgent(agentId: string, info: AgentRoutingInfo): void {
    this.agentRegistry.set(agentId, info);
  }

  // ---------------------------------------------------------------------------
  // Posting
  // ---------------------------------------------------------------------------

  post(message: IACPMessage): boolean {
    const isUrgent = message.priority === "urgent";
    const count = this.messageCounts.get(message.fromAgentId) || 0;

    // Urgent messages don't count toward the limit
    if (!isUrgent && count >= this.maxMessagesPerAgent) return false;

    // Auto-set threading: if replyTo is set, resolve threadId
    if (message.replyTo && !message.threadId) {
      const original = this.messages.find((m) => m.id === message.replyTo);
      if (original) {
        message.threadId = original.threadId ?? original.id;
      }
    }

    // Default priority
    if (!message.priority) {
      message.priority = "normal";
    }

    this.messages.push(message);

    if (!isUrgent) {
      this.messageCounts.set(message.fromAgentId, count + 1);
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Querying
  // ---------------------------------------------------------------------------

  getMessagesFor(agentId: string): IACPMessage[] {
    const filtered = this.messages.filter((m) => {
      // Direct message to this agent
      if (m.toAgentId === agentId) return true;

      // If routing hints exist, use them for "ALL" messages
      if (m.toAgentId === "ALL" && m.routingHint) {
        return this.matchesRoutingHint(agentId, m);
      }

      // Default broadcast
      if (m.toAgentId === "ALL") return true;

      return false;
    });

    // Sort by priority: urgent → normal → low
    return filtered.sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority ?? "normal"] ?? 1) -
        (PRIORITY_ORDER[b.priority ?? "normal"] ?? 1)
    );
  }

  getMessagesFrom(agentId: string): IACPMessage[] {
    return this.messages.filter((m) => m.fromAgentId === agentId);
  }

  getUrgentMessages(agentId: string): IACPMessage[] {
    return this.messages.filter(
      (m) =>
        m.priority === "urgent" &&
        (m.toAgentId === agentId || m.toAgentId === "ALL")
    );
  }

  canSend(agentId: string): boolean {
    const count = this.messageCounts.get(agentId) || 0;
    return count < this.maxMessagesPerAgent;
  }

  getAllMessages(): IACPMessage[] {
    return [...this.messages];
  }

  // ---------------------------------------------------------------------------
  // Threading
  // ---------------------------------------------------------------------------

  getThread(threadId: string): IACPMessage[] {
    return this.messages
      .filter((m) => m.threadId === threadId || m.id === threadId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getThreadSummary(threadId: string): IACPThreadSummary | null {
    const thread = this.getThread(threadId);
    if (thread.length === 0) return null;

    const participants = Array.from(new Set(thread.map((m) => m.fromAgentId)));
    return {
      messageCount: thread.length,
      participants,
      latestMessage: thread[thread.length - 1],
    };
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  getStats(): IACPStats {
    const messagesByType: Record<string, number> = {};
    const messagesByPriority: Record<string, number> = {};
    const threadIds = new Set<string>();

    for (const m of this.messages) {
      messagesByType[m.type] = (messagesByType[m.type] || 0) + 1;
      const p = m.priority ?? "normal";
      messagesByPriority[p] = (messagesByPriority[p] || 0) + 1;
      if (m.threadId) threadIds.add(m.threadId);
    }

    return {
      totalMessages: this.messages.length,
      messagesByType,
      messagesByPriority,
      activeThreads: threadIds.size,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  clear() {
    this.messages = [];
    this.messageCounts.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private matchesRoutingHint(agentId: string, message: IACPMessage): boolean {
    const hint = message.routingHint;
    if (!hint) return true;

    const agentInfo = this.agentRegistry.get(agentId);

    // broadcastToDomain: deliver to agents sharing the sender's domain
    if (hint.broadcastToDomain) {
      const senderInfo = this.agentRegistry.get(message.fromAgentId);
      if (senderInfo?.domain && agentInfo?.domain) {
        return agentInfo.domain === senderInfo.domain;
      }
    }

    // targetDomains: deliver to agents whose domain is in the list
    if (hint.targetDomains?.length) {
      if (!agentInfo?.domain || !hint.targetDomains.includes(agentInfo.domain)) {
        return false;
      }
    }

    // targetExpertise: deliver to agents with at least one matching expertise
    if (hint.targetExpertise?.length) {
      if (
        !agentInfo?.expertise?.length ||
        !hint.targetExpertise.some((e: string) => agentInfo.expertise!.includes(e))
      ) {
        return false;
      }
    }

    return true;
  }
}
