# AURION STUDIO (fork de Claudable) — CONTEXTE PERMANENT

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
- Auth : Clerk (@clerk/nextjs) — pas encore wired dans l'app
- Payments : Stripe — pas encore wired
- Deploy : Vercel deploy API
- State : 305 useState dans page.tsx (Zustand installé mais NON branché)
- Animations : framer-motion

## COMMANDES ESSENTIELLES
```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npx tsc --noEmit     # Typecheck (TOUJOURS vérifier avant commit)
```

## ARCHITECTURE RÉELLE (pas idéale)
```
app/page.tsx          7,953 lignes — GOD COMPONENT (305 useState, tout est là)
app/page.tsx.bak      11,525 lignes — backup avant extraction
components/
  LandingView.tsx     162 lignes — landing page JSX (@ts-nocheck)
  Overlays.tsx        3,665 lignes — 60+ modals/panels (@ts-nocheck)
  TerminalPanel.tsx   85 lignes — CASSÉ (30 erreurs TS)
  CinematicBuilder.tsx 811 lignes
hooks/
  useChat.ts          388 lignes — chat streaming logic
  useClone.ts         254 lignes — clone website logic
  useTerminal.ts      525 lignes — terminal emulator
  useStitch.ts        113 lignes — Google Stitch integration
  useDeploy.ts        55 lignes — Vercel deploy
  useWebContainer.ts  — WebContainer lifecycle
  useCollaboration.ts — collaboration (Supabase realtime)
stores/
  useAppStore.ts      99 lignes — CODE MORT (0 imports)
  useChatStore.ts     106 lignes — CODE MORT (0 imports)
  useEditorStore.ts   170 lignes — CODE MORT (0 imports)
  usePanelStore.ts    89 lignes — CODE MORT (0 imports)
lib/
  page-helpers.tsx    — icons, constants, helpers (~2000 lignes)
  cdn-models.ts       — AI models list + CDN URLs
  client-utils.ts     — fetchWithRetry, idb, buildFileTree
  system-prompts.ts   2,552 lignes — system prompts for AI
  templates-data.tsx  7,456 lignes — app templates
  database-live.ts    689 lignes — SQL engine + schema
  backend-generator.ts 1,440 lignes — backend code gen
  collaboration-engine.ts 555 lignes
  research-orchestrator.ts 499 lignes
app/api/
  40 API routes (anthropic, gemini, groq, openai, stripe, etc.)
```

## PROBLÈMES CRITIQUES ACTUELS
1. page.tsx = 7,953 lignes avec 305 useState — GOD COMPONENT
2. @ts-nocheck sur LandingView.tsx et Overlays.tsx — types désactivés
3. TerminalPanel.tsx — 30 erreurs TS (variables manquantes)
4. Stores Zustand créés mais JAMAIS importés/utilisés
5. pageProps: Record<string, any> = { 889 variables } — aucun type safety
6. 10 scripts .mjs/.cjs orphelins à la racine
7. page.tsx.bak + page.tsx.new — fichiers temp non nettoyés
8. Clerk installé mais auth non wired
9. Stripe installé mais billing non wired
10. 0 tests (pas de Jest, pas de Playwright, pas de Vitest)

## RÈGLES ABSOLUES
1. `npx tsc --noEmit` = 0 erreurs AVANT de dire "c'est bon"
2. JAMAIS de @ts-nocheck — c'est tricher, pas coder
3. JAMAIS de `any` pour contourner TypeScript
4. Tester le build (`npm run build`) après changements majeurs
5. Ne RIEN supprimer sans vérifier — l'app a 150+ features
6. Node.js (.mjs) pour les scripts de transformation, JAMAIS PowerShell
7. Lire un fichier AVANT de le modifier
8. Lire PROGRESS.md avant de commencer, le mettre à jour avant d'arrêter

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
