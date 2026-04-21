import { prisma } from "./db"
import { createLogger } from "./logger"

const logger = createLogger("metrics")

export interface AgentPerformanceScore {
  agentId: string
  agentName: string
  domain: string
  overallScore: number       // 0-1, weighted composite
  responseQuality: number    // 0-1, from qualityScore feedback
  relevance: number          // 0-1, from relevanceScore
  speed: number              // 0-1, normalized response time (faster = higher)
  consistency: number        // 0-1, variance in quality scores
  totalSessions: number
  lastUsed: Date | null
}

const MAX_EXPECTED_TIME = 30000 // ms

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map((v) => (v - mean) ** 2)
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(variance)
}

function computeOverallScore(
  quality: number,
  relevance: number,
  speed: number,
  consistency: number
): number {
  return clamp01(quality * 0.4 + relevance * 0.3 + speed * 0.2 + consistency * 0.1)
}

class AgentMetricsTracker {
  /** Record a metric after an agent completes */
  async recordMetric(metric: {
    sessionId: string
    agentId: string
    agentName: string
    domain: string
    responseTime: number
    tokenCount: number
    qualityScore?: number
    relevanceScore?: number
  }): Promise<void> {
    try {
      await prisma.agentMetric.create({
        data: {
          sessionId: metric.sessionId,
          agentId: metric.agentId,
          agentName: metric.agentName,
          domain: metric.domain,
          responseTime: metric.responseTime,
          tokenCount: metric.tokenCount,
          qualityScore: metric.qualityScore ?? null,
          relevanceScore: metric.relevanceScore ?? null,
        },
      })
    } catch (error) {
      logger.error("[MetricsTracker] Failed to record metric", { error: String(error) })
    }
  }

  /** Get performance scores for agents, optionally filtered by domain */
  async getPerformanceScores(domain?: string): Promise<AgentPerformanceScore[]> {
    try {
      const where = domain ? { domain } : {}
      const metrics = await prisma.agentMetric.findMany({ where })

      // Group metrics by agentId
      const grouped = new Map<string, typeof metrics>()
      for (const m of metrics) {
        const existing = grouped.get(m.agentId) ?? []
        existing.push(m)
        grouped.set(m.agentId, existing)
      }

      const scores: AgentPerformanceScore[] = []
      for (const [agentId, agentMetrics] of grouped) {
        scores.push(this.computeScore(agentId, agentMetrics))
      }

      return scores.sort((a, b) => b.overallScore - a.overallScore)
    } catch (error) {
      logger.error("[MetricsTracker] Failed to get performance scores", { error: String(error) })
      return []
    }
  }

  /** Get a single agent's performance */
  async getAgentScore(agentId: string): Promise<AgentPerformanceScore | null> {
    try {
      const metrics = await prisma.agentMetric.findMany({
        where: { agentId },
      })
      if (metrics.length === 0) return null
      return this.computeScore(agentId, metrics)
    } catch (error) {
      logger.error("[MetricsTracker] Failed to get agent score", { error: String(error) })
      return null
    }
  }

  /** Get top N agents for a domain based on performance */
  async getTopAgents(domain: string, limit = 5): Promise<AgentPerformanceScore[]> {
    const scores = await this.getPerformanceScores(domain)
    return scores.slice(0, limit)
  }

  /**
   * Get agents that should be suppressed (consistently low quality).
   * Suppress if overallScore < threshold (default 0.3) AND totalSessions > 5
   */
  async getSuppressedAgents(threshold = 0.3): Promise<string[]> {
    try {
      const allScores = await this.getPerformanceScores()
      return allScores
        .filter((s) => s.overallScore < threshold && s.totalSessions > 5)
        .map((s) => s.agentId)
    } catch (error) {
      logger.error("[MetricsTracker] Failed to get suppressed agents", { error: String(error) })
      return []
    }
  }

  /** Record user feedback (thumbs up/down) */
  async recordFeedback(
    sessionId: string,
    agentId: string,
    wasUseful: boolean
  ): Promise<void> {
    try {
      // Find the most recent metric for this agent in this session
      const metric = await prisma.agentMetric.findFirst({
        where: { sessionId, agentId },
        orderBy: { createdAt: "desc" },
      })

      if (metric) {
        await prisma.agentMetric.update({
          where: { id: metric.id },
          data: {
            wasUseful,
            qualityScore: wasUseful ? Math.max(metric.qualityScore ?? 0.5, 0.7) : Math.min(metric.qualityScore ?? 0.5, 0.3),
          },
        })
      }
    } catch (error) {
      logger.error("[MetricsTracker] Failed to record feedback", { error: String(error) })
    }
  }

  /** Compute an AgentPerformanceScore from a set of raw metrics */
  private computeScore(
    agentId: string,
    metrics: Array<{
      agentId: string
      agentName: string
      domain: string
      responseTime: number
      qualityScore: number | null
      relevanceScore: number | null
      createdAt: Date
    }>
  ): AgentPerformanceScore {
    const latest = metrics.reduce((a, b) =>
      a.createdAt > b.createdAt ? a : b
    )

    // Quality: average of non-null qualityScores, default 0.5
    const qualityScores = metrics
      .map((m) => m.qualityScore)
      .filter((s): s is number => s !== null)
    const responseQuality =
      qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0.5

    // Relevance: average of non-null relevanceScores, default 0.5
    const relevanceScores = metrics
      .map((m) => m.relevanceScore)
      .filter((s): s is number => s !== null)
    const relevance =
      relevanceScores.length > 0
        ? relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length
        : 0.5

    // Speed: 1 - (avgResponseTime / maxExpectedTime), clamped 0-1
    const avgResponseTime =
      metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
    const speed = clamp01(1 - avgResponseTime / MAX_EXPECTED_TIME)

    // Consistency: 1 - stddev(qualityScores), clamped 0-1
    const consistency =
      qualityScores.length >= 2
        ? clamp01(1 - standardDeviation(qualityScores))
        : 0.5

    const overallScore = computeOverallScore(responseQuality, relevance, speed, consistency)

    return {
      agentId,
      agentName: latest.agentName,
      domain: latest.domain,
      overallScore,
      responseQuality,
      relevance,
      speed,
      consistency,
      totalSessions: metrics.length,
      lastUsed: latest.createdAt,
    }
  }
}

export const metricsTracker = new AgentMetricsTracker()
