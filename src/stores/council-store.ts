import { create } from "zustand";
import type {
  AgentStatus,
  AgentDomain,
  IACPMessage,
  QueryAnalysis,
  AgentSelection,
  CouncilStatus,
} from "@/types";

export interface AgentInfo {
  id: string;
  name: string;
  domain: AgentDomain;
  role: string;
  status: AgentStatus;
  thought: string | null;
  confidence: string | null;
  processingTime: number | null;
  batchIndex: number;
  error: string | null;
  branches: Array<{ branch: number; thought: string; confidence: number }>;
  selectedBranch: number | null;
  verifications: Array<{
    agentId: string;
    targetAgentId: string;
    claim: string;
    score: number;
    status: "verified" | "disputed" | "unverified";
    issues: string[];
    round: number;
  }>;
}

interface CouncilState {
  status: CouncilStatus;
  sessionId: string | null;
  analysis: QueryAnalysis | null;
  selection: AgentSelection | null;
  agents: Record<string, AgentInfo>;
  iacpMessages: IACPMessage[];
  finalResponse: string | null;
  totalTime: number | null;
  agentsActivated: number;
  agentsSucceeded: number;
  error: string | null;

  handleSSEEvent: (eventType: string, data: Record<string, unknown>) => void;
  reset: () => void;
}

export const useCouncilStore = create<CouncilState>()((set) => ({
  status: "idle",
  sessionId: null,
  analysis: null,
  selection: null,
  agents: {},
  iacpMessages: [],
  finalResponse: null,
  totalTime: null,
  agentsActivated: 0,
  agentsSucceeded: 0,
  error: null,

  handleSSEEvent: (eventType: string, data: Record<string, unknown>) => {
    switch (eventType) {
      case "council:start":
        set({
          status: "analyzing",
          sessionId: data.sessionId as string,
          error: null,
          finalResponse: null,
          agents: {},
          iacpMessages: [],
        });
        break;

      case "council:analysis":
        set({
          analysis: data.analysis as QueryAnalysis,
          status: "selecting",
        });
        break;

      case "council:selecting":
        set({
          selection: data.selection as AgentSelection,
          status: "thinking",
        });
        break;

      case "agent:activated":
        set((state) => ({
          agents: {
            ...state.agents,
            [data.agentId as string]: {
              id: data.agentId as string,
              name: data.agentName as string,
              domain: data.domain as AgentDomain,
              role: data.role as string,
              status: "waiting" as AgentStatus,
              thought: null,
              confidence: null,
              processingTime: null,
              batchIndex: data.batchIndex as number,
              error: null,
              branches: [],
              selectedBranch: null,
              verifications: [],
            },
          },
          agentsActivated: state.agentsActivated + 1,
        }));
        break;

      case "agent:thinking":
        set((state) => ({
          agents: {
            ...state.agents,
            [data.agentId as string]: {
              ...state.agents[data.agentId as string],
              status: "thinking" as AgentStatus,
            },
          },
        }));
        break;

      case "agent:thought":
        set((state) => ({
          agents: {
            ...state.agents,
            [data.agentId as string]: {
              ...state.agents[data.agentId as string],
              status: "complete" as AgentStatus,
              thought: data.thought as string,
              confidence: data.confidence as string,
              processingTime: data.processingTime as number,
              selectedBranch: (data.selectedBranch as number) ?? state.agents[data.agentId as string]?.selectedBranch ?? null,
            },
          },
          agentsSucceeded: state.agentsSucceeded + 1,
        }));
        break;

      case "agent:branch":
        set((state) => {
          const agentId = data.agentId as string;
          const agent = state.agents[agentId];
          if (!agent) return state;
          return {
            agents: {
              ...state.agents,
              [agentId]: {
                ...agent,
                branches: [
                  ...agent.branches,
                  {
                    branch: data.branch as number,
                    thought: data.thought as string,
                    confidence: data.confidence as number,
                  },
                ],
              },
            },
          };
        });
        break;

      case "agent:verification":
        set((state) => {
          const targetAgentId = data.targetAgentId as string;
          const agent = state.agents[targetAgentId];
          if (!agent) return state;
          return {
            agents: {
              ...state.agents,
              [targetAgentId]: {
                ...agent,
                verifications: [
                  ...agent.verifications,
                  {
                    agentId: data.agentId as string,
                    targetAgentId,
                    claim: data.claim as string,
                    score: data.score as number,
                    status: data.status as "verified" | "disputed" | "unverified",
                    issues: data.issues as string[],
                    round: data.round as number,
                  },
                ],
              },
            },
          };
        });
        break;

      case "agent:error":
        set((state) => ({
          agents: {
            ...state.agents,
            [data.agentId as string]: {
              ...state.agents[data.agentId as string],
              status: "error" as AgentStatus,
              error: data.error as string,
              thought: (data.thought as string) ?? state.agents[data.agentId as string]?.thought ?? null,
              confidence: (data.confidence as string) ?? state.agents[data.agentId as string]?.confidence ?? null,
            },
          },
        }));
        break;

      case "iacp:message":
        set((state) => ({
          iacpMessages: [...state.iacpMessages, data.message as IACPMessage],
        }));
        break;

      case "council:phase":
        // Handle phase events for discussing and verifying phases
        if (data.phase === "discussing" || data.phase === "verifying") {
          set({ status: data.phase as CouncilStatus });
        }
        break;

      case "council:synthesizing":
        set({ status: "synthesizing" });
        break;

      case "council:complete":
        set({
          status: "complete",
          finalResponse: data.response as string,
          totalTime: data.totalTime as number,
          agentsActivated: data.agentsActivated as number,
          agentsSucceeded: data.agentsSucceeded as number,
        });
        break;

      case "council:error":
        set({
          status: "error",
          error: data.error as string,
        });
        break;
    }
  },

  reset: () =>
    set({
      status: "idle",
      sessionId: null,
      analysis: null,
      selection: null,
      agents: {},
      iacpMessages: [],
      finalResponse: null,
      totalTime: null,
      agentsActivated: 0,
      agentsSucceeded: 0,
      error: null,
    }),
}));
