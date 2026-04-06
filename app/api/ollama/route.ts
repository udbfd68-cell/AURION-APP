/**
 * Ollama Cloud Chat API Route
 * 
 * Uses Ollama Cloud (ollama.com) with the best coding AI models â€” FREE & UNLIMITED.
 * OpenAI-compatible endpoint at https://ollama.com/v1/chat/completions
 *
 * System prompt imported from centralized lib/system-prompts.ts
 */

import { NextRequest } from 'next/server';
import { buildSystemPrompt, buildImageAnalysisPrompt } from '@/lib/system-prompts';
import { ollamaSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

// â”€â”€â”€ Ollama Cloud Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const OLLAMA_URL = 'https://ollama.com/v1/chat/completions';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || '';

const OLLAMA_MODELS: Record<string, string> = {
  // Primary models
  'gemma4': 'gemma4',
  'glm-4.7-flash': 'glm-4.7-flash',
  'gemini-3-flash-preview': 'gemini-3-flash-preview',
  // Vision models (support image_url in messages)
  'gemini-3-flash': 'gemini-3-flash-preview',
  'glm-4.7': 'glm-4.7',
  'glm-4.6': 'glm-4.6',
  'kimi-k2.5': 'kimi-k2.5',
  'qwen3.5-397b': 'qwen3.5:397b',
  // Coding models
  'qwen3-coder-480b': 'qwen3-coder:480b',
  'qwen3-coder-next': 'qwen3-coder-next',
  'devstral-2': 'devstral-2:123b',
  'devstral-small-2': 'devstral-small-2:24b',
  'deepseek-v3.2': 'deepseek-v3.2',
  'glm-5': 'glm-5',
};

// Models that support vision (OpenAI image_url format)
const VISION_MODELS = new Set([
  'gemma4', 'glm-4.7-flash', 'gemini-3-flash-preview',
  'gemini-3-flash', 'glm-4.7', 'glm-4.6', 'kimi-k2.5', 'qwen3.5-397b',
]);

// Default model when none specified
const DEFAULT_CHAT_MODEL = 'gemini-3-flash-preview';

// â”€â”€â”€ System Prompt â€” from centralized lib â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SYSTEM_PROMPT = buildSystemPrompt();


// â”€â”€â”€ Ollama Cloud SSE Stream â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamWithOllama(
  modelId: string,
  messages: Array<{ role: string; content: any }>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OLLAMA_KEY}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
      max_tokens: 131072,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(300000), // 5 min timeout
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Ollama API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream from Ollama');
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
  if (!gotContent) throw new Error('Empty response from Ollama model');
}

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.ai);
  if (rateLimitError) return rateLimitError;

  let body: ReturnType<typeof ollamaSchema.parse>;
  try {
    body = ollamaSchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, model = 'qwen3-coder-480b', images } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build system prompt â€” add image analysis instructions if images are attached
  let systemContent = SYSTEM_PROMPT;
  if (images && images.length > 0) {
    systemContent += buildImageAnalysisPrompt(images.length);
  }

  // Build messages with system prompt and optional image context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullMessages: Array<{ role: string; content: any }> = [
    { role: 'system', content: systemContent },
  ];

  const isVisionModel = VISION_MODELS.has(model);
  const hasImages = images && images.length > 0;

  for (const m of messages) {
    fullMessages.push({
      role: m.role as string,
      content: m.content.slice(0, 64000),
    });
  }

  if (hasImages) {
    const lastIdx = fullMessages.length - 1;
    if (isVisionModel) {
      // Vision model: send images as OpenAI image_url content parts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentParts: any[] = [
        { type: 'text', text: fullMessages[lastIdx].content + '\n\nAnalyze these screenshots carefully and generate a pixel-perfect HTML/CSS reproduction. Follow the Screenshot-to-Code instructions in your system prompt.' },
      ];
      for (const img of images!) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${img.type};base64,${img.data}` },
        });
      }
      fullMessages[lastIdx] = { ...fullMessages[lastIdx], content: contentParts };
    } else {
      // Text-only model: describe images
      const imageDescriptions = images!.map((img: { data: string; type: string }, i: number) => {
        const sizeKB = Math.round(img.data.length * 0.75 / 1024);
        return `[Image ${i + 1}: ${img.type}, ~${sizeKB}KB]`;
      }).join('\n');
      fullMessages[lastIdx] = {
        ...fullMessages[lastIdx],
        content: fullMessages[lastIdx].content + `\n\n## Attached Screenshots:\n${imageDescriptions}\n\nAnalyze these screenshots carefully and generate a pixel-perfect HTML/CSS reproduction. Follow the Screenshot-to-Code instructions in your system prompt.`,
      };
    }
  }

  const encoder = new TextEncoder();

  // NO FALLBACK â€” use ONLY the user's selected model
  const modelId = OLLAMA_MODELS[model] ? model : DEFAULT_CHAT_MODEL;
  const apiModel = OLLAMA_MODELS[modelId];

  const stream = new ReadableStream({
    async start(controller) {
      const MAX_ATTEMPTS = 5;
      let lastError = '';

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model: modelId })}\n\n`));
          await streamWithOllama(apiModel!, fullMessages, controller, encoder);
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        } catch (err) {
          lastError = err instanceof Error ? err.message : 'Unknown error';
          if (/401|auth/i.test(lastError)) break; // Don't retry auth errors
          // Rate limited or transient â€” wait and retry SAME model
          const delay = Math.min(3000 * (attempt + 1), 30000);
          console.log(`[chat] ${modelId} attempt ${attempt + 1} failed: ${lastError.slice(0, 80)}, retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }

      // All retries exhausted for this model
      const cleanErr = lastError.slice(0, 200) || `${modelId} failed after ${MAX_ATTEMPTS} attempts. Try again.`;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: cleanErr })}\n\n`));
      controller.close();
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
