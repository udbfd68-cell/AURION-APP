/**
 * xAI (Grok) API Route — OpenAI-compatible endpoint
 * 
 * Uses xAI's API with Grok models for code generation.
 * Requires XAI_API_KEY env var (from console.x.ai).
 */

import { NextRequest } from 'next/server';
import { buildSystemPrompt } from '@/lib/system-prompts';

export const runtime = 'edge';

const XAI_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_KEY = process.env.XAI_API_KEY || '';

const SYSTEM_PROMPT = buildSystemPrompt();

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();
    if (!messages?.length) return Response.json({ error: 'No messages' }, { status: 400 });
    if (!XAI_KEY) return Response.json({ error: 'XAI_API_KEY not configured' }, { status: 500 });

    const modelId = model || 'grok-3';

    const res = await fetch(XAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${XAI_KEY}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream: true,
        max_tokens: 32768,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return Response.json({ error: `xAI error ${res.status}: ${err.slice(0, 200)}` }, { status: res.status });
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
