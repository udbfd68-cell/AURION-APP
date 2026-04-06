/**
 * Upstash Proxy Route — Execute Redis commands via Upstash REST API
 * https://upstash.com/docs/redis/features/restapi
 */

import { NextRequest, NextResponse } from 'next/server';
import { upstashSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const ALLOWED_COMMANDS = [
  'GET', 'SET', 'DEL', 'MGET', 'MSET', 'KEYS', 'EXISTS', 'EXPIRE', 'TTL', 'INCR', 'DECR',
  'HGET', 'HSET', 'HDEL', 'HGETALL', 'HKEYS', 'HVALS',
  'LPUSH', 'RPUSH', 'LPOP', 'RPOP', 'LRANGE', 'LLEN',
  'SADD', 'SREM', 'SMEMBERS', 'SCARD',
  'ZADD', 'ZREM', 'ZRANGE', 'ZREVRANGE', 'ZSCORE', 'ZCARD',
  'PING', 'DBSIZE', 'INFO', 'FLUSHDB',
];

export async function POST(req: NextRequest) {
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.standard);
  if (rateLimitError) return rateLimitError;

  try {
    const { url, token, command, args } = await req.json();

    if (!url || !token) {
      return NextResponse.json({ error: 'Missing Upstash REST URL and token' }, { status: 400 });
    }

    // Validate the URL is an Upstash endpoint
    if (!/^https:\/\/[a-z0-9-]+\.upstash\.io$/i.test(url.replace(/\/+$/, ''))) {
      return NextResponse.json({ error: 'Invalid Upstash URL. Expected: https://xxx.upstash.io' }, { status: 400 });
    }

    if (!command) {
      return NextResponse.json({ error: 'Missing command' }, { status: 400 });
    }

    const cmd = command.toUpperCase();
    if (!ALLOWED_COMMANDS.includes(cmd)) {
      return NextResponse.json({ error: `Command "${cmd}" not allowed. Allowed: ${ALLOWED_COMMANDS.join(', ')}` }, { status: 400 });
    }

    const cleanUrl = url.replace(/\/+$/, '');
    const cmdParts = [cmd, ...(Array.isArray(args) ? args : [])];
    const endpoint = `${cleanUrl}/${cmdParts.map(encodeURIComponent).join('/')}`;

    const resp = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ error: `Upstash error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
