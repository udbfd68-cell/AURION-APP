/**
 * Resend Proxy Route â€” Send real emails via Resend REST API
 * https://resend.com/docs/api-reference/emails/send-email
 */

import { NextRequest, NextResponse } from 'next/server';
import { resendSchema } from '@/lib/api-schemas';
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
    const result = await parseBody(req, resendSchema);
    if ('error' in result) return result.error;
    const { apiKey, from, to, subject, html, text, replyTo } = result.data;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Resend API key' }, { status: 400 });
    }

    if (!apiKey.startsWith('re_')) {
      return NextResponse.json({ error: 'Invalid Resend key format. Must start with re_' }, { status: 400 });
    }

    if (!from || !to || !subject) {
      return NextResponse.json({ error: 'Missing required fields: from, to, subject' }, { status: 400 });
    }

    const body: Record<string, unknown> = { from, to: Array.isArray(to) ? to : [to], subject };
    if (html) body.html = html;
    if (text) body.text = text;
    if (replyTo) body.reply_to = replyTo;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ error: `Resend error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
