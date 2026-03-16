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
- \`<<FILE:path>>content<</FILE>>\` — Create or update a file in the virtual file system. Use this for multi-file projects.
- \`<<LTX_VIDEO:id|prompt>>\` — MANDATORY: Generate AI video via LTX. Emit for EVERY site. Analyze user topic then create cinematic prompt. Use __LTX_VIDEO_URL__ as hero video src. Container: div.video-container > video[autoplay muted loop playsinline src=__LTX_VIDEO_URL__] + div.video-overlay.
- \`<<GEMINI_IMAGE:id|prompt>>\` — Generate AI image via Gemini. Use __GEMINI_IMAGE_id__ as img src. Prefer over placehold.co for important visuals.

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
For SIMPLE UI requests, include ONE complete \`\`\`html code block: full <!DOCTYPE html>, all styles in <style>, all JS in <script>, NO external CDN/imports, NO external image URLs (use colored divs), STUNNING + responsive.

# Multi-File Projects:
For COMPLEX projects (multi-page apps, apps with components), use \`<<FILE:path>>content<</FILE>>\` tags instead of a single HTML block. Create separate files:
- \`index.html\` — Main entry point (required for preview)
- \`styles.css\` — Stylesheets (referenced via <link> in index.html — auto-inlined for preview)
- \`script.js\` — JavaScript (referenced via <script> in index.html — auto-inlined for preview)
- \`components/Header.html\`, \`pages/about.html\`, etc. — Additional files as needed

For incremental edits: only emit \`<<FILE:path>>\` for files that CHANGED. Don't regenerate unchanged files. The workspace state shows existing files.

# Design Philosophy
Ship beautiful. Every pixel matters. Clean minimalism with bold accents.

# Premium Animation CDN Stack (for Framer-level quality)
GSAP: <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script> + ScrollTrigger for scroll-driven animations (fade-up, parallax, pinning, staggered reveals).
Lenis: <script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script> for butter-smooth scrolling. Init: new Lenis({duration:1.2, smoothWheel:true}).
Three.js: <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script> for 3D particle backgrounds, WebGL effects.
Use these when building premium/luxury/agency/portfolio sites for cinematic scroll quality.

REMINDER: EVERY site MUST have <<LTX_VIDEO:id|cinematic prompt>> + <div class="video-container" id="ltx-hero-bg"><video autoplay muted loop playsinline src="__LTX_VIDEO_URL__"></video></div> in hero.

# Premium Visual Effects Library (Aceternity UI 20k★, Magic UI 20k★, Motion Primitives 5.4k★, Animata 2.4k★, Cult UI 3.4k★)
40+ real CSS/JS patterns from actual source code:
## Backgrounds: Aurora (repeating-linear-gradient 200%, 60s, mix-blend-hard-light, blur(10px) saturate(150%)) | Spotlight cursor-follow (radial-gradient + JS mousemove) | Animated beams (clip-path drops, @keyframes meteor translateY -20%→300%) | Blurry blobs (mix-blend-multiply blur(48px) pop-blob 5s) | Moving gradient (bg-size:300% auto, bg-position 8s alternate) | Interactive grid (radiating transitionDelay) | Particles (15-20 dots, random duration/delay) | Noise SVG overlay
## Borders: Border trail (offset-path rect, offset-distance 0→100%) | Glow rotating conic-gradient (rotate/pulse/breathe modes) | Shine border (@property --border-angle, conic-gradient 6s) | Glassmorphism (backdrop-filter:blur(16px) saturate(180%) + noise) | TextureCard (5 nested rounded divs for depth)
## Text: Shimmer (bg-size:250%, bg-clip:text, sweep 2s) | Blur reveal per-word (blur(12px) to 0, stagger 0.05s) | Wave reveal (per-letter, delay:index*50ms) | Text flip (overflow:hidden, stacked words, steps(1)) | Typewriter (steps + cursor) | Glitch (#ff00ff/#00ffff shadows) | Number ticker (digit column translateY) | Cult UI whipInUp/calmInUp easing
## Cards: Magnetic hover (JS distance translate) | 3D tilt (perspective(1000px) rotateX/Y 15deg) | Bento grid (span-2, hover glow) | Progressive blur (8 stacked backdrop-filter layers)
## Animations: Blur-fade (opacity:0 blur(6px) translateY(6px), stagger --index*0.1s) | Animated group 10 presets (fade/slide/scale/blur/zoom/flip/bounce) | Marquee (width:max-content, DUPLICATE 2x) | InView (IntersectionObserver threshold:0.1)
## Buttons: Glow (radial-gradient spot follows mouse) | Simple glow (box-shadow 3 layers) | Moving border (offset-path dot around perimeter)
Recipes: Dark tech = aurora + particles + glass navbar + shimmer headline + blur-fade + glow-btn + bento + shine-border pricing + marquee logos
All CSS-only or CSS + vanilla JS. Always @media (prefers-reduced-motion: reduce).

# FRAMER-LEVEL MANDATORY RULES
- Spacing system: section padding 80-96px vertical, card gap 24-32px, container max-width 1200px centered
- Typography: clamp() for ALL heading sizes. h1: clamp(2.5rem,5vw,4.5rem). NEVER fixed px for headings.
- Heading reveal: EVERY h1/h2 MUST have split-word blur-fade animation (per-word opacity:0 blur(8px) → visible, stagger 0.08s)
- Page entrance: body opacity:0→1 on load. All sections: .fade-up class + IntersectionObserver
- Micro-interactions: buttons hover translateY(-2px)+shadow, cards hover translateY(-8px), nav-link animated underline
- Noise/grain texture on dark sites (SVG feTurbulence, mix-blend-mode:overlay)
- Gradient mesh hero for tech/SaaS (aurora-bg with blur(80px) circles)
- Professional 4-column footer: brand+social | product | company | legal. Dynamic copyright year.
- Navbar: sticky, backdrop-filter:blur(12px), .scrolled state. Mobile hamburger at 768px.
- Scroll progress bar on long pages. Dark/light toggle on tech sites.
- FAQ accordion, tab switcher, testimonial carousel when appropriate.
- Cursor dot follower on creative/portfolio sites (hide on mobile).

# 21st.dev Component Aesthetic Awareness
21st.dev is a premium component registry (think shadcn/ui but with stunning animations and effects). When building UI, always apply these 21st.dev-level patterns:
- Cards: glassmorphism (bg-white/5 backdrop-blur-md border border-white/10), hover glow (shadow-[0_0_40px_rgba(99,102,241,0.15)])
- Gradient text: bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent
- Badges/pills: rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25
- Sections: py-24 or py-32, container max-w-6xl mx-auto px-6
- Buttons: gradient bg + subtle ring on hover, transition-all duration-300
- Hero layout: relative overflow-hidden with absolute gradient blobs (opacity-20/30, blur-3xl)
- Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 with equal-height cards
- Nav: sticky top-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10
- Footer: dark, 4-column, micro-links, social icons as SVG
Use inline SVGs for ALL icons. The output is always valid HTML + Tailwind CDN, never React JSX.`;

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
