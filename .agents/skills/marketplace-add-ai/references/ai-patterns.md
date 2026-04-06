# AI Skills Code Patterns

## Module Registration

Ensure the AI module is registered in your client initialization (`lib/sitecore/client.ts`):

```typescript
import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { AI } from "@sitecore-marketplace-sdk/ai";

export const client = await ClientSDK.init({
  target: window.parent,
  modules: [AI],
});
```

## Client-Side: Text Review

```tsx
"use client";
import { useState } from "react";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BrandReviewIssue {
  severity: "error" | "warning" | "info";
  category: string;
  description: string;
  suggestion?: string;
}

interface BrandReview {
  score: number;
  summary: string;
  issues: BrandReviewIssue[];
}

export function BrandReviewText() {
  const { client } = useMarketplaceClient();
  const appContext = useAppContext();
  const [brandkitId, setBrandkitId] = useState("");
  const [content, setContent] = useState("");
  const [review, setReview] = useState<BrandReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReview = async () => {
    if (!client || !appContext) return;
    const sitecoreContextId = appContext.resourceAccess[0].context.live;
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await client.mutate("ai.skills.generateBrandReview", {
        body: {
          brandkitId,
          input: { text: content },
        },
          query: { sitecoreContextId },
      });
      setReview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Brand kit ID..."
        value={brandkitId}
        onChange={(e) => setBrandkitId(e.target.value)}
      />
      <Textarea
        placeholder="Paste content to review..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button onClick={handleReview} disabled={loading || !content || !brandkitId}>
        {loading ? "Reviewing..." : "Review Content"}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {review && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Brand Score
              <Badge variant={review.score >= 80 ? "default" : "destructive"}>
                {review.score}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>{review.summary}</p>
            {review.issues?.map((issue, i) => (
              <Alert key={i} variant={issue.severity === "error" ? "destructive" : "default"}>
                <AlertDescription>
                  <strong>{issue.category}:</strong> {issue.description}
                  {issue.suggestion && <p className="mt-1 text-sm">{issue.suggestion}</p>}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Client-Side: Image Review

```typescript
const { data: appContext } = await client.query("application.context");
const sitecoreContextId = appContext.resourceAccess[0].context.live;

// From a URL
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
```

## Client-Side: Document Review

```typescript
const { data: appContext } = await client.query("application.context");
const sitecoreContextId = appContext.resourceAccess[0].context.live;

// From a URL
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

## Server-Side: API Route (Auth0 Required)

```typescript
// app/api/brand-review/route.ts
import { experimental_createAIClient } from "@sitecore-marketplace-sdk/ai";
import { getAccessToken } from "@auth0/nextjs-auth0";

export async function POST(request: Request) {
  const { accessToken } = await getAccessToken();
  const aiClient = await experimental_createAIClient({
    getAccessToken: async () => accessToken!,
  });

  const { brandkitId, input, sitecoreContextId } = await request.json();

  const review = await aiClient.skills.generateBrandReview({
    body: { brandkitId, input },
    query: { sitecoreContextId },
  });

  return Response.json(review);
}
```

## Server-Side: Server Action (Auth0 Required)

```typescript
// app/actions.ts
"use server";
import { experimental_createAIClient } from "@sitecore-marketplace-sdk/ai";
import { getAccessToken } from "@auth0/nextjs-auth0";

export async function reviewContent(
  brandkitId: string,
  text: string,
  sitecoreContextId: string
) {
  const { accessToken } = await getAccessToken();
  const aiClient = await experimental_createAIClient({
    getAccessToken: async () => accessToken!,
  });

  return aiClient.skills.generateBrandReview({
    body: { brandkitId, input: { text } },
    query: { sitecoreContextId },
  });
}
```
