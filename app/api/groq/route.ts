import { NextRequest } from 'next/server';
import { buildSystemPrompt } from '@/lib/system-prompts';
import { classifyError, calculateBackoff } from '@/lib/claude-code-engine';
import { groqSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const SYSTEM_PROMPT = buildSystemPrompt();
const MAX_RETRIES = 3;

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.ai);
  if (rateLimitError) return rateLimitError;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: ReturnType<typeof groqSchema.parse>;
  try {
    body = groqSchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, model = 'llama-3.3-70b-versatile' } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build messages array with system prompt
  const groqMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let res: Response | null = null;
        let lastError = '';

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model,
                messages: groqMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 131072,
              }),
              signal: AbortSignal.timeout(300000),
            });

            if (res.ok) break;

            const errData = await res.json().catch(() => ({ error: { message: `Groq HTTP ${res!.status}` } }));
            lastError = errData?.error?.message || `Groq API error ${res.status}`;
            const errorClass = classifyError(res.status, lastError);

            // Don't retry on non-retriable errors
            if (errorClass === 'auth_failure' || errorClass === 'invalid_input' || errorClass === 'context_overflow') {
              break;
            }

            if (attempt < MAX_RETRIES) {
              const delay = calculateBackoff(attempt, { baseDelay: 1000, maxDelay: 10000, jitterFactor: 0.3 });
              await new Promise(resolve => setTimeout(resolve, delay));
              res = null;
            }
          } catch (fetchErr: unknown) {
            lastError = fetchErr instanceof Error ? fetchErr.message : 'Groq fetch error';
            if (attempt < MAX_RETRIES) {
              const delay = calculateBackoff(attempt, { baseDelay: 1000, maxDelay: 10000, jitterFactor: 0.3 });
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        if (!res || !res.ok) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: lastError || 'Groq request failed after retries' })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response stream');

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') break;

            try {
              const data = JSON.parse(payload);
              const text = data.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch { /* skip malformed */ }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Groq stream error';
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
}
