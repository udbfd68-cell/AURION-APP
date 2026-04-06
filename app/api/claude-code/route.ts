/**
 * Claude Code API Route v5.0 — REAL only
 * 
 * 4 actions (all called by frontend):
 * - jarvis-execute: Main generation with optional subsystem calls
 * - jarvis-analyze: Pre-analyze prompt → detect subsystems
 * - quality-check: Structural HTML validation
 * - continue: Resume truncated output
 */

export const runtime = 'edge';

import {
  compressHtmlForPrompt,
  budgetPromptSections,
  runQualityChecks,
  HTML_QUALITY_CHECKS,
  buildContinuationPrompt,
  detectSubsystems,
} from '@/lib/claude-code-engine';

import { buildSmartSystemPrompt } from '@/lib/system-prompts';

/* ── Input validation ── */
interface ExecutionRequest {
  action: string;
  prompt?: string;
  model?: string;
  code?: string;
  researchContext?: string;
  messages?: { role: string; content: string }[];
  images?: { data: string; type: string }[];
}

function validateAction(action: unknown): action is string {
  return typeof action === 'string' && action.length > 0 && action.length < 100;
}

function validatePrompt(prompt: unknown): prompt is string {
  return typeof prompt === 'string' && prompt.length > 0 && prompt.length < 500000;
}

function sanitizeForPrompt(text: string): string {
  return text.replace(/<\/?system>/gi, '').replace(/<\/?human>/gi, '').replace(/<\/?assistant>/gi, '');
}

export async function POST(req: Request) {
  try {
    const body: ExecutionRequest = await req.json();
    const { action } = body;

    if (!validateAction(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    switch (action) {
      /* ── Quality Check: Structural HTML validation ── */
      case 'quality-check': {
        const { code } = body;
        if (!code) {
          return Response.json({ error: 'Missing code' }, { status: 400 });
        }
        const result = runQualityChecks(code, HTML_QUALITY_CHECKS);
        return Response.json({ success: true, data: result });
      }

      /* ── Continue: Resume truncated output ── */
      case 'continue': {
        const { code, model = MAMMOTH_KEY ? 'claude-sonnet-4-20250514' : 'gemini-2.5-pro' } = body;
        if (!code) {
          return Response.json({ error: 'Missing truncated code' }, { status: 400 });
        }
        return await streamToModel({
          model,
          systemPrompt: buildSmartSystemPrompt('continue generation', 60000),
          userContent: buildContinuationPrompt(code),
        });
      }

      /* ── Analyze: Detect which subsystems a prompt needs ── */
      case 'jarvis-analyze': {
        const { prompt } = body;
        if (!validatePrompt(prompt)) {
          return Response.json({ error: 'Missing prompt' }, { status: 400 });
        }
        const subsystems = detectSubsystems(prompt!);
        return Response.json({
          success: true,
          data: { subsystems },
        });
      }

      /* ── Execute: Full generation with real subsystem calls ── */
      case 'jarvis-execute': {
        const {
          prompt,
          code,
          researchContext,
          model = MAMMOTH_KEY ? 'claude-sonnet-4-20250514' : (OLLAMA_KEY ? 'qwen3-coder-480b' : 'gemini-2.5-pro'),
        } = body;
        if (!validatePrompt(prompt)) {
          return Response.json({ error: 'Missing prompt' }, { status: 400 });
        }

        const safePrompt = sanitizeForPrompt(prompt!);
        const subsystems = detectSubsystems(safePrompt);

        // Real subsystem calls in parallel (with timeouts)
        const subsystemResults: string[] = [];
        const calls: Promise<void>[] = [];

        // NotebookLM research (15s timeout) — only if detected AND no existing research
        if (subsystems.includes('notebooklm') && !researchContext) {
          calls.push(
            (async () => {
              try {
                const res = await fetch(new URL('/api/notebooklm', req.url).href, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'quick-research', query: safePrompt }),
                  signal: AbortSignal.timeout(15000),
                });
                if (res.ok) {
                  const data = await res.json();
                  const result = data?.data?.result;
                  if (result) {
                    const text = typeof result === 'string' ? result : JSON.stringify(result);
                    subsystemResults.push(`[RESEARCH]\n${text.slice(0, 8000)}\n[/RESEARCH]`);
                  }
                }
              } catch { /* timeout or unavailable — continue without */ }
            })()
          );
        }

        // Stitch design (20s timeout) — ONLY if STITCH_API_KEY is set
        if (subsystems.includes('stitch') && process.env.STITCH_API_KEY) {
          calls.push(
            (async () => {
              try {
                const res = await fetch(new URL('/api/stitch', req.url).href, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'generate', prompt: `UI design for: ${safePrompt.slice(0, 500)}`, mode: 'ui' }),
                  signal: AbortSignal.timeout(20000),
                });
                if (res.ok) {
                  const data = await res.json();
                  const html = data?.data?.html || data?.data?.result || '';
                  if (typeof html === 'string' && html.length > 100) {
                    subsystemResults.push(`[STITCH DESIGN]\n${html.slice(0, 6000)}\n[/STITCH DESIGN]`);
                  }
                }
              } catch { /* timeout or unavailable — continue without */ }
            })()
          );
        }

        if (calls.length > 0) await Promise.allSettled(calls);

        // Build system prompt (80K budget)
        const systemPrompt = buildSmartSystemPrompt(safePrompt, 80000)
          + (subsystemResults.length > 0 ? '\n\n' + subsystemResults.join('\n\n') : '');

        // Build user content with budget
        const sections = [
          { name: 'prompt', content: safePrompt, priority: 1 },
          ...(researchContext ? [{ name: 'research', content: researchContext.slice(0, 12000), priority: 2 }] : []),
          ...(code ? [{ name: 'existing_code', content: compressHtmlForPrompt(code, 4000), priority: 3 }] : []),
        ];
        const budgeted = budgetPromptSections(sections, 25000);
        const userContent = Array.from(budgeted.values()).filter(Boolean).join('\n\n');

        return await streamToModel({
          model,
          systemPrompt,
          userContent,
          messages: body.messages,
          images: body.images,
        });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[Claude Code API]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/* ── Model Routing ── */

const MAMMOTH_KEY = process.env.MAMMOTH_API_KEY || '';
const MAMMOTH_URL = process.env.MAMMOTH_API_URL || 'https://api.mammoth.ai/v1';
const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || '';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || '';
const OLLAMA_URL = 'https://ollama.com/v1/chat/completions';

const OLLAMA_MODELS: Record<string, string> = {
  'gemma4': 'gemma4',
  'glm-4.7-flash': 'glm-4.7-flash',
  'gemini-3-flash-preview': 'gemini-3-flash-preview',
  'gemini-3-flash': 'gemini-3-flash-preview',
  'glm-4.7': 'glm-4.7',
  'glm-4.6': 'glm-4.6',
  'kimi-k2.5': 'kimi-k2.5',
  'qwen3.5-397b': 'qwen3.5:397b',
  'qwen3-coder-480b': 'qwen3-coder:480b',
  'qwen3-coder-next': 'qwen3-coder-next',
  'devstral-2': 'devstral-2:123b',
  'devstral-small-2': 'devstral-small-2:24b',
  'deepseek-v3.2': 'deepseek-v3.2',
  'glm-5': 'glm-5',
};

const CLAUDE_MODELS = new Set([
  'claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307',
  'claude-3-opus-20240229', 'claude-3-5-haiku-20241022',
]);

function shouldUseMammoth(model: string): boolean {
  if (!MAMMOTH_KEY) return false;
  return model.startsWith('claude-') || CLAUDE_MODELS.has(model);
}

function isOllamaModel(model: string): boolean {
  return !!OLLAMA_MODELS[model];
}

async function streamToModel(opts: {
  model: string;
  systemPrompt: string;
  userContent: string;
  messages?: { role: string; content: string }[];
  images?: { data: string; type: string }[];
}): Promise<Response> {
  if (OLLAMA_KEY && isOllamaModel(opts.model)) {
    return await streamViaOllama(opts);
  }
  if (shouldUseMammoth(opts.model)) {
    return await streamViaMammoth(opts);
  }
  return await streamViaGemini(opts);
}

/* ── Ollama Cloud ── */
async function streamViaOllama(opts: {
  model: string;
  systemPrompt: string;
  userContent: string;
  messages?: { role: string; content: string }[];
  images?: { data: string; type: string }[];
}): Promise<Response> {
  if (!OLLAMA_KEY) return streamViaGemini(opts);

  const apiModel = OLLAMA_MODELS[opts.model] || opts.model;
  const VISION_MODELS = new Set([
    'gemma4', 'glm-4.7-flash', 'gemini-3-flash-preview',
    'gemini-3-flash', 'glm-4.7', 'glm-4.6', 'kimi-k2.5', 'qwen3.5-397b',
  ]);
  const isVision = VISION_MODELS.has(opts.model);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allMessages: Array<{ role: string; content: any }> = [
    { role: 'system', content: opts.systemPrompt },
    ...(opts.messages || []).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: opts.userContent },
  ];

  if (opts.images && opts.images.length > 0 && isVision) {
    const lastIdx = allMessages.length - 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentParts: any[] = [
      { type: 'text', text: allMessages[lastIdx].content },
    ];
    for (const img of opts.images) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: `data:${img.type};base64,${img.data}` },
      });
    }
    allMessages[lastIdx] = { ...allMessages[lastIdx], content: contentParts };
  }

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OLLAMA_KEY}`,
    },
    body: JSON.stringify({
      model: apiModel,
      messages: allMessages,
      stream: true,
      max_tokens: 131072,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(300000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[Ollama API Error]', res.status, errText.slice(0, 300));
    if (GOOGLE_KEY) {
      console.log('[Fallback] Ollama → Gemini');
      return streamViaGemini(opts);
    }
    return Response.json({ error: `Ollama API error ${res.status}: ${errText.slice(0, 200)}` }, { status: res.status });
  }

  return createSSEResponse(res, (data) => data?.choices?.[0]?.delta?.content, opts.model);
}

/* ── Mammoth (Anthropic) ── */
async function streamViaMammoth(opts: {
  model: string;
  systemPrompt: string;
  userContent: string;
  messages?: { role: string; content: string }[];
}): Promise<Response> {
  const userMessages: { role: string; content: string }[] = [];
  for (const m of (opts.messages || [])) {
    if (m.role !== 'system') userMessages.push({ role: m.role, content: m.content });
  }
  userMessages.push({ role: 'user', content: opts.userContent });

  const merged = mergeConsecutiveMessages(userMessages);
  if (merged.length > 0 && merged[0].role !== 'user') merged[0].role = 'user';

  const res = await fetch(`${MAMMOTH_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': MAMMOTH_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'output-128k-2025-02-19',
    },
    body: JSON.stringify({
      model: opts.model.startsWith('claude-') ? opts.model : 'claude-sonnet-4-20250514',
      max_tokens: 128000,
      temperature: 0.4,
      stream: true,
      system: [{ type: 'text', text: opts.systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: merged,
    }),
    signal: AbortSignal.timeout(300000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[Mammoth API Error]', res.status, errText.slice(0, 300));
    if (GOOGLE_KEY) {
      console.log('[Fallback] Mammoth → Gemini');
      return streamViaGemini(opts);
    }
    return Response.json({ error: `Mammoth API error ${res.status}: ${errText.slice(0, 200)}` }, { status: res.status });
  }

  // Parse Anthropic SSE → our format
  return createSSEResponse(res, (data) => {
    if (data.type === 'content_block_delta' && data.delta?.text) return data.delta.text;
    if (data.choices?.[0]?.delta?.content) return data.choices[0].delta.content;
    return null;
  }, undefined, (data) => data.type === 'message_stop');
}

/* ── Gemini (fallback) ── */
async function streamViaGemini(opts: {
  model: string;
  systemPrompt: string;
  userContent: string;
  messages?: { role: string; content: string }[];
}): Promise<Response> {
  if (!GOOGLE_KEY) {
    return Response.json({ error: 'No API key configured (set MAMMOTH_API_KEY, OLLAMA_API_KEY, or GOOGLE_API_KEY)' }, { status: 500 });
  }

  const allMessages = [
    { role: 'system', content: opts.systemPrompt },
    ...(opts.messages || []),
    { role: 'user', content: opts.userContent },
  ];
  const merged = mergeConsecutiveMessages(allMessages);
  const geminiModel = opts.model.startsWith('claude-') ? 'gemini-2.5-pro' : opts.model;

  // Use header-based auth instead of key in URL
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_KEY,
      },
      body: JSON.stringify({
        model: geminiModel,
        messages: merged,
        max_tokens: 65536,
        stream: true,
      }),
    },
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg = (errData as Record<string, unknown>)?.error || `Model returned ${res.status}`;
    return Response.json({ error: errMsg }, { status: res.status });
  }

  return createSSEResponse(res, (data) => data?.choices?.[0]?.delta?.content);
}

/* ── Shared SSE stream helper ── */
function createSSEResponse(
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extractText: (data: any) => string | null | undefined,
  modelInfo?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isDone?: (data: any) => boolean,
): Response {
  const encoder = new TextEncoder();
  const reader = res.body?.getReader();
  if (!reader) return Response.json({ error: 'No stream' }, { status: 500 });

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        if (modelInfo) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model: modelInfo })}\n\n`));
        }
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
            if (!payload) continue;
            try {
              const data = JSON.parse(payload);
              if (isDone?.(data)) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                break;
              }
              const text = extractText(data);
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch { continue; }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/* ── Helpers ── */

function mergeConsecutiveMessages(messages: { role: string; content: string }[]): { role: string; content: string }[] {
  const merged: { role: string; content: string }[] = [];
  for (const msg of messages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += '\n\n' + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }
  return merged;
}

/* (end of file) */
