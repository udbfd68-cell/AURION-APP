Appliquer les principes enterprise (Google, OpenAI, Anthropic) au code ou à l'architecture.

Domaine d'application : $ARGUMENTS

## Étapes

1. Lis les 4 skills enterprise :
   - `.agents/skills/enterprise-agent-patterns/SKILL.md` (architecture agent, multi-agent, AgentOps)
   - `.agents/skills/enterprise-prompt-engineering/SKILL.md` (prompting, CoT, ReAct, best practices)
   - `.agents/skills/enterprise-guardrails-eval/SKILL.md` (guardrails, évaluation, safety, metrics)
   - `.agents/skills/enterprise-ai-use-cases/SKILL.md` (7 leçons, 6 primitives, Impact/Effort)

2. Identifie quel skill est le plus pertinent pour le domaine demandé

3. Applique les principes concrètement :
   - **Si architecture** → patterns multi-agent, orchestration, memory management
   - **Si prompt** → techniques de prompting, CoT, few-shot, configuration LLM
   - **Si sécurité** → guardrails en couches, tool risk rating, human-in-the-loop
   - **Si stratégie** → 6 primitives, Impact/Effort framework, enterprise lessons
   - **Si évaluation** → metrics hierarchy, trajectory eval, autorater

4. Propose des améliorations concrètes avec code ou configuration

5. Valide : `npx tsc --noEmit` + `npm test` + `npm run build`
