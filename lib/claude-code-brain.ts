/**
 * Claude Code Brain Engine v2.0
 * 
 * Upgraded with patterns extracted from Claude Code's ACTUAL source code:
 * - Sectioned prompt system with memoization (from systemPromptSections.ts)
 * - Token budget tracking with diminishing returns detection (from tokenBudget.ts)
 * - Three-layer tool validation pattern (from Tool.ts)
 * - Coordinator sub-agent orchestration (from coordinatorMode.ts)
 * - Stop hooks for quality gates (from stopHooks.ts)
 * - Advisor pattern for self-review (from advisor.ts)
 * 
 * Real pipeline:
 * 1. Domain Detection: Classify what the user is asking for
 * 2. Skill Routing: Inject relevant best practices from 26+ compiled skills
 * 3. Execution Planning: Claude Code-style phased approach
 * 4. Quality Gates: Define success criteria before generation
 * 5. Continuation Intelligence: Diminishing returns detection
 * 6. Section Memoization: Cache static prompt sections, recompute dynamic ones
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN DETECTION — Classify user prompt into skill domains
// ═══════════════════════════════════════════════════════════════════════════════

export type SkillDomain =
  | 'react' | 'nextjs' | 'vue' | 'svelte' | 'angular'
  | 'ui-design' | 'animation' | 'accessibility'
  | 'api' | 'database' | 'auth' | 'payments'
  | 'testing' | 'security' | 'performance'
  | 'ai-integration' | 'deploy' | 'devops'
  | 'scraping' | 'email' | 'seo'
  | 'ecommerce' | 'saas' | 'portfolio' | 'landing'
  | 'fullstack' | 'mobile' | 'terminal-cmd';

interface DomainMatch {
  domain: SkillDomain;
  confidence: number; // 0-1
  keywords: string[];
}

const DOMAIN_PATTERNS: Record<SkillDomain, RegExp[]> = {
  react: [/react/i, /component/i, /hooks?\b/i, /useState|useEffect|useCallback|useMemo/i, /jsx|tsx/i, /props/i],
  nextjs: [/next\.?js/i, /app\s*router/i, /server\s*(component|action)/i, /middleware/i, /getServerSide/i],
  vue: [/vue/i, /vuex|pinia/i, /composition\s*api/i, /nuxt/i, /\bsfc\b/i],
  svelte: [/svelte/i, /sveltekit/i],
  angular: [/angular/i, /rxjs|observable/i, /ng-|ngFor|ngIf/i],
  'ui-design': [/design/i, /ui|ux/i, /figma/i, /wireframe/i, /mockup/i, /color|palette|typography|font/i, /layout/i, /dark\s*mode|light\s*mode|theme/i],
  animation: [/animat/i, /gsap/i, /framer/i, /lottie|rive/i, /transition/i, /parallax/i, /scroll.*effect/i, /three\.?js|webgl|3d/i, /motion/i],
  accessibility: [/accessib/i, /a11y/i, /aria/i, /screen\s*reader/i, /wcag/i, /keyboard\s*nav/i],
  api: [/api/i, /endpoint/i, /rest|graphql/i, /fetch|axios/i, /route\s*handler/i, /webhook/i],
  database: [/database|db\b/i, /supabase/i, /postgres|mysql|mongo/i, /prisma/i, /sql\b/i, /schema|migration/i, /crud/i],
  auth: [/auth/i, /login|signup|sign.*in|sign.*up/i, /clerk/i, /oauth|jwt|session/i, /password|register/i],
  payments: [/pay/i, /stripe/i, /checkout|billing|subscription|price|invoice/i, /lemon\s*squeezy/i],
  testing: [/test/i, /vitest|jest|cypress|playwright/i, /spec\b/i, /assert|expect|mock/i, /coverage/i, /e2e/i],
  security: [/secur/i, /xss|csrf|injection|sanitiz/i, /encrypt/i, /https|ssl|tls/i, /rate.?limit/i, /owasp/i],
  performance: [/perform/i, /optimi[zs]/i, /lazy|bundle|code.?split/i, /cache/i, /lighthouse|core.*vital/i, /fast|speed|slow/i],
  'ai-integration': [/\bai\b|artificial/i, /llm|gpt|claude|gemini|openai|anthropic/i, /chat.*bot/i, /machine.*learn/i, /agent/i, /prompt/i],
  deploy: [/deploy/i, /vercel/i, /netlify|aws|gcp|azure/i, /ci.*cd|pipeline/i, /docker/i, /hosting/i],
  devops: [/devops/i, /github.*action/i, /terraform|kubernetes/i, /monitor/i, /log/i],
  scraping: [/scrap/i, /crawl/i, /firecrawl/i, /extract.*data/i, /parse.*html/i, /clone.*site|clone.*web/i],
  email: [/email/i, /smtp|sendgrid|resend|ses/i, /newsletter/i, /transactional/i],
  seo: [/seo/i, /meta.*tag/i, /sitemap/i, /structured.*data|schema.*markup/i, /open.*graph/i],
  ecommerce: [/e[\-\s]?commerce|shop|store/i, /product|cart|order/i, /inventory/i, /shopify/i],
  saas: [/saas/i, /dashboard/i, /admin.*panel/i, /analytics/i, /subscription.*model/i, /multi[\-\s]?tenant/i],
  portfolio: [/portfolio/i, /personal.*site|personal.*page/i, /resume|cv\b/i, /showcase/i],
  landing: [/landing/i, /hero\s*section/i, /call.*to.*action|cta/i, /conversion/i, /above.*fold/i, /waitlist/i],
  fullstack: [/full[\-\s]?stack/i, /backend.*frontend|frontend.*backend/i, /express|fastapi|flask/i, /server.*client/i],
  mobile: [/mobile/i, /responsive/i, /react.*native|expo|flutter/i, /app.*store|play.*store/i, /ios|android/i],
  'terminal-cmd': [/^(run|execute|install|build|test|deploy|fix|create|generate|delete|update|migrate|seed)\b/i],
};

/**
 * Detect all relevant domains from a user prompt.
 * Returns sorted by confidence (highest first).
 */
export function detectDomains(prompt: string): DomainMatch[] {
  const matches: DomainMatch[] = [];

  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS) as [SkillDomain, RegExp[]][]) {
    const matchedKeywords: string[] = [];
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) matchedKeywords.push(match[0]);
    }
    if (matchedKeywords.length > 0) {
      matches.push({
        domain,
        confidence: Math.min(1, matchedKeywords.length / patterns.length + (matchedKeywords.length > 2 ? 0.3 : 0)),
        keywords: matchedKeywords,
      });
    }
  }

  // Boost common combinations
  const domainSet = new Set(matches.map(m => m.domain));
  if (domainSet.has('landing') || domainSet.has('portfolio') || domainSet.has('saas')) {
    // These always need UI + animation
    if (!domainSet.has('ui-design')) matches.push({ domain: 'ui-design', confidence: 0.7, keywords: ['implicit'] });
    if (!domainSet.has('animation')) matches.push({ domain: 'animation', confidence: 0.6, keywords: ['implicit'] });
  }
  if (domainSet.has('ecommerce')) {
    if (!domainSet.has('payments')) matches.push({ domain: 'payments', confidence: 0.5, keywords: ['implicit'] });
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-DETECT FRAMEWORK — Let the brain decide what to build
// ═══════════════════════════════════════════════════════════════════════════════

type OutputFramework = 'html' | 'react' | 'nextjs' | 'vue' | 'svelte' | 'angular' | 'python' | 'fullstack';

/**
 * Auto-detect the best output framework from user prompt + detected domains.
 * This replaces the manual selector — the AI decides like other app builders.
 * Also decides whether backend is needed and returns appropriate instructions.
 */
export function autoDetectFramework(prompt: string, domains?: DomainMatch[]): { framework: OutputFramework; instructions: string; needsBackend: boolean } {
  const d = domains || detectDomains(prompt);
  const domainSet = new Set(d.map(m => m.domain));
  const lp = prompt.toLowerCase();

  // Explicit framework mentions take priority
  if (/next\.?js|app\s*router|server\s*(component|action)/i.test(prompt)) return buildFwResult('nextjs', domainSet);
  if (/\bvue\b|nuxt|pinia|vuex/i.test(prompt)) return buildFwResult('vue', domainSet);
  if (/\bsvelte\b|sveltekit/i.test(prompt)) return buildFwResult('svelte', domainSet);
  if (/\bangular\b|rxjs|ng-/i.test(prompt)) return buildFwResult('angular', domainSet);
  if (/\breact\b|jsx|tsx|shadcn|vite.*react/i.test(prompt)) return buildFwResult('react', domainSet);
  if (/\bpython\b|fastapi|flask|django|pip\b/i.test(prompt)) return buildFwResult('python', domainSet);
  if (/full[\-\s]?stack|backend.*frontend|frontend.*backend/i.test(prompt)) return buildFwResult('fullstack', domainSet);

  // Domain-based inference
  if (domainSet.has('fullstack')) return buildFwResult('fullstack', domainSet);
  if (domainSet.has('nextjs')) return buildFwResult('nextjs', domainSet);

  // Complex apps with auth/payments/database → React (multi-file project)
  const complexSignals = ['auth', 'payments', 'database', 'saas', 'ecommerce'].filter(s => domainSet.has(s as SkillDomain));
  if (complexSignals.length >= 2) return buildFwResult('fullstack', domainSet);
  if (complexSignals.length >= 1) return buildFwResult('react', domainSet);

  // Dashboard/admin → React
  if (/dashboard|admin|panel|manage|crud/i.test(prompt)) return buildFwResult('react', domainSet);

  // Multi-page app → React
  if (/multi.*page|routing|router|navigation.*page/i.test(prompt)) return buildFwResult('react', domainSet);

  // Simple sites: landing, portfolio, single page → HTML
  if (domainSet.has('landing') || domainSet.has('portfolio') || /simple|basic|one.*page|single.*page/i.test(prompt)) return buildFwResult('html', domainSet);

  // API/bot/agent without frontend → Python
  if ((domainSet.has('api') || /bot\b|agent|script|automat/i.test(prompt)) && !domainSet.has('ui-design')) return buildFwResult('python', domainSet);

  // Default: React for most app requests, HTML for simpler things
  const wordCount = prompt.split(/\s+/).length;
  if (wordCount > 40 || d.length >= 3) return buildFwResult('react', domainSet);
  return buildFwResult('html', domainSet);
}

const FW_INSTRUCTIONS: Record<OutputFramework, string> = {
  html: '', // No special instructions needed for HTML — brain handles it
  react: `\n[FRAMEWORK: React + TypeScript + Vite]\nGenerate a COMPLETE multi-file React project. Use TypeScript everywhere (.tsx/.ts). Use shadcn/ui patterns: Button, Card, Input, Dialog, Sheet, Tabs, Badge, Avatar. Use Tailwind CSS utility classes. Use Lucide React icons. Export default function components. Use useState, useEffect, useCallback hooks.\nProject structure: src/main.tsx (entry), src/App.tsx (root), src/components/*.tsx, src/hooks/*.ts, src/lib/utils.ts. Use <<FILE:src/components/Navbar.tsx>> format for EACH file.\nAlso generate: package.json, vite.config.ts, tailwind.config.js, tsconfig.json, postcss.config.js.\n`,
  nextjs: `\n[FRAMEWORK: Next.js 14+ App Router + TypeScript]\nGenerate a COMPLETE multi-file Next.js project. Use TypeScript. Server/Client components (mark "use client" when needed). Use shadcn/ui components + Tailwind CSS. Use Next.js Image, Link, metadata.\nProject structure: app/layout.tsx, app/page.tsx, app/globals.css, components/*.tsx, lib/*.ts. Use <<FILE:app/about/page.tsx>> for routes, <<FILE:components/Header.tsx>> for components.\nAlso generate: package.json, next.config.js, tailwind.config.ts, tsconfig.json.\n`,
  vue: `\n[FRAMEWORK: Vue 3 SFC + TypeScript + Vite]\nGenerate a COMPLETE multi-file Vue 3 project. Use <script setup lang="ts"> syntax. Use Composition API (ref, computed, onMounted, watch). Use Tailwind CSS.\nProject structure: src/App.vue (root), src/main.ts (entry), src/components/*.vue, src/composables/*.ts, src/stores/*.ts (Pinia). Use <<FILE:src/components/Navbar.vue>> format.\nAlso generate: package.json, vite.config.ts, tailwind.config.js.\n`,
  svelte: `\n[FRAMEWORK: Svelte 4 + Vite]\nGenerate a COMPLETE multi-file Svelte project. Use <script> with TypeScript where possible. Use reactive statements ($:). Use Tailwind CSS.\nProject structure: src/App.svelte (root), src/main.js (entry), src/lib/components/*.svelte, src/lib/stores/*.ts. Use <<FILE:src/lib/components/Navbar.svelte>> format.\nAlso generate: package.json, vite.config.js, tailwind.config.js.\n`,
  angular: `\n[FRAMEWORK: Angular 17+ Standalone]\nGenerate a COMPLETE multi-file Angular project. Use standalone components (no NgModules). Use Angular signals where possible. Use TypeScript.\nProject structure: src/app/app.component.ts (root), src/app/components/*.ts, src/app/services/*.ts, src/main.ts (bootstrap). Use <<FILE:src/app/components/header.component.ts>> format.\nAlso generate: package.json, tsconfig.json, angular.json, src/styles.css.\n`,
  python: `\n[FRAMEWORK: Python FastAPI + SQLAlchemy]\nGenerate a COMPLETE multi-file Python backend. Use FastAPI with type hints. Use Pydantic for models. Use SQLAlchemy for ORM. Use async/await.\nProject structure: main.py (entry), app/routes/*.py, app/models/*.py, app/schemas/*.py, app/database.py, app/config.py. Use <<FILE:app/routes/users.py>> format.\nAlso generate: requirements.txt, .env, Dockerfile, README.md.\nFor the frontend, also generate a simple HTML file in static/index.html with Tailwind CSS.\n`,
  fullstack: `\n[FRAMEWORK: Full-Stack — React Frontend + Express/Node Backend]\nGenerate a COMPLETE full-stack project with BOTH frontend and backend code.\nFrontend: React + TypeScript + Vite + Tailwind in src/. Use shadcn/ui patterns.\nBackend: Express + TypeScript in server/. REST API with proper routes, middleware, error handling.\nProject structure: src/main.tsx, src/App.tsx, src/components/*.tsx, server/index.ts, server/routes/*.ts, server/middleware/*.ts.\nUse <<FILE:server/routes/api.ts>> and <<FILE:src/components/Dashboard.tsx>> format.\nAlso generate: package.json (with both deps), vite.config.ts (with proxy), tsconfig.json.\n`,
};

function buildFwResult(fw: OutputFramework, domainSet: Set<string>): { framework: OutputFramework; instructions: string; needsBackend: boolean } {
  const needsBackend = fw === 'fullstack' || fw === 'python' ||
    domainSet.has('api') || domainSet.has('database') || domainSet.has('auth') ||
    domainSet.has('payments') || domainSet.has('fullstack');

  let instructions = FW_INSTRUCTIONS[fw];

  // If backend is needed but framework is pure frontend, add backend instructions
  if (needsBackend && !['fullstack', 'python'].includes(fw)) {
    instructions += `\n[BACKEND REQUIRED — AUTO-DETECTED]\nAlso generate a backend alongside the frontend:\n- server/index.ts (Express entry), server/routes/*.ts, server/middleware/*.ts\n- Use <<FILE:server/routes/api.ts>> format for backend files\n- Include proper error handling, input validation (Zod), and CORS\n- Generate database schema if data persistence is needed\n`;
  }

  return { framework: fw, instructions, needsBackend };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPILED SKILL KNOWLEDGE — Pre-extracted from the top skills
// ═══════════════════════════════════════════════════════════════════════════════

const SKILL_KNOWLEDGE: Record<string, string> = {

  'react': `[SKILL: React Best Practices]
- Use functional components with TypeScript
- Memoize expensive computations: React.memo, useMemo, useCallback
- Lift state up only when needed, prefer composition over prop drilling
- Use Suspense + lazy() for code splitting
- Keys must be stable, unique identifiers (NOT array indices)
- Effects: cleanup subscriptions, avoid setState in uncontrolled effects
- Custom hooks for reusable logic (useLocalStorage, useDebounce, useMediaQuery)
- Error Boundaries for graceful failure recovery
- Use React.forwardRef for reusable components that need ref access`,

  'nextjs': `[SKILL: Next.js Best Practices]
- App Router: Server Components by default, 'use client' only when needed
- Metadata API for SEO (generateMetadata, opengraph-image)
- Server Actions for mutations (form handling, database writes)
- Route segments: loading.tsx, error.tsx, not-found.tsx for UX
- Image optimization: next/image with priority for LCP images
- ISR/SSG for content pages, SSR for personalized pages
- Middleware for auth, redirects, A/B testing
- Parallel routes + intercepting routes for modals`,

  'ui-design': `[SKILL: UI/UX Design Principles]
- Visual hierarchy: size > color > contrast > spacing > typography weight
- 8px grid system for consistent spacing (4px for fine details)
- Limit to 2 font families max (heading + body)
- Color: 60-30-10 rule (60% neutral, 30% secondary, 10% accent)
- Micro-interactions on EVERY interactive element (hover, focus, active states)
- Loading states: skeleton screens > spinners > progress bars
- Empty states: helpful illustration + clear CTA
- Responsive breakpoints: 640 / 768 / 1024 / 1280 / 1536px
- Touch targets minimum 44x44px on mobile
- Contrast ratio: 4.5:1 for normal text, 3:1 for large text (WCAG AA)`,

  'animation': `[SKILL: Animation & Motion Design]
- GSAP for complex timelines, ScrollTrigger for scroll-driven
- Lenis for smooth scrolling (60fps butter-smooth)
- SplitType for per-character/word text animations
- Three.js for 3D hero sections and background effects
- Stagger delays: 0.05-0.15s between elements for natural flow
- Duration: 0.3-0.5s for UI interactions, 0.8-1.2s for page transitions
- Easing: power2.out for entrances, power2.inOut for movements
- will-change/transform for GPU-accelerated animations
- Intersection Observer + threshold for trigger points
- Reduce motion: respect prefers-reduced-motion media query`,

  'accessibility': `[SKILL: Accessibility (WCAG 2.1 AA)]
- Semantic HTML: nav, main, article, section, aside, header, footer
- All images need descriptive alt text (or alt="" for decorative)
- Focus visible on ALL interactive elements (2px solid outline)
- Skip-to-content link as first focusable element
- ARIA: aria-label, aria-describedby, aria-expanded, aria-hidden
- Keyboard: Tab/Shift+Tab navigation, Enter/Space activation, Escape to close
- Live regions: aria-live="polite" for dynamic content, "assertive" for errors
- Forms: associated labels, error messages linked via aria-describedby
- Color: never rely on color alone to convey information
- lang attribute on <html>, correct heading hierarchy (h1 → h2 → h3)`,

  'api': `[SKILL: API Design Principles]
- RESTful: GET (read), POST (create), PUT (replace), PATCH (update), DELETE
- Validate ALL inputs at the boundary (Zod schemas)
- Return consistent error format: { error: string, code: string, details?: any }
- Rate limiting per endpoint category (auth: stricter, read: lenient)
- CORS headers explicit, not wildcard in production
- Pagination: cursor-based for real-time data, offset for static
- Idempotency keys for non-idempotent operations (payments, emails)
- Response compression (gzip/brotli)
- API versioning strategy (URL prefix or header)`,

  'database': `[SKILL: Database Best Practices]
- Row Level Security (RLS) on every table in Supabase
- Indexes on foreign keys and frequently queried columns
- Use transactions for multi-table operations
- Parameterized queries ALWAYS (prevent SQL injection)
- Connection pooling (Supabase uses PgBouncer)
- Migrations versioned and reversible
- Soft deletes (deleted_at timestamp) for important data
- UUID primary keys for distributed systems
- created_at/updated_at timestamps on every table`,

  'auth': `[SKILL: Authentication Best Practices]
- Never store passwords in plain text — use bcrypt/argon2
- JWT: short expiry (15min access, 7d refresh), httpOnly cookies
- Clerk: use middleware for protected routes, clerkClient for server-side
- RBAC: role-based access control with permission checks
- OAuth: state parameter to prevent CSRF
- Session: regenerate ID after login, invalidate on logout
- rate limit login attempts (5 per minute max)
- MFA: TOTP or WebAuthn for high-value accounts`,

  'payments': `[SKILL: Stripe Integration Best Practices]
- Webhook verification with stripe.webhooks.constructEvent()
- Idempotency keys on all create operations
- Use Checkout Sessions for one-time payments
- Use Stripe Billing for subscriptions (Customer Portal for self-service)
- Handle webhook events: checkout.session.completed, invoice.paid, customer.subscription.deleted
- Test with Stripe CLI (stripe listen --forward-to localhost:3000/api/webhook)
- Store Stripe customer ID in your database, link to user
- Price IDs in env vars, not hardcoded`,

  'testing': `[SKILL: Testing Strategy]
- Unit tests: Pure functions, utilities, hooks (Vitest + React Testing Library)
- Integration tests: API routes, form submissions, state transitions
- E2E tests: Critical user journeys (Playwright/Cypress)
- Test pyramid: Many unit > Some integration > Few E2E
- Mock external APIs, don't mock internal modules
- Test error states and edge cases, not just happy paths
- Snapshot tests for UI components (update intentionally, not blindly)
- Coverage targets: 80%+ for critical paths`,

  'security': `[SKILL: Security Essentials]
- Input validation at EVERY boundary (Zod, joi, yup)
- Output encoding: sanitize HTML before rendering (DOMPurify, sanitize-html)
- CSRF: check Origin header on state-changing requests
- CSP headers: script-src 'self', style-src 'self' 'unsafe-inline'
- HTTPS everywhere, HSTS header
- Rate limiting: sliding window per IP/user
- Secrets: environment variables ONLY, never in code
- Dependency auditing: npm audit, Snyk, socket.dev
- Least privilege: minimal API key permissions`,

  'performance': `[SKILL: Web Performance]
- Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Critical CSS inlined, non-critical loaded async
- Images: WebP/AVIF, srcset for responsive, lazy loading below fold
- Code splitting: dynamic imports for routes and heavy components
- Preconnect to critical origins, prefetch likely navigation
- Service worker for caching strategies (stale-while-revalidate)
- Tree-shaking: use named imports, avoid barrel files
- Compress assets: Brotli > gzip for static, gzip for dynamic
- React.memo on components that re-render with same props`,

  'deploy': `[SKILL: Deployment Best Practices]
- Preview deployments for every PR (Vercel automatic)
- Environment variables: separate for dev/staging/prod
- Build checks: TypeScript + lint + test before deploy
- Rollback strategy: keep previous deployment ready
- CDN: static assets cached at edge
- Monitoring: error tracking (Sentry), performance (WebVitals), uptime
- Database migrations run before app deployment
- Feature flags for gradual rollouts`,

  'enterprise-agent': `[SKILL: Enterprise Agent Architecture — Google/OpenAI]
- Agent = Model + Tools + Orchestration Layer
- AgentOps: instrument traces, track goal completion, implement feedback loops
- Single-agent first — split only when complexity demands
- Layered guardrails: input validation → tool safeguards → output checks
- Tool risk rating: Low (read) / Medium (write reversible) / High (irreversible)
- Success metrics: goal completion → code quality → user satisfaction → latency
- Prompt engineering: few-shot examples, CoT for complex tasks, ReAct for tool use
- Human-in-the-loop for high-stakes actions (deploy, payments)`,

  'enterprise-prompt': `[SKILL: Enterprise Prompt Engineering — Google/Anthropic]
- 6 techniques: Context, Examples, Constraints, Steps, Think first, Role
- Temperature 0 for deterministic (code), 0.7 for creative (design)
- Instructions > Constraints: tell what TO do, not what NOT to do
- Few-shot: minimum 3-5 examples for complex tasks
- Chain of Thought: "Let's think step by step" for reasoning tasks
- Output format: JSON for structured data, Markdown for explanations
- Variables in prompts for reusability: {framework}, {style}, {content}
- Document every prompt iteration with results`,
};

/**
 * Get compiled skill knowledge for detected domains.
 * NOW reads REAL skill files from .agents/skills/ (pre-compiled at build time).
 * Falls back to hardcoded knowledge if compiled skills are unavailable.
 */
export function getSkillKnowledge(domains: DomainMatch[]): string {
  const knowledge: string[] = [];

  // Always include enterprise patterns for quality
  knowledge.push(SKILL_KNOWLEDGE['enterprise-agent']);
  knowledge.push(SKILL_KNOWLEDGE['enterprise-prompt']);

  // Load REAL skills from compiled skill files (from .agents/skills/)
  try {
    const { getCompiledSkillsForDomains } = require('@/lib/compiled-skills');
    const domainNames = domains.slice(0, 6).map(d => d.domain);
    const realSkills = getCompiledSkillsForDomains(domainNames, 12000);
    if (realSkills && realSkills.length > 100) {
      knowledge.push(`\n# REAL SKILL KNOWLEDGE (from .agents/skills/ — ${domainNames.length} domains)\n` + realSkills);
      return knowledge.join('\n\n');
    }
  } catch {
    // Compiled skills not available, fall back to hardcoded
  }

  // Fallback: use hardcoded skill knowledge  
  const seen = new Set<string>();

  // Map domains to skill knowledge keys
  const DOMAIN_TO_SKILL: Record<string, string[]> = {
    'react': ['react'],
    'nextjs': ['nextjs', 'react'],
    'vue': ['react'], // Similar component patterns
    'svelte': ['react'],
    'angular': ['react'],
    'ui-design': ['ui-design'],
    'animation': ['animation'],
    'accessibility': ['accessibility'],
    'api': ['api'],
    'database': ['database'],
    'auth': ['auth'],
    'payments': ['payments'],
    'testing': ['testing'],
    'security': ['security'],
    'performance': ['performance'],
    'ai-integration': ['enterprise-agent'],
    'deploy': ['deploy'],
    'devops': ['deploy'],
    'ecommerce': ['payments', 'database'],
    'saas': ['auth', 'database', 'payments'],
    'portfolio': ['ui-design', 'animation'],
    'landing': ['ui-design', 'animation', 'performance'],
    'fullstack': ['api', 'database', 'react'],
    'mobile': ['performance', 'accessibility'],
  };

  for (const match of domains.slice(0, 6)) { // Top 6 domains
    const skillKeys = DOMAIN_TO_SKILL[match.domain] || [];
    for (const key of skillKeys) {
      if (!seen.has(key) && SKILL_KNOWLEDGE[key]) {
        seen.add(key);
        knowledge.push(SKILL_KNOWLEDGE[key]);
      }
    }
  }

  return knowledge.join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT ANALYSIS — Claude Code-level reasoning before generation
// ═══════════════════════════════════════════════════════════════════════════════

export interface PromptAnalysis {
  domains: DomainMatch[];
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  skillContext: string;
  executionPlan: string;
  qualityGates: string[];
  enhancedPrompt: string;
}

/**
 * Analyze a user prompt and produce a Claude Code-quality execution plan.
 * This is the core brain that enriches every generation.
 */
export function analyzePrompt(userPrompt: string, workspaceContext?: string): PromptAnalysis {
  const domains = detectDomains(userPrompt);
  const complexity = assessComplexity(userPrompt, domains);
  const skillContext = getSkillKnowledge(domains);
  const executionPlan = buildExecutionPlan(userPrompt, domains, complexity);
  const qualityGates = buildQualityGates(domains, complexity);
  const enhancedPrompt = enrichPrompt(userPrompt, domains, executionPlan, workspaceContext);

  return {
    domains,
    complexity,
    skillContext,
    executionPlan,
    qualityGates,
    enhancedPrompt,
  };
}

function assessComplexity(prompt: string, domains: DomainMatch[]): 'simple' | 'moderate' | 'complex' | 'enterprise' {
  const wordCount = prompt.split(/\s+/).length;
  const domainCount = domains.length;

  if (domainCount >= 5 || wordCount > 200) return 'enterprise';
  if (domainCount >= 3 || wordCount > 80) return 'complex';
  if (domainCount >= 2 || wordCount > 30) return 'moderate';
  return 'simple';
}

function buildExecutionPlan(prompt: string, domains: DomainMatch[], complexity: string): string {
  const steps: string[] = [];
  const domainNames = domains.map(d => d.domain);

  // Phase 1: Analysis (from Claude Code — always analyze before coding)
  steps.push(`[PHASE 1 — ANALYSIS] Domains: ${domainNames.slice(0, 5).join(', ')} | Complexity: ${complexity}. Understand the request fully before writing code.`);

  // Phase 2: Architecture (only for complex+ tasks)
  if (complexity === 'enterprise' || complexity === 'complex') {
    steps.push('[PHASE 2 — ARCHITECTURE] Define file structure, component hierarchy, data flow, and API contracts BEFORE coding. Read existing code before modifying.');
  }

  // Phase 3: Implementation priorities
  const priorities: string[] = [];
  if (domainNames.includes('ui-design') || domainNames.includes('animation')) priorities.push('Visual impact first — hero + animations + micro-interactions');
  if (domainNames.includes('api') || domainNames.includes('database')) priorities.push('Data layer — schemas, API routes, database structure');
  if (domainNames.includes('auth')) priorities.push('Auth flow — protected routes, session management');
  if (domainNames.includes('payments')) priorities.push('Payment integration — Stripe Checkout, webhooks');
  if (domainNames.includes('security')) priorities.push('Security — input validation, XSS prevention, CSRF protection');
  if (priorities.length === 0) priorities.push('Core UI + functionality');
  steps.push(`[PHASE 3 — BUILD] ${priorities.join(' → ')}. Don't over-engineer. Simplest approach first.`);

  // Phase 4: Quality + Verification (from Claude Code — verify before reporting done)
  steps.push('[PHASE 4 — VERIFY] Check: complete code (no TODOs), no security vulnerabilities, responsive design, proper error states. Report outcomes faithfully.');

  return steps.join('\n');
}

function buildQualityGates(domains: DomainMatch[], complexity: string): string[] {
  const gates: string[] = [
    'Valid HTML5 structure (doctype, html, head, body)',
    'No JavaScript errors in console',
    'Responsive: works on mobile (375px) + desktop (1440px)',
  ];

  const domainNames = new Set(domains.map(d => d.domain));

  if (domainNames.has('accessibility')) {
    gates.push('WCAG 2.1 AA: proper headings, alt text, keyboard navigation, focus visible');
  }
  if (domainNames.has('ui-design') || domainNames.has('animation')) {
    gates.push('Visual: smooth animations (60fps), consistent spacing, cohesive color palette');
  }
  if (domainNames.has('performance')) {
    gates.push('Performance: LCP < 2.5s, no layout shifts, optimized images');
  }
  if (domainNames.has('security')) {
    gates.push('Security: input validation, XSS prevention, CSRF protection');
  }
  if (complexity === 'complex' || complexity === 'enterprise') {
    gates.push('Architecture: clean separation, reusable components, proper error handling');
  }

  return gates;
}

function enrichPrompt(
  userPrompt: string,
  domains: DomainMatch[],
  executionPlan: string,
  workspaceContext?: string,
): string {
  const parts: string[] = [];

  // Chain of Thought reasoning injection
  parts.push(`[CLAUDE CODE BRAIN — ENHANCED GENERATION]`);
  parts.push(executionPlan);

  // Domain-specific directives
  const domainNames = new Set(domains.map(d => d.domain));
  if (domainNames.has('animation')) {
    parts.push('[DIRECTIVE] Use GSAP + Lenis + SplitType for animations. No CSS-only animations for hero sections.');
  }
  if (domainNames.has('ui-design')) {
    parts.push('[DIRECTIVE] 10K€ studio quality: visual hierarchy, micro-interactions, consistent spacing, premium feel.');
  }
  if (domainNames.has('accessibility')) {
    parts.push('[DIRECTIVE] WCAG 2.1 AA: semantic HTML, keyboard navigation, ARIA labels, focus management.');
  }
  if (domainNames.has('ecommerce') || domainNames.has('saas')) {
    parts.push('[DIRECTIVE] Production-ready: error states, loading states, empty states, edge cases handled.');
  }

  // The actual user request
  parts.push('');
  parts.push(userPrompt);

  // Workspace context if available
  if (workspaceContext) {
    parts.push('');
    parts.push(workspaceContext);
  }

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TERMINAL CLAUDE CODE MODE — Natural language → Actions
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClaudeCodeAction {
  type: 'create_file' | 'edit_file' | 'delete_file' | 'run_command' | 'explain' | 'generate';
  target?: string;       // file path or command
  content?: string;      // file content or explanation
  reasoning?: string;    // why this action
}

/**
 * Build the system prompt for Claude Code terminal mode.
 * The AI acts as Claude Code — analyzing, planning, executing via actions.
 */
export function buildTerminalModePrompt(
  projectFiles: Record<string, string>,
  terminalHistory: string[],
): string {
  const fileList = Object.keys(projectFiles);
  const recentHistory = terminalHistory.slice(-20).join('\n');

  return `You are Claude Code running inside Aurion Studio's terminal.
You have FULL CONTROL of the project. Analyze requests and execute actions.

# PROJECT FILES (${fileList.length} files)
${fileList.slice(0, 50).join('\n')}${fileList.length > 50 ? `\n... and ${fileList.length - 50} more` : ''}

# RECENT TERMINAL HISTORY
${recentHistory || '(empty)'}

# RESPONSE FORMAT
Respond with actions using these tags:
- <<FILE:path>>content<</FILE>> — Create or overwrite a file
- <<TERMINAL:command>> — Execute a terminal command  
- <<EXPLAIN>>text<</EXPLAIN>> — Explain what you're doing

RULES:
- Analyze the request thoroughly before acting
- Show your reasoning in <<EXPLAIN>> blocks
- Execute ALL necessary actions (don't leave things half-done)
- If modifying existing files, include the FULL file content
- Be proactive: if user says "add a navbar", also update imports and routes
- Use the project's existing patterns and conventions`;
}

/**
 * Parse Claude Code terminal mode response into structured actions.
 */
export function parseTerminalActions(response: string): ClaudeCodeAction[] {
  const actions: ClaudeCodeAction[] = [];

  // Parse <<FILE:path>>content<</FILE>>
  const fileRegex = /<<FILE:([^>]+)>>([\s\S]*?)<<\/FILE>>/g;
  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    actions.push({
      type: 'create_file',
      target: match[1].trim(),
      content: match[2],
      reasoning: 'File created/updated via Claude Code terminal',
    });
  }

  // Parse <<TERMINAL:command>>
  const termRegex = /<<TERMINAL:([^>]+)>>/g;
  while ((match = termRegex.exec(response)) !== null) {
    actions.push({
      type: 'run_command',
      target: match[1].trim(),
      reasoning: 'Command executed via Claude Code terminal',
    });
  }

  // Parse <<EXPLAIN>>text<</EXPLAIN>>
  const explainRegex = /<<EXPLAIN>>([\s\S]*?)<<\/EXPLAIN>>/g;
  while ((match = explainRegex.exec(response)) !== null) {
    actions.push({
      type: 'explain',
      content: match[1].trim(),
    });
  }

  // If no structured actions found, treat entire response as explanation
  if (actions.length === 0 && response.trim()) {
    actions.push({
      type: 'explain',
      content: response.trim(),
    });
  }

  return actions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTINUATION INTELLIGENCE — From Claude Code's tokenBudget.ts
// Detects diminishing returns to avoid runaway continuation loops
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContinuationTracker {
  continuationCount: number;
  lastDeltaChars: number;
  lastTotalChars: number;
  startedAt: number;
}

const COMPLETION_THRESHOLD = 0.9;    // 90% of budget = maybe stop
const DIMINISHING_THRESHOLD = 500;   // Low delta = model running out of ideas

export function createContinuationTracker(): ContinuationTracker {
  return { continuationCount: 0, lastDeltaChars: 0, lastTotalChars: 0, startedAt: Date.now() };
}

/**
 * Check if continuation should proceed or stop.
 * From Claude Code's checkTokenBudget — 3-tier strategy:
 * - < 90% budget: continue
 * - 90-100%: check diminishing returns
 * - diminishing (3+ continuations + low delta): stop
 */
export function checkContinuation(
  tracker: ContinuationTracker, 
  currentChars: number, 
  budget: number
): { action: 'continue' | 'stop'; reason: string } {
  const pct = (currentChars / budget) * 100;
  const delta = currentChars - tracker.lastTotalChars;

  const isDiminishing = 
    tracker.continuationCount >= 3 &&
    delta < DIMINISHING_THRESHOLD &&
    tracker.lastDeltaChars < DIMINISHING_THRESHOLD;

  tracker.lastDeltaChars = delta;
  tracker.lastTotalChars = currentChars;
  tracker.continuationCount++;

  if (isDiminishing) {
    return { action: 'stop', reason: `Diminishing returns after ${tracker.continuationCount} continuations (delta: ${delta} chars)` };
  }

  if (currentChars < budget * COMPLETION_THRESHOLD) {
    return { action: 'continue', reason: `${pct.toFixed(0)}% of ${budget} char budget used` };
  }

  return { action: 'stop', reason: `Budget ${pct.toFixed(0)}% consumed` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT SECTION MEMOIZATION — From Claude Code's systemPromptSections.ts
// Cache static prompt sections, recompute dynamic ones per request
// ═══════════════════════════════════════════════════════════════════════════════

interface PromptSection {
  name: string;
  compute: () => string | null;
  cached: string | null | undefined;  // undefined = not yet computed
  cacheBreak: boolean;                // true = recompute every request
}

const sectionRegistry: PromptSection[] = [];

/**
 * Register a memoized prompt section (computed once, cached until reset).
 * From Claude Code's systemPromptSection() — static content that doesn't change.
 */
export function registerStaticSection(name: string, compute: () => string | null): void {
  sectionRegistry.push({ name, compute, cached: undefined, cacheBreak: false });
}

/**
 * Register a volatile prompt section (recomputed every request).
 * From Claude Code's DANGEROUS_uncachedSystemPromptSection() — for dynamic per-request content.
 */
export function registerDynamicSection(name: string, compute: () => string | null): void {
  sectionRegistry.push({ name, compute, cached: undefined, cacheBreak: true });
}

/**
 * Resolve all registered sections — cache hits for static, recompute for dynamic.
 */
export function resolveAllSections(): string[] {
  const results: string[] = [];
  for (const section of sectionRegistry) {
    if (section.cacheBreak || section.cached === undefined) {
      section.cached = section.compute();
    }
    if (section.cached !== null) {
      results.push(section.cached);
    }
  }
  return results;
}

/**
 * Clear all cached sections (called on conversation reset).
 */
export function clearSectionCache(): void {
  for (const section of sectionRegistry) {
    section.cached = undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVISOR PATTERN — From Claude Code's advisor.ts
// Self-review gate: model checks its own work before reporting completion
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build an advisor-style review prompt for quality checking generated code.
 * From Claude Code's advisor tool — a "stronger reviewer" that evaluates work.
 * Used in quality-fix and auto-fix flows.
 */
export function buildAdvisorReviewPrompt(code: string, originalRequest: string): string {
  const codePreview = code.slice(0, 3000);
  return `# ADVISOR REVIEW — Self-Check Before Completion
You are reviewing code that was generated for this request: "${originalRequest.slice(0, 200)}"

## Code Preview (first 3000 chars):
${codePreview}

## Review Checklist:
1. Does the code address the ACTUAL request? (not a generic template)
2. Is the code complete? (no TODO, no "implement here", no truncated sections)
3. Security: any injection, XSS, or OWASP vulnerabilities?
4. Are there obvious bugs? (null refs, missing imports, typos in variable names)
5. Does it follow the existing codebase patterns?

## Verdict:
- PASS: Code is ready to ship
- FAIL + specific issues: What needs fixing and where
- PARTIAL + gaps: What was done well, what's missing`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COORDINATOR PATTERN — From Claude Code's coordinatorMode.ts
// Sub-agent context injection: tell workers what tools they have
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build context for sub-agent workers (A/B testing, parallel generation).
 * From Claude Code's getCoordinatorUserContext — workers learn available tools via injection.
 */
export function buildWorkerContext(workerRole: 'model-b' | 'quality-fixer' | 'continuation' | 'terminal'): string {
  const toolsByRole: Record<string, string[]> = {
    'model-b': ['generate-code', 'analyze-prompt', 'quality-check'],
    'quality-fixer': ['edit-code', 'quality-check', 'validate-output'],
    'continuation': ['generate-code', 'file-inventory', 'validate-output'],
    'terminal': ['create-file', 'edit-file', 'run-command', 'explain'],
  };

  const tools = toolsByRole[workerRole] || toolsByRole['model-b'];
  return `# WORKER CONTEXT (role: ${workerRole})
Available tools: ${tools.join(', ')}
Rules:
- Execute directly — do NOT spawn sub-workers
- Stay focused on the assigned task scope
- Report results concisely: what changed, what was done, any issues
- If blocked, report the blocker instead of guessing`;
}
