# Vercel Configuration Templates

## vercel.json

For most marketplace apps, you don't need a `vercel.json` since `next.config.ts` handles headers. But if you need it:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "frame-ancestors 'self' https://*.sitecorecloud.io"
        },
        {
          "key": "X-Frame-Options",
          "value": "ALLOW-FROM https://*.sitecorecloud.io"
        }
      ]
    }
  ]
}
```

## next.config.ts (Recommended)

Headers in `next.config.ts` are preferred over `vercel.json`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.sitecorecloud.io",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## CSP Header Explanation

| Directive | Value | Purpose |
|-----------|-------|---------|
| `frame-ancestors` | `'self' https://*.sitecorecloud.io` | Allows the app to be embedded in iframes on Sitecore Cloud domains |

**Important**: Without `frame-ancestors`, Sitecore cannot embed your app, and it will show a blank iframe.

## Environment Variables on Vercel

### Client-Side Apps
| Variable | Vercel Setting |
|----------|---------------|
| `NEXT_PUBLIC_SITECORE_APP_ID` | Must be set for all environments |

### Full-Stack (Auth0) Apps
| Variable | Vercel Setting |
|----------|---------------|
| `NEXT_PUBLIC_SITECORE_APP_ID` | All environments |
| `AUTH0_SECRET` | Different per environment (generate unique per env) |
| `AUTH0_BASE_URL` | Must match the deployment URL for each environment |
| `AUTH0_ISSUER_BASE_URL` | Same across environments (your Auth0 tenant) |
| `AUTH0_CLIENT_ID` | Same across environments |
| `AUTH0_CLIENT_SECRET` | Same across environments |
| `AUTH0_AUDIENCE` | `https://api.sitecorecloud.io` |
| `AUTH0_SCOPE` | `openid profile email` |

### Setting Variables via CLI
```bash
# Add for all environments
vercel env add VARIABLE_NAME

# Add for specific environment
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME preview
vercel env add VARIABLE_NAME development
```
