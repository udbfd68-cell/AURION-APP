/**
 * Algolia Proxy Route — Search via Algolia REST API
 * https://www.algolia.com/doc/rest-api/search/
 */

import { NextRequest, NextResponse } from 'next/server';
import { algoliaSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.standard);
  if (rateLimitError) return rateLimitError;

  try {
    const { appId, apiKey, indexName, query, filters, hitsPerPage, page, action } = await req.json();

    if (!appId || !apiKey) {
      return NextResponse.json({ error: 'Missing Algolia appId and apiKey' }, { status: 400 });
    }

    if (!/^[A-Z0-9]{10}$/i.test(appId)) {
      return NextResponse.json({ error: 'Invalid Algolia App ID format' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'X-Algolia-Application-Id': appId,
      'X-Algolia-API-Key': apiKey,
      'Content-Type': 'application/json',
    };

    const baseUrl = `https://${appId}-dsn.algolia.net/1`;

    if (action === 'listIndices') {
      const resp = await fetch(`${baseUrl}/indexes`, { headers });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        return NextResponse.json({ error: `Algolia error ${resp.status}`, details: data }, { status: resp.status });
      }
      return NextResponse.json({ data });
    }

    if (!indexName) {
      return NextResponse.json({ error: 'Missing indexName. Use action: "listIndices" to see available indices.' }, { status: 400 });
    }

    // Sanitize index name
    if (!/^[a-zA-Z0-9_-]+$/.test(indexName)) {
      return NextResponse.json({ error: 'Invalid index name' }, { status: 400 });
    }

    const searchParams: Record<string, unknown> = { query: query || '' };
    if (filters) searchParams.filters = filters;
    if (hitsPerPage) searchParams.hitsPerPage = hitsPerPage;
    if (page !== undefined) searchParams.page = page;

    const resp = await fetch(`${baseUrl}/indexes/${encodeURIComponent(indexName)}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(searchParams),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ error: `Algolia error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
