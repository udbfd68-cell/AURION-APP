/**
 * Rate Limiter — In-memory sliding window for API routes
 * Production: replace with Redis-backed solution (Upstash)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetTime) store.delete(key);
    }
  }, 60_000);
}

interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSec * 1000;
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, limit: config.limit, remaining: config.limit - 1, reset: now + windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, config.limit - entry.count);
  return {
    success: entry.count <= config.limit,
    limit: config.limit,
    remaining,
    reset: entry.resetTime,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };
}

/** Standard rate limit configs by route type */
export const RATE_LIMITS = {
  /** AI generation routes — expensive operations */
  ai: { limit: 20, windowSec: 60 },
  /** Clone/scrape — heavy network + compute */
  heavy: { limit: 10, windowSec: 60 },
  /** Standard CRUD-like routes */
  standard: { limit: 60, windowSec: 60 },
  /** Deploy routes — limited */
  deploy: { limit: 5, windowSec: 60 },
} as const;
