# AURION STUDIO — DÉPLOIEMENT

## Environnement
- Hébergeur : Vercel
- Région : CDG1 (Paris)
- Framework : Next.js (détection auto par Vercel)
- URL prod : https://claudable-web-gray.vercel.app

## Comment déployer
```bash
# Build + typecheck
npm run build
npx tsc --noEmit

# Deploy via Vercel CLI
npx vercel --prod
```

## Config Vercel (vercel.json)
- COEP: credentialless (requis pour WebContainers)
- COOP: same-origin (requis pour WebContainers)

## Variables d'environnement (Vercel Dashboard)
Toutes les vars de .env.example doivent être configurées sur Vercel.
Les vars NEXT_PUBLIC_* sont exposées côté client.

## Vérification post-deploy
1. Ouvrir l'URL prod
2. Vérifier la landing page
3. Tester le chat (envoyer un prompt)
4. Vérifier Console Chrome = 0 erreurs rouges
5. Vérifier Network = 0 404
