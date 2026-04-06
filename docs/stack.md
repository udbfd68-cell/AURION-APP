# AURION STUDIO — STACK TECHNIQUE DÉTAILLÉE

## Frontend
| Package | Version | Usage |
|---------|---------|-------|
| next | 16.1.6 | Framework (App Router, API routes, SSR) |
| react | 19.0.0 | UI library |
| typescript | 5.7.2 | Type system |
| tailwindcss | 3.4.17 | Styling |
| framer-motion | 11.11.17 | Animations |
| @monaco-editor/react | 4.7.0 | Code editor |
| react-markdown | 10.0.0 | Markdown rendering |
| highlight.js | 11.10.0 | Syntax highlighting |
| zustand | 5.0.12 | State management (installé, non branché) |
| jszip | 3.10.1 | ZIP export |

## Backend / Infrastructure
| Service | Usage |
|---------|-------|
| Vercel | Hosting + Edge Functions |
| Supabase | PostgreSQL + Realtime + Storage |
| Clerk | Auth (installé, non wired) |
| Stripe | Payments (installé, non wired) |

## AI Providers (via API routes)
| Provider | Route | Models |
|----------|-------|--------|
| Anthropic | /api/anthropic | Claude 3.5 Sonnet, Claude 3 Opus |
| Google AI | /api/gemini | Gemini Pro, Gemini Flash |
| Groq | /api/groq | Llama 3.1, Mixtral |
| OpenAI | /api/openai | GPT-4o, GPT-4o-mini |
| xAI | /api/xai | Grok |
| Mistral | /api/mistral | Mistral Large |
| DeepAI | /api/deepai | Image generation |
| HuggingFace | /api/huggingface | Various |

## Browser APIs
| API | Usage |
|-----|-------|
| WebContainers | In-browser Node.js runtime |
| Web Speech API | Voice input (partial) |
| IndexedDB | Large data persistence |
| localStorage | Conversations, settings |
| Clipboard API | Copy/paste |
| File API | Image upload, drag-drop |

## 40 API Routes
algolia, anthropic, cinematic, claude-code, clone, collab, contentful,
context7, database, deepai, deploy, discord, exec, figma, gemini, github,
groq, huggingface, klaviyo, lemonsqueezy, ltx, magic21st, mistral, neon,
notebooklm, openai, reactbits, render, resend, sanity, scrape, sendgrid,
slack, stitch, stripe, supabase, test-gen, twilio, upstash, xai
