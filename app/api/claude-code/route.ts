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
} from '@/lib/claude-code-engine';

import { buildSmartSystemPrompt, buildBrainEnhancedPrompt } from '@/lib/system-prompts';
import { buildTerminalModePrompt, analyzePrompt } from '@/lib/claude-code-brain';
import { claudeCodeSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

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
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.ai);
  if (rateLimitError) return rateLimitError;

  try {
    const body = claudeCodeSchema.parse(await req.json()) as ExecutionRequest;
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

        // ALWAYS call ALL subsystems — give full power on every generation
        const subsystemResults: string[] = [];
        const calls: Promise<void>[] = [];

        // Track subsystem status for visibility
        const subsystemStatus: Record<string, { status: 'ok' | 'timeout' | 'error' | 'skipped'; ms?: number }> = {};
        const subsystemTimers: Record<string, number> = {};

        // NotebookLM research (15s timeout) — ALWAYS unless user already provided research
        if (!researchContext) {
          subsystemTimers['notebooklm'] = Date.now();
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
                    subsystemStatus['notebooklm'] = { status: 'ok', ms: Date.now() - subsystemTimers['notebooklm'] };
                  } else {
                    subsystemStatus['notebooklm'] = { status: 'error', ms: Date.now() - subsystemTimers['notebooklm'] };
                  }
                } else {
                  subsystemStatus['notebooklm'] = { status: 'error', ms: Date.now() - subsystemTimers['notebooklm'] };
                }
              } catch { subsystemStatus['notebooklm'] = { status: 'timeout', ms: Date.now() - subsystemTimers['notebooklm'] }; }
            })()
          );
        } else {
          subsystemStatus['notebooklm'] = { status: 'skipped' };
        }

        // Stitch design (20s timeout) — ALWAYS if STITCH_API_KEY is set
        if (process.env.STITCH_API_KEY) {
          subsystemTimers['stitch'] = Date.now();
          calls.push(
            (async () => {
              try {
                const res = await fetch(new URL('/api/stitch', req.url).href, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'generate', prompt: `React UI design for: ${safePrompt.slice(0, 500)}`, mode: 'ui' }),
                  signal: AbortSignal.timeout(20000),
                });
                if (res.ok) {
                  const data = await res.json();
                  const html = data?.data?.html || data?.data?.result || '';
                  if (typeof html === 'string' && html.length > 100) {
                    subsystemResults.push(`[STITCH DESIGN — Use as visual reference for React components]\n${html.slice(0, 6000)}\n[/STITCH DESIGN]`);
                    subsystemStatus['stitch'] = { status: 'ok', ms: Date.now() - subsystemTimers['stitch'] };
                  } else {
                    subsystemStatus['stitch'] = { status: 'error', ms: Date.now() - subsystemTimers['stitch'] };
                  }
                } else {
                  subsystemStatus['stitch'] = { status: 'error', ms: Date.now() - subsystemTimers['stitch'] };
                }
              } catch { subsystemStatus['stitch'] = { status: 'timeout', ms: Date.now() - subsystemTimers['stitch'] }; }
            })()
          );
        } else {
          subsystemStatus['stitch'] = { status: 'skipped' };
        }

        // ReactBits catalog context — ALWAYS inject (no API call, static catalog)
        try {
          const { buildReactBitsContextSection } = await import('@/lib/system-prompts');
          const rbContext = buildReactBitsContextSection();
          if (rbContext) subsystemResults.push(rbContext);
        } catch { /* non-critical */ }

        // 21st.dev component patterns — ALWAYS fetch trending components (10s timeout)
        if (process.env.TWENTY_FIRST_API_KEY) {
          subsystemTimers['21st.dev'] = Date.now();
          calls.push(
            (async () => {
              try {
                const res = await fetch(new URL('/api/magic21st', req.url).href, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'search', query: safePrompt.slice(0, 200) }),
                  signal: AbortSignal.timeout(10000),
                });
                if (res.ok) {
                  const data = await res.json();
                  const components = data?.data?.components || data?.components || [];
                  if (Array.isArray(components) && components.length > 0) {
                    const summary = components.slice(0, 5).map((c: Record<string, string>) =>
                      `- ${c.name || c.title}: ${c.description || ''} ${c.code ? '```tsx\n' + String(c.code).slice(0, 1500) + '\n```' : ''}`
                    ).join('\n');
                    subsystemResults.push(`[21ST.DEV COMPONENTS — Use these React/shadcn patterns as inspiration]\n${summary}\n[/21ST.DEV]`);
                    subsystemStatus['21st.dev'] = { status: 'ok', ms: Date.now() - subsystemTimers['21st.dev'] };
                  } else {
                    subsystemStatus['21st.dev'] = { status: 'error', ms: Date.now() - subsystemTimers['21st.dev'] };
                  }
                } else {
                  subsystemStatus['21st.dev'] = { status: 'error', ms: Date.now() - subsystemTimers['21st.dev'] };
                }
              } catch { subsystemStatus['21st.dev'] = { status: 'timeout', ms: Date.now() - subsystemTimers['21st.dev'] }; }
            })()
          );
        } else {
          subsystemStatus['21st.dev'] = { status: 'skipped' };
        }

        // Figma design tokens — if FIGMA_ACCESS_TOKEN set (15s timeout)
        if (process.env.FIGMA_ACCESS_TOKEN) {
          subsystemTimers['figma'] = Date.now();
          calls.push(
            (async () => {
              try {
                const res = await fetch(new URL('/api/figma', req.url).href, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token: process.env.FIGMA_ACCESS_TOKEN }),
                  signal: AbortSignal.timeout(15000),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data?.designTokens || data?.colors) {
                    subsystemResults.push(`[FIGMA DESIGN TOKENS]\n${JSON.stringify(data.designTokens || data.colors || {}).slice(0, 3000)}\n[/FIGMA]`);
                    subsystemStatus['figma'] = { status: 'ok', ms: Date.now() - subsystemTimers['figma'] };
                  } else {
                    subsystemStatus['figma'] = { status: 'error', ms: Date.now() - subsystemTimers['figma'] };
                  }
                } else {
                  subsystemStatus['figma'] = { status: 'error', ms: Date.now() - subsystemTimers['figma'] };
                }
              } catch { subsystemStatus['figma'] = { status: 'timeout', ms: Date.now() - subsystemTimers['figma'] }; }
            })()
          );
        } else {
          subsystemStatus['figma'] = { status: 'skipped' };
        }

        if (calls.length > 0) await Promise.allSettled(calls);

        // ReactBits status
        subsystemStatus['reactbits'] = { status: subsystemResults.some(r => r.includes('[REACTBITS')) ? 'ok' : 'skipped' };

        // Build system prompt with Claude Code Brain intelligence (80K budget)
        const systemPrompt = buildBrainEnhancedPrompt(safePrompt, 80000)
          + (subsystemResults.length > 0 ? '\n\n' + subsystemResults.join('\n\n') : '');

        // Build user content with budget
        const sections = [
          { name: 'prompt', content: safePrompt, priority: 1 },
          ...(researchContext ? [{ name: 'research', content: researchContext.slice(0, 12000), priority: 2 }] : []),
          ...(code ? [{ name: 'existing_code', content: compressHtmlForPrompt(code, 4000), priority: 3 }] : []),
        ];
        const budgeted = budgetPromptSections(sections, 25000);
        const userContent = Array.from(budgeted.values()).filter(Boolean).join('\n\n');

        // Stream the model response, prepending subsystem status as first SSE event
        const modelResponse = await streamToModel({
          model,
          systemPrompt,
          userContent,
          messages: body.messages,
          images: body.images,
        });

        // Inject subsystem status as metadata in the SSE stream
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const statusEvent = `data: ${JSON.stringify({ subsystemStatus })}\n\n`;
        
        (async () => {
          try {
            await writer.write(new TextEncoder().encode(statusEvent));
            const reader = modelResponse.body?.getReader();
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await writer.write(value);
              }
            }
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, {
          headers: modelResponse.headers,
        });
      }

      /* ── Quality Fix: Auto-fix quality issues via LLM ── */
      case 'quality-fix': {
        const { code, model = MAMMOTH_KEY ? 'claude-sonnet-4-20250514' : 'gemini-2.5-pro' } = body;
        const qualityErrors = (body as unknown as Record<string, unknown>).errors as string[] || [];
        if (!code) {
          return Response.json({ error: 'Missing code' }, { status: 400 });
        }
        const fixSystemPrompt = `You are an expert code fixer. You receive code with specific quality issues and must fix ONLY those issues.
Rules:
- Fix the specific errors listed, nothing else
- Output the COMPLETE corrected code (not a diff)
- Maintain all existing functionality, styles, and structure
- For React multi-file projects, keep the <<FILE:path>> format
- For HTML, keep the complete document structure
- Do NOT add new features or change the design`;

        const fixUserContent = `Fix these quality issues:\n${qualityErrors.map(e => `• ${e}`).join('\n')}\n\nCode to fix:\n${code.slice(-8000)}`;

        return await streamToModel({
          model,
          systemPrompt: fixSystemPrompt,
          userContent: fixUserContent,
        });
      }

      /* ── Brain Analyze: Pre-analyze prompt → return analysis + plan (no generation) ── */
      case 'brain-analyze': {
        const { prompt } = body;
        if (!validatePrompt(prompt)) {
          return Response.json({ error: 'Missing prompt' }, { status: 400 });
        }
        const analysis = analyzePrompt(sanitizeForPrompt(prompt!));
        return Response.json({
          success: true,
          data: {
            domains: analysis.domains.slice(0, 8),
            complexity: analysis.complexity,
            executionPlan: analysis.executionPlan,
            qualityGates: analysis.qualityGates,
          },
        });
      }

      /* ── Claude Code Terminal: Natural language → actions ── */
      case 'claude-code-terminal': {
        const { prompt, model = MAMMOTH_KEY ? 'claude-sonnet-4-20250514' : 'gemini-2.5-pro' } = body;
        if (!validatePrompt(prompt)) {
          return Response.json({ error: 'Missing prompt' }, { status: 400 });
        }

        const safeTermPrompt = sanitizeForPrompt(prompt!);
        const projectFiles = (body as unknown as Record<string, unknown>).projectFiles as Record<string, string> || {};
        const terminalHistory = (body as unknown as Record<string, unknown>).terminalHistory as string[] || [];

        const terminalSystemPrompt = buildTerminalModePrompt(projectFiles, terminalHistory);
        const analysis = analyzePrompt(safeTermPrompt);

        return await streamToModel({
          model,
          systemPrompt: terminalSystemPrompt + '\n\n' + analysis.skillContext.slice(0, 3000),
          userContent: analysis.enhancedPrompt,
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
