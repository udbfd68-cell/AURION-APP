# AURION STUDIO — AGENTS.md
# Compatible : Claude Code, Cursor, Codex, Windsurf, etc.
# Ce fichier est identique à CLAUDE.md dans son rôle mais nommé pour les autres outils.

Voir [CLAUDE.md](./CLAUDE.md) pour le contexte complet du projet.

## Règles pour tout agent AI travaillant sur ce projet
1. Lire CLAUDE.md et PROGRESS.md AVANT de commencer
2. `npx tsc --noEmit` = 0 erreurs AVANT de dire "c'est bon"
3. JAMAIS de @ts-nocheck ou `any` pour contourner TypeScript
4. Tester le build (`npm run build`) après changements majeurs
5. Ne rien supprimer sans vérifier — l'app a 150+ features
6. Mettre à jour PROGRESS.md après chaque session significative
