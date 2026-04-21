// Mock the logger module before importing CircuitBreaker
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  }),
}))

import { CircuitBreaker } from '@/lib/circuit-breaker'

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker

  beforeEach(() => {
    cb = new CircuitBreaker('test', {
      failureThreshold: 3,
      resetTimeout: 100, // 100ms for fast tests
      halfOpenMaxAttempts: 2,
    })
  })

  it('should execute successfully in CLOSED state', async () => {
    const result = await cb.execute(() => Promise.resolve('ok'))
    expect(result).toBe('ok')
    expect(cb.getStats().state).toBe('CLOSED')
    expect(cb.getStats().successCount).toBe(1)
  })

  it('should transition to OPEN after reaching failure threshold', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow('fail')
    }

    expect(cb.getStats().state).toBe('OPEN')
    expect(cb.getStats().failureCount).toBe(3)
  })

  it('should reject immediately when OPEN', async () => {
    const fail = () => Promise.reject(new Error('fail'))
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow('fail')
    }

    await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toThrow('OPEN')
  })

  it('should transition to HALF_OPEN after timeout', async () => {
    const fail = () => Promise.reject(new Error('fail'))
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow('fail')
    }
    expect(cb.getStats().state).toBe('OPEN')

    // Wait for resetTimeout
    await new Promise((r) => setTimeout(r, 150))

    // Next execute should transition to HALF_OPEN and succeed
    const result = await cb.execute(() => Promise.resolve('recovered'))
    expect(result).toBe('recovered')
    // After 1 success in HALF_OPEN, still HALF_OPEN (need 2)
    expect(cb.getStats().state).toBe('HALF_OPEN')
  })

  it('should recover from HALF_OPEN to CLOSED after enough successes', async () => {
    const fail = () => Promise.reject(new Error('fail'))
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow('fail')
    }

    await new Promise((r) => setTimeout(r, 150))

    // Two successful calls in HALF_OPEN should close it
    await cb.execute(() => Promise.resolve('ok1'))
    await cb.execute(() => Promise.resolve('ok2'))
    expect(cb.getStats().state).toBe('CLOSED')
  })

  it('should return to OPEN on failure in HALF_OPEN', async () => {
    const fail = () => Promise.reject(new Error('fail'))
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow('fail')
    }

    await new Promise((r) => setTimeout(r, 150))

    // Fail in HALF_OPEN
    await expect(cb.execute(fail)).rejects.toThrow('fail')
    expect(cb.getStats().state).toBe('OPEN')
  })

  it('should track stats correctly', async () => {
    await cb.execute(() => Promise.resolve('a'))
    await cb.execute(() => Promise.resolve('b'))
    await expect(cb.execute(() => Promise.reject(new Error('x')))).rejects.toThrow()

    const stats = cb.getStats()
    expect(stats.totalRequests).toBe(3)
    expect(stats.successCount).toBe(2)
    expect(stats.failureCount).toBe(1)
    expect(stats.state).toBe('CLOSED')
    expect(stats.lastFailure).toBeInstanceOf(Date)
  })

  it('should reset manually', async () => {
    const fail = () => Promise.reject(new Error('fail'))
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow('fail')
    }
    expect(cb.getStats().state).toBe('OPEN')

    cb.reset()
    expect(cb.getStats().state).toBe('CLOSED')
    expect(cb.getStats().failureCount).toBe(0)
  })
})
