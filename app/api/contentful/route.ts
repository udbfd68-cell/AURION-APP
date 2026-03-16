/**
 * Contentful Proxy Route — Fetch CMS content via Contentful Delivery API
 * https://www.contentful.com/developers/docs/references/content-delivery-api/
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { accessToken, spaceId, environmentId, contentType, entryId, query } = await req.json();

    if (!accessToken || !spaceId) {
      return NextResponse.json({ error: 'Missing accessToken and spaceId' }, { status: 400 });
    }

    // Validate spaceId format
    if (!/^[a-z0-9]{12}$/i.test(spaceId)) {
      return NextResponse.json({ error: 'Invalid spaceId format' }, { status: 400 });
    }

    const env = environmentId || 'master';
    const base = `https://cdn.contentful.com/spaces/${encodeURIComponent(spaceId)}/environments/${encodeURIComponent(env)}`;

    let endpoint: string;

    if (entryId) {
      endpoint = `${base}/entries/${encodeURIComponent(entryId)}`;
    } else if (contentType) {
      endpoint = `${base}/entries?content_type=${encodeURIComponent(contentType)}&limit=100`;
    } else if (query) {
      endpoint = `${base}/entries?${query}`;
    } else {
      // List content types
      endpoint = `${base}/content_types?limit=100`;
    }

    const resp = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ error: `Contentful error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
