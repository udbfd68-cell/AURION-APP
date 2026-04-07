/**
 * Anthropic Claude API Route
 * Enhanced with Claude Code patterns:
 * - Smart retry with error classification
 * - Exponential backoff with jitter
 * - Context overflow recovery
 */
import { NextRequest } from 'next/server';
import { buildBrainPromptFromMessages } from '@/lib/system-prompts';
import { classifyError, calculateBackoff } from '@/lib/claude-code-engine';
import { anthropicSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.ai);
  if (rateLimitError) return rateLimitError;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: ReturnType<typeof anthropicSchema.parse>;
  try {
    body = anthropicSchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, model = 'claude-sonnet-4-20250514', images } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Convert to Anthropic format â€” merge consecutive same-role messages
  const anthropicMessages: { role: 'user' | 'assistant'; content: string | { type: string; source?: { type: string; media_type: string; data: string }; text?: string }[] }[] = [];
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'assistant' as const : 'user' as const;
    if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === role) {
      const prev = anthropicMessages[anthropicMessages.length - 1];
      prev.content = (typeof prev.content === 'string' ? prev.content : '') + '\n' + msg.content;
    } else {
      anthropicMessages.push({ role, content: msg.content });
    }
  }

  // Add images to the last user message if provided
  if (images && Array.isArray(images) && images.length > 0 && anthropicMessages.length > 0) {
    const lastMsg = anthropicMessages[anthropicMessages.length - 1];
    if (lastMsg.role === 'user') {
      const textContent = typeof lastMsg.content === 'string' ? lastMsg.content : '';
      const contentParts: { type: string; source?: { type: string; media_type: string; data: string }; text?: string }[] = [];
      for (const img of images) {
        if (img.data && img.type) {
          const base64 = img.data.includes(',') ? img.data.split(',')[1] : img.data;
          contentParts.push({
            type: 'image',
            source: { type: 'base64', media_type: img.type, data: base64 },
          });
        }
      }
      contentParts.push({ type: 'text', text: textContent });
      lastMsg.content = contentParts;
    }
  }

  // Ensure first message is from user (Anthropic requirement)
  if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
    anthropicMessages.shift();
  }

  // â”€â”€â”€ Claude Code pattern: Smart retry with error classification â”€â”€â”€â”€
  const MAX_ATTEMPTS = 5;
  let lastError = '';
  let res: Response | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'output-128k-2025-02-19',
        },
        body: JSON.stringify({
          model,
          max_tokens: 128000,
          temperature: 0.4,
          system: [
            {
              type: 'text',
              text: buildBrainPromptFromMessages(messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })), 80000),
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: anthropicMessages,
          stream: true,
        }),
        signal: AbortSignal.timeout(300000),
      });

      if (res.ok) break;

      const errBody = await res.json().catch(() => ({}));
      lastError = errBody?.error?.message || `Anthropic API error: ${res.status}`;
      const errorClass = classifyError(res.status, lastError);

      // Non-retryable errors
      if (errorClass === 'auth_failure' || errorClass === 'invalid_input') {
        return new Response(JSON.stringify({ error: lastError }), {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Context overflow: trim messages and retry once
      if (errorClass === 'context_overflow' && attempt === 0) {
        console.log(`[anthropic] context overflow â€” trimming messages`);
        // Keep last 5 messages, generous content per message
        const trimmed = anthropicMessages.slice(-5).map(m => ({
          ...m,
          content: typeof m.content === 'string' ? m.content.slice(0, 32000) : m.content,
        }));
        anthropicMessages.length = 0;
        anthropicMessages.push(...trimmed);
        if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
          anthropicMessages.shift();
        }
        continue;
      }

      // Exponential backoff with jitter
      const delay = calculateBackoff(attempt, {
        baseDelay: errorClass === 'rate_limit' ? 5000 : 2000,
        maxDelay: 20000,
        jitterFactor: 0.3,
      });
      console.log(`[anthropic] attempt ${attempt + 1} failed [${errorClass}]: ${lastError.slice(0, 80)}, retry in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      res = null;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Request failed';
      if (attempt === MAX_ATTEMPTS - 1) break;
      const delay = calculateBackoff(attempt, { baseDelay: 2000, maxDelay: 10000, jitterFactor: 0.3 });
      await new Promise(r => setTimeout(r, delay));
    }
  }

  if (!res || !res.ok) {
    return new Response(JSON.stringify({ error: lastError || 'All retry attempts failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const reader = res.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response stream' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
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
              if (!payload || payload === '[DONE]') continue;

              let event;
              try { event = JSON.parse(payload); } catch { continue; }

              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                const text = event.delta.text;
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } else if (event.type === 'message_stop') {
                break;
              } else if (event.type === 'error') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: event.error?.message || 'Stream error' })}\n\n`));
                break;
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
