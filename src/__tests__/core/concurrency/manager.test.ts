import { ConcurrencyManager } from '@/core/concurrency/manager'

describe('ConcurrencyManager', () => {
  it('should execute all tasks and return results', async () => {
    const manager = new ConcurrencyManager(3)

    const tasks = [
      () => Promise.resolve('a'),
      () => Promise.resolve('b'),
      () => Promise.resolve('c'),
    ]

    const results = await manager.executeBatch(tasks)
    expect(results).toHaveLength(3)
    expect(results[0]).toEqual({ success: true, result: 'a' })
    expect(results[1]).toEqual({ success: true, result: 'b' })
    expect(results[2]).toEqual({ success: true, result: 'c' })
  })

  it('should respect concurrency limit', async () => {
    const manager = new ConcurrencyManager(2)
    let maxConcurrent = 0
    let current = 0

    const tasks = Array.from({ length: 5 }, () => async () => {
      current++
      maxConcurrent = Math.max(maxConcurrent, current)
      await new Promise(r => setTimeout(r, 50))
      current--
      return 'done'
    })

    await manager.executeBatch(tasks)
    expect(maxConcurrent).toBeLessThanOrEqual(2)
  })

  it('should handle task errors without breaking other tasks', async () => {
    const manager = new ConcurrencyManager(3)

    const tasks = [
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('fail')),
      () => Promise.resolve('also ok'),
    ]

    const results = await manager.executeBatch(tasks)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(false)
    expect(results[1].error?.message).toBe('fail')
    expect(results[2].success).toBe(true)
  })

  it('should call onTaskComplete callback', async () => {
    const manager = new ConcurrencyManager(3)
    const completed: number[] = []

    await manager.executeBatch(
      [() => Promise.resolve('a'), () => Promise.resolve('b')],
      (index) => completed.push(index),
    )

    expect(completed).toContain(0)
    expect(completed).toContain(1)
  })

  it('should call onTaskError callback', async () => {
    const manager = new ConcurrencyManager(3)
    const errors: Array<{ index: number; message: string }> = []

    await manager.executeBatch(
      [() => Promise.reject(new Error('boom'))],
      undefined,
      (index, error) => errors.push({ index, message: error.message }),
    )

    expect(errors).toHaveLength(1)
    expect(errors[0].index).toBe(0)
    expect(errors[0].message).toBe('boom')
  })

  it('should release slots after completion allowing queued tasks to run', async () => {
    const manager = new ConcurrencyManager(1) // only 1 at a time
    const order: number[] = []

    const tasks = [0, 1, 2].map((i) => async () => {
      order.push(i)
      await new Promise(r => setTimeout(r, 10))
      return i
    })

    const results = await manager.executeBatch(tasks)
    expect(results).toHaveLength(3)
    expect(results.every(r => r.success)).toBe(true)
    // All tasks should have executed
    expect(order).toHaveLength(3)
  })
})
