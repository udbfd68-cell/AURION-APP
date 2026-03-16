/**
 * LTX Video API Route — AI Video Generation for Aurion Sites
 * 
 * Generates videos via LTX API (text-to-video, image-to-video)
 * Used to create video backgrounds, hero videos, and visual assets
 * for sites built by Aurion.
 * 
 * API: https://api.ltx.video/v1/text-to-video
 * Docs: https://docs.ltx.video
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

const LTX_API_BASE = 'https://api.ltx.video/v1';

export async function POST(req: NextRequest) {
  const apiKey = process.env.LTX_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'LTX_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    prompt: string;
    mode?: 'text-to-video' | 'image-to-video';
    image_uri?: string;
    model?: string;
    duration?: number;
    resolution?: string;
    fps?: number;
    camera_motion?: string;
    generate_audio?: boolean;
  };

  try {
    body = await req.json();
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

    // LTX returns MP4 binary directly — stream it to frontend as binary
    // Frontend converts to Blob URL instead of base64 data URL (avoids OOM on large videos)
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
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: `LTX generation failed: ${msg}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
