Analyse profonde avant de toucher au code.

## Pré-requis : lis les skills pertinentes au domaine
- Identifie le domaine → consulte le tableau de routage dans CLAUDE.md
- Lis les SKILL.md correspondants dans `.agents/skills/`
- Lis aussi `.agents/skills/brainstorming/SKILL.md` pour la méthodologie
- Lis `.agents/skills/enterprise-agent-patterns/SKILL.md` pour les patterns d'architecture agent
- Lis `.agents/skills/enterprise-prompt-engineering/SKILL.md` pour le prompting avancé

## Processus
Avant d'écrire UNE SEULE LIGNE de code :
1. Lis CLAUDE.md et les skills du domaine
2. Lis tous les fichiers concernés par le changement demandé
3. Identifie les dépendances : qui importe quoi, qui appelle quoi
4. Identifie les effets de bord possibles
5. Propose 3 approches différentes avec trade-offs
6. Recommande la meilleure avec justification (en citant les skills)
7. Seulement APRÈS validation, commence à coder
8. Après le code : `npx tsc --noEmit` + `npm test` + `npm run build`
