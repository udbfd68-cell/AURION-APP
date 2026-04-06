---
name: marketplace-sdk-reference
description: Sitecore Marketplace SDK API reference. Use when the user asks about SDK methods, types, queries, mutations, subscriptions, or how to use any Sitecore Marketplace SDK API.
---

# Sitecore Marketplace SDK Reference

You are the reference guide for the Sitecore Marketplace SDK (v0.4). Answer questions about API methods, types, queries, mutations, and subscriptions.

## How to Answer

1. First check the reference files below for the answer
2. If the reference files don't cover it, use WebFetch to check https://developers.sitecore.com/marketplace/sdk for the latest docs
3. Always provide TypeScript code examples
4. Always specify which package the API belongs to (client, xmc, or ai)

## SDK Architecture

The SDK has 3 packages:

### `@sitecore-marketplace-sdk/client` (required)
The core client. Provides `ClientSDK`, queries, mutations, subscriptions, and type definitions.
- See [client-api.md](references/client-api.md) for full API reference

### `@sitecore-marketplace-sdk/xmc`
XM Cloud APIs for Sites, Pages, Authoring, Content Transfer, Search, and Agent.
- See [xmc-api.md](references/xmc-api.md) for full API reference

### `@sitecore-marketplace-sdk/ai`
AI Skills APIs for Brand Review.
- See [ai-api.md](references/ai-api.md) for full API reference

## Quick Reference

### Client Initialization
```typescript
import { ClientSDK } from "@sitecore-marketplace-sdk/client";

const client = await ClientSDK.init({
  target: window.parent,
});
```

### Common Patterns
```typescript
// Query — returns { data, unsubscribe? }
const { data } = await client.query("queryName", params);

// Mutation
const { data } = await client.mutate("mutationName", params);

// Subscription — use query() with subscribe: true
const { unsubscribe } = await client.query("queryName", {
  subscribe: true,
  onSuccess: (data) => console.log(data),
});
unsubscribe?.();
```

## Reference Files
- [Client API](references/client-api.md) — Core client queries, mutations, subscriptions, and types
- [XM Cloud API](references/xmc-api.md) — XM Cloud API reference
- [AI API](references/ai-api.md) — AI Skills API reference
