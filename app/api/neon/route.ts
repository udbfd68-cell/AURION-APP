/**
 * Neon Proxy Route — Execute SQL via Neon Serverless HTTP API
 * https://neon.tech/docs/serverless/serverless-driver#use-the-neon-http-api
 */

import { NextRequest, NextResponse } from 'next/server';
import { neonSchema } from '@/lib/api-schemas';
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
    const { connectionString, sql, params } = await req.json();

    if (!connectionString) {
      return NextResponse.json({ error: 'Missing Neon connection string' }, { status: 400 });
    }

    // Parse connection string: postgres://user:pass@host/dbname
    const match = connectionString.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/(.+?)(?:\?.*)?$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid connection string format. Expected: postgres://user:pass@host.neon.tech/dbname' }, { status: 400 });
    }

    const [, user, password, host, dbname] = match;

    // Verify it's a Neon host
    if (!host.includes('neon.tech') && !host.includes('neon.')) {
      return NextResponse.json({ error: 'Invalid host. Must be a Neon database host (*.neon.tech)' }, { status: 400 });
    }

    if (!sql) {
      return NextResponse.json({ error: 'Missing SQL query' }, { status: 400 });
    }

    // Block dangerous operations
    const sqlUpper = sql.toUpperCase().trim();
    const BLOCKED_PATTERNS = [
      'DROP DATABASE', 'DROP ROLE', 'DROP TABLE', 'DROP SCHEMA',
      'TRUNCATE', 'ALTER USER', 'ALTER ROLE', 'CREATE ROLE', 'CREATE USER',
      'GRANT ', 'REVOKE ', 'COPY ', 'LOAD ', 'CREATE EXTENSION',
      'PG_TERMINATE_BACKEND', 'PG_CANCEL_BACKEND',
      'SET ROLE', 'RESET ROLE', 'SET SESSION AUTHORIZATION',
    ];
    if (BLOCKED_PATTERNS.some(p => sqlUpper.includes(p))) {
      return NextResponse.json({ error: 'This SQL operation is not allowed for safety' }, { status: 400 });
    }

    // Use Neon's serverless HTTP API
    const endpoint = `https://${host}/sql`;
    const auth = btoa(`${user}:${password}`);

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Neon-Connection-String': connectionString,
        'Neon-Raw-Text-Output': 'false',
        'Neon-Array-Mode': 'false',
        'Neon-Pool-Opt-In': 'true',
      },
      body: JSON.stringify({
        query: sql,
        params: params || [],
      }),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ error: `Neon error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
