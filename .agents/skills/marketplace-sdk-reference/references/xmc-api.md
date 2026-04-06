# XM Cloud Package API Reference

## Module Registration

```typescript
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { XMC } from "@sitecore-marketplace-sdk/xmc";

const client = await ClientSDK.init({
  target: window.parent,
  modules: [XMC],
});
```

## Client-Side APIs

All XMC queries and mutations are prefixed with `xmc.`. Most require `sitecoreContextId`, obtained from `application.context`:

```typescript
const { data: appContext } = await client.query("application.context");
const sitecoreContextId = appContext.resourceAccess[0].context.live;
```

### Sites API

| Key | Type | Description |
|-----|------|-------------|
| `xmc.sites.listSites` | Query | List all sites |

```typescript
const { data: sites } = await client.query("xmc.sites.listSites", {
  params: {
    query: { sitecoreContextId },
  },
});
```

### Pages API

| Key | Type | Description |
|-----|------|-------------|
| `xmc.pages.retrievePage` | Query | Get a specific page by ID |

```typescript
const { data: page } = await client.query("xmc.pages.retrievePage", {
  params: {
    path: { pageId },
    query: { site, sitecoreContextId, language },
  },
});
```

### Authoring API (GraphQL)

| Key | Type | Description |
|-----|------|-------------|
| `xmc.authoring.graphql` | Mutation | Execute a GraphQL query/mutation against XM Cloud Authoring API |

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
          }
        }
      `,
      variables: { path: "/sitecore/content/Home" },
    },
  },
});
```

### Content Transfer API

| Key | Type | Description |
|-----|------|-------------|
| `xmc.contentTransfer.createContentTransfer` | Mutation | Create a content transfer |

### Page Context Subscription

Subscribe to page changes using the base `pages.context` query with `subscribe: true`:

```typescript
const { unsubscribe } = await client.query("pages.context", {
  subscribe: true,
  onSuccess: (pagesContext) => {
    console.log("Page changed:", pagesContext);
  },
});
unsubscribe?.();
```

## Server-Side Client

For full-stack (Auth0) apps, use the server-side client in API routes or Server Actions:

```typescript
import { experimental_createXMCClient } from "@sitecore-marketplace-sdk/xmc";

const xmcClient = await experimental_createXMCClient({
  getAccessToken: async () => {
    // Return the access token from your auth provider (e.g. Auth0)
    return await getYourAccessToken();
  },
});

const languages = await xmcClient.sites.listLanguages({
  query: { sitecoreContextId: "your-context-id" },
});
```
