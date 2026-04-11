import { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import hljs from 'highlight.js';
import dynamic from 'next/dynamic';
import type { Message } from '@/lib/client-utils';
import { PREMIUM_FONTS_CDN, SHADCN_BASE_CSS } from '@/lib/cdn-models';

const MonacoEditorLazy = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const TAG_COLORS: Record<string, string> = {
  Vision: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Code: 'text-green-400 bg-green-500/10 border-green-500/20',
  Fast: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Best: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Large: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  New: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Agent: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

const PROVIDER_LABELS: Record<string, string> = { ollama: 'Ollama Cloud', google: 'Google AI', anthropic: 'Mammoth AI (Claude)' };

const PROVIDER_ICON: Record<string, ReactNode> = {
  ollama: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-60"><circle cx="12" cy="8" r="5"/><ellipse cx="12" cy="18" rx="8" ry="5"/></svg>,
  google: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-60"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
  anthropic: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-60"><path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.604L16.742 20.48h-3.603L6.57 3.52zM0 20.48h3.604L7.68 9.928 6.07 5.64 0 20.48z"/></svg>,
};

function getApiEndpoint(provider: string): string {
  // Route Anthropic models through the Claude Code endpoint for Mammoth AI
  if (provider === 'anthropic') return '/api/claude-code';
  // Route Ollama models through the HuggingFace endpoint (Ollama Cloud)
  if (provider === 'ollama') return '/api/ollama';
  return '/api/gemini';
}

// Vision model IDs — all Gemini models support vision
const VISION_MODELS = new Set(['gemini-3-flash-preview', 'gemma4', 'glm-4.7-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash']);
const BEST_VISION_MODEL = 'gemini-3-flash-preview';

// Only auto-route when images require a vision model — never override user's choice otherwise
function getOptimalModel(currentModel: string, _text: string, hasImages: boolean): string {
  if (hasImages && !VISION_MODELS.has(currentModel)) return BEST_VISION_MODEL;
  return currentModel;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ────────── Extract code for preview ────────── */
function extractPreviewHtml(messages: Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || !msg.content) continue;

    // 0. Match <<FILE:index.html>>...<</FILE>> or <FILE:index.html>...</FILE>
    const fileTagMatch = msg.content.match(/<<FILE:index\.html?>>([\s\S]*?)<<\/FILE>>/) ||
                         msg.content.match(/<FILE:index\.html?>([\s\S]*?)<\/FILE>/);
    if (fileTagMatch) {
      const inner = fileTagMatch[1].trim();
      if (inner.length > 50) return inner;
    }

    // 0b. Fallback: unclosed <FILE:index.html> tag (model may omit </FILE>)
    if (!fileTagMatch) {
      const unclosedMatch = msg.content.match(/<<?FILE:index\.html?>>?([\s\S]+)/i);
      if (unclosedMatch) {
        let inner = unclosedMatch[1].trim();
        inner = inner.replace(/<\/?FILE>/gi, '').replace(/<<\/FILE>>/g, '');
        const htmlEnd = inner.search(/<\/html>/i);
        if (htmlEnd !== -1) inner = inner.slice(0, htmlEnd + 7);
        if (inner.length > 50 && /<!doctype|<html|<head|<body/i.test(inner)) return inner;
      }
    }

    // 1. Match <file path="...">...</file> wrapper (screenshot-to-code format)
    const fileMatch = msg.content.match(/<file\s+path="[^"]+"\s*>([\s\S]*?)<\/file>/i);
    if (fileMatch) {
      const inner = fileMatch[1].trim();
      if (/<!doctype|<html/i.test(inner)) return inner;
    }

    // 2. Match ```html ... ``` blocks
    const htmlBlocks = [...msg.content.matchAll(/```html\s*\n([\s\S]*?)```/g)];
    if (htmlBlocks.length > 0) {
      const fullDoc = htmlBlocks.find(m => /<!doctype|<html/i.test(m[1]));
      return (fullDoc ?? htmlBlocks[htmlBlocks.length - 1])[1].trim();
    }

    // 2b. Match ```jsx/tsx ... ``` blocks — wrap in React runtime
    const jsxBlocks = [...msg.content.matchAll(/```(?:jsx|tsx)\s*\n([\s\S]*?)```/g)];
    if (jsxBlocks.length > 0) {
      const code = jsxBlocks.map(m => m[1].trim()).join('\n\n');
      if (code.length > 50) {
        const useTailwind = /className=["'][^"']*(?:flex|grid|p-|m-|text-|bg-|rounded)/.test(code);
        return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
${useTailwind ? '<script crossorigin src="https://cdn.tailwindcss.com"></script>' : ''}
<script crossorigin src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
${PREMIUM_FONTS_CDN}
${SHADCN_BASE_CSS}
</head><body><div id="root"></div>
<script type="text/babel">
${code}
if (typeof App !== 'undefined') ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
</script></body></html>`;
      }
    }

    // 3. Match full HTML documents outside of code fences
    const docMatch = msg.content.match(/(<(!DOCTYPE|html)[^>]*>[\s\S]*<\/html>)/i);
    if (docMatch) return docMatch[1].trim();

    // 4. Fallback: CSS+HTML snippet combo
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
// Map markdown/hljs language names to Monaco language IDs
const toMonacoLang = (lang?: string): string => {
  if (!lang) return 'plaintext';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', sh: 'shell', bash: 'shell', zsh: 'shell',
    yml: 'yaml', md: 'markdown', dockerfile: 'dockerfile',
    rb: 'ruby', rs: 'rust', go: 'go', java: 'java', cs: 'csharp',
    cpp: 'cpp', c: 'c', swift: 'swift', kt: 'kotlin',
    sql: 'sql', graphql: 'graphql', json: 'json', xml: 'xml',
    html: 'html', css: 'css', scss: 'scss', less: 'less',
    php: 'php', lua: 'lua', r: 'r', dart: 'dart', toml: 'ini',
    plaintext: 'plaintext', text: 'plaintext',
  };
  return map[lang.toLowerCase()] || lang.toLowerCase();
};

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const monacoLang = toMonacoLang(language);
  const lineCount = code.split('\n').length;
  // Cap height: min 3 lines, max 25 lines, 19px per line + 10px padding
  const editorHeight = Math.min(Math.max(lineCount, 3), 25) * 19 + 10;

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-[#2a2a2a]">
      {/* Tab bar like VS Code */}
      <div className="flex items-center justify-between bg-[#1e1e1e] px-3 py-1 text-[11px] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <span className="text-[#569cd6] font-mono">{language ?? 'code'}</span>
          <span className="text-[#555]">{lineCount} lines</span>
          {lineCount > 25 && (
            <button onClick={() => setCollapsed(!collapsed)} className="text-[#666] hover:text-[#ccc] transition-colors">
              {collapsed ? '▶ expand' : '▼ collapse'}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1 text-[#666] hover:text-white transition-colors"
        >
          {copied ? (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Copied</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</>
          )}
        </button>
      </div>
      {/* Monaco Editor */}
      {!collapsed && (
        <div style={{ height: editorHeight }}>
          <MonacoEditorLazy
            height="100%"
            language={monacoLang}
            value={code}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              lineNumbersMinChars: 3,
              glyphMargin: false,
              folding: true,
              renderLineHighlight: 'none',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: { vertical: 'auto', horizontal: 'auto', verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
              fontSize: 13,
              fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
              fontLigatures: true,
              padding: { top: 8, bottom: 4 },
              contextmenu: false,
              domReadOnly: true,
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              renderWhitespace: 'none',
              wordWrap: 'off',
              automaticLayout: true,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ────────── Markdown Renderer ────────── */
function MarkdownContent({ content }: { content: string }) {
  // Strip AI action tags and FILE tags from visible output (both <<...>> and <...> formats)
  const cleanContent = content
    .replace(/<<(TERMINAL|CONNECT|DEPLOY|TAB|CLONE|SHOW_TERMINAL|SHOW_INTEGRATIONS|LTX_VIDEO|GEMINI_IMAGE|STITCH):?[^>]*>>/g, '')
    .replace(/<<FILE:[^>]+>>[\s\S]*?<<\/FILE>>/g, '')
    .replace(/<FILE:[^>]+>[\s\S]*?<\/FILE>/g, '')
    .trim();
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

const FileIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);

const getFileIcon = (filename: string, size = 14) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const colors: Record<string, string> = {
    html: 'text-orange-400', htm: 'text-orange-400',
    css: 'text-blue-400', scss: 'text-pink-400', sass: 'text-pink-400', less: 'text-blue-300',
    js: 'text-yellow-400', mjs: 'text-yellow-400', cjs: 'text-yellow-400',
    ts: 'text-blue-500', mts: 'text-blue-500',
    jsx: 'text-cyan-400', tsx: 'text-cyan-500',
    json: 'text-yellow-300', jsonc: 'text-yellow-300',
    md: 'text-gray-400', mdx: 'text-gray-400',
    svg: 'text-green-400', png: 'text-green-300', jpg: 'text-green-300', jpeg: 'text-green-300', gif: 'text-green-300', webp: 'text-green-300', ico: 'text-green-300',
    py: 'text-green-500', rb: 'text-red-400', go: 'text-cyan-300', rs: 'text-orange-300',
    yaml: 'text-red-300', yml: 'text-red-300', toml: 'text-gray-500',
    env: 'text-yellow-600', gitignore: 'text-gray-600',
    lock: 'text-gray-600',
  };
  const labels: Record<string, string> = {
    html: 'H', htm: 'H', css: '#', scss: 'S', sass: 'S',
    js: 'JS', mjs: 'JS', cjs: 'JS', ts: 'TS', mts: 'TS',
    jsx: 'JX', tsx: 'TX', json: '{}', md: 'M', mdx: 'M',
    svg: '◇', py: 'Py', rb: 'Rb', go: 'Go', rs: 'Rs',
    yaml: 'Y', yml: 'Y', toml: 'T',
  };
  const color = colors[ext] || 'text-[#666]';
  const label = labels[ext];
  if (label) {
    return (
      <span className={`shrink-0 inline-flex items-center justify-center font-bold ${color}`} style={{ width: size, height: size, fontSize: size * 0.55, lineHeight: 1 }}>
        {label}
      </span>
    );
  }
  return <FileIcon size={size} />;
};

const FolderIcon = ({ open = false, size = 14 }: { open?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    {open ? (
      <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M2 10h20"/></>
    ) : (
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    )}
  </svg>
);

/* ── Integrations Catalog ── */
const INTEGRATIONS: { name: string; desc: string; cat: string; keyPlaceholder?: string; keyPrefix?: string; builtIn?: boolean }[] = [
  { name: 'Vercel', desc: 'Auto-deploy to production', cat: 'Deploy', builtIn: true },
  { name: 'Firecrawl', desc: 'Web scraping & cloning', cat: 'Scraping', builtIn: true },
  { name: 'Ollama Cloud', desc: 'Gemma 4, GLM-4.7 Flash, Gemini 3 Flash — FREE unlimited cloud AI with Vision', cat: 'AI', builtIn: true },
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
  { name: 'NotebookLM', desc: 'AI research & deep analysis engine', cat: 'AI', builtIn: true },
  { name: 'Claude Code', desc: 'Enhanced execution — smart retry, quality gates', cat: 'AI', builtIn: true },
  { name: 'Google Stitch', desc: 'AI-powered UI/UX design generation', cat: 'AI', keyPlaceholder: 'stitch_...', keyPrefix: 'stitch' },
];

/* ── Sandbox Mock Data ── */
const SANDBOX_DB: Record<string, Record<string, unknown>[]> = {
  users: [
    { id: 1, name: 'Alice Martin', email: 'alice@example.com', role: 'admin', created_at: '2025-01-15T10:30:00Z' },
    { id: 2, name: 'Bob Chen', email: 'bob@example.com', role: 'user', created_at: '2025-02-20T14:12:00Z' },
    { id: 3, name: 'Clara Diaz', email: 'clara@example.com', role: 'editor', created_at: '2025-03-08T09:45:00Z' },
    { id: 4, name: 'David Kim', email: 'david@example.com', role: 'user', created_at: '2025-04-12T16:20:00Z' },
    { id: 5, name: 'Eva Rossi', email: 'eva@example.com', role: 'admin', created_at: '2025-05-01T08:00:00Z' },
  ],
  orders: [
    { id: 'ORD-001', customer_id: 1, total: 149.99, status: 'completed', items: 3, created_at: '2025-06-15' },
    { id: 'ORD-002', customer_id: 2, total: 89.50, status: 'processing', items: 1, created_at: '2025-06-18' },
    { id: 'ORD-003', customer_id: 3, total: 250.00, status: 'shipped', items: 5, created_at: '2025-06-20' },
    { id: 'ORD-004', customer_id: 1, total: 34.99, status: 'completed', items: 1, created_at: '2025-06-22' },
  ],
  products: [
    { id: 1, name: 'Pro Plan', price: 29.99, stock: 999, category: 'subscription', active: true },
    { id: 2, name: 'Enterprise Plan', price: 99.99, stock: 999, category: 'subscription', active: true },
    { id: 3, name: 'Widget Alpha', price: 15.00, stock: 42, category: 'physical', active: true },
    { id: 4, name: 'Legacy Bundle', price: 49.99, stock: 0, category: 'digital', active: false },
  ],
};

const SANDBOX_STRIPE = {
  balance: { available: 284350, pending: 12500 },
  products: [
    { id: 'prod_sb1', name: 'Pro Monthly', active: true },
    { id: 'prod_sb2', name: 'Pro Annual', active: true },
    { id: 'prod_sb3', name: 'Enterprise', active: true },
    { id: 'prod_sb4', name: 'Legacy Plan', active: false },
  ],
  transactions: [
    { id: 'ch_sb1', amount: 2999, status: 'succeeded', customer: 'alice@example.com', date: '2025-06-15' },
    { id: 'ch_sb2', amount: 9999, status: 'succeeded', customer: 'bob@example.com', date: '2025-06-18' },
    { id: 'ch_sb3', amount: 2999, status: 'refunded', customer: 'clara@example.com', date: '2025-06-20' },
    { id: 'ch_sb4', amount: 4999, status: 'succeeded', customer: 'david@example.com', date: '2025-06-22' },
  ],
};

const SANDBOX_EMAILS = [
  { id: 'em_1', to: 'alice@example.com', subject: 'Welcome to Our Platform!', status: 'delivered', date: '2025-06-15 10:30' },
  { id: 'em_2', to: 'bob@example.com', subject: 'Your Order Confirmation #ORD-002', status: 'delivered', date: '2025-06-18 14:12' },
  { id: 'em_3', to: 'clara@example.com', subject: 'Password Reset Request', status: 'bounced', date: '2025-06-20 09:45' },
];

const SANDBOX_MESSAGES = [
  { id: 'msg_1', channel: '#general', text: 'Deployment successful! v2.1.0 is live.', platform: 'Slack', date: '2025-06-15 10:30' },
  { id: 'msg_2', channel: '+1 555-0123', text: 'Your verification code is 847291', platform: 'Twilio', date: '2025-06-18 14:12' },
  { id: 'msg_3', channel: '#alerts', text: 'New order received: ORD-003 ($250.00)', platform: 'Discord', date: '2025-06-20 09:45' },
];


export {
  TAG_COLORS, PROVIDER_LABELS, PROVIDER_ICON, getApiEndpoint,
  VISION_MODELS, BEST_VISION_MODEL, getOptimalModel, generateId,
  extractPreviewHtml, extractAllCodeBlocks, CodeBlock, MarkdownContent, TypingIndicator,
  DesktopIcon, CodeIcon, MobileIcon, RefreshIcon, GlobeIcon, LinkIcon,
  DatabaseIcon, PaymentsIcon, DeployIcon, GitHubIcon, SettingsIcon, PlusIcon,
  ChevronDownIcon, ChevronUpIcon, CheckCircleIcon, FileIcon, getFileIcon, FolderIcon,
  INTEGRATIONS, SANDBOX_DB, SANDBOX_STRIPE, SANDBOX_EMAILS, SANDBOX_MESSAGES,
};
