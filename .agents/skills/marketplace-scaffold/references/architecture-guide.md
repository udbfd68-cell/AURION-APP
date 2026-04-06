# Architecture Decision Guide

## Client-Side vs Full-Stack

| Factor | Client-Side Only | Full-Stack (Auth0) |
|--------|------------------|--------------------|
| **Scaffold URL** | `app-client.json` | `app-auth0.json` |
| **Auth** | Built-in (automatic) | Auth0 (requires tenant) |
| **Server-side SDK** | No | Yes (`experimental_createXMCClient`, `experimental_createAIClient`) |
| **API Routes** | Not needed | Yes (Next.js API routes / Server Actions) |
| **External APIs** | Direct from client only | Can proxy through server |
| **Complexity** | Lower | Higher |
| **Use when** | Simple UI extensions, read-only data, client-side mutations | Need server-side processing, Auth0, external service integration |

## Package Selection

| Package | Registry URL | Provides |
|---------|-------------|----------|
| **Client** (required) | `app-client.json` | `ClientSDK.init()`, queries, mutations, subscriptions, types |
| **XM Cloud** | `xmc.json` | Sites, Pages, Authoring (GraphQL), Content Transfer, Search, Agent APIs |
| **AI Skills** | `ai.json` | Brand Review API for AI-powered content analysis |
| **Blok Theme** | `blok-theme.json` | Sitecore-branded shadcn components (always install) |

## What the Scaffold Creates

### Client-side (`app-client.json`)
- `lib/sitecore/client.ts` — Client initialization with `ClientSDK.init()`
- `lib/sitecore/providers.tsx` — React context providers (`<SitecoreProvider>`)
- `hooks/use-sitecore.ts` — React hooks for SDK access
- `app/layout.tsx` updates — Wraps app in providers

### Full-stack (`app-auth0.json`)
- Everything from client-side, plus:
- `lib/sitecore/server.ts` — Server-side client factories
- `app/api/auth/[...auth0]/route.ts` — Auth0 route handlers
- `middleware.ts` — Auth0 middleware

### XMC (`xmc.json`)
- `lib/sitecore/xmc.ts` — XMC module registration
- Types for all XM Cloud APIs

### AI (`ai.json`)
- `lib/sitecore/ai.ts` — AI module registration
- Types for Brand Review API
