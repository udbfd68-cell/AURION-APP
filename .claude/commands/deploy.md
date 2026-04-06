Déploie le projet sur Vercel.

## Pré-requis : lis le skill deploy
- `.agents/skills/deploy-to-vercel/SKILL.md`

## Processus
1. `npx tsc --noEmit` → vérifier 0 erreurs TypeScript
2. `npm test` → vérifier tous les tests passent
3. `npm run build` → vérifier compilation réussie
4. `npx vercel --prod` → déployer
5. Afficher l'URL finale
6. Rappeler de vérifier manuellement : console Chrome = 0 erreurs
