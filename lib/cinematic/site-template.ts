// ═══════════════════════════════════════════════════════════════
// Cinematic 3D Scroll Builder — Premium HTML Site Template
// MEILLEUR RENDU VISUEL — lerp scroll, AVIF, variable fonts,
// glass morphism, preloading directionnel, PWA, accessibility
// ═══════════════════════════════════════════════════════════════

import type { TemplateConfig } from './types';

/**
 * Generates a complete standalone HTML file with premium scroll-driven
 * frame animation — Apple-style cinematic scroll with lerp interpolation,
 * AVIF frames, variable fonts, glass overlays, and PWA support.
 */
export function generateScrollSiteHtml(
  template: TemplateConfig,
  frameCount: number,
  fps: number,
  enrichedPrompt: string
): string {
  const { siteStyle } = template;
  const sections = buildSections(template, siteStyle.sectionCount);
  const mobileFrames = Math.min(60, frameCount);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteStyle.heroTitle}</title>
  <meta name="description" content="${siteStyle.heroSubtitle}">
  <meta name="theme-color" content="${siteStyle.accentColor}">

  <!-- Open Graph -->
  <meta property="og:title" content="${siteStyle.heroTitle}">
  <meta property="og:description" content="${siteStyle.heroSubtitle}">
  <meta property="og:type" content="website">

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json">

  <!-- Preload first 5 frames for instant render -->
  <link rel="preload" as="image" href="frames/frame_000001.avif" type="image/avif">
  <link rel="preload" as="image" href="frames/frame_000002.avif" type="image/avif">
  <link rel="preload" as="image" href="frames/frame_000003.avif" type="image/avif">
  <link rel="preload" as="image" href="frames/frame_000004.avif" type="image/avif">
  <link rel="preload" as="image" href="frames/frame_000005.avif" type="image/avif">

  <!-- Premium variable fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,100..900&family=Inter:wght@300;400;500;600;700;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">

  <!-- GSAP + ScrollTrigger + Lenis -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
  <script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js" defer></script>

  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: ${siteStyle.bgColor};
      --text: ${siteStyle.textColor};
      --accent: ${siteStyle.accentColor};
      --font-heading: 'Fraunces', serif;
      --font-body: ${siteStyle.fontFamily};
      --overlay-opacity: ${siteStyle.overlayOpacity};
    }

    html { scroll-behavior: auto; }

    body {
      font-family: var(--font-body);
      background: var(--bg);
      color: var(--text);
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1;
    }

    /* ═══ Canvas — cinematic background ═══ */
    #cinematic-canvas {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 0;
      background: var(--bg);
      image-rendering: -webkit-optimize-contrast;
      will-change: transform;
    }

    /* ═══ Scroll spacer ═══ */
    #scroll-spacer {
      height: ${Math.ceil(frameCount / fps * 400)}vh;
      position: relative;
      z-index: 1;
      pointer-events: none;
    }

    /* ═══ Content overlay with glass morphism ═══ */
    .content-overlay {
      position: relative;
      z-index: 2;
      pointer-events: auto;
    }

    .section {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 6rem 2rem;
      position: relative;
    }

    /* ═══ Glass panel for content ═══ */
    .glass-panel {
      backdrop-filter: blur(40px) saturate(180%) brightness(0.8);
      -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(0.8);
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 3rem 2.5rem;
      max-width: 720px;
      width: 100%;
    }

    /* ═══ Hero — variable font ═══ */
    .hero { text-align: center; padding: 8rem 2rem; }

    .hero h1 {
      font-family: var(--font-heading);
      font-variation-settings: 'SOFT' 100, 'WONK' 1;
      font-size: clamp(3.5rem, 10vw, 10rem);
      font-weight: 900;
      line-height: 0.9;
      letter-spacing: -0.04em;
      margin-bottom: 1.5rem;
      opacity: 0;
      transform: translateY(40px);
      animation: fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.3s;
    }

    .hero p {
      font-family: var(--font-body);
      font-size: clamp(1rem, 2vw, 1.3rem);
      opacity: 0;
      color: rgba(255,255,255,0.6);
      max-width: 540px;
      margin: 0 auto 2.5rem;
      line-height: 1.6;
      transform: translateY(20px);
      animation: fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.6s;
    }

    .hero .cta {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2.5rem;
      background: var(--accent);
      color: var(--bg);
      text-decoration: none;
      font-weight: 700;
      font-size: 1rem;
      border-radius: 999px;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s;
      opacity: 0;
      animation: fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.9s;
    }

    .hero .cta:hover {
      transform: scale(1.05);
      box-shadow: 0 0 60px color-mix(in srgb, var(--accent) 50%, transparent);
    }

    /* ═══ Feature sections ═══ */
    .feature {
      max-width: 720px;
      text-align: center;
    }

    .feature h2 {
      font-family: var(--font-heading);
      font-variation-settings: 'SOFT' 50;
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 700;
      margin-bottom: 1rem;
      letter-spacing: -0.03em;
      line-height: 1.05;
    }

    .feature p {
      font-size: 1.1rem;
      opacity: 0.65;
      line-height: 1.7;
      max-width: 560px;
      margin: 0 auto;
    }

    .accent-line {
      width: 48px;
      height: 3px;
      background: var(--accent);
      margin: 1.5rem auto;
      border-radius: 2px;
    }

    /* ═══ Scroll indicator ═══ */
    .scroll-indicator {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      opacity: 0.4;
      animation: bounce 2.5s ease infinite;
      transition: opacity 0.4s;
    }

    .scroll-indicator svg {
      width: 24px; height: 24px;
      stroke: var(--text); fill: none; stroke-width: 2;
    }

    /* ═══ Progress bar ═══ */
    #progress-bar {
      position: fixed;
      top: 0; left: 0;
      height: 3px;
      background: var(--accent);
      z-index: 100;
      transition: width 0.1s linear;
      box-shadow: 0 0 12px var(--accent), 0 0 4px var(--accent);
    }

    /* ═══ Film grain overlay ═══ */
    .film-grain {
      position: fixed;
      inset: 0;
      z-index: 99;
      pointer-events: none;
      opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
      background-repeat: repeat;
      mix-blend-mode: overlay;
    }

    /* ═══ Frame counter (debug) ═══ */
    #frame-counter {
      position: fixed;
      bottom: 1rem; right: 1rem;
      font-size: 0.65rem;
      opacity: 0.2;
      z-index: 100;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }

    /* ═══ Animations ═══ */
    @keyframes fadeInUp {
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes bounce {
      0%, 100% { transform: translateX(-50%) translateY(0); }
      50% { transform: translateX(-50%) translateY(8px); }
    }

    /* ═══ Reveal animations (IntersectionObserver driven) ═══ */
    [data-reveal] {
      opacity: 0;
      transform: translateY(40px);
      transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }
    [data-reveal].visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* ═══ Reduced motion ═══ */
    @media (prefers-reduced-motion: reduce) {
      #cinematic-canvas { display: none; }
      .hero-bg-fallback { display: block !important; }
      .section, [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; animation: none !important; }
      .scroll-indicator { display: none; }
      #scroll-spacer { height: auto; }
    }

    /* ═══ Responsive ═══ */
    @media (max-width: 768px) {
      .section { padding: 4rem 1.5rem; }
      .hero { padding: 5rem 1.5rem; }
      .glass-panel { padding: 2rem 1.5rem; border-radius: 16px; }
      .hero h1 { letter-spacing: -0.02em; }
    }
  </style>
</head>
<body>
  <div id="progress-bar"></div>
  <div class="film-grain" aria-hidden="true"></div>

  <!-- Static fallback for reduced-motion -->
  <div class="hero-bg-fallback" style="display:none;position:fixed;inset:0;z-index:0;background:var(--bg);"></div>

  <canvas id="cinematic-canvas" aria-hidden="true"></canvas>

  <div id="scroll-spacer">
    <div class="content-overlay">
      <!-- Hero Section -->
      <section class="section hero" aria-label="Hero">
        <h1>${siteStyle.heroTitle}</h1>
        <p>${siteStyle.heroSubtitle}</p>
        <a href="#features" class="cta">Discover More ↓</a>
      </section>

${sections}
    </div>
  </div>

  <div class="scroll-indicator" id="scroll-indicator" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
  </div>

  <div id="frame-counter" aria-hidden="true"></div>

  <script>
    // ═══ Premium Cinematic Scroll Engine ═══
    // Lerp interpolation + directional preloading + AVIF + mobile handling
    (function() {
      'use strict';
      const canvas = document.getElementById('cinematic-canvas');
      const ctx = canvas.getContext('2d');
      const isMobile = window.innerWidth < 768;
      const TOTAL_FRAMES = isMobile ? ${mobileFrames} : ${frameCount};
      const LERP_FACTOR = 0.15; // 0.08=smooth, 0.15=perfect, 0.25=snappy
      const PRELOAD_AHEAD = 30;
      const BATCH_SIZE = isMobile ? 10 : 20;

      let frames = new Array(TOTAL_FRAMES);
      let loadedCount = 0;
      let displayFrame = 0;
      let targetFrame = 0;
      let lastDrawn = -1;
      let scrollDir = 1;
      let lastScrollY = 0;
      let maxScroll = 1;

      function lerp(a, b, t) { return a + (b - a) * t; }

      function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        lastDrawn = -1;
        drawFrame(Math.round(displayFrame));
      }

      function drawFrame(index) {
        const idx = Math.max(0, Math.min(TOTAL_FRAMES - 1, index));
        if (!frames[idx] || !frames[idx].complete || idx === lastDrawn) return;
        const img = frames[idx];
        const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const x = (canvas.width - img.naturalWidth * scale) / 2;
        const y = (canvas.height - img.naturalHeight * scale) / 2;
        ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
        lastDrawn = idx;
      }

      // ═══ Lerp render loop (RAF) ═══
      function renderLoop() {
        displayFrame = lerp(displayFrame, targetFrame, LERP_FACTOR);
        const idx = Math.round(displayFrame);
        drawFrame(idx);
        requestAnimationFrame(renderLoop);
      }

      // ═══ Scroll handler + directional preloading ═══
      function onScroll() {
        const scrollTop = window.scrollY;
        maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const frac = Math.max(0, Math.min(1, scrollTop / maxScroll));
        targetFrame = frac * (TOTAL_FRAMES - 1);

        // Scroll direction detection
        scrollDir = scrollTop > lastScrollY ? 1 : -1;
        lastScrollY = scrollTop;

        // Directional preloading
        const curr = Math.round(frac * TOTAL_FRAMES);
        const start = scrollDir === 1 ? curr : Math.max(0, curr - PRELOAD_AHEAD);
        const end = scrollDir === 1 ? Math.min(TOTAL_FRAMES, curr + PRELOAD_AHEAD) : curr;
        preloadRange(start, end);

        // Progress bar
        document.getElementById('progress-bar').style.width = (frac * 100) + '%';

        // Hide scroll indicator
        if (scrollTop > 100) {
          document.getElementById('scroll-indicator').style.opacity = '0';
        }
      }

      // ═══ Frame preloading (AVIF with WebP fallback) ═══
      function preloadRange(start, end) {
        for (let i = Math.max(0, start); i < Math.min(TOTAL_FRAMES, end); i++) {
          if (!frames[i]) {
            const img = new Image();
            img.fetchPriority = (i < start + 5) ? 'high' : 'auto';
            img.src = 'frames/frame_' + String(i + 1).padStart(6, '0') + '.avif';
            img.onerror = function() {
              // Fallback to WebP then JPEG
              this.onerror = function() {
                this.src = 'frames/frame_' + String(i + 1).padStart(6, '0') + '.jpg';
              };
              this.src = 'frames/frame_' + String(i + 1).padStart(6, '0') + '.webp';
            };
            img.onload = function() {
              loadedCount++;
              document.getElementById('frame-counter').textContent =
                loadedCount + '/' + TOTAL_FRAMES;
            };
            frames[i] = img;
          }
        }
      }

      // ═══ Initial batch preload ═══
      function preloadBatch(startIdx) {
        const end = Math.min(startIdx + BATCH_SIZE, TOTAL_FRAMES);
        preloadRange(startIdx, end);
        if (end < TOTAL_FRAMES) {
          setTimeout(function() { preloadBatch(end); }, 80);
        }
      }

      // ═══ Intersection Observer reveals ═══
      function initReveals() {
        var observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('[data-reveal]').forEach(function(el) {
          observer.observe(el);
        });
      }

      // ═══ Init ═══
      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('scroll', onScroll, { passive: true });

      // Check reduced motion preference
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        canvas.style.display = 'none';
        document.querySelector('.hero-bg-fallback').style.display = 'block';
      } else {
        resizeCanvas();
        preloadBatch(0);
        requestAnimationFrame(renderLoop);
      }

      initReveals();

      // Draw first frame ASAP
      var checkFirst = setInterval(function() {
        if (frames[0] && frames[0].complete) {
          drawFrame(0);
          clearInterval(checkFirst);
        }
      }, 30);

      // ═══ Service Worker registration ═══
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(function() {});
      }

      // ═══ Init Lenis smooth scroll (if loaded) ═══
      if (typeof window.Lenis !== 'undefined') {
        var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
      }
    })();
  </script>
</body>
</html>`;
}

function buildSections(template: TemplateConfig, count: number): string {
  const sectionData = [
    { title: 'Immersive Experience', text: 'Scroll through a cinematic journey that transforms every pixel into a story. Every frame is meticulously crafted.' },
    { title: 'Engineered for Impact', text: 'Built with cutting-edge technology to deliver performance and beauty in perfect harmony.' },
    { title: 'Every Detail Matters', text: 'From the first impression to the final scroll, each interaction is designed to captivate and inspire.' },
    { title: 'Beyond Boundaries', text: 'Push the limits of what a web experience can be. This is where innovation meets artistry.' },
    { title: 'The Future is Here', text: 'A new standard for digital storytelling. Welcome to the next generation of web design.' },
    { title: 'Join the Movement', text: 'Be part of something extraordinary. The journey starts with a single scroll.' },
  ];

  return Array.from({ length: Math.min(count, sectionData.length) }, (_, i) => {
    const s = sectionData[i];
    return `      <!-- Section ${i + 1} -->
      <section class="section" id="${i === 0 ? 'features' : `section-${i + 1}`}" aria-label="${s.title}">
        <div class="glass-panel feature" data-reveal>
          <h2>${s.title}</h2>
          <div class="accent-line"></div>
          <p>${s.text}</p>
        </div>
      </section>`;
  }).join('\n\n');
}
