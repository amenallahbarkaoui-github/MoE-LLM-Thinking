export type AgentDomain =
  | "technology"
  | "business"
  | "law"
  | "science"
  | "creativity"
  | "education"
  | "philosophy"
  | "communication"
  | "psychology"
  | "economics"
  | "cross";

export type AgentRole = "primary" | "secondary" | "tertiary" | "always-active";

export type AgentStatus =
  | "idle"
  | "waiting"
  | "thinking"
  | "discussing"
  | "complete"
  | "error"
  | "timeout";

export interface AgentDefinition {
  id: string;
  name: string;
  domain: AgentDomain;
  subdomain: string;
  description: string;
  expertise: string[];
  systemPrompt: string;
  icon: string;
  color: string;
  adjacentDomains: AgentDomain[];
}

export interface AgentInstance {
  definition: AgentDefinition;
  role: AgentRole;
  status: AgentStatus;
  thought: string | null;
  finalResponse: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | null;
  processingTime: number | null;
  batchIndex: number;
  error: string | null;
}

export interface AgentThought {
  agentId: string;
  agentName: string;
  domain: AgentDomain;
  thought: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}
