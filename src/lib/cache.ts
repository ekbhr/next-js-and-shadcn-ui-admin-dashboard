/**
 * Simple In-Memory Cache
 * 
 * Provides time-based caching for expensive operations.
 * For production at scale, consider using Redis or Vercel KV.
 * 
 * Usage:
 * ```ts
 * const result = await cache.get("key", async () => {
 *   return expensiveOperation();
 * }, 60); // 60 seconds TTL
 * ```
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 1000;

  /**
   * Get a value from cache or compute it
   * @param key - Cache key
   * @param compute - Function to compute the value if not cached
   * @param ttlSeconds - Time to live in seconds (default: 60)
   */
  async get<T>(
    key: string,
    compute: () => Promise<T>,
    ttlSeconds: number = 60
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    // Compute new value
    const value = await compute();

    // Store in cache
    this.cache.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
    });

    // Cleanup if cache is too large
    if (this.cache.size > this.maxSize) {
      this.cleanup();
    }

    return value;
  }

  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }

    // If still too large, remove oldest entries
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toDelete = entries.slice(0, entries.length - this.maxSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }
}

// Singleton instance
export const cache = new MemoryCache();

// ============================================
// Cache Key Helpers
// ============================================

export const CacheKeys = {
  dashboardSummary: (userId: string, period: string) => 
    `dashboard:${userId}:${period}`,
  
  syncStatus: (userId?: string) => 
    `sync-status:${userId || "all"}`,
  
  revenueComparison: (userId: string) => 
    `revenue-comparison:${userId}`,
  
  overviewReport: (userId: string, network?: string, days?: number) => 
    `overview:${userId}:${network || "all"}:${days || 31}`,
  
  sedoReport: (days: number) => 
    `sedo-report:${days}`,
  
  yandexReport: (days: number) => 
    `yandex-report:${days}`,
  
  domainAssignments: () => 
    `domain-assignments`,
  
  users: () => 
    `users:active`,
};

// ============================================
// Cache TTLs (in seconds)
// ============================================

export const CacheTTL = {
  SHORT: 30,      // 30 seconds - for frequently changing data
  MEDIUM: 300,    // 5 minutes - for dashboard data
  LONG: 900,      // 15 minutes - for reports
  VERY_LONG: 3600 // 1 hour - for rarely changing data
};

