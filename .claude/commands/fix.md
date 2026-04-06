Corrige toutes les erreurs TypeScript dans le projet.

## Pré-requis : lis les skills TypeScript
- `.agents/skills/typescript-advanced-types/SKILL.md`
- `.agents/skills/vercel-react-best-practices/SKILL.md`

## Processus
1. Lance `npx tsc --noEmit 2>&1` — capture toutes les erreurs
2. Groupe les erreurs par fichier
3. Pour chaque fichier avec des erreurs :
   a. Lis le fichier
   b. Identifie la cause de chaque erreur
   c. Corrige les erreurs (sans @ts-nocheck, sans any) en suivant les skills
   d. Vérifie que la correction ne casse rien d'autre
4. Re-lance `npx tsc --noEmit` — vérifie 0 erreurs
5. Lance `npm test` — vérifie les tests
6. Lance `npm run build` — vérifie que ça build
7. Résumé : X erreurs corrigées dans Y fichiers
