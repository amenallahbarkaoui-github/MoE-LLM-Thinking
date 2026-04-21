import { TokenBudgetTracker } from '@/core/budget/tracker'

describe('TokenBudgetTracker', () => {
  let tracker: TokenBudgetTracker

  beforeEach(() => {
    tracker = new TokenBudgetTracker(10000)
  })

  it('should record token usage and verify cumulative totals', () => {
    tracker.record('agent-1', { promptTokens: 100, completionTokens: 50, totalTokens: 150 })
    tracker.record('agent-1', { promptTokens: 200, completionTokens: 100, totalTokens: 300 })

    const total = tracker.getTotalUsage()
    expect(total.promptTokens).toBe(300)
    expect(total.completionTokens).toBe(150)
    expect(total.totalTokens).toBe(450)
  })

  it('should detect budget exceeded', () => {
    expect(tracker.isBudgetExceeded()).toBe(false)
    tracker.record('agent-1', { promptTokens: 5000, completionTokens: 5000, totalTokens: 10000 })
    expect(tracker.isBudgetExceeded()).toBe(true)
  })

  it('should track per-agent usage', () => {
    tracker.record('agent-1', { promptTokens: 100, completionTokens: 50, totalTokens: 150 })
    tracker.record('agent-2', { promptTokens: 200, completionTokens: 100, totalTokens: 300 })

    const agent1 = tracker.getAgentUsage('agent-1')
    expect(agent1.totalTokens).toBe(150)

    const agent2 = tracker.getAgentUsage('agent-2')
    expect(agent2.totalTokens).toBe(300)
  })

  it('should return zero usage for unknown agent', () => {
    const usage = tracker.getAgentUsage('unknown')
    expect(usage.totalTokens).toBe(0)
    expect(usage.promptTokens).toBe(0)
    expect(usage.completionTokens).toBe(0)
  })

  it('should calculate remaining budget', () => {
    tracker.record('agent-1', { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 })
    expect(tracker.getRemainingBudget()).toBe(8500)
  })

  it('should clamp remaining budget to zero', () => {
    tracker.record('agent-1', { promptTokens: 6000, completionTokens: 6000, totalTokens: 12000 })
    expect(tracker.getRemainingBudget()).toBe(0)
  })

  it('should return usage summary', () => {
    tracker.record('agent-1', { promptTokens: 100, completionTokens: 50, totalTokens: 150 })
    tracker.record('agent-2', { promptTokens: 200, completionTokens: 100, totalTokens: 300 })

    const summary = tracker.getUsageSummary()
    expect(summary.total.totalTokens).toBe(450)
    expect(summary.byAgent['agent-1'].totalTokens).toBe(150)
    expect(summary.byAgent['agent-2'].totalTokens).toBe(300)
    expect(summary.remaining).toBe(9550)
    expect(summary.percentUsed).toBeCloseTo(4.5)
  })

  it('should reset all usage', () => {
    tracker.record('agent-1', { promptTokens: 100, completionTokens: 50, totalTokens: 150 })
    tracker.reset()

    const total = tracker.getTotalUsage()
    expect(total.totalTokens).toBe(0)
    expect(tracker.getRemainingBudget()).toBe(10000)
  })

  it('should use default budget of 100000', () => {
    const defaultTracker = new TokenBudgetTracker()
    expect(defaultTracker.getRemainingBudget()).toBe(100000)
  })
})
