/**
 * AWWWARDS ENGINE — 10K€ Level Visual Generation Intelligence
 * 
 * Complete library of premium web effects used by top creative studios:
 * Three.js shaders, GSAP mega-timelines, page transitions, scroll-driven animations,
 * particle systems, cursor effects, text animations, image reveals.
 * 
 * This file exports prompt sections injected into system-prompts.ts
 * so the AI generates awwwards-level sites.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1 — THREE.JS SHADER TEMPLATES (Copy-paste WebGL)
// ═══════════════════════════════════════════════════════════════════════════════

export const THREEJS_SHADERS = `
## THREE.JS CUSTOM SHADERS — 10K€ LEVEL BACKGROUNDS

### CDN Setup (REQUIRED in <head>)
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
\`\`\`

### SHADER 1: Gradient Mesh (like Stripe.com hero)
\`\`\`javascript
// Gradient mesh background — organic flowing colors
const gradientMesh = () => {
  const canvas = document.getElementById('webgl-canvas');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const vertexShader = \\\`
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float elevation = sin(pos.x * 3.0 + uTime * 0.5) * 0.15 + sin(pos.y * 2.5 + uTime * 0.3) * 0.15;
      pos.z += elevation;
      vElevation = elevation;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  \\\`;
  const fragmentShader = \\\`
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    void main() {
      float mixStrength = (vElevation + 0.15) * 3.33;
      vec3 color = mix(uColor1, uColor2, vUv.x + sin(uTime * 0.2) * 0.2);
      color = mix(color, uColor3, vUv.y + cos(uTime * 0.15) * 0.2);
      color += vElevation * 0.8;
      gl_FragColor = vec4(color, 0.9);
    }
  \\\`;

  const geometry = new THREE.PlaneGeometry(5, 5, 128, 128);
  const material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#6366f1') },
      uColor2: { value: new THREE.Color('#a855f7') },
      uColor3: { value: new THREE.Color('#ec4899') },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  camera.position.z = 2;

  const animate = () => {
    requestAnimationFrame(animate);
    material.uniforms.uTime.value += 0.01;
    renderer.render(scene, camera);
  };
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
};
\`\`\`

### SHADER 2: Noise Distortion Sphere (like Apple Vision Pro)
\`\`\`javascript
const noiseDistortionSphere = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('hero-3d').appendChild(renderer.domElement);

  const vertexShader = \\\`
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform float uTime;
    // Simplex noise function
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0,i1.z,i2.z,1))+i.y+vec4(0,i1.y,i2.y,1))+i.x+vec4(0,i1.x,i2.x,1));
      float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m=m*m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
    void main() {
      vUv = uv;
      vNormal = normal;
      vec3 pos = position;
      float noise = snoise(pos * 1.5 + uTime * 0.3) * 0.3;
      pos += normal * noise;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  \\\`;
  const fragmentShader = \\\`
    varying vec2 vUv;
    varying vec3 vNormal;
    uniform float uTime;
    void main() {
      vec3 light = normalize(vec3(1.0, 1.0, 1.0));
      float diffuse = max(dot(vNormal, light), 0.0);
      vec3 baseColor = mix(vec3(0.388, 0.4, 0.945), vec3(0.659, 0.333, 0.969), vUv.y);
      baseColor = mix(baseColor, vec3(0.925, 0.286, 0.6), sin(uTime * 0.5 + vUv.x * 3.14) * 0.3 + 0.3);
      vec3 color = baseColor * (0.5 + diffuse * 0.5);
      float fresnel = pow(1.0 - max(dot(vNormal, vec3(0, 0, 1)), 0.0), 3.0);
      color += fresnel * 0.4;
      gl_FragColor = vec4(color, 1.0);
    }
  \\\`;

  const geo = new THREE.IcosahedronGeometry(1.5, 64);
  const mat = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { uTime: { value: 0 } } });
  const sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);
  camera.position.z = 4;

  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const animate = () => {
    requestAnimationFrame(animate);
    mat.uniforms.uTime.value += 0.01;
    sphere.rotation.x += (mouseY * 0.3 - sphere.rotation.x) * 0.05;
    sphere.rotation.y += (mouseX * 0.3 - sphere.rotation.y) * 0.05;
    renderer.render(scene, camera);
  };
  animate();
};
\`\`\`

### SHADER 3: Particle Galaxy (cursor-reactive)
\`\`\`javascript
const particleGalaxy = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('particles-bg').appendChild(renderer.domElement);

  const count = 5000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const colorInside = new THREE.Color('#6366f1');
  const colorOutside = new THREE.Color('#ec4899');

  for(let i = 0; i < count; i++) {
    const radius = Math.random() * 5;
    const spinAngle = radius * 3;
    const branchAngle = (i % 3) / 3 * Math.PI * 2;
    const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
    const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
    const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
    positions[i*3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i*3+1] = randomY;
    positions[i*3+2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;
    const mixedColor = colorInside.clone().lerp(colorOutside, radius / 5);
    colors[i*3] = mixedColor.r; colors[i*3+1] = mixedColor.g; colors[i*3+2] = mixedColor.b;
    scales[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const vertexShader = \\\`
    attribute float aScale;
    varying vec3 vColor;
    uniform float uTime;
    uniform float uSize;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = uSize * aScale * (200.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  \\\`;
  const fragmentShader = \\\`
    varying vec3 vColor;
    void main() {
      float d = distance(gl_PointCoord, vec2(0.5));
      if(d > 0.5) discard;
      float alpha = 1.0 - smoothstep(0.3, 0.5, d);
      gl_FragColor = vec4(vColor, alpha * 0.8);
    }
  \\\`;

  const mat = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, transparent: true, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: 8.0 } },
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  camera.position.z = 4;

  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth - 0.5) * 0.5;
    my = (e.clientY / window.innerHeight - 0.5) * 0.5;
  });

  const animate = () => {
    requestAnimationFrame(animate);
    mat.uniforms.uTime.value += 0.01;
    points.rotation.y += 0.002;
    points.rotation.y += (mx * 0.2 - points.rotation.y) * 0.02;
    points.rotation.x += (my * 0.2 - points.rotation.x) * 0.02;
    renderer.render(scene, camera);
  };
  animate();
};
\`\`\`

### SHADER 4: Ray Marching Metaballs (generative art hero)
\`\`\`javascript
const rayMarchMetaballs = (container) => {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const fragmentShader = \\\`
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;

    float sdSphere(vec3 p, float r) { return length(p) - r; }

    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }

    float map(vec3 p) {
      float d = sdSphere(p - vec3(sin(uTime * 0.7) * 1.2, cos(uTime * 0.5) * 0.8, 0), 0.8);
      d = smin(d, sdSphere(p - vec3(cos(uTime * 0.6) * 0.9, sin(uTime * 0.8) * 1.1, sin(uTime * 0.4) * 0.5), 0.6), 0.5);
      d = smin(d, sdSphere(p - vec3(uMouse.x * 2.0, uMouse.y * 2.0, 0.5), 0.5), 0.6);
      d = smin(d, sdSphere(p - vec3(sin(uTime * 0.3) * 1.5, cos(uTime * 0.9) * 0.6, cos(uTime * 0.5)), 0.7), 0.4);
      return d;
    }

    vec3 calcNormal(vec3 p) {
      vec2 e = vec2(0.001, 0.0);
      return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / uResolution.y;
      vec3 ro = vec3(0, 0, -3);
      vec3 rd = normalize(vec3(uv, 1.0));
      float t = 0.0;
      vec3 color = vec3(0.02, 0.02, 0.04);

      for(int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if(d < 0.001) {
          vec3 n = calcNormal(p);
          vec3 light = normalize(vec3(1, 1, -1));
          float diff = max(dot(n, light), 0.0);
          float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
          vec3 baseCol = mix(vec3(0.388, 0.4, 0.945), vec3(0.925, 0.286, 0.6), n.y * 0.5 + 0.5);
          color = baseCol * (0.3 + diff * 0.7) + fres * vec3(0.5, 0.3, 0.8);
          break;
        }
        t += d;
        if(t > 20.0) break;
      }
      gl_FragColor = vec4(color, 1.0);
    }
  \\\`;

  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    fragmentShader,
    vertexShader: 'void main(){gl_Position=vec4(position,1.0);}',
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uMouse: { value: new THREE.Vector2(0, 0) },
    },
  });
  scene.add(new THREE.Mesh(geo, mat));

  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = -(e.clientY / window.innerHeight - 0.5);
  });

  const animate = () => {
    requestAnimationFrame(animate);
    mat.uniforms.uTime.value += 0.01;
    mat.uniforms.uMouse.value.set(mx, my);
    renderer.render(scene, camera);
  };
  animate();
};
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 2 — GSAP MEGA-TIMELINE SYSTEM (50+ TWEENS)
// ═══════════════════════════════════════════════════════════════════════════════

export const GSAP_MEGA_TIMELINES = `
## GSAP MEGA-TIMELINE SYSTEM — 50+ SYNCHRONIZED TWEENS

### CDN Setup (REQUIRED — extended set)
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollToPlugin.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Flip.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/SplitText.min.js"></script>
<script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
\`\`\`

### PRELOADER + PAGE ENTRANCE (12+ tweens)
\`\`\`javascript
// Cinematic preloader → page reveal
const preloaderTimeline = () => {
  const tl = gsap.timeline();
  // Phase 1: Counter 0→100
  tl.to('.preloader-counter', { textContent: 100, snap: { textContent: 1 }, duration: 2, ease: 'power2.inOut' })
    // Phase 2: Counter scales up
    .to('.preloader-counter', { scale: 3, opacity: 0, duration: 0.6, ease: 'power2.in' })
    // Phase 3: Preloader curtains split
    .to('.preloader-top', { yPercent: -100, duration: 1, ease: 'power4.inOut' }, '-=0.3')
    .to('.preloader-bottom', { yPercent: 100, duration: 1, ease: 'power4.inOut' }, '<')
    // Phase 4: Hero content reveals
    .from('.hero-title .line', { yPercent: 120, rotateX: -80, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out' }, '-=0.5')
    .from('.hero-subtitle', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .from('.hero-cta', { y: 20, opacity: 0, scale: 0.9, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.4')
    .from('.nav-item', { y: -20, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'power2.out' }, '-=0.5')
    .from('.hero-visual', { scale: 0.8, opacity: 0, duration: 1.2, ease: 'expo.out' }, '-=0.8')
    .from('.hero-badge', { scale: 0, opacity: 0, rotation: -180, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, '-=0.6')
    .from('.hero-stats .stat', { y: 40, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power2.out' }, '-=0.4')
    .from('.scroll-indicator', { y: -10, opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.2');
};
\`\`\`

### SCROLL-DRIVEN SECTIONS MEGA-TIMELINE (30+ tweens)
\`\`\`javascript
const scrollMegaTimeline = () => {
  gsap.registerPlugin(ScrollTrigger);

  // ── Section 1: Features with staggered card reveals ──
  gsap.from('.feature-card', {
    y: 100, opacity: 0, rotateY: -15, stagger: { each: 0.15, from: 'start' },
    duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: '.features', start: 'top 75%' }
  });

  // ── Section 2: Horizontal scroll gallery (PINNED) ──
  const track = document.querySelector('.gallery-track');
  gsap.to(track, {
    x: () => -(track.scrollWidth - window.innerWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: '.gallery-section', pin: true, scrub: 1,
      end: () => '+=' + (track.scrollWidth - window.innerWidth),
      invalidateOnRefresh: true,
    }
  });
  // Gallery items parallax within scroll
  gsap.utils.toArray('.gallery-item').forEach((item, i) => {
    gsap.from(item.querySelector('img'), {
      scale: 1.5, duration: 1,
      scrollTrigger: { trigger: item, containerAnimation: gsap.getById && undefined, start: 'left right', end: 'right left', scrub: true }
    });
    gsap.from(item.querySelector('.caption'), {
      y: 60, opacity: 0, duration: 0.8, delay: i * 0.1,
      scrollTrigger: { trigger: item, start: 'left 80%', end: 'left 30%', scrub: true }
    });
  });

  // ── Section 3: Text reveal with parallax image ──
  const splitHeading = document.querySelectorAll('.reveal-heading .word');
  gsap.from(splitHeading, {
    y: '100%', opacity: 0, rotateX: -90, stagger: 0.03, duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: '.reveal-section', start: 'top 60%' }
  });
  gsap.from('.reveal-image', {
    clipPath: 'inset(100% 0 0 0)', scale: 1.2, duration: 1.5, ease: 'expo.inOut',
    scrollTrigger: { trigger: '.reveal-section', start: 'top 50%' }
  });

  // ── Section 4: Stats counter with stagger ──
  gsap.utils.toArray('.stat-number').forEach(el => {
    gsap.from(el, {
      textContent: 0, snap: { textContent: 1 }, duration: 2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 80%', once: true }
    });
  });
  gsap.from('.stat-label', { y: 20, opacity: 0, stagger: 0.1, duration: 0.6, scrollTrigger: { trigger: '.stats', start: 'top 80%' } });

  // ── Section 5: Testimonials with 3D card flip ──
  gsap.from('.testimonial-card', {
    rotateY: 90, opacity: 0, stagger: 0.2, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '.testimonials', start: 'top 70%' }
  });

  // ── Section 6: CTA with magnetic effect + glow ──
  gsap.from('.cta-section', {
    backgroundPosition: '0% 50%', duration: 3, ease: 'none',
    scrollTrigger: { trigger: '.cta-section', start: 'top bottom', end: 'bottom top', scrub: true }
  });
  gsap.from('.cta-heading .char', {
    y: 80, opacity: 0, rotateX: -90, stagger: 0.02, duration: 0.8, ease: 'expo.out',
    scrollTrigger: { trigger: '.cta-section', start: 'top 60%' }
  });
  gsap.from('.cta-button', {
    scale: 0, opacity: 0, duration: 1, ease: 'elastic.out(1, 0.5)',
    scrollTrigger: { trigger: '.cta-section', start: 'top 50%' }
  });

  // ── Section 7: Footer columns stagger ──
  gsap.from('.footer-col', { y: 40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: 'footer', start: 'top 85%' } });

  // ── Continuous: Parallax backgrounds ──
  gsap.utils.toArray('[data-parallax]').forEach(el => {
    const speed = parseFloat(el.dataset.parallax) || 0.5;
    gsap.to(el, {
      yPercent: -30 * speed, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // ── Fade-up batch (all .fade-up elements) ──
  ScrollTrigger.batch('.fade-up', {
    onEnter: batch => gsap.from(batch, { y: 60, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' }),
    start: 'top 85%', once: true,
  });
};
\`\`\`

### SPLIT TEXT ANIMATION SYSTEM
\`\`\`javascript
// Split text into chars/words/lines for animation
function splitText(element) {
  const text = element.textContent;
  element.innerHTML = '';
  // Split into words, then chars
  text.split(' ').forEach((word, wi) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';
    wordSpan.style.cssText = 'display:inline-block;overflow:hidden;';
    word.split('').forEach((char) => {
      const charSpan = document.createElement('span');
      charSpan.className = 'char';
      charSpan.textContent = char;
      charSpan.style.cssText = 'display:inline-block;will-change:transform;';
      wordSpan.appendChild(charSpan);
    });
    element.appendChild(wordSpan);
    if (wi < text.split(' ').length - 1) element.appendChild(document.createTextNode(' '));
  });
  return { chars: element.querySelectorAll('.char'), words: element.querySelectorAll('.word') };
}

// Text scramble effect (like Monopo studio)
function textScramble(element, finalText, duration = 2000) {
  const chars = '!<>-_\\\\/[]{}—=+*^?#________';
  let frame = 0;
  const totalFrames = duration / 16;
  const animate = () => {
    let output = '';
    const progress = frame / totalFrames;
    for (let i = 0; i < finalText.length; i++) {
      if (i < Math.floor(progress * finalText.length)) {
        output += finalText[i];
      } else {
        output += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    element.textContent = output;
    frame++;
    if (frame < totalFrames) requestAnimationFrame(animate);
    else element.textContent = finalText;
  };
  animate();
}
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 3 — PAGE TRANSITIONS (BARBA.JS + VIEW TRANSITIONS API)
// ═══════════════════════════════════════════════════════════════════════════════

export const PAGE_TRANSITIONS = `
## PAGE TRANSITIONS — FLUID MULTI-ROUTE NAVIGATION

### Method 1: View Transitions API (modern, no library)
\`\`\`javascript
// For single-page app route changes
function navigateTo(url) {
  if (!document.startViewTransition) { window.location.href = url; return; }
  document.startViewTransition(async () => {
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
    document.title = doc.title;
    history.pushState({}, '', url);
  });
}

// CSS for view transitions
/*
::view-transition-old(root) { animation: slide-out 0.4s cubic-bezier(0.4, 0, 0.2, 1) both; }
::view-transition-new(root) { animation: slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) both; }
@keyframes slide-out { to { transform: translateX(-30px); opacity: 0; } }
@keyframes slide-in { from { transform: translateX(30px); opacity: 0; } }

// Per-element transitions (hero image morphs between pages)
.hero-image { view-transition-name: hero-image; }
::view-transition-old(hero-image) { animation: scale-down 0.4s ease both; }
::view-transition-new(hero-image) { animation: scale-up 0.4s ease both; }
@keyframes scale-down { to { transform: scale(0.9); opacity: 0; } }
@keyframes scale-up { from { transform: scale(1.1); opacity: 0; } }
*/
\`\`\`

### Method 2: Custom Page Transition (no library, GSAP-powered)
\`\`\`javascript
// Curtain/wipe page transition
const pageTransition = {
  overlay: null,
  init() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'page-transition-overlay';
    this.overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;display:flex;';
    // 5 columns for staggered wipe
    for (let i = 0; i < 5; i++) {
      const col = document.createElement('div');
      col.style.cssText = 'flex:1;background:#0a0a0a;transform:scaleY(0);transform-origin:bottom;';
      this.overlay.appendChild(col);
    }
    document.body.appendChild(this.overlay);
    // Intercept link clicks
    document.querySelectorAll('a[href^="/"]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.leave(a.href);
      });
    });
  },
  leave(url) {
    const cols = this.overlay.children;
    const tl = gsap.timeline({ onComplete: () => { window.location.href = url; } });
    tl.to(cols, { scaleY: 1, stagger: 0.08, duration: 0.5, ease: 'power4.inOut' });
  },
  enter() {
    const cols = this.overlay.children;
    gsap.set(cols, { scaleY: 1, transformOrigin: 'top' });
    gsap.to(cols, { scaleY: 0, stagger: 0.08, duration: 0.5, ease: 'power4.inOut', delay: 0.1 });
  }
};
// Init on load:
// pageTransition.init();
// pageTransition.enter(); // animate in on page load
\`\`\`

### Method 3: Clip-path reveal transition
\`\`\`css
.page-transition { position:fixed;inset:0;z-index:9999;background:#0a0a0a;clip-path:circle(0% at 50% 50%); }
.page-transition.active { animation: circle-reveal 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
@keyframes circle-reveal { to { clip-path: circle(150% at 50% 50%); } }
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 4 — SCROLL-DRIVEN ANIMATION (AWWWARDS LEVEL)
// ═══════════════════════════════════════════════════════════════════════════════

export const SCROLL_DRIVEN_ANIMATIONS = `
## SCROLL-DRIVEN ANIMATIONS — AWWWARDS LEVEL

### CSS Scroll-Driven Animations API (native, performant)
\`\`\`css
/* Progress bar that fills as you scroll */
.scroll-progress {
  position: fixed; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #6366f1, #ec4899);
  transform-origin: left; animation: grow-progress auto linear; animation-timeline: scroll();
}
@keyframes grow-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* Elements animate as they enter viewport */
.scroll-reveal {
  animation: reveal-up auto linear both;
  animation-timeline: view(); animation-range: entry 0% entry 100%;
}
@keyframes reveal-up { from { opacity: 0; transform: translateY(60px) rotateX(-10deg); } to { opacity: 1; transform: none; } }

/* Parallax with scroll timeline (GPU-accelerated) */
.parallax-bg {
  animation: parallax-move auto linear; animation-timeline: scroll();
}
@keyframes parallax-move { from { transform: translateY(-20%); } to { transform: translateY(20%); } }

/* Image scale on scroll */
.scroll-zoom-image {
  animation: zoom-in auto linear; animation-timeline: view(); animation-range: cover 0% cover 50%;
}
@keyframes zoom-in { from { transform: scale(1.3); } to { transform: scale(1); } }

/* Horizontal scroll section */
.horizontal-scroll-section {
  overflow-x: hidden;
}
.horizontal-track {
  display: flex; gap: 2rem; width: max-content;
  animation: scroll-horizontal auto linear;
  animation-timeline: scroll(nearest block);
}
@keyframes scroll-horizontal { from { transform: translateX(0); } to { transform: translateX(calc(-100% + 100vw)); } }

/* Text character reveal on scroll */
.scroll-text-reveal span {
  opacity: 0.15;
  animation: char-reveal auto linear both;
  animation-timeline: view(); animation-range: cover 20% cover 40%;
}
@keyframes char-reveal { to { opacity: 1; } }
\`\`\`

### LENIS + GSAP Advanced Scroll Patterns
\`\`\`javascript
// Initialize premium scroll system
const initPremiumScroll = () => {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.8,
    touchMultiplier: 1.5,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ── Scroll velocity effects ──
  let scrollVelocity = 0;
  lenis.on('scroll', ({ velocity }) => { scrollVelocity = velocity; });
  // Skew elements based on scroll speed
  gsap.ticker.add(() => {
    const skew = Math.min(Math.abs(scrollVelocity) * 0.3, 8);
    gsap.to('.velocity-skew', { skewY: scrollVelocity > 0 ? skew : -skew, duration: 0.3, ease: 'power2.out' });
  });

  // ── Infinite marquee with scroll speed ──
  const marquees = document.querySelectorAll('.marquee-track');
  marquees.forEach(track => {
    const speed = parseFloat(track.dataset.speed) || 1;
    const direction = track.dataset.direction === 'right' ? 1 : -1;
    gsap.to(track, {
      xPercent: -50 * direction, duration: 20 / speed, ease: 'none', repeat: -1,
    });
    // Speed up/slow down with scroll velocity
    lenis.on('scroll', ({ velocity }) => {
      gsap.to(track, { timeScale: 1 + Math.abs(velocity) * 0.05 * direction, duration: 0.5 });
    });
  });

  // ── Scroll-linked video playback ──
  const videoEl = document.querySelector('.scroll-video video');
  if (videoEl) {
    ScrollTrigger.create({
      trigger: '.scroll-video', start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (self) => {
        if (videoEl.duration) videoEl.currentTime = self.progress * videoEl.duration;
      }
    });
  }

  // ── Scroll snap with GSAP ──
  const sections = gsap.utils.toArray('.snap-section');
  sections.forEach((section, i) => {
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom top',
      snap: { snapTo: 1, duration: { min: 0.2, max: 0.5 }, ease: 'power2.inOut' },
    });
  });

  return lenis;
};
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 5 — CURSOR EFFECTS & MICRO-INTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const CURSOR_AND_MICRO = `
## CUSTOM CURSOR & MICRO-INTERACTIONS

### Custom Cursor (dot + follower + magnetic)
\`\`\`javascript
const initCustomCursor = () => {
  const cursor = document.createElement('div');
  const follower = document.createElement('div');
  cursor.className = 'cursor-dot';
  follower.className = 'cursor-follower';
  cursor.style.cssText = 'position:fixed;width:8px;height:8px;background:white;border-radius:50%;pointer-events:none;z-index:99999;mix-blend-mode:difference;transition:transform 0.1s;';
  follower.style.cssText = 'position:fixed;width:40px;height:40px;border:1px solid rgba(255,255,255,0.3);border-radius:50%;pointer-events:none;z-index:99998;transition:transform 0.15s ease-out, width 0.3s, height 0.3s, border-color 0.3s;';
  document.body.appendChild(cursor);
  document.body.appendChild(follower);

  let mx = 0, my = 0, fx = 0, fy = 0;
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx - 4 + 'px';
    cursor.style.top = my - 4 + 'px';
  });

  const followCursor = () => {
    fx += (mx - fx) * 0.12;
    fy += (my - fy) * 0.12;
    follower.style.left = fx - 20 + 'px';
    follower.style.top = fy - 20 + 'px';
    requestAnimationFrame(followCursor);
  };
  followCursor();

  // Magnetic effect on buttons/links
  document.querySelectorAll('a, button, [data-magnetic]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      follower.style.width = '60px'; follower.style.height = '60px';
      follower.style.left = fx - 30 + 'px'; follower.style.top = fy - 30 + 'px';
      follower.style.borderColor = 'rgba(99, 102, 241, 0.6)';
      cursor.style.transform = 'scale(0.5)';
    });
    el.addEventListener('mouseleave', () => {
      follower.style.width = '40px'; follower.style.height = '40px';
      follower.style.borderColor = 'rgba(255,255,255,0.3)';
      cursor.style.transform = 'scale(1)';
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    });
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.3;
      const dy = (e.clientY - cy) * 0.3;
      gsap.to(el, { x: dx, y: dy, duration: 0.3, ease: 'power2.out' });
    });
  });

  // Scale up on clickable images
  document.querySelectorAll('img, video, .card').forEach(el => {
    el.addEventListener('mouseenter', () => {
      follower.style.width = '80px'; follower.style.height = '80px';
      follower.style.left = fx - 40 + 'px'; follower.style.top = fy - 40 + 'px';
      follower.style.borderColor = 'rgba(255,255,255,0.1)';
      follower.style.background = 'rgba(255,255,255,0.03)';
    });
    el.addEventListener('mouseleave', () => {
      follower.style.width = '40px'; follower.style.height = '40px';
      follower.style.borderColor = 'rgba(255,255,255,0.3)';
      follower.style.background = 'transparent';
    });
  });
};
// IMPORTANT: Add body { cursor: none; } when using custom cursor
\`\`\`

### Magnetic Button
\`\`\`css
.magnetic-btn {
  position: relative; padding: 16px 48px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.15);
  background: transparent; color: white; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;
  overflow: hidden; transition: color 0.4s;
}
.magnetic-btn::before {
  content: ''; position: absolute; inset: 0; background: white; border-radius: inherit;
  transform: translateY(100%); transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.magnetic-btn:hover::before { transform: translateY(0); }
.magnetic-btn:hover { color: #0a0a0a; }
.magnetic-btn span { position: relative; z-index: 1; }
\`\`\`

### Image Reveal on Scroll (mask animation)
\`\`\`css
.image-reveal { position: relative; overflow: hidden; }
.image-reveal img { transform: scale(1.3); transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
.image-reveal::after {
  content: ''; position: absolute; inset: 0; background: #0a0a0a;
  transform-origin: right; transition: transform 1s cubic-bezier(0.77, 0, 0.175, 1);
}
.image-reveal.revealed::after { transform: scaleX(0); }
.image-reveal.revealed img { transform: scale(1); }
\`\`\`
/* Use IntersectionObserver or GSAP ScrollTrigger to add .revealed class */

### Tilt Card (3D perspective hover)
\`\`\`javascript
document.querySelectorAll('.tilt-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = \\\`perspective(1000px) rotateY(\${x * 15}deg) rotateX(\${-y * 15}deg) scale3d(1.02, 1.02, 1.02)\\\`;
    // Spotlight effect
    card.style.background = \\\`radial-gradient(circle at \${e.clientX - rect.left}px \${e.clientY - rect.top}px, rgba(255,255,255,0.06), transparent 60%)\\\`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale3d(1,1,1)';
    card.style.background = '';
  });
});
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 6 — COMPLETE AWWWARDS PROMPT SECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const AWWWARDS_SYSTEM_PROMPT = `
## SECTION 15 — ALWAYS-ON STUDIO-GRADE GENERATION (10K€ STANDARD)

⚠️ THIS IS NOT A MODE — IT IS THE DEFAULT FOR EVERY SINGLE GENERATION.
The user does NOT need to say "premium", "awwwards", "studio", or any keyword.
Even "make me a simple landing page" MUST produce 10K€ studio output.
A "simple" request = simpler CONTENT, NOT simpler QUALITY.

### THE STUDIO STACK (MANDATORY ON EVERY GENERATION)
This is the exact stack used by Awwwards-winning studios (Locomotive, DarkRoom, Active Theory, Lusion):
\`\`\`
Three.js / WebGL            → 3D hero backgrounds, shaders, particles
GSAP + ScrollTrigger        → mega-timelines, 20+ scroll-driven animations
Lenis                       → smooth scroll (REPLACES native scroll)
SplitType                   → text split into chars/words for animation
Postprocessing              → bloom, depth-of-field on WebGL scenes
Custom Cursor               → dot + follower + magnetic (mix-blend-mode:difference)
\`\`\`

### NON-NEGOTIABLE CHECKLIST (EVERY generation, no exceptions)
Before outputting code, mentally verify ALL of these are included:
1. [x] Lenis smooth scroll initialized with GSAP ticker sync
2. [x] Preloader: counter 0→100 + curtain reveal (column wipe or scaleY) + hero stagger entrance
3. [x] Three.js hero: gradient mesh shader OR particle galaxy OR noise sphere OR ray marching
4. [x] Custom cursor: dot (8px) + follower (40px) + magnetic effect on links/buttons + scale on images/cards
5. [x] SplitType on h1: split into chars, animate with GSAP stagger (y:100, rotateX:-90, opacity:0)
6. [x] GSAP ScrollTrigger on EVERY section (minimum 20 animated elements total)
7. [x] Image reveal: clip-path inset(0 100% 0 0) → inset(0) OR mask wipe with ::after scaleX
8. [x] Infinite marquee: auto-scrolling logos/text, pauseOnHover, scroll-velocity reactive
9. [x] Magnetic buttons: mousemove → translate toward cursor, elastic snap-back on leave
10. [x] 3D tilt cards: perspective(1000px) + rotateX/Y on mousemove + spotlight radial-gradient
11. [x] Scroll progress: fixed bar top, scaleX(0→1) linked to scroll position
12. [x] Number counters: textContent snap animation on ScrollTrigger (once:true)
13. [x] Staggered reveals: ALL content sections use rotateX(-10deg) + y:60 + opacity:0 + stagger:0.08
14. [x] Parallax: images/backgrounds with yPercent offset on scrub:true ScrollTrigger
15. [x] Footer reveal: sticky bottom z-index:-1, main-content slides up to reveal
16. [x] Grain overlay: SVG noise texture, fixed, pointer-events:none, opacity:0.03-0.06
17. [x] body { cursor: none } + custom cursor visible

### MINIMUM CODE VOLUME
- Simple landing: 800+ lines
- Full marketing site: 1500+ lines  
- Portfolio/agency: 2000+ lines
- Under these thresholds = you're cutting corners. Add more sections + more animation detail.

### PERFORMANCE RULES (NON-NEGOTIABLE):
- Always \`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))\` — cap at 2x
- Always handle window resize in Three.js scenes
- Use \`will-change: transform\` on animated elements (remove after animation completes)
- Dispose Three.js geometries/materials/textures when no longer visible
- Use \`requestAnimationFrame\` — never \`setInterval\` for animations
- Lazy-load Three.js scenes (IntersectionObserver to start/stop render loop when off-screen)
- @media (prefers-reduced-motion:reduce) fallback for accessibility
- Test at 1920x1080 AND 375x812 (mobile) — responsive breakpoints required

### RESPONSIVE 3D STRATEGY:
- Desktop: Full Three.js scene + particle count 5000+
- Tablet: Reduced particle count (2000), simpler shaders
- Mobile: CSS-only gradient animation fallback OR particle count 500
\`\`\`javascript
const isMobile = window.innerWidth < 768;
const particleCount = isMobile ? 500 : window.innerWidth < 1024 ? 2000 : 5000;
\`\`\`

### TYPOGRAPHY FOR AWWWARDS SITES:
Use these font pairings (include via Google Fonts CDN):
| Style | Heading | Body |
|-------|---------|------|
| Architectural | Neue Machina / Space Grotesk | Inter |
| Luxury | Cormorant Garamond / Playfair Display | Source Sans 3 |
| Bold Modern | Unbounded / Syne | DM Sans |
| Clean Tech | Satoshi / General Sans | Instrument Sans |
| Editorial | PP Neue Montreal / Clash Display | Switzer |
\`\`\`html
<!-- Example: Clash Display + Switzer -->
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=switzer@400,500&display=swap" rel="stylesheet">
\`\`\`

### CSS UTILITIES FOR AWWWARDS SITES:
\`\`\`css
/* Grain texture overlay (MANDATORY on every site) */
.grain::after { content:''; position:fixed;inset:0;z-index:9998;pointer-events:none;opacity:0.04;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
/* Glassmorphism card */
.glass { background:rgba(255,255,255,0.03); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.06); border-radius:16px; }
/* Gradient text */
.gradient-text { background:linear-gradient(135deg,#6366f1,#a855f7,#ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
/* Glow effect */
.glow { box-shadow:0 0 60px rgba(99,102,241,0.15), 0 0 120px rgba(168,85,247,0.08); }
/* Smooth clip-path reveal */
.clip-reveal { clip-path:inset(0 100% 0 0); transition:clip-path 1s cubic-bezier(0.77,0,0.175,1); }
.clip-reveal.active { clip-path:inset(0 0% 0 0); }
/* Section divider (curved) */
.section-curve { position:relative; }
.section-curve::after { content:''; position:absolute;bottom:-1px;left:0;right:0;height:80px;
  background:inherit; clip-path:ellipse(60% 100% at 50% 100%); }
/* Scroll-triggered line animation */
.line-draw { stroke-dasharray:1000; stroke-dashoffset:1000; transition:stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1); }
.line-draw.active { stroke-dashoffset:0; }
/* Footer reveal (content slides up to reveal footer behind) */
.footer-reveal { position:sticky; bottom:0; z-index:-1; }
.main-content { position:relative; z-index:1; background:inherit; }
/* Scroll-velocity skew (pair with Lenis velocity listener) */
.velocity-skew { will-change:transform; transition:transform 0.3s ease-out; }
\`\`\`

### SPLITTYPE + GSAP TEXT ANIMATION (MANDATORY on h1/h2)
\`\`\`javascript
// SplitType CDN: <script src="https://unpkg.com/split-type@0.3.4/umd/index.min.js"></script>
// Split headings and animate chars
document.querySelectorAll('[data-split]').forEach(el => {
  const split = new SplitType(el, { types: 'chars,words,lines' });
  gsap.set(split.chars, { opacity: 0, y: 80, rotateX: -90 });
  ScrollTrigger.create({
    trigger: el, start: 'top 80%', once: true,
    onEnter: () => gsap.to(split.chars, { opacity: 1, y: 0, rotateX: 0, stagger: 0.03, duration: 0.8, ease: 'expo.out' })
  });
});
// Hero title — immediate entrance (after preloader)
const heroSplit = new SplitType('.hero-title', { types: 'chars,words' });
gsap.from(heroSplit.chars, { y: 100, rotateX: -90, opacity: 0, stagger: 0.02, duration: 1, ease: 'expo.out', delay: 2.8 });
\`\`\`

### WEBGL FLUID SIMULATION (interactive cursor-reactive hero background)
\`\`\`javascript
// Minimal implementation inspired by PavelDoGreat/WebGL-Fluid-Simulation
// For full fluid sim, embed the open-source library:
// <script src="https://cdn.jsdelivr.net/gh/nicktindall/WebGL-Fluid-Simulation@master/script.js"></script>
// ...or use the canvas-based version below as a lightweight alternative:
const fluidCanvas = document.getElementById('fluid-bg');
if (fluidCanvas) {
  const gl = fluidCanvas.getContext('webgl', { alpha: true });
  if (gl) {
    // Set canvas size
    fluidCanvas.width = window.innerWidth;
    fluidCanvas.height = window.innerHeight;
    // Fragment shader for fluid-like gradient that reacts to cursor
    const fragSrc = \\\`
      precision highp float;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uResolution;
      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        vec2 mouse = uMouse / uResolution;
        float d = length(uv - mouse);
        float ripple = sin(d * 30.0 - uTime * 3.0) * exp(-d * 5.0) * 0.5;
        vec3 col = mix(vec3(0.039, 0.039, 0.078), vec3(0.388, 0.4, 0.945), uv.y + ripple);
        col = mix(col, vec3(0.659, 0.333, 0.969), sin(uTime * 0.5 + uv.x * 3.14) * 0.3 + ripple);
        gl_FragColor = vec4(col, 0.6);
      }
    \\\`;
    // Vertex shader
    const vertSrc = 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}';
    // [Compile + link shaders, create quad, animate with requestAnimationFrame]
    // Track mouse: document.addEventListener('mousemove', e => { mx = e.clientX; my = canvas.height - e.clientY; });
  }
}
\`\`\`

${THREEJS_SHADERS}

${GSAP_MEGA_TIMELINES}

${PAGE_TRANSITIONS}

${SCROLL_DRIVEN_ANIMATIONS}

${CURSOR_AND_MICRO}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 7 — LOTTIE & RIVE ANIMATION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

export const LOTTIE_AND_RIVE = `
## LOTTIE & RIVE — MOTION DESIGN INTEGRATION

### Lottie Web (After Effects → Web)
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
<script>
// Pattern 1: Auto-playing hero animation
const heroAnim = lottie.loadAnimation({
  container: document.getElementById('lottie-hero'),
  renderer: 'svg', // 'canvas' for better performance, 'svg' for quality
  loop: true,
  autoplay: true,
  path: '/animations/hero.json' // Lottie JSON file
});

// Pattern 2: Scroll-triggered animation
const scrollAnim = lottie.loadAnimation({
  container: document.getElementById('lottie-scroll'),
  renderer: 'svg', loop: false, autoplay: false,
  path: '/animations/process.json'
});
// Sync with GSAP ScrollTrigger
ScrollTrigger.create({
  trigger: '#lottie-scroll',
  start: 'top 80%', end: 'bottom 20%', scrub: 1,
  onUpdate: (self) => {
    scrollAnim.goToAndStop(self.progress * scrollAnim.totalFrames, true);
  }
});

// Pattern 3: Hover-triggered icon animation
document.querySelectorAll('.lottie-icon').forEach(el => {
  const anim = lottie.loadAnimation({
    container: el, renderer: 'svg', loop: false, autoplay: false,
    path: el.dataset.lottie
  });
  el.addEventListener('mouseenter', () => { anim.setDirection(1); anim.play(); });
  el.addEventListener('mouseleave', () => { anim.setDirection(-1); anim.play(); });
});

// Pattern 4: Preloader with Lottie
const preloaderAnim = lottie.loadAnimation({
  container: document.getElementById('preloader-anim'),
  renderer: 'svg', loop: true, autoplay: true,
  path: '/animations/loader.json'
});
// On load complete:
// preloaderAnim.destroy();
// gsap.to('#preloader', { opacity: 0, duration: 0.5, onComplete: () => document.getElementById('preloader').remove() });
</script>
\`\`\`

### DotLottie Player (lighter-weight alternative)
\`\`\`html
<script src="https://unpkg.com/@dotlottie/player-component@2/dist/dotlottie-player.mjs" type="module"></script>
<dotlottie-player
  src="https://assets.example.com/animation.lottie"
  background="transparent"
  speed="1"
  style="width:300px;height:300px"
  loop autoplay>
</dotlottie-player>
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 8 — ADVANCED GLSL TECHNIQUES (from Book of Shaders + LYGIA)
// ═══════════════════════════════════════════════════════════════════════════════

export const ADVANCED_GLSL_TECHNIQUES = `
## ADVANCED GLSL TECHNIQUES — LEVEL UP SHADERS

### Chromatic Aberration (post-processing or per-mesh)
\`\`\`glsl
// Apply to any texture for cinematic look
vec3 chromaticAberration(sampler2D tex, vec2 uv, float amount) {
  float r = texture2D(tex, uv + vec2(amount, 0.0)).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - vec2(amount, 0.0)).b;
  return vec3(r, g, b);
}
// Usage: gl_FragColor = vec4(chromaticAberration(uTexture, vUv, 0.005), 1.0);
// Animate amount with mouse distance for interactive effect
\`\`\`

### Grayscale to Color Transition (scroll-driven)
\`\`\`glsl
uniform float uProgress; // 0.0 = grayscale, 1.0 = full color (drive with ScrollTrigger)
uniform sampler2D uTexture;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(uTexture, vUv);
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 grayscale = vec3(gray);
  gl_FragColor = vec4(mix(grayscale, color.rgb, uProgress), color.a);
}
\`\`\`

### Displacement Map Effect (image morph)
\`\`\`glsl
// Two images + displacement map = smooth morph transition
uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform sampler2D uDisplacement;
uniform float uProgress;
varying vec2 vUv;
void main() {
  vec4 disp = texture2D(uDisplacement, vUv);
  float displacementForce = disp.r * 0.5;
  vec2 uv1 = vUv + displacementForce * uProgress * vec2(0.5, 0.0);
  vec2 uv2 = vUv - displacementForce * (1.0 - uProgress) * vec2(0.5, 0.0);
  vec4 tex1 = texture2D(uTexture1, uv1);
  vec4 tex2 = texture2D(uTexture2, uv2);
  gl_FragColor = mix(tex1, tex2, uProgress);
}
// Animate uProgress from 0→1 on hover for image morph transitions
\`\`\`

### Halftone Shader (editorial/print aesthetic)
\`\`\`glsl
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(uTexture, vUv);
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  
  // Create dot pattern
  vec2 st = gl_FragCoord.xy / 6.0; // dot size
  vec2 nearest = 2.0 * fract(st) - 1.0;
  float dist = length(nearest);
  
  float radius = sqrt(1.0 - lum) * 0.9;
  float circle = step(dist, radius);
  
  gl_FragColor = vec4(vec3(circle) * color.rgb, 1.0);
}
\`\`\`

### Ripple/Water Distortion (on image hover)
\`\`\`javascript
// Apply as Three.js plane with texture
const rippleShader = {
  uniforms: {
    uTexture: { value: null }, uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uRippleStrength: { value: 0 }, // Animate 0→1 on hover
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: \\\`
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uRippleStrength;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      float dist = distance(uv, uMouse);
      float ripple = sin(dist * 40.0 - uTime * 5.0) * exp(-dist * 8.0) * uRippleStrength * 0.02;
      uv += ripple;
      gl_FragColor = texture2D(uTexture, uv);
    }
  \\\`
};
\`\`\`

### Film Look (scanlines + vignette + color grade)
\`\`\`glsl
// Full-screen post-processing for cinematic look
precision highp float;
uniform sampler2D tDiffuse;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  
  // Scanlines
  float scanline = sin(vUv.y * 800.0) * 0.03;
  color.rgb -= scanline;
  
  // Vignette
  float vignette = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 1.2;
  color.rgb *= vignette;
  
  // Color grade (teal + orange look)
  color.r = color.r * 1.1 + 0.02;
  color.g = color.g * 0.95;
  color.b = color.b * 1.15 + 0.03;
  
  // Slight desaturation
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(lum), color.rgb, 0.85);
  
  gl_FragColor = color;
}
\`\`\`
`;
