import { NextRequest, NextResponse } from 'next/server';

const CONTEXT7_API = 'https://context7.com/api/v1';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, libraryName, libraryId, topic, tokens } = body;

    switch (action) {
      case 'resolve': {
        if (!libraryName) return NextResponse.json({ error: 'libraryName required' }, { status: 400 });
        const res = await fetch(`${CONTEXT7_API}/search?query=${encodeURIComponent(libraryName)}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
          return NextResponse.json(
            { error: `Context7 resolve failed: ${res.status}` },
            { status: res.status }
          );
        }
        const data = await res.json();
        return NextResponse.json({ results: data });
      }

      case 'docs': {
        if (!libraryId) return NextResponse.json({ error: 'libraryId required' }, { status: 400 });
        const params = new URLSearchParams();
        if (topic) params.set('topic', topic);
        if (tokens) params.set('tokens', String(Math.min(Number(tokens) || 10000, 25000)));
        else params.set('tokens', '10000');

        const url = `${CONTEXT7_API}/${encodeURIComponent(libraryId)}?${params.toString()}`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) {
          return NextResponse.json(
            { error: `Context7 docs failed: ${res.status}` },
            { status: res.status }
          );
        }
        const data = await res.json();
        return NextResponse.json({ docs: data });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: resolve, docs' },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
