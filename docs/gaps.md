# AURION STUDIO — GAPS LIST

Dernière mise à jour : 2026-04-06
Format : [ID] [PRIORITÉ] [STATUT] Description

---

## ARCHITECTURE (bloquant tout le reste)
- [ ] ARCH-1 CRITIQUE ❌ Découper page.tsx (7,953L) en composants (<500L chacun)
- [ ] ARCH-2 CRITIQUE ❌ Supprimer @ts-nocheck de LandingView.tsx et Overlays.tsx
- [ ] ARCH-3 CRITIQUE ❌ Brancher stores Zustand (remplacer 305 useState)
- [ ] ARCH-4 HAUTE ❌ Typer pageProps (remplacer Record<string, any>)
- [ ] ARCH-5 HAUTE ❌ Fixer TerminalPanel.tsx (30 erreurs TS)
- [ ] ARCH-6 HAUTE ❌ Découper Overlays.tsx (3,665L) en composants individuels
- [ ] ARCH-7 MOYENNE ❌ Nettoyer scripts orphelins (.mjs/.cjs) et fichiers .bak/.new
- [ ] ARCH-8 MOYENNE ❌ Extraire TopBar, ChatPanel, PreviewPanel, CodeEditor

## AUTH & SECURITY
- [ ] SEC-1 CRITIQUE ❌ Wire Clerk auth (installé, middleware existe, non branché)
- [ ] SEC-2 CRITIQUE ❌ Protéger les API routes (aucune auth sur /api/*)
- [ ] SEC-3 HAUTE ❌ Rate limiting sur API routes
- [ ] SEC-4 HAUTE ❌ Valider les inputs côté serveur (API routes)
- [ ] SEC-5 MOYENNE ❌ CSRF protection
- [ ] SEC-6 MOYENNE ❌ Audit .env — clés API exposées côté client ?

## TESTS
- [ ] TEST-1 CRITIQUE ❌ Installer framework de tests (Vitest ou Jest)
- [ ] TEST-2 CRITIQUE ❌ Tests API routes (au minimum happy path)
- [ ] TEST-3 HAUTE ❌ Tests E2E Playwright (landing → workspace → generate)
- [ ] TEST-4 MOYENNE ❌ Tests unitaires hooks (useChat, useTerminal, etc.)
- [ ] TEST-5 BASSE ❌ Tests de composants (React Testing Library)

## PAYMENTS
- [ ] PAY-1 HAUTE ❌ Wire Stripe billing end-to-end
- [ ] PAY-2 HAUTE ❌ Système de crédits (limiter l'usage AI)
- [ ] PAY-3 HAUTE ❌ Pricing page fonctionnelle (app/pricing/ existe mais partiel)
- [ ] PAY-4 MOYENNE ❌ Stripe webhook pour confirmer les paiements

## DATABASE
- [ ] DB-1 HAUTE ❌ Sauvegarder conversations dans Supabase (pas juste localStorage)
- [ ] DB-2 HAUTE ❌ Sauvegarder projets dans Supabase
- [ ] DB-3 MOYENNE ❌ Migrations Supabase versionnées
- [ ] DB-4 BASSE ❌ RLS policies Supabase

## FEATURES INCOMPLÈTES
- [ ] FEAT-1 HAUTE ❌ Git panel : push/pull/commit fonctionnel E2E
- [ ] FEAT-2 HAUTE ❌ Collaboration : tester realtime multi-user
- [ ] FEAT-3 MOYENNE ❌ Figma import : tester end-to-end
- [ ] FEAT-4 MOYENNE ❌ Visual builder : drag-and-drop robuste
- [ ] FEAT-5 MOYENNE ❌ LTX video : tester génération
- [ ] FEAT-6 BASSE ❌ NotebookLM : tester podcast generation
- [ ] FEAT-7 BASSE ❌ Backend generator : deploy réel du backend généré

## DX & QUALITY
- [ ] DX-1 HAUTE ❌ ESLint config fonctionnel (eslintrc existe mais errors?)
- [ ] DX-2 HAUTE ❌ CI/CD pipeline (GitHub Actions)
- [ ] DX-3 MOYENNE ❌ Pre-commit hooks (lint-staged + husky)
- [ ] DX-4 MOYENNE ❌ Documentation API interne
- [ ] DX-5 BASSE ❌ Storybook pour les composants

---

## COMPTEUR
- Total gaps : 35
- Fermés : 0/35
- Critiques ouverts : 8
- Hauts ouverts : 15
