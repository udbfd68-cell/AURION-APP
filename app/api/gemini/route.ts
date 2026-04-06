/**
 * Google Gemini API Route — ALL AI goes through Google AI
 * Uses Google's OpenAI-compatible endpoint at generativelanguage.googleapis.com
 * Requires GOOGLE_API_KEY env variable
 * 
 * Enhanced with Claude Code patterns:
 * - Smart error classification + targeted retry strategies
 * - Exponential backoff with jitter (prevents thundering herd)
 * - Context overflow recovery (prompt compression on 413)
 * - Output quality monitoring
 */

import { NextRequest } from 'next/server';
import { buildSystemPrompt, buildImageAnalysisPrompt, buildResearchEnhancedPrompt } from '@/lib/system-prompts';
import { classifyError, calculateBackoff } from '@/lib/claude-code-engine';
import { geminiSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const GOOGLE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || '';

const SYSTEM_PROMPT = buildSystemPrompt();

// All Gemini models support vision
const VISION_MODELS = new Set([
  'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash',
  'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash',
]);

const DEFAULT_MODEL = 'gemini-2.5-flash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamWithGoogle(
  modelId: string,
  messages: Array<{ role: string; content: any }>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  const res = await fetch(GOOGLE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GOOGLE_KEY}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
      max_tokens: 131072,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(300000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    // ─── Claude Code pattern: Attach status for error classification ────
    const error = new Error(`Google API error ${res.status}: ${err.slice(0, 200)}`);
    (error as Error & { status: number }).status = res.status;
    throw error;
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream from Google');
  const decoder = new TextDecoder();

  let gotContent = false;
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      if (!payload) continue;
      try {
        const chunk = JSON.parse(payload);
        const text = chunk?.choices?.[0]?.delta?.content;
        if (text) {
          gotContent = true;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      } catch { /* skip malformed SSE */ }
    }
  }
  if (!gotContent) throw new Error('Empty response from Google model');
}

export async function POST(req: NextRequest) {
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.ai);
  if (rateLimitError) return rateLimitError;

  let body: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    images?: Array<{ data: string; type: string }>;
    researchContext?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, model = DEFAULT_MODEL, images, researchContext } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build system prompt with optional image analysis + research context
  let systemContent = researchContext
    ? buildResearchEnhancedPrompt(researchContext)
    : SYSTEM_PROMPT;
  if (images && images.length > 0) {
    systemContent += buildImageAnalysisPrompt(images.length);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullMessages: Array<{ role: string; content: any }> = [
    { role: 'system', content: systemContent },
  ];

  const isVisionModel = VISION_MODELS.has(model);
  const hasImages = images && images.length > 0;

  for (const m of messages) {
    fullMessages.push({ role: m.role, content: m.content.slice(0, 64000) });
  }

  if (hasImages) {
    const lastIdx = fullMessages.length - 1;
    if (isVisionModel) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentParts: any[] = [
        { type: 'text', text: fullMessages[lastIdx].content + '\n\nAnalyze these screenshots carefully and generate a pixel-perfect HTML/CSS reproduction.' },
      ];
      for (const img of images!) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${img.type};base64,${img.data}` },
        });
      }
      fullMessages[lastIdx] = { ...fullMessages[lastIdx], content: contentParts };
    } else {
      const imageDescriptions = images!.map((img: { data: string; type: string }, i: number) => {
        const sizeKB = Math.round(img.data.length * 0.75 / 1024);
        return `[Image ${i + 1}: ${img.type}, ~${sizeKB}KB]`;
      }).join('\n');
      fullMessages[lastIdx] = {
        ...fullMessages[lastIdx],
        content: fullMessages[lastIdx].content + `\n\n## Attached Screenshots:\n${imageDescriptions}\n\nAnalyze these screenshots carefully and generate a pixel-perfect HTML/CSS reproduction.`,
      };
    }
  }

  // Use the requested model or fallback to default
  const modelId = model.startsWith('gemini-') ? model : DEFAULT_MODEL;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // ─── Claude Code pattern: Smart retry with error classification ────
      const MAX_ATTEMPTS = 5;
      let lastError = '';
      let lastErrorClass = 'unknown';

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model: modelId })}\n\n`));
          await streamWithGoogle(modelId, fullMessages, controller, encoder);
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        } catch (err) {
          lastError = err instanceof Error ? err.message : 'Unknown error';
          const status = (err as Error & { status?: number }).status ?? 0;
          lastErrorClass = classifyError(status, lastError);

          // ─── Non-retryable errors: break immediately ────
          if (lastErrorClass === 'auth_failure' || lastErrorClass === 'invalid_input') {
            console.log(`[gemini] ${modelId} non-retryable error (${lastErrorClass}): ${lastError.slice(0, 100)}`);
            break;
          }

          // ─── Context overflow: truncate messages and retry once ────
          if (lastErrorClass === 'context_overflow' && attempt === 0) {
            console.log(`[gemini] ${modelId} context overflow — truncating messages`);
            // Keep system + last 3 messages, trim content
            const trimmed = fullMessages.slice(0, 1).concat(
              fullMessages.slice(Math.max(1, fullMessages.length - 3)).map(m => ({
                ...m,
                content: typeof m.content === 'string' ? m.content.slice(0, 32000) : m.content,
              }))
            );
            fullMessages.length = 0;
            fullMessages.push(...trimmed);
            continue;
          }

          // ─── Exponential backoff with jitter (Claude Code pattern) ────
          const delay = calculateBackoff(attempt, {
            baseDelay: lastErrorClass === 'rate_limit' ? 5000 : 2000,
            maxDelay: 60000,
            jitterFactor: 0.3,
          });
          console.log(`[gemini] ${modelId} attempt ${attempt + 1} failed [${lastErrorClass}]: ${lastError.slice(0, 80)}, retry in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }

      const cleanErr = lastError.slice(0, 200) || `${modelId} failed after ${MAX_ATTEMPTS} attempts (${lastErrorClass}). Try again.`;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: cleanErr })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
