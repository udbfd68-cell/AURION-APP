/**
 * Claude Code Execution API Route
 * Advanced code execution, error recovery, parallel processing,
 * and research-enhanced generation pipeline.
 *
 * Implements Claude Code architectural patterns:
 * - Smart retry with error classification
 * - Parallel task execution with critical path
 * - Context compression and budget management
 * - Quality gates for output validation
 * - Output recovery from truncation
 */

export const runtime = 'edge';

import {
  classifyError,
  withSmartRetry,
  compressHtmlForPrompt,
  budgetPromptSections,
  runQualityChecks,
  HTML_QUALITY_CHECKS,
  buildContinuationPrompt,
  CLAUDE_CODE_METHODOLOGY,
  ADVANCED_TOOL_COMPOSITION,
  STREAMING_OPTIMIZATION,
  PROMPT_INJECTION_DEFENSE,
} from '@/lib/claude-code-engine';

import { buildSystemPrompt, buildCloneSystemPrompt } from '@/lib/system-prompts';

/* ── Types ── */
interface ExecutionRequest {
  /** Action to perform */
  action: string;
  /** User prompt */
  prompt?: string;
  /** Model to use */
  model?: string;
  /** Existing code for improvement */
  code?: string;
  /** Research context to inject */
  researchContext?: string;
  /** Max tokens for response */
  maxTokens?: number;
  /** Enable quality gates */
  qualityGates?: boolean;
  /** Messages for chat continuation */
  messages?: { role: string; content: string }[];
  /** Max chars for compression */
  maxChars?: number;
  /** Error message to classify */
  error?: string;
}

export async function POST(req: Request) {
  try {
    const body: ExecutionRequest = await req.json();
    const { action } = body;

    if (!action || typeof action !== 'string') {
      return Response.json({ error: 'Missing action' }, { status: 400 });
    }

    switch (action) {
      /* ── Enhanced Generate: Research-backed code generation ── */
      case 'enhanced-generate': {
        const { prompt, code, researchContext, model = MAMMOTH_KEY ? 'claude-sonnet-4-20250514' : 'gemini-2.5-pro' } = body;
        if (!prompt) {
          return Response.json({ error: 'Missing prompt' }, { status: 400 });
        }

        // Build enhanced system prompt with Claude Code methodology + research
        const systemPrompt = buildEnhancedSystemPrompt(researchContext);

        // Build messages with context budget
        const sections = [
          { name: 'prompt', content: prompt, priority: 1 },
          ...(researchContext ? [{ name: 'research', content: researchContext, priority: 2 }] : []),
          ...(code ? [{ name: 'existing_code', content: compressHtmlForPrompt(code, 4000), priority: 3 }] : []),
        ];
        const budgeted = budgetPromptSections(sections, 10000);
        const userContent = Array.from(budgeted.values()).filter(Boolean).join('\n\n');

        // Stream to Gemini with smart retry
        return await streamToModel({
          model,
          systemPrompt,
          userContent,
          messages: body.messages,
        });
      }

      /* ── Quality Check: Validate generated code ── */
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
          systemPrompt: buildSystemPrompt(),
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

      /* ── Get Methodology: Return development methodology ── */
      case 'methodology': {
        return Response.json({
          success: true,
          data: {
            methodology: CLAUDE_CODE_METHODOLOGY,
            toolComposition: ADVANCED_TOOL_COMPOSITION,
            streaming: STREAMING_OPTIMIZATION,
            security: PROMPT_INJECTION_DEFENSE,
          },
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

/* ── Stream to Model — Mammoth AI (Anthropic/Claude) primary, Gemini fallback ── */

const MAMMOTH_KEY = process.env.MAMMOTH_API_KEY || '';
const MAMMOTH_URL = process.env.MAMMOTH_API_URL || 'https://api.mammoth.ai/v1';
const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || '';

/** Map of supported Claude models via Mammoth */
const CLAUDE_MODELS = new Set([
  'claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307',
  'claude-3-opus-20240229', 'claude-3-5-haiku-20241022',
]);

/** Determine if we should route to Mammoth (Anthropic) or Gemini */
function shouldUseMammoth(model: string): boolean {
  if (!MAMMOTH_KEY) return false;
  // Use Mammoth for any claude- prefixed model or if explicitly requested
  return model.startsWith('claude-') || CLAUDE_MODELS.has(model);
}

async function streamToModel(opts: {
  model: string;
  systemPrompt: string;
  userContent: string;
  messages?: { role: string; content: string }[];
}): Promise<Response> {
  // Route to Mammoth AI if key is set and model is Claude
  const useMammoth = shouldUseMammoth(opts.model);

  if (useMammoth) {
    return streamViaMammoth(opts);
  }
  return streamViaGemini(opts);
}

/** Stream via Mammoth AI (Anthropic-compatible Messages API) */
async function streamViaMammoth(opts: {
  model: string;
  systemPrompt: string;
  userContent: string;
  messages?: { role: string; content: string }[];
}): Promise<Response> {
  // Build messages array (Anthropic format: system is separate, first msg must be user)
  const userMessages: { role: string; content: string }[] = [];
  for (const m of (opts.messages || [])) {
    if (m.role !== 'system') userMessages.push({ role: m.role, content: m.content });
  }
  userMessages.push({ role: 'user', content: opts.userContent });

  // Merge consecutive same-role messages
  const merged: { role: string; content: string }[] = [];
  for (const msg of userMessages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += '\n\n' + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  // Ensure first message is user role
  if (merged.length > 0 && merged[0].role !== 'user') {
    merged[0].role = 'user';
  }

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
      system: [
        {
          type: 'text',
          text: opts.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: merged,
    }),
    signal: AbortSignal.timeout(300000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[Mammoth API Error]', res.status, errText.slice(0, 300));
    // Fallback to Gemini on Mammoth failure
    if (GOOGLE_KEY) {
      console.log('[Claude Code] Mammoth failed, falling back to Gemini');
      return streamViaGemini(opts);
    }
    return Response.json({ error: `Mammoth API error ${res.status}: ${errText.slice(0, 200)}` }, { status: res.status });
  }

  // Parse Anthropic SSE stream → forward as our simplified SSE format
  const encoder = new TextEncoder();
  const reader = res.body?.getReader();
  if (!reader) return Response.json({ error: 'No stream from Mammoth' }, { status: 500 });

  const stream = new ReadableStream({
    async start(controller) {
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
            if (!payload || payload.startsWith('{') === false) continue;
            try {
              const data = JSON.parse(payload);
              // Anthropic stream events: content_block_delta has delta.text
              if (data.type === 'content_block_delta' && data.delta?.text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: data.delta.text })}\n\n`));
              }
              // OpenAI-compatible format (some proxies use this)
              else if (data.choices?.[0]?.delta?.content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: data.choices[0].delta.content })}\n\n`));
              }
              // Message stop
              else if (data.type === 'message_stop') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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

/** Stream via Google Gemini (OpenAI-compatible) — fallback */
async function streamViaGemini(opts: {
  model: string;
  systemPrompt: string;
  userContent: string;
  messages?: { role: string; content: string }[];
}): Promise<Response> {
  if (!GOOGLE_KEY) {
    return Response.json({ error: 'No API key configured (set MAMMOTH_API_KEY or GOOGLE_API_KEY)' }, { status: 500 });
  }

  const allMessages = [
    { role: 'system', content: opts.systemPrompt },
    ...(opts.messages || []),
    { role: 'user', content: opts.userContent },
  ];

  const merged: { role: string; content: string }[] = [];
  for (const msg of allMessages) {
    if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
      merged[merged.length - 1].content += '\n' + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  // Use a Gemini model even if user requested Claude (since we're in fallback)
  const geminiModel = opts.model.startsWith('claude-') ? 'gemini-2.5-pro' : opts.model;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${GOOGLE_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  const encoder = new TextEncoder();
  const reader = res.body?.getReader();
  if (!reader) return Response.json({ error: 'No stream' }, { status: 500 });

  const stream = new ReadableStream({
    async start(controller) {
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
              const data = JSON.parse(payload);
              const text = data.choices?.[0]?.delta?.content;
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

/* ── Build Enhanced System Prompt ── */

function buildEnhancedSystemPrompt(researchContext?: string): string {
  const base = buildSystemPrompt();

  const enhanced = `${base}

${CLAUDE_CODE_METHODOLOGY}

${ADVANCED_TOOL_COMPOSITION}

${researchContext ? `
[RESEARCH-ENHANCED CONTEXT]
The following research was gathered by NotebookLM deep analysis.
Use these insights to produce superior, research-backed output:

${researchContext}

Apply ALL discovered best practices, patterns, and recommendations.
[/RESEARCH-ENHANCED CONTEXT]
` : ''}

[QUALITY REQUIREMENTS]
Before completing output, verify:
1. HTML is complete (DOCTYPE → head → body → closing tags)
2. All sections are fully rendered (no truncation)
3. Research recommendations are applied
4. Animations and interactions are included
5. Responsive design with mobile breakpoints
6. Accessibility attributes present
7. Performance optimizations applied
[/QUALITY REQUIREMENTS]`;

  return enhanced;
}
