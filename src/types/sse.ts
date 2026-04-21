import type { AgentDomain } from "./agent";
import type { IACPMessage } from "./iacp";
import type { QueryAnalysis, AgentSelection, CouncilPhase, VerificationStatus } from "./council";
import type { TokenUsage } from "./provider";

export type SSEEventType =
  | "council:start"
  | "council:analysis"
  | "council:selecting"
  | "council:phase"
  | "agent:activated"
  | "agent:thinking"
  | "agent:thought"
  | "agent:branch"
  | "agent:verification"
  | "agent:error"
  | "iacp:message"
  | "council:synthesizing"
  | "council:synthesis_progress"
  | "council:budget_warning"
  | "council:complete"
  | "council:cache_hit"
  | "council:clarification_needed"
  | "council:error";

export interface SSEEventData {
  "council:start": { sessionId: string; query: string };
  "council:analysis": { analysis: QueryAnalysis };
  "council:selecting": { selection: AgentSelection };
  "agent:activated": {
    agentId: string;
    agentName: string;
    domain: AgentDomain;
    role: string;
    batchIndex: number;
  };
  "council:phase": {
    phase: CouncilPhase;
    message: string;
    metadata?: Record<string, unknown>;
  };
  "agent:thinking": { agentId: string; branch?: number; totalBranches?: number };
  "agent:thought": {
    agentId: string;
    thought: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    processingTime: number;
    branches?: number;
    selectedBranch?: number;
  };
  "agent:branch": {
    agentId: string;
    branch: number;
    thought: string;
    confidence: number;
  };
  "agent:verification": {
    agentId: string;
    targetAgentId: string;
    claim: string;
    score: number;
    status: VerificationStatus;
    issues: string[];
    round: number;
  };
  "agent:error": { agentId: string; error: string };
  "iacp:message": { message: IACPMessage };
  "council:synthesizing": { agentCount: number; reason?: string };
  "council:synthesis_progress": {
    phase: "early" | "developing" | "complete";
    content: string;
    agentsProcessed: number;
    totalAgents: number;
    consensusScore?: number;
  };
  "council:budget_warning": {
    warning: string;
    percentUsed: number;
    remaining: number;
  };
  "council:complete": {
    response: string;
    totalTime: number;
    agentsActivated: number;
    agentsSucceeded: number;
    totalTokens: number;
    tokenUsage?: {
      total: TokenUsage;
      byAgent: Record<string, TokenUsage>;
      remaining: number;
      percentUsed: number;
    };
  };
  "council:cache_hit": {
    query: string;
    response: string;
    cachedAt: number;
  };
  "council:clarification_needed": {
    suggestions: string[];
    reasons: string[];
    complexity: string;
  };
  "council:error": { error: string };
}

export interface SSEEvent<T extends SSEEventType = SSEEventType> {
  type: T;
  data: T extends keyof SSEEventData ? SSEEventData[T] : unknown;
  timestamp: number;
}
