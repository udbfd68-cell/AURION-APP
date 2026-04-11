import { NextRequest, NextResponse } from 'next/server';
import { magic21stSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

const API_KEY = process.env.TWENTY_FIRST_API_KEY;
const BASE_URL = 'https://magic.21st.dev';

export const runtime = 'edge';

/* ── Transform 21st.dev raw response → Component21st[] ── */
interface Raw21stComponent {
  componentName?: string;
  componentCode?: string;
  demoCode?: string;
  demoName?: string;
  similarity?: number;
  registryDependencies?: {
    filesWithRegistry?: Record<string, { code?: string; registry?: string }>;
    npmDependencies?: Record<string, string>;
  };
}

function parse21stResponse(data: { text?: string } | unknown): unknown[] {
  const raw = (data as { text?: string })?.text;
  if (!raw || typeof raw !== 'string') return [];
  try {
    const arr: Raw21stComponent[] = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((c, i) => {
      const deps = c.registryDependencies?.npmDependencies;
      const tags = deps ? Object.keys(deps).slice(0, 5) : [];
      const files = c.registryDependencies?.filesWithRegistry;
      if (files) {
        for (const path of Object.keys(files).slice(0, 3)) {
          const name = path.split('/').pop()?.replace('.tsx', '').replace('.ts', '');
          if (name && !tags.includes(name)) tags.push(name);
        }
      }
      return {
        id: `21st-${i}-${(c.componentName || '').replace(/\s+/g, '-').toLowerCase()}`,
        name: c.componentName || c.demoName || `Component ${i + 1}`,
        description: extractDescription(c),
        code: c.componentCode || c.demoCode || '',
        demoCode: c.demoCode || '',
        tags,
        similarity: c.similarity,
        npmDependencies: deps || {},
      };
    });
  } catch {
    return [];
  }
}

function extractDescription(c: Raw21stComponent): string {
  const code = c.componentCode || c.demoCode || '';
  const propsMatch = code.match(/interface\s+\w+Props\s*\{([^}]{10,200})\}/s);
  if (propsMatch) {
    const fields = propsMatch[1].match(/(\w+)\??:/g)?.map(f => f.replace(/\??:/, '')).slice(0, 5);
    if (fields?.length) return `Props: ${fields.join(', ')}`;
  }
  const classMatch = code.match(/className="([^"]{20,80})"/);
  const hint = classMatch ? classMatch[1].split(' ').slice(0, 4).join(' ') : '';
  const name = c.componentName || '';
  if (hint) return `${name} — ${hint}…`;
  return name || 'UI Component from 21st.dev';
}

async function fetch21st(endpoint: string, body: object): Promise<Response> {
  return fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.standard);
  if (rateLimitError) return rateLimitError;

  if (!API_KEY) {
    return NextResponse.json({ error: 'TWENTY_FIRST_API_KEY not configured' }, { status: 500 });
  }

  let body: ReturnType<typeof magic21stSchema.parse>;
  try {
    body = magic21stSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, action = 'search', slug, username } = body;

  try {
    if (action === 'search' || action === 'magic') {
      if (!query || typeof query !== 'string') {
        return NextResponse.json({ error: 'Missing query' }, { status: 400 });
      }
      const res = await fetch21st('/api/fetch-ui', { message: query, searchQuery: query });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `21st.dev search failed (${res.status})`, details: text }, { status: res.status });
      }
      const data = await res.json();
      const components = parse21stResponse(data);
      return NextResponse.json(components);
    }

    if (action === 'debug') {
      if (!query || typeof query !== 'string') {
        return NextResponse.json({ error: 'Missing query' }, { status: 400 });
      }
      const res = await fetch21st('/api/fetch-ui', { message: query, searchQuery: query });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `21st.dev failed (${res.status})`, details: text }, { status: res.status });
      }
      const data = await res.json();
      // Return raw + parsed to see all fields
      const raw = (data as { text?: string })?.text;
      let parsed: unknown[] = [];
      try { parsed = JSON.parse(raw || '[]'); } catch {}
      return NextResponse.json({
        rawKeys: Object.keys(data || {}),
        rawText: typeof raw === 'string' ? raw.slice(0, 3000) : null,
        parsedKeys: Array.isArray(parsed) ? parsed.map((c: unknown) => Object.keys(c as Record<string, unknown>)) : [],
        parsed: Array.isArray(parsed) ? parsed.map((c: unknown) => {
          const redacted = { ...(c as Record<string, unknown>) };
          if (typeof redacted.componentCode === 'string') redacted.componentCode = (redacted.componentCode as string).slice(0, 100) + '…';
          if (typeof redacted.demoCode === 'string') redacted.demoCode = (redacted.demoCode as string).slice(0, 100) + '…';
          return redacted;
        }) : parsed,
      });
    }

    if (action === 'component') {
      if (!slug || !username) {
        return NextResponse.json({ error: 'Missing slug or username' }, { status: 400 });
      }
      const res = await fetch21st('/api/fetch-ui', { message: `${username}/${slug}`, searchQuery: slug });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `21st.dev component fetch failed (${res.status})`, details: text }, { status: res.status });
      }
      const data = await res.json();
      const components = parse21stResponse(data);
      return NextResponse.json(components.length === 1 ? components[0] : components);
    }

    return NextResponse.json({ error: 'Unknown action. Use: search | component | magic' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Request failed', details: String(e) }, { status: 500 });
  }
}
