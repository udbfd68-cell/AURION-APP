/**
 * Claude Code Brain Engine v1.0
 * 
 * The intelligence layer that makes Aurion's AI output Claude Code-quality.
 * Analyzes every prompt → detects domains → injects skill knowledge → applies enterprise patterns.
 * 
 * This is NOT theater — it's a real prompt enrichment pipeline:
 * 1. Domain Detection: Classify what the user is asking for
 * 2. Skill Routing: Inject relevant best practices from 2,221 skills
 * 3. Enterprise Patterns: Apply Google/OpenAI/Anthropic agent engineering principles
 * 4. Multi-Step Planning: Break complex prompts into execution phases
 * 5. Quality Gates: Define success criteria before generation
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
 * Returns relevant best practices text to inject into the system prompt.
 */
export function getSkillKnowledge(domains: DomainMatch[]): string {
  const knowledge: string[] = [];
  const seen = new Set<string>();

  // Always include enterprise patterns for quality
  knowledge.push(SKILL_KNOWLEDGE['enterprise-agent']);
  knowledge.push(SKILL_KNOWLEDGE['enterprise-prompt']);

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

  // Phase 1: Analysis
  steps.push(`[PHASE 1 — ANALYSIS] Domains detected: ${domainNames.slice(0, 5).join(', ')}. Complexity: ${complexity}.`);

  // Phase 2: Architecture
  if (complexity === 'enterprise' || complexity === 'complex') {
    steps.push('[PHASE 2 — ARCHITECTURE] Define file structure, component hierarchy, data flow, and API contracts BEFORE coding.');
  }

  // Phase 3: Implementation priorities
  const priorities: string[] = [];
  if (domainNames.includes('ui-design') || domainNames.includes('animation')) priorities.push('Visual impact first — hero + animations + micro-interactions');
  if (domainNames.includes('api') || domainNames.includes('database')) priorities.push('Data layer — schemas, API routes, database structure');
  if (domainNames.includes('auth')) priorities.push('Auth flow — protected routes, session management');
  if (domainNames.includes('payments')) priorities.push('Payment integration — Stripe Checkout, webhooks');
  if (priorities.length === 0) priorities.push('Core UI + functionality');
  steps.push(`[PHASE 3 — BUILD] ${priorities.join(' → ')}`);

  // Phase 4: Quality
  steps.push('[PHASE 4 — QUALITY] Accessibility audit, responsive check, performance optimization, error handling.');

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
