/**
 * Live Database Query Route â€” Aurion App Builder
 * Executes SQL queries against Supabase, Neon, and other providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { databaseSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.standard);
  if (rateLimitError) return rateLimitError;

  try {
    const result = await parseBody(req, databaseSchema);
    if ('error' in result) return result.error;
    const { provider, url, apiKey, sql } = result.data;

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ error: 'SQL query required' }, { status: 400 });
    }

    if (sql.length > 50000) {
      return NextResponse.json({ error: 'Query too long (max 50KB)' }, { status: 400 });
    }

    switch (provider) {
      case 'supabase':
        return await executeSupabase(url, apiKey, sql);
      case 'neon':
        return await executeNeon(url, apiKey, sql);
      default:
        return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Query execution failed' }, { status: 500 });
  }
}

async function executeSupabase(projectUrl: string, apiKey: string, sql: string): Promise<NextResponse> {
  if (!projectUrl || !apiKey) {
    return NextResponse.json({ error: 'Supabase URL and API key required' }, { status: 400 });
  }

  // Use Supabase's PostgREST SQL endpoint (requires service_role key)
  const cleanUrl = projectUrl.replace(/\/$/, '');
  const res = await fetch(`${cleanUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ query: sql }),
  });

  // If exec_sql RPC doesn't exist, fall back to the management API
  if (!res.ok) {
    // Try the pg_net approach or direct table query
    const fallbackRes = await supabaseFallback(cleanUrl, apiKey, sql);
    return fallbackRes;
  }

  const data = await res.json();
  return NextResponse.json({ rows: data, columns: data?.length > 0 ? Object.keys(data[0]) : [] });
}

async function supabaseFallback(url: string, apiKey: string, sql: string): Promise<NextResponse> {
  // Parse simple SELECT queries and route through PostgREST
  const selectMatch = sql.trim().match(/^SELECT\s+(.+?)\s+FROM\s+"?(\w+)"?\s*(.*)/i);
  if (!selectMatch) {
    return NextResponse.json({
      error: 'For Supabase, either create an exec_sql RPC function, or use simple SELECT queries. Complex SQL requires the service_role key.',
      hint: 'CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS jsonb AS $$ BEGIN RETURN (SELECT jsonb_agg(row_to_json(t)) FROM (EXECUTE query) t); END; $$ LANGUAGE plpgsql SECURITY DEFINER;',
    }, { status: 400 });
  }

  const table = selectMatch[2];
  const whereClause = selectMatch[3] || '';

  let restUrl = `${url}/rest/v1/${table}?select=*`;

  // Parse simple WHERE conditions
  const whereMatch = whereClause.match(/WHERE\s+(\w+)\s*=\s*'([^']+)'/i);
  if (whereMatch) {
    restUrl += `&${whereMatch[1]}=eq.${whereMatch[2]}`;
  }

  // Parse LIMIT
  const limitMatch = whereClause.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    restUrl += `&limit=${limitMatch[1]}`;
  } else {
    restUrl += '&limit=100'; // Default limit for safety
  }

  // Parse ORDER BY
  const orderMatch = whereClause.match(/ORDER\s+BY\s+(\w+)\s*(ASC|DESC)?/i);
  if (orderMatch) {
    restUrl += `&order=${orderMatch[1]}.${(orderMatch[2] || 'asc').toLowerCase()}`;
  }

  const res = await fetch(restUrl, {
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    return NextResponse.json({ error: errorData.message || `Supabase error: ${res.status}` }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({
    rows: Array.isArray(data) ? data : [],
    columns: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : [],
  });
}

async function executeNeon(connectionString: string, _apiKey: string, sql: string): Promise<NextResponse> {
  if (!connectionString) {
    return NextResponse.json({ error: 'Neon connection string required' }, { status: 400 });
  }

  // Use Neon's HTTP-based serverless driver
  const neonUrl = connectionString.replace(/^postgres(ql)?:\/\//, 'https://').split('/')[0];
  const dbName = connectionString.split('/').pop()?.split('?')[0] || 'neondb';

  try {
    // Use Neon's SQL over HTTP API
    const res = await fetch(`https://${new URL(connectionString.replace(/^postgres(ql)?:\/\//, 'https://')).host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': connectionString,
      },
      body: JSON.stringify({ query: sql, params: [] }),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error: `Neon error: ${error}` }, { status: res.status });
    }

    const data = await res.json();
    const rows = data.rows || [];
    const columns = data.fields?.map((f: { name: string }) => f.name) || (rows.length > 0 ? Object.keys(rows[0]) : []);

    return NextResponse.json({ rows, columns, affectedRows: data.rowCount });
  } catch (err) {
    return NextResponse.json({ error: `Neon connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` }, { status: 500 });
  }
}

// Schema introspection shortcut
export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider');
  const url = req.nextUrl.searchParams.get('url');
  const apiKey = req.nextUrl.searchParams.get('apiKey');

  if (!provider || !url) {
    return NextResponse.json({ error: 'Provider and URL required' }, { status: 400 });
  }

  const introspectionSQL = `
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  // Re-use POST handler logic
  const fakeReq = new Request(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, url, apiKey: apiKey || '', sql: introspectionSQL }),
  });

  return POST(fakeReq as NextRequest);
}
