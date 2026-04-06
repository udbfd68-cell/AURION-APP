/**
 * LTX Video API Route â€” AI Video Generation for Aurion Sites
 * 
 * Generates videos via LTX API (text-to-video, image-to-video)
 * Used to create video backgrounds, hero videos, and visual assets
 * for sites built by Aurion.
 * 
 * API: https://api.ltx.video/v1/text-to-video
 * Docs: https://docs.ltx.video
 */

import { NextRequest } from 'next/server';
import { ltxSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const LTX_API_BASE = 'https://api.ltx.video/v1';

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.heavy);
  if (rateLimitError) return rateLimitError;

  const apiKey = process.env.LTX_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'LTX_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: ReturnType<typeof ltxSchema.parse>;

  try {
    body = ltxSchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    prompt,
    mode = 'text-to-video',
    image_uri,
    model = 'ltx-2-3-fast',
    duration = 6,
    resolution = '1920x1080',
    fps = 24,
    camera_motion,
    generate_audio = false,
  } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.length === 0) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Sanitize prompt length
  const sanitizedPrompt = prompt.slice(0, 5000);

  // Build endpoint URL
  const endpoint = mode === 'image-to-video'
    ? `${LTX_API_BASE}/image-to-video`
    : `${LTX_API_BASE}/text-to-video`;

  // Build request body
  const requestBody: Record<string, unknown> = {
    prompt: sanitizedPrompt,
    model,
    duration,
    resolution,
    fps,
    generate_audio,
  };

  if (camera_motion) {
    requestBody.camera_motion = camera_motion;
  }

  if (mode === 'image-to-video' && image_uri) {
    requestBody.image_uri = image_uri;
  }

  try {
    // Check if LTX API key has credits by doing an initial request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(300000), // 5 min timeout for video generation
    });

    if (!response.ok) {
      // On 402 (no credits) or other errors, return a placeholder instead of failing
      if (response.status === 402 || response.status === 429 || response.status >= 500) {
        const placeholderSvg = generateVideoPlaceholder(sanitizedPrompt, resolution);
        return new Response(JSON.stringify({
          success: true,
          video_url: placeholderSvg,
          placeholder: true,
          prompt: sanitizedPrompt,
          note: response.status === 402
            ? 'LTX credits required â€” placeholder generated'
            : `LTX API returned ${response.status} â€” placeholder generated`,
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Video-Duration': String(duration),
            'X-Video-Resolution': resolution,
          },
        });
      }

      const errorText = await response.text().catch(() => '');
      let errorMessage = `LTX API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson?.error?.message || errorJson?.message || errorMessage;
      } catch {
        if (errorText) errorMessage += ` - ${errorText.slice(0, 200)}`;
      }
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // LTX returns MP4 binary directly â€” stream it to frontend as binary
    const requestId = response.headers.get('x-request-id') || '';

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'X-Request-Id': requestId,
        'X-Video-Duration': String(duration),
        'X-Video-Resolution': resolution,
        'X-Video-Model': model,
      },
    });

  } catch (err: unknown) {
    // On timeout/network error, return placeholder instead of 500
    const placeholderSvg = generateVideoPlaceholder(sanitizedPrompt, resolution);
    return new Response(JSON.stringify({
      success: true,
      video_url: placeholderSvg,
      placeholder: true,
      prompt: sanitizedPrompt,
      note: `Generation failed (${err instanceof Error ? err.message : 'Unknown'}), placeholder generated`,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Video-Duration': String(duration),
        'X-Video-Resolution': resolution,
      },
    });
  }
}

/** Encode a string to base64 safely (supports Unicode/emojis in Edge runtime) */
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

/** Generate a styled SVG placeholder for video when LTX is unavailable */
function generateVideoPlaceholder(prompt: string, resolution: string): string {
  const [w, h] = resolution.split('x').map(Number);
  const width = w || 1920;
  const height = h || 1080;
  const label = prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt;
  const escaped = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="vbg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f0c29"/><stop offset="50%" stop-color="#302b63"/><stop offset="100%" stop-color="#24243e"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#vbg)"/>
    <text x="${width/2}" y="${height/2 - 20}" text-anchor="middle" fill="#e0e0e0" font-family="system-ui,sans-serif" font-size="24" font-weight="600">&#x1F3AC; Video Placeholder</text>
    <text x="${width/2}" y="${height/2 + 20}" text-anchor="middle" fill="#888" font-family="system-ui,sans-serif" font-size="14">${escaped}</text>
    <text x="${width/2}" y="${height - 30}" text-anchor="middle" fill="#555" font-family="system-ui,sans-serif" font-size="11">LTX credits required for real video generation</text>
  </svg>`;
  return `data:image/svg+xml;base64,${safeBase64(svg)}`;
}
