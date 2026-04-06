/**
 * Twilio Proxy Route — Send SMS via Twilio REST API
 * https://www.twilio.com/docs/sms/api/message-resource
 */

import { NextRequest, NextResponse } from 'next/server';
import { twilioSchema } from '@/lib/api-schemas';
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
    const { accountSid, authToken, from, to, body: messageBody, action } = await req.json();

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Missing accountSid and authToken' }, { status: 400 });
    }

    if (!accountSid.startsWith('AC')) {
      return NextResponse.json({ error: 'Invalid Account SID format. Must start with AC' }, { status: 400 });
    }

    const auth = btoa(`${accountSid}:${authToken}`);
    const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}`;

    if (action === 'list') {
      // List recent messages
      const resp = await fetch(`${baseUrl}/Messages.json?PageSize=20`, {
        headers: { 'Authorization': `Basic ${auth}` },
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        return NextResponse.json({ error: `Twilio error ${resp.status}`, details: data }, { status: resp.status });
      }
      return NextResponse.json({ data: data?.messages || [] });
    }

    if (action === 'account') {
      // Get account info
      const resp = await fetch(`${baseUrl}.json`, {
        headers: { 'Authorization': `Basic ${auth}` },
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        return NextResponse.json({ error: `Twilio error ${resp.status}`, details: data }, { status: resp.status });
      }
      return NextResponse.json({ data });
    }

    // Default: send SMS
    if (!from || !to || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields: from, to, body' }, { status: 400 });
    }

    const formData = new URLSearchParams();
    formData.append('From', from);
    formData.append('To', to);
    formData.append('Body', messageBody);

    const resp = await fetch(`${baseUrl}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return NextResponse.json({ error: `Twilio error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
