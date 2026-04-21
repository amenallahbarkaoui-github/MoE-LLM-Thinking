import { estimateQueryCost } from '@/core/budget/estimator'

describe('estimateQueryCost', () => {
  it('should estimate cost for gpt-4o', () => {
    const result = estimateQueryCost({ agentCount: 3, model: 'gpt-4o' })
    // 3 agents: totalCalls = 3 + 3 + 1 = 7
    // promptTokens = 7 * 500 = 3500, completionTokens = 7 * 300 = 2100
    expect(result.estimatedTokens).toBe(5600)
    expect(result.currency).toBe('USD')
    // inputCost = (3500/1000000)*2.5 = 0.00875, outputCost = (2100/1000000)*10 = 0.021
    expect(result.estimatedCost).toBeCloseTo(0.029750, 5)
  })

  it('should estimate cost for claude-sonnet-4-20250514', () => {
    const result = estimateQueryCost({ agentCount: 3, model: 'claude-sonnet-4-20250514' })
    // inputCost = (3500/1000000)*3 = 0.0105, outputCost = (2100/1000000)*15 = 0.0315
    expect(result.estimatedCost).toBeCloseTo(0.042, 3)
  })

  it('should estimate cost for gpt-3.5-turbo', () => {
    const result = estimateQueryCost({ agentCount: 3, model: 'gpt-3.5-turbo' })
    // inputCost = (3500/1000000)*0.5 = 0.00175, outputCost = (2100/1000000)*1.5 = 0.00315
    expect(result.estimatedCost).toBeCloseTo(0.00490, 4)
  })

  it('should scale with different agent counts', () => {
    const small = estimateQueryCost({ agentCount: 2, model: 'gpt-4o' })
    const large = estimateQueryCost({ agentCount: 10, model: 'gpt-4o' })
    expect(large.estimatedTokens).toBeGreaterThan(small.estimatedTokens)
    expect(large.estimatedCost).toBeGreaterThan(small.estimatedCost)
  })

  it('should accept custom token averages', () => {
    const result = estimateQueryCost({
      agentCount: 1,
      model: 'gpt-4o',
      averagePromptTokens: 1000,
      averageCompletionTokens: 500,
    })
    // totalCalls = 1 + 1 + 1 = 3
    // promptTokens = 3000, completionTokens = 1500
    expect(result.estimatedTokens).toBe(4500)
  })

  it('should use default pricing for unknown model', () => {
    const result = estimateQueryCost({ agentCount: 3, model: 'unknown-model' })
    // Default: inputPer1M=1, outputPer1M=3
    // inputCost = (3500/1000000)*1 = 0.0035, outputCost = (2100/1000000)*3 = 0.0063
    expect(result.estimatedCost).toBeCloseTo(0.0098, 4)
    expect(result.currency).toBe('USD')
  })
})
