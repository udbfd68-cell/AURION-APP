// @ts-nocheck — Complex clone route with highly dynamic payload; strict typing impractical for 30+ optional fields
/**
 * Clone API Route — Expert Website Cloning
 * 
 * Uses Ollama Cloud API for high-quality HTML generation (gemma4, glm-4.7-flash, gemini-3-flash-preview)
 * Fallback to Google Gemini when Ollama key is not set.
 * Enhanced with error classification, retry strategies, and output quality gates.
 */

import { NextRequest } from 'next/server';
import { type ClonePromptData, getModelHints, buildCloneSystemPrompt, buildBrainEnhancedPrompt } from '@/lib/system-prompts';
import { detectIndustry, generateDesignContext, PREMIUM_UI_PATTERNS, FRAMER_LEVEL_SYSTEM } from '@/lib/ui-ux-pro-max';
import { extractStructuredContent, extractKeyCSS, extractSPAData, calculateVisualDiffHints, buildMultiViewportPrompt } from '@/lib/firecrawl';
import {
  classifyError,
  calculateBackoff,
  compressHtmlForPrompt,
  budgetPromptSections,
  runQualityChecks,
  buildContinuationPrompt,
  type ErrorClass,
} from '@/lib/claude-code-engine';
import { cloneSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

// â”€â”€â”€ Model Config â€” Ollama Cloud primary, Google Gemini fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || '';
const OLLAMA_URL = 'https://ollama.com/v1/chat/completions';
const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || '';
const GOOGLE_URL_FALLBACK = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// â”€â”€â”€ Clone System Prompt â€” FULL LIBRARY (all templates, effects, animations, glass, videos) â”€â”€
const CLONE_SYSTEM = buildCloneSystemPrompt() + `

# ABSOLUTE CLONE RULES (override any conflicting instruction above)
1. Output ONLY complete HTML â€” start with <!DOCTYPE html>, end with </html>. No markdown.
2. ONE FILE: All CSS in <style> in <head>. All JS in <script> before </body>.
3. NEVER use cdn.tailwindcss.com â€” it BREAKS in iframe preview. Write ALL CSS by hand in <style>.
4. NEVER use Tailwind CDN or Tailwind Play CDN. Use real CSS properties.
5. Use EXACT colors, fonts, and images from the scraped data. Never invent.
6. Reproduce EVERY section. Under 600 lines = incomplete.
7. ALWAYS include: GSAP ScrollTrigger for scroll animations, Lenis for smooth scroll, IntersectionObserver for reveal.
8. Begin IMMEDIATELY with <!DOCTYPE html>.

# â›” MANDATORY RESOURCE USAGE FOR CLONES â€” USE EVERY TIME:
9. If the source site uses video backgrounds, reproduce them. Otherwise use a clean hero matching the source aesthetic. Do NOT force video on sites that don't have it.
10. Match the source site's visual style: if it uses glassmorphism, reproduce it. If it uses flat/clean design, reproduce THAT instead. Do NOT force glass effects on every clone.
11. ALWAYS use ANIMATION_PATTERNS: fade-in-up on scroll, stagger entrance (0.1-0.15s), marquee for logos, hover effects on cards.
12. ALWAYS use the EXACT FONTS from the FONT STACK enrichment data below. Import them via Google Fonts or the provided import URLs. Do NOT default to Syne/DM Sans â€” use whatever the source site uses (Poppins, Inter, Open Sans, Montserrat, Lato, Roboto, etc. are all valid if the source uses them). If no font data is available, THEN fall back to premium Google Fonts matching the site's mood.
13. Use gradient text on headings ONLY if the source site uses gradient text. Do NOT force gradients on every clone.
14. ALWAYS use SECTION_BLUEPRINTS: 8+ sections minimum (navâ†’heroâ†’logosâ†’featuresâ†’statsâ†’testimonialsâ†’ctaâ†’footer).
15. Use premium component patterns (glow buttons, glass cards) ONLY when they match the source site's aesthetic.
16. For dark sites: reproduce the source's dark aesthetic faithfully. Add aurora/glass/neon ONLY if the source uses similar effects.
17. For light sites: reproduce the source's clean/light aesthetic faithfully.
18. The GOAL is FAITHFUL REPRODUCTION. Premium effects are tools, not mandates. Use them when appropriate.`;

// Ollama Cloud models for cloning (primary)
const OLLAMA_MODELS: Record<string, string> = {
  'gemma4': 'gemma4',
  'glm-4.7-flash': 'glm-4.7-flash',
  'gemini-3-flash-preview': 'gemini-3-flash-preview',
};

// Gemini fallback models
const GEMINI_MODELS: Record<string, string> = {
  'gemini-2.5-pro': 'gemini-2.5-pro-preview-06-05',
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
  'gemini-2.0-flash': 'models/gemini-2.0-flash',
};

// All models support vision (screenshots)
const VISION_CLONE_MODELS = new Set([
  'gemma4', 'glm-4.7-flash', 'gemini-3-flash-preview',
  'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash',
]);

// Per-model max output tokens
const MODEL_MAX_TOKENS: Record<string, number> = {
  'gemma4': 65536,
  'glm-4.7-flash': 65536,
  'gemini-3-flash-preview': 65536,
  'gemini-2.5-pro': 65536,
  'gemini-2.5-flash': 65536,
  'gemini-2.0-flash': 65536,
};
const DEFAULT_MAX_TOKENS = 65536;

// Default model â€” Ollama Cloud primary
const DEFAULT_MODEL = 'gemini-3-flash-preview';

// Resolve which provider to use based on model + available keys
function resolveProvider(modelId: string): { url: string; key: string; apiModel: string } {
  if (OLLAMA_MODELS[modelId] && OLLAMA_KEY) {
    return { url: OLLAMA_URL, key: OLLAMA_KEY, apiModel: OLLAMA_MODELS[modelId] };
  }
  if (GEMINI_MODELS[modelId] && GOOGLE_KEY) {
    return { url: GOOGLE_URL_FALLBACK, key: GOOGLE_KEY, apiModel: GEMINI_MODELS[modelId] };
  }
  // Fallback: Ollama if key exists, else Gemini
  if (OLLAMA_KEY) {
    return { url: OLLAMA_URL, key: OLLAMA_KEY, apiModel: OLLAMA_MODELS[DEFAULT_MODEL] || DEFAULT_MODEL };
  }
  return { url: GOOGLE_URL_FALLBACK, key: GOOGLE_KEY, apiModel: GEMINI_MODELS['gemini-2.5-flash'] || 'gemini-2.5-flash' };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamClone(
  systemPrompt: string,
  userPrompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  preferredModel?: string,
  screenshots?: string[],
) {
  const hasScreenshots = screenshots && screenshots.length > 0;

  // Resolve model â€” prefer user selection, fallback to default
  const allModels = { ...OLLAMA_MODELS, ...GEMINI_MODELS };
  const modelId = preferredModel && allModels[preferredModel] ? preferredModel : DEFAULT_MODEL;
  const provider = resolveProvider(modelId);

  // Validate screenshots
  const validScreenshots = hasScreenshots
    ? screenshots!.filter(ss => ss && ss.length > 100 && (/^data:image\//.test(ss) || /^[A-Za-z0-9+/]/.test(ss)))
    : [];

  // Budget system prompt to prevent context overflow
  const maxContextChars = 500000;
  let effectiveSystemPrompt = systemPrompt;
  if (systemPrompt.length > maxContextChars) {
    const sections = budgetPromptSections([
      { name: 'methodology', content: systemPrompt.slice(0, 16000), priority: 10 },
      { name: 'core', content: systemPrompt.slice(16000), priority: 5 },
    ], maxContextChars);
    effectiveSystemPrompt = Array.from(sections.values()).join('\n');
  }

  console.log('[clone] System:', effectiveSystemPrompt.length, 'chars. User:', userPrompt.length, 'chars. Screenshots:', validScreenshots.length, 'Model:', modelId, 'â†’', provider.apiModel, 'Provider:', provider.url.includes('ollama') ? 'Ollama' : 'Gemini');
  const errors: string[] = [];
  const MAX_ATTEMPTS = 5;
  let skipScreenshots = false;
  let accumulatedOutput = '';

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const isVision = VISION_CLONE_MODELS.has(modelId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let userContent: any = userPrompt;

      // Gemini supports multimodal â€” send screenshots as image_url parts
      if (isVision && validScreenshots.length > 0 && !skipScreenshots) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [
          { type: 'text', text: userPrompt },
        ];
        for (const ss of validScreenshots.slice(0, 6)) {
          const imgUrl = ss.startsWith('data:') ? ss : `data:image/png;base64,${ss}`;
          parts.push({
            type: 'image_url',
            image_url: { url: imgUrl },
          });
        }
        userContent = parts;
      }

      const messages = [
        { role: 'system', content: effectiveSystemPrompt },
        { role: 'user', content: userContent },
      ];

      // Timeout escalation per attempt â€” generous for large output
      const timeoutMs = 300000 + (attempt * 60000);
      const fetchTimeout = AbortSignal.timeout(timeoutMs);

      // Use resolved provider (Ollama Cloud primary, Gemini fallback)
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.key}`,
        },
        body: JSON.stringify({
          model: provider.apiModel,
          messages,
          stream: true,
          max_tokens: MODEL_MAX_TOKENS[modelId] || DEFAULT_MAX_TOKENS,
          temperature: attempt === 0 ? 0.15 : 0.1 + (attempt * 0.05),
        }),
        signal: fetchTimeout,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        // â”€â”€â”€ Claude Code pattern: Error classification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const errorClass = classifyError(res.status, errText);
        errors.push(`${modelId}(${attempt + 1})[${errorClass}]: HTTP ${res.status} ${errText.slice(0, 80)}`);

        if (errorClass === 'auth_failure') throw new Error(`Auth failed (${res.status}). Check your API key.`);

        // Context overflow â€” compress prompt and retry
        if (errorClass === 'context_overflow') {
          console.log(`[clone] ${modelId}: context overflow, compressing prompt`);
          effectiveSystemPrompt = effectiveSystemPrompt.slice(0, Math.floor(effectiveSystemPrompt.length * 0.75));
          continue;
        }

        // Invalid image input â€” retry WITHOUT screenshots
        if (errorClass === 'invalid_input' && /invalid.image|image.input|image_url/i.test(errText)) {
          console.log(`[clone] ${modelId}: invalid image input, retrying without screenshots`);
          skipScreenshots = true;
          continue;
        }

        // Rate limit / server error â€” exponential backoff with jitter
        if (errorClass === 'rate_limit' || errorClass === 'server_error') {
          const delay = calculateBackoff(attempt);
          console.log(`[clone] ${modelId} ${errorClass} (${res.status}), waiting ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Other errors â€” standard retry delay
        const delay = calculateBackoff(attempt, { maxAttempts: 3, baseDelay: 2000, maxDelay: 15000, jitterFactor: 0.2, retryableClasses: new Set() });
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        errors.push(`${modelId}: no reader`);
        continue;
      }
      const decoder = new TextDecoder();
      let totalLen = 0;
      let sentModel = false;
      let buffer = '';
      accumulatedOutput = '';

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
            if (!text) continue;
            totalLen += text.length;
            accumulatedOutput += text;

            if (!sentModel) {
              sentModel = true;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model: modelId })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          } catch { /* skip malformed SSE */ }
        }
      }

      console.log(`[clone] ${modelId} attempt ${attempt + 1}: ${totalLen} chars`);

      // â”€â”€â”€ Enhanced quality gate â€” section count + completeness â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (totalLen > 400) {
        const quality = runQualityChecks(accumulatedOutput);
        // Count major HTML sections
        const sectionCount = (accumulatedOutput.match(/<(?:nav|header|section|main|footer|article)\b/gi) || []).length;
        const hasNav = /<nav\b/i.test(accumulatedOutput);
        const hasFooter = /<footer\b/i.test(accumulatedOutput);
        
        if (quality.warnings.length > 0) {
          console.log(`[clone] Quality warnings: ${quality.warnings.join(', ')}`);
        }
        console.log(`[clone] Sections: ${sectionCount}, nav: ${hasNav}, footer: ${hasFooter}, length: ${totalLen}`);
        
        // Fail if output is too incomplete (missing closing tag or too few sections)
        const isIncomplete = !quality.passed || (sectionCount < 2 && totalLen < 2000);
        if (isIncomplete && attempt < MAX_ATTEMPTS - 1) {
          console.log(`[clone] Quality gate failed (sections:${sectionCount}, errors:${quality.errors.join(', ')}), retrying...`);
          errors.push(`${modelId}(${attempt + 1}): quality gate failed: sections=${sectionCount}, ${quality.errors.join(', ')}`);
          if (quality.errors.includes('has_html_close') && totalLen > 2000) {
            console.log(`[clone] Output truncated at ${totalLen} chars, will retry`);
          }
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return; // SUCCESS
      }

      errors.push(`${modelId}(${attempt + 1}): only ${totalLen} chars (too short)`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      if (/Auth failed/.test(msg)) throw e;
      // â”€â”€â”€ Claude Code pattern: Error classification on catch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const errorClass = classifyError(0, msg);
      errors.push(`${modelId}(${attempt + 1})[${errorClass}]: ${msg}`);
      const delay = calculateBackoff(attempt);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
  }
  throw new Error(`${modelId} failed after ${MAX_ATTEMPTS} attempts: ${errors.join(' | ')}`);
}

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.heavy);
  if (rateLimitError) return rateLimitError;

  let body: { url: string; html?: string; rawHtml?: string; tokens?: any; branding?: any; screenshot?: string; screenshots?: string[]; pageName?: string; navigation?: any[]; images?: any[]; videos?: any[]; styleBlocks?: string[]; linkedResources?: any; model?: string; currentHtml?: string; feedback?: string; cssFramework?: string; iconLibraries?: string[]; animationLibraries?: string[]; colorFrequency?: any[]; interactionModels?: any[]; layeredAssets?: any[]; multiStateContent?: any[]; scrollBehaviors?: any[]; computedPatterns?: any; zIndexLayers?: any[]; pageTopology?: any[]; fontStack?: any[]; hoverTransitions?: any[]; responsiveBreakpoints?: any[]; componentSpecs?: any[]; designSystemCard?: any; prompt?: string; [key: string]: any };
  try {
    body = await req.json();
    cloneSchema.parse(body);          // validate required fields (prompt)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { url, html, rawHtml, tokens, branding, screenshot, screenshots, pageName, navigation, images, videos, styleBlocks, linkedResources, model: requestedModel, currentHtml, feedback, cssFramework, iconLibraries, animationLibraries, colorFrequency, interactionModels, layeredAssets, multiStateContent, scrollBehaviors, computedPatterns, zIndexLayers, pageTopology, fontStack, hoverTransitions, responsiveBreakpoints, componentSpecs, designSystemCard } = body;

  const isRefine = !!(currentHtml && feedback);

  if (!OLLAMA_KEY && !GOOGLE_KEY) {
    return new Response(JSON.stringify({ error: 'No AI API key configured. Set OLLAMA_API_KEY or GOOGLE_API_KEY.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Detect industry and generate design context
  const industry = detectIndustry(url, html || '');
  const designContext = generateDesignContext(industry);

  // Extract structured content map from rawHtml (has more content than cleaned html)
  const structuredContent = extractStructuredContent(rawHtml || html || '');

  // Build enrichment sections for the prompt â€” start with design intelligence
  const enrichmentSections: string[] = [designContext];

  // Model-specific optimization hints
  const selectedModel = requestedModel || 'qwen3-coder-480b';
  const modelHint = getModelHints(selectedModel);
  if (modelHint) enrichmentSections.push(`## MODEL OPTIMIZATION: ${modelHint}`);

  // Multi-viewport prompt when multiple screenshots available
  if (screenshots && screenshots.length > 1) {
    const viewports = [
      { width: 1440, label: 'Desktop' },
      { width: 768, label: 'Tablet' },
      { width: 390, label: 'Mobile' },
    ].slice(0, screenshots.length);
    const mvpPrompt = buildMultiViewportPrompt(viewports);
    if (mvpPrompt) enrichmentSections.push(mvpPrompt);
  }

  // Add detected framework/library info
  if (cssFramework) enrichmentSections.push(`## CSS FRAMEWORK DETECTED: ${cssFramework} â€” replicate its class patterns and design system`);
  if (iconLibraries && iconLibraries.length > 0) enrichmentSections.push(`## ICON LIBRARIES: ${iconLibraries.join(', ')} â€” use the same icon CDN`);
  if (animationLibraries && animationLibraries.length > 0) enrichmentSections.push(`## ANIMATION LIBRARIES DETECTED: ${animationLibraries.join(', ')} â€” reproduce these animation patterns`);

  // â”€â”€â”€ NEW: Advanced extraction data from ai-website-cloner methodology â”€â”€â”€â”€â”€

  // Interaction models â€” tells the AI whether sections are click-driven vs scroll-driven
  if (interactionModels && interactionModels.length > 0) {
    enrichmentSections.push(
      '## âš¡ INTERACTION MODELS (CRITICAL â€” build the correct interaction type):\n' +
      interactionModels.map(m =>
        `- **${m.section}**: ${m.model.toUpperCase()} â€” ${m.details}\n  Triggers: ${m.triggers.join(', ')}`
      ).join('\n') +
      '\n\nâš ï¸ CRITICAL: If a section is scroll-driven, do NOT build it with click handlers.\n' +
      'If it\'s click-driven, do NOT make it scroll-dependent. Getting the interaction model wrong requires a COMPLETE rewrite.'
    );
  }

  // Scroll behaviors â€” specific scroll-related mechanics to reproduce
  if (scrollBehaviors && scrollBehaviors.length > 0) {
    enrichmentSections.push(
      '## ðŸ“œ SCROLL BEHAVIORS (reproduce these exact scroll mechanics):\n' +
      scrollBehaviors.map(b => `- **${b.type}**: ${b.mechanism} â†’ affects: ${b.elements}`).join('\n') +
      '\n\nImplement each scroll behavior using the exact mechanism detected. Use GSAP ScrollTrigger for complex scroll animations, Lenis for smooth scroll, IntersectionObserver for reveal animations.'
    );
  }

  // Computed style patterns â€” granular CSS values per component (emulates getComputedStyle)
  if (computedPatterns && Object.keys(computedPatterns).length > 0) {
    const patternLines: string[] = [];
    for (const [component, props] of Object.entries(computedPatterns)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const propsStr = Object.entries(props as Record<string, any>).map(([k, v]) => `  ${k}: ${v}`).join('\n');
      patternLines.push(`### ${component}\n${propsStr}`);
    }
    enrichmentSections.push(
      '## ðŸŽ¯ COMPUTED STYLE PATTERNS (exact CSS values per component â€” MATCH THESE):\n' +
      patternLines.join('\n\n') +
      '\n\nThese values are extracted from the site\'s actual CSS rules. Apply them EXACTLY â€” ' +
      'do not approximate. "font-size: 18px" means 18px, not text-lg.'
    );
  }

  // Multi-state content â€” tabs, accordions, carousels that have multiple states
  if (multiStateContent && multiStateContent.length > 0) {
    enrichmentSections.push(
      '## ðŸ”„ MULTI-STATE CONTENT (build ALL states, not just the default):\n' +
      multiStateContent.map(s =>
        `- **${s.type.toUpperCase()}** (${s.stateCount} states): ${s.stateLabels.map(l => `"${l}"`).join(', ')}` +
        (s.defaultState ? ` | Default: "${s.defaultState}"` : '')
      ).join('\n') +
      '\n\nâš ï¸ You MUST build the content for EVERY state/tab, not just the default one.\n' +
      'Each tab/accordion should have its own real content. Extract shows the tab labels â€” ' +
      'build the content for each based on the page data provided.'
    );
  }

  // Layered assets â€” backgrounds + foregrounds + overlays stacked together
  if (layeredAssets && layeredAssets.length > 0) {
    enrichmentSections.push(
      '## ðŸŽ¨ LAYERED ASSET COMPOSITIONS (sections with stacked image/video layers):\n' +
      layeredAssets.map(la =>
        `- **${la.container}**: ${la.layers.length} layers\n` +
        la.layers.map(l => `  - ${l.type}: ${l.src}${l.position ? ` (${l.position})` : ''}`).join('\n')
      ).join('\n') +
      '\n\nThese sections have multiple visual layers. Reproduce ALL layers with correct z-ordering.\n' +
      'A missing overlay image or background makes the section look empty even if other layers are present.'
    );
  }

  // Z-index stacking context â€” how overlays are layered
  if (zIndexLayers && zIndexLayers.length > 0) {
    enrichmentSections.push(
      '## ðŸ“ Z-INDEX STACKING (layer ordering from front to back):\n' +
      zIndexLayers.slice(0, 20).map(l => `- ${l.element}: z-index:${l.zIndex} (${l.position})`).join('\n')
    );
  }

  // â”€â”€â”€ NEW: Page Topology from ai-website-cloner pipeline Phase 1 â”€â”€â”€â”€â”€
  // Gives the AI a complete map of the page structure BEFORE building
  if (pageTopology && Array.isArray(pageTopology) && pageTopology.length > 0) {
    enrichmentSections.push(
      '## ðŸ—ºï¸ PAGE TOPOLOGY (section-by-section map â€” build in this EXACT order):\n' +
      pageTopology.map(s =>
        `${s.order}. [${s.tag.toUpperCase()}] **${s.role}** (${s.position})` +
        ` â€” ${s.interactionModel}` +
        (s.headingText ? ` â€” "${s.headingText}"` : '') +
        ` â€” ${s.contentSummary}` +
        (s.hasVideo ? ' ðŸŽ¬' : '') + (s.hasImages ? ' ðŸ–¼ï¸' : '')
      ).join('\n') +
      '\n\nâš ï¸ Build EVERY section in this list. Missing ANY section = incomplete clone.' +
      '\nSections marked as scroll-driven MUST use IntersectionObserver/ScrollTrigger, NOT click handlers.' +
      '\nSections marked as click-driven MUST use event listeners/tabs, NOT scroll triggers.'
    );
  }

  // â”€â”€â”€ NEW: Font Stack from ai-website-cloner pipeline Phase 1 Global Extraction â”€â”€â”€â”€â”€
  if (fontStack && Array.isArray(fontStack) && fontStack.length > 0) {
    enrichmentSections.push(
      '## ðŸ”¤ FONT STACK (exact fonts to import and use):\n' +
      fontStack.map(f =>
        `- **${f.family}** (${f.source})` +
        ` â€” weights: ${f.weights.join(', ')}` +
        (f.importUrl ? `\n  Import: ${f.importUrl}` : '')
      ).join('\n') +
      '\n\nâš ï¸ CRITICAL: Import THESE exact fonts. Match the weights listed. Do NOT substitute with Syne/DM Sans or any other font.' +
      '\nThese are the ACTUAL fonts used by the source site. Using different fonts = failed clone.' +
      '\nOverride ANY font instruction from the system prompt â€” these extracted fonts take absolute priority.'
    );
  }

  // â”€â”€â”€ NEW: Hover Transitions from ai-website-cloner pipeline Phase 3 multi-state extraction â”€â”€â”€â”€â”€
  if (hoverTransitions && Array.isArray(hoverTransitions) && hoverTransitions.length > 0) {
    const topTransitions = hoverTransitions.slice(0, 30);
    enrichmentSections.push(
      '## ðŸŽ¯ HOVER STATE TRANSITIONS (exact before â†’ after CSS changes):\n' +
      topTransitions.map(t =>
        `### ${t.selector}:hover\n` +
        t.changes.map(c => `  ${c.property}: ${c.before} â†’ ${c.after}`).join('\n') +
        (t.transition ? `\n  transition: ${t.transition}` : '')
      ).join('\n') +
      '\n\nâš ï¸ Reproduce these EXACT hover effects with the specified transitions.' +
      '\nDon\'t invent hover effects â€” use these extracted values.'
    );
  }

  // â”€â”€â”€ NEW: Responsive Breakpoints from ai-website-cloner pipeline â”€â”€â”€â”€â”€
  if (responsiveBreakpoints && Array.isArray(responsiveBreakpoints) && responsiveBreakpoints.length > 0) {
    enrichmentSections.push(
      '## ðŸ“± RESPONSIVE BREAKPOINTS (actual media queries used by the site):\n' +
      responsiveBreakpoints.map(b =>
        `- **${b.query}**: affects ${b.affectedSelectors.slice(0, 10).join(', ')}`
      ).join('\n') +
      '\n\nUse THESE exact breakpoints in your @media rules â€” not generic ones.'
    );
  }

  // Color frequency â€” tell AI which colors are most used
  if (colorFrequency && Object.keys(colorFrequency).length > 0) {
    const sorted = Object.entries(colorFrequency).sort((a, b) => b[1] - a[1]).slice(0, 25);
    enrichmentSections.push('## COLOR USAGE FREQUENCY (use these exact colors, ranked by importance):\n' + sorted.map(([c, n]) => `${c} (${n} usages)`).join(', '));
  }

  if (navigation && navigation.length > 0) {
    enrichmentSections.push(
      '## NAVIGATION ITEMS (exact text & links):\n' +
      navigation.map(n => `- "${n.text}" â†’ ${n.href}`).join('\n')
    );
  }

  // Add structured content map â€” this is the KEY for accurate cloning
  if (structuredContent.sections.length > 0 || structuredContent.headings.length > 0) {
    const scParts: string[] = [];
    if (structuredContent.title) scParts.push(`Page Title: "${structuredContent.title}"`);
    if (structuredContent.metaDescription) scParts.push(`Description: "${structuredContent.metaDescription}"`);

    if (structuredContent.headings.length > 0) {
      scParts.push('\nHEADING HIERARCHY (reproduce ALL of these VERBATIM):');
      structuredContent.headings.slice(0, 100).forEach(h => {
        scParts.push(`  ${'#'.repeat(h.level)} ${h.text}`);
      });
    }

    if (structuredContent.allButtonTexts.length > 0) {
      scParts.push(`\nALL BUTTON/CTA TEXTS: ${structuredContent.allButtonTexts.slice(0, 80).map(t => `"${t}"`).join(', ')}`);
    }

    if (structuredContent.sections.length > 0) {
      scParts.push(`\nPAGE SECTIONS (${structuredContent.sections.length} total â€” reproduce EVERY one):`);
      structuredContent.sections.forEach((s, i) => {
        const parts: string[] = [`${i + 1}. [${s.tag.toUpperCase()}]`];
        if (s.heading) parts.push(`Heading: "${s.heading}"`);
        if (s.texts.length > 0) parts.push(`Text: ${s.texts.slice(0, 20).map(t => `"${t.slice(0, 500)}"`).join(' | ')}`);
        if (s.buttons.length > 0) parts.push(`Buttons: ${s.buttons.map(b => `"${b}"`).join(', ')}`);
        if (s.links.length > 0) parts.push(`Links: ${s.links.slice(0, 30).map(l => `"${l}"`).join(', ')}`);
        if (s.images > 0) parts.push(`Images: ${s.images}`);
        scParts.push(parts.join(' | '));
      });
    }

    enrichmentSections.push('## \uD83D\uDDFA\uFE0F STRUCTURED CONTENT MAP â€” USE THIS AS YOUR BLUEPRINT:\n' + scParts.join('\n'));
  }

  if (images && images.length > 0) {
    // Resolve image URLs to absolute â€” pass up to 40 for maximum coverage
    const resolvedImages = images.slice(0, 80).map(i => {
      let src = i.src;
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        try { src = new URL(src, url).href; } catch { /* keep relative */ }
      }
      return { ...i, src };
    });
    enrichmentSections.push(
      '## \u{1F4F7} IMAGE INVENTORY â€” USE THESE REAL URLs (MANDATORY):\n' +
      resolvedImages.map((i, idx) => `${idx + 1}. src="${i.src}" alt="${i.alt}"${i.width ? ` ${i.width}x${i.height}` : ''}`).join('\n') +
      '\n\n\u{26A0}\uFE0F CRITICAL: You MUST use the exact src URLs listed above in your <img> tags.\n' +
      'NEVER use placehold.co, placeholder.com, or via.placeholder when a REAL image URL exists above.\n' +
      'Copy-paste the src values EXACTLY. These are the original website images.'
    );
  }

  if (videos && videos.length > 0) {
    const resolvedVideos = videos.map(v => {
      let src = v.src;
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        try { src = new URL(src, url).href; } catch { /* keep relative */ }
      }
      return { ...v, src };
    });
    enrichmentSections.push(
      '## \u{1F3AC} VIDEO INVENTORY â€” USE THESE REAL URLs:\n' +
      resolvedVideos.map((v, idx) => `${idx + 1}. src="${v.src}"${v.poster ? ` poster="${v.poster}"` : ''}${v.type ? ` type="${v.type}"` : ''}`).join('\n') +
      '\nUse <video> tags with these exact src URLs. Include controls, poster, and autoplay/muted/loop where appropriate.'
    );
  }

  if (linkedResources?.fonts && linkedResources.fonts.length > 0) {
    enrichmentSections.push(
      '## FONT RESOURCES (must @import these):\n' +
      linkedResources.fonts.map(f => `- ${f}`).join('\n')
    );
  }

  // NOTE: styleBlocks are now processed for key CSS patterns.
  // We strip obfuscated class names but KEEP the CSS property-value pairs
  // (layout, colors, typography) that the AI needs to match the design.

  // Extract key CSS patterns from styleBlocks + rawHtml style tags
  const cssSource = (styleBlocks || '') + ((rawHtml || '').match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).join('\n');
  const keyCSS = extractKeyCSS(cssSource);
  if (keyCSS) {
    enrichmentSections.push('## CSS DESIGN PATTERNS (match these layout/visual/typography patterns):\n' + keyCSS);
  }

  if (cssSource) {
    // Extract ALL :root blocks
    const rootMatches = cssSource.match(/:root\s*\{([^}]+)\}/g) || [];
    if (rootMatches.length > 0) {
      const allVars = rootMatches.map(m => {
        const inner = m.match(/:root\s*\{([^}]+)\}/)?.[1] || '';
        return inner
          .split(';')
          .map(v => v.trim())
          .filter(v => v && !v.startsWith('//') && v.includes(':'))
          .filter(v => {
            const val = v.split(':').slice(1).join(':').trim();
            // Keep concrete values: colors, sizes, fonts
            return /^#|^rgb|^hsl|^\d|^"|^'|^oklch|^var\(/.test(val);
          });
      }).flat().slice(0, 100);

      if (allVars.length > 0) {
        enrichmentSections.push(`## CSS ROOT VARIABLES (use these EXACT values in your :root {}):\n:root {\n  ${allVars.join(';\n  ')};\n}`);
      }
    }

    // Also extract body/html background-color explicitly
    const bodyBgMatch = cssSource.match(/(?:body|html)\s*\{[^}]*background(?:-color)?\s*:\s*([^;}\s]+)/i);
    if (bodyBgMatch) {
      enrichmentSections.push(`## BODY BACKGROUND: ${bodyBgMatch[1]} â€” your body background MUST be this exact color`);
    }
  }

  if (tokens?.gradients && tokens.gradients.length > 0) {
    enrichmentSections.push('## GRADIENTS: ' + tokens.gradients.join(' | '));
  }
  if (tokens?.shadows && tokens.shadows.length > 0) {
    enrichmentSections.push('## BOX-SHADOWS: ' + tokens.shadows.join(' | '));
  }
  if (tokens?.keyframes && tokens.keyframes.length > 0) {
    enrichmentSections.push('## ANIMATIONS (@keyframes): ' + tokens.keyframes.join(', '));
  }
  if (tokens?.mediaQueries && tokens.mediaQueries.length > 0) {
    enrichmentSections.push('## BREAKPOINTS: ' + tokens.mediaQueries.join(' | '));
  }

  // â”€â”€â”€ ai-website-cloner Phase 3 & Phase 4: Component specs + design system card â”€â”€â”€
  if (designSystemCard && typeof designSystemCard === 'string' && designSystemCard.length > 20) {
    enrichmentSections.push(designSystemCard);
  }
  if (componentSpecs && typeof componentSpecs === 'string' && componentSpecs.length > 20) {
    enrichmentSections.push(componentSpecs);
  }

  // Clean HTML before building prompt â€” use Claude Code's context compression
  let cleanedHtml = compressHtmlForPrompt(html || '', 120000);
  // Extract body content
  const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    cleanedHtml = bodyMatch[1];
  } else {
    const bodyStart = cleanedHtml.search(/<body[^>]*>/i);
    if (bodyStart !== -1) {
      const bodyTagEnd = cleanedHtml.indexOf('>', bodyStart) + 1;
      cleanedHtml = cleanedHtml.slice(bodyTagEnd);
    }
    cleanedHtml = cleanedHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
    cleanedHtml = cleanedHtml.replace(/<\/?html[^>]*>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<\/?body[^>]*>/gi, '');
  }
  // Keep semantic class names, strip hashed/obfuscated ones
  cleanedHtml = cleanedHtml.replace(/\s*class="([^"]*)"/g, (_match, classes: string) => {
    const cleaned = classes.split(/\s+/)
      .filter(c => c && !/[A-Z].*__\w|_[a-f0-9]{5,}|^css-|^sc-|^emotion-|^styled-|^chakra-|^tw-|^_[A-Z]/.test(c))
      .filter(c => /^[a-z]/.test(c)) // only keep lowercase-starting classes (semantic)
      .join(' ')
      .trim();
    return cleaned ? ` class="${cleaned}"` : '';
  });
  cleanedHtml = cleanedHtml.replace(/\s*class='([^']*)'/g, '');
  // Strip data-* attributes
  cleanedHtml = cleanedHtml.replace(/\s*data-[a-z-]+="[^"]*"/g, '');
  // Strip empty elements
  cleanedHtml = cleanedHtml.replace(/<div>\s*<\/div>/g, '');
  cleanedHtml = cleanedHtml.replace(/<span>\s*<\/span>/g, '');
  cleanedHtml = cleanedHtml.replace(/<p>\s*<\/p>/g, '');
  cleanedHtml = cleanedHtml.replace(/\s{2,}/g, ' ').trim();

  console.log(`[clone] enrichments=${enrichmentSections.length} sections, refine=${isRefine}`);

  // Join all enrichment sections â€” use Claude Code's budget system for context management
  let enrichmentBlock = enrichmentSections.join('\n\n') + '\n\n' + PREMIUM_UI_PATTERNS + '\n\n' + FRAMER_LEVEL_SYSTEM;

  // â”€â”€â”€ Claude Code pattern: Smart context budget allocation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const MAX_ENRICHMENT = 250000;
  if (enrichmentBlock.length > MAX_ENRICHMENT) {
    // Budget allocation: prioritize design tokens > content map > CSS patterns > effects library
    const budgeted = budgetPromptSections([
      { name: 'design_context', content: enrichmentSections.slice(0, 3).join('\n\n'), priority: 10 },
      { name: 'content_map', content: enrichmentSections.slice(3, 6).join('\n\n'), priority: 9 },
      { name: 'extraction_data', content: enrichmentSections.slice(6).join('\n\n'), priority: 7 },
      { name: 'premium_patterns', content: PREMIUM_UI_PATTERNS, priority: 5 },
      { name: 'framer_system', content: FRAMER_LEVEL_SYSTEM, priority: 4 },
    ], MAX_ENRICHMENT);
    enrichmentBlock = Array.from(budgeted.values()).filter(Boolean).join('\n\n');
  }

  const encoder = new TextEncoder();

  // Dark theme detection â€” computed early so it's available throughout prompt construction
  const allColors = tokens?.colors || [];
  const darkColors = allColors.filter(c => {
    const hex = c.replace('#', '');
    if (hex.length < 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
    return luminance < 60;
  });
  const cssVars = tokens?.cssVariables || {};
  const darkCssVar = Object.entries(cssVars).some(([k, v]) => {
    if (/background|bg|surface/i.test(k)) {
      const hex = v.replace('#', '');
      if (hex.length >= 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r * 0.299 + g * 0.587 + b * 0.114) < 60;
      }
    }
    return false;
  });
  const isDarkTheme = darkColors.length > allColors.length * 0.35 || darkCssVar || /dark|noir|black/i.test(url);

  // Find the EXACT background color
  let bgColor = '';
  if (isDarkTheme) {
    const bgVarEntry = Object.entries(cssVars).find(([k]) => /^--(?:background|bg|surface|body-bg)$/i.test(k));
    if (bgVarEntry) bgColor = bgVarEntry[1];
    else if (darkColors.length > 0) bgColor = darkColors[0];
    else bgColor = '#000000';
  }



  const stream = new ReadableStream({
    async start(controller) {
      // Build enriched user prompt
      // NOTE: Colors, fonts, images, videos, CSS vars, gradients, shadows are already
      // in the enrichmentBlock (system prompt). Don't duplicate them here.
      const cloneParts: string[] = [
        `Clone this website: ${url}`,
        'Output ONLY the complete HTML. Start with <!DOCTYPE html>. No markdown, no explanation.',
      ];
      
      if (html) {
        let bodyContent = html;
        bodyContent = bodyContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        const bodyMatchGreedy = bodyContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatchGreedy) {
          bodyContent = bodyMatchGreedy[1];
        } else {
          const bodyStart = bodyContent.search(/<body[^>]*>/i);
          if (bodyStart !== -1) {
            const bodyTagEnd = bodyContent.indexOf('>', bodyStart) + 1;
            bodyContent = bodyContent.slice(bodyTagEnd);
          }
          bodyContent = bodyContent.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
          bodyContent = bodyContent.replace(/<\/?html[^>]*>/gi, '');
          bodyContent = bodyContent.replace(/<\/?body[^>]*>/gi, '');
        }
        // Keep semantic class names that hint at structure (hero, features, footer, etc.)
        // Also keep Tailwind-like utility classes that describe layout (flex, grid, gap, etc.)
        // Strip only hashed/obfuscated classes from CSS-in-JS frameworks
        bodyContent = bodyContent.replace(/\s*class="([^"]*)"/g, (_m, classes: string) => {
          const kept = classes.split(/\s+/)
            .filter(c => c && /^(?:hero|feature|footer|header|nav|main|about|pricing|card|cta|btn|logo|banner|section|container|wrapper|grid|flex|col|row|sidebar|content|title|subtitle|heading|text|desc|list|menu|social|testimonial|review|stat|metric|faq|partner|team|contact|form|input|label|icon|image|video|media|gallery|carousel|slider|tab|accordion|modal|dropdown|tooltip|badge|tag|chip|avatar|thumb|overlay|backdrop|gradient|dark|light|primary|secondary|animate|fade|slide|hover|active|disabled|hidden|visible|relative|absolute|fixed|sticky|top|bottom|left|right|center|between|around|evenly|wrap|nowrap|auto|full|half|third|quarter|max|min|sm|md|lg|xl|rounded|shadow|border|bg|p-|m-|w-|h-|gap|space|leading|tracking|font|text-)/i.test(c))
            .join(' ')
            .trim();
          return kept ? ` class="${kept}"` : '';
        });
        // Replace SVGs with descriptive placeholders, but keep viewBox info for sizing
        bodyContent = bodyContent.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, (svgTag) => {
          const vb = svgTag.match(/viewBox="([^"]+)"/)?.[1] || '';
          const cls = svgTag.match(/class="([^"]+)"/)?.[1] || '';
          return `[svg${vb ? ' ' + vb : ''}${cls ? ' .' + cls : ''}]`;
        });
        bodyContent = bodyContent.replace(/<div>\s*<\/div>/g, '');
        bodyContent = bodyContent.replace(/<span>\s*<\/span>/g, '');
        bodyContent = bodyContent.replace(/<p>\s*<\/p>/g, '');
        bodyContent = bodyContent.replace(/\s{2,}/g, ' ').trim();

        const textOnly = bodyContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (textOnly.length > 200) {
          cloneParts.push(`\n## PAGE HTML STRUCTURE (replicate ALL visible sections and text EXACTLY â€” EVERY section from header to footer):\n${bodyContent.slice(0, 120000)}`);
        } else {
          // SPA/JS-rendered site: try extracting text from rawHtml too
          let rawContent = '';
          if (rawHtml) {
            let raw = rawHtml;
            raw = raw.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            raw = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            // Extract text fragments â€” JSON strings often contain visible text in SPAs
            const jsonStrings = raw.match(/"(?:title|description|heading|text|label|name|content|subtitle|paragraph|caption)"\s*:\s*"([^"]{3,200})"/gi) || [];
            const extractedTexts = jsonStrings.map(s => {
              const m = s.match(/:\s*"([^"]+)"/);
              return m ? m[1] : '';
            }).filter(t => t.length > 5 && !/\\u|function|module|import|require|webpack/.test(t));

            const rawBody = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            if (rawBody) {
              rawContent = rawBody[1]
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            }

            if (rawContent.length > 200 || extractedTexts.length > 5) {
              cloneParts.push(`\n## EXTRACTED PAGE CONTENT (this is a JS-rendered SPA â€” reconstruct ALL sections based on this text):\n${rawContent.slice(0, 120000)}`);
              if (extractedTexts.length > 0) {
                cloneParts.push(`\n## EXTRACTED TEXT FROM PAGE DATA:\n${extractedTexts.slice(0, 200).join('\n')}`);
              }
            }
          }

          // Always provide reconstruction context for sparse content
          cloneParts.push(`\n## FULL SITE RECONSTRUCTION (body HTML was sparse â€” this is a JS-rendered SPA):
URL: ${url} | Nav: ${(navigation || []).map(n => n.text).join(', ')} | Images: ${(images || []).length} | Videos: ${(videos || []).length}
Create a COMPLETE page: sticky nav, hero, features (3-6 cards), testimonials, CTA, multi-column footer.
Use ALL provided design tokens, images, and navigation. ${isDarkTheme ? 'Dark theme.' : ''}`);
        }
      }

      // Extract SPA hydration data (__NEXT_DATA__, JSON-LD) from rawHtml
      // This captures content that JS frameworks embed in script tags
      if (rawHtml) {
        const spaTexts = extractSPAData(rawHtml);
        if (spaTexts.length > 5) {
          cloneParts.push(`\n## SPA HYDRATION DATA (text content from __NEXT_DATA__/JSON-LD â€” use this to fill in any missing sections):\n${spaTexts.join('\n')}`);
        }

        // Extract Jina readable text if present (injected by scrape route)
        const jinaTextMatch = rawHtml.match(/<!-- JINA_READABLE_TEXT_START -->\n([\s\S]*?)\n<!-- JINA_READABLE_TEXT_END -->/);
        if (jinaTextMatch) {
          const readableText = jinaTextMatch[1].trim();
          if (readableText.length > 200) {
            cloneParts.push(`\n## FULL PAGE TEXT (human-readable, rendered â€” this is the COMPLETE visible content of the page):\n${readableText.slice(0, 100000)}`);
          }
        }
      }

      if (isRefine && currentHtml && feedback) {
        // Calculate visual diff hints for targeted refining
        const visualDiffs = calculateVisualDiffHints(html || '', currentHtml);
        if (visualDiffs.length > 0) {
          cloneParts.push(`\n## ðŸ” VISUAL DIFF HINTS (auto-detected discrepancies):\n${visualDiffs.map(d => `- ${d}`).join('\n')}`);
        }
        const htmlSnippet = currentHtml.length > 20000
          ? currentHtml.slice(0, 10000) + '\n<!-- ... -->\n' + currentHtml.slice(-10000)
          : currentHtml;
        cloneParts.push(`\n## CURRENT HTML TO REFINE:\n${htmlSnippet}`);
        cloneParts.push(`\n## USER FEEDBACK â€” APPLY THESE CHANGES:\n${feedback}`);
        cloneParts.push('Output the COMPLETE updated HTML. Return the FULL file, not diffs.');
      }

      cloneParts.push(`\n## FINAL QUALITY CHECKLIST â€” VERIFY BEFORE OUTPUT:
- COMPLETE page: ALL sections from nav to footer. Under 400 lines = FAILURE.
- ${structuredContent.sections.length > 0 ? `Reproduce ALL ${structuredContent.sections.length} sections from the content map â€” COUNT them.` : 'Reproduce every visible section from the data provided.'}
- ${isDarkTheme ? `DARK THEME: body bg=${bgColor || '#000'}. ALL sections dark. ZERO white backgrounds anywhere.` : 'Color theme must match original exactly.'}
- Colors: EXACT hex/rgb from tokens. No invented colors. No approximations.
- Fonts: Import and apply correct Google Fonts at correct weights/sizes.
- Layout: Correct grid/flex, max-width, gaps, padding per original.
- Effects: Reproduce glassmorphism, gradients, shadows, glow, noise textures.
- Responsive: Mobile hamburger menu, stacked layouts, adjusted sizing at 768px/1024px.
- Animations: Scroll fade-in via IntersectionObserver, hover transitions on buttons/cards.
- Images/videos: Use ALL real URLs from inventory. Zero placeholders when real URLs exist.
- Every text string from content map reproduced VERBATIM â€” every heading, paragraph, button label.
- Start with <!DOCTYPE html>. End with </html>. Nothing else.`);

      // If screenshots exist, tell the AI to match them
      const screenshotList = screenshots?.filter(Boolean) || [];
      if (screenshotList.length > 0) {
        cloneParts.push(`\n## SCREENSHOTS: ${screenshotList.length} attached. Match layout, colors, typography, every section EXACTLY.`);
      }

      const userPrompt = cloneParts.join('\n');

      try {
        console.log(`[clone] Starting clone for ${url}, model=${requestedModel || 'auto'}, screenshots=${screenshotList.length}, darkTheme=${isDarkTheme}`);

        // Build the full system prompt with enrichment data (images, tokens, design context, etc.)
        const fullSystemPrompt = enrichmentBlock
          ? CLONE_SYSTEM + '\n\n# ENRICHMENT DATA FROM SCRAPED WEBSITE:\n\n' + enrichmentBlock
          : CLONE_SYSTEM;

        await streamClone(fullSystemPrompt, userPrompt, controller, encoder, requestedModel, screenshotList.length > 0 ? screenshotList : undefined);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'unknown';
        console.error('[clone] All models failed:', errMsg);
        const clean = errMsg.replace(/\s{2,}/g, ' ').trim().slice(0, 300) || 'Clone failed. Try again.';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: clean })}\n\n`));
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
