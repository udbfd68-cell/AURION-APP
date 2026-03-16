/**
 * Clone API Route — Expert Website Cloning with AI
 * 
 * Integrates techniques from:
 * - https://github.com/firecrawl/firecrawl (Firecrawl v2 scraping data)
 * - https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools (v0 + Same.dev prompts)
 * - https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (Design system intelligence)
 * 
 * Gemini or Anthropic based on selected model.
 * Uses expert-level system prompt derived from v0.dev, Same.dev, and UI/UX Pro Max.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { EXPERT_CLONE_SYSTEM_PROMPT, buildClonePrompt, type ClonePromptData } from '@/lib/system-prompts';
import { detectIndustry, generateDesignContext, UX_GUIDELINES, PRE_DELIVERY_CHECKLIST } from '@/lib/ui-ux-pro-max';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export const runtime = 'edge';

async function fetchScreenshotAsBase64(screenshot: string): Promise<string> {
  let base64Data = screenshot;
  if (screenshot.startsWith('http')) {
    const imgRes = await fetch(screenshot, { signal: AbortSignal.timeout(8000) });
    if (imgRes.ok) {
      const buf = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      base64Data = btoa(binary);
    } else {
      base64Data = '';
    }
  }
  return base64Data;
}

// Build the full system prompt combining all sources
const FULL_SYSTEM_PROMPT = [
  EXPERT_CLONE_SYSTEM_PROMPT,
  UX_GUIDELINES,
  PRE_DELIVERY_CHECKLIST,
  '\nIMPORTANT: You MUST include Google Fonts @import for any detected font. Use the EXACT fonts from the source.',
  'CRITICAL: Your output starts with <!DOCTYPE html> and ends with </html>. Nothing else.',
].join('\n');

async function streamWithGemini(
  apiKey: string,
  systemPrompt: string,
  textPrompt: string,
  screenshot: string | null,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  });

  // Build multimodal parts if screenshot available
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (screenshot) {
    try {
      const base64Data = await fetchScreenshotAsBase64(screenshot);
      if (base64Data) {
        parts.push({ inlineData: { mimeType: 'image/png', data: base64Data } });
      }
    } catch { /* continue without screenshot */ }
  }

  parts.push({ text: textPrompt });

  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts }],
  });

  let gotContent = false;
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      gotContent = true;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
    }
  }
  if (!gotContent) throw new Error('Empty response from Gemini');
}

async function streamWithAnthropic(
  apiKey: string,
  systemPrompt: string,
  textPrompt: string,
  screenshot: string | null,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  modelId: string,
) {
  const contentParts: { type: string; source?: { type: string; media_type: string; data: string }; text?: string }[] = [];

  if (screenshot) {
    try {
      const base64Data = await fetchScreenshotAsBase64(screenshot);
      if (base64Data) {
        const b64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: b64 },
        });
      }
    } catch { /* continue without screenshot */ }
  }

  contentParts.push({ type: 'text', text: textPrompt });

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: contentParts }],
      stream: true,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic API error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream');
  const decoder = new TextDecoder();

  let buffer = '';
  let gotContent = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;
      let event;
      try { event = JSON.parse(payload); } catch { continue; }
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const text = event.delta.text;
        if (text) {
          gotContent = true;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      } else if (event.type === 'message_stop') {
        break;
      }
    }
  }
  if (!gotContent) throw new Error('Empty response from Anthropic');
}

export async function POST(req: NextRequest) {
  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let body: {
    url: string;
    html?: string;
    rawHtml?: string;
    model?: string;
    tokens?: { colors: string[]; fonts: string[]; cssVariables?: Record<string, string>; gradients?: string[]; shadows?: string[]; borderRadii?: string[]; mediaQueries?: string[]; keyframes?: string[] };
    branding?: ClonePromptData['branding'];
    screenshot?: string | null;
    pageName?: string;
    navigation?: Array<{ text: string; href: string }>;
    images?: Array<{ src: string; alt: string; width?: string; height?: string }>;
    styleBlocks?: string;
    linkedResources?: { stylesheets: string[]; fonts: string[] };
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { url, html, rawHtml, tokens, branding, screenshot, pageName, navigation, images, styleBlocks, linkedResources, model: requestedModel } = body;

  // Determine provider from model
  const isAnthropic = requestedModel?.startsWith('claude-');
  const providerKey = isAnthropic ? anthropicKey : geminiKey;

  if (!providerKey) {
    const missingVar = isAnthropic ? 'ANTHROPIC_API_KEY' : 'GOOGLE_AI_API_KEY';
    return new Response(JSON.stringify({ error: `${missingVar} not configured` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Detect industry and generate design context (UI/UX Pro Max)
  const industry = detectIndustry(url, html || '');
  const designContext = generateDesignContext(industry);

  // Build the enhanced system prompt with industry context
  const systemPrompt = FULL_SYSTEM_PROMPT + designContext;

  // Build enrichment sections for the prompt
  const enrichmentSections: string[] = [];

  if (navigation && navigation.length > 0) {
    enrichmentSections.push(
      '## NAVIGATION ITEMS (exact text & links):\n' +
      navigation.map(n => `- "${n.text}" → ${n.href}`).join('\n')
    );
  }

  if (images && images.length > 0) {
    enrichmentSections.push(
      '## IMAGE INVENTORY:\n' +
      images.map(i => `- src="${i.src}" alt="${i.alt}"${i.width ? ` ${i.width}x${i.height}` : ''}`).join('\n') +
      '\nUse https://placehold.co for placeholder images with correct dimensions.'
    );
  }

  if (linkedResources?.fonts && linkedResources.fonts.length > 0) {
    enrichmentSections.push(
      '## FONT RESOURCES (must @import these):\n' +
      linkedResources.fonts.map(f => `- ${f}`).join('\n')
    );
  }

  if (styleBlocks) {
    enrichmentSections.push(
      '## EXTRACTED CSS STYLES (replicate these exactly):\n```css\n' +
      styleBlocks.slice(0, 10000) + '\n```'
    );
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

  // Build the user prompt with all scraped data using system-prompts library
  const basePrompt = buildClonePrompt({
    url,
    html,
    rawHtml,
    screenshot: null, // screenshot is sent as image part for Gemini, not in text
    branding,
    designTokens: tokens ? {
      colors: tokens.colors,
      fonts: tokens.fonts,
      cssVariables: tokens.cssVariables || {},
    } : undefined,
    pageName,
  });

  // Combine base prompt with enrichment data
  const textPrompt = enrichmentSections.length > 0
    ? basePrompt + '\n\n' + enrichmentSections.join('\n\n')
    : basePrompt;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (isAnthropic && anthropicKey) {
          const modelName = requestedModel || 'claude-opus-4-5-20250514';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model: modelName })}\n\n`));
          await streamWithAnthropic(anthropicKey, systemPrompt, textPrompt, screenshot ?? null, controller, encoder, modelName);
        } else if (geminiKey) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model: 'gemini-2.0-flash' })}\n\n`));
          await streamWithGemini(geminiKey, systemPrompt, textPrompt, screenshot ?? null, controller, encoder);
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No AI API key configured' })}\n\n`));
          controller.close();
          return;
        }
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : 'Clone failed';
        const provider = isAnthropic ? 'Anthropic' : 'Gemini';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `${provider}: ${raw}` })}\n\n`));
        controller.close();
        return;
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
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
