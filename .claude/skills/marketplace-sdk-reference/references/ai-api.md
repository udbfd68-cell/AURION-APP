# AI Skills Package API Reference

## Module Registration

```typescript
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { AI } from "@sitecore-marketplace-sdk/ai";

const client = await ClientSDK.init({
  target: window.parent,
  modules: [AI],
});
```

## Brand Review API

The Brand Review API provides AI-powered content analysis against a brand kit configured in Sitecore.

### Client-Side

| Key | Type | Description |
|-----|------|-------------|
| `ai.skills.generateBrandReview` | Mutation | Generate a brand review for content |

```typescript
// Get sitecoreContextId from application context
const { data: appContext } = await client.query("application.context");
const sitecoreContextId = appContext.resourceAccess[0].context.live;

// Text review
const { data: review } = await client.mutate("ai.skills.generateBrandReview", {
  body: {
    brandkitId: "your-brand-kit-id",
    input: { text: "Your marketing copy here..." },
  },
  query: { sitecoreContextId },
});

// Image review (by URL)
const { data: review } = await client.mutate("ai.skills.generateBrandReview", {
  body: {
    brandkitId: "your-brand-kit-id",
    input: {
      banner: {
        name: "banner.png",
        type: "image",
        url: "https://example.com/banner.png",
        mimeType: "image/png",
      },
    },
  },
  query: { sitecoreContextId },
});

// Document review (by URL)
const { data: review } = await client.mutate("ai.skills.generateBrandReview", {
  body: {
    brandkitId: "your-brand-kit-id",
    input: {
      campaign: {
        name: "brief.pdf",
        type: "document",
        url: "https://example.com/brief.pdf",
        mimeType: "application/pdf",
      },
    },
  },
  query: { sitecoreContextId },
});
```

## Server-Side Client

For full-stack (Auth0) apps:

```typescript
import { experimental_createAIClient } from "@sitecore-marketplace-sdk/ai";

const aiClient = await experimental_createAIClient({
  getAccessToken: async () => {
    return await getYourAccessToken();
  },
});

const review = await aiClient.skills.generateBrandReview({
  body: {
    brandkitId: "your-brand-kit-id",
    input: { text: "Content to review..." },
  },
  query: { sitecoreContextId: "your-context-id" },
});
```
