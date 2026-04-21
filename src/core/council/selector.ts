import type { AgentDomain, AgentDefinition, QueryAnalysis, AgentSelection } from "@/types";
import { agentRegistry } from "../agents/registry";
import { ADJACENCY_MAP } from "./adjacency";
import { metricsTracker, type AgentPerformanceScore } from "@/lib/metrics";
import { createLogger } from "@/lib/logger";

const logger = createLogger("selector");

/** Agent IDs that are never suppressed regardless of metrics */
const ALWAYS_ACTIVE_ROLES = new Set([
  "CROSS-008",
  "CROSS-009",
  "PHI-003",
]);

/** Default performance score for agents with no history */
const DEFAULT_PERFORMANCE_SCORE = 0.5;

/** Threshold above which an agent gets a boost in ranking */
const HIGH_PERFORMANCE_THRESHOLD = 0.7;

export interface AgentSelectionWithConfidence extends AgentSelection {
  /** Per-agent selection confidence: domain relevance * performance */
  confidence: Record<string, number>;
}

export async function selectAgents(
  analysis: QueryAnalysis,
  maxAgents: number
): Promise<AgentSelectionWithConfidence> {
  const alwaysActiveAgents = agentRegistry.getAlwaysActive();
  const alwaysActiveIds = new Set(alwaysActiveAgents.map((a) => a.id));

  // ── Primary: agents from detected domains ─────────────────────────
  const primaryAgents: AgentDefinition[] = [];
  for (const domain of analysis.detectedDomains) {
    const domainAgents = agentRegistry.getByDomain(domain);
    for (const agent of domainAgents) {
      if (!alwaysActiveIds.has(agent.id)) {
        primaryAgents.push(agent);
      }
    }
  }

  // ── Secondary: agents from adjacent domains ───────────────────────
  const secondaryDomains = new Set<AgentDomain>();
  const primaryDomains = new Set(analysis.detectedDomains);
  for (const domain of analysis.detectedDomains) {
    const adjacent = ADJACENCY_MAP[domain] || [];
    for (const adjDomain of adjacent) {
      if (!primaryDomains.has(adjDomain)) {
        secondaryDomains.add(adjDomain);
      }
    }
  }

  const secondaryAgents: AgentDefinition[] = [];
  for (const domain of secondaryDomains) {
    const domainAgents = agentRegistry.getByDomain(domain);
    for (const agent of domainAgents) {
      if (
        !alwaysActiveIds.has(agent.id) &&
        !primaryAgents.some((p) => p.id === agent.id)
      ) {
        secondaryAgents.push(agent);
      }
    }
  }

  // ── Fetch performance data ────────────────────────────────────────
  let performanceMap: Map<string, AgentPerformanceScore>;
  let suppressedIds: Set<string>;

  try {
    const [allScores, suppressed] = await Promise.all([
      metricsTracker.getPerformanceScores(),
      metricsTracker.getSuppressedAgents(),
    ]);
    performanceMap = new Map(allScores.map((s) => [s.agentId, s]));
    suppressedIds = new Set(suppressed);
  } catch (error) {
    logger.error("[Selector] Failed to fetch metrics, using defaults", { error: String(error) });
    performanceMap = new Map();
    suppressedIds = new Set();
  }

  // ── Helper: get perf score for an agent ───────────────────────────
  const getPerf = (agentId: string): number =>
    performanceMap.get(agentId)?.overallScore ?? DEFAULT_PERFORMANCE_SCORE;

  // ── Helper: check if an agent is suppressible ─────────────────────
  const isSuppressible = (agent: AgentDefinition): boolean => {
    if (ALWAYS_ACTIVE_ROLES.has(agent.id)) return false;
    return suppressedIds.has(agent.id);
  };

  // ── Filter out suppressed agents ──────────────────────────────────
  const filteredPrimary = primaryAgents.filter((a) => !isSuppressible(a));
  const filteredSecondary = secondaryAgents.filter((a) => !isSuppressible(a));

  // ── Rank by domain relevance * performance ────────────────────────
  const rankAgent = (agent: AgentDefinition, domainRelevance: number) => {
    const perfScore = getPerf(agent.id);
    const combinedScore = domainRelevance * perfScore;
    return { agent, combinedScore, perfScore, domainRelevance };
  };

  // Primary agents get a domain relevance of 1.0
  const rankedPrimary = filteredPrimary
    .map((a) => rankAgent(a, 1.0))
    .sort((a, b) => {
      // Boost high-performers to the top
      const aBoost = a.perfScore > HIGH_PERFORMANCE_THRESHOLD ? 1 : 0;
      const bBoost = b.perfScore > HIGH_PERFORMANCE_THRESHOLD ? 1 : 0;
      if (aBoost !== bBoost) return bBoost - aBoost;
      return b.combinedScore - a.combinedScore;
    });

  // Secondary agents get a domain relevance of 0.6
  const rankedSecondary = filteredSecondary
    .map((a) => rankAgent(a, 0.6))
    .sort((a, b) => {
      const aBoost = a.perfScore > HIGH_PERFORMANCE_THRESHOLD ? 1 : 0;
      const bBoost = b.perfScore > HIGH_PERFORMANCE_THRESHOLD ? 1 : 0;
      if (aBoost !== bBoost) return bBoost - aBoost;
      return b.combinedScore - a.combinedScore;
    });

  // ── Allocate slots ────────────────────────────────────────────────
  const alwaysActiveCount = alwaysActiveAgents.length;
  const remainingSlots = Math.max(0, maxAgents - alwaysActiveCount);

  const selectedPrimary = rankedPrimary.slice(
    0,
    Math.min(rankedPrimary.length, remainingSlots)
  );
  const primarySlotsTaken = selectedPrimary.length;
  const secondarySlots = Math.max(0, remainingSlots - primarySlotsTaken);
  const selectedSecondary = rankedSecondary.slice(
    0,
    Math.min(rankedSecondary.length, secondarySlots)
  );

  // ── Build confidence map ──────────────────────────────────────────
  const confidence: Record<string, number> = {};

  for (const item of selectedPrimary) {
    confidence[item.agent.id] = clamp01(item.combinedScore);
  }
  for (const item of selectedSecondary) {
    confidence[item.agent.id] = clamp01(item.combinedScore);
  }
  // Always-active agents get confidence based purely on performance
  for (const agent of alwaysActiveAgents) {
    confidence[agent.id] = clamp01(getPerf(agent.id));
  }

  return {
    primary: selectedPrimary.map((r) => r.agent.id),
    secondary: selectedSecondary.map((r) => r.agent.id),
    alwaysActive: alwaysActiveAgents.map((a) => a.id),
    confidence,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
