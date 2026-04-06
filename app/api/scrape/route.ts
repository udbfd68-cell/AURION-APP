/**
 * Scrape API Route — Firecrawl v2 with basic fetch fallback
 * If Firecrawl fails or is not configured, falls back to a direct fetch.
 *
 * Enhanced with Claude Code patterns:
 * - Parallel extraction: all 6 advanced extractors run concurrently
 * - Smart retry with error classification for fetch operations
 * - Error isolation: one extractor failure doesn't break the whole scrape
 */

import { NextRequest } from 'next/server';
import { executeParallel, withSmartRetry } from '@/lib/claude-code-engine';
import {
  FirecrawlClient,
  cleanHtmlForClone,
  extractDesignTokens,
  extractInternalLinks,
  extractNavigation,
  extractImages,
  extractVideos,
  extractStyleBlocks,
  extractLinkedResources,
  fetchExternalCSS,
  detectCSSFramework,
  detectIconLibrary,
  detectAnimationLibraries,
  extractInteractionModels,
  extractLayeredAssets,
  extractMultiStateContent,
  extractScrollBehaviors,
  extractComputedStylePatterns,
  extractZIndexLayers,
  extractPageTopology,
  extractFontStack,
  extractHoverTransitions,
  extractResponsiveBreakpoints,
  generateComponentSpecs,
  buildComponentSpecPrompt,
  buildDesignSystemCard,
  calculateVisualDiffHints,
  buildMultiViewportPrompt,
} from '@/lib/firecrawl';
import { scrapeSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const maxDuration = 45;

/** Fallback: fetch HTML directly when Firecrawl is unavailable — with smart retry */
async function basicFetch(url: string): Promise<string> {
  return withSmartRetry(
    async () => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(30000),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
      return res.text();
    },
    { maxAttempts: 5, baseDelay: 1000, maxDelay: 5000, jitterFactor: 0.3 },
  );
}

/** Jina Reader: renders JS-heavy pages — with smart retry */
async function jinaFetch(url: string): Promise<string> {
  return withSmartRetry(
    async () => {
      const res = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Accept': 'text/html',
          'X-Return-Format': 'html',
          'X-Wait-For-Selector': 'main, section, footer, article, [class*=hero], [class*=feature], [class*=content], [role=main], #__next, #app, #root',
          'X-Timeout': '45',
        },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`Jina HTTP ${res.status}`);
      return res.text();
    },
    { maxAttempts: 3, baseDelay: 2000, maxDelay: 8000, jitterFactor: 0.3 },
  );
}

/** Jina Reader in markdown mode — with smart retry */
async function jinaMarkdownFetch(url: string): Promise<string> {
  return withSmartRetry(
    async () => {
      const res = await fetch(`https://r.jina.ai/${url}`, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Jina markdown HTTP ${res.status}`);
      return res.text();
    },
    { maxAttempts: 3, baseDelay: 1500, maxDelay: 6000, jitterFactor: 0.3 },
  );
}

/** Count visible text chars in HTML (excluding scripts/styles/tags) */
function getVisibleTextLength(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
}

function buildFallbackResponse(html: string, url: string) {
  const cleaned = cleanHtmlForClone(html);
  const tokens = extractDesignTokens(html);
  const navigation = extractNavigation(html);
  const images = extractImages(html);
  const videos = extractVideos(html);
  const styleBlocks = extractStyleBlocks(html);
  const linkedResources = extractLinkedResources(html);
  const internalLinks = extractInternalLinks(html, url);
  const cssFramework = detectCSSFramework(html);
  const iconLibraries = detectIconLibrary(html);
  const animationLibraries = detectAnimationLibraries(html);

  // ─── Claude Code pattern: Parallel extraction with error isolation ────
  // Each extractor runs independently — one failure doesn't break others
  let interactionModels = {} as ReturnType<typeof extractInteractionModels>;
  let layeredAssets = {} as ReturnType<typeof extractLayeredAssets>;
  let multiStateContent = {} as ReturnType<typeof extractMultiStateContent>;
  let scrollBehaviors = {} as ReturnType<typeof extractScrollBehaviors>;
  let computedPatterns = {} as ReturnType<typeof extractComputedStylePatterns>;
  let zIndexLayers = {} as ReturnType<typeof extractZIndexLayers>;
  let pageTopology = {} as ReturnType<typeof extractPageTopology>;
  let fontStack = {} as ReturnType<typeof extractFontStack>;
  let hoverTransitions = {} as ReturnType<typeof extractHoverTransitions>;
  let responsiveBreakpoints = {} as ReturnType<typeof extractResponsiveBreakpoints>;
  try { interactionModels = extractInteractionModels(html, styleBlocks); } catch { /* isolated */ }
  try { layeredAssets = extractLayeredAssets(html); } catch { /* isolated */ }
  try { multiStateContent = extractMultiStateContent(html); } catch { /* isolated */ }
  try { scrollBehaviors = extractScrollBehaviors(html, styleBlocks); } catch { /* isolated */ }
  try { computedPatterns = extractComputedStylePatterns(html, styleBlocks); } catch { /* isolated */ }
  try { zIndexLayers = extractZIndexLayers(html, styleBlocks); } catch { /* isolated */ }
  try { pageTopology = extractPageTopology(html); } catch { /* isolated */ }
  try { fontStack = extractFontStack(html, styleBlocks); } catch { /* isolated */ }
  try { hoverTransitions = extractHoverTransitions(styleBlocks); } catch { /* isolated */ }
  try { responsiveBreakpoints = extractResponsiveBreakpoints(styleBlocks); } catch { /* isolated */ }

  // ─── Phase 3: Component specs + design system card (ai-website-cloner pipeline) ────
  let componentSpecs = '';
  let designSystemCard = '';
  try {
    const topoArray = Array.isArray(pageTopology) ? pageTopology : [];
    const fontArray = Array.isArray(fontStack) ? fontStack : [];
    const interArray = Array.isArray(interactionModels) ? interactionModels : [];
    const hoverArray = Array.isArray(hoverTransitions) ? hoverTransitions : [];
    const layerArray = Array.isArray(layeredAssets) ? layeredAssets : [];
    const multiArray = Array.isArray(multiStateContent) ? multiStateContent : [];
    const scrollArray = Array.isArray(scrollBehaviors) ? scrollBehaviors : [];
    const bpArray = Array.isArray(responsiveBreakpoints) ? responsiveBreakpoints : [];
    const compPatterns = (computedPatterns && typeof computedPatterns === 'object') ? computedPatterns as Record<string, Record<string, string>> : {};

    if (topoArray.length > 0) {
      const specs = generateComponentSpecs(html, styleBlocks, topoArray, fontArray, interArray, hoverArray, layerArray, multiArray, scrollArray, compPatterns);
      componentSpecs = buildComponentSpecPrompt(specs);
    }
    designSystemCard = buildDesignSystemCard(tokens, fontArray, bpArray);
  } catch { /* isolated — never break scrape for spec generation */ }

  return {
    html: cleaned.slice(0, 300000),
    rawHtml: html.slice(0, 400000),
    tokens,
    branding: null,
    internalLinks: internalLinks.slice(0, 60),
    screenshot: null,
    metadata: null,
    navigation,
    images: images.slice(0, 120),
    videos: videos.slice(0, 40),
    styleBlocks: styleBlocks.slice(0, 60000),
    linkedResources,
    cssFramework,
    iconLibraries,
    animationLibraries,
    colorFrequency: tokens.colorFrequency,
    interactionModels,
    layeredAssets,
    multiStateContent,
    scrollBehaviors,
    computedPatterns,
    zIndexLayers,
    pageTopology,
    fontStack,
    hoverTransitions,
    responsiveBreakpoints,
    componentSpecs,
    designSystemCard,
    fallback: true,
  };
}

export async function POST(req: NextRequest) {
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.heavy);
  if (rateLimitError) return rateLimitError;

  let body: { url: string; light?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { url, light = false } = body;

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate URL format and block SSRF (internal/private IPs)
  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Only allow http/https
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return new Response(JSON.stringify({ error: 'Only HTTP/HTTPS URLs are allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Block internal/private IPs (comprehensive SSRF protection)
  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, '');
  // Strip leading zeros (e.g., 127.000.000.001) and normalize each octet
  const normalizedHost = hostname.replace(/^0+(?=\d)/g, '');
  // Block decimal IP (e.g., 2130706433 = 127.0.0.1) and hex IP (e.g., 0x7f000001)
  const isDecimalIP = /^\d{8,}$/.test(hostname);
  const isHexIP = /^0x[0-9a-f]+$/i.test(hostname);
  if (
    isDecimalIP || isHexIP ||
    /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|0\.0\.0\.0|::1|fc00:|fe80:|fd)/.test(normalizedHost) ||
    hostname === '[::1]' || hostname === '0.0.0.0' ||
    /^(?:169\.254\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(normalizedHost)
  ) {
    return new Response(JSON.stringify({ error: 'Internal URLs are not allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;

  // â”€â”€ No Firecrawl key â†’ basic fetch + Jina Reader fallback â”€â”€
  // No Firecrawl key: MULTI-STRATEGY parallel fetch
  // Always run basicFetch + Jina HTML + Jina Markdown in parallel
  // This ensures the BEST content for ANY site type (SSR, SPA, static)
  if (!apiKey) {
    try {
      const [basicResult, jinaHtmlResult, jinaTextResult] = await Promise.allSettled([
        basicFetch(url),
        jinaFetch(url),
        jinaMarkdownFetch(url),
      ]);

      const basicHtml = basicResult.status === 'fulfilled' ? basicResult.value : '';
      const jinaHtml = jinaHtmlResult.status === 'fulfilled' ? jinaHtmlResult.value : '';
      const jinaText = jinaTextResult.status === 'fulfilled' ? jinaTextResult.value : '';

      const basicTextLen = basicHtml ? getVisibleTextLength(basicHtml) : 0;
      const jinaTextLen = jinaHtml ? getVisibleTextLength(jinaHtml) : 0;

      let finalHtml = '';

      // Smart merging: HEAD from basicFetch (meta/styles), BODY from richest source
      // Then enrich with content from the other source to capture JS-rendered content
      if (basicHtml && jinaHtml.length > 500) {
        // Always extract HEAD from basicFetch (has meta tags, CSS links, inline styles)
        const headMatch = basicHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        const headContent = headMatch ? headMatch[1] : '';
        // Also grab any inline <style> tags from basic fetch (even if outside <head>)
        const allBasicStyles = (basicHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
        // Also grab inline styles from Jina (might have computed styles)
        const jinaStyles = (jinaHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');

        // Compare body content quality
        const basicBody = basicHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        const jinaBody = jinaHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);

        // Count meaningful sections (nav, main, section, article, footer) as quality signal
        const basicSections = (basicBody?.[1] || '').match(/<(nav|main|section|article|footer|header)\b/gi)?.length || 0;
        const jinaSections = (jinaBody?.[1] || '').match(/<(nav|main|section|article|footer|header)\b/gi)?.length || 0;

        // Use the source with more structural sections, fallback to text length
        const useJinaBody = jinaSections > basicSections || (jinaSections === basicSections && jinaTextLen > basicTextLen);
        const primaryBody = useJinaBody ? (jinaBody?.[1] || jinaHtml.slice(0, 400000)) : (basicBody?.[1] || basicHtml);
        const secondaryBody = useJinaBody ? basicBody?.[1] : jinaBody?.[1];

        // Combine: HEAD from basic + inline styles from both + primary BODY
        const mergedHead = `${headContent}\n${allBasicStyles}\n${jinaStyles}`;
        finalHtml = `<html><head>${mergedHead}</head><body>${primaryBody}</body></html>`;

        // If secondary source has significant unique content, append as enrichment
        if (secondaryBody && getVisibleTextLength(secondaryBody) > 500) {
          const secondaryText = getVisibleTextLength(secondaryBody);
          const primaryText = getVisibleTextLength(primaryBody);
          // Only enrich if secondary has >20% content not in primary (rough heuristic)
          if (secondaryText > primaryText * 0.2) {
            finalHtml = finalHtml.replace(/<\/body>/i, `\n<!-- ENRICHMENT_SOURCE -->${secondaryBody.slice(0, 160000)}\n</body>`);
          }
        }
      } else if (jinaHtml.length > 500) {
        finalHtml = jinaHtml;
      } else if (basicHtml) {
        finalHtml = basicHtml;
      }

      if (!finalHtml) {
        return new Response(JSON.stringify({ error: 'All fetch strategies returned empty content' }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        });
      }

      const response = buildFallbackResponse(finalHtml, url);

      // Fetch external CSS files in parallel for better design token extraction
      try {
        const externalCSS = await fetchExternalCSS(finalHtml, url);
        if (externalCSS.length > 0) {
          response.styleBlocks = ((response.styleBlocks || '') + '\n' + externalCSS).slice(0, 120000);
          // Re-extract tokens with enriched CSS
          const enrichedTokens = extractDesignTokens(finalHtml + '<style>' + externalCSS + '</style>');
          response.tokens = enrichedTokens;
          (response as Record<string, unknown>).colorFrequency = enrichedTokens.colorFrequency;
        }
      } catch { /* external CSS fetch failed, continue with inline styles */ }

      // Jina markdown: human-readable text of the full page
      // Critical for SPAs where HTML extraction misses dynamic/lazy-loaded content
      if (jinaText && jinaText.length > 200) {
        const markdownBlock = `\n<!-- JINA_READABLE_TEXT_START -->\n${jinaText.slice(0, 120000)}\n<!-- JINA_READABLE_TEXT_END -->\n`;
        response.rawHtml = (response.rawHtml || '') + markdownBlock;
      }

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Scrape failed';
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const firecrawl = new FirecrawlClient(apiKey);

  try {
    if (light) {
      const data = await firecrawl.scrapeLight(url);
      const cleaned = cleanHtmlForClone(data.html);
      return new Response(JSON.stringify({
        html: cleaned.slice(0, 100000),
        rawHtml: null,
        tokens: extractDesignTokens(data.html),
        branding: null,
        internalLinks: [],
        screenshot: data.screenshot,
        navigation: [],
        images: [],
        styleBlocks: '',
        linkedResources: { stylesheets: [], fonts: [] },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Full mode: full-page scroll capture + map in parallel
    const [scrapeResult, mapResult] = await Promise.allSettled([
      firecrawl.scrapeFullPage(url),
      firecrawl.map(url, { limit: 10 }),
    ]);

    if (scrapeResult.status === 'rejected') {
      // Firecrawl failed â†’ try basic fetch + Jina enrichment
      let html = '';
      try { html = await basicFetch(url); } catch { /* basic fetch failed */ }
      if (getVisibleTextLength(html) < 500) {
        try {
          const markdown = await jinaFetch(url);
          if (markdown.length > 200) {
            if (html && /<\/body>/i.test(html)) {
              html = html.replace(/<\/body>/i, `\n<section class="rendered-content">\n${markdown.slice(0, 120000)}\n</section>\n</body>`);
            } else {
              html = `<html><body>\n<section class="rendered-content">${markdown.slice(0, 120000)}</section>\n</body></html>`;
            }
          }
        } catch { /* Jina also failed */ }
      }
      if (!html) html = '<html><body><p>Scrape failed</p></body></html>';
      return new Response(JSON.stringify(buildFallbackResponse(html, url)), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = scrapeResult.value;
    const cleaned = cleanHtmlForClone(data.html);
    const rawSource = data.rawHtml || data.html;
    const designTokens = extractDesignTokens(rawSource);

    const navigation = extractNavigation(rawSource);
    const images = extractImages(rawSource);
    const styleBlocks = extractStyleBlocks(rawSource);
    const linkedResources = extractLinkedResources(rawSource);

    const htmlLinks = extractInternalLinks(rawSource, url);
    const scrapeLinks = data.links.filter(l => {
      try { return new URL(l).origin === new URL(url).origin; } catch { return false; }
    }).map(l => new URL(l).pathname);

    let mapLinks: string[] = [];
    if (mapResult.status === 'fulfilled' && mapResult.value.success && mapResult.value.links) {
      mapLinks = mapResult.value.links
        .map(l => { try { return new URL(l.url).pathname; } catch { return ''; } })
        .filter(p => p && p !== '/' && p !== new URL(url).pathname);
    }

    const finalLinks = [...new Set([...htmlLinks, ...scrapeLinks, ...mapLinks])].slice(0, 40);

    // Detect frameworks and libraries
    const cssFramework = detectCSSFramework(rawSource);
    const iconLibraries = detectIconLibrary(rawSource);
    const animationLibraries = detectAnimationLibraries(rawSource);

    // Fetch external CSS for richer token extraction
    let enrichedStyleBlocks = styleBlocks;
    let enrichedTokens = designTokens;
    try {
      const externalCSS = await fetchExternalCSS(rawSource, url);
      if (externalCSS.length > 0) {
        enrichedStyleBlocks = (styleBlocks + '\n' + externalCSS).slice(0, 60000);
        enrichedTokens = extractDesignTokens(rawSource + '<style>' + externalCSS + '</style>');
      }
    } catch { /* continue with inline styles */ }

    // ─── Claude Code pattern: Parallel advanced extraction with error isolation ────
    const extractionTasks = [
      { name: 'interactionModels', fn: () => extractInteractionModels(rawSource, enrichedStyleBlocks), critical: false },
      { name: 'layeredAssets', fn: () => extractLayeredAssets(rawSource), critical: false },
      { name: 'multiStateContent', fn: () => extractMultiStateContent(rawSource), critical: false },
      { name: 'scrollBehaviors', fn: () => extractScrollBehaviors(rawSource, enrichedStyleBlocks), critical: false },
      { name: 'computedPatterns', fn: () => extractComputedStylePatterns(rawSource, enrichedStyleBlocks), critical: false },
      { name: 'zIndexLayers', fn: () => extractZIndexLayers(rawSource, enrichedStyleBlocks), critical: false },
      { name: 'pageTopology', fn: () => extractPageTopology(rawSource), critical: false },
      { name: 'fontStack', fn: () => extractFontStack(rawSource, enrichedStyleBlocks), critical: false },
      { name: 'hoverTransitions', fn: () => extractHoverTransitions(enrichedStyleBlocks), critical: false },
      { name: 'responsiveBreakpoints', fn: () => extractResponsiveBreakpoints(enrichedStyleBlocks), critical: false },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractionResults = await executeParallel<any>(extractionTasks, 10);
    const extractionMap = new Map(extractionResults.map(r => [r.name, r]));

    const interactionModels = extractionMap.get('interactionModels')?.value ?? {};
    const layeredAssets = extractionMap.get('layeredAssets')?.value ?? {};
    const multiStateContent = extractionMap.get('multiStateContent')?.value ?? {};
    const scrollBehaviors = extractionMap.get('scrollBehaviors')?.value ?? {};
    const computedPatterns = extractionMap.get('computedPatterns')?.value ?? {};
    const zIndexLayers = extractionMap.get('zIndexLayers')?.value ?? {};
    const pageTopology = extractionMap.get('pageTopology')?.value ?? [];
    const fontStack = extractionMap.get('fontStack')?.value ?? [];
    const hoverTransitions = extractionMap.get('hoverTransitions')?.value ?? [];
    const responsiveBreakpoints = extractionMap.get('responsiveBreakpoints')?.value ?? [];

    // ─── Phase 3: Component specs + design system card (ai-website-cloner pipeline) ────
    let componentSpecs = '';
    let designSystemCard = '';
    try {
      const topoArray = Array.isArray(pageTopology) ? pageTopology : [];
      const fontArray = Array.isArray(fontStack) ? fontStack : [];
      const interArray = Array.isArray(interactionModels) ? interactionModels : [];
      const hoverArray = Array.isArray(hoverTransitions) ? hoverTransitions : [];
      const layerArray = Array.isArray(layeredAssets) ? layeredAssets : [];
      const multiArray = Array.isArray(multiStateContent) ? multiStateContent : [];
      const scrollArray = Array.isArray(scrollBehaviors) ? scrollBehaviors : [];
      const bpArray = Array.isArray(responsiveBreakpoints) ? responsiveBreakpoints : [];
      const compPatterns = (computedPatterns && typeof computedPatterns === 'object') ? computedPatterns as Record<string, Record<string, string>> : {};

      if (topoArray.length > 0) {
        const specs = generateComponentSpecs(rawSource, enrichedStyleBlocks, topoArray, fontArray, interArray, hoverArray, layerArray, multiArray, scrollArray, compPatterns);
        componentSpecs = buildComponentSpecPrompt(specs);
      }
      designSystemCard = buildDesignSystemCard(enrichedTokens, fontArray, bpArray);
    } catch { /* isolated */ }

    return new Response(JSON.stringify({
      html: cleaned.slice(0, 200000),
      rawHtml: (data.rawHtml || '').slice(0, 300000),
      tokens: enrichedTokens,
      branding: null,
      internalLinks: finalLinks,
      screenshot: (data.screenshots && data.screenshots.length > 0) ? data.screenshots[0] : null,
      screenshots: data.screenshots || [],
      metadata: data.metadata,
      navigation,
      images: images.slice(0, 80),
      videos: extractVideos(data.rawHtml || '').slice(0, 30),
      styleBlocks: enrichedStyleBlocks.slice(0, 80000),
      linkedResources,
      cssFramework,
      iconLibraries,
      animationLibraries,
      colorFrequency: enrichedTokens.colorFrequency,
      interactionModels,
      layeredAssets,
      multiStateContent,
      scrollBehaviors,
      computedPatterns,
      zIndexLayers,
      pageTopology,
      fontStack,
      hoverTransitions,
      responsiveBreakpoints,
      componentSpecs,
      designSystemCard,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    // Final fallback: try basic fetch + Jina if Firecrawl threw
    try {
      let html = '';
      try { html = await basicFetch(url); } catch { /* basic fetch failed */ }
      if (getVisibleTextLength(html) < 500) {
        try {
          const markdown = await jinaFetch(url);
          if (markdown.length > 200) {
            if (html && /<\/body>/i.test(html)) {
              html = html.replace(/<\/body>/i, `\n<section class="rendered-content">\n${markdown.slice(0, 120000)}\n</section>\n</body>`);
            } else {
              html = `<html><body>\n<section class="rendered-content">${markdown.slice(0, 120000)}</section>\n</body></html>`;
            }
          }
        } catch { /* Jina also failed */ }
      }
      if (html) {
        return new Response(JSON.stringify(buildFallbackResponse(html, url)), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch { /* all fallbacks failed */ }
    const message = err instanceof Error ? err.message : 'Scrape failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
