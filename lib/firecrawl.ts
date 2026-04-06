/**
 * Firecrawl v2 SDK Integration
 * Source: https://github.com/firecrawl/firecrawl
 * 
 * Full integration with Firecrawl's Web Data API for AI.
 * Supports: scrape, map, screenshot, branding, rawHtml, markdown formats
 * API docs: https://docs.firecrawl.dev/api-reference/introduction
 */

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Firecrawl Client Class â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
   * Full-page scrape with scroll capture â€” takes multiple screenshots
   * at different scroll positions to capture below-the-fold content.
   * Uses Firecrawl actions: wait â†’ screenshot â†’ scroll â†’ screenshot â†’ ...
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

// â”€â”€â”€ Helper: Clean HTML for LLM consumption â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    return '';  // Large decorative SVG â€” just remove
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

// â”€â”€â”€ Helper: Extract design tokens from raw HTML (MAXIMUM extraction) â”€â”€â”€â”€â”€â”€â”€

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

  // Extract hex colors â€” only from CSS context (not from JS hex literals like 0x1a2b3c)
  const colorFrequency = new Map<string, number>();
  const hexMatches = cssContent.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g);
  if (hexMatches) hexMatches.forEach(c => {
    const lc = c.toLowerCase();
    colors.add(lc);
    colorFrequency.set(lc, (colorFrequency.get(lc) || 0) + 1);
  });

  // Extract rgb/rgba/hsl/hsla/oklch
  const colorFuncMatches = cssContent.match(/(?:rgb|rgba|hsl|hsla|oklch)\([^)]+\)/gi);
  if (colorFuncMatches) colorFuncMatches.slice(0, 80).forEach(c => {
    colors.add(c);
    colorFrequency.set(c, (colorFrequency.get(c) || 0) + 1);
  });

  // Extract named colors from CSS (common ones)
  const namedColorPattern = /(?:color|background|border-color|fill|stroke):\s*(white|black|transparent|currentColor|inherit)\b/gi;
  const namedMatches = cssContent.match(namedColorPattern);
  if (namedMatches) namedMatches.slice(0, 20).forEach(c => {
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

  // Extract CSS custom properties (variables) â€” only from CSS content
  const varMatches = cssContent.match(/--[\w-]+:\s*[^;}"]+/g);
  if (varMatches) {
    varMatches.slice(0, 160).forEach(v => {
      const [key, ...rest] = v.split(':');
      cssVariables[key.trim()] = rest.join(':').trim();
    });
  }

  // Resolve CSS var chains: --color-bg: var(--gray-900) â†’ resolve to actual value
  for (const [key, value] of Object.entries(cssVariables)) {
    const varRef = value.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/);
    if (varRef) {
      const refKey = varRef[1];
      const fallback = varRef[2]?.trim();
      if (cssVariables[refKey]) {
        cssVariables[key] = cssVariables[refKey];
      } else if (fallback) {
        cssVariables[key] = fallback;
      }
    }
  }

  // Extract colors from resolved CSS variables too
  for (const value of Object.values(cssVariables)) {
    const hexInVar = value.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/);
    if (hexInVar) {
      const lc = hexInVar[0].toLowerCase();
      colors.add(lc);
      colorFrequency.set(lc, (colorFrequency.get(lc) || 0) + 1);
    }
    const funcInVar = value.match(/(?:rgb|rgba|hsl|hsla|oklch)\([^)]+\)/i);
    if (funcInVar) {
      colors.add(funcInVar[0]);
      colorFrequency.set(funcInVar[0], (colorFrequency.get(funcInVar[0]) || 0) + 1);
    }
  }

  // Extract gradients
  const gradientMatches = cssContent.match(/(?:linear|radial|conic)-gradient\([^)]+\)/gi);
  if (gradientMatches) gradientMatches.slice(0, 25).forEach(g => gradients.add(g));

  // Extract box-shadow values
  const shadowMatches = cssContent.match(/box-shadow:\s*([^;}"]+)/gi);
  if (shadowMatches) shadowMatches.slice(0, 25).forEach(s => {
    shadows.add(s.replace(/box-shadow:\s*/i, '').trim());
  });

  // Extract border-radius values
  const radiusMatches = cssContent.match(/border-radius:\s*([^;}"]+)/gi);
  if (radiusMatches) radiusMatches.slice(0, 25).forEach(r => {
    borderRadii.add(r.replace(/border-radius:\s*/i, '').trim());
  });

  // Extract @media queries
  const mediaMatches = cssContent.match(/@media\s*\([^)]+\)/gi);
  if (mediaMatches) mediaMatches.slice(0, 25).forEach(m => mediaQueries.add(m));

  // Extract @keyframes names
  const keyframeMatches = cssContent.match(/@keyframes\s+([\w-]+)/gi);
  if (keyframeMatches) keyframeMatches.slice(0, 25).forEach(k => {
    keyframes.add(k.replace(/@keyframes\s+/i, '').trim());
  });

  return {
    colors: [...colors].sort((a, b) => (colorFrequency.get(b) || 0) - (colorFrequency.get(a) || 0)).slice(0, 100),
    colorFrequency: Object.fromEntries([...colorFrequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60)),
    fonts: [...fonts].slice(0, 30),
    cssVariables,
    gradients: [...gradients],
    shadows: [...shadows],
    borderRadii: [...borderRadii],
    mediaQueries: [...mediaQueries],
    keyframes: [...keyframes],
  };
}

// â”€â”€â”€ Helper: Extract navigation items from HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Helper: Extract ALL images metadata (img, picture, srcset, CSS bg, og) â”€

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

// â”€â”€â”€ Helper: Extract video sources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Helper: Extract <style> and inline CSS blocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function extractStyleBlocks(html: string): string {
  const blocks: string[] = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(html)) !== null && blocks.length < 20) {
    blocks.push(match[1].trim());
  }
  return blocks.join('\n').slice(0, 60000);
}

// â”€â”€â”€ Helper: Extract structured content map from HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    const divRegex = /<div[^>]*(?:class|id|role)="[^"]*(?:hero|feature|pricing|testimonial|footer|cta|about|contact|faq|banner|showcase|services|team|portfolio|gallery|stats|blog|news|partners|clients|benefits)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let dMatch;
    while ((dMatch = divRegex.exec(mainContent)) !== null && sections.length < 25) {
      const tag = dMatch[0].match(/(?:class|id|role)="[^"]*?(hero|feature|pricing|testimonial|cta|about|contact|faq|banner|showcase|services|team|portfolio|gallery|stats|blog|news|partners|clients|benefits)/i)?.[1] || 'section';
      parseSection(tag.toLowerCase(), dMatch[1]);
    }

    // Still nothing? Find large divs with headings (generic sections)
    if (sections.length < 3) {
      const genericDivRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
      let gdMatch;
      while ((gdMatch = genericDivRegex.exec(mainContent)) !== null && sections.length < 20) {
        const content = gdMatch[1];
        // Only keep divs that have at least a heading AND some text (i.e., real content sections)
        const hasHeading = /<h[1-4][^>]*>/i.test(content);
        const textLen = content.replace(/<[^>]+>/g, '').trim().length;
        if (hasHeading && textLen > 100) {
          parseSection('section', content);
        }
      }
    }
  }

  // Extract <footer>
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerMatch) parseSection('footer', footerMatch[1]);

  // Calculate total text length
  const totalTextLength = sections.reduce((sum, s) => sum + s.texts.join(' ').length, 0);

  return { title, metaDescription, headings, sections, allButtonTexts, totalTextLength };
}

// â”€â”€â”€ Helper: Extract <link> stylesheet and font URLs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  return { stylesheets: stylesheets.slice(0, 20), fonts: fonts.slice(0, 10) };
}

// â”€â”€â”€ Helper: Extract key CSS patterns from style blocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Strips selectors (no obfuscated class names), keeps property-value pairs
// Gives the AI layout/visual/typography patterns it needs to match the design

export function extractKeyCSS(styleContent: string): string {
  if (!styleContent || styleContent.length < 50) return '';

  const propValues = new Map<string, Set<string>>();

  // â”€â”€â”€ NEW: Extract selectorâ†’property pairs for semantic classes â”€â”€â”€
  const semanticRules: string[] = [];
  const semanticSelectors = /\.(hero|nav|navbar|header|footer|card|btn|button|cta|feature|pricing|testimonial|about|contact|section|container|wrapper|sidebar|banner|modal|dropdown|accordion|tab|form|input|badge|avatar|logo|menu|social|stat|faq|gallery|slider|carousel)[a-z-]*\s*\{([^}]+)\}/gi;
  let sm;
  while ((sm = semanticSelectors.exec(styleContent)) !== null && semanticRules.length < 60) {
    const selector = '.' + sm[1];
    const decls = sm[2].split(';').map(d => d.trim()).filter(d => {
      if (!d || !d.includes(':')) return false;
      const prop = d.split(':')[0].trim();
      return !/^(content|cursor|pointer-events|user-select|visibility|appearance|will-change|-webkit-|-moz-|-ms-)/.test(prop);
    }).slice(0, 16);
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
        entries.push(`${prop}: ${[...vals].slice(0, 12).join(' | ')}`);
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

// â”€â”€â”€ Helper: Extract SPA hydration data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // __NEXT_DATA__ â€” Next.js SSR payload (contains all pre-rendered page data)
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

  // __NUXT__ / __NUXT_DATA__ â€” Nuxt.js payload
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/i);
  if (nuxtMatch) {
    try {
      collectTexts(JSON.parse(nuxtMatch[1]), 0);
    } catch { /* malformed JSON */ }
  }

  // JSON-LD structured data â€” describes the page in detail
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
  return [...new Set(texts)].slice(0, 300);
}

// â”€â”€â”€ Helper: Extract internal links from HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  return [...links].slice(0, 40);
}

// â”€â”€â”€ Helper: Detect CSS framework used by the site â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Helper: Detect icon library used by the site â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Helper: Detect animation libraries used by the site â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    libs.push(`AOS effects used: ${effects.slice(0, 16).join(', ')}`);
  }
  return libs;
}

// â”€â”€â”€ Helper: Fetch external CSS files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchExternalCSS(html: string, baseUrl: string): Promise<string> {
  const cssUrls: string[] = [];
  const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null && cssUrls.length < 16) {
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
        signal: AbortSignal.timeout(10000),
      }).then(r => r.ok ? r.text() : '')
    )
  );

  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value.length > 0)
    .map(r => r.value)
    .join('\n')
    .slice(0, 100000);
}

// â”€â”€â”€ Helper: Detect interaction models per section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Identifies whether sections are scroll-driven, click-driven, time-driven etc.
// Inspired by ai-website-cloner-template Phase 1 methodology

export interface InteractionModel {
  section: string;
  model: 'static' | 'scroll-driven' | 'click-driven' | 'time-driven' | 'hover-driven' | 'hybrid';
  triggers: string[];
  details: string;
}

export function extractInteractionModels(html: string, css: string): InteractionModel[] {
  const models: InteractionModel[] = [];
  const combined = html + '\n' + css;

  // Detect scroll-driven patterns
  const scrollPatterns: string[] = [];
  if (/scroll-snap-type/i.test(combined)) scrollPatterns.push('scroll-snap');
  if (/IntersectionObserver/i.test(html)) scrollPatterns.push('IntersectionObserver');
  if (/ScrollTrigger|gsap.*scroll/i.test(html)) scrollPatterns.push('GSAP ScrollTrigger');
  if (/animation-timeline:\s*view\(\)|animation-timeline:\s*scroll\(\)/i.test(combined)) scrollPatterns.push('CSS scroll-driven animation');
  if (/position:\s*sticky/i.test(combined)) scrollPatterns.push('sticky positioning');
  if (/parallax|data-speed|data-rellax/i.test(combined)) scrollPatterns.push('parallax');
  if (/locomotive-scroll|\.lenis|lenis/i.test(combined)) scrollPatterns.push('smooth scroll library');
  if (/data-aos=/i.test(html)) scrollPatterns.push('AOS scroll animations');
  if (/scrollreveal/i.test(html)) scrollPatterns.push('ScrollReveal');
  if (/onscroll|addEventListener.*scroll|window\.scroll/i.test(html)) scrollPatterns.push('JS scroll listener');

  if (scrollPatterns.length > 0) {
    models.push({
      section: 'page-level',
      model: 'scroll-driven',
      triggers: scrollPatterns,
      details: `Page uses scroll-driven interactions: ${scrollPatterns.join(', ')}`,
    });
  }

  // Detect click-driven interactive components
  const clickPatterns: string[] = [];
  if (/role="tablist"|data-tab|tab-content|\.tab-pane/i.test(html)) clickPatterns.push('tabs');
  if (/accordion|data-accordion|collapsible/i.test(html)) clickPatterns.push('accordion');
  if (/modal|dialog|data-modal/i.test(html)) clickPatterns.push('modal/dialog');
  if (/dropdown|data-dropdown|popover/i.test(html)) clickPatterns.push('dropdown');
  if (/carousel|swiper|slick|data-slide/i.test(html)) clickPatterns.push('carousel/slider');

  if (clickPatterns.length > 0) {
    models.push({
      section: 'interactive-components',
      model: 'click-driven',
      triggers: clickPatterns,
      details: `Click-driven components detected: ${clickPatterns.join(', ')}`,
    });
  }

  // Detect time-driven animations
  const timePatterns: string[] = [];
  if (/setInterval|setTimeout.*animate/i.test(html)) timePatterns.push('JS timer animation');
  if (/animation:\s*[^;]*\binfinite\b/i.test(combined)) timePatterns.push('infinite CSS animation');
  if (/autoplay|data-autoplay/i.test(html)) timePatterns.push('autoplay carousel/video');
  if (/typed\.js|typewriter/i.test(html)) timePatterns.push('typewriter effect');
  if (/marquee|animation:.*scroll.*linear.*infinite/i.test(combined)) timePatterns.push('marquee/ticker');

  if (timePatterns.length > 0) {
    models.push({
      section: 'auto-animated',
      model: 'time-driven',
      triggers: timePatterns,
      details: `Time-driven animations: ${timePatterns.join(', ')}`,
    });
  }

  // Detect hover-driven patterns
  const hoverPatterns: string[] = [];
  const hoverCount = (css.match(/:hover\s*\{/gi) || []).length;
  if (hoverCount > 5) hoverPatterns.push(`${hoverCount} hover rules in CSS`);
  if (/transform.*scale|:hover.*scale|hover.*transform/i.test(combined)) hoverPatterns.push('scale on hover');
  if (/mousemove|mouseenter|mouseleave/i.test(html)) hoverPatterns.push('JS mouse tracking');
  if (/tilt|magnetic|perspective.*rotate/i.test(combined)) hoverPatterns.push('3D tilt/magnetic effect');

  if (hoverPatterns.length > 0) {
    models.push({
      section: 'hover-effects',
      model: 'hover-driven',
      triggers: hoverPatterns,
      details: `Hover interactions: ${hoverPatterns.join(', ')}`,
    });
  }

  return models;
}

// â”€â”€â”€ Helper: Detect layered/stacked assets per container â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Identifies sections where multiple images/backgrounds are layered (common in premium sites)

export interface LayeredAsset {
  container: string;
  layers: Array<{ type: 'img' | 'background' | 'video' | 'svg' | 'overlay'; src: string; position?: string; zIndex?: string }>;
}

export function extractLayeredAssets(html: string): LayeredAsset[] {
  const layered: LayeredAsset[] = [];

  // Find containers that have multiple images/backgrounds
  // Look for sections/divs with positioned children + multiple images
  const sectionRegex = /<(?:section|div|figure|article)[^>]*(?:class|id)="([^"]*(?:hero|banner|showcase|feature|card|slide|cover|background|overlay|parallax)[^"]*)"[^>]*>([\s\S]*?)<\/(?:section|div|figure|article)>/gi;
  let match;
  while ((match = sectionRegex.exec(html)) !== null && layered.length < 20) {
    const containerClass = match[1];
    const inner = match[2];

    const layers: LayeredAsset['layers'] = [];

    // Count images inside
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(inner)) !== null) {
      const styleAttr = imgMatch[0].match(/style="([^"]*)"/)?.[1] || '';
      layers.push({
        type: 'img',
        src: imgMatch[1],
        position: /absolute|fixed/i.test(styleAttr) ? 'absolute' : 'static',
      });
    }

    // Check for background images in inline styles
    const bgRegex = /background(?:-image)?\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/gi;
    let bgMatch;
    while ((bgMatch = bgRegex.exec(inner)) !== null) {
      layers.push({ type: 'background', src: bgMatch[1] });
    }

    // Check for videos
    if (/<video\b/i.test(inner)) {
      const videoSrc = inner.match(/<video[^>]*src=["']([^"']+)["']/i)?.[1] ||
                       inner.match(/<source[^>]*src=["']([^"']+)["']/i)?.[1];
      if (videoSrc) layers.push({ type: 'video', src: videoSrc });
    }

    // Check for SVG overlays
    const svgCount = (inner.match(/<svg\b/gi) || []).length;
    if (svgCount > 0) layers.push({ type: 'svg', src: `${svgCount} inline SVGs` });

    // Only report sections with multiple layers (the interesting ones)
    if (layers.length >= 2) {
      layered.push({ container: containerClass.slice(0, 160), layers });
    }
  }

  return layered;
}

// â”€â”€â”€ Helper: Detect multi-state content (tabs, accordions, carousels) â”€â”€â”€â”€â”€â”€â”€

export interface MultiStateContent {
  type: 'tabs' | 'accordion' | 'carousel' | 'toggle' | 'dropdown';
  containerHint: string;
  stateCount: number;
  stateLabels: string[];
  defaultState?: string;
}

export function extractMultiStateContent(html: string): MultiStateContent[] {
  const states: MultiStateContent[] = [];

  // Detect tab interfaces
  const tabListRegex = /<(?:div|nav|ul)[^>]*(?:role="tablist"|class="[^"]*tab[^"]*")[^>]*>([\s\S]*?)<\/(?:div|nav|ul)>/gi;
  let match;
  while ((match = tabListRegex.exec(html)) !== null && states.length < 20) {
    const inner = match[1];
    const labels: string[] = [];
    const btnRegex = /<(?:button|a|li)[^>]*>([\s\S]*?)<\/(?:button|a|li)>/gi;
    let btnMatch;
    while ((btnMatch = btnRegex.exec(inner)) !== null && labels.length < 24) {
      const text = btnMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text.length > 0 && text.length < 50) labels.push(text);
    }
    if (labels.length >= 2) {
      const activeMatch = match[0].match(/(?:active|selected|aria-selected="true")[^>]*>([\s\S]*?)</i);
      states.push({
        type: 'tabs',
        containerHint: match[0].slice(0, 100).replace(/</, '').replace(/>.*/, ''),
        stateCount: labels.length,
        stateLabels: labels,
        defaultState: activeMatch ? activeMatch[1].replace(/<[^>]+>/g, '').trim() : labels[0],
      });
    }
  }

  // Detect accordions
  const accordionRegex = /<(?:div|section)[^>]*(?:class="[^"]*accordion[^"]*"|data-accordion)[^>]*>([\s\S]*?)<\/(?:div|section)>/gi;
  while ((match = accordionRegex.exec(html)) !== null && states.length < 30) {
    const inner = match[1];
    const labels: string[] = [];
    const triggerRegex = /<(?:button|summary|h[2-6])[^>]*>([\s\S]*?)<\/(?:button|summary|h[2-6])>/gi;
    let trigMatch;
    while ((trigMatch = triggerRegex.exec(inner)) !== null && labels.length < 40) {
      const text = trigMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text.length > 2 && text.length < 200) labels.push(text);
    }
    if (labels.length >= 2) {
      states.push({
        type: 'accordion',
        containerHint: 'accordion',
        stateCount: labels.length,
        stateLabels: labels,
      });
    }
  }

  // Detect carousels/sliders
  const carouselRegex = /<(?:div|section)[^>]*class="[^"]*(?:carousel|swiper|slider|slick|glide|splide)[^"]*"[^>]*>/gi;
  while ((match = carouselRegex.exec(html)) !== null && states.length < 40) {
    // Count slides
    const afterMatch = html.slice(match.index, match.index + 5000);
    const slideCount = (afterMatch.match(/(?:swiper-slide|carousel-item|slide|splide__slide)/gi) || []).length;
    if (slideCount >= 2) {
      states.push({
        type: 'carousel',
        containerHint: match[0].match(/class="([^"]*)"/)?.[1]?.slice(0, 100) || 'carousel',
        stateCount: slideCount,
        stateLabels: Array.from({ length: Math.min(slideCount, 20) }, (_, i) => `Slide ${i + 1}`),
      });
    }
  }

  return states;
}

// â”€â”€â”€ Helper: Extract scroll behaviors & animation patterns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ScrollBehavior {
  type: string;
  mechanism: string;
  elements: string;
}

export function extractScrollBehaviors(html: string, css: string): ScrollBehavior[] {
  const behaviors: ScrollBehavior[] = [];
  const combined = html + '\n' + css;

  // Sticky header
  if (/(?:nav|header)[^}]*position:\s*(?:sticky|fixed)/i.test(css) || /<(?:nav|header)[^>]*style="[^"]*(?:position:\s*sticky|position:\s*fixed)/i.test(html)) {
    behaviors.push({ type: 'sticky-header', mechanism: 'CSS sticky/fixed', elements: 'nav/header' });
  }

  // Scroll-snap sections
  const snapMatch = css.match(/scroll-snap-type:\s*([^;]+)/i);
  if (snapMatch) {
    behaviors.push({ type: 'scroll-snap', mechanism: `scroll-snap-type: ${snapMatch[1].trim()}`, elements: 'page/section container' });
  }

  // Fade-in on scroll (IntersectionObserver or AOS)
  if (/IntersectionObserver/i.test(html) || /data-aos=/i.test(html) || /\.fade-in|\.reveal|\.animate-on-scroll/i.test(combined)) {
    const aosEffects = [...new Set((html.match(/data-aos="([^"]+)"/gi) || []).map(a => a.match(/data-aos="([^"]+)"/i)?.[1]).filter(Boolean))];
    behaviors.push({
      type: 'scroll-reveal',
      mechanism: /data-aos=/i.test(html) ? `AOS library (effects: ${aosEffects.slice(0, 10).join(', ')})` : 'IntersectionObserver',
      elements: 'sections/cards',
    });
  }

  // Parallax effects
  if (/parallax|data-speed|data-rellax|transform.*translateZ/i.test(combined)) {
    behaviors.push({ type: 'parallax', mechanism: 'CSS/JS parallax', elements: 'background layers' });
  }

  // GSAP ScrollTrigger
  if (/ScrollTrigger|gsap.*scroll/i.test(html)) {
    const pinMatch = html.match(/pin:\s*true/g);
    behaviors.push({
      type: 'gsap-scroll',
      mechanism: `GSAP ScrollTrigger${pinMatch ? ` (${pinMatch.length} pinned sections)` : ''}`,
      elements: 'animated sections',
    });
  }

  // CSS scroll-driven animations (modern)
  if (/animation-timeline:\s*(?:view|scroll)\(\)/i.test(combined)) {
    behaviors.push({ type: 'css-scroll-animation', mechanism: 'CSS animation-timeline: view()/scroll()', elements: 'elements with scroll-driven keyframes' });
  }

  // Smooth scroll library
  if (/lenis/i.test(combined)) {
    behaviors.push({ type: 'smooth-scroll', mechanism: 'Lenis', elements: 'page container' });
  } else if (/locomotive-scroll/i.test(combined)) {
    behaviors.push({ type: 'smooth-scroll', mechanism: 'Locomotive Scroll', elements: 'page container' });
  } else if (/scroll-behavior:\s*smooth/i.test(combined)) {
    behaviors.push({ type: 'smooth-scroll', mechanism: 'CSS scroll-behavior: smooth', elements: 'html/body' });
  }

  // Progress bar on scroll
  if (/scroll.*progress|progress.*scroll|reading-progress/i.test(combined)) {
    behaviors.push({ type: 'scroll-progress', mechanism: 'scroll progress indicator', elements: 'top bar/indicator' });
  }

  // Horizontal scroll gallery
  if (/overflow-x:\s*(?:scroll|auto)|scroll-snap-type:\s*x/i.test(css)) {
    behaviors.push({ type: 'horizontal-scroll', mechanism: 'horizontal scroll container', elements: 'gallery/cards container' });
  }

  // Counter/number animation on scroll
  if (/countUp|counter.*animate|animateValue/i.test(html)) {
    behaviors.push({ type: 'count-up', mechanism: 'number counter animation', elements: 'stats/metrics' });
  }

  return behaviors;
}

// â”€â”€â”€ Helper: Extract computed-style-level CSS patterns from style blocks â”€â”€â”€â”€
// Emulates getComputedStyle extraction by parsing CSS rules with granular detail

export function extractComputedStylePatterns(html: string, css: string): Record<string, Record<string, string>> {
  const patterns: Record<string, Record<string, string>> = {};
  const cssContent = css || '';

  // Comprehensive property list matching ai-website-cloner getComputedStyle extraction
  const importantProps = [
    'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing', 'color',
    'text-transform', 'text-decoration', 'text-align',
    'background', 'background-color', 'background-image',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'display', 'flex-direction', 'justify-content', 'align-items', 'gap',
    'grid-template-columns', 'grid-template-rows',
    'border-radius', 'box-shadow', 'border', 'border-top', 'border-bottom',
    'max-width', 'min-width', 'max-height', 'min-height', 'height', 'width',
    'position', 'top', 'right', 'bottom', 'left', 'z-index',
    'opacity', 'transform', 'transition', 'cursor',
    'backdrop-filter', '-webkit-backdrop-filter', 'filter',
    'overflow', 'overflow-x', 'overflow-y',
    'object-fit', 'object-position', 'mix-blend-mode',
    'white-space', 'text-overflow', '-webkit-line-clamp',
  ];

  // Target semantic element selectors that represent key components
  const targetSelectors = [
    // Navigation
    { pattern: /(?:\.nav(?:bar|igation)?|header|\.header|nav)\s*\{([^}]+)\}/gi, name: 'navbar' },
    // Hero
    { pattern: /(?:\.hero|\.banner|\.jumbotron|\.splash|\.landing)\s*\{([^}]+)\}/gi, name: 'hero' },
    // Buttons
    { pattern: /(?:\.btn|\.button|\.cta|button(?:\[type|\.)|a\.btn)\s*\{([^}]+)\}/gi, name: 'button' },
    // Button hover states (critical for clone fidelity)
    { pattern: /(?:\.btn|\.button|\.cta|button):hover\s*\{([^}]+)\}/gi, name: 'button:hover' },
    // Cards
    { pattern: /\.card\s*\{([^}]+)\}/gi, name: 'card' },
    { pattern: /\.card:hover\s*\{([^}]+)\}/gi, name: 'card:hover' },
    // Footer
    { pattern: /(?:\.footer|footer)\s*\{([^}]+)\}/gi, name: 'footer' },
    // Headings
    { pattern: /h1\s*\{([^}]+)\}/gi, name: 'h1' },
    { pattern: /h2\s*\{([^}]+)\}/gi, name: 'h2' },
    { pattern: /h3\s*\{([^}]+)\}/gi, name: 'h3' },
    // Body
    { pattern: /body\s*\{([^}]+)\}/gi, name: 'body' },
    // Links
    { pattern: /a\s*\{([^}]+)\}/gi, name: 'link' },
    { pattern: /a:hover\s*\{([^}]+)\}/gi, name: 'link:hover' },
    // Sections
    { pattern: /(?:\.section|section)\s*\{([^}]+)\}/gi, name: 'section' },
    // Inputs
    { pattern: /(?:input|\.input|textarea)\s*\{([^}]+)\}/gi, name: 'input' },
    // Badge/tag
    { pattern: /(?:\.badge|\.tag|\.chip|\.pill)\s*\{([^}]+)\}/gi, name: 'badge' },
    // Container
    { pattern: /(?:\.container|\.wrapper|\.max-w)\s*\{([^}]+)\}/gi, name: 'container' },
    // Features/pricing/testimonial sections
    { pattern: /(?:\.feature|\.pricing|\.testimonial|\.review)\s*\{([^}]+)\}/gi, name: 'feature-card' },
  ];

  for (const { pattern, name } of targetSelectors) {
    let match;
    while ((match = pattern.exec(cssContent)) !== null) {
      if (!match[1]) continue;
      const props: Record<string, string> = {};
      const decls = match[1].split(';');
      for (const decl of decls) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) continue;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const val = decl.slice(colonIdx + 1).trim();
        if (importantProps.includes(prop) && val && val !== 'inherit' && val !== 'initial' && val !== 'unset') {
          props[prop] = val;
        }
      }
      if (Object.keys(props).length > 0) {
        patterns[name] = { ...patterns[name], ...props };
      }
    }
  }

  // Also extract from inline styles on key elements in HTML
  const inlineTargets = [
    { pattern: /<nav[^>]*style="([^"]+)"/gi, name: 'navbar' },
    { pattern: /<header[^>]*style="([^"]+)"/gi, name: 'navbar' },
    { pattern: /<footer[^>]*style="([^"]+)"/gi, name: 'footer' },
    { pattern: /<main[^>]*style="([^"]+)"/gi, name: 'main' },
    { pattern: /<section[^>]*style="([^"]+)"/gi, name: 'section' },
  ];

  for (const { pattern, name } of inlineTargets) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const props: Record<string, string> = {};
      const decls = match[1].split(';');
      for (const decl of decls) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) continue;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const val = decl.slice(colonIdx + 1).trim();
        if (importantProps.includes(prop) && val) {
          props[prop] = val;
        }
      }
      if (Object.keys(props).length > 0) {
        patterns[name] = { ...patterns[name], ...props };
      }
    }
  }

  return patterns;
}

// â”€â”€â”€ Helper: Detect page composition layers (z-index stacking) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function extractZIndexLayers(html: string, css: string): Array<{ element: string; zIndex: string; position: string }> {
  const layers: Array<{ element: string; zIndex: string; position: string }> = [];
  const combined = css || '';

  // Extract z-index from CSS rules
  const zRegex = /([.#][\w-]+(?:\s+[\w.#-]+)?)\s*\{[^}]*z-index:\s*(\d+)[^}]*position:\s*([\w]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = zRegex.exec(combined)) !== null && layers.length < 20) {
    layers.push({ element: match[1], zIndex: match[2], position: match[3] });
  }

  // Also try reversed order (position before z-index)
  const zRegex2 = /([.#][\w-]+(?:\s+[\w.#-]+)?)\s*\{[^}]*position:\s*([\w]+)[^}]*z-index:\s*(\d+)/gi;
  while ((match = zRegex2.exec(combined)) !== null && layers.length < 30) {
    if (!layers.find(l => l.element === match![1])) {
      layers.push({ element: match![1], zIndex: match![3], position: match![2] });
    }
  }

  // Sort by z-index descending
  return layers.sort((a, b) => parseInt(b.zIndex) - parseInt(a.zIndex));
}

// â”€â”€â”€ Page Topology Extractor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Maps every distinct section of the page from top to bottom with its role,
// interaction model, content summary, and dependencies.
// Inspired by ai-website-cloner-template Phase 1: Page Topology.

export interface PageTopologySection {
  order: number;
  tag: string;
  role: string;
  position: 'flow' | 'sticky' | 'fixed' | 'absolute';
  interactionModel: 'static' | 'scroll-driven' | 'click-driven' | 'time-driven' | 'hybrid';
  contentSummary: string;
  hasImages: boolean;
  hasVideo: boolean;
  headingText?: string;
}

export function extractPageTopology(html: string): PageTopologySection[] {
  const topology: PageTopologySection[] = [];

  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  // Find top-level semantic sections
  const sectionRegex = /<(nav|header|main|section|article|aside|footer|div)\b([^>]*)>([\s\S]*?)(?=<\/\1>)/gi;
  let match;
  let order = 0;
  const seen = new Set<string>();

  while ((match = sectionRegex.exec(bodyHtml)) !== null && topology.length < 60) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    const inner = match[3].slice(0, 15000); // cap inner content scan

    // For divs, only include significant ones (with class/id hinting at a section)
    if (tag === 'div') {
      const cls = attrs.match(/class="([^"]*)"/i)?.[1] || '';
      const id = attrs.match(/id="([^"]*)"/i)?.[1] || '';
      const combined = cls + ' ' + id;
      if (!/hero|banner|section|feature|pricing|testimonial|cta|contact|team|about|faq|partner|stat|metric|gallery|showcase|portfolio|blog|service|footer-area|content-area|main-area/i.test(combined)) {
        continue;
      }
    }

    // Deduplicate by first heading or class
    const heading = inner.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1]?.replace(/<[^>]*>/g, '').trim().slice(0, 80);
    const sectionId = heading || (attrs.match(/(?:class|id)="([^"]*)"/i)?.[1] || '').slice(0, 60);
    if (seen.has(sectionId) && sectionId) continue;
    if (sectionId) seen.add(sectionId);

    // Determine role
    let role = tag;
    const cls = (attrs.match(/class="([^"]*)"/i)?.[1] || '').toLowerCase();
    const id = (attrs.match(/id="([^"]*)"/i)?.[1] || '').toLowerCase();
    const hints = cls + ' ' + id;
    if (/hero|banner|splash|landing|jumbotron/i.test(hints)) role = 'hero';
    else if (/feature|benefit|service|solution/i.test(hints)) role = 'features';
    else if (/pricing|plan/i.test(hints)) role = 'pricing';
    else if (/testimonial|review|quote/i.test(hints)) role = 'testimonials';
    else if (/cta|call-to-action|signup|subscribe/i.test(hints)) role = 'cta';
    else if (/faq|question|accordion/i.test(hints)) role = 'faq';
    else if (/team|people|about/i.test(hints)) role = 'about/team';
    else if (/partner|logo|client|brand|trusted/i.test(hints)) role = 'logos/partners';
    else if (/stat|metric|number|count/i.test(hints)) role = 'stats';
    else if (/gallery|portfolio|showcase|case/i.test(hints)) role = 'gallery';
    else if (/contact|form/i.test(hints)) role = 'contact';
    else if (/blog|article|post/i.test(hints)) role = 'blog';
    else if (tag === 'nav' || tag === 'header') role = 'navigation';
    else if (tag === 'footer') role = 'footer';

    // Determine position
    let position: PageTopologySection['position'] = 'flow';
    const style = attrs.match(/style="([^"]*)"/i)?.[1] || '';
    if (/sticky/i.test(style) || /sticky/i.test(cls)) position = 'sticky';
    else if (/fixed/i.test(style) || /fixed/i.test(cls)) position = 'fixed';

    // Determine interaction model
    let interactionModel: PageTopologySection['interactionModel'] = 'static';
    if (/data-aos=|IntersectionObserver|scroll-snap|animation-timeline/i.test(inner)) interactionModel = 'scroll-driven';
    else if (/role="tablist"|tab-content|accordion|carousel|swiper|data-slide/i.test(inner)) interactionModel = 'click-driven';
    else if (/autoplay|setInterval|animation:.*infinite/i.test(inner)) interactionModel = 'time-driven';

    // Content summary
    const textLen = inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().length;
    const imgCount = (inner.match(/<img\b/gi) || []).length;
    const hasVideo = /<video\b/i.test(inner);
    const btnCount = (inner.match(/<(?:button|a[^>]*class="[^"]*btn)/gi) || []).length;

    order++;
    topology.push({
      order,
      tag,
      role,
      position,
      interactionModel,
      contentSummary: `~${textLen} chars, ${imgCount} images, ${btnCount} buttons`,
      hasImages: imgCount > 0,
      hasVideo,
      headingText: heading,
    });
  }

  return topology;
}

// â”€â”€â”€ Font Stack Extractor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Extracts comprehensive font info: Google Fonts imports, local fonts, weights, styles.
// Inspired by ai-website-cloner-template Phase 1 Global Extraction.

export interface FontInfo {
  family: string;
  source: 'google-fonts' | 'local' | 'cdn' | 'system';
  weights: string[];
  importUrl?: string;
}

export function extractFontStack(html: string, css: string): FontInfo[] {
  const fonts: Map<string, FontInfo> = new Map();

  // 1. Extract Google Fonts from <link> tags
  const gfLinkRegex = /<link[^>]*href=["'](https:\/\/fonts\.googleapis\.com\/css2?\?[^"']+)["']/gi;
  let match;
  while ((match = gfLinkRegex.exec(html)) !== null) {
    const importUrl = match[1];
    const familyMatches = importUrl.match(/family=([^&]+)/gi) || [];
    for (const fm of familyMatches) {
      const decoded = decodeURIComponent(fm.replace('family=', ''));
      // Handle "Inter:wght@400;500;600;700" format
      const parts = decoded.split(':');
      const family = parts[0].replace(/\+/g, ' ');
      const weights: string[] = [];
      if (parts[1]) {
        const weightPart = parts[1].replace(/^[a-z,]+@/, '');
        weights.push(...weightPart.split(';').filter(w => /^\d+$/.test(w)));
      }
      fonts.set(family, {
        family,
        source: 'google-fonts',
        weights: weights.length > 0 ? weights : ['400'],
        importUrl,
      });
    }
  }

  // 2. Extract @import url('...fonts.googleapis.com...') from CSS
  const cssImportRegex = /@import\s+url\(\s*['"]?(https:\/\/fonts\.googleapis\.com\/[^'")\s]+)['"]?\s*\)/gi;
  const combined = css + '\n' + html;
  while ((match = cssImportRegex.exec(combined)) !== null) {
    const importUrl = match[1];
    const familyMatches = importUrl.match(/family=([^&]+)/gi) || [];
    for (const fm of familyMatches) {
      const decoded = decodeURIComponent(fm.replace('family=', ''));
      const parts = decoded.split(':');
      const family = parts[0].replace(/\+/g, ' ');
      if (!fonts.has(family)) {
        const weights: string[] = [];
        if (parts[1]) {
          weights.push(...parts[1].replace(/^[a-z,]+@/, '').split(';').filter(w => /^\d+$/.test(w)));
        }
        fonts.set(family, { family, source: 'google-fonts', weights: weights.length > 0 ? weights : ['400'], importUrl });
      }
    }
  }

  // 3. Extract @font-face declarations (local/CDN fonts)
  const fontFaceRegex = /@font-face\s*\{[^}]*font-family:\s*["']?([^"';]+)["']?[^}]*\}/gi;
  while ((match = fontFaceRegex.exec(combined)) !== null) {
    const family = match[0].match(/font-family:\s*["']?([^"';]+)/i)?.[1]?.trim();
    if (family && !fonts.has(family)) {
      const weight = match[0].match(/font-weight:\s*(\d+)/i)?.[1];
      const src = match[0].match(/src:\s*url\(\s*["']?([^"')]+)/i)?.[1];
      const source = src && /https?:\/\//.test(src) ? 'cdn' : 'local';
      fonts.set(family, { family, source: source as FontInfo['source'], weights: weight ? [weight] : ['400'] });
    } else if (family && fonts.has(family)) {
      // Add additional weight if new
      const weight = match[0].match(/font-weight:\s*(\d+)/i)?.[1];
      if (weight) {
        const existing = fonts.get(family)!;
        if (!existing.weights.includes(weight)) existing.weights.push(weight);
      }
    }
  }

  // 4. Extract font-family from CSS rules (detect system fonts being used)
  const ffRegex = /font-family:\s*["']?([^"';}{]+?)["']?\s*(?:,|;|\})/gi;
  while ((match = ffRegex.exec(combined)) !== null && fonts.size < 20) {
    const family = match[1].trim();
    // Skip generic families and system stacks
    if (/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-monospace|inherit|initial|unset|-apple-system|BlinkMacSystemFont|Segoe UI|Roboto|Helvetica|Arial|Liberation)$/i.test(family)) continue;
    if (!fonts.has(family)) {
      fonts.set(family, { family, source: 'system', weights: ['400'] });
    }
  }

  return [...fonts.values()];
}

// â”€â”€â”€ Hover State Extractor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Extracts hover transitions: before â†’ after CSS property diffs.
// Inspired by ai-website-cloner-template Phase 3 multi-state extraction.

export interface HoverTransition {
  selector: string;
  changes: Array<{ property: string; before: string; after: string }>;
  transition?: string;
}

export function extractHoverTransitions(css: string): HoverTransition[] {
  const transitions: HoverTransition[] = [];

  // Find all :hover rules
  const hoverRegex = /([.#\w][\w\s.#>:+-]*?):hover\s*\{([^}]+)\}/gi;
  let match;
  while ((match = hoverRegex.exec(css)) !== null && transitions.length < 30) {
    const selector = match[1].trim();
    const hoverProps = match[2];
    const changes: HoverTransition['changes'] = [];

    // Parse hover properties
    const decls = hoverProps.split(';');
    for (const decl of decls) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim().toLowerCase();
      const val = decl.slice(colonIdx + 1).trim();
      if (val && prop && !/^$|^\/\*/.test(prop)) {
        changes.push({ property: prop, before: '(default)', after: val });
      }
    }

    // Try to find the base selector's transition property
    const baseRegex = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]+)\\}', 'i');
    const baseMatch = css.match(baseRegex);
    let transition: string | undefined;
    if (baseMatch) {
      const transMatch = baseMatch[1].match(/transition:\s*([^;]+)/i);
      if (transMatch) transition = transMatch[1].trim();
      
      // Fill in "before" values from base selector
      for (const change of changes) {
        const propRegex = new RegExp(change.property.replace(/-/g, '\\-') + '\\s*:\\s*([^;]+)', 'i');
        const beforeMatch = baseMatch[1].match(propRegex);
        if (beforeMatch) change.before = beforeMatch[1].trim();
      }
    }

    if (changes.length > 0) {
      transitions.push({ selector, changes, transition });
    }
  }

  return transitions;
}

// â”€â”€â”€ Responsive Breakpoint Extractor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Detects actual breakpoints used in the site's CSS.

export interface ResponsiveBreakpoint {
  query: string;
  width: number;
  type: 'min-width' | 'max-width';
  affectedSelectors: string[];
}

export function extractResponsiveBreakpoints(css: string): ResponsiveBreakpoint[] {
  const breakpoints: Map<string, ResponsiveBreakpoint> = new Map();

  const mediaRegex = /@media[^{]*\(\s*(min-width|max-width)\s*:\s*(\d+(?:\.\d+)?)(px|em|rem)\s*\)\s*\{/gi;
  let match;
  while ((match = mediaRegex.exec(css)) !== null) {
    const type = match[1].toLowerCase() as ResponsiveBreakpoint['type'];
    let width = parseFloat(match[2]);
    const unit = match[3];
    // Convert em/rem to px (approximate)
    if (unit === 'em' || unit === 'rem') width = width * 16;
    width = Math.round(width);

    const key = `${type}:${width}`;
    if (!breakpoints.has(key)) {
      // Extract selectors within this media query block
      const afterQuery = css.slice(match.index + match[0].length, match.index + match[0].length + 5000);
      const selectors: string[] = [];
      const selectorRegex = /([.#\w][\w\s.#>:,+-]*?)\s*\{/g;
      let selMatch;
      while ((selMatch = selectorRegex.exec(afterQuery)) !== null && selectors.length < 20) {
        const sel = selMatch[1].trim();
        if (sel && !sel.startsWith('@')) selectors.push(sel.slice(0, 80));
      }
      breakpoints.set(key, { query: `@media (${type}: ${width}px)`, width, type, affectedSelectors: selectors });
    }
  }

  return [...breakpoints.values()].sort((a, b) => a.width - b.width);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PIXEL-PERFECT CLONE PIPELINE â€” ai-website-cloner inspired
// Phase 3: Component Spec Generation (per-section detailed specs)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export interface ComponentSpec {
  sectionIndex: number;
  tag: string;
  role: string;
  heading?: string;
  layout: string;
  childCount: number;
  interactionModel: string;
  hasImages: boolean;
  hasVideo: boolean;
  textContent: string[];
  links: Array<{ text: string; href: string }>;
  images: Array<{ src: string; alt: string }>;
  videos: Array<{ src: string; poster?: string }>;
  computedStyles: Record<string, string>;
  hoverStates: string[];
  scrollBehavior?: string;
  multiState?: { type: string; stateCount: number; labels: string[] };
  layers?: Array<{ type: string; src: string }>;
}

/**
 * Generate per-section component specs (like ai-website-cloner Phase 3).
 * Each spec contains EVERYTHING needed to rebuild that section in isolation.
 */
export function generateComponentSpecs(
  html: string,
  _css: string,
  topology: PageTopologySection[],
  _fonts: FontInfo[],
  interactions: InteractionModel[],
  hovers: HoverTransition[],
  layeredAssets: LayeredAsset[],
  multiStateContent: MultiStateContent[],
  scrollBehaviors: ScrollBehavior[],
  computedPatterns: Record<string, Record<string, string>>,
): ComponentSpec[] {
  const specs: ComponentSpec[] = [];

  for (const section of topology) {
    const interaction = interactions.find(m =>
      m.section.toLowerCase().includes(section.role.toLowerCase()) ||
      section.role.toLowerCase().includes(m.section.toLowerCase())
    );

    const styles: Record<string, string> = {};
    for (const [component, props] of Object.entries(computedPatterns)) {
      if (component.toLowerCase().includes(section.role.toLowerCase()) ||
          section.role.toLowerCase().includes(component.toLowerCase())) {
        Object.assign(styles, props);
      }
    }

    const sectionHovers = hovers
      .filter(h => h.selector.toLowerCase().includes(section.role.toLowerCase()))
      .map(h => `${h.selector}: ${h.changes.map(c => `${c.property}: ${c.before} â†’ ${c.after}`).join(', ')}${h.transition ? ` (${h.transition})` : ''}`);

    const scrollBehavior = scrollBehaviors.find(s =>
      s.elements.toLowerCase().includes(section.role.toLowerCase())
    );

    const multiStateMatch = multiStateContent.find(ms =>
      ms.containerHint.toLowerCase().includes(section.role.toLowerCase())
    );

    const sectionLayers = layeredAssets
      .filter(la => la.container.toLowerCase().includes(section.role.toLowerCase()))
      .flatMap(la => la.layers);

    const sectionTexts: string[] = [];
    const sectionLinks: Array<{ text: string; href: string }> = [];
    const sectionImages: Array<{ src: string; alt: string }> = [];
    const sectionVideos: Array<{ src: string; poster?: string }> = [];

    if (section.headingText) {
      const escapedHeading = section.headingText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60);
      const headingRegex = new RegExp(escapedHeading, 'i');
      const headingIndex = html.search(headingRegex);
      if (headingIndex >= 0) {
        const sectionSlice = html.slice(Math.max(0, headingIndex - 200), headingIndex + 3000);

        const pMatches = sectionSlice.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
        for (const p of pMatches.slice(0, 5)) {
          const text = p.replace(/<[^>]*>/g, '').trim();
          if (text.length > 10) sectionTexts.push(text.slice(0, 200));
        }

        const linkMatches = sectionSlice.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi);
        for (const lm of linkMatches) {
          const href = lm[1];
          const text = lm[2].replace(/<[^>]*>/g, '').trim();
          if (text && href) sectionLinks.push({ text: text.slice(0, 80), href: href.slice(0, 200) });
        }

        const imgMatches = sectionSlice.matchAll(/<img[^>]*src=["']([^"']*)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi);
        for (const im of imgMatches) {
          sectionImages.push({ src: im[1].slice(0, 300), alt: (im[2] || '').slice(0, 100) });
        }

        const vidMatches = sectionSlice.matchAll(/<(?:video|source)[^>]*src=["']([^"']*)["'][^>]*(?:poster=["']([^"']*)["'])?[^>]*>/gi);
        for (const vm of vidMatches) {
          sectionVideos.push({ src: vm[1].slice(0, 300), poster: vm[2]?.slice(0, 300) });
        }
      }
    }

    specs.push({
      sectionIndex: section.order,
      tag: section.tag,
      role: section.role,
      heading: section.headingText,
      layout: styles['display'] || 'block',
      childCount: parseInt(styles['child-count'] || '0') || 0,
      interactionModel: interaction?.model || section.interactionModel || 'static',
      hasImages: section.hasImages || sectionImages.length > 0,
      hasVideo: section.hasVideo || sectionVideos.length > 0,
      textContent: sectionTexts,
      links: sectionLinks.slice(0, 15),
      images: sectionImages.slice(0, 10),
      videos: sectionVideos.slice(0, 5),
      computedStyles: styles,
      hoverStates: sectionHovers.slice(0, 10),
      scrollBehavior: scrollBehavior ? `${scrollBehavior.type}: ${scrollBehavior.mechanism}` : undefined,
      multiState: multiStateMatch ? {
        type: multiStateMatch.type,
        stateCount: multiStateMatch.stateCount,
        labels: multiStateMatch.stateLabels,
      } : undefined,
      layers: sectionLayers.length > 0 ? sectionLayers.map(l => ({ type: l.type, src: l.src })) : undefined,
    });
  }

  return specs;
}

/**
 * Build component spec prompt section for the clone AI.
 * Creates per-section spec doc like ai-website-cloner Phase 3.
 */
export function buildComponentSpecPrompt(specs: ComponentSpec[]): string {
  if (specs.length === 0) return '';

  const lines: string[] = [
    '## ðŸ“‹ COMPONENT SPECS (per-section build instructions â€” follow EXACTLY)',
    '',
  ];

  for (const spec of specs) {
    lines.push(`### Section ${spec.sectionIndex}: [${spec.tag.toUpperCase()}] ${spec.role}`);
    if (spec.heading) lines.push(`**Heading**: "${spec.heading}"`);
    lines.push(`**Interaction**: ${spec.interactionModel}`);
    lines.push(`**Layout**: ${spec.layout} | Children: ${spec.childCount}`);

    if (Object.keys(spec.computedStyles).length > 0) {
      lines.push('**Computed CSS**:');
      for (const [prop, val] of Object.entries(spec.computedStyles)) {
        lines.push(`  ${prop}: ${val}`);
      }
    }

    if (spec.hoverStates.length > 0) {
      lines.push('**Hover States**:');
      for (const h of spec.hoverStates) lines.push(`  ${h}`);
    }

    if (spec.scrollBehavior) lines.push(`**Scroll**: ${spec.scrollBehavior}`);

    if (spec.multiState) {
      lines.push(`**Multi-State**: ${spec.multiState.type} (${spec.multiState.stateCount} states): ${spec.multiState.labels.join(', ')}`);
    }

    if (spec.layers && spec.layers.length > 0) {
      lines.push(`**Layers**: ${spec.layers.map(l => `${l.type}: ${l.src}`).join(' | ')}`);
    }

    if (spec.textContent.length > 0) {
      lines.push('**Content**: ' + spec.textContent.slice(0, 3).map(t => `"${t.slice(0, 100)}"`).join(' | '));
    }

    if (spec.images.length > 0) {
      lines.push(`**Images**: ${spec.images.length} â†’ ${spec.images.slice(0, 3).map(i => i.src.split('/').pop()?.slice(0, 40)).join(', ')}`);
    }

    if (spec.videos.length > 0) {
      lines.push(`**Videos**: ${spec.videos.length}`);
    }

    lines.push('');
  }

  lines.push('âš ï¸ Build EACH section following its spec. Match computed CSS values precisely.');
  lines.push('Do not approximate â€” "font-size: 18px" means 18px, not text-lg.');
  return lines.join('\n');
}

/**
 * Build multi-viewport analysis prompt section.
 */
export function buildMultiViewportPrompt(viewports: Array<{ width: number; label: string }>): string {
  if (viewports.length <= 1) return '';

  return `
## ðŸ“± MULTI-VIEWPORT ANALYSIS (${viewports.length} viewport screenshots provided)
Screenshots at: ${viewports.map(v => `${v.label} (${v.width}px)`).join(', ')}

### Cross-Viewport Rules:
1. **Desktop (1440px)**: Primary reference â€” build this first
2. **Tablet (768px)**: Check for layout changes â€” stacked columns, hidden elements, nav collapse
3. **Mobile (390px)**: Verify responsive â€” hamburger nav, single column, adjusted typography
4. Compare same section across viewports to identify:
   - Elements that HIDE on mobile (display:none at breakpoints)
   - Elements that STACK (flex-direction: column)
   - Elements that RESIZE (different font-size, padding)
   - Elements that TRANSFORM (nav â†’ hamburger, grid â†’ scroll)
5. Build desktop-first, then add @media breakpoints for tablet and mobile
6. Test mental model at all 3 widths before outputting`;
}

/**
 * Calculate visual diff hints between original and cloned HTML.
 * Returns discrepancies for auto-refine phase.
 */
export function calculateVisualDiffHints(originalHtml: string, clonedHtml: string): string[] {
  const hints: string[] = [];

  const origSections = (originalHtml.match(/<(?:nav|header|section|main|footer|article)\b/gi) || []).length;
  const cloneSections = (clonedHtml.match(/<(?:nav|header|section|main|footer|article)\b/gi) || []).length;
  if (cloneSections < origSections) {
    hints.push(`MISSING SECTIONS: Original has ${origSections} sections, clone only has ${cloneSections}. Add ${origSections - cloneSections} more.`);
  }

  const origImages = (originalHtml.match(/<img\b/gi) || []).length;
  const cloneImages = (clonedHtml.match(/<img\b/gi) || []).length;
  if (cloneImages < origImages * 0.5) {
    hints.push(`MISSING IMAGES: Original has ${origImages} images, clone only has ${cloneImages}.`);
  }

  const origVideos = (originalHtml.match(/<video\b/gi) || []).length;
  const cloneVideos = (clonedHtml.match(/<video\b/gi) || []).length;
  if (origVideos > 0 && cloneVideos === 0) {
    hints.push(`MISSING VIDEO: Original has ${origVideos} video elements but clone has none.`);
  }

  if (!/<nav\b/i.test(clonedHtml) && /<nav\b/i.test(originalHtml)) {
    hints.push('MISSING NAV: Original has navigation but clone does not.');
  }
  if (!/<footer\b/i.test(clonedHtml) && /<footer\b/i.test(originalHtml)) {
    hints.push('MISSING FOOTER: Original has footer but clone does not.');
  }

  const origForms = (originalHtml.match(/<(?:form|input|textarea|select)\b/gi) || []).length;
  const cloneForms = (clonedHtml.match(/<(?:form|input|textarea|select)\b/gi) || []).length;
  if (origForms > 0 && cloneForms === 0) {
    hints.push(`MISSING FORMS: Original has ${origForms} form elements but clone has none.`);
  }

  const origLinks = (originalHtml.match(/<a\b/gi) || []).length;
  const cloneLinks = (clonedHtml.match(/<a\b/gi) || []).length;
  if (cloneLinks < origLinks * 0.3) {
    hints.push(`MISSING LINKS: Original has ${origLinks} links, clone only has ${cloneLinks}.`);
  }

  if (/gsap|scrolltrigger/i.test(originalHtml) && !/gsap|scrolltrigger/i.test(clonedHtml)) {
    hints.push('MISSING ANIMATIONS: Original uses GSAP/ScrollTrigger but clone does not.');
  }

  if (clonedHtml.length < originalHtml.length * 0.3) {
    hints.push(`TOO SHORT: Clone (${clonedHtml.length} chars) much shorter than original (${originalHtml.length} chars).`);
  }

  const origBtns = (originalHtml.match(/<button\b/gi) || []).length;
  const cloneBtns = (clonedHtml.match(/<button\b/gi) || []).length;
  if (origBtns > 0 && cloneBtns < origBtns * 0.5) {
    hints.push(`MISSING BUTTONS: Original has ${origBtns} buttons, clone only has ${cloneBtns}.`);
  }

  return hints;
}

/**
 * Build design system card from extracted tokens.
 */
export function buildDesignSystemCard(
  tokens: ReturnType<typeof extractDesignTokens>,
  fonts: FontInfo[],
  breakpoints: ResponsiveBreakpoint[],
): string {
  const lines: string[] = ['## ðŸŽ¨ DESIGN SYSTEM CARD (extracted from source)'];

  if (tokens.colors.length > 0) {
    lines.push(`**Colors**: ${tokens.colors.slice(0, 12).join(', ')}`);
  }
  if (tokens.gradients && tokens.gradients.length > 0) {
    lines.push(`**Gradients**: ${tokens.gradients.slice(0, 4).join(' | ')}`);
  }
  if (fonts.length > 0) {
    lines.push(`**Fonts**: ${fonts.map(f => `${f.family} (${f.weights.join(',')})`).join(' | ')}`);
  } else if (tokens.fonts.length > 0) {
    lines.push(`**Fonts**: ${tokens.fonts.join(', ')}`);
  }
  if (tokens.cssVariables && Object.keys(tokens.cssVariables).length > 0) {
    const vars = Object.entries(tokens.cssVariables).slice(0, 15);
    lines.push('**CSS Variables**:');
    for (const [k, v] of vars) lines.push(`  ${k}: ${v}`);
  }
  if (tokens.shadows && tokens.shadows.length > 0) {
    lines.push(`**Shadows**: ${tokens.shadows.slice(0, 4).join(' | ')}`);
  }
  if (tokens.borderRadii && tokens.borderRadii.length > 0) {
    lines.push(`**Border Radii**: ${tokens.borderRadii.join(', ')}`);
  }
  if (breakpoints.length > 0) {
    lines.push(`**Breakpoints**: ${breakpoints.map(b => `${b.width}px`).join(', ')}`);
  }

  return lines.join('\n');
}
