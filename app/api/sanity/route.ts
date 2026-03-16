/**
 * Sanity Proxy Route — Fetch content from Sanity CMS via GROQ API
 * https://www.sanity.io/docs/http-query
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { projectId, dataset, token, query, mutations, action } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Missing Sanity projectId' }, { status: 400 });
    }

    // Validate project ID format
    if (!/^[a-z0-9]{8,}$/i.test(projectId)) {
      return NextResponse.json({ error: 'Invalid Sanity project ID format' }, { status: 400 });
    }

    const ds = dataset || 'production';
    const base = `https://${encodeURIComponent(projectId)}.api.sanity.io/v2024-01-01`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (action === 'mutate' && mutations) {
      // Create/update/delete documents
      if (!token) {
        return NextResponse.json({ error: 'Token required for mutations' }, { status: 400 });
      }

      const resp = await fetch(`${base}/data/mutate/${encodeURIComponent(ds)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mutations }),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        return NextResponse.json({ error: `Sanity error ${resp.status}`, details: data }, { status: resp.status });
      }
      return NextResponse.json({ data });
    }

    // Default: GROQ query
    const groqQuery = query || '*[_type == "document"][0...20]';

    const resp = await fetch(`${base}/data/query/${encodeURIComponent(ds)}?query=${encodeURIComponent(groqQuery)}`, {
      headers,
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ error: `Sanity error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
