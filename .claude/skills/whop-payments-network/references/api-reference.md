# API Reference

Base URL: `https://api.whop.com/api/v1`

## SDK Installation

### TypeScript / JavaScript

```bash
npm install @whop/sdk
```

```typescript
import Whop from "@whop/sdk";

// With App API Key (for apps installed on other companies)
const client = new Whop({
  apiKey: process.env.WHOP_API_KEY,
  appID: "app_xxxxxxxxxxxxxx",
});

// With Company API Key (for your own company's data + connected accounts)
const client = new Whop({
  apiKey: process.env.WHOP_API_KEY,
});
```

### Python

```bash
pip install whop-sdk
```

```python
import os
from whop_sdk import Whop

client = Whop(
    api_key=os.environ.get("WHOP_API_KEY"),
    app_id="app_xxxxxxxxxxxxxx",  # only for app API keys
)
```

### Ruby

```bash
gem install whop_sdk
```

```ruby
require "whop_sdk"

whop = WhopSDK::Client.new(
  api_key: ENV["WHOP_API_KEY"],
  app_id: "app_xxxxxxxxxxxxxx",  # only for app API keys
)
```

## Authentication

Include your API key in the `Authorization` header using Bearer scheme:

```bash
curl https://api.whop.com/api/v1/payments?company_id=biz_xxx \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### API Key Types

| Type | Use case | Where to get |
|------|----------|--------------|
| **Company API Key** | Your own company's data + connected accounts | Dashboard > Developer > Company API Keys |
| **App API Key** | Data on companies that installed your app | Dashboard > Developer > App > Environment Variables |
| **OAuth Token** | Act on behalf of a user | OAuth 2.1 + PKCE flow |

### Company API Key Creation

1. Go to [developer dashboard](https://whop.com/dashboard/developer)
2. Click "Create" in the Company API Keys section
3. Name it (e.g., "Data pipeline", "GHL Integration")
4. Select a role or custom permissions
5. Copy the key from the modal

### App API Key Location

1. Go to [developer dashboard](https://whop.com/dashboard/developer)
2. Create or select an app
3. Find `WHOP_API_KEY` in the Environment Variables section
4. Use the reveal button to show and copy it

## Key API Endpoints

### Payments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/payments` | GET | List payments for a company |
| `/payments/{id}` | GET | Retrieve a specific payment |

```typescript
const payments = await client.payments.list({
  company_id: "biz_xxxxxxxxxxxxxx",
});
```

### Products

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/products` | POST | Create a product |
| `/products` | GET | List products |
| `/products/{id}` | PATCH | Update a product |

```typescript
// Create a product
const product = await client.products.create({
  company_id: "biz_xxxxxxxxxxxxx",
  title: "Premium Membership",
  description: "Access to all premium features",
  visibility: "visible",  // or "hidden", "archived"
});

// List products
const products = await client.products.list({
  company_id: "biz_xxxxxxxxxxxxx",
});

// Update a product
const updated = await client.products.update("prod_xxxxxxxxxxxxx", {
  title: "Updated Title",
  visibility: "hidden",
});
```

### Plans

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/plans` | POST | Create a plan (returns `purchase_url`) |
| `/plans` | GET | List plans |
| `/plans/{id}` | GET | Retrieve a plan |

```typescript
const plan = await client.plans.create({
  company_id: "biz_xxxxxxxxxxxxx",
  product_id: "prod_xxxxxxxxxxxxx",
  initial_price: 10.0,
  plan_type: "one_time",       // or "renewal"
  renewal_price: 5.0,          // only for "renewal" plan_type
  billing_period: 30,          // days, only for "renewal"
  currency: "usd",
  stock: 100,                  // optional, limits quantity
  visibility: "visible",       // "visible", "hidden", "archived"
  release_method: "buy_now",   // "buy_now", "waitlist", "application"
  internal_notes: "VIP plan",  // admin-only notes
});

// plan.purchase_url — direct checkout link
// plan.id — use with embedded checkout
```

### Checkout Configurations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/checkout_configurations` | POST | Create a checkout config (for embedded checkout) |

```typescript
const config = await client.checkoutConfigurations.create({
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
// config.id — checkout configuration ID (use as sessionId)
// config.purchase_url — direct checkout URL
// config.plan.id — the created plan ID
```

### Memberships

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/memberships` | GET | List memberships |
| `/memberships/{id}` | GET | Retrieve a membership |

```typescript
const memberships = await client.memberships.list({
  company_id: "biz_xxxxxxxxxxxxxx",
});

// Cancel a membership
await client.memberships.cancel(membershipId);

// Update membership metadata
await client.memberships.update(membershipId, { metadata: { status: "cancelled_by_host" } });
```

### Companies (Connected Accounts)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/companies` | POST | Create a company (connected account) |
| `/companies` | GET | List companies |
| `/companies/{id}` | GET | Retrieve a company |

```typescript
// Create connected account
const company = await client.companies.create({
  parent_company_id: "biz_yourplatform",
  email: "vendor@example.com",
  title: "Vendor Store",
  metadata: { vendor_id: "v_123", tier: "premium" },
});

// List connected accounts
const companies = await client.companies.list({
  parent_company_id: "biz_yourplatform",
});

// Retrieve a company
const company = await client.companies.retrieve("biz_xxxxxxxxxxxxx");

// Update a company
const updated = await client.companies.update("biz_xxxxxxxxxxxxx", {
  title: "Updated Store Name",
  metadata: { vendor_id: "v_123", tier: "enterprise" },
});
```

### Transfers

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/transfers` | POST | Transfer funds between accounts |
| `/transfers` | GET | List transfers |
| `/transfers/{id}` | GET | Retrieve a transfer |

```typescript
// Transfer funds from platform to connected account
const transfer = await client.transfers.create({
  amount: 5000,                    // in cents
  currency: "usd",
  origin_id: "biz_platform",      // source company
  destination_id: "biz_vendor",   // destination company
  metadata: { payout_period: "2026-03" },
  notes: "March earnings payout",
  idempotence_key: "payout_2026_03_vendor123",  // prevent duplicates
});

// List transfers
const transfers = await client.transfers.list();

// Retrieve a transfer
const transfer = await client.transfers.retrieve("txfr_xxxxxxxxxxxxx");
```

### Ledger Accounts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ledger_accounts` | GET | Get ledger account for a company |

```typescript
const ledger = await client.ledgerAccounts.retrieve("biz_xxxxxxxxxxxxx");

// Response includes:
// ledger.balances — array of { currency, balance, pending_balance }
// ledger.payout_account_details.latest_verification.status — KYC status
// ledger.payments_approval_status — payment approval state
```

### Withdrawals

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/withdrawals` | POST | Create a withdrawal |
| `/withdrawals` | GET | List withdrawals |

```typescript
// WARNING: amount is in DOLLARS, not cents (unlike transfers)
const withdrawal = await client.withdrawals.create({
  company_id: "biz_xxxxxxxxxxxxx",
  amount: 50.00,                    // DOLLARS, not cents
  currency: "usd",
  payout_method_id: "pm_xxxxxxxxxxxxx",
});
```

### Payout Methods

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/payout_methods` | GET | List payout methods for a company |

```typescript
const methods = await client.payoutMethods.list({
  company_id: "biz_xxxxxxxxxxxxx",
});

// Each method includes:
// method.id — payout method ID
// method.is_default — whether it's the default
// method.institution_name — e.g., "Bank of America"
// method.destination.category — e.g., "bank_account", "paypal"
```

### Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications` | POST | Send an in-app notification |

```typescript
const notification = await client.notifications.create({
  company_id: "biz_xxxxxxxxxxxxx",
  title: "New Sale!",
  content: "You sold 3 items for $45.00",
  subtitle: "Check your dashboard",
  rest_path: "/dashboard/sales",  // in-app navigation path
});
```

### Users

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/{username}` | GET | Get public user profile (no auth required) |
| `/users/check_access` | POST | Check a user's access level for a company |

```typescript
// Check user access
const access = await client.users.checkAccess("biz_xxxxxxxxxxxxx", {
  id: "user_xxxxxxxxxxxxx",
});
// access.access_level — the user's access level
```

### Access Tokens

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/access_tokens` | POST | Create access token for embedded components |

```typescript
const token = await client.accessTokens.create({
  company_id: "biz_xxxxxxxxxxxxx",
  // expires_at: optional, default 1h, max 3h
  // scoped_actions: optional, inherits all permissions if omitted
});
```

### Account Links

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/account_links` | POST | Generate hosted dashboard URL |

```typescript
const link = await client.accountLinks.create({
  company_id: "biz_xxxxxxxxxxxxx",
  use_case: "hosted_payouts",         // or "hosted_kyc", "account_onboarding"
  return_url: "https://yourplatform.com/return",
  refresh_url: "https://yourplatform.com/refresh",
});
```

### Messages / DM Channels

```typescript
// Create a DM channel between users
const dmChannel = await client.dmChannels.create({
  with_user_ids: [userId1, userId2],
  company_id: "biz_xxx",
});

// Send a message
const message = await client.messages.create({
  channel_id: dmChannel.id,
  content: "Your booking is confirmed!",
});

// Pin a message
await client.messages.update(message.id, { is_pinned: true });
```

### Charge User

```typescript
// Charge a saved payment method (requires setupFutureUsage: "off_session" on original checkout)
const charge = await client.chargeUser({
  company_id: "biz_xxx",
  amount: 5000,  // cents
  currency: "usd",
  metadata: { order_id: "order_123" },
  idempotence_key: "charge_order_123",
});
```

### Fee Markups

```typescript
// List fee markups for a company
for await (const markup of await client.feeMarkups.list({ company_id: "biz_xxx" })) {
  console.log(markup);
}
```

### Public User Lookup

```typescript
// Public user profile lookup (no auth required)
const user = await client.users.retrieve("username");
```

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks` | POST | Create a webhook |
| `/webhooks` | GET | List webhooks |

## Async Iteration (List Endpoints)

All list endpoints support async iteration for paginating through results:

```typescript
// Iterate through all items across pages
for await (const payment of await client.payments.list({
  company_id: "biz_xxxxxxxxxxxxx",
})) {
  console.log(payment.id);
}

// Or get a single page
const page = await client.payments.list({ company_id: "biz_xxx" });
const payments = page.data;
```

## MCP Server

AI agents can access the full Whop API via MCP servers:

### Whop API MCP

| Transport | URL |
|-----------|-----|
| HTTP Streaming (Cursor) | `https://mcp.whop.com/mcp` |
| SSE (Claude) | `https://mcp.whop.com/sse` |

Provide your API key when connecting. Supports all API operations.

### Whop Docs MCP

| Transport | URL |
|-----------|-----|
| All clients | `https://docs.whop.com/mcp` |

Search and read Whop documentation. No auth required.

### Setup Examples

```json
// Cursor: ~/.cursor/config/mcp.json
{
  "mcpServers": {
    "whop-docs": { "url": "https://docs.whop.com/mcp" },
    "whop-api": { "url": "https://mcp.whop.com/mcp" }
  }
}
```

```json
// Claude Code: ~/.claude/mcp.json
{
  "mcpServers": {
    "whop-docs": { "url": "https://docs.whop.com/mcp" },
    "whop-api": { "url": "https://mcp.whop.com/sse" }
  }
}
```

## Pagination

List endpoints return paginated responses. Access results via `.data`:

```typescript
const page = await client.payments.list({ company_id: "biz_xxx" });
const payments = page.data;
```

## Error Handling

- **401** — Invalid or missing API key
- **403** — Missing permissions (app needs re-approval, or scope not granted)
- **404** — Resource not found
- **422** — Invalid request parameters
- **429** — Rate limited
