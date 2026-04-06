/**
 * Klaviyo Proxy Route â€” Email & SMS marketing via Klaviyo API
 * https://developers.klaviyo.com/en/reference/api-overview
 */

import { NextRequest, NextResponse } from 'next/server';
import { klaviyoSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const ALLOWED_ENDPOINTS = [
  'lists', 'profiles', 'segments', 'campaigns', 'templates',
  'metrics', 'flows', 'events', 'catalogs',
];

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.standard);
  if (rateLimitError) return rateLimitError;

  try {
    const result = await parseBody(req, klaviyoSchema);
    if ('error' in result) return result.error;
    const { apiKey, endpoint, method, body: reqBody } = result.data;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Klaviyo API key' }, { status: 400 });
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
    const url = `https://a.klaviyo.com/api/${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Klaviyo-API-Key ${apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'revision': '2024-10-15',
    };

    const fetchOptions: RequestInit = { method: fetchMethod, headers };

    if ((fetchMethod === 'POST' || fetchMethod === 'PATCH') && reqBody) {
      fetchOptions.body = JSON.stringify(reqBody);
    }

    const resp = await fetch(url, fetchOptions);
    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ error: `Klaviyo error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
