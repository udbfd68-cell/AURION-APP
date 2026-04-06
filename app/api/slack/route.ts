/**
 * Slack Proxy Route — Post messages to Slack via Incoming Webhooks
 * https://api.slack.com/messaging/webhooks
 * Also supports Slack Web API for channels/users listing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { slackSchema } from '@/lib/api-schemas';
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
    const { token, webhookUrl, text, channel, action } = await req.json();

    // Webhook mode — simple message posting
    if (webhookUrl) {
      if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
        return NextResponse.json({ error: 'Invalid Slack webhook URL' }, { status: 400 });
      }

      if (!text) {
        return NextResponse.json({ error: 'Missing message text' }, { status: 400 });
      }

      const body: Record<string, string> = { text };
      if (channel) body.channel = channel;

      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        return NextResponse.json({ data: { message: 'Message sent successfully' } });
      }

      const errText = await resp.text().catch(() => '');
      return NextResponse.json({ error: `Slack webhook error: ${errText}` }, { status: resp.status });
    }

    // Bot token mode — Slack Web API
    if (!token) {
      return NextResponse.json({ error: 'Missing Slack bot token or webhook URL' }, { status: 400 });
    }

    if (!token.startsWith('xoxb-') && !token.startsWith('xoxp-')) {
      return NextResponse.json({ error: 'Invalid Slack token format. Must start with xoxb- or xoxp-' }, { status: 400 });
    }

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    if (action === 'channels') {
      const resp = await fetch('https://slack.com/api/conversations.list?limit=50&types=public_channel,private_channel', { headers });
      const data = await resp.json();
      return NextResponse.json({ data: data.channels || [] });
    }

    if (action === 'send' && text && channel) {
      const resp = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel, text }),
      });
      const data = await resp.json();
      if (!data.ok) {
        return NextResponse.json({ error: data.error || 'Failed to send message' }, { status: 400 });
      }
      return NextResponse.json({ data });
    }

    // Default: test auth
    const resp = await fetch('https://slack.com/api/auth.test', { headers });
    const data = await resp.json();
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
