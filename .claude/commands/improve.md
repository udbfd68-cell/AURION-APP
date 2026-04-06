Améliore le fichier ou domaine spécifié en utilisant les skills installées : $ARGUMENTS

## Processus
1. Identifie le domaine du fichier/changement demandé
2. Lis les skills pertinentes AVANT de coder :
   - Composant React → `.agents/skills/vercel-react-best-practices/SKILL.md`
   - Route API → `.agents/skills/api-design-principles/SKILL.md`
   - Test → `.agents/skills/webapp-testing/SKILL.md`
   - Sécurité → `.agents/skills/security-review/SKILL.md`
   - UI/Design → `.agents/skills/frontend-design/SKILL.md` + `.agents/skills/ui-ux-pro-max/SKILL.md`
   - Performance → `.agents/skills/analyze-bundle/SKILL.md`
   - TypeScript → `.agents/skills/typescript-advanced-types/SKILL.md`
   - Accessibilité → `.agents/skills/accessibility/SKILL.md`
3. Applique les recommandations des skills au code
4. Vérifie : `npx tsc --noEmit` (0 erreurs) + `npm test` (201+ tests passent)
5. Résume les améliorations faites et quelles skills ont été appliquées
