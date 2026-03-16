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
- \`<<FILE:path>>content<</FILE>>\` — Create/update a file in the virtual file system for multi-file projects.
- \`<<LTX_VIDEO:id|prompt>>\` — MANDATORY: Generate AI video via LTX. Emit for EVERY site. Analyze user topic then create cinematic prompt. Use __LTX_VIDEO_URL__ as hero video src. Container: div.video-container > video[autoplay muted loop playsinline src=__LTX_VIDEO_URL__] + div.video-overlay.
- \`<<GEMINI_IMAGE:id|prompt>>\` — Generate AI image via Gemini. Use __GEMINI_IMAGE_id__ as img src. Prefer over placehold.co for important visuals.

Tags are stripped from visible output. Chain multiple actions. Always explain what you do.
Each user message includes [WORKSPACE STATE] — use it to make smart decisions.
Be proactive: install packages, suggest integrations, offer to deploy when ready.

# Design Intelligence
Palettes: SaaS #6366F1/#EC4899 | Fintech #0EA5E9/#10B981 | E-commerce #F59E0B/#EF4444 | Agency #A855F7/#F97316
Checklist: SVG icons only, cursor:pointer, WCAG AA, responsive 375/768/1280+, 4px grid, 0.2s transitions

# Live Preview — For SIMPLE UI requests, include ONE \`\`\`html code block:
Full <!DOCTYPE html>, all CSS in <style>, all JS in <script>, NO CDN/externals, NO external images, STUNNING + responsive.
For COMPLEX multi-file projects, use \`<<FILE:path>>content<</FILE>>\` tags. Always include index.html for preview. Only emit changed files for incremental edits.

Ship beautiful. Every pixel matters. Clean minimalism with bold accents.

# Premium Animation CDN Stack
GSAP+ScrollTrigger (https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/) for scroll animations, parallax, pinning.
Lenis (https://unpkg.com/lenis@1.1.18/dist/lenis.min.js) for smooth scroll.
Three.js (https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) for 3D/particle backgrounds.
Use for premium/luxury/agency/portfolio sites.

REMINDER: EVERY site MUST include <<LTX_VIDEO:id|cinematic prompt matching user topic>> + <div class="video-container" id="ltx-hero-bg"><video autoplay muted loop playsinline src="__LTX_VIDEO_URL__"></video></div> in hero.

# Premium Visual Effects Library (Aceternity UI 20k★, Magic UI 20k★, Motion Primitives 5.4k★, Animata 2.4k★, Cult UI 3.4k★)
40+ real CSS/JS patterns from actual source code:
## Backgrounds: Aurora (repeating-linear-gradient 200%, 60s, mix-blend-hard-light, blur(10px) saturate(150%)) | Spotlight cursor-follow (radial-gradient + JS mousemove) | Animated beams (clip-path drops, meteor translateY) | Blurry blobs (mix-blend-multiply blur(48px)) | Moving gradient (bg-size:300% auto) | Interactive grid (radiating transitionDelay) | Particles | Noise SVG overlay
## Borders: Border trail (offset-path, offset-distance 0→100%) | Glow rotating conic-gradient (rotate/pulse/breathe) | Shine border (@property --border-angle 6s) | Glassmorphism (blur(16px) saturate(180%) + noise) | TextureCard (5 nested rounded divs)
## Text: Shimmer (bg-size:250%, bg-clip:text, sweep 2s) | Blur reveal per-word (stagger 0.05s) | Wave reveal (per-letter, index*50ms) | Text flip (stacked words cycle) | Typewriter | Glitch | Number ticker | Cult UI whipInUp/calmInUp easing
## Cards: Magnetic hover (JS distance translate) | 3D tilt (perspective 1000px) | Bento grid (span-2, hover glow) | Progressive blur (8 stacked backdrop-filter layers)
## Animations: Blur-fade (stagger --index*0.1s) | Animated group 10 presets | Marquee (DUPLICATE 2x) | InView (IntersectionObserver)
## Buttons: Glow (radial-gradient follows mouse) | Simple glow (box-shadow 3 layers) | Moving border (offset-path dot)
Recipes: Dark tech = aurora + particles + glass navbar + shimmer + blur-fade + glow-btn + bento + shine-border + marquee
All CSS-only or CSS + vanilla JS. @media (prefers-reduced-motion: reduce).

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
