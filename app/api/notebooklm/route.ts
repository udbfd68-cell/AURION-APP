/**
 * NotebookLM API Route — Research & Analysis endpoint
 * Provides web research, deep analysis, source management, and Q&A
 * via the NotebookLM engine for the Aurion app builder.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

import {
  NotebookLMEngine,
  buildResearchContext,
  buildCompactResearchContext,
  RESEARCH_TEMPLATES,
  type ResearchTemplate,
} from '@/lib/notebooklm-engine';

import {
  ResearchOrchestrator,
  createAurionOrchestrator,
} from '@/lib/research-orchestrator';
import { notebooklmSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

// Singleton orchestrator
let orchestrator: ResearchOrchestrator | null = null;

function getOrchestrator(): ResearchOrchestrator {
  if (!orchestrator) {
    orchestrator = createAurionOrchestrator({
      nlmMode: process.env.NOTEBOOKLM_AUTH_JSON ? 'cli' : 'api',
      researchDepth: 'fast',
    });
  }
  return orchestrator;
}

/* ── URL validation ── */
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    // Block internal/private IPs
    const host = url.hostname;
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|localhost|::1|\[::1\])/i.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.ai);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();
    const { action, ...params } = body;

    if (!action || typeof action !== 'string') {
      return Response.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    const orch = getOrchestrator();

    switch (action) {
      /* ── Quick Research ── */
      case 'quick-research': {
        const { query } = params;
        if (!query || typeof query !== 'string' || query.length > 2000) {
          return Response.json({ error: 'Invalid query (max 2000 chars)' }, { status: 400 });
        }
        const result = await orch.quickResearch(query);
        return Response.json({ success: true, data: result });
      }

      /* ── Deep Research ── */
      case 'deep-research': {
        const { query, urls = [] } = params;
        if (!query || typeof query !== 'string' || query.length > 2000) {
          return Response.json({ error: 'Invalid query (max 2000 chars)' }, { status: 400 });
        }
        // Validate URLs
        const validUrls = (urls as string[]).filter(u => typeof u === 'string' && isValidUrl(u)).slice(0, 20);
        const analysis = await orch.deepResearch(query, validUrls);
        const context = buildResearchContext(analysis);
        return Response.json({ success: true, data: { analysis, context } });
      }

      /* ── Enhance Tool ── */
      case 'enhance-tool': {
        const { tool, prompt, currentContext } = params;
        if (!tool || !prompt) {
          return Response.json({ error: 'Missing tool or prompt' }, { status: 400 });
        }
        const enhancement = await orch.enhanceTool(
          String(tool).slice(0, 100),
          String(prompt).slice(0, 2000),
          currentContext ? String(currentContext).slice(0, 8000) : undefined,
        );
        return Response.json({ success: true, data: enhancement });
      }

      /* ── Enhanced Generation ── */
      case 'enhanced-generate': {
        const { prompt, type, urls, existingCode, researchTemplate, customQuestions } = params;
        if (!prompt || !type) {
          return Response.json({ error: 'Missing prompt or type' }, { status: 400 });
        }
        const validUrls = (urls as string[] || []).filter(u => typeof u === 'string' && isValidUrl(u)).slice(0, 20);
        const result = await orch.enhancedGenerate({
          prompt: String(prompt).slice(0, 5000),
          type,
          urls: validUrls,
          existingCode: existingCode ? String(existingCode).slice(0, 15000) : undefined,
          researchTemplate: researchTemplate as ResearchTemplate,
          customQuestions: (customQuestions as string[] || []).slice(0, 10),
        });
        return Response.json({ success: true, data: result });
      }

      /* ── Chat/Ask ── */
      case 'ask': {
        const { question, notebookId } = params;
        if (!question || typeof question !== 'string') {
          return Response.json({ error: 'Missing question' }, { status: 400 });
        }
        const nlm = new NotebookLMEngine(process.env.NOTEBOOKLM_AUTH_JSON ? 'cli' : 'api');
        const answer = await nlm.ask(String(question).slice(0, 3000), { notebookId });
        return Response.json({ success: true, data: answer });
      }

      /* ── Get Research Templates ── */
      case 'templates': {
        return Response.json({
          success: true,
          data: Object.entries(RESEARCH_TEMPLATES).map(([key, val]) => ({
            id: key,
            questions: val.questions,
          })),
        });
      }

      /* ── Build Research Context ── */
      case 'build-context': {
        const { analysis, compact, maxChars } = params;
        if (!analysis) {
          return Response.json({ error: 'Missing analysis data' }, { status: 400 });
        }
        const context = compact
          ? buildCompactResearchContext(analysis, maxChars || 3000)
          : buildResearchContext(analysis);
        return Response.json({ success: true, data: { context } });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[NotebookLM API]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
