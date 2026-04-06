Analyse profonde avant de toucher au code.

Avant d'écrire UNE SEULE LIGNE de code :
1. Lis CLAUDE.md, PROGRESS.md, et docs/gaps.md
2. Lis tous les fichiers concernés par le changement demandé
3. Identifie les dépendances : qui importe quoi, qui appelle quoi
4. Identifie les effets de bord possibles
5. Propose 3 approches différentes avec trade-offs
6. Recommande la meilleure avec justification
7. Seulement APRÈS validation, commence à coder
8. Après le code : `npx tsc --noEmit` + `npm run build`
