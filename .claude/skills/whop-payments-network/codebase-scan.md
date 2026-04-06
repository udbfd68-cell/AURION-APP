# Whop Integration — Codebase Analysis

Run this prompt in Cursor, Claude Code, or any AI coding tool. It will analyze your codebase and produce a structured report that Whop's team uses to generate a tailored integration guide for your platform.

**How to use:** Copy everything below the line into your AI tool and run it against your project's root directory. It will save a `whop-integration-scan.md` file to your repo root. Send that file back to your Whop contact.

---

## Prompt

Analyze this codebase to help Whop's team build a tailored integration plan. Examine the following areas and produce a structured report. Be thorough — check every relevant file, not just the obvious ones.

### 1. Tech stack detection

Find and read dependency/config files to determine the tech stack:

- **Package managers:** Look for `package.json`, `Gemfile`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`, `build.gradle`, `pom.xml`
- **Frontend framework:** React, Next.js, Vue, Nuxt, Svelte, Angular, or server-rendered templates (ERB, Jinja, Blade, etc.)
- **Backend framework:** Express, Fastify, Rails, Django, Flask, FastAPI, Laravel, Spring, Go stdlib/Gin/Echo, etc.
- **Database:** PostgreSQL, MySQL, MongoDB, SQLite, DynamoDB — check ORM configs (Prisma, Sequelize, ActiveRecord, SQLAlchemy, etc.)
- **Hosting/deployment:** Look for `vercel.json`, `netlify.toml`, `Dockerfile`, `docker-compose.yml`, `fly.toml`, `render.yaml`, AWS/GCP/Azure config files, `Procfile`
- **Language versions:** Check `.node-version`, `.ruby-version`, `.python-version`, `.tool-versions`, `runtime.txt`

### 2. Current payment integration

Search for existing payment provider code. Look for:

- **Stripe:** imports of `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`. Find API calls like `checkout.sessions.create`, `paymentIntents.create`, `subscriptions.create`, `customers.create`. Check for Stripe webhook handlers.
- **Tipalti:** imports of `tipalti`, any Tipalti API calls for payee management, payment batches, or iframe embeds.
- **Braintree:** imports of `braintree`, drop-in UI usage, transaction calls.
- **PayPal:** imports of `@paypal/checkout-server-sdk`, `@paypal/react-paypal-js`, REST API calls.
- **Adyen:** imports of `@adyen/api-library`, drop-in component usage.
- **Square:** imports of `square`, API client usage.
- **Other:** Search broadly for terms like `payment`, `checkout`, `billing`, `invoice`, `subscription`, `charge` in route/controller files.

For each provider found, report:
- Which SDK/package and version
- Number of files that import or reference it
- Key API calls being made (list them)
- Whether it's used for one-time payments, subscriptions, or both

### 3. Current payout/disbursement integration

Search for payout-related code:

- **Tipalti:** payee creation, payment batch submission, iframe embeds for payee onboarding
- **PayPal Payouts:** mass payment API calls
- **Stripe Connect:** `transfers.create`, `payouts.create`, connected account management
- **Hyperwallet:** API client usage
- **Custom/manual:** Look for bank transfer logic, CSV export for payments, manual disbursement workflows

Report what you find: provider, SDK, files involved, and what payout flows exist (individual, batch, scheduled, etc.)

### 4. Marketplace / multi-vendor architecture

Determine if this is a two-sided marketplace or platform with sub-merchants:

- **Connected accounts / sub-merchants:** Look for Stripe Connect (`accounts.create`, connected accounts), PayPal Commerce Platform, or any pattern where the platform creates accounts for sellers/vendors/creators
- **Platform fee / commission structure:** Look for `application_fee`, `platform_fee`, commission calculations, revenue share logic, tiered fee rates
- **Money flow model:** Does the platform split payments at checkout (fee split), or collect all funds and distribute later (treasury model)?
- **Vendor onboarding:** KYC flows, identity verification, onboarding forms for sellers
- **Multi-tenant product catalogs:** Do different vendors/sellers have their own products?
- **Payout approval workflows:** Admin approval before releasing funds to vendors

Report: Is this a marketplace? How many sides? How do funds flow? What's the fee structure?

### 5. Data models

Find and document the data models/schemas related to payments and users. Look in:

- **ORM schemas:** Prisma (`schema.prisma`), ActiveRecord migrations (`db/migrate/`), Sequelize models, SQLAlchemy models, Django models, TypeORM entities
- **Database migrations:** Find the latest schema for relevant tables
- **Type definitions:** TypeScript interfaces, Go structs, Python dataclasses

Focus on these entities (include all fields for each):
- **User/Account** — especially fields like `stripe_customer_id`, `tipalti_payee_id`, `external_id`, `email`
- **Payment/Transaction/Order** — amounts, statuses, provider references
- **Subscription/Plan** — billing intervals, plan types, pricing
- **Payout/Disbursement/Withdrawal** — amounts, statuses, recipient references
- **Product/Item** — what's being sold
- **Affiliate/Referral** — commission tracking, referral codes
- **Vendor/Seller/Creator** — if marketplace: seller profiles, verification status, fee tiers

### 6. API and routing structure

Map the API surface:

- **REST endpoints:** Find route definitions (Express `router.get/post`, Rails `routes.rb`, Django `urls.py`, FastAPI decorators, etc.). List all payment/billing/payout related routes.
- **GraphQL:** Find schema definitions and resolvers related to payments, subscriptions, payouts.
- **API versioning:** Check if there's `/api/v1/`, `/api/v2/` patterns.

### 7. Authentication patterns

Identify how users authenticate:

- **Auth library:** NextAuth/Auth.js, Passport.js, Devise, Django auth, Firebase Auth, Clerk, Auth0, Supabase Auth, custom JWT
- **Session type:** JWT tokens, server-side sessions, cookies
- **OAuth providers:** Google, GitHub, Apple, email/password, SSO
- **User identification:** What uniquely identifies a user? (email, UUID, external ID)

### 8. Webhook handlers

Find existing webhook endpoint handlers:

- List all webhook routes (e.g., `/api/webhooks/stripe`, `/webhooks/tipalti`)
- What events do they handle?
- How do they verify webhook signatures?
- What side effects do they trigger? (update database, send emails, trigger workflows)

### 9. Frontend component patterns

Understand how the frontend is structured:

- **Component library:** Material UI, Tailwind, Chakra, Ant Design, custom design system
- **State management:** Redux, Zustand, Jotai, React Query, SWR, Vuex, Pinia
- **Where payment UI lives:** Find checkout pages, billing pages, subscription management, payout/wallet pages
- **iframe usage:** Are there any existing iframe embeds? (This is relevant for Whop's embedded components)

### 10. Third-party tools and integrations

Search for other services and tools integrated into the codebase that the platform may want to connect to Whop:

- **CRMs:** HubSpot, Salesforce, Go High Level, Pipedrive, Attio — look for SDK imports, API calls, webhook handlers
- **Accounting:** QuickBooks, Xero, FreshBooks — look for accounting/invoicing integrations
- **Automation:** Zapier, Make (Integromat), n8n — look for webhook triggers, Zap configurations, automation endpoints
- **Email/marketing:** SendGrid, Mailchimp, Klaviyo, Customer.io — look for transactional email or marketing integrations
- **Analytics:** Segment, Mixpanel, Amplitude, Google Analytics — look for event tracking related to payments
- **Other SaaS:** Any other notable integrations (Slack, Discord, Intercom, etc.)

For each found, report: which service, SDK/package, and how it connects to payment/payout flows (if at all).

**Note:** Many tools (HubSpot, QuickBooks, Salesforce) may be used by the business but not integrated into the codebase. This scan catches what's in the code — the Whop team will ask about other tools separately on the call.

### 11. Migration surface area

Count the scope of work to understand migration complexity:

- Total files referencing the current payment provider
- Total API calls to the current payment provider
- Number of webhook event types handled
- Number of database models with payment provider references (e.g., `stripe_customer_id`)
- Are payment flows isolated in a module/directory, or scattered throughout the codebase?

---

## Output format

Save the report to `whop-integration-scan.md` in the repo root. Use exactly this format:

```
# Codebase Analysis for Whop Integration

## Summary
- **Project name:** [name from package.json or repo]
- **Stack:** [e.g., Next.js 14 (App Router), TypeScript, Prisma + PostgreSQL]
- **Current payments:** [provider] ([X] files, [Y] API calls)
- **Current payouts:** [provider] ([X] files, [Y] API calls)
- **Auth:** [method] with [session type]
- **Key models:** [list]
- **Marketplace type:** [Not a marketplace / Two-sided / Multi-vendor] — [fee model]
- **Migration complexity:** [Low/Medium/High] — [one sentence why]

## Tech stack
[Details from section 1]

## Current payment integration
[Details from section 2, including file paths and specific API calls]

## Current payout integration
[Details from section 3]

## Marketplace / multi-vendor architecture
[Details from section 4 — connected accounts, fee structure, money flow, vendor onboarding]

## Data models
[Full schemas/field lists from section 5, with file paths]

## API structure
[Route listing from section 6]

## Authentication
[Details from section 7]

## Webhook handlers
[Details from section 8, with file paths]

## Frontend patterns
[Details from section 9]

## Third-party integrations
[Details from section 9 — CRMs, accounting, automation, etc.]

## Migration surface area
[Counts and assessment from section 10]

---

## Machine-readable output

​```json
{
  "project_name": "",
  "tech_stack": {
    "frontend": "",
    "frontend_version": "",
    "backend": "",
    "language": "",
    "database": "",
    "orm": "",
    "hosting": ""
  },
  "payment_providers": [
    {
      "provider": "",
      "sdk_package": "",
      "sdk_version": "",
      "files_count": 0,
      "api_calls": [],
      "webhook_endpoint": "",
      "events_handled": [],
      "used_for": ["one_time", "subscriptions"]
    }
  ],
  "payout_providers": [
    {
      "provider": "",
      "sdk_package": "",
      "files_count": 0,
      "api_calls": [],
      "webhook_endpoint": "",
      "payout_types": ["individual", "batch", "scheduled"]
    }
  ],
  "marketplace": {
    "is_marketplace": false,
    "type": "none|two_sided|multi_vendor",
    "connected_account_provider": "",
    "fee_model": "none|application_fee_split|platform_treasury|hybrid",
    "fee_rate": "",
    "vendor_onboarding": "none|kyc|custom",
    "vendor_count_estimate": 0,
    "money_flow_notes": ""
  },
  "data_models": [
    {
      "name": "",
      "fields": [],
      "file": "",
      "provider_references": []
    }
  ],
  "auth": {
    "method": "",
    "session_type": "",
    "providers": [],
    "user_identifier": ""
  },
  "api_routes": {
    "payment_related": [],
    "payout_related": [],
    "webhook_endpoints": []
  },
  "frontend": {
    "component_library": "",
    "state_management": "",
    "payment_pages": [],
    "has_iframe_embeds": false
  },
  "third_party_integrations": [
    {
      "service": "",
      "category": "crm|accounting|automation|email|analytics|other",
      "sdk_package": "",
      "connects_to_payments": false,
      "notes": ""
    }
  ],
  "migration_surface_area": {
    "total_provider_files": 0,
    "total_api_calls": 0,
    "webhook_event_types": 0,
    "models_with_provider_refs": 0,
    "is_modular": false,
    "complexity": "low|medium|high",
    "notes": ""
  }
}
​```
```

After saving the file, tell the user: "Done! The file `whop-integration-scan.md` has been saved to your repo root. Send this file back to your Whop contact and they'll use it to generate your tailored integration guide."
