import type { AgentDomain, AgentInstance } from "./agent";
import type { IACPMessage } from "./iacp";
import type { TokenUsage } from "./provider";

export interface QueryAnalysis {
  query: string;
  detectedDomains: AgentDomain[];
  complexity: "simple" | "moderate" | "complex";
  suggestedAgentCount: number;
  summary: string;
}

export interface AgentSelection {
  primary: string[];
  secondary: string[];
  alwaysActive: string[];
}

export type CouncilPhase =
  | 'analysis'
  | 'selection'
  | 'thinking'
  | 'discussing'
  | 'verifying'
  | 'synthesis';

export type CouncilStatus =
  | "idle"
  | "analyzing"
  | "selecting"
  | "thinking"
  | "discussing"
  | "verifying"
  | "synthesizing"
  | "complete"
  | "error";

export interface CouncilSession {
  id: string;
  query: string;
  analysis: QueryAnalysis | null;
  selection: AgentSelection | null;
  agents: Record<string, AgentInstance>;
  iacpMessages: IACPMessage[];
  synthesizedResponse: string | null;
  consensus: ConsensusResult | null;
  status: CouncilStatus;
  startedAt: number;
  completedAt: number | null;
  totalTokensUsed: number;
  tokenUsage?: {
    total: TokenUsage;
    byAgent: Record<string, TokenUsage>;
    remaining: number;
    percentUsed: number;
  };
  error: string | null;
}

export interface TokenBudgetConfig {
  maxTokens: number;
  warnThreshold: number;
}

// ─── Reasoning Configuration ──────────────────────────────────────

export type ReasoningDepth = 'quick' | 'standard' | 'deep';

export interface ReasoningConfig {
  depth: ReasoningDepth;
  enableCoT: boolean;
  enableVerification: boolean;
  maxVerificationRounds: number;
}

export interface ReasoningBranch {
  branch: number;
  thought: string;
  confidence: number;
}

export interface CoTStep {
  step: number;
  reasoning: string;
  confidence: number;
}

export interface CoTResult {
  steps: CoTStep[];
  conclusion: string;
  overallConfidence: number;
}

export interface VerificationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export type VerificationStatus = 'verified' | 'disputed' | 'unverified';

// ─── Consensus & Synthesis ─────────────────────────────────────

export interface ConsensusResult {
  consensusPoints: string[];
  disagreementPoints: string[];
  consensusScore: number;
}

export interface SynthesisConfig {
  consensusThreshold?: number;
}
