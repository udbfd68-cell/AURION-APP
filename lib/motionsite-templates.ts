/**
 * MOTIONSITE.AI — Premium Template Library v2.0 (MAXED OUT)
 *
 * 25 complete templates, 22+ videos, 11 font systems, 25 animations,
 * 18 glass effects, 11 hero blueprints, 8 navbar types, 40+ components.
 * Every pattern is COPY-PASTE READY with exact pixel specs.
 *
 * Categories:
 * 1. VIDEO_ASSETS — CloudFront/Mux HLS videos + complete React implementations
 * 2. FONT_SYSTEMS — 11 premium pairings with @import URLs + CSS variables
 * 3. DESIGN_TOKENS — 15 complete CSS variable systems (dark/light/glass/gradient)
 * 4. ANIMATION_PATTERNS — 25 Framer Motion/GSAP/CSS animations (full code)
 * 5. GLASS_EFFECTS — 18 glassmorphism CSS patterns (full ::before pseudo-elements)
 * 6. SECTION_BLUEPRINTS — 11 hero variants, 8 navbars, CTAs, footers (full JSX)
 * 7. COMPONENT_PATTERNS — 40+ buttons, badges, cards, marquees, forms (full code)
 * 8. TEMPLATE_CATALOG — 25 complete page architectures with exact specs
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. VIDEO ASSETS — Premium background videos + Complete React implementations
// ═══════════════════════════════════════════════════════════════════════════════

export const VIDEO_ASSETS = `
# PREMIUM VIDEO BACKGROUNDS — 22+ Production-Ready Assets
Use video backgrounds for SaaS, agency, portfolio hero sections. SKIP for editorial, healthcare, education, luxury where clean CSS backgrounds are more appropriate.
For CLONE mode: ONLY include video if the source site actually has one.
Pick by industry/mood. All: autoPlay muted loop playsInline.

## Direct MP4 Videos (CloudFront CDN — instant load, no hls.js needed)
| ID | URL | Best For | Overlay |
|----|-----|----------|---------|
| jet-luxury | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_091828_e240eb17-6edc-4129-ad9d-98678e3fd238.mp4 | Luxury, aviation, premium services | bg-black/40 |
| design-education | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4 | Education, tech, product design | bg-black/30 |
| stellar-saas | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_165750_358b1e72-c921-48b7-aaac-f200994f32fb.mp4 | SaaS, AI, dashboards | bg-black/30 |
| dark-ambient | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4 | AI, dark themes, talent/HR | bg-black/50 |
| cinematic-studio | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4 | Studios, editorial, portfolios | none (offset) |
| nexora-saas | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4 | Dashboards, fintech, automation | bg-black/30 |
| web3-abstract | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4 | Web3, blockchain, crypto | bg-black/50 |
| minimal-remote | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4 | Remote work, team tools | scaleY(-1) flip |
| bold-design | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260206_044704_dd33cb15-c23f-4cfc-aa09-a0465d4dcb54.mp4 | Bold agencies, creative | none (100% opacity) |
| mindloop-hero | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_120549_0cd82c36-56b3-4dd9-b190-069cfc3a623f.mp4 | Newsletter, content, editorial | bg-black/40 |
| mindloop-mission | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_132944_a0d124bb-eaa1-4082-aa30-2310efb42b4b.mp4 | Mission, philosophy | bg-black/40 |
| mindloop-solution | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_125119_8e5ae31c-0021-4396-bc08-f7aebeb877a2.mp4 | Solution, features | bg-black/40 |
| ai-agency-hero | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4 | AI agency, web design | bg-black/5 |
| video-agency | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260228_065522_522e2295-ba22-457e-8fdb-fbcd68109c73.mp4 | Video production, creators | none (100%) |
| purple-abstract | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4 | Purple themes, hospitality | none |
| logistics-transport | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260227_042027_c4b2f2ea-1c7c-4d6e-9e3d-81a78063703f.mp4 | Logistics, transport, shipping | none (100%) |

## HLS Streams (Mux — adaptive bitrate, requires hls.js)
| ID | URL | Best For | Position |
|----|-----|----------|----------|
| portfolio-hero | https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8 | Portfolio, dark creative | absolute inset-0 |
| mindloop-cta | https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8 | CTA sections, ambient | absolute inset-0 |
| ai-builder-hero | https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8 | AI builder, SaaS hero | absolute, opacity-60 |
| how-it-works | https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8 | Process, features | absolute inset-0 |
| stats-desat | https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8 | Stats (desaturated) | filter: saturate(0), opacity-40 |
| ai-automation | https://stream.mux.com/s8pMcOvMQXc4GD6AX4e1o01xFogFxipmuKltNfSYza0200.m3u8 | AI automation, left-aligned hero | margin-left:200px, scale 1.2 |
| synapse-hero | https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8 | SaaS hero, dark floating | bottom-[35vh], h-[80vh] |
| clearinvoice-hero | https://stream.mux.com/hUT6X11m1Vkw1QMxPOLgI761x2cfpi9bHFbi5cNg4014.m3u8 | Invoice SaaS, ecommerce | absolute, -z-10, 100% |

## Animated GIFs (Framer — for marquees and project cards)
- https://framerusercontent.com/images/IxET3FY7bVKVjnCPsFxjGpeqiE.gif
- https://framerusercontent.com/images/AiQx0IACcZkOOSQMNWWxhKDFbw.gif
- https://framerusercontent.com/images/PvnPkYODnBcKZcI29rl0eSJtpYA.gif
- https://framerusercontent.com/images/C7cV0xQoiJcGSk2Dq24aN5FWbQ.gif
- https://framerusercontent.com/images/i5LoUAvruSaYdl2HKXZ91KOFNA.gif
- https://framerusercontent.com/images/O43gNvzFwBqZqVwAu6VnO3yHFo.gif
- https://framerusercontent.com/images/4kz8cjk77nXhz1qYr49nUCG2c.gif
- https://framerusercontent.com/images/C9dNqwfdJYg3OP09rxFVTEp3Zqo.gif

## Orb Video Asset
Source: https://future.co/images/homepage/glassy-orb/orb-purple.webm
Usage: mix-blend-screen (removes black bg), transform: scale(1.25)
Color Grade: filter: hue-rotate(-55deg) saturate(250%) brightness(1.2) contrast(1.1)

## Poster Fallback Image
URL: https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080

## COMPLETE REACT VIDEO IMPLEMENTATIONS

### 1. Memoized HLS Video Component (use for ALL .m3u8 streams)
\`\`\`tsx
import { memo, useEffect, useRef } from "react";
import Hls from "hls.js";

const HLSVideo = memo(({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => { if (e.name !== 'AbortError') console.log('Auto-play prevented:', e); });
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((e) => console.log("Auto-play prevented:", e));
      });
    }
    return () => { if (hls) hls.destroy(); };
  }, [src]);
  return <video ref={videoRef} className={className} style={style} autoPlay muted loop playsInline />;
});
HLSVideo.displayName = "HLSVideo";
\`\`\`

### 2. Basic MP4 Fullscreen Background
\`\`\`tsx
<div className="relative h-screen overflow-hidden">
  <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0"
    poster="POSTER_URL">
    <source src="MP4_URL" type="video/mp4" />
  </video>
  <div className="absolute inset-0 bg-black/40 z-[1]" />
  <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent z-[2]" />
  <div className="relative z-10">{/* content */}</div>
</div>
\`\`\`

### 3. Cinematic Fade-Loop Video (seamless)
\`\`\`tsx
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  let raf: number;
  const tick = () => {
    const t = video.currentTime, d = video.duration;
    if (d > 0) {
      if (t < 0.5) video.style.opacity = String(t / 0.5);
      else if (d - t < 0.5) video.style.opacity = String((d - t) / 0.5);
      else video.style.opacity = '1';
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, []);
\`\`\`

### 4. Floating Video (Synapse — behind text, offset from bottom)
\`\`\`tsx
<div className="absolute bottom-[35vh] left-0 w-full h-[80vh] z-0">
  <HLSVideo src="HLS_URL" className="w-full h-full object-cover" />
</div>
\`\`\`

### 5. Right-Shifted Video (AI Automation — content left, video right)
\`\`\`tsx
<video className="absolute inset-0 w-full h-full object-cover z-0"
  style={{ marginLeft: '200px', transform: 'scale(1.2)', transformOrigin: 'left' }}
  autoPlay muted loop playsInline />
<div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#070612] to-transparent z-10" />
\`\`\`

### 6. Scaled 150% Video (Wealth — zoomed, top-left focal)
\`\`\`tsx
<video className="absolute inset-0 w-full h-full object-cover z-0"
  style={{ transform: 'scale(1.5)', transformOrigin: 'top left' }}
  autoPlay muted loop playsInline />
\`\`\`

### 7. Vertically Flipped Video (Minimalist)
\`\`\`tsx
<video className="absolute inset-0 w-full h-full object-cover [transform:scaleY(-1)] z-0" />
\`\`\`

### 8. Orb Video with Color Grade (Taskly light theme)
\`\`\`tsx
<video autoPlay muted loop playsInline
  className="w-full h-full object-contain"
  style={{ mixBlendMode: 'screen', transform: 'scale(1.25)',
    filter: 'hue-rotate(-55deg) saturate(250%) brightness(1.2) contrast(1.1)' }}>
  <source src="https://future.co/images/homepage/glassy-orb/orb-purple.webm" type="video/webm" />
</video>
\`\`\`

### 9. Desaturated Video (Stats sections)
\`\`\`tsx
<HLSVideo src="HLS_URL" className="absolute inset-0 w-full h-full object-cover z-0"
  style={{ filter: 'saturate(0)', opacity: 0.4 }} />
\`\`\`

### 10. Video Section with Top + Bottom Black Fades (200px each)
\`\`\`tsx
<div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-black to-transparent z-[1]" />
<div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-black to-transparent z-[1]" />
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. FONT SYSTEMS — 11 Premium pairings with complete configs
// ═══════════════════════════════════════════════════════════════════════════════

export const FONT_SYSTEMS = `
# PREMIUM FONT SYSTEMS — 11 Production-Ready Pairings
ALWAYS use premium fonts. Never use system defaults. Pick the pairing that matches the template theme.
Add -webkit-font-smoothing: antialiased to all pages.

### 1. PP Neue Montreal + PP Mondwest (Creative Studio / Apple-Inspired)
\`\`\`css
@font-face { font-family: 'PP Neue Montreal'; font-weight: 400; src: url('https://assets.website-files.com/6009ec8cda7f305645c9d91b/60176f9bb43e36419997ecfe_PPNeueMontreal-Book.otf') format('opentype'); }
@font-face { font-family: 'PP Neue Montreal'; font-weight: 500; src: url('https://assets.website-files.com/6009ec8cda7f305645c9d91b/60176f9b39c5673e51a86f5a_PPNeueMontreal-Medium.otf') format('opentype'); }
body { font-family: 'PP Neue Montreal', -apple-system, BlinkMacSystemFont, sans-serif; -webkit-font-smoothing: antialiased; }
\`\`\`
Accent word: \`style={{ fontFamily: "'PP Mondwest', serif" }}\` — use on: "next wave", "bold way", "builders"

### 2. Instrument Serif + Inter (Portfolio / SaaS / Editorial)
\`\`\`css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
:root { --font-display: 'Instrument Serif', serif; --font-body: 'Inter', sans-serif; }
/* Headlines: var(--font-display) italic | Body: var(--font-body) 400-600 */
\`\`\`

### 3. General Sans + Geist Sans (Web3 / AI / Modern Tech)
\`\`\`css
@import url('https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap');
:root { --font-display: 'General Sans', sans-serif; --font-body: 'Geist Sans', sans-serif; }
\`\`\`

### 4. Geist + Instrument Serif (Minimalist SaaS / Remote Tools)
\`\`\`css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
/* Geist: heading at 80px, tracking -0.04em, font-weight 500 */
/* Instrument Serif italic: accent word at 100px (LARGER than heading) */
\`\`\`

### 5. Rubik (Bold Agencies / Design-Forward / Logistics)
\`\`\`css
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap');
/* Usage: ALL-CAPS, font-weight 700, letter-spacing -4%, line-height 0.98 */
/* Pairs with: brand red #EE3F2C, clip-path diagonal buttons */
\`\`\`

### 6. Instrument Sans + Instrument Serif (AI Builder / Modern SaaS)
\`\`\`css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Instrument+Serif:ital@0;1&display=swap');
:root { --font-body: 'Instrument Sans', sans-serif; --font-display: 'Instrument Serif', serif; }
/* Body: Instrument Sans 400-700 | Pre-headline: Instrument Serif 48px */
/* Headline: Instrument Sans semibold 136px, gradient text */
\`\`\`

### 7. Fustat + Inter (Liquid Glass / Task Management / Light)
\`\`\`css
@import url('https://fonts.googleapis.com/css2?family=Fustat:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
/* Fustat Bold: headlines 75px, -2px tracking, 1.05 line-height */
/* Inter Normal: body 18px, -1px tracking, descriptions */
\`\`\`

### 8. Manrope + Cabin + Instrument Serif + Inter (Premium Hybrid / Hospitality)
\`\`\`css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Cabin:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');
/* Manrope: nav links 14px medium | Cabin: buttons/tags 14-16px medium */
/* Instrument Serif: headline italic accents | Inter: body 18px normal */
/* Headline: text-5xl mobile → 96px desktop, leading-[1.1] */
\`\`\`

### 9. Instrument Serif + Barlow (Dark Agency / Premium / Liquid Glass)
\`\`\`css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&display=swap');
:root { --font-heading: 'Instrument Serif', serif; --font-body: 'Barlow', sans-serif; }
/* ALL headings: font-heading italic, tracking-tight, leading-[0.9] */
/* ALL body: font-body font-light (300), text-white/60, text-sm */
/* ALL buttons: font-body font-medium (500), rounded-full */
\`\`\`

### 10. Rubik Bold (Logistics / Transport / Industrial)
\`\`\`css
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap');
/* Headlines: Rubik 700 (bold), uppercase, tracking -4% (-4px), line-height 0.98 */
/* 64px desktop → 42px mobile | Brand red #EE3F2C accent */
\`\`\`

### 11. Switzer + Geist (SaaS / Invoice / Ecommerce)
\`\`\`css
/* Switzer: Medium weight, tight tracking — headings text-6xl leading-tight */
/* Geist: 400-500, clean — body, subheads, nav links */
/* Pair with: orange gradient CTAs, 5px top gradient bar */
\`\`\`

## ACCENT FONT RULES — ALWAYS apply serif italic on key words:
- Wrap accent words: \`<span className="font-serif italic">word</span>\`
- Common accent words: "Business.", "Overview.", "and", "management", "viral", "changed.", "the eternal."
- Font: Instrument Serif italic (or PP Mondwest for creative themes)
- Can be LARGER than surrounding text (e.g. 100px in 80px heading)
- Can be different COLOR (muted gray in white heading)
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DESIGN TOKENS — 15 Complete CSS variable systems
// ═══════════════════════════════════════════════════════════════════════════════

export const DESIGN_TOKENS = `
# DESIGN TOKEN SYSTEMS — Pick one per site, apply to :root

## 1. Dark Monochrome (Mindloop / Newsletter / Content)
\`\`\`css
:root {
  --background: 0 0% 0%; --foreground: 0 0% 100%;
  --card: 0 0% 5%; --card-foreground: 0 0% 100%;
  --primary: 0 0% 100%; --primary-foreground: 0 0% 0%;
  --secondary: 0 0% 12%; --secondary-foreground: 0 0% 85%;
  --muted: 0 0% 15%; --muted-foreground: 0 0% 65%;
  --accent: 170 15% 45%; --border: 0 0% 20%;
  --input: 0 0% 18%; --ring: 0 0% 40%;
  --hero-subtitle: 210 17% 95%; --radius: 9999px;
  --font-heading: 'Instrument Serif', serif; --font-body: 'Inter', sans-serif;
}
\`\`\`

## 2. Dark Portfolio (Cinematic / Creative)
\`\`\`css
:root {
  --bg: 0 0% 4%; --surface: 0 0% 8%; --text: 0 0% 96%;
  --muted: 0 0% 53%; --stroke: 0 0% 12%; --accent: 0 0% 96%;
  /* Accent gradient: linear-gradient(90deg, #89AACC 0%, #4E85BF 100%) */
}
\`\`\`

## 3. Deep Dark Blue-Purple (AI / Talent / HR Tech)
\`\`\`css
:root { --background: 260 87% 3%; --foreground: 40 6% 95%; --hero-sub: 40 6% 82%; }
\`\`\`

## 4. Light SaaS (Nexora / Fintech / Dashboard)
\`\`\`css
:root {
  --background: 0 0% 100%; --foreground: 210 14% 17%;
  --primary: 210 14% 17%; --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 96%; --muted: 0 0% 96%; --muted-foreground: 184 5% 55%;
  --accent: 239 84% 67%; --border: 0 0% 90%; --ring: 239 84% 67%;
  --shadow-dashboard: 0 25px 80px -12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06);
}
\`\`\`

## 5. V Vortex Light (Creative / Apple-Inspired)
\`\`\`css
:root {
  --primary-dark: #051A24; --dark: #0D212C; --muted-dark: #273C46;
  --light: #F6FCFF; --light-muted: #E0EBF0; --bg: white;
  /* NO purple, indigo, or violet. Clean Apple aesthetic. */
}
\`\`\`

## 6. Cinematic Light (Aethera / Editorial Studio)
\`\`\`css
:root { --headline: #000000; --description: #6F6F6F; --bg: #FFFFFF; }
/* Two-tone ONLY: black headlines + gray descriptions. No accent colors, no gradients. */
\`\`\`

## 7. Purple Glassmorphism (SaaS Dark / Startup)
\`\`\`css
:root { --bg: #010101; --gradient: linear-gradient(135deg, #FA93FA, #C967E8, #983AD6); }
/* Gradient on accents ONLY. Text gradient: white to purple on headlines. bg-clip-text. */
\`\`\`

## 8. AI Builder Dark (Instrument Sans/Serif)
\`\`\`css
:root {
  --bg: #000000; --primary-text: white; --secondary-text: rgba(255,255,255,0.8);
  --muted-text: rgba(255,255,255,0.7); --button-accent: #3054ff;
  --button-accent-hover: #2040e0; --button-text: #0a0400;
  --gradient-end: #b4c0ff; --decorative-blue: rgba(30,58,138,0.2);
  --decorative-indigo: rgba(49,46,129,0.2);
}
/* Headline gradient: bg-gradient-to-b from-white via-white to-[#b4c0ff] bg-clip-text text-transparent */
\`\`\`

## 9. Liquid Glass Light (Taskly / Task Management)
\`\`\`css
:root {
  --bg: #ffffff; --primary-blue: rgba(0,132,255,0.8); --text-dark: #000000;
  --star-orange: #FF801E; --nav-bg: rgba(255,255,255,0.3);
  --nav-border: rgba(0,0,0,0.1); --nav-highlight: inset 0px 4px 4px 0px rgba(255,255,255,0.25);
  /* Top-left gradient glow: blurred ellipses #60B1FF + #319AFF behind content */
}
\`\`\`

## 10. Purple Video (Datacore / Hospitality)
\`\`\`css
:root {
  --primary: #7b39fc; --secondary: #2b2344; --bg: #000000;
  --text: white; --muted: rgba(255,255,255,0.7);
  --glass-pill: rgba(85,80,110,0.4); --glass-border: rgba(164,132,215,0.5);
}
\`\`\`

## 11. Logistics Red (Targo / Transport)
\`\`\`css
:root {
  --bg: #000000; --brand-red: #EE3F2C; --text: white; --dark: #222;
  --clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
}
\`\`\`

## 12. AI Automation Dark Purple (Business AI)
\`\`\`css
:root {
  --bg: #070612; --foreground: white; --muted-foreground: rgba(255,255,255,0.8);
  --cta-bg: white; --cta-text: #070612; --secondary-bg: rgba(255,255,255,0.2);
}
\`\`\`

## 13. Wealth Management Dark
\`\`\`css
:root { --bg: #000000; --text: white; --muted: rgba(255,255,255,0.7); }
/* Video: scale-150, transform-origin top left. Glassmorphic pill badges. */
\`\`\`

## 14. Synapse Dark SaaS
\`\`\`css
:root {
  --bg: #000000; --foreground: white; --muted: rgba(255,255,255,0.7);
  --glass-badge-bg: rgba(255,255,255,0.05); --glass-badge-border: rgba(255,255,255,0.1);
  --nav-bg: rgba(0,0,0,0.3); --nav-border: rgba(255,255,255,0.06);
  --active-gradient: linear-gradient(to right, #a78bfa, #60a5fa);
  --cta-gradient: linear-gradient(to bottom, white, #d4d4d4);
}
\`\`\`

## 15. ClearInvoice SaaS Dark
\`\`\`css
:root {
  --bg: #000000; --foreground: white;
  --top-bar: linear-gradient(to right, #ccf, #e7d04c, #31fb78);
  --primary-gradient: linear-gradient(to right, #FF3300, #EE7926);
  --primary-glow: #ea580c; --primary-stroke: rgba(255,255,255,0.2);
  --secondary-bg: rgba(255,255,255,0.9); --secondary-stroke: rgba(0,0,0,0.05);
}
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ANIMATION PATTERNS — 25 Complete, Copy-Paste Ready
// ═══════════════════════════════════════════════════════════════════════════════

export const ANIMATION_PATTERNS = `
# 25 PREMIUM ANIMATION PATTERNS — Complete Code
Import: \`import { motion, useScroll, useTransform, AnimatePresence, useInView } from "motion/react";\`

## 1. Infinite Marquee (logos, images, testimonials)
\`\`\`css
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.marquee { animation: marquee 30s linear infinite; }
@media (max-width: 767px) { .marquee { animation-duration: 10s; } }
\`\`\`
\`\`\`tsx
const items = [...data, ...data]; // duplicate for seamless loop
<div className="overflow-hidden"><div className="flex marquee">{items.map(...)}</div></div>
\`\`\`

## 2. Fade-In-Up (universal entrance — CSS only)
\`\`\`css
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; opacity: 0; }
\`\`\`

## 3. Framer Motion fadeUp Helper
\`\`\`tsx
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, delay, ease: "easeOut" },
});
// Usage: <motion.div {...fadeUp(0.2)}>content</motion.div>
\`\`\`

## 4. Scroll-Driven Word Reveal (editorial / mission sections)
\`\`\`tsx
const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.3"] });
{words.map((word, i) => {
  const progress = useTransform(scrollYProgress, [i / words.length, (i + 1) / words.length], [0.15, 1]);
  return <motion.span key={i} style={{ opacity: progress }} className="mr-[0.3em]">{word}</motion.span>;
})}
\`\`\`

## 5. Loading Screen Counter (000 → 100 + rotating words)
\`\`\`tsx
// Full-screen z-[9999] overlay. RAF counter over 2700ms.
// Rotating words every 900ms: ["Design", "Create", "Inspire"]
// Progress bar: h-[3px], accent-gradient, scaleX(count/100), origin-left
// On count === 100: 400ms delay → unmount with opacity transition
\`\`\`

## 6. GSAP Entrance Timeline
\`\`\`tsx
gsap.timeline({ defaults: { ease: "power3.out" } })
  .fromTo('.name', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.1 })
  .fromTo('.blur-in', { opacity: 0, filter: 'blur(10px)', y: 20 }, 
    { opacity: 1, filter: 'blur(0)', y: 0, duration: 1, stagger: 0.1 }, '-=0.8');
\`\`\`

## 7. GSAP Marquee (infinite horizontal)
\`\`\`tsx
gsap.to('.marquee-track', { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
\`\`\`

## 8. GSAP Parallax Pinned Gallery
\`\`\`tsx
ScrollTrigger.create({ trigger: section, pin: content, pinSpacing: false });
// 2 columns with different yPercent speeds
\`\`\`

## 9. Shiny Text Gradient Sweep
\`\`\`tsx
<motion.span
  className="bg-clip-text text-transparent"
  style={{ backgroundImage: 'linear-gradient(90deg, #64CEFB 0%, #fff 50%, #64CEFB 100%)', backgroundSize: '200% 100%' }}
  animate={{ backgroundPosition: ['100% 0', '-100% 0'] }}
  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
>{text}</motion.span>
\`\`\`

## 10. Role/Word Cycling (every 2s with AnimatePresence)
\`\`\`tsx
const roles = ["Creative", "Fullstack", "Founder", "Scholar"];
const [idx, setIdx] = useState(0);
useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % roles.length), 2000); return () => clearInterval(t); }, []);
<AnimatePresence mode="wait">
  <motion.span key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.3 }}>{roles[idx]}</motion.span>
</AnimatePresence>
\`\`\`

## 11. Scroll Indicator
\`\`\`css
@keyframes scroll-down { 0% { transform: translateY(-100%); } 100% { transform: translateY(200%); } }
/* Container: w-px h-10 bg-stroke overflow-hidden. Inner bar: w-full h-3 bg-foreground animate. */
\`\`\`

## 12. Auto-Cycling Tab Bar (4s interval)
\`\`\`tsx
const [activeTab, setActiveTab] = useState(0);
const tabs = [{ icon: Search, label: 'Analyse' }, { icon: Brain, label: 'Train' }, { icon: FlaskConical, label: 'Testing' }, { icon: Rocket, label: 'Deploy' }];
useEffect(() => { const t = setInterval(() => setActiveTab(i => (i + 1) % tabs.length), 4000); return () => clearInterval(t); }, []);
// Active: bg-white text-black shadow-sm | Inactive: text-gray-600
\`\`\`

## 13. Gradient Border Animation
\`\`\`css
@keyframes gradient-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
/* Apply: background-size: 200% 200%, animation: gradient-shift 6s ease infinite */
\`\`\`

## 14. BlurText Word-by-Word (Dark Agency hero headlines)
\`\`\`tsx
const BlurText = ({ text, className, delayOffset = 0 }: { text: string; className?: string; delayOffset?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(' ');
  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span key={i} className="inline-block mr-[0.3em]"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 50 }}
          animate={isInView ? { filter: 'blur(0px)', opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.35, delay: delayOffset + i * 0.1, ease: 'easeOut' }}
        >{word}</motion.span>
      ))}
    </span>
  );
};
\`\`\`

## 15. BlurIn Wrapper (wraps any element)
\`\`\`tsx
const BlurIn = ({ children, delay = 0, duration = 0.6 }: { children: React.ReactNode; delay?: number; duration?: number }) => (
  <motion.div
    initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
    transition={{ delay, duration, ease: 'easeOut' }}
  >{children}</motion.div>
);
\`\`\`

## 16. SplitText Staggered (hero headlines, 0.08s between words)
\`\`\`tsx
const SplitText = ({ text, className, staggerDelay = 0.08, baseDelay = 0 }: { text: string; className?: string; staggerDelay?: number; baseDelay?: number }) => (
  <span className={className}>
    {text.split(' ').map((word, i) => (
      <motion.span key={i} className="inline-block mr-[0.3em]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: baseDelay + i * staggerDelay, duration: 0.6, ease: 'easeOut' }}
      >{word}</motion.span>
    ))}
  </span>
);
\`\`\`

## 17. Parallax Scroll (hero content + dashboard)
\`\`\`tsx
const sectionRef = useRef(null);
const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -200]);
const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
const dashY = useTransform(scrollYProgress, [0, 1], [0, -250]);
// <motion.div style={{ y: heroY, opacity: heroOpacity }}>...hero text</motion.div>
// <motion.div style={{ y: dashY }}>...dashboard image</motion.div>
\`\`\`

## 18. Scroll Word-Color-Reveal (Testimonial — gray to white)
\`\`\`tsx
const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end center'] });
{words.map((word, i) => {
  const start = i / words.length, end = (i + 1) / words.length;
  const opacity = useTransform(scrollYProgress, [start, end], [0.2, 1]);
  const color = useTransform(scrollYProgress, [start, end], ['hsl(0 0% 35%)', 'hsl(0 0% 100%)']);
  return <motion.span key={i} style={{ opacity, color }} className="mr-[0.3em]">{word}</motion.span>;
})}
\`\`\`

## 19. Video CSS Filter Color Grading
\`\`\`css
filter: hue-rotate(-55deg) saturate(250%) brightness(1.2) contrast(1.1);
mix-blend-mode: screen; transform: scale(1.25);
\`\`\`

## 20. Staggered Container Variants (Synapse — children auto-stagger)
\`\`\`tsx
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } };
<motion.div variants={container} initial="hidden" animate="visible">
  <motion.div variants={item}>badge row</motion.div>
  <motion.h1 variants={item}>headline</motion.h1>
  <motion.p variants={item}>subtitle</motion.p>
  <motion.div variants={item}>buttons</motion.div>
</motion.div>
\`\`\`

## 21. Hero Entrance Stagger (exact delays per element)
\`\`\`tsx
// Tag pill: initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0 }}
// Title:   initial={{ opacity:0, y:20 }} delay:0.1, duration:0.6
// Subtitle:initial={{ opacity:0, y:20 }} delay:0.2, duration:0.6
// CTA:     initial={{ opacity:0, y:20 }} delay:0.3, duration:0.6
// Dashboard:initial={{ opacity:0, y:40 }} delay:0.4, duration:0.8
\`\`\`

## 22. Conditional Overlay Animations (Tab-triggered)
\`\`\`css
@keyframes fade-in-overlay { from { opacity: 0; } to { opacity: 1; } } /* 0.4s ease */
@keyframes slide-up-overlay { from { opacity: 0; transform: translate(-50%, -40%); } to { opacity: 1; transform: translate(-50%, -50%); } } /* 0.5s ease */
\`\`\`

## 23. Gradient Glow Hover (on button, increases glow intensity)
\`\`\`tsx
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="relative">
  <div className="absolute inset-[-4px] bg-orange-600 blur-lg opacity-20 group-hover:opacity-60 transition-opacity rounded-xl -z-10" />
  <span className="relative z-10">Button Text</span>
</motion.button>
\`\`\`

## 24. Arrow Slide-In on Hover
\`\`\`tsx
<button className="group flex items-center gap-2">
  <span>Get Started</span>
  <ArrowRight className="w-4 h-4 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
</button>
\`\`\`

## 25. Scale + Glow Button Hover
\`\`\`tsx
<motion.button whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(255,255,255,0.3)' }}
  whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
  Button
</motion.button>
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GLASS EFFECTS — 18 Complete CSS Patterns
// ═══════════════════════════════════════════════════════════════════════════════

export const GLASS_EFFECTS = `
# 18 GLASS EFFECTS — Complete CSS with Pseudo-Elements

## 1. Liquid Glass (standard — dark themes)
\`\`\`css
.liquid-glass {
  background: rgba(255,255,255,0.01); background-blend-mode: luminosity;
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  border: none; box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);
  position: relative; overflow: hidden;
}
.liquid-glass::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.4px;
  background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
}
\`\`\`

## 2. Liquid Glass Strong (heavy blur — agency buttons, navbar pills)
\`\`\`css
.liquid-glass-strong {
  background: rgba(255,255,255,0.01); background-blend-mode: luminosity;
  backdrop-filter: blur(50px); -webkit-backdrop-filter: blur(50px);
  border: none; box-shadow: 4px 4px 4px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.15);
  position: relative; overflow: hidden;
}
/* Same ::before but opacity: 0.5/0.2 (stronger gradient) */
\`\`\`

## 3. Frosted Navbar Pill (dark portfolio)
\`\`\`css
.nav-pill { backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1);
  background: hsl(var(--surface)); border-radius: 9999px; padding: 0.5rem; }
\`\`\`

## 4. Liquid Glass Taskly Navbar (white/light — sticky centered)
\`\`\`css
.nav-glass { position: sticky; top: 30px; width: fit-content; margin: 0 auto;
  backdrop-filter: blur(50px); background: rgba(255,255,255,0.3); border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.1); box-shadow: inset 0px 4px 4px 0px rgba(255,255,255,0.25); }
\`\`\`

## 5. Glassmorphic Tag Pill (purple/dark — Datacore)
\`\`\`css
.glass-pill { background: rgba(85,80,110,0.4); backdrop-filter: blur(12px);
  border: 1px solid rgba(164,132,215,0.5); border-radius: 10px; }
/* Inner badge: bg-[#7b39fc] text-white rounded-[6px] px-2 py-0.5 text-sm font-medium */
\`\`\`

## 6. Accent Gradient Border Ring (hover — portfolio)
\`\`\`css
.gradient-ring { position: absolute; inset: -2px; border-radius: inherit;
  background: linear-gradient(90deg, #89AACC 0%, #4E85BF 100%);
  z-index: -1; opacity: 0; transition: opacity 0.3s; }
.group:hover .gradient-ring { opacity: 1; }
\`\`\`

## 7. Dashboard Card Shadow (light SaaS)
\`\`\`css
box-shadow: 0 25px 80px -12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06);
\`\`\`

## 8. Web3 Glow Button
\`\`\`css
/* Pill: 0.6px solid white border. Inner: bg-black text-white rounded-full.
   Top edge: absolute blurred blob (w-20 h-3 bg-white/30 blur-md -top-1 left-1/2 -translate-x-1/2) */
\`\`\`

## 9. High-Gloss CTA (minimalist tactile)
\`\`\`css
box-shadow: inset -4px -6px 25px 0px rgba(201,201,201,0.08), inset 4px 4px 10px 0px rgba(29,29,29,0.24);
\`\`\`

## 10. Clipped-Corner Button (logistics)
\`\`\`css
.clipped-btn { clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%); }
\`\`\`

## 11. Saturated Glass Card (logistics consultation)
\`\`\`css
.consultation-glass { backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.1); }
\`\`\`

## 12. Blue Circle CTA (AI builder white pill)
\`\`\`css
.cta-blue { background: white; border-radius: 9999px; padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  display: flex; align-items: center; gap: 0.75rem; }
.cta-blue .arrow { width: 40px; height: 40px; border-radius: 50%; background: #3054ff; display: grid; place-items: center; }
.cta-blue:hover { box-shadow: 0 0 20px rgba(255,255,255,0.3); transform: scale(1.05); }
\`\`\`

## 13. Glass Navbar (Synapse — fixed blur with gradient active)
\`\`\`css
.glass-nav { position: fixed; top: 0; width: 100%; z-index: 50;
  backdrop-filter: blur(16px); background: rgba(0,0,0,0.3);
  border-bottom: 1px solid rgba(255,255,255,0.06); }
.nav-active { border-bottom: 2px solid; border-image: linear-gradient(to right, #a78bfa, #60a5fa) 1; }
\`\`\`

## 14. Glass Integration Badge (Synapse row)
\`\`\`css
.glass-badge { display: flex; align-items: center; gap: 0.5rem;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 9999px; padding: 0.375rem 0.75rem; backdrop-filter: blur(8px); }
\`\`\`

## 15. Secondary Glass Button (transparent pill)
\`\`\`css
.btn-glass { background: transparent; border: 1px solid rgba(255,255,255,0.15);
  backdrop-filter: blur(8px); color: white; border-radius: 9999px; padding: 0.75rem 1.5rem; }
.btn-glass:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.25); }
\`\`\`

## 16. Orange Gradient Glow CTA (ClearInvoice)
\`\`\`css
.btn-orange { background: linear-gradient(to right, #FF3300, #EE7926);
  border: 1.5px solid rgba(255,255,255,0.2); border-radius: 12px; position: relative; }
.btn-orange::before { content: ''; position: absolute; inset: -4px;
  background: #ea580c; filter: blur(16px); opacity: 0.2; border-radius: inherit; z-index: -1; transition: opacity 0.3s; }
.btn-orange:hover::before { opacity: 0.6; }
.btn-orange:hover { transform: scale(1.05); }
\`\`\`

## 17. White Backdrop Button (ClearInvoice secondary)
\`\`\`css
.btn-white { background: rgba(255,255,255,0.9); backdrop-filter: blur(8px);
  border: 1.5px solid rgba(0,0,0,0.05); color: black; border-radius: 12px; }
.btn-white:hover { background: white; transform: scale(1.05); }
\`\`\`

## 18. Taskly CTA (blue glass with highlight)
\`\`\`css
.btn-taskly { background: rgba(0,132,255,0.8); backdrop-filter: blur(2px);
  color: white; border-radius: 16px;
  box-shadow: inset 0px 4px 4px 0px rgba(255,255,255,0.35); }
.btn-taskly:hover { transform: scale(1.02); }
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SECTION BLUEPRINTS — Complete architectures with exact specs
// ═══════════════════════════════════════════════════════════════════════════════

export const SECTION_BLUEPRINTS = `
# SECTION BLUEPRINTS — 11 Hero Variants + 8 Navbar Types + CTAs + Footers

## ─── HERO VARIANTS ───

### A. Video Hero — Full Viewport (Most Common)
Container: relative h-screen overflow-hidden bg-black
Video: absolute inset-0 w-full h-full object-cover z-0, autoPlay muted loop playsInline
Overlay: absolute inset-0 bg-black/40 z-[1]
Bottom fade: absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent z-[2]
Content: relative z-10, flex flex-col items-center justify-center text-center, px-6
Staggered entrance: 0.1s delay increments on badge → heading → subtitle → CTAs

### B. Offset Video (Aethera — editorial, video below fold)
Video: absolute, top: 300px, left: 0, right: 0, bottom: 0 (NOT fullscreen)
Cinematic fade-loop: requestAnimationFrame opacity tick (0→1 over 0.5s start, 1→0 over 0.5s end)
Gradient overlays: bg-gradient-to-b from-background via-transparent to-background
Content: sits ABOVE video in document flow, generous top padding (pt-40)

### C. Minimal Hero (V Vortex — no video, Apple-clean)
Max-width: 440px centered, pt-12 md:pt-16
Logo → tagline → heading with serif accent words → description → 2 CTAs
Clean white space, no video, no gradients, Apple-inspired

### D. Dashboard Preview Hero (Nexora / Neuralyn)
Background video: absolute, full cover, z-0
Content: centered z-10, staggered fade-up
Dashboard image: absolute, centered, max-w-5xl w-[90%] rounded-2xl, mixBlendMode: "luminosity"
Full-width trick: w-screen, marginLeft: calc(-50vw + 50%), aspect-[16/9]
Parallax: dashboard y: [0, -250], hero text y: [0, -200] + opacity: [1, 0] (over 50% scroll)
Bottom gradient: h-40, from-background to transparent, z-30

### E. Left-Aligned + Right-Shifted Video (AI Automation)
Container: relative min-h-screen overflow-hidden bg-[#070612]
Video: absolute inset-0, margin-left: 200px, scale: 1.2, transform-origin: left, object-cover, z-0
Bottom gradient: h-40, from-[#070612] to transparent, z-10
Content: z-20, LEFT-aligned (not centered), max-w-7xl px-6 lg:px-12, vertically centered
Elements: Badge pill (Sparkles icon) → gap-6 → SplitText heading (3 lines, serif italic on "Business.") → gap-6 → Subtitle (max-w-xl, text-white/80) → gap-12 → 2 CTAs (solid white + glass)
Animations: BlurIn on badge/subtitle/CTAs, SplitText stagger 0.08s on heading

### F. Glassy Orb Hero (Taskly — light theme, dual column)
Background: white with top-left blurred gradient ellipses (#60B1FF + #319AFF)
Left column: social proof (orange stars, "4.9/5 by 2700+"), headline 75px Fustat Bold, subtitle Inter 18px, blue glass CTA
Right column: orb-purple.webm video, mix-blend-screen, hue-rotate(-55deg) saturate(250%), scale 1.25
Navbar: sticky top-[30px] w-fit mx-auto, background rgba(255,255,255,0.3), backdrop-blur-[50px], rounded-[16px]
Border: 1px solid rgba(0,0,0,0.1), box-shadow: inset 0px 4px 4px rgba(255,255,255,0.25)

### G. Full-Opacity Video (Logoisum / Targo — no overlay)
Video: 100% opacity, NO dark overlay, object-cover
Content floats on top with text-shadow for readability
White floating navbar: rounded-[16px], shadow, logo + center links + CTA right
Min-h-[90vh], two-font heading system (sans-serif tight tracking + serif italic at larger size)

### H. Scaled 150% Video (Wealth Management — zoomed cinematic)
Video: scale-1.5, transform-origin: top left, object-cover, no overlay
Navbar: transparent, "Sign in" link + white "Get Started" pill
Glassmorphic badge pill → Large headline → Subtitle → White CTA pill
Centered content, black bg

### I. 1000px-Height Video (Dark Agency — video at top 20%)
Container: relative, height: 1000px, bg-black, overflow-visible
Video: absolute, top: 20%, w-full h-auto object-contain, z-0
Overlay: absolute inset-0 bg-black/5 z-0
Bottom gradient: absolute bottom-0, h-[300px], from transparent to black, z-[1]
Content: z-10, centered, pt-[150px]
BlurText headline, staggered delay per word (0.1s)
Badge pill → CTA → Partners bar at bottom (mt-auto pb-8 pt-16)

### J. Floating Video (Synapse — video behind text at bottom offset)
Background: solid #000000
Video container: absolute bottom-[35vh] left-0 w-full h-[80vh] z-0 (floating, not fullscreen)
HLS via memoized component with hls.js
Content: z-10, centered (text-center), relative
Elements: 3 glass badges row → heading ~80px → 2-line subtitle → 2 CTAs
Logo marquee: absolute bottom, grayscale SVGs, 40% opacity
Animations: staggered container variants (0.15s between children)

### K. Ecommerce Hero (ClearInvoice — gradient top bar)
5px gradient bar: fixed top-0, from-[#ccf] via-[#e7d04c] to-[#31fb78], z-100
Video: absolute, -z-10, full cover, 100% opacity
Content: centered z-10, mt-16 md:mt-20 px-4
Headline: text-6xl tight leading
Primary CTA: orange gradient glow (#FF3300→#EE7926) + 1.5px inner stroke + arrow slide-in
Secondary CTA: bg-white/90 backdrop-blur + 1.5px border-black/5
Social proof: 3 overlapping avatars + "Trusted by 210k+"

## ─── NAVBAR TYPES ───

### Nav-A. Floating Pill (dark — portfolio)
fixed top-0, centered, rounded-full, backdrop-blur-md, logo + dividers + links + CTA, gains shadow on scroll

### Nav-B. Full-Width Transparent
flex justify-between, px-8 py-6, max-w-7xl mx-auto, gradient divider below

### Nav-C. Fixed Bottom Nav (mobile)
Floating pill at bottom, "V" logo + primary CTA, visible on scroll only

### Nav-D. White Floating Bar (Logoisum)
White bg, rounded-[16px], subtle shadow, logo left, links center (Barlow 14px), dark CTA right (#222)

### Nav-E. Transparent Dark (Neuralyn — horizontal)
px-8 md:px-28 py-4, logo + text left, links center-left (gap-1), "Sign In" white bg black text right

### Nav-F. Premium with Chevrons (Datacore)
px-6→px-[120px], transparent, SVG logo left, links with ChevronDown icons, mobile hamburger → fullscreen overlay

### Nav-G. Glass Blur + Gradient Active (Synapse)
fixed, full width, z-50, backdrop-blur-[16px], bg-black/30, border-b white/6%
Active link: gradient border-bottom (purple→blue), strikethrough on deprecated links

### Nav-H. Top Gradient Bar + Navbar (ClearInvoice)
5px gradient bar fixed top, navbar below with logo left, centered links, auth right (Sign In + Sign Up), mobile hamburger

## ─── CTA SECTIONS ───

### CTA-A. Video Background CTA
HLS stream, absolute, bg-background/45 overlay
Centered: logo icon + heading (serif italic) + subtitle + 2 buttons
Top+bottom black fades (200px)

### CTA-B. Marquee CTA
GSAP marquee: "BUILDING THE FUTURE • " × 10, xPercent -50, duration 40, repeat -1
Email CTA with gradient border ring

## ─── FOOTER PATTERNS ───
Simple: copyright left, privacy/terms/contact right, text-white/40 text-xs, mt-32 pt-8 border-t border-white/10
Social: liquid-glass circular buttons for social links
Extended: 4-column grid with links + newsletter signup
Pulsing: Green dot + "Available for projects"
Partners: "Trusted by" badge + logo names (serif italic text-2xl)
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 7. COMPONENT PATTERNS — 40+ Reusable with exact specs
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPONENT_PATTERNS = `
# 40+ PREMIUM COMPONENT PATTERNS — Complete Specs

## ─── BUTTONS ───

### Three-Variant System (V Vortex)
primary: bg-[#051A24] text-white hover:bg-[#0D212C] multi-layer shadow, rounded-full, px-7 py-3
secondary: bg-white text-[#051A24] shadow, rounded-full
tertiary: secondary + inset shadow. All: font-medium text-sm, render <a> if href else <button>

### Gradient Border CTA (Portfolio)
Default: bg-text-primary text-bg. Hover: bg-bg text-text-primary + gradient-ring (absolute span inset -2px)
Both: rounded-full text-sm px-7 py-3.5 hover:scale-105

### White Pill + Blue Circle Arrow (AI Builder)
pl-6 pr-2 py-2, rounded-full, bg-white. Text: font-medium text-lg color #0a0400 (Instrument Sans)
Arrow: 40×40 circle bg-[#3054ff] hover:bg-[#2040e0], ArrowRight 20×20 white inside
Hover: shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105

### Orange Gradient Glow (ClearInvoice Primary)
bg: linear-gradient(to right, #FF3300, #EE7926). border: 1.5px solid rgba(255,255,255,0.2)
Glow: absolute ::before bg-orange-600 blur-lg opacity-20 → 60% on hover
Hover: scale 1.05, ArrowRight slides in from left (group-hover:translate-x-0 opacity-100)

### White Backdrop (ClearInvoice Secondary)
bg-white/90 backdrop-blur. border: 1.5px solid rgba(0,0,0,0.05). Hover: bg-white scale-1.05

### Gradient White/Gray (Synapse)
bg: linear-gradient(white, #d4d4d4). text-black font-semibold. rounded-full px-6 py-2.5

### Glass Transparent (Synapse Secondary)
bg: transparent. border: 1px solid rgba(255,255,255,0.15). backdrop-blur-[8px]. rounded-full

### Solid Black + White Border
bg-black, border 1px solid white. text-white. rounded-full px-5 py-3

### Blue Glass CTA (Taskly)
bg: rgba(0,132,255,0.8). backdrop-blur-[2px]. rounded-[16px]. shadow: inset 0px 4px 4px rgba(255,255,255,0.35)
White circle arrow icon inside. hover: scale 1.02

### Clipped-Corner (Targo)
clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)
Brand red (#EE3F2C) primary / solid white secondary

### Custom SVG Button
Fixed 184×65 container. SVG absolute inset-0, custom path, fill white. Text centered on top
Bold uppercase 20px dark color. hover: scale-105, active: scale-95

### Pill + Play Icon (Logoisum "See Our Workreel")
White bg, rounded-full, large. Play icon left + text right. Hover: bg-gray-50

## ─── BADGES & PILLS ───

### Liquid Glass Badge (dark)
liquid-glass rounded-full px-3.5 py-1. Inner: white bg black text rounded-md "New" + outer muted text

### Purple Glassmorphic Pill (Datacore)
bg-[rgba(85,80,110,0.4)] backdrop-blur border rgba(164,132,215,0.5) rounded-[10px] h-[38px]
Inner "New" badge: bg-[#7b39fc] rounded-[6px] white text px-2 py-0.5 + tagline text (Cabin 14px)

### Glass Integration Badge (Synapse — row of 3)
bg: rgba(255,255,255,0.05). border: 1px solid rgba(255,255,255,0.1). rounded-full px-3 py-1.5
Content: 16px icon + "Integrated with" text-xs text-white/70
Layout: flex items-center gap-3 for row

### Sparkles Badge (AI Automation)
rounded-full border border-white/20 backdrop-blur-sm px-3 py-1.5
Sparkles icon (w-3 h-3 text-white/80) + "New AI Automation Ally" text-sm font-medium text-white/80

### Star Rating Badge (Taskly)
w-6 h-6 bordered square with Star icon filled. "4.9 rating from 18.3K+". Extended: 5 orange #FF801E stars

## ─── SOCIAL PROOF ───

### Overlapping Avatars
3 images: w-10 h-10 rounded-full border-2 border-background, layout: -space-x-2
Text: "Trusted by 210k+ stores" or "7,000+ subscribed"

### Partners Bar (text logos — serif italic)
liquid-glass badge: "Trusted by the teams behind"
Names: "Stripe", "Vercel", "Linear", "Notion", "Figma" as text-2xl md:text-3xl font-heading italic, gap-12

### Logo Cloud (grayscale)
InfiniteSlider or static row. brightness-0 invert for white. liquid-glass icon 24×24 rounded-lg + name

### Grayscale Logo Marquee (Synapse bottom)
Static row of SVG placeholders, grayscale filter, 40% opacity, gap-12, full width bottom

## ─── MARQUEES & STRIPS ───

### Image Marquee
8 images duplicated. Each: h-[280px] md:h-[500px] object-cover mx-3 rounded-2xl shadow-lg
Wrapper: overflow-hidden, animation: marquee 30s linear infinite

### Text Marquee (GSAP)
"BUILDING THE FUTURE • " × 10. gsap.to xPercent:-50 duration:40 ease:"none" repeat:-1

## ─── FORMS ───

### Email Subscribe (liquid glass)
liquid-glass rounded-full p-2 max-w-lg. Input: bg-transparent outline-none
Button: bg-foreground text-background rounded-full px-8 py-3. whileHover: scale 1.03

## ─── CARDS ───

### Project Bento Grid
grid grid-cols-1 md:grid-cols-12. Spans alternate: 7/5/5/7
bg-surface border border-stroke rounded-3xl. Image: object-cover group-hover:scale-105
Halftone: radial-gradient(circle, #000 1px, transparent 1px) 4×4. Hover: backdrop-blur-lg + "View — Title"

### Feature Card (dark agency — liquid glass)
liquid-glass rounded-2xl p-6. Icon in liquid-glass-strong rounded-full w-10 h-10
Title: font-heading italic text-white. Desc: text-white/60 font-light text-sm
Icons: Zap, Palette, BarChart3, Shield

### Feature Chess (alternating rows)
Row 1: text left, image/GIF right. Row 2: image left, text right (lg:flex-row-reverse)
H3 + P + liquid-glass-strong button per row. Image in liquid-glass rounded-2xl container

### Stats Grid on Glass
liquid-glass rounded-3xl p-12 md:p-16. grid grid-cols-2 lg:grid-cols-4 gap-8 text-center
Values: text-4xl md:text-6xl font-heading italic. Labels: text-white/60 text-sm
Data: "200+" Sites, "98%" Satisfaction, "3.2x" Conversions, "5 days" Delivery

### Testimonial Card (dark — 3-column)
liquid-glass rounded-2xl p-8. Italic quote text-white/80 font-light text-sm
Name: font-medium text-sm. Role: text-white/50 text-xs

### Pricing Cards
Two cards: dark (primary) + white (secondary). Both $25,000 with feature lists
Desktop: right-aligned, max-w-7xl

### Consultation Glass Card (floating bottom-left)
backdrop-filter: blur(40px) saturate(180%). 1px white/12% border
Diagonal shine gradient. "Book a Free Consultation" + Phone icon + button

## ─── TABS & OVERLAYS ───

### Auto-Cycling Tab Bar (4s)
bg-gray-100 rounded-lg p-1. 4 tabs with icons. Active: bg-white shadow-sm. Auto-cycle setInterval

### Conditional Overlay Cards
Per-tab content: wizard, metrics, test results, deploy checklist
animate-fade-in-overlay (0.4s), animate-slide-up-overlay (0.5s)

## ─── VIDEO SECTIONS ───

### HLS Video Feature Section
Each uses different HLS stream. Top+bottom black fades (200px)
Desaturated variant: filter: saturate(0). Content z-10, centered, min-h-[500px]
Badge + heading + subtitle + button per section
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 8. TEMPLATE CATALOG — 25 Complete Page Architectures
// ═══════════════════════════════════════════════════════════════════════════════

export const TEMPLATE_CATALOG = `
# 25 COMPLETE TEMPLATES — Every pixel specified

## Template 1: Creative Studio Portfolio (V Vortex)
Theme: Light, Apple-inspired | Fonts: PP Neue Montreal + PP Mondwest | Colors: #051A24 dark, white bg
Navbar: Fixed bottom pill (mobile), standard top (desktop)
Hero: Centered, max-w-440, heading with PP Mondwest accent words ("next wave", "bold way")
Sections: Hero → Image Marquee (8 GIFs, h-[280px] md:h-[500px]) → Testimonial Quote → Pricing ($25K, dark+white cards) → Auto-Scroll Carousel (3s) → Projects (3 GIF bento cards, halftone overlay) → Partner CTA (mouse trail) → Footer
Buttons: 3-variant (primary/secondary/tertiary), all rounded-full px-7 py-3

## Template 2: Dark Monochrome Newsletter (Mindloop)
Theme: Pure black | Fonts: Inter + Instrument Serif | Colors: monochrome only, 0 color
Navbar: Transparent, social icons in liquid-glass circles, green pulsing dot
Hero: Full viewport video (mindloop-hero), email subscribe liquid-glass form
Sections: Hero → "Search has changed" (3 platform cards) → Mission (scroll-driven word reveal, 0.15→1 opacity) → Solution (video + 4-col features) → HLS Video CTA (mindloop-cta) → Footer
Key: Zero color, word-by-word scroll animation, hls.js for CTA

## Template 3: Dark Cinema Portfolio (Michael Smith)
Theme: Ultra dark (4% bg) | Fonts: Instrument Serif + Inter | Accent: gradient #89AACC→#4E85BF
Navbar: Floating pill, frosted, gains shadow on scroll
Hero: HLS video (portfolio-hero), loading screen (000→100 counter, 2700ms RAF)
Sections: Loading → Hero → Selected Works (bento grid 12-col, 7/5/5/7 spans) → Journal (pills) → Parallax Gallery (GSAP pinned) → Stats → Marquee CTA → Footer
Animations: role cycling (2s), GSAP entrance timeline, gradient border rings on hover

## Template 4: Luxury Private Jet (SkyElite)
Theme: Light | Fonts: Inter | Colors: gray-900 + #202A36
Hero: Fullscreen video (jet-luxury), no overlay needed (dark video)
Content: -mt-80 overlap hero, overlapping headline lines, two CTAs
Navbar: Mobile hamburger with backdrop-blur overlay

## Template 5: Design Education (DesignPro)
Theme: Dark black | Fonts: Inter | Effect: ShinyText gradient sweep
Hero: Video (design-education) background, circular logo navbar
Content: Two-column intro above → "Become Product Leader." heading with ShinyText
ShinyText: #64CEFB→#fff, backgroundSize 200%, animate left→right 3s infinite

## Template 6: AI SaaS (Stellar.ai)
Theme: Light white | Fonts: Inter | Effect: gradient text (black→gray)
Navbar: Standard top. Badge: star rating. Headline: gradient text bg-clip-text
Tab Bar: 4 tabs (Analyse/Train/Testing/Deploy), auto-cycle 4s, each triggers different overlay
Video: stellar-saas with per-tab conditional overlays

## Template 7: AI Talent Platform (Power AI)
Theme: Deep dark blue-purple (#260 87% 3%) | Fonts: General Sans + Geist Sans
Hero: Video (dark-ambient) with custom fade-loop. Giant blurred shape (984×527 blur-[82px]) behind
Heading: Gradient text indigo→purple→amber. Logo marquee with liquid-glass icons
CTA section below with standard layout

## Template 8: Cinematic Studio (Aethera)
Theme: White bg | Fonts: Instrument Serif + Inter | Colors: black + #6F6F6F only
Hero: Video (cinematic-studio) OFFSET at top:300px with fade-loop. NOT fullscreen.
Content: "Beyond silence, we build the eternal." — serif italic accents in gray (#6F6F6F)
Gradient overlays on video edges. Editorial spacing, registered trademark "Aethera®"

## Template 9: SaaS Dashboard (Nexora)
Theme: Light | Fonts: Instrument Serif + Inter | Accent: indigo
Hero: Video (nexora-saas) background, ✦ logo navbar
Content: "GPT-5 support" badge → "Future of Smarter Automation" heading → CTA + Play button
Dashboard: FULL coded preview — sidebar, SVG area chart with bezier path, transaction tables
Dashboard wrapper: frosted glass, text-[11px], select-none, pointer-events-none

## Template 10: Bold Design Agency
Theme: Dark (#21346e fallback) | Fonts: Rubik | Style: ALL-CAPS
Hero: Fullscreen video (bold-design), 100% opacity no overlay
Content: "NEW ERA / OF DESIGN / STARTS NOW" — text-[100px] tracking-[-4px] leading-[0.98]
CTA: Custom SVG-path button (184×65), filled white, text centered on top, hover:scale-105

## Template 11: Purple Glassmorphism SaaS
Theme: #010101 | Effect: Purple/pink gradient accents
Hero: Announcement pill → Gradient headline (white→purple) → Glass CTA
Video: HLS, mix-blend-screen. Logo cloud: InfiniteSlider, brightness-0 invert
Gradient-filled Zap icon with glow effect

## Template 12: Web3 Landing (EOS)
Theme: Pure black | Fonts: General Sans | Effect: gradient text (white→transparent, 144.5deg)
Hero: Fullscreen video (web3-abstract) + 50% overlay
Navbar: Chevron arrows, glow button (0.6px border + blur streak)
Badge: White dot + date. CTA: White pill with layered construction

## Template 13: Minimalist Remote Team Tool
Theme: White | Fonts: Geist + Instrument Serif | Style: minimal
Hero: Video (minimal-remote) scaleY(-1) FLIPPED + white gradient overlay (26%→67%)
Heading: Geist 80px + Instrument Serif italic 100px for "management" (LARGER accent)
Email input navbar + high-gloss CTA (inset shadow) + social proof avatars

## Template 14: AI Website Builder (Dark Hero)
Theme: Pure black | Fonts: Instrument Sans + Instrument Serif | Accent: #3054ff
Video: HLS (ai-builder-hero), 60% opacity. Poster fallback image.
Overlay: bg-black/60 + backdrop-blur-[2px]
Decorative gradients: top-left (600×600 blue-900/20 blur-[120px]) + bottom-right (500×500 indigo-900/20)
Navbar: fixed transparent, sunburst SVG icon, links with ChevronDown, "Get Started" white pill
Content (max-w-5xl centered, mt-20, space-y-12):
- Pre-headline: "Design at the speed of thought" — Instrument Serif 48px sm:text-5xl lg:text-[48px] leading-[1.1]
- Headline: "Build Faster" — Instrument Sans semibold text-6xl sm:text-8xl lg:text-[136px] leading-[0.9] tracking-tighter
  Gradient: bg-gradient-to-b from-white via-white to-[#b4c0ff] bg-clip-text text-transparent
- Subtitle: Instrument Sans text-lg sm:text-[20px] leading-[1.65] white opacity-70 max-w-xl
- Primary CTA: white pill, pl-6 pr-2 py-2, "Start Building Free" + 40×40 bg-[#3054ff] circle with ArrowRight
- Secondary: "See Examples" text link, text-white/70 hover:text-white, ArrowRight group-hover:translate-x-1
Animations: pre-headline y:20 0.6s | headline scale:0.9 delay:0.2 0.6s | subtitle opacity delay:0.4 | CTAs y:20 delay:0.6

## Template 15: Liquid Glass Task Manager (Taskly)
Theme: White | Fonts: Fustat + Inter | Accent: #0084ff | Stars: #FF801E
Layout: Dual-column — hero left + orb right
Navbar: Sticky top-[30px] w-fit mx-auto, bg rgba(255,255,255,0.3), backdrop-blur-[50px], rounded-[16px]
  Border: 1px solid rgba(0,0,0,0.1). Shadow: inset 0px 4px 4px rgba(255,255,255,0.25)
  Items: "Taskly" (Fustat), links, glassy SignUp button with arrow
Left Hero: Star badge → "Work smarter, achieve faster" (Fustat Bold 75px, -2px tracking, 1.05 leading)
  Subtitle: Inter 18px -1px tracking → CTA: rgba(0,132,255,0.8) backdrop-blur-[2px] rounded-[16px]
Right: Orb video (.webm), mix-blend-screen, scale-125, hue-rotate(-55deg) saturate(250%) brightness(1.2)
Footer: 5 grayscale SVG logos spaced gap-[100px]

## Template 16: Purple Hospitality (Datacore)
Theme: Dark | Fonts: Manrope/Cabin/Instrument Serif/Inter | Primary: #7b39fc
Video: Full cover, NO overlay, object-cover
Navbar: px-6→px-[120px], transparent. Logo SVG left, links 14px Manrope Medium, mobile hamburger
  Sign In: white bg gray border rounded-8 black text | Get Started: #7b39fc bg white text rounded-8
Glassmorphic Pill: bg-[rgba(85,80,110,0.4)] backdrop-blur border rgba(164,132,215,0.5) rounded-10 h-38
  Inner: #7b39fc bg rounded-6 "New" | Outer: "Say Hello to Datacore v3.2" Cabin 14px
Headline: text-5xl→96px leading-[1.1], word "and" in Instrument Serif italic with extra spacing
Subtitle: Inter 18px white/70 max-w-[662px]
CTAs: "Book a Free Demo" (#7b39fc, Cabin 16px) + "Get Started Now" (#2b2344, Cabin 16px)

## Template 17: Dark AI Design Agency (Liquid Glass Premium)
Theme: Pure black | Fonts: Instrument Serif italic + Barlow light | Glass: liquid-glass + liquid-glass-strong
Navbar: Fixed pill, liquid-glass, "Home" "Services" "Work" "Process" "Pricing" text-sm + white "Get Started" pill with ArrowUpRight
Hero (1000px): Video at top: 20%, w-full h-auto object-contain z-0
  Overlay: bg-black/5 z-0. Bottom gradient: h-[300px] from transparent to black z-[1]
  Content z-10, centered, pt-[150px]:
  - Badge: liquid-glass "New" pill
  - BlurText heading: "The Website Your Brand Deserves" — text-6xl md:text-7xl lg:text-[5.5rem] italic leading-[0.8] tracking-[-4px]
  - Subtitle: motion.p, fades in 0.8s delay with blur
  - CTAs: liquid-glass-strong "Get Started" + text "Watch the Film" + Play icon (1.1s delay)
  - Partners: mt-auto pb-8 pt-16, badge + names (Stripe/Vercel/Linear/Notion/Figma) text-2xl md:text-3xl italic gap-12
After: HLS "How It Works" section → Feature Chess (2 alternating rows) → 4-Column Feature Grid (Zap/Palette/BarChart3/Shield) → Stats on Glass (HLS desaturated bg) → 3-Column Testimonials → HLS CTA Footer

## Template 18: Video Production Agency (Logoisum)
Theme: Light/White | Fonts: Barlow + Instrument Serif italic | Style: Ultra-minimal
Video: Full 100% opacity, NO overlay, object-cover, min-h-[90vh]
Navbar: White floating, rounded-[16px], shadow. Logo left, links center (Barlow 14px), dark (#222) CTA right
  CTA: 45-degree arrow icon in circular housing
Hero: Centered. Line 1: "Agency that makes your" — Barlow medium tracking-[-4px]
  Line 2: "videos & reels viral" — Instrument Serif italic text-[84px]
  Subtitle: Barlow 18px centered
  CTA: Large white pill "See Our Workreel" + small play icon left

## Template 19: Analytics Dashboard SaaS (Neuralyn)
Theme: Pure black | Fonts: Inter + Instrument Serif italic | Glass: liquid-glass tag
Navbar: Horizontal px-8 md:px-28 py-4. Logo image + "Neuralyn" text-xl font-bold tracking-tight
  Links: Home, Services (ChevronDown), Reviews, Contact us (gap-1, hidden mobile)
  Right: "Sign In" bg-white text-black rounded-lg
Hero: Centered, mt-16 md:mt-20 px-4
  Tag: liquid-glass rounded-lg px-3 py-2, inner "New" badge (white bg black text rounded-md) + "Say Hello to Corewave v3.2"
  Title: text-5xl md:text-7xl tracking-[-2px] font-medium leading-tight
    "Your Insights." / "One Clear <span className='font-serif italic font-normal'>Overview</span>."
  Subtitle: text-lg opacity-90, var(--hero-subtitle), "helps teams track metrics, goals,<br/>and progress"
  CTA: "Get Started for Free" bg-white text-black rounded-full px-8 py-3.5 hover:scale-1.03
Dashboard: w-screen with marginLeft: calc(-50vw + 50%), aspect-[16/9], relative
  Video: absolute inset-0 object-cover. Dashboard image: centered max-w-5xl w-[90%] rounded-2xl mixBlendMode: "luminosity"
  Parallax: dashboard y:[0,-250], hero text y:[0,-200]+opacity:[1,0] over 50% scroll
  Bottom gradient: h-40 from-background z-30
Testimonial: Scroll-driven word-color-reveal, each word gray→white per scroll position
  Quote mark image, text-4xl md:text-5xl font-medium. Author: avatar w-14 rounded-full + name + role

## Template 20: Logistics (Targo)
Theme: Black + brand red #EE3F2C | Fonts: Rubik bold uppercase | Tracking: -4%
Video: Full cover, 100% opacity, NO overlay
Navbar: White SVG logo left, "Home" "About" "Contact Us" links, small red clip-path CTA right
Hero: LEFT-aligned (not centered), upper-third positioning (top-aligned, not vertically centered)
  Headline: "Swift and Simple Transport" — Rubik 700, 64px desktop/42px mobile, uppercase
  CTA: Brand red clip-path button "Get Started" (polygon: 10px 0, 100% 0, calc(100%-10px) 100%, 0 100%)
Bottom-left: Consultation glass card — backdrop-filter: blur(40px) saturate(180%), 1px white/12%
  Diagonal shine gradient, inner box-shadow, "Book a Free Consultation" + Phone icon + white clip-path button
Spacing: px-16→px-8 mobile. Compact, no excessive padding. Scaled-down professional look.

## Template 21: AI Automation Platform (Dark Purple)
Theme: #070612 | Fonts: serif italic accent | Accent: white/indigo
Video: HLS (ai-automation), margin-left: 200px, scale: 1.2, transform-origin: left, z-0
Bottom gradient: h-40 from-[#070612] to transparent z-10
Content: z-20, LEFT-aligned, max-w-7xl px-6 lg:px-12, vertically centered, gap structure:
  Badge: rounded-full border-white/20 backdrop-blur-sm, Sparkles icon w-3 + "New AI Automation Ally" text-sm
  (gap-6) Heading (3 lines):
    "Unlock the Power of AI" (block) + "for Your" (inline) + "Business." (serif italic)
    text-4xl md:text-5xl lg:text-6xl font-medium leading-tight lg:leading-[1.2]
    SplitText: each word staggers 0.08s delay, y:40→0, opacity:0→1, duration 0.6s
  (gap-6) Subtitle: text-white/80 text-lg leading-relaxed max-w-xl, BlurIn delay 0.4s
  (gap-12) Buttons: flex gap-4 flex-wrap
    Primary: "Book A Free Call" bg-white text-dark rounded-full px-5 py-3 + ArrowRight
    Secondary: "Learn now" bg-white/20 backdrop-blur-sm rounded-full px-8 py-3 white text
    Both: BlurIn delay 0.6s

## Template 22: Wealth Management (Dark Finance)
Theme: Black | Accent: glassmorphic badges | Layout: centered
Video: scale-150, transform-origin: top left, full cover, no overlay
Navbar: Transparent. "Features" "Company" "Blogs" center. "Sign in" text + "Get Started" white pill right
Badge: Glassmorphic pill "Real-Time Budget Tracking"
Headline: "Build Wealth That Lasts Generations" — large text
Subtitle: "Transform today's earnings into tomorrow's family fortune."
CTA: White pill "Start Building Wealth"

## Template 23: SaaS Hero with Floating Video (Synapse)
Theme: Pure black | Style: clean, centered
Navbar: Glass blur fixed, backdrop-blur-[16px] bg-black/30
  Logo: "Synapse" font-medium tracking-tight white
  Links: "Features" (gradient active: border-image purple→blue), "Insights", "About", "Case Studies" (line-through), "Contact"
  CTA: White/gray gradient button "Get Started for Free"
Hero: Content z-10 text-center relative
  Badges: 3 glass badges in row (white/5% bg, white/10% border, icon + "Integrated with")
  Headline: ~80px, tight tracking, white, fade-in animation
    "Where Innovation Meets Execution"
  Subtitle: 2 lines, description about testing/deployment
  Primary: Solid black bg, white border, rounded-full "Get Started for Free"
  Secondary: Transparent glass, rounded-full "Let's Get Connected"
  Logo Marquee: Static row grayscale SVGs, 40% opacity, bottom
Video: Memoized HLS component. Position: absolute bottom-[35vh], height 80vh, z-0
  100% opacity NO overlay. hls.js with cleanup on unmount
Animations: Staggered container variants (0.15s between children)

## Template 24: Ecommerce Invoice SaaS (ClearInvoice)
Theme: Pure black | Fonts: Switzer + Geist | Accent: orange gradient
Top Bar: 5px fixed, linear-gradient(#ccf, #e7d04c, #31fb78), z-100
Navbar: Logo left, centered links (Features/Pricing/Reviews), Sign In + Sign Up right
  Mobile: Hamburger → full-width dropdown
Video: Memoized HLS BackgroundVideo, -z-10, full cover, 100% opacity, AbortError cleanup
Hero: Centered mt-16 md:mt-20 px-4
  Headline: "Manage your online store while save 3x operating cost" — text-6xl tight leading
  Subhead: "ClearInvoice takes the hassle out of billing" — text-white/90
  Primary CTA: gradient from-[#FF3300] to-[#EE7926]
    Glow: absolute div bg-orange-600 blur-lg opacity-20 → 60% on hover
    Inner stroke: 1.5px border-white/20. Hover: scale 1.05, ArrowRight slides in from left
  Secondary CTA: bg-white/90 backdrop-blur, 1.5px border-black/5. Hover: solid white, scale 1.05
  Social Proof: 3 overlapping avatars (w-10 h-10 rounded-full border-2, -space-x-2) + "Trusted by 210k+ stores"
Animations: Staggered fade-up+slide on text, buttons, social proof

## Template 25: AI Automation Full Page (Dark Purple Extended)
Theme: #070612 | Full multi-section page (not just hero)
Combines: Template 21 hero + Template 17 inner sections
Hero: (same as T21 — left-aligned, right-shifted HLS video, SplitText, BlurIn)
After Hero: Partners bar (serif italic logo names) → HLS "How It Works" section → Feature Chess → 4-Column Feature Grid → Stats on Glass Card (desaturated HLS bg) → Testimonials → HLS CTA Footer → Simple Footer
\`\`\`
Key: Every section uses a DIFFERENT HLS video stream, top+bottom 200px black fades
BlurText for inner section headings, liquid-glass badges, Barlow light body, gap-12 sections
`;

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED EXPORT — Single injection point for system prompt
// ═══════════════════════════════════════════════════════════════════════════════

export const MOTIONSITE_LIBRARY = `
# ═══════════════════════════════════════════════════════════════════════════════
# MOTIONSITE.AI PREMIUM TEMPLATE LIBRARY v2.0 — 25 Templates, 22+ Videos, 11 Fonts
# ═══════════════════════════════════════════════════════════════════════════════
# USE THIS: When generating ANY landing page, hero section, or website.
# WORKFLOW:
# 1. Match user request → closest template from TEMPLATE_CATALOG
# 2. Select video from VIDEO_ASSETS (by industry/mood/overlay style)
# 3. Pick font system from FONT_SYSTEMS (match template theme)
# 4. Apply design tokens from DESIGN_TOKENS (dark/light/glass/gradient)
# 5. Use animation patterns from ANIMATION_PATTERNS (entrance, scroll, hover)
# 6. Apply glass effects from GLASS_EFFECTS (dark→liquid-glass, light→frosted)
# 7. Follow section blueprint from SECTION_BLUEPRINTS (hero variant + navbar type)
# 8. Use component patterns from COMPONENT_PATTERNS (buttons, badges, cards)
#
# CONTEXT-AWARE USAGE GUIDE:
# 1. Video backgrounds: Use for SaaS/agency/portfolio heroes. SKIP for editorial/healthcare/luxury/education. For CLONE: match source.
# 2. Premium fonts: ALWAYS use Google Fonts or FontShare — never system defaults (see FONT_SYSTEMS below)
# 3. Entrance animations: Recommended for all (fadeUp, BlurText, SplitText, or stagger) — but portfolio/luxury may use fewer
# 4. Glass effects: Use on DARK themes (navbar + 1-2 elements). SKIP on light/editorial/luxury themes.
# 5. Serif italic accent: Good for creative/editorial. SKIP for clean SaaS/fintech.
# 6. Scroll animations: Recommended for long pages (parallax, word reveal)
# 7. Gradient text: SaaS/AI = yes. Luxury/editorial = skip. Portfolio = subtle only.
# 8. HLS video: Implement via memoized component with cleanup (no AbortError)
# 9. ALWAYS add -webkit-font-smoothing: antialiased
# 10. Video sections: Add bottom fade gradient (from bg to transparent)
# 11. Use auto-cycling tabs/carousels where applicable (4s intervals)
# 12. Use clip-path buttons for logistics/industrial themes
# 13. Apply CSS filter color grading on video assets for brand matching
# 14. Use parallax scroll on dashboard/image overlays
# 15. Stagger entrance by 0.1-0.15s between elements (badge→heading→subtitle→CTAs)
# ═══════════════════════════════════════════════════════════════════════════════

${VIDEO_ASSETS}

${FONT_SYSTEMS}

${DESIGN_TOKENS}

${ANIMATION_PATTERNS}

${GLASS_EFFECTS}

${SECTION_BLUEPRINTS}

${COMPONENT_PATTERNS}

${TEMPLATE_CATALOG}
`;
