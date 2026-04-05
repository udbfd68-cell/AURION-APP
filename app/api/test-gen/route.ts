/**
 * AI Test Generation Route
 *
 * Takes source code and generates comprehensive tests using AI.
 * Supports: Unit tests (Vitest), E2E tests (Playwright), Component tests.
 * Uses Ollama Cloud (same as HF route) for generation.
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

const OLLAMA_URL = 'https://ollama.com/v1/chat/completions';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || '';

const TEST_SYSTEM_PROMPT = `You are an expert test engineer. Generate comprehensive, production-quality tests for the given code.

# Rules:
- Generate COMPLETE, runnable test files — never truncate or leave TODOs
- Use the specified test framework (Vitest, Playwright, or vanilla JS)
- Cover: happy path, edge cases, error handling, boundary conditions
- Use descriptive test names that explain the expected behavior
- Group related tests with describe blocks
- Include setup/teardown when needed
- For UI tests: test user interactions, visual states, accessibility
- For API tests: test request/response, error codes, validation
- For utility tests: test pure functions, edge cases, type coercion

# Output Format:
Return ONLY the test code wrapped in a single code block. No explanations before or after.

\`\`\`[language]
// test code here
\`\`\``;

export async function POST(req: NextRequest) {
  try {
    const { code, fileName, framework, language } = await req.json();

    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'Missing source code' }, { status: 400 });
    }

    const fw = framework || 'vitest';
    const lang = language || 'typescript';

    const userPrompt = `Generate ${fw} tests for this ${lang} code:\n\nFile: ${fileName || 'unknown'}\n\n\`\`\`${lang}\n${code.slice(0, 15000)}\n\`\`\`\n\nGenerate comprehensive tests covering all functions, edge cases, and error scenarios.`;

    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen3-coder-next',
        messages: [
          { role: 'system', content: TEST_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        max_tokens: 65536,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return Response.json({ error: `AI error ${res.status}: ${err.slice(0, 200)}` }, { status: res.status });
    }

    // Stream response through
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader();
        if (!reader) { controller.close(); return; }
        const decoder = new TextDecoder();
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
              if (payload === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                break;
              }
              try {
                const d = JSON.parse(payload);
                const text = d.choices?.[0]?.delta?.content || '';
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch { continue; }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
