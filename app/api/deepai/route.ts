/**
 * Image API Route — Pexels Stock Photos
 *
 * Uses Pexels API for high-quality, free stock images matching the prompt.
 * Falls back to a styled SVG placeholder if Pexels is unavailable.
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

const PEXELS_URL = 'https://api.pexels.com/v1/search';

export async function POST(req: NextRequest) {
  const pexelsKey = process.env.PEXELS_API_KEY;

  let body: { prompt: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { prompt } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.length === 0) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sanitizedPrompt = prompt.slice(0, 500);

  // If no Pexels key, return placeholder immediately
  if (!pexelsKey) {
    return jsonSuccess(generatePlaceholderSVG(sanitizedPrompt), sanitizedPrompt, 'PEXELS_API_KEY not configured');
  }

  try {
    // Extract keywords from prompt for better Pexels search
    const query = extractSearchTerms(sanitizedPrompt);

    const url = `${PEXELS_URL}?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    const response = await fetch(url, {
      headers: { 'Authorization': pexelsKey },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return jsonSuccess(generatePlaceholderSVG(sanitizedPrompt), sanitizedPrompt, `Pexels returned ${response.status}`);
    }

    const data = await response.json();
    const photos = data?.photos;

    if (!photos || photos.length === 0) {
      return jsonSuccess(generatePlaceholderSVG(sanitizedPrompt), sanitizedPrompt, 'No photos found');
    }

    // Pick a random photo from results for variety
    const photo = photos[Math.floor(Math.random() * photos.length)];
    const imageUrl = photo.src?.large2x || photo.src?.large || photo.src?.original;

    if (!imageUrl) {
      return jsonSuccess(generatePlaceholderSVG(sanitizedPrompt), sanitizedPrompt, 'No image URL in response');
    }

    return new Response(JSON.stringify({
      success: true,
      image_url: imageUrl,
      prompt: sanitizedPrompt,
      credit: `Photo by ${photo.photographer} on Pexels`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return jsonSuccess(generatePlaceholderSVG(sanitizedPrompt), sanitizedPrompt, 'Pexels request failed');
  }
}

function jsonSuccess(imageUrl: string, prompt: string, note?: string) {
  return new Response(JSON.stringify({
    success: true,
    image_url: imageUrl,
    prompt,
    ...(note ? { note } : {}),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Extract meaningful search terms from an AI prompt */
function extractSearchTerms(prompt: string): string {
  // Remove common AI prompt fluff, keep the subject
  return prompt
    .replace(/generate|create|make|design|draw|paint|render|high[- ]quality|beautiful|stunning|professional|realistic|detailed|image of|picture of|photo of|illustration of/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || prompt.slice(0, 80);
}

/** Encode a string to base64 safely (supports Unicode in Edge runtime) */
function safeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1] ?? 0, b2 = bytes[i + 2] ?? 0;
    result += chars[b0 >> 2] + chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < bytes.length ? chars[b2 & 63] : '=';
  }
  return result;
}

/** Generate a styled placeholder SVG */
function generatePlaceholderSVG(prompt: string): string {
  const label = prompt.length > 50 ? prompt.slice(0, 47) + '...' : prompt;
  const escaped = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#16213e"/></linearGradient></defs>
    <rect width="512" height="512" rx="16" fill="url(#bg)"/>
    <circle cx="256" cy="200" r="60" fill="none" stroke="#4a4a8a" stroke-width="2" stroke-dasharray="8 4"/>
    <text x="256" y="205" text-anchor="middle" fill="#7c7cb0" font-family="system-ui,sans-serif" font-size="48">&#x1F3A8;</text>
    <text x="256" y="310" text-anchor="middle" fill="#e0e0e0" font-family="system-ui,sans-serif" font-size="16" font-weight="600">Image Placeholder</text>
    <text x="256" y="340" text-anchor="middle" fill="#888" font-family="system-ui,sans-serif" font-size="12">${escaped}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${safeBase64(svg)}`;
}
