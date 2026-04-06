# AURION STUDIO — CONTEXTE PERMANENT

## CE QU'EST CE PROJET
App builder AI : décris ton app → code généré → preview live → deploy Vercel.
Monorepo Next.js 16 unique déployé sur Vercel (PAS de micro-services séparés).
URL : https://claudable-web-gray.vercel.app
GitHub : udbfd68-cell/AURION-APP (branche main)

## STACK TECHNIQUE
- Next.js 16 + React 19 + TypeScript 5.7 (strict) + Tailwind 3
- AI : Anthropic (Claude), Google AI, Groq, OpenAI, xAI — via API routes
- Editor : Monaco Editor (@monaco-editor/react) + WebContainers API
- Database : Supabase (PostgreSQL) — collaboration + persistence
- Auth : Clerk (@clerk/nextjs) — conditional wrapper
- Payments : Stripe — route API configurée
- Deploy : Vercel deploy API
- State : Zustand (usePanelStore + useAppStore), hooks custom
- Animations : framer-motion
- Validation : Zod 4 — schemas sur toutes les API routes
- Sécurité : rate-limiter, sanitize-html, CSRF origin check
- Tests : Vitest + happy-dom + @testing-library (201 tests, 24 fichiers)
- CI/CD : GitHub Actions (lint → typecheck → test → build)

## COMMANDES ESSENTIELLES
```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npx tsc --noEmit     # Typecheck (0 erreurs actuellement)
npm test             # Vitest run (201 tests passent)
npm run lint         # ESLint
npm run format       # Prettier
npm run analyze      # Bundle analyzer (ANALYZE=true)
```

## ARCHITECTURE (état actuel)
```
app/page.tsx           170 lignes — orchestrateur, délègue tout aux hooks/composants
app/layout.tsx         62 lignes — RootLayout avec Clerk conditionnel + WebVitals
app/error.tsx          — Error boundary Next.js (role="alert")
app/not-found.tsx      — Custom 404
app/api/               46 routes — toutes avec Zod + rate-limit + CSRF
components/
  CinematicBuilder.tsx  811 lignes — React.memo wrappé
  Overlays.tsx          57 lignes — orchestrateur de 19 sous-composants
  WebVitals.tsx         — CLS/INP/LCP/FCP/TTFB monitoring
  ErrorBoundary.tsx     — class-based error boundary
  TopBar.tsx            — aria-labels, role="banner"
  ChatPanel.tsx         — role="log", aria-live="polite"
  PreviewPanel.tsx      — role="region"
  CodeEditorPanel.tsx   — role="region"
  overlays/             19 fichiers — React.memo sur les 4 plus gros
    InspectorPanels.tsx  984 lignes — memo()
    EnvPanel.tsx         775 lignes — memo()
    BuilderPanels.tsx    380 lignes — memo()
    DevToolsPanels.tsx   326 lignes — memo()
    + 15 autres (40-215 lignes chacun)
hooks/                  27 hooks custom
stores/
  usePanelStore.ts      ~80 boolean panel flags + setPanel
  useAppStore.ts
lib/
  api-utils.ts          — apiError(), validateOrigin(), parseBody()
  api-schemas.ts        — Zod schemas pour toutes les routes
  rate-limiter.ts       — sliding window (ai:20/min, heavy:10/min, deploy:5/min)
  sanitize.ts           — sanitize() + sanitizeForPreview()
  env-validation.ts     — Zod schema pour 24+ env vars
  types.ts              — interfaces Message, ProjectFile, VirtualFS, etc.
  templates-data.tsx    7,107 lignes — données templates
  system-prompts.ts     2,227 lignes
__tests__/              24 fichiers, 201 tests
.agents/skills/         2,221 skills installées (83 créateurs officiels + enterprise)
.github/workflows/ci.yml — lint → typecheck → test → build
```

## SYSTÈME DE SKILLS (2,217 installées)

> **2,221 skills** dans `.agents/skills/` — catalogue complet dans `.agents/SKILLS_CATALOG.md`
> Index JSON dans `.agents/skills-index.json` — utilise `/project:skills` pour chercher

### ROUTAGE AUTOMATIQUE PAR DOMAINE
Quand tu travailles sur un domaine, **consulte d'abord le skill correspondant** :

| Domaine | Skills clés à lire | Fichier |
|---|---|---|
| **React/Next.js** | `vercel-react-best-practices`, `next-best-practices` | `.agents/skills/vercel-react-best-practices/SKILL.md` |
| **UI/Design** | `frontend-design`, `web-design-guidelines`, `ui-ux-pro-max` | `.agents/skills/frontend-design/SKILL.md` |
| **shadcn** | `shadcn` | `.agents/skills/shadcn/SKILL.md` |
| **Composants** | `vercel-composition-patterns`, `building-components` | `.agents/skills/vercel-composition-patterns/SKILL.md` |
| **API Routes** | `api-design-principles`, `claude-api` | `.agents/skills/api-design-principles/SKILL.md` |
| **Supabase** | `supabase`, `supabase-postgres-best-practices` | `.agents/skills/supabase/SKILL.md` |
| **Auth (Clerk)** | `clerk`, `auth0-nextjs`, `better-auth-best-practices` | `.agents/skills/clerk/SKILL.md` |
| **Stripe** | `stripe-best-practices`, `stripe-projects` | `.agents/skills/stripe-best-practices/SKILL.md` |
| **Tests** | `webapp-testing`, `systematic-testing` | `.agents/skills/webapp-testing/SKILL.md` |
| **Sécurité** | `security-review`, `semgrep`, `sentry-for-ai` | `.agents/skills/security-review/SKILL.md` |
| **Deploy** | `deploy-to-vercel`, `vercel-cli-with-tokens` | `.agents/skills/deploy-to-vercel/SKILL.md` |
| **Performance** | `analyze-bundle`, `web-vitals` | `.agents/skills/analyze-bundle/SKILL.md` |
| **AI/LLM** | `claude-api`, `openai-agents`, `langchain-skills` | `.agents/skills/claude-api/SKILL.md` |
| **Accessibilité** | `accessibility`, `accessibility-aria-expert` | `.agents/skills/accessibility/SKILL.md` |
| **TypeScript** | `typescript-advanced-types`, `code-quality` | `.agents/skills/typescript-advanced-types/SKILL.md` |
| **Git/CI** | `github-actions-cicd`, `conventional-commits` | `.agents/skills/github-actions-cicd/SKILL.md` |
| **Scraping** | `firecrawl`, `browser-use`, `agent-browser` | `.agents/skills/firecrawl/SKILL.md` |
| **Email** | `resend`, `email-best-practices` | `.agents/skills/email-best-practices/SKILL.md` |
| **Debug** | `systematic-debugging`, `sentry-for-claude` | `.agents/skills/systematic-debugging/SKILL.md` |
| **Planning** | `brainstorming`, `ultrathink` | `.agents/skills/brainstorming/SKILL.md` |
| **Agent Patterns** | `enterprise-agent-patterns` | `.agents/skills/enterprise-agent-patterns/SKILL.md` |
| **Prompt Eng** | `enterprise-prompt-engineering` | `.agents/skills/enterprise-prompt-engineering/SKILL.md` |
| **Guardrails/Eval** | `enterprise-guardrails-eval` | `.agents/skills/enterprise-guardrails-eval/SKILL.md` |
| **Enterprise AI** | `enterprise-ai-use-cases` | `.agents/skills/enterprise-ai-use-cases/SKILL.md` |

### COMMENT UTILISER
1. **Avant de coder** → lis le SKILL.md du domaine concerné  
2. **Si tu ne sais pas quel skill** → `cat .agents/skills-index.json | grep <keyword>`
3. **Catalogue complet** → `.agents/SKILLS_CATALOG.md`

## ÉTAT DE SANTÉ
- TypeScript : **0 erreurs** (npx tsc --noEmit)
- Tests : **201 passent** / 24 fichiers (npx vitest run)
- Build : **passe** (npm run build)
- Sécurité : Zod + rate-limit + CSRF sur chaque route API
- Accessibilité : lang, skip-to-content, aria-labels, role="dialog"
- Performance : React.memo x12, dynamic imports, WebVitals

## POINTS À AMÉLIORER (honnête)
1. **169 usages de `any`** — surtout `{ p: any }` dans les overlays
2. **81% des hooks non testés** (22/27) — useChat, usePageState, useWorkspace...
3. **94% des composants non testés** (16/17) — seul ErrorBoundary testé
4. **0 tests E2E** — pas de Playwright/Cypress
5. **8 fichiers lib/ > 1000 lignes** — templates-data (7107L), creative-studio (3480L)...
6. **Rate limiter in-memory** — useless sur Vercel serverless
7. **Pas de CSP header** ni HSTS  
8. **Pas de pre-commit hooks** (husky/lint-staged)

## RÈGLES ABSOLUES
1. `npx tsc --noEmit` = 0 erreurs AVANT de dire "c'est bon"
2. JAMAIS de @ts-nocheck
3. Éviter `any` — utiliser les types de lib/types.ts
4. `npm test` doit passer après changements
5. Ne RIEN supprimer sans vérifier — l'app a 150+ features
6. Lire un fichier AVANT de le modifier

## PRINCIPES ENTERPRISE (Google, OpenAI, Anthropic)

### Architecture Agent (Google Agents Companion v2)
- **3 piliers** : Model + Tools + Orchestration Layer
- **AgentOps** = DevOps + MLOps + tool management + memory + task decomposition
- **Évaluation** : Capabilities → Trajectory → Final Response → Human-in-the-Loop
- **Multi-agent** : Sequential, Hierarchical, Collaborative, Competitive, Diamond, Peer-to-Peer
- Détails complets → `.agents/skills/enterprise-agent-patterns/SKILL.md`

### Prompt Engineering (Google Whitepaper v4 + Anthropic 6 Techniques)
- **Techniques** : Zero-shot → Few-shot → CoT → Self-consistency → ToT → ReAct → APE
- **6 techniques Anthropic** : Context, Examples, Constraints, Steps, Think first, Role
- **Top rules** : Fournir des exemples, simplicité, spécificité, instructions > contraintes
- Détails complets → `.agents/skills/enterprise-prompt-engineering/SKILL.md`

### Guardrails & Safety (OpenAI Practical Guide)
- **Défense en couches** : Relevance → Safety → PII → Moderation → Tool safeguards → Rules → Output validation
- **Tool risk rating** : Low (read) / Medium (write reversible) / High (irreversible/financial)
- **Human intervention** : Failure thresholds + high-risk actions
- Détails complets → `.agents/skills/enterprise-guardrails-eval/SKILL.md`

### Enterprise AI Adoption (OpenAI + Google 1001 Use Cases)
- **7 leçons** : Evals first, Embed in products, Start now, Fine-tune, Experts lead, Unblock devs, Bold automation
- **6 primitives** : Content creation, Research, Coding, Data analysis, Ideation, Automations  
- **Priorisation** : Impact/Effort matrix → Quick wins first
- Détails complets → `.agents/skills/enterprise-ai-use-cases/SKILL.md`

## ENV VARS NÉCESSAIRES
```
ANTHROPIC_API_KEY, GOOGLE_AI_STUDIO_KEY, GROQ_API_KEY
XAI_API_KEY, OPENAI_API_KEY, MISTRAL_API_KEY
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
VERCEL_DEPLOY_TOKEN, GITHUB_TOKEN
FIRECRAWL_API_KEY, GOOGLE_STITCH_API_KEY
```

## QUAND LES TOKENS S'ÉPUISENT
```
⚠️ PAUSE TOKENS
✅ Fait : [liste précise]
📍 Reprendre : [fichier exact] → [ligne exacte] → [action exacte]
→ "continuer"
```
