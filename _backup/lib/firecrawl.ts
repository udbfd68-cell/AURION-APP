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
      signal: AbortSignal.timeout(20000),
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
      waitFor: 1000,
      onlyMainContent: false,
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
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '<svg><!-- icon --></svg>')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sdata-[\w-]+="[^"]*"/gi, '') // Remove data attributes (noise)
    .replace(/\sclass="[^"]*"/gi, (match) => {
      // Keep class but trim Tailwind-style long class strings
      const val = match.replace(/class="/, '').replace(/"$/, '');
      if (val.length > 200) return ` class="${val.slice(0, 200)}"`;
      return match;
    })
    .replace(/\s{3,}/g, ' ')
    .trim();
}

// ─── Helper: Extract design tokens from raw HTML (MAXIMUM extraction) ───────

export function extractDesignTokens(html: string): {
  colors: string[];
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

  // Extract hex colors
  const hexMatches = html.match(/#(?:[0-9a-fA-F]{3,8})\b/g);
  if (hexMatches) hexMatches.forEach(c => colors.add(c.toLowerCase()));

  // Extract rgb/rgba/hsl/hsla/oklch
  const colorFuncMatches = html.match(/(?:rgb|rgba|hsl|hsla|oklch)\([^)]+\)/gi);
  if (colorFuncMatches) colorFuncMatches.slice(0, 40).forEach(c => colors.add(c));

  // Extract named colors from CSS (common ones)
  const namedColorPattern = /(?:color|background|border-color|fill|stroke):\s*(white|black|transparent|currentColor|inherit)\b/gi;
  const namedMatches = html.match(namedColorPattern);
  if (namedMatches) namedMatches.slice(0, 10).forEach(c => {
    const val = c.split(':')[1]?.trim();
    if (val) colors.add(val);
  });

  // Extract font-family declarations
  const fontMatches = html.match(/font-family:\s*([^;}"]+)/gi);
  if (fontMatches) {
    fontMatches.forEach(f => {
      const val = f.replace(/font-family:\s*/i, '').trim();
      fonts.add(val);
    });
  }

  // Extract @import font URLs
  const fontImportMatches = html.match(/@import\s+url\(["']?([^"')]+)["']?\)/gi);
  if (fontImportMatches) {
    fontImportMatches.forEach(f => fonts.add(f));
  }

  // Extract CSS custom properties (variables)
  const varMatches = html.match(/--[\w-]+:\s*[^;}"]+/g);
  if (varMatches) {
    varMatches.slice(0, 80).forEach(v => {
      const [key, ...rest] = v.split(':');
      cssVariables[key.trim()] = rest.join(':').trim();
    });
  }

  // Extract gradients
  const gradientMatches = html.match(/(?:linear|radial|conic)-gradient\([^)]+\)/gi);
  if (gradientMatches) gradientMatches.slice(0, 10).forEach(g => gradients.add(g));

  // Extract box-shadow values
  const shadowMatches = html.match(/box-shadow:\s*([^;}"]+)/gi);
  if (shadowMatches) shadowMatches.slice(0, 10).forEach(s => {
    shadows.add(s.replace(/box-shadow:\s*/i, '').trim());
  });

  // Extract border-radius values
  const radiusMatches = html.match(/border-radius:\s*([^;}"]+)/gi);
  if (radiusMatches) radiusMatches.slice(0, 10).forEach(r => {
    borderRadii.add(r.replace(/border-radius:\s*/i, '').trim());
  });

  // Extract @media queries
  const mediaMatches = html.match(/@media\s*\([^)]+\)/gi);
  if (mediaMatches) mediaMatches.slice(0, 10).forEach(m => mediaQueries.add(m));

  // Extract @keyframes names
  const keyframeMatches = html.match(/@keyframes\s+([\w-]+)/gi);
  if (keyframeMatches) keyframeMatches.slice(0, 10).forEach(k => {
    keyframes.add(k.replace(/@keyframes\s+/i, '').trim());
  });

  return {
    colors: [...colors].slice(0, 50),
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
  while ((match = linkRegex.exec(navHtml)) !== null && navItems.length < 20) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text && text.length < 60 && href && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
      navItems.push({ text, href });
    }
  }

  return navItems;
}

// ─── Helper: Extract images metadata ────────────────────────────────────────

export function extractImages(html: string): Array<{ src: string; alt: string; width?: string; height?: string }> {
  const images: Array<{ src: string; alt: string; width?: string; height?: string }> = [];
  const imgRegex = /<img\s([^>]+)>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null && images.length < 20) {
    const attrs = match[1];
    const src = attrs.match(/src=["']([^"']+)["']/)?.[1] || '';
    const alt = attrs.match(/alt=["']([^"']+)["']/)?.[1] || '';
    const width = attrs.match(/width=["']?(\d+)/)?.[1];
    const height = attrs.match(/height=["']?(\d+)/)?.[1];
    if (src) images.push({ src, alt, width, height });
  }
  return images;
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
