import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.TWENTY_FIRST_API_KEY;
const BASE_URL = 'https://21st.dev';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'TWENTY_FIRST_API_KEY not configured' }, { status: 500 });
  }

  let body: { query?: string; action?: string; slug?: string; username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, action = 'search', slug, username } = body;
  const authHeaders = {
    'x-api-key': API_KEY,
    Authorization: `Bearer ${API_KEY}`,
  };

  try {
    // Search components by keyword
    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return NextResponse.json({ error: 'Missing query for search' }, { status: 400 });
      }
      const url = `${BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=12`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `21st.dev search failed (${res.status})`, details: text }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Get a specific component's full code
    if (action === 'component') {
      if (!slug || !username) {
        return NextResponse.json({ error: 'Missing slug or username for component fetch' }, { status: 400 });
      }
      const url = `${BASE_URL}/r/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
      const res = await fetch(url, {
        headers: authHeaders,
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `21st.dev component fetch failed (${res.status})`, details: text }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Magic — AI-driven component suggestion
    if (action === 'magic') {
      if (!query || typeof query !== 'string') {
        return NextResponse.json({ error: 'Missing query for magic' }, { status: 400 });
      }
      const res = await fetch(`${BASE_URL}/api/magic`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: query }),
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `21st.dev magic failed (${res.status})`, details: text }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action. Use: search | component | magic' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Request failed', details: String(e) }, { status: 500 });
  }
}
