Code review approfondie en utilisant les skills de qualité : $ARGUMENTS

## Process
1. Lis les skills de qualité :
   - `.agents/skills/vercel-react-best-practices/SKILL.md`
   - `.agents/skills/accessibility/SKILL.md`
   - `.agents/skills/security-review/SKILL.md`
   - `.agents/skills/typescript-advanced-types/SKILL.md`
   - `.agents/skills/webapp-testing/SKILL.md`
   - `.agents/skills/enterprise-guardrails-eval/SKILL.md` (tool risk rating, layered defense)
2. Lis le(s) fichier(s) demandé(s)
3. Évalue selon les critères de chaque skill :
   - ✅ / ❌ React best practices (memo, keys, effects, composition)
   - ✅ / ❌ TypeScript (pas de any, types stricts, generics)
   - ✅ / ❌ Accessibilité (aria, roles, keyboard, focus)
   - ✅ / ❌ Sécurité (input validation, XSS, CSRF)
   - ✅ / ❌ Tests (couverture, edge cases)
   - ✅ / ❌ Performance (memo, lazy, bundles)
4. Score /10 par catégorie + recommandations
5. Propose les corrections précises avec code
