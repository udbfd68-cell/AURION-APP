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

/* ════════════════════════════════════════════
   UI Constants (extracted from page.tsx)
   ════════════════════════════════════════════ */

export const PROMPT_TEMPLATES = [
  { icon: '🏠', title: 'Landing Page', prompt: 'Build a modern landing page with hero section, features grid, testimonials, pricing cards, and footer. Use gradients, animations, and professional typography.', cat: 'Page' },
  { icon: '📊', title: 'Dashboard', prompt: 'Create an admin dashboard with sidebar navigation, stats cards, line/bar charts, recent activity table, and a clean dark theme.', cat: 'Page' },
  { icon: '🛒', title: 'E-commerce', prompt: 'Build an e-commerce product listing page with product cards, filters sidebar, search bar, cart icon with badge, and responsive grid layout.', cat: 'Page' },
  { icon: '📝', title: 'Blog', prompt: 'Create a modern blog with featured post hero, post cards grid, categories sidebar, newsletter signup, and dark/light theme toggle.', cat: 'Page' },
  { icon: '🎨', title: 'Portfolio', prompt: 'Build a creative portfolio website with animated hero, project gallery with hover effects, about section, skills bars, and contact form.', cat: 'Page' },
  { icon: '📱', title: 'Mobile App UI', prompt: 'Design a mobile app interface with bottom navigation, profile screen, settings list, notification badges, and swipeable cards.', cat: 'Page' },
  { icon: '✨', title: 'Add Animations', prompt: 'Add smooth entrance animations, hover effects, scroll-triggered reveals, and micro-interactions to the current page using CSS animations and transitions.', cat: 'Enhance' },
  { icon: '🌙', title: 'Dark Mode', prompt: 'Add a dark/light theme toggle with smooth transition. Use CSS variables for theming. Dark: #0f0f0f bg, light: #ffffff bg.', cat: 'Enhance' },
  { icon: '📐', title: 'Make Responsive', prompt: 'Make the current page fully responsive with mobile-first breakpoints, hamburger menu for mobile nav, and proper spacing/sizing for all screen sizes.', cat: 'Enhance' },
  { icon: '♿', title: 'Accessibility', prompt: 'Improve accessibility: add ARIA labels, keyboard navigation, focus styles, semantic HTML, proper heading hierarchy, alt texts, and color contrast fixes.', cat: 'Enhance' },
  { icon: '⚡', title: 'Optimize Performance', prompt: 'Optimize the code: lazy load images, minimize DOM, use CSS containment, add loading states, optimize animations with will-change and transform.', cat: 'Enhance' },
  { icon: '🧩', title: 'Add Form', prompt: 'Add a professional contact form with name, email, message fields, validation feedback, submit button with loading state, and success/error toast notifications.', cat: 'Component' },
  { icon: '📊', title: 'Add Charts', prompt: 'Add interactive data visualization charts using Recharts: line chart, bar chart, and pie chart with sample data, tooltips, and legends.', cat: 'Component' },
  { icon: '🗺️', title: 'Add Navigation', prompt: 'Add a professional navbar with logo, links, dropdown menus, mobile hamburger menu, and smooth scroll to sections. Sticky on scroll.', cat: 'Component' },
] as const;

export const EDITOR_THEMES = [
  { id: 'vs-dark', name: 'Dark+ (Default)', desc: 'VS Code dark theme' },
  { id: 'vs', name: 'Light', desc: 'VS Code light theme' },
  { id: 'hc-black', name: 'High Contrast Dark', desc: 'Accessibility focused' },
  { id: 'hc-light', name: 'High Contrast Light', desc: 'Light accessibility' },
] as const;

export const KEYBOARD_SHORTCUTS = [
  { keys: '⌘K', desc: 'Command Palette', cat: 'General' },
  { keys: '⌘P', desc: 'Go to File', cat: 'General' },
  { keys: '⌘⇧F', desc: 'Search in Files', cat: 'General' },
  { keys: '⌘S', desc: 'Save & Refresh Preview', cat: 'General' },
  { keys: 'Esc', desc: 'Close Modals/Panels', cat: 'General' },
  { keys: '⌘B', desc: 'Toggle Chat Panel', cat: 'View' },
  { keys: '⌘`', desc: 'Toggle Terminal', cat: 'View' },
  { keys: '⌘E', desc: 'Toggle Visual Editor', cat: 'View' },
  { keys: '⌘1-4', desc: 'Switch Tabs (App/Code/DB/Pay)', cat: 'View' },
  { keys: '⌘H', desc: 'Conversation History', cat: 'Chat' },
  { keys: '⌘Z', desc: 'Undo (VFS)', cat: 'Edit' },
  { keys: '⌘⇧Z', desc: 'Redo (VFS)', cat: 'Edit' },
  { keys: '⌘D', desc: 'Download ZIP', cat: 'Project' },
  { keys: '⌘⇧H', desc: 'Find & Replace', cat: 'Edit' },
  { keys: '⌘/', desc: 'Keyboard Shortcuts', cat: 'General' },
  { keys: '⌘G', desc: 'Go to Line', cat: 'Edit' },
] as const;

export const COMPONENT_SNIPPETS = [
  { name: 'Button', cat: 'Basic', code: '<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Click me</button>' },
  { name: 'Card', cat: 'Layout', code: '<div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">\n  <h3 className="text-lg font-semibold mb-2">Card Title</h3>\n  <p className="text-gray-600">Card description goes here.</p>\n</div>' },
  { name: 'Input', cat: 'Form', code: '<input type="text" placeholder="Enter text..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />' },
  { name: 'Badge', cat: 'Basic', code: '<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Badge</span>' },
  { name: 'Avatar', cat: 'Basic', code: '<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">A</div>' },
  { name: 'Alert', cat: 'Feedback', code: '<div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">\n  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>\n  <p className="text-sm text-blue-800">This is an info alert message.</p>\n</div>' },
  { name: 'Modal', cat: 'Overlay', code: '<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">\n  <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">\n    <h2 className="text-xl font-bold mb-2">Modal Title</h2>\n    <p className="text-gray-600 mb-4">Modal description text goes here.</p>\n    <div className="flex justify-end gap-2">\n      <button className="px-4 py-2 rounded-lg border hover:bg-gray-50">Cancel</button>\n      <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Confirm</button>\n    </div>\n  </div>\n</div>' },
  { name: 'Navbar', cat: 'Navigation', code: '<nav className="flex items-center justify-between px-6 py-4 bg-white border-b">\n  <div className="text-xl font-bold">Logo</div>\n  <div className="flex items-center gap-6">\n    <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Home</a>\n    <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>\n    <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>\n    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Sign Up</button>\n  </div>\n</nav>' },
  { name: 'Hero', cat: 'Section', code: '<section className="py-20 px-6 text-center bg-gradient-to-br from-blue-50 to-indigo-100">\n  <h1 className="text-5xl font-bold text-gray-900 mb-4">Build Something Amazing</h1>\n  <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">A brief description of your product or service that explains the value.</p>\n  <div className="flex justify-center gap-4">\n    <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Get Started</button>\n    <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 font-medium">Learn More</button>\n  </div>\n</section>' },
  { name: 'Footer', cat: 'Section', code: '<footer className="bg-gray-900 text-gray-400 py-12 px-6">\n  <div className="max-w-6xl mx-auto grid grid-cols-4 gap-8">\n    <div>\n      <h3 className="text-white font-semibold mb-4">Company</h3>\n      <ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white">About</a></li><li><a href="#" className="hover:text-white">Careers</a></li></ul>\n    </div>\n    <div>\n      <h3 className="text-white font-semibold mb-4">Product</h3>\n      <ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white">Features</a></li><li><a href="#" className="hover:text-white">Pricing</a></li></ul>\n    </div>\n    <div>\n      <h3 className="text-white font-semibold mb-4">Resources</h3>\n      <ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white">Docs</a></li><li><a href="#" className="hover:text-white">Blog</a></li></ul>\n    </div>\n    <div>\n      <h3 className="text-white font-semibold mb-4">Legal</h3>\n      <ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white">Privacy</a></li><li><a href="#" className="hover:text-white">Terms</a></li></ul>\n    </div>\n  </div>\n</footer>' },
  { name: 'Pricing Card', cat: 'Section', code: '<div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-sm">\n  <h3 className="text-lg font-medium text-gray-500">Pro Plan</h3>\n  <div className="mt-4 flex items-baseline gap-1"><span className="text-5xl font-bold">$29</span><span className="text-gray-500">/month</span></div>\n  <ul className="mt-6 space-y-3">\n    <li className="flex items-center gap-2 text-sm"><svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> Unlimited projects</li>\n    <li className="flex items-center gap-2 text-sm"><svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> Priority support</li>\n  </ul>\n  <button className="mt-8 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Get Started</button>\n</div>' },
  { name: 'Table', cat: 'Data', code: '<div className="overflow-hidden rounded-lg border border-gray-200">\n  <table className="min-w-full divide-y divide-gray-200">\n    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th></tr></thead>\n    <tbody className="bg-white divide-y divide-gray-200">\n      <tr><td className="px-6 py-4 text-sm font-medium text-gray-900">John Doe</td><td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span></td><td className="px-6 py-4 text-sm text-gray-500">Admin</td></tr>\n      <tr><td className="px-6 py-4 text-sm font-medium text-gray-900">Jane Smith</td><td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span></td><td className="px-6 py-4 text-sm text-gray-500">User</td></tr>\n    </tbody>\n  </table>\n</div>' },
  { name: 'Toggle', cat: 'Form', code: '<label className="relative inline-flex items-center cursor-pointer">\n  <input type="checkbox" className="sr-only peer" />\n  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>\n  <span className="ml-3 text-sm font-medium text-gray-700">Toggle</span>\n</label>' },
  { name: 'Loading Spinner', cat: 'Feedback', code: '<div className="flex items-center justify-center">\n  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>\n</div>' },
] as const;

export const INTEGRATION_ROUTE_MAP: Record<string, string> = {
  'OpenAI': '/api/openai', 'Resend': '/api/resend', 'SendGrid': '/api/sendgrid',
  'Twilio': '/api/twilio', 'Upstash': '/api/upstash', 'Neon': '/api/neon',
  'Slack': '/api/slack', 'Discord': '/api/discord', 'Lemon Squeezy': '/api/lemonsqueezy',
  'Contentful': '/api/contentful', 'Algolia': '/api/algolia', 'Klaviyo': '/api/klaviyo',
  'Sanity': '/api/sanity', 'Stripe': '/api/stripe', 'Supabase': '/api/supabase',
};

/** Panel names to close on Escape, checked in priority order */
export const ESCAPE_PANEL_PRIORITY: string[] = [
  'showCommandPalette', 'showFileSearch', 'showContentSearch', 'showFindReplace',
  'showShortcuts', 'showThemeSelector', 'showColorPicker', 'showGotoLine',
  'showA11yPanel', 'showSeoPanel', 'showTailwindPanel', 'showColorPalettePanel',
  'showPerfPanel', 'showStatsPanel', 'showCssVarsPanel', 'showConsolePanel',
  'showDepsPanel', 'showComplexityPanel', 'showOutlinePanel', 'showImageOptPanel',
  'showDiffStatsPanel', 'showNetworkPanel', 'showHtmlValidatorPanel', 'showFontPanel',
  'showSnippetsPanel', 'showTreemapPanel', 'showUnusedCssPanel', 'showLinkCheckerPanel',
  'showDomTreePanel', 'showMetaEditorPanel', 'showShortcutsRef', 'showContrastPanel',
  'showZIndexPanel', 'showTodoScanPanel', 'showRegexPanel', 'showSpecificityPanel',
  'showLazyImgPanel', 'showTextStatsPanel', 'showDuplicatePanel', 'showElementCountPanel',
  'showConsoleFilter', 'showColorEdit', 'showFoldMap', 'showDepGraph',
  'showPerfBudget', 'showResponsiveGrid', 'showAnimPanel', 'showEventAudit',
  'showOgPreview', 'showSemanticPanel', 'showChangeSummary', 'showWhitespacePanel',
  'showPwaPanel', 'showSchemaPanel', 'showBundlePanel', 'showAriaPanel',
  'showSecurityPanel', 'showCollabPanel', 'showFeedbackPanel',
  'showChangelog', 'showVisualBuilder', 'showAnimBuilder', 'showDesignSystem',
  'showApiTester', 'showGitPanel', 'showScreenshotAnalyzer', 'showTemplates',
  'showMediaGallery', 'showEnvPanel', 'showModelMenu', 'showGitHubModal',
  'showIntegrations', 'showResearchPanel', 'showProjectMenu',
];
