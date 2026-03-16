/**
 * Firecrawl v2 SDK Integration
 * Source: https://github.com/firecrawl/firecrawl
 * 
 * Full integration with Firecrawl's Web Data API for AI.
 * Supports: scrape, map, screenshot, branding, rawHtml, markdown formats
 * API docs: https://docs.firecrawl.dev/api-reference/introduction
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FirecrawlScrapeOptions {
  url: string;
  formats?: FirecrawlFormat[];
  onlyMainContent?: boolean;
  waitFor?: number;
  actions?: FirecrawlAction[];
  headers?: Record<string, string>;
  includeTags?: string[];
  excludeTags?: string[];
  timeout?: number;
}

export type FirecrawlFormat = 
  | 'markdown' 
  | 'html' 
  | 'rawHtml' 
  | 'screenshot' 
  | 'links' 
  | 'branding';

export interface FirecrawlAction {
  type: 'click' | 'write' | 'press' | 'scroll' | 'wait' | 'screenshot';
  selector?: string;
  text?: string;
  key?: string;
  direction?: 'up' | 'down';
  amount?: number;
  milliseconds?: number;
}

export interface FirecrawlBranding {
  colors: {
    primary?: string[];
    secondary?: string[];
    background?: string[];
    text?: string[];
    accent?: string[];
  };
  fonts: string[];
  typography?: {
    headingFont?: string;
    bodyFont?: string;
    sizes?: Record<string, string>;
  };
  logo?: string;
}

export interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    screenshot?: string; // base64 encoded
    links?: string[];
    branding?: FirecrawlBranding;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      statusCode?: number;
      language?: string;
      ogImage?: string;
    };
  };
  error?: string;
}

export interface FirecrawlMapResult {
  success: boolean;
  links?: Array<{
    url: string;
    title?: string;
    description?: string;
  }>;
  error?: string;
}

// ─── Firecrawl Client Class ─────────────────────────────────────────────────

export class FirecrawlClient {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Scrape a URL with specified formats
   * Formats: markdown, html, rawHtml, screenshot, links, branding
   * 
   * From Firecrawl docs:
   * - screenshot: Returns base64 encoded page screenshot
   * - branding: Extracts brand identity (colors, fonts, typography)
   * - rawHtml: Returns the full unprocessed HTML
   * - html: Returns cleaned HTML
   * - links: Returns all links found on the page
   * - markdown: Returns LLM-ready markdown content
   */
  async scrape(options: FirecrawlScrapeOptions): Promise<FirecrawlScrapeResult> {
    const { url, formats = ['html'], onlyMainContent, waitFor, actions, headers, includeTags, excludeTags, timeout } = options;

    const body: Record<string, unknown> = { url, formats };
    if (onlyMainContent !== undefined) body.onlyMainContent = onlyMainContent;
    if (waitFor) body.waitFor = waitFor;
    if (actions) body.actions = actions;
    if (headers) body.headers = headers;
    if (includeTags) body.includeTags = includeTags;
    if (excludeTags) body.excludeTags = excludeTags;
    if (timeout) body.timeout = timeout;

    const res = await fetch(`${this.baseUrl}/v1/scrape`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error || `Firecrawl HTTP ${res.status}` };
    }

    return res.json();
  }

  /**
   * Map all URLs on a website instantly
   * Returns all discoverable URLs for crawling sub-pages
   * 
   * From Firecrawl docs:
   * curl -X POST 'https://api.firecrawl.dev/v2/map' \
   *   -d '{"url": "https://firecrawl.dev"}'
   * Returns: { links: [{ url, title, description }] }
   */
  async map(url: string, options?: { search?: string; limit?: number }): Promise<FirecrawlMapResult> {
    const body: Record<string, unknown> = { url };
    if (options?.search) body.search = options.search;
    if (options?.limit) body.limit = options.limit;

    const res = await fetch(`${this.baseUrl}/v1/map`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error || `Map HTTP ${res.status}` };
    }

    return res.json();
  }

  /**
   * Full website scrape with all formats for cloning
   * Combines: rawHtml + screenshot + branding + links
   * This is the ultimate method for pixel-perfect cloning
   */
  async scrapeForClone(url: string): Promise<{
    html: string;
    rawHtml: string;
    screenshot: string | null;
    branding: FirecrawlBranding | null;
    links: string[];
    metadata: Record<string, unknown> | undefined;
  }> {
    const result = await this.scrape({
      url,
      formats: ['html', 'rawHtml', 'screenshot', 'links', 'branding'],
      waitFor: 3000,
      onlyMainContent: false,
      timeout: 25000,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Scrape failed');
    }

    return {
      html: result.data.html || '',
      rawHtml: result.data.rawHtml || '',
      screenshot: result.data.screenshot || null,
      branding: result.data.branding || null,
      links: result.data.links || [],
      metadata: result.data.metadata,
    };
  }

  /**
   * Full-page scrape with scroll capture — takes multiple screenshots
   * at different scroll positions to capture below-the-fold content.
   * Uses Firecrawl actions: wait → screenshot → scroll → screenshot → ...
   */
  async scrapeFullPage(url: string): Promise<{
    html: string;
    rawHtml: string;
    screenshots: string[];
    branding: FirecrawlBranding | null;
    links: string[];
    metadata: Record<string, unknown> | undefined;
  }> {
    // Actions: take viewport screenshot, scroll down, take another, repeat
    const scrollActions: FirecrawlAction[] = [
      { type: 'wait', milliseconds: 2000 },
      { type: 'screenshot' },                          // viewport (top)
      { type: 'scroll', direction: 'down', amount: 3 },
      { type: 'wait', milliseconds: 1000 },
      { type: 'screenshot' },                          // middle section
      { type: 'scroll', direction: 'down', amount: 3 },
      { type: 'wait', milliseconds: 1000 },
      { type: 'screenshot' },                          // bottom section
    ];

    const result = await this.scrape({
      url,
      formats: ['html', 'rawHtml', 'links', 'branding'],
      waitFor: 1000,
      onlyMainContent: false,
      actions: scrollActions,
      timeout: 25000,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Full-page scrape failed');
    }

    // Firecrawl returns action screenshots in data.actions.screenshots array
    // Also may have a main screenshot in data.screenshot
    const screenshots: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions = (result.data as any)?.actions;
    if (actions?.screenshots && Array.isArray(actions.screenshots)) {
      screenshots.push(...actions.screenshots.filter((s: string) => s && s.length > 100));
    }
    // Fallback: if actions didn't produce screenshots, use the main one
    if (screenshots.length === 0 && result.data.screenshot) {
      screenshots.push(result.data.screenshot);
    }

    return {
      html: result.data.html || '',
      rawHtml: result.data.rawHtml || '',
      screenshots,
      branding: result.data.branding || null,
      links: result.data.links || [],
      metadata: result.data.metadata,
    };
  }

  /**
   * Light scrape for sub-pages (less data, faster)
   */
  async scrapeLight(url: string): Promise<{
    html: string;
    screenshot: string | null;
  }> {
    const result = await this.scrape({
      url,
      formats: ['html', 'screenshot'],
      onlyMainContent: true,
      waitFor: 500,
    });

    return {
      html: result.data?.html || '',
      screenshot: result.data?.screenshot || null,
    };
  }
}

// ─── Helper: Clean HTML for LLM consumption ─────────────────────────────────

export function cleanHtmlForClone(html: string): string {
  let cleaned = html;

  // Remove all script tags (inline and external)
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove style tags (CSS is extracted separately via extractStyleBlocks/extractDesignTokens)
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove noscript, iframe
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  cleaned = cleaned.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Strip cookie consent / privacy / GDPR banners (strict patterns to avoid false positives)
  cleaned = cleaned.replace(/<(?:div|section|aside|dialog|footer|form|article)[^>]*(?:class|id)="[^"]*(?:cookie[-_]?(?:consent|banner|notice|bar|popup|modal|overlay|law|warning|policy)|gdpr[-_]?(?:banner|consent|notice|popup|modal)|privacy[-_]?(?:banner|notice|popup|modal|overlay)|onetrust|cookiebot|cc-(?:banner|window|dialog)|CookieConsent|cookie-law-info|cc_banner)[^"]*"[\s\S]*?<\/(?:div|section|aside|dialog|footer|form|article)>/gi, '');

  // Strip common cookie banner containers by known IDs
  cleaned = cleaned.replace(/<[^>]+(?:id)="(?:onetrust-banner-sdk|cookie-banner|cookie-consent|CybotCookiebotDialog|gdpr-consent|cc-main|sp_message_container|cookieNotice|privacy-popup|__next-cookie)"[\s\S]*?<\/(?:div|section|aside|dialog)>/gi, '');

  // Strip chat widgets (Intercom, Crisp, Drift, Zendesk, Tidio, HubSpot)
  cleaned = cleaned.replace(/<(?:div|iframe|section)[^>]*(?:class|id)="[^"]*(?:intercom|crisp|drift|zEWidget|tidio|hubspot-messages|helpscout|freshchat|LiveChat|tawk-)[^"]*"[\s\S]*?<\/(?:div|iframe|section)>/gi, '');

  // Strip tracking pixels (1x1 images)
  cleaned = cleaned.replace(/<img[^>]*(?:width=["']?1["']?\s|height=["']?1["']?\s|style="[^"]*display:\s*none)[^>]*\/?>/gi, '');

  // Strip hidden elements (display:none, visibility:hidden, aria-hidden)
  cleaned = cleaned.replace(/<[^>]+style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '');
  cleaned = cleaned.replace(/<[^>]+aria-hidden="true"[^>]*>[\s\S]*?<\/[^>]+>/gi, '');

  // Strip <link rel="preload|prefetch|dns-prefetch|preconnect"> (noise for cloning)
  cleaned = cleaned.replace(/<link[^>]*rel="(?:preload|prefetch|dns-prefetch|modulepreload)"[^>]*\/?>/gi, '');

  // Collapse SVGs: keep small icons as [icon], remove large decorative SVGs entirely
  // Use a greedy approach to handle nested SVGs correctly
  cleaned = cleaned.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, (match) => {
    // Check for nested SVGs and handle the outermost one
    const nestedCount = (match.match(/<svg\b/gi) || []).length;
    if (nestedCount > 1) {
      // For nested SVGs, find the correct closing tag
      return match.length < 500 ? '[icon]' : '';
    }
    if (match.length < 500) return '[icon]';  // Small icon SVG
    return '';  // Large decorative SVG — just remove
  });

  // Remove data-* attributes (noise)
  cleaned = cleaned.replace(/\sdata-[\w-]+="[^"]*"/gi, '');

  // Remove loading="lazy", decoding, fetchpriority attributes
  cleaned = cleaned.replace(/\s(?:loading|decoding|fetchpriority)="[^"]*"/gi, '');

  // Trim long class names but keep them (they hint at styles)
  cleaned = cleaned.replace(/\sclass="[^"]*"/gi, (match) => {
    const val = match.replace(/class="/, '').replace(/"$/, '');
    if (val.length > 150) return ` class="${val.slice(0, 150)}"`;
    return match;
  });

  // Collapse excessive whitespace
  cleaned = cleaned.replace(/\s{3,}/g, ' ');
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n');

  return cleaned.trim();
}

// ─── Helper: Extract design tokens from raw HTML (MAXIMUM extraction) ───────

export function extractDesignTokens(html: string): {
  colors: string[];
  colorFrequency: Record<string, number>;
  fonts: string[];
  cssVariables: Record<string, string>;
  gradients: string[];
  shadows: string[];
  borderRadii: string[];
  mediaQueries: string[];
  keyframes: string[];
} {
  const colors = new Set<string>();
  const fonts = new Set<string>();
  const cssVariables: Record<string, string> = {};
  const gradients = new Set<string>();
  const shadows = new Set<string>();
  const borderRadii = new Set<string>();
  const mediaQueries = new Set<string>();
  const keyframes = new Set<string>();

  // Extract CSS-only content (style blocks + inline styles) to avoid false matches in JS/HTML
  const styleBlocks: string[] = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let sm;
  while ((sm = styleRegex.exec(html)) !== null) {
    styleBlocks.push(sm[1]);
  }
  // Also grab inline style attributes
  const inlineStyles: string[] = [];
  const inlineRegex = /style="([^"]+)"/gi;
  while ((sm = inlineRegex.exec(html)) !== null) {
    inlineStyles.push(sm[1]);
  }
  const cssContent = styleBlocks.join('\n') + '\n' + inlineStyles.join('\n');

  // Extract hex colors — only from CSS context (not from JS hex literals like 0x1a2b3c)
  const colorFrequency = new Map<string, number>();
  const hexMatches = cssContent.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g);
  if (hexMatches) hexMatches.forEach(c => {
    const lc = c.toLowerCase();
    colors.add(lc);
    colorFrequency.set(lc, (colorFrequency.get(lc) || 0) + 1);
  });

  // Extract rgb/rgba/hsl/hsla/oklch
  const colorFuncMatches = cssContent.match(/(?:rgb|rgba|hsl|hsla|oklch)\([^)]+\)/gi);
  if (colorFuncMatches) colorFuncMatches.slice(0, 40).forEach(c => {
    colors.add(c);
    colorFrequency.set(c, (colorFrequency.get(c) || 0) + 1);
  });

  // Extract named colors from CSS (common ones)
  const namedColorPattern = /(?:color|background|border-color|fill|stroke):\s*(white|black|transparent|currentColor|inherit)\b/gi;
  const namedMatches = cssContent.match(namedColorPattern);
  if (namedMatches) namedMatches.slice(0, 10).forEach(c => {
    const val = c.split(':')[1]?.trim();
    if (val) colors.add(val);
  });

  // Extract font-family declarations
  const fontMatches = cssContent.match(/font-family:\s*([^;}"]+)/gi);
  if (fontMatches) {
    fontMatches.forEach(f => {
      const val = f.replace(/font-family:\s*/i, '').trim();
      fonts.add(val);
    });
  }

  // Extract @import font URLs (these can be in HTML or CSS)
  const fontImportMatches = html.match(/@import\s+url\(["']?([^"')]+)["']?\)/gi);
  if (fontImportMatches) {
    fontImportMatches.forEach(f => fonts.add(f));
  }

  // Also extract Google Fonts <link> tags
  const fontLinkMatches = html.match(/<link[^>]*href="(https:\/\/fonts\.googleapis\.com[^"]+)"[^>]*>/gi);
  if (fontLinkMatches) {
    fontLinkMatches.forEach(l => {
      const href = l.match(/href="([^"]+)"/)?.[1];
      if (href) {
        // Extract font family names from the URL
        const families = href.match(/family=([^&]+)/)?.[1];
        if (families) fonts.add(decodeURIComponent(families.replace(/\+/g, ' ')));
      }
    });
  }

  // Extract CSS custom properties (variables) — only from CSS content
  const varMatches = cssContent.match(/--[\w-]+:\s*[^;}"]+/g);
  if (varMatches) {
    varMatches.slice(0, 80).forEach(v => {
      const [key, ...rest] = v.split(':');
      cssVariables[key.trim()] = rest.join(':').trim();
    });
  }

  // Extract gradients
  const gradientMatches = cssContent.match(/(?:linear|radial|conic)-gradient\([^)]+\)/gi);
  if (gradientMatches) gradientMatches.slice(0, 10).forEach(g => gradients.add(g));

  // Extract box-shadow values
  const shadowMatches = cssContent.match(/box-shadow:\s*([^;}"]+)/gi);
  if (shadowMatches) shadowMatches.slice(0, 10).forEach(s => {
    shadows.add(s.replace(/box-shadow:\s*/i, '').trim());
  });

  // Extract border-radius values
  const radiusMatches = cssContent.match(/border-radius:\s*([^;}"]+)/gi);
  if (radiusMatches) radiusMatches.slice(0, 10).forEach(r => {
    borderRadii.add(r.replace(/border-radius:\s*/i, '').trim());
  });

  // Extract @media queries
  const mediaMatches = cssContent.match(/@media\s*\([^)]+\)/gi);
  if (mediaMatches) mediaMatches.slice(0, 10).forEach(m => mediaQueries.add(m));

  // Extract @keyframes names
  const keyframeMatches = cssContent.match(/@keyframes\s+([\w-]+)/gi);
  if (keyframeMatches) keyframeMatches.slice(0, 10).forEach(k => {
    keyframes.add(k.replace(/@keyframes\s+/i, '').trim());
  });

  return {
    colors: [...colors].sort((a, b) => (colorFrequency.get(b) || 0) - (colorFrequency.get(a) || 0)).slice(0, 50),
    colorFrequency: Object.fromEntries([...colorFrequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)),
    fonts: [...fonts].slice(0, 15),
    cssVariables,
    gradients: [...gradients],
    shadows: [...shadows],
    borderRadii: [...borderRadii],
    mediaQueries: [...mediaQueries],
    keyframes: [...keyframes],
  };
}

// ─── Helper: Extract navigation items from HTML ─────────────────────────────

export function extractNavigation(html: string): Array<{ text: string; href: string }> {
  const navItems: Array<{ text: string; href: string }> = [];

  // Try to find <nav> content first
  const navMatch = html.match(/<nav[\s>][\s\S]*?<\/nav>/gi);
  const navHtml = navMatch ? navMatch.join(' ') : html;

  // Extract links with text
  const linkRegex = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(navHtml)) !== null && navItems.length < 40) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text && text.length < 100 && href && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
      navItems.push({ text, href });
    }
  }

  return navItems;
}

// ─── Helper: Extract ALL images metadata (img, picture, srcset, CSS bg, og) ─

export function extractImages(html: string): Array<{ src: string; alt: string; width?: string; height?: string }> {
  const images: Array<{ src: string; alt: string; width?: string; height?: string }> = [];
  const seen = new Set<string>();
  
  const addImage = (src: string, alt: string, width?: string, height?: string) => {
    if (!src || seen.has(src) || src.startsWith('data:image/gif') || src.startsWith('data:image/svg+xml') || (width === '1' && height === '1')) return;
    if (src.length < 5 || /spacer|pixel|blank|tracking|beacon/i.test(src)) return;
    seen.add(src);
    images.push({ src, alt, width, height });
  };

  // 1. <img> tags (primary source)
  const imgRegex = /<img\s([^>]+)>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null && images.length < 60) {
    const attrs = match[1];
    const src = attrs.match(/src=["']([^"']+)["']/)?.[1] || '';
    const alt = attrs.match(/alt=["']([^"']*?)["']/)?.[1] || '';
    const width = attrs.match(/width=["']?(\d+)/)?.[1];
    const height = attrs.match(/height=["']?(\d+)/)?.[1];
    addImage(src, alt, width, height);
    // Also capture srcset (highest-res image) 
    const srcset = attrs.match(/srcset=["']([^"']+)["']/)?.[1];
    if (srcset) {
      const srcsetParts = srcset.split(',').map(s => s.trim().split(/\s+/));
      const bestSrc = srcsetParts.sort((a, b) => {
        const aw = parseInt(a[1]) || 0;
        const bw = parseInt(b[1]) || 0;
        return bw - aw;
      })[0]?.[0];
      if (bestSrc) addImage(bestSrc, alt + ' (high-res)', width, height);
    }
  }

  // 2. <picture> / <source> tags (modern responsive images)
  const sourceRegex = /<source\s([^>]+)>/gi;
  while ((match = sourceRegex.exec(html)) !== null && images.length < 60) {
    const attrs = match[1];
    const srcset = attrs.match(/srcset=["']([^"']+)["']/)?.[1];
    if (srcset) {
      const bestSrc = srcset.split(',')[0]?.trim().split(/\s+/)[0];
      if (bestSrc && /\.(jpg|jpeg|png|webp|avif|gif|svg)/i.test(bestSrc)) {
        addImage(bestSrc, 'picture source');
      }
    }
  }

  // 3. CSS background-image URLs from inline styles
  const bgRegex = /background(?:-image)?\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((match = bgRegex.exec(html)) !== null && images.length < 60) {
    addImage(match[1], 'background image');
  }

  // 4. og:image, twitter:image meta tags (hero/social images)
  const metaImageRegex = /<meta[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/gi;
  while ((match = metaImageRegex.exec(html)) !== null) {
    addImage(match[1], 'Open Graph / social image');
  }

  // 5. Favicon and apple-touch-icon
  const iconRegex = /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/gi;
  while ((match = iconRegex.exec(html)) !== null) {
    addImage(match[1], 'favicon/icon');
  }

  return images;
}

// ─── Helper: Extract video sources ──────────────────────────────────────────

export function extractVideos(html: string): Array<{ src: string; poster?: string; type?: string }> {
  const videos: Array<{ src: string; poster?: string; type?: string }> = [];
  const seen = new Set<string>();

  // <video> tags with src or poster
  const videoRegex = /<video\s([^>]*)>([^]*?)<\/video>/gi;
  let match;
  while ((match = videoRegex.exec(html)) !== null && videos.length < 15) {
    const attrs = match[1];
    const inner = match[2];
    const poster = attrs.match(/poster=["']([^"']+)["']/)?.[1];
    const src = attrs.match(/src=["']([^"']+)["']/)?.[1];
    if (src && !seen.has(src)) {
      seen.add(src);
      videos.push({ src, poster });
    }
    // <source> inside <video>
    const srcRegex = /<source\s[^>]*src=["']([^"']+)["'][^>]*/gi;
    let srcMatch;
    while ((srcMatch = srcRegex.exec(inner)) !== null) {
      const vsrc = srcMatch[1];
      const vtype = srcMatch[0].match(/type=["']([^"']+)["']/)?.[1];
      if (vsrc && !seen.has(vsrc)) {
        seen.add(vsrc);
        videos.push({ src: vsrc, poster, type: vtype });
      }
    }
  }

  // Standalone <source> with video MIME types
  const standaloneSource = /<source\s[^>]*src=["']([^"']+)["'][^>]*type=["']video\/([^"']+)["']/gi;
  while ((match = standaloneSource.exec(html)) !== null && videos.length < 15) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      videos.push({ src: match[1], type: `video/${match[2]}` });
    }
  }

  // Lazy-loaded videos with data-src
  const lazyVideoRegex = /<video\s[^>]*data-src=["']([^"']+)["'][^>]*/gi;
  while ((match = lazyVideoRegex.exec(html)) !== null && videos.length < 15) {
    const vsrc = match[1];
    const poster = match[0].match(/poster=["']([^"']+)["']/)?.[1];
    if (vsrc && !seen.has(vsrc)) {
      seen.add(vsrc);
      videos.push({ src: vsrc, poster });
    }
  }

  return videos;
}

// ─── Helper: Extract <style> and inline CSS blocks ──────────────────────────

export function extractStyleBlocks(html: string): string {
  const blocks: string[] = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(html)) !== null && blocks.length < 10) {
    blocks.push(match[1].trim());
  }
  return blocks.join('\n').slice(0, 25000);
}

// ─── Helper: Extract structured content map from HTML ───────────────────────
// Parses the page into labeled sections with text content for the AI

export interface StructuredSection {
  tag: string;       // 'header' | 'nav' | 'hero' | 'section' | 'footer' | etc.
  heading?: string;  // First heading text in section
  headingLevel?: number;
  texts: string[];   // All visible text blocks
  buttons: string[]; // Button/CTA text
  links: string[];   // Link text
  images: number;    // Count of images in this section
}

export function extractStructuredContent(html: string): {
  title: string;
  metaDescription: string;
  headings: Array<{ level: number; text: string }>;
  sections: StructuredSection[];
  allButtonTexts: string[];
  totalTextLength: number;
} {
  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const metaDescription = metaMatch ? metaMatch[1].trim() : '';

  // Extract ALL headings with levels
  const headings: Array<{ level: number; text: string }> = [];
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hMatch;
  while ((hMatch = headingRegex.exec(html)) !== null && headings.length < 80) {
    const text = hMatch[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text.length > 1 && text.length < 300) {
      headings.push({ level: parseInt(hMatch[1]), text });
    }
  }

  // Extract ALL button texts
  const allButtonTexts: string[] = [];
  const btnRegex = /<(?:button|a)[^>]*(?:class="[^"]*(?:btn|button|cta)[^"]*"|role="button")[^>]*>([\s\S]*?)<\/(?:button|a)>/gi;
  let bMatch;
  while ((bMatch = btnRegex.exec(html)) !== null && allButtonTexts.length < 50) {
    const text = bMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text.length > 1 && text.length < 100) allButtonTexts.push(text);
  }
  // Also get plain <button> tags
  const plainBtnRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
  while ((bMatch = plainBtnRegex.exec(html)) !== null && allButtonTexts.length < 50) {
    const text = bMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text.length > 1 && text.length < 100 && !allButtonTexts.includes(text)) allButtonTexts.push(text);
  }

  // Parse into structural sections
  const sections: StructuredSection[] = [];

  // Helper: extract section info
  const parseSection = (tag: string, content: string) => {
    const texts: string[] = [];
    const buttons: string[] = [];
    const links: string[] = [];

    // Get paragraph/div text
    const pRegex = /<(?:p|span|li|td|th|dd|dt|blockquote|figcaption)[^>]*>([\s\S]*?)<\/(?:p|span|li|td|th|dd|dt|blockquote|figcaption)>/gi;
    let pMatch;
    while ((pMatch = pRegex.exec(content)) !== null && texts.length < 40) {
      const t = pMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (t.length > 3 && t.length < 500) texts.push(t);
    }

    // Get button text
    const btnR = /<(?:button|a[^>]*(?:btn|button|cta))[^>]*>([\s\S]*?)<\/(?:button|a)>/gi;
    let bm;
    while ((bm = btnR.exec(content)) !== null && buttons.length < 10) {
      const t = bm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (t.length > 1 && t.length < 100) buttons.push(t);
    }

    // Get link text
    const linkR = /<a[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkR.exec(content)) !== null && links.length < 30) {
      const t = lm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (t.length > 1 && t.length < 100) links.push(t);
    }

    // Count images
    const imgCount = (content.match(/<img\s/gi) || []).length;

    // First heading
    const hm = content.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/i);
    const heading = hm ? hm[2].replace(/<[^>]+>/g, '').trim() : undefined;
    const headingLevel = hm ? parseInt(hm[1]) : undefined;

    sections.push({ tag, heading, headingLevel, texts, buttons, links, images: imgCount });
  };

  // Extract <header>
  const headerMatch = html.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
  if (headerMatch) parseSection('header', headerMatch[1]);

  // Extract <nav> (if not inside header)
  if (!headerMatch) {
    const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
    if (navMatch) parseSection('nav', navMatch[1]);
  }

  // Extract <main> or <body> content, then split by <section>
  let mainContent = html;
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) mainContent = mainMatch[1];
  else {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) mainContent = bodyMatch[1];
  }

  // Split by <section> tags
  const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi;
  let sMatch;
  let sectionIdx = 0;
  while ((sMatch = sectionRegex.exec(mainContent)) !== null && sectionIdx < 40) {
    // Detect section purpose from class/id or heading
    const sectionContent = sMatch[1];
    const hm = sectionContent.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/i);
    const heading = hm ? hm[2].replace(/<[^>]+>/g, '').trim() : '';

    // Infer purpose from attributes or content
    const fullTag = sMatch[0].slice(0, 200).toLowerCase();
    let purpose = 'section';
    if (sectionIdx === 0 && !headerMatch) purpose = 'hero';
    else if (/hero|banner|jumbotron|splash/i.test(fullTag)) purpose = 'hero';
    else if (/feature|benefit|service/i.test(fullTag) || /feature|benefit|service/i.test(heading)) purpose = 'features';
    else if (/pricing|plan|tier/i.test(fullTag) || /pricing|plan/i.test(heading)) purpose = 'pricing';
    else if (/testimonial|review|quote/i.test(fullTag) || /testimonial|review|what.*say/i.test(heading)) purpose = 'testimonials';
    else if (/faq|question/i.test(fullTag) || /faq|question/i.test(heading)) purpose = 'faq';
    else if (/cta|call.to.action|get.start|sign.up/i.test(fullTag)) purpose = 'cta';
    else if (/stat|metric|number/i.test(fullTag) || /\d+[+MKB]/.test(heading)) purpose = 'stats';
    else if (/partner|logo|trust|client|company/i.test(fullTag) || /partner|trust|client/i.test(heading)) purpose = 'logos';
    else if (/integrat|ecosystem|api/i.test(fullTag)) purpose = 'integrations';

    parseSection(purpose, sectionContent);
    sectionIdx++;
  }

  // If no <section> tags found, try <div> with meaningful roles/classes
  if (sectionIdx === 0) {
    const divRegex = /<div[^>]*(?:class|id|role)="[^"]*(?:hero|feature|pricing|testimonial|footer|cta|about|contact|faq|banner|showcase)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let dMatch;
    while ((dMatch = divRegex.exec(mainContent)) !== null && sections.length < 25) {
      const tag = dMatch[0].match(/(?:class|id|role)="[^"]*?(hero|feature|pricing|testimonial|cta|about|contact|faq|banner|showcase)/i)?.[1] || 'section';
      parseSection(tag.toLowerCase(), dMatch[1]);
    }
  }

  // Extract <footer>
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerMatch) parseSection('footer', footerMatch[1]);

  // Calculate total text length
  const totalTextLength = sections.reduce((sum, s) => sum + s.texts.join(' ').length, 0);

  return { title, metaDescription, headings, sections, allButtonTexts, totalTextLength };
}

// ─── Helper: Extract <link> stylesheet and font URLs ────────────────────────

export function extractLinkedResources(html: string): { stylesheets: string[]; fonts: string[] } {
  const stylesheets: string[] = [];
  const fonts: string[] = [];

  const linkRegex = /<link\s[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0];
    const href = match[1];
    if (tag.includes('stylesheet') || href.endsWith('.css')) {
      stylesheets.push(href);
    }
    if (href.includes('fonts.googleapis.com') || href.includes('fonts.gstatic.com') || href.includes('typekit')) {
      fonts.push(href);
    }
  }

  return { stylesheets: stylesheets.slice(0, 10), fonts: fonts.slice(0, 5) };
}

// ─── Helper: Extract key CSS patterns from style blocks ─────────────────────
// Strips selectors (no obfuscated class names), keeps property-value pairs
// Gives the AI layout/visual/typography patterns it needs to match the design

export function extractKeyCSS(styleContent: string): string {
  if (!styleContent || styleContent.length < 50) return '';

  const propValues = new Map<string, Set<string>>();

  // ─── NEW: Extract selector→property pairs for semantic classes ───
  const semanticRules: string[] = [];
  const semanticSelectors = /\.(hero|nav|navbar|header|footer|card|btn|button|cta|feature|pricing|testimonial|about|contact|section|container|wrapper|sidebar|banner|modal|dropdown|accordion|tab|form|input|badge|avatar|logo|menu|social|stat|faq|gallery|slider|carousel)[a-z-]*\s*\{([^}]+)\}/gi;
  let sm;
  while ((sm = semanticSelectors.exec(styleContent)) !== null && semanticRules.length < 30) {
    const selector = '.' + sm[1];
    const decls = sm[2].split(';').map(d => d.trim()).filter(d => {
      if (!d || !d.includes(':')) return false;
      const prop = d.split(':')[0].trim();
      return !/^(content|cursor|pointer-events|user-select|visibility|appearance|will-change|-webkit-|-moz-|-ms-)/.test(prop);
    }).slice(0, 8);
    if (decls.length > 0) {
      semanticRules.push(`${selector} { ${decls.join('; ')} }`);
    }
  }

  const ruleRegex = /\{([^}]+)\}/g;
  let m;
  while ((m = ruleRegex.exec(styleContent)) !== null) {
    const decls = m[1].split(';');
    for (const decl of decls) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim().toLowerCase();
      const val = decl.slice(colonIdx + 1).trim();
      if (!prop || !val || val.length > 200) continue;
      if (/^(content|cursor|pointer-events|user-select|visibility|appearance|will-change|touch-action|outline|list-style|-webkit-|-moz-|-ms-)/.test(prop)) continue;
      if (/^(inherit|initial|unset|revert|none|normal|auto|0|0px)$/.test(val)) continue;
      if (!propValues.has(prop)) propValues.set(prop, new Set());
      propValues.get(prop)!.add(val);
    }
  }

  const categories: Record<string, string[]> = {
    'Layout': ['display', 'grid-template-columns', 'grid-template-rows', 'grid-area', 'gap', 'row-gap', 'column-gap', 'flex-direction', 'flex-wrap', 'justify-content', 'justify-items', 'align-items', 'align-content', 'place-items', 'place-content'],
    'Sizing': ['width', 'max-width', 'min-width', 'height', 'max-height', 'min-height', 'aspect-ratio', 'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'margin', 'margin-top', 'margin-bottom'],
    'Position': ['position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index', 'overflow'],
    'Visual': ['background', 'background-color', 'background-image', 'border', 'border-color', 'border-radius', 'box-shadow', 'opacity', 'backdrop-filter', 'filter', 'transform'],
    'Typography': ['font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'color'],
    'Animation': ['transition', 'animation'],
  };

  const lines: string[] = [];
  for (const [category, props] of Object.entries(categories)) {
    const entries: string[] = [];
    for (const prop of props) {
      const vals = propValues.get(prop);
      if (vals && vals.size > 0) {
        entries.push(`${prop}: ${[...vals].slice(0, 6).join(' | ')}`);
      }
    }
    if (entries.length > 0) {
      lines.push(`${category}: ${entries.join('; ')}`);
    }
  }

  // Append semantic component rules
  if (semanticRules.length > 0) {
    lines.push('\nComponent Styles:\n' + semanticRules.join('\n'));
  }

  return lines.join('\n');
}

// ─── Helper: Extract SPA hydration data ─────────────────────────────────────
// Extracts text content from __NEXT_DATA__, __NUXT__, JSON-LD, and other
// JavaScript-embedded data that contains the actual page content for SPAs

export function extractSPAData(html: string): string[] {
  const texts: string[] = [];

  // Helper: recursively collect text-like strings from JSON structures
  const collectTexts = (obj: unknown, depth: number): void => {
    if (depth > 6 || !obj || texts.length > 200) return;
    if (typeof obj === 'string') {
      const t = obj.trim();
      // Keep text-like content: has word chars, reasonable length, not a URL/path/code
      if (t.length >= 8 && t.length < 1000
          && /[a-zA-Z]{2,}/.test(t)
          && !/^https?:|^\/[a-z\/]|^[a-f0-9]{24,}|^data:|function\s*\(|module\.exports|__webpack|node_modules|\.js$|\.css$|\.svg$|\.png$|\.jpg$|\.woff/.test(t)
      ) {
        texts.push(t);
      }
      return;
    }
    if (Array.isArray(obj)) {
      for (const item of (obj as unknown[]).slice(0, 100)) collectTexts(item, depth + 1);
      return;
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const val of Object.values(obj as Record<string, unknown>).slice(0, 100)) {
        collectTexts(val, depth + 1);
      }
    }
  };

  // __NEXT_DATA__ — Next.js SSR payload (contains all pre-rendered page data)
  const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      // Focus on pageProps which contains the actual page content
      if (data?.props?.pageProps) {
        collectTexts(data.props.pageProps, 0);
      } else {
        collectTexts(data, 0);
      }
    } catch { /* malformed JSON */ }
  }

  // __NUXT__ / __NUXT_DATA__ — Nuxt.js payload
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i);
  if (nuxtMatch) {
    try {
      collectTexts(JSON.parse(nuxtMatch[1]), 0);
    } catch { /* malformed JSON */ }
  }

  // JSON-LD structured data — describes the page in detail
  const jsonLdRegex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch;
  let ldCount = 0;
  while ((ldMatch = jsonLdRegex.exec(html)) !== null && ldCount < 5) {
    try {
      collectTexts(JSON.parse(ldMatch[1]), 0);
      ldCount++;
    } catch { /* malformed JSON */ }
  }

  // Deduplicate and return
  return [...new Set(texts)].slice(0, 150);
}

// ─── Helper: Extract internal links from HTML ───────────────────────────────

export function extractInternalLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const origin = new URL(baseUrl).origin;

  const hrefMatches = html.match(/href=["']([^"'#]+)["']/gi);
  if (hrefMatches) {
    for (const match of hrefMatches) {
      const href = match.replace(/href=["']/i, '').replace(/["']$/, '');
      if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      try {
        const resolved = new URL(href, baseUrl);
        if (resolved.origin === origin && resolved.pathname !== new URL(baseUrl).pathname) {
          links.add(resolved.pathname);
        }
      } catch { /* skip invalid */ }
    }
  }
  return [...links].slice(0, 20);
}

// ─── Helper: Detect CSS framework used by the site ──────────────────────────

export function detectCSSFramework(html: string): string | null {
  const classes = (html.match(/class="[^"]*"/gi) || []).join(' ');
  if (/\b(flex-col|justify-between|items-center|bg-|text-|rounded-|px-|py-|mx-|my-|gap-|grid-cols-|w-\d|h-\d|space-[xy]-)\b/.test(classes)) return 'Tailwind CSS';
  if (/\b(col-md-|col-lg-|col-sm-|container-fluid|row|navbar-expand|btn-primary|d-flex|justify-content-|align-items-)\b/.test(classes)) return 'Bootstrap';
  if (/\b(column is-|columns|is-primary|is-link|is-info|hero-body|section|container)\b/.test(classes) && /bulma/i.test(html)) return 'Bulma';
  if (/\b(chakra-|css-[a-z0-9]+)\b/.test(classes) && /chakra/i.test(html)) return 'Chakra UI';
  if (/\b(MuiButton|MuiPaper|MuiTypography|MuiGrid|MuiContainer)\b/.test(classes)) return 'Material UI';
  if (/\b(ant-btn|ant-card|ant-layout|ant-col|ant-row)\b/.test(classes)) return 'Ant Design';
  return null;
}

// ─── Helper: Detect icon library used by the site ───────────────────────────

export function detectIconLibrary(html: string): string[] {
  const libs: string[] = [];
  if (/fa-|fa\s|fas\s|far\s|fab\s|font-awesome|fontawesome/i.test(html)) libs.push('Font Awesome');
  if (/lucide|lucide-react/i.test(html)) libs.push('Lucide');
  if (/heroicons|HeroIcon/i.test(html)) libs.push('Heroicons');
  if (/material-icons|material-symbols/i.test(html)) libs.push('Material Icons');
  if (/feather-|data-feather/i.test(html)) libs.push('Feather Icons');
  if (/phosphor|ph-/i.test(html)) libs.push('Phosphor Icons');
  if (/tabler-icon|icon-tabler/i.test(html)) libs.push('Tabler Icons');
  if (/ri-|remixicon/i.test(html)) libs.push('Remix Icons');
  if (/ionicon/i.test(html)) libs.push('Ionicons');
  return libs;
}

// ─── Helper: Detect animation libraries used by the site ────────────────────

export function detectAnimationLibraries(html: string): string[] {
  const libs: string[] = [];
  if (/gsap|ScrollTrigger|greensock/i.test(html)) libs.push('GSAP ScrollTrigger');
  if (/data-aos=|aos\.css|aos\.js/i.test(html)) libs.push('AOS (Animate on Scroll)');
  if (/scrollreveal/i.test(html)) libs.push('ScrollReveal');
  if (/framer-motion|motion\.div|AnimatePresence/i.test(html)) libs.push('Framer Motion');
  if (/lottie|bodymovin/i.test(html)) libs.push('Lottie');
  if (/anime\.js|animejs/i.test(html)) libs.push('Anime.js');
  if (/locomotive-scroll/i.test(html)) libs.push('Locomotive Scroll');
  if (/lenis/i.test(html)) libs.push('Lenis Smooth Scroll');
  if (/three\.js|three\.min|THREE\./i.test(html)) libs.push('Three.js');
  if (/barba\.js|barba/i.test(html)) libs.push('Barba.js (page transitions)');
  if (/swiper/i.test(html)) libs.push('Swiper');
  if (/typed\.js/i.test(html)) libs.push('Typed.js');
  if (/splitting\.js|splitting/i.test(html)) libs.push('Splitting.js (text split)');
  // Detect AOS data attributes specifically
  const aosAttrs = html.match(/data-aos="([^"]+)"/gi);
  if (aosAttrs && aosAttrs.length > 0) {
    const effects = [...new Set(aosAttrs.map(a => a.match(/data-aos="([^"]+)"/i)?.[1]).filter(Boolean))];
    libs.push(`AOS effects used: ${effects.slice(0, 8).join(', ')}`);
  }
  return libs;
}

// ─── Helper: Fetch external CSS files ───────────────────────────────────────

export async function fetchExternalCSS(html: string, baseUrl: string): Promise<string> {
  const cssUrls: string[] = [];
  const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null && cssUrls.length < 8) {
    const href = match[1];
    // Skip CDN libs (normalize, reset, font-awesome, etc.)
    if (/normalize|reset|font-awesome|fontawesome|bootstrap\.min|tailwind|cdnjs|unpkg|jsdelivr/i.test(href)) continue;
    try {
      const resolved = new URL(href, baseUrl).href;
      cssUrls.push(resolved);
    } catch { /* skip invalid */ }
  }

  if (cssUrls.length === 0) return '';

  const results = await Promise.allSettled(
    cssUrls.map(url =>
      fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(5000),
      }).then(r => r.ok ? r.text() : '')
    )
  );

  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value.length > 0)
    .map(r => r.value)
    .join('\n')
    .slice(0, 50000);
}
