# Environment Variable Templates

## Client-Side Only (.env.local)

```env
# Sitecore Marketplace SDK
NEXT_PUBLIC_SITECORE_APP_ID=your-app-id-from-portal
```

## Full-Stack with Auth0 (.env.local)

```env
# Sitecore Marketplace SDK
NEXT_PUBLIC_SITECORE_APP_ID=your-app-id-from-portal

# Auth0 Configuration
AUTH0_SECRET=use-openssl-rand-hex-32-to-generate
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret

# Auth0 Sitecore Connection
AUTH0_AUDIENCE=https://api.sitecorecloud.io
AUTH0_SCOPE=openid profile email
```

## How to Get Values

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SITECORE_APP_ID` | Sitecore Developer Portal → Your App → Settings |
| `AUTH0_SECRET` | Generate: `openssl rand -hex 32` |
| `AUTH0_BASE_URL` | Your app URL (localhost for dev) |
| `AUTH0_ISSUER_BASE_URL` | Auth0 Dashboard → Applications → Your App → Domain |
| `AUTH0_CLIENT_ID` | Auth0 Dashboard → Applications → Your App → Client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 Dashboard → Applications → Your App → Client Secret |
| `AUTH0_AUDIENCE` | Always `https://api.sitecorecloud.io` for Sitecore |
