import { NextRequest, NextResponse } from 'next/server';
import { searchComponents, getComponent, getByCategory, REACTBITS_CATALOG } from '@/lib/reactbits-catalog';
import { reactbitsSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.standard);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();
    const { action, query, name, category } = body;

    switch (action) {
      case 'search': {
        if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });
        const results = searchComponents(query, 10);
        return NextResponse.json({ components: results });
      }

      case 'get': {
        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
        const comp = getComponent(name);
        if (!comp) return NextResponse.json({ error: 'Component not found' }, { status: 404 });
        return NextResponse.json({ component: comp });
      }

      case 'category': {
        if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 });
        const comps = getByCategory(category);
        return NextResponse.json({ components: comps });
      }

      case 'catalog': {
        const summary = REACTBITS_CATALOG.map(c => ({
          name: c.name,
          category: c.category,
          description: c.description,
          hasPattern: !!c.pattern,
        }));
        return NextResponse.json({ total: summary.length, components: summary });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: search, get, category, catalog' },
          { status: 400 }
        );
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
