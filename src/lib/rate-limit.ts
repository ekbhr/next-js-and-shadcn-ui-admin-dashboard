/**
 * Rate Limiting Utility
 * 
 * Simple in-memory rate limiter for API endpoints.
 * For production at scale, consider using Redis or Upstash.
 * 
 * Usage:
 * ```ts
 * const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 });
 * const { success, remaining } = await limiter.check(10, identifier);
 * ```
 */

interface RateLimitConfig {
  /** Time window in milliseconds */
  interval: number;
  /** Maximum number of unique tokens (IPs) to track per interval */
  uniqueTokenPerInterval: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

interface TokenBucket {
  count: number;
  expiresAt: number;
}

/**
 * Creates a rate limiter instance
 */
export function rateLimit(config: RateLimitConfig) {
  const tokenBuckets = new Map<string, TokenBucket>();

  // Cleanup old entries periodically
  const cleanup = () => {
    const now = Date.now();
    for (const [key, bucket] of tokenBuckets.entries()) {
      if (bucket.expiresAt < now) {
        tokenBuckets.delete(key);
      }
    }
    // Limit map size
    if (tokenBuckets.size > config.uniqueTokenPerInterval) {
      const entries = Array.from(tokenBuckets.entries());
      entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toDelete = entries.slice(0, entries.length - config.uniqueTokenPerInterval);
      toDelete.forEach(([key]) => tokenBuckets.delete(key));
    }
  };

  return {
    /**
     * Check if a request should be allowed
     * @param limit - Maximum requests per interval
     * @param token - Unique identifier (IP, user ID, etc.)
     */
    check: async (limit: number, token: string): Promise<RateLimitResult> => {
      const now = Date.now();
      const bucket = tokenBuckets.get(token);

      // Cleanup occasionally
      if (Math.random() < 0.1) cleanup();

      if (!bucket || bucket.expiresAt < now) {
        // New bucket
        tokenBuckets.set(token, {
          count: 1,
          expiresAt: now + config.interval,
        });
        return {
          success: true,
          remaining: limit - 1,
          reset: now + config.interval,
        };
      }

      if (bucket.count >= limit) {
        return {
          success: false,
          remaining: 0,
          reset: bucket.expiresAt,
        };
      }

      bucket.count++;
      return {
        success: true,
        remaining: limit - bucket.count,
        reset: bucket.expiresAt,
      };
    },
  };
}

// ============================================
// Pre-configured limiters for different use cases
// ============================================

/** Strict limiter for auth endpoints (5 requests per minute) */
export const authLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

/** Standard limiter for API endpoints (30 requests per minute) */
export const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

/** Lenient limiter for read operations (100 requests per minute) */
export const readLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

/** Strict limiter for sync operations (5 requests per 5 minutes) */
export const syncLimiter = rateLimit({
  interval: 5 * 60 * 1000, // 5 minutes
  uniqueTokenPerInterval: 100,
});

// ============================================
// Helper to get client IP
// ============================================

export function getClientIp(request: Request): string {
  // Check various headers for proxy/load balancer scenarios
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  // Fallback - in development this might be undefined
  return "127.0.0.1";
}

// ============================================
// Validation utilities
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

/**
 * Validate and clamp numeric input
 */
export function validateNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  return Math.min(Math.max(num, min), max);
}

