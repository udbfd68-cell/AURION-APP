---
name: claudable-main
description: AI-powered app builder — build production Next.js apps with natural language, preview live, deploy to Vercel in one click. Uses Claude, Gemini, Groq, OpenAI. Full TypeScript strict mode, Zod validation, 201 tests, 233 agent skills.
---

# Aurion Studio

AI App Builder skill — generates, previews, and deploys full-stack apps from natural language.

## When to use

- Building web apps, SaaS products, dashboards from natural language prompts
- Live preview with Monaco editor + WebContainers
- One-click deploy to Vercel
- Multi-model AI (Claude, Gemini, Groq, OpenAI)

## Stack

- Next.js 16 + React 19 + TypeScript 5.7 (strict) + Tailwind 3
- Zod 4 validation on all 46 API routes
- Zustand state management
- framer-motion animations
- Vitest + happy-dom testing (201 tests)
- GitHub Actions CI/CD

## Instructions

1. Always run `npx tsc --noEmit` — must be 0 errors
2. Always run `npm test` — 201 tests must pass
3. Use Zod schemas from `lib/api-schemas.ts` for validation
4. Use `lib/api-utils.ts` for structured error responses
5. Components in `components/overlays/` use React.memo for performance
6. 233 agent skills available in `.agents/skills/`
