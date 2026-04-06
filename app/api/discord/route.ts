/**
 * Discord Proxy Route â€” Post messages via Discord Webhooks & Bot API
 * https://discord.com/developers/docs/resources/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { discordSchema } from '@/lib/api-schemas';
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
    const result = await parseBody(req, discordSchema);
    if ('error' in result) return result.error;
    const { token, webhookUrl, content, username, embeds, action, channelId } = result.data;

    // Webhook mode
    if (webhookUrl) {
      if (!/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(webhookUrl) &&
          !/^https:\/\/discordapp\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(webhookUrl)) {
        return NextResponse.json({ error: 'Invalid Discord webhook URL' }, { status: 400 });
      }

      if (!content && (!embeds || embeds.length === 0)) {
        return NextResponse.json({ error: 'Missing content or embeds' }, { status: 400 });
      }

      const body: Record<string, unknown> = {};
      if (content) body.content = content;
      if (username) body.username = username;
      if (embeds) body.embeds = embeds;

      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (resp.status === 204 || resp.ok) {
        return NextResponse.json({ data: { message: 'Message sent successfully' } });
      }

      const data = await resp.json().catch(() => null);
      return NextResponse.json({ error: `Discord error ${resp.status}`, details: data }, { status: resp.status });
    }

    // Bot token mode
    if (!token) {
      return NextResponse.json({ error: 'Missing Discord bot token or webhook URL' }, { status: 400 });
    }

    const headers = { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' };

    if (action === 'guilds') {
      const resp = await fetch('https://discord.com/api/v10/users/@me/guilds', { headers });
      const data = await resp.json();
      return NextResponse.json({ data });
    }

    if (action === 'channels' && channelId) {
      // Get guild channels (channelId = guildId here)
      const resp = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(channelId)}/channels`, { headers });
      const data = await resp.json();
      return NextResponse.json({ data });
    }

    if (action === 'send' && channelId && content) {
      const resp = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      });
      const data = await resp.json();
      return NextResponse.json({ data });
    }

    // Default: get bot info
    const resp = await fetch('https://discord.com/api/v10/users/@me', { headers });
    const data = await resp.json();
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
