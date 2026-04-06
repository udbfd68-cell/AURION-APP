# AURION STUDIO — SÉCURITÉ

## État actuel : ⚠️ INSUFFISANT

### Problèmes identifiés
1. **Aucune auth sur les API routes** — n'importe qui peut appeler /api/anthropic
2. **Clés API côté serveur** — OK, pas exposées côté client (sauf NEXT_PUBLIC_*)
3. **Pas de rate limiting** — un seul user peut brûler tout le quota API
4. **Pas de validation d'input** — les API routes ne valident pas les payloads
5. **CORS** — pas de restriction (Vercel default = same-origin, OK)
6. **WebContainers** — sandboxed par design (pas de risque serveur)

### Priorités de fix
1. Brancher Clerk auth → vérifier JWT dans chaque API route
2. Ajouter rate limiting (Vercel KV ou Upstash Redis)
3. Valider les inputs avec Zod dans les API routes
4. Ajouter CSRF token pour les mutations

### Ce qui est déjà sécurisé
- COEP/COOP headers (WebContainers requirement)
- Clés API serveur-side uniquement (non NEXT_PUBLIC)
- Vercel Edge Functions = isolation par requête
- Supabase RLS (si configuré — à vérifier)
