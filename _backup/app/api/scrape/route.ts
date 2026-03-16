/**
 * Scrape API Route — Powered by Firecrawl v2
 * Source: https://github.com/firecrawl/firecrawl
 * 
 * Uses Firecrawl's advanced v2 formats:
 * - html: Cleaned HTML structure
 * - rawHtml: Full unprocessed HTML with all styles/CSS
 * - screenshot: Base64 encoded page screenshot for visual reference
 * - branding: Automatic extraction of colors, fonts, typography
 * - links: All discoverable links on the page
 * 
 * Also uses the Map endpoint for discovering sub-pages.
 * 
 * Design token extraction enhanced with:
 * - CSS custom properties (variables) extraction
 * - Font-face declarations
 * - Media queries
 * Source: lib/firecrawl.ts (github.com/firecrawl/firecrawl)
 */

import { NextRequest } from 'next/server';
import {
  FirecrawlClient,
  cleanHtmlForClone,
  extractDesignTokens,
  extractInternalLinks,
  extractNavigation,
  extractImages,
  extractStyleBlocks,
  extractLinkedResources,
} from '@/lib/firecrawl';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  const firecrawl = new FirecrawlClient(apiKey);

  try {
    if (light) {
      // Light mode: sub-page scrape — just HTML + screenshot
      const data = await firecrawl.scrapeLight(url);
      const cleaned = cleanHtmlForClone(data.html);
      return new Response(JSON.stringify({
        html: cleaned.slice(0, 50000),
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

    // Full mode: run scrape + map in PARALLEL to avoid Vercel 25s timeout
    const [scrapeResult, mapResult] = await Promise.allSettled([
      firecrawl.scrapeForClone(url),
      firecrawl.map(url, { limit: 10 }),
    ]);

    if (scrapeResult.status === 'rejected') {
      throw new Error(scrapeResult.reason?.message || 'Scrape failed');
    }

    const data = scrapeResult.value;
    const cleaned = cleanHtmlForClone(data.html);
    const rawSource = data.rawHtml || data.html;
    const designTokens = extractDesignTokens(rawSource);

    // Extract all enrichment data from raw HTML
    const navigation = extractNavigation(rawSource);
    const images = extractImages(rawSource);
    const styleBlocks = extractStyleBlocks(rawSource);
    const linkedResources = extractLinkedResources(rawSource);

    // Extract internal links from HTML
    const htmlLinks = extractInternalLinks(rawSource, url);
    const scrapeLinks = data.links.filter(l => {
      try { return new URL(l).origin === new URL(url).origin; } catch { return false; }
    }).map(l => new URL(l).pathname);

    // Merge map links if available
    let mapLinks: string[] = [];
    if (mapResult.status === 'fulfilled' && mapResult.value.success && mapResult.value.links) {
      mapLinks = mapResult.value.links
        .map(l => { try { return new URL(l.url).pathname; } catch { return ''; } })
        .filter(p => p && p !== '/' && p !== new URL(url).pathname);
    }

    const finalLinks = [...new Set([...htmlLinks, ...scrapeLinks, ...mapLinks])].slice(0, 20);

    return new Response(JSON.stringify({
      html: cleaned.slice(0, 50000),
      rawHtml: (data.rawHtml || '').slice(0, 80000),
      tokens: designTokens,
      branding: null,
      internalLinks: finalLinks,
      screenshot: data.screenshot,
      metadata: data.metadata,
      navigation,
      images: images.slice(0, 15),
      styleBlocks: styleBlocks.slice(0, 15000),
      linkedResources,
    }), {
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
