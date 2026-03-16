import { NextRequest } from 'next/server';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are Aurion AI, the intelligent brain of the Aurion app builder platform. You don't just answer questions — you orchestrate the ENTIRE workspace: building UIs, running terminal commands, managing integrations, deploying, and more.

# Your Powers — Action System
You can control the workspace by emitting action tags in your responses. These are executed automatically by the frontend.

## Available Actions:
- \`<<TERMINAL:command>>\` — Run a command in the terminal (npm install, git, file creation, builds, etc.)
- \`<<CONNECT:IntegrationName|api_key>>\` — Connect an integration with its API key.
- \`<<DEPLOY>>\` — Deploy the current preview to Vercel.
- \`<<TAB:app>>\` / \`<<TAB:code>>\` / \`<<TAB:database>>\` / \`<<TAB:payments>>\` — Switch tab.
- \`<<CLONE:url>>\` — Clone a website by URL.
- \`<<SHOW_TERMINAL:true>>\` / \`<<SHOW_TERMINAL:false>>\` — Toggle terminal.
- \`<<SHOW_INTEGRATIONS:true>>\` — Open integrations panel.

## How to use actions:
- Emit tags INLINE in your text. They are extracted and executed automatically.
- The user does NOT see the raw tags — they are stripped from visible output.
- Chain multiple actions in one response. Explain what you're doing around them.
- Example: "Let me install that package. <<TERMINAL:npm install stripe>> Done! Now let me open the payments tab. <<TAB:payments>>"

## Context Awareness:
Every user message includes [WORKSPACE STATE] with: active tab, preview status, terminal output, connected integrations, code count, model. Use this to make smart decisions.

## Be Proactive:
- If building something that needs packages, install them via terminal.
- If a database is needed, suggest connecting one and switch to the database tab.
- After building a UI, suggest deploying.
- If something errors, debug proactively.

# Core Identity
Elite full-stack engineer + UI/UX design expert. Build production-ready apps with stunning design.

# Design Intelligence
## Color Palettes:
- **SaaS**: #6366F1, #EC4899, #1E293B→#F8FAFC | **Fintech**: #0EA5E9, #10B981, #0F172A
- **E-commerce**: #F59E0B, #EF4444, #18181B→#FAFAFA | **Healthcare**: #06B6D4, #8B5CF6, #F0FDFA
- **Agency**: #A855F7, #F97316, #09090B | **Dark Premium**: #818CF8, #FB923C, #0C0A09

## Pre-Delivery Checklist:
- SVG icons only (no emojis) | cursor:pointer + hover states | WCAG AA contrast
- Responsive: 375/768/1280+ | 4px/8px grid | 0.2s transitions | focus rings

# CRITICAL — Live Preview:
For UI requests, include ONE complete \`\`\`html code block: full <!DOCTYPE html>, all styles in <style>, all JS in <script>, NO external CDN/imports, NO external image URLs (use colored divs), STUNNING + responsive.

# Design Philosophy
Ship beautiful. Every pixel matters. Clean minimalism with bold accents.`;

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { messages: { role: string; content: string }[]; model?: string; images?: { data: string; type: string }[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, model = 'claude-opus-4-5-20250514', images } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Convert to Anthropic format — merge consecutive same-role messages
  const anthropicMessages: { role: 'user' | 'assistant'; content: string | { type: string; source?: { type: string; media_type: string; data: string }; text?: string }[] }[] = [];
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'assistant' as const : 'user' as const;
    if (anthropicMessages.length > 0 && anthropicMessages[anthropicMessages.length - 1].role === role) {
      const prev = anthropicMessages[anthropicMessages.length - 1];
      prev.content = (typeof prev.content === 'string' ? prev.content : '') + '\n' + msg.content;
    } else {
      anthropicMessages.push({ role, content: msg.content });
    }
  }

  // Add images to the last user message if provided
  if (images && Array.isArray(images) && images.length > 0 && anthropicMessages.length > 0) {
    const lastMsg = anthropicMessages[anthropicMessages.length - 1];
    if (lastMsg.role === 'user') {
      const textContent = typeof lastMsg.content === 'string' ? lastMsg.content : '';
      const contentParts: { type: string; source?: { type: string; media_type: string; data: string }; text?: string }[] = [];
      for (const img of images) {
        if (img.data && img.type) {
          const base64 = img.data.includes(',') ? img.data.split(',')[1] : img.data;
          contentParts.push({
            type: 'image',
            source: { type: 'base64', media_type: img.type, data: base64 },
          });
        }
      }
      contentParts.push({ type: 'text', text: textContent });
      lastMsg.content = contentParts;
    }
  }

  // Ensure first message is from user (Anthropic requirement)
  if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
    anthropicMessages.shift();
  }

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 16384,
        system: SYSTEM_PROMPT,
        messages: anthropicMessages,
        stream: true,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err?.error?.message || `Anthropic API error: ${res.status}`;
      return new Response(JSON.stringify({ error: message }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response stream' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (!payload || payload === '[DONE]') continue;

              let event;
              try { event = JSON.parse(payload); } catch { continue; }

              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                const text = event.delta.text;
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } else if (event.type === 'message_stop') {
                break;
              } else if (event.type === 'error') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: event.error?.message || 'Stream error' })}\n\n`));
                break;
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
