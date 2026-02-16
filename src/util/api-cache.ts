/**
 * Simple in-memory TTL cache for API responses.
 * Prevents recomputing identical responses for concurrent dashboard connections.
 */
export class ApiCache {
  private store = new Map<string, { data: unknown; expires: number }>()

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expires) {
      this.store.delete(key)
      return undefined
    }
    return entry.data as T
  }

  set(key: string, data: unknown, ttlMs: number): void {
    this.store.set(key, { data, expires: Date.now() + ttlMs })
  }

  /** Remove all entries whose key starts with `prefix`. */
  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  /** Compute-if-absent with TTL. */
  resolve<T>(key: string, ttlMs: number, fn: () => T): T {
    const cached = this.get<T>(key)
    if (cached !== undefined) return cached
    const data = fn()
    this.set(key, data, ttlMs)
    return data
  }
}

export const cache = new ApiCache()
