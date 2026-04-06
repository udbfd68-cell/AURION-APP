/**
 * Lemon Squeezy Proxy Route — Payments API for digital products
 * https://docs.lemonsqueezy.com/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { lemonSqueezySchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const ALLOWED_ENDPOINTS = [
  'products', 'variants', 'prices', 'stores', 'orders',
  'subscriptions', 'customers', 'checkouts', 'discounts',
  'license-keys', 'license-key-instances',
];

export async function POST(req: NextRequest) {
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.standard);
  if (rateLimitError) return rateLimitError;

  try {
    const { apiKey, endpoint, method, params } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Lemon Squeezy API key' }, { status: 400 });
    }

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    // Whitelist check
    const baseEndpoint = endpoint.split('/')[0];
    if (!ALLOWED_ENDPOINTS.includes(baseEndpoint)) {
      return NextResponse.json({ error: `Endpoint "${baseEndpoint}" not allowed. Allowed: ${ALLOWED_ENDPOINTS.join(', ')}` }, { status: 400 });
    }

    const fetchMethod = (method || 'GET').toUpperCase();
    const url = `https://api.lemonsqueezy.com/v1/${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    };

    const fetchOptions: RequestInit = { method: fetchMethod, headers };

    if ((fetchMethod === 'POST' || fetchMethod === 'PATCH') && params) {
      fetchOptions.body = JSON.stringify(params);
    }

    const resp = await fetch(url, fetchOptions);
    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ error: `Lemon Squeezy error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
