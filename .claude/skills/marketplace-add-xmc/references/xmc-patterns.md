# XM Cloud API Code Patterns

## Module Registration

Ensure the XMC module is registered in your client initialization (`lib/sitecore/client.ts`):

```typescript
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { XMC } from "@sitecore-marketplace-sdk/xmc";

export const client = await ClientSDK.init({
  target: window.parent,
  modules: [XMC],
});
```

## Getting sitecoreContextId

Most XMC queries require `sitecoreContextId`. In React components, use `useAppContext()`:

```typescript
const appContext = useAppContext();
const sitecoreContextId = appContext?.resourceAccess[0].context.live;
```

## Sites API Patterns

### List All Sites (Client-Side)
```tsx
"use client";
import { useEffect, useState } from "react";
import type { Site } from "@sitecore-marketplace-sdk/xmc";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";

export function SitesList() {
  const { client } = useMarketplaceClient();
  const appContext = useAppContext();
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    if (!client || !appContext) return;
    const sitecoreContextId = appContext.resourceAccess[0].context.live;
    async function load() {
      const { data: sites } = await client.query("xmc.sites.listSites", {
        params: { query: { sitecoreContextId } },
      });
      setSites(sites);
    }
    load();
  }, [client, appContext]);

  return (
    <ul>
      {sites.map((site) => (
        <li key={site.id}>{site.name}</li>
      ))}
    </ul>
  );
}
```

## Pages API Patterns

### Get Current Page with Subscription
```tsx
"use client";
import { useEffect, useState } from "react";
import type { PagesContext } from "@sitecore-marketplace-sdk/client";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";

export function PageInfo() {
  const { client } = useMarketplaceClient();
  const [page, setPage] = useState<PagesContext | null>(null);

  useEffect(() => {
    if (!client) return;
    // Get initial page context and subscribe to changes
    let cleanup: (() => void) | undefined;
    client.query("pages.context", {
      subscribe: true,
      onSuccess: setPage,
    }).then(({ data, unsubscribe }) => {
      setPage(data);
      cleanup = unsubscribe;
    });
    return () => cleanup?.();
  }, [client]);

  if (!page) return null;
  return <div>Current page: {page.name}</div>;
}
```

### Get a Specific Page
```typescript
const { data: appContext } = await client.query("application.context");
const sitecoreContextId = appContext.resourceAccess[0].context.live;

const { data: page } = await client.query("xmc.pages.retrievePage", {
  params: {
    path: { pageId: "page-id" },
    query: { site: "site-name", sitecoreContextId, language: "en" },
  },
});
```

## Authoring API Patterns (GraphQL)

### Query Items
```typescript
const { data } = await client.mutate("xmc.authoring.graphql", {
  params: {
    query: { sitecoreContextId },
    body: {
      query: `
        query GetItem($path: String!) {
          item(path: $path, language: "en") {
            id
            name
            fields { name value }
            children { results { id name } }
          }
        }
      `,
      variables: { path: "/sitecore/content/Home" },
    },
  },
});
```

### Mutate Items
```typescript
const { data } = await client.mutate("xmc.authoring.graphql", {
  params: {
    query: { sitecoreContextId },
    body: {
      query: `
        mutation UpdateField($itemId: ID!, $fieldName: String!, $value: String!) {
          updateItem(input: { itemId: $itemId, fields: [{ name: $fieldName, value: $value }] }) {
            item { id }
          }
        }
      `,
      variables: { itemId: "item-id", fieldName: "Title", value: "New Title" },
    },
  },
});
```

## Content Transfer API Patterns

```typescript
const { data } = await client.mutate("xmc.contentTransfer.createContentTransfer", {
  params: {
    query: { sitecoreContextId },
    body: { /* transfer options */ },
  },
});
```

## Server-Side Patterns (Auth0 Required)

### API Route
```typescript
// app/api/sites/route.ts
import { experimental_createXMCClient } from "@sitecore-marketplace-sdk/xmc";
import { getAccessToken } from "@auth0/nextjs-auth0";

export async function GET() {
  const { accessToken } = await getAccessToken();
  const xmcClient = await experimental_createXMCClient({
    getAccessToken: async () => accessToken!,
  });

  const languages = await xmcClient.sites.listLanguages({
    query: { sitecoreContextId: "your-context-id" },
  });
  return Response.json(languages);
}
```

### Server Action
```typescript
// app/actions.ts
"use server";
import { experimental_createXMCClient } from "@sitecore-marketplace-sdk/xmc";
import { getAccessToken } from "@auth0/nextjs-auth0";

export async function getXmcClient() {
  const { accessToken } = await getAccessToken();
  return experimental_createXMCClient({
    getAccessToken: async () => accessToken!,
  });
}
```
