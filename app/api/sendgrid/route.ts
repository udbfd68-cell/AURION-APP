/**
 * SendGrid Proxy Route — Send emails via SendGrid v3 API
 * https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, from, to, subject, html, text } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing SendGrid API key' }, { status: 400 });
    }

    if (!apiKey.startsWith('SG.')) {
      return NextResponse.json({ error: 'Invalid SendGrid key format. Must start with SG.' }, { status: 400 });
    }

    if (!from || !to || !subject) {
      return NextResponse.json({ error: 'Missing required fields: from, to, subject' }, { status: 400 });
    }

    const content: { type: string; value: string }[] = [];
    if (text) content.push({ type: 'text/plain', value: text });
    if (html) content.push({ type: 'text/html', value: html });
    if (content.length === 0) content.push({ type: 'text/plain', value: '' });

    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: Array.isArray(to) ? to.map((e: string) => ({ email: e })) : [{ email: to }] }],
        from: typeof from === 'string' ? { email: from } : from,
        subject,
        content,
      }),
    });

    if (resp.status === 202) {
      return NextResponse.json({ data: { message: 'Email sent successfully' } });
    }

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return NextResponse.json({ error: `SendGrid error ${resp.status}`, details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
