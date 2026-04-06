/**
 * API Utilities — Structured error responses, CSRF protection, request helpers
 */
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getRateLimitHeaders, type RATE_LIMITS } from './rate-limiter';

/** Standard API error response */
export interface ApiError {
  error: string;
  code: string;
  status: number;
}

/** Create a structured error response */
export function apiError(message: string, code: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ error: message, code, status }, { status });
}

/** Common error factories */
export const errors = {
  badRequest: (msg = 'Invalid request body') => apiError(msg, 'BAD_REQUEST', 400),
  unauthorized: (msg = 'Unauthorized') => apiError(msg, 'UNAUTHORIZED', 401),
  forbidden: (msg = 'Forbidden') => apiError(msg, 'FORBIDDEN', 403),
  notFound: (msg = 'Not found') => apiError(msg, 'NOT_FOUND', 404),
  rateLimited: () => apiError('Too many requests', 'RATE_LIMITED', 429),
  internal: (msg = 'Internal server error') => apiError(msg, 'INTERNAL_ERROR', 500),
  missingKey: (name: string) => apiError(`${name} not configured`, 'MISSING_API_KEY', 500),
};

/** Apply rate limiting to a request — returns error response if limited */
export function applyRateLimit(
  req: Request | NextRequest,
  config: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS],
): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous';
  const pathname = 'nextUrl' in req ? (req as NextRequest).nextUrl.pathname : new URL(req.url).pathname;
  const key = `${pathname}:${ip}`;
  const result = rateLimit(key, config);

  if (!result.success) {
    const headers = getRateLimitHeaders(result);
    return NextResponse.json(
      { error: 'Too many requests', code: 'RATE_LIMITED', status: 429 },
      { status: 429, headers },
    );
  }
  return null;
}

/** Validate CSRF origin for mutation requests */
export function validateOrigin(req: Request | NextRequest): NextResponse | null {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return null;
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  if (!origin || !host) {
    // Allow requests without origin (same-origin, server-to-server)
    return null;
  }

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host && !host.includes('localhost') && !host.includes('vercel.app')) {
      return apiError('Cross-origin request blocked', 'CSRF_REJECTED', 403);
    }
  } catch {
    return apiError('Invalid origin header', 'CSRF_REJECTED', 403);
  }

  return null;
}

/** Safe JSON body parser with Zod validation */
export async function parseBody<T>(
  req: Request | NextRequest,
  schema: { parse: (data: unknown) => T },
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: errors.badRequest('Invalid JSON body') };
  }
  try {
    const data = schema.parse(raw);
    return { data };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Validation failed';
    return { error: errors.badRequest(message) };
  }
}
