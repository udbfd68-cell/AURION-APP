/**
 * Supabase Proxy Route — Execute real REST queries against Supabase
 * 
 * Proxies requests to the Supabase PostgREST API using the user's
 * project URL and API key. No packages needed — pure fetch.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { supabaseUrl, supabaseKey, query, table, method, body, select } = await req.json();

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing supabaseUrl or supabaseKey' }, { status: 400 });
    }

    // Sanitize URL — must be a valid Supabase project URL
    const url = supabaseUrl.replace(/\/+$/, '');
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
      return NextResponse.json({ error: 'Invalid Supabase URL format. Expected: https://xxxxx.supabase.co' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
    };

    // SQL RPC query via PostgREST rpc
    if (query) {
      // Use the /rest/v1/rpc endpoint for raw SQL isn't directly supported by PostgREST.
      // Instead, list tables or use table-based queries.
      // For raw SQL, the user needs a Supabase Edge Function or the SQL endpoint.
      return NextResponse.json({ 
        error: 'Raw SQL is not supported via PostgREST REST API. Use table-based queries instead (provide "table" parameter), or create a Supabase Edge Function for raw SQL.',
        hint: 'Try: { table: "users", method: "GET", select: "*" }'
      }, { status: 400 });
    }

    // Connection test mode — validate auth without needing a specific table
    if (!table || table === '_health_check' || table === '_test_connection') {
      const testResp = await fetch(`${url}/rest/v1/`, { headers });
      if (testResp.ok || testResp.status === 200) {
        return NextResponse.json({ data: { connected: true, status: testResp.status } });
      }
      if (testResp.status === 401 || testResp.status === 403) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      return NextResponse.json({ data: { connected: true, status: testResp.status } });
    }

    // Sanitize table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    const restMethod = (method || 'GET').toUpperCase();
    const selectParam = select || '*';
    let endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(selectParam)}`;

    const fetchOptions: RequestInit = {
      method: restMethod,
      headers,
    };

    if (restMethod === 'POST' || restMethod === 'PATCH') {
      fetchOptions.body = JSON.stringify(body || {});
    }

    const resp = await fetch(endpoint, fetchOptions);
    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ 
        error: `Supabase error ${resp.status}`,
        details: data
      }, { status: resp.status });
    }

    return NextResponse.json({ data, status: resp.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
