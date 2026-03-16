"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import hljs from 'highlight.js';

/* ────────── Types ────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type AIModel = { id: string; name: string; provider: 'gemini' | 'groq' | 'anthropic' };

const MODELS: AIModel[] = [
  { id: 'claude-opus-4-5-20250514', name: 'Claude Opus 4.5', provider: 'anthropic' },
  { id: 'claude-opus-4-6-20260301', name: 'Claude Opus 4.6', provider: 'anthropic' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'groq' },
];

const PROVIDER_LABELS: Record<string, string> = { anthropic: 'Anthropic', gemini: 'Google', groq: 'Groq' };

const PROVIDER_ICON: Record<string, ReactNode> = {
  anthropic: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-60"><path d="M17.3 3H14l-7.3 18h3.3l1.7-4.3h7.3L20.7 21H24L17.3 3Zm-3.1 11L17 6.1 19.8 14h-5.6ZM7 3 0 21h3.4l1.7-4.3h5.6l-.7-2.7H6.5L10 6.1 7 3Z" fill="currentColor"/></svg>,
  gemini: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-60"><path d="M12 24A14.3 14.3 0 0 0 0 12 14.3 14.3 0 0 0 12 0a14.3 14.3 0 0 0 0 12 14.3 14.3 0 0 0 0 12Z" fill="currentColor"/></svg>,
  groq: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 opacity-60"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/></svg>,
};

function getApiEndpoint(modelId: string): string {
  const m = MODELS.find((x) => x.id === modelId);
  if (m?.provider === 'groq') return '/api/groq';
  if (m?.provider === 'anthropic') return '/api/anthropic';
  return '/api/gemini';
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ────────── Extract code for preview ────────── */
function extractPreviewHtml(messages: Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || !msg.content) continue;

    // Match ```html ... ``` blocks (greedy — take the largest one)
    const htmlBlocks = [...msg.content.matchAll(/```html\s*\n([\s\S]*?)```/g)];
    if (htmlBlocks.length > 0) {
      // Prefer the block that looks like a full document, otherwise take the last one
      const fullDoc = htmlBlocks.find(m => /<!doctype|<html/i.test(m[1]));
      return (fullDoc ?? htmlBlocks[htmlBlocks.length - 1])[1].trim();
    }

    // Match full HTML documents outside of code fences
    const docMatch = msg.content.match(/(<(!DOCTYPE|html)[^>]*>[\s\S]*<\/html>)/i);
    if (docMatch) return docMatch[1].trim();

    // Fallback: if there's a code block with substantial CSS/HTML-like content, wrap it
    const cssBlock = msg.content.match(/```css\s*\n([\s\S]*?)```/);
    const anyHtmlSnippet = msg.content.match(/```(?:htm|xml|svg)\s*\n([\s\S]*?)```/);
    if (anyHtmlSnippet) {
      const snippet = anyHtmlSnippet[1].trim();
      const css = cssBlock ? `<style>${cssBlock[1].trim()}</style>` : '';
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body>${snippet}</body></html>`;
    }
  }
  return null;
}

function extractAllCodeBlocks(messages: Message[]): { language: string; code: string }[] {
  const blocks: { language: string; code: string }[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || !msg.content) continue;
    const regex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let m;
    while ((m = regex.exec(msg.content)) !== null) {
      blocks.push({ language: m[1] || 'plaintext', code: m[2].trim() });
    }
    if (blocks.length > 0) break;
  }
  return blocks;
}

/* ────────── Code Block with copy ────────── */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const highlighted = language
    ? hljs.highlight(code, { language, ignoreIllegals: true }).value
    : hljs.highlightAuto(code).value;

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-[#2a2a2a]">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-1.5 text-xs text-gray-400">
        <span>{language ?? 'code'}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="hover:text-white transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-gray-900 text-sm leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

/* ────────── Markdown Renderer ────────── */
function MarkdownContent({ content }: { content: string }) {
  // Strip AI action tags from visible output
  const cleanContent = content.replace(/<<(TERMINAL|CONNECT|DEPLOY|TAB|CLONE|SHOW_TERMINAL|SHOW_INTEGRATIONS):?[^>]*>>/g, '').trim();
  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const code = String(children).replace(/\n$/, '');
          if (match) return <CodeBlock code={code} language={match[1]} />;
          return (
            <code className="bg-[#1a1a1a] text-gray-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-3 leading-relaxed text-gray-300">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 text-gray-300">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 text-gray-300">{children}</ol>,
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 mt-4 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mb-2 mt-3 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-3 text-white">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[#333] pl-4 italic text-gray-400 my-3">{children}</blockquote>
        ),
      }}
    >
      {cleanContent}
    </ReactMarkdown>
  );
}

/* ────────── Typing indicator ────────── */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#555]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════
   Desktop icon
   ════════════════════════════════════════════ */
const DesktopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const CodeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const MobileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 4v6h6" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const PaymentsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const DeployIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

/* ════════════════════════════════════════════
   Main Page – Landing + Workspace
   ════════════════════════════════════════════ */

const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/* ── Integrations Catalog ── */
const INTEGRATIONS: { name: string; desc: string; cat: string; keyPlaceholder?: string; keyPrefix?: string; builtIn?: boolean }[] = [
  { name: 'Vercel', desc: 'Auto-deploy to production', cat: 'Deploy', builtIn: true },
  { name: 'Firecrawl', desc: 'Web scraping & cloning', cat: 'Scraping', builtIn: true },
  { name: 'Anthropic', desc: 'Claude Opus — advanced reasoning', cat: 'AI', builtIn: true },
  { name: 'Google Gemini', desc: '2.5 Flash — AI generation', cat: 'AI', builtIn: true },
  { name: 'Groq', desc: 'Llama 3.3 70B — fast inference', cat: 'AI', builtIn: true },
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
  { name: 'Sentry', desc: 'Error monitoring & performance tracing', cat: 'Monitoring', keyPlaceholder: 'https://xxx@sentry.io/...', keyPrefix: 'https' },
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

export default function HomePage() {
  // View state: landing → workspace
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [landingInput, setLandingInput] = useState('');
  const landingTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState(MODELS[0].id);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'app' | 'code' | 'database' | 'payments'>('app');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Right panel features
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalLines, setTerminalLines] = useState<string[]>(['$ aurion ready', '> Listening on port 3000']);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [repoName, setRepoName] = useState('');

  // Integration API keys (persisted in localStorage)
  const [integrationKeys, setIntegrationKeys] = useState<Record<string, string>>({});
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);

  // Load integration keys from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aurion_integration_keys');
      if (saved) setIntegrationKeys(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Persist integration keys to localStorage
  useEffect(() => {
    if (Object.keys(integrationKeys).length > 0) {
      try { localStorage.setItem('aurion_integration_keys', JSON.stringify(integrationKeys)); } catch { /* ignore */ }
    }
  }, [integrationKeys]);

  // Deploy
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ url: string; projectName: string } | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Clone website
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneProgress, setCloneProgress] = useState('');
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [clonedHtml, setClonedHtml] = useState<string | null>(null);
  const cloneAbortRef = useRef<AbortController | null>(null);

  // Image attachments
  const [attachedImages, setAttachedImages] = useState<{ name: string; data: string; type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const landingFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return; // 10MB max
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        setAttachedImages(prev => [...prev, { name: file.name, data, type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, []);

  const removeImage = useCallback((idx: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  // Close model menu on click outside
  useEffect(() => {
    if (!showModelMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-model-menu]')) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelMenu]);

  // Auto-resize landing textarea
  useEffect(() => {
    const ta = landingTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [landingInput]);

  // Close dropdowns and modals on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showCloneModal) setShowCloneModal(false);
      else if (showModelMenu) setShowModelMenu(false);
      else if (showGitHubModal) setShowGitHubModal(false);
      else if (showIntegrations) setShowIntegrations(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModelMenu, showGitHubModal, showCloneModal, showIntegrations]);

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  // Extract preview HTML from the latest assistant message
  const rawPreviewHtml = useMemo(() => clonedHtml ?? extractPreviewHtml(messages), [messages, clonedHtml]);

  // Inject link-intercept script to prevent clicks from blanking the iframe
  const previewHtml = useMemo(() => {
    if (!rawPreviewHtml) return null;
    // Block ALL link navigation in previews — no link should navigate away
    const interceptScript = `<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(a){e.preventDefault();e.stopPropagation();}},true);document.addEventListener('submit',function(e){e.preventDefault();},true);</script>`;
    // Inject before </body> or at the end
    if (rawPreviewHtml.includes('</body>')) {
      return rawPreviewHtml.replace('</body>', interceptScript + '</body>');
    }
    return rawPreviewHtml + interceptScript;
  }, [rawPreviewHtml]);
  const codeBlocks = useMemo(() => extractAllCodeBlocks(messages), [messages]);

  // Build workspace context string for AI
  const buildWorkspaceContext = useCallback(() => {
    const parts: string[] = [];
    parts.push('[WORKSPACE STATE]');
    parts.push(`Active tab: ${activeTab}`);
    parts.push(`Preview: ${previewHtml ? 'has content' : 'empty'}`);
    parts.push(`Terminal: ${showTerminal ? 'visible' : 'hidden'} (${terminalLines.length} lines)`);
    const connectedKeys = Object.keys(integrationKeys);
    parts.push(`Built-in integrations: Vercel, Firecrawl, Anthropic, Google Gemini, Groq`);
    if (connectedKeys.length > 0) {
      parts.push(`Connected integrations: ${connectedKeys.join(', ')}`);
    }
    if (codeBlocks.length > 0) {
      parts.push(`Code blocks generated: ${codeBlocks.length}`);
    }
    parts.push(`Model: ${selectedModel.name}`);
    parts.push('[/WORKSPACE STATE]');
    return parts.join('\n');
  }, [activeTab, previewHtml, codeBlocks, selectedModel, showTerminal, terminalLines.length, integrationKeys]);

  /* ── Send message & stream response ── */
  const streamToAssistant = useCallback(async (
    allMessages: { role: string; content: string }[],
    assistantMsgId: string,
    useModel: string,
    signal: AbortSignal,
    images?: { data: string; type: string }[],
  ) => {
    const endpoint = getApiEndpoint(useModel);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: allMessages, model: useModel, ...(images?.length ? { images } : {}) }),
      signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('No response stream');

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') break;
        let data;
        try { data = JSON.parse(payload); } catch { continue; }
        if (data.error) throw new Error(data.error);
        if (data.text) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: m.content + data.text } : m))
          );
        }
      }
    }
  }, []);

  const sendToAI = useCallback(async (text: string, imgs?: { data: string; type: string }[]) => {
    if (!text.trim() || isStreaming) return;
    setError(null);
    const userMsg: Message = { id: generateId(), role: 'user', content: text.trim() };
    const assistantMsg: Message = { id: generateId(), role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const ctx = buildWorkspaceContext();
      const allMessages = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
      if (allMessages.length > 0) {
        allMessages[allMessages.length - 1] = {
          ...allMessages[allMessages.length - 1],
          content: allMessages[allMessages.length - 1].content + '\n\n' + ctx,
        };
      }
      await streamToAssistant(allMessages, assistantMsg.id, model, controller.signal, imgs);
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id || m.content.length > 0));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, messages, model, streamToAssistant, buildWorkspaceContext]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const imgInfo = attachedImages.length > 0 ? `\n[${attachedImages.length} image(s) attached: ${attachedImages.map(i => i.name).join(', ')}]` : '';
    const imgs = attachedImages.length > 0 ? attachedImages.map(i => ({ data: i.data, type: i.type })) : undefined;
    setAttachedImages([]);
    sendToAI(text + imgInfo, imgs);
  }, [input, attachedImages, sendToAI]);

  const sendPrompt = useCallback((text: string) => {
    sendToAI(text);
  }, [sendToAI]);

  /* ── Landing \u2192 Workspace transition ── */
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const enterWorkspace = useCallback((prompt: string) => {
    const text = prompt.trim();
    if (!text) return;
    setView('workspace');
    setLandingInput('');
    setPendingPrompt(text);
  }, []);

  // Fire pending prompt from landing page
  useEffect(() => {
    if (pendingPrompt && view === 'workspace' && !isStreaming) {
      const text = pendingPrompt;
      setPendingPrompt(null);
      sendPrompt(text);
    }
  }, [pendingPrompt, view, isStreaming, sendPrompt]);

  const stopStream = () => { abortRef.current?.abort(); setIsStreaming(false); };
  const clearChat = () => { if (isStreaming) stopStream(); setMessages([]); setError(null); setClonedHtml(null); setCloneError(null); };

  /* ── Auto-deploy to Vercel (server token) ── */
  const deployToVercel = useCallback(async (projectName?: string) => {
    const html = clonedHtml ?? extractPreviewHtml(messages);
    if (!html) return;
    setIsDeploying(true);
    setDeployError(null);
    setDeployResult(null);
    setTerminalLines(prev => [...prev, '$ deploying to vercel...']);

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, projectName: projectName || 'aurion-app-' + Date.now().toString(36) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed');

      setDeployResult({ url: data.url, projectName: data.projectName });
      setTerminalLines(prev => [...prev, `\u2713 deployed: ${data.url}`]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deploy failed';
      setDeployError(msg);
      setTerminalLines(prev => [...prev, `\u2717 deploy error: ${msg}`]);
    } finally {
      setIsDeploying(false);
    }
  }, [clonedHtml, messages]);

  /* ── Clone website functions ── */
  const streamClone = async (url: string, html: string, tokens: { colors: string[]; fonts: string[]; cssVariables?: Record<string, string>; gradients?: string[]; shadows?: string[]; borderRadii?: string[]; mediaQueries?: string[]; keyframes?: string[] }, screenshot: string | null, signal: AbortSignal, pageName?: string, rawHtml?: string, branding?: unknown, navigation?: unknown[], images?: unknown[], styleBlocks?: string, linkedResources?: unknown): Promise<string> => {
    const res = await fetch('/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, html, rawHtml, tokens, branding, screenshot, pageName, navigation, images, styleBlocks, linkedResources, model }),
      signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Clone request failed' }));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('No response stream');

    let result = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') break;
        let data;
        try { data = JSON.parse(payload); } catch { continue; }
        if (data.error) throw new Error(data.error);
        if (data.model) setCloneProgress(`Cloning with ${data.model}...`);
        if (data.text) result += data.text;
      }
    }
    return result;
  };

  const assembleMultiPageHtml = (pages: { name: string; html: string }[]): string => {
    if (pages.length === 1) return pages[0].html;
    const navItems = pages.map((p, i) =>
      `<button onclick="showPage(${i})" class="nav-btn" id="nav-${i}">${p.name}</button>`
    ).join('');

    const pageFrames = pages.map((p, i) =>
      `<div class="page-frame" id="page-${i}" style="display:${i === 0 ? 'block' : 'none'};width:100%;height:100%"><iframe srcdoc="${p.html.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" style="width:100%;height:100%;border:none"></iframe></div>`
    ).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0a0a;color:#fff;height:100vh;display:flex;flex-direction:column}
      .nav{display:flex;gap:4px;padding:8px 12px;background:#111;border-bottom:1px solid #222;overflow-x:auto}
      .nav-btn{padding:6px 14px;border-radius:8px;border:1px solid #333;background:#1a1a1a;color:#aaa;font-size:12px;cursor:pointer;white-space:nowrap;transition:all .2s}
      .nav-btn:hover{background:#252525;color:#fff}
      .nav-btn.active{background:rgba(139,92,246,.15);color:#a78bfa;border-color:rgba(139,92,246,.3)}
      .pages{flex:1;position:relative;overflow:hidden}
      .page-frame{position:absolute;inset:0}
      .page-frame iframe{width:100%;height:100%}
    </style></head><body>
    <nav class="nav">${navItems}</nav>
    <div class="pages" id="pages">${pageFrames}</div>
    <script>
      let current=0;
      function showPage(i){document.getElementById('page-'+current).style.display='none';document.getElementById('nav-'+current).classList.remove('active');current=i;document.getElementById('page-'+i).style.display='block';document.getElementById('nav-'+i).classList.add('active');}
      showPage(0);
    </script></body></html>`;
  };

  const cloneWebsite = useCallback(async (urlOverride?: string) => {
    const url = (urlOverride || cloneUrl).trim();
    if (!url || isCloning) return;

    setIsCloning(true);
    setCloneProgress('Scraping website...');
    setCloneError(null);
    setShowCloneModal(false);
    setActiveTab('app');

    const controller = new AbortController();
    cloneAbortRef.current = controller;

    try {
      // Step 1: Scrape the main page
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!scrapeRes.ok) {
        const err = await scrapeRes.json().catch(() => ({ error: 'Scrape failed' }));
        throw new Error(err.error || `Scrape HTTP ${scrapeRes.status}`);
      }

      const scrapeData = await scrapeRes.json();

      // Step 2: Clone main page with AI
      setCloneProgress('Cloning main page with AI...');
      const mainHtml = await streamClone(
        url,
        scrapeData.html,
        scrapeData.tokens,
        scrapeData.screenshot,
        controller.signal,
        undefined,
        scrapeData.rawHtml,
        scrapeData.branding,
        scrapeData.navigation,
        scrapeData.images,
        scrapeData.styleBlocks,
        scrapeData.linkedResources,
      );

      const pages: { name: string; html: string }[] = [{ name: 'Home', html: mainHtml }];

      // Step 3: Clone sub-pages (max 3)
      const subLinks = (scrapeData.internalLinks || []).slice(0, 3);
      for (let i = 0; i < subLinks.length; i++) {
        if (controller.signal.aborted) break;
        const subPath = subLinks[i];
        const subUrl = new URL(subPath, url).href;
        const pageName = subPath.replace(/^\//,'').replace(/\//g,' > ') || 'Page';

        setCloneProgress(`Cloning sub-page ${i + 1}/${subLinks.length}: ${pageName}...`);

        try {
          const subScrape = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: subUrl, light: true }),
            signal: controller.signal,
          });

          if (subScrape.ok) {
            const subData = await subScrape.json();
            const subHtml = await streamClone(
              subUrl,
              subData.html,
              scrapeData.tokens,
              subData.screenshot,
              controller.signal,
              pageName,
              subData.rawHtml,
              scrapeData.branding,
            );
            pages.push({ name: pageName.charAt(0).toUpperCase() + pageName.slice(1), html: subHtml });
          }
        } catch { /* skip failed sub-pages */ }
      }

      // Step 4: Assemble
      setCloneProgress('Assembling...');
      const finalHtml = assembleMultiPageHtml(pages);
      setClonedHtml(finalHtml);
      setCloneProgress('');
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Clone failed';
      setCloneError(msg);
      setError(msg);
    } finally {
      setIsCloning(false);
      setCloneProgress('');
      cloneAbortRef.current = null;
    }
  }, [cloneUrl, isCloning, model]);

  const stopClone = () => {
    cloneAbortRef.current?.abort();
    setIsCloning(false);
    setCloneProgress('');
  };

  const refreshPreview = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      // Force re-render by toggling srcdoc
      const src = iframe.srcdoc;
      iframe.srcdoc = '';
      requestAnimationFrame(() => { iframe.srcdoc = src; });
    }
  };

  const hasContent = messages.length > 0;
  const hasPreviewContent = previewHtml !== null;

  // Panel visibility & sizing
  const [showChat, setShowChat] = useState(true);
  const [chatWidth, setChatWidth] = useState(380);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const chatDragRef = useRef(false);
  const termDragRef = useRef(false);

  // Terminal input
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [terminalLines]);

  // Drag resize for chat panel
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (chatDragRef.current) {
        const w = Math.max(280, Math.min(600, e.clientX));
        setChatWidth(w);
      }
      if (termDragRef.current) {
        const rect = document.getElementById('right-panel')?.getBoundingClientRect();
        if (rect) {
          const h = Math.max(100, Math.min(500, rect.bottom - e.clientY));
          setTerminalHeight(h);
        }
      }
    };
    const onUp = () => { chatDragRef.current = false; termDragRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const runTerminalCommand = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    setTerminalHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);
    setTerminalInput('');
    setTerminalLines(prev => [...prev, '$ ' + cmd]);

    // Simulate common commands
    const c = cmd.trim().toLowerCase();
    if (c === 'clear') { setTerminalLines([]); return; }
    if (c === 'help') { setTerminalLines(prev => [...prev, 'Available: clear, help, ls, pwd, node -v, npm -v, git status, whoami, date, echo <msg>']); return; }
    if (c === 'ls') { setTerminalLines(prev => [...prev, 'app/  lib/  public/  node_modules/  package.json  tsconfig.json  next.config.js']); return; }
    if (c === 'pwd') { setTerminalLines(prev => [...prev, '/home/aurion/project']); return; }
    if (c === 'node -v') { setTerminalLines(prev => [...prev, 'v20.11.0']); return; }
    if (c === 'npm -v') { setTerminalLines(prev => [...prev, '10.2.4']); return; }
    if (c === 'git status') { setTerminalLines(prev => [...prev, 'On branch main', 'nothing to commit, working tree clean']); return; }
    if (c === 'whoami') { setTerminalLines(prev => [...prev, 'aurion']); return; }
    if (c === 'date') { setTerminalLines(prev => [...prev, new Date().toString()]); return; }
    if (c.startsWith('echo ')) { setTerminalLines(prev => [...prev, cmd.slice(5)]); return; }
    setTerminalLines(prev => [...prev, 'command not found: ' + cmd.split(' ')[0]]);
  }, []);

  const saveIntegrationKey = useCallback((name: string, key: string) => {
    setIntegrationKeys(prev => ({ ...prev, [name]: key }));
    setEditingIntegration(null);
    setTerminalLines(prev => [...prev, '$ Connected: ' + name]);
  }, []);

  // ── AI Action Parser & Executor ──
  // The AI can emit special action blocks that get executed by the frontend
  const executedActionsRef = useRef<Set<string>>(new Set());

  const parseAndExecuteActions = useCallback((content: string) => {
    const actionRegex = /<<(TERMINAL|CONNECT|DEPLOY|TAB|CLONE|SHOW_TERMINAL|SHOW_INTEGRATIONS):?([^>]*)>>/g;
    let match;
    while ((match = actionRegex.exec(content)) !== null) {
      const actionId = match[0] + match.index;
      if (executedActionsRef.current.has(actionId)) continue;
      executedActionsRef.current.add(actionId);

      const [, action, payload] = match;
      switch (action) {
        case 'TERMINAL': {
          const cmd = payload.trim();
          if (cmd) {
            setShowTerminal(true);
            runTerminalCommand(cmd);
          }
          break;
        }
        case 'CONNECT': {
          const [name, key] = payload.split('|').map(s => s.trim());
          if (name && key) {
            setIntegrationKeys(prev => ({ ...prev, [name]: key }));
            setTerminalLines(prev => [...prev, `$ ✓ Integration connected: ${name}`]);
          }
          break;
        }
        case 'DEPLOY': {
          deployToVercel();
          break;
        }
        case 'TAB': {
          const tab = payload.trim().toLowerCase() as 'app' | 'code' | 'database' | 'payments';
          if (['app', 'code', 'database', 'payments'].includes(tab)) {
            setActiveTab(tab);
          }
          break;
        }
        case 'CLONE': {
          const url = payload.trim();
          if (url) {
            setCloneUrl(url);
            cloneWebsite(url);
          }
          break;
        }
        case 'SHOW_TERMINAL': {
          setShowTerminal(payload.trim() !== 'false');
          break;
        }
        case 'SHOW_INTEGRATIONS': {
          setShowIntegrations(payload.trim() !== 'false');
          break;
        }
      }
    }
  }, [deployToVercel, cloneWebsite, runTerminalCommand]);

  // Watch for AI actions in streaming messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.content) {
      parseAndExecuteActions(lastMsg.content);
    }
  }, [messages, parseAndExecuteActions]);

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */

  // ─── LANDING PAGE ─────────────────────────
  if (view === 'landing') {
    return (
      <div className="h-screen bg-[#0c0c0c] flex flex-col items-center justify-center relative">

        <div className="w-full max-w-[680px] mx-auto px-6 text-center">
          <h1 className="text-[52px] font-bold text-white leading-[1.1] mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Build any app
          </h1>
          <p className="text-[#888] text-[15px] mb-10 leading-relaxed">
            Use Claude, Gemini, Groq, and Firecrawl with AI to<br />
            build websites, clones, and full apps{' '}
            <span className="text-amber-400 cursor-pointer hover:text-amber-300">for free &rarr;</span>
          </p>

          {/* Prompt input — Orchids style */}
          <div className="bg-[#161616] rounded-2xl border border-[#252525] relative">
            <textarea
              ref={landingTextareaRef}
              value={landingInput}
              onChange={(e) => setLandingInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enterWorkspace(landingInput);
                }
              }}
              placeholder="Ask Aurion to build a Slack bot..."
              className="w-full resize-none bg-transparent outline-none text-gray-300 placeholder-[#555] text-[15px] px-5 pt-5 pb-8 min-h-[100px] max-h-[160px]"
              rows={2}
              autoFocus
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-1">
                {/* Model selector in prompt area */}
                <div className="relative" data-model-menu>
                  <button
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                    {selectedModel.name}
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                  </button>
                  <AnimatePresence>
                    {showModelMenu && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }} className="absolute left-0 bottom-10 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1.5 min-w-[220px] shadow-2xl shadow-black/60">
                        {(['anthropic', 'gemini', 'groq'] as const).map((provider, pi) => (
                          <div key={provider}>
                            {pi > 0 && <div className="h-px bg-[#222] my-1.5" />}
                            <div className="px-3 py-1 text-[10px] font-medium text-[#555] uppercase tracking-wider">{PROVIDER_LABELS[provider]}</div>
                            {MODELS.filter(m => m.provider === provider).map(m => (
                              <button key={m.id} onClick={() => { setModel(m.id); setShowModelMenu(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] hover:bg-[#222] transition-colors ${m.id === model ? 'text-white' : 'text-[#777]'}`}>
                                {PROVIDER_ICON[m.provider]}
                                <span className="flex-1 text-left">{m.name}</span>
                                {m.id === model && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                              </button>
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={() => setShowCloneModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">
                  <GlobeIcon /> Clone
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input ref={landingFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                <button onClick={() => landingFileInputRef.current?.click()} className="w-8 h-8 rounded-lg hover:bg-[#222] flex items-center justify-center text-[#555] hover:text-white transition-colors" title="Attach image">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <button
                  onClick={() => enterWorkspace(landingInput)}
                  disabled={!landingInput.trim() && attachedImages.length === 0}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                </button>
              </div>
            </div>
            {/* Image previews */}
            {attachedImages.length > 0 && (
              <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
                {attachedImages.map((img, i) => (
                  <div key={i} className="relative shrink-0 group">
                    <img src={img.data} alt={img.name} className="w-16 h-16 rounded-lg object-cover border border-[#333]" />
                    <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#333] text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick suggestion chips */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {['Web', 'Mobile', 'Slack Bot', 'AI Agent', 'Chrome Extension'].map((s) => (
              <button key={s} onClick={() => enterWorkspace(`Build me a ${s.toLowerCase()} app`)} className="px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[13px] text-[#888] hover:text-white hover:border-[#444] transition-colors">{s}</button>
            ))}
          </div>
        </div>

        {/* Clone Modal on landing */}
        <AnimatePresence>
          {showCloneModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowCloneModal(false); }}>
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
                <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Clone Website</h2>
                  <button onClick={() => setShowCloneModal(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 focus-within:border-[#444] transition-colors">
                    <LinkIcon />
                    <input type="url" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && cloneUrl.trim()) { setView('workspace'); setShowCloneModal(false); cloneWebsite(cloneUrl.trim()); } }} placeholder="https://example.com" className="flex-1 bg-transparent outline-none text-sm text-gray-300 placeholder-[#555] ml-2" autoFocus />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: 'Stripe', url: 'https://stripe.com' }, { label: 'Linear', url: 'https://linear.app' }, { label: 'Vercel', url: 'https://vercel.com' }].map((ex) => (
                      <button key={ex.label} onClick={() => setCloneUrl(ex.url)} className="px-3 py-2 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111] text-xs text-[#888] hover:text-white transition-colors text-center">{ex.label}</button>
                    ))}
                  </div>
                  <button onClick={() => { setView('workspace'); setShowCloneModal(false); cloneWebsite(cloneUrl.trim()); }} disabled={!cloneUrl.trim()} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">Clone</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── WORKSPACE VIEW ─────────────────────────

  return (
    <div className="h-screen bg-[#0c0c0c] flex relative overflow-hidden select-none">

      {/* ═══ Left: Chat panel (resizable) ═══ */}
      <AnimatePresence initial={false}>
        {showChat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: chatWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ width: chatWidth }}
            className="h-full border-r border-[#1e1e1e] flex flex-col bg-[#0f0f0f] shrink-0 overflow-hidden"
          >
            <div style={{ width: chatWidth }} className="h-full flex flex-col">
              {/* Chat header */}
              <div className="h-[44px] border-b border-[#1e1e1e] px-3 flex items-center justify-between shrink-0">
                <span className="text-[13px] font-medium text-white truncate max-w-[70%]">
                  {messages.length > 0 ? (messages[0]?.content?.slice(0, 50) + (messages[0]?.content?.length > 50 ? '...' : '')) : 'New Chat'}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={clearChat} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="New chat"><PlusIcon /></button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {!hasContent ? (
                  <div className="flex flex-col items-center justify-center h-full px-6">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#161616] border border-[#222] flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">A</span>
                      </div>
                      <h2 className="text-base font-semibold text-white mb-1.5">What do you want to build?</h2>
                      <p className="text-[12px] text-[#555] mb-5">Describe your idea or clone a website.</p>
                      <div className="space-y-1.5 text-left max-w-[260px] mx-auto">
                        {[
                          { title: 'Landing Page', desc: 'Modern SaaS landing with Tailwind' },
                          { title: 'Dashboard', desc: 'Analytics dashboard with charts' },
                          { title: 'Todo App', desc: 'Interactive task manager' },
                        ].map((ex) => (
                          <button key={ex.title} onClick={() => sendPrompt(`Build me a ${ex.desc.toLowerCase()}`)} className="w-full p-2.5 rounded-lg border border-[#222] hover:border-[#444] bg-[#111] hover:bg-[#161616] transition-colors text-left">
                            <p className="text-[12px] text-white">{ex.title}</p>
                            <p className="text-[10px] text-[#555]">{ex.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 px-3 space-y-3">
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                          {msg.role === 'user' ? (
                            <div className="max-w-[90%] px-3 py-2 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-white">
                              <p className="whitespace-pre-wrap text-[13px]">{msg.content}</p>
                            </div>
                          ) : (
                            <div className="prose prose-invert prose-sm max-w-none text-[13px] text-gray-300">
                              {msg.content ? <MarkdownContent content={msg.content} /> : isStreaming ? <TypingIndicator /> : null}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {error && <div className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-red-400 text-[11px]">{error}</div>}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Prompt input — Orchids style */}
              <div className="p-3 shrink-0 relative">
                <div className="bg-[#161616] rounded-xl border border-[#222] focus-within:border-[#444] transition-colors relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Give Aurion a followup..."
                    className="w-full resize-none bg-transparent outline-none text-gray-300 placeholder-[#555] text-[13px] px-3 pt-3 pb-6 max-h-[140px]"
                    rows={1}
                    disabled={isStreaming}
                  />
                  <div className="flex items-center justify-between px-3 pb-2">
                    <div className="flex items-center gap-1">
                      {/* Model selector */}
                      <div className="relative" data-model-menu>
                        <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#222] hover:bg-[#2a2a2a] text-[10px] text-[#888] hover:text-white transition-colors">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                          {selectedModel.name}
                          <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                        </button>
                        <AnimatePresence>
                          {showModelMenu && (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }} className="absolute left-0 bottom-8 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1.5 min-w-[200px] shadow-2xl shadow-black/60">
                              {(['anthropic', 'gemini', 'groq'] as const).map((provider, pi) => (
                                <div key={provider}>
                                  {pi > 0 && <div className="h-px bg-[#222] my-1.5" />}
                                  <div className="px-3 py-1 text-[9px] font-medium text-[#555] uppercase tracking-wider">{PROVIDER_LABELS[provider]}</div>
                                  {MODELS.filter(m => m.provider === provider).map(m => (
                                    <button key={m.id} onClick={() => { setModel(m.id); setShowModelMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${m.id === model ? 'text-white' : 'text-[#777]'}`}>
                                      {PROVIDER_ICON[m.provider]}
                                      <span className="flex-1 text-left">{m.name}</span>
                                      {m.id === model && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                      <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded-lg hover:bg-[#222] flex items-center justify-center text-[#555] hover:text-white transition-colors" title="Attach image"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                      {isStreaming ? (
                        <button onClick={stopStream} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center transition-colors" title="Stop"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
                      ) : (
                        <button onClick={sendMessage} disabled={!input.trim() && attachedImages.length === 0} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center transition-all disabled:opacity-20 hover:bg-gray-200" title="Send"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
                      )}
                    </div>
                  </div>
                  {/* Image previews */}
                  {attachedImages.length > 0 && (
                    <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto">
                      {attachedImages.map((img, i) => (
                        <div key={i} className="relative shrink-0 group">
                          <img src={img.data} alt={img.name} className="w-12 h-12 rounded-lg object-cover border border-[#333]" />
                          <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#333] text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">&times;</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat resize handle */}
      {showChat && (
        <div
          className="w-[4px] h-full cursor-col-resize hover:bg-[#444] active:bg-[#555] transition-colors shrink-0 z-10"
          onMouseDown={() => { chatDragRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
        />
      )}

      {/* ═══ Right: Main panel ═══ */}
      <div id="right-panel" className="h-full flex-1 flex flex-col bg-[#0c0c0c] min-w-0">

        {/* Top bar */}
        <div className="h-[44px] border-b border-[#1e1e1e] px-3 flex items-center justify-between shrink-0 bg-[#0f0f0f]">
          <div className="flex items-center gap-1">
            {/* Toggle chat sidebar */}
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors mr-1"
              title={showChat ? 'Hide chat' : 'Show chat'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            </button>
            {/* Tabs */}
            {([
              { id: 'app' as const, label: 'App', icon: <DesktopIcon /> },
              { id: 'code' as const, label: 'Code', icon: <CodeIcon /> },
              { id: 'database' as const, label: 'Database', icon: <DatabaseIcon /> },
              { id: 'payments' as const, label: 'Payments', icon: <PaymentsIcon /> },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-[#888]'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            {activeTab === 'app' && hasPreviewContent && (
              <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-[#222]">
                <button className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white rounded-md hover:bg-[#1a1a1a] transition-colors" onClick={refreshPreview} title="Refresh"><RefreshIcon /></button>
                <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'desktop' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setDeviceMode('desktop')}><DesktopIcon /></button>
                <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'mobile' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setDeviceMode('mobile')}><MobileIcon /></button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowIntegrations(!showIntegrations)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-colors ${showIntegrations ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              Integrations
            </button>
            <button onClick={() => setShowGitHubModal(true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"><GitHubIcon /></button>
            <button
              onClick={() => deployToVercel()}
              disabled={!hasPreviewContent || isDeploying}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white text-black text-[11px] font-medium transition-colors disabled:opacity-20 hover:bg-gray-200"
            >
              {isDeploying ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border border-black border-t-transparent rounded-full" /> Deploying...</>) : (<><DeployIcon /> Deploy</>)}
            </button>
          </div>
        </div>

        {/* Deploy banners */}
        <AnimatePresence>
          {deployResult && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 py-2 bg-[#111] border-b border-[#1e1e1e] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-emerald-400"><CheckCircleIcon /> Deployed: <a href={deployResult.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-300">{deployResult.url}</a></div>
                <button onClick={() => setDeployResult(null)} className="text-[#555] hover:text-white text-[10px]">Dismiss</button>
              </div>
            </motion.div>
          )}
          {deployError && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 py-2 bg-[#111] border-b border-[#1e1e1e] flex items-center justify-between">
                <span className="text-red-400 text-[11px]">{deployError}</span>
                <button onClick={() => setDeployError(null)} className="text-[#555] hover:text-white text-[10px]">Dismiss</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content area */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <AnimatePresence initial={false}>
                {activeTab === 'app' ? (
                  <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    {hasPreviewContent ? (
                      <div className="relative w-full h-full bg-[#0c0c0c] flex items-center justify-center">
                        <div className={`bg-white ${deviceMode === 'mobile' ? 'w-[375px] h-[667px] rounded-[20px] border-4 border-[#333]' : 'w-full h-full'} overflow-hidden`}>
                          <iframe ref={iframeRef} className="w-full h-full border-none bg-white" srcDoc={previewHtml ?? ''} sandbox="allow-scripts" title="Preview" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-[#0c0c0c]">
                        {isCloning ? (
                          <div className="text-center">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="w-6 h-6 mx-auto mb-3 border-2 border-white border-t-transparent rounded-full" />
                            <p className="text-[13px] text-white mb-1">Cloning...</p>
                            <p className="text-[11px] text-[#555]">{cloneProgress || 'Processing'}</p>
                            <button onClick={stopClone} className="mt-3 px-3 py-1 rounded-md border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                          </div>
                        ) : isStreaming ? (
                          <div className="text-center">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="w-6 h-6 mx-auto mb-3 border-2 border-white border-t-transparent rounded-full" />
                            <p className="text-[13px] text-white mb-1">Building...</p>
                            <p className="text-[11px] text-[#555]">Generating your app</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <GlobeIcon />
                            <p className="text-[12px] text-[#555] mt-3">No preview available</p>
                            {cloneError && (
                              <div className="mt-3 p-3 rounded-lg border border-[#2a2a2a] max-w-xs mx-auto">
                                <p className="text-red-400 text-[11px]">{cloneError}</p>
                                <button onClick={() => { setCloneError(null); setShowCloneModal(true); }} className="mt-2 text-[11px] text-[#888] hover:text-white underline">Try again</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : activeTab === 'code' ? (
                  <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto bg-[#0c0c0c]">
                    {codeBlocks.length > 0 ? (
                      <div className="p-4 space-y-4">{codeBlocks.map((block, idx) => <CodeBlock key={idx} code={block.code} language={block.language} />)}</div>
                    ) : (
                      <div className="flex items-center justify-center h-full"><div className="text-center"><CodeIcon /><p className="text-[12px] text-[#555] mt-3">Code blocks will appear here</p></div></div>
                    )}
                  </motion.div>
                ) : activeTab === 'database' ? (
                  <motion.div key="database" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto bg-[#0c0c0c] p-6">
                    <div className="max-w-lg mx-auto">
                      <h2 className="text-lg font-semibold text-white mb-1">Database</h2>
                      <p className="text-[12px] text-[#555] mb-6">Connect a database to store your app data.</p>
                      <div className="space-y-3">
                        {INTEGRATIONS.filter(i => i.cat === 'Database').map(intg => (
                          <div key={intg.name} className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-[13px] text-white font-medium">{intg.name}</p>
                                <p className="text-[11px] text-[#555]">{intg.desc}</p>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${integrationKeys[intg.name] ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                            </div>
                            {editingIntegration === intg.name ? (
                              <div className="flex gap-2 mt-2">
                                <input type="password" placeholder={intg.keyPlaceholder} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); }} />
                                <button onClick={() => setEditingIntegration(null)} className="px-2.5 py-1.5 rounded-md border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setEditingIntegration(intg.name)} className="mt-2 px-3 py-1.5 rounded-md bg-white text-black text-[11px] font-medium hover:bg-gray-200 transition-colors">
                                {integrationKeys[intg.name] ? 'Reconnect' : 'Connect'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'payments' ? (
                  <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto bg-[#0c0c0c] p-6">
                    <div className="max-w-lg mx-auto">
                      <h2 className="text-lg font-semibold text-white mb-1">Payments</h2>
                      <p className="text-[12px] text-[#555] mb-6">Manage payment integrations for your app.</p>
                      <div className="space-y-3">
                        {INTEGRATIONS.filter(i => i.cat === 'Payments').map(intg => (
                          <div key={intg.name} className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-[13px] text-white font-medium">{intg.name}</p>
                                <p className="text-[11px] text-[#555]">{intg.desc}</p>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${integrationKeys[intg.name] ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                            </div>
                            {editingIntegration === intg.name ? (
                              <div className="flex gap-2 mt-2">
                                <input type="password" placeholder={intg.keyPlaceholder} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); }} />
                                <button onClick={() => setEditingIntegration(null)} className="px-2.5 py-1.5 rounded-md border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setEditingIntegration(intg.name)} className="mt-2 px-3 py-1.5 rounded-md bg-white text-black text-[11px] font-medium hover:bg-gray-200 transition-colors">
                                {integrationKeys[intg.name] ? 'Reconnect' : 'Connect'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Integrations side panel */}
            <AnimatePresence>
              {showIntegrations && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="h-full border-l border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden shrink-0">
                  <div className="w-[300px] h-full flex flex-col">
                    <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between shrink-0">
                      <h3 className="text-[13px] font-medium text-white">Integrations</h3>
                      <button onClick={() => setShowIntegrations(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {INTEGRATIONS.map((intg) => {
                        const isConnected = intg.builtIn || !!integrationKeys[intg.name];
                        return (
                          <div key={intg.name} className="rounded-md hover:bg-[#161616] transition-colors">
                            {editingIntegration === intg.name ? (
                              <div className="px-3 py-2.5">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[12px] text-white">{intg.name}</span>
                                  <span className="text-[9px] text-[#444]">{intg.cat}</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <input type="password" placeholder={intg.keyPlaceholder || 'API Key'} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingIntegration(null); }} />
                                  <button onClick={() => setEditingIntegration(null)} className="px-2 py-1.5 rounded-md text-[10px] text-[#888] hover:text-white border border-[#2a2a2a] transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => !intg.builtIn && setEditingIntegration(intg.name)} className="w-full flex items-center gap-3 px-3 py-2 text-left cursor-default">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] text-white">{intg.name}</span>
                                    <span className="text-[9px] text-[#444]">{intg.cat}</span>
                                  </div>
                                  <p className="text-[10px] text-[#555] truncate">{intg.desc}</p>
                                </div>
                                {isConnected ? (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 shrink-0">{intg.builtIn ? 'built-in' : 'connected'}</span>
                                ) : (
                                  <span className="text-[9px] text-[#555] shrink-0 hover:text-white cursor-pointer">connect</span>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Terminal resize handle */}
          <div
            className="h-[4px] w-full cursor-row-resize hover:bg-[#444] active:bg-[#555] transition-colors shrink-0 z-10"
            onMouseDown={() => { termDragRef.current = true; document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; }}
          />

          {/* Terminal */}
          <div style={{ height: showTerminal ? terminalHeight : 32 }} className="border-t border-[#1e1e1e] bg-[#0c0c0c] flex flex-col shrink-0 transition-[height] duration-100">
            <button onClick={() => setShowTerminal(!showTerminal)} className="h-[32px] shrink-0 px-4 flex items-center justify-between text-[11px] text-[#555] hover:text-[#888] transition-colors w-full">
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                <span>Terminal</span>
              </div>
              <div className="flex items-center gap-2">
                {showTerminal ? <ChevronDownIcon /> : <ChevronUpIcon />}
                <PlusIcon />
              </div>
            </button>
            {showTerminal && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-auto px-4 pb-1 font-mono text-[11px] text-[#888]" onClick={() => terminalInputRef.current?.focus()}>
                  {terminalLines.map((line, i) => (
                    <div key={i} className={`leading-5 ${line.startsWith('$') ? 'text-[#ccc]' : line.startsWith('command not found') ? 'text-red-400' : ''}`}>{line}</div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
                <div className="flex items-center gap-1 px-4 pb-2 font-mono text-[11px]">
                  <span className="text-emerald-400">$</span>
                  <input
                    ref={terminalInputRef}
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { runTerminalCommand(terminalInput); }
                      if (e.key === 'ArrowUp') { e.preventDefault(); if (terminalHistory.length > 0) { const idx = historyIdx < 0 ? terminalHistory.length - 1 : Math.max(0, historyIdx - 1); setHistoryIdx(idx); setTerminalInput(terminalHistory[idx]); } }
                      if (e.key === 'ArrowDown') { e.preventDefault(); if (historyIdx >= 0) { const idx = historyIdx + 1; if (idx >= terminalHistory.length) { setHistoryIdx(-1); setTerminalInput(''); } else { setHistoryIdx(idx); setTerminalInput(terminalHistory[idx]); } } }
                    }}
                    className="flex-1 bg-transparent outline-none text-[#ccc] placeholder-[#555] caret-emerald-400"
                    placeholder="Type a command..."
                    spellCheck={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Clone Website Modal ═══ */}
      <AnimatePresence>
        {showCloneModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowCloneModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Clone Website</h2>
                <button onClick={() => setShowCloneModal(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 focus-within:border-[#444] transition-colors">
                  <LinkIcon />
                  <input type="url" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') cloneWebsite(); }} placeholder="https://example.com" className="flex-1 bg-transparent outline-none text-sm text-gray-300 placeholder-[#555] ml-2" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: 'Stripe', url: 'https://stripe.com' }, { label: 'Linear', url: 'https://linear.app' }, { label: 'Vercel', url: 'https://vercel.com' }].map((ex) => (
                    <button key={ex.label} onClick={() => setCloneUrl(ex.url)} className="px-3 py-2 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111] text-xs text-[#888] hover:text-white transition-colors text-center">{ex.label}</button>
                  ))}
                </div>
                {isCloning ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#2a2a2a]">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span className="text-[12px] text-white">{cloneProgress || 'Cloning...'}</span>
                    </div>
                    <button onClick={stopClone} className="w-full py-2.5 rounded-lg border border-[#2a2a2a] text-[#888] text-sm hover:text-white transition-colors">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => cloneWebsite()} disabled={!cloneUrl.trim()} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">Clone</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ GitHub Modal ═══ */}
      <AnimatePresence>
        {showGitHubModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowGitHubModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Push to GitHub</h2>
                <button onClick={() => setShowGitHubModal(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-3">
                <div><label className="block text-[12px] text-[#888] mb-1.5">GitHub Token</label><input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_..." className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" /></div>
                <div><label className="block text-[12px] text-[#888] mb-1.5">Repository Name</label><input type="text" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="my-aurion-app" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" /></div>
                <button disabled={!githubToken.trim() || !repoName.trim()} onClick={() => { setTerminalLines(prev => [...prev, '$ git remote add origin ...', '$ git push -u origin main', 'GitHub push is not yet implemented — coming soon!']); setShowGitHubModal(false); setShowTerminal(true); }} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">Create & Push</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
