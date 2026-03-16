import { GoogleGenerativeAI } from '@google/generative-ai';
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' }), {
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

  const { messages, model = 'gemini-2.5-flash', images } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: SYSTEM_PROMPT,
  });

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: msg.content }],
  }));

  // Ensure alternating roles (Gemini API requirement)
  const cleanHistory: typeof history = [];
  for (const entry of history) {
    if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === entry.role) {
      cleanHistory[cleanHistory.length - 1].parts[0].text += '\n' + entry.parts[0].text;
    } else {
      cleanHistory.push({ ...entry, parts: [{ text: entry.parts[0].text }] });
    }
  }

  const lastMessage = messages[messages.length - 1];

  // Build parts for the last message, including images if provided
  const lastParts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
    { text: lastMessage.content },
  ];
  if (images && Array.isArray(images)) {
    for (const img of images) {
      if (img.data && img.type) {
        // Strip data URL prefix: "data:image/png;base64,XXXX" -> "XXXX"
        const base64 = img.data.includes(',') ? img.data.split(',')[1] : img.data;
        lastParts.push({ inlineData: { mimeType: img.type, data: base64 } });
      }
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let result;
        if (cleanHistory.length > 0) {
          const chat = geminiModel.startChat({ history: cleanHistory });
          result = await chat.sendMessageStream(lastParts);
        } else {
          result = await geminiModel.generateContentStream(lastParts);
        }

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : 'Stream error';
        let message = raw;
        if (/403|permission|forbidden/i.test(raw)) {
          message = 'API key invalid or restricted. Check your GOOGLE_AI_API_KEY in Vercel settings.';
        } else if (/50[03]|internal|unavailable/i.test(raw)) {
          message = 'Gemini is temporarily unavailable. Try again shortly.';
        } else if (/quota|rate.?limit|429|exceeded/i.test(raw)) {
          message = 'Too many requests. Please wait a moment and try again.';
        }
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
}
