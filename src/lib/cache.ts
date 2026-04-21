/**
 * Semantic Response Cache with in-memory LRU eviction.
 * Best-effort caching — the app works perfectly without it.
 */

export interface CacheEntry {
  query: string;
  queryHash: string;
  response: string;
  consensus: unknown | null;
  tokenUsage: number;
  agentCount: number;
  createdAt: number;
  ttl: number; // time-to-live in ms
  lastAccessedAt: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
}

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL = 3_600_000; // 1 hour

export class ResponseCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private defaultTTL: number;
  private totalHits = 0;
  private totalMisses = 0;

  constructor(options?: CacheOptions) {
    this.cache = new Map();
    this.maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
    this.defaultTTL = options?.defaultTTL ?? DEFAULT_TTL;
  }

  // ─── Normalisation & Hashing ────────────────────────────────────

  /** Lowercase, trim, collapse whitespace, strip trailing punctuation variants */
  normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[?!.,;:]+$/g, "");
  }

  /** Simple DJB2-style hash of the normalised query */
  hashQuery(query: string): string {
    const normalised = this.normalizeQuery(query);
    let hash = 5381;
    for (let i = 0; i < normalised.length; i++) {
      hash = ((hash << 5) + hash + normalised.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
  }

  // ─── Core API ───────────────────────────────────────────────────

  /** Get a cached response. Returns `null` on miss or expiry. */
  get(query: string): CacheEntry | null {
    const key = this.hashQuery(query);
    const entry = this.cache.get(key);

    if (!entry) {
      this.totalMisses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      this.totalMisses++;
      return null;
    }

    // LRU: move to end of Map iteration order
    this.cache.delete(key);
    entry.lastAccessedAt = Date.now();
    this.cache.set(key, entry);
    this.totalHits++;
    return entry;
  }

  /** Store a response in the cache. */
  set(
    query: string,
    response: string,
    metadata?: {
      consensus?: unknown;
      tokenUsage?: number;
      agentCount?: number;
      ttl?: number;
    }
  ): void {
    const key = this.hashQuery(query);

    // If already present, delete first so the new entry lands at the end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    const entry: CacheEntry = {
      query,
      queryHash: key,
      response,
      consensus: metadata?.consensus ?? null,
      tokenUsage: metadata?.tokenUsage ?? 0,
      agentCount: metadata?.agentCount ?? 0,
      createdAt: Date.now(),
      ttl: metadata?.ttl ?? this.defaultTTL,
      lastAccessedAt: Date.now(),
    };

    this.cache.set(key, entry);
  }

  // ─── Fuzzy / Similar Match ──────────────────────────────────────

  /**
   * Return cached entries whose normalised query shares ≥ `threshold`
   * fraction of words with the incoming query.
   */
  findSimilar(query: string, threshold = 0.8): CacheEntry[] {
    const normWords = new Set(this.normalizeQuery(query).split(" "));
    if (normWords.size === 0) return [];

    const results: CacheEntry[] = [];

    for (const entry of this.cache.values()) {
      // Skip expired
      if (Date.now() - entry.createdAt > entry.ttl) continue;

      const entryWords = new Set(this.normalizeQuery(entry.query).split(" "));
      if (entryWords.size === 0) continue;

      let shared = 0;
      for (const w of normWords) {
        if (entryWords.has(w)) shared++;
      }

      const similarity = shared / Math.max(normWords.size, entryWords.size);
      if (similarity >= threshold) {
        results.push(entry);
      }
    }

    return results;
  }

  // ─── Stats & Maintenance ────────────────────────────────────────

  getStats(): CacheStats {
    const total = this.totalHits + this.totalMisses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.totalHits / total : 0,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
    };
  }

  /** Remove all expired entries. */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /** Clear the entire cache. */
  clear(): void {
    this.cache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  // ─── Internal ───────────────────────────────────────────────────

  /** Evict the least-recently-used entry (first key in Map iteration order). */
  private evict(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }
}

/** Singleton instance used across the application. */
export const responseCache = new ResponseCache();
