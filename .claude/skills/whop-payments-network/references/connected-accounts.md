# Connected Accounts (Two-Sided Marketplaces)

Full reference for building platforms with connected accounts (sub-merchants) on Whop.

## Overview

Connected accounts let you build two-sided marketplaces where:
- Your **platform** is the parent company
- **Vendors/sellers** are child companies (connected accounts)
- Payments flow through your platform with configurable fees
- Each vendor gets their own products, payouts, and KYC

## Creating Connected Accounts

```typescript
import Whop from "@whop/sdk";

const client = new Whop({ apiKey: process.env.WHOP_API_KEY });

const vendor = await client.companies.create({
  parent_company_id: "biz_yourplatform",
  email: "vendor@example.com",
  title: "Vendor Store Name",
  metadata: {
    vendor_id: "v_123",
    tier: "premium",
    signup_date: "2026-03-31",
  },
});
// vendor.id — the new company ID (biz_xxxxxxxxxxxxx)
```

## Auto-Provisioning in Auth Flow

Create connected accounts automatically when users sign up via your JWT callback:

```typescript
// In your auth callback (e.g., NextAuth JWT callback)
async function handleNewUser(user: User) {
  // Check if vendor company already exists
  const existing = await findVendorByUserId(user.id);  // your DB lookup

  if (!existing) {
    // Create connected account on Whop
    const vendor = await client.companies.create({
      parent_company_id: "biz_yourplatform",
      email: user.email,
      title: user.name || user.email,
      metadata: {
        user_id: user.id,
        created_via: "auto_provision",
      },
    });

    // Store the mapping in your database
    await saveVendorMapping(user.id, vendor.id);
  }
}
```

## Listing Connected Accounts

```typescript
// List all connected accounts under your platform
const vendors = await client.companies.list({
  parent_company_id: "biz_yourplatform",
});

// Async iterate through all vendors
for await (const vendor of await client.companies.list({
  parent_company_id: "biz_yourplatform",
})) {
  console.log(vendor.id, vendor.title, vendor.metadata);
}
```

## Company Metadata as Profile Storage

Use the `metadata` field to store vendor profile data without a separate database:

```typescript
// Store vendor profile info
await client.companies.update("biz_vendor123", {
  metadata: {
    vendor_id: "v_123",
    tier: "premium",
    store_description: "Handmade crafts and gifts",
    profile_image_url: "https://example.com/avatar.jpg",
    commission_rate: "0.15",  // metadata values are strings
  },
});

// Retrieve and use metadata
const vendor = await client.companies.retrieve("biz_vendor123");
const tier = vendor.metadata?.tier;  // "premium"
```

## Per-Vendor Product Catalogs

Each connected account can have its own products and plans:

```typescript
// Create a product for a specific vendor
const product = await client.products.create({
  company_id: "biz_vendor123",  // the vendor's company ID
  title: "Premium Course",
  description: "Advanced video course",
  visibility: "visible",
});

// Create a plan under that product
const plan = await client.plans.create({
  company_id: "biz_vendor123",
  product_id: product.id,
  initial_price: 49.99,
  plan_type: "one_time",
  currency: "usd",
  visibility: "visible",
  release_method: "buy_now",
});

// List a vendor's products
const products = await client.products.list({
  company_id: "biz_vendor123",
});
```

## Application Fee Amounts

Charge platform fees on purchases made through connected accounts.

### Static Fee

Fixed dollar amount per transaction:

```typescript
const config = await client.checkoutConfigurations.create({
  company_id: "biz_vendor123",
  plan: {
    company_id: "biz_vendor123",
    product_id: "prod_xxxxxxxxxxxxx",
    initial_price: 100.0,
    plan_type: "one_time",
    currency: "usd",
    visibility: "hidden",
    release_method: "buy_now",
    application_fee_amount: 10.0,  // $10 flat fee to platform
  },
});
```

### Percentage Fee

Calculate fee as a percentage of the sale price:

```typescript
const salePrice = 100.0;
const platformFeeRate = 0.15;  // 15%
const feeAmount = salePrice * platformFeeRate;

const config = await client.checkoutConfigurations.create({
  company_id: "biz_vendor123",
  plan: {
    company_id: "biz_vendor123",
    product_id: "prod_xxxxxxxxxxxxx",
    initial_price: salePrice,
    plan_type: "one_time",
    currency: "usd",
    visibility: "hidden",
    release_method: "buy_now",
    application_fee_amount: feeAmount,  // $15.00
  },
});
```

### Tiered Fees

Different fee rates based on vendor tier or volume:

```typescript
function getPlatformFee(vendor: any, salePrice: number): number {
  const tier = vendor.metadata?.tier || "standard";
  const rates: Record<string, number> = {
    standard: 0.20,   // 20%
    premium: 0.15,    // 15%
    enterprise: 0.10, // 10%
  };
  return salePrice * (rates[tier] || rates.standard);
}
```

## Platform Treasury Model

All funds flow to the platform first, then distribute to vendors via transfers:

```typescript
// 1. All checkout configs point to the PLATFORM company
const config = await client.checkoutConfigurations.create({
  company_id: "biz_yourplatform",  // platform collects all funds
  plan: {
    company_id: "biz_yourplatform",
    initial_price: 100.0,
    plan_type: "one_time",
    currency: "usd",
    visibility: "hidden",
    release_method: "buy_now",
  },
  metadata: {
    vendor_id: "biz_vendor123",
    vendor_share: "8000",  // 80% = $80.00 in cents
  },
});

// 2. On payment.succeeded webhook, transfer vendor's share
async function handlePaymentSucceeded(payment: any) {
  const vendorId = payment.metadata?.vendor_id;
  const vendorShare = parseInt(payment.metadata?.vendor_share || "0");

  if (vendorId && vendorShare > 0) {
    await client.transfers.create({
      amount: vendorShare,              // in CENTS
      currency: "usd",
      origin_id: "biz_yourplatform",
      destination_id: vendorId,
      metadata: { payment_id: payment.id },
      notes: `Vendor share for payment ${payment.id}`,
      idempotence_key: `vendor_share_${payment.id}`,
    });
  }
}
```

### Pre-Transfer Validation

Always validate before transferring:

```typescript
async function safeTransfer(vendorId: string, amount: number) {
  // 1. Check vendor KYC status
  const ledger = await client.ledgerAccounts.retrieve(vendorId);
  const kycStatus = ledger.payout_account_details?.latest_verification?.status;
  if (kycStatus !== "verified") {
    console.log(`Vendor ${vendorId} KYC not verified: ${kycStatus}`);
    // Queue for later or notify vendor
    return;
  }

  // 2. Check vendor has a payout method
  const methods = await client.payoutMethods.list({ company_id: vendorId });
  if (!methods.data?.length) {
    console.log(`Vendor ${vendorId} has no payout method`);
    return;
  }

  // 3. Check platform has sufficient balance
  const platformLedger = await client.ledgerAccounts.retrieve("biz_yourplatform");
  const balance = platformLedger.balances?.find(b => b.currency === "usd");
  if (!balance || balance.balance < amount) {
    console.log("Insufficient platform balance");
    return;
  }

  // 4. Execute transfer
  await client.transfers.create({
    amount,
    currency: "usd",
    origin_id: "biz_yourplatform",
    destination_id: vendorId,
    idempotence_key: `transfer_${vendorId}_${Date.now()}`,
  });
}
```

## Vendor Onboarding Flow

Complete onboarding sequence for new vendors:

```typescript
// 1. Create connected account
const vendor = await client.companies.create({
  parent_company_id: "biz_yourplatform",
  email: "vendor@example.com",
  title: "New Vendor",
  metadata: { user_id: "u_123" },
});

// 2. Generate onboarding link (KYC + payout method setup)
const link = await client.accountLinks.create({
  company_id: vendor.id,
  use_case: "account_onboarding",
  return_url: "https://yourplatform.com/onboarding/complete",
  refresh_url: "https://yourplatform.com/onboarding/refresh",
});

// 3. Redirect vendor to link.url for KYC + payout setup
```
