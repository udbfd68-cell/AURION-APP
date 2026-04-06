# Payouts Integration Reference

Whop provides two approaches for payout integration: embedded wallet components within your UI, or hosted payout dashboards via account links.

## Embedded Wallet Components (React)

Use `@whop/embedded-components-react-js` to embed payout elements directly in your platform's UI.

### Install

```bash
npm install @whop/embedded-components-react-js @whop/embedded-components-vanilla-js
```

### Access Token (Required)

Embedded components require an access token created server-side. The token is scoped to a specific company (sub-merchant):

```typescript
import Whop from "@whop/sdk";

const client = new Whop({ apiKey: process.env.WHOP_API_KEY });

// Create an access token for the sub-merchant
const token = await client.accessTokens.create({
  company_id: "biz_xxxxxxxxxxxxx",  // sub-merchant company ID
  // expires_at: defaults to 1 hour, max 3 hours
  // scoped_actions: optional, inherits all permissions if omitted
});

// Pass token.token to the client
```

### Component Setup

```tsx
import { Elements } from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";

const elements = loadWhopElements({
  environment: "production",  // or "sandbox"
});

async function getToken() {
  const res = await fetch("/api/payout-token");
  const data = await res.json();
  return data.token;
}

function PayoutDashboard() {
  return (
    <Elements elements={elements}>
      {/* Wallet/payout components go here */}
    </Elements>
  );
}
```

### PayoutsSession Wrapper

Wrap payout-specific elements in a `PayoutsSession` for authentication:

```tsx
import { PayoutsSession } from "@whop/embedded-components-react-js";

function VendorPayouts({ vendorCompanyId }: { vendorCompanyId: string }) {
  return (
    <Elements elements={elements}>
      <PayoutsSession
        token={getToken}
        companyId={vendorCompanyId}
        redirectUrl="https://yourplatform.com/payouts"
      >
        {/* Payout elements go here */}
      </PayoutsSession>
    </Elements>
  );
}
```

### VerifyElement (In-App KYC)

Embed KYC verification directly in your app instead of redirecting:

```tsx
import { VerifyElement } from "@whop/embedded-components-react-js";

function KYCVerification() {
  return (
    <Elements elements={elements}>
      <PayoutsSession token={getToken} companyId="biz_xxxxxxxxxxxxx">
        <VerifyElement
          onVerificationSubmitted={() => {
            console.log("KYC submitted, pending review");
          }}
          onClose={() => {
            console.log("User closed verification");
          }}
        />
      </PayoutsSession>
    </Elements>
  );
}
```

### AddPayoutMethodElement

Let users add payout methods (bank accounts, PayPal, etc.) inline:

```tsx
import { AddPayoutMethodElement } from "@whop/embedded-components-react-js";

function AddPayoutMethod() {
  return (
    <Elements elements={elements}>
      <PayoutsSession token={getToken} companyId="biz_xxxxxxxxxxxxx">
        <AddPayoutMethodElement
          onComplete={(method) => {
            console.log("Payout method added:", method.id);
          }}
          onClose={() => {
            console.log("User closed form");
          }}
        />
      </PayoutsSession>
    </Elements>
  );
}
```

### Appearance Configuration

Customize the look of embedded payout components:

```tsx
const elements = loadWhopElements({
  environment: "production",
  appearance: {
    theme: {
      appearance: "dark",     // "light" or "dark"
      grayColor: "slate",     // gray palette
    },
  },
});
```

### Vanilla JS Setup

```typescript
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";

async function getToken() {
  const res = await fetch("/api/payout-token");
  return (await res.json()).token;
}

const whopElements = await loadWhopElements({
  environment: "production",
});

// Create and mount elements programmatically
const element = whopElements.createElement("payout-element", {
  // options
});
element.mount("#payout-container");
```

## Hosted Payouts Dashboard

For a fully hosted experience, generate an account link that redirects the sub-merchant to their Whop payouts portal:

```typescript
const link = await client.accountLinks.create({
  company_id: "biz_xxxxxxxxxxxxx",   // sub-merchant company ID
  use_case: "hosted_payouts",
  return_url: "https://yourplatform.com/dashboard",
  refresh_url: "https://yourplatform.com/refresh",
});

// Redirect the user to link.url
```

The hosted payouts dashboard shows:
- Available balance
- Payout history
- Payout methods management
- Withdrawal requests

## Hosted KYC Onboarding

For sub-merchant verification and onboarding:

```typescript
const link = await client.accountLinks.create({
  company_id: "biz_xxxxxxxxxxxxx",
  use_case: "hosted_kyc",
  return_url: "https://yourplatform.com/dashboard",
  refresh_url: "https://yourplatform.com/refresh",
});
```

## Account Onboarding Link

For full account setup (KYC + payout methods in one flow):

```typescript
const link = await client.accountLinks.create({
  company_id: "biz_xxxxxxxxxxxxx",
  use_case: "account_onboarding",
  return_url: "https://yourplatform.com/dashboard",
  refresh_url: "https://yourplatform.com/refresh",
});
```

## Platform (Connected Accounts) Setup

If you run a platform with sub-merchants:

### Create Connected Accounts

```typescript
const subMerchant = await client.companies.create({
  parent_company_id: "biz_yourplatform",
  // additional company details
});
```

### List Connected Accounts

```typescript
const companies = await client.companies.list({
  parent_company_id: "biz_yourplatform",
});
```

### Fee Markups

Configure platform fees on connected accounts:

```typescript
const markups = await client.feeMarkups.list({
  company_id: "biz_yourplatform",
});
```

## Transfers API (Platform Payouts)

Transfer funds from platform to connected accounts:

```typescript
// Check balance before transferring
const ledger = await client.ledgerAccounts.retrieve("biz_platform");
const usdBalance = ledger.balances.find(b => b.currency === "usd");
console.log("Available:", usdBalance.balance);  // in cents

// Transfer to vendor
const transfer = await client.transfers.create({
  amount: 5000,                    // in CENTS
  currency: "usd",
  origin_id: "biz_platform",
  destination_id: "biz_vendor",
  metadata: { reason: "March payout" },
  notes: "March earnings",
  idempotence_key: "march_payout_vendor123",
});
```

## Auto-Withdraw After Transfer

After approving a transfer, auto-withdraw to the recipient's default payout method:

```typescript
// After approving a transfer, auto-withdraw to recipient's default payout method
const methods = [];
const seen = new Set<string>();
for await (const method of await client.payoutMethods.list({ company_id: recipientCompanyId })) {
  if (!seen.has(method.id)) {
    seen.add(method.id);
    methods.push(method);
  }
}
const defaultMethod = methods.find(m => m.is_default);
if (defaultMethod) {
  await client.withdrawals.create({
    company_id: recipientCompanyId,
    amount: transferAmountCents / 100,  // Convert cents to dollars!
    currency: "usd",
    payout_method_id: defaultMethod.id,
  });
}
```

## Withdrawals API

Connected accounts can withdraw funds to their payout method:

```typescript
// WARNING: amount is in DOLLARS, not cents (unlike transfers)
const withdrawal = await client.withdrawals.create({
  company_id: "biz_vendor",
  amount: 50.00,                    // DOLLARS, not cents
  currency: "usd",
  payout_method_id: "pm_xxxxxxxxxxxxx",
});
```

## Payout Methods API

List available payout methods for a company:

```typescript
const methods = await client.payoutMethods.list({
  company_id: "biz_vendor",
});

// Each method:
// method.id
// method.is_default
// method.institution_name — e.g., "Bank of America"
// method.destination.category — e.g., "bank_account", "paypal"
```

## Ledger Balance Checking

Always check balances before initiating transfers:

```typescript
const ledger = await client.ledgerAccounts.retrieve("biz_platform");

// ledger.balances — array of { currency, balance, pending_balance }
// ledger.payout_account_details.latest_verification.status — KYC status
// ledger.payments_approval_status — payment approval state
```

## Pre-Transfer Validation Gates

Before transferring funds to a connected account, validate:

```typescript
async function canTransfer(companyId: string): Promise<boolean> {
  const ledger = await client.ledgerAccounts.retrieve(companyId);

  // 1. KYC must be verified
  // Verification status values:
  // "verified" — fully verified, can receive payouts
  // "approved" — approved, can receive payouts
  // "requires_input" — needs more info from user
  // "resubmission_requested" — docs need resubmission
  // "processing" — verification in progress
  // "submitted" — submitted, awaiting review
  // "declined" — rejected
  // "expired" — verification expired
  const kycStatus = ledger.payout_account_details?.latest_verification?.status;
  if (kycStatus !== "verified") {
    console.log("KYC not verified:", kycStatus);
    return false;
  }

  // 2. Must have a payout method
  const methods = await client.payoutMethods.list({ company_id: companyId });
  if (!methods.data?.length) {
    console.log("No payout method configured");
    return false;
  }

  // 3. Must have sufficient balance (for origin account)
  const balance = ledger.balances?.find(b => b.currency === "usd");
  if (!balance || balance.balance <= 0) {
    console.log("Insufficient balance");
    return false;
  }

  // Payments approval status values:
  // "approved" — can transact
  // "monitoring" — under review but active
  // "pending" — awaiting approval
  // "rejected" — cannot transact

  return true;
}
```

## Payout API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/withdrawals` | GET | List withdrawals |
| `/api/v1/withdrawals` | POST | Create withdrawal |
| `/api/v1/payout_methods` | GET | List payout methods |
| `/api/v1/payout_accounts` | GET | List payout accounts |
| `/api/v1/ledger_accounts` | GET | List ledger accounts (balances) |
| `/api/v1/transfers` | GET | List transfers |
| `/api/v1/transfers` | POST | Create transfer |
| `/api/v1/transfers/{id}` | GET | Retrieve transfer |
| `/api/v1/account_links` | POST | Create account link (hosted dashboard) |
| `/api/v1/access_tokens` | POST | Create access token (embedded components) |
| `/api/v1/verifications` | GET | List verification status |

## Interactive Playground

Try embedded payout components live at: [docs.whop.com/developer/platforms/playground](https://docs.whop.com/developer/platforms/playground)

## Important Notes

- Access tokens expire (default 1 hour, max 3 hours). Implement token refresh logic for long sessions.
- The `company_id` in access token creation must be a sub-merchant of the API key's company.
- `scoped_actions` on access tokens can restrict permissions to a subset of the API key's permissions. Omit to inherit all.
- Hosted payout dashboards handle all UI, KYC, and compliance flows. Use when you want minimal frontend work.
- Embedded components give full control over look and feel but require more integration work.
- **Withdrawals use DOLLARS** while **transfers use CENTS** — be careful with unit conversion.
