/* ════════════════════════════════════════════
   Constants — Aurion App Builder
   ════════════════════════════════════════════ */

import type { AIModel, Integration } from './types';

export const MODELS: AIModel[] = [
  // Vision Models
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'ollama', tags: ['Vision', 'Fast'] },
  { id: 'glm-4.7', name: 'GLM-4.7', provider: 'ollama', tags: ['Vision', 'Code'] },
  { id: 'glm-4.6', name: 'GLM-4.6', provider: 'ollama', tags: ['Vision', 'Agent'] },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'ollama', tags: ['Vision'] },
  { id: 'qwen3.5-397b', name: 'Qwen3.5 397B', provider: 'ollama', tags: ['Vision', 'Large'] },
  // Coding Models
  { id: 'qwen3-coder-480b', name: 'Qwen3 Coder 480B', provider: 'ollama', tags: ['Code', 'Best'] },
  { id: 'qwen3-coder-next', name: 'Qwen3 Coder Next', provider: 'ollama', tags: ['Code', 'New'] },
  { id: 'devstral-2', name: 'Devstral 2 123B', provider: 'ollama', tags: ['Code'] },
  { id: 'devstral-small-2', name: 'Devstral Small 2', provider: 'ollama', tags: ['Code', 'Fast'] },
  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'ollama', tags: ['Code'] },
  { id: 'glm-5', name: 'GLM-5 744B', provider: 'ollama', tags: ['Code', 'Large'] },
];

export const TAG_COLORS: Record<string, string> = {
  Vision: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Code: 'text-green-400 bg-green-500/10 border-green-500/20',
  Fast: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Best: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Large: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  New: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Agent: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

export const VISION_MODELS = new Set(['gemini-3-flash', 'glm-4.7', 'glm-4.6', 'kimi-k2.5', 'qwen3.5-397b']);
export const BEST_CODING_MODEL = 'qwen3-coder-480b';
export const BEST_VISION_MODEL = 'gemini-3-flash';

export const INTEGRATIONS: Integration[] = [
  { name: 'Vercel', desc: 'Auto-deploy to production', cat: 'Deploy', builtIn: true },
  { name: 'Firecrawl', desc: 'Web scraping & cloning', cat: 'Scraping', builtIn: true },
  { name: 'Ollama Cloud', desc: 'FREE unlimited cloud AI with Vision', cat: 'AI', builtIn: true },
  { name: 'Stripe', desc: 'Payment processing & subscriptions', cat: 'Payments', keyPlaceholder: 'sk_live_...', keyPrefix: 'sk_' },
  { name: 'Resend', desc: 'Transactional email API', cat: 'Email', keyPlaceholder: 're_...', keyPrefix: 're_' },
  { name: 'Klaviyo', desc: 'Email & SMS marketing automation', cat: 'Email', keyPlaceholder: 'pk_...', keyPrefix: 'pk_' },
  { name: 'SendGrid', desc: 'Email delivery at scale', cat: 'Email', keyPlaceholder: 'SG.xxx', keyPrefix: 'SG.' },
  { name: 'Supabase', desc: 'Postgres + Auth + Realtime + Storage', cat: 'Database', keyPlaceholder: 'eyJhbG...', keyPrefix: 'ey' },
  { name: 'Neon', desc: 'Serverless Postgres', cat: 'Database', keyPlaceholder: 'neon_...', keyPrefix: 'neon' },
  { name: 'Upstash', desc: 'Serverless Redis & Kafka', cat: 'Database', keyPlaceholder: 'AXxx...', keyPrefix: 'AX' },
  { name: 'PlanetScale', desc: 'MySQL-compatible serverless DB', cat: 'Database', keyPlaceholder: 'pscale_tkn_...', keyPrefix: 'pscale' },
  { name: 'Clerk', desc: 'Authentication & user management', cat: 'Auth', keyPlaceholder: 'sk_live_...', keyPrefix: 'sk_' },
  { name: 'Auth0', desc: 'Identity platform', cat: 'Auth', keyPlaceholder: 'domain.auth0.com', keyPrefix: '' },
  { name: 'Twilio', desc: 'SMS, voice & video', cat: 'Comms', keyPlaceholder: 'AC...', keyPrefix: 'AC' },
  { name: 'Sentry', desc: 'Error monitoring', cat: 'Monitoring', keyPlaceholder: 'https://xxx@sentry.io/...', keyPrefix: 'https' },
  { name: 'PostHog', desc: 'Product analytics & feature flags', cat: 'Analytics', keyPlaceholder: 'phc_...', keyPrefix: 'phc_' },
  { name: 'Mixpanel', desc: 'Event-based analytics', cat: 'Analytics', keyPlaceholder: 'mp_...', keyPrefix: 'mp_' },
  { name: 'Algolia', desc: 'Search & discovery API', cat: 'Search', keyPlaceholder: 'ALGOLIA_APP_ID', keyPrefix: '' },
  { name: 'Cloudflare R2', desc: 'Object storage — S3 compatible', cat: 'Storage', keyPlaceholder: 'access_key_id', keyPrefix: '' },
  { name: 'Uploadthing', desc: 'File uploads for Next.js', cat: 'Storage', keyPlaceholder: 'sk_live_...', keyPrefix: 'sk_' },
  { name: 'Sanity', desc: 'Structured content CMS', cat: 'CMS', keyPlaceholder: 'sk...', keyPrefix: 'sk' },
  { name: 'Contentful', desc: 'Headless content platform', cat: 'CMS', keyPlaceholder: 'CFPAT-...', keyPrefix: 'CFPAT' },
  { name: 'OpenAI', desc: 'GPT-4o — chat completions', cat: 'AI', keyPlaceholder: 'sk-...', keyPrefix: 'sk-' },
  { name: 'Lemon Squeezy', desc: 'Payments for digital products', cat: 'Payments', keyPlaceholder: 'eyJ...', keyPrefix: 'ey' },
  { name: 'Netlify', desc: 'Deploy & edge functions', cat: 'Deploy', keyPlaceholder: 'nfp_...', keyPrefix: 'nfp_' },
  { name: 'Slack', desc: 'Team messaging webhooks', cat: 'Comms', keyPlaceholder: 'xoxb-...', keyPrefix: 'xoxb' },
  { name: 'Discord', desc: 'Bot & webhook integration', cat: 'Comms', keyPlaceholder: 'Bot token...', keyPrefix: '' },
  { name: 'GitHub', desc: 'Push code to repositories', cat: 'Dev', keyPlaceholder: 'ghp_...', keyPrefix: 'ghp_' },
];

export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month' as const,
    credits: 50,
    features: [
      '50 AI messages/month',
      'Public projects only',
      '3 projects max',
      'Community support',
      'Aurion branding on deploys',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 25,
    interval: 'month' as const,
    credits: 500,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
    features: [
      '500 AI messages/month',
      'Private projects',
      'Unlimited projects',
      'Custom domains',
      'Remove Aurion branding',
      'Priority AI models',
      'GitHub integration',
      'Email support',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 50,
    interval: 'month' as const,
    credits: 2000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BIZ_PRICE_ID || '',
    features: [
      '2,000 AI messages/month',
      'Everything in Pro',
      'Team collaboration',
      'Real-time co-editing',
      'SSO / SAML',
      'Role-based access',
      'Priority support',
      'Custom integrations',
    ],
    cta: 'Upgrade to Business',
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: -1,
    interval: 'month' as const,
    credits: -1,
    features: [
      'Unlimited AI messages',
      'Everything in Business',
      'Dedicated infrastructure',
      'Custom model fine-tuning',
      'On-premise deployment',
      'SLA & 24/7 support',
      'Audit logs',
      'Custom contracts',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

// Multi-file project generation templates
export const VITE_REACT_TEMPLATE: Record<string, string> = {
  'package.json': JSON.stringify({
    name: 'aurion-project',
    private: true,
    version: '0.0.1',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.0',
      vite: '^6.0.0',
    },
  }, null, 2),
  'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
  'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aurion App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
  'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
  'src/App.jsx': `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>Aurion App</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  )
}

export default App`,
  'src/index.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}
`,
};
