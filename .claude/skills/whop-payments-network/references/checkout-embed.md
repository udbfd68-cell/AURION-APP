# Embedded Checkout Reference

Full reference for embedding Whop's checkout flow in your website.

## React Setup

### Install

```bash
npm install @whop/checkout
```

### Basic Usage

```tsx
import { WhopCheckoutEmbed } from "@whop/checkout/react";

export default function Checkout() {
  return (
    <WhopCheckoutEmbed
      planId="plan_XXXXXXXXX"
      returnUrl="https://yoursite.com/checkout/complete"
    />
  );
}
```

### With Checkout Configuration (Session)

Create a checkout configuration server-side to attach metadata, inline plans, and application fees:

```typescript
// Server — full checkout configuration with all fields
const checkoutConfig = await client.checkoutConfigurations.create({
  company_id: "biz_xxxxxxxxxxxxx",
  mode: "payment",
  redirect_url: "https://yoursite.com/success",
  plan: {
    company_id: "biz_xxxxxxxxxxxxx",
    product_id: "prod_xxxxxxxxxxxxx",
    currency: "usd",
    initial_price: 10.0,
    plan_type: "one_time",
    visibility: "hidden",
    release_method: "buy_now",
    application_fee_amount: 2.0,  // platform fee in dollars
  },
  metadata: { order_id: "order_12345" },
});

// Response shape:
// checkoutConfig.id — use as sessionId
// checkoutConfig.purchase_url — direct URL
// checkoutConfig.plan.id — created plan ID
```

```tsx
// Client
<WhopCheckoutEmbed
  sessionId="ch_XXXXXXXXX"  // checkoutConfig.id from server
  planId="plan_XXXXXXXXX"
  returnUrl="https://yoursite.com/checkout/complete"
  theme="light"
/>
```

### SPA Pattern (No Redirect)

For single-page apps, use `skipRedirect` + `onComplete` to stay on the page:

```tsx
import { useRouter } from "next/navigation";

function Checkout() {
  const router = useRouter();

  return (
    <WhopCheckoutEmbed
      planId="plan_XXXXXXXXX"
      skipRedirect={true}
      onComplete={(planId, receiptId) => {
        router.push(`/success?receipt=${receiptId}`);
      }}
    />
  );
}
```

### Cart Aggregation Pattern

For multi-item carts, aggregate items into a single checkout config with total price and metadata:

```typescript
// Server — create a checkout config for the whole cart
const items = [
  { name: "Widget A", price: 10.0, qty: 2 },
  { name: "Widget B", price: 25.0, qty: 1 },
];
const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

const checkoutConfig = await client.checkoutConfigurations.create({
  company_id: "biz_xxxxxxxxxxxxx",
  plan: {
    initial_price: total,  // 45.00
    plan_type: "one_time",
  },
  metadata: {
    cart_items: JSON.stringify(items),
    cart_total: total,
  },
});

// Use checkoutConfig.id as sessionId on the client
```

### Programmatic Controls

Use `useCheckoutEmbedControls()` for programmatic interaction:

```tsx
import { WhopCheckoutEmbed, useCheckoutEmbedControls } from "@whop/checkout/react";

function Checkout() {
  const ref = useCheckoutEmbedControls();

  return (
    <>
      <WhopCheckoutEmbed ref={ref} planId="plan_XXXXXXXXX" />
      <button onClick={() => ref.current?.submit()}>Pay Now</button>
    </>
  );
}
```

#### Available Methods

| Method | Description |
|--------|-------------|
| `ref.current?.submit()` | Submit checkout programmatically |
| `await ref.current?.getEmail()` | Get the customer's email |
| `await ref.current?.setEmail("user@example.com")` | Set the customer's email |
| `await ref.current?.getAddress()` | Get the customer's address |
| `await ref.current?.setAddress({...})` | Set the customer's address (requires `hideAddressForm={true}`) |

#### setAddress Format

```tsx
await ref.current?.setAddress({
  name: "John Doe",
  country: "US",
  line1: "123 Main St",
  city: "Any Town",
  state: "CA",
  postalCode: "12345",
});
```

### All React Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `planId` | `string` | Yes | The plan ID to checkout |
| `sessionId` | `string` | No | Checkout configuration ID for metadata |
| `returnUrl` | `string` | No | URL to redirect after external payment completes |
| `theme` | `"light" \| "dark" \| "system"` | No | Theme for the checkout UI |
| `themeOptions` | `{ accentColor: string, highContrast: boolean }` | No | Fine-grained theme customization |
| `environment` | `"production" \| "sandbox"` | No | Defaults to `production` |
| `affiliateCode` | `string` | No | Affiliate tracking code |
| `hidePrice` | `boolean` | No | Hide the price display |
| `hideTermsAndConditions` | `boolean` | No | Hide terms and conditions |
| `hideEmail` | `boolean` | No | Hide email input (use with `prefill` or `setEmail`) |
| `disableEmail` | `boolean` | No | Make email input read-only |
| `hideAddressForm` | `boolean` | No | Hide address form (required for `setAddress`) |
| `skipRedirect` | `boolean` | No | Keep top frame loaded after checkout |
| `setupFutureUsage` | `"off_session"` | No | Required for `chargeUser` API |
| `onComplete` | `(planId, receiptId) => void` | No | Callback on success (sets `skipRedirect=true`) |
| `onStateChange` | `(state: "loading" \| "ready" \| "disabled") => void` | No | Checkout state changes |
| `onAddressValidationError` | `(error) => void` | No | Address validation errors (requires `hideAddressForm`) |
| `onPromoCodeChanged` | `(promoCode \| null) => void` | No | Promo code applied/removed |
| `fallback` | `ReactNode` | No | Loading placeholder |
| `utm` | `Record<string, string>` | No | UTM parameters (keys must start with `utm_`) |
| `prefill` | `{ email?: string, address?: {...} }` | No | Prefill email or address |
| `styles` | `{ container: { paddingX?, paddingY?, paddingTop?, ... } }` | No | Container padding in pixels (default: 32) |

### Sandbox Testing

Use `environment="sandbox"` with plan IDs from [sandbox.whop.com/dashboard](https://sandbox.whop.com/dashboard):

```tsx
<WhopCheckoutEmbed
  environment="sandbox"
  planId="plan_XXXXXXXXX"  // must be a sandbox plan ID
/>
```

Sandbox checkout URL format: `https://sandbox.whop.com/checkout/{planId}`

## Vanilla JS Setup (Non-React)

### Step 1: Add Script

```html
<script async defer src="https://js.whop.com/static/checkout/loader.js"></script>
```

### Step 2: Add Checkout Element

```html
<div
  data-whop-checkout-plan-id="plan_XXXXXXXXX"
  data-whop-checkout-return-url="https://yoursite.com/checkout/complete"
></div>
```

### Programmatic Controls (Vanilla JS)

Attach an `id` to the container, then use the global `wco` object:

```html
<div id="whop-embedded-checkout" data-whop-checkout-plan-id="plan_XXXXXXXXX"></div>

<script>
  // Submit
  wco.submit("whop-embedded-checkout");

  // Get/set email
  const email = await wco.getEmail("whop-embedded-checkout");
  wco.setEmail("whop-embedded-checkout", "user@example.com");

  // Get/set address (requires data-whop-checkout-hide-address="true")
  const address = await wco.getAddress("whop-embedded-checkout");
  await wco.setAddress("whop-embedded-checkout", {
    name: "John Doe",
    country: "US",
    line1: "123 Main St",
    city: "Any Town",
    state: "CA",
    postalCode: "12345",
  });
</script>
```

### All Vanilla JS Data Attributes

| Attribute | Description |
|-----------|-------------|
| `data-whop-checkout-plan-id` | **Required.** Plan ID |
| `data-whop-checkout-return-url` | Redirect URL after external payment |
| `data-whop-checkout-theme` | `light`, `dark`, or `system` |
| `data-whop-checkout-theme-accent-color` | Accent color (e.g. `green`, `blue`, `red`, `purple`) |
| `data-whop-checkout-session` | Checkout configuration ID |
| `data-whop-checkout-affiliate-code` | Affiliate code |
| `data-whop-checkout-hide-price` | `true` to hide price |
| `data-whop-checkout-hide-submit-button` | `true` to hide submit (use programmatic submit) |
| `data-whop-checkout-hide-tos` | `true` to hide terms |
| `data-whop-checkout-hide-email` | `true` to hide email input |
| `data-whop-checkout-disable-email` | `true` to disable email input |
| `data-whop-checkout-hide-address` | `true` to hide address form |
| `data-whop-checkout-skip-redirect` | `true` to stay on page after checkout |
| `data-whop-checkout-setup-future-usage` | `off_session` for chargeUser API |
| `data-whop-checkout-environment` | `sandbox` for testing |
| `data-whop-checkout-skip-utm` | `true` to disable automatic UTM forwarding |
| `data-whop-checkout-prefill-email` | Prefill email address |
| `data-whop-checkout-prefill-name` | Prefill address name |
| `data-whop-checkout-prefill-address-country` | Prefill country |
| `data-whop-checkout-prefill-address-line1` | Prefill address line 1 |
| `data-whop-checkout-prefill-address-city` | Prefill city |
| `data-whop-checkout-prefill-address-state` | Prefill state |
| `data-whop-checkout-prefill-address-postal-code` | Prefill postal code |
| `data-whop-checkout-on-complete` | Window function name for completion callback |
| `data-whop-checkout-on-state-change` | Window function name for state changes |
| `data-whop-checkout-on-address-validation-error` | Window function for address errors |
| `data-whop-checkout-on-promo-code-changed` | Window function for promo code changes |

### Vanilla JS Callbacks

```html
<script>
  window.onCheckoutComplete = (planId, receiptId) => {
    console.log("Checkout complete:", planId, receiptId);
  };

  window.onCheckoutStateChange = (state) => {
    console.log("State:", state); // "loading" | "ready" | "disabled"
  };
</script>

<div
  data-whop-checkout-on-complete="onCheckoutComplete"
  data-whop-checkout-on-state-change="onCheckoutStateChange"
  data-whop-checkout-plan-id="plan_XXXXXXXXX"
></div>
```

## Return URL Handling

When a customer is redirected back from an external payment provider, check the `status` query parameter:

- **`success`** — Payment succeeded. Show a success page using the receipt info.
- **`error`** — Payment failed or was canceled. Remount the checkout to let the customer retry.

```tsx
// Example: /checkout/complete?status=success&receipt_id=...
const params = new URLSearchParams(window.location.search);
if (params.get("status") === "success") {
  // show success
} else {
  // remount checkout for retry
}
```
