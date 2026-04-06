Fais un audit complet du projet Aurion Studio.

1. Lis CLAUDE.md et PROGRESS.md
2. Lance `npx tsc --noEmit` — compte les erreurs par fichier
3. Lance `npm run build` — vérifie que ça compile
4. Analyse page.tsx : combien de useState, combien de lignes
5. Vérifie les 4 stores Zustand : sont-ils importés quelque part ?
6. Vérifie les @ts-nocheck : combien de fichiers
7. Vérifie les fichiers orphelins (.mjs, .cjs, .bak, .new)
8. Mets à jour PROGRESS.md avec les résultats
9. Donne une note brutale /10 avec justification
