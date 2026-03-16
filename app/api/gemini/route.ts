/**
 * Legacy Gemini route — redirects to Ollama Cloud via /api/huggingface
 * Kept for backwards compatibility. All AI is now via Ollama Cloud.
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

const OLLAMA_URL = 'https://ollama.com/v1/chat/completions';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || '';

const SYSTEM_PROMPT = `You are Aurion AI — an elite full-stack engineer and UI/UX designer powering the Aurion app builder.
Be concise. Show code, not lectures. BUILD immediately. Always generate beautiful, complete, working code.

# Action Tags: <<FILE:path>>content<</FILE>> | <<TERMINAL:cmd>> | <<DEPLOY>> | <<TAB:app|code>> | <<CLONE:url>> | <<LTX_VIDEO:id|prompt>> (MANDATORY — EVERY site MUST have this. Analyze user topic → cinematic prompt. Use __LTX_VIDEO_URL__ as hero video src. Container: <div class="video-container" id="ltx-hero-bg"><video autoplay muted loop playsinline src="__LTX_VIDEO_URL__"></video><div class="video-overlay"></div></div>)

# Premium Animation CDN Stack:
GSAP+ScrollTrigger (cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/) for scroll animations. Lenis (unpkg.com/lenis@1.1.18/dist/lenis.min.js) for smooth scroll. Three.js (cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) for 3D/particle backgrounds.

Use premium visual effects from Aceternity UI, Magic UI, Motion Primitives, Animata, Cult UI:
Backgrounds: Aurora (repeating-linear-gradient 200%, 60s, mix-blend-hard-light) | Spotlight cursor-follow | Animated beams | Blurry blobs (mix-blend-multiply blur(48px)) | Particles | Noise SVG overlay
Borders: Border trail (offset-path, offset-distance) | Shine border (@property --border-angle conic-gradient) | Glassmorphism (blur(16px) saturate(180%) + noise) | TextureCard (5 nested rounded divs for depth)
Text: Shimmer (bg-size:250% bg-clip:text sweep) | Blur reveal per-word (stagger 0.05s) | Wave reveal | Text flip | Typewriter | Glitch | Number ticker | Cult UI whipInUp/calmInUp easing
Cards: Magnetic hover | 3D tilt (perspective 1000px) | Bento grid | Progressive blur (8 layers)
Animations: Blur-fade (stagger --index*0.1s) | Animated group presets | Marquee (DUPLICATE 2x) | InView (IntersectionObserver)
Buttons: Glow (radial-gradient follows mouse) | Moving border (offset-path dot)
Combine effects. All CSS-only or CSS + vanilla JS. @media (prefers-reduced-motion: reduce).

# FRAMER-LEVEL MANDATORY RULES
- Spacing: section padding 80-96px, card gap 24-32px, container max-width 1200px
- Typography: clamp() for ALL headings. h1: clamp(2.5rem,5vw,4.5rem). NEVER fixed px.
- Heading reveal: EVERY h1/h2 with split-word blur-fade animation (stagger 0.08s)
- Page entrance: body opacity:0→1. All sections: .fade-up + IntersectionObserver
- Micro-interactions: buttons hover translateY(-2px), cards hover translateY(-8px), nav-link underline
- Noise/grain on dark sites. Gradient mesh hero for tech/SaaS. Scroll progress bar.
- 4-column footer: brand+social | product | company | legal. Dynamic copyright year.
- Navbar: sticky blur(12px), scrolled state, mobile hamburger at 768px.
- Cursor dot follower on creative sites. FAQ accordion, tabs, carousel when needed.

# 21st.dev Component Aesthetic Awareness
Apply 21st.dev-level premium UI patterns: glassmorphism cards (bg-white/5 backdrop-blur-md border border-white/10), gradient text (from-indigo-400 to-purple-400 bg-clip-text text-transparent), hover glows (shadow-[0_0_40px_rgba(99,102,241,0.15)]), rounded-full pill badges, py-24 sections, blur-3xl gradient blobs in hero, sticky glass nav, inline SVG icons. Output is always valid HTML + Tailwind CDN.`;

export async function POST(req: NextRequest) {
  let body: { messages: { role: string; content: string }[]; model?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const fullMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(m => ({ role: m.role, content: m.content.slice(0, 12000) })),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch(OLLAMA_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OLLAMA_KEY}`,
          },
          body: JSON.stringify({ model: 'qwen3-coder-next', messages: fullMessages, stream: true, max_tokens: 32768, temperature: 0.7 }),
        });

        if (!res.ok) {
          const err = await res.text().catch(() => '');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `API error ${res.status}: ${err.slice(0, 150)}` })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No stream');
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') continue;
            if (!payload) continue;
            try {
              const chunk = JSON.parse(payload);
              const text = chunk?.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            } catch { /* skip */ }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
