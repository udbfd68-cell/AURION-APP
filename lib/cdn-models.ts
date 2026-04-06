/* CDN injection strings, design system CSS, and AI model definitions */
import type { ReactNode } from 'react';
import type { VirtualFS } from '@/lib/client-utils';

const REACT_CDN = `<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;
const TAILWIND_CDN = `<script crossorigin src="https://cdn.tailwindcss.com"></script>`;
const LUCIDE_CDN = `<script crossorigin src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>`;
const RECHARTS_CDN = `<script crossorigin src="https://unpkg.com/recharts@2/umd/Recharts.js"></script>`;
const REACT_ROUTER_CDN = `<script crossorigin src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"></script>`;
const FRAMER_MOTION_CDN = `<script crossorigin src="https://unpkg.com/framer-motion@11/dist/framer-motion.js"></script>`;

/* ── Premium font + animation CDNs (always available in previews) ── */
const PREMIUM_FONTS_CDN = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">`;
const GSAP_CDN = `<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>`;
const LENIS_CDN = `<script crossorigin src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>`;
const FA_CDN = `<link rel="stylesheet" crossorigin href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">`;

/* ── Premium design system CSS (dark-first, Awwwards-quality) ── */
const SHADCN_BASE_CSS = `<style id="aurion-design-system">
/* ── CSS variables — dark-first (shadcn/radix compatible) ── */
:root {
  --background: 0 0% 3.9%; --foreground: 0 0% 96%;
  --card: 0 0% 5%; --card-foreground: 0 0% 96%;
  --popover: 0 0% 5%; --popover-foreground: 0 0% 96%;
  --primary: 240 100% 68%; --primary-foreground: 0 0% 100%;
  --secondary: 240 3.7% 12%; --secondary-foreground: 0 0% 96%;
  --muted: 240 3.7% 12%; --muted-foreground: 240 5% 58%;
  --accent: 240 3.7% 12%; --accent-foreground: 0 0% 96%;
  --destructive: 0 62.8% 55%; --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%; --input: 240 3.7% 15.9%; --ring: 240 100% 68%;
  --radius: 0.75rem;
}
.light,:root[class~="light"] {
  --background: 0 0% 100%; --foreground: 240 10% 3.9%;
  --card: 0 0% 100%; --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%; --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%; --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%; --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%; --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%; --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%; --input: 240 5.9% 90%; --ring: 240 5.9% 10%;
}
/* ── Base reset — premium typography ── */
*,*::before,*::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:hsl(var(--border))}
html{scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:#333 transparent}
body{margin:0;font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;color:hsl(var(--foreground));background:hsl(var(--background));overflow-x:hidden;text-rendering:optimizeLegibility}
h1,h2,h3,h4{font-family:'Syne','Space Grotesk',system-ui,sans-serif;font-weight:700;letter-spacing:-0.02em;line-height:1.1}
h1{font-size:clamp(2.5rem,6vw,5rem);letter-spacing:-0.03em;line-height:1.05}
h2{font-size:clamp(1.8rem,4vw,3rem)}
h3{font-size:clamp(1.2rem,2.5vw,1.75rem)}
p{line-height:1.7;color:hsl(var(--muted-foreground))}
/* ── Selection + focus ── */
::selection{background:hsl(var(--primary)/0.2);color:hsl(var(--primary-foreground))}
:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:2px;border-radius:var(--radius)}
/* ── Premium scrollbar ── */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:hsl(var(--muted-foreground)/0.2);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:hsl(var(--muted-foreground)/0.4)}
/* ── Animation keyframes ── */
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{50%{opacity:0.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px hsl(var(--primary)/0.3)}50%{box-shadow:0 0 40px hsl(var(--primary)/0.5)}}
@keyframes gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes blur-in{from{opacity:0;filter:blur(10px)}to{opacity:1;filter:blur(0)}}
.animate-fadeIn{animation:fadeIn 0.6s cubic-bezier(0.16,1,0.3,1) both}
.animate-slideIn{animation:slideIn 0.5s cubic-bezier(0.16,1,0.3,1) both}
.animate-scaleIn{animation:scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) both}
.animate-spin{animation:spin 1s linear infinite}
.animate-pulse{animation:pulse 2s cubic-bezier(0.4,0,0.6,1) infinite}
.animate-shimmer{animation:shimmer 2.5s linear infinite;background-size:200% 100%}
.animate-float{animation:float 3s ease-in-out infinite}
.animate-glow{animation:glow 2s ease-in-out infinite}
.animate-gradient{animation:gradient-shift 4s ease infinite;background-size:200% 200%}
/* ── Reduced motion ── */
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}
</style>`;

function detectReactCode(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\b(useState|useEffect|useRef|useCallback|useMemo|React\.|ReactDOM\.|createRoot|jsx|<\w+\s[^>]*\/?>)/i.test(f.content)) return true;
    if (f.language === 'tsx' || f.language === 'jsx') return true;
  }
  return false;
}

function detectTailwindCode(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\bclassName=["'][^"']*(?:flex|grid|p-|m-|text-|bg-|rounded|border|shadow|hover:|dark:|sm:|md:|lg:)/.test(f.content)) return true;
    if (/\bclass=["'][^"']*(?:flex|grid|p-|m-|text-|bg-|rounded|border|shadow)/.test(f.content)) return true;
  }
  return false;
}

function detectRechartsCode(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\b(Recharts|LineChart|BarChart|PieChart|AreaChart|ResponsiveContainer)\b/.test(f.content)) return true;
  }
  return false;
}

function detectReactRouter(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\b(BrowserRouter|HashRouter|Routes|Route|Link|useNavigate|useParams|useLocation|NavLink)\b/.test(f.content)) return true;
  }
  return false;
}

function detectFramerMotion(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\b(motion\.|AnimatePresence|useAnimation|useMotionValue|useTransform|useSpring)\b/.test(f.content)) return true;
  }
  return false;
}

/* ── Auto-detect popular library usage and return CDN scripts ── */
function detectLibraryCDNs(files: VirtualFS): string[] {
  const cdns: string[] = [];
  const all = Object.values(files).map(f => f.content).join('\n');
  // Three.js
  if (/\b(THREE\.|new THREE|Scene|PerspectiveCamera|WebGLRenderer|OrbitControls)\b/.test(all) && !/three.*\.js/.test(all)) {
    cdns.push('<script crossorigin src="https://unpkg.com/three@0.169.0/build/three.min.js"></script>');
  }
  // GSAP
  if (/\b(gsap\.|ScrollTrigger|timeline|gsap\.to|gsap\.from|gsap\.fromTo)\b/.test(all) && !/gsap.*\.js/.test(all)) {
    cdns.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>');
    cdns.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>');
  }
  // Anime.js
  if (/\banime\(|anime\.timeline/.test(all) && !/anime.*\.js/.test(all)) {
    cdns.push('<script crossorigin src="https://unpkg.com/animejs@3/lib/anime.min.js"></script>');
  }
  // Chart.js
  if (/\b(new Chart|Chart\.register|chart\.js)\b/i.test(all) && !/chart\.js|chartjs/.test(all)) {
    cdns.push('<script crossorigin src="https://unpkg.com/chart.js@4"></script>');
  }
  // Axios
  if (/\baxios\.(get|post|put|delete|patch|create)\b/.test(all) && !/axios.*\.js/.test(all)) {
    cdns.push('<script crossorigin src="https://unpkg.com/axios/dist/axios.min.js"></script>');
  }
  // Marked (markdown)
  if (/\bmarked\(|marked\.parse/.test(all) && !/marked.*\.js/.test(all)) {
    cdns.push('<script crossorigin src="https://unpkg.com/marked/marked.min.js"></script>');
  }
  // Day.js
  if (/\bdayjs\(/.test(all) && !/dayjs.*\.js/.test(all)) {
    cdns.push('<script crossorigin src="https://unpkg.com/dayjs@1/dayjs.min.js"></script>');
  }
  // Lodash
  if (/\b_\.(map|filter|reduce|debounce|throttle|cloneDeep|merge|groupBy|sortBy)\b/.test(all) && !/lodash.*\.js/.test(all)) {
    cdns.push('<script crossorigin src="https://unpkg.com/lodash@4/lodash.min.js"></script>');
  }
  // Font Awesome
  if (/\bfa-|fas |far |fab |fa /.test(all) && !/font-?awesome/.test(all)) {
    cdns.push('<link rel="stylesheet" crossorigin href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">');
  }
  // Lenis smooth scroll
  if (/\bLenis\b|new Lenis|lenis\.raf/.test(all) && !/lenis.*\.js/.test(all)) {
    cdns.push('<script crossorigin src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>');
  }
  // Vanta.js
  if (/\bVANTA\.|vanta\./.test(all) && !/vanta.*\.js/.test(all)) {
    // Vanta requires Three.js
    if (!cdns.some(c => c.includes('three'))) {
      cdns.push('<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>');
    }
    cdns.push('<script crossorigin src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.topology.min.js"></script>');
  }
  // tsParticles
  if (/\btsParticles\b|loadSlim/.test(all) && !/tsparticles.*\.js/.test(all)) {
    cdns.push('<script crossorigin src="https://cdn.jsdelivr.net/npm/tsparticles-slim@2/tsparticles.slim.bundle.min.js"></script>');
  }
  return cdns;
}

/* ── Assemble multi-file preview with React/Tailwind runtime ── */
function assemblePreview(files: VirtualFS): string | null {
  const isReact = detectReactCode(files);
  const isTailwind = detectTailwindCode(files);
  const isRecharts = detectRechartsCode(files);
  const isRouter = detectReactRouter(files);
  const isFramer = detectFramerMotion(files);
  const libCDNs = detectLibraryCDNs(files);

  // For React projects: assemble from App.jsx/tsx + components
  if (isReact && !files['index.html']) {
    const appFile = files['App.jsx'] || files['App.tsx'] || files['app.jsx'] || files['app.tsx']
      || files['src/App.jsx'] || files['src/App.tsx'];
    if (appFile) {
      // Gather all component files
      const components: string[] = [];
      for (const [path, file] of Object.entries(files)) {
        if (path === 'index.html' || path === 'package.json') continue;
        if (file.language === 'css') {
          components.push(`<style>/* ${path} */\n${file.content}</style>`);
        }
      }
      // Gather all JSX/TSX files (non-App)
      const jsxFiles: string[] = [];
      for (const [path, file] of Object.entries(files)) {
        if (path === 'package.json' || path === 'index.html') continue;
        if (['jsx', 'tsx', 'javascript', 'typescript'].includes(file.language) && path !== 'App.jsx' && path !== 'App.tsx' && path !== 'app.jsx' && path !== 'app.tsx' && path !== 'src/App.jsx' && path !== 'src/App.tsx') {
          jsxFiles.push(`// ── ${path} ──\n${file.content}`);
        }
      }

      // Build CDN stack
      const cdns = [REACT_CDN, PREMIUM_FONTS_CDN];
      if (isTailwind) cdns.push(TAILWIND_CDN);
      if (isRecharts) cdns.push(RECHARTS_CDN);
      if (isRouter) cdns.push(REACT_ROUTER_CDN);
      if (isFramer) cdns.push(FRAMER_MOTION_CDN);
      cdns.push(LUCIDE_CDN);
      cdns.push(...libCDNs);

      // Router wrapper: wrap App in HashRouter if React Router detected
      const mountCode = isRouter
        ? `const {HashRouter,Routes,Route,Link,NavLink,useNavigate,useParams,useLocation}=ReactRouterDOM;
const _root=ReactDOM.createRoot(document.getElementById('root'));
_root.render(React.createElement(HashRouter,null,React.createElement(typeof App!=='undefined'?App:()=>React.createElement('div',null,'Loading...'))));`
        : `const _root=ReactDOM.createRoot(document.getElementById('root'));
_root.render(React.createElement(typeof App!=='undefined'?App:()=>React.createElement('div',null,'Loading...')));`;

      return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
${cdns.join('\n')}
${SHADCN_BASE_CSS}
${components.join('\n')}
</head><body><div id="root"></div>
<script type="text/babel" data-type="module">
${jsxFiles.join('\n\n')}

// ── App ──
${appFile.content}

// ── Mount ──
${mountCode}
</script></body></html>`;
    }
  }

  const index = files['index.html'];
  if (!index) return null;
  let html = index.content;

  // Inline <link rel="stylesheet" href="X"> from VFS
  html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi, (match, href) => {
    const cssFile = files[href] || files[href.replace(/^\.?\//, '')];
    if (cssFile) return `<style>/* ${href} */\n${cssFile.content}</style>`;
    return match;
  });
  // Inline <script src="X"> from VFS
  html = html.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
    const jsFile = files[src] || files[src.replace(/^\.?\//, '')];
    if (jsFile) return `<script>/* ${src} */\n${jsFile.content}</script>`;
    return match;
  });

  // Inject React runtime if the HTML contains JSX/React code
  if (isReact && !html.includes('react.production') && !html.includes('react.development')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + '\n' + REACT_CDN + '\n' + html.slice(headEnd);
    }
    // Convert any <script> with JSX to type="text/babel"
    html = html.replace(/<script(?![^>]*type=)(?![^>]*src=)([^>]*)>/gi, '<script type="text/babel"$1>');
  }

  // Inject Tailwind if classes detected
  if (isTailwind && !html.includes('tailwindcss') && !html.includes('cdn.tailwindcss')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + '\n' + TAILWIND_CDN + '\n' + html.slice(headEnd);
    }
  }

  // Inject Recharts if detected
  if (isRecharts && !html.includes('Recharts')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + '\n' + RECHARTS_CDN + '\n' + html.slice(headEnd);
    }
  }

  // Inject React Router if detected
  if (isRouter && !html.includes('react-router-dom')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + '\n' + REACT_ROUTER_CDN + '\n' + html.slice(headEnd);
    }
  }

  // Inject Framer Motion if detected
  if (isFramer && !html.includes('framer-motion')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + '\n' + FRAMER_MOTION_CDN + '\n' + html.slice(headEnd);
    }
  }

  // Inject shadcn design system CSS only if the HTML lacks its own design system
  const _hasOwnCSS = /<style[^>]*>[\s\S]{300,}<\/style>/i.test(html) && (/:root\s*\{/.test(html) || /--\w+\s*:/.test(html));
  if (!html.includes('aurion-design-system') && !_hasOwnCSS) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + '\n' + SHADCN_BASE_CSS + '\n' + html.slice(headEnd);
    }
  }

  // Inject premium fonts if not already present
  if (!html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + '\n' + PREMIUM_FONTS_CDN + '\n' + html.slice(headEnd);
    }
  }

  // Inject GSAP + Lenis if code uses them (only if not already injected by detectLibraryCDNs)
  const allContent = Object.values(files).map(f => f.content).join('\n');
  const hasGsap = (/\bgsap\b|ScrollTrigger|gsap\./i.test(allContent) || /\bgsap\b|ScrollTrigger|gsap\./i.test(html)) && !html.includes('gsap.min.js');
  const hasLenis = (/\bLenis\b|lenis/i.test(allContent) || /\bLenis\b|lenis/i.test(html)) && !html.includes('lenis.min.js');
  if (hasGsap) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + GSAP_CDN + '\n' + html.slice(headEnd);
  }
  if (hasLenis) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + LENIS_CDN + '\n' + html.slice(headEnd);
  }

  // Inject Font Awesome if used (only if not already injected)
  if (/\bfa-|fas |far |fab |fa /.test(html) && !html.includes('font-awesome')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + FA_CDN + '\n' + html.slice(headEnd);
  }

  // Inject auto-detected library CDNs (skip duplicates already present)
  const filteredLibCDNs = libCDNs.filter(cdn => {
    if (cdn.includes('gsap') && html.includes('gsap.min.js')) return false;
    if (cdn.includes('lenis') && html.includes('lenis.min.js')) return false;
    if (cdn.includes('font-awesome') && html.includes('font-awesome')) return false;
    return true;
  });
  if (filteredLibCDNs.length > 0) {
    const headEnd = html.indexOf('</head>');
    if (headEnd !== -1) {
      html = html.slice(0, headEnd) + '\n' + filteredLibCDNs.join('\n') + '\n' + html.slice(headEnd);
    }
  }

  // Replace unresolved __GEMINI_IMAGE_*__ and __LTX_VIDEO_URL__ placeholders with fallbacks
  html = html.replace(/__GEMINI_IMAGE_([a-zA-Z0-9_-]+)__/g, (_m, id) =>
    `https://placehold.co/800x600/1a1a2e/eaeaea?text=${encodeURIComponent(id)}`
  );
  html = html.replace(/__LTX_VIDEO_URL__/g, '');

  return html;
}

type AIModel = { id: string; name: string; provider: 'google' | 'anthropic' | 'ollama'; tags: string[] };

const MODELS: AIModel[] = [
  // ── Ollama Cloud — FREE unlimited AI ──
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'ollama', tags: ['Vision', 'Best'] },
  { id: 'gemma4', name: 'Gemma 4', provider: 'ollama', tags: ['Vision', 'Fast'] },
  { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', provider: 'ollama', tags: ['Vision', 'Fast'] },
  // ── Google Gemini — All models via Google AI API ──
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', tags: ['Vision', 'Best'] },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', tags: ['Vision', 'Fast'] },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', tags: ['Code', 'Fast'] },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'google', tags: ['Code', 'Fast'] },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', tags: ['Vision', 'Large'] },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', tags: ['Code'] },
  // ── Anthropic Claude — via Mammoth AI ──
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', tags: ['Code', 'Best'] },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', tags: ['Code', 'Fast'] },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', tags: ['Fast'] },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', tags: ['Large'] },
];

export {
  REACT_CDN, TAILWIND_CDN, LUCIDE_CDN, RECHARTS_CDN, REACT_ROUTER_CDN, FRAMER_MOTION_CDN,
  PREMIUM_FONTS_CDN, GSAP_CDN, LENIS_CDN, FA_CDN,
  SHADCN_BASE_CSS, MODELS,
  detectReactCode, detectTailwindCode, detectRechartsCode, detectReactRouter,
  detectFramerMotion, detectLibraryCDNs, assemblePreview,
};
