# Client Package API Reference

## ClientSDK.init(config)

Creates and initializes the SDK client.

```typescript
import { ClientSDK } from "@sitecore-marketplace-sdk/client";

const client = await ClientSDK.init({
  target: window.parent,  // Required: target window (typically window.parent)
  modules?: Module[];     // Optional: Additional modules (XMC, AI)
});
```

## QueryMap — Available Queries

Results are returned as `{ data, unsubscribe? }`. All keys support `subscribe: true` for live updates.

| Query Key | Description | Returns |
|-----------|-------------|---------|
| `application.context` | App context incl. `sitecoreContextId` | `ApplicationContext` |
| `host.user` | Current user info | `UserInfo` |
| `host.state` | Current host state | `XmcXmAppsHostState \| XmcPagesContextViewHostState` |
| `host.route` | Current host route | `string` |
| `pages.context` | Current page context (Pages editor) | `PagesContext` |
| `site.context` | Current site context | `SiteContext` |

### Usage
```typescript
const { data: appContext } = await client.query("application.context");
// sitecoreContextId: appContext.resourceAccess[0].context.live

const { data: user } = await client.query("host.user");

const { data: hostState } = await client.query("host.state");

const { data: route } = await client.query("host.route");
```

## MutationMap — Available Mutations

| Mutation Key | Description | Params |
|-------------|-------------|--------|
| `pages.context` | Navigate to a page in the Pages editor | `{ itemId: string }` |
| `pages.reloadCanvas` | Reload the Pages canvas | none |

### Usage
```typescript
// Navigate to a different page
await client.mutate("pages.context", {
  params: { itemId: "{12345678-ABCD-1234-ABCD-123456789ABC}" },
});

// Reload the canvas after content changes
await client.mutate("pages.reloadCanvas");
```

## Subscriptions

Subscriptions use the `query()` method with `subscribe: true` — there is no separate `subscribe()` method.

```typescript
// Subscribe to host state changes
const { unsubscribe } = await client.query("host.state", {
  subscribe: true,
  onSuccess: (newState) => {
    console.log("Host state changed:", newState);
  },
});

// Subscribe to page context changes (Pages editor)
const { unsubscribe } = await client.query("pages.context", {
  subscribe: true,
  onSuccess: (pagesContext) => {
    console.log("Page changed:", pagesContext);
  },
});

// Always clean up subscriptions
unsubscribe?.();
```

## React Hooks

The scaffold generates React hooks for convenient SDK access:

```typescript
import { useMarketplaceClient } from "@/components/providers/marketplace";

function MyComponent() {
  const { client } = useMarketplaceClient();
  // Use client?.query(), client?.mutate()
}
```
