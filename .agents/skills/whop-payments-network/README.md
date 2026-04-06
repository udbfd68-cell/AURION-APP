# Whop Payments Network Skill

[![Install](https://img.shields.io/badge/npx_skills_add-whopio/whop--payments--network--skill-FA4616?style=for-the-badge)](https://skills.sh/whopio/whop-payments-network-skill)

The official Whop Payments Network integration skill. AI-assisted integration guide for the Whop Payments Network. Works with Claude Code, Cursor, Copilot, and any AI editor that supports skills.

## Install

```bash
npx skills add whopio/whop-payments-network-skill
```

## What It Does

Provides your AI assistant with complete context for integrating the Whop Payments Network:

- **Pay-ins** -- Embedded checkout or hosted checkout links
- **Payouts** -- Embedded wallet components or hosted payout dashboards
- **Chat SDK** -- React, Vanilla JS, and Swift
- **API** -- TypeScript, Python, Ruby SDKs + MCP server
- **Webhooks** -- Event handling with signature validation

## Codebase Scan

Before starting an integration, run the codebase scan prompt to analyze your existing tech stack and payment providers:

See [`codebase-scan.md`](./codebase-scan.md) for the prompt to run in your AI editor.

## File Structure

```
SKILL.md                        Main skill (overview, patterns, gotchas)
codebase-scan.md                Prompt to analyze client codebase
references/
  checkout-embed.md             Embedded checkout props, controls, Vanilla JS
  payouts.md                    Embedded wallet, hosted payouts, account links
  chat-sdk.md                   Chat SDK for React, Vanilla JS, Swift
  api-reference.md              SDK setup, key endpoints, MCP server
  webhooks.md                   Webhook events, validation, unwrap pattern
```

## Links

- [Whop Developer Docs](https://docs.whop.com)
- [Whop API Reference](https://docs.whop.com/api-reference)
- [Whop Dashboard](https://whop.com/dashboard/developer)
- [Sandbox Dashboard](https://sandbox.whop.com/dashboard)
- [MCP Server](https://mcp.whop.com)
