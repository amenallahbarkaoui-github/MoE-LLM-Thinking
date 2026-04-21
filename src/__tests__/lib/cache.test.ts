import { ResponseCache } from '@/lib/cache'

describe('ResponseCache', () => {
  let cache: ResponseCache

  beforeEach(() => {
    cache = new ResponseCache({ maxSize: 5, defaultTTL: 60000 })
  })

  it('should set and get a cached entry', () => {
    cache.set('What is AI?', 'AI is artificial intelligence')
    const entry = cache.get('What is AI?')
    expect(entry).not.toBeNull()
    expect(entry!.response).toBe('AI is artificial intelligence')
  })

  it('should return null for cache miss', () => {
    const entry = cache.get('nonexistent query')
    expect(entry).toBeNull()
  })

  it('should expire entries after TTL', () => {
    const shortCache = new ResponseCache({ maxSize: 5, defaultTTL: 1 })
    shortCache.set('test', 'response')

    // Advance time by manipulating entry
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now + 100)

    const entry = shortCache.get('test')
    expect(entry).toBeNull()

    jest.restoreAllMocks()
  })

  it('should evict LRU entry when max size reached', () => {
    cache.set('query1', 'response1')
    cache.set('query2', 'response2')
    cache.set('query3', 'response3')
    cache.set('query4', 'response4')
    cache.set('query5', 'response5')

    // Cache is full (5). Adding a 6th should evict the first
    cache.set('query6', 'response6')

    // query1 should be evicted (LRU)
    const entry1 = cache.get('query1')
    expect(entry1).toBeNull()

    // query6 should exist
    const entry6 = cache.get('query6')
    expect(entry6).not.toBeNull()
  })

  it('should normalize queries consistently', () => {
    expect(cache.normalizeQuery('  What is AI?  ')).toBe('what is ai')
    expect(cache.normalizeQuery('HELLO   WORLD!!!')).toBe('hello world')
    expect(cache.normalizeQuery('test;:')).toBe('test')
  })

  it('should find similar entries with fuzzy matching', () => {
    cache.set('What is artificial intelligence?', 'AI answer')
    cache.set('How does machine learning work?', 'ML answer')

    // Very similar query
    const similar = cache.findSimilar('What is artificial intelligence', 0.8)
    expect(similar.length).toBeGreaterThanOrEqual(1)
    expect(similar[0].response).toBe('AI answer')
  })

  it('should track hit rate stats', () => {
    cache.set('q1', 'r1')
    cache.get('q1') // hit
    cache.get('q1') // hit
    cache.get('missing') // miss

    const stats = cache.getStats()
    expect(stats.totalHits).toBe(2)
    expect(stats.totalMisses).toBe(1)
    expect(stats.hitRate).toBeCloseTo(2 / 3)
    expect(stats.size).toBe(1)
    expect(stats.maxSize).toBe(5)
  })

  it('should cleanup expired entries', () => {
    cache.set('old', 'data', { ttl: 1 })
    cache.set('fresh', 'data', { ttl: 999999 })

    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now + 100)

    cache.cleanup()

    // old should be cleaned up, fresh should remain
    // We need to restore Date.now for subsequent get calls to work
    jest.restoreAllMocks()

    // Check via stats that size decreased
    // fresh is still valid, old was cleaned
    const stats = cache.getStats()
    expect(stats.size).toBe(1)
  })

  it('should clear all entries and reset stats', () => {
    cache.set('q1', 'r1')
    cache.get('q1')
    cache.clear()

    const stats = cache.getStats()
    expect(stats.size).toBe(0)
    expect(stats.totalHits).toBe(0)
    expect(stats.totalMisses).toBe(0)
  })
})
