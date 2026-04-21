import type { AgentDefinition, AgentDomain } from "@/types";
import { ALL_AGENTS } from "./definitions";

class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();
  private domainIndex: Map<AgentDomain, AgentDefinition[]> = new Map();

  constructor() {
    for (const agent of ALL_AGENTS) {
      this.agents.set(agent.id, agent);
      const domainAgents = this.domainIndex.get(agent.domain) || [];
      domainAgents.push(agent);
      this.domainIndex.set(agent.domain, domainAgents);
    }
  }

  getAll(): AgentDefinition[] {
    return ALL_AGENTS;
  }

  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  getByDomain(domain: AgentDomain): AgentDefinition[] {
    return this.domainIndex.get(domain) || [];
  }

  getAlwaysActive(): AgentDefinition[] {
    return [
      this.agents.get("CROSS-008")!, // Fact Checker
      this.agents.get("PHI-003")!, // Critical Thinking
      this.agents.get("CROSS-009")!, // Devil's Advocate
    ].filter(Boolean);
  }

  search(query: string): AgentDefinition[] {
    const lower = query.toLowerCase();
    return ALL_AGENTS.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        a.description.toLowerCase().includes(lower) ||
        a.expertise.some((e) => e.toLowerCase().includes(lower)) ||
        a.subdomain.toLowerCase().includes(lower)
    );
  }

  getDomains(): AgentDomain[] {
    return Array.from(this.domainIndex.keys());
  }

  count(): number {
    return ALL_AGENTS.length;
  }
}

export const agentRegistry = new AgentRegistry();
