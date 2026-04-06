/**
 * Claude Code Execution API Route v4.0 — REAL, Cleaned
 * 
 * What this does:
 * - Routes generation through best available model (Ollama → Mammoth → Gemini)
 * - Real subsystem calls: NotebookLM research + Stitch design (with timeouts)
 * - Smart prompt selection (buildSmartSystemPrompt, ~80K chars, not 550K)
 * - Quality gates that return real scores
 * - Auto-continue for truncated output
 * - HTML compression for context injection
 * 
 * What was REMOVED:
 * - 3 dead Swarm routes (swarm-decompose, swarm-route, swarm-status)
 * - Dead imports (buildSwarmPrompt, getPatternStats, AGENT_CAPABILITIES, etc.)
 * - "methodology" stub route
 * - enhanced-generate using the bloated 550K prompt (now uses smart prompt)
 * - Ruflo cosmetic context injection into system prompt
 */

export const runtime = 'edge';

import {
  classifyError,
  compressHtmlForPrompt,
  budgetPromptSections,
  runQualityChecks,
  HTML_QUALITY_CHECKS,
  buildContinuationPrompt,
  analyzeRequest,
  createPlan,
  buildJarvisSystemContext,
  formatJarvisStatus,
  SUBSYSTEM_CAPABILITIES,
} from '@/lib/claude-code-engine';
import type { SubSystem, JarvisContext, JarvisPlan } from '@/lib/claude-code-engine';

import { buildSmartSystemPrompt, buildCloneSystemPrompt } from '@/lib/system-prompts';

/* ── Input validation ── */
interface ExecutionRequest {
  action: string;
  prompt?: string;
  model?: string;
  code?: string;
  researchContext?: string;
  maxTokens?: number;
  qualityGates?: boolean;
  messages?: { role: string; content: string }[];
  maxChars?: number;
  error?: string;
  jarvisContext?: Partial<JarvisContext>;
  jarvisPlan?: JarvisPlan;
  images?: { data: string; type: string }[];
}

function validateAction(action: unknown): action is string {
  return typeof action === 'string' && action.length > 0 && action.length < 100;
}

function validatePrompt(prompt: unknown): prompt is string {
  return typeof prompt === 'string' && prompt.length > 0 && prompt.length < 500000;
}

function sanitizeForPrompt(text: string): string {
  // Strip potential prompt injection markers, but keep the content useful
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
      /* ── Enhanced Generate: Research-backed code generation ── */
      case 'enhanced-generate': {
        const { prompt, code, researchContext, model = MAMMOTH_KEY ? 'claude-sonnet-4-20250514' : 'gemini-2.5-pro' } = body;
        if (!validatePrompt(prompt)) {
          return Response.json({ error: 'Missing or invalid prompt' }, { status: 400 });
        }

        // Use SMART prompt (not the 550K blob)
        const systemPrompt = buildEnhancedSystemPrompt(sanitizeForPrompt(prompt!), researchContext);

        const sections = [
          { name: 'prompt', content: sanitizeForPrompt(prompt!), priority: 1 },
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
        });
      }

      /* ── Quality Check: Validate generated code with real scores ── */
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
        const continuationPrompt = buildContinuationPrompt(code);
        return await streamToModel({
          model,
          systemPrompt: buildSmartSystemPrompt('continue generation', 60000),
          userContent: continuationPrompt,
        });
      }

      /* ── Compress: Compress HTML for prompt injection ── */
      case 'compress': {
        const { code, maxChars = 5000 } = body;
        if (!code) {
          return Response.json({ error: 'Missing code' }, { status: 400 });
        }
        const compressed = compressHtmlForPrompt(code, Math.min(maxChars, 20000));
        return Response.json({
          success: true,
          data: {
            compressed,
            originalLength: code.length,
            compressedLength: compressed.length,
            ratio: (compressed.length / code.length * 100).toFixed(1) + '%',
          },
        });
      }

      /* ── Classify Error: Smart error classification ── */
      case 'classify-error': {
        const { status, message } = body as unknown as { status: number; message: string };
        if (!status || !message) {
          return Response.json({ error: 'Missing status or message' }, { status: 400 });
        }
        const classification = classifyError(status, message);
        return Response.json({ success: true, data: { classification } });
      }

      /* ═══════════════════════════════════════════════════════
         ORCHESTRATOR ACTIONS
         ═══════════════════════════════════════════════════════ */

      /* ── Analyze: Detect subsystems needed ── */
      case 'jarvis-analyze': {
        const { prompt, jarvisContext } = body;
        if (!validatePrompt(prompt)) {
          return Response.json({ error: 'Missing prompt' }, { status: 400 });
        }
        const analysis = analyzeRequest(prompt!, jarvisContext || {});
        const plan = createPlan(prompt!, analysis);
        return Response.json({
          success: true,
          data: {
            analysis,
            plan,
            subsystemDetails: analysis.subsystems.map(s => ({
              id: s,
              ...SUBSYSTEM_CAPABILITIES[s],
            })),
          },
        });
      }

      /* ── Execute: Full generation with real subsystem calls ── */
      case 'jarvis-execute': {
        const {
          prompt,
          code,
          researchContext,
          model = MAMMOTH_KEY ? 'claude-sonnet-4-20250514' : (OLLAMA_KEY ? 'qwen3-coder-480b' : 'gemini-2.5-pro'),
          jarvisContext,
        } = body;
        if (!validatePrompt(prompt)) {
          return Response.json({ error: 'Missing prompt' }, { status: 400 });
        }

        const safePrompt = sanitizeForPrompt(prompt!);

        // Step 1: Analyze which subsystems to activate
        const analysis = analyzeRequest(safePrompt, jarvisContext || {});
        const plan = createPlan(safePrompt, analysis);

        // Step 2: ACTUALLY call subsystems in parallel (real fetch, real timeouts)
        const subsystemResults: string[] = [];
        const subsystemCalls: Promise<void>[] = [];

        // NotebookLM research (real fetch, 15s timeout)
        if (analysis.subsystems.includes('notebooklm') && !researchContext) {
          subsystemCalls.push(
            (async () => {
              try {
                const researchRes = await fetch(new URL('/api/notebooklm', req.url).href, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'quick-research', query: safePrompt }),
                  signal: AbortSignal.timeout(15000),
                });
                if (researchRes.ok) {
                  const data = await researchRes.json();
                  if (data?.data?.result) {
                    const result = typeof data.data.result === 'string' ? data.data.result : JSON.stringify(data.data.result);
                    subsystemResults.push(`[RESEARCH]\n${result.slice(0, 8000)}\n[/RESEARCH]`);
                  }
                }
              } catch (e) {
                console.warn('[Subsystem] NotebookLM failed:', e instanceof Error ? e.message : 'timeout');
              }
            })()
          );
        }

        // Stitch design generation (real fetch, 20s timeout)
        if (analysis.subsystems.includes('stitch') && (GOOGLE_KEY || process.env.STITCH_API_KEY)) {
          subsystemCalls.push(
            (async () => {
              try {
                const stitchRes = await fetch(new URL('/api/stitch', req.url).href, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'generate', prompt: `UI design for: ${safePrompt.slice(0, 500)}`, mode: 'ui' }),
                  signal: AbortSignal.timeout(20000),
                });
                if (stitchRes.ok) {
                  const data = await stitchRes.json();
                  const stitchHtml = data?.data?.html || data?.data?.result || '';
                  if (typeof stitchHtml === 'string' && stitchHtml.length > 100) {
                    subsystemResults.push(`[STITCH DESIGN]\n${stitchHtml.slice(0, 6000)}\n[/STITCH DESIGN]`);
                  }
                }
              } catch (e) {
                console.warn('[Subsystem] Stitch failed:', e instanceof Error ? e.message : 'timeout');
              }
            })()
          );
        }

        // Execute subsystem calls in parallel
        if (subsystemCalls.length > 0) {
          await Promise.allSettled(subsystemCalls);
        }

        // Step 3: Build smart system prompt (80K max, not the 550K blob)
        const basePrompt = buildSmartSystemPrompt(safePrompt, 80000);
        const orchestratorContext = buildJarvisSystemContext(analysis.subsystems, plan);
        const subsystemData = subsystemResults.length > 0 ? '\n\n' + subsystemResults.join('\n\n') : '';
        const systemPrompt = `${basePrompt}\n\n${orchestratorContext}${subsystemData}`;

        // Step 4: Build user message with context budget
        const sections = [
          { name: 'prompt', content: safePrompt, priority: 1 },
          ...(researchContext ? [{ name: 'research', content: researchContext.slice(0, 12000), priority: 2 }] : []),
          ...(code ? [{ name: 'existing_code', content: compressHtmlForPrompt(code, 4000), priority: 3 }] : []),
        ];
        const budgeted = budgetPromptSections(sections, 25000);
        let userContent = Array.from(budgeted.values()).filter(Boolean).join('\n\n');

        // Inject plan context
        userContent = `[PLAN]\n${analysis.reasoning}\nSteps: ${analysis.suggestedPlan.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nSubsystem data: ${subsystemResults.length} results\n[/PLAN]\n\n${userContent}`;

        // Quality gate instruction
        if (analysis.subsystems.includes('quality-gates')) {
          userContent += `\n\n[QUALITY GATES]\nBefore outputting, verify:\n1. HTML: <!DOCTYPE html> → </html>\n2. All sections complete\n3. No placeholder text\n4. Responsive: 768px, 1024px breakpoints\n5. Real image URLs or SVG placeholders\n6. Scroll animations + hover transitions\n7. Accessibility: alt text, aria labels, semantic HTML\n[/QUALITY GATES]`;
        }

        // Step 5: Stream via best model
        return await streamToModel({
          model,
          systemPrompt,
          userContent,
          messages: body.messages,
          images: body.images,
        });
      }

      /* ── Subsystem Status ── */
      case 'jarvis-status': {
        const allSystems = Object.entries(SUBSYSTEM_CAPABILITIES).map(([id, cap]) => ({
          id,
          ...cap,
          available: checkSubsystemAvailability(id as SubSystem),
        }));
        return Response.json({
          success: true,
          data: {
            totalSubsystems: allSystems.length,
            available: allSystems.filter(s => s.available).length,
            subsystems: allSystems,
          },
        });
      }

      /* ── Plan Status ── */
      case 'jarvis-plan-status': {
        const { jarvisPlan } = body;
        if (!jarvisPlan) {
          return Response.json({ error: 'Missing jarvisPlan' }, { status: 400 });
        }
        return Response.json({
          success: true,
          data: { formatted: formatJarvisStatus(jarvisPlan) },
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

function buildEnhancedSystemPrompt(prompt: string, researchContext?: string): string {
  const base = buildSmartSystemPrompt(prompt, 80000);

  return `${base}${researchContext ? `

[RESEARCH CONTEXT]
${researchContext.slice(0, 12000)}
[/RESEARCH CONTEXT]` : ''}

[QUALITY REQUIREMENTS]
1. HTML complete (DOCTYPE → closing tags)
2. All sections fully rendered
3. Animations + interactions included
4. Responsive with mobile breakpoints
5. Accessibility attributes present
[/QUALITY REQUIREMENTS]`;
}

function checkSubsystemAvailability(system: SubSystem): boolean {
  switch (system) {
    case 'anthropic': return !!(process.env.MAMMOTH_API_KEY || process.env.ANTHROPIC_API_KEY);
    case 'gemini': return !!(process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY);
    case 'groq': return !!process.env.GROQ_API_KEY;
    case 'openai': return !!process.env.OPENAI_API_KEY;
    case 'stitch': return !!process.env.STITCH_API_KEY;
    case 'firecrawl': return !!process.env.FIRECRAWL_API_KEY;
    case 'vercel': return !!process.env.VERCEL_TOKEN;
    case 'github': return !!process.env.GITHUB_TOKEN;
    default: return true; // Built-in libraries
  }
}
