/**
 * OpenAI Proxy Route — Streaming chat completions via user's API key
 * Pure fetch against api.openai.com — no SDK needed.
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, messages, model, stream = true } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing OpenAI API key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!apiKey.startsWith('sk-')) {
      return new Response(JSON.stringify({ error: 'Invalid OpenAI key format. Must start with sk-' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages,
        stream,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: `OpenAI error ${res.status}`, details: err }), { status: res.status, headers: { 'Content-Type': 'application/json' } });
    }

    if (stream && res.body) {
      return new Response(res.body, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
