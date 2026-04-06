# AURION STUDIO — DÉCISIONS D'ARCHITECTURE

## État actuel (réalité, pas objectif)
- **Monolithe Next.js 16** : tout dans une seule app, déployée sur Vercel
- **God component** : app/page.tsx = 7,953 lignes, 305 useState
- **Pas de séparation front/back** : API routes Next.js dans app/api/
- **Pas d'auth** : Clerk installé, non branché
- **Pas de tests** : 0 tests de tout type

## Stack technique confirmée
| Layer | Choix | Raison |
|-------|-------|--------|
| Framework | Next.js 16 (App Router) | SSR + API routes + Vercel natif |
| React | v19 | Concurrent features |
| TypeScript | 5.7 strict | Type safety (quand pas @ts-nocheck...) |
| Styling | Tailwind 3 | Utility-first, inline dans JSX |
| State (actuel) | 305 useState | Legacy, à migrer |
| State (cible) | Zustand | Installé, stores créés, non branché |
| Editor | Monaco Editor | Code editing, syntax highlight, IntelliSense |
| Terminal | WebContainers API | npm/node in-browser sandboxed |
| AI | Multi-provider REST | Claude, Gemini, Groq, OpenAI via API routes |
| Animations | framer-motion | AnimatePresence, motion.div |
| Database | Supabase | PostgreSQL + Realtime + Storage |
| Auth | Clerk | JWT + middleware (non branché) |
| Payments | Stripe | API route existe (non branché end-to-end) |
| Deploy | Vercel | API deploy + CDG1 region |

## Principes architecturaux à suivre
1. **Component extraction** : chaque panel/modal doit être un composant isolé
2. **Stores > Props** : Zustand stores, pas prop drilling via `p: any`
3. **Types > any** : interfaces dédiées, jamais @ts-nocheck
4. **Hooks pour la logique** : useChat, useTerminal, etc. (déjà fait)
5. **API routes stateless** : chaque route gère une seule responsabilité

## Ce qui est intentionnel (ne pas "corriger")
- WebContainers au lieu de Docker → sécurité + pas de serveur
- iframe preview au lieu de Sandpack → contrôle total du rendu
- localStorage pour conversations → pas besoin de DB pour le MVP
- CDN injection (React, Tailwind) dans preview → pas de build step côté client

## Architecture cible v5 (pas encore implémentée)
```
app/page.tsx → ~300 lignes (orchestrateur)
components/
  landing/LandingView.tsx
  workspace/
    TopBar.tsx
    ChatPanel.tsx
    PreviewPanel.tsx
    CodeEditorPanel.tsx
    DatabasePanel.tsx
    PaymentsPanel.tsx
    TerminalPanel.tsx
  overlays/
    CloneModal.tsx
    DeployModal.tsx
    GitPanel.tsx
    SettingsPanel.tsx
    ... (60+ panels, chacun isolé)
stores/
  useAppStore.ts → view, tabs, device, theme
  useChatStore.ts → messages, streaming, model
  useEditorStore.ts → files, tabs, selection
  usePanelStore.ts → show/hide 60+ panels
```
