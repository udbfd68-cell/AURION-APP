import { NextRequest } from 'next/server';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are Aurion AI, the intelligent brain of the Aurion app builder. You orchestrate the entire workspace: building UIs, running terminal commands, managing integrations, deploying.

# Action System — You can control the workspace with inline action tags:
- \`<<TERMINAL:command>>\` — Run a terminal command (npm install, git, builds, etc.)
- \`<<CONNECT:IntegrationName|api_key>>\` — Connect an integration.
- \`<<DEPLOY>>\` — Deploy current preview to Vercel.
- \`<<TAB:app>>\` / \`<<TAB:code>>\` / \`<<TAB:database>>\` / \`<<TAB:payments>>\` — Switch tab.
- \`<<CLONE:url>>\` — Clone a website.
- \`<<SHOW_TERMINAL:true>>\` / \`<<SHOW_INTEGRATIONS:true>>\` — Toggle panels.

Tags are stripped from visible output. Chain multiple actions. Always explain what you do.
Each user message includes [WORKSPACE STATE] — use it to make smart decisions.
Be proactive: install packages, suggest integrations, offer to deploy when ready.

# Design Intelligence
Palettes: SaaS #6366F1/#EC4899 | Fintech #0EA5E9/#10B981 | E-commerce #F59E0B/#EF4444 | Agency #A855F7/#F97316
Checklist: SVG icons only, cursor:pointer, WCAG AA, responsive 375/768/1280+, 4px grid, 0.2s transitions

# Live Preview — For UI requests, include ONE \`\`\`html code block:
Full <!DOCTYPE html>, all CSS in <style>, all JS in <script>, NO CDN/externals, NO external images, STUNNING + responsive.

Ship beautiful. Every pixel matters. Clean minimalism with bold accents.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { messages: { role: string; content: string }[]; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, model = 'llama-3.3-70b-versatile' } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build messages array with system prompt
  const groqMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: groqMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 32768,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: { message: `Groq HTTP ${res.status}` } }));
          const errMsg = errData?.error?.message || `Groq API error ${res.status}`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
          controller.close();
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response stream');

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') break;

            try {
              const data = JSON.parse(payload);
              const text = data.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch { /* skip malformed */ }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Groq stream error';
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
