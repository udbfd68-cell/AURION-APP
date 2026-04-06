# Webhooks Reference

Receive real-time events from Whop for payments, memberships, and other resources.

## Webhook Types

### Company Webhooks

Receive events for your own company only. No permission request required.

**Setup:**
1. Go to [Developer Dashboard](https://whop.com/dashboard/developer) (not inside an app)
2. Click "Create Webhook"
3. Enter your webhook URL
4. Select events to receive
5. Ensure API version is `v1`

### App Webhooks

Receive events for any company that has your app installed. Requires permission requests.

**Setup:**
1. Go to [Developer Dashboard](https://whop.com/dashboard/developer) > select your app
2. Go to the Webhooks tab
3. Click "Create Webhook"
4. Enter your webhook URL and select events
5. Go to the Permissions tab
6. Add the `webhook_receive:xxxxxxx` permissions matching your selected events
7. Save and provide justification

## Validating Webhooks

Whop follows the [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks) spec. Always validate webhook signatures to prevent spoofing.

### SDK Setup

```typescript
import { Whop } from "@whop/sdk";

export const whopsdk = new Whop({
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET || ""),
});
```

The `webhookKey` must be base64-encoded. Find your webhook secret in the company or app webhooks table in the dashboard.

### GET Verification Endpoint

Whop may verify webhook URLs with a GET request before sending events. Your endpoint should handle both GET and POST:

```typescript
// Next.js App Router
export async function GET() {
  // Whop pings this to verify the URL is reachable
  return new Response("OK", { status: 200 });
}

export async function POST(request: NextRequest): Promise<Response> {
  // Handle webhook events (see below)
}
```

### Unwrap Pattern (Next.js)

```typescript
import { waitUntil } from "@vercel/functions";
import type { Payment } from "@whop/sdk/resources.js";
import type { NextRequest } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";

export async function POST(request: NextRequest): Promise<Response> {
  const requestBodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  // Validates signature and parses the event
  const webhookData = whopsdk.webhooks.unwrap(requestBodyText, { headers });

  if (webhookData.type === "payment.succeeded") {
    waitUntil(handlePaymentSucceeded(webhookData.data));
  }

  if (webhookData.type === "membership.activated") {
    waitUntil(handleMembershipActivated(webhookData.data));
  }

  // Return 2xx quickly to prevent retries
  return new Response("OK", { status: 200 });
}

async function handlePaymentSucceeded(payment: Payment) {
  console.log("Payment succeeded:", payment.id);
  // Update your database, fulfill order, etc.
}

async function handleMembershipActivated(membership: any) {
  console.log("Membership activated:", membership.id);
  // Grant access, send welcome email, etc.
}
```

### Express.js Example

```typescript
import express from "express";
import { Whop } from "@whop/sdk";

const app = express();
const whopsdk = new Whop({
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET || ""),
});

app.post("/webhooks/whop", express.text({ type: "*/*" }), (req, res) => {
  try {
    const webhookData = whopsdk.webhooks.unwrap(req.body, {
      headers: req.headers,
    });

    switch (webhookData.type) {
      case "payment.succeeded":
        // handle payment
        break;
      case "membership.activated":
        // handle activation
        break;
      case "membership.deactivated":
        // handle deactivation
        break;
      case "membership.went_valid":
        // handle membership becoming valid
        break;
      case "membership.went_invalid":
        // handle membership becoming invalid
        break;
      case "payout.completed":
        // handle payout completion
        break;
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook validation failed:", error);
    res.status(400).send("Invalid webhook");
  }
});
```

## Webhook Body Structure

Every webhook delivery has this structure:

```typescript
{
  event: string;          // e.g. "payment.succeeded" — NOTE: field is "event", not "type"
  data: object;           // The full resource object (Payment, Membership, etc.)
}
```

After `unwrap()`, the SDK normalizes this to `{ type, data }` for consistency.

### Event Name Normalization

Event names use **dots** in documentation and SDK (`payment.succeeded`, `membership.went_valid`), but the raw webhook payload may use **underscores** (`payment_succeeded`, `membership_went_valid`). The SDK's `unwrap()` handles this normalization automatically.

If you parse raw payloads without the SDK, handle both formats:

```typescript
// Raw payload handling (without SDK)
const body = JSON.parse(rawBody);
const eventType = body.event.replace(/_/g, ".");  // normalize underscores to dots
```

## Common Webhook Events

### Payment Events

| Event | Fired when |
|-------|-----------|
| `payment.succeeded` | A payment is successfully processed |

### Membership Events

| Event | Fired when |
|-------|-----------|
| `membership.activated` | Someone joins a product (new membership) |
| `membership.deactivated` | Membership goes invalid (failed payment, cancellation, left) |
| `membership.went_valid` | Membership transitions to valid state (e.g., after renewal payment) |
| `membership.went_invalid` | Membership transitions to invalid state (e.g., payment failed) |

### Payout Events

| Event | Fired when |
|-------|-----------|
| `payout.completed` | A payout to a connected account completes |

### Entry Events

| Event | Fired when |
|-------|-----------|
| `entry.created` | Someone joins a waitlist |

### Resolution Center Events

| Event | Fired when |
|-------|-----------|
| `resolution_center_case.*` | Resolution center case events |

## Event Schema

The `data` field contains the exact same schema as the corresponding API resource. For example, `payment.succeeded` data matches the Payment object from `GET /payments/{id}`.

Full event schemas are documented in the [API Reference](https://docs.whop.com/api-reference/) under each resource's "hook" pages.

## Error Handling Patterns

Common API error strings to handle:

```typescript
try {
  const result = await client.someEndpoint();
} catch (error) {
  if (error.message.includes("company not found")) {
    // Connected account doesn't exist
  }
  if (error.message.includes("insufficient balance")) {
    // Not enough funds for transfer
  }
  if (error.message.includes("verification required")) {
    // KYC not completed
  }
  if (error.message.includes("rate limited")) {
    // Back off and retry
  }
}
```

## Local Development

Use ngrok or Cloudflare Tunnels to forward webhook requests to your local development environment:

```bash
# ngrok
ngrok http 3000

# Then use the ngrok URL as your webhook endpoint
# e.g. https://abc123.ngrok.io/webhooks/whop
```

## Important Notes

- **Return 2xx quickly.** If your handler takes too long, Whop will retry the webhook. Offload heavy processing to background jobs or use `waitUntil()`.
- **Idempotency.** Webhooks may be delivered more than once. Use the resource ID to deduplicate.
- **Webhook secret is required.** Always validate signatures in production. The `unwrap` method handles this automatically.
- **`webhookKey` must be base64-encoded.** Use `btoa(secret)` in JavaScript or equivalent in other languages.
- **App webhooks require permissions.** Add the matching `webhook_receive:*` permissions in your app settings.
- **Use raw body for validation.** Do not parse the body as JSON before passing to `unwrap`. Use `request.text()` (Next.js) or `express.text()` (Express).
- **Handle GET requests.** Whop may verify your webhook URL with a GET request before sending events.
- **Raw payload uses `event` field**, not `type`. The SDK normalizes this via `unwrap()`.
