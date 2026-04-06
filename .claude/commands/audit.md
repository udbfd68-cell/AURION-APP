Fais un audit complet du projet Aurion Studio.

## Pré-requis : lis les skills de qualité
- `.agents/skills/vercel-react-best-practices/SKILL.md`
- `.agents/skills/accessibility/SKILL.md`
- `.agents/skills/security-review/SKILL.md`
- `.agents/skills/webapp-testing/SKILL.md`
- `.agents/skills/typescript-advanced-types/SKILL.md`
- `.agents/skills/enterprise-guardrails-eval/SKILL.md` (metrics, guardrails, eval framework)

## Audit
1. Lis CLAUDE.md
2. Lance `npx tsc --noEmit` — compte les erreurs par fichier
3. Lance `npm run build` — vérifie que ça compile
4. Lance `npm test` — vérifie les tests
5. Analyse page.tsx : combien de useState, combien de lignes
6. Vérifie les usages de `any` : `grep -r ": any" --include="*.ts" --include="*.tsx" | wc -l`
7. Vérifie les @ts-nocheck : combien de fichiers
8. Vérifie la couverture de tests vs composants/hooks
9. Évalue selon les critères de chaque skill lue
10. Donne une note brutale /10 avec justification par catégorie :
    - Type Safety /10
    - API Security /10
    - Accessibility /10
    - Tests /10
    - Architecture /10
    - DevOps /10
    - Error Handling /10
    - Performance /10
