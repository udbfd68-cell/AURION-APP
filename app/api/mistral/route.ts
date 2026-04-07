/**
 * Mistral API Route â€” OpenAI-compatible endpoint  
 *
 * Uses Mistral's API (codestral, mistral-large) for code generation.
 * Requires MISTRAL_API_KEY env var (from console.mistral.ai).
 */

import { NextRequest } from 'next/server';
import { buildBrainPromptFromMessages } from '@/lib/system-prompts';
import { mistralSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_KEY = process.env.MISTRAL_API_KEY || '';

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.ai);
  if (rateLimitError) return rateLimitError;

  try {
    const result = await parseBody(req, mistralSchema);
    if ('error' in result) return result.error;
    const { messages, model } = result.data;
    if (!messages?.length) return Response.json({ error: 'No messages' }, { status: 400 });
    if (!MISTRAL_KEY) return Response.json({ error: 'MISTRAL_API_KEY not configured' }, { status: 500 });

    const modelId = model || 'codestral-latest';

    const res = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'system', content: buildBrainPromptFromMessages(messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })), 60000) }, ...messages],
        stream: true,
        max_tokens: 131072,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(300000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return Response.json({ error: `Mistral error ${res.status}: ${err.slice(0, 200)}` }, { status: res.status });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader();
        if (!reader) { controller.close(); return; }
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                break;
              }
              try {
                const d = JSON.parse(payload);
                const text = d.choices?.[0]?.delta?.content || '';
                if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              } catch { continue; }
            }
          }
        } finally { controller.close(); }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
