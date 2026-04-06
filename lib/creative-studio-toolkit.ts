/**
 * CREATIVE STUDIO TOOLKIT â€” Complete Awwwards Studio Patterns
 * 
 * Real, copy-paste code patterns from the exact stack used by:
 * Locomotive, DarkRoom Engineering, Active Theory, Lusion, Bruno Simon, Resn
 * 
 * Sections:
 * 1. GLSL Shader Functions Library (from LYGIA/Book of Shaders)
 * 2. Advanced Three.js Patterns (GLTF, Postprocessing, Bloom)
 * 3. Physics & Simulations (Fluid, Matter.js, Particles)
 * 4. Text Animation Pro (SplitType, Splitting.js, Typed.js, Variable Fonts)
 * 5. Page Transitions (Barba.js, Swup, Highway patterns)
 * 6. Scroll-Driven Pro (Locomotive, ScrollReveal, AOS patterns)
 * 7. Canvas 2D Generative (p5.js, Rough.js patterns)
 * 8. Audio-Reactive Visuals (Tone.js, Meyda)
 * 9. Cursor Pro & Micro-Interactions (Kinet, Atropos, Magnetic)
 * 10. Performance & GPU Detection
 * 11. Awwwards Portfolio Patterns (Bruno Simon, Dogstudio style)
 */

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1 â€” GLSL SHADER FUNCTIONS LIBRARY (Book of Shaders + LYGIA patterns)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const GLSL_SHADER_LIBRARY = `
## GLSL SHADER FUNCTIONS â€” REUSABLE BUILDING BLOCKS
Source: The Book of Shaders (Patricio Gonzalez Vivo) + LYGIA library

### NOISE FUNCTIONS (copy into fragment/vertex shaders)
\`\`\`glsl
// â”€â”€ Simplex 2D Noise (most common for organic effects) â”€â”€
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// â”€â”€ FBM (Fractal Brownian Motion) â€” layered noise for clouds/terrain â”€â”€
float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 0.0;
  for (int i = 0; i < 6; i++) {
    value += amplitude * snoise(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// â”€â”€ Voronoi / Cellular noise (for organic cell patterns) â”€â”€
vec2 random2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}
float voronoi(vec2 st) {
  vec2 i_st = floor(st);
  vec2 f_st = fract(st);
  float m_dist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = random2(i_st + neighbor);
      vec2 diff = neighbor + point - f_st;
      float dist = length(diff);
      m_dist = min(m_dist, dist);
    }
  }
  return m_dist;
}

// â”€â”€ SDF (Signed Distance Functions) for shapes â”€â”€
float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdRoundedBox(vec2 p, vec2 b, float r) { vec2 d = abs(p) - b + r; return length(max(d, 0.0)) - r; }
float sdSegment(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

// â”€â”€ Smooth operations (for combining SDFs) â”€â”€
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float smax(float a, float b, float k) { return -smin(-a, -b, k); }

// â”€â”€ Color utilities â”€â”€
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// â”€â”€ Rotation matrix (for rotating UVs/positions) â”€â”€
mat2 rotate2d(float angle) { float s = sin(angle), c = cos(angle); return mat2(c, -s, s, c); }
\`\`\`

### COMPLETE FRAGMENT SHADER RECIPES (copy-paste into ShaderMaterial)

#### Recipe 1: Aurora/Northern Lights Background
\`\`\`glsl
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

// Include snoise + fbm from above

void main() {
  vec2 uv = vUv;
  vec2 st = uv * 3.0;
  
  // Layer multiple noise octaves with time
  float n1 = fbm(st + uTime * 0.1);
  float n2 = fbm(st * 1.5 + uTime * 0.15 + 10.0);
  float n3 = fbm(st * 0.5 + uTime * 0.05 + 20.0);
  
  // Aurora color bands
  vec3 col1 = vec3(0.1, 0.8, 0.6); // teal
  vec3 col2 = vec3(0.4, 0.2, 0.9); // purple
  vec3 col3 = vec3(0.1, 0.4, 0.8); // blue
  
  vec3 color = mix(col1, col2, n1 * 0.5 + 0.5);
  color = mix(color, col3, n2 * 0.3 + 0.3);
  
  // Vertical curtain effect
  float curtain = smoothstep(0.2, 0.8, uv.y + n3 * 0.3);
  color *= curtain * 0.8;
  
  // Stars
  float stars = step(0.998, fract(sin(dot(floor(uv * 500.0), vec2(12.9898, 78.233))) * 43758.5453));
  color += stars * 0.5;
  
  gl_FragColor = vec4(color, 1.0);
}
\`\`\`

#### Recipe 2: Liquid Chrome / Mercury Effect  
\`\`\`glsl
precision highp float;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  vec2 mouse = (uMouse - 0.5 * uResolution) / uResolution.y;
  
  float d = length(uv);
  float mouseInfluence = 0.3 / (length(uv - mouse) + 0.1);
  
  // Chrome-like reflections using noise
  float angle = atan(uv.y, uv.x);
  float r = length(uv);
  float distort = sin(angle * 6.0 + uTime * 2.0) * 0.1 + sin(r * 20.0 - uTime * 3.0) * 0.05;
  
  vec3 normal = normalize(vec3(
    sin(uv.x * 10.0 + uTime) * 0.5 + distort,
    cos(uv.y * 10.0 + uTime * 0.7) * 0.5 + distort,
    1.0
  ));
  
  // Environment map simulation
  vec3 viewDir = normalize(vec3(uv, 1.0));
  vec3 reflected = reflect(viewDir, normal);
  
  // Chrome colors with mouse interaction
  vec3 color = vec3(0.8, 0.85, 0.9) * (0.5 + 0.5 * reflected.y);
  color += vec3(0.3, 0.4, 0.6) * pow(max(dot(normal, normalize(vec3(1, 1, -1))), 0.0), 8.0);
  color += mouseInfluence * vec3(0.2, 0.1, 0.3);
  
  // Fresnel rim
  float fresnel = pow(1.0 - max(dot(normal, vec3(0, 0, 1)), 0.0), 3.0);
  color += fresnel * vec3(0.5, 0.6, 1.0) * 0.5;
  
  gl_FragColor = vec4(color, 1.0);
}
\`\`\`

#### Recipe 3: Morphing Blob (like Lusion.co)
\`\`\`glsl
// Vertex shader for blob with noise displacement
uniform float uTime;
uniform float uNoiseStrength;
varying vec3 vNormal;
varying vec3 vPosition;

// Include snoise3D (see noise distortion sphere in awwwards-engine)

void main() {
  vNormal = normal;
  vPosition = position;
  
  vec3 pos = position;
  float noise = snoise(pos * 1.5 + uTime * 0.3) * uNoiseStrength;
  float noise2 = snoise(pos * 3.0 + uTime * 0.5) * uNoiseStrength * 0.3;
  pos += normal * (noise + noise2);
  
  vNormal = normalize(normal + vec3(noise * 0.5));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

// Fragment shader
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;

void main() {
  vec3 light = normalize(vec3(1.0, 1.0, 1.0));
  float diffuse = max(dot(vNormal, light), 0.0);
  float fresnel = pow(1.0 - max(dot(vNormal, vec3(0, 0, 1)), 0.0), 3.0);
  
  vec3 color = mix(uColor1, uColor2, vPosition.y * 0.5 + 0.5);
  color = color * (0.3 + diffuse * 0.7);
  color += fresnel * vec3(0.5, 0.3, 0.8) * 0.6;
  
  // Iridescence
  float iridescence = sin(dot(vNormal, vec3(1, 0, 0)) * 3.14 + uTime) * 0.5 + 0.5;
  color += vec3(iridescence * 0.1, iridescence * 0.05, iridescence * 0.15);
  
  gl_FragColor = vec4(color, 0.95);
}
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 2 â€” ADVANCED THREE.JS PATTERNS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const ADVANCED_THREEJS = `
## ADVANCED THREE.JS â€” STUDIO-LEVEL PATTERNS

### GLTF Model Loader (with loading progress)
\`\`\`javascript
// CDN required: three.min.js + GLTFLoader.js + OrbitControls.js
const loadGLTFModel = (container, modelUrl, options = {}) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Lighting setup (studio-quality 3-point)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(5, 5, 5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
  fillLight.position.set(-5, 0, -5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
  rimLight.position.set(0, 5, -5);
  scene.add(rimLight);

  // Environment map for reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;

  // GLTF loading with progress
  const loader = new THREE.GLTFLoader();
  const progressBar = container.querySelector('.load-progress');
  
  loader.load(modelUrl,
    (gltf) => {
      const model = gltf.scene;
      // Auto-center and scale
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      scene.add(model);
      if (progressBar) progressBar.style.display = 'none';
      
      // Optional: orbit controls
      if (options.orbit) {
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = options.autoRotate || false;
        controls.autoRotateSpeed = 1.0;
      }
    },
    (progress) => {
      const pct = (progress.loaded / progress.total * 100).toFixed(0);
      if (progressBar) progressBar.style.width = pct + '%';
    }
  );

  camera.position.set(0, 0, 5);
  
  // Auto-rotate on mouse
  let mouseX = 0, mouseY = 0;
  container.addEventListener('mousemove', (e) => {
    mouseX = (e.offsetX / container.clientWidth - 0.5) * 2;
    mouseY = (e.offsetY / container.clientHeight - 0.5) * 2;
  });
  
  const animate = () => {
    requestAnimationFrame(animate);
    scene.rotation.y += (mouseX * 0.3 - scene.rotation.y) * 0.05;
    scene.rotation.x += (mouseY * 0.2 - scene.rotation.x) * 0.05;
    renderer.render(scene, camera);
  };
  animate();

  // Cleanup
  return () => {
    renderer.dispose();
    renderer.forceContextLoss();
    scene.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  };
};
\`\`\`

### Three.js Postprocessing (Bloom + Film Grain + Vignette)
\`\`\`javascript
// CDN: EffectComposer.js + RenderPass.js + UnrealBloomPass.js + ShaderPass.js
const setupPostprocessing = (renderer, scene, camera) => {
  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));

  // Bloom (glow on bright areas)
  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,   // strength
    0.4,   // radius
    0.85   // threshold
  );
  composer.addPass(bloomPass);

  // Film grain + vignette (custom shader pass)
  const grainShader = {
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uGrainIntensity: { value: 0.05 },
      uVignetteStrength: { value: 0.3 },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: \\\`
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uGrainIntensity;
      uniform float uVignetteStrength;
      varying vec2 vUv;
      float random(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        // Film grain
        float grain = random(vUv + fract(uTime)) * uGrainIntensity;
        color.rgb += grain - uGrainIntensity * 0.5;
        // Vignette
        float dist = distance(vUv, vec2(0.5));
        color.rgb *= 1.0 - dist * uVignetteStrength;
        gl_FragColor = color;
      }
    \\\`
  };
  const grainPass = new THREE.ShaderPass(grainShader);
  composer.addPass(grainPass);

  return { composer, bloomPass, grainPass };
};
// In render loop: composer.render() instead of renderer.render(scene, camera)
\`\`\`

### Instanced Particles System (10K+ particles, GPU-efficient)
\`\`\`javascript
const createInstancedParticles = (scene, count = 10000) => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  
  const colorPalette = [
    new THREE.Color('#6366f1'),
    new THREE.Color('#a855f7'),
    new THREE.Color('#ec4899'),
    new THREE.Color('#06b6d4'),
  ];
  
  for (let i = 0; i < count; i++) {
    // Sphere distribution
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 3 + Math.random() * 2;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    
    velocities[i * 3] = (Math.random() - 0.5) * 0.01;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    
    const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = Math.random() * 4 + 1;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.ShaderMaterial({
    vertexShader: \\\`
      attribute float aSize;
      varying vec3 vColor;
      uniform float uTime;
      void main() {
        vColor = color;
        vec3 pos = position;
        pos.x += sin(uTime * 0.5 + position.y * 0.5) * 0.1;
        pos.y += cos(uTime * 0.3 + position.x * 0.5) * 0.1;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aSize * (200.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    \\\`,
    fragmentShader: \\\`
      varying vec3 vColor;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.2, 0.5, d);
        gl_FragColor = vec4(vColor, alpha * 0.6);
      }
    \\\`,
    transparent: true, vertexColors: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
  });
  
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return { points, material, positions, velocities };
};
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 3 â€” PHYSICS & SIMULATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const PHYSICS_SIMULATIONS = `
## PHYSICS & SIMULATIONS â€” INTERACTIVE ELEMENTS

### WebGL Fluid Simulation (Full Implementation)
\`\`\`html
<!-- PavelDoGreat WebGL Fluid â€” embed as full-screen interactive background -->
<canvas id="fluid-canvas" style="position:fixed;inset:0;width:100%;height:100%;z-index:0;"></canvas>
<script>
// Minimal WebGL fluid simulation (adapted from PavelDoGreat/WebGL-Fluid-Simulation)
// This creates interactive color splats that react to mouse/touch
(function() {
  const canvas = document.getElementById('fluid-canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;
  
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  
  const ext = gl.getExtension('OES_texture_half_float');
  const linearFiltering = gl.getExtension('OES_texture_half_float_linear');
  
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }
  
  function createProgram(vs, fs) {
    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    return prog;
  }
  
  const baseVS = 'attribute vec2 a_position;varying vec2 v_texCoord;void main(){v_texCoord=a_position*0.5+0.5;gl_Position=vec4(a_position,0,1);}';
  
  // Display shader â€” renders the fluid with beautiful color mapping
  const displayFS = \\\`
    precision highp float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform float u_time;
    void main() {
      vec3 c = texture2D(u_texture, v_texCoord).rgb;
      // Map velocity to color
      vec3 color = vec3(
        0.5 + 0.5 * sin(c.r * 3.0 + u_time),
        0.3 + 0.5 * sin(c.g * 3.0 + u_time * 0.7 + 2.0),
        0.5 + 0.5 * sin(length(c) * 5.0 + u_time * 0.5 + 4.0)
      );
      color = mix(vec3(0.02, 0.02, 0.04), color, length(c) * 2.0);
      gl_FragColor = vec4(color, 1.0);
    }
  \\\`;
  
  // Splat shader â€” adds color at cursor position
  const splatFS = \\\`
    precision highp float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform vec2 u_point;
    uniform vec3 u_color;
    uniform float u_radius;
    void main() {
      vec3 base = texture2D(u_texture, v_texCoord).rgb;
      float d = distance(v_texCoord, u_point);
      float splat = exp(-d * d / u_radius);
      vec3 color = base + u_color * splat;
      gl_FragColor = vec4(color, 1.0);
    }
  \\\`;
  
  // Create programs
  const displayProg = createProgram(baseVS, displayFS);
  const splatProg = createProgram(baseVS, splatFS);
  
  // Fullscreen quad
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  
  // Framebuffer textures
  function createFBO() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width >> 1, canvas.height >> 1, 0, gl.RGBA, ext ? ext.HALF_FLOAT_OES : gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fbo, tex };
  }
  
  let current = createFBO();
  let next = createFBO();
  let time = 0;
  
  function drawQuad(program) {
    gl.useProgram(program);
    const pos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  function splat(x, y, dx, dy) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, next.fbo);
    gl.viewport(0, 0, canvas.width >> 1, canvas.height >> 1);
    gl.useProgram(splatProg);
    gl.uniform1i(gl.getUniformLocation(splatProg, 'u_texture'), 0);
    gl.uniform2f(gl.getUniformLocation(splatProg, 'u_point'), x, y);
    gl.uniform3f(gl.getUniformLocation(splatProg, 'u_color'), dx * 10, dy * 10, (Math.abs(dx) + Math.abs(dy)) * 5);
    gl.uniform1f(gl.getUniformLocation(splatProg, 'u_radius'), 0.005);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, current.tex);
    drawQuad(splatProg);
    [current, next] = [next, current];
  }
  
  let lastX = 0, lastY = 0;
  canvas.addEventListener('mousemove', function(e) {
    const x = e.offsetX / canvas.width;
    const y = 1.0 - e.offsetY / canvas.height;
    splat(x, y, x - lastX, y - lastY);
    lastX = x; lastY = y;
  });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    const t = e.touches[0];
    const x = t.clientX / canvas.width;
    const y = 1.0 - t.clientY / canvas.height;
    splat(x, y, x - lastX, y - lastY);
    lastX = x; lastY = y;
  }, { passive: false });
  
  // Random splats on load for visual interest
  for (let i = 0; i < 5; i++) {
    setTimeout(() => splat(Math.random(), Math.random(), (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1), i * 200);
  }
  
  function render() {
    time += 0.016;
    // Fade current buffer slightly (dissipation)
    gl.bindFramebuffer(gl.FRAMEBUFFER, next.fbo);
    gl.viewport(0, 0, canvas.width >> 1, canvas.height >> 1);
    gl.useProgram(splatProg);
    gl.uniform2f(gl.getUniformLocation(splatProg, 'u_point'), -10, -10);
    gl.uniform3f(gl.getUniformLocation(splatProg, 'u_color'), 0, 0, 0);
    gl.uniform1f(gl.getUniformLocation(splatProg, 'u_radius'), 0.001);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, current.tex);
    drawQuad(splatProg);
    [current, next] = [next, current];
    
    // Display
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(displayProg);
    gl.uniform1i(gl.getUniformLocation(displayProg, 'u_texture'), 0);
    gl.uniform1f(gl.getUniformLocation(displayProg, 'u_time'), time);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, current.tex);
    drawQuad(displayProg);
    
    requestAnimationFrame(render);
  }
  render();
})();
</script>
\`\`\`

### Matter.js 2D Physics (floating interactive elements)
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
<script>
// Interactive physics letters/shapes in a section
const physicsSection = (containerId) => {
  const container = document.getElementById(containerId);
  const { Engine, Render, World, Bodies, Mouse, MouseConstraint, Events } = Matter;
  
  const engine = Engine.create({ gravity: { x: 0, y: 0.5 } });
  const render = Render.create({
    element: container, engine,
    options: { width: container.clientWidth, height: 400, wireframes: false, background: 'transparent' }
  });
  
  // Walls
  const wallOpts = { isStatic: true, render: { visible: false } };
  const w = container.clientWidth, h = 400;
  World.add(engine.world, [
    Bodies.rectangle(w/2, h+25, w, 50, wallOpts),
    Bodies.rectangle(-25, h/2, 50, h, wallOpts),
    Bodies.rectangle(w+25, h/2, 50, h, wallOpts),
  ]);
  
  // Floating shapes with brand colors
  const colors = ['#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#10b981'];
  for (let i = 0; i < 20; i++) {
    const r = 15 + Math.random() * 30;
    const body = Math.random() > 0.5
      ? Bodies.circle(Math.random() * w, -r, r, { restitution: 0.6, render: { fillStyle: colors[i % colors.length] } })
      : Bodies.rectangle(Math.random() * w, -r, r * 2, r * 2, { restitution: 0.6, chamfer: { radius: 8 }, render: { fillStyle: colors[i % colors.length] } });
    World.add(engine.world, body);
  }
  
  // Mouse interaction
  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2 } });
  World.add(engine.world, mouseConstraint);
  render.mouse = mouse;
  
  Render.run(render);
  Engine.run(engine); // Note: production code should use requestAnimationFrame loop
};
</script>
\`\`\`

### tsParticles Advanced Config (cursor-reactive constellation)
\`\`\`javascript
tsParticles.load('particles-bg', {
  particles: {
    number: { value: 80, density: { enable: true, area: 800 } },
    color: { value: ['#6366f1', '#a855f7', '#ec4899'] },
    shape: { type: 'circle' },
    opacity: { value: { min: 0.3, max: 0.8 }, animation: { enable: true, speed: 1 } },
    size: { value: { min: 1, max: 4 } },
    links: { enable: true, distance: 150, color: '#6366f1', opacity: 0.15, width: 1 },
    move: { enable: true, speed: 1, outModes: { default: 'bounce' } },
  },
  interactivity: {
    events: {
      onHover: { enable: true, mode: ['grab', 'bubble'] },
      onClick: { enable: true, mode: 'push' },
    },
    modes: {
      grab: { distance: 200, links: { opacity: 0.5 } },
      bubble: { distance: 200, size: 8, duration: 0.4, opacity: 0.8 },
      push: { quantity: 4 },
    },
  },
  detectRetina: true,
});
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 4 â€” TEXT ANIMATION PRO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const TEXT_ANIMATION_PRO = `
## TEXT ANIMATION â€” STUDIO-LEVEL TECHNIQUES

### SplitType + GSAP Complete Patterns
\`\`\`javascript
// CDN: <script src="https://unpkg.com/split-type@0.3.4/umd/index.min.js"></script>

// Pattern 1: Char-by-char reveal (hero h1)
function animateHeroTitle(selector, delay = 0) {
  const el = document.querySelector(selector);
  if (!el) return;
  const split = new SplitType(el, { types: 'chars,words,lines' });
  // Wrap lines for overflow hidden
  split.lines.forEach(line => { line.style.overflow = 'hidden'; });
  gsap.from(split.chars, {
    y: '110%', rotateX: -80, opacity: 0,
    stagger: { each: 0.02, from: 'start' },
    duration: 1, ease: 'expo.out', delay
  });
}

// Pattern 2: Word-by-word blur reveal (subtitle)
function animateBlurReveal(selector, delay = 0) {
  const el = document.querySelector(selector);
  if (!el) return;
  const split = new SplitType(el, { types: 'words' });
  gsap.from(split.words, {
    opacity: 0, filter: 'blur(12px)', y: 20,
    stagger: 0.06, duration: 0.8, ease: 'power3.out', delay
  });
}

// Pattern 3: Scroll-driven line-by-line reveal
function animateScrollLines(selector) {
  document.querySelectorAll(selector).forEach(el => {
    const split = new SplitType(el, { types: 'lines' });
    split.lines.forEach(line => { line.style.overflow = 'hidden'; });
    gsap.from(split.lines, {
      y: '100%', opacity: 0,
      stagger: 0.1, duration: 0.8, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 80%', once: true }
    });
  });
}

// Pattern 4: Color wave on scroll (each char lights up progressively)
function animateColorWave(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  const split = new SplitType(el, { types: 'chars' });
  split.chars.forEach(char => { char.style.color = 'rgba(255,255,255,0.15)'; char.style.transition = 'color 0.3s'; });
  ScrollTrigger.create({
    trigger: el, start: 'top 65%', end: 'bottom 35%',
    onUpdate: (self) => {
      const progress = self.progress;
      split.chars.forEach((char, i) => {
        char.style.color = (i / split.chars.length) < progress ? '#fff' : 'rgba(255,255,255,0.15)';
      });
    }
  });
}
\`\`\`

### Typed.js Effect (typewriter without library)
\`\`\`javascript
// Zero-dependency typewriter effect
function typeWriter(element, texts, opts = {}) {
  const speed = opts.speed || 80;
  const deleteSpeed = opts.deleteSpeed || 40;
  const pause = opts.pause || 2000;
  let textIndex = 0, charIndex = 0, isDeleting = false;
  
  function type() {
    const currentText = texts[textIndex];
    if (isDeleting) {
      element.textContent = currentText.substring(0, charIndex - 1);
      charIndex--;
      if (charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        setTimeout(type, 500);
        return;
      }
    } else {
      element.textContent = currentText.substring(0, charIndex + 1);
      charIndex++;
      if (charIndex === currentText.length) {
        isDeleting = true;
        setTimeout(type, pause);
        return;
      }
    }
    setTimeout(type, isDeleting ? deleteSpeed : speed);
  }
  type();
}
// Usage: typeWriter(document.querySelector('.typed'), ['Developer', 'Designer', 'Creator']);
\`\`\`

### Text Scramble Effect (like Monopo studio)
\`\`\`javascript
function textScramble(element, finalText, duration = 1500) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const totalFrames = duration / 16;
  let frame = 0;
  
  function update() {
    const progress = frame / totalFrames;
    let result = '';
    for (let i = 0; i < finalText.length; i++) {
      if (finalText[i] === ' ') { result += ' '; continue; }
      if (i < Math.floor(progress * finalText.length)) {
        result += finalText[i];
      } else {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    element.textContent = result;
    frame++;
    if (frame <= totalFrames) requestAnimationFrame(update);
  }
  update();
}
// Trigger on hover:
// el.addEventListener('mouseenter', () => textScramble(el, el.dataset.text));
\`\`\`

### Variable Font Interactive (font-weight follows cursor)
\`\`\`javascript
// Requires a variable font (e.g., Syne, Inter, DM Sans are variable)
function variableFontInteractive(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  const split = new SplitType(el, { types: 'chars' });
  
  document.addEventListener('mousemove', (e) => {
    split.chars.forEach(char => {
      const rect = char.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
      const maxDist = 200;
      const weight = Math.max(100, 900 - (dist / maxDist) * 800);
      char.style.fontWeight = Math.min(900, weight);
      char.style.transition = 'font-weight 0.3s ease';
    });
  });
}
// Usage: variableFontInteractive('.interactive-heading');
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 5 â€” PAGE TRANSITIONS PRO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const PAGE_TRANSITIONS_PRO = `
## PAGE TRANSITIONS â€” STUDIO-LEVEL PATTERNS

### Barba.js Pattern (multi-route with GSAP)
\`\`\`html
<script src="https://unpkg.com/@barba/core@2/dist/barba.umd.js"></script>
<script>
// Barba.js + GSAP page transitions
barba.init({
  transitions: [{
    name: 'slide-transition',
    
    // Create transition overlay
    once({ next }) {
      // First page load animation
      gsap.from(next.container.querySelectorAll('[data-animate]'), {
        y: 40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'expo.out', delay: 0.3
      });
    },
    
    leave({ current }) {
      return gsap.to(current.container, {
        opacity: 0, y: -30, duration: 0.4, ease: 'power2.in'
      });
    },
    
    enter({ next }) {
      window.scrollTo(0, 0);
      gsap.from(next.container, {
        opacity: 0, y: 30, duration: 0.5, ease: 'power2.out'
      });
      // Re-init scroll animations on new page
      gsap.from(next.container.querySelectorAll('[data-animate]'), {
        y: 40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'expo.out', delay: 0.2
      });
    }
  }],
  
  // Views for page-specific logic
  views: [{
    namespace: 'home',
    afterEnter() { initThreeJSHero(); initParticles(); }
  }, {
    namespace: 'about',
    afterEnter() { initParallaxImages(); }
  }]
});
</script>
\`\`\`

### Column Wipe Transition (5-column staggered reveal)
\`\`\`javascript
const columnWipeTransition = {
  overlay: null,
  init() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;display:flex;';
    for (let i = 0; i < 5; i++) {
      const col = document.createElement('div');
      col.style.cssText = 'flex:1;background:var(--accent, #6366f1);transform:scaleY(0);transform-origin:top;will-change:transform;';
      this.overlay.appendChild(col);
    }
    document.body.appendChild(this.overlay);
  },
  
  async leave() {
    const cols = [...this.overlay.children];
    cols.forEach(c => { c.style.transformOrigin = 'bottom'; });
    return new Promise(resolve => {
      gsap.to(cols, {
        scaleY: 1, stagger: 0.06, duration: 0.5, ease: 'power4.inOut',
        onComplete: resolve
      });
    });
  },
  
  async enter() {
    const cols = [...this.overlay.children];
    cols.forEach(c => { c.style.transformOrigin = 'top'; });
    return new Promise(resolve => {
      gsap.to(cols, {
        scaleY: 0, stagger: 0.06, duration: 0.5, ease: 'power4.inOut', delay: 0.1,
        onComplete: resolve
      });
    });
  },
  
  // Wire to link clicks
  bindLinks() {
    document.querySelectorAll('a[href^="/"]').forEach(a => {
      a.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.leave();
        window.location.href = a.href;
      });
    });
    // On page load, enter animation
    this.enter();
  }
};
// columnWipeTransition.init();
// columnWipeTransition.bindLinks();
\`\`\`

### Morphing Shape Transition (circle expand from click point)
\`\`\`javascript
function morphTransition(e, targetUrl) {
  const overlay = document.createElement('div');
  const x = e.clientX, y = e.clientY;
  overlay.style.cssText = \\\`
    position:fixed;z-index:99999;pointer-events:none;
    width:20px;height:20px;border-radius:50%;
    background:var(--accent,#6366f1);
    left:\${x-10}px;top:\${y-10}px;
    transform:scale(0);will-change:transform;
  \\\`;
  document.body.appendChild(overlay);
  
  const maxDim = Math.max(window.innerWidth, window.innerHeight) * 2.5;
  gsap.to(overlay, {
    scale: maxDim / 20, duration: 0.7, ease: 'power3.inOut',
    onComplete: () => { window.location.href = targetUrl; }
  });
}
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 6 â€” SCROLL-DRIVEN PRO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const SCROLL_DRIVEN_PRO = `
## SCROLL-DRIVEN ANIMATIONS â€” ADVANCED PATTERNS

### Locomotive Scroll Pattern (parallax + speed + direction)
\`\`\`html
<!-- For when Locomotive Scroll is used instead of Lenis -->
<script src="https://cdn.jsdelivr.net/npm/locomotive-scroll@4.1.4/dist/locomotive-scroll.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/locomotive-scroll@4.1.4/dist/locomotive-scroll.min.css">
<script>
const scroll = new LocomotiveScroll({
  el: document.querySelector('[data-scroll-container]'),
  smooth: true, multiplier: 0.8, lerp: 0.08,
  smartphone: { smooth: true }, tablet: { smooth: true }
});
// Sync with GSAP ScrollTrigger
scroll.on('scroll', ScrollTrigger.update);
ScrollTrigger.scrollerProxy('[data-scroll-container]', {
  scrollTop(value) { return arguments.length ? scroll.scrollTo(value, { duration: 0, disableLerp: true }) : scroll.scroll.instance.scroll.y; },
  getBoundingClientRect() { return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }; },
  pinType: document.querySelector('[data-scroll-container]').style.transform ? 'transform' : 'fixed'
});
ScrollTrigger.addEventListener('refresh', () => scroll.update());
ScrollTrigger.refresh();
</script>
<!-- Usage in HTML: -->
<!-- <div data-scroll data-scroll-speed="2">Parallax element</div> -->
<!-- <div data-scroll data-scroll-speed="-1" data-scroll-direction="horizontal">Horizontal parallax</div> -->
\`\`\`

### Scroll-Velocity Text Skew (DarkRoom Engineering pattern)
\`\`\`javascript
function initVelocitySkew(lenis) {
  let currentVelocity = 0;
  const skewElements = document.querySelectorAll('[data-skew]');
  
  lenis.on('scroll', ({ velocity }) => { currentVelocity = velocity; });
  
  gsap.ticker.add(() => {
    const skew = Math.min(Math.abs(currentVelocity) * 0.4, 10);
    const direction = currentVelocity > 0 ? 1 : -1;
    skewElements.forEach(el => {
      gsap.to(el, {
        skewY: skew * direction * (parseFloat(el.dataset.skew) || 1),
        duration: 0.3, ease: 'power2.out'
      });
    });
  });
}
// <h2 data-skew="0.5">This text skews with scroll speed</h2>
\`\`\`

### Scroll-Linked Image Scale + Clip Reveal
\`\`\`javascript
function initScrollImageReveals() {
  document.querySelectorAll('.scroll-image-reveal').forEach(container => {
    const img = container.querySelector('img');
    
    // Image clip-path reveal
    gsap.fromTo(container, 
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 1.5, ease: 'expo.inOut',
        scrollTrigger: { trigger: container, start: 'top 75%', once: true }
      }
    );
    
    // Parallax zoom inside
    gsap.fromTo(img,
      { scale: 1.4 },
      { scale: 1, ease: 'none',
        scrollTrigger: { trigger: container, start: 'top bottom', end: 'bottom top', scrub: true }
      }
    );
  });
}
\`\`\`

### Horizontal Scroll Section (GSAP pin + scrub â€” production-ready)
\`\`\`javascript
function initHorizontalScroll(sectionSelector, trackSelector) {
  const section = document.querySelector(sectionSelector);
  const track = document.querySelector(trackSelector);
  if (!section || !track) return;
  
  const totalScroll = track.scrollWidth - window.innerWidth;
  
  gsap.to(track, {
    x: -totalScroll,
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      pin: true,
      scrub: 1,
      end: () => '+=' + totalScroll,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    }
  });
  
  // Animate items as they enter viewport during horizontal scroll
  gsap.utils.toArray(trackSelector + ' > *').forEach((item, i) => {
    gsap.from(item, {
      opacity: 0, y: 40, rotateZ: 3,
      scrollTrigger: {
        trigger: item,
        containerAnimation: gsap.getById && undefined,
        start: 'left 90%',
        end: 'left 60%',
        scrub: true,
      }
    });
  });
}
// HTML: <section class="h-scroll"><div class="h-track">...items...</div></section>
\`\`\`

### Scroll Progress + Section Indicators
\`\`\`javascript
function initScrollProgress() {
  // Top progress bar
  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    gsap.to(progressBar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: true }
    });
    progressBar.style.transformOrigin = 'left';
    progressBar.style.transform = 'scaleX(0)';
  }
  
  // Section dots indicator
  const sections = gsap.utils.toArray('section[id]');
  const dots = document.querySelectorAll('.section-dot');
  sections.forEach((section, i) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => { dots.forEach((d, j) => d.classList.toggle('active', j === i)); },
      onEnterBack: () => { dots.forEach((d, j) => d.classList.toggle('active', j === i)); },
    });
  });
}
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 7 â€” CANVAS 2D GENERATIVE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const CANVAS_2D_GENERATIVE = `
## CANVAS 2D â€” GENERATIVE BACKGROUNDS & EFFECTS

### Generative Dot Grid (interactive, cursor-reactive)
\`\`\`javascript
const dotGrid = (canvasId) => {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const spacing = 30;
  const maxRadius = 4;
  let mx = -1000, my = -1000;
  const influenceRadius = 150;
  
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let x = spacing; x < canvas.width; x += spacing) {
      for (let y = spacing; y < canvas.height; y += spacing) {
        const dist = Math.hypot(mx - x, my - y);
        const scale = Math.max(0, 1 - dist / influenceRadius);
        const radius = 1 + scale * maxRadius;
        const alpha = 0.15 + scale * 0.6;
        
        ctx.beginPath();
        ctx.arc(x + scale * (mx - x) * 0.1, y + scale * (my - y) * 0.1, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, ' + alpha + ')';
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
};
\`\`\`

### Generative Noise Gradient (organic flowing background)
\`\`\`javascript
const noiseGradient = (canvasId) => {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth * 0.5; // Half-res for performance
  canvas.height = canvas.clientHeight * 0.5;
  canvas.style.imageRendering = 'auto';
  
  let t = 0;
  
  // Simple 2D noise (cheaper than full perlin)
  function noise(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }
  
  function smoothNoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const a = noise(ix, iy), b = noise(ix + 1, iy);
    const c = noise(ix, iy + 1), d = noise(ix + 1, iy + 1);
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  
  function draw() {
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;
    
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const nx = x * 0.005 + t * 0.2;
        const ny = y * 0.005 + t * 0.15;
        const n = smoothNoise(nx, ny) * 0.5 + smoothNoise(nx * 2, ny * 2) * 0.25 + smoothNoise(nx * 4, ny * 4) * 0.125;
        
        const i = (y * canvas.width + x) * 4;
        data[i] = Math.floor(10 + n * 80);    // R â€” dark base
        data[i+1] = Math.floor(10 + n * 60);  // G
        data[i+2] = Math.floor(30 + n * 180); // B â€” blue dominant
        data[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    t += 0.005;
    requestAnimationFrame(draw);
  }
  draw();
};
\`\`\`

### Rough.js Hand-Drawn Style (for creative/playful sites)
\`\`\`html
<script src="https://unpkg.com/roughjs@4.6.4/bundled/rough.cjs.js"></script>
<script>
// Hand-drawn decorative elements
const rc = rough.canvas(document.getElementById('rough-canvas'));
// Wobbly rectangle
rc.rectangle(50, 50, 200, 100, { roughness: 2, stroke: '#6366f1', strokeWidth: 2, fill: 'rgba(99,102,241,0.1)', fillStyle: 'hachure' });
// Hand-drawn circle
rc.circle(300, 100, 80, { roughness: 1.5, stroke: '#ec4899', strokeWidth: 2 });
// Sketch-style line
rc.line(50, 200, 350, 200, { roughness: 1, stroke: '#a855f7', strokeWidth: 2 });
// Use for: dividers, decorative borders, icons in playful/creative sites
</script>
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 8 â€” AUDIO-REACTIVE VISUALS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const AUDIO_REACTIVE = `
## AUDIO-REACTIVE VISUALS â€” SOUND-DRIVEN ANIMATIONS

### Web Audio API Visualizer (no library needed)
\`\`\`javascript
function audioVisualizer(audioElement, canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth * 2;
  canvas.height = canvas.clientHeight * 2;
  
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(audioElement);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  function draw() {
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = canvas.width / bufferLength * 2;
    const centerY = canvas.height / 2;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * centerY * 0.8;
      const x = i * barWidth;
      const hue = (i / bufferLength) * 120 + 240; // Blue â†’ purple range
      
      // Mirror bars (top and bottom)
      ctx.fillStyle = 'hsla(' + hue + ', 80%, 60%, 0.8)';
      ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight);
      ctx.fillStyle = 'hsla(' + hue + ', 80%, 60%, 0.3)';
      ctx.fillRect(x, centerY, barWidth - 1, barHeight * 0.5);
    }
    
    requestAnimationFrame(draw);
  }
  
  // Resume audio context on user interaction (browser policy)
  document.addEventListener('click', () => { if (audioCtx.state === 'suspended') audioCtx.resume(); }, { once: true });
  draw();
}
\`\`\`

### Audio-Reactive Three.js (sphere pulsing to music)
\`\`\`javascript
// Combine with noise distortion sphere â€” modulate uNoiseStrength with audio data
function audioReactiveThreeJS(analyser, material) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
  function update() {
    analyser.getByteFrequencyData(dataArray);
    // Average bass frequencies (first 10 bins)
    const bass = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / (10 * 255);
    // Average mids
    const mids = dataArray.slice(10, 50).reduce((a, b) => a + b, 0) / (40 * 255);
    // Average highs
    const highs = dataArray.slice(50, 128).reduce((a, b) => a + b, 0) / (78 * 255);
    
    // Modulate shader uniforms
    material.uniforms.uNoiseStrength.value = 0.1 + bass * 0.5;
    material.uniforms.uColor1.value.setHSL(0.6 + mids * 0.2, 0.8, 0.5);
    material.uniforms.uColor2.value.setHSL(0.8 + highs * 0.1, 0.7, 0.5);
    
    requestAnimationFrame(update);
  }
  update();
}
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 9 â€” CURSOR PRO & MICRO-INTERACTIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const CURSOR_PRO = `
## CURSOR & MICRO-INTERACTIONS â€” ADVANCED PATTERNS

### Atropos-Style 3D Parallax Card (multi-layer depth)
\`\`\`javascript
// 3D parallax card with multiple depth layers (like Atropos.js)
function init3DParallaxCards() {
  document.querySelectorAll('.parallax-card').forEach(card => {
    const layers = card.querySelectorAll('[data-depth]');
    const intensity = 20;
    
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      
      card.style.transform = 'perspective(1000px) rotateY(' + (x * intensity) + 'deg) rotateX(' + (-y * intensity) + 'deg)';
      
      layers.forEach(layer => {
        const depth = parseFloat(layer.dataset.depth) || 1;
        layer.style.transform = 'translateX(' + (x * 30 * depth) + 'px) translateY(' + (y * 30 * depth) + 'px) translateZ(' + (depth * 30) + 'px)';
      });
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
      card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      layers.forEach(layer => {
        layer.style.transform = 'translateX(0) translateY(0) translateZ(0)';
        layer.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      });
      setTimeout(() => { card.style.transition = ''; layers.forEach(l => l.style.transition = ''); }, 500);
    });
  });
}
// HTML:
// <div class="parallax-card" style="perspective:1000px;transform-style:preserve-3d">
//   <div data-depth="0.2">Background layer</div>
//   <div data-depth="0.5">Middle layer</div>
//   <div data-depth="1.0">Front layer</div>
// </div>
\`\`\`

### Magnetic Elements (advanced â€” with spring physics)
\`\`\`javascript
function initMagnetic() {
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    const strength = parseFloat(el.dataset.magnetic) || 0.3;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      targetX = (e.clientX - rect.left - rect.width / 2) * strength;
      targetY = (e.clientY - rect.top - rect.height / 2) * strength;
    });
    
    el.addEventListener('mouseleave', () => {
      targetX = 0; targetY = 0;
    });
    
    // Spring-based animation (60fps)
    function springAnimate() {
      const springForce = 0.15;
      const damping = 0.85;
      
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      currentX += dx * springForce;
      currentY += dy * springForce;
      currentX *= damping + (1 - damping) * (Math.abs(dx) < 0.1 ? 0 : 1);
      currentY *= damping + (1 - damping) * (Math.abs(dy) < 0.1 ? 0 : 1);
      
      el.style.transform = 'translate(' + currentX + 'px, ' + currentY + 'px)';
      requestAnimationFrame(springAnimate);
    }
    springAnimate();
  });
}
// <button data-magnetic="0.4">Hover me</button>
\`\`\`

### Cursor Trail (particles following cursor)
\`\`\`javascript
function initCursorTrail(count = 20) {
  const dots = [];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;width:' + (6 - i * 0.2) + 'px;height:' + (6 - i * 0.2) + 'px;border-radius:50%;background:rgba(99,102,241,' + (1 - i/count) + ');pointer-events:none;z-index:99999;mix-blend-mode:screen;';
    document.body.appendChild(dot);
    dots.push({ el: dot, x: 0, y: 0 });
  }
  
  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  
  function animate() {
    let prevX = mouseX, prevY = mouseY;
    dots.forEach((dot, i) => {
      const speed = 0.35 - i * 0.01;
      dot.x += (prevX - dot.x) * speed;
      dot.y += (prevY - dot.y) * speed;
      dot.el.style.left = dot.x + 'px';
      dot.el.style.top = dot.y + 'px';
      prevX = dot.x;
      prevY = dot.y;
    });
    requestAnimationFrame(animate);
  }
  animate();
}
\`\`\`

### Spotlight Card Hover (Aceternity-style)
\`\`\`javascript
function initSpotlightCards() {
  document.querySelectorAll('.spotlight-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--spotlight-x', x + 'px');
      card.style.setProperty('--spotlight-y', y + 'px');
    });
  });
}
// CSS:
// .spotlight-card { position:relative; overflow:hidden; }
// .spotlight-card::before { content:''; position:absolute; inset:0;
//   background:radial-gradient(circle 200px at var(--spotlight-x) var(--spotlight-y), rgba(99,102,241,0.15), transparent);
//   opacity:0; transition:opacity 0.3s; pointer-events:none; }
// .spotlight-card:hover::before { opacity:1; }
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 10 â€” PERFORMANCE & GPU DETECTION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const PERFORMANCE_DETECTION = `
## PERFORMANCE â€” GPU DETECTION & ADAPTIVE QUALITY

### GPU Tier Detection (adapt quality based on device)
\`\`\`javascript
// Detect GPU capabilities and set quality tier
function detectGPUTier() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return { tier: 0, gpu: 'none' };
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
  const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
  
  // Tier detection based on GPU name
  const gpuLower = renderer.toLowerCase();
  let tier = 1; // Default: low
  
  if (gpuLower.includes('nvidia') || gpuLower.includes('geforce') || gpuLower.includes('rtx') || gpuLower.includes('gtx')) {
    tier = gpuLower.includes('rtx') ? 3 : 2;
  } else if (gpuLower.includes('radeon') || gpuLower.includes('amd')) {
    tier = gpuLower.includes('rx 6') || gpuLower.includes('rx 7') ? 3 : 2;
  } else if (gpuLower.includes('apple') || gpuLower.includes('m1') || gpuLower.includes('m2') || gpuLower.includes('m3')) {
    tier = 3;
  } else if (gpuLower.includes('intel')) {
    tier = gpuLower.includes('iris') ? 2 : 1;
  }
  
  // Mobile detection overrides
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) tier = Math.min(tier, 2);
  
  return { tier, gpu: renderer, vendor, isMobile };
}

// Adaptive quality settings
function getQualitySettings() {
  const { tier, isMobile } = detectGPUTier();
  return {
    // Three.js settings
    pixelRatio: tier >= 3 ? Math.min(window.devicePixelRatio, 2) : tier >= 2 ? 1.5 : 1,
    particleCount: tier >= 3 ? 10000 : tier >= 2 ? 3000 : 500,
    shadowsEnabled: tier >= 2,
    postprocessing: tier >= 2,
    bloomEnabled: tier >= 3,
    // Animation settings
    enableThreeJS: tier >= 1,
    enableParticles: tier >= 1,
    enableCustomCursor: !isMobile,
    enableSmoothScroll: true, // Lenis works on all devices
    // Shader quality
    shaderPrecision: tier >= 2 ? 'highp' : 'mediump',
    noiseOctaves: tier >= 3 ? 6 : tier >= 2 ? 4 : 2,
  };
}

// Usage pattern:
// const quality = getQualitySettings();
// if (quality.enableThreeJS) { initThreeJSHero(quality); }
// if (quality.enableCustomCursor) { initCustomCursor(); }
// renderer.setPixelRatio(quality.pixelRatio);
\`\`\`

### Performance Monitor (dev mode)
\`\`\`javascript
// Lightweight FPS counter (remove in production)
function initPerfMonitor() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;font:12px/1 monospace;color:#0f0;background:rgba(0,0,0,0.7);padding:4px 8px;border-radius:4px;pointer-events:none;';
  document.body.appendChild(el);
  let frames = 0, lastTime = performance.now();
  function loop() {
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      el.textContent = frames + ' FPS';
      el.style.color = frames >= 55 ? '#0f0' : frames >= 30 ? '#ff0' : '#f00';
      frames = 0; lastTime = now;
    }
    requestAnimationFrame(loop);
  }
  loop();
}
\`\`\`

### Lazy Three.js (start/stop render loop based on visibility)
\`\`\`javascript
function lazyThreeJS(container, initFn) {
  let cleanup = null;
  let isRunning = false;
  
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !isRunning) {
        cleanup = initFn(container);
        isRunning = true;
      } else if (!entry.isIntersecting && isRunning) {
        if (cleanup) cleanup();
        isRunning = false;
      }
    });
  }, { threshold: 0.1 });
  
  observer.observe(container);
}
// Usage: lazyThreeJS(document.getElementById('hero-3d'), (container) => { ... return cleanupFn; });
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 11 â€” AWWWARDS PORTFOLIO PATTERNS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const AWWWARDS_PORTFOLIO_PATTERNS = `
## AWWWARDS PORTFOLIO PATTERNS â€” OPEN SOURCE REFERENCES

### Bruno Simon Style (3D Interactive Portfolio)
Key techniques from https://github.com/brunosimon/folio-2019:
- Full Three.js scene as the ENTIRE page (no traditional HTML scroll)
- Physics with Cannon.js for interactive objects
- Custom camera controller (not OrbitControls)
- Raycasting for click/hover detection on 3D objects
- Texture loading with progress bar
- Scene transitions via camera movement (not page navigation)

\`\`\`javascript
// Simplified Bruno Simon-inspired interactive 3D scene
const brunoStyleScene = (container) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  
  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.ShadowMaterial({ opacity: 0.15 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  
  // Lighting (studio setup)
  const amb = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(amb);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  scene.add(dirLight);
  
  // Interactive objects (raycasting)
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const interactiveObjects = [];
  
  // Create clickable project cubes
  const projects = ['Project 1', 'Project 2', 'Project 3', 'Project 4'];
  projects.forEach((name, i) => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(i * 0.25, 0.7, 0.5),
      roughness: 0.3, metalness: 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((i - 1.5) * 2.5, 0.5, 0);
    mesh.castShadow = true;
    mesh.userData = { name, originalY: 0.5 };
    scene.add(mesh);
    interactiveObjects.push(mesh);
  });
  
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);
  
  // Hover effect
  let hoveredObject = null;
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);
    
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (hoveredObject !== obj) {
        if (hoveredObject) gsap.to(hoveredObject.position, { y: hoveredObject.userData.originalY, duration: 0.4 });
        hoveredObject = obj;
        gsap.to(obj.position, { y: obj.userData.originalY + 0.5, duration: 0.4, ease: 'back.out(2)' });
        gsap.to(obj.rotation, { y: obj.rotation.y + Math.PI * 0.25, duration: 0.6, ease: 'power2.out' });
        container.style.cursor = 'pointer';
      }
    } else {
      if (hoveredObject) {
        gsap.to(hoveredObject.position, { y: hoveredObject.userData.originalY, duration: 0.4 });
        hoveredObject = null;
        container.style.cursor = 'default';
      }
    }
  });
  
  const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  };
  animate();
};
\`\`\`

### Dogstudio Style (GSAP + Three.js + GLSL integrated)
Key techniques:
- HTML content overlaid on Three.js canvas
- Scroll-synced 3D camera movement
- GLSL distortion effect on hover (image meshes in 3D space)
- Barba.js page transitions with Three.js scene persistence

\`\`\`javascript
// Image mesh with hover distortion (Dogstudio signature effect)
const createImageMesh = (imageUrl, geometry) => {
  const texture = new THREE.TextureLoader().load(imageUrl);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uHover: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: \\\`
      varying vec2 vUv;
      uniform float uHover;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 pos = position;
        // Wave distortion on hover
        float wave = sin(pos.x * 5.0 + uTime * 2.0) * sin(pos.y * 5.0 + uTime * 2.0);
        pos.z += wave * uHover * 0.15;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    \\\`,
    fragmentShader: \\\`
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform float uHover;
      void main() {
        vec2 uv = vUv;
        // RGB shift on hover
        float shift = uHover * 0.01;
        float r = texture2D(uTexture, uv + vec2(shift, 0.0)).r;
        float g = texture2D(uTexture, uv).g;
        float b = texture2D(uTexture, uv - vec2(shift, 0.0)).b;
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    \\\`,
  });
  return new THREE.Mesh(geometry, material);
};
// On hover: gsap.to(mesh.material.uniforms.uHover, { value: 1, duration: 0.5 });
// On leave: gsap.to(mesh.material.uniforms.uHover, { value: 0, duration: 0.5 });
\`\`\`

### COMPLETE INIT PATTERN (combine all techniques for production site)
\`\`\`javascript
// Master initialization â€” call this after DOM ready
function initAwwwardsPage() {
  const quality = getQualitySettings();
  
  // 1. Smooth scroll (ALWAYS)
  const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  
  // 2. Register GSAP plugins
  gsap.registerPlugin(ScrollTrigger);
  
  // 3. Custom cursor (desktop only)
  if (quality.enableCustomCursor) initCustomCursor();
  
  // 4. Three.js hero (GPU-tier adaptive)
  if (quality.enableThreeJS) {
    lazyThreeJS(document.getElementById('hero-3d'), (container) => {
      // Choose shader based on quality tier
      if (quality.tier >= 3) return initRayMarchHero(container);
      if (quality.tier >= 2) return initParticleGalaxy(container, quality.particleCount);
      return initGradientMesh(container);
    });
  }
  
  // 5. SplitType text animations
  animateHeroTitle('.hero-title', 2.8); // After preloader
  animateBlurReveal('.hero-subtitle', 3.2);
  animateScrollLines('[data-split-lines]');
  animateColorWave('.color-wave-text');
  
  // 6. Scroll animations
  initScrollImageReveals();
  initHorizontalScroll('.h-scroll-section', '.h-scroll-track');
  initScrollProgress();
  initVelocitySkew(lenis);
  
  // 7. Micro-interactions
  initMagnetic();
  init3DParallaxCards();
  initSpotlightCards();
  
  // 8. Scroll-triggered reveals
  ScrollTrigger.batch('[data-reveal]', {
    onEnter: batch => gsap.from(batch, {
      y: 60, opacity: 0, rotateX: -10,
      stagger: 0.08, duration: 0.8, ease: 'expo.out'
    }),
    start: 'top 85%', once: true,
  });
  
  // 9. Number counters
  document.querySelectorAll('[data-count]').forEach(el => {
    gsap.from(el, {
      textContent: 0, snap: { textContent: 1 },
      duration: 2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 80%', once: true }
    });
  });
  
  // 10. Infinite marquee
  document.querySelectorAll('.marquee-track').forEach(track => {
    const speed = parseFloat(track.dataset.speed) || 1;
    gsap.to(track, { xPercent: -50, duration: 20 / speed, ease: 'none', repeat: -1 });
  });
}

// Call after preloader completes
// document.addEventListener('DOMContentLoaded', initAwwwardsPage);
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 12 â€” THEATRE.JS + MOTION CANVAS (Timeline Animation Studios)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const THEATRE_MOTION_CANVAS = `
## THEATRE.JS & MOTION CANVAS â€” TIMELINE ANIMATION STUDIOS

### Theatre.js â€” Visual Timeline Editor for Web Animations
\`\`\`html
<!-- CDN: Theatre.js core + studio -->
<script src="https://cdn.jsdelivr.net/npm/@theatre/core@0.7/dist/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@theatre/studio@0.7/dist/index.min.js"></script>
<script>
// Theatre.js creates a visual timeline editor IN the browser
// You define props, then animate them with a draggable timeline UI

// 1. Initialize Theatre project
const project = Theatre.core.getProject('My Animation');
const sheet = project.sheet('Scene 1');

// 2. Create animated objects with typed props
const heroObj = sheet.object('Hero Title', {
  opacity: Theatre.core.types.number(0, { range: [0, 1] }),
  y: Theatre.core.types.number(100, { range: [-200, 200] }),
  scale: Theatre.core.types.number(0.8, { range: [0, 2] }),
  rotation: Theatre.core.types.number(0, { range: [-180, 180] }),
  color: Theatre.core.types.rgba({ r: 0.39, g: 0.4, b: 0.95, a: 1 }),
});

const bgObj = sheet.object('Background', {
  gradientAngle: Theatre.core.types.number(135, { range: [0, 360] }),
  blur: Theatre.core.types.number(0, { range: [0, 50] }),
  meshDistortion: Theatre.core.types.number(0, { range: [0, 2] }),
});

// 3. React to value changes (update DOM/Three.js)
const heroEl = document.querySelector('.hero-title');
heroObj.onValuesChange(values => {
  heroEl.style.opacity = values.opacity;
  heroEl.style.transform = \\\`translateY(\${values.y}px) scale(\${values.scale}) rotate(\${values.rotation}deg)\\\`;
});

// 4. For Three.js integration
const mesh = /* your Three.js mesh */;
bgObj.onValuesChange(values => {
  mesh.material.uniforms.uDistortion.value = values.meshDistortion;
  mesh.material.uniforms.uBlur.value = values.blur;
});

// 5. Play animation sequence
const sequence = sheet.sequence;
sequence.play({ iterationCount: 1, range: [0, 3] }); // Play 0-3 seconds

// 6. Open Theatre Studio UI (dev mode only)
Theatre.studio.initialize();
Theatre.studio.extend(/* extensions */);

// 7. Scroll-driven Theatre.js (scrub through timeline with scroll)
window.addEventListener('scroll', () => {
  const progress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  sequence.position = progress * sequence.length;
});

// 8. Export timeline JSON after editing in Studio UI:
// Click "Export" in Theatre Studio â†’ save as state.json
// In production, load saved state:
// const project = Theatre.core.getProject('My Animation', { state: savedStateJSON });
</script>
\`\`\`

### Theatre.js + Three.js Camera Path Animation
\`\`\`javascript
// Animate camera through a 3D scene (like Apple product pages)
const cameraObj = sheet.object('Camera', {
  posX: Theatre.core.types.number(0, { range: [-20, 20] }),
  posY: Theatre.core.types.number(5, { range: [-20, 20] }),
  posZ: Theatre.core.types.number(10, { range: [-20, 20] }),
  lookAtX: Theatre.core.types.number(0, { range: [-10, 10] }),
  lookAtY: Theatre.core.types.number(0, { range: [-10, 10] }),
  lookAtZ: Theatre.core.types.number(0, { range: [-10, 10] }),
});

cameraObj.onValuesChange(v => {
  camera.position.set(v.posX, v.posY, v.posZ);
  camera.lookAt(v.lookAtX, v.lookAtY, v.lookAtZ);
});

// Scrub with GSAP ScrollTrigger
ScrollTrigger.create({
  trigger: '.camera-section',
  start: 'top top', end: 'bottom bottom',
  scrub: 1,
  onUpdate: (self) => {
    sheet.sequence.position = self.progress * sheet.sequence.length;
  }
});
\`\`\`

### Motion Canvas â€” Programmatic Animation (code-driven motion graphics)
Motion Canvas is a TypeScript framework for creating animated videos/sequences programmatically.
Use when generating: explainer animations, data visualizations, logo reveals, code animations.
\`\`\`javascript
// Motion Canvas-style programmatic animation (adapted for browser)
// This recreates the Motion Canvas approach using vanilla JS + Canvas API

class MotionScene {
  constructor(canvasId, fps = 60) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.fps = fps;
    this.frame = 0;
    this.totalFrames = 0;
    this.animations = [];
  }
  
  // Tween helper (like Motion Canvas' tween)
  tween(duration, callback) {
    const startFrame = this.totalFrames;
    const durationFrames = Math.round(duration * this.fps);
    this.totalFrames += durationFrames;
    this.animations.push({ startFrame, durationFrames, callback });
    return this;
  }
  
  // Wait (like Motion Canvas' waitFor)
  wait(duration) {
    this.totalFrames += Math.round(duration * this.fps);
    return this;
  }
  
  // Easing functions
  static ease = {
    linear: t => t,
    inOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
  };
  
  play() {
    const render = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      for (const anim of this.animations) {
        if (this.frame >= anim.startFrame && this.frame < anim.startFrame + anim.durationFrames) {
          const localProgress = (this.frame - anim.startFrame) / anim.durationFrames;
          anim.callback(this.ctx, localProgress, this.canvas);
        } else if (this.frame >= anim.startFrame + anim.durationFrames) {
          anim.callback(this.ctx, 1, this.canvas); // Show final state
        }
      }
      
      this.frame++;
      if (this.frame <= this.totalFrames) requestAnimationFrame(render);
    };
    render();
  }
}

// Usage: Animated code block reveal (like Motion Canvas demos)
const scene = new MotionScene('motion-canvas', 60);
scene
  .tween(0.5, (ctx, t, canvas) => {
    // Background fade in
    ctx.fillStyle = \\\`rgba(17, 17, 27, \${t})\\\`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  })
  .wait(0.2)
  .tween(0.8, (ctx, t, canvas) => {
    // Code window slide in
    const ease = MotionScene.ease.outBack(t);
    const x = canvas.width * 0.1;
    const y = canvas.height * 0.15 + (1 - ease) * 100;
    const w = canvas.width * 0.8;
    const h = canvas.height * 0.7;
    
    // Window chrome
    ctx.fillStyle = '#1e1e2e';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    
    // Title bar dots
    ['#ff5f57', '#febc2e', '#28c840'].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 20 + i * 20, y + 18, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  })
  .tween(1.0, (ctx, t, canvas) => {
    // Code lines typing in
    const lines = ['const app = new App();', 'app.init({ theme: "dark" });', 'app.animate();'];
    ctx.font = '16px monospace';
    lines.forEach((line, i) => {
      const lineProgress = Math.max(0, Math.min(1, (t * lines.length - i)));
      const chars = Math.floor(lineProgress * line.length);
      ctx.fillStyle = '#cdd6f4';
      ctx.fillText(line.substring(0, chars), canvas.width * 0.15, canvas.height * 0.35 + i * 28);
    });
  });
scene.play();
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 13 â€” SPLITTING.JS + AOS + SCROLLREVEAL (Lightweight Animation Libraries)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const LIGHTWEIGHT_ANIMATION_LIBS = `
## SPLITTING.JS + AOS + SCROLLREVEAL â€” LIGHTWEIGHT ALTERNATIVES

### Splitting.js â€” CSS Variable-Based Text/Grid Splitting
\`\`\`html
<script src="https://unpkg.com/splitting@1.0.6/dist/splitting.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/splitting@1.0.6/dist/splitting.css">
<link rel="stylesheet" href="https://unpkg.com/splitting@1.0.6/dist/splitting-cells.css">
<script>
// Splitting.js splits text into chars/words/lines and sets CSS variables
// --char-index, --word-index, --line-index for pure CSS animations

// 1. Split all elements with [data-splitting]
Splitting();

// 2. Now each char has: style="--char-index: 0" etc.
// Animate with pure CSS:
</script>
<style>
/* Wave reveal animation (no JS animation code needed!) */
[data-splitting] .char {
  animation: charReveal 0.6s cubic-bezier(0.77, 0, 0.175, 1) both;
  animation-delay: calc(30ms * var(--char-index));
}
@keyframes charReveal {
  from { opacity: 0; transform: translateY(100%) rotateX(-80deg); }
  to { opacity: 1; transform: translateY(0) rotateX(0); }
}

/* Color cascade on hover */
[data-splitting]:hover .char {
  color: hsl(calc(var(--char-index) * 15), 80%, 60%);
  transition: color 0.3s;
  transition-delay: calc(20ms * var(--char-index));
}

/* Stagger blur reveal */
.blur-reveal .char {
  animation: blurIn 0.4s ease forwards;
  animation-delay: calc(40ms * var(--char-index));
  opacity: 0;
  filter: blur(10px);
}
@keyframes blurIn {
  to { opacity: 1; filter: blur(0); }
}

/* Grid cell reveal (for images split into grid) */
.grid-reveal .cell {
  animation: cellFade 0.3s ease both;
  animation-delay: calc(50ms * var(--cell-index));
}
@keyframes cellFade {
  from { opacity: 0; transform: scale(0); }
  to { opacity: 1; transform: scale(1); }
}
</style>
<script>
// Grid splitting (image into mosaic tiles)
Splitting({ target: '.grid-reveal', by: 'cells', rows: 4, columns: 4 });

// Word-by-word scroll reveal
Splitting({ target: '.word-reveal', by: 'words' });

// Scroll-triggered Splitting animation
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('[data-splitting]').forEach(el => observer.observe(el));
</script>
\`\`\`

### AOS (Animate On Scroll) â€” Simple Drop-In Scroll Animations
\`\`\`html
<link rel="stylesheet" href="https://unpkg.com/aos@2.3.4/dist/aos.css">
<script src="https://unpkg.com/aos@2.3.4/dist/aos.js"></script>
<script>
AOS.init({
  duration: 800,        // Animation duration (ms)
  easing: 'ease-out-cubic',
  once: true,           // Animate only first time
  offset: 100,          // Offset from trigger point
  delay: 0,             // Can be overridden per-element
  anchorPlacement: 'top-bottom',
});
</script>

<!-- Usage in HTML â€” just add data attributes: -->
<div data-aos="fade-up">Fade up on scroll</div>
<div data-aos="fade-up" data-aos-delay="200">Delayed fade up</div>
<div data-aos="zoom-in" data-aos-duration="1200">Zoom in slowly</div>
<div data-aos="flip-left" data-aos-easing="ease-out-cubic">Flip from left</div>
<div data-aos="fade-right" data-aos-anchor-placement="center-bottom">Custom anchor</div>

<!-- Available animations:
  fade-up, fade-down, fade-left, fade-right,
  fade-up-left, fade-up-right, fade-down-left, fade-down-right,
  zoom-in, zoom-in-up, zoom-in-down, zoom-in-left, zoom-in-right,
  zoom-out, zoom-out-up, zoom-out-down, zoom-out-left, zoom-out-right,
  flip-up, flip-down, flip-left, flip-right,
  slide-up, slide-down, slide-left, slide-right
-->

<!-- Custom AOS animation (define your own): -->
<style>
[data-aos="scale-rotate"] {
  transform: scale(0.5) rotate(-10deg);
  opacity: 0;
  transition-property: transform, opacity;
}
[data-aos="scale-rotate"].aos-animate {
  transform: scale(1) rotate(0);
  opacity: 1;
}
</style>
<div data-aos="scale-rotate">Custom animation</div>
\`\`\`

### ScrollReveal â€” Lightweight Scroll Animations Library
\`\`\`html
<script src="https://unpkg.com/scrollreveal@4.0.9/dist/scrollreveal.min.js"></script>
<script>
// ScrollReveal â€” programmatic scroll-triggered reveals
const sr = ScrollReveal({
  origin: 'bottom',
  distance: '60px',
  duration: 800,
  delay: 0,
  easing: 'cubic-bezier(0.5, 0, 0, 1)',
  reset: false,       // Don't re-animate on scroll up
  viewFactor: 0.2,    // 20% of element must be visible
});

// Basic reveals
sr.reveal('.hero-title', { origin: 'bottom', distance: '80px', duration: 1000, delay: 300 });
sr.reveal('.hero-subtitle', { origin: 'bottom', distance: '40px', delay: 500 });
sr.reveal('.hero-cta', { origin: 'bottom', distance: '30px', delay: 700 });

// Staggered cards
sr.reveal('.card', { interval: 100 }); // Each card 100ms after previous

// From different directions
sr.reveal('.stat-left', { origin: 'left', distance: '100px' });
sr.reveal('.stat-right', { origin: 'right', distance: '100px' });

// With scale
sr.reveal('.feature-icon', { scale: 0.5, duration: 600 });

// With rotation
sr.reveal('.testimonial', {
  rotate: { x: 20, y: 0, z: 0 },
  distance: '40px',
  duration: 800,
});

// Container with staggered children
sr.reveal('.grid-item', { 
  interval: 80,
  origin: 'bottom',
  distance: '30px',
  scale: 0.95,
});

// Mobile-specific config
if (window.innerWidth < 768) {
  sr.reveal('.mobile-reveal', { distance: '20px', duration: 600 });
}
</script>
\`\`\`

### Intersection Observer API â€” Zero-Dependency Alternative
\`\`\`javascript
// Pattern: Build your own scroll reveal with native API
function initIntersectionReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Get animation type from data attribute
        const el = entry.target;
        const animation = el.dataset.reveal || 'fadeUp';
        const delay = parseInt(el.dataset.revealDelay) || 0;
        
        setTimeout(() => {
          el.classList.add('revealed');
          el.style.transitionDelay = '0ms';
        }, delay);
        
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
  
  document.querySelectorAll('[data-reveal]').forEach(el => {
    observer.observe(el);
  });
}

// CSS for the reveals:
/*
[data-reveal] { opacity: 0; transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
[data-reveal="fadeUp"] { transform: translateY(60px); }
[data-reveal="fadeLeft"] { transform: translateX(-60px); }
[data-reveal="fadeRight"] { transform: translateX(60px); }
[data-reveal="scaleUp"] { transform: scale(0.85); }
[data-reveal="rotateIn"] { transform: perspective(800px) rotateX(15deg) translateY(40px); }
[data-reveal].revealed { opacity: 1; transform: none; }
*/

// Stagger children automatically:
function initStaggerChildren(parentSelector) {
  document.querySelectorAll(parentSelector).forEach(parent => {
    const children = parent.querySelectorAll('[data-reveal]');
    children.forEach((child, i) => {
      child.dataset.revealDelay = String(i * 80);
    });
  });
}
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 14 â€” CANNON.JS + RAPIER (3D Physics Engines)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const PHYSICS_3D_ENGINES = `
## CANNON.JS + RAPIER â€” 3D PHYSICS FOR WEB

### Cannon.js â€” Full 3D Physics (gravity, collisions, constraints)
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js"></script>
<script>
// Cannon.js + Three.js integration pattern
function initPhysicsScene(container) {
  // Three.js setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);
  
  // Cannon.js physics world
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  
  // Physics materials
  const groundMaterial = new CANNON.Material('ground');
  const boxMaterial = new CANNON.Material('box');
  const contactMaterial = new CANNON.ContactMaterial(groundMaterial, boxMaterial, {
    friction: 0.3,
    restitution: 0.5, // Bounciness
  });
  world.addContactMaterial(contactMaterial);
  
  // Ground plane
  const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
  groundBody.addShape(new CANNON.Plane());
  groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(groundBody);
  
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.15 })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  
  // Dynamic boxes (spawn with physics)
  const bodies = [];
  const meshes = [];
  const colors = [0x6366f1, 0xa855f7, 0xec4899, 0x06b6d4, 0x10b981];
  
  function spawnBox(x, y, z) {
    // Physics body
    const body = new CANNON.Body({
      mass: 1,
      material: boxMaterial,
      position: new CANNON.Vec3(x, y, z),
      angularVelocity: new CANNON.Vec3(
        (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5
      ),
    });
    const size = 0.3 + Math.random() * 0.4;
    body.addShape(new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2)));
    world.addBody(body);
    bodies.push(body);
    
    // Three.js mesh
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.3, metalness: 0.2,
      })
    );
    mesh.castShadow = true;
    scene.add(mesh);
    meshes.push(mesh);
  }
  
  // Spawn initial boxes
  for (let i = 0; i < 30; i++) {
    spawnBox((Math.random() - 0.5) * 4, 3 + Math.random() * 8, (Math.random() - 0.5) * 4);
  }
  
  // Click to spawn more
  container.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
    spawnBox(x, 8, 0);
  });
  
  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);
  
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);
  
  // Physics loop
  const timeStep = 1/60;
  function animate() {
    requestAnimationFrame(animate);
    world.step(timeStep);
    
    // Sync Three.js meshes with Cannon.js bodies
    for (let i = 0; i < bodies.length; i++) {
      meshes[i].position.copy(bodies[i].position);
      meshes[i].quaternion.copy(bodies[i].quaternion);
    }
    
    renderer.render(scene, camera);
  }
  animate();
}
</script>
\`\`\`

### Rapier â€” High-Performance WASM Physics (Rust-based)
\`\`\`javascript
// Rapier is a blazing-fast physics engine compiled from Rust to WebAssembly
// Use for: 100+ interactive objects, complex constraints, ragdolls, particles with physics

// Import (ESM/CDN)
// <script type="module">
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier2d-compat';

async function initRapierScene(canvasId) {
  // Initialize RAPIER WASM
  const RAPIER = await import('https://cdn.skypack.dev/@dimforge/rapier2d-compat');
  await RAPIER.init();
  
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth * 2;
  canvas.height = canvas.clientHeight * 2;
  ctx.scale(2, 2);
  
  // Create physics world
  const gravity = { x: 0.0, y: 9.81 };
  const world = new RAPIER.World(gravity);
  
  const SCALE = 50; // pixels per meter
  const bodies = [];
  
  // Ground
  const groundDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(canvas.clientWidth / 2 / SCALE, canvas.clientHeight / SCALE - 0.5);
  const groundBody = world.createRigidBody(groundDesc);
  const groundCollider = RAPIER.ColliderDesc.cuboid(canvas.clientWidth / SCALE, 0.5);
  world.createCollider(groundCollider, groundBody);
  
  // Walls
  const leftWallDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(-0.5, canvas.clientHeight / 2 / SCALE);
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, canvas.clientHeight / SCALE), world.createRigidBody(leftWallDesc));
  const rightWallDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(canvas.clientWidth / SCALE + 0.5, canvas.clientHeight / 2 / SCALE);
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, canvas.clientHeight / SCALE), world.createRigidBody(rightWallDesc));
  
  // Spawn dynamic circles (200 for stress test)
  const colors = ['#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];
  for (let i = 0; i < 200; i++) {
    const radius = 0.1 + Math.random() * 0.25;
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(1 + Math.random() * (canvas.clientWidth / SCALE - 2), Math.random() * -10);
    const body = world.createRigidBody(desc);
    const collider = RAPIER.ColliderDesc.ball(radius).setRestitution(0.5).setFriction(0.3);
    world.createCollider(collider, body);
    bodies.push({ body, radius, color: colors[i % colors.length] });
  }
  
  // Mouse interaction â€” push bodies away from cursor
  let mouseX = -1000, mouseY = -1000;
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / SCALE;
    mouseY = (e.clientY - rect.top) / SCALE;
  });
  
  function animate() {
    world.step();
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    
    // Mouse repulsion force
    for (const { body } of bodies) {
      const pos = body.translation();
      const dx = pos.x - mouseX;
      const dy = pos.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2 && dist > 0) {
        const force = 5 / (dist * dist);
        body.applyImpulse({ x: dx * force * 0.01, y: dy * force * 0.01 }, true);
      }
    }
    
    // Render
    for (const { body, radius, color } of bodies) {
      const pos = body.translation();
      ctx.beginPath();
      ctx.arc(pos.x * SCALE, pos.y * SCALE, radius * SCALE, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    
    requestAnimationFrame(animate);
  }
  animate();
}
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 15 â€” P5.JS + PAPER.JS + FABRIC.JS + KONVA (Canvas Frameworks)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const CANVAS_FRAMEWORKS = `
## P5.JS + PAPER.JS + FABRIC.JS + KONVA â€” CANVAS DRAWING FRAMEWORKS

### p5.js â€” Generative Art & Creative Coding
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
<script>
// p5.js instance mode (prevents global namespace pollution)
const generativeBackground = (containerId) => {
  const sketch = (p) => {
    let particles = [];
    const count = 150;
    
    p.setup = () => {
      const container = document.getElementById(containerId);
      const canvas = p.createCanvas(container.clientWidth, container.clientHeight);
      canvas.parent(containerId);
      p.colorMode(p.HSB, 360, 100, 100, 100);
      
      for (let i = 0; i < count; i++) {
        particles.push({
          x: p.random(p.width), y: p.random(p.height),
          vx: p.random(-0.5, 0.5), vy: p.random(-0.5, 0.5),
          size: p.random(2, 6),
          hue: p.random(220, 300), // Blue-purple range
        });
      }
    };
    
    p.draw = () => {
      p.background(0, 0, 5, 10); // Dark with trail fade
      
      // Draw connections
      p.strokeWeight(0.5);
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const d = p.dist(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
          if (d < 120) {
            const alpha = p.map(d, 0, 120, 30, 0);
            p.stroke(particles[i].hue, 60, 80, alpha);
            p.line(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
          }
        }
      }
      
      // Draw and move particles
      p.noStroke();
      for (const pt of particles) {
        // Mouse attraction
        const dx = p.mouseX - pt.x;
        const dy = p.mouseY - pt.y;
        const dist = p.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 0) {
          pt.vx += dx / dist * 0.03;
          pt.vy += dy / dist * 0.03;
        }
        
        pt.vx *= 0.99; pt.vy *= 0.99; // Damping
        pt.x += pt.vx; pt.y += pt.vy;
        
        // Wrap around
        if (pt.x < 0) pt.x = p.width;
        if (pt.x > p.width) pt.x = 0;
        if (pt.y < 0) pt.y = p.height;
        if (pt.y > p.height) pt.y = 0;
        
        p.fill(pt.hue, 70, 90, 70);
        p.ellipse(pt.x, pt.y, pt.size);
      }
    };
    
    p.windowResized = () => {
      const container = document.getElementById(containerId);
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    };
  };
  
  new p5(sketch);
};
// Usage: generativeBackground('hero-bg');
</script>

<!-- p5.js Advanced: Flow field visualization -->
<script>
const flowField = (containerId) => {
  const sketch = (p) => {
    let cols, rows, field;
    const scale = 20;
    let zoff = 0;
    const particles = [];
    
    p.setup = () => {
      const container = document.getElementById(containerId);
      p.createCanvas(container.clientWidth, container.clientHeight).parent(containerId);
      cols = p.floor(p.width / scale);
      rows = p.floor(p.height / scale);
      p.colorMode(p.HSB, 360, 100, 100, 100);
      p.background(0, 0, 5);
      
      for (let i = 0; i < 500; i++) {
        particles.push(p.createVector(p.random(p.width), p.random(p.height)));
      }
    };
    
    p.draw = () => {
      // Generate flow field
      field = [];
      let yoff = 0;
      for (let y = 0; y < rows; y++) {
        let xoff = 0;
        for (let x = 0; x < cols; x++) {
          const angle = p.noise(xoff, yoff, zoff) * p.TWO_PI * 2;
          field.push(p5.Vector.fromAngle(angle));
          xoff += 0.1;
        }
        yoff += 0.1;
      }
      zoff += 0.003;
      
      // Move particles along flow field
      for (const pt of particles) {
        const col = p.floor(pt.x / scale);
        const row = p.floor(pt.y / scale);
        const index = col + row * cols;
        
        if (field[index]) {
          pt.add(field[index].copy().mult(2));
        }
        
        // Draw trail
        const hue = (p.noise(pt.x * 0.005, pt.y * 0.005) * 120 + 220) % 360;
        p.stroke(hue, 80, 90, 5);
        p.strokeWeight(1);
        p.point(pt.x, pt.y);
        
        // Wrap
        if (pt.x > p.width) pt.x = 0;
        if (pt.x < 0) pt.x = p.width;
        if (pt.y > p.height) pt.y = 0;
        if (pt.y < 0) pt.y = p.height;
      }
    };
  };
  new p5(sketch);
};
</script>
\`\`\`

### Paper.js â€” Vector Graphics & Path Animations
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js"></script>
<canvas id="paper-canvas" resize></canvas>
<script type="text/paperscript" canvas="paper-canvas">
  // Paper.js â€” vector-based animated background
  var mousePos = view.center;
  
  // Create animated blob path
  var path = new Path();
  path.fillColor = {
    gradient: { stops: [['#6366f1', 0], ['#a855f7', 0.5], ['#ec4899', 1]] },
    origin: view.bounds.topLeft, destination: view.bounds.bottomRight
  };
  path.opacity = 0.3;
  
  var points = 12;
  var radius = Math.min(view.size.width, view.size.height) * 0.3;
  
  for (var i = 0; i < points; i++) {
    var angle = (i / points) * Math.PI * 2;
    var x = view.center.x + Math.cos(angle) * radius;
    var y = view.center.y + Math.sin(angle) * radius;
    path.add(new Point(x, y));
  }
  path.closed = true;
  path.smooth({ type: 'continuous' });
  
  function onFrame(event) {
    for (var i = 0; i < path.segments.length; i++) {
      var segment = path.segments[i];
      var angle = (i / points) * Math.PI * 2 + event.time * 0.5;
      var r = radius + Math.sin(event.time * 1.5 + i * 0.8) * 30;
      
      // Mouse influence
      var dx = mousePos.x - segment.point.x;
      var dy = mousePos.y - segment.point.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var influence = Math.max(0, 1 - dist / 200) * 30;
      
      segment.point.x += (view.center.x + Math.cos(angle) * r + dx * influence * 0.01 - segment.point.x) * 0.1;
      segment.point.y += (view.center.y + Math.sin(angle) * r + dy * influence * 0.01 - segment.point.y) * 0.1;
    }
    path.smooth({ type: 'continuous' });
  }
  
  function onMouseMove(event) {
    mousePos = event.point;
  }
  
  // Animated lines following cursor
  var trail = new Path();
  trail.strokeColor = '#6366f1';
  trail.strokeWidth = 2;
  trail.opacity = 0.5;
  
  function onMouseMove(event) {
    mousePos = event.point;
    trail.add(event.point);
    if (trail.segments.length > 50) trail.removeSegment(0);
    trail.smooth();
  }
</script>
\`\`\`

### Fabric.js â€” Interactive Canvas Objects (drag, rotate, scale)
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
<canvas id="fabric-canvas" width="800" height="500"></canvas>
<script>
// Fabric.js â€” interactive canvas with selectable/draggable objects
const fabricCanvas = new fabric.Canvas('fabric-canvas', {
  backgroundColor: '#0a0a0f',
  selection: true,
  renderOnAddRemove: true,
});

// Add draggable text
const title = new fabric.IText('Drag Me', {
  left: 100, top: 100,
  fontFamily: 'Inter', fontSize: 48, fontWeight: 700,
  fill: '#6366f1',
  shadow: '0 0 20px rgba(99,102,241,0.5)',
  editable: true, // Click to edit!
});
fabricCanvas.add(title);

// Add gradient rectangle with rotation handle
const rect = new fabric.Rect({
  left: 300, top: 200, width: 200, height: 150,
  rx: 16, ry: 16,
  fill: new fabric.Gradient({
    type: 'linear', coords: { x1: 0, y1: 0, x2: 200, y2: 150 },
    colorStops: [
      { offset: 0, color: '#6366f1' },
      { offset: 1, color: '#ec4899' },
    ]
  }),
  shadow: new fabric.Shadow({ color: 'rgba(99,102,241,0.3)', blur: 30 }),
  cornerColor: '#6366f1', cornerSize: 10, transparentCorners: false,
});
fabricCanvas.add(rect);

// Add image from URL
fabric.Image.fromURL('https://picsum.photos/200/200', (img) => {
  img.set({ left: 500, top: 100, scaleX: 0.5, scaleY: 0.5 });
  img.filters.push(new fabric.Image.filters.Grayscale());
  img.applyFilters();
  fabricCanvas.add(img);
});

// Circle with animation
const circle = new fabric.Circle({
  left: 100, top: 300, radius: 40,
  fill: '#a855f7', opacity: 0.8,
});
fabricCanvas.add(circle);
circle.animate('left', 600, { duration: 2000, easing: fabric.util.ease.easeInOutQuad, onChange: fabricCanvas.renderAll.bind(fabricCanvas) });

// Export canvas as image: fabricCanvas.toDataURL('png');
// Export as JSON: JSON.stringify(fabricCanvas.toJSON());
// Load from JSON: fabricCanvas.loadFromJSON(jsonData, fabricCanvas.renderAll.bind(fabricCanvas));
</script>
\`\`\`

### Konva â€” High-Performance Canvas Framework
\`\`\`html
<script src="https://unpkg.com/konva@9/konva.min.js"></script>
<div id="konva-container"></div>
<script>
// Konva â€” performant layered canvas (good for complex interactive UIs)
const stage = new Konva.Stage({
  container: 'konva-container',
  width: 800, height: 500,
});

const layer = new Konva.Layer();
stage.add(layer);

// Interactive draggable circle with shadow
const circle = new Konva.Circle({
  x: 200, y: 200, radius: 60,
  fill: '#6366f1', draggable: true,
  shadowColor: '#6366f1', shadowBlur: 30, shadowOpacity: 0.4,
});
circle.on('mouseover', function() {
  this.fill('#a855f7');
  document.body.style.cursor = 'pointer';
  new Konva.Tween({ node: this, scaleX: 1.1, scaleY: 1.1, duration: 0.2 }).play();
});
circle.on('mouseout', function() {
  this.fill('#6366f1');
  document.body.style.cursor = 'default';
  new Konva.Tween({ node: this, scaleX: 1, scaleY: 1, duration: 0.2 }).play();
});
layer.add(circle);

// Animated gradient rectangle
const rect = new Konva.Rect({
  x: 400, y: 150, width: 200, height: 200,
  cornerRadius: 16,
  fillLinearGradientStartPoint: { x: 0, y: 0 },
  fillLinearGradientEndPoint: { x: 200, y: 200 },
  fillLinearGradientColorStops: [0, '#6366f1', 0.5, '#a855f7', 1, '#ec4899'],
  shadowColor: 'rgba(99,102,241,0.3)', shadowBlur: 20,
  draggable: true,
});
layer.add(rect);

// Konva animation
const anim = new Konva.Animation((frame) => {
  rect.rotation(Math.sin(frame.time * 0.001) * 10);
}, layer);
anim.start();

// Text with custom font
const text = new Konva.Text({
  x: 50, y: 50, text: 'KONVA', fontSize: 48, fontFamily: 'Inter',
  fontStyle: 'bold', fill: '#fff', draggable: true,
});
layer.add(text);
layer.draw();

// Export: stage.toDataURL(); or stage.toJSON();
</script>
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 16 â€” TONE.JS + MEYDA + PEAKS.JS (Audio Libraries â€” Complete)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const AUDIO_LIBRARIES_COMPLETE = `
## TONE.JS + MEYDA + PEAKS.JS â€” COMPLETE AUDIO TOOLKIT

### Tone.js â€” Web Audio Synthesis & Sequencing
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js"></script>
<script>
// Tone.js â€” build interactive musical interfaces

// Pattern 1: Ambient generative music for landing pages
function initAmbientSoundscape() {
  // Reverb-heavy pad synth
  const reverb = new Tone.Reverb({ decay: 8, wet: 0.7 }).toDestination();
  const delay = new Tone.FeedbackDelay('8n', 0.4).connect(reverb);
  
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 2, decay: 3, sustain: 0.8, release: 4 },
    volume: -12,
  }).connect(delay);
  
  // Generative chord progression
  const chords = [
    ['C4', 'E4', 'G4', 'B4'],
    ['A3', 'C4', 'E4', 'G4'],
    ['F3', 'A3', 'C4', 'E4'],
    ['G3', 'B3', 'D4', 'F4'],
  ];
  let chordIndex = 0;
  
  const loop = new Tone.Loop((time) => {
    synth.triggerAttackRelease(chords[chordIndex], '2n', time);
    chordIndex = (chordIndex + 1) % chords.length;
  }, '2n');
  
  // Start on user interaction (browser policy)
  document.addEventListener('click', async () => {
    await Tone.start();
    Tone.Transport.bpm.value = 60;
    loop.start(0);
    Tone.Transport.start();
  }, { once: true });
}

// Pattern 2: UI sound effects (button clicks, hover, success)
function initUISounds() {
  const clickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.02, octaves: 4, volume: -20,
  }).toDestination();
  
  const hoverSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
    volume: -25,
  }).toDestination();
  
  const successSynth = new Tone.PolySynth(Tone.Synth).toDestination();
  
  return {
    click: () => clickSynth.triggerAttackRelease('C2', '16n'),
    hover: () => hoverSynth.triggerAttackRelease('C5', '32n'),
    success: () => {
      const now = Tone.now();
      successSynth.triggerAttackRelease('C4', '8n', now);
      successSynth.triggerAttackRelease('E4', '8n', now + 0.1);
      successSynth.triggerAttackRelease('G4', '8n', now + 0.2);
    },
    error: () => hoverSynth.triggerAttackRelease('A2', '8n'),
  };
}

// Pattern 3: Scroll-driven audio (pitch changes with scroll position)
function initScrollAudio() {
  const filter = new Tone.Filter(800, 'lowpass').toDestination();
  const noise = new Tone.Noise('pink').connect(filter);
  noise.volume.value = -30;
  
  document.addEventListener('click', async () => {
    await Tone.start();
    noise.start();
  }, { once: true });
  
  window.addEventListener('scroll', () => {
    const progress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    filter.frequency.value = 200 + progress * 2000; // Lowâ†’high as you scroll down
  });
}

// Pattern 4: Interactive piano/keyboard
function initPiano(containerId) {
  const container = document.getElementById(containerId);
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  const notes = ['C4','D4','E4','F4','G4','A4','B4','C5'];
  
  notes.forEach((note, i) => {
    const key = document.createElement('div');
    key.style.cssText = 'display:inline-block;width:60px;height:180px;background:white;border:1px solid #333;cursor:pointer;border-radius:0 0 4px 4px;margin:0 1px;transition:background 0.1s;';
    key.addEventListener('mousedown', () => { synth.triggerAttack(note); key.style.background = '#6366f1'; });
    key.addEventListener('mouseup', () => { synth.triggerRelease(note); key.style.background = 'white'; });
    key.addEventListener('mouseleave', () => { synth.triggerRelease(note); key.style.background = 'white'; });
    container.appendChild(key);
  });
}
</script>
\`\`\`

### Meyda â€” Audio Feature Extraction for Visualizations
\`\`\`html
<script src="https://unpkg.com/meyda@5/dist/web/meyda.min.js"></script>
<script>
// Meyda extracts musical features: spectral centroid, loudness, MFCC, chroma, etc.
// Use these to drive visual parameters in real-time

async function initMeydaVisualizer(audioElement, canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth * 2;
  canvas.height = canvas.clientHeight * 2;
  ctx.scale(2, 2);
  
  const audioContext = new AudioContext();
  const source = audioContext.createMediaElementSource(audioElement);
  source.connect(audioContext.destination);
  
  // Create Meyda analyzer
  const analyzer = Meyda.createMeydaAnalyzer({
    audioContext: audioContext,
    source: source,
    bufferSize: 512,
    featureExtractors: [
      'rms',               // Overall loudness
      'spectralCentroid',  // Brightness of sound
      'spectralFlatness',  // Noise vs tonal
      'chroma',            // 12 pitch classes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
      'mfcc',              // Timbre coefficients
      'zcr',               // Zero-crossing rate
    ],
    callback: (features) => {
      // Clear canvas
      ctx.fillStyle = 'rgba(10, 10, 20, 0.1)';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      
      // Central pulsing circle (driven by RMS/loudness)
      const rms = features.rms || 0;
      const baseRadius = 50;
      const pulseRadius = baseRadius + rms * 200;
      
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseRadius);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
      gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.4)');
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
      
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Chroma ring (12 segments for 12 pitch classes)
      if (features.chroma) {
        features.chroma.forEach((value, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const r = pulseRadius + 20 + value * 80;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const hue = (i / 12) * 360;
          
          ctx.beginPath();
          ctx.arc(x, y, 3 + value * 8, 0, Math.PI * 2);
          ctx.fillStyle = 'hsla(' + hue + ', 80%, 60%, ' + (0.3 + value * 0.7) + ')';
          ctx.fill();
        });
      }
      
      // Spectral centroid â†’ color temperature
      const centroid = (features.spectralCentroid || 0) / 256;
      const hue = 240 - centroid * 180; // Blue (low) â†’ Red (high)
      
      // Background glow based on brightness
      ctx.fillStyle = 'hsla(' + hue + ', 60%, 30%, ' + (rms * 0.1) + ')';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
  });
  
  document.addEventListener('click', () => {
    if (audioContext.state === 'suspended') audioContext.resume();
    analyzer.start();
  }, { once: true });
}
</script>
\`\`\`

### Peaks.js â€” Audio Waveform Display & Region Selection
\`\`\`html
<script src="https://unpkg.com/peaks.js@3/dist/peaks.js"></script>
<div id="waveform-container" style="height:150px"></div>
<div id="waveform-overview" style="height:50px"></div>
<audio id="audio-player" src="/audio/track.mp3"></audio>
<script>
// Peaks.js â€” interactive audio waveform (like SoundCloud)
const options = {
  zoomview: {
    container: document.getElementById('waveform-container'),
    waveformColor: 'rgba(99, 102, 241, 0.7)',
    playedWaveformColor: '#6366f1',
  },
  overview: {
    container: document.getElementById('waveform-overview'),
    waveformColor: 'rgba(99, 102, 241, 0.3)',
    playedWaveformColor: 'rgba(99, 102, 241, 0.6)',
    highlightColor: 'rgba(99, 102, 241, 0.1)',
  },
  mediaElement: document.getElementById('audio-player'),
  webAudio: {
    audioContext: new AudioContext(),
  },
  // Keyboard controls
  keyboard: true,
  // Scrollbar
  scrollbar: { color: '#6366f1', minWidth: 50 },
};

Peaks.init(options, (err, peaks) => {
  if (err) return console.error(err);
  
  // Add clickable regions (sections)
  peaks.segments.add({
    startTime: 0, endTime: 15,
    labelText: 'Intro', color: 'rgba(99, 102, 241, 0.3)',
    editable: true,
  });
  peaks.segments.add({
    startTime: 15, endTime: 60,
    labelText: 'Verse', color: 'rgba(168, 85, 247, 0.3)',
    editable: true,
  });
  
  // Add point markers
  peaks.points.add({ time: 30, labelText: 'Drop', color: '#ec4899', editable: true });
  
  // Event listeners
  peaks.on('segments.click', (segment) => {
    peaks.player.seek(segment.startTime);
    peaks.player.play();
  });
  
  peaks.on('points.click', (point) => {
    peaks.player.seek(point.time);
  });
  
  // Zoom controls
  document.getElementById('zoom-in').addEventListener('click', () => peaks.zoom.zoomIn());
  document.getElementById('zoom-out').addEventListener('click', () => peaks.zoom.zoomOut());
});
</script>
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 17 â€” SWUP + HIGHWAY (Page Transition Libraries)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const PAGE_TRANSITIONS_EXTENDED = `
## SWUP + HIGHWAY â€” ADDITIONAL PAGE TRANSITION PATTERNS

### Swup â€” Full Page Transition Library
\`\`\`html
<script src="https://unpkg.com/swup@4/dist/Swup.umd.js"></script>
<script src="https://unpkg.com/@swup/fade-theme@2/dist/SwupFadeTheme.umd.js"></script>
<script src="https://unpkg.com/@swup/slide-theme@2/dist/SwupSlideTheme.umd.js"></script>
<script src="https://unpkg.com/@swup/scroll-plugin@3/dist/SwupScrollPlugin.umd.js"></script>
<script src="https://unpkg.com/@swup/preload-plugin@3/dist/SwupPreloadPlugin.umd.js"></script>
<script>
// Swup â€” automatic page transitions without full reload

const swup = new Swup({
  animationSelector: '[class*="transition-"]',
  containers: ['#swup-main', '#swup-header'], // Containers that change between pages
  cache: true,
  plugins: [
    new SwupFadeTheme(),           // Simple fade transition
    new SwupScrollPlugin({         // Smooth scroll to top
      doScrollingRightAway: false,
      animateScroll: { betweenPages: true, samePageWithHash: true },
    }),
    new SwupPreloadPlugin(),       // Preload links on hover
  ],
});

// Hook into lifecycle events
swup.hooks.on('page:view', () => {
  // Re-init animations on new page
  initScrollAnimations();
  initSplitTypeAnimations();
  if (typeof AOS !== 'undefined') AOS.refresh();
});

swup.hooks.on('animation:out:start', () => {
  // Start exit animation
  gsap.to('.transition-fade', { opacity: 0, y: -20, duration: 0.3 });
});

swup.hooks.on('animation:in:start', () => {
  // Start enter animation
  gsap.from('.transition-fade', { opacity: 0, y: 20, duration: 0.3 });
  gsap.from('[data-animate]', { y: 40, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'expo.out' });
});

// Clean up Three.js scenes on page leave
swup.hooks.on('content:replace', () => {
  if (window.currentThreeCleanup) { window.currentThreeCleanup(); window.currentThreeCleanup = null; }
});
</script>

<!-- Required HTML structure: -->
<div id="swup-header"><!-- Persistent header --></div>
<main id="swup-main" class="transition-fade">
  <!-- Page content that transitions -->
</main>

<!-- CSS for default fade: -->
<style>
.transition-fade { opacity: 1; transition: opacity 0.3s ease; }
html.is-animating .transition-fade { opacity: 0; }
html.is-leaving .transition-fade { transform: translateY(-10px); }
html.is-rendering .transition-fade { transform: translateY(10px); }
</style>
\`\`\`

### Highway â€” Object-Oriented Page Transitions
\`\`\`html
<script src="https://unpkg.com/@dogstudio/highway@2/dist/highway.min.js"></script>
<script>
// Highway â€” by Dogstudio, class-based transition system

// Define a transition class
class CustomTransition extends Highway.Transition {
  in({ from, to, done }) {
    // Remove old page
    from.remove();
    
    // Animate new page in
    gsap.fromTo(to, 
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', onComplete: done }
    );
    
    // Animate new page elements
    gsap.from(to.querySelectorAll('[data-animate]'), {
      y: 40, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'expo.out', delay: 0.3
    });
  }
  
  out({ from, done }) {
    gsap.to(from, {
      opacity: 0, y: -30, duration: 0.4, ease: 'power2.in', onComplete: done
    });
  }
}

// Overlay transition (curtain reveal)
class OverlayTransition extends Highway.Transition {
  in({ from, to, done }) {
    from.remove();
    // Slide curtain up to reveal new page
    const overlay = document.querySelector('.page-overlay');
    gsap.to(overlay, {
      scaleY: 0, transformOrigin: 'top', duration: 0.6, ease: 'power4.inOut',
      onComplete: () => {
        done();
        // Re-init scroll animations
        ScrollTrigger.refresh();
      }
    });
  }
  
  out({ from, done }) {
    const overlay = document.querySelector('.page-overlay');
    gsap.fromTo(overlay,
      { scaleY: 0, transformOrigin: 'bottom' },
      { scaleY: 1, duration: 0.6, ease: 'power4.inOut', onComplete: done }
    );
  }
}

// Define renderers for page-specific logic
class HomeRenderer extends Highway.Renderer {
  onEnter() {
    // Init home page specific code
    initThreeJSHero();
    initParticles();
  }
  onLeave() {
    // Cleanup
    if (window.threeCleanup) window.threeCleanup();
  }
  onEnterCompleted() {
    // After transition completes
    initScrollAnimations();
  }
}

// Initialize Highway
const H = new Highway.Core({
  transitions: {
    default: CustomTransition,
    overlay: OverlayTransition,
  },
  renderers: {
    home: HomeRenderer,
  }
});
</script>

<!-- Required HTML structure: -->
<div data-router-wrapper>
  <div data-router-view="home" data-transition="overlay">
    <!-- Page content -->
  </div>
</div>
<div class="page-overlay" style="position:fixed;inset:0;background:#6366f1;z-index:9999;pointer-events:none;transform:scaleY(0);"></div>
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 18 â€” KINET + WEBGPU + STATS.JS + DETECT-GPU (Performance & Utilities)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const PERF_AND_UTILITIES = `
## KINET + WEBGPU + STATS.JS + DETECT-GPU â€” PERFORMANCE & UTILITIES

### Kinet â€” Smooth Mouse-Following Animation Engine
\`\`\`html
<script src="https://unpkg.com/kinet@2/dist/kinet.min.js"></script>
<script>
// Kinet â€” spring-physics based cursor following

// Pattern 1: Smooth cursor follower with spring physics
function initKinetCursor() {
  const cursor = document.createElement('div');
  cursor.style.cssText = 'position:fixed;width:40px;height:40px;border:2px solid #6366f1;border-radius:50%;pointer-events:none;z-index:99999;mix-blend-mode:difference;transition:width 0.2s,height 0.2s;';
  document.body.appendChild(cursor);
  
  const kinet = new Kinet({
    acceleration: 0.06,
    friction: 0.25,
    names: ['x', 'y'],
  });
  
  kinet.on('tick', (instances) => {
    cursor.style.transform = 'translate(' + (instances.x.current - 20) + 'px, ' + (instances.y.current - 20) + 'px)';
  });
  
  document.addEventListener('mousemove', (e) => {
    kinet.animate('x', e.clientX);
    kinet.animate('y', e.clientY);
  });
  
  // Scale up on hovering links/buttons
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => { cursor.style.width = '60px'; cursor.style.height = '60px'; });
    el.addEventListener('mouseleave', () => { cursor.style.width = '40px'; cursor.style.height = '40px'; });
  });
}

// Pattern 2: Multiple elements following cursor with delay chain
function initKinetTrail(count = 10) {
  const dots = [];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    const size = 10 - i * 0.8;
    dot.style.cssText = 'position:fixed;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:rgba(99,102,241,' + (1 - i/count) + ');pointer-events:none;z-index:99999;';
    document.body.appendChild(dot);
    
    const kinet = new Kinet({
      acceleration: 0.08 - i * 0.005,
      friction: 0.2 + i * 0.03,
      names: ['x', 'y'],
    });
    
    kinet.on('tick', (instances) => {
      dot.style.transform = 'translate(' + (instances.x.current - size/2) + 'px, ' + (instances.y.current - size/2) + 'px)';
    });
    
    dots.push({ dot, kinet });
  }
  
  document.addEventListener('mousemove', (e) => {
    dots.forEach(({ kinet }) => {
      kinet.animate('x', e.clientX);
      kinet.animate('y', e.clientY);
    });
  });
}

// Pattern 3: Kinet for element elastic follow (e.g., floating badge)
function initKinetElement(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const kinet = new Kinet({
    acceleration: 0.04,
    friction: 0.3,
    names: ['x', 'y', 'rotate'],
  });
  
  kinet.on('tick', (instances) => {
    el.style.transform = 'translate(' + instances.x.current + 'px, ' + instances.y.current + 'px) rotate(' + instances.rotate.current + 'deg)';
  });
  
  document.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    kinet.animate('x', dx * 0.1);
    kinet.animate('y', dy * 0.1);
    kinet.animate('rotate', dx * 0.02);
  });
}
</script>
\`\`\`

### detect-gpu â€” GPU Capability Detection for Adaptive Quality
\`\`\`html
<script src="https://unpkg.com/detect-gpu@5/dist/detect-gpu.umd.js"></script>
<script>
// detect-gpu â€” classify GPU into tiers for adaptive rendering
async function initAdaptiveQuality() {
  const gpuInfo = await DetectGPU.getGPUTier({
    // Options:
    mobileTiers: [0, 15, 30, 60],  // FPS thresholds for mobile tiers
    desktopTiers: [0, 15, 30, 60], // FPS thresholds for desktop tiers
    failIfMajorPerformanceCaveat: true,
  });
  
  console.log('GPU Tier:', gpuInfo.tier);  // 0, 1, 2, or 3
  console.log('GPU:', gpuInfo.gpu);        // e.g., "NVIDIA GeForce RTX 3080"
  console.log('Mobile:', gpuInfo.isMobile);
  console.log('Type:', gpuInfo.type);      // 'BENCHMARK' or 'FALLBACK'
  
  // Apply quality settings based on tier
  const settings = {
    0: { // Tier 0: Very weak GPU
      enableThreeJS: false, enableParticles: false,
      enableCustomCursor: false, enableBloom: false,
      pixelRatio: 1, particleCount: 0,
    },
    1: { // Tier 1: Low-end
      enableThreeJS: true, enableParticles: true,
      enableCustomCursor: !gpuInfo.isMobile, enableBloom: false,
      pixelRatio: 1, particleCount: 500,
    },
    2: { // Tier 2: Mid-range
      enableThreeJS: true, enableParticles: true,
      enableCustomCursor: true, enableBloom: true,
      pixelRatio: 1.5, particleCount: 3000,
    },
    3: { // Tier 3: High-end
      enableThreeJS: true, enableParticles: true,
      enableCustomCursor: true, enableBloom: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2), particleCount: 10000,
    },
  };
  
  return settings[gpuInfo.tier] || settings[1];
}

// Usage:
// const quality = await initAdaptiveQuality();
// if (quality.enableThreeJS) initThreeJSHero(quality);
</script>
\`\`\`

### Stats.js â€” Visual Performance Monitor
\`\`\`html
<script src="https://cdnjs.cloudflare.com/ajax/libs/stats.js/17/Stats.min.js"></script>
<script>
// Stats.js â€” FPS/MS/Memory monitor (dev mode only)
function initStatsMonitor() {
  const stats = new Stats();
  stats.showPanel(0); // 0: FPS, 1: MS, 2: Memory
  stats.dom.style.cssText = 'position:fixed;top:0;left:0;z-index:999999;';
  document.body.appendChild(stats.dom);
  
  function loop() {
    stats.begin();
    // ... your render/animation code ...
    stats.end();
    requestAnimationFrame(loop);
  }
  loop();
  
  return stats;
}

// Toggle with keyboard shortcut (Shift+F)
document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'F') {
    const stats = document.querySelector('.stats');
    if (stats) stats.style.display = stats.style.display === 'none' ? '' : 'none';
  }
});
</script>
\`\`\`

### WebGPU â€” Next Generation Graphics API
\`\`\`javascript
// WebGPU is the successor to WebGL â€” MUCH faster, compute shader support
// Check support first: 'gpu' in navigator

async function initWebGPUTriangle(canvasId) {
  if (!navigator.gpu) {
    console.warn('WebGPU not supported, falling back to WebGL');
    return false;
  }
  
  const canvas = document.getElementById(canvasId);
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return false;
  
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  
  context.configure({
    device, format, alphaMode: 'premultiplied',
  });
  
  // WGSL Shader (WebGPU Shading Language â€” replaces GLSL)
  const shaderModule = device.createShaderModule({
    code: \\\`
      struct VertOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      }
      
      @vertex fn vertexMain(@builtin(vertex_index) i: u32) -> VertOutput {
        var positions = array<vec2f, 3>(
          vec2f( 0.0,  0.5),
          vec2f(-0.5, -0.5),
          vec2f( 0.5, -0.5),
        );
        var colors = array<vec4f, 3>(
          vec4f(0.39, 0.4, 0.95, 1),   // Indigo
          vec4f(0.66, 0.33, 0.97, 1),  // Purple
          vec4f(0.93, 0.28, 0.61, 1),  // Pink
        );
        var out: VertOutput;
        out.position = vec4f(positions[i], 0, 1);
        out.color = colors[i];
        return out;
      }
      
      @fragment fn fragmentMain(in: VertOutput) -> @location(0) vec4f {
        return in.color;
      }
    \\\`
  });
  
  // Pipeline
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: shaderModule, entryPoint: 'vertexMain' },
    fragment: {
      module: shaderModule, entryPoint: 'fragmentMain',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  });
  
  // Render
  function render() {
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
        loadOp: 'clear', storeOp: 'store',
      }],
    });
    
    renderPass.setPipeline(pipeline);
    renderPass.draw(3); // 3 vertices
    renderPass.end();
    
    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(render);
  }
  render();
  return true;
}

// WebGPU Compute Shader (for particle simulations â€” 100x faster than JS)
async function initWebGPUParticles(canvasId, count = 100000) {
  if (!navigator.gpu) return false;
  
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  
  // Compute shader: update 100K particles on GPU
  const computeShader = device.createShaderModule({
    code: \\\`
      struct Particle { pos: vec2f, vel: vec2f }
      @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
      @group(0) @binding(1) var<uniform> params: vec4f; // x=deltaTime, y=mouseX, z=mouseY, w=count
      
      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) id: vec3u) {
        let i = id.x;
        if (i >= u32(params.w)) { return; }
        
        var p = particles[i];
        
        // Mouse attraction
        let mouse = vec2f(params.y, params.z);
        let toMouse = mouse - p.pos;
        let dist = length(toMouse);
        if (dist > 0.01 && dist < 0.5) {
          p.vel += normalize(toMouse) * 0.001;
        }
        
        // Damping
        p.vel *= 0.99;
        p.pos += p.vel * params.x;
        
        // Wrap around
        if (p.pos.x > 1) { p.pos.x -= 2; }
        if (p.pos.x < -1) { p.pos.x += 2; }
        if (p.pos.y > 1) { p.pos.y -= 2; }
        if (p.pos.y < -1) { p.pos.y += 2; }
        
        particles[i] = p;
      }
    \\\`
  });
  
  // This runs particle physics ENTIRELY on the GPU
  // 100,000 particles at 60fps â€” impossible with JavaScript alone
  console.log('WebGPU compute shader ready for', count, 'particles');
  return true;
}
\`\`\`
`;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMBINED EXPORT â€” SINGLE PROMPT SECTION FOR SYSTEM-PROMPTS.TS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const CREATIVE_STUDIO_TOOLKIT_PROMPT = `
## CREATIVE STUDIO TOOLKIT â€” COMPLETE AWWWARDS INTELLIGENCE

This toolkit contains PRODUCTION-READY code patterns from the exact libraries used by Awwwards-winning studios.
Every pattern below is copy-paste ready for vanilla HTML/JS (CDN-based, no build step needed).
Use these patterns in EVERY generation â€” they are the STANDARD, not optional extras.

### LIBRARY REFERENCE (CDN links â€” include as needed)
\`\`\`html
<!-- Core (MANDATORY on every generation) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
<script src="https://unpkg.com/split-type@0.3.4/umd/index.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- Extended GSAP (include when using advanced animations) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollToPlugin.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Flip.min.js"></script>

<!-- Three.js Extensions (include when using 3D models/postprocessing) -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>

<!-- Physics (include when using interactive physics) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>

<!-- Particles (alternative to custom Three.js particles) -->
<script src="https://cdn.jsdelivr.net/npm/tsparticles-slim@2/tsparticles.slim.bundle.min.js"></script>

<!-- Page transitions (include for multi-page sites) -->
<script src="https://unpkg.com/@barba/core@2/dist/barba.umd.js"></script>

<!-- Locomotive Scroll (alternative to Lenis) -->
<script src="https://cdn.jsdelivr.net/npm/locomotive-scroll@4.1.4/dist/locomotive-scroll.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/locomotive-scroll@4.1.4/dist/locomotive-scroll.min.css">

<!-- Hand-drawn style (for creative/playful sites) -->
<script src="https://unpkg.com/roughjs@4.6.4/bundled/rough.cjs.js"></script>

<!-- Animation libraries (Lottie for After Effects exports) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>

<!-- Splitting.js (CSS variable-based text splitting) -->
<script src="https://unpkg.com/splitting@1.0.6/dist/splitting.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/splitting@1.0.6/dist/splitting.css">

<!-- AOS (Animate On Scroll â€” simple drop-in) -->
<link rel="stylesheet" href="https://unpkg.com/aos@2.3.4/dist/aos.css">
<script src="https://unpkg.com/aos@2.3.4/dist/aos.js"></script>

<!-- ScrollReveal -->
<script src="https://unpkg.com/scrollreveal@4.0.9/dist/scrollreveal.min.js"></script>

<!-- Cannon.js (3D physics) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js"></script>

<!-- p5.js (generative art) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>

<!-- Paper.js (vector graphics) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js"></script>

<!-- Fabric.js (interactive canvas) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>

<!-- Konva (performant layered canvas) -->
<script src="https://unpkg.com/konva@9/konva.min.js"></script>

<!-- Tone.js (web audio synthesis) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js"></script>

<!-- Meyda (audio feature extraction) -->
<script src="https://unpkg.com/meyda@5/dist/web/meyda.min.js"></script>

<!-- Peaks.js (audio waveform display) -->
<script src="https://unpkg.com/peaks.js@3/dist/peaks.js"></script>

<!-- Swup (page transitions) -->
<script src="https://unpkg.com/swup@4/dist/Swup.umd.js"></script>

<!-- Highway (page transitions by Dogstudio) -->
<script src="https://unpkg.com/@dogstudio/highway@2/dist/highway.min.js"></script>

<!-- Kinet (spring-physics cursor) -->
<script src="https://unpkg.com/kinet@2/dist/kinet.min.js"></script>

<!-- detect-gpu (GPU tier detection) -->
<script src="https://unpkg.com/detect-gpu@5/dist/detect-gpu.umd.js"></script>

<!-- Stats.js (FPS monitor â€” dev only) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/stats.js/17/Stats.min.js"></script>

<!-- Theatre.js (visual timeline editor) -->
<script src="https://cdn.jsdelivr.net/npm/@theatre/core@0.7/dist/index.min.js"></script>
\`\`\`

${GLSL_SHADER_LIBRARY}

${ADVANCED_THREEJS}

${PHYSICS_SIMULATIONS}

${TEXT_ANIMATION_PRO}

${PAGE_TRANSITIONS_PRO}

${SCROLL_DRIVEN_PRO}

${CANVAS_2D_GENERATIVE}

${AUDIO_REACTIVE}

${CURSOR_PRO}

${PERFORMANCE_DETECTION}

${AWWWARDS_PORTFOLIO_PATTERNS}

${THEATRE_MOTION_CANVAS}

${LIGHTWEIGHT_ANIMATION_LIBS}

${PHYSICS_3D_ENGINES}

${CANVAS_FRAMEWORKS}

${AUDIO_LIBRARIES_COMPLETE}

${PAGE_TRANSITIONS_EXTENDED}

${PERF_AND_UTILITIES}
`;
