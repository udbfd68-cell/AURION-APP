import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    // Clear rate limit state between tests by waiting or resetting
  });

  describe('RATE_LIMITS', () => {
    it('defines standard rate limits', () => {
      expect(RATE_LIMITS.standard).toBeDefined();
      expect(RATE_LIMITS.standard.limit).toBeGreaterThan(0);
      expect(RATE_LIMITS.standard.windowSec).toBeGreaterThan(0);
    });

    it('defines AI rate limits', () => {
      expect(RATE_LIMITS.ai).toBeDefined();
      expect(RATE_LIMITS.ai.limit).toBeLessThan(RATE_LIMITS.standard.limit);
    });

    it('defines deploy rate limits', () => {
      expect(RATE_LIMITS.deploy).toBeDefined();
      expect(RATE_LIMITS.deploy.limit).toBeLessThanOrEqual(10);
    });

    it('defines heavy rate limits', () => {
      expect(RATE_LIMITS.heavy).toBeDefined();
    });
  });

  describe('rateLimit', () => {
    it('allows requests within limit', () => {
      const key = 'test-allow-' + Date.now();
      const result = rateLimit(key, { limit: 5, windowSec: 60 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('blocks requests exceeding limit', () => {
      const key = 'test-block-' + Date.now();
      const config = { limit: 2, windowSec: 60 };
      
      rateLimit(key, config); // 1st
      rateLimit(key, config); // 2nd
      const result = rateLimit(key, config); // 3rd - should be blocked
      
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('uses different keys independently', () => {
      const ts = Date.now();
      const key1 = 'test-key1-' + ts;
      const key2 = 'test-key2-' + ts;
      const config = { limit: 1, windowSec: 60 };
      
      rateLimit(key1, config);
      const result = rateLimit(key2, config);
      
      expect(result.success).toBe(true);
    });

    it('returns reset time', () => {
      const key = 'test-reset-' + Date.now();
      const result = rateLimit(key, { limit: 5, windowSec: 60 });
      expect(result.reset).toBeGreaterThan(Date.now());
    });
  });

  describe('getRateLimitHeaders', () => {
    it('returns proper headers', () => {
      const key = 'test-headers-' + Date.now();
      const result = rateLimit(key, { limit: 10, windowSec: 60 });
      const headers = getRateLimitHeaders(result);
      
      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBeDefined();
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });
  });
});
