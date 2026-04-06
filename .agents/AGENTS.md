# AGENTS.md — Aurion Studio Agent Orchestration

## Agent Behavior

When working on Aurion Studio, agents MUST follow this workflow:

### 1. BEFORE CODING — Skill Lookup
- Identify the domain of the task (frontend, backend, database, auth, etc.)
- Read the relevant SKILL.md from `.agents/skills/<skill-name>/SKILL.md`
- Apply the skill's instructions to the implementation

### 2. SKILL ROUTING TABLE

| Task Type | Required Skills |
|---|---|
| New React component | `vercel-react-best-practices`, `frontend-design`, `accessibility` |
| API route | `api-design-principles`, `stripe-best-practices` (if payment), `supabase` (if DB) |
| UI changes | `web-design-guidelines`, `ui-ux-pro-max`, `shadcn` |
| Write tests | `webapp-testing`, `systematic-testing` |
| Security fix | `security-review`, `semgrep`, `better-auth-security-best-practices` |
| Deploy | `deploy-to-vercel`, `vercel-cli-with-tokens` |
| Performance | `vercel-react-best-practices`, `analyze-bundle` |
| Database | `supabase-postgres-best-practices`, `neon-postgres` |
| AI integration | `claude-api`, `openai-agents-js`, `langchain-skills` |
| Code review | `typescript-advanced-types`, `accessibility`, `security-review` |
| Debug | `systematic-debugging`, `sentry-for-ai` |
| Planning | `brainstorming`, `ultrathink` |
| Agent architecture | `enterprise-agent-patterns` |
| Prompt design | `enterprise-prompt-engineering` |
| Safety/Guardrails | `enterprise-guardrails-eval` |
| Strategy/Scaling | `enterprise-ai-use-cases` |

### 3. AFTER CODING — Validation
```bash
npx tsc --noEmit     # Must be 0 errors
npm test             # Must pass (201+ tests)
npm run build        # Must succeed
```

### 4. SKILL CATALOG
- **2,221 skills** available in `.agents/skills/`
- **Catalog**: `.agents/SKILLS_CATALOG.md` (categorized)
- **JSON Index**: `.agents/skills-index.json` (programmatic)
- **Categories**: frontend(188), ai(254), devops(155), testing(143), database(136), auth(71), security(75), analytics(74), code-quality(73), git(60), media(46), automation(45), search(38), messaging(34), documents(34), mobile(33), planning(31), debugging(25)

### 5. PROJECT RULES
- TypeScript strict mode — zero `any` tolerance
- Zod validation on every API route
- React.memo on heavy components
- aria-* attributes on interactive elements
- Never delete without verifying dependencies
- Read files before modifying them

### 6. ENTERPRISE PRINCIPLES (Google, OpenAI, Anthropic)

#### Agent Architecture (Google Agents Companion v2)
- Aurion = Model (multi-LLM) + Tools (46 API routes, Monaco, WebContainers) + Orchestration (hooks + Zustand)
- Apply AgentOps: instrument traces, track goal completion, implement feedback loops
- Prefer single-agent simplicity; split only when complexity demands it
- Use contract-based task definitions for high-stakes operations (deploy, payment)

#### Prompt Engineering (Google + Anthropic)
- System prompts in `lib/system-prompts.ts` should use: few-shot examples, CoT for complex generation, ReAct for tool use
- Temperature 0 for deterministic tasks (code generation), higher for creative (UI suggestions)
- Instructions > constraints: tell the LLM what TO do, not what NOT to do
- Always specify output format (JSON for structured, Markdown for explanations)

#### Guardrails (OpenAI)
- Layered defense: Zod validation → rate limiting → CSRF → sanitization → output validation
- Rate every tool by risk: read-only (scrape) / write (clone, deploy) / financial (stripe)
- Human-in-the-loop for deploy actions and irreversible operations
- PII filtering on AI-generated outputs

#### Enterprise Adoption (OpenAI + Google)
- Start with evals: measure generated code quality before shipping improvements
- Apply 6 primitives: Content (code gen), Research (scraping), Coding (editor), Data (preview), Ideation (chat), Automation (deploy)
- Impact/Effort matrix: quick wins first, re-evaluate quarterly
- Bold automation goals: minimize steps from idea → deployed app

#### Success Metrics for Aurion
1. **Goal completion**: App successfully generated and previewed
2. **Deploy success rate**: App deploys to Vercel without errors
3. **Code quality**: TypeScript compiles, no runtime errors
4. **User satisfaction**: App matches user's description
5. **Latency**: Time from prompt → preview render
6. **Error recovery**: Agent self-corrects on failures
