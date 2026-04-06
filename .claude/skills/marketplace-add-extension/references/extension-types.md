# Extension Point Boilerplate Templates

## Custom Field (`custom-field`)

Route: `app/custom-field/page.tsx`

A custom field appears inline in the Sitecore content editor. It receives and returns field values.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomFieldPage() {
  const { client } = useMarketplaceClient();
  const appContext = useAppContext();
  const [value, setValue] = useState("");

  const loading = !appContext;

  const handleChange = async (newValue: string) => {
    setValue(newValue);
    // Notify the host of the value change
    // The exact mutation depends on your field type
  };

  if (loading) return <Skeleton className="h-10 w-full" />;

  return (
    <div className="p-2 space-y-2">
      <Label htmlFor="field">Field Label</Label>
      <Input
        id="field"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Enter value..."
      />
    </div>
  );
}
```

## Dashboard Widget (`dashboard-widget`)

Route: `app/dashboard-widget/page.tsx`

A widget displayed on the Sitecore dashboard. Good for stats, summaries, and quick actions.

```tsx
"use client";

import { useEffect, useState } from "react";
import type { UserInfo } from "@sitecore-marketplace-sdk/client";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DashboardWidgetPage() {
  const { client } = useMarketplaceClient();
  const [data, setData] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    async function fetchData() {
      try {
        const { data: user } = await client.query("host.user");
        setData(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [client]);

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Widget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>Welcome, {data?.name}</p>
        <Button onClick={() => client?.mutate("pages.reloadCanvas")}>
          Reload Canvas
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Pages Context Panel (`pages-context-panel`)

Route: `app/pages-context-panel/page.tsx`

A side panel in the Pages editor. Receives current page context and can subscribe to page changes.

```tsx
"use client";

import { useEffect, useState } from "react";
import type { PagesContext } from "@sitecore-marketplace-sdk/client";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function PagesContextPanelPage() {
  const { client } = useMarketplaceClient();
  const [page, setPage] = useState<PagesContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    let cleanup: (() => void) | undefined;

    client.query("pages.context", {
      subscribe: true,
      onSuccess: setPage,
    }).then(({ data, unsubscribe }) => {
      setPage(data);
      cleanup = unsubscribe;
      setLoading(false);
    }).catch((err) => {
      console.error("Failed to load page context:", err);
      setLoading(false);
    });

    return () => cleanup?.();
  }, [client]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Page Info</h2>
        <p className="text-sm text-muted-foreground">{page?.name}</p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Draft</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Fullscreen (`fullscreen`)

Route: `app/fullscreen/page.tsx`

A full-page experience within the Sitecore shell. Use for complex CRUD interfaces, settings, or dashboards.

```tsx
"use client";

import { useEffect, useState } from "react";
import type { ApplicationContext } from "@sitecore-marketplace-sdk/client";
import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function FullscreenPage() {
  const { client } = useMarketplaceClient();
  const context = useAppContext();
  const loading = !context;

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My App</h1>
        <Button>New Item</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Example Item</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Standalone (`standalone`)

Route: `app/standalone/page.tsx`

An independent page not embedded in Sitecore shell. Good for OAuth callbacks, public pages, or standalone tools.

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function StandalonePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Standalone Page</CardTitle>
          <CardDescription>
            This page runs independently of the Sitecore shell.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use this for OAuth callbacks, public-facing pages, or standalone tools.
          </p>
          <Button className="w-full">Get Started</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```
