/**
 * Clone API Route — Expert Website Cloning (Anthropic Methodology Edition)
 * 
 * Uses Ollama Cloud with best coding models + automatic fallback chain
 * Infused with Anthropic Claude's coding methodology:
 * - Professional objectivity & security-first approach
 * - Iterative development patterns
 * - Artifact generation best practices from Claude Opus 4.6
 */

import { NextRequest } from 'next/server';
import { type ClonePromptData, getModelHints } from '@/lib/system-prompts';
import { detectIndustry, generateDesignContext, PREMIUM_UI_PATTERNS, FRAMER_LEVEL_SYSTEM } from '@/lib/ui-ux-pro-max';
import { extractStructuredContent, extractKeyCSS, extractSPAData } from '@/lib/firecrawl';

export const runtime = 'edge';

// ─── Ollama Cloud Config ────────────────────────────────────────────────────
const OLLAMA_URL = 'https://ollama.com/v1/chat/completions';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || '';

// ─── Clone System Prompt — PIXEL-PERFECT REVERSE ENGINEERING ────────────────
// 4-phase methodology: Deep Visual Analysis → Asset Extraction → Code Construction → Quality Control
const CLONE_SYSTEM = `You are an elite frontend reverse-engineer specializing in PIXEL-PERFECT website reproduction. You recreate sites by following a rigorous 4-phase methodology. NEVER simplify, NEVER compromise visual fidelity.

# PHASE 1 — DEEP VISUAL ANALYSIS
Before writing ANY code, mentally analyze the provided data:

1. STRUCTURE: Identify ALL sections in exact order (Navbar, Hero, Features, Testimonials, Pricing, CTA, Footer...). Note the grid (1-col, 2-col, 3-col, asymmetric). Count total sections — you MUST reproduce every single one.

2. COLOR PALETTE: Extract from provided tokens:
   - Background: primary + secondary (dark sites: exact dark hex, ZERO white anywhere)
   - Accent/CTA color (buttons, highlights, links)
   - Text colors: primary, secondary, muted
   - Border and separator colors

3. TYPOGRAPHY: From tokens + font resources:
   - Font families (use exact Google Fonts URLs provided)
   - Sizes per level: h1(48-72px), h2(32-48px), h3(24-32px), body(16-18px), caption(12-14px)
   - Font-weight per element (headings: 600-800, body: 400, buttons: 500-600)
   - Letter-spacing and line-height from CSS patterns

4. SPACING & LAYOUT:
   - Section padding: typically 80px-160px vertical
   - Gap between elements (cards, features): 24px-48px
   - Max-width: usually 1200px or 1440px, centered
   - Lateral margins: 24px mobile, 48px-80px desktop

5. UI COMPONENTS (analyze each individually from CSS patterns):
   - Buttons: exact border-radius (4px/8px/12px/24px/50%), padding, shadow, hover state
   - Cards: border, box-shadow (often multi-layer), radius, inner padding
   - Navbar: height (56-80px), backdrop-filter:blur, sticky/fixed, z-index:1000
   - All hover/transition states: transform, opacity, shadow changes

6. SPECIAL EFFECTS (critical for modern sites):
   - Glassmorphism: backdrop-filter:blur(8-20px) + background:rgba(255,255,255,0.03-0.08)
   - Gradients: exact angles + color stops (linear-gradient, radial-gradient)
   - Complex shadows: multi-layer box-shadow for depth
   - Noise/grain texture: SVG filter or CSS background pattern
   - Scroll animations: fade-in + translateY(20-40px), duration 0.4s-0.8s, ease/ease-out
   - Glow effects: box-shadow with accent color at 20-40% opacity

# PHASE 2 — ASSET USAGE (from enrichment data provided)
The scraper has already extracted all assets. USE THEM:
- :root CSS variables → copy EXACTLY into your :root {}
- Image URLs → use EXACT src, NEVER placeholder URLs
- Video URLs → use in <video> with poster, autoplay, muted, loop
- Font URLs → @import EXACTLY as provided
- Design tokens (colors, shadows, radii, gradients) → use EXACT values

# PHASE 3 — CODE CONSTRUCTION

## OUTPUT FORMAT
- Start IMMEDIATELY with <!DOCTYPE html>. No markdown, no explanation, no preamble.
- End with </html>. Nothing after.
- ONE file: ALL CSS in <style> in <head>. ALL JS in <script> before </body>.
- Use clean semantic classes (.hero, .nav, .card, .features-grid, .footer).
- NEVER use hashed/framework classes (.Flex_root__DOQCW, .css-1a2b3c).

## MANDATORY STRUCTURE
\`\`\`
<!DOCTYPE html>
<html lang="...">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>...</title>
  <!-- Google Fonts @import -->
  <!-- Font Awesome 6 via cdnjs -->
  <style>
    /* CSS Reset */
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    /* :root variables from tokens */
    /* All component styles */
    /* Responsive @media queries */
    /* Animations @keyframes */
  </style>
</head>
<body>
  <!-- ALL sections in exact original order -->
  <script>/* Hamburger menu, scroll animations, interactions */</script>
</body>
</html>
\`\`\`

## FIDELITY RULES — ABSOLUTE
- EXACT hex/rgb/hsl colors from tokens. Zero approximation. Zero invented colors.
- EXACT border-radius values. EXACT box-shadow layers.
- EXACT gradients with same angles and color stops.
- EXACT font families and weights from provided font resources.
- Spacing pixel-perfect from CSS patterns data.
- Recreate animations with correct timings (ease, duration, delay).

## CONTENT — EVERY WORD, EVERY SECTION
- Copy ALL text VERBATIM from STRUCTURED CONTENT MAP and HTML.
- Reproduce EVERY section: nav, hero, features, testimonials, stats, pricing, CTA, footer.
- ALL headings, ALL paragraphs, ALL button labels, ALL link texts — word for word.
- Footer: ALL columns (Products, Resources, Company, Legal), social icons, copyright line.
- NEVER truncate. NEVER skip. NEVER use "<!-- more -->" or "...".

## IMAGES & MEDIA — REAL URLs ONLY
- Use EXACT src URLs from IMAGE INVENTORY. NEVER placehold.co when real URLs exist.
- loading="lazy" on below-fold images.
- <video> with real URLs, poster image, autoplay/muted/loop where appropriate.
- SVG icons via Font Awesome or inline SVG.

## INTERACTIVE ELEMENTS
- Sticky navbar: position:sticky; top:0; backdrop-filter:blur(10px); z-index:1000
- Mobile hamburger menu with vanilla JS toggle at @media(max-width:768px)
- Hover states on ALL interactive elements (buttons, cards, links, nav items)
- Smooth scroll: scroll-behavior:smooth on html
- Scroll-triggered fade-in animations via IntersectionObserver:
  .fade-in { opacity:0; transform:translateY(30px); transition:all 0.6s ease; }
  .fade-in.visible { opacity:1; transform:translateY(0); }

## PREMIUM ANIMATION STACK (for high-quality source sites)
When the source site uses advanced scroll animations, parallax, or cinematic effects, use these CDN libraries:

### GSAP ScrollTrigger (for scroll-driven animations):
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
Use for: fade-up on scroll, staggered reveals, parallax backgrounds, pinned sections, horizontal scroll galleries.

### Lenis (for smooth scroll):
<script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
Use when: source site has butter-smooth scrolling behavior. Init with: new Lenis({duration:1.2, smoothWheel:true})

### Three.js (for 3D backgrounds):
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
Use when: source site has particle fields, 3D objects, or WebGL effects.

### When to use these vs vanilla CSS/JS:
- Source site with simple fade-in → vanilla IntersectionObserver
- Source site with complex scroll animations, parallax, pinning → GSAP ScrollTrigger
- Source site with silky smooth scroll → add Lenis
- Source site with 3D/particle backgrounds → add Three.js

## PREMIUM VISUAL EFFECTS — DEEP PATTERN LIBRARY
The enrichment data includes a 40+ pattern Premium Visual Effects Library from Aceternity UI, Magic UI, Motion Primitives, Animata, Cult UI.
When the source site uses modern visual effects, reproduce them using these CSS/JS patterns:

### Background Effects:
- Aurora/gradient mesh → aurora-bg (repeating-linear-gradient 200%, animation 60s, mix-blend-hard-light, blur(10px) saturate(150%))
- Beam spotlight → radial-gradient follows mouse via JS mousemove, or entrance animation 2s ease 0.75s forwards
- Meteor beams → vertical clip-path beams with translateY -20%→300%, stagger durations
- Glowing blobs → 2 large blobs mix-blend-multiply blur(48px) animation:pop-blob 5s alternate
- Moving gradient → bg-size:300% auto, animation:bg-position 8s alternate, opacity:0.15
- Interactive grid → cells highlight on mouse with radiating transitionDelay: (dx+dy)*100ms
- Floating particles → 15-20 dots with random float animation durations/delays

### Border & Glow:
- Border trail → offset-path: rect(0 auto auto 0 round Xpx), offset-distance 0%→100% animation
- Glow rotating → conic-gradient rotating behind card, filter:blur(16px), modes: rotate/pulse/breathe
- Shine border → @property --border-angle, conic-gradient(from var(--border-angle)), 6s linear infinite
- Glassmorphism → backdrop-filter:blur(16px) saturate(180%) + rgba border + inset highlight + noise SVG overlay
- TextureCard → 5 nested rounded divs (24→23→22→21→20px radius) for premium depth perception

### Text:
- Text shimmer → bg-size:250%, bg-clip:text, linear-gradient with shimmer sweep 2s linear infinite
- Blur reveal → per-word opacity:0 blur(12px), animation 0.3s, stagger delay 0.05s/word
- Wave reveal → per-letter animation:reveal-down + content-blur, delay: index*50ms
- Text flip → overflow:hidden, stacked words, animation:flip-words steps(1) cycling through words
- Typewriter → steps() animation + blinking cursor, JS char-by-char for advanced
- Glitch → text-shadow #ff00ff/#00ffff offsets, animation:glitch 0.5s infinite
- Number ticker → digit columns translateY to show target, transitionDelay stagger from right
- Cult UI whipInUp → cubic-bezier(0.5,-0.15,0.25,1.05), calmInUp → cubic-bezier(0.125,0.92,0.69,0.975)

### Cards & Layout:
- Magnetic hover → JS distance calc, translate with intensity*scale, spring return on leave
- 3D tilt → perspective(1000px) rotateX/Y from mouse position, 15deg max
- Bento grid → repeat(3,1fr), .large span 2, .tall row span 2, hover glow border
- Progressive blur → 8 stacked backdrop-filter:blur layers with mask-image gradients

### Animations:
- Blur-fade → opacity:0 blur(6px) translateY(6px) → visible, stagger via --index*0.1s
- Animated group → 10 presets (fade/slide/scale/blur/zoom/flip/bounce), stagger nth-child*0.1s
- Marquee → width:max-content animation:marquee-scroll linear infinite, DUPLICATE children 2x
- InView → IntersectionObserver threshold:0.1, adds .visible class

### Buttons:
- Glow button → radial-gradient glow-spot follows mouse JS, opacity:0→1 hover, blur(5px)
- Simple glow → box-shadow 0 0 20px/40px/60px at 40%/20%/10%, translateY(-2px)
- Moving border → offset-path animated dot around button perimeter

Combine multiple effects for premium results. Match what the source site does.
Always include @media (prefers-reduced-motion: reduce) to disable animations.

## FRAMER-LEVEL RENDERING TECHNIQUES (USE ON ALL PREMIUM CLONES)
These are the techniques that make Framer sites feel "alive". Apply when source uses premium effects.

### Variable Fonts + font-variation-settings:
Use variable fonts (Inter, DM Sans, Space Grotesk) and animate font-variation-settings on hover/scroll.
h1 { font-variation-settings: 'wght' 400; transition: font-variation-settings 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
h1:hover { font-variation-settings: 'wght' 800; }
With GSAP: gsap.to('.title', { fontVariationSettings: '"wght" 900', scrollTrigger: { trigger: '.hero', scrub: true } });

### GLSL Shader Backgrounds:
For organic animated gradient backgrounds, use WebGL canvas with custom fragment shader.
Mix brand colors via sin/cos UV distortion driven by u_time. Opacity 0.12-0.25.
Container: <canvas class="shader-bg" style="position:absolute;inset:0;z-index:0;pointer-events:none">

### CSS Scroll-Driven Animations:
.scroll-reveal { animation: fadeSlideUp linear both; animation-timeline: view(); animation-range: entry 0% entry 50%; }
Zero JS, zero jank. Use alongside GSAP as progressive enhancement.

### Spring Physics Easing:
--spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--spring-smooth: cubic-bezier(0.22, 1, 0.36, 1);
--spring-snappy: cubic-bezier(0.16, 1, 0.3, 1);
NEVER use linear easing on UI elements. Always spring/elastic.

### Magnetic Buttons:
On mousemove: translate by (x*0.3, y*0.3) from center. Spring return on leave.

### SVG Clip-Path Reveals:
.clip-reveal { clip-path: inset(100% 0 0 0); transition: clip-path 1s cubic-bezier(0.77, 0, 0.175, 1); }
.clip-reveal.visible { clip-path: inset(0 0 0 0); }

### 3D Tilt Cards:
perspective(1000px) rotateY(x*15deg) rotateX(-y*15deg) on mousemove. scale3d(1.02) on hover.

### Glassmorphism:
.glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(16px) saturate(180%); border: 1px solid rgba(255,255,255,0.08); }

### GPU Compositing:
will-change: transform, opacity on animated elements. contain: layout style paint on cards.

### SVG Noise Grain:
body::after with feTurbulence noise, opacity:0.4, mix-blend-mode:overlay on dark sites.

## ANTI-TRUNCATION — CRITICAL
- The ENTIRE page from <!DOCTYPE html> to </html>.
- Hero section alone is only ~15% of a complete page.
- A proper clone is 800-3000 lines of code. Under 400 lines = FAILURE.
- COUNT the sections in the content map. Generate ALL of them. Every single one.
- NEVER stop early. NEVER break output. Complete the ENTIRE page in one response.

# PHASE 4 — QUALITY CHECKLIST (verify before output)
✓ ALL sections from original present in same order
✓ Colors match exactly (no invented colors, no white on dark sites)
✓ Correct fonts imported and applied at correct weights/sizes
✓ Layout identical (grid/flex, widths, gaps, padding)
✓ Visual effects reproduced (blur, gradients, shadows, glow)
✓ Responsive: mobile hamburger, stacked layouts, adjusted font sizes
✓ Animations present and fluid (fade-in, hover transitions)
✓ All real image/video URLs used (zero placeholders when real URLs available)
✓ Every text string from content map reproduced verbatim

Begin IMMEDIATELY with <!DOCTYPE html>.`;

// Map frontend model IDs to Ollama Cloud model IDs
const OLLAMA_MODELS: Record<string, string> = {
  // Vision models
  'gemini-3-flash': 'gemini-3-flash-preview',
  'glm-4.7': 'glm-4.7',
  'glm-4.6': 'glm-4.6',
  'kimi-k2.5': 'kimi-k2.5',
  'qwen3.5-397b': 'qwen3.5:397b',
  // Coding models
  'qwen3-coder-480b': 'qwen3-coder:480b',
  'qwen3-coder-next': 'qwen3-coder-next',
  'devstral-2': 'devstral-2:123b',
  'devstral-small-2': 'devstral-small-2:24b',
  'deepseek-v3.2': 'deepseek-v3.2',
  'glm-5': 'glm-5',
};

// Vision models that support image_url content
const VISION_CLONE_MODELS = new Set([
  'gemini-3-flash', 'glm-4.7', 'glm-4.6', 'kimi-k2.5', 'qwen3.5-397b',
]);

// Per-model max output tokens (some models cap lower than others)
const MODEL_MAX_TOKENS: Record<string, number> = {
  'gemini-3-flash': 65536,
  'kimi-k2.5': 65536,
  'devstral-small-2': 65536,
};
const DEFAULT_MAX_TOKENS = 131072;

// Default model when none specified
const DEFAULT_MODEL = 'gemini-3-flash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamClone(
  systemPrompt: string,
  userPrompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  preferredModel?: string,
  screenshots?: string[],
) {
  const hasScreenshots = screenshots && screenshots.length > 0;

  // Use ONLY the user's selected model — no fallback to other models
  const modelId = preferredModel && OLLAMA_MODELS[preferredModel] ? preferredModel : DEFAULT_MODEL;
  const apiModel = OLLAMA_MODELS[modelId];
  if (!apiModel) throw new Error(`Unknown model: ${modelId}`);

  // Validate screenshots — must be real base64 data (at least 100 chars of base64)
  const validScreenshots = hasScreenshots
    ? screenshots!.filter(ss => ss && ss.length > 100 && (/^data:image\//.test(ss) || /^[A-Za-z0-9+/]/.test(ss)))
    : [];

  console.log('[clone] System:', systemPrompt.length, 'chars. User:', userPrompt.length, 'chars. Screenshots:', validScreenshots.length, 'Model:', modelId);
  const errors: string[] = [];
  const MAX_ATTEMPTS = 3;
  let skipScreenshots = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const isVision = VISION_CLONE_MODELS.has(modelId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let userContent: any = userPrompt;

      // For vision models with valid screenshots: send as multimodal content
      if (isVision && validScreenshots.length > 0 && !skipScreenshots) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [
          { type: 'text', text: userPrompt },
        ];
        for (const ss of validScreenshots.slice(0, 3)) {
          const imgUrl = ss.startsWith('data:') ? ss : `data:image/png;base64,${ss}`;
          parts.push({
            type: 'image_url',
            image_url: { url: imgUrl },
          });
        }
        userContent = parts;
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ];

      const fetchTimeout = AbortSignal.timeout(120000); // 2 min timeout per request
      const res = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OLLAMA_KEY}`,
        },
        body: JSON.stringify({
          model: apiModel,
          messages,
          stream: true,
          max_tokens: MODEL_MAX_TOKENS[modelId] || DEFAULT_MAX_TOKENS,
          temperature: 0.15,
        }),
        signal: fetchTimeout,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        errors.push(`${modelId}(${attempt + 1}): HTTP ${res.status} ${errText.slice(0, 80)}`);
        if (res.status === 401) throw new Error(`Auth failed (401). Check your API key.`);
        // Invalid image input — retry WITHOUT screenshots
        if (res.status === 400 && /invalid.image|image.input|image_url/i.test(errText)) {
          console.log(`[clone] ${modelId}: invalid image input, retrying without screenshots`);
          skipScreenshots = true;
          continue;
        }
        if (res.status === 429 || res.status === 503) {
          const delay = Math.min(3000 * (attempt + 1), 15000);
          console.log(`[clone] ${modelId} rate limited (${res.status}), waiting ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // Other HTTP error — retry
        continue;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        errors.push(`${modelId}: no reader`);
        continue;
      }
      const decoder = new TextDecoder();
      let totalLen = 0;
      let sentModel = false;
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
            if (!text) continue;
            totalLen += text.length;

            if (!sentModel) {
              sentModel = true;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ model: modelId })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          } catch { /* skip malformed SSE */ }
        }
      }

      console.log(`[clone] ${modelId} attempt ${attempt + 1}: ${totalLen} chars`);
      if (totalLen > 400) return; // SUCCESS — meaningful HTML output
      errors.push(`${modelId}(${attempt + 1}): only ${totalLen} chars (too short)`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      if (/Auth failed/.test(msg)) throw e;
      errors.push(`${modelId}(${attempt + 1}): ${msg}`);
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }
  }
  throw new Error(`${modelId} failed after ${MAX_ATTEMPTS} attempts: ${errors.join(' | ')}`);
}

export async function POST(req: NextRequest) {
  let body: {
    url: string;
    html?: string;
    rawHtml?: string;
    model?: string;
    tokens?: { colors: string[]; fonts: string[]; cssVariables?: Record<string, string>; gradients?: string[]; shadows?: string[]; borderRadii?: string[]; mediaQueries?: string[]; keyframes?: string[] };
    branding?: ClonePromptData['branding'];
    screenshot?: string | null;
    screenshots?: string[];
    pageName?: string;
    navigation?: Array<{ text: string; href: string }>;
    images?: Array<{ src: string; alt: string; width?: string; height?: string }>;
    videos?: Array<{ src: string; poster?: string; type?: string }>;
    styleBlocks?: string;
    linkedResources?: { stylesheets: string[]; fonts: string[] };
    cssFramework?: string;
    iconLibraries?: string[];
    animationLibraries?: string[];
    colorFrequency?: Record<string, number>;
    // Iteration/refine fields
    currentHtml?: string;
    feedback?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { url, html, rawHtml, tokens, branding, screenshot, screenshots, pageName, navigation, images, videos, styleBlocks, linkedResources, model: requestedModel, currentHtml, feedback, cssFramework, iconLibraries, animationLibraries, colorFrequency } = body;

  const isRefine = !!(currentHtml && feedback);

  if (!OLLAMA_KEY) {
    return new Response(JSON.stringify({ error: 'No Ollama API key configured. Set OLLAMA_API_KEY.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Detect industry and generate design context
  const industry = detectIndustry(url, html || '');
  const designContext = generateDesignContext(industry);

  // Extract structured content map from rawHtml (has more content than cleaned html)
  const structuredContent = extractStructuredContent(rawHtml || html || '');

  // Build enrichment sections for the prompt — start with design intelligence
  const enrichmentSections: string[] = [designContext];

  // Model-specific optimization hints
  const selectedModel = requestedModel || 'qwen3-coder-480b';
  const modelHint = getModelHints(selectedModel);
  if (modelHint) enrichmentSections.push(`## MODEL OPTIMIZATION: ${modelHint}`);

  // Add detected framework/library info
  if (cssFramework) enrichmentSections.push(`## CSS FRAMEWORK DETECTED: ${cssFramework} — replicate its class patterns and design system`);
  if (iconLibraries && iconLibraries.length > 0) enrichmentSections.push(`## ICON LIBRARIES: ${iconLibraries.join(', ')} — use the same icon CDN`);
  if (animationLibraries && animationLibraries.length > 0) enrichmentSections.push(`## ANIMATION LIBRARIES DETECTED: ${animationLibraries.join(', ')} — reproduce these animation patterns`);

  // Color frequency — tell AI which colors are most used
  if (colorFrequency && Object.keys(colorFrequency).length > 0) {
    const sorted = Object.entries(colorFrequency).sort((a, b) => b[1] - a[1]).slice(0, 15);
    enrichmentSections.push('## COLOR USAGE FREQUENCY (use these exact colors, ranked by importance):\n' + sorted.map(([c, n]) => `${c} (${n} usages)`).join(', '));
  }

  if (navigation && navigation.length > 0) {
    enrichmentSections.push(
      '## NAVIGATION ITEMS (exact text & links):\n' +
      navigation.map(n => `- "${n.text}" → ${n.href}`).join('\n')
    );
  }

  // Add structured content map — this is the KEY for accurate cloning
  if (structuredContent.sections.length > 0 || structuredContent.headings.length > 0) {
    const scParts: string[] = [];
    if (structuredContent.title) scParts.push(`Page Title: "${structuredContent.title}"`);
    if (structuredContent.metaDescription) scParts.push(`Description: "${structuredContent.metaDescription}"`);

    if (structuredContent.headings.length > 0) {
      scParts.push('\nHEADING HIERARCHY (reproduce ALL of these VERBATIM):');
      structuredContent.headings.slice(0, 60).forEach(h => {
        scParts.push(`  ${'#'.repeat(h.level)} ${h.text}`);
      });
    }

    if (structuredContent.allButtonTexts.length > 0) {
      scParts.push(`\nALL BUTTON/CTA TEXTS: ${structuredContent.allButtonTexts.slice(0, 40).map(t => `"${t}"`).join(', ')}`);
    }

    if (structuredContent.sections.length > 0) {
      scParts.push(`\nPAGE SECTIONS (${structuredContent.sections.length} total — reproduce EVERY one):`);
      structuredContent.sections.forEach((s, i) => {
        const parts: string[] = [`${i + 1}. [${s.tag.toUpperCase()}]`];
        if (s.heading) parts.push(`Heading: "${s.heading}"`);
        if (s.texts.length > 0) parts.push(`Text: ${s.texts.slice(0, 10).map(t => `"${t.slice(0, 250)}"`).join(' | ')}`);
        if (s.buttons.length > 0) parts.push(`Buttons: ${s.buttons.map(b => `"${b}"`).join(', ')}`);
        if (s.links.length > 0) parts.push(`Links: ${s.links.slice(0, 15).map(l => `"${l}"`).join(', ')}`);
        if (s.images > 0) parts.push(`Images: ${s.images}`);
        scParts.push(parts.join(' | '));
      });
    }

    enrichmentSections.push('## \uD83D\uDDFA\uFE0F STRUCTURED CONTENT MAP — USE THIS AS YOUR BLUEPRINT:\n' + scParts.join('\n'));
  }

  if (images && images.length > 0) {
    // Resolve image URLs to absolute — pass up to 40 for maximum coverage
    const resolvedImages = images.slice(0, 40).map(i => {
      let src = i.src;
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        try { src = new URL(src, url).href; } catch { /* keep relative */ }
      }
      return { ...i, src };
    });
    enrichmentSections.push(
      '## \u{1F4F7} IMAGE INVENTORY — USE THESE REAL URLs (MANDATORY):\n' +
      resolvedImages.map((i, idx) => `${idx + 1}. src="${i.src}" alt="${i.alt}"${i.width ? ` ${i.width}x${i.height}` : ''}`).join('\n') +
      '\n\n\u{26A0}\uFE0F CRITICAL: You MUST use the exact src URLs listed above in your <img> tags.\n' +
      'NEVER use placehold.co, placeholder.com, or via.placeholder when a REAL image URL exists above.\n' +
      'Copy-paste the src values EXACTLY. These are the original website images.'
    );
  }

  if (videos && videos.length > 0) {
    const resolvedVideos = videos.map(v => {
      let src = v.src;
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        try { src = new URL(src, url).href; } catch { /* keep relative */ }
      }
      return { ...v, src };
    });
    enrichmentSections.push(
      '## \u{1F3AC} VIDEO INVENTORY — USE THESE REAL URLs:\n' +
      resolvedVideos.map((v, idx) => `${idx + 1}. src="${v.src}"${v.poster ? ` poster="${v.poster}"` : ''}${v.type ? ` type="${v.type}"` : ''}`).join('\n') +
      '\nUse <video> tags with these exact src URLs. Include controls, poster, and autoplay/muted/loop where appropriate.'
    );
  }

  if (linkedResources?.fonts && linkedResources.fonts.length > 0) {
    enrichmentSections.push(
      '## FONT RESOURCES (must @import these):\n' +
      linkedResources.fonts.map(f => `- ${f}`).join('\n')
    );
  }

  // NOTE: styleBlocks are now processed for key CSS patterns.
  // We strip obfuscated class names but KEEP the CSS property-value pairs
  // (layout, colors, typography) that the AI needs to match the design.

  // Extract key CSS patterns from styleBlocks + rawHtml style tags
  const cssSource = (styleBlocks || '') + ((rawHtml || '').match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).join('\n');
  const keyCSS = extractKeyCSS(cssSource);
  if (keyCSS) {
    enrichmentSections.push('## CSS DESIGN PATTERNS (match these layout/visual/typography patterns):\n' + keyCSS);
  }

  if (cssSource) {
    // Extract ALL :root blocks
    const rootMatches = cssSource.match(/:root\s*\{([^}]+)\}/g) || [];
    if (rootMatches.length > 0) {
      const allVars = rootMatches.map(m => {
        const inner = m.match(/:root\s*\{([^}]+)\}/)?.[1] || '';
        return inner
          .split(';')
          .map(v => v.trim())
          .filter(v => v && !v.startsWith('//') && v.includes(':'))
          .filter(v => {
            const val = v.split(':').slice(1).join(':').trim();
            // Keep concrete values: colors, sizes, fonts
            return /^#|^rgb|^hsl|^\d|^"|^'|^oklch|^var\(/.test(val);
          });
      }).flat().slice(0, 50);

      if (allVars.length > 0) {
        enrichmentSections.push(`## CSS ROOT VARIABLES (use these EXACT values in your :root {}):\n:root {\n  ${allVars.join(';\n  ')};\n}`);
      }
    }

    // Also extract body/html background-color explicitly
    const bodyBgMatch = cssSource.match(/(?:body|html)\s*\{[^}]*background(?:-color)?\s*:\s*([^;}\s]+)/i);
    if (bodyBgMatch) {
      enrichmentSections.push(`## BODY BACKGROUND: ${bodyBgMatch[1]} — your body background MUST be this exact color`);
    }
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

  // Clean HTML before building prompt — strip obfuscated CSS classes, style tags, empty elements
  let cleanedHtml = html || '';
  cleanedHtml = cleanedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Extract body content
  const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    cleanedHtml = bodyMatch[1];
  } else {
    const bodyStart = cleanedHtml.search(/<body[^>]*>/i);
    if (bodyStart !== -1) {
      const bodyTagEnd = cleanedHtml.indexOf('>', bodyStart) + 1;
      cleanedHtml = cleanedHtml.slice(bodyTagEnd);
    }
    cleanedHtml = cleanedHtml.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
    cleanedHtml = cleanedHtml.replace(/<\/?html[^>]*>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<\/?body[^>]*>/gi, '');
  }
  // Keep semantic class names, strip hashed/obfuscated ones
  cleanedHtml = cleanedHtml.replace(/\s*class="([^"]*)"/g, (_match, classes: string) => {
    const cleaned = classes.split(/\s+/)
      .filter(c => c && !/[A-Z].*__\w|_[a-f0-9]{5,}|^css-|^sc-|^emotion-|^styled-|^chakra-|^tw-|^_[A-Z]/.test(c))
      .filter(c => /^[a-z]/.test(c)) // only keep lowercase-starting classes (semantic)
      .join(' ')
      .trim();
    return cleaned ? ` class="${cleaned}"` : '';
  });
  cleanedHtml = cleanedHtml.replace(/\s*class='([^']*)'/g, '');
  // Strip data-* attributes
  cleanedHtml = cleanedHtml.replace(/\s*data-[a-z-]+="[^"]*"/g, '');
  // Strip empty elements
  cleanedHtml = cleanedHtml.replace(/<div>\s*<\/div>/g, '');
  cleanedHtml = cleanedHtml.replace(/<span>\s*<\/span>/g, '');
  cleanedHtml = cleanedHtml.replace(/<p>\s*<\/p>/g, '');
  cleanedHtml = cleanedHtml.replace(/\s{2,}/g, ' ').trim();

  console.log(`[clone] enrichments=${enrichmentSections.length} sections, refine=${isRefine}`);

  // Join all enrichment sections — cap total to 100KB to avoid exceeding model context
  let enrichmentBlock = enrichmentSections.join('\n\n') + '\n\n' + PREMIUM_UI_PATTERNS + '\n\n' + FRAMER_LEVEL_SYSTEM;
  if (enrichmentBlock.length > 100000) {
    // Truncate enrichment if too large — keep design context and tokens, trim HTML/CSS
    enrichmentBlock = enrichmentBlock.slice(0, 100000) + '\n\n[enrichment truncated for context window]';
  }

  const encoder = new TextEncoder();

  // Dark theme detection — computed early so it's available throughout prompt construction
  const allColors = tokens?.colors || [];
  const darkColors = allColors.filter(c => {
    const hex = c.replace('#', '');
    if (hex.length < 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
    return luminance < 60;
  });
  const cssVars = tokens?.cssVariables || {};
  const darkCssVar = Object.entries(cssVars).some(([k, v]) => {
    if (/background|bg|surface/i.test(k)) {
      const hex = v.replace('#', '');
      if (hex.length >= 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r * 0.299 + g * 0.587 + b * 0.114) < 60;
      }
    }
    return false;
  });
  const isDarkTheme = darkColors.length > allColors.length * 0.35 || darkCssVar || /dark|noir|black/i.test(url);

  // Find the EXACT background color
  let bgColor = '';
  if (isDarkTheme) {
    const bgVarEntry = Object.entries(cssVars).find(([k]) => /^--(?:background|bg|surface|body-bg)$/i.test(k));
    if (bgVarEntry) bgColor = bgVarEntry[1];
    else if (darkColors.length > 0) bgColor = darkColors[0];
    else bgColor = '#000000';
  }



  const stream = new ReadableStream({
    async start(controller) {
      // Build enriched user prompt
      // NOTE: Colors, fonts, images, videos, CSS vars, gradients, shadows are already
      // in the enrichmentBlock (system prompt). Don't duplicate them here.
      const cloneParts: string[] = [
        `Clone this website: ${url}`,
        'Output ONLY the complete HTML. Start with <!DOCTYPE html>. No markdown, no explanation.',
      ];
      
      if (html) {
        let bodyContent = html;
        bodyContent = bodyContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        const bodyMatchGreedy = bodyContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatchGreedy) {
          bodyContent = bodyMatchGreedy[1];
        } else {
          const bodyStart = bodyContent.search(/<body[^>]*>/i);
          if (bodyStart !== -1) {
            const bodyTagEnd = bodyContent.indexOf('>', bodyStart) + 1;
            bodyContent = bodyContent.slice(bodyTagEnd);
          }
          bodyContent = bodyContent.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
          bodyContent = bodyContent.replace(/<\/?html[^>]*>/gi, '');
          bodyContent = bodyContent.replace(/<\/?body[^>]*>/gi, '');
        }
        // Keep semantic class names that hint at structure (hero, features, footer, etc.)
        // Also keep Tailwind-like utility classes that describe layout (flex, grid, gap, etc.)
        // Strip only hashed/obfuscated classes from CSS-in-JS frameworks
        bodyContent = bodyContent.replace(/\s*class="([^"]*)"/g, (_m, classes: string) => {
          const kept = classes.split(/\s+/)
            .filter(c => c && /^(?:hero|feature|footer|header|nav|main|about|pricing|card|cta|btn|logo|banner|section|container|wrapper|grid|flex|col|row|sidebar|content|title|subtitle|heading|text|desc|list|menu|social|testimonial|review|stat|metric|faq|partner|team|contact|form|input|label|icon|image|video|media|gallery|carousel|slider|tab|accordion|modal|dropdown|tooltip|badge|tag|chip|avatar|thumb|overlay|backdrop|gradient|dark|light|primary|secondary|animate|fade|slide|hover|active|disabled|hidden|visible|relative|absolute|fixed|sticky|top|bottom|left|right|center|between|around|evenly|wrap|nowrap|auto|full|half|third|quarter|max|min|sm|md|lg|xl|rounded|shadow|border|bg|p-|m-|w-|h-|gap|space|leading|tracking|font|text-)/i.test(c))
            .join(' ')
            .trim();
          return kept ? ` class="${kept}"` : '';
        });
        // Replace SVGs with descriptive placeholders, but keep viewBox info for sizing
        bodyContent = bodyContent.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, (svgTag) => {
          const vb = svgTag.match(/viewBox="([^"]+)"/)?.[1] || '';
          const cls = svgTag.match(/class="([^"]+)"/)?.[1] || '';
          return `[svg${vb ? ' ' + vb : ''}${cls ? ' .' + cls : ''}]`;
        });
        bodyContent = bodyContent.replace(/<div>\s*<\/div>/g, '');
        bodyContent = bodyContent.replace(/<span>\s*<\/span>/g, '');
        bodyContent = bodyContent.replace(/<p>\s*<\/p>/g, '');
        bodyContent = bodyContent.replace(/\s{2,}/g, ' ').trim();

        const textOnly = bodyContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (textOnly.length > 200) {
          cloneParts.push(`\n## PAGE HTML STRUCTURE (replicate ALL visible sections and text EXACTLY — EVERY section from header to footer):\n${bodyContent.slice(0, 120000)}`);
        } else {
          // SPA/JS-rendered site: try extracting text from rawHtml too
          let rawContent = '';
          if (rawHtml) {
            let raw = rawHtml;
            raw = raw.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            raw = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            // Extract text fragments — JSON strings often contain visible text in SPAs
            const jsonStrings = raw.match(/"(?:title|description|heading|text|label|name|content|subtitle|paragraph|caption)"\s*:\s*"([^"]{3,200})"/gi) || [];
            const extractedTexts = jsonStrings.map(s => {
              const m = s.match(/:\s*"([^"]+)"/);
              return m ? m[1] : '';
            }).filter(t => t.length > 5 && !/\\u|function|module|import|require|webpack/.test(t));

            const rawBody = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            if (rawBody) {
              rawContent = rawBody[1]
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            }

            if (rawContent.length > 200 || extractedTexts.length > 5) {
              cloneParts.push(`\n## EXTRACTED PAGE CONTENT (this is a JS-rendered SPA — reconstruct ALL sections based on this text):\n${rawContent.slice(0, 60000)}`);
              if (extractedTexts.length > 0) {
                cloneParts.push(`\n## EXTRACTED TEXT FROM PAGE DATA:\n${extractedTexts.slice(0, 100).join('\n')}`);
              }
            }
          }

          // Always provide reconstruction context for sparse content
          cloneParts.push(`\n## FULL SITE RECONSTRUCTION (body HTML was sparse — this is a JS-rendered SPA):
URL: ${url} | Nav: ${(navigation || []).map(n => n.text).join(', ')} | Images: ${(images || []).length} | Videos: ${(videos || []).length}
Create a COMPLETE page: sticky nav, hero, features (3-6 cards), testimonials, CTA, multi-column footer.
Use ALL provided design tokens, images, and navigation. ${isDarkTheme ? 'Dark theme.' : ''}`);
        }
      }

      // Extract SPA hydration data (__NEXT_DATA__, JSON-LD) from rawHtml
      // This captures content that JS frameworks embed in script tags
      if (rawHtml) {
        const spaTexts = extractSPAData(rawHtml);
        if (spaTexts.length > 5) {
          cloneParts.push(`\n## SPA HYDRATION DATA (text content from __NEXT_DATA__/JSON-LD — use this to fill in any missing sections):\n${spaTexts.join('\n')}`);
        }

        // Extract Jina readable text if present (injected by scrape route)
        const jinaTextMatch = rawHtml.match(/<!-- JINA_READABLE_TEXT_START -->\n([\s\S]*?)\n<!-- JINA_READABLE_TEXT_END -->/);
        if (jinaTextMatch) {
          const readableText = jinaTextMatch[1].trim();
          if (readableText.length > 200) {
            cloneParts.push(`\n## FULL PAGE TEXT (human-readable, rendered — this is the COMPLETE visible content of the page):\n${readableText.slice(0, 50000)}`);
          }
        }
      }

      if (isRefine && currentHtml && feedback) {
        const htmlSnippet = currentHtml.length > 10000
          ? currentHtml.slice(0, 5000) + '\n<!-- ... -->\n' + currentHtml.slice(-5000)
          : currentHtml;
        cloneParts.push(`\n## CURRENT HTML TO REFINE:\n${htmlSnippet}`);
        cloneParts.push(`\n## USER FEEDBACK — APPLY THESE CHANGES:\n${feedback}`);
        cloneParts.push('Output the COMPLETE updated HTML. Return the FULL file, not diffs.');
      }

      cloneParts.push(`\n## FINAL QUALITY CHECKLIST — VERIFY BEFORE OUTPUT:
- COMPLETE page: ALL sections from nav to footer. Under 400 lines = FAILURE.
- ${structuredContent.sections.length > 0 ? `Reproduce ALL ${structuredContent.sections.length} sections from the content map — COUNT them.` : 'Reproduce every visible section from the data provided.'}
- ${isDarkTheme ? `DARK THEME: body bg=${bgColor || '#000'}. ALL sections dark. ZERO white backgrounds anywhere.` : 'Color theme must match original exactly.'}
- Colors: EXACT hex/rgb from tokens. No invented colors. No approximations.
- Fonts: Import and apply correct Google Fonts at correct weights/sizes.
- Layout: Correct grid/flex, max-width, gaps, padding per original.
- Effects: Reproduce glassmorphism, gradients, shadows, glow, noise textures.
- Responsive: Mobile hamburger menu, stacked layouts, adjusted sizing at 768px/1024px.
- Animations: Scroll fade-in via IntersectionObserver, hover transitions on buttons/cards.
- Images/videos: Use ALL real URLs from inventory. Zero placeholders when real URLs exist.
- Every text string from content map reproduced VERBATIM — every heading, paragraph, button label.
- Start with <!DOCTYPE html>. End with </html>. Nothing else.`);

      // If screenshots exist, tell the AI to match them
      const screenshotList = screenshots?.filter(Boolean) || [];
      if (screenshotList.length > 0) {
        cloneParts.push(`\n## SCREENSHOTS: ${screenshotList.length} attached. Match layout, colors, typography, every section EXACTLY.`);
      }

      const userPrompt = cloneParts.join('\n');

      try {
        console.log(`[clone] Starting clone for ${url}, model=${requestedModel || 'auto'}, screenshots=${screenshotList.length}, darkTheme=${isDarkTheme}`);

        // Build the full system prompt with enrichment data (images, tokens, design context, etc.)
        const fullSystemPrompt = enrichmentBlock
          ? CLONE_SYSTEM + '\n\n# ENRICHMENT DATA FROM SCRAPED WEBSITE:\n\n' + enrichmentBlock
          : CLONE_SYSTEM;

        await streamClone(fullSystemPrompt, userPrompt, controller, encoder, requestedModel, screenshotList.length > 0 ? screenshotList : undefined);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'unknown';
        console.error('[clone] All models failed:', errMsg);
        const clean = errMsg.replace(/\s{2,}/g, ' ').trim().slice(0, 300) || 'Clone failed. Try again.';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: clean })}\n\n`));
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
