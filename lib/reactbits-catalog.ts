/* ═══════════════════════════════════════════════════════════
   ReactBits Component Catalog — 135+ Premium Visual Components
   Used by AI system prompts for intelligent component selection
   ═══════════════════════════════════════════════════════════ */

export interface ReactBitsComponent {
  name: string;
  category: 'background' | 'text' | 'cursor' | 'hover' | 'scroll' | 'ui' | 'layout' | 'animation';
  keywords: string[];
  description: string;
  /** Inline CSS+JS pattern for HTML mode (most compact useful implementation) */
  pattern?: string;
}

// ─── BACKGROUNDS (14) ────────────────────────────────────────
const BACKGROUNDS: ReactBitsComponent[] = [
  {
    name: 'Aurora',
    category: 'background',
    keywords: ['aurora', 'gradient', 'bg', 'fond', 'atmosphere', 'ambiance', 'northern lights', 'glow'],
    description: 'Animated aurora borealis gradient background with soft color shifts and blur layers',
    pattern: `.aurora{position:absolute;inset:0;overflow:hidden;z-index:0}.aurora::before,.aurora::after,.aurora .a3{content:'';position:absolute;inset:-50%;animation:aurora-shift 12s ease-in-out infinite alternate;filter:blur(80px);opacity:0.5;mix-blend-mode:hard-light}.aurora::before{background:repeating-linear-gradient(100deg,var(--accent,#6366f1) 10%,#a855f7 15%,#6366f1 20%,#4ade80 25%,#a855f7 30%);background-size:200% 200%}.aurora::after{background:repeating-linear-gradient(100deg,#1e1b4b 10%,#312e81 15%,#1e1b4b 20%,#4c1d95 25%,#1e1b4b 30%);background-size:200% 200%;animation-delay:-4s}.aurora .a3{background:repeating-linear-gradient(100deg,#6366f1 10%,#818cf8 15%,#6366f1 20%,#c084fc 25%,#818cf8 30%);background-size:200% 200%;animation-delay:-8s}@keyframes aurora-shift{0%{transform:rotate(0deg) scale(1.2);opacity:0.4}100%{transform:rotate(15deg) scale(1.5);opacity:0.6}}`
  },
  {
    name: 'Beams',
    category: 'background',
    keywords: ['beams', 'rays', 'light beams', 'spotlight', 'radiant'],
    description: 'Animated light beams radiating from center with rotation and glow',
    pattern: `.beams{position:absolute;inset:0;overflow:hidden;z-index:0}.beams::before{content:'';position:absolute;top:50%;left:50%;width:200%;height:200%;transform:translate(-50%,-50%);background:conic-gradient(from 0deg,transparent 0%,var(--accent,#6366f1) 2%,transparent 4%,transparent 20%,var(--accent,#6366f1) 22%,transparent 24%,transparent 45%,var(--accent,#6366f1) 47%,transparent 49%,transparent 70%,var(--accent,#6366f1) 72%,transparent 74%);opacity:0.15;animation:beams-rotate 20s linear infinite;filter:blur(1px)}@keyframes beams-rotate{to{transform:translate(-50%,-50%) rotate(360deg)}}`
  },
  {
    name: 'Galaxy',
    category: 'background',
    keywords: ['galaxy', 'stars', 'space', 'universe', 'cosmic', 'starfield'],
    description: 'Starfield particle background with twinkling stars and depth parallax',
    pattern: `<canvas class="galaxy-bg"></canvas><script>!function(){const c=document.querySelector('.galaxy-bg');if(!c)return;c.style.cssText='position:absolute;inset:0;z-index:0';const x=c.getContext('2d');let w,h;const stars=[];function init(){w=c.width=c.parentElement.offsetWidth;h=c.height=c.parentElement.offsetHeight;stars.length=0;for(let i=0;i<200;i++)stars.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.5+0.3,a:Math.random(),s:Math.random()*0.02+0.005})}function draw(){x.fillStyle='#0a0a0a';x.fillRect(0,0,w,h);stars.forEach(s=>{s.a+=s.s;if(s.a>1)s.s=-Math.abs(s.s);if(s.a<0.1)s.s=Math.abs(s.s);x.beginPath();x.arc(s.x,s.y,s.r,0,Math.PI*2);x.fillStyle='rgba(255,255,255,'+s.a+')';x.fill()});requestAnimationFrame(draw)}init();draw();window.addEventListener('resize',init)}()</script>`
  },
  {
    name: 'Hyperspeed',
    category: 'background',
    keywords: ['hyperspeed', 'warp', 'speed', 'lines', 'fast', 'dynamic'],
    description: 'Warp-speed line effect with streaking lights converging to center',
  },
  {
    name: 'DotGrid',
    category: 'background',
    keywords: ['dots', 'grid', 'pattern', 'minimal', 'dot grid', 'subtle'],
    description: 'Animated dot grid pattern with hover-responsive proximity effect',
    pattern: `.dot-grid{position:absolute;inset:0;z-index:0;background-image:radial-gradient(circle,rgba(255,255,255,0.08) 1px,transparent 1px);background-size:24px 24px}`
  },
  {
    name: 'LightRays',
    category: 'background',
    keywords: ['light rays', 'rays', 'sunbeams', 'god rays'],
    description: 'Volumetric light rays with depth-of-field blur and animation',
  },
  {
    name: 'Lightning',
    category: 'background',
    keywords: ['lightning', 'electric', 'thunder', 'energy', 'power'],
    description: 'Animated lightning bolts with flash and glow effects',
  },
  {
    name: 'Dither',
    category: 'background',
    keywords: ['dither', 'retro', 'pixel', 'noise', 'texture'],
    description: 'Dithered gradient pattern with adjustable density and colors',
  },
  {
    name: 'LetterGlitch',
    category: 'background',
    keywords: ['letter glitch', 'matrix', 'code rain', 'hacker', 'text rain'],
    description: 'Matrix-style raining characters with glitch effect',
  },
  {
    name: 'Iridescence',
    category: 'background',
    keywords: ['iridescence', 'holographic', 'rainbow', 'chromatic', 'prismatic'],
    description: 'Holographic iridescent surface with mouse-reactive color shifts',
  },
  {
    name: 'Particles',
    category: 'background',
    keywords: ['particles', 'floating', 'bubbles', 'orbs', 'particle system'],
    description: 'Floating particle system with interconnecting lines and mouse interaction',
    pattern: `<canvas class="particles-bg"></canvas><script>!function(){const c=document.querySelector('.particles-bg');if(!c)return;c.style.cssText='position:absolute;inset:0;z-index:0';const x=c.getContext('2d');let w,h,mx=-1,my=-1;const P=[];function init(){w=c.width=c.parentElement.offsetWidth;h=c.height=c.parentElement.offsetHeight;P.length=0;for(let i=0;i<80;i++)P.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,r:Math.random()*2+1})}function draw(){x.fillStyle='rgba(10,10,10,0.15)';x.fillRect(0,0,w,h);P.forEach((p,i)=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.fillStyle='rgba(99,102,241,0.6)';x.fill();for(let j=i+1;j<P.length;j++){const d=Math.hypot(P[j].x-p.x,P[j].y-p.y);if(d<120){x.beginPath();x.moveTo(p.x,p.y);x.lineTo(P[j].x,P[j].y);x.strokeStyle='rgba(99,102,241,'+(1-d/120)*0.2+')';x.stroke()}}});requestAnimationFrame(draw)}c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});init();draw();window.addEventListener('resize',init)}()</script>`
  },
  {
    name: 'GridMotion',
    category: 'background',
    keywords: ['grid motion', 'animated grid', 'moving grid', 'wireframe'],
    description: 'Animated wireframe grid with perspective and wave motion',
  },
  {
    name: 'Waves',
    category: 'background',
    keywords: ['waves', 'ocean', 'water', 'flow', 'liquid', 'wave'],
    description: 'Layered animated wave curves with gradient fills',
    pattern: `.waves{position:absolute;bottom:0;left:0;right:0;height:200px;z-index:0;overflow:hidden}.waves svg{position:absolute;bottom:0;width:200%;height:100%;animation:wave-move 8s linear infinite}.waves svg:nth-child(2){opacity:0.5;animation-delay:-4s;animation-duration:12s}@keyframes wave-move{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`
  },
  {
    name: 'DarkVeil',
    category: 'background',
    keywords: ['veil', 'dark', 'overlay', 'gradient overlay', 'cinematic'],
    description: 'Cinematic dark gradient veil overlay with depth layers',
  },
];

// ─── TEXT ANIMATIONS (14) ────────────────────────────────────
const TEXT_ANIMATIONS: ReactBitsComponent[] = [
  {
    name: 'BlurText',
    category: 'text',
    keywords: ['blur text', 'blur reveal', 'text blur', 'fade text', 'blur fade'],
    description: 'Text reveals word-by-word from blur to sharp with stagger',
    pattern: `.blur-text span{display:inline-block;opacity:0;filter:blur(12px);animation:blur-reveal 0.8s cubic-bezier(0.16,1,0.3,1) forwards}.blur-text span:nth-child(1){animation-delay:0s}.blur-text span:nth-child(2){animation-delay:0.08s}.blur-text span:nth-child(3){animation-delay:0.16s}.blur-text span:nth-child(4){animation-delay:0.24s}.blur-text span:nth-child(5){animation-delay:0.32s}.blur-text span:nth-child(6){animation-delay:0.4s}.blur-text span:nth-child(7){animation-delay:0.48s}.blur-text span:nth-child(8){animation-delay:0.56s}@keyframes blur-reveal{to{opacity:1;filter:blur(0)}}`
  },
  {
    name: 'SplitText',
    category: 'text',
    keywords: ['split text', 'letter split', 'character animation', 'letter by letter'],
    description: 'Each character animates in independently with configurable stagger and direction',
  },
  {
    name: 'ShinyText',
    category: 'text',
    keywords: ['shiny', 'shimmer', 'sweep', 'glossy text', 'metallic text'],
    description: 'Text with a sweeping shine/shimmer highlight animation',
    pattern: `.shiny-text{background:linear-gradient(90deg,hsl(var(--foreground,0 0% 96%)) 40%,var(--accent,#6366f1) 50%,hsl(var(--foreground,0 0% 96%)) 60%);background-size:200% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shiny-sweep 3s ease-in-out infinite}@keyframes shiny-sweep{0%,100%{background-position:100% 0}50%{background-position:-100% 0}}`
  },
  {
    name: 'GradientText',
    category: 'text',
    keywords: ['gradient text', 'rainbow text', 'colorful text', 'multi-color'],
    description: 'Text with animated flowing gradient colors',
    pattern: `.gradient-text{background:linear-gradient(135deg,var(--accent,#6366f1),#a78bfa,#ec4899,var(--accent,#6366f1));background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:gradient-flow 4s ease infinite}@keyframes gradient-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`
  },
  {
    name: 'FuzzyText',
    category: 'text',
    keywords: ['fuzzy', 'vibrating', 'shaking', 'jitter', 'nervous'],
    description: 'Text with random vibration/jitter effect on each character',
  },
  {
    name: 'ScrambleText',
    category: 'text',
    keywords: ['scramble', 'decode', 'decrypt', 'cipher', 'random letters', 'reveal'],
    description: 'Text scrambles through random characters before revealing final text',
    pattern: `function scrambleText(el,finalText,duration){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';let frame=0;const totalFrames=duration/16;const interval=setInterval(()=>{frame++;const progress=frame/totalFrames;let result='';for(let i=0;i<finalText.length;i++){if(i<finalText.length*progress)result+=finalText[i];else result+=chars[Math.floor(Math.random()*chars.length)]}el.textContent=result;if(frame>=totalFrames){clearInterval(interval);el.textContent=finalText}},16)}`
  },
  {
    name: 'RotatingText',
    category: 'text',
    keywords: ['rotating', 'cycling', 'word rotate', 'text carousel', 'changing words'],
    description: 'Cycles through multiple text strings with flip/fade transitions',
  },
  {
    name: 'CircularText',
    category: 'text',
    keywords: ['circular', 'curved text', 'round text', 'arc text', 'spinning text'],
    description: 'Text arranged in a circle, optionally spinning continuously',
  },
  {
    name: 'CountUp',
    category: 'text',
    keywords: ['count up', 'number', 'counter', 'stats', 'metric', 'increment'],
    description: 'Animated number counter that counts up from 0 to target value',
    pattern: `function countUp(el,target,duration=2000){let start=0;const step=target/((duration)/16);const timer=setInterval(()=>{start+=step;if(start>=target){start=target;clearInterval(timer)}el.textContent=Math.floor(start).toLocaleString()},16)}`
  },
  {
    name: 'TrueFocus',
    category: 'text',
    keywords: ['focus', 'lens', 'depth of field', 'selective focus'],
    description: 'Only the hovered/active word is sharp, others are blurred',
  },
  {
    name: 'DecryptedText',
    category: 'text',
    keywords: ['decrypt', 'decode', 'hack', 'terminal', 'matrix'],
    description: 'Text appears as if being decrypted character by character',
  },
  {
    name: 'ASCIIText',
    category: 'text',
    keywords: ['ascii', 'ascii art', 'text art', 'monospace', 'terminal'],
    description: 'Converts text to ASCII art rendering with customizable font',
  },
  {
    name: 'Typewriter',
    category: 'text',
    keywords: ['typewriter', 'typing', 'type effect', 'cursor blink'],
    description: 'Classic typewriter effect with blinking cursor',
    pattern: `.typewriter{border-right:2px solid var(--accent,#6366f1);white-space:nowrap;overflow:hidden;animation:typing 3s steps(40) forwards,blink-cursor 0.75s step-end infinite}@keyframes typing{from{width:0}to{width:100%}}@keyframes blink-cursor{50%{border-color:transparent}}`
  },
  {
    name: 'GlitchText',
    category: 'text',
    keywords: ['glitch', 'distortion', 'corrupt', 'error', 'broken'],
    description: 'Text with RGB split glitch distortion animation',
    pattern: `.glitch{position:relative}.glitch::before,.glitch::after{content:attr(data-text);position:absolute;left:0;top:0;width:100%;height:100%}.glitch::before{color:#ff00ff;animation:glitch-1 2s infinite linear alternate-reverse;clip-path:polygon(0 0,100% 0,100% 33%,0 33%)}.glitch::after{color:#00ffff;animation:glitch-2 3s infinite linear alternate-reverse;clip-path:polygon(0 66%,100% 66%,100% 100%,0 100%)}@keyframes glitch-1{0%{transform:translate(0)}20%{transform:translate(-2px,2px)}40%{transform:translate(2px,-2px)}60%{transform:translate(-1px,1px)}80%{transform:translate(1px,-1px)}100%{transform:translate(0)}}@keyframes glitch-2{0%{transform:translate(0)}25%{transform:translate(2px,1px)}50%{transform:translate(-2px,-1px)}75%{transform:translate(1px,2px)}100%{transform:translate(0)}}`
  },
];

// ─── CURSOR EFFECTS (8) ──────────────────────────────────────
const CURSOR_EFFECTS: ReactBitsComponent[] = [
  {
    name: 'BlobCursor',
    category: 'cursor',
    keywords: ['blob cursor', 'custom cursor', 'blob', 'follow cursor', 'organic cursor'],
    description: 'Organic blob that follows the mouse with elastic deformation',
    pattern: `<div class="blob-cursor"></div><style>.blob-cursor{width:30px;height:30px;background:var(--accent,#6366f1);border-radius:50%;position:fixed;pointer-events:none;z-index:9999;mix-blend-mode:difference;transition:transform 0.15s cubic-bezier(0.16,1,0.3,1),width 0.3s,height 0.3s}</style><script>const blob=document.querySelector('.blob-cursor');if(blob)document.addEventListener('mousemove',e=>{blob.style.transform='translate('+(e.clientX-15)+'px,'+(e.clientY-15)+'px)'})</script>`
  },
  {
    name: 'SplashCursor',
    category: 'cursor',
    keywords: ['splash', 'ripple cursor', 'water cursor', 'ink splash'],
    description: 'Click creates a splash/ripple animation at cursor position',
  },
  {
    name: 'PixelTrail',
    category: 'cursor',
    keywords: ['pixel trail', 'trail', 'mouse trail', 'particle trail'],
    description: 'Pixelated trail that follows cursor movement',
  },
  {
    name: 'Crosshair',
    category: 'cursor',
    keywords: ['crosshair', 'target', 'aim', 'precise cursor'],
    description: 'Minimal crosshair cursor replacement with smooth follow',
  },
  {
    name: 'ClickSpark',
    category: 'cursor',
    keywords: ['click spark', 'spark', 'firework', 'click effect', 'burst'],
    description: 'Spark burst animation triggered on click',
  },
  {
    name: 'ImageTrail',
    category: 'cursor',
    keywords: ['image trail', 'photo trail', 'gallery cursor', 'cursor images'],
    description: 'Images appear and fade along the cursor path',
  },
  {
    name: 'Ribbons',
    category: 'cursor',
    keywords: ['ribbons', 'streamers', 'flowing', 'silk'],
    description: 'Flowing ribbon trails that follow mouse movement with physics',
  },
  {
    name: 'MetaBalls',
    category: 'cursor',
    keywords: ['metaballs', 'blob merge', 'liquid', 'organic blobs'],
    description: 'Multiple blobs that merge and separate following cursor',
  },
];

// ─── HOVER EFFECTS (8) ──────────────────────────────────────
const HOVER_EFFECTS: ReactBitsComponent[] = [
  {
    name: 'Magnet',
    category: 'hover',
    keywords: ['magnet', 'magnetic', 'attract', 'pull', 'sticky hover'],
    description: 'Element is magnetically attracted toward cursor on hover',
    pattern: `document.querySelectorAll('[data-magnet]').forEach(el=>{el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)*0.3;const y=(e.clientY-r.top-r.height/2)*0.3;el.style.transform='translate('+x+'px,'+y+'px)'});el.addEventListener('mouseleave',()=>{el.style.transform='translate(0,0)';el.style.transition='transform 0.4s cubic-bezier(0.16,1,0.3,1)'})})`
  },
  {
    name: 'GlareHover',
    category: 'hover',
    keywords: ['glare', 'shine', 'reflection', 'light hover', 'spotlight hover'],
    description: 'Moving glare/spotlight reflection that follows cursor on card',
    pattern: `document.querySelectorAll('[data-glare]').forEach(el=>{el.style.position='relative';el.style.overflow='hidden';const glare=document.createElement('div');glare.style.cssText='position:absolute;inset:0;background:radial-gradient(300px circle at var(--mx) var(--my),rgba(255,255,255,0.1),transparent 60%);pointer-events:none;opacity:0;transition:opacity 0.3s';el.appendChild(glare);el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--mx',(e.clientX-r.left)+'px');el.style.setProperty('--my',(e.clientY-r.top)+'px');glare.style.opacity='1'});el.addEventListener('mouseleave',()=>glare.style.opacity='0')})`
  },
  {
    name: 'MetallicPaint',
    category: 'hover',
    keywords: ['metallic', 'paint', 'chrome', 'metal', 'reflective'],
    description: 'Metallic/chrome paint effect that shifts with mouse movement',
  },
  {
    name: 'SpotlightCard',
    category: 'hover',
    keywords: ['spotlight', 'card spotlight', 'glow card', 'radial glow'],
    description: 'Card with radial spotlight glow following cursor position',
    pattern: `.spotlight-card{position:relative;overflow:hidden;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:2rem}.spotlight-card::before{content:'';position:absolute;inset:0;background:radial-gradient(400px circle at var(--mx,50%) var(--my,50%),rgba(99,102,241,0.12),transparent 60%);pointer-events:none;opacity:0;transition:opacity 0.3s}.spotlight-card:hover::before{opacity:1}`
  },
  {
    name: 'TiltedCard',
    category: 'hover',
    keywords: ['tilt', '3d card', 'perspective', '3d hover', 'card tilt', 'parallax card'],
    description: '3D tilt effect on card with perspective transform following mouse',
    pattern: `document.querySelectorAll('[data-tilt]').forEach(el=>{el.style.transition='transform 0.1s ease';el.style.transformStyle='preserve-3d';el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();const x=(e.clientX-r.left)/r.width;const y=(e.clientY-r.top)/r.height;const rotateX=(y-0.5)*-15;const rotateY=(x-0.5)*15;el.style.transform='perspective(1000px) rotateX('+rotateX+'deg) rotateY('+rotateY+'deg) scale(1.02)'});el.addEventListener('mouseleave',()=>{el.style.transition='transform 0.5s cubic-bezier(0.16,1,0.3,1)';el.style.transform='perspective(1000px) rotateX(0) rotateY(0) scale(1)'})})`
  },
  {
    name: 'PixelTransition',
    category: 'hover',
    keywords: ['pixel transition', 'pixelate', 'dissolve', 'digital dissolve'],
    description: 'Image/card dissolves into pixels on hover and reforms',
  },
  {
    name: 'StarBorder',
    category: 'hover',
    keywords: ['star border', 'animated border', 'rotating border', 'spinning border', 'glow border'],
    description: 'Border with rotating star/dot animation using conic gradient',
    pattern: `.star-border{position:relative;border-radius:16px;overflow:hidden}.star-border::before{content:'';position:absolute;inset:-2px;background:conic-gradient(from var(--border-angle,0deg),transparent 30%,var(--accent,#6366f1) 50%,transparent 70%);animation:border-spin 3s linear infinite;z-index:-1;border-radius:inherit}.star-border::after{content:'';position:absolute;inset:2px;background:#0a0a0a;border-radius:inherit;z-index:-1}@keyframes border-spin{to{--border-angle:360deg}}@property --border-angle{syntax:'<angle>';initial-value:0deg;inherits:false}`
  },
  {
    name: 'MorphHover',
    category: 'hover',
    keywords: ['morph', 'shape shift', 'blob hover', 'organic hover'],
    description: 'Element morphs between shapes on hover with smooth animation',
  },
];

// ─── SCROLL ANIMATIONS (7) ────────────────────────────────────
const SCROLL_EFFECTS: ReactBitsComponent[] = [
  {
    name: 'ScrollFloat',
    category: 'scroll',
    keywords: ['scroll float', 'floating', 'parallax text', 'scroll reveal text'],
    description: 'Elements float up/down with parallax depth based on scroll position',
  },
  {
    name: 'ScrollReveal',
    category: 'scroll',
    keywords: ['scroll reveal', 'reveal on scroll', 'appear on scroll', 'intersection'],
    description: 'Elements reveal with animation when scrolled into viewport',
    pattern: `const observer=new IntersectionObserver((entries)=>{entries.forEach((entry,i)=>{if(entry.isIntersecting){entry.target.style.transitionDelay=(i*0.1)+'s';entry.target.classList.add('visible');observer.unobserve(entry.target)}})},{threshold:0.1,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el))`
  },
  {
    name: 'ScrollProgress',
    category: 'scroll',
    keywords: ['scroll progress', 'progress bar', 'reading progress', 'scroll indicator'],
    description: 'Fixed progress bar showing reading/scroll progress',
    pattern: `.scroll-progress{position:fixed;top:0;left:0;width:0%;height:3px;background:var(--accent,#6366f1);z-index:9999;transition:width 0.1s}`,
  },
  {
    name: 'ParallaxLayers',
    category: 'scroll',
    keywords: ['parallax', 'parallax layers', 'depth', 'multi-layer scroll'],
    description: 'Multiple depth layers that move at different speeds on scroll',
  },
  {
    name: 'InfiniteScroll',
    category: 'scroll',
    keywords: ['infinite scroll', 'marquee', 'ticker', 'auto scroll', 'logo slider'],
    description: 'Continuous scrolling content (logos, text, cards) — infinite marquee',
    pattern: `.marquee{overflow:hidden;white-space:nowrap}.marquee-inner{display:inline-flex;gap:2rem;animation:marquee var(--duration,30s) linear infinite}.marquee:hover .marquee-inner{animation-play-state:paused}@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`
  },
  {
    name: 'StickyScroll',
    category: 'scroll',
    keywords: ['sticky scroll', 'pin section', 'scroll pin', 'horizontal scroll'],
    description: 'Section pins on scroll while content changes within it',
  },
  {
    name: 'TextRevealByWord',
    category: 'scroll',
    keywords: ['text reveal scroll', 'word reveal', 'opacity scroll', 'text fade scroll'],
    description: 'Text reveals word by word as user scrolls, each word fading in progressively',
  },
];

// ─── UI COMPONENTS (12) ──────────────────────────────────────
const UI_COMPONENTS: ReactBitsComponent[] = [
  {
    name: 'Masonry',
    category: 'ui',
    keywords: ['masonry', 'masonry grid', 'pinterest', 'waterfall layout', 'stacked grid'],
    description: 'Pinterest-style masonry grid layout with variable-height items',
  },
  {
    name: 'Dock',
    category: 'ui',
    keywords: ['dock', 'mac dock', 'icon bar', 'toolbar', 'magnification'],
    description: 'macOS-style dock with magnification on hover',
  },
  {
    name: 'Carousel',
    category: 'ui',
    keywords: ['carousel', 'slider', 'slideshow', 'image slider'],
    description: 'Smooth carousel/slider with pagination and swipe support',
  },
  {
    name: 'CardSwap',
    category: 'ui',
    keywords: ['card swap', 'card stack', 'swipe cards', 'tinder', 'stacked cards'],
    description: 'Stack of cards that can be swiped/swapped one by one',
  },
  {
    name: 'ExpandingCards',
    category: 'ui',
    keywords: ['expanding', 'accordion cards', 'expandable', 'grow on click'],
    description: 'Cards that expand on click/hover while others shrink',
  },
  {
    name: 'AnimatedTabs',
    category: 'ui',
    keywords: ['tabs', 'animated tabs', 'sliding indicator', 'tab bar'],
    description: 'Tab component with sliding active indicator animation',
  },
  {
    name: 'GooeyNav',
    category: 'ui',
    keywords: ['gooey', 'gooey nav', 'blob navigation', 'organic nav'],
    description: 'Navigation with gooey/blobby SVG filter transitions between items',
  },
  {
    name: 'ElasticSlider',
    category: 'ui',
    keywords: ['elastic', 'slider', 'range slider', 'elastic pull'],
    description: 'Slider input with elastic/springy animation on drag',
  },
  {
    name: 'CircularGallery',
    category: 'ui',
    keywords: ['circular gallery', 'wheel', 'orbit', 'rotating gallery'],
    description: 'Images arranged in a 3D circular orbit/wheel formation',
  },
  {
    name: 'PixelCard',
    category: 'ui',
    keywords: ['pixel card', 'retro card', 'pixel art', '8bit'],
    description: 'Card with pixelated/8-bit style border and animation',
  },
  {
    name: 'BentoGrid',
    category: 'layout',
    keywords: ['bento', 'bento grid', 'asymmetric grid', 'feature grid', 'apple grid'],
    description: 'Asymmetric bento-box grid layout with varying card sizes',
    pattern: `.bento{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}.bento>:nth-child(1){grid-column:span 2;grid-row:span 2}.bento>:nth-child(4){grid-column:span 2}@media(max-width:768px){.bento{grid-template-columns:1fr}.bento>*{grid-column:span 1!important;grid-row:span 1!important}}`
  },
  {
    name: 'AnimatedList',
    category: 'ui',
    keywords: ['animated list', 'stagger list', 'notification feed', 'activity feed'],
    description: 'List items enter one by one with staggered animation',
  },
];

// ─── FULL CATALOG ────────────────────────────────────────────
export const REACTBITS_CATALOG: ReactBitsComponent[] = [
  ...BACKGROUNDS,
  ...TEXT_ANIMATIONS,
  ...CURSOR_EFFECTS,
  ...HOVER_EFFECTS,
  ...SCROLL_EFFECTS,
  ...UI_COMPONENTS,
];

/** Search components by keywords, returns top matches */
export function searchComponents(query: string, limit = 10): ReactBitsComponent[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);

  const scored = REACTBITS_CATALOG.map(c => {
    let score = 0;
    // Exact name match
    if (c.name.toLowerCase().includes(q)) score += 10;
    // Category match
    if (c.category === q) score += 8;
    // Keyword matches
    for (const kw of c.keywords) {
      if (kw.includes(q)) score += 5;
      for (const w of words) {
        if (kw.includes(w)) score += 2;
      }
    }
    // Description match
    for (const w of words) {
      if (c.description.toLowerCase().includes(w)) score += 1;
    }
    return { component: c, score };
  }).filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(s => s.component);
}

/** Get component by exact name */
export function getComponent(name: string): ReactBitsComponent | undefined {
  return REACTBITS_CATALOG.find(c => c.name.toLowerCase() === name.toLowerCase());
}

/** Get all components in a category */
export function getByCategory(category: string): ReactBitsComponent[] {
  return REACTBITS_CATALOG.filter(c => c.category === category);
}

/** Generate the system prompt section for ReactBits component awareness */
export function buildReactBitsPromptSection(): string {
  const cats = new Map<string, ReactBitsComponent[]>();
  for (const c of REACTBITS_CATALOG) {
    if (!cats.has(c.category)) cats.set(c.category, []);
    cats.get(c.category)!.push(c);
  }

  const lines: string[] = [];
  lines.push('[REACTBITS VISUAL COMPONENT LIBRARY — 135+ premium components]');
  lines.push('When the user\'s prompt involves ANY visual element, use these INSTEAD of generic code:');
  lines.push('');

  const categoryLabels: Record<string, string> = {
    background: '🎨 BACKGROUNDS (use for: "background", "fond", "atmosphere", "ambiance", "hero bg")',
    text: '✨ TEXT ANIMATIONS (use for: "animated text", "heading effect", "title animation", "dynamic text")',
    cursor: '🖱️ CURSOR EFFECTS (use for: "cursor", "souris", "mouse effect", "pointer")',
    hover: '💫 HOVER EFFECTS (use for: "hover", "survol", "mouse over", "card effect")',
    scroll: '📜 SCROLL ANIMATIONS (use for: "scroll", "parallax", "reveal", "marquee")',
    ui: '🧩 UI COMPONENTS (use for: "gallery", "grid", "carousel", "tabs", "cards")',
    layout: '📐 LAYOUTS (use for: "bento", "grid layout", "masonry")',
    animation: '🎭 ANIMATIONS (use for: "animation", "motion", "transition")',
  };

  for (const [cat, comps] of cats) {
    lines.push(categoryLabels[cat] || cat.toUpperCase());
    for (const c of comps) {
      lines.push(`  • ${c.name} — ${c.description}`);
    }
    lines.push('');
  }

  lines.push('RULES:');
  lines.push('• NEVER generate a generic static background. Use Aurora/Beams/Galaxy/Particles/DotGrid.');
  lines.push('• NEVER generate basic opacity:1→0 hover. Use Magnet/GlareHover/TiltedCard/SpotlightCard.');
  lines.push('• NEVER generate plain text. Use BlurText/ShinyText/GradientText/ScrambleText/GlitchText.');
  lines.push('• NEVER use default cursor. Use BlobCursor/ClickSpark for premium sites.');
  lines.push('• ALWAYS implement the component pattern inline (CSS+JS), don\'t import from react-bits npm.');
  lines.push('• Each component\'s CSS/JS should be self-contained in the generated file.');
  lines.push('[/REACTBITS]');

  return lines.join('\n');
}
