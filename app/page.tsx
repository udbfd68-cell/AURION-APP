"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import hljs from 'highlight.js';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(m => m.default), { ssr: false, loading: () => <div className="flex-1 bg-[#1e1e1e]" /> });

/* ────────── Fetch with Retry + Timeout ────────── */
async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  maxRetries = 2,
): Promise<Response> {
  const { timeout = 30000, ...fetchOpts } = options;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    if (fetchOpts.signal) {
      // Chain external AbortSignal so caller can still cancel
      fetchOpts.signal.addEventListener('abort', () => controller.abort(), { once: true });
      if (fetchOpts.signal.aborted) { controller.abort(); }
    }
    const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
      if (timer) clearTimeout(timer);
      // Don't retry on client errors (4xx) — only server errors
      if (!res.ok && res.status >= 500 && attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err: unknown) {
      if (timer) clearTimeout(timer);
      const isAbort = (err as Error).name === 'AbortError';
      // If original signal was aborted by caller, don't retry
      if (isAbort && fetchOpts.signal?.aborted) throw err;
      // Timeout or network error — retry with backoff
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (isAbort && !fetchOpts.signal?.aborted) {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

/* ────────── IndexedDB helpers ────────── */
const IDB_NAME = 'aurion_db';
const IDB_STORE = 'project_files';
const IDB_VERSION = 1;

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }));
}

function idbSet(key: string, val: unknown): Promise<void> {
  return openIDB().then(db => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  })).catch((err: DOMException | null) => {
    // Handle QuotaExceededError: clean up old entries and retry once
    if (err?.name === 'QuotaExceededError') {
      return idbCleanup().then(() =>
        openIDB().then(db => new Promise<void>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(val, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }))
      );
    }
    throw err;
  });
}

/** Remove old project VFS snapshots when storage is running low */
function idbCleanup(): Promise<void> {
  return openIDB().then(db => new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = req.result as string[];
      // Remove old project VFS entries (keep current project + index)
      const vfsKeys = keys.filter(k => k.startsWith('vfs_') && k !== 'vfs');
      // Keep the 5 most recent, delete the rest
      if (vfsKeys.length > 5) {
        const toDelete = vfsKeys.slice(0, vfsKeys.length - 5);
        for (const k of toDelete) {
          store.delete(k);
        }
      }
      resolve();
    };
    req.onerror = () => resolve();
  }));
}

/* ────────── Types ────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ProjectFile {
  content: string;
  language: string;
}

type VirtualFS = Record<string, ProjectFile>;

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css', js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript', json: 'json', md: 'markdown',
    py: 'python', sql: 'sql', sh: 'bash', yml: 'yaml', yaml: 'yaml',
    svg: 'xml', xml: 'xml', env: 'bash', toml: 'toml',
  };
  return map[ext] || 'plaintext';
}

function buildFileTree(files: VirtualFS): { dirs: Set<string>; entries: { path: string; name: string; depth: number; isDir: boolean }[] } {
  const dirs = new Set<string>();
  const allPaths = Object.keys(files).sort();
  for (const p of allPaths) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  const entries: { path: string; name: string; depth: number; isDir: boolean }[] = [];
  const sortedAll = [...Array.from(dirs), ...allPaths].sort((a, b) => {
    const aParts = a.split('/'), bParts = b.split('/');
    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
      if (aParts[i] !== bParts[i]) {
        const aIsDir = i < aParts.length - 1 || dirs.has(a);
        const bIsDir = i < bParts.length - 1 || dirs.has(b);
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
        return aParts[i].localeCompare(bParts[i]);
      }
    }
    return aParts.length - bParts.length;
  });
  const seen = new Set<string>();
  for (const p of sortedAll) {
    if (seen.has(p)) continue;
    seen.add(p);
    const parts = p.split('/');
    const isDir = dirs.has(p);
    entries.push({ path: p, name: parts[parts.length - 1], depth: parts.length - 1, isDir });
  }
  return { dirs, entries };
}

/* ── Assemble multi-file preview ── */
function assemblePreview(files: VirtualFS): string | null {
  const index = files['index.html'];
  if (!index) return null;
  let html = index.content;
  // Inline <link rel="stylesheet" href="X"> from VFS
  html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi, (match, href) => {
    const cssFile = files[href] || files[href.replace(/^\.?\//, '')];
    if (cssFile) return `<style>/* ${href} */\n${cssFile.content}</style>`;
    return match;
  });
  // Inline <script src="X"> from VFS
  html = html.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
    const jsFile = files[src] || files[src.replace(/^\.?\//, '')];
    if (jsFile) return `<script>/* ${src} */\n${jsFile.content}</script>`;
    return match;
  });
  return html;
}

type AIModel = { id: string; name: string; provider: 'ollama'; tags: string[] };

const MODELS: AIModel[] = [
  // ── Vision Models (Screenshot-to-Code, Image Analysis) ──
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'ollama', tags: ['Vision', 'Fast'] },
  { id: 'glm-4.7', name: 'GLM-4.7', provider: 'ollama', tags: ['Vision', 'Code'] },
  { id: 'glm-4.6', name: 'GLM-4.6', provider: 'ollama', tags: ['Vision', 'Agent'] },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', provider: 'ollama', tags: ['Vision'] },
  { id: 'qwen3.5-397b', name: 'Qwen3.5 397B', provider: 'ollama', tags: ['Vision', 'Large'] },
  // ── Coding Models (Code Generation, App Building) ──
  { id: 'qwen3-coder-480b', name: 'Qwen3 Coder 480B', provider: 'ollama', tags: ['Code', 'Best'] },
  { id: 'qwen3-coder-next', name: 'Qwen3 Coder Next', provider: 'ollama', tags: ['Code', 'New'] },
  { id: 'devstral-2', name: 'Devstral 2 123B', provider: 'ollama', tags: ['Code'] },
  { id: 'devstral-small-2', name: 'Devstral Small 2', provider: 'ollama', tags: ['Code', 'Fast'] },
  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'ollama', tags: ['Code'] },
  { id: 'glm-5', name: 'GLM-5 744B', provider: 'ollama', tags: ['Code', 'Large'] },
];

const TAG_COLORS: Record<string, string> = {
  Vision: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Code: 'text-green-400 bg-green-500/10 border-green-500/20',
  Fast: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Best: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Large: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  New: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Agent: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

const PROVIDER_LABELS: Record<string, string> = { ollama: 'Ollama Cloud' };

const PROVIDER_ICON: Record<string, ReactNode> = {
  ollama: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-60"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
};

function getApiEndpoint(provider: string): string {
  return '/api/huggingface';
}

// Vision model IDs for auto-routing
const VISION_MODELS = new Set(['gemini-3-flash', 'glm-4.7', 'glm-4.6', 'kimi-k2.5', 'qwen3.5-397b']);
const BEST_CODING_MODEL = 'qwen3-coder-480b';
const BEST_VISION_MODEL = 'gemini-3-flash';

// Smart model auto-routing: picks the optimal model for the task
function getOptimalModel(currentModel: string, text: string, hasImages: boolean): string {
  // If images are attached, MUST use a vision model
  if (hasImages && !VISION_MODELS.has(currentModel)) return BEST_VISION_MODEL;
  // If user explicitly mentions screenshot/image analysis, route to vision
  const visionKeywords = /screenshot|image|photo|picture|look at|analyze.*image|from.*screenshot/i;
  if (visionKeywords.test(text) && !VISION_MODELS.has(currentModel)) return BEST_VISION_MODEL;
  // If heavy code generation, prefer coding model
  const heavyCodeKeywords = /build.*app|create.*dashboard|full.*page|entire.*site|refactor|rewrite|complex.*component/i;
  if (heavyCodeKeywords.test(text) && VISION_MODELS.has(currentModel) && !hasImages) return BEST_CODING_MODEL;
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

    // 1. Match <file path="...">...</file> wrapper (screenshot-to-code format)
    const fileMatch = msg.content.match(/<file\s+path="[^"]+"\s*>([\s\S]*?)<\/file>/i);
    if (fileMatch) {
      const inner = fileMatch[1].trim();
      if (/<!doctype|<html/i.test(inner)) return inner;
    }

    // 2. Match ```html ... ``` blocks
    const htmlBlocks = [...msg.content.matchAll(/```html\s*\n([\s\S]*?)```/g)];
    if (htmlBlocks.length > 0) {
      // Prefer the block that looks like a full document
      const fullDoc = htmlBlocks.find(m => /<!doctype|<html/i.test(m[1]));
      return (fullDoc ?? htmlBlocks[htmlBlocks.length - 1])[1].trim();
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
  // Strip AI action tags and FILE tags from visible output
  const cleanContent = content.replace(/<<(TERMINAL|CONNECT|DEPLOY|TAB|CLONE|SHOW_TERMINAL|SHOW_INTEGRATIONS|LTX_VIDEO|GEMINI_IMAGE):?[^>]*>>/g, '').replace(/<<FILE:[^>]+>>[\s\S]*?<<\/FILE>>/g, '').trim();
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
  { name: 'Ollama Cloud', desc: 'Gemini 3 Flash, GLM-4.7, Qwen3 Coder 480B, DeepSeek V3.2, Kimi K2.5 — FREE unlimited cloud AI with Vision', cat: 'AI', builtIn: true },
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

/* ────────── Project Templates ────────── */
const TEMPLATES: { name: string; desc: string; icon: string; files: VirtualFS }[] = [
  {
    name: 'SaaS Landing', desc: 'Premium SaaS landing page with animated hero, live dashboard, pricing, testimonials & more', icon: '🚀',
    files: {
      'index.html': { content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Salix — The Smartest Way to Bring Best ROI for Sales</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#fafafa;--card:#fff;--text:#0f172a;--muted:#64748b;--accent:#7c3aed;--accent-dark:#6d28d9;
  --accent-light:#ede9fe;--accent-glow:rgba(124,58,237,.15);--border:#e2e8f0;--border-light:#f1f5f9;
  --radius:16px;--radius-lg:24px;--shadow:0 1px 3px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.03);
  --shadow-lg:0 4px 6px rgba(0,0,0,.04),0 24px 64px rgba(0,0,0,.06);
  --green:#10b981;--red:#ef4444;--amber:#f59e0b;--blue:#3b82f6;--pink:#ec4899;--cyan:#06b6d4;
}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:var(--text);background:var(--bg);line-height:1.6;overflow-x:hidden}

/* ===== ANIMATIONS ===== */
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes floatSlow{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(2deg)}}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes spin-slow{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes dash{to{stroke-dashoffset:0}}
@keyframes counter-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes blob{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(124,58,237,.15)}50%{box-shadow:0 0 40px rgba(124,58,237,.3)}}
@keyframes typing{from{width:0}to{width:100%}}
@keyframes blink{0%,100%{border-color:transparent}50%{border-color:var(--accent)}}

.reveal{opacity:0;transform:translateY(30px);transition:all .7s cubic-bezier(.16,1,.3,1)}
.reveal.visible{opacity:1;transform:translateY(0)}
.reveal-left{opacity:0;transform:translateX(-40px);transition:all .7s cubic-bezier(.16,1,.3,1)}
.reveal-left.visible{opacity:1;transform:translateX(0)}
.reveal-right{opacity:0;transform:translateX(40px);transition:all .7s cubic-bezier(.16,1,.3,1)}
.reveal-right.visible{opacity:1;transform:translateX(0)}
.reveal-scale{opacity:0;transform:scale(.9);transition:all .7s cubic-bezier(.16,1,.3,1)}
.reveal-scale.visible{opacity:1;transform:scale(1)}

/* ===== NAVIGATION ===== */
.nav-wrapper{position:fixed;top:0;left:0;right:0;z-index:1000;transition:all .3s ease}
.nav-wrapper.scrolled{background:rgba(255,255,255,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border-light);box-shadow:0 1px 10px rgba(0,0,0,.04)}
nav{display:flex;align-items:center;justify-content:space-between;max-width:1200px;margin:0 auto;padding:18px 24px}
.logo{display:flex;align-items:center;gap:10px;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:22px;text-decoration:none;color:var(--text)}
.logo-icon{width:36px;height:36px;background:linear-gradient(135deg,var(--accent),var(--pink));border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px}
.nav-links{display:flex;align-items:center;gap:36px}
.nav-links a{text-decoration:none;font-size:14px;font-weight:500;color:var(--muted);transition:color .2s;position:relative}
.nav-links a:hover{color:var(--text)}
.nav-links a::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:2px;background:var(--accent);border-radius:2px;transition:width .3s}
.nav-links a:hover::after{width:100%}
.nav-actions{display:flex;align-items:center;gap:12px}
.btn-ghost{padding:10px 20px;background:none;border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:600;color:var(--text);cursor:pointer;transition:all .2s;font-family:inherit}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
.btn-primary{padding:10px 24px;background:var(--text);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all .25s;font-family:inherit}
.btn-primary:hover{background:#1e293b;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.12)}
.mobile-toggle{display:none;background:none;border:none;font-size:20px;cursor:pointer;color:var(--text);padding:8px}

/* ===== HERO ===== */
.hero{position:relative;text-align:center;max-width:800px;margin:0 auto;padding:140px 24px 60px;overflow:visible}
.hero-bg{position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:900px;height:900px;background:radial-gradient(circle,rgba(124,58,237,.06) 0%,transparent 70%);pointer-events:none;z-index:0}
.hero-orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.3;pointer-events:none}
.hero-orb-1{width:400px;height:400px;background:var(--accent);top:-100px;right:-100px;animation:floatSlow 12s ease-in-out infinite}
.hero-orb-2{width:300px;height:300px;background:var(--pink);bottom:-50px;left:-80px;animation:floatSlow 10s ease-in-out infinite reverse}
.hero-orb-3{width:200px;height:200px;background:var(--cyan);top:50%;left:50%;animation:floatSlow 8s ease-in-out infinite}
.hero-content{position:relative;z-index:1}
.hero-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;background:var(--accent-light);color:var(--accent);border-radius:100px;font-size:13px;font-weight:600;margin-bottom:28px;animation:fadeDown .6s ease .1s both}
.hero-badge .dot{width:8px;height:8px;background:var(--accent);border-radius:50%;animation:pulse 2s ease infinite}
.hero h1{font-family:'Space Grotesk',sans-serif;font-size:clamp(40px,6vw,68px);font-weight:700;line-height:1.08;letter-spacing:-.03em;margin-bottom:24px;animation:fadeUp .7s ease .2s both}
.hero h1 .gradient-text{background:linear-gradient(135deg,var(--accent),var(--pink),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;background-size:200% 200%;animation:gradient-shift 4s ease infinite}
.hero p{font-size:18px;color:var(--muted);max-width:520px;margin:0 auto 36px;line-height:1.7;animation:fadeUp .7s ease .3s both}
.hero-cta-row{display:flex;align-items:center;justify-content:center;gap:16px;animation:fadeUp .7s ease .4s both;flex-wrap:wrap}
.hero-cta{display:inline-flex;align-items:center;gap:10px;padding:16px 36px;background:var(--text);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;transition:all .3s;box-shadow:0 4px 20px rgba(0,0,0,.12);font-family:inherit}
.hero-cta:hover{transform:translateY(-2px);box-shadow:0 8px 40px rgba(0,0,0,.18)}
.hero-cta-secondary{display:inline-flex;align-items:center;gap:8px;padding:16px 28px;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;transition:all .3s;font-family:inherit}
.hero-cta-secondary:hover{border-color:var(--accent);color:var(--accent);transform:translateY(-2px)}
.hero-cta-secondary i{color:var(--accent)}
.hero-sub{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:20px;font-size:13px;color:var(--muted);animation:fadeUp .7s ease .5s both}
.hero-sub span{display:flex;align-items:center;gap:6px}
.hero-sub i{color:var(--green);font-size:12px}

/* ===== DASHBOARD MOCKUP ===== */
.dash-section{max-width:1000px;margin:40px auto 0;padding:0 24px;animation:scaleIn .8s ease .5s both}
.dash{background:var(--card);border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:var(--shadow-lg);overflow:hidden;transition:all .5s}
.dash:hover{box-shadow:0 8px 60px rgba(124,58,237,.08);transform:translateY(-4px)}
.dash-topbar{display:flex;align-items:center;padding:12px 20px;background:#f8fafc;border-bottom:1px solid var(--border);gap:8px}
.dash-dot{width:12px;height:12px;border-radius:50%}
.dash-dot.red{background:#ef4444}.dash-dot.yellow{background:#f59e0b}.dash-dot.green{background:#10b981}
.dash-url{flex:1;margin-left:12px;padding:6px 14px;background:var(--card);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px}
.dash-url i{font-size:10px;color:var(--green)}
.dash-header{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--border-light)}
.dash-header .left{display:flex;align-items:center;gap:14px}
.dash-header .left .logo-small{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px}
.dash-header .left .logo-small .icon{width:28px;height:28px;background:linear-gradient(135deg,var(--accent),var(--pink));border-radius:7px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800}
.dash-header .left .tab{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s}
.dash-header .left .tab.active{background:var(--accent-light);color:var(--accent);font-weight:600}
.dash-header .right{display:flex;align-items:center;gap:12px}
.dash-header .right .search-box{display:flex;align-items:center;gap:8px;padding:7px 14px;border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--muted)}
.dash-header .right .avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--pink));display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700}
.dash-body{display:flex;min-height:340px}
.dash-sidebar{width:200px;border-right:1px solid var(--border-light);padding:16px 10px;display:flex;flex-direction:column;gap:2px}
.dash-sidebar a{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:10px;font-size:13px;color:var(--muted);text-decoration:none;transition:all .2s;font-weight:500}
.dash-sidebar a:hover{background:#f8fafc;color:var(--text)}
.dash-sidebar a.active{background:var(--accent-light);color:var(--accent);font-weight:600}
.dash-sidebar a i{width:16px;text-align:center;font-size:13px}
.dash-sidebar .divider{height:1px;background:var(--border-light);margin:8px 0}
.dash-content{flex:1;padding:20px 24px}
.dash-greeting{font-size:13px;color:var(--muted);margin-bottom:4px}
.dash-balance{font-size:32px;font-weight:800;margin-bottom:2px;font-family:'Space Grotesk',sans-serif}
.dash-balance-sub{font-size:12px;color:var(--accent);display:flex;align-items:center;gap:4px;margin-bottom:20px}
.dash-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px}
.dash-stat{padding:14px 16px;border-radius:14px;background:#f8fafc;border:1px solid var(--border-light);transition:all .3s}
.dash-stat:hover{border-color:var(--accent);background:var(--accent-light)}
.dash-stat .label{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.dash-stat .val{font-size:20px;font-weight:800;margin-top:4px;font-family:'Space Grotesk',sans-serif}
.dash-stat .change{font-size:11px;margin-top:4px;display:flex;align-items:center;gap:4px}
.dash-stat .change.up{color:var(--green)}.dash-stat .change.down{color:var(--red)}
.chart-area{position:relative;height:100px;margin-top:8px;border-radius:12px;background:linear-gradient(180deg,rgba(124,58,237,.05),transparent);overflow:hidden}
.chart-svg{width:100%;height:100%}
.chart-line{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.chart-fill{fill:url(#chartGrad);opacity:.3}
.chart-area .chart-label{position:absolute;top:8px;left:12px;font-size:12px;font-weight:600;color:var(--text)}
.chart-area .chart-sublabel{position:absolute;top:24px;left:12px;font-size:11px;color:var(--muted)}

/* ===== LOGO MARQUEE ===== */
.marquee-section{padding:60px 0;overflow:hidden;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);background:#f8fafc}
.marquee-label{text-align:center;font-size:13px;color:var(--muted);font-weight:500;margin-bottom:28px;letter-spacing:.5px;text-transform:uppercase}
.marquee-track{display:flex;width:max-content;animation:marquee 30s linear infinite}
.marquee-track:hover{animation-play-state:paused}
.marquee-item{display:flex;align-items:center;gap:10px;padding:0 40px;font-size:20px;font-weight:700;color:#cbd5e1;white-space:nowrap;transition:color .3s;cursor:default}
.marquee-item:hover{color:var(--text)}
.marquee-item i{font-size:24px}

/* ===== STATS COUNTER ===== */
.stats-section{max-width:1000px;margin:0 auto;padding:80px 24px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.stat-block{text-align:center;padding:32px 20px;border-radius:var(--radius);background:var(--card);border:1px solid var(--border-light);transition:all .3s}
.stat-block:hover{border-color:var(--accent);transform:translateY(-4px);box-shadow:var(--shadow)}
.stat-block .stat-number{font-family:'Space Grotesk',sans-serif;font-size:42px;font-weight:700;color:var(--accent);margin-bottom:4px}
.stat-block .stat-label{font-size:14px;color:var(--muted);font-weight:500}

/* ===== FEATURES ===== */
.features-section{max-width:1100px;margin:0 auto;padding:100px 24px}
.section-label{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;background:var(--accent-light);color:var(--accent);border-radius:100px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:20px}
.section-title{font-family:'Space Grotesk',sans-serif;font-size:clamp(32px,4vw,48px);font-weight:700;line-height:1.15;letter-spacing:-.02em;margin-bottom:16px}
.section-desc{font-size:17px;color:var(--muted);max-width:520px;line-height:1.7}
.features-header{text-align:center;margin-bottom:60px}
.features-header .section-desc{margin:0 auto}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.feat-card{position:relative;padding:32px;border-radius:var(--radius);border:1px solid var(--border-light);background:var(--card);transition:all .4s cubic-bezier(.16,1,.3,1);cursor:default;overflow:hidden}
.feat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--pink));opacity:0;transition:opacity .3s}
.feat-card:hover::before{opacity:1}
.feat-card:hover{border-color:var(--accent);transform:translateY(-6px);box-shadow:0 16px 48px rgba(124,58,237,.08)}
.feat-icon{width:52px;height:52px;border-radius:14px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--accent);margin-bottom:20px;transition:all .3s}
.feat-card:hover .feat-icon{background:var(--accent);color:#fff;transform:scale(1.05)}
.feat-card h3{font-size:18px;font-weight:700;margin-bottom:8px}
.feat-card p{font-size:14px;color:var(--muted);line-height:1.7}
.feat-card .feat-link{display:inline-flex;align-items:center;gap:6px;margin-top:16px;font-size:13px;font-weight:600;color:var(--accent);text-decoration:none;transition:gap .3s}
.feat-card:hover .feat-link{gap:10px}

/* ===== FEATURE BENTO ===== */
.bento-section{max-width:1100px;margin:0 auto;padding:0 24px 100px}
.bento-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:24px}
.bento-card{border-radius:var(--radius-lg);border:1px solid var(--border-light);background:var(--card);overflow:hidden;transition:all .4s;position:relative}
.bento-card:hover{border-color:var(--accent);box-shadow:var(--shadow-lg)}
.bento-card.large{grid-row:span 2}
.bento-content{padding:32px}
.bento-content .label{font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
.bento-content h3{font-size:24px;font-weight:700;margin-bottom:8px;font-family:'Space Grotesk',sans-serif}
.bento-content p{font-size:14px;color:var(--muted);line-height:1.7}
.bento-visual{padding:0 32px 32px;position:relative}
.bento-mockup{background:#f8fafc;border:1px solid var(--border-light);border-radius:14px;padding:20px;min-height:200px}
.bento-card.dark{background:var(--text);border-color:#1e293b}
.bento-card.dark .bento-content h3{color:#fff}
.bento-card.dark .bento-content p{color:#94a3b8}
.bento-card.dark .bento-content .label{color:var(--cyan)}
.bento-card.dark .bento-mockup{background:#1e293b;border-color:#334155}

/* Automation flow mockup */
.flow-nodes{display:flex;flex-direction:column;gap:12px}
.flow-node{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--card);border:1px solid var(--border-light);border-radius:10px;font-size:13px;font-weight:500;transition:all .3s}
.flow-node i{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff}
.flow-node .trigger{background:var(--accent)}
.flow-node .action{background:var(--blue)}
.flow-node .check{background:var(--green)}
.flow-connector{width:2px;height:16px;background:var(--border);margin-left:24px}

/* Deal pipeline mockup */
.pipeline{display:flex;gap:12px}
.pipeline-col{flex:1;background:#f8fafc;border-radius:10px;padding:10px}
.pipeline-col .col-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:8px;padding:0 4px}
.pipeline-deal{background:var(--card);border:1px solid var(--border-light);border-radius:8px;padding:10px;margin-bottom:6px;font-size:12px}
.pipeline-deal .deal-name{font-weight:600;margin-bottom:2px}
.pipeline-deal .deal-amount{color:var(--accent);font-weight:600}

/* ===== HOW IT WORKS ===== */
.how-section{background:#f8fafc;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);padding:100px 24px}
.how-inner{max-width:1100px;margin:0 auto}
.how-header{text-align:center;margin-bottom:64px}
.how-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:48px;position:relative}
.how-steps::before{content:'';position:absolute;top:40px;left:15%;right:15%;height:2px;background:linear-gradient(90deg,var(--accent-light),var(--accent),var(--accent-light));z-index:0}
.how-step{text-align:center;position:relative;z-index:1}
.step-number{width:80px;height:80px;border-radius:50%;background:var(--card);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;color:var(--accent);margin:0 auto 24px;transition:all .3s;box-shadow:0 4px 20px var(--accent-glow)}
.how-step:hover .step-number{background:var(--accent);color:#fff;transform:scale(1.1)}
.how-step h3{font-size:18px;font-weight:700;margin-bottom:8px}
.how-step p{font-size:14px;color:var(--muted);line-height:1.7;max-width:280px;margin:0 auto}

/* ===== PRICING ===== */
.pricing-section{max-width:1100px;margin:0 auto;padding:100px 24px}
.pricing-header{text-align:center;margin-bottom:16px}
.pricing-toggle{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:56px}
.pricing-toggle span{font-size:14px;font-weight:500;color:var(--muted);transition:color .2s}
.pricing-toggle span.active{color:var(--text);font-weight:600}
.toggle-switch{position:relative;width:52px;height:28px;background:var(--border);border-radius:100px;cursor:pointer;transition:background .3s}
.toggle-switch.active{background:var(--accent)}
.toggle-switch::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;background:#fff;border-radius:50%;transition:transform .3s;box-shadow:0 1px 4px rgba(0,0,0,.1)}
.toggle-switch.active::after{transform:translateX(24px)}
.save-badge{padding:4px 10px;background:var(--green);color:#fff;border-radius:100px;font-size:11px;font-weight:600}
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.price-card{padding:36px;border-radius:var(--radius-lg);border:1px solid var(--border-light);background:var(--card);transition:all .4s;position:relative}
.price-card:hover{transform:translateY(-6px);box-shadow:var(--shadow-lg)}
.price-card.popular{border-color:var(--accent);background:var(--text);color:#fff;transform:scale(1.04)}
.price-card.popular:hover{transform:scale(1.04) translateY(-6px)}
.price-card.popular .price-name{color:#fff}
.price-card.popular .price-desc{color:#94a3b8}
.price-card.popular .price-amount{color:#fff}
.price-card.popular .price-period{color:#94a3b8}
.price-card.popular .price-feat{color:#cbd5e1}
.price-card.popular .price-feat i{color:var(--cyan)}
.price-card.popular .price-btn{background:#fff;color:var(--text)}
.price-card.popular .price-btn:hover{background:#f1f5f9}
.popular-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);padding:6px 18px;background:linear-gradient(135deg,var(--accent),var(--pink));color:#fff;border-radius:100px;font-size:11px;font-weight:700;white-space:nowrap}
.price-name{font-size:18px;font-weight:700;margin-bottom:4px}
.price-desc{font-size:13px;color:var(--muted);margin-bottom:24px}
.price-amount{font-family:'Space Grotesk',sans-serif;font-size:48px;font-weight:700;line-height:1}
.price-period{font-size:14px;color:var(--muted);font-weight:400;margin-bottom:28px;display:block}
.price-btn{display:block;width:100%;padding:14px;background:var(--text);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all .3s;margin-bottom:28px;font-family:inherit}
.price-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.12)}
.price-divider{height:1px;background:var(--border-light);margin-bottom:24px}
.price-card.popular .price-divider{background:#334155}
.price-features{list-style:none;display:flex;flex-direction:column;gap:12px}
.price-feat{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted)}
.price-feat i{color:var(--accent);font-size:14px;width:18px;text-align:center}

/* ===== TESTIMONIALS ===== */
.testimonials-section{background:#f8fafc;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);padding:100px 24px}
.testimonials-inner{max-width:1100px;margin:0 auto}
.testimonials-header{text-align:center;margin-bottom:60px}
.testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.testimonial-card{padding:32px;border-radius:var(--radius);background:var(--card);border:1px solid var(--border-light);transition:all .4s}
.testimonial-card:hover{border-color:var(--accent);transform:translateY(-4px);box-shadow:var(--shadow)}
.testimonial-stars{display:flex;gap:4px;margin-bottom:16px;color:var(--amber);font-size:14px}
.testimonial-text{font-size:15px;line-height:1.7;color:var(--text);margin-bottom:24px;font-style:italic}
.testimonial-author{display:flex;align-items:center;gap:12px}
.testimonial-avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff}
.testimonial-info .name{font-size:14px;font-weight:600}
.testimonial-info .role{font-size:12px;color:var(--muted)}

/* ===== INTEGRATIONS ===== */
.integrations-section{max-width:1100px;margin:0 auto;padding:100px 24px}
.integrations-header{text-align:center;margin-bottom:60px}
.integrations-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px;margin-bottom:40px}
.integration-card{aspect-ratio:1;border-radius:var(--radius);border:1px solid var(--border-light);background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;transition:all .3s;cursor:default}
.integration-card:hover{border-color:var(--accent);transform:translateY(-4px);box-shadow:var(--shadow)}
.integration-card i{font-size:28px}
.integration-card span{font-size:12px;font-weight:600;color:var(--muted)}
.integrations-cta{text-align:center;font-size:14px;color:var(--muted)}
.integrations-cta a{color:var(--accent);font-weight:600;text-decoration:none}
.integrations-cta a:hover{text-decoration:underline}

/* ===== FAQ ===== */
.faq-section{background:#f8fafc;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);padding:100px 24px}
.faq-inner{max-width:700px;margin:0 auto}
.faq-header{text-align:center;margin-bottom:48px}
.faq-item{border-bottom:1px solid var(--border-light);overflow:hidden}
.faq-question{display:flex;align-items:center;justify-content:space-between;padding:20px 0;cursor:pointer;font-size:15px;font-weight:600;transition:color .2s;gap:16px}
.faq-question:hover{color:var(--accent)}
.faq-question i{font-size:14px;color:var(--muted);transition:transform .3s}
.faq-item.open .faq-question i{transform:rotate(180deg);color:var(--accent)}
.faq-answer{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.16,1,.3,1),padding .4s}
.faq-answer p{font-size:14px;color:var(--muted);line-height:1.7;padding-bottom:20px}
.faq-item.open .faq-answer{max-height:300px}

/* ===== CTA SECTION ===== */
.cta-section{max-width:1100px;margin:0 auto;padding:0 24px 100px}
.cta-card{position:relative;background:var(--text);border-radius:var(--radius-lg);padding:80px 60px;text-align:center;overflow:hidden}
.cta-card::before{content:'';position:absolute;top:-100px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(124,58,237,.2),transparent);pointer-events:none}
.cta-card::after{content:'';position:absolute;bottom:-100px;left:-100px;width:300px;height:300px;background:radial-gradient(circle,rgba(236,72,153,.15),transparent);pointer-events:none}
.cta-card h2{font-family:'Space Grotesk',sans-serif;font-size:clamp(32px,4vw,48px);font-weight:700;color:#fff;margin-bottom:16px;position:relative;z-index:1}
.cta-card p{font-size:17px;color:#94a3b8;margin-bottom:36px;max-width:480px;margin-left:auto;margin-right:auto;position:relative;z-index:1}
.cta-card-btns{display:flex;align-items:center;justify-content:center;gap:16px;position:relative;z-index:1;flex-wrap:wrap}
.cta-white{padding:16px 36px;background:#fff;color:var(--text);border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;transition:all .3s;font-family:inherit}
.cta-white:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(255,255,255,.2)}
.cta-outline{padding:16px 36px;background:none;color:#fff;border:1px solid #475569;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;transition:all .3s;font-family:inherit}
.cta-outline:hover{border-color:#fff;transform:translateY(-2px)}
.cta-note{margin-top:20px;font-size:13px;color:#64748b;position:relative;z-index:1}
.cta-note i{color:var(--green);margin-right:4px}

/* ===== FOOTER ===== */
footer{border-top:1px solid var(--border-light);background:#f8fafc}
.footer-inner{max-width:1200px;margin:0 auto;padding:64px 24px 32px}
.footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:40px;margin-bottom:48px}
.footer-brand .logo{margin-bottom:16px}
.footer-brand p{font-size:14px;color:var(--muted);line-height:1.7;max-width:280px;margin-bottom:20px}
.footer-socials{display:flex;gap:10px}
.footer-socials a{width:36px;height:36px;border-radius:10px;background:var(--card);border:1px solid var(--border-light);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;text-decoration:none;transition:all .2s}
.footer-socials a:hover{color:var(--accent);border-color:var(--accent);transform:translateY(-2px)}
.footer-col h4{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text);margin-bottom:16px}
.footer-col a{display:block;font-size:13px;color:var(--muted);text-decoration:none;padding:4px 0;transition:color .2s}
.footer-col a:hover{color:var(--accent)}
.footer-bottom{display:flex;align-items:center;justify-content:space-between;padding-top:24px;border-top:1px solid var(--border-light);font-size:12px;color:var(--muted)}
.footer-bottom-links{display:flex;gap:20px}
.footer-bottom-links a{color:var(--muted);text-decoration:none;transition:color .2s}
.footer-bottom-links a:hover{color:var(--text)}

/* ===== RESPONSIVE ===== */
@media(max-width:1024px){
  .feat-grid{grid-template-columns:repeat(2,1fr)}
  .pricing-grid{grid-template-columns:repeat(2,1fr)}
  .pricing-grid .price-card:last-child{grid-column:span 2;max-width:400px;margin:0 auto}
  .bento-grid{grid-template-columns:1fr}
  .bento-card.large{grid-row:auto}
  .footer-top{grid-template-columns:1fr 1fr 1fr}
  .footer-brand{grid-column:span 3;margin-bottom:16px}
  .integrations-grid{grid-template-columns:repeat(4,1fr)}
}
@media(max-width:768px){
  .nav-links{display:none}
  .mobile-toggle{display:block}
  .hero{padding:120px 20px 40px}
  .hero h1{font-size:36px}
  .hero-cta-row{flex-direction:column}
  .hero-sub{flex-direction:column;gap:8px}
  .dash-sidebar{display:none}
  .dash-stats{grid-template-columns:1fr}
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .feat-grid{grid-template-columns:1fr}
  .how-steps{grid-template-columns:1fr;gap:32px}
  .how-steps::before{display:none}
  .pricing-grid{grid-template-columns:1fr}
  .pricing-grid .price-card:last-child{grid-column:auto;max-width:none}
  .price-card.popular{transform:none}
  .price-card.popular:hover{transform:translateY(-6px)}
  .testimonials-grid{grid-template-columns:1fr}
  .integrations-grid{grid-template-columns:repeat(3,1fr)}
  .footer-top{grid-template-columns:1fr 1fr}
  .footer-brand{grid-column:span 2}
  .cta-card{padding:48px 24px}
  .cta-card-btns{flex-direction:column}
  .footer-bottom{flex-direction:column;gap:12px;text-align:center}
  .pipeline{flex-direction:column}
}
@media(max-width:480px){
  .stats-grid{grid-template-columns:1fr}
  .integrations-grid{grid-template-columns:repeat(2,1fr)}
  .footer-top{grid-template-columns:1fr}
  .footer-brand{grid-column:auto}
}

/* ═══ MAGIC UI — Border Beam ═══ */
@property --beam-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
.border-beam{position:relative;overflow:hidden}.border-beam::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:2px;background:conic-gradient(from var(--beam-angle),transparent 60%,var(--accent) 80%,transparent 100%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:beam-spin 4s linear infinite;pointer-events:none;z-index:2}@keyframes beam-spin{to{--beam-angle:360deg}}
/* ═══ MAGIC UI — Shimmer CTA ═══ */
.shimmer-btn{position:relative;overflow:hidden;isolation:isolate}.shimmer-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);animation:shimmer-sweep 3s ease-in-out infinite;z-index:1}@keyframes shimmer-sweep{0%,100%{left:-100%}50%{left:150%}}
/* ═══ MAGIC UI — Dot Pattern ═══ */
.magic-dots{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(124,58,237,.08) 1px,transparent 1px);background-size:24px 24px;pointer-events:none;mask-image:radial-gradient(ellipse at center,black 30%,transparent 75%);z-index:0}
/* ═══ MAGIC UI — Grid Lines ═══ */
.magic-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(124,58,237,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.04) 1px,transparent 1px);background-size:48px 48px;pointer-events:none;mask-image:radial-gradient(ellipse at center,black 20%,transparent 70%);z-index:0}
/* ═══ MAGIC UI — Meteors ═══ */
.magic-meteors{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.magic-meteor{position:absolute;width:2px;height:80px;background:linear-gradient(to bottom,rgba(124,58,237,.6),transparent);transform:rotate(-35deg);animation:meteor-fall linear infinite;opacity:0}
.magic-meteor::before{content:'';position:absolute;top:0;left:-1px;width:4px;height:4px;border-radius:50%;background:rgba(167,139,250,.9);box-shadow:0 0 8px 2px rgba(167,139,250,.3)}
@keyframes meteor-fall{0%{transform:translate(0,0) rotate(-35deg);opacity:0}5%{opacity:1}95%{opacity:.3}100%{transform:translate(-400px,800px) rotate(-35deg);opacity:0}}
/* ═══ MAGIC UI — Glow Card ═══ */
.glow-card{position:relative;overflow:hidden;z-index:1}.glow-card .glow-effect{position:absolute;width:400px;height:400px;background:radial-gradient(circle,rgba(124,58,237,.1),transparent 70%);border-radius:50%;opacity:0;transition:opacity .5s;pointer-events:none;transform:translate(-50%,-50%);z-index:0}.glow-card:hover .glow-effect{opacity:1}
/* ═══ MAGIC UI — Blur Fade In ═══ */
.magic-reveal{opacity:0;filter:blur(6px);transform:translateY(20px);transition:all .8s cubic-bezier(.22,1,.36,1)}.magic-reveal.visible{opacity:1;filter:blur(0);transform:translateY(0)}
.magic-reveal-d1{transition-delay:.1s}.magic-reveal-d2{transition-delay:.2s}.magic-reveal-d3{transition-delay:.3s}.magic-reveal-d4{transition-delay:.4s}
/* ═══ MAGIC UI — Shine Border ═══ */
.shine-border{position:relative;overflow:hidden;z-index:1}.shine-border::before{content:'';position:absolute;inset:-3px;border-radius:inherit;background:conic-gradient(from 0deg,transparent,#7c3aed,#ec4899,#3b82f6,transparent);animation:shine-rotate 6s linear infinite;z-index:-1}.shine-border::after{content:'';position:absolute;inset:2px;border-radius:inherit;background:inherit;z-index:-1}@keyframes shine-rotate{to{transform:rotate(360deg)}}
/* ═══ MAGIC UI — Magic Marquee ═══ */
.magic-marquee{display:flex;overflow:hidden;gap:48px;width:100%}.magic-marquee-track{display:flex;gap:48px;animation:magic-marquee-scroll 30s linear infinite;flex-shrink:0}.magic-marquee:hover .magic-marquee-track{animation-play-state:paused}@keyframes magic-marquee-scroll{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}
/* ═══ MAGIC UI — Ripple Circles ═══ */
.magic-ripple{position:absolute;left:50%;top:50%;pointer-events:none;z-index:0}.magic-ripple span{position:absolute;border:1px solid rgba(124,58,237,.08);border-radius:50%;animation:ripple-out 6s linear infinite}@keyframes ripple-out{0%{width:0;height:0;opacity:.6;top:0;left:0}100%{width:800px;height:800px;opacity:0;top:-400px;left:-400px}}
/* ═══ MAGIC UI — Pulse Dot ═══ */
.magic-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 0 rgba(16,185,129,.4);animation:magic-pulse 2s infinite;display:inline-block}.magic-dot-accent{background:var(--accent);box-shadow:0 0 0 0 rgba(124,58,237,.4)}@keyframes magic-pulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.4)}70%{box-shadow:0 0 0 12px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}
/* ═══ MAGIC UI — Number Ticker ═══ */
@keyframes tick-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
.tick-num{display:inline-block;animation:tick-up .6s cubic-bezier(.22,1,.36,1) forwards}
</style>
</head>
<body>

<!-- ===== NAVIGATION ===== -->
<div class="nav-wrapper" id="navWrapper">
  <nav>
    <a href="#" class="logo">
      <div class="logo-icon">S</div>
      Salix
    </a>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#how">How It Works</a>
      <a href="#pricing">Pricing</a>
      <a href="#testimonials">Testimonials</a>
      <a href="#faq">FAQ</a>
    </div>
    <div class="nav-actions">
      <button class="btn-ghost">Log In</button>
      <button class="btn-primary shimmer-btn">Start Free Trial</button>
    </div>
    <button class="mobile-toggle" aria-label="Toggle menu">
      <i class="fas fa-bars"></i>
    </button>
  </nav>
</div>

<!-- ===== HERO ===== -->
<section class="hero">
  <div class="hero-bg"></div>
  <div class="magic-dots"></div>
  <div class="magic-meteors">
    <div class="magic-meteor" style="top:-10%;left:20%;height:60px;animation-duration:4s;animation-delay:0s"></div>
    <div class="magic-meteor" style="top:-10%;left:50%;height:80px;animation-duration:5s;animation-delay:1.5s"></div>
    <div class="magic-meteor" style="top:-10%;left:75%;height:50px;animation-duration:3.5s;animation-delay:3s"></div>
    <div class="magic-meteor" style="top:-10%;left:35%;height:70px;animation-duration:6s;animation-delay:4.5s"></div>
    <div class="magic-meteor" style="top:-10%;left:85%;height:55px;animation-duration:4.5s;animation-delay:2s"></div>
  </div>
  <div class="hero-orb hero-orb-1"></div>
  <div class="hero-orb hero-orb-2"></div>
  <div class="hero-orb hero-orb-3"></div>
  <div class="hero-content">
    <div class="hero-badge">
      <span class="dot"></span>
      Join 2,000+ scaling businesses
    </div>
    <h1>The Smartest Way to<br><span class="gradient-text">Maximize Sales ROI</span></h1>
    <p>Streamline your entire sales pipeline with AI-powered automation, real-time analytics, and intelligent deal tracking that closes more deals faster.</p>
    <div class="hero-cta-row">
      <button class="hero-cta shimmer-btn">Get 14 Days Free Trial <i class="fas fa-arrow-right"></i></button>
      <button class="hero-cta-secondary"><i class="fas fa-play-circle"></i> Watch Demo</button>
    </div>
    <div class="hero-sub">
      <span><i class="fas fa-check-circle"></i> No credit card required</span>
      <span><i class="fas fa-check-circle"></i> Cancel anytime</span>
      <span><i class="fas fa-check-circle"></i> 24/7 support</span>
    </div>
  </div>
</section>

<!-- ===== DASHBOARD MOCKUP ===== -->
<div class="dash-section">
  <div class="dash">
    <div class="dash-topbar">
      <div class="dash-dot red"></div>
      <div class="dash-dot yellow"></div>
      <div class="dash-dot green"></div>
      <div class="dash-url">
        <i class="fas fa-lock"></i>
        app.salix.com/dashboard
      </div>
    </div>
    <div class="dash-header">
      <div class="left">
        <div class="logo-small">
          <div class="icon">S</div>
          Salix
        </div>
        <div class="tab active">Dashboard</div>
        <div class="tab">Deals</div>
        <div class="tab">Reports</div>
      </div>
      <div class="right">
        <div class="search-box"><i class="fas fa-search"></i> Search...</div>
        <i class="fas fa-bell" style="color:var(--muted);font-size:14px"></i>
        <div class="avatar">MJ</div>
      </div>
    </div>
    <div class="dash-body">
      <div class="dash-sidebar">
        <a class="active"><i class="fas fa-th-large"></i> Dashboard</a>
        <a><i class="fas fa-handshake"></i> Deals</a>
        <a><i class="fas fa-users"></i> Contacts</a>
        <a><i class="fas fa-chart-bar"></i> Analytics</a>
        <a><i class="fas fa-envelope"></i> Emails</a>
        <div class="divider"></div>
        <a><i class="fas fa-robot"></i> Automations</a>
        <a><i class="fas fa-plug"></i> Integrations</a>
        <a><i class="fas fa-cog"></i> Settings</a>
      </div>
      <div class="dash-content">
        <div class="dash-greeting">Good morning, Martin</div>
        <div class="dash-balance">$58,236.09</div>
        <div class="dash-balance-sub"><i class="fas fa-arrow-up"></i> +12.5% vs last month</div>
        <div class="dash-stats">
          <div class="dash-stat">
            <div class="label">Revenue</div>
            <div class="val">$55,558</div>
            <div class="change up"><i class="fas fa-arrow-up"></i> +6.2%</div>
          </div>
          <div class="dash-stat">
            <div class="label">Customers</div>
            <div class="val">7,368</div>
            <div class="change up"><i class="fas fa-arrow-up"></i> +2.4%</div>
          </div>
          <div class="dash-stat">
            <div class="label">Deals Won</div>
            <div class="val">284</div>
            <div class="change up"><i class="fas fa-arrow-up"></i> +8.1%</div>
          </div>
        </div>
        <div class="chart-area">
          <div class="chart-label">Sales Pipeline</div>
          <div class="chart-sublabel">Last 30 days</div>
          <svg class="chart-svg" viewBox="0 0 400 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path class="chart-fill" d="M0,80 Q30,60 60,65 T120,45 T180,55 T240,30 T300,40 T360,20 L400,15 L400,100 L0,100Z"/>
            <path class="chart-line" d="M0,80 Q30,60 60,65 T120,45 T180,55 T240,30 T300,40 T360,20 L400,15"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ===== LOGO MARQUEE ===== -->
<section class="marquee-section reveal">
  <div class="marquee-label">Trusted by 17,000+ founders &amp; business owners</div>
  <div style="overflow:hidden">
    <div class="marquee-track">
      <div class="marquee-item"><i class="fab fa-google"></i> Google</div>
      <div class="marquee-item"><i class="fab fa-spotify"></i> Spotify</div>
      <div class="marquee-item"><i class="fab fa-stripe-s"></i> Stripe</div>
      <div class="marquee-item"><i class="fab fa-figma"></i> Figma</div>
      <div class="marquee-item"><i class="fab fa-slack"></i> Slack</div>
      <div class="marquee-item"><i class="fab fa-shopify"></i> Shopify</div>
      <div class="marquee-item"><i class="fab fa-airbnb"></i> Airbnb</div>
      <div class="marquee-item"><i class="fab fa-twitch"></i> Twitch</div>
      <div class="marquee-item"><i class="fab fa-google"></i> Google</div>
      <div class="marquee-item"><i class="fab fa-spotify"></i> Spotify</div>
      <div class="marquee-item"><i class="fab fa-stripe-s"></i> Stripe</div>
      <div class="marquee-item"><i class="fab fa-figma"></i> Figma</div>
      <div class="marquee-item"><i class="fab fa-slack"></i> Slack</div>
      <div class="marquee-item"><i class="fab fa-shopify"></i> Shopify</div>
      <div class="marquee-item"><i class="fab fa-airbnb"></i> Airbnb</div>
      <div class="marquee-item"><i class="fab fa-twitch"></i> Twitch</div>
    </div>
  </div>
</section>

<!-- ===== STATS COUNTER ===== -->
<section class="stats-section reveal">
  <div class="stats-grid">
    <div class="stat-block">
      <div class="stat-number" data-target="17000">0</div>
      <div class="stat-label">Active Users</div>
    </div>
    <div class="stat-block">
      <div class="stat-number" data-target="250">0</div>
      <div class="stat-label">Enterprise Clients</div>
    </div>
    <div class="stat-block">
      <div class="stat-number" data-target="99">0</div>
      <div class="stat-label">Uptime SLA %</div>
    </div>
    <div class="stat-block">
      <div class="stat-number" data-target="4">0</div>
      <div class="stat-label">Average Rating</div>
    </div>
  </div>
</section>

<!-- ===== FEATURES ===== -->
<section class="features-section" id="features">
  <div class="features-header reveal">
    <div class="section-label"><i class="fas fa-bolt"></i> Power Pack</div>
    <div class="section-title">Everything you need to<br>close more deals</div>
    <div class="section-desc">Salix simplifies the complexity of sales management with powerful tools built for modern teams.</div>
  </div>
  <div class="feat-grid">
    <div class="feat-card reveal" style="transition-delay:.05s">
      <div class="feat-icon"><i class="fas fa-chart-line"></i></div>
      <h3>Real-Time Analytics</h3>
      <p>Track every metric that matters with live dashboards, custom reports, and intelligent insights that help you make data-driven decisions.</p>
      <a href="#" class="feat-link">Learn more <i class="fas fa-arrow-right"></i></a>
    </div>
    <div class="feat-card reveal" style="transition-delay:.1s">
      <div class="feat-icon"><i class="fas fa-robot"></i></div>
      <h3>AI Automation</h3>
      <p>Let AI handle follow-ups, reminders, lead scoring, and data entry while your team focuses on building relationships and closing deals.</p>
      <a href="#" class="feat-link">Learn more <i class="fas fa-arrow-right"></i></a>
    </div>
    <div class="feat-card reveal" style="transition-delay:.15s">
      <div class="feat-icon"><i class="fas fa-handshake"></i></div>
      <h3>Deal Pipeline</h3>
      <p>Visualize your entire pipeline with drag-and-drop stages, probability scoring, and automated progression to never miss an opportunity.</p>
      <a href="#" class="feat-link">Learn more <i class="fas fa-arrow-right"></i></a>
    </div>
    <div class="feat-card reveal" style="transition-delay:.2s">
      <div class="feat-icon"><i class="fas fa-users"></i></div>
      <h3>Team Collaboration</h3>
      <p>Share notes, assign tasks, and communicate seamlessly within deals. Keep everyone aligned with shared workspaces and activity feeds.</p>
      <a href="#" class="feat-link">Learn more <i class="fas fa-arrow-right"></i></a>
    </div>
    <div class="feat-card reveal" style="transition-delay:.25s">
      <div class="feat-icon"><i class="fas fa-envelope-open-text"></i></div>
      <h3>Email Sequences</h3>
      <p>Create multi-step email campaigns with smart triggers, A/B testing, and detailed analytics to nurture leads at scale automatically.</p>
      <a href="#" class="feat-link">Learn more <i class="fas fa-arrow-right"></i></a>
    </div>
    <div class="feat-card reveal" style="transition-delay:.3s">
      <div class="feat-icon"><i class="fas fa-shield-alt"></i></div>
      <h3>Enterprise Security</h3>
      <p>SOC 2 compliant with end-to-end encryption, role-based access controls, SSO, and audit logs to keep your data safe and secure.</p>
      <a href="#" class="feat-link">Learn more <i class="fas fa-arrow-right"></i></a>
    </div>
  </div>
</section>

<!-- ===== FEATURE BENTO ===== -->
<section class="bento-section">
  <div class="bento-grid">
    <div class="bento-card large reveal-left">
      <div class="bento-content">
        <div class="label">Automation Engine</div>
        <h3>Put your sales on autopilot</h3>
        <p>Build powerful automation workflows with our visual editor. Trigger actions based on deal stages, email opens, and custom events.</p>
      </div>
      <div class="bento-visual">
        <div class="bento-mockup">
          <div class="flow-nodes">
            <div class="flow-node"><i class="trigger fas fa-bolt"></i> New Lead Created</div>
            <div class="flow-connector"></div>
            <div class="flow-node"><i class="action fas fa-envelope"></i> Send Welcome Email</div>
            <div class="flow-connector"></div>
            <div class="flow-node"><i class="check fas fa-clock"></i> Wait 2 Days</div>
            <div class="flow-connector"></div>
            <div class="flow-node"><i class="action fas fa-phone"></i> Schedule Follow-up Call</div>
            <div class="flow-connector"></div>
            <div class="flow-node"><i class="check fas fa-check"></i> Update Deal Stage</div>
          </div>
        </div>
      </div>
    </div>
    <div class="bento-card dark reveal-right" style="transition-delay:.1s">
      <div class="bento-content">
        <div class="label">Deal Pipeline</div>
        <h3>Track every deal</h3>
        <p>Visual pipeline with drag-and-drop stages, probability scoring, and real-time updates.</p>
      </div>
      <div class="bento-visual">
        <div class="bento-mockup">
          <div class="pipeline">
            <div class="pipeline-col">
              <div class="col-title">Lead</div>
              <div class="pipeline-deal"><div class="deal-name">Acme Corp</div><div class="deal-amount">$24,000</div></div>
              <div class="pipeline-deal"><div class="deal-name">TechFlow</div><div class="deal-amount">$18,500</div></div>
            </div>
            <div class="pipeline-col">
              <div class="col-title">Proposal</div>
              <div class="pipeline-deal"><div class="deal-name">Innovatch</div><div class="deal-amount">$79,000</div></div>
            </div>
            <div class="pipeline-col">
              <div class="col-title">Closed</div>
              <div class="pipeline-deal"><div class="deal-name">Centrix</div><div class="deal-amount">$58,500</div></div>
              <div class="pipeline-deal"><div class="deal-name">Nuvolane</div><div class="deal-amount">$43,200</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="bento-card reveal-right" style="transition-delay:.2s">
      <div class="bento-content">
        <div class="label">Reporting</div>
        <h3>Insights that matter</h3>
        <p>Custom dashboards with 50+ widgets, scheduled reports, and team performance breakdowns.</p>
      </div>
      <div class="bento-visual">
        <div class="bento-mockup" style="display:flex;align-items:flex-end;gap:6px;height:120px;padding-bottom:10px">
          <div style="flex:1;background:var(--accent-light);border-radius:4px;height:40%;transition:height .3s"></div>
          <div style="flex:1;background:var(--accent-light);border-radius:4px;height:60%"></div>
          <div style="flex:1;background:var(--accent);border-radius:4px;height:85%"></div>
          <div style="flex:1;background:var(--accent-light);border-radius:4px;height:55%"></div>
          <div style="flex:1;background:var(--accent-light);border-radius:4px;height:70%"></div>
          <div style="flex:1;background:var(--accent-light);border-radius:4px;height:45%"></div>
          <div style="flex:1;background:var(--accent-light);border-radius:4px;height:75%"></div>
          <div style="flex:1;background:var(--accent);border-radius:4px;height:90%"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== HOW IT WORKS ===== -->
<section class="how-section" id="how">
  <div class="how-inner">
    <div class="how-header reveal">
      <div class="section-label"><i class="fas fa-route"></i> How It Works</div>
      <div class="section-title">Get started in 3 simple steps</div>
      <div class="section-desc" style="margin:12px auto 0;text-align:center">Go from sign-up to closing deals in minutes, not weeks.</div>
    </div>
    <div class="how-steps">
      <div class="how-step reveal" style="transition-delay:.1s">
        <div class="step-number">1</div>
        <h3>Connect Your Tools</h3>
        <p>Integrate with your email, calendar, and existing CRM in one click. Import contacts and deal history automatically.</p>
      </div>
      <div class="how-step reveal" style="transition-delay:.2s">
        <div class="step-number">2</div>
        <h3>Setup Automations</h3>
        <p>Build custom workflows with our visual editor. Automate follow-ups, lead scoring, and pipeline management effortlessly.</p>
      </div>
      <div class="how-step reveal" style="transition-delay:.3s">
        <div class="step-number">3</div>
        <h3>Close More Deals</h3>
        <p>Watch your pipeline grow with AI-powered insights, real-time analytics, and a team that spends less time on admin.</p>
      </div>
    </div>
  </div>
</section>

<!-- ===== PRICING ===== -->
<section class="pricing-section" id="pricing">
  <div class="pricing-header reveal">
    <div class="section-label"><i class="fas fa-tag"></i> Pricing</div>
    <div class="section-title">Simple, transparent pricing</div>
    <div class="section-desc" style="margin:12px auto 0;text-align:center">No hidden fees. No surprises. Scale as you grow.</div>
  </div>
  <div class="pricing-toggle reveal">
    <span class="active" id="monthlyLabel">Monthly</span>
    <div class="toggle-switch" id="pricingToggle"></div>
    <span id="annualLabel">Annual</span>
    <span class="save-badge">Save 20%</span>
  </div>
  <div class="pricing-grid">
    <div class="price-card reveal" style="transition-delay:.05s">
      <div class="price-name">Starter</div>
      <div class="price-desc">For individuals and small teams getting started</div>
      <div class="price-amount" data-monthly="29" data-annual="23">$29</div>
      <span class="price-period">per user / month</span>
      <button class="price-btn">Start Free Trial</button>
      <div class="price-divider"></div>
      <ul class="price-features">
        <li class="price-feat"><i class="fas fa-check"></i> Up to 5 team members</li>
        <li class="price-feat"><i class="fas fa-check"></i> 1,000 contacts</li>
        <li class="price-feat"><i class="fas fa-check"></i> Basic pipeline</li>
        <li class="price-feat"><i class="fas fa-check"></i> Email integration</li>
        <li class="price-feat"><i class="fas fa-check"></i> Standard reports</li>
        <li class="price-feat"><i class="fas fa-check"></i> Email support</li>
      </ul>
    </div>
    <div class="price-card popular border-beam reveal" style="transition-delay:.1s">
      <div class="popular-badge">Most Popular</div>
      <div class="price-name">Professional</div>
      <div class="price-desc">For growing teams that need more power</div>
      <div class="price-amount" data-monthly="79" data-annual="63">$79</div>
      <span class="price-period">per user / month</span>
      <button class="price-btn">Start Free Trial</button>
      <div class="price-divider"></div>
      <ul class="price-features">
        <li class="price-feat"><i class="fas fa-check"></i> Unlimited team members</li>
        <li class="price-feat"><i class="fas fa-check"></i> 50,000 contacts</li>
        <li class="price-feat"><i class="fas fa-check"></i> Advanced pipeline</li>
        <li class="price-feat"><i class="fas fa-check"></i> AI automation</li>
        <li class="price-feat"><i class="fas fa-check"></i> Custom reports</li>
        <li class="price-feat"><i class="fas fa-check"></i> Email sequences</li>
        <li class="price-feat"><i class="fas fa-check"></i> Priority support</li>
        <li class="price-feat"><i class="fas fa-check"></i> API access</li>
      </ul>
    </div>
    <div class="price-card reveal" style="transition-delay:.15s">
      <div class="price-name">Enterprise</div>
      <div class="price-desc">For large organizations with custom needs</div>
      <div class="price-amount">Custom</div>
      <span class="price-period">tailored to your team</span>
      <button class="price-btn">Contact Sales</button>
      <div class="price-divider"></div>
      <ul class="price-features">
        <li class="price-feat"><i class="fas fa-check"></i> Everything in Pro</li>
        <li class="price-feat"><i class="fas fa-check"></i> Unlimited contacts</li>
        <li class="price-feat"><i class="fas fa-check"></i> Custom integrations</li>
        <li class="price-feat"><i class="fas fa-check"></i> SSO / SAML</li>
        <li class="price-feat"><i class="fas fa-check"></i> Dedicated CSM</li>
        <li class="price-feat"><i class="fas fa-check"></i> SLA guarantee</li>
        <li class="price-feat"><i class="fas fa-check"></i> On-premise option</li>
      </ul>
    </div>
  </div>
</section>

<!-- ===== TESTIMONIALS ===== -->
<section class="testimonials-section" id="testimonials">
  <div class="testimonials-inner">
    <div class="testimonials-header reveal">
      <div class="section-label"><i class="fas fa-heart"></i> Wall of Love</div>
      <div class="section-title">Loved by teams worldwide</div>
      <div class="section-desc" style="margin:12px auto 0;text-align:center">See what our customers have to say about transforming their sales process.</div>
    </div>
    <div class="testimonials-grid">
      <div class="testimonial-card reveal" style="transition-delay:.05s">
        <div class="testimonial-stars">
          <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
        </div>
        <div class="testimonial-text">"Salix transformed our sales process completely. We went from tracking deals in spreadsheets to closing 40% more deals in the first quarter. The automation alone saved us 20 hours a week."</div>
        <div class="testimonial-author">
          <div class="testimonial-avatar" style="background:linear-gradient(135deg,#7c3aed,#ec4899)">SJ</div>
          <div class="testimonial-info">
            <div class="name">Sarah Johnson</div>
            <div class="role">VP of Sales, TechCorp</div>
          </div>
        </div>
      </div>
      <div class="testimonial-card reveal" style="transition-delay:.1s">
        <div class="testimonial-stars">
          <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
        </div>
        <div class="testimonial-text">"The best CRM we've ever used. The AI features are genuinely helpful, not gimmicky. Our team actually enjoys using it which is something I never thought I'd say about a sales tool."</div>
        <div class="testimonial-author">
          <div class="testimonial-avatar" style="background:linear-gradient(135deg,#06b6d4,#3b82f6)">MC</div>
          <div class="testimonial-info">
            <div class="name">Michael Chen</div>
            <div class="role">CEO, StartupHub</div>
          </div>
        </div>
      </div>
      <div class="testimonial-card reveal" style="transition-delay:.15s">
        <div class="testimonial-stars">
          <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
        </div>
        <div class="testimonial-text">"We migrated from Salesforce and haven't looked back. Setup took 30 minutes instead of 3 months, and our reps actually hit their quotas now. Worth every penny of the investment."</div>
        <div class="testimonial-author">
          <div class="testimonial-avatar" style="background:linear-gradient(135deg,#10b981,#06b6d4)">EP</div>
          <div class="testimonial-info">
            <div class="name">Emma Pierson</div>
            <div class="role">Sales Director, GrowthCo</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== INTEGRATIONS ===== -->
<section class="integrations-section reveal">
  <div class="integrations-header">
    <div class="section-label"><i class="fas fa-plug"></i> Integrations</div>
    <div class="section-title">Works with your stack</div>
    <div class="section-desc" style="margin:12px auto 0;text-align:center">Connect with 100+ tools you already use. No code required.</div>
  </div>
  <div class="integrations-grid">
    <div class="integration-card"><i class="fab fa-slack" style="color:#4A154B"></i><span>Slack</span></div>
    <div class="integration-card"><i class="fab fa-google" style="color:#4285F4"></i><span>Gmail</span></div>
    <div class="integration-card"><i class="fab fa-hubspot" style="color:#FF7A59"></i><span>HubSpot</span></div>
    <div class="integration-card"><i class="fab fa-stripe-s" style="color:#635BFF"></i><span>Stripe</span></div>
    <div class="integration-card"><i class="fab fa-salesforce" style="color:#00A1E0"></i><span>Salesforce</span></div>
    <div class="integration-card"><i class="fas fa-calendar" style="color:#4285F4"></i><span>Calendar</span></div>
    <div class="integration-card"><i class="fab fa-microsoft" style="color:#00A4EF"></i><span>Teams</span></div>
    <div class="integration-card"><i class="fab fa-dropbox" style="color:#0061FF"></i><span>Dropbox</span></div>
    <div class="integration-card"><i class="fas fa-database" style="color:#47A248"></i><span>MongoDB</span></div>
    <div class="integration-card"><i class="fab fa-github" style="color:#333"></i><span>GitHub</span></div>
    <div class="integration-card"><i class="fab fa-jira" style="color:#0052CC"></i><span>Jira</span></div>
    <div class="integration-card"><i class="fas fa-file-excel" style="color:#217346"></i><span>Excel</span></div>
  </div>
  <div class="integrations-cta">And 90+ more. <a href="#">View all integrations</a></div>
</section>

<!-- ===== FAQ ===== -->
<section class="faq-section" id="faq">
  <div class="faq-inner">
    <div class="faq-header reveal">
      <div class="section-label"><i class="fas fa-question-circle"></i> FAQ</div>
      <div class="section-title">Frequently asked questions</div>
    </div>
    <div class="faq-item">
      <div class="faq-question">How long does onboarding take? <i class="fas fa-chevron-down"></i></div>
      <div class="faq-answer"><p>Most teams are fully onboarded in under 30 minutes. Connect your email, import contacts, and you're ready to go. We also offer a free concierge onboarding session for Professional and Enterprise plans.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-question">Can I import data from my existing CRM? <i class="fas fa-chevron-down"></i></div>
      <div class="faq-answer"><p>Absolutely. We support one-click imports from Salesforce, HubSpot, Pipedrive, and most major CRMs. You can also import via CSV. All your contacts, deals, and history will transfer seamlessly.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-question">Is my data secure? <i class="fas fa-chevron-down"></i></div>
      <div class="faq-answer"><p>Yes. We are SOC 2 Type II certified with end-to-end encryption at rest and in transit. We offer SSO/SAML for Enterprise plans, two-factor authentication, role-based access, and detailed audit logging.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-question">What happens after the free trial? <i class="fas fa-chevron-down"></i></div>
      <div class="faq-answer"><p>After your 14-day trial, you can choose the plan that fits your team. No credit card is required during the trial. If you decide not to continue, your data will be exported for you upon request.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-question">Do you offer discounts for startups? <i class="fas fa-chevron-down"></i></div>
      <div class="faq-answer"><p>Yes! We have a startup program that offers up to 50% off for the first year for qualifying early-stage companies. Contact our sales team to learn more and apply.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-question">Can I cancel anytime? <i class="fas fa-chevron-down"></i></div>
      <div class="faq-answer"><p>Of course. There are no long-term contracts. You can cancel, upgrade, or downgrade your plan at any time from your account settings. Refunds are processed within 5 business days.</p></div>
    </div>
  </div>
</section>

<!-- ===== CTA ===== -->
<section class="cta-section">
  <div class="cta-card reveal-scale">
    <h2>Ready to transform your sales?</h2>
    <p>Join 17,000+ businesses already using Salix to close more deals, faster. Start your free trial today.</p>
    <div class="cta-card-btns">
      <button class="cta-white">Start Free Trial <i class="fas fa-arrow-right"></i></button>
      <button class="cta-outline">Talk to Sales</button>
    </div>
    <div class="cta-note"><i class="fas fa-check-circle"></i> No credit card required &middot; 14-day free trial &middot; Cancel anytime</div>
  </div>
</section>

<!-- ===== FOOTER ===== -->
<footer>
  <div class="footer-inner">
    <div class="footer-top">
      <div class="footer-brand">
        <div class="logo" style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:22px;display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <div class="logo-icon" style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#ec4899);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px">S</div>
          Salix
        </div>
        <p>The smartest way to manage your sales pipeline and close more deals with AI-powered automation.</p>
        <div class="footer-socials">
          <a href="#"><i class="fab fa-x-twitter"></i></a>
          <a href="#"><i class="fab fa-linkedin-in"></i></a>
          <a href="#"><i class="fab fa-github"></i></a>
          <a href="#"><i class="fab fa-youtube"></i></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Product</h4>
        <a href="#">Features</a>
        <a href="#">Pricing</a>
        <a href="#">Integrations</a>
        <a href="#">Changelog</a>
        <a href="#">Roadmap</a>
      </div>
      <div class="footer-col">
        <h4>Resources</h4>
        <a href="#">Documentation</a>
        <a href="#">API Reference</a>
        <a href="#">Blog</a>
        <a href="#">Community</a>
        <a href="#">Webinars</a>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="#">About Us</a>
        <a href="#">Careers</a>
        <a href="#">Press Kit</a>
        <a href="#">Contact</a>
        <a href="#">Partners</a>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Cookie Policy</a>
        <a href="#">GDPR</a>
        <a href="#">Security</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2025 Salix, Inc. All rights reserved.</span>
      <div class="footer-bottom-links">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Sitemap</a>
      </div>
    </div>
  </div>
</footer>

<script>
/* ===== NAV SCROLL ===== */
const navWrapper = document.getElementById('navWrapper');
let lastScroll = 0;
window.addEventListener('scroll', () => {
  navWrapper.classList.toggle('scrolled', window.scrollY > 20);
  lastScroll = window.scrollY;
});

/* ===== SCROLL REVEAL ===== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => revealObserver.observe(el));

/* ===== COUNTER ANIMATION ===== */
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const counters = entry.target.querySelectorAll('.stat-number[data-target]');
      counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const suffix = target === 17000 ? '+' : target === 99 ? '.9%' : target === 4 ? '.9/5' : '+';
        const displayTarget = target === 17000 ? '17,000' : target === 99 ? '99' : target === 4 ? '4' : String(target);
        let current = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(timer);
            counter.textContent = displayTarget + suffix;
          } else {
            counter.textContent = Math.floor(current).toLocaleString();
          }
        }, 25);
      });
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });
const statsGrid = document.querySelector('.stats-grid');
if (statsGrid) counterObserver.observe(statsGrid);

/* ===== PRICING TOGGLE ===== */
const toggle = document.getElementById('pricingToggle');
const monthlyLabel = document.getElementById('monthlyLabel');
const annualLabel = document.getElementById('annualLabel');
let isAnnual = false;
toggle.addEventListener('click', () => {
  isAnnual = !isAnnual;
  toggle.classList.toggle('active', isAnnual);
  monthlyLabel.classList.toggle('active', !isAnnual);
  annualLabel.classList.toggle('active', isAnnual);
  document.querySelectorAll('.price-amount[data-monthly]').forEach(el => {
    const price = isAnnual ? el.getAttribute('data-annual') : el.getAttribute('data-monthly');
    el.textContent = '$' + price;
  });
});

/* ===== FAQ ACCORDION ===== */
document.querySelectorAll('.faq-question').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

/* ===== SMOOTH SCROLL ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      const offset = 80;
      const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
});

/* ===== FEATURE CARD TILT ===== */
document.querySelectorAll('.feat-card, .testimonial-card, .price-card, .stat-block').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    card.style.transform = card.classList.contains('popular')
      ? 'scale(1.04) perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)'
      : 'translateY(-6px) perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = card.classList.contains('popular') ? 'scale(1.04)' : '';
  });
});

/* ===== PARALLAX ORBS ===== */
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;
  document.querySelectorAll('.hero-orb').forEach((orb, i) => {
    const speed = (i + 1) * 15;
    orb.style.transform = 'translate(' + (x * speed) + 'px, ' + (y * speed) + 'px)';
  });
});

/* ===== MAGNETIC BUTTONS ===== */
document.querySelectorAll('.hero-cta, .cta-white, .price-btn').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = 'translate(' + (x * 0.15) + 'px, ' + (y * 0.15) + 'px)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

/* ═══ MAGIC UI — Blur-Fade Observer ═══ */
const magicObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('visible'); } });
}, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
document.querySelectorAll('.magic-reveal').forEach(el => magicObs.observe(el));

/* ═══ MAGIC UI — Glow Card Mouse Track ═══ */
document.querySelectorAll('.glow-card').forEach(card => {
  const glow = document.createElement('div');
  glow.className = 'glow-effect';
  card.appendChild(glow);
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    glow.style.left = (e.clientX - rect.left) + 'px';
    glow.style.top = (e.clientY - rect.top) + 'px';
  });
});
</script>
</body>
</html>`, language: 'html' },
    },
  },
  {
    name: 'Dashboard', desc: 'Premium analytics dashboard — sidebar, charts, tables, activity feed, notifications & settings', icon: '📊',
    files: {
      'index.html': { content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aurion — Analytics Dashboard</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#09090b;--surface:#111113;--card:#18181b;--card-hover:#1f1f23;
  --border:#27272a;--border-light:#3f3f46;--text:#fafafa;--text-secondary:#a1a1aa;--muted:#71717a;
  --accent:#7c3aed;--accent-light:#a78bfa;--accent-glow:rgba(124,58,237,.15);
  --accent2:#06b6d4;--accent2-glow:rgba(6,182,212,.12);
  --green:#10b981;--green-glow:rgba(16,185,129,.12);
  --red:#ef4444;--red-glow:rgba(239,68,68,.12);
  --amber:#f59e0b;--amber-glow:rgba(245,158,11,.12);
  --blue:#3b82f6;--blue-glow:rgba(59,130,246,.12);
  --pink:#ec4899;--pink-glow:rgba(236,72,153,.12);
  --radius:12px;--radius-lg:16px;
  --shadow:0 1px 3px rgba(0,0,0,.3),0 4px 16px rgba(0,0,0,.2);
  --shadow-lg:0 8px 32px rgba(0,0,0,.4);
  --transition:.2s cubic-bezier(.4,0,.2,1)
}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);display:flex;height:100vh;overflow:hidden}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--border-light)}

/* ===== ANIMATIONS ===== */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes grow{from{width:0}to{width:var(--w)}}
@keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes chartIn{from{opacity:0;transform:scaleY(0)}to{opacity:1;transform:scaleY(1)}}

.anim-fade{animation:fadeIn .4s ease both}
.anim-slide{animation:slideUp .5s ease both}
.anim-d1{animation-delay:.05s}.anim-d2{animation-delay:.1s}.anim-d3{animation-delay:.15s}.anim-d4{animation-delay:.2s}
.anim-d5{animation-delay:.25s}.anim-d6{animation-delay:.3s}.anim-d7{animation-delay:.35s}.anim-d8{animation-delay:.4s}

/* ===== SIDEBAR ===== */
.sidebar{width:260px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;z-index:10}
.sidebar-header{padding:20px 18px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:12px;text-decoration:none}
.brand-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--pink));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;font-family:'Space Grotesk',sans-serif}
.brand-name{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:18px;color:var(--text)}
.sidebar-collapse{background:none;border:none;color:var(--muted);cursor:pointer;padding:4px;transition:color .2s}
.sidebar-collapse:hover{color:var(--text)}
.sidebar-search{margin:0 14px 14px;position:relative}
.sidebar-search input{width:100%;padding:9px 12px 9px 34px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:12px;outline:none;transition:all .2s;font-family:inherit}
.sidebar-search input::placeholder{color:var(--muted)}
.sidebar-search input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.sidebar-search i{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--muted)}
.sidebar-section{padding:0 10px;margin-bottom:6px}
.sidebar-section-label{padding:8px 10px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
.sidebar-nav{display:flex;flex-direction:column;gap:1px}
.nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;font-size:13px;color:var(--muted);text-decoration:none;transition:all .15s;font-weight:500;position:relative;cursor:pointer}
.nav-item:hover{background:var(--card);color:var(--text)}
.nav-item.active{background:var(--accent);color:#fff;font-weight:600;box-shadow:0 2px 8px var(--accent-glow)}
.nav-item i{width:18px;text-align:center;font-size:14px}
.nav-item .badge{margin-left:auto;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:700;background:var(--red);color:#fff;min-width:20px;text-align:center}
.nav-item.active .badge{background:rgba(255,255,255,.25)}
.sidebar-footer{margin-top:auto;padding:14px;border-top:1px solid var(--border)}
.user-card{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--radius);background:var(--card);cursor:pointer;transition:all .2s}
.user-card:hover{background:var(--card-hover)}
.user-avatar{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--pink));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0}
.user-info{flex:1;min-width:0}
.user-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.user-email{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.user-card .dots{color:var(--muted);font-size:14px}

/* ===== MAIN AREA ===== */
main{flex:1;overflow-y:auto;display:flex;flex-direction:column;background:var(--bg)}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0;position:sticky;top:0;z-index:5;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.topbar-left{display:flex;align-items:center;gap:16px}
.topbar-left h1{font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700}
.topbar-left .breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
.topbar-left .breadcrumb a{color:var(--muted);text-decoration:none;transition:color .2s}
.topbar-left .breadcrumb a:hover{color:var(--text)}
.topbar-right{display:flex;align-items:center;gap:10px}
.topbar-search{padding:8px 14px 8px 34px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:12px;width:240px;outline:none;transition:all .2s;font-family:inherit;position:relative}
.topbar-search:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.topbar-icon{width:36px;height:36px;border-radius:10px;background:var(--card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;cursor:pointer;transition:all .2s;position:relative}
.topbar-icon:hover{color:var(--text);border-color:var(--border-light);background:var(--card-hover)}
.topbar-icon .notif-dot{position:absolute;top:6px;right:6px;width:8px;height:8px;background:var(--red);border-radius:50%;border:2px solid var(--surface)}
.btn{padding:9px 18px;border-radius:10px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px;font-family:inherit}
.btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{background:#6d28d9;transform:translateY(-1px);box-shadow:0 4px 12px var(--accent-glow)}
.btn-secondary{background:var(--card);color:var(--text);border:1px solid var(--border)}.btn-secondary:hover{border-color:var(--border-light);background:var(--card-hover)}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}.btn-ghost:hover{color:var(--text);border-color:var(--border-light)}
.btn-danger{background:var(--red-glow);color:var(--red);border:1px solid rgba(239,68,68,.2)}.btn-danger:hover{background:var(--red);color:#fff}

/* ===== CONTENT ===== */
.content{padding:24px 28px;flex:1}

/* Date range picker */
.date-range{display:flex;align-items:center;gap:8px;margin-bottom:24px;flex-wrap:wrap}
.date-range .tab{padding:7px 16px;border-radius:8px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s;border:1px solid transparent}
.date-range .tab:hover{color:var(--text);background:var(--card)}
.date-range .tab.active{background:var(--accent);color:#fff;font-weight:600}
.date-range .custom{margin-left:auto;display:flex;align-items:center;gap:8px}
.date-input{padding:7px 12px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;font-family:inherit;outline:none;transition:border .2s}
.date-input:focus{border-color:var(--accent)}

/* ===== STAT CARDS ===== */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.stat-card{padding:20px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);transition:all .3s;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;opacity:0;transition:opacity .3s}
.stat-card:hover{border-color:var(--border-light);transform:translateY(-2px);box-shadow:var(--shadow)}
.stat-card:hover::before{opacity:1}
.stat-card.purple::before{background:var(--accent)}.stat-card.cyan::before{background:var(--accent2)}.stat-card.green::before{background:var(--green)}.stat-card.amber::before{background:var(--amber)}
.stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.stat-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px}
.stat-change{font-size:11px;font-weight:600;padding:4px 10px;border-radius:100px;display:flex;align-items:center;gap:4px}
.stat-change.up{background:var(--green-glow);color:var(--green)}
.stat-change.down{background:var(--red-glow);color:var(--red)}
.stat-value{font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;margin-bottom:4px;letter-spacing:-.02em}
.stat-label{font-size:12px;color:var(--muted);font-weight:500}
.stat-sparkline{display:flex;align-items:flex-end;gap:3px;height:36px;margin-top:14px;padding-top:4px;border-top:1px solid rgba(255,255,255,.04)}
.stat-sparkline span{flex:1;border-radius:3px;transition:all .3s;transform-origin:bottom;animation:chartIn .5s ease both}
.stat-card:hover .stat-sparkline span{opacity:.9}
.stat-compare{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:var(--muted)}
.stat-compare .vs{color:var(--text-secondary);font-weight:500}

/* ===== CHARTS ===== */
.charts-row{display:grid;grid-template-columns:1.8fr 1fr;gap:16px;margin-bottom:24px}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;transition:all .3s}
.card:hover{border-color:var(--border-light)}
.card-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.04)}
.card-header h3{font-size:14px;font-weight:700;font-family:'Space Grotesk',sans-serif}
.card-header .subtitle{font-size:11px;color:var(--muted);margin-top:2px}
.card-tabs{display:flex;gap:3px;background:var(--bg);border-radius:8px;padding:3px}
.card-tabs button{padding:5px 14px;border-radius:6px;border:none;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;background:transparent;color:var(--muted);font-family:inherit}
.card-tabs button.active{background:var(--accent);color:#fff}
.card-tabs button:hover:not(.active){color:var(--text)}
.card-body{padding:20px}

/* Revenue chart */
.revenue-chart{height:220px;display:flex;align-items:flex-end;gap:8px;position:relative}
.revenue-chart .y-axis{position:absolute;left:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:space-between;font-size:10px;color:var(--muted);padding-right:8px}
.revenue-chart .bars{display:flex;align-items:flex-end;gap:8px;flex:1;height:100%;margin-left:40px}
.bar-group{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.bar-wrap{width:100%;display:flex;gap:3px;align-items:flex-end;height:180px}
.bar{flex:1;border-radius:4px 4px 0 0;transition:all .4s ease;cursor:pointer;position:relative;transform-origin:bottom;animation:chartIn .6s ease both}
.bar:hover{filter:brightness(1.2)}
.bar .bar-tooltip{position:absolute;top:-36px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;opacity:0;transition:opacity .2s;white-space:nowrap;pointer-events:none;z-index:5}
.bar .bar-tooltip::after{content:'';position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:var(--text)}
.bar:hover .bar-tooltip{opacity:1}
.bar-label{font-size:10px;color:var(--muted);text-align:center;margin-top:4px}
.chart-legend{display:flex;align-items:center;gap:20px;padding:14px 20px;border-top:1px solid rgba(255,255,255,.04);font-size:11px;color:var(--muted)}
.chart-legend .legend-item{display:flex;align-items:center;gap:6px}
.chart-legend .legend-dot{width:10px;height:10px;border-radius:3px}

/* Donut / Pie chart */
.donut-chart{display:flex;align-items:center;gap:24px;min-height:200px}
.donut-visual{position:relative;width:160px;height:160px;flex-shrink:0}
.donut-ring{width:100%;height:100%;border-radius:50%;background:conic-gradient(var(--accent) 0% 38%,var(--accent2) 38% 62%,var(--green) 62% 79%,var(--amber) 79% 91%,var(--border) 91% 100%);display:flex;align-items:center;justify-content:center;transition:all .5s}
.donut-inner{width:100px;height:100px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;z-index:1}
.donut-val{font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700}
.donut-lbl{font-size:10px;color:var(--muted);font-weight:500}
.donut-legend{display:flex;flex-direction:column;gap:10px;flex:1}
.donut-legend-item{display:flex;align-items:center;gap:10px;font-size:12px;cursor:default;transition:all .2s;padding:6px 10px;border-radius:8px}
.donut-legend-item:hover{background:rgba(255,255,255,.04)}
.donut-legend-dot{width:12px;height:12px;border-radius:4px;flex-shrink:0}
.donut-legend-text{flex:1;color:var(--text-secondary)}
.donut-legend-val{font-weight:600;color:var(--text);font-family:'Space Grotesk',sans-serif}
.donut-legend-pct{font-size:11px;color:var(--muted);width:36px;text-align:right}

/* ===== SECOND ROW ===== */
.second-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}

/* Activity feed */
.activity-list{display:flex;flex-direction:column;gap:0}
.activity-item{display:flex;gap:14px;padding:14px 20px;transition:background .2s;cursor:default;position:relative}
.activity-item:hover{background:rgba(255,255,255,.02)}
.activity-item:not(:last-child)::after{content:'';position:absolute;left:37px;top:44px;bottom:-2px;width:1px;background:var(--border)}
.activity-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;position:relative;z-index:1}
.activity-body{flex:1;min-width:0}
.activity-text{font-size:13px;line-height:1.5}
.activity-text strong{font-weight:600}
.activity-time{font-size:11px;color:var(--muted);margin-top:2px}

/* World map / Geo */
.geo-visual{padding:20px;display:flex;flex-direction:column;gap:14px}
.geo-row{display:flex;align-items:center;gap:12px;padding:8px 0}
.geo-flag{width:28px;height:20px;border-radius:3px;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.geo-info{flex:1;min-width:0}
.geo-name{font-size:13px;font-weight:500}
.geo-visitors{font-size:11px;color:var(--muted)}
.geo-bar-wrap{width:100%;height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:4px}
.geo-bar{height:100%;border-radius:3px;transition:width 1s ease;animation:grow 1.2s ease both}
.geo-pct{font-size:12px;font-weight:600;width:40px;text-align:right;flex-shrink:0}

/* ===== TABLE ===== */
.table-section{margin-bottom:24px}
.table-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden}
.table-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.04)}
.table-header h3{font-size:14px;font-weight:700;font-family:'Space Grotesk',sans-serif}
.table-actions{display:flex;align-items:center;gap:8px}
.table-filter{padding:6px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:11px;font-family:inherit;outline:none;cursor:pointer}
table{width:100%;border-collapse:collapse}
thead th{text-align:left;font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.8px;padding:12px 16px;border-bottom:1px solid var(--border);background:rgba(255,255,255,.01)}
tbody td{padding:14px 16px;font-size:13px;border-bottom:1px solid rgba(255,255,255,.03);transition:background .15s}
tbody tr{cursor:default}
tbody tr:hover td{background:rgba(255,255,255,.02)}
tbody tr:last-child td{border-bottom:none}
.customer-cell{display:flex;align-items:center;gap:12px}
.customer-avatar{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
.customer-name{font-weight:600}
.customer-id{font-size:11px;color:var(--muted)}
.status-badge{padding:4px 12px;border-radius:100px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
.status-badge.active{background:var(--green-glow);color:var(--green)}
.status-badge.pending{background:var(--amber-glow);color:var(--amber)}
.status-badge.inactive{background:var(--red-glow);color:var(--red)}
.status-badge.trial{background:var(--blue-glow);color:var(--blue)}
.status-badge::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
.mrr-val{font-weight:600;font-family:'Space Grotesk',sans-serif}
.table-footer{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;font-size:12px;color:var(--muted)}
.pagination{display:flex;align-items:center;gap:4px}
.pagination button{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--muted);font-size:12px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;font-family:inherit}
.pagination button:hover{color:var(--text);border-color:var(--border-light)}
.pagination button.active{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ===== THIRD ROW ===== */
.third-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}

/* Quick actions */
.quick-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:20px}
.quick-action{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 12px;border-radius:var(--radius);border:1px solid var(--border);cursor:pointer;transition:all .2s;text-align:center}
.quick-action:hover{border-color:var(--accent);background:var(--accent-glow);transform:translateY(-2px)}
.quick-action i{font-size:20px;color:var(--accent)}
.quick-action span{font-size:11px;font-weight:600;color:var(--text-secondary)}

/* Inbox / Messages */
.inbox-list{display:flex;flex-direction:column}
.inbox-item{display:flex;align-items:flex-start;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;transition:background .15s}
.inbox-item:hover{background:rgba(255,255,255,.02)}
.inbox-item:last-child{border-bottom:none}
.inbox-avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
.inbox-body{flex:1;min-width:0}
.inbox-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}
.inbox-sender{font-size:13px;font-weight:600}
.inbox-time{font-size:10px;color:var(--muted)}
.inbox-preview{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.inbox-unread .inbox-sender{color:var(--text)}
.inbox-unread::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:8px}

/* Top Products */
.products-list{padding:16px 20px;display:flex;flex-direction:column;gap:12px}
.product-item{display:flex;align-items:center;gap:14px;padding:10px 12px;border-radius:var(--radius);transition:background .2s;cursor:default}
.product-item:hover{background:rgba(255,255,255,.03)}
.product-rank{width:24px;height:24px;border-radius:6px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--muted);flex-shrink:0}
.product-img{width:40px;height:40px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.product-info{flex:1;min-width:0}
.product-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.product-category{font-size:11px;color:var(--muted)}
.product-revenue{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:13px;text-align:right}
.product-units{font-size:10px;color:var(--muted);text-align:right}

/* ===== RESPONSIVE ===== */
@media(max-width:1200px){
  .stats-grid{grid-template-columns:repeat(2,1fr)}
  .third-row{grid-template-columns:1fr 1fr}
  .third-row .card:last-child{grid-column:span 2}
}
@media(max-width:900px){
  .sidebar{display:none}
  .stats-grid{grid-template-columns:1fr 1fr}
  .charts-row{grid-template-columns:1fr}
  .second-row{grid-template-columns:1fr}
  .third-row{grid-template-columns:1fr}
  .third-row .card:last-child{grid-column:auto}
  .topbar-search{display:none}
  .content{padding:16px}
}
@media(max-width:600px){
  .stats-grid{grid-template-columns:1fr}
  .date-range .custom{display:none}
  .topbar{padding:12px 16px}
  .topbar-left h1{font-size:16px}
}

/* ═══ MAGIC UI — Border Beam ═══ */
@property --beam-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
.border-beam{position:relative;overflow:hidden}.border-beam::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:2px;background:conic-gradient(from var(--beam-angle),transparent 60%,var(--accent) 80%,transparent 100%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:beam-spin 4s linear infinite;pointer-events:none;z-index:2}@keyframes beam-spin{to{--beam-angle:360deg}}
/* ═══ MAGIC UI — Shimmer CTA ═══ */
.shimmer-btn{position:relative;overflow:hidden;isolation:isolate}.shimmer-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);animation:shimmer-sweep 3s ease-in-out infinite;z-index:1}@keyframes shimmer-sweep{0%,100%{left:-100%}50%{left:150%}}
/* ═══ MAGIC UI — Glow Card ═══ */
.glow-card{position:relative;overflow:hidden;z-index:1}.glow-card .glow-effect{position:absolute;width:400px;height:400px;background:radial-gradient(circle,rgba(124,58,237,.08),transparent 70%);border-radius:50%;opacity:0;transition:opacity .5s;pointer-events:none;transform:translate(-50%,-50%);z-index:0}.glow-card:hover .glow-effect{opacity:1}
/* ═══ MAGIC UI — Pulse Dot ═══ */
.magic-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 0 rgba(16,185,129,.4);animation:magic-pulse 2s infinite;display:inline-block}@keyframes magic-pulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.4)}70%{box-shadow:0 0 0 12px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}
/* ═══ MAGIC UI — Subtle Grid ═══ */
.magic-grid-subtle{position:absolute;inset:0;background-image:linear-gradient(rgba(124,58,237,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.025) 1px,transparent 1px);background-size:60px 60px;pointer-events:none;z-index:0}
/* ═══ MAGIC UI — Blur Fade In ═══ */
.magic-reveal{opacity:0;filter:blur(6px);transform:translateY(16px);transition:all .7s cubic-bezier(.22,1,.36,1)}.magic-reveal.visible{opacity:1;filter:blur(0);transform:translateY(0)}
/* ═══ MAGIC UI — Number Ticker ═══ */
@keyframes tick-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.tick-num{display:inline-block;animation:tick-up .6s cubic-bezier(.22,1,.36,1) forwards}
</style>
</head>
<body>

<!-- ===== SIDEBAR ===== -->
<aside class="sidebar">
  <div class="sidebar-header">
    <a href="#" class="brand">
      <div class="brand-icon">A</div>
      <span class="brand-name">Aurion</span>
    </a>
    <button class="sidebar-collapse"><i class="fas fa-bars"></i></button>
  </div>

  <div class="sidebar-search">
    <i class="fas fa-search"></i>
    <input type="text" placeholder="Search...">
  </div>

  <div class="sidebar-section">
    <div class="sidebar-section-label">Main</div>
    <nav class="sidebar-nav">
      <a class="nav-item active"><i class="fas fa-th-large"></i> Dashboard</a>
      <a class="nav-item"><i class="fas fa-chart-line"></i> Analytics <span class="badge">New</span></a>
      <a class="nav-item"><i class="fas fa-users"></i> Customers</a>
      <a class="nav-item"><i class="fas fa-shopping-cart"></i> Orders <span class="badge">12</span></a>
      <a class="nav-item"><i class="fas fa-box"></i> Products</a>
      <a class="nav-item"><i class="fas fa-file-invoice-dollar"></i> Invoices</a>
    </nav>
  </div>

  <div class="sidebar-section">
    <div class="sidebar-section-label">Communication</div>
    <nav class="sidebar-nav">
      <a class="nav-item"><i class="fas fa-envelope"></i> Messages <span class="badge">3</span></a>
      <a class="nav-item"><i class="fas fa-calendar"></i> Calendar</a>
      <a class="nav-item"><i class="fas fa-clipboard-list"></i> Tasks</a>
    </nav>
  </div>

  <div class="sidebar-section">
    <div class="sidebar-section-label">Settings</div>
    <nav class="sidebar-nav">
      <a class="nav-item"><i class="fas fa-cog"></i> Settings</a>
      <a class="nav-item"><i class="fas fa-shield-alt"></i> Security</a>
      <a class="nav-item"><i class="fas fa-question-circle"></i> Help Center</a>
    </nav>
  </div>

  <div class="sidebar-footer">
    <div class="user-card">
      <div class="user-avatar">MJ</div>
      <div class="user-info">
        <div class="user-name">Martin Jones</div>
        <div class="user-email">martin@aurion.io</div>
      </div>
      <i class="fas fa-ellipsis-v dots"></i>
    </div>
  </div>
</aside>

<!-- ===== MAIN ===== -->
<main>
  <div class="topbar">
    <div class="topbar-left">
      <h1>Dashboard</h1>
      <div class="breadcrumb">
        <a href="#"><i class="fas fa-home"></i></a>
        <i class="fas fa-chevron-right" style="font-size:8px"></i>
        <span>Overview</span>
      </div>
    </div>
    <div class="topbar-right">
      <input class="topbar-search" placeholder="Search anything..." type="text">
      <div class="topbar-icon"><i class="fas fa-bell"></i><span class="notif-dot"></span></div>
      <div class="topbar-icon"><i class="fas fa-expand"></i></div>
      <button class="btn btn-secondary"><i class="fas fa-download"></i> Export</button>
      <button class="btn btn-primary"><i class="fas fa-plus"></i> Add New</button>
    </div>
  </div>

  <div class="content">
    <!-- Date Range -->
    <div class="date-range anim-slide">
      <div class="tab">Today</div>
      <div class="tab">7 Days</div>
      <div class="tab active">30 Days</div>
      <div class="tab">90 Days</div>
      <div class="tab">12 Months</div>
      <div class="custom">
        <input type="date" class="date-input" value="2025-01-01">
        <span style="color:var(--muted);font-size:12px">to</span>
        <input type="date" class="date-input" value="2025-01-31">
        <button class="btn btn-ghost" style="padding:7px 12px"><i class="fas fa-filter"></i></button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card glow-card purple anim-slide anim-d1">
        <div class="stat-top">
          <div class="stat-icon" style="background:var(--accent-glow);color:var(--accent)"><i class="fas fa-dollar-sign"></i></div>
          <div class="stat-change up"><i class="fas fa-arrow-up" style="font-size:9px"></i> +20.1%</div>
        </div>
        <div class="stat-value">$58,236</div>
        <div class="stat-label">Total Revenue</div>
        <div class="stat-sparkline">
          <span style="height:35%;background:var(--accent);animation-delay:.1s"></span>
          <span style="height:52%;background:var(--accent);animation-delay:.15s"></span>
          <span style="height:44%;background:var(--accent);animation-delay:.2s"></span>
          <span style="height:68%;background:var(--accent);animation-delay:.25s"></span>
          <span style="height:85%;background:var(--accent-light);animation-delay:.3s"></span>
          <span style="height:72%;background:var(--accent);animation-delay:.35s"></span>
          <span style="height:90%;background:var(--accent-light);animation-delay:.4s"></span>
          <span style="height:78%;background:var(--accent);animation-delay:.45s"></span>
        </div>
        <div class="stat-compare">vs last month <span class="vs">$48,490</span></div>
      </div>

      <div class="stat-card glow-card cyan anim-slide anim-d2">
        <div class="stat-top">
          <div class="stat-icon" style="background:var(--accent2-glow);color:var(--accent2)"><i class="fas fa-users"></i></div>
          <div class="stat-change up"><i class="fas fa-arrow-up" style="font-size:9px"></i> +15.3%</div>
        </div>
        <div class="stat-value">7,368</div>
        <div class="stat-label">Total Customers</div>
        <div class="stat-sparkline">
          <span style="height:28%;background:var(--accent2);animation-delay:.15s"></span>
          <span style="height:58%;background:var(--accent2);animation-delay:.2s"></span>
          <span style="height:45%;background:var(--accent2);animation-delay:.25s"></span>
          <span style="height:72%;background:var(--accent2);animation-delay:.3s"></span>
          <span style="height:60%;background:var(--accent2);animation-delay:.35s"></span>
          <span style="height:82%;background:var(--accent2);animation-delay:.4s"></span>
          <span style="height:75%;background:var(--accent2);animation-delay:.45s"></span>
          <span style="height:88%;background:var(--accent2);animation-delay:.5s"></span>
        </div>
        <div class="stat-compare">vs last month <span class="vs">6,390</span></div>
      </div>

      <div class="stat-card glow-card green anim-slide anim-d3">
        <div class="stat-top">
          <div class="stat-icon" style="background:var(--green-glow);color:var(--green)"><i class="fas fa-receipt"></i></div>
          <div class="stat-change up"><i class="fas fa-arrow-up" style="font-size:9px"></i> +12.5%</div>
        </div>
        <div class="stat-value">7,869</div>
        <div class="stat-label">Transactions</div>
        <div class="stat-sparkline">
          <span style="height:48%;background:var(--green);animation-delay:.2s"></span>
          <span style="height:32%;background:var(--green);animation-delay:.25s"></span>
          <span style="height:62%;background:var(--green);animation-delay:.3s"></span>
          <span style="height:54%;background:var(--green);animation-delay:.35s"></span>
          <span style="height:78%;background:var(--green);animation-delay:.4s"></span>
          <span style="height:68%;background:var(--green);animation-delay:.45s"></span>
          <span style="height:82%;background:var(--green);animation-delay:.5s"></span>
          <span style="height:92%;background:var(--green);animation-delay:.55s"></span>
        </div>
        <div class="stat-compare">vs last month <span class="vs">6,994</span></div>
      </div>

      <div class="stat-card glow-card amber anim-slide anim-d4">
        <div class="stat-top">
          <div class="stat-icon" style="background:var(--amber-glow);color:var(--amber)"><i class="fas fa-percentage"></i></div>
          <div class="stat-change down"><i class="fas fa-arrow-down" style="font-size:9px"></i> -0.4%</div>
        </div>
        <div class="stat-value">3.2%</div>
        <div class="stat-label">Conversion Rate</div>
        <div class="stat-sparkline">
          <span style="height:78%;background:var(--amber);animation-delay:.25s"></span>
          <span style="height:72%;background:var(--amber);animation-delay:.3s"></span>
          <span style="height:62%;background:var(--amber);animation-delay:.35s"></span>
          <span style="height:55%;background:var(--amber);animation-delay:.4s"></span>
          <span style="height:48%;background:var(--amber);animation-delay:.45s"></span>
          <span style="height:52%;background:var(--amber);animation-delay:.5s"></span>
          <span style="height:44%;background:var(--amber);animation-delay:.55s"></span>
          <span style="height:40%;background:var(--amber);animation-delay:.6s"></span>
        </div>
        <div class="stat-compare">vs last month <span class="vs">3.6%</span></div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="card anim-slide anim-d5">
        <div class="card-header">
          <div>
            <h3>Revenue Overview</h3>
            <div class="subtitle">Monthly revenue and expenses comparison</div>
          </div>
          <div class="card-tabs">
            <button>7d</button>
            <button class="active">1m</button>
            <button>3m</button>
            <button>1y</button>
          </div>
        </div>
        <div class="card-body">
          <div class="revenue-chart">
            <div class="bars">
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:35%;background:var(--accent);animation-delay:.1s"><span class="bar-tooltip">$12.4k</span></div><div class="bar" style="height:22%;background:var(--border-light);animation-delay:.15s"><span class="bar-tooltip">$7.8k</span></div></div><div class="bar-label">Jan</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:50%;background:var(--accent);animation-delay:.15s"><span class="bar-tooltip">$18.2k</span></div><div class="bar" style="height:30%;background:var(--border-light);animation-delay:.2s"><span class="bar-tooltip">$10.9k</span></div></div><div class="bar-label">Feb</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:42%;background:var(--accent);animation-delay:.2s"><span class="bar-tooltip">$15.8k</span></div><div class="bar" style="height:28%;background:var(--border-light);animation-delay:.25s"><span class="bar-tooltip">$10.2k</span></div></div><div class="bar-label">Mar</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:65%;background:linear-gradient(to top,var(--accent),var(--accent-light));animation-delay:.25s"><span class="bar-tooltip">$24.1k</span></div><div class="bar" style="height:38%;background:var(--border-light);animation-delay:.3s"><span class="bar-tooltip">$13.8k</span></div></div><div class="bar-label">Apr</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:85%;background:linear-gradient(to top,var(--accent),var(--accent-light));animation-delay:.3s"><span class="bar-tooltip">$32.6k</span></div><div class="bar" style="height:42%;background:var(--border-light);animation-delay:.35s"><span class="bar-tooltip">$15.4k</span></div></div><div class="bar-label">May</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:72%;background:var(--accent);animation-delay:.35s"><span class="bar-tooltip">$27.8k</span></div><div class="bar" style="height:35%;background:var(--border-light);animation-delay:.4s"><span class="bar-tooltip">$12.6k</span></div></div><div class="bar-label">Jun</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:60%;background:var(--accent);animation-delay:.4s"><span class="bar-tooltip">$22.3k</span></div><div class="bar" style="height:32%;background:var(--border-light);animation-delay:.45s"><span class="bar-tooltip">$11.8k</span></div></div><div class="bar-label">Jul</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:90%;background:linear-gradient(to top,var(--accent),#c084fc);animation-delay:.45s"><span class="bar-tooltip">$35.1k</span></div><div class="bar" style="height:45%;background:var(--border-light);animation-delay:.5s"><span class="bar-tooltip">$16.2k</span></div></div><div class="bar-label">Aug</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:78%;background:var(--accent);animation-delay:.5s"><span class="bar-tooltip">$29.4k</span></div><div class="bar" style="height:40%;background:var(--border-light);animation-delay:.55s"><span class="bar-tooltip">$14.6k</span></div></div><div class="bar-label">Sep</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:55%;background:var(--accent);animation-delay:.55s"><span class="bar-tooltip">$20.8k</span></div><div class="bar" style="height:30%;background:var(--border-light);animation-delay:.6s"><span class="bar-tooltip">$11.2k</span></div></div><div class="bar-label">Oct</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:68%;background:var(--accent);animation-delay:.6s"><span class="bar-tooltip">$25.6k</span></div><div class="bar" style="height:34%;background:var(--border-light);animation-delay:.65s"><span class="bar-tooltip">$12.4k</span></div></div><div class="bar-label">Nov</div></div>
              <div class="bar-group"><div class="bar-wrap"><div class="bar" style="height:82%;background:linear-gradient(to top,var(--accent),var(--accent-light));animation-delay:.65s"><span class="bar-tooltip">$31.2k</span></div><div class="bar" style="height:40%;background:var(--border-light);animation-delay:.7s"><span class="bar-tooltip">$14.8k</span></div></div><div class="bar-label">Dec</div></div>
            </div>
          </div>
        </div>
        <div class="chart-legend">
          <div class="legend-item"><div class="legend-dot" style="background:var(--accent)"></div> Revenue</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--border-light)"></div> Expenses</div>
          <div style="margin-left:auto;font-weight:600;color:var(--text)">Total: $295.3k</div>
        </div>
      </div>

      <div class="card anim-slide anim-d6">
        <div class="card-header">
          <div>
            <h3>Traffic Sources</h3>
            <div class="subtitle">Visitor breakdown by channel</div>
          </div>
        </div>
        <div class="card-body">
          <div class="donut-chart">
            <div class="donut-visual">
              <div class="donut-ring">
                <div class="donut-inner">
                  <div class="donut-val">24.8k</div>
                  <div class="donut-lbl">Visitors</div>
                </div>
              </div>
            </div>
            <div class="donut-legend">
              <div class="donut-legend-item"><div class="donut-legend-dot" style="background:var(--accent)"></div><div class="donut-legend-text">Direct</div><div class="donut-legend-val">9,424</div><div class="donut-legend-pct">38%</div></div>
              <div class="donut-legend-item"><div class="donut-legend-dot" style="background:var(--accent2)"></div><div class="donut-legend-text">Organic</div><div class="donut-legend-val">5,952</div><div class="donut-legend-pct">24%</div></div>
              <div class="donut-legend-item"><div class="donut-legend-dot" style="background:var(--green)"></div><div class="donut-legend-text">Referral</div><div class="donut-legend-val">4,216</div><div class="donut-legend-pct">17%</div></div>
              <div class="donut-legend-item"><div class="donut-legend-dot" style="background:var(--amber)"></div><div class="donut-legend-text">Social</div><div class="donut-legend-val">2,976</div><div class="donut-legend-pct">12%</div></div>
              <div class="donut-legend-item"><div class="donut-legend-dot" style="background:var(--border)"></div><div class="donut-legend-text">Other</div><div class="donut-legend-val">2,232</div><div class="donut-legend-pct">9%</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Second Row: Activity + Geography -->
    <div class="second-row">
      <div class="card anim-slide anim-d7">
        <div class="card-header">
          <div>
            <h3>Recent Activity</h3>
            <div class="subtitle">Latest actions across your workspace</div>
          </div>
          <button class="btn btn-ghost" style="padding:6px 12px;font-size:11px">View All</button>
        </div>
        <div class="activity-list">
          <div class="activity-item">
            <div class="activity-icon" style="background:var(--green-glow);color:var(--green)"><i class="fas fa-check"></i></div>
            <div class="activity-body">
              <div class="activity-text"><strong>Sarah Johnson</strong> upgraded to <strong>Enterprise</strong> plan</div>
              <div class="activity-time">2 minutes ago</div>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-icon" style="background:var(--accent-glow);color:var(--accent)"><i class="fas fa-shopping-cart"></i></div>
            <div class="activity-body">
              <div class="activity-text">New order <strong>#ORD-2847</strong> placed &mdash; $1,249.00</div>
              <div class="activity-time">15 minutes ago</div>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-icon" style="background:var(--blue-glow);color:var(--blue)"><i class="fas fa-user-plus"></i></div>
            <div class="activity-body">
              <div class="activity-text"><strong>Mike Chen</strong> created a new team workspace</div>
              <div class="activity-time">42 minutes ago</div>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-icon" style="background:var(--amber-glow);color:var(--amber)"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="activity-body">
              <div class="activity-text">Payment failed for <strong>Acme Corp</strong> &mdash; retry scheduled</div>
              <div class="activity-time">1 hour ago</div>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-icon" style="background:var(--pink-glow);color:var(--pink)"><i class="fas fa-star"></i></div>
            <div class="activity-body">
              <div class="activity-text"><strong>Emily Davis</strong> left a 5-star review on the platform</div>
              <div class="activity-time">2 hours ago</div>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-icon" style="background:var(--green-glow);color:var(--green)"><i class="fas fa-file-invoice"></i></div>
            <div class="activity-body">
              <div class="activity-text">Invoice <strong>#INV-1092</strong> paid by <strong>TechCorp</strong></div>
              <div class="activity-time">3 hours ago</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card anim-slide anim-d8">
        <div class="card-header">
          <div>
            <h3>Top Regions</h3>
            <div class="subtitle">Visitors by country this month</div>
          </div>
        </div>
        <div class="geo-visual">
          <div class="geo-row">
            <div class="geo-flag">🇺🇸</div>
            <div class="geo-info">
              <div class="geo-name">United States</div>
              <div class="geo-visitors">8,420 visitors</div>
              <div class="geo-bar-wrap"><div class="geo-bar" style="--w:82%;width:82%;background:var(--accent)"></div></div>
            </div>
            <div class="geo-pct">34%</div>
          </div>
          <div class="geo-row">
            <div class="geo-flag">🇬🇧</div>
            <div class="geo-info">
              <div class="geo-name">United Kingdom</div>
              <div class="geo-visitors">4,215 visitors</div>
              <div class="geo-bar-wrap"><div class="geo-bar" style="--w:52%;width:52%;background:var(--accent2)"></div></div>
            </div>
            <div class="geo-pct">17%</div>
          </div>
          <div class="geo-row">
            <div class="geo-flag">🇩🇪</div>
            <div class="geo-info">
              <div class="geo-name">Germany</div>
              <div class="geo-visitors">3,102 visitors</div>
              <div class="geo-bar-wrap"><div class="geo-bar" style="--w:38%;width:38%;background:var(--green)"></div></div>
            </div>
            <div class="geo-pct">13%</div>
          </div>
          <div class="geo-row">
            <div class="geo-flag">🇫🇷</div>
            <div class="geo-info">
              <div class="geo-name">France</div>
              <div class="geo-visitors">2,840 visitors</div>
              <div class="geo-bar-wrap"><div class="geo-bar" style="--w:34%;width:34%;background:var(--amber)"></div></div>
            </div>
            <div class="geo-pct">11%</div>
          </div>
          <div class="geo-row">
            <div class="geo-flag">🇯🇵</div>
            <div class="geo-info">
              <div class="geo-name">Japan</div>
              <div class="geo-visitors">2,190 visitors</div>
              <div class="geo-bar-wrap"><div class="geo-bar" style="--w:26%;width:26%;background:var(--pink)"></div></div>
            </div>
            <div class="geo-pct">9%</div>
          </div>
          <div class="geo-row">
            <div class="geo-flag">🇧🇷</div>
            <div class="geo-info">
              <div class="geo-name">Brazil</div>
              <div class="geo-visitors">1,852 visitors</div>
              <div class="geo-bar-wrap"><div class="geo-bar" style="--w:22%;width:22%;background:var(--blue)"></div></div>
            </div>
            <div class="geo-pct">7%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Customers Table -->
    <div class="table-section anim-slide anim-d5">
      <div class="table-card">
        <div class="table-header">
          <h3>Recent Customers</h3>
          <div class="table-actions">
            <select class="table-filter">
              <option>All Status</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Trial</option>
              <option>Inactive</option>
            </select>
            <button class="btn btn-ghost" style="padding:6px 14px;font-size:11px"><i class="fas fa-filter"></i> Filter</button>
            <button class="btn btn-ghost" style="padding:6px 14px;font-size:11px"><i class="fas fa-download"></i> Export</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:30%">Customer</th>
              <th>Email</th>
              <th>Plan</th>
              <th>MRR</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><div class="customer-cell"><div class="customer-avatar" style="background:linear-gradient(135deg,var(--accent),var(--pink))">SJ</div><div><div class="customer-name">Sarah Johnson</div><div class="customer-id">#CUS-001</div></div></div></td>
              <td style="color:var(--muted)">sarah@company.com</td>
              <td>Enterprise</td>
              <td class="mrr-val">$1,200</td>
              <td><span class="status-badge active">Active</span></td>
              <td style="color:var(--muted)">Jan 15, 2025</td>
            </tr>
            <tr>
              <td><div class="customer-cell"><div class="customer-avatar" style="background:linear-gradient(135deg,var(--accent2),var(--blue))">MC</div><div><div class="customer-name">Mike Chen</div><div class="customer-id">#CUS-002</div></div></div></td>
              <td style="color:var(--muted)">mike@startup.io</td>
              <td>Pro</td>
              <td class="mrr-val">$79</td>
              <td><span class="status-badge active">Active</span></td>
              <td style="color:var(--muted)">Feb 03, 2025</td>
            </tr>
            <tr>
              <td><div class="customer-cell"><div class="customer-avatar" style="background:linear-gradient(135deg,var(--green),var(--accent2))">ED</div><div><div class="customer-name">Emily Davis</div><div class="customer-id">#CUS-003</div></div></div></td>
              <td style="color:var(--muted)">emily@design.co</td>
              <td>Team</td>
              <td class="mrr-val">$249</td>
              <td><span class="status-badge pending">Pending</span></td>
              <td style="color:var(--muted)">Feb 18, 2025</td>
            </tr>
            <tr>
              <td><div class="customer-cell"><div class="customer-avatar" style="background:linear-gradient(135deg,var(--amber),var(--red))">JW</div><div><div class="customer-name">James Wilson</div><div class="customer-id">#CUS-004</div></div></div></td>
              <td style="color:var(--muted)">james@tech.dev</td>
              <td>Pro</td>
              <td class="mrr-val">$79</td>
              <td><span class="status-badge trial">Trial</span></td>
              <td style="color:var(--muted)">Mar 01, 2025</td>
            </tr>
            <tr>
              <td><div class="customer-cell"><div class="customer-avatar" style="background:linear-gradient(135deg,var(--pink),var(--accent))">LA</div><div><div class="customer-name">Lisa Anderson</div><div class="customer-id">#CUS-005</div></div></div></td>
              <td style="color:var(--muted)">lisa@agency.com</td>
              <td>Starter</td>
              <td class="mrr-val">$29</td>
              <td><span class="status-badge inactive">Churned</span></td>
              <td style="color:var(--muted)">Dec 22, 2024</td>
            </tr>
            <tr>
              <td><div class="customer-cell"><div class="customer-avatar" style="background:linear-gradient(135deg,var(--blue),var(--accent2))">RK</div><div><div class="customer-name">Rachel Kim</div><div class="customer-id">#CUS-006</div></div></div></td>
              <td style="color:var(--muted)">rachel@enterprise.co</td>
              <td>Enterprise</td>
              <td class="mrr-val">$2,400</td>
              <td><span class="status-badge active">Active</span></td>
              <td style="color:var(--muted)">Jan 08, 2025</td>
            </tr>
            <tr>
              <td><div class="customer-cell"><div class="customer-avatar" style="background:linear-gradient(135deg,var(--green),var(--amber))">DP</div><div><div class="customer-name">David Park</div><div class="customer-id">#CUS-007</div></div></div></td>
              <td style="color:var(--muted)">david@fintech.io</td>
              <td>Team</td>
              <td class="mrr-val">$249</td>
              <td><span class="status-badge active">Active</span></td>
              <td style="color:var(--muted)">Feb 27, 2025</td>
            </tr>
          </tbody>
        </table>
        <div class="table-footer">
          <span>Showing 1-7 of 148 customers</span>
          <div class="pagination">
            <button><i class="fas fa-chevron-left"></i></button>
            <button class="active">1</button>
            <button>2</button>
            <button>3</button>
            <button>...</button>
            <button>22</button>
            <button><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Third Row: Quick Actions + Inbox + Top Products -->
    <div class="third-row">
      <div class="card anim-slide anim-d6">
        <div class="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div class="quick-actions">
          <div class="quick-action"><i class="fas fa-user-plus"></i><span>Add Customer</span></div>
          <div class="quick-action"><i class="fas fa-file-invoice"></i><span>New Invoice</span></div>
          <div class="quick-action"><i class="fas fa-chart-pie"></i><span>Run Report</span></div>
          <div class="quick-action"><i class="fas fa-paper-plane"></i><span>Send Email</span></div>
          <div class="quick-action"><i class="fas fa-tag"></i><span>Create Coupon</span></div>
          <div class="quick-action"><i class="fas fa-box"></i><span>Add Product</span></div>
        </div>
      </div>

      <div class="card anim-slide anim-d7">
        <div class="card-header">
          <div>
            <h3>Inbox</h3>
            <div class="subtitle">3 unread messages</div>
          </div>
          <button class="btn btn-ghost" style="padding:6px 12px;font-size:11px">View All</button>
        </div>
        <div class="inbox-list">
          <div class="inbox-item inbox-unread">
            <div class="inbox-avatar" style="background:linear-gradient(135deg,var(--accent),var(--pink))">SJ</div>
            <div class="inbox-body">
              <div class="inbox-top"><span class="inbox-sender">Sarah Johnson</span><span class="inbox-time">2m ago</span></div>
              <div class="inbox-preview">Hey, I wanted to discuss the enterprise pricing for our team...</div>
            </div>
          </div>
          <div class="inbox-item inbox-unread">
            <div class="inbox-avatar" style="background:linear-gradient(135deg,var(--accent2),var(--blue))">MC</div>
            <div class="inbox-body">
              <div class="inbox-top"><span class="inbox-sender">Mike Chen</span><span class="inbox-time">1h ago</span></div>
              <div class="inbox-preview">The new dashboard feature looks great! Quick question about...</div>
            </div>
          </div>
          <div class="inbox-item inbox-unread">
            <div class="inbox-avatar" style="background:linear-gradient(135deg,var(--green),var(--accent2))">ED</div>
            <div class="inbox-body">
              <div class="inbox-top"><span class="inbox-sender">Emily Davis</span><span class="inbox-time">3h ago</span></div>
              <div class="inbox-preview">Can you send me the updated invoice for February? Thanks!</div>
            </div>
          </div>
          <div class="inbox-item">
            <div class="inbox-avatar" style="background:linear-gradient(135deg,var(--amber),var(--red))">JW</div>
            <div class="inbox-body">
              <div class="inbox-top"><span class="inbox-sender">James Wilson</span><span class="inbox-time">Yesterday</span></div>
              <div class="inbox-preview">Thanks for the quick response. I'll review and get back to you.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card anim-slide anim-d8">
        <div class="card-header">
          <div>
            <h3>Top Products</h3>
            <div class="subtitle">Best sellers this month</div>
          </div>
        </div>
        <div class="products-list">
          <div class="product-item">
            <div class="product-rank">1</div>
            <div class="product-img">📊</div>
            <div class="product-info"><div class="product-name">Analytics Pro</div><div class="product-category">SaaS</div></div>
            <div><div class="product-revenue">$12,480</div><div class="product-units">248 sold</div></div>
          </div>
          <div class="product-item">
            <div class="product-rank">2</div>
            <div class="product-img">🚀</div>
            <div class="product-info"><div class="product-name">Growth Suite</div><div class="product-category">Bundle</div></div>
            <div><div class="product-revenue">$9,840</div><div class="product-units">164 sold</div></div>
          </div>
          <div class="product-item">
            <div class="product-rank">3</div>
            <div class="product-img">🔒</div>
            <div class="product-info"><div class="product-name">Security Shield</div><div class="product-category">Add-on</div></div>
            <div><div class="product-revenue">$7,200</div><div class="product-units">360 sold</div></div>
          </div>
          <div class="product-item">
            <div class="product-rank">4</div>
            <div class="product-img">📧</div>
            <div class="product-info"><div class="product-name">Email Automator</div><div class="product-category">SaaS</div></div>
            <div><div class="product-revenue">$5,640</div><div class="product-units">188 sold</div></div>
          </div>
          <div class="product-item">
            <div class="product-rank">5</div>
            <div class="product-img">🎯</div>
            <div class="product-info"><div class="product-name">Campaign Manager</div><div class="product-category">SaaS</div></div>
            <div><div class="product-revenue">$4,920</div><div class="product-units">123 sold</div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>

<script>
/* ===== SIDEBAR NAV ===== */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

/* ===== DATE RANGE TABS ===== */
document.querySelectorAll('.date-range .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.date-range .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

/* ===== CHART TABS ===== */
document.querySelectorAll('.card-tabs').forEach(group => {
  group.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

/* ===== STAT COUNTER ANIMATION ===== */
function animateCounter(el, target, prefix, suffix) {
  let current = 0;
  const step = target / 40;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = prefix + (target >= 1000 ? Math.floor(current).toLocaleString() : (Number.isInteger(target) ? Math.floor(current) : current.toFixed(1))) + suffix;
  }, 30);
}
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const vals = e.target.querySelectorAll('.stat-value');
      vals.forEach(v => {
        const text = v.textContent.trim();
        if (text.startsWith('$')) {
          const num = parseFloat(text.replace(/[$,]/g, ''));
          animateCounter(v, num, '$', num >= 1000 ? '' : '');
        } else if (text.endsWith('%')) {
          animateCounter(v, parseFloat(text), '', '%');
        } else {
          const num = parseFloat(text.replace(/,/g, ''));
          animateCounter(v, num, '', '');
        }
      });
      statObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
const sg = document.querySelector('.stats-grid');
if (sg) statObserver.observe(sg);

/* ===== SPARKLINE HOVER ===== */
document.querySelectorAll('.stat-sparkline span').forEach(bar => {
  bar.addEventListener('mouseenter', () => { bar.style.opacity = '1'; bar.style.transform = 'scaleY(1.15)'; });
  bar.addEventListener('mouseleave', () => { bar.style.opacity = ''; bar.style.transform = ''; });
});

/* ===== SEARCH SHORTCUT (Cmd/Ctrl+K) ===== */
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const search = document.querySelector('.topbar-search');
    if (search) search.focus();
  }
});

/* ===== TABLE ROW CLICK ===== */
document.querySelectorAll('tbody tr').forEach(row => {
  row.style.cursor = 'pointer';
  row.addEventListener('click', () => {
    document.querySelectorAll('tbody tr').forEach(r => r.style.background = '');
    row.style.background = 'rgba(124,58,237,.05)';
  });
});

/* ===== PAGINATION ===== */
document.querySelectorAll('.pagination button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.textContent === '...') return;
    document.querySelectorAll('.pagination button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ===== NOTIFICATION DOT CLICK ===== */
document.querySelectorAll('.topbar-icon').forEach(icon => {
  icon.addEventListener('click', () => {
    const dot = icon.querySelector('.notif-dot');
    if (dot) dot.style.display = 'none';
  });
});

/* ===== QUICK ACTION HOVER EFFECT ===== */
document.querySelectorAll('.quick-action').forEach(action => {
  action.addEventListener('mouseenter', () => {
    action.querySelector('i').style.transform = 'scale(1.2)';
    action.querySelector('i').style.transition = 'transform .2s';
  });
  action.addEventListener('mouseleave', () => {
    action.querySelector('i').style.transform = '';
  });
});

/* ═══ MAGIC UI — Glow Card Mouse Track ═══ */
document.querySelectorAll('.glow-card').forEach(card => {
  const glow = document.createElement('div');
  glow.className = 'glow-effect';
  card.style.position = 'relative';
  card.appendChild(glow);
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    glow.style.left = (e.clientX - rect.left) + 'px';
    glow.style.top = (e.clientY - rect.top) + 'px';
  });
});
</script>
</body>
</html>`, language: 'html' },
    },
  },
  {
    name: 'Portfolio', desc: 'Premium designer portfolio — 12 sections, scroll animations, dark theme, project showcases', icon: '🎨',
    files: {
      'index.html': { content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Alex Chen — Designer & Developer Portfolio</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
/* ═══════════════════════════════════════
   FONTS
   ═══════════════════════════════════════ */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');

/* ═══════════════════════════════════════
   RESET & VARIABLES
   ═══════════════════════════════════════ */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root {
  --bg: #050505;
  --bg-card: #0c0c0c;
  --bg-hover: #111;
  --text: #f5f5f5;
  --text-secondary: #a1a1aa;
  --muted: #71717a;
  --accent: #a78bfa;
  --accent-pink: #f472b6;
  --accent-orange: #fb923c;
  --accent-cyan: #22d3ee;
  --accent-green: #34d399;
  --border: #1e1e1e;
  --border-hover: #333;
  --radius: 16px;
  --radius-lg: 24px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.3);
  --shadow-md: 0 4px 16px rgba(0,0,0,.4);
  --shadow-lg: 0 12px 48px rgba(0,0,0,.5);
  --shadow-glow: 0 0 60px rgba(167,139,250,.08);
  --transition: .3s cubic-bezier(.4,0,.2,1);
  --transition-slow: .6s cubic-bezier(.4,0,.2,1);
}
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; overflow-x: hidden; }
img { max-width: 100%; display: block; }
a { text-decoration: none; color: inherit; }
button { cursor: pointer; border: none; background: none; font-family: inherit; }

/* ═══════════════════════════════════════
   UTILITY CLASSES
   ═══════════════════════════════════════ */
.container { max-width: 1100px; margin: 0 auto; padding: 0 28px; }
.section-label { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border: 1px solid var(--border); border-radius: 100px; font-size: 11px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px; }
.section-heading { font-family: 'Space Grotesk', sans-serif; font-size: clamp(32px, 5vw, 48px); font-weight: 700; letter-spacing: -.03em; line-height: 1.1; margin-bottom: 20px; }
.section-desc { font-size: 16px; color: var(--text-secondary); max-width: 540px; line-height: 1.7; }
.gradient-text { background: linear-gradient(135deg, var(--accent), var(--accent-pink), var(--accent-orange)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.gradient-text-cyan { background: linear-gradient(135deg, var(--accent-cyan), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

/* ═══════════════════════════════════════
   KEYFRAME ANIMATIONS
   ═══════════════════════════════════════ */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInLeft { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
@keyframes fadeInRight { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes morph { 0%,100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; } 50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; } }
@keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes typewriter { from { width: 0; } to { width: 100%; } }
@keyframes blink { 0%,100% { border-color: var(--accent); } 50% { border-color: transparent; } }
@keyframes slideInStagger { from { opacity: 0; transform: translateY(20px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes glow-pulse { 0%,100% { box-shadow: 0 0 20px rgba(167,139,250,.1); } 50% { box-shadow: 0 0 40px rgba(167,139,250,.2); } }
@keyframes orbit { from { transform: rotate(0deg) translateX(120px) rotate(0deg); } to { transform: rotate(360deg) translateX(120px) rotate(-360deg); } }

/* Reveal animations */
.reveal { opacity: 0; transform: translateY(32px); transition: all var(--transition-slow); }
.reveal.visible { opacity: 1; transform: translateY(0); }
.reveal-left { opacity: 0; transform: translateX(-40px); transition: all var(--transition-slow); }
.reveal-left.visible { opacity: 1; transform: translateX(0); }
.reveal-right { opacity: 0; transform: translateX(40px); transition: all var(--transition-slow); }
.reveal-right.visible { opacity: 1; transform: translateX(0); }
.reveal-scale { opacity: 0; transform: scale(.9); transition: all var(--transition-slow); }
.reveal-scale.visible { opacity: 1; transform: scale(1); }

/* Stagger delays */
.delay-1 { transition-delay: .1s !important; }
.delay-2 { transition-delay: .2s !important; }
.delay-3 { transition-delay: .3s !important; }
.delay-4 { transition-delay: .4s !important; }
.delay-5 { transition-delay: .5s !important; }
.delay-6 { transition-delay: .6s !important; }

/* ═══════════════════════════════════════
   CUSTOM CURSOR (desktop only)
   ═══════════════════════════════════════ */
.cursor-dot { position: fixed; width: 8px; height: 8px; background: var(--accent); border-radius: 50%; pointer-events: none; z-index: 9999; transition: transform .1s ease, opacity .3s; mix-blend-mode: difference; }
.cursor-ring { position: fixed; width: 36px; height: 36px; border: 1.5px solid var(--accent); border-radius: 50%; pointer-events: none; z-index: 9998; transition: transform .15s ease, width .3s, height .3s, opacity .3s; }
.cursor-ring.hover { width: 56px; height: 56px; border-color: var(--accent-pink); }

/* ═══════════════════════════════════════
   NOISE OVERLAY
   ═══════════════════════════════════════ */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 10000;
  pointer-events: none;
  opacity: .025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px;
}

/* ═══════════════════════════════════════
   1. NAVIGATION
   ═══════════════════════════════════════ */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0 28px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  backdrop-filter: blur(16px) saturate(1.8);
  -webkit-backdrop-filter: blur(16px) saturate(1.8);
  background: rgba(5,5,5,.7);
  border-bottom: 1px solid transparent;
  transition: all var(--transition);
}
.nav.scrolled { border-bottom-color: var(--border); background: rgba(5,5,5,.92); }
.nav .logo {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: -.02em;
}
.nav .logo .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2s ease infinite;
}
.nav-links { display: flex; align-items: center; gap: 8px; }
.nav-links a {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  border-radius: 8px;
  transition: all var(--transition);
  position: relative;
}
.nav-links a:hover { color: var(--text); background: rgba(255,255,255,.04); }
.nav-links a.active { color: var(--text); }
.nav-cta {
  margin-left: 12px;
  padding: 9px 22px;
  background: var(--text);
  color: var(--bg);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  transition: all var(--transition);
}
.nav-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(255,255,255,.15); }

/* Mobile nav toggle */
.nav-toggle { display: none; width: 24px; height: 18px; flex-direction: column; justify-content: space-between; }
.nav-toggle span { display: block; height: 2px; background: var(--text); border-radius: 2px; transition: all .3s; }

/* ═══════════════════════════════════════
   2. HERO SECTION
   ═══════════════════════════════════════ */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.hero-bg .orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: .15;
  animation: float 8s ease-in-out infinite;
}
.hero-bg .orb-1 { width: 500px; height: 500px; background: var(--accent); top: -100px; right: -100px; }
.hero-bg .orb-2 { width: 400px; height: 400px; background: var(--accent-pink); bottom: -50px; left: -100px; animation-delay: -3s; }
.hero-bg .orb-3 { width: 300px; height: 300px; background: var(--accent-cyan); top: 50%; left: 50%; animation-delay: -5s; }
.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 70%);
}
.hero .container {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 60px;
  align-items: center;
  padding-top: 72px;
}
.hero-content { padding: 40px 0; }
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px 6px 8px;
  border: 1px solid var(--border);
  border-radius: 100px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 28px;
  animation: fadeInUp .8s ease forwards;
}
.hero-badge .status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-green);
  animation: pulse 2s ease infinite;
}
.hero h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(42px, 6vw, 68px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -.04em;
  margin-bottom: 24px;
  animation: fadeInUp .8s ease .1s forwards;
  opacity: 0;
}
.hero-desc {
  font-size: 17px;
  color: var(--text-secondary);
  max-width: 460px;
  line-height: 1.75;
  margin-bottom: 36px;
  animation: fadeInUp .8s ease .2s forwards;
  opacity: 0;
}
.hero-btns {
  display: flex;
  gap: 12px;
  animation: fadeInUp .8s ease .3s forwards;
  opacity: 0;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  transition: all .25s;
}
.btn-primary { background: var(--text); color: var(--bg); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(255,255,255,.15); }
.btn-secondary { border: 1px solid var(--border); color: var(--text-secondary); }
.btn-secondary:hover { border-color: var(--border-hover); color: var(--text); background: rgba(255,255,255,.03); }
.btn-accent { background: var(--accent); color: #fff; }
.btn-accent:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(167,139,250,.3); }

/* Hero visual — animated shape */
.hero-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeInRight .8s ease .3s forwards;
  opacity: 0;
  position: relative;
}
.hero-shape {
  width: 380px;
  height: 380px;
  background: linear-gradient(135deg, var(--accent), var(--accent-pink));
  animation: morph 8s ease-in-out infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.hero-shape::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, var(--accent), var(--accent-pink), var(--accent-orange));
  animation: morph 8s ease-in-out infinite;
  z-index: -1;
  filter: blur(20px);
  opacity: .4;
}
.hero-shape-inner {
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  background: var(--bg);
  border-radius: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.hero-shape-inner .big { font-family: 'Space Grotesk', sans-serif; font-size: 64px; font-weight: 700; }
.hero-shape-inner .sub { font-size: 14px; color: var(--muted); font-weight: 500; }

/* Floating orbit elements */
.hero-orbit { position: absolute; width: 280px; height: 280px; }
.hero-orbit-item {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  animation: orbit 20s linear infinite;
  box-shadow: var(--shadow-md);
}
.hero-orbit-item:nth-child(2) { animation-delay: -5s; animation-duration: 25s; }
.hero-orbit-item:nth-child(3) { animation-delay: -10s; animation-duration: 18s; }
.hero-orbit-item:nth-child(4) { animation-delay: -15s; animation-duration: 22s; }

/* Hero stats */
.hero-stats {
  display: flex;
  gap: 32px;
  margin-top: 48px;
  animation: fadeInUp .8s ease .45s forwards;
  opacity: 0;
}
.hero-stat { text-align: left; }
.hero-stat .num {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}
.hero-stat .lbl { font-size: 12px; color: var(--muted); font-weight: 500; }

/* ═══════════════════════════════════════
   3. MARQUEE / LOGOS
   ═══════════════════════════════════════ */
.marquee-section {
  padding: 48px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
  position: relative;
}
.marquee-label {
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 600;
  margin-bottom: 28px;
}
.marquee-track {
  display: flex;
  animation: marquee 30s linear infinite;
  width: max-content;
}
.marquee-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 48px;
  font-size: 20px;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  transition: color .3s;
}
.marquee-item:hover { color: var(--text-secondary); }
.marquee-item i { font-size: 24px; }

/* ═══════════════════════════════════════
   4. ABOUT SECTION
   ═══════════════════════════════════════ */
.about { padding: 120px 0; }
.about-grid {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 64px;
  align-items: center;
}
.about-image {
  aspect-ratio: 3/4;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
}
.about-image::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 50%, var(--bg));
}
.about-image .placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120px;
  opacity: .15;
}
.about-image .exp-badge {
  position: absolute;
  bottom: 24px;
  left: 24px;
  z-index: 2;
  padding: 16px 20px;
  background: rgba(5,5,5,.8);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid var(--border);
}
.about-image .exp-badge .num { font-family: 'Space Grotesk'; font-size: 28px; font-weight: 700; }
.about-image .exp-badge .lbl { font-size: 11px; color: var(--muted); }
.about-content .section-desc { margin-bottom: 32px; }
.about-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 36px;
}
.about-detail {
  padding: 20px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  transition: all var(--transition);
}
.about-detail:hover { border-color: var(--border-hover); transform: translateY(-2px); }
.about-detail .icon { font-size: 20px; margin-bottom: 10px; }
.about-detail h4 { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.about-detail p { font-size: 12px; color: var(--muted); line-height: 1.5; }
.about-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.about-tags span {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all var(--transition);
}
.about-tags span:hover { border-color: var(--accent); color: var(--accent); background: rgba(167,139,250,.05); }

/* ═══════════════════════════════════════
   5. SERVICES / WHAT I DO
   ═══════════════════════════════════════ */
.services { padding: 120px 0; border-top: 1px solid var(--border); }
.services-header { text-align: center; margin-bottom: 64px; }
.services-header .section-desc { margin: 0 auto; }
.services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.service-card {
  padding: 36px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-card);
  transition: all .4s cubic-bezier(.4,0,.2,1);
  position: relative;
  overflow: hidden;
}
.service-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0;
  transition: opacity .4s;
}
.service-card:hover { border-color: var(--border-hover); transform: translateY(-6px); box-shadow: var(--shadow-glow); }
.service-card:hover::before { opacity: 1; }
.service-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 20px;
  position: relative;
}
.service-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
.service-card p { font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 20px; }
.service-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.service-tags span { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; border: 1px solid var(--border); color: var(--muted); }

/* ═══════════════════════════════════════
   6. SELECTED WORK / PROJECTS
   ═══════════════════════════════════════ */
.work { padding: 120px 0; }
.work-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 64px;
}
.work-filters { display: flex; gap: 6px; }
.work-filter {
  padding: 8px 18px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  border: 1px solid transparent;
  transition: all var(--transition);
}
.work-filter:hover { color: var(--text); }
.work-filter.active { border-color: var(--border); color: var(--text); background: rgba(255,255,255,.03); }

/* Project large card */
.project-featured {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  margin-bottom: 20px;
  transition: all .4s;
  background: var(--bg-card);
}
.project-featured:hover { border-color: var(--border-hover); transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.project-thumb {
  min-height: 420px;
  position: relative;
  overflow: hidden;
}
.project-thumb .gradient-overlay {
  position: absolute;
  inset: 0;
  transition: opacity .4s;
}
.project-thumb .view-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(.8);
  padding: 12px 28px;
  background: var(--text);
  color: var(--bg);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
  opacity: 0;
  transition: all .4s;
}
.project-featured:hover .view-label { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.project-info {
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.project-year { font-size: 12px; color: var(--muted); font-weight: 600; margin-bottom: 12px; }
.project-info h3 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -.02em;
  margin-bottom: 12px;
}
.project-info .desc { font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 24px; }
.project-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 28px; }
.project-tags span {
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border);
  color: var(--muted);
}
.project-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  transition: gap .2s;
}
.project-link:hover { gap: 12px; }

/* Project small grid */
.projects-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.project-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  background: var(--bg-card);
  transition: all .4s;
  cursor: pointer;
}
.project-card:hover { border-color: var(--border-hover); transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.project-card .thumb { height: 240px; position: relative; overflow: hidden; }
.project-card .thumb .view-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(.8);
  padding: 10px 24px;
  background: var(--text);
  color: var(--bg);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
  opacity: 0;
  transition: all .4s;
}
.project-card:hover .view-label { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.project-card .card-info { padding: 24px; }
.project-card .card-info h3 { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.project-card .card-info p { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
.project-card .card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.project-card .card-tags span { padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; border: 1px solid var(--border); color: var(--muted); }

/* ═══════════════════════════════════════
   7. EXPERIENCE / TIMELINE
   ═══════════════════════════════════════ */
.experience { padding: 120px 0; border-top: 1px solid var(--border); }
.experience-header { margin-bottom: 64px; }
.timeline { position: relative; padding-left: 40px; }
.timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(to bottom, var(--accent), var(--border));
  border-radius: 2px;
}
.timeline-item {
  position: relative;
  padding-bottom: 48px;
}
.timeline-item:last-child { padding-bottom: 0; }
.timeline-dot {
  position: absolute;
  left: -40px;
  top: 6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid var(--accent);
  background: var(--bg);
  z-index: 1;
}
.timeline-item:first-child .timeline-dot { background: var(--accent); animation: glow-pulse 2s ease infinite; }
.timeline-content {
  padding: 24px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-card);
  transition: all var(--transition);
}
.timeline-content:hover { border-color: var(--border-hover); transform: translateX(4px); }
.timeline-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
.timeline-header h3 { font-size: 16px; font-weight: 700; }
.timeline-header .period { font-size: 12px; color: var(--accent); font-weight: 600; }
.timeline-company { font-size: 14px; color: var(--text-secondary); margin-bottom: 10px; }
.timeline-desc { font-size: 13px; color: var(--muted); line-height: 1.7; }
.timeline-stack { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
.timeline-stack span { padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; border: 1px solid var(--border); color: var(--muted); }

/* ═══════════════════════════════════════
   8. SKILLS / TECH STACK
   ═══════════════════════════════════════ */
.skills { padding: 120px 0; }
.skills-header { text-align: center; margin-bottom: 64px; }
.skills-header .section-desc { margin: 0 auto; }
.skills-categories { display: flex; flex-direction: column; gap: 40px; }
.skill-category h3 { font-size: 14px; font-weight: 700; color: var(--text-secondary); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; }
.skill-items { display: flex; flex-wrap: wrap; gap: 10px; }
.skill-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  transition: all var(--transition);
  cursor: default;
}
.skill-item:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(167,139,250,.08); }
.skill-item i { font-size: 18px; width: 20px; text-align: center; }
.skill-item span { font-size: 13px; font-weight: 600; }

/* Skill bars */
.skill-bars { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 40px; }
.skill-bar-item { padding: 20px; border-radius: 14px; border: 1px solid var(--border); background: var(--bg-card); }
.skill-bar-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.skill-bar-header span { font-size: 13px; font-weight: 600; }
.skill-bar-header .pct { color: var(--accent); }
.skill-bar-track { height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; }
.skill-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--accent), var(--accent-pink));
  transition: width 1.5s cubic-bezier(.4,0,.2,1);
  width: 0;
}
.skill-bar-item.visible .skill-bar-fill { /* width set inline */ }

/* ═══════════════════════════════════════
   9. TESTIMONIALS
   ═══════════════════════════════════════ */
.testimonials { padding: 120px 0; border-top: 1px solid var(--border); }
.testimonials-header { text-align: center; margin-bottom: 64px; }
.testimonials-header .section-desc { margin: 0 auto; }
.testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.testimonial-card {
  padding: 32px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-card);
  transition: all .4s;
  position: relative;
}
.testimonial-card:hover { border-color: var(--border-hover); transform: translateY(-4px); }
.testimonial-card .quote-icon { font-size: 32px; color: var(--accent); opacity: .3; margin-bottom: 16px; line-height: 1; }
.testimonial-card .text { font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 24px; font-style: italic; }
.testimonial-card .author { display: flex; align-items: center; gap: 12px; }
.testimonial-card .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}
.testimonial-card .author-info .name { font-size: 13px; font-weight: 700; }
.testimonial-card .author-info .role { font-size: 11px; color: var(--muted); }
.testimonial-card .stars { display: flex; gap: 2px; margin-bottom: 12px; }
.testimonial-card .stars i { font-size: 12px; color: #fbbf24; }

/* ═══════════════════════════════════════
   10. BLOG / WRITINGS
   ═══════════════════════════════════════ */
.blog { padding: 120px 0; }
.blog-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 48px;
}
.blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.blog-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  background: var(--bg-card);
  transition: all .4s;
  cursor: pointer;
}
.blog-card:hover { border-color: var(--border-hover); transform: translateY(-4px); }
.blog-card .blog-img { height: 180px; position: relative; }
.blog-card .blog-body { padding: 24px; }
.blog-card .blog-meta { display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--muted); margin-bottom: 10px; }
.blog-card .blog-meta .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--muted); }
.blog-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; line-height: 1.4; }
.blog-card p { font-size: 13px; color: var(--muted); line-height: 1.6; }

/* ═══════════════════════════════════════
   11. CONTACT SECTION
   ═══════════════════════════════════════ */
.contact { padding: 120px 0; border-top: 1px solid var(--border); }
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
}
.contact-left .section-heading { margin-bottom: 16px; }
.contact-left .section-desc { margin-bottom: 40px; }
.contact-info { display: flex; flex-direction: column; gap: 20px; margin-bottom: 40px; }
.contact-info-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  transition: all var(--transition);
}
.contact-info-item:hover { border-color: var(--border-hover); transform: translateX(4px); }
.contact-info-item .icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(167,139,250,.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  font-size: 16px;
}
.contact-info-item .info-text { font-size: 14px; font-weight: 600; }
.contact-info-item .info-sub { font-size: 12px; color: var(--muted); }
.contact-socials { display: flex; gap: 10px; }
.contact-socials a {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--muted);
  transition: all var(--transition);
}
.contact-socials a:hover { color: var(--accent); border-color: var(--accent); background: rgba(167,139,250,.05); transform: translateY(-2px); }

/* Contact form */
.contact-form {
  padding: 40px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-card);
}
.contact-form h3 { font-size: 20px; font-weight: 700; margin-bottom: 24px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-secondary); }
.form-group input, .form-group textarea, .form-group select {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border var(--transition);
}
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--accent); }
.form-group textarea { min-height: 120px; resize: vertical; }
.form-submit {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  transition: all .25s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.form-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(167,139,250,.3); }

/* ═══════════════════════════════════════
   12. FOOTER
   ═══════════════════════════════════════ */
.footer {
  padding: 64px 0 32px;
  border-top: 1px solid var(--border);
}
.footer-top {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 48px;
  margin-bottom: 48px;
}
.footer-brand .logo {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.footer-brand .logo .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.footer-brand p { font-size: 14px; color: var(--muted); line-height: 1.7; max-width: 280px; }
.footer-col h4 { font-size: 13px; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: .5px; }
.footer-col a { display: block; font-size: 13px; color: var(--muted); padding: 4px 0; transition: color var(--transition); }
.footer-col a:hover { color: var(--text); }
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--muted);
}
.footer-bottom .social-links { display: flex; gap: 16px; }
.footer-bottom .social-links a { color: var(--muted); transition: color var(--transition); font-size: 14px; }
.footer-bottom .social-links a:hover { color: var(--text); }

/* ═══════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════ */
@media (max-width: 900px) {
  .hero .container { grid-template-columns: 1fr; text-align: center; }
  .hero-content { order: 2; }
  .hero-visual { order: 1; }
  .hero-desc { margin-left: auto; margin-right: auto; }
  .hero-btns { justify-content: center; }
  .hero-stats { justify-content: center; }
  .hero-shape { width: 260px; height: 260px; }
  .about-grid { grid-template-columns: 1fr; }
  .about-image { max-height: 400px; }
  .services-grid { grid-template-columns: 1fr; }
  .project-featured { grid-template-columns: 1fr; }
  .project-thumb { min-height: 260px; }
  .projects-grid { grid-template-columns: 1fr; }
  .testimonials-grid { grid-template-columns: 1fr; }
  .blog-grid { grid-template-columns: 1fr; }
  .contact-grid { grid-template-columns: 1fr; }
  .footer-top { grid-template-columns: 1fr 1fr; }
  .skill-bars { grid-template-columns: 1fr; }
  .nav-links { display: none; }
  .nav-toggle { display: flex; }
  .form-row { grid-template-columns: 1fr; }
  .work-header { flex-direction: column; align-items: flex-start; gap: 20px; }
  .cursor-dot, .cursor-ring { display: none !important; }
}
@media (max-width: 600px) {
  .about-details { grid-template-columns: 1fr; }
  .footer-top { grid-template-columns: 1fr; }
  .hero-stats { flex-direction: column; gap: 16px; }
  .container { padding: 0 20px; }
}

/* ═══ MAGIC UI — Border Beam ═══ */
@property --beam-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
.border-beam{position:relative;overflow:hidden}.border-beam::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:2px;background:conic-gradient(from var(--beam-angle),transparent 60%,var(--accent) 80%,transparent 100%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:beam-spin 4s linear infinite;pointer-events:none;z-index:2}@keyframes beam-spin{to{--beam-angle:360deg}}
/* ═══ MAGIC UI — Shimmer CTA ═══ */
.shimmer-btn{position:relative;overflow:hidden;isolation:isolate}.shimmer-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);animation:shimmer-sweep 3s ease-in-out infinite;z-index:1}@keyframes shimmer-sweep{0%,100%{left:-100%}50%{left:150%}}
/* ═══ MAGIC UI — Dot Pattern ═══ */
.magic-dots{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(167,139,250,.1) 1px,transparent 1px);background-size:24px 24px;pointer-events:none;mask-image:radial-gradient(ellipse at center,black 30%,transparent 70%);z-index:0}
/* ═══ MAGIC UI — Meteors ═══ */
.magic-meteors{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.magic-meteor{position:absolute;width:2px;height:80px;background:linear-gradient(to bottom,rgba(167,139,250,.6),transparent);transform:rotate(-35deg);animation:meteor-fall linear infinite;opacity:0}
.magic-meteor::before{content:'';position:absolute;top:0;left:-1px;width:4px;height:4px;border-radius:50%;background:rgba(167,139,250,.9);box-shadow:0 0 8px 2px rgba(167,139,250,.3)}
@keyframes meteor-fall{0%{transform:translate(0,0) rotate(-35deg);opacity:0}5%{opacity:1}95%{opacity:.3}100%{transform:translate(-400px,800px) rotate(-35deg);opacity:0}}
/* ═══ MAGIC UI — Glow Card ═══ */
.glow-card{position:relative;overflow:hidden;z-index:1}.glow-card .glow-effect{position:absolute;width:400px;height:400px;background:radial-gradient(circle,rgba(167,139,250,.1),transparent 70%);border-radius:50%;opacity:0;transition:opacity .5s;pointer-events:none;transform:translate(-50%,-50%);z-index:0}.glow-card:hover .glow-effect{opacity:1}
/* ═══ MAGIC UI — Blur Fade ═══ */
.magic-reveal{opacity:0;filter:blur(6px);transform:translateY(20px);transition:all .8s cubic-bezier(.22,1,.36,1)}.magic-reveal.visible{opacity:1;filter:blur(0);transform:translateY(0)}
/* ═══ MAGIC UI — Shine Border ═══ */
.shine-border{position:relative;overflow:hidden;z-index:1}.shine-border::before{content:'';position:absolute;inset:-3px;border-radius:inherit;background:conic-gradient(from 0deg,transparent,#a78bfa,#f472b6,#22d3ee,transparent);animation:shine-rotate 6s linear infinite;z-index:-1}@keyframes shine-rotate{to{transform:rotate(360deg)}}
/* ═══ MAGIC UI — Ripple ═══ */
.magic-ripple{position:absolute;left:50%;top:50%;pointer-events:none;z-index:0}.magic-ripple span{position:absolute;border:1px solid rgba(167,139,250,.06);border-radius:50%;animation:ripple-out 6s linear infinite}@keyframes ripple-out{0%{width:0;height:0;opacity:.5;top:0;left:0}100%{width:800px;height:800px;opacity:0;top:-400px;left:-400px}}
/* ═══ MAGIC UI — Pulse Dot ═══ */
.magic-dot{width:8px;height:8px;border-radius:50%;background:var(--accent-green);box-shadow:0 0 0 0 rgba(52,211,153,.4);animation:magic-pulse 2s infinite;display:inline-block}@keyframes magic-pulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.4)}70%{box-shadow:0 0 0 12px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
</style>
</head>
<body>

<!-- Custom Cursor -->
<div class="cursor-dot" id="cursor-dot"></div>
<div class="cursor-ring" id="cursor-ring"></div>

<!-- ═══════════════ 1. NAVIGATION ═══════════════ -->
<nav class="nav" id="nav">
  <div class="logo"><span class="dot"></span> Alex Chen</div>
  <div class="nav-links">
    <a href="#about">About</a>
    <a href="#services">Services</a>
    <a href="#work">Work</a>
    <a href="#experience">Experience</a>
    <a href="#blog">Blog</a>
    <a href="#contact" class="nav-cta">Let's Talk</a>
  </div>
  <button class="nav-toggle" id="nav-toggle" onclick="document.querySelector('.nav-links').style.display=document.querySelector('.nav-links').style.display==='flex'?'none':'flex'">
    <span></span><span></span><span></span>
  </button>
</nav>

<!-- ═══════════════ 2. HERO ═══════════════ -->
<section class="hero" id="hero">
  <div class="hero-bg">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="hero-grid"></div>
    <div class="magic-dots"></div>
    <div class="magic-meteors">
      <div class="magic-meteor" style="top:-10%;left:15%;height:65px;animation-duration:4.5s;animation-delay:0s"></div>
      <div class="magic-meteor" style="top:-10%;left:45%;height:80px;animation-duration:5.5s;animation-delay:1.8s"></div>
      <div class="magic-meteor" style="top:-10%;left:70%;height:55px;animation-duration:3.8s;animation-delay:3.2s"></div>
      <div class="magic-meteor" style="top:-10%;left:90%;height:70px;animation-duration:6s;animation-delay:5s"></div>
    </div>
  </div>
  <div class="container">
    <div class="hero-content">
      <div class="hero-badge">
        <span class="status"></span>
        Available for new projects
      </div>
      <h1>I craft <span class="gradient-text">digital products</span> that people love</h1>
      <p class="hero-desc">Product designer and full-stack developer with 8+ years of experience building thoughtful, pixel-perfect digital products for startups and enterprises.</p>
      <div class="hero-btns">
        <a href="#work" class="btn btn-primary shimmer-btn">View Projects <i class="fas fa-arrow-down" style="font-size:12px"></i></a>
        <a href="#contact" class="btn btn-secondary">Get in Touch</a>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><div class="num">50+</div><div class="lbl">Projects Delivered</div></div>
        <div class="hero-stat"><div class="num">8+</div><div class="lbl">Years Experience</div></div>
        <div class="hero-stat"><div class="num">30+</div><div class="lbl">Happy Clients</div></div>
      </div>
    </div>
    <div class="hero-visual">
      <div class="hero-shape">
        <div class="hero-shape-inner">
          <div class="big" style="background:linear-gradient(135deg,var(--accent),var(--accent-pink));-webkit-background-clip:text;-webkit-text-fill-color:transparent">AC</div>
          <div class="sub">Designer & Developer</div>
        </div>
      </div>
      <div class="hero-orbit">
        <div class="hero-orbit-item"><i class="fab fa-figma" style="color:#a259ff"></i></div>
        <div class="hero-orbit-item"><i class="fab fa-react" style="color:#61dafb"></i></div>
        <div class="hero-orbit-item"><i class="fab fa-node-js" style="color:#68a063"></i></div>
        <div class="hero-orbit-item"><i class="fas fa-palette" style="color:var(--accent-pink)"></i></div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════ 3. MARQUEE / CLIENTS ═══════════════ -->
<section class="marquee-section">
  <div class="marquee-label">Trusted by leading companies</div>
  <div class="marquee-track">
    <div class="marquee-item"><i class="fab fa-google"></i> Google</div>
    <div class="marquee-item"><i class="fab fa-spotify"></i> Spotify</div>
    <div class="marquee-item"><i class="fab fa-stripe-s"></i> Stripe</div>
    <div class="marquee-item"><i class="fab fa-figma"></i> Figma</div>
    <div class="marquee-item"><i class="fab fa-slack"></i> Slack</div>
    <div class="marquee-item"><i class="fab fa-shopify"></i> Shopify</div>
    <div class="marquee-item"><i class="fab fa-airbnb"></i> Airbnb</div>
    <div class="marquee-item"><i class="fab fa-twitch"></i> Twitch</div>
    <!-- Duplicate for seamless loop -->
    <div class="marquee-item"><i class="fab fa-google"></i> Google</div>
    <div class="marquee-item"><i class="fab fa-spotify"></i> Spotify</div>
    <div class="marquee-item"><i class="fab fa-stripe-s"></i> Stripe</div>
    <div class="marquee-item"><i class="fab fa-figma"></i> Figma</div>
    <div class="marquee-item"><i class="fab fa-slack"></i> Slack</div>
    <div class="marquee-item"><i class="fab fa-shopify"></i> Shopify</div>
    <div class="marquee-item"><i class="fab fa-airbnb"></i> Airbnb</div>
    <div class="marquee-item"><i class="fab fa-twitch"></i> Twitch</div>
  </div>
</section>

<!-- ═══════════════ 4. ABOUT ═══════════════ -->
<section class="about" id="about">
  <div class="container">
    <div class="about-grid">
      <div class="about-image reveal-left">
        <div class="placeholder">&#x1F9D1;&#x200D;&#x1F4BB;</div>
        <div class="exp-badge">
          <div class="num">8+</div>
          <div class="lbl">Years of Experience</div>
        </div>
      </div>
      <div class="about-content reveal-right">
        <span class="section-label">About Me</span>
        <h2 class="section-heading">Turning complex problems into<br><span class="gradient-text">elegant solutions</span></h2>
        <p class="section-desc">I'm a product designer and full-stack developer based in San Francisco. I specialize in creating intuitive digital experiences that bridge the gap between user needs and business goals.</p>
        <p class="section-desc" style="margin-bottom:32px;margin-top:16px">With a background in both design and engineering, I bring a unique perspective to every project — understanding both the creative vision and the technical constraints that shape great products.</p>
        <div class="about-details">
          <div class="about-detail">
            <div class="icon">&#x1F3A8;</div>
            <h4>Design</h4>
            <p>UI/UX, Design Systems, Prototyping, User Research</p>
          </div>
          <div class="about-detail">
            <div class="icon">&#x1F4BB;</div>
            <h4>Engineering</h4>
            <p>React, Next.js, Node.js, TypeScript, PostgreSQL</p>
          </div>
          <div class="about-detail">
            <div class="icon">&#x1F680;</div>
            <h4>Product</h4>
            <p>Strategy, Roadmapping, Analytics, Growth</p>
          </div>
          <div class="about-detail">
            <div class="icon">&#x2728;</div>
            <h4>Motion</h4>
            <p>Framer Motion, GSAP, Lottie, CSS Animations</p>
          </div>
        </div>
        <div class="about-tags">
          <span>Figma</span><span>React</span><span>Next.js</span><span>TypeScript</span>
          <span>Node.js</span><span>PostgreSQL</span><span>Tailwind</span><span>Framer Motion</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════ 5. SERVICES ═══════════════ -->
<section class="services" id="services">
  <div class="container">
    <div class="services-header">
      <span class="section-label">What I Do</span>
      <h2 class="section-heading">Services I offer</h2>
      <p class="section-desc">From concept to launch, I provide end-to-end design and development services.</p>
    </div>
    <div class="services-grid">
      <div class="service-card glow-card reveal delay-1">
        <div class="service-icon" style="background:rgba(167,139,250,.1);color:var(--accent)"><i class="fas fa-pen-ruler"></i></div>
        <h3>Product Design</h3>
        <p>Complete product design from research to high-fidelity prototypes. Building intuitive interfaces that delight users.</p>
        <div class="service-tags"><span>UI/UX</span><span>Figma</span><span>Prototyping</span><span>Research</span></div>
      </div>
      <div class="service-card glow-card reveal delay-2">
        <div class="service-icon" style="background:rgba(34,211,238,.1);color:var(--accent-cyan)"><i class="fas fa-code"></i></div>
        <h3>Web Development</h3>
        <p>Modern, performant web applications built with the latest technologies. From landing pages to complex SaaS platforms.</p>
        <div class="service-tags"><span>React</span><span>Next.js</span><span>TypeScript</span><span>Node.js</span></div>
      </div>
      <div class="service-card glow-card reveal delay-3">
        <div class="service-icon" style="background:rgba(244,114,182,.1);color:var(--accent-pink)"><i class="fas fa-wand-magic-sparkles"></i></div>
        <h3>Motion & Interaction</h3>
        <p>Bringing interfaces to life with meaningful animations. Scroll-driven effects, micro-interactions, and transitions.</p>
        <div class="service-tags"><span>Framer Motion</span><span>GSAP</span><span>CSS</span><span>Lottie</span></div>
      </div>
      <div class="service-card glow-card reveal delay-4">
        <div class="service-icon" style="background:rgba(52,211,153,.1);color:var(--accent-green)"><i class="fas fa-mobile-screen"></i></div>
        <h3>Mobile Design</h3>
        <p>Native-feeling mobile experiences for iOS and Android. Responsive design that works beautifully on every device.</p>
        <div class="service-tags"><span>iOS</span><span>Android</span><span>React Native</span><span>Flutter</span></div>
      </div>
      <div class="service-card glow-card reveal delay-5">
        <div class="service-icon" style="background:rgba(251,146,60,.1);color:var(--accent-orange)"><i class="fas fa-paintbrush"></i></div>
        <h3>Brand Identity</h3>
        <p>Crafting memorable brand identities from logo design to complete visual systems and guidelines.</p>
        <div class="service-tags"><span>Logo</span><span>Guidelines</span><span>Typography</span><span>Color</span></div>
      </div>
      <div class="service-card glow-card reveal delay-6">
        <div class="service-icon" style="background:rgba(251,191,36,.1);color:#fbbf24"><i class="fas fa-lightbulb"></i></div>
        <h3>Consulting</h3>
        <p>Strategic design consulting, UX audits, and product direction for teams looking to level up their digital presence.</p>
        <div class="service-tags"><span>Strategy</span><span>Audits</span><span>Workshops</span><span>Mentoring</span></div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════ 6. SELECTED WORK ═══════════════ -->
<section class="work" id="work">
  <div class="container">
    <div class="work-header">
      <div>
        <span class="section-label">Selected Work</span>
        <h2 class="section-heading" style="margin-bottom:0">Featured projects</h2>
      </div>
      <div class="work-filters">
        <button class="work-filter active" onclick="filterWork(this,'all')">All</button>
        <button class="work-filter" onclick="filterWork(this,'design')">Design</button>
        <button class="work-filter" onclick="filterWork(this,'dev')">Development</button>
        <button class="work-filter" onclick="filterWork(this,'brand')">Branding</button>
      </div>
    </div>

    <!-- Featured Project 1 -->
    <div class="project-featured reveal" data-cat="design dev">
      <div class="project-thumb" style="background:linear-gradient(135deg,#1e1b4b,#312e81)">
        <div class="gradient-overlay" style="background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(168,85,247,.1))"></div>
        <span class="view-label">View Project</span>
      </div>
      <div class="project-info">
        <div class="project-year">2025 &mdash; Featured</div>
        <h3>Nexus Analytics Platform</h3>
        <p class="desc">A real-time analytics platform for SaaS companies. Designed and built the complete product from research to production launch, serving 10K+ daily active users.</p>
        <div class="project-tags"><span>Product Design</span><span>React</span><span>D3.js</span><span>Node.js</span></div>
        <a href="#" class="project-link">View Case Study <i class="fas fa-arrow-right" style="font-size:12px"></i></a>
      </div>
    </div>

    <!-- Project Grid -->
    <div class="projects-grid">
      <div class="project-card glow-card reveal delay-1" data-cat="brand design">
        <div class="thumb" style="background:linear-gradient(135deg,#134e4a,#065f46)">
          <span class="view-label">View</span>
        </div>
        <div class="card-info">
          <h3>GreenPulse</h3>
          <p>Sustainability tracking platform — brand identity & web app design</p>
          <div class="card-tags"><span>Branding</span><span>Web App</span><span>UI/UX</span></div>
        </div>
      </div>
      <div class="project-card glow-card reveal delay-2" data-cat="design dev">
        <div class="thumb" style="background:linear-gradient(135deg,#7c2d12,#9a3412)">
          <span class="view-label">View</span>
        </div>
        <div class="card-info">
          <h3>Craft Studio</h3>
          <p>Mobile-first design tool for creators — shipped to 50K+ users</p>
          <div class="card-tags"><span>Mobile</span><span>React Native</span><span>UI/UX</span></div>
        </div>
      </div>
      <div class="project-card glow-card reveal delay-3" data-cat="dev">
        <div class="thumb" style="background:linear-gradient(135deg,#1e3a5f,#0c4a6e)">
          <span class="view-label">View</span>
        </div>
        <div class="card-info">
          <h3>DataFlow API</h3>
          <p>High-performance REST & GraphQL API serving 1M+ requests daily</p>
          <div class="card-tags"><span>Node.js</span><span>GraphQL</span><span>PostgreSQL</span></div>
        </div>
      </div>
      <div class="project-card glow-card reveal delay-4" data-cat="brand">
        <div class="thumb" style="background:linear-gradient(135deg,#44403c,#292524)">
          <span class="view-label">View</span>
        </div>
        <div class="card-info">
          <h3>Monolith Brand</h3>
          <p>Complete brand identity for a fintech startup — logo to launch</p>
          <div class="card-tags"><span>Brand Identity</span><span>Logo</span><span>Guidelines</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════ 7. EXPERIENCE ═══════════════ -->
<section class="experience" id="experience">
  <div class="container">
    <div class="experience-header">
      <span class="section-label">Experience</span>
      <h2 class="section-heading">Where I've worked</h2>
    </div>
    <div class="timeline">
      <div class="timeline-item reveal">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h3>Senior Product Designer</h3>
            <span class="period">2023 — Present</span>
          </div>
          <div class="timeline-company">Stripe &mdash; San Francisco, CA</div>
          <div class="timeline-desc">Leading design for the Stripe Dashboard experience. Working with cross-functional teams to ship features used by millions of businesses globally. Established design system foundations.</div>
          <div class="timeline-stack"><span>Figma</span><span>React</span><span>TypeScript</span><span>Design Systems</span></div>
        </div>
      </div>
      <div class="timeline-item reveal delay-1">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h3>Product Designer & Engineer</h3>
            <span class="period">2021 — 2023</span>
          </div>
          <div class="timeline-company">Figma &mdash; San Francisco, CA</div>
          <div class="timeline-desc">Designed and built key features for FigJam and the prototyping experience. Led the interaction design for smart animate improvements and component properties.</div>
          <div class="timeline-stack"><span>Design</span><span>React</span><span>C++</span><span>WebAssembly</span></div>
        </div>
      </div>
      <div class="timeline-item reveal delay-2">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h3>UI/UX Designer</h3>
            <span class="period">2019 — 2021</span>
          </div>
          <div class="timeline-company">Spotify &mdash; New York, NY</div>
          <div class="timeline-desc">Worked on the Spotify for Artists platform. Redesigned the analytics dashboard, improved artist discovery features, and shipped the real-time listening activity feed.</div>
          <div class="timeline-stack"><span>Sketch</span><span>Vue.js</span><span>Data Viz</span><span>A/B Testing</span></div>
        </div>
      </div>
      <div class="timeline-item reveal delay-3">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h3>Junior Developer</h3>
            <span class="period">2017 — 2019</span>
          </div>
          <div class="timeline-company">Freelance &mdash; Remote</div>
          <div class="timeline-desc">Started my career building websites and apps for small businesses and startups. Developed a strong foundation in both design and front-end development.</div>
          <div class="timeline-stack"><span>HTML/CSS</span><span>JavaScript</span><span>WordPress</span><span>Photoshop</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════ 8. SKILLS ═══════════════ -->
<section class="skills" id="skills">
  <div class="container">
    <div class="skills-header">
      <span class="section-label">Tech Stack</span>
      <h2 class="section-heading">Skills & tools</h2>
      <p class="section-desc">A curated list of technologies and tools I use daily to bring ideas to life.</p>
    </div>
    <div class="skills-categories">
      <div class="skill-category reveal">
        <h3>Design</h3>
        <div class="skill-items">
          <div class="skill-item"><i class="fab fa-figma" style="color:#a259ff"></i><span>Figma</span></div>
          <div class="skill-item"><i class="fas fa-pen-nib" style="color:var(--accent-pink)"></i><span>Illustrator</span></div>
          <div class="skill-item"><i class="fas fa-image" style="color:#31a8ff"></i><span>Photoshop</span></div>
          <div class="skill-item"><i class="fas fa-film" style="color:var(--accent-orange)"></i><span>After Effects</span></div>
          <div class="skill-item"><i class="fas fa-vector-square" style="color:var(--accent-green)"></i><span>Framer</span></div>
          <div class="skill-item"><i class="fas fa-cube" style="color:var(--accent-cyan)"></i><span>Spline 3D</span></div>
        </div>
      </div>
      <div class="skill-category reveal delay-1">
        <h3>Frontend</h3>
        <div class="skill-items">
          <div class="skill-item"><i class="fab fa-react" style="color:#61dafb"></i><span>React</span></div>
          <div class="skill-item"><i class="fas fa-n" style="color:var(--text)"></i><span>Next.js</span></div>
          <div class="skill-item"><i class="fab fa-js" style="color:#f7df1e"></i><span>TypeScript</span></div>
          <div class="skill-item"><i class="fab fa-css3-alt" style="color:#264de4"></i><span>Tailwind CSS</span></div>
          <div class="skill-item"><i class="fas fa-wind" style="color:var(--accent)"></i><span>Framer Motion</span></div>
          <div class="skill-item"><i class="fas fa-chart-line" style="color:var(--accent-orange)"></i><span>D3.js</span></div>
        </div>
      </div>
      <div class="skill-category reveal delay-2">
        <h3>Backend & Tools</h3>
        <div class="skill-items">
          <div class="skill-item"><i class="fab fa-node-js" style="color:#68a063"></i><span>Node.js</span></div>
          <div class="skill-item"><i class="fas fa-database" style="color:#336791"></i><span>PostgreSQL</span></div>
          <div class="skill-item"><i class="fas fa-fire" style="color:#ff6f00"></i><span>Firebase</span></div>
          <div class="skill-item"><i class="fab fa-docker" style="color:#2496ed"></i><span>Docker</span></div>
          <div class="skill-item"><i class="fab fa-git-alt" style="color:#f05032"></i><span>Git</span></div>
          <div class="skill-item"><i class="fab fa-aws" style="color:#ff9900"></i><span>AWS</span></div>
        </div>
      </div>
    </div>

    <!-- Skill Bars -->
    <div class="skill-bars">
      <div class="skill-bar-item reveal">
        <div class="skill-bar-header"><span>UI/UX Design</span><span class="pct">95%</span></div>
        <div class="skill-bar-track"><div class="skill-bar-fill" data-width="95%"></div></div>
      </div>
      <div class="skill-bar-item reveal delay-1">
        <div class="skill-bar-header"><span>Frontend Development</span><span class="pct">92%</span></div>
        <div class="skill-bar-track"><div class="skill-bar-fill" data-width="92%"></div></div>
      </div>
      <div class="skill-bar-item reveal delay-2">
        <div class="skill-bar-header"><span>Backend Development</span><span class="pct">80%</span></div>
        <div class="skill-bar-track"><div class="skill-bar-fill" data-width="80%"></div></div>
      </div>
      <div class="skill-bar-item reveal delay-3">
        <div class="skill-bar-header"><span>Motion & Animation</span><span class="pct">88%</span></div>
        <div class="skill-bar-track"><div class="skill-bar-fill" data-width="88%"></div></div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════ 9. TESTIMONIALS ═══════════════ -->
<section class="testimonials" id="testimonials">
  <div class="container">
    <div class="testimonials-header">
      <span class="section-label">Testimonials</span>
      <h2 class="section-heading">What clients say</h2>
      <p class="section-desc">Feedback from some of the amazing people I've had the pleasure to work with.</p>
    </div>
    <div class="testimonials-grid">
      <div class="testimonial-card reveal delay-1">
        <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
        <div class="quote-icon">&ldquo;</div>
        <div class="text">Alex completely transformed our product. The attention to detail and understanding of our users was exceptional. Our conversion rate increased by 40% after the redesign.</div>
        <div class="author">
          <div class="avatar" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">SM</div>
          <div class="author-info"><div class="name">Sarah Mitchell</div><div class="role">CEO, NexaTech</div></div>
        </div>
      </div>
      <div class="testimonial-card reveal delay-2">
        <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
        <div class="quote-icon">&ldquo;</div>
        <div class="text">Working with Alex was a game-changer for our startup. He didn't just design screens — he thought deeply about the entire user journey and helped us find product-market fit.</div>
        <div class="author">
          <div class="avatar" style="background:linear-gradient(135deg,#ec4899,#f43f5e)">JW</div>
          <div class="author-info"><div class="name">James Wilson</div><div class="role">Founder, Craft Studio</div></div>
        </div>
      </div>
      <div class="testimonial-card reveal delay-3">
        <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
        <div class="quote-icon">&ldquo;</div>
        <div class="text">The design system Alex built for us saved countless engineering hours. It's beautifully organized, well-documented, and our team adopted it instantly. Truly world-class work.</div>
        <div class="author">
          <div class="avatar" style="background:linear-gradient(135deg,#14b8a6,#06b6d4)">EK</div>
          <div class="author-info"><div class="name">Emily Kim</div><div class="role">VP Design, FlowSync</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════ 10. BLOG ═══════════════ -->
<section class="blog" id="blog">
  <div class="container">
    <div class="blog-header">
      <div>
        <span class="section-label">Blog</span>
        <h2 class="section-heading" style="margin-bottom:0">Latest writings</h2>
      </div>
      <a href="#" class="btn btn-secondary" style="padding:10px 20px;font-size:13px">View All <i class="fas fa-arrow-right" style="font-size:11px"></i></a>
    </div>
    <div class="blog-grid">
      <div class="blog-card reveal delay-1">
        <div class="blog-img" style="background:linear-gradient(135deg,#4f46e5,#7c3aed)"></div>
        <div class="blog-body">
          <div class="blog-meta"><span>Design Systems</span><span class="dot"></span><span>8 min read</span></div>
          <h3>Building Design Systems That Actually Scale</h3>
          <p>How to create consistent, maintainable systems that evolve with your product without breaking.</p>
        </div>
      </div>
      <div class="blog-card reveal delay-2">
        <div class="blog-img" style="background:linear-gradient(135deg,#059669,#10b981)"></div>
        <div class="blog-body">
          <div class="blog-meta"><span>Engineering</span><span class="dot"></span><span>6 min read</span></div>
          <h3>Why I Switched From REST to GraphQL</h3>
          <p>Lessons learned migrating a production API and the tradeoffs that actually matter.</p>
        </div>
      </div>
      <div class="blog-card reveal delay-3">
        <div class="blog-img" style="background:linear-gradient(135deg,#dc2626,#f43f5e)"></div>
        <div class="blog-body">
          <div class="blog-meta"><span>Career</span><span class="dot"></span><span>5 min read</span></div>
          <h3>The Designer-Developer Advantage</h3>
          <p>Why being both a designer and developer made me better at each discipline.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════ 11. CONTACT ═══════════════ -->
<section class="contact" id="contact">
  <div class="container">
    <div class="contact-grid">
      <div class="contact-left reveal-left">
        <span class="section-label">Get in Touch</span>
        <h2 class="section-heading">Let's create something<br><span class="gradient-text">amazing together</span></h2>
        <p class="section-desc">Have a project in mind? I'd love to hear about it. Let's discuss how I can help bring your vision to life.</p>

        <div class="contact-info">
          <div class="contact-info-item">
            <div class="icon-wrap"><i class="fas fa-envelope"></i></div>
            <div><div class="info-text">hello@alexchen.dev</div><div class="info-sub">Email me anytime</div></div>
          </div>
          <div class="contact-info-item">
            <div class="icon-wrap"><i class="fas fa-map-marker-alt"></i></div>
            <div><div class="info-text">San Francisco, CA</div><div class="info-sub">Available worldwide</div></div>
          </div>
          <div class="contact-info-item">
            <div class="icon-wrap"><i class="fas fa-calendar-check"></i></div>
            <div><div class="info-text">Book a Call</div><div class="info-sub">30 min free consultation</div></div>
          </div>
        </div>

        <div class="contact-socials">
          <a href="#" aria-label="GitHub"><i class="fab fa-github"></i></a>
          <a href="#" aria-label="Twitter"><i class="fab fa-x-twitter"></i></a>
          <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
          <a href="#" aria-label="Dribbble"><i class="fab fa-dribbble"></i></a>
          <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
        </div>
      </div>

      <div class="contact-form reveal-right">
        <h3>Send a message</h3>
        <form onsubmit="event.preventDefault();this.querySelector('.form-submit').innerHTML='<i class=\\'fas fa-check\\'></i> Message Sent!';this.querySelector('.form-submit').style.background='#10b981'">
          <div class="form-row">
            <div class="form-group"><label>Name</label><input type="text" placeholder="John Doe"></div>
            <div class="form-group"><label>Email</label><input type="email" placeholder="john@example.com"></div>
          </div>
          <div class="form-group">
            <label>Project Type</label>
            <select>
              <option>Select a service</option>
              <option>Product Design</option>
              <option>Web Development</option>
              <option>Branding</option>
              <option>Consulting</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Budget Range</label>
            <select>
              <option>Select budget</option>
              <option>$5k - $10k</option>
              <option>$10k - $25k</option>
              <option>$25k - $50k</option>
              <option>$50k+</option>
            </select>
          </div>
          <div class="form-group"><label>Message</label><textarea placeholder="Tell me about your project..."></textarea></div>
          <button type="submit" class="form-submit"><i class="fas fa-paper-plane"></i> Send Message</button>
        </form>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════════ 12. FOOTER ═══════════════ -->
<footer class="footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <div class="logo"><span class="dot"></span> Alex Chen</div>
        <p>Product designer & full-stack developer crafting thoughtful digital products. Based in San Francisco, available worldwide.</p>
      </div>
      <div class="footer-col">
        <h4>Navigation</h4>
        <a href="#about">About</a>
        <a href="#services">Services</a>
        <a href="#work">Work</a>
        <a href="#experience">Experience</a>
        <a href="#blog">Blog</a>
        <a href="#contact">Contact</a>
      </div>
      <div class="footer-col">
        <h4>Services</h4>
        <a href="#">Product Design</a>
        <a href="#">Web Development</a>
        <a href="#">Mobile Design</a>
        <a href="#">Brand Identity</a>
        <a href="#">Consulting</a>
      </div>
      <div class="footer-col">
        <h4>Connect</h4>
        <a href="#">GitHub</a>
        <a href="#">Twitter / X</a>
        <a href="#">LinkedIn</a>
        <a href="#">Dribbble</a>
        <a href="#">Instagram</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2025 Alex Chen. All rights reserved.</span>
      <div class="social-links">
        <a href="#" aria-label="GitHub"><i class="fab fa-github"></i></a>
        <a href="#" aria-label="Twitter"><i class="fab fa-x-twitter"></i></a>
        <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
        <a href="#" aria-label="Dribbble"><i class="fab fa-dribbble"></i></a>
      </div>
    </div>
  </div>
</footer>

<!-- ═══════════════ JAVASCRIPT ═══════════════ -->
<script>
(function() {
  'use strict';

  /* ──────── Custom Cursor ──────── */
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let mx = 0, my = 0, cx = 0, cy = 0;
  if (window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    function animateCursor() {
      cx += (mx - cx) * 0.15;
      cy += (my - cy) * 0.15;
      dot.style.left = mx - 4 + 'px';
      dot.style.top = my - 4 + 'px';
      ring.style.left = cx - 18 + 'px';
      ring.style.top = cy - 18 + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();
    document.querySelectorAll('a, button, .project-featured, .project-card, .service-card, .skill-item, .testimonial-card, .blog-card').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });
  } else {
    dot.style.display = 'none';
    ring.style.display = 'none';
  }

  /* ──────── Nav Scroll ──────── */
  const nav = document.getElementById('nav');
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const sy = window.scrollY;
    nav.classList.toggle('scrolled', sy > 50);
    lastScroll = sy;
  }, { passive: true });

  /* ──────── Smooth scroll for anchor links ──────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ──────── Scroll Reveal (IntersectionObserver) ──────── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        /* Animate skill bars */
        const bars = entry.target.querySelectorAll('.skill-bar-fill');
        bars.forEach(bar => { bar.style.width = bar.dataset.width; });
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
  });

  /* ──────── Project Filters ──────── */
  window.filterWork = function(btn, cat) {
    document.querySelectorAll('.work-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('[data-cat]').forEach(card => {
      const cats = card.dataset.cat.split(' ');
      const show = cat === 'all' || cats.includes(cat);
      card.style.transition = 'all .4s ease';
      if (show) {
        card.style.display = '';
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      } else {
        card.style.opacity = '0';
        card.style.transform = 'translateY(16px)';
        setTimeout(() => { card.style.display = 'none'; }, 400);
      }
    });
  };

  /* ──────── Parallax on Hero Orbs ──────── */
  window.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    document.querySelectorAll('.orb').forEach((orb, i) => {
      const speed = (i + 1) * 0.5;
      orb.style.transform = 'translate(' + (x * speed) + 'px, ' + (y * speed) + 'px)';
    });
  }, { passive: true });

  /* ──────── Active nav link on scroll ──────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => sectionObserver.observe(s));

  /* ──────── Counter Animation ──────── */
  function animateCounters() {
    document.querySelectorAll('.hero-stat .num').forEach(el => {
      const text = el.textContent;
      const num = parseInt(text);
      if (isNaN(num)) return;
      const suffix = text.replace(/[0-9]/g, '');
      let current = 0;
      const step = Math.ceil(num / 40);
      const timer = setInterval(() => {
        current += step;
        if (current >= num) { current = num; clearInterval(timer); }
        el.textContent = current + suffix;
      }, 30);
    });
  }
  /* Trigger once hero is visible */
  const heroObs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateCounters();
      heroObs.disconnect();
    }
  }, { threshold: 0.5 });
  const heroSection = document.getElementById('hero');
  if (heroSection) heroObs.observe(heroSection);

  /* ──────── Tilt effect on project cards ──────── */
  document.querySelectorAll('.project-featured, .project-card, .service-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = 'perspective(800px) rotateY(' + (x * 4) + 'deg) rotateX(' + (-y * 4) + 'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ──────── Magnetic effect on buttons ──────── */
  document.querySelectorAll('.btn, .nav-cta, .form-submit').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = 'translate(' + (x * 0.15) + 'px, ' + (y * 0.15) + 'px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.transition = 'transform .3s ease';
    });
  });

  /* ──────── Typing effect for hero heading (optional subtle) ──────── */
  const heroH1 = document.querySelector('.hero h1');
  if (heroH1) {
    heroH1.style.opacity = '1'; /* Ensure visible */
  }

  /* ═══ MAGIC UI — Glow Card Mouse Track ═══ */
  document.querySelectorAll('.glow-card').forEach(card => {
    const glow = document.createElement('div');
    glow.className = 'glow-effect';
    card.appendChild(glow);
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      glow.style.left = (e.clientX - rect.left) + 'px';
      glow.style.top = (e.clientY - rect.top) + 'px';
    });
  });

  /* ═══ MAGIC UI — Blur Fade Observer ═══ */
  const magicObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.magic-reveal').forEach(el => magicObs.observe(el));

})();
</script>
</body>
</html>`, language: 'html' },
    },
  },
  {
    name: 'Pricing Page', desc: 'SaaS pricing with comparison table, toggle & FAQ', icon: '💎',
    files: {
      'index.html': { content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LUXE — Pricing Plans</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#050507;--surface:#0a0a0f;--card:#0f0f17;--card-hover:#13131f;
  --border:rgba(255,255,255,.06);--border-hover:rgba(255,255,255,.12);
  --text:#f0f0f5;--text-secondary:#8b8ba3;--text-muted:#5a5a72;
  --accent:#7c3aed;--accent-light:#a78bfa;--accent-dark:#5b21b6;
  --accent-glow:rgba(124,58,237,.15);--accent-glow2:rgba(124,58,237,.08);
  --green:#10b981;--green-bg:rgba(16,185,129,.1);
  --red:#ef4444;--red-bg:rgba(239,68,68,.08);
  --amber:#f59e0b;--amber-bg:rgba(245,158,11,.1);
  --blue:#3b82f6;--blue-bg:rgba(59,130,246,.1);
  --radius:16px;--radius-lg:24px;--radius-full:100px;
  --shadow:0 4px 24px rgba(0,0,0,.3);--shadow-lg:0 12px 48px rgba(0,0,0,.5);
  --font:'Inter',system-ui,-apple-system,sans-serif;
}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{font-family:var(--font);background:var(--bg);color:var(--text);overflow-x:hidden;line-height:1.6}
::selection{background:var(--accent);color:#fff}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#555}
a{text-decoration:none;color:inherit}
button{font-family:var(--font);cursor:pointer}
.container{max-width:1200px;margin:0 auto;padding:0 24px}

/* ───── NAV ───── */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:16px 24px;transition:all .4s}
.nav.scrolled{background:rgba(5,5,7,.85);backdrop-filter:blur(20px) saturate(1.8);border-bottom:1px solid var(--border)}
.nav-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-size:20px;font-weight:800;letter-spacing:-.02em;display:flex;align-items:center;gap:10px}
.nav-logo .logo-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--accent),var(--accent-light));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;font-weight:900}
.nav-links{display:flex;align-items:center;gap:32px}
.nav-links a{font-size:14px;color:var(--text-secondary);font-weight:500;transition:color .2s;position:relative}
.nav-links a:hover{color:var(--text)}
.nav-links a::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:2px;background:var(--accent);transition:width .3s}
.nav-links a:hover::after{width:100%}
.nav-cta{padding:10px 24px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-full);font-size:13px;font-weight:700;transition:all .3s;letter-spacing:.02em}
.nav-cta:hover{background:var(--accent-dark);transform:translateY(-1px);box-shadow:0 4px 20px rgba(124,58,237,.4)}

/* ───── HERO ───── */
.hero{position:relative;text-align:center;padding:160px 24px 80px;overflow:hidden}
.hero-bg{position:absolute;inset:0;z-index:0}
.hero-bg .orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.35;animation:orbFloat 8s ease-in-out infinite}
.hero-bg .orb-1{width:500px;height:500px;background:var(--accent);top:-200px;left:50%;transform:translateX(-50%);animation-delay:0s}
.hero-bg .orb-2{width:300px;height:300px;background:#ec4899;top:0;right:-100px;animation-delay:2s}
.hero-bg .orb-3{width:250px;height:250px;background:#3b82f6;bottom:0;left:-50px;animation-delay:4s}
.hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse at center,black 20%,transparent 70%)}
@keyframes orbFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-30px) scale(1.05)}}
.hero-content{position:relative;z-index:1}
.hero-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border:1px solid var(--border);border-radius:var(--radius-full);font-size:13px;color:var(--text-secondary);margin-bottom:28px;background:rgba(255,255,255,.03);backdrop-filter:blur(10px)}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
.hero h1{font-size:clamp(36px,6vw,72px);font-weight:900;letter-spacing:-.04em;line-height:1.05;margin-bottom:20px}
.hero h1 .gradient{background:linear-gradient(135deg,var(--accent-light),#ec4899,var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero p{font-size:18px;color:var(--text-secondary);max-width:540px;margin:0 auto 40px;line-height:1.7}
.hero-stats{display:flex;align-items:center;justify-content:center;gap:48px;margin-top:48px}
.hero-stat{text-align:center}
.hero-stat .num{font-size:28px;font-weight:800;letter-spacing:-.02em}
.hero-stat .label{font-size:12px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:.05em}

/* ───── LOGOS ───── */
.logos{padding:60px 24px;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.logos-inner{max-width:1000px;margin:0 auto;text-align:center}
.logos-title{font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:32px;font-weight:600}
.logos-row{display:flex;align-items:center;justify-content:center;gap:48px;flex-wrap:wrap;opacity:.4}
.logos-row span{font-size:20px;font-weight:800;letter-spacing:-.01em}

/* ───── TOGGLE ───── */
.toggle-section{text-align:center;padding:80px 24px 20px}
.toggle-wrap{display:inline-flex;align-items:center;gap:14px;padding:6px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-full)}
.toggle-wrap .t-label{padding:10px 20px;border-radius:var(--radius-full);font-size:14px;font-weight:600;color:var(--text-muted);cursor:pointer;transition:all .3s;user-select:none}
.toggle-wrap .t-label.active{background:var(--accent);color:#fff;box-shadow:0 2px 12px rgba(124,58,237,.4)}
.save-pill{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;background:var(--green-bg);color:var(--green);border-radius:var(--radius-full);font-size:12px;font-weight:700;margin-left:12px;animation:saveBounce 2s ease infinite}
@keyframes saveBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}

/* ───── PRICING CARDS ───── */
.pricing{padding:40px 24px 100px}
.pricing-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:1200px;margin:0 auto;align-items:start}
.p-card{position:relative;padding:36px 28px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--card);transition:all .4s cubic-bezier(.22,1,.36,1);overflow:hidden}
.p-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:transparent;transition:background .3s}
.p-card:hover{transform:translateY(-8px);border-color:var(--border-hover);box-shadow:var(--shadow-lg)}
.p-card.featured{border-color:var(--accent);background:linear-gradient(180deg,rgba(124,58,237,.06) 0%,var(--card) 60%)}
.p-card.featured::before{background:linear-gradient(90deg,var(--accent),var(--accent-light))}
.p-card.featured:hover{box-shadow:0 12px 48px rgba(124,58,237,.2)}
.p-badge{position:absolute;top:16px;right:16px;padding:4px 12px;border-radius:var(--radius-full);font-size:11px;font-weight:700;background:var(--accent);color:#fff;animation:badgePulse 2s ease infinite}
@keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,.4)}50%{box-shadow:0 0 0 8px rgba(124,58,237,0)}}
.p-card .p-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:20px}
.p-card .p-name{font-size:18px;font-weight:700;margin-bottom:6px;letter-spacing:-.01em}
.p-card .p-desc{font-size:13px;color:var(--text-muted);line-height:1.6;margin-bottom:24px;min-height:40px}
.p-card .p-price{margin-bottom:24px}
.p-card .p-price .amount{font-size:52px;font-weight:900;letter-spacing:-.04em;line-height:1}
.p-card .p-price .amount .dollar{font-size:28px;font-weight:700;vertical-align:top;margin-right:2px;color:var(--text-secondary)}
.p-card .p-price .period{font-size:14px;color:var(--text-muted);margin-top:4px}
.p-card .p-price .was{font-size:13px;color:var(--text-muted);text-decoration:line-through;margin-left:8px}
.p-card .p-cta{display:block;width:100%;padding:14px 24px;text-align:center;border-radius:var(--radius);font-size:14px;font-weight:700;border:none;transition:all .3s;letter-spacing:.01em}
.p-cta.primary{background:var(--accent);color:#fff}
.p-cta.primary:hover{background:var(--accent-dark);box-shadow:0 4px 20px rgba(124,58,237,.4);transform:translateY(-1px)}
.p-cta.outline{background:transparent;border:1px solid var(--border);color:var(--text)}
.p-cta.outline:hover{border-color:var(--border-hover);background:rgba(255,255,255,.03)}
.p-cta.dark{background:var(--text);color:var(--bg)}
.p-cta.dark:hover{opacity:.9;transform:translateY(-1px)}
.p-features{list-style:none;margin-top:28px;display:flex;flex-direction:column;gap:14px;border-top:1px solid var(--border);padding-top:24px}
.p-features li{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--text-secondary);line-height:1.5}
.p-features li i{margin-top:3px;font-size:12px;width:16px;flex-shrink:0}
.p-features li i.fa-check{color:var(--green)}
.p-features li i.fa-xmark{color:var(--text-muted);opacity:.4}
.p-features li.disabled{opacity:.4}
.p-card .p-extras{margin-top:20px;padding-top:16px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)}
.p-card .p-extras strong{color:var(--text-secondary);font-weight:600}

/* ───── COMPARISON TABLE ───── */
.comparison{padding:80px 24px 100px}
.comparison .section-header{text-align:center;margin-bottom:60px}
.section-header .overline{display:inline-block;font-size:12px;color:var(--accent-light);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:12px}
.section-header h2{font-size:clamp(28px,4vw,42px);font-weight:800;letter-spacing:-.03em;margin-bottom:12px}
.section-header p{font-size:16px;color:var(--text-secondary);max-width:500px;margin:0 auto}
.comp-table{max-width:1100px;margin:0 auto;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;background:var(--card)}
.comp-table table{width:100%;border-collapse:collapse}
.comp-table thead{background:var(--surface)}
.comp-table th{padding:20px 24px;text-align:left;font-size:14px;font-weight:700;border-bottom:1px solid var(--border);color:var(--text)}
.comp-table th:first-child{width:30%}
.comp-table th:not(:first-child){text-align:center;width:17.5%}
.comp-table th .th-plan{display:flex;flex-direction:column;align-items:center;gap:4px}
.comp-table th .th-price{font-size:12px;font-weight:500;color:var(--text-muted)}
.comp-table tbody tr{transition:background .2s}
.comp-table tbody tr:hover{background:rgba(255,255,255,.02)}
.comp-table td{padding:16px 24px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border)}
.comp-table td:first-child{font-weight:500;color:var(--text)}
.comp-table td:not(:first-child){text-align:center}
.comp-table .check{color:var(--green);font-size:14px}
.comp-table .x{color:var(--text-muted);opacity:.3;font-size:14px}
.comp-table .cat-row td{background:rgba(124,58,237,.04);font-weight:700;color:var(--accent-light);font-size:12px;text-transform:uppercase;letter-spacing:.08em;padding:12px 24px}
.comp-table .highlight-col{background:rgba(124,58,237,.03)}
.comp-tooltip{position:relative;cursor:help;border-bottom:1px dashed var(--text-muted)}
.comp-tooltip:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);padding:8px 14px;background:#222;color:#fff;border-radius:8px;font-size:12px;white-space:nowrap;z-index:10;pointer-events:none}

/* ───── CALCULATOR ───── */
.calculator{padding:80px 24px 100px}
.calc-container{max-width:900px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
.calc-left h3{font-size:28px;font-weight:800;letter-spacing:-.02em;margin-bottom:12px}
.calc-left p{font-size:15px;color:var(--text-secondary);margin-bottom:36px;line-height:1.7}
.calc-slider-group{margin-bottom:28px}
.calc-slider-group label{display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:12px}
.calc-slider-group label span{color:var(--accent-light);font-weight:700}
.calc-range{width:100%;-webkit-appearance:none;height:6px;border-radius:3px;background:var(--border);outline:none;transition:all .2s}
.calc-range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;background:var(--accent);border-radius:50%;cursor:pointer;box-shadow:0 2px 8px rgba(124,58,237,.4);transition:transform .2s}
.calc-range::-webkit-slider-thumb:hover{transform:scale(1.15)}
.calc-result{padding:36px;border-radius:var(--radius-lg);background:linear-gradient(135deg,rgba(124,58,237,.1),rgba(59,130,246,.05));border:1px solid rgba(124,58,237,.2);text-align:center}
.calc-result .rec-plan{font-size:12px;color:var(--accent-light);text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:8px}
.calc-result .rec-price{font-size:48px;font-weight:900;letter-spacing:-.03em;margin-bottom:4px}
.calc-result .rec-period{font-size:14px;color:var(--text-muted);margin-bottom:20px}
.calc-result .rec-save{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:var(--green-bg);color:var(--green);border-radius:var(--radius-full);font-size:12px;font-weight:700;margin-bottom:20px}
.calc-result .rec-features{list-style:none;display:flex;flex-direction:column;gap:10px;text-align:left;margin-bottom:24px}
.calc-result .rec-features li{font-size:13px;color:var(--text-secondary);display:flex;align-items:center;gap:8px}
.calc-result .rec-features li i{color:var(--green);font-size:12px}
.calc-result .rec-cta{display:inline-flex;padding:12px 28px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-full);font-size:14px;font-weight:700;transition:all .3s}
.calc-result .rec-cta:hover{background:var(--accent-dark);transform:translateY(-2px);box-shadow:0 4px 20px rgba(124,58,237,.4)}

/* ───── TESTIMONIALS ───── */
.testimonials{padding:80px 24px 100px}
.test-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1100px;margin:0 auto}
.test-card{padding:32px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--card);transition:all .3s}
.test-card:hover{transform:translateY(-4px);border-color:var(--border-hover)}
.test-card .stars{display:flex;gap:4px;margin-bottom:16px}
.test-card .stars i{color:var(--amber);font-size:14px}
.test-card .quote{font-size:15px;line-height:1.7;margin-bottom:24px;color:var(--text-secondary)}
.test-card .author{display:flex;align-items:center;gap:14px}
.test-card .author .avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff}
.test-card .author .info .name{font-size:14px;font-weight:700}
.test-card .author .info .role{font-size:12px;color:var(--text-muted)}
.test-card .plan-badge{display:inline-flex;padding:4px 10px;border-radius:var(--radius-full);font-size:11px;font-weight:700;margin-top:16px}

/* ───── GUARANTEE ───── */
.guarantee{padding:60px 24px 80px}
.guarantee-inner{max-width:800px;margin:0 auto;display:flex;align-items:center;gap:32px;padding:40px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--card)}
.guarantee-icon{width:80px;height:80px;border-radius:50%;background:var(--green-bg);display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;color:var(--green)}
.guarantee-text h3{font-size:20px;font-weight:800;margin-bottom:8px}
.guarantee-text p{font-size:14px;color:var(--text-secondary);line-height:1.7}

/* ───── FAQ ───── */
.faq{padding:80px 24px 100px}
.faq-grid{max-width:800px;margin:0 auto}
.faq-item{border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;overflow:hidden;background:var(--card);transition:all .3s}
.faq-item:hover{border-color:var(--border-hover)}
.faq-item.open{border-color:rgba(124,58,237,.2);background:linear-gradient(135deg,rgba(124,58,237,.03),var(--card))}
.faq-q{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;cursor:pointer;font-size:15px;font-weight:600;transition:color .2s;user-select:none}
.faq-q:hover{color:var(--accent-light)}
.faq-q .faq-icon{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;transition:all .3s;flex-shrink:0}
.faq-q .faq-icon i{font-size:11px;color:var(--text-muted);transition:transform .3s}
.faq-item.open .faq-icon{background:var(--accent-glow)}
.faq-item.open .faq-icon i{transform:rotate(180deg);color:var(--accent-light)}
.faq-a{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .3s;padding:0 24px}
.faq-item.open .faq-a{max-height:300px;padding:0 24px 24px}
.faq-a p{font-size:14px;color:var(--text-secondary);line-height:1.8}

/* ───── CTA BANNER ───── */
.cta-banner{padding:60px 24px 100px}
.cta-inner{max-width:900px;margin:0 auto;padding:64px 48px;border-radius:var(--radius-lg);text-align:center;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--accent-dark),#7c3aed,#a855f7);border:1px solid rgba(255,255,255,.1)}
.cta-inner::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
.cta-inner h2{font-size:clamp(28px,4vw,40px);font-weight:900;letter-spacing:-.03em;margin-bottom:16px;position:relative}
.cta-inner p{font-size:16px;opacity:.8;max-width:460px;margin:0 auto 32px;position:relative;line-height:1.7}
.cta-btns{display:flex;align-items:center;justify-content:center;gap:16px;position:relative}
.cta-btns .btn-white{padding:14px 32px;background:#fff;color:var(--accent-dark);border:none;border-radius:var(--radius-full);font-size:15px;font-weight:700;transition:all .3s}
.cta-btns .btn-white:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.3)}
.cta-btns .btn-ghost{padding:14px 32px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:var(--radius-full);font-size:15px;font-weight:600;transition:all .3s}
.cta-btns .btn-ghost:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.5)}

/* ───── FOOTER ───── */
.footer{padding:80px 24px 40px;border-top:1px solid var(--border)}
.footer-grid{display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:48px;max-width:1100px;margin:0 auto 60px}
.footer-brand .f-logo{font-size:20px;font-weight:800;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.footer-brand .f-logo .f-icon{width:28px;height:28px;background:linear-gradient(135deg,var(--accent),var(--accent-light));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;font-weight:900}
.footer-brand p{font-size:13px;color:var(--text-muted);line-height:1.7;margin-bottom:20px}
.footer-social{display:flex;gap:12px}
.footer-social a{width:36px;height:36px;border-radius:10px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;transition:all .2s}
.footer-social a:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-glow2)}
.footer-col h4{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:18px}
.footer-col ul{list-style:none;display:flex;flex-direction:column;gap:10px}
.footer-col ul li a{font-size:14px;color:var(--text-secondary);transition:color .2s}
.footer-col ul li a:hover{color:var(--text)}
.footer-bottom{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding-top:24px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)}
.footer-bottom .payments{display:flex;gap:8px}
.footer-bottom .payments span{padding:4px 10px;border:1px solid var(--border);border-radius:6px;font-size:11px;font-weight:600}

/* ───── CONFETTI ───── */
.confetti-canvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;pointer-events:none}

/* ───── RESPONSIVE ───── */
@media(max-width:1024px){.pricing-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){
  .pricing-grid{grid-template-columns:1fr;max-width:420px;margin-left:auto;margin-right:auto}
  .comp-table{overflow-x:auto}
  .comp-table table{min-width:700px}
  .calc-container{grid-template-columns:1fr}
  .test-grid{grid-template-columns:1fr}
  .footer-grid{grid-template-columns:1fr}
  .hero-stats{flex-direction:column;gap:24px}
  .nav-links{display:none}
  .guarantee-inner{flex-direction:column;text-align:center}
  .cta-btns{flex-direction:column}
}

/* ───── ANIMATIONS ───── */
.reveal{opacity:0;transform:translateY(30px);transition:all .6s cubic-bezier(.22,1,.36,1)}
.reveal.visible{opacity:1;transform:translateY(0)}
.reveal-delay-1{transition-delay:.1s}
.reveal-delay-2{transition-delay:.2s}
.reveal-delay-3{transition-delay:.3s}
.reveal-delay-4{transition-delay:.4s}

/* ═══ MAGIC UI — Border Beam ═══ */
@property --beam-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
.border-beam{position:relative;overflow:hidden}.border-beam::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:2px;background:conic-gradient(from var(--beam-angle),transparent 60%,var(--accent) 80%,transparent 100%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:beam-spin 4s linear infinite;pointer-events:none;z-index:2}@keyframes beam-spin{to{--beam-angle:360deg}}
/* ═══ MAGIC UI — Shimmer CTA ═══ */
.shimmer-btn{position:relative;overflow:hidden;isolation:isolate}.shimmer-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);animation:shimmer-sweep 3s ease-in-out infinite;z-index:1}@keyframes shimmer-sweep{0%,100%{left:-100%}50%{left:150%}}
/* ═══ MAGIC UI — Dot Pattern ═══ */
.magic-dots{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(124,58,237,.1) 1px,transparent 1px);background-size:24px 24px;pointer-events:none;mask-image:radial-gradient(ellipse at center,black 30%,transparent 70%);z-index:0}
/* ═══ MAGIC UI — Meteors ═══ */
.magic-meteors{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.magic-meteor{position:absolute;width:2px;height:80px;background:linear-gradient(to bottom,rgba(124,58,237,.6),transparent);transform:rotate(-35deg);animation:meteor-fall linear infinite;opacity:0}
.magic-meteor::before{content:'';position:absolute;top:0;left:-1px;width:4px;height:4px;border-radius:50%;background:rgba(167,139,250,.9);box-shadow:0 0 8px 2px rgba(167,139,250,.3)}
@keyframes meteor-fall{0%{transform:translate(0,0) rotate(-35deg);opacity:0}5%{opacity:1}95%{opacity:.3}100%{transform:translate(-400px,800px) rotate(-35deg);opacity:0}}
/* ═══ MAGIC UI — Glow Card ═══ */
.glow-card{position:relative;overflow:hidden;z-index:1}.glow-card .glow-effect{position:absolute;width:400px;height:400px;background:radial-gradient(circle,rgba(124,58,237,.12),transparent 70%);border-radius:50%;opacity:0;transition:opacity .5s;pointer-events:none;transform:translate(-50%,-50%);z-index:0}.glow-card:hover .glow-effect{opacity:1}
/* ═══ MAGIC UI — Magic Marquee ═══ */
.magic-marquee{display:flex;overflow:hidden;gap:48px;width:100%}.magic-marquee-track{display:flex;gap:48px;animation:magic-marquee-scroll 25s linear infinite;flex-shrink:0}.magic-marquee:hover .magic-marquee-track{animation-play-state:paused}@keyframes magic-marquee-scroll{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}
</style>
</head>
<body>

<!-- ============ NAV ============ -->
<nav class="nav" id="mainNav">
  <div class="nav-inner">
    <a href="#" class="nav-logo"><span class="logo-icon">L</span> LUXE</a>
    <div class="nav-links">
      <a href="#pricing">Pricing</a>
      <a href="#features">Features</a>
      <a href="#compare">Compare</a>
      <a href="#faq">FAQ</a>
    </div>
    <button class="nav-cta" id="navCta">Start Free Trial</button>
  </div>
</nav>

<!-- ============ HERO ============ -->
<section class="hero">
  <div class="hero-bg">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <div class="hero-grid"></div>
    <div class="magic-dots"></div>
    <div class="magic-meteors">
      <div class="magic-meteor" style="top:-10%;left:20%;height:70px;animation-duration:4s;animation-delay:0s"></div>
      <div class="magic-meteor" style="top:-10%;left:55%;height:60px;animation-duration:5s;animation-delay:2s"></div>
      <div class="magic-meteor" style="top:-10%;left:80%;height:85px;animation-duration:3.5s;animation-delay:4s"></div>
      <div class="magic-meteor" style="top:-10%;left:40%;height:50px;animation-duration:6s;animation-delay:1s"></div>
    </div>
  </div>
  <div class="hero-content">
    <div class="hero-badge"><span class="dot"></span> Transparent pricing for every team</div>
    <h1>Plans that <span class="gradient">scale with you</span></h1>
    <p>Start free, upgrade when you're ready. No hidden fees, no surprises. Cancel anytime.</p>
    <div class="hero-stats">
      <div class="hero-stat"><div class="num">50K+</div><div class="label">Active teams</div></div>
      <div class="hero-stat"><div class="num">99.9%</div><div class="label">Uptime SLA</div></div>
      <div class="hero-stat"><div class="num">4.9/5</div><div class="label">User rating</div></div>
      <div class="hero-stat"><div class="num">150+</div><div class="label">Countries</div></div>
    </div>
  </div>
</section>

<!-- ============ LOGOS ============ -->
<section class="logos">
  <div class="logos-inner">
    <div class="logos-title">Trusted by industry leaders worldwide</div>
    <div class="logos-row">
      <span>Stripe</span><span>Vercel</span><span>Linear</span><span>Notion</span><span>Figma</span><span>Slack</span><span>Shopify</span>
    </div>
  </div>
</section>

<!-- ============ TOGGLE ============ -->
<section class="toggle-section" id="pricing">
  <div class="toggle-wrap" id="billingToggle">
    <span class="t-label active" id="monthlyLabel" data-period="monthly">Monthly</span>
    <span class="t-label" id="annualLabel" data-period="annual">Annual</span>
  </div>
  <span class="save-pill"><i class="fas fa-tag"></i> Save 20% annually</span>
</section>

<!-- ============ PRICING CARDS ============ -->
<section class="pricing" id="plans">
  <div class="pricing-grid">

    <!-- FREE -->
    <div class="p-card reveal">
      <div class="p-icon" style="background:var(--blue-bg)"><i class="fas fa-paper-plane" style="color:var(--blue)"></i></div>
      <div class="p-name">Free</div>
      <div class="p-desc">Perfect for hobby projects and experiments.</div>
      <div class="p-price">
        <div class="amount"><span class="dollar">$</span><span class="price-val" data-m="0" data-y="0">0</span></div>
        <div class="period">Free forever</div>
      </div>
      <button class="p-cta outline" onclick="selectPlan('Free')">Get Started</button>
      <ul class="p-features">
        <li><i class="fas fa-check"></i> 2 projects</li>
        <li><i class="fas fa-check"></i> 500 MB storage</li>
        <li><i class="fas fa-check"></i> Community support</li>
        <li><i class="fas fa-check"></i> Basic analytics</li>
        <li><i class="fas fa-check"></i> SSL certificate</li>
        <li class="disabled"><i class="fas fa-xmark"></i> Custom domain</li>
        <li class="disabled"><i class="fas fa-xmark"></i> Team members</li>
        <li class="disabled"><i class="fas fa-xmark"></i> Priority support</li>
      </ul>
    </div>

    <!-- STARTER -->
    <div class="p-card reveal reveal-delay-1">
      <div class="p-icon" style="background:var(--green-bg)"><i class="fas fa-rocket" style="color:var(--green)"></i></div>
      <div class="p-name">Starter</div>
      <div class="p-desc">For freelancers and small teams getting started.</div>
      <div class="p-price">
        <div class="amount"><span class="dollar">$</span><span class="price-val" data-m="19" data-y="15">19</span></div>
        <div class="period">per month<span class="was" id="starterWas" style="display:none"> $19/mo</span></div>
      </div>
      <button class="p-cta outline" onclick="selectPlan('Starter')">Start Free Trial</button>
      <ul class="p-features">
        <li><i class="fas fa-check"></i> 10 projects</li>
        <li><i class="fas fa-check"></i> 10 GB storage</li>
        <li><i class="fas fa-check"></i> Email support</li>
        <li><i class="fas fa-check"></i> Advanced analytics</li>
        <li><i class="fas fa-check"></i> Custom domain</li>
        <li><i class="fas fa-check"></i> 3 team members</li>
        <li class="disabled"><i class="fas fa-xmark"></i> API access</li>
        <li class="disabled"><i class="fas fa-xmark"></i> White labeling</li>
      </ul>
    </div>

    <!-- PRO — FEATURED -->
    <div class="p-card featured border-beam glow-card reveal reveal-delay-2">
      <span class="p-badge">Most Popular</span>
      <div class="p-icon" style="background:var(--accent-glow)"><i class="fas fa-gem" style="color:var(--accent-light)"></i></div>
      <div class="p-name">Pro</div>
      <div class="p-desc">For growing businesses that need powerful tools.</div>
      <div class="p-price">
        <div class="amount"><span class="dollar">$</span><span class="price-val" data-m="49" data-y="39">49</span></div>
        <div class="period">per month<span class="was" id="proWas" style="display:none"> $49/mo</span></div>
      </div>
      <button class="p-cta primary shimmer-btn" onclick="selectPlan('Pro')">Start Free Trial</button>
      <ul class="p-features">
        <li><i class="fas fa-check"></i> Unlimited projects</li>
        <li><i class="fas fa-check"></i> 100 GB storage</li>
        <li><i class="fas fa-check"></i> Priority support (24h)</li>
        <li><i class="fas fa-check"></i> Advanced analytics + AI</li>
        <li><i class="fas fa-check"></i> Custom domain + SSL</li>
        <li><i class="fas fa-check"></i> 15 team members</li>
        <li><i class="fas fa-check"></i> Full API access</li>
        <li><i class="fas fa-check"></i> Webhooks & integrations</li>
      </ul>
      <div class="p-extras"><strong>Includes:</strong> 14-day free trial, no credit card required</div>
    </div>

    <!-- ENTERPRISE -->
    <div class="p-card reveal reveal-delay-3">
      <div class="p-icon" style="background:var(--amber-bg)"><i class="fas fa-building" style="color:var(--amber)"></i></div>
      <div class="p-name">Enterprise</div>
      <div class="p-desc">For organizations with advanced security & scale.</div>
      <div class="p-price">
        <div class="amount" style="font-size:36px;letter-spacing:-.02em">Custom</div>
        <div class="period">tailored to your needs</div>
      </div>
      <button class="p-cta dark" onclick="selectPlan('Enterprise')">Contact Sales</button>
      <ul class="p-features">
        <li><i class="fas fa-check"></i> Everything in Pro</li>
        <li><i class="fas fa-check"></i> Unlimited storage</li>
        <li><i class="fas fa-check"></i> Dedicated support manager</li>
        <li><i class="fas fa-check"></i> Custom analytics & reports</li>
        <li><i class="fas fa-check"></i> SSO / SAML / SCIM</li>
        <li><i class="fas fa-check"></i> Unlimited team members</li>
        <li><i class="fas fa-check"></i> SLA & uptime guarantee</li>
        <li><i class="fas fa-check"></i> Custom integrations & onboarding</li>
      </ul>
      <div class="p-extras"><strong>Includes:</strong> Dedicated infrastructure, custom contract</div>
    </div>

  </div>
</section>

<!-- ============ COMPARISON TABLE ============ -->
<section class="comparison" id="compare">
  <div class="section-header">
    <div class="overline">Compare Plans</div>
    <h2>Feature-by-feature breakdown</h2>
    <p>Every detail, so you can pick the plan that fits.</p>
  </div>
  <div class="comp-table">
    <table>
      <thead>
        <tr>
          <th>Features</th>
          <th><div class="th-plan">Free<span class="th-price">$0</span></div></th>
          <th><div class="th-plan">Starter<span class="th-price comp-price" data-m="$19/mo" data-y="$15/mo">$19/mo</span></div></th>
          <th class="highlight-col"><div class="th-plan">Pro <i class="fas fa-star" style="color:var(--amber);font-size:10px"></i><span class="th-price comp-price" data-m="$49/mo" data-y="$39/mo">$49/mo</span></div></th>
          <th><div class="th-plan">Enterprise<span class="th-price">Custom</span></div></th>
        </tr>
      </thead>
      <tbody>
        <tr class="cat-row"><td colspan="5">Core</td></tr>
        <tr><td>Projects</td><td>2</td><td>10</td><td class="highlight-col">Unlimited</td><td>Unlimited</td></tr>
        <tr><td>Storage</td><td>500 MB</td><td>10 GB</td><td class="highlight-col">100 GB</td><td>Unlimited</td></tr>
        <tr><td>Bandwidth</td><td>1 GB/mo</td><td>50 GB/mo</td><td class="highlight-col">500 GB/mo</td><td>Unlimited</td></tr>
        <tr><td>Custom domain</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-check check"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>SSL certificate</td><td><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr class="cat-row"><td colspan="5">Team & Collaboration</td></tr>
        <tr><td>Team members</td><td>1</td><td>3</td><td class="highlight-col">15</td><td>Unlimited</td></tr>
        <tr><td>Role-based access</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>Audit log</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>Guest access</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col">5 guests</td><td>Unlimited</td></tr>
        <tr class="cat-row"><td colspan="5">Analytics & Insights</td></tr>
        <tr><td>Basic analytics</td><td><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>Advanced analytics</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-check check"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>AI-powered insights</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>Custom reports</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-xmark x"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr class="cat-row"><td colspan="5">Developer Tools</td></tr>
        <tr><td>API access</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>Webhooks</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>CLI tool</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-check check"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>White labeling</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-xmark x"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr class="cat-row"><td colspan="5">Security & Compliance</td></tr>
        <tr><td>2FA</td><td><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>SSO / SAML</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-xmark x"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>SOC 2 compliance</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-xmark x"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>SLA guarantee</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col">99.9%</td><td>99.99%</td></tr>
        <tr class="cat-row"><td colspan="5">Support</td></tr>
        <tr><td>Community forum</td><td><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>Email support</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-check check"></i></td><td class="highlight-col"><i class="fas fa-check check"></i></td><td><i class="fas fa-check check"></i></td></tr>
        <tr><td>Priority support</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col">24h response</td><td>1h response</td></tr>
        <tr><td>Dedicated manager</td><td><i class="fas fa-xmark x"></i></td><td><i class="fas fa-xmark x"></i></td><td class="highlight-col"><i class="fas fa-xmark x"></i></td><td><i class="fas fa-check check"></i></td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- ============ CALCULATOR ============ -->
<section class="calculator" id="features">
  <div class="section-header" style="margin-bottom:48px">
    <div class="overline">Savings Calculator</div>
    <h2>Find your perfect plan</h2>
    <p>Adjust the sliders and we will recommend the best plan for your needs.</p>
  </div>
  <div class="calc-container">
    <div class="calc-left">
      <div class="calc-slider-group">
        <label>Team members <span id="teamVal">5</span></label>
        <input type="range" class="calc-range" id="teamSlider" min="1" max="100" value="5">
      </div>
      <div class="calc-slider-group">
        <label>Projects <span id="projVal">8</span></label>
        <input type="range" class="calc-range" id="projSlider" min="1" max="50" value="8">
      </div>
      <div class="calc-slider-group">
        <label>Storage needed <span id="storVal">20 GB</span></label>
        <input type="range" class="calc-range" id="storSlider" min="1" max="500" value="20">
      </div>
      <div class="calc-slider-group">
        <label>Need API access? <span id="apiVal">No</span></label>
        <input type="range" class="calc-range" id="apiSlider" min="0" max="1" value="0">
      </div>
    </div>
    <div class="calc-result reveal">
      <div class="rec-plan" id="recPlan">Recommended Plan</div>
      <div class="rec-price" id="recPrice">$19</div>
      <div class="rec-period" id="recPeriod">per month</div>
      <div class="rec-save" id="recSave"><i class="fas fa-tag"></i> <span id="recSaveText">Save $48/year with annual billing</span></div>
      <ul class="rec-features" id="recFeatures">
        <li><i class="fas fa-check"></i> 10 projects included</li>
        <li><i class="fas fa-check"></i> 10 GB storage</li>
        <li><i class="fas fa-check"></i> 3 team members</li>
      </ul>
      <button class="rec-cta" onclick="selectPlan('recommended')">Get This Plan <i class="fas fa-arrow-right" style="margin-left:6px"></i></button>
    </div>
  </div>
</section>

<!-- ============ TESTIMONIALS ============ -->
<section class="testimonials">
  <div class="section-header" style="margin-bottom:48px">
    <div class="overline">What Customers Say</div>
    <h2>Loved by teams everywhere</h2>
    <p>Hear from real customers about their experience.</p>
  </div>
  <div class="test-grid">
    <div class="test-card reveal">
      <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
      <div class="quote">"Switching to the Pro plan was a game-changer. The API access and advanced analytics helped us grow 3x in just 6 months. The team collaboration features are incredibly intuitive."</div>
      <div class="author">
        <div class="avatar" style="background:linear-gradient(135deg,#7c3aed,#a855f7)">SK</div>
        <div class="info"><div class="name">Sarah Kim</div><div class="role">CTO at TechFlow</div></div>
      </div>
      <span class="plan-badge" style="background:var(--accent-glow);color:var(--accent-light)">Pro Plan</span>
    </div>
    <div class="test-card reveal reveal-delay-1">
      <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
      <div class="quote">"The free tier is genuinely generous. We prototyped our entire MVP without spending a dime. When we scaled, upgrading was seamless. No vendor lock-in tricks, just honest pricing."</div>
      <div class="author">
        <div class="avatar" style="background:linear-gradient(135deg,#3b82f6,#60a5fa)">MR</div>
        <div class="info"><div class="name">Marco Rossi</div><div class="role">Founder at LaunchKit</div></div>
      </div>
      <span class="plan-badge" style="background:var(--blue-bg);color:var(--blue)">Free Plan</span>
    </div>
    <div class="test-card reveal reveal-delay-2">
      <div class="stars"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i></div>
      <div class="quote">"Enterprise support is world-class. Our dedicated manager responds within the hour and the SSO integration with our existing systems was flawless. Worth every penny for compliance."</div>
      <div class="author">
        <div class="avatar" style="background:linear-gradient(135deg,#f59e0b,#fbbf24)">JC</div>
        <div class="info"><div class="name">Jennifer Chen</div><div class="role">VP Engineering at Datacore</div></div>
      </div>
      <span class="plan-badge" style="background:var(--amber-bg);color:var(--amber)">Enterprise</span>
    </div>
  </div>
</section>

<!-- ============ GUARANTEE ============ -->
<section class="guarantee reveal">
  <div class="guarantee-inner">
    <div class="guarantee-icon"><i class="fas fa-shield-halved"></i></div>
    <div class="guarantee-text">
      <h3>30-day money-back guarantee</h3>
      <p>Try any paid plan risk-free. If you are not completely satisfied within the first 30 days, we will refund your payment in full — no questions asked. We also offer a 14-day free trial on all paid plans so you can test everything before committing.</p>
    </div>
  </div>
</section>

<!-- ============ FAQ ============ -->
<section class="faq" id="faq">
  <div class="section-header" style="margin-bottom:48px">
    <div class="overline">Questions & Answers</div>
    <h2>Frequently asked questions</h2>
    <p>Everything you need to know about our plans.</p>
  </div>
  <div class="faq-grid">
    <div class="faq-item">
      <div class="faq-q" onclick="toggleFaq(this)">Can I switch plans at any time?<span class="faq-icon"><i class="fas fa-chevron-down"></i></span></div>
      <div class="faq-a"><p>Absolutely! You can upgrade or downgrade your plan at any time from your account settings. When upgrading, you will only be charged the prorated difference. When downgrading, the credit will be applied to your next billing cycle.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggleFaq(this)">Is there a free trial available?<span class="faq-icon"><i class="fas fa-chevron-down"></i></span></div>
      <div class="faq-a"><p>Yes! Every paid plan comes with a 14-day free trial with full access to all features. No credit card required to start your trial. You will only be charged after the trial period ends if you decide to continue.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggleFaq(this)">What payment methods do you accept?<span class="faq-icon"><i class="fas fa-chevron-down"></i></span></div>
      <div class="faq-a"><p>We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover), PayPal, and bank transfers. Enterprise customers can also pay via invoice with NET-30 terms. All payments are processed securely via Stripe.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggleFaq(this)">What happens when I exceed my plan limits?<span class="faq-icon"><i class="fas fa-chevron-down"></i></span></div>
      <div class="faq-a"><p>We will never cut off your service unexpectedly. When you approach 80% of your limits, we will notify you so you can upgrade if needed. If you go over, we will give you a 7-day grace period to upgrade or manage your usage.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggleFaq(this)">Can I cancel my subscription anytime?<span class="faq-icon"><i class="fas fa-chevron-down"></i></span></div>
      <div class="faq-a"><p>Yes, you can cancel your subscription at any time with no cancellation fees or penalties. Your account will remain active until the end of your current billing period. You can also export all your data before canceling.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggleFaq(this)">Do you offer discounts for startups or non-profits?<span class="faq-icon"><i class="fas fa-chevron-down"></i></span></div>
      <div class="faq-a"><p>Yes! We offer a 50% discount for verified non-profits and a special startup program with 6 months free on the Pro plan. Contact our sales team with your organization details to apply for these programs.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggleFaq(this)">Is my data secure?<span class="faq-icon"><i class="fas fa-chevron-down"></i></span></div>
      <div class="faq-a"><p>Security is our top priority. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are SOC 2 Type II certified, GDPR compliant, and undergo regular third-party penetration testing. Enterprise plans include additional security features like SSO and SCIM.</p></div>
    </div>
    <div class="faq-item">
      <div class="faq-q" onclick="toggleFaq(this)">How does the annual billing discount work?<span class="faq-icon"><i class="fas fa-chevron-down"></i></span></div>
      <div class="faq-a"><p>When you choose annual billing, you get a 20% discount compared to monthly billing. You will be charged once per year upfront. For example, the Pro plan at $49/mo becomes $39/mo when billed annually ($468/year instead of $588/year — saving you $120).</p></div>
    </div>
  </div>
</section>

<!-- ============ CTA BANNER ============ -->
<section class="cta-banner">
  <div class="cta-inner">
    <h2>Ready to get started?</h2>
    <p>Join 50,000+ teams already building faster. Start your free trial today.</p>
    <div class="cta-btns">
      <button class="btn-white shimmer-btn" id="ctaStart" onclick="launchConfetti()">Start Free Trial <i class="fas fa-arrow-right" style="margin-left:6px"></i></button>
      <button class="btn-ghost">Talk to Sales</button>
    </div>
  </div>
</section>

<!-- ============ FOOTER ============ -->
<footer class="footer">
  <div class="footer-grid">
    <div class="footer-brand">
      <div class="f-logo"><span class="f-icon">L</span> LUXE</div>
      <p>Build better products faster. The all-in-one platform for modern teams who demand performance, reliability, and beautiful design.</p>
      <div class="footer-social">
        <a href="#"><i class="fab fa-twitter"></i></a>
        <a href="#"><i class="fab fa-github"></i></a>
        <a href="#"><i class="fab fa-linkedin-in"></i></a>
        <a href="#"><i class="fab fa-discord"></i></a>
        <a href="#"><i class="fab fa-youtube"></i></a>
      </div>
    </div>
    <div class="footer-col">
      <h4>Product</h4>
      <ul>
        <li><a href="#">Features</a></li>
        <li><a href="#">Pricing</a></li>
        <li><a href="#">Integrations</a></li>
        <li><a href="#">Changelog</a></li>
        <li><a href="#">Roadmap</a></li>
        <li><a href="#">API Docs</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Company</h4>
      <ul>
        <li><a href="#">About</a></li>
        <li><a href="#">Blog</a></li>
        <li><a href="#">Careers</a></li>
        <li><a href="#">Press Kit</a></li>
        <li><a href="#">Contact</a></li>
        <li><a href="#">Partners</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Legal</h4>
      <ul>
        <li><a href="#">Privacy Policy</a></li>
        <li><a href="#">Terms of Service</a></li>
        <li><a href="#">Cookie Policy</a></li>
        <li><a href="#">GDPR</a></li>
        <li><a href="#">Security</a></li>
        <li><a href="#">Status</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <div>&copy; 2025 LUXE. All rights reserved.</div>
    <div class="payments">
      <span><i class="fab fa-cc-visa"></i> Visa</span>
      <span><i class="fab fa-cc-mastercard"></i> MC</span>
      <span><i class="fab fa-cc-amex"></i> Amex</span>
      <span><i class="fab fa-cc-stripe"></i> Stripe</span>
      <span><i class="fab fa-paypal"></i> PayPal</span>
    </div>
  </div>
</footer>

<!-- ============ SCRIPTS ============ -->
<script>
/* ── Billing Toggle ── */
let isAnnual = false;
const monthlyLabel = document.getElementById('monthlyLabel');
const annualLabel = document.getElementById('annualLabel');

monthlyLabel.addEventListener('click', () => { if(isAnnual) toggleBilling(); });
annualLabel.addEventListener('click', () => { if(!isAnnual) toggleBilling(); });

function toggleBilling() {
  isAnnual = !isAnnual;
  monthlyLabel.classList.toggle('active', !isAnnual);
  annualLabel.classList.toggle('active', isAnnual);

  document.querySelectorAll('.price-val').forEach(el => {
    const target = isAnnual ? parseInt(el.dataset.y) : parseInt(el.dataset.m);
    animateNumber(el, parseInt(el.textContent), target, 400);
  });

  document.querySelectorAll('.comp-price').forEach(el => {
    el.textContent = isAnnual ? el.dataset.y : el.dataset.m;
  });

  const wasEls = ['starterWas', 'proWas'];
  wasEls.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = isAnnual ? 'inline' : 'none';
  });

  updateCalculator();
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  const diff = to - from;
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + diff * eased);
    if(progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ── FAQ Accordion ── */
function toggleFaq(q) {
  const item = q.parentElement;
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if(!wasOpen) item.classList.add('open');
}

/* ── Plan Selection ── */
function selectPlan(plan) {
  launchConfetti();
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);animation:fadeIn .3s';
  const box = document.createElement('div');
  box.style.cssText = 'background:#111;border:1px solid #222;border-radius:24px;padding:48px;text-align:center;max-width:400px;width:90%;animation:slideUp .4s cubic-bezier(.22,1,.36,1)';
  box.innerHTML = '<div style="width:64px;height:64px;border-radius:50%;background:rgba(16,185,129,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px;color:#10b981"><i class="fas fa-check"></i></div><h3 style="font-size:22px;font-weight:800;margin-bottom:8px">Great choice!</h3><p style="font-size:14px;color:#71717a;margin-bottom:24px;line-height:1.6">You selected the <strong style="color:#f0f0f5">' + plan + '</strong> plan. Your 14-day free trial starts now.</p><button onclick="this.closest(\'div[style]\').parentElement.remove()" style="padding:12px 32px;background:#7c3aed;color:#fff;border:none;border-radius:100px;font-size:14px;font-weight:700;cursor:pointer">Continue</button>';
  modal.appendChild(box);
  modal.addEventListener('click', (e) => { if(e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

/* ── Confetti ── */
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#7c3aed','#a855f7','#ec4899','#3b82f6','#10b981','#f59e0b','#fff'];
  const particles = [];

  for(let i = 0; i < 150; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - .5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - .5) * 20,
      vy: Math.random() * -18 - 5,
      w: Math.random() * 10 + 4,
      h: Math.random() * 6 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - .5) * 15,
      gravity: .4 + Math.random() * .2,
      opacity: 1
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.vx *= .99;
      if(frame > 40) p.opacity -= .015;
      if(p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
      }
    });
    frame++;
    if(alive && frame < 200) requestAnimationFrame(animate);
    else canvas.remove();
  }
  requestAnimationFrame(animate);
}

/* ── Calculator ── */
const teamSlider = document.getElementById('teamSlider');
const projSlider = document.getElementById('projSlider');
const storSlider = document.getElementById('storSlider');
const apiSlider = document.getElementById('apiSlider');

[teamSlider, projSlider, storSlider, apiSlider].forEach(s => {
  s.addEventListener('input', updateCalculator);
});

function updateCalculator() {
  const team = parseInt(teamSlider.value);
  const proj = parseInt(projSlider.value);
  const stor = parseInt(storSlider.value);
  const api = parseInt(apiSlider.value);

  document.getElementById('teamVal').textContent = team;
  document.getElementById('projVal').textContent = proj;
  document.getElementById('storVal').textContent = stor + ' GB';
  document.getElementById('apiVal').textContent = api ? 'Yes' : 'No';

  let plan, price, priceY, features;

  if(team <= 1 && proj <= 2 && stor <= 1 && !api) {
    plan = 'Free'; price = 0; priceY = 0;
    features = ['2 projects included', '500 MB storage', 'Community support'];
  } else if(team <= 3 && proj <= 10 && stor <= 10 && !api) {
    plan = 'Starter'; price = 19; priceY = 15;
    features = ['10 projects included', '10 GB storage', '3 team members', 'Email support'];
  } else if(team <= 15 && proj <= 50 && stor <= 100) {
    plan = 'Pro'; price = 49; priceY = 39;
    features = ['Unlimited projects', '100 GB storage', '15 team members', 'API access', 'Priority support'];
  } else {
    plan = 'Enterprise'; price = 0; priceY = 0;
    features = ['Unlimited everything', 'Dedicated support', 'Custom SLA', 'SSO / SAML'];
  }

  const displayPrice = isAnnual ? priceY : price;
  document.getElementById('recPlan').textContent = 'Recommended: ' + plan;
  document.getElementById('recPrice').textContent = plan === 'Enterprise' ? 'Custom' : '$' + displayPrice;
  document.getElementById('recPeriod').textContent = plan === 'Enterprise' ? 'Contact us for a quote' : 'per month' + (isAnnual ? ' (billed annually)' : '');

  const saveEl = document.getElementById('recSave');
  if(price > 0 && !isAnnual) {
    saveEl.style.display = 'inline-flex';
    document.getElementById('recSaveText').textContent = 'Save $' + ((price - priceY) * 12) + '/year with annual billing';
  } else {
    saveEl.style.display = price > 0 ? 'inline-flex' : 'none';
    if(price > 0) document.getElementById('recSaveText').textContent = 'You are saving $' + ((price - priceY) * 12) + '/year!';
  }

  const featList = document.getElementById('recFeatures');
  featList.innerHTML = features.map(f => '<li><i class="fas fa-check"></i> ' + f + '</li>').join('');
}
updateCalculator();

/* ── Scroll Reveal ── */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ── Sticky Nav ── */
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  if(window.scrollY > 50) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
  lastScroll = window.scrollY;
});

/* ── Smooth scroll ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if(target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ── Add animation keyframes ── */
const style = document.createElement('style');
style.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
document.head.appendChild(style);

/* ═══ MAGIC UI — Glow Card Mouse Track ═══ */
document.querySelectorAll('.glow-card').forEach(card => {
  const glow = document.createElement('div');
  glow.className = 'glow-effect';
  card.appendChild(glow);
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    glow.style.left = (e.clientX - rect.left) + 'px';
    glow.style.top = (e.clientY - rect.top) + 'px';
  });
});

/* ═══ MAGIC UI — Logos Marquee ═══ */
const logosRow = document.querySelector('.logos-row');
if(logosRow) {
  const items = logosRow.innerHTML;
  logosRow.classList.add('magic-marquee');
  logosRow.innerHTML = '<div class="magic-marquee-track">' + items + items + '</div>';
}
</script>
</body>
</html>`, language: 'html' },
    },
  },
  {
    name: 'E-commerce', desc: 'Product showcase with cart, filters & animated product cards', icon: '🛍',
    files: {
      'index.html': { content: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MAISON — Premium Store</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap');

/* ── Reset & Tokens ── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#fafaf9;--bg-alt:#f5f5f4;--card:#ffffff;
  --text:#1c1917;--text-secondary:#44403c;--muted:#78716c;--muted-light:#a8a29e;
  --accent:#1c1917;--accent-hover:#292524;
  --gold:#b8860b;--gold-light:#fef3c7;--gold-glow:rgba(184,134,11,.12);
  --success:#059669;--error:#dc2626;--sale:#ef4444;
  --border:#e7e5e4;--border-light:#f5f5f4;
  --serif:'Playfair Display',Georgia,serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  --shadow-sm:0 1px 3px rgba(28,25,23,.04);
  --shadow-md:0 4px 16px rgba(28,25,23,.06);
  --shadow-lg:0 12px 40px rgba(28,25,23,.08);
  --shadow-xl:0 20px 60px rgba(28,25,23,.12);
  --radius:12px;--radius-lg:16px;--radius-xl:24px;
  --max-w:1200px;
  --transition:all .3s cubic-bezier(.4,0,.2,1);
}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;scroll-behavior:smooth}
body{font-family:var(--sans);background:var(--bg);color:var(--text);line-height:1.6}
::selection{background:var(--accent);color:#fff}
a{text-decoration:none;color:inherit}
button{font-family:inherit;cursor:pointer}
img{max-width:100%;display:block}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:var(--bg-alt)}
::-webkit-scrollbar-thumb{background:var(--muted-light);border-radius:3px}

/* ── Animations ── */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeInDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes slideRight{from{transform:translateX(-100%)}to{transform:translateX(0)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes heartBeat{0%{transform:scale(1)}15%{transform:scale(1.3)}30%{transform:scale(1)}45%{transform:scale(1.15)}60%,100%{transform:scale(1)}}
@keyframes cartBounce{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes progressFill{from{width:0}to{width:var(--fill,0%)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}50%{transform:translateX(4px)}75%{transform:translateX(-4px)}}

.anim{opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease}
.anim.visible{opacity:1;transform:translateY(0)}
.stagger-1{transition-delay:.1s}.stagger-2{transition-delay:.2s}.stagger-3{transition-delay:.3s}
.stagger-4{transition-delay:.4s}.stagger-5{transition-delay:.5s}.stagger-6{transition-delay:.6s}
.stagger-7{transition-delay:.7s}.stagger-8{transition-delay:.8s}

/* ── Announcement Bar ── */
.announcement{background:var(--accent);color:#fff;text-align:center;padding:10px 24px;font-size:12px;font-weight:500;letter-spacing:.04em;position:relative;overflow:hidden}
.announcement .marquee-wrap{display:flex;gap:80px;animation:marquee 30s linear infinite;white-space:nowrap}
.announcement span{display:flex;align-items:center;gap:6px;flex-shrink:0}
.announcement i{font-size:10px;color:var(--gold)}
.announcement .close-ann{position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,.6);font-size:14px;cursor:pointer;transition:var(--transition);z-index:1}
.announcement .close-ann:hover{color:#fff}

/* ── Navigation ── */
.nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid var(--border)}
.nav-inner{max-width:var(--max-w);margin:0 auto;padding:0 32px;height:68px;display:flex;align-items:center;justify-content:space-between}
.nav-brand{font-family:var(--serif);font-size:26px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.nav-links{display:flex;gap:32px;position:absolute;left:50%;transform:translateX(-50%)}
.nav-link{font-size:13px;font-weight:500;color:var(--muted);letter-spacing:.02em;padding:4px 0;position:relative;transition:var(--transition)}
.nav-link:hover{color:var(--text)}
.nav-link::after{content:'';position:absolute;bottom:-2px;left:0;width:0;height:1.5px;background:var(--accent);transition:width .3s}
.nav-link:hover::after{width:100%}
.nav-link.active{color:var(--text);font-weight:600}
.nav-link.active::after{width:100%}
.nav-actions{display:flex;align-items:center;gap:4px}
.nav-icon{width:40px;height:40px;border-radius:10px;border:none;background:transparent;color:var(--text);font-size:16px;display:flex;align-items:center;justify-content:center;transition:var(--transition);position:relative}
.nav-icon:hover{background:var(--bg-alt)}
.nav-icon .badge{position:absolute;top:4px;right:4px;width:18px;height:18px;background:var(--sale);color:#fff;border-radius:50%;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
.nav-icon .badge.empty{display:none}

/* ── Search Overlay ── */
.search-overlay{position:fixed;inset:0;background:rgba(28,25,23,.5);backdrop-filter:blur(8px);z-index:200;display:none;align-items:flex-start;justify-content:center;padding:100px 24px;animation:fadeIn .2s}
.search-overlay.active{display:flex}
.search-box{width:100%;max-width:620px;background:var(--card);border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:var(--shadow-xl);overflow:hidden;animation:scaleIn .2s}
.search-header{display:flex;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid var(--border)}
.search-header i{color:var(--muted);font-size:17px}
.search-header input{flex:1;border:none;background:transparent;font-size:16px;color:var(--text);outline:none;font-family:var(--sans)}
.search-header input::placeholder{color:var(--muted-light)}
.search-header kbd{padding:3px 8px;background:var(--bg-alt);border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--muted)}
.search-popular{padding:20px}
.search-popular h4{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:12px}
.search-popular-items{display:flex;flex-wrap:wrap;gap:6px}
.search-popular-tag{padding:6px 14px;background:var(--bg-alt);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text-secondary);cursor:pointer;transition:var(--transition)}
.search-popular-tag:hover{border-color:var(--accent);background:var(--accent);color:#fff}

/* ── Hero ── */
.hero{max-width:var(--max-w);margin:0 auto;padding:64px 32px 48px}
.hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center}
.hero-text h1{font-family:var(--serif);font-size:clamp(36px,5vw,56px);font-weight:700;line-height:1.1;letter-spacing:-.02em;margin-bottom:16px}
.hero-text h1 em{font-style:italic;color:var(--gold)}
.hero-text p{font-size:17px;color:var(--muted);line-height:1.7;margin-bottom:32px;max-width:440px}
.hero-btns{display:flex;gap:12px;flex-wrap:wrap}
.btn-primary{padding:14px 32px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;transition:var(--transition);display:flex;align-items:center;gap:8px}
.btn-primary:hover{background:var(--accent-hover);transform:translateY(-2px);box-shadow:var(--shadow-lg)}
.btn-secondary{padding:14px 32px;background:transparent;color:var(--text);border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-weight:600;transition:var(--transition)}
.btn-secondary:hover{border-color:var(--accent);background:var(--bg-alt)}
.hero-stats{display:flex;gap:32px;margin-top:40px}
.hero-stat .stat-num{font-size:28px;font-weight:800;letter-spacing:-.02em;display:block}
.hero-stat .stat-label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.hero-visual{position:relative;height:480px;border-radius:var(--radius-xl);overflow:hidden;background:linear-gradient(135deg,#f5f5f4 0%,#e7e5e4 50%,#d6d3d1 100%)}
.hero-visual .hero-product{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.hero-visual .hero-product-card{width:280px;background:#fff;border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-xl);animation:float 6s ease-in-out infinite;text-align:center}
.hero-visual .hero-product-card .product-icon{font-size:80px;margin-bottom:16px;display:block}
.hero-visual .hero-product-card .product-name{font-family:var(--serif);font-size:18px;font-weight:600;margin-bottom:4px}
.hero-visual .hero-product-card .product-price{font-size:22px;font-weight:800;color:var(--gold)}
.hero-visual .floating-badge{position:absolute;background:#fff;border-radius:12px;padding:10px 16px;box-shadow:var(--shadow-lg);display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;animation:float 5s ease-in-out infinite}
.hero-visual .floating-badge.b1{top:20%;left:8%;animation-delay:0s}
.hero-visual .floating-badge.b2{bottom:20%;right:8%;animation-delay:2s}
.hero-visual .floating-badge.b3{top:15%;right:10%;animation-delay:4s}
.hero-visual .floating-badge i{font-size:14px}
.hero-visual .floating-badge .green{color:var(--success)}
.hero-visual .floating-badge .gold{color:var(--gold)}

/* ── Logo Bar ── */
.logo-bar{max-width:var(--max-w);margin:0 auto;padding:32px;border-top:1px solid var(--border)}
.logo-bar-inner{display:flex;justify-content:center;align-items:center;gap:48px;flex-wrap:wrap;opacity:.35}
.logo-bar-inner span{font-size:18px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-family:var(--sans)}

/* ── Category Filters ── */
.filters-section{max-width:var(--max-w);margin:48px auto 0;padding:0 32px}
.filters-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.filters-left{display:flex;gap:6px;flex-wrap:wrap}
.filter-pill{padding:9px 22px;border-radius:100px;border:1px solid var(--border);background:transparent;font-size:13px;font-weight:500;color:var(--muted);transition:var(--transition)}
.filter-pill:hover{border-color:var(--accent);color:var(--text)}
.filter-pill.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.filter-pill .pill-count{margin-left:4px;opacity:.6;font-size:11px}
.filters-right{display:flex;align-items:center;gap:12px}
.sort-select{padding:8px 14px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--card);font-family:var(--sans);outline:none;cursor:pointer}
.view-btns{display:flex;gap:3px}
.view-btn{width:34px;height:34px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:13px;display:flex;align-items:center;justify-content:center;transition:var(--transition)}
.view-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.result-count{font-size:13px;color:var(--muted);margin-bottom:20px;padding:0 32px;max-width:var(--max-w);margin-left:auto;margin-right:auto}

/* ── Products Grid ── */
.products{max-width:var(--max-w);margin:0 auto;padding:0 32px 64px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.product{background:var(--card);border-radius:var(--radius-lg);border:1px solid var(--border);overflow:hidden;transition:var(--transition);cursor:pointer;position:relative}
.product:hover{transform:translateY(-6px);box-shadow:var(--shadow-lg)}
.product:hover .product-img .overlay{opacity:1}
.product .badge-tag{position:absolute;top:14px;left:14px;padding:5px 12px;border-radius:8px;font-size:10px;font-weight:700;z-index:2;letter-spacing:.02em;text-transform:uppercase}
.badge-new{background:var(--accent);color:#fff}
.badge-sale{background:var(--sale);color:#fff}
.badge-hot{background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff}
.badge-limited{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff}
.product-img{height:280px;position:relative;overflow:hidden;transition:var(--transition)}
.product:hover .product-img{transform:scale(1.02)}
.product-img .overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;opacity:0;background:rgba(28,25,23,.2);backdrop-filter:blur(2px);transition:opacity .3s}
.overlay-btn{width:42px;height:42px;border-radius:10px;border:none;background:rgba(255,255,255,.95);cursor:pointer;font-size:15px;transition:var(--transition);display:flex;align-items:center;justify-content:center;color:var(--text);backdrop-filter:blur(4px)}
.overlay-btn:hover{transform:scale(1.1);background:#fff;box-shadow:var(--shadow-md)}
.overlay-btn.wishlisted{color:var(--sale)}
.product-body{padding:16px 18px 20px}
.product-cat{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:6px}
.product-name{font-size:15px;font-weight:600;margin-bottom:4px;line-height:1.35}
.product-colors{display:flex;gap:4px;margin-bottom:8px}
.color-dot{width:14px;height:14px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:var(--transition)}
.color-dot:hover,.color-dot.active{border-color:var(--accent);transform:scale(1.15)}
.product-price-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.price-now{font-size:17px;font-weight:800}
.price-old{font-size:13px;color:var(--muted);text-decoration:line-through}
.price-save{font-size:11px;font-weight:700;color:var(--success);background:rgba(5,150,105,.08);padding:2px 8px;border-radius:4px}
.product-rating{display:flex;align-items:center;gap:6px}
.stars{display:flex;gap:1px;color:#f59e0b;font-size:11px}
.rating-count{font-size:11px;color:var(--muted)}
.product-add{width:100%;padding:10px;margin-top:12px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;transition:var(--transition);opacity:0;transform:translateY(8px)}
.product:hover .product-add{opacity:1;transform:translateY(0)}
.product-add:hover{background:var(--accent-hover)}

/* ── Featured Collection ── */
.featured-collection{max-width:var(--max-w);margin:0 auto;padding:0 32px 64px}
.fc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.fc-header h2{font-family:var(--serif);font-size:28px;font-weight:700;letter-spacing:-.01em}
.fc-header .fc-link{font-size:13px;font-weight:600;color:var(--muted);display:flex;align-items:center;gap:6px;transition:var(--transition)}
.fc-header .fc-link:hover{color:var(--accent)}
.fc-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;height:480px}
.fc-large{border-radius:var(--radius-xl);overflow:hidden;position:relative;cursor:pointer;transition:var(--transition);background:linear-gradient(135deg,#1c1917,#292524)}
.fc-large:hover{transform:scale(.99);box-shadow:var(--shadow-xl)}
.fc-large .fc-content{position:absolute;bottom:0;left:0;right:0;padding:40px;color:#fff;background:linear-gradient(0deg,rgba(0,0,0,.7),transparent)}
.fc-large .fc-content h3{font-family:var(--serif);font-size:28px;font-weight:700;margin-bottom:8px}
.fc-large .fc-content p{font-size:14px;opacity:.8;margin-bottom:16px}
.fc-large .fc-content .fc-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 24px;background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;font-size:13px;font-weight:600;transition:var(--transition)}
.fc-large .fc-content .fc-btn:hover{background:rgba(255,255,255,.25)}
.fc-right{display:grid;grid-template-rows:1fr 1fr;gap:20px}
.fc-small{border-radius:var(--radius-lg);overflow:hidden;position:relative;cursor:pointer;transition:var(--transition)}
.fc-small:hover{transform:scale(.98)}
.fc-small .fc-content{position:absolute;bottom:0;left:0;right:0;padding:24px;color:#fff;background:linear-gradient(0deg,rgba(0,0,0,.6),transparent)}
.fc-small .fc-content h4{font-size:18px;font-weight:700;margin-bottom:4px}
.fc-small .fc-content p{font-size:12px;opacity:.7}

/* ── Promo Banner ── */
.promo-banner{max-width:var(--max-w);margin:0 auto 64px;padding:0 32px}
.promo-inner{background:linear-gradient(135deg,#1c1917 0%,#292524 40%,#44403c 100%);border-radius:var(--radius-xl);padding:56px 48px;display:flex;align-items:center;justify-content:space-between;gap:32px;position:relative;overflow:hidden;color:#fff}
.promo-inner::before{content:'';position:absolute;top:-50%;right:-20%;width:500px;height:500px;background:radial-gradient(circle,rgba(184,134,11,.15),transparent 70%);pointer-events:none}
.promo-text{position:relative;z-index:1}
.promo-text .promo-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:rgba(184,134,11,.2);border:1px solid rgba(184,134,11,.3);border-radius:20px;font-size:11px;font-weight:700;color:var(--gold);margin-bottom:16px;text-transform:uppercase;letter-spacing:.06em}
.promo-text h2{font-family:var(--serif);font-size:32px;font-weight:700;margin-bottom:8px}
.promo-text p{font-size:15px;color:rgba(255,255,255,.6);margin-bottom:24px}
.promo-text .promo-code{display:inline-flex;align-items:center;gap:10px;padding:10px 18px;background:rgba(255,255,255,.08);border:1px dashed rgba(255,255,255,.2);border-radius:8px;font-size:14px;font-weight:700;letter-spacing:.1em;cursor:pointer;transition:var(--transition)}
.promo-text .promo-code:hover{background:rgba(255,255,255,.12)}
.promo-text .promo-code i{font-size:12px;color:var(--gold)}
.promo-countdown{position:relative;z-index:1;text-align:center}
.promo-countdown .countdown-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.5);margin-bottom:12px}
.countdown-boxes{display:flex;gap:10px}
.countdown-box{background:rgba(255,255,255,.08);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px 18px;text-align:center;min-width:64px}
.countdown-box .num{font-size:28px;font-weight:800;display:block;line-height:1}
.countdown-box .unit{font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}

/* ── Reviews Section ── */
.reviews{max-width:var(--max-w);margin:0 auto;padding:0 32px 64px}
.reviews h2{font-family:var(--serif);font-size:28px;font-weight:700;text-align:center;margin-bottom:8px}
.reviews .reviews-sub{text-align:center;font-size:14px;color:var(--muted);margin-bottom:32px}
.reviews-summary{display:flex;align-items:center;justify-content:center;gap:32px;padding:28px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);margin-bottom:32px}
.reviews-big-score{text-align:center;min-width:120px}
.reviews-big-score .big-num{font-size:48px;font-weight:900;line-height:1;display:block}
.reviews-big-score .big-stars{color:#f59e0b;font-size:16px;margin:6px 0 4px;display:flex;justify-content:center;gap:2px}
.reviews-big-score .big-count{font-size:12px;color:var(--muted)}
.reviews-bars{flex:1;max-width:320px}
.review-bar{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.review-bar .bar-label{font-size:12px;font-weight:600;min-width:12px}
.review-bar .bar-track{flex:1;height:8px;background:var(--bg-alt);border-radius:4px;overflow:hidden}
.review-bar .bar-fill{height:100%;background:linear-gradient(90deg,#fbbf24,#f59e0b);border-radius:4px;animation:progressFill 1s ease forwards}
.review-bar .bar-pct{font-size:11px;color:var(--muted);min-width:28px;text-align:right}
.reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.review-card{padding:24px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);transition:var(--transition)}
.review-card:hover{border-color:var(--gold);box-shadow:0 4px 16px var(--gold-glow)}
.review-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.review-author{display:flex;align-items:center;gap:10px}
.review-av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0}
.review-author-info .rv-name{font-size:14px;font-weight:600}
.review-author-info .rv-badge{display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--success);font-weight:600}
.review-author-info .rv-badge i{font-size:8px}
.review-stars{color:#f59e0b;font-size:12px;display:flex;gap:1px}
.review-text{font-size:14px;color:var(--text-secondary);line-height:1.65;margin-bottom:12px}
.review-product{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-alt);border-radius:8px;font-size:12px;color:var(--muted)}
.review-product i{font-size:10px}
.review-date{font-size:11px;color:var(--muted-light);margin-top:10px}

/* ── Features Strip ── */
.features-strip{max-width:var(--max-w);margin:0 auto;padding:0 32px 64px}
.features-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.feature-card{padding:28px 24px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);text-align:center;transition:var(--transition)}
.feature-card:hover{border-color:var(--gold);transform:translateY(-4px);box-shadow:0 8px 24px var(--gold-glow)}
.feature-icon{width:52px;height:52px;border-radius:14px;background:var(--bg-alt);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:20px;color:var(--accent);transition:var(--transition)}
.feature-card:hover .feature-icon{background:var(--accent);color:#fff}
.feature-card h4{font-size:14px;font-weight:700;margin-bottom:4px}
.feature-card p{font-size:12px;color:var(--muted);line-height:1.5}

/* ── Newsletter ── */
.newsletter{max-width:var(--max-w);margin:0 auto;padding:0 32px 80px}
.nl-inner{background:var(--accent);border-radius:var(--radius-xl);padding:64px 48px;text-align:center;position:relative;overflow:hidden;color:#fff}
.nl-inner::before{content:'';position:absolute;top:-40%;left:-10%;width:400px;height:400px;background:radial-gradient(circle,rgba(184,134,11,.2),transparent 70%);pointer-events:none}
.nl-inner::after{content:'';position:absolute;bottom:-30%;right:-10%;width:300px;height:300px;background:radial-gradient(circle,rgba(184,134,11,.15),transparent 70%);pointer-events:none}
.nl-icon{font-size:32px;margin-bottom:20px;display:block;position:relative;z-index:1}
.nl-inner h2{font-family:var(--serif);font-size:32px;font-weight:700;margin-bottom:10px;position:relative;z-index:1}
.nl-inner .nl-sub{font-size:15px;color:rgba(255,255,255,.65);margin-bottom:28px;position:relative;z-index:1}
.nl-inner form{display:flex;gap:10px;max-width:440px;margin:0 auto;position:relative;z-index:1}
.nl-inner input{flex:1;padding:14px 20px;border-radius:10px;border:2px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;font-size:14px;font-family:var(--sans);outline:none;transition:var(--transition)}
.nl-inner input::placeholder{color:rgba(255,255,255,.4)}
.nl-inner input:focus{border-color:var(--gold);background:rgba(255,255,255,.12)}
.nl-inner button{padding:14px 28px;background:var(--gold);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;transition:var(--transition);white-space:nowrap}
.nl-inner button:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(184,134,11,.4)}
.nl-trust{display:flex;justify-content:center;gap:20px;margin-top:16px;position:relative;z-index:1}
.nl-trust span{font-size:11px;color:rgba(255,255,255,.45);display:flex;align-items:center;gap:4px}
.nl-trust i{color:var(--gold);font-size:10px}

/* ── Footer ── */
.site-footer{background:var(--bg-alt);border-top:1px solid var(--border)}
.footer-inner{max-width:var(--max-w);margin:0 auto;padding:56px 32px 0}
.footer-grid{display:grid;grid-template-columns:2fr repeat(3,1fr) 1.5fr;gap:40px;margin-bottom:40px}
.footer-brand{font-family:var(--serif);font-size:24px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}
.footer-desc{font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:16px}
.footer-social{display:flex;gap:6px}
.footer-social a{width:34px;height:34px;border-radius:8px;background:var(--card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;transition:var(--transition)}
.footer-social a:hover{background:var(--accent);color:#fff;border-color:var(--accent);transform:translateY(-2px)}
.footer-col h4{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:14px}
.footer-col a{display:block;font-size:13px;color:var(--text-secondary);padding:3px 0;transition:var(--transition)}
.footer-col a:hover{color:var(--accent);transform:translateX(4px)}
.footer-payments{margin-top:12px;display:flex;gap:8px}
.footer-payments .pay-icon{width:40px;height:26px;background:var(--card);border:1px solid var(--border);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--muted)}
.footer-bottom{display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
.footer-bottom-links{display:flex;gap:20px}
.footer-bottom-links a{color:var(--muted);transition:var(--transition)}
.footer-bottom-links a:hover{color:var(--accent)}

/* ── Cart Sidebar ── */
.cart-overlay{position:fixed;inset:0;background:rgba(28,25,23,.5);backdrop-filter:blur(4px);z-index:300;display:none;animation:fadeIn .2s}
.cart-overlay.active{display:block}
.cart-panel{position:fixed;top:0;right:0;bottom:0;width:420px;max-width:100%;background:var(--card);box-shadow:-8px 0 40px rgba(0,0,0,.1);z-index:301;display:none;flex-direction:column;animation:slideRight .3s ease reverse}
.cart-panel.active{display:flex;animation:none}
.cart-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid var(--border)}
.cart-header h3{font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px}
.cart-header h3 .cart-badge{padding:2px 10px;background:var(--accent);color:#fff;border-radius:20px;font-size:11px}
.cart-close{width:36px;height:36px;border-radius:8px;border:none;background:var(--bg-alt);font-size:16px;color:var(--text);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:var(--transition)}
.cart-close:hover{background:var(--border)}
.cart-items{flex:1;overflow-y:auto;padding:16px 24px}
.cart-item{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--border-light)}
.cart-item-img{width:72px;height:72px;border-radius:10px;flex-shrink:0}
.cart-item-info{flex:1;min-width:0}
.cart-item-info .ci-name{font-size:14px;font-weight:600;margin-bottom:2px}
.cart-item-info .ci-variant{font-size:11px;color:var(--muted);margin-bottom:8px}
.cart-item-info .ci-bottom{display:flex;justify-content:space-between;align-items:center}
.qty-control{display:flex;align-items:center;border:1px solid var(--border);border-radius:6px;overflow:hidden}
.qty-control button{width:28px;height:28px;border:none;background:transparent;font-size:14px;cursor:pointer;transition:var(--transition);color:var(--text)}
.qty-control button:hover{background:var(--bg-alt)}
.qty-control span{padding:0 10px;font-size:13px;font-weight:600;line-height:28px}
.ci-price{font-size:14px;font-weight:700}
.cart-item-remove{background:none;border:none;color:var(--muted-light);cursor:pointer;font-size:12px;padding:4px;transition:var(--transition);align-self:flex-start}
.cart-item-remove:hover{color:var(--sale)}
.cart-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;text-align:center;color:var(--muted)}
.cart-empty i{font-size:48px;margin-bottom:16px;opacity:.3}
.cart-empty h4{font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px}
.cart-empty p{font-size:13px}
.cart-footer{padding:20px 24px;border-top:1px solid var(--border)}
.cart-subtotal{display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px}
.cart-subtotal.total{font-weight:700;font-size:16px;padding-top:10px;border-top:1px solid var(--border);margin-top:10px}
.cart-checkout{width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;margin-top:14px;transition:var(--transition);display:flex;align-items:center;justify-content:center;gap:8px}
.cart-checkout:hover{background:var(--accent-hover);transform:translateY(-1px)}
.cart-continue{width:100%;padding:10px;background:transparent;border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:600;color:var(--muted);margin-top:8px;transition:var(--transition)}
.cart-continue:hover{border-color:var(--accent);color:var(--text)}

/* ── Responsive ── */
@media(max-width:1024px){
  .products{grid-template-columns:repeat(3,1fr)}
  .hero-grid{grid-template-columns:1fr}
  .hero-visual{height:320px;margin-top:32px}
  .fc-grid{height:auto;grid-template-columns:1fr}
  .fc-large{min-height:280px}
  .fc-right{grid-template-columns:1fr 1fr}
  .features-grid{grid-template-columns:repeat(2,1fr)}
  .reviews-grid{grid-template-columns:1fr 1fr}
  .footer-grid{grid-template-columns:repeat(3,1fr)}
  .promo-inner{flex-direction:column;text-align:center}
}
@media(max-width:768px){
  .products{grid-template-columns:repeat(2,1fr)}
  .nav-links{display:none}
  .hero{padding:32px 16px}
  .hero-text h1{font-size:32px}
  .hero-btns{flex-direction:column}
  .hero-stats{gap:20px}
  .fc-right{grid-template-columns:1fr}
  .reviews-summary{flex-direction:column;gap:20px}
  .reviews-grid{grid-template-columns:1fr}
  .features-grid{grid-template-columns:1fr 1fr}
  .footer-grid{grid-template-columns:1fr 1fr}
  .countdown-boxes{gap:6px}
  .countdown-box{min-width:52px;padding:12px 14px}
  .countdown-box .num{font-size:22px}
  .cart-panel{width:100%}
}
@media(max-width:480px){
  .products{grid-template-columns:1fr;gap:14px}
  .features-grid{grid-template-columns:1fr}
  .footer-grid{grid-template-columns:1fr}
  .nl-inner{padding:40px 20px}
  .nl-inner form{flex-direction:column}
  .filters-row{flex-direction:column;align-items:flex-start}
  .filters-left{overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px;width:100%}
  .filters-left::-webkit-scrollbar{display:none}
}

/* ═══ MAGIC UI — Shimmer CTA ═══ */
.shimmer-btn{position:relative;overflow:hidden;isolation:isolate}.shimmer-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);animation:shimmer-sweep 3s ease-in-out infinite;z-index:1}@keyframes shimmer-sweep{0%,100%{left:-100%}50%{left:150%}}
/* ═══ MAGIC UI — Glow Card (light) ═══ */
.glow-card{position:relative;overflow:hidden;z-index:1}.glow-card .glow-effect{position:absolute;width:350px;height:350px;background:radial-gradient(circle,rgba(184,134,11,.06),transparent 70%);border-radius:50%;opacity:0;transition:opacity .5s;pointer-events:none;transform:translate(-50%,-50%);z-index:0}.glow-card:hover .glow-effect{opacity:1}
/* ═══ MAGIC UI — Border Beam (gold) ═══ */
@property --beam-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
.border-beam{position:relative;overflow:hidden}.border-beam::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:2px;background:conic-gradient(from var(--beam-angle),transparent 60%,var(--gold) 80%,transparent 100%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:beam-spin 5s linear infinite;pointer-events:none;z-index:2}@keyframes beam-spin{to{--beam-angle:360deg}}
/* ═══ MAGIC UI — Dot Pattern (light) ═══ */
.magic-dots-light{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(28,25,23,.04) 1px,transparent 1px);background-size:20px 20px;pointer-events:none;mask-image:radial-gradient(ellipse at center,black 30%,transparent 70%);z-index:0}
/* ═══ MAGIC UI — Magic Marquee ═══ */
.magic-marquee{display:flex;overflow:hidden;gap:48px;width:100%}.magic-marquee-track{display:flex;gap:48px;animation:magic-marquee-scroll 25s linear infinite;flex-shrink:0}.magic-marquee:hover .magic-marquee-track{animation-play-state:paused}@keyframes magic-marquee-scroll{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}
/* ═══ MAGIC UI — Blur Fade ═══ */
.magic-reveal{opacity:0;filter:blur(5px);transform:translateY(16px);transition:all .7s cubic-bezier(.22,1,.36,1)}.magic-reveal.visible{opacity:1;filter:blur(0);transform:translateY(0)}
/* ═══ MAGIC UI — Shine Hover ═══ */
.shine-hover{position:relative;overflow:hidden}.shine-hover::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(184,134,11,.06),transparent);transition:left .6s}.shine-hover:hover::after{left:150%}
</style>
</head>
<body>

<!-- Announcement Bar -->
<div class="announcement" id="announcementBar">
  <div class="marquee-wrap">
    <span><i class="fa-solid fa-truck-fast"></i> Free shipping on orders over \\$99</span>
    <span><i class="fa-solid fa-tag"></i> New arrivals just dropped</span>
    <span><i class="fa-solid fa-gift"></i> Gift wrap available at checkout</span>
    <span><i class="fa-solid fa-rotate-left"></i> 30-day hassle-free returns</span>
    <span><i class="fa-solid fa-truck-fast"></i> Free shipping on orders over \\$99</span>
    <span><i class="fa-solid fa-tag"></i> New arrivals just dropped</span>
    <span><i class="fa-solid fa-gift"></i> Gift wrap available at checkout</span>
    <span><i class="fa-solid fa-rotate-left"></i> 30-day hassle-free returns</span>
  </div>
  <button class="close-ann" onclick="this.parentElement.style.display='none'">&times;</button>
</div>

<!-- Navigation -->
<nav class="nav">
  <div class="nav-inner">
    <a href="#" class="nav-brand">Maison</a>
    <div class="nav-links">
      <a href="#" class="nav-link active">New In</a>
      <a href="#" class="nav-link">Women</a>
      <a href="#" class="nav-link">Men</a>
      <a href="#" class="nav-link">Collections</a>
      <a href="#" class="nav-link">Sale</a>
    </div>
    <div class="nav-actions">
      <button class="nav-icon search-trigger"><i class="fa-solid fa-magnifying-glass"></i></button>
      <button class="nav-icon wishlist-icon"><i class="fa-regular fa-heart"></i><span class="badge empty" id="wishBadge">0</span></button>
      <button class="nav-icon cart-trigger" id="cartTrigger"><i class="fa-solid fa-bag-shopping"></i><span class="badge empty" id="cartBadge">0</span></button>
    </div>
  </div>
</nav>

<!-- Search Overlay -->
<div class="search-overlay" id="searchOverlay">
  <div class="search-box">
    <div class="search-header">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" placeholder="Search products, collections..." id="searchInput" autocomplete="off">
      <kbd>ESC</kbd>
    </div>
    <div class="search-popular">
      <h4>Popular Searches</h4>
      <div class="search-popular-items">
        <span class="search-popular-tag">Leather bags</span>
        <span class="search-popular-tag">White sneakers</span>
        <span class="search-popular-tag">Summer collection</span>
        <span class="search-popular-tag">Watches</span>
        <span class="search-popular-tag">Linen</span>
        <span class="search-popular-tag">New arrivals</span>
      </div>
    </div>
  </div>
</div>

<!-- Hero -->
<section class="hero anim" style="position:relative;overflow:hidden">
  <div class="magic-dots-light"></div>
  <div class="hero-grid" style="position:relative;z-index:1">
    <div class="hero-text">
      <h1>Curated with care,<br>crafted with <em>soul</em></h1>
      <p>Timeless essentials designed to elevate your everyday. Every piece is hand-picked for quality, sustainability, and style.</p>
      <div class="hero-btns">
        <button class="btn-primary shimmer-btn" onclick="document.querySelector('.products').scrollIntoView({behavior:'smooth'})"><i class="fa-solid fa-bag-shopping"></i> Shop Collection</button>
        <button class="btn-secondary">Our Story <i class="fa-solid fa-arrow-right" style="font-size:12px"></i></button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><span class="stat-num">2,400+</span><span class="stat-label">Products</span></div>
        <div class="hero-stat"><span class="stat-num">12K+</span><span class="stat-label">Happy Customers</span></div>
        <div class="hero-stat"><span class="stat-num">4.9</span><span class="stat-label">Avg Rating</span></div>
      </div>
    </div>
    <div class="hero-visual">
      <div class="hero-product">
        <div class="hero-product-card">
          <span class="product-icon">\\ud83d\\udc5c</span>
          <div class="product-name">Artisan Leather Bag</div>
          <div class="product-price">\\$289</div>
        </div>
      </div>
      <div class="floating-badge b1"><i class="fa-solid fa-star gold"></i> 4.9 Rating</div>
      <div class="floating-badge b2"><i class="fa-solid fa-check-circle green"></i> In Stock</div>
      <div class="floating-badge b3"><i class="fa-solid fa-truck-fast gold"></i> Free Ship</div>
    </div>
  </div>
</section>

<!-- Logo Bar -->
<div class="logo-bar anim">
  <div class="logo-bar-inner">
    <span>Vogue</span><span>GQ</span><span>Harper's</span><span>Elle</span><span>Monocle</span><span>WSJ</span>
  </div>
</div>

<!-- Filters -->
<section class="filters-section anim">
  <div class="filters-row">
    <div class="filters-left">
      <button class="filter-pill active" data-cat="all">All <span class="pill-count">(24)</span></button>
      <button class="filter-pill" data-cat="bags">Bags <span class="pill-count">(6)</span></button>
      <button class="filter-pill" data-cat="shoes">Shoes <span class="pill-count">(5)</span></button>
      <button class="filter-pill" data-cat="accessories">Accessories <span class="pill-count">(4)</span></button>
      <button class="filter-pill" data-cat="clothing">Clothing <span class="pill-count">(5)</span></button>
      <button class="filter-pill" data-cat="watches">Watches <span class="pill-count">(4)</span></button>
    </div>
    <div class="filters-right">
      <select class="sort-select">
        <option>Featured</option>
        <option>Price: Low to High</option>
        <option>Price: High to Low</option>
        <option>Newest</option>
        <option>Best Selling</option>
      </select>
      <div class="view-btns">
        <button class="view-btn active"><i class="fa-solid fa-grid-2"></i></button>
        <button class="view-btn"><i class="fa-solid fa-list"></i></button>
      </div>
    </div>
  </div>
</section>
<div class="result-count">Showing <strong>8</strong> of 24 products</div>

<!-- Products Grid -->
<div class="products" id="productsGrid">
  <!-- Product 1 -->
  <div class="product anim stagger-1 glow-card shine-hover" data-cat="bags" data-price="289">
    <div class="glow-effect"></div>
    <span class="badge-tag badge-new">New</span>
    <div class="product-img" style="background:linear-gradient(135deg,#f5f5f4,#e7e5e4)">
      <div class="overlay">
        <button class="overlay-btn" title="Quick view"><i class="fa-solid fa-eye"></i></button>
        <button class="overlay-btn add-to-cart-btn" title="Add to cart" data-name="Leather Weekender" data-price="289"><i class="fa-solid fa-plus"></i></button>
        <button class="overlay-btn wishlist-btn" title="Wishlist"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-cat">Bags</div>
      <div class="product-name">Leather Weekender Bag</div>
      <div class="product-colors">
        <span class="color-dot active" style="background:#1c1917"></span>
        <span class="color-dot" style="background:#92400e"></span>
        <span class="color-dot" style="background:#78716c"></span>
      </div>
      <div class="product-price-row"><span class="price-now">\\$289</span></div>
      <div class="product-rating"><span class="stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i></span><span class="rating-count">(128)</span></div>
      <button class="product-add add-to-cart-btn" data-name="Leather Weekender" data-price="289"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
    </div>
  </div>

  <!-- Product 2 -->
  <div class="product anim stagger-2 glow-card shine-hover" data-cat="shoes" data-price="159">
    <div class="glow-effect"></div>
    <div class="product-img" style="background:linear-gradient(135deg,#fef3c7,#fde68a)">
      <div class="overlay">
        <button class="overlay-btn" title="Quick view"><i class="fa-solid fa-eye"></i></button>
        <button class="overlay-btn add-to-cart-btn" title="Add to cart" data-name="White Sneakers" data-price="159"><i class="fa-solid fa-plus"></i></button>
        <button class="overlay-btn wishlist-btn" title="Wishlist"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-cat">Shoes</div>
      <div class="product-name">Minimal White Sneakers</div>
      <div class="product-colors">
        <span class="color-dot active" style="background:#fafaf9;border:1px solid #e7e5e4"></span>
        <span class="color-dot" style="background:#1c1917"></span>
        <span class="color-dot" style="background:#b8860b"></span>
      </div>
      <div class="product-price-row"><span class="price-now">\\$159</span></div>
      <div class="product-rating"><span class="stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></span><span class="rating-count">(312)</span></div>
      <button class="product-add add-to-cart-btn" data-name="White Sneakers" data-price="159"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
    </div>
  </div>

  <!-- Product 3 -->
  <div class="product anim stagger-3 glow-card shine-hover" data-cat="accessories" data-price="199">
    <div class="glow-effect"></div>
    <span class="badge-tag badge-sale">-30%</span>
    <div class="product-img" style="background:linear-gradient(135deg,#ede9fe,#ddd6fe)">
      <div class="overlay">
        <button class="overlay-btn" title="Quick view"><i class="fa-solid fa-eye"></i></button>
        <button class="overlay-btn add-to-cart-btn" title="Add to cart" data-name="Analog Watch" data-price="199"><i class="fa-solid fa-plus"></i></button>
        <button class="overlay-btn wishlist-btn" title="Wishlist"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-cat">Accessories</div>
      <div class="product-name">Classic Analog Watch</div>
      <div class="product-colors">
        <span class="color-dot active" style="background:#78716c"></span>
        <span class="color-dot" style="background:#b8860b"></span>
        <span class="color-dot" style="background:#1c1917"></span>
      </div>
      <div class="product-price-row"><span class="price-now">\\$199</span><span class="price-old">\\$285</span><span class="price-save">Save 30%</span></div>
      <div class="product-rating"><span class="stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i></span><span class="rating-count">(94)</span></div>
      <button class="product-add add-to-cart-btn" data-name="Analog Watch" data-price="199"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
    </div>
  </div>

  <!-- Product 4 -->
  <div class="product anim stagger-4 glow-card shine-hover" data-cat="clothing" data-price="129">
    <div class="glow-effect"></div>
    <span class="badge-tag badge-hot"><i class="fa-solid fa-fire"></i> Hot</span>
    <div class="product-img" style="background:linear-gradient(135deg,#d1fae5,#a7f3d0)">
      <div class="overlay">
        <button class="overlay-btn" title="Quick view"><i class="fa-solid fa-eye"></i></button>
        <button class="overlay-btn add-to-cart-btn" title="Add to cart" data-name="Merino Sweater" data-price="129"><i class="fa-solid fa-plus"></i></button>
        <button class="overlay-btn wishlist-btn" title="Wishlist"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-cat">Clothing</div>
      <div class="product-name">Merino Wool Sweater</div>
      <div class="product-colors">
        <span class="color-dot active" style="background:#059669"></span>
        <span class="color-dot" style="background:#1c1917"></span>
        <span class="color-dot" style="background:#78716c"></span>
        <span class="color-dot" style="background:#92400e"></span>
      </div>
      <div class="product-price-row"><span class="price-now">\\$129</span></div>
      <div class="product-rating"><span class="stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i></span><span class="rating-count">(207)</span></div>
      <button class="product-add add-to-cart-btn" data-name="Merino Sweater" data-price="129"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
    </div>
  </div>

  <!-- Product 5 -->
  <div class="product anim stagger-5 glow-card shine-hover" data-cat="bags" data-price="79">
    <div class="glow-effect"></div>
    <div class="product-img" style="background:linear-gradient(135deg,#fce7f3,#fbcfe8)">
      <div class="overlay">
        <button class="overlay-btn" title="Quick view"><i class="fa-solid fa-eye"></i></button>
        <button class="overlay-btn add-to-cart-btn" title="Add to cart" data-name="Canvas Tote" data-price="79"><i class="fa-solid fa-plus"></i></button>
        <button class="overlay-btn wishlist-btn" title="Wishlist"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-cat">Bags</div>
      <div class="product-name">Canvas Tote Bag</div>
      <div class="product-colors">
        <span class="color-dot active" style="background:#fce7f3;border:1px solid #e7e5e4"></span>
        <span class="color-dot" style="background:#fef3c7;border:1px solid #e7e5e4"></span>
        <span class="color-dot" style="background:#1c1917"></span>
      </div>
      <div class="product-price-row"><span class="price-now">\\$79</span></div>
      <div class="product-rating"><span class="stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i></span><span class="rating-count">(56)</span></div>
      <button class="product-add add-to-cart-btn" data-name="Canvas Tote" data-price="79"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
    </div>
  </div>

  <!-- Product 6 -->
  <div class="product anim stagger-6 glow-card shine-hover" data-cat="shoes" data-price="249">
    <div class="glow-effect"></div>
    <span class="badge-tag badge-limited"><i class="fa-solid fa-gem"></i> Limited</span>
    <div class="product-img" style="background:linear-gradient(135deg,#e0e7ff,#c7d2fe)">
      <div class="overlay">
        <button class="overlay-btn" title="Quick view"><i class="fa-solid fa-eye"></i></button>
        <button class="overlay-btn add-to-cart-btn" title="Add to cart" data-name="Chelsea Boots" data-price="249"><i class="fa-solid fa-plus"></i></button>
        <button class="overlay-btn wishlist-btn" title="Wishlist"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-cat">Shoes</div>
      <div class="product-name">Suede Chelsea Boots</div>
      <div class="product-colors">
        <span class="color-dot active" style="background:#44403c"></span>
        <span class="color-dot" style="background:#1c1917"></span>
        <span class="color-dot" style="background:#92400e"></span>
      </div>
      <div class="product-price-row"><span class="price-now">\\$249</span></div>
      <div class="product-rating"><span class="stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></span><span class="rating-count">(189)</span></div>
      <button class="product-add add-to-cart-btn" data-name="Chelsea Boots" data-price="249"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
    </div>
  </div>

  <!-- Product 7 -->
  <div class="product anim stagger-7 glow-card shine-hover" data-cat="watches" data-price="349">
    <div class="glow-effect"></div>
    <div class="product-img" style="background:linear-gradient(135deg,#fef9c3,#fef08a)">
      <div class="overlay">
        <button class="overlay-btn" title="Quick view"><i class="fa-solid fa-eye"></i></button>
        <button class="overlay-btn add-to-cart-btn" title="Add to cart" data-name="Titanium Watch" data-price="349"><i class="fa-solid fa-plus"></i></button>
        <button class="overlay-btn wishlist-btn" title="Wishlist"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-cat">Watches</div>
      <div class="product-name">Titanium Chronograph</div>
      <div class="product-colors">
        <span class="color-dot active" style="background:#b8860b"></span>
        <span class="color-dot" style="background:#78716c"></span>
        <span class="color-dot" style="background:#1c1917"></span>
      </div>
      <div class="product-price-row"><span class="price-now">\\$349</span></div>
      <div class="product-rating"><span class="stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i></span><span class="rating-count">(74)</span></div>
      <button class="product-add add-to-cart-btn" data-name="Titanium Watch" data-price="349"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
    </div>
  </div>

  <!-- Product 8 -->
  <div class="product anim stagger-8 glow-card shine-hover" data-cat="clothing" data-price="199">
    <div class="glow-effect"></div>
    <span class="badge-tag badge-sale">-20%</span>
    <div class="product-img" style="background:linear-gradient(135deg,#f3e8ff,#e9d5ff)">
      <div class="overlay">
        <button class="overlay-btn" title="Quick view"><i class="fa-solid fa-eye"></i></button>
        <button class="overlay-btn add-to-cart-btn" title="Add to cart" data-name="Linen Blazer" data-price="199"><i class="fa-solid fa-plus"></i></button>
        <button class="overlay-btn wishlist-btn" title="Wishlist"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-cat">Clothing</div>
      <div class="product-name">Linen Blazer</div>
      <div class="product-colors">
        <span class="color-dot active" style="background:#a78bfa"></span>
        <span class="color-dot" style="background:#1c1917"></span>
        <span class="color-dot" style="background:#fafaf9;border:1px solid #e7e5e4"></span>
      </div>
      <div class="product-price-row"><span class="price-now">\\$199</span><span class="price-old">\\$249</span><span class="price-save">Save 20%</span></div>
      <div class="product-rating"><span class="stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i></span><span class="rating-count">(43)</span></div>
      <button class="product-add add-to-cart-btn" data-name="Linen Blazer" data-price="199"><i class="fa-solid fa-bag-shopping"></i> Add to Cart</button>
    </div>
  </div>
</div>

<!-- Featured Collection -->
<section class="featured-collection anim">
  <div class="fc-header">
    <h2>Curated Collections</h2>
    <a href="#" class="fc-link">View all <i class="fa-solid fa-arrow-right"></i></a>
  </div>
  <div class="fc-grid">
    <div class="fc-large" style="background:linear-gradient(135deg,#1c1917,#44403c)">
      <div class="fc-content">
        <h3>Summer Essentials</h3>
        <p>Light fabrics, timeless silhouettes. 28 pieces crafted for warmer days.</p>
        <span class="fc-btn">Explore Collection <i class="fa-solid fa-arrow-right"></i></span>
      </div>
    </div>
    <div class="fc-right">
      <div class="fc-small" style="background:linear-gradient(135deg,#92400e,#b8860b)">
        <div class="fc-content">
          <h4>Leather Goods</h4>
          <p>12 handcrafted pieces</p>
        </div>
      </div>
      <div class="fc-small" style="background:linear-gradient(135deg,#1e293b,#334155)">
        <div class="fc-content">
          <h4>Minimalist Watches</h4>
          <p>Swiss movement, clean design</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Promo Banner -->
<section class="promo-banner anim">
  <div class="promo-inner">
    <div class="promo-text">
      <div class="promo-badge"><i class="fa-solid fa-bolt"></i> Limited Time</div>
      <h2>Exclusive Members Sale</h2>
      <p>Get 25% off your entire order. Use code at checkout.</p>
      <div class="promo-code" onclick="navigator.clipboard.writeText('MAISON25');this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Copied!'">MAISON25 <i class="fa-regular fa-copy"></i></div>
    </div>
    <div class="promo-countdown">
      <div class="countdown-label">Offer ends in</div>
      <div class="countdown-boxes">
        <div class="countdown-box"><span class="num" id="cd-days">02</span><span class="unit">Days</span></div>
        <div class="countdown-box"><span class="num" id="cd-hours">14</span><span class="unit">Hours</span></div>
        <div class="countdown-box"><span class="num" id="cd-mins">37</span><span class="unit">Mins</span></div>
        <div class="countdown-box"><span class="num" id="cd-secs">52</span><span class="unit">Secs</span></div>
      </div>
    </div>
  </div>
</section>

<!-- Reviews -->
<section class="reviews anim">
  <h2>What Customers Say</h2>
  <p class="reviews-sub">Trusted by 12,000+ happy customers worldwide</p>
  <div class="reviews-summary">
    <div class="reviews-big-score">
      <span class="big-num">4.9</span>
      <div class="big-stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></div>
      <div class="big-count">Based on 2,847 reviews</div>
    </div>
    <div class="reviews-bars">
      <div class="review-bar"><span class="bar-label">5</span><div class="bar-track"><div class="bar-fill" style="--fill:82%"></div></div><span class="bar-pct">82%</span></div>
      <div class="review-bar"><span class="bar-label">4</span><div class="bar-track"><div class="bar-fill" style="--fill:12%"></div></div><span class="bar-pct">12%</span></div>
      <div class="review-bar"><span class="bar-label">3</span><div class="bar-track"><div class="bar-fill" style="--fill:4%"></div></div><span class="bar-pct">4%</span></div>
      <div class="review-bar"><span class="bar-label">2</span><div class="bar-track"><div class="bar-fill" style="--fill:1%"></div></div><span class="bar-pct">1%</span></div>
      <div class="review-bar"><span class="bar-label">1</span><div class="bar-track"><div class="bar-fill" style="--fill:1%"></div></div><span class="bar-pct">1%</span></div>
    </div>
  </div>
  <div class="reviews-grid">
    <div class="review-card">
      <div class="review-top">
        <div class="review-author"><div class="review-av" style="background:linear-gradient(135deg,#f59e0b,#d97706)">JM</div><div class="review-author-info"><div class="rv-name">Jessica M.</div><div class="rv-badge"><i class="fa-solid fa-check-circle"></i> Verified</div></div></div>
        <div class="review-stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></div>
      </div>
      <div class="review-text">"The quality is absolutely incredible. The leather weekender bag exceeded all my expectations. Worth every penny\\u2014it's now my go-to travel companion."</div>
      <div class="review-product"><i class="fa-solid fa-bag-shopping"></i> Leather Weekender Bag</div>
      <div class="review-date">2 days ago</div>
    </div>
    <div class="review-card">
      <div class="review-top">
        <div class="review-author"><div class="review-av" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)">AT</div><div class="review-author-info"><div class="rv-name">Alex T.</div><div class="rv-badge"><i class="fa-solid fa-check-circle"></i> Verified</div></div></div>
        <div class="review-stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i></div>
      </div>
      <div class="review-text">"Best sneakers I've ever owned. Clean design, incredibly comfortable, and they go with literally everything. Ordered a second pair immediately."</div>
      <div class="review-product"><i class="fa-solid fa-bag-shopping"></i> Minimal White Sneakers</div>
      <div class="review-date">1 week ago</div>
    </div>
    <div class="review-card">
      <div class="review-top">
        <div class="review-author"><div class="review-av" style="background:linear-gradient(135deg,#ec4899,#db2777)">SK</div><div class="review-author-info"><div class="rv-name">Sarah K.</div><div class="rv-badge"><i class="fa-solid fa-check-circle"></i> Verified</div></div></div>
        <div class="review-stars"><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i></div>
      </div>
      <div class="review-text">"Shopping here is a delight. Fast shipping, beautiful packaging, and the merino sweater is so soft. Customer service was incredibly helpful too."</div>
      <div class="review-product"><i class="fa-solid fa-bag-shopping"></i> Merino Wool Sweater</div>
      <div class="review-date">2 weeks ago</div>
    </div>
  </div>
</section>

<!-- Features Strip -->
<section class="features-strip anim">
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon"><i class="fa-solid fa-truck-fast"></i></div>
      <h4>Free Shipping</h4>
      <p>On all orders over \\$99. Worldwide delivery available.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon"><i class="fa-solid fa-rotate-left"></i></div>
      <h4>Easy Returns</h4>
      <p>30-day hassle-free returns. No questions asked.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon"><i class="fa-solid fa-shield-check"></i></div>
      <h4>Secure Checkout</h4>
      <p>256-bit SSL encryption. Your data is protected.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon"><i class="fa-solid fa-headset"></i></div>
      <h4>24/7 Support</h4>
      <p>Always here to help. Chat, email, or phone.</p>
    </div>
  </div>
</section>

<!-- Newsletter -->
<section class="newsletter anim">
  <div class="nl-inner">
    <span class="nl-icon">\\u2728</span>
    <h2>Join the MAISON Club</h2>
    <p class="nl-sub">Get early access to new arrivals, exclusive offers, and 10% off your first order.</p>
    <form onsubmit="event.preventDefault();var b=this.querySelector('button');b.textContent='Welcome aboard \\u2713';b.style.background='#059669'">
      <input type="email" placeholder="your@email.com" required>
      <button type="submit">Join Free</button>
    </form>
    <div class="nl-trust">
      <span><i class="fa-solid fa-check-circle"></i> 12K+ members</span>
      <span><i class="fa-solid fa-check-circle"></i> No spam</span>
      <span><i class="fa-solid fa-check-circle"></i> Unsubscribe anytime</span>
    </div>
  </div>
</section>

<!-- Cart Sidebar -->
<div class="cart-overlay" id="cartOverlay"></div>
<div class="cart-panel" id="cartPanel">
  <div class="cart-header">
    <h3>Your Bag <span class="cart-badge" id="cartPanelBadge">0</span></h3>
    <button class="cart-close" id="cartClose"><i class="fa-solid fa-xmark"></i></button>
  </div>
  <div class="cart-items" id="cartItems">
    <div class="cart-empty" id="cartEmpty">
      <i class="fa-solid fa-bag-shopping"></i>
      <h4>Your bag is empty</h4>
      <p>Looks like you haven't added anything yet.</p>
    </div>
  </div>
  <div class="cart-footer" id="cartFooter" style="display:none">
    <div class="cart-subtotal"><span>Subtotal</span><span id="cartSubtotal">\\$0</span></div>
    <div class="cart-subtotal"><span>Shipping</span><span>Free</span></div>
    <div class="cart-subtotal total"><span>Total</span><span id="cartTotal">\\$0</span></div>
    <button class="cart-checkout"><i class="fa-solid fa-lock"></i> Checkout</button>
    <button class="cart-continue" id="cartContinue">Continue Shopping</button>
  </div>
</div>

<!-- Footer -->
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">Maison</div>
        <p class="footer-desc">Curated essentials for the modern individual. Quality over quantity, always.</p>
        <div class="footer-social">
          <a href="#"><i class="fa-brands fa-instagram"></i></a>
          <a href="#"><i class="fa-brands fa-x-twitter"></i></a>
          <a href="#"><i class="fa-brands fa-pinterest-p"></i></a>
          <a href="#"><i class="fa-brands fa-tiktok"></i></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Shop</h4>
        <a href="#">New Arrivals</a><a href="#">Women</a><a href="#">Men</a><a href="#">Accessories</a><a href="#">Sale</a>
      </div>
      <div class="footer-col">
        <h4>Help</h4>
        <a href="#">Shipping</a><a href="#">Returns</a><a href="#">Size Guide</a><a href="#">Track Order</a><a href="#">FAQ</a>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="#">About</a><a href="#">Sustainability</a><a href="#">Careers</a><a href="#">Press</a><a href="#">Contact</a>
      </div>
      <div>
        <div class="footer-col">
          <h4>We Accept</h4>
        </div>
        <div class="footer-payments">
          <div class="pay-icon"><i class="fa-brands fa-cc-visa"></i></div>
          <div class="pay-icon"><i class="fa-brands fa-cc-mastercard"></i></div>
          <div class="pay-icon"><i class="fa-brands fa-cc-amex"></i></div>
          <div class="pay-icon"><i class="fa-brands fa-cc-apple-pay"></i></div>
          <div class="pay-icon"><i class="fa-brands fa-google-pay"></i></div>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2025 Maison. All rights reserved.</span>
      <div class="footer-bottom-links">
        <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a><a href="#">Accessibility</a>
      </div>
    </div>
  </div>
</footer>

<script>
/* ── Cart State ── */
var cart = [];
function updateCartUI(){
  var badge = document.getElementById('cartBadge');
  var panelBadge = document.getElementById('cartPanelBadge');
  var itemsEl = document.getElementById('cartItems');
  var emptyEl = document.getElementById('cartEmpty');
  var footerEl = document.getElementById('cartFooter');
  var subtotalEl = document.getElementById('cartSubtotal');
  var totalEl = document.getElementById('cartTotal');
  var count = cart.reduce(function(s,i){ return s + i.qty; }, 0);
  badge.textContent = count;
  panelBadge.textContent = count;
  badge.classList.toggle('empty', count === 0);
  if(count === 0){
    emptyEl.style.display = 'flex';
    footerEl.style.display = 'none';
    var items = itemsEl.querySelectorAll('.cart-item');
    items.forEach(function(i){ i.remove(); });
  } else {
    emptyEl.style.display = 'none';
    footerEl.style.display = 'block';
    var existing = itemsEl.querySelectorAll('.cart-item');
    existing.forEach(function(i){ i.remove(); });
    var total = 0;
    cart.forEach(function(item, idx){
      total += item.price * item.qty;
      var div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = '<div class="cart-item-img" style="background:linear-gradient(135deg,#f5f5f4,#e7e5e4)"></div>'
        + '<div class="cart-item-info"><div class="ci-name">' + item.name + '</div><div class="ci-variant">One size / Default</div>'
        + '<div class="ci-bottom"><div class="qty-control"><button onclick="changeQty(' + idx + ',-1)">\\u2212</button><span>' + item.qty + '</span><button onclick="changeQty(' + idx + ',1)">+</button></div>'
        + '<span class="ci-price">\\$' + (item.price * item.qty) + '</span></div></div>'
        + '<button class="cart-item-remove" onclick="removeItem(' + idx + ')"><i class="fa-solid fa-trash-can"></i></button>';
      itemsEl.appendChild(div);
    });
    subtotalEl.textContent = '\\$' + total;
    totalEl.textContent = '\\$' + total;
  }
}
function addToCart(name, price){
  var found = cart.find(function(i){ return i.name === name; });
  if(found){ found.qty++; } else { cart.push({ name: name, price: price, qty: 1 }); }
  updateCartUI();
  openCart();
  var badge = document.getElementById('cartBadge');
  badge.style.animation = 'cartBounce .4s';
  setTimeout(function(){ badge.style.animation = ''; }, 400);
}
function changeQty(idx, delta){
  cart[idx].qty += delta;
  if(cart[idx].qty <= 0) cart.splice(idx, 1);
  updateCartUI();
}
function removeItem(idx){
  cart.splice(idx, 1);
  updateCartUI();
}
function openCart(){
  document.getElementById('cartOverlay').classList.add('active');
  document.getElementById('cartPanel').classList.add('active');
}
function closeCart(){
  document.getElementById('cartOverlay').classList.remove('active');
  document.getElementById('cartPanel').classList.remove('active');
}
document.getElementById('cartTrigger').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);
document.getElementById('cartContinue').addEventListener('click', closeCart);

/* Add-to-cart buttons */
document.querySelectorAll('.add-to-cart-btn').forEach(function(btn){
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    addToCart(btn.dataset.name, parseInt(btn.dataset.price));
  });
});

/* ── Wishlist Toggle ── */
document.querySelectorAll('.wishlist-btn').forEach(function(btn){
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    btn.classList.toggle('wishlisted');
    var icon = btn.querySelector('i');
    icon.className = btn.classList.contains('wishlisted') ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    if(btn.classList.contains('wishlisted')) icon.style.animation = 'heartBeat .6s';
    setTimeout(function(){ icon.style.animation = ''; }, 600);
  });
});

/* ── Category Filters ── */
document.querySelectorAll('.filter-pill').forEach(function(pill){
  pill.addEventListener('click', function(){
    document.querySelectorAll('.filter-pill').forEach(function(p){ p.classList.remove('active'); });
    pill.classList.add('active');
    var cat = pill.dataset.cat;
    document.querySelectorAll('.product').forEach(function(p){
      var match = cat === 'all' || p.dataset.cat === cat;
      if(match){
        p.style.display = '';
        p.style.opacity = '0';
        p.style.transform = 'translateY(20px)';
        requestAnimationFrame(function(){
          p.style.transition = 'all .4s ease';
          p.style.opacity = '1';
          p.style.transform = 'translateY(0)';
        });
      } else {
        p.style.opacity = '0';
        p.style.transform = 'translateY(10px)';
        setTimeout(function(){ p.style.display = 'none'; }, 300);
      }
    });
  });
});

/* ── View Toggle ── */
document.querySelectorAll('.view-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.view-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
  });
});

/* ── Color Dot Selection ── */
document.querySelectorAll('.color-dot').forEach(function(dot){
  dot.addEventListener('click', function(e){
    e.stopPropagation();
    dot.closest('.product-colors').querySelectorAll('.color-dot').forEach(function(d){ d.classList.remove('active'); });
    dot.classList.add('active');
  });
});

/* ── Search ── */
(function(){
  var overlay = document.getElementById('searchOverlay');
  var input = document.getElementById('searchInput');
  function openSearch(){ overlay.classList.add('active'); setTimeout(function(){ input.focus(); }, 100); }
  function closeSearch(){ overlay.classList.remove('active'); input.value = ''; }
  document.querySelectorAll('.search-trigger').forEach(function(t){ t.addEventListener('click', openSearch); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', function(e){
    if((e.ctrlKey || e.metaKey) && e.key === 'k'){ e.preventDefault(); openSearch(); }
    if(e.key === 'Escape') closeSearch();
  });
  document.querySelectorAll('.search-popular-tag').forEach(function(tag){
    tag.addEventListener('click', function(){ input.value = tag.textContent; input.focus(); });
  });
})();

/* ── Countdown Timer ── */
(function(){
  var end = Date.now() + 2*24*60*60*1000 + 14*60*60*1000 + 37*60*1000;
  function tick(){
    var diff = Math.max(0, end - Date.now());
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    document.getElementById('cd-days').textContent = String(d).padStart(2,'0');
    document.getElementById('cd-hours').textContent = String(h).padStart(2,'0');
    document.getElementById('cd-mins').textContent = String(m).padStart(2,'0');
    document.getElementById('cd-secs').textContent = String(s).padStart(2,'0');
  }
  tick();
  setInterval(tick, 1000);
})();

/* ── Nav Links ── */
document.querySelectorAll('.nav-link').forEach(function(link){
  link.addEventListener('click', function(e){
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(function(l){ l.classList.remove('active'); });
    link.classList.add('active');
  });
});

/* ── Scroll Animations ── */
(function(){
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.anim').forEach(function(el){ observer.observe(el); });
})();

/* ── Magic UI — Glow Card Mouse Tracking ── */
document.querySelectorAll('.glow-card').forEach(function(card){
  card.addEventListener('mousemove',function(e){
    var r=card.getBoundingClientRect();
    var g=card.querySelector('.glow-effect');
    if(g){g.style.left=e.clientX-r.left+'px';g.style.top=e.clientY-r.top+'px';}
  });
});
</script>
</body>
</html>`, language: 'html' },
    },
  },
  {
    name: 'Blog', desc: 'Modern blog / newsletter with featured posts & clean typography', icon: '✍',
    files: {
      'index.html': { content: `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Journal — Design & Technology Blog</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&display=swap');

/* ── Reset & Variables ── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#fafaf9;--bg-alt:#f5f5f4;--card:#ffffff;--card-hover:#fafaf9;
  --text:#1c1917;--text-secondary:#44403c;--muted:#78716c;--muted-light:#a8a29e;
  --accent:#7c3aed;--accent-hover:#6d28d9;--accent-light:#ede9fe;--accent-glow:rgba(124,58,237,.15);
  --success:#059669;--warning:#d97706;--error:#dc2626;
  --border:#e7e5e4;--border-light:#f5f5f4;
  --serif:'Newsreader',Georgia,'Times New Roman',serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --shadow-sm:0 1px 2px rgba(28,25,23,.04);
  --shadow-md:0 4px 16px rgba(28,25,23,.06);
  --shadow-lg:0 12px 40px rgba(28,25,23,.08);
  --shadow-xl:0 20px 60px rgba(28,25,23,.12);
  --radius:12px;--radius-lg:16px;--radius-xl:24px;
  --max-w:1120px;--content-w:720px;
  --transition:all .3s cubic-bezier(.4,0,.2,1);
}
[data-theme="dark"]{
  --bg:#0c0a09;--bg-alt:#1c1917;--card:#1c1917;--card-hover:#292524;
  --text:#fafaf9;--text-secondary:#d6d3d1;--muted:#a8a29e;--muted-light:#78716c;
  --accent:#a78bfa;--accent-hover:#8b5cf6;--accent-light:#1e1338;--accent-glow:rgba(167,139,250,.2);
  --border:#292524;--border-light:#1c1917;
  --shadow-sm:0 1px 2px rgba(0,0,0,.2);
  --shadow-md:0 4px 16px rgba(0,0,0,.3);
  --shadow-lg:0 12px 40px rgba(0,0,0,.4);
  --shadow-xl:0 20px 60px rgba(0,0,0,.5);
}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;scroll-behavior:smooth;font-size:16px}
body{font-family:var(--sans);background:var(--bg);color:var(--text);line-height:1.6;transition:background .4s,color .4s}
::selection{background:var(--accent);color:#fff}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:var(--bg-alt)}
::-webkit-scrollbar-thumb{background:var(--muted-light);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--muted)}
a{text-decoration:none;color:inherit}
img{max-width:100%;display:block}
button{font-family:inherit}

/* ── Animations ── */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeInDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeInLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
@keyframes fadeInRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes typeChar{from{width:0}to{width:100%}}
@keyframes blinkCaret{0%,100%{border-color:transparent}50%{border-color:var(--accent)}}
@keyframes progressGrow{from{width:0}to{width:var(--progress,0%)}}
@keyframes heartBeat{0%{transform:scale(1)}15%{transform:scale(1.3)}30%{transform:scale(1)}45%{transform:scale(1.15)}60%,100%{transform:scale(1)}}
@keyframes ripple{to{transform:scale(4);opacity:0}}
@keyframes dotPulse{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}

.animate-on-scroll{opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease}
.animate-on-scroll.visible{opacity:1;transform:translateY(0)}
.stagger-1{transition-delay:.1s}.stagger-2{transition-delay:.2s}.stagger-3{transition-delay:.3s}
.stagger-4{transition-delay:.4s}.stagger-5{transition-delay:.5s}.stagger-6{transition-delay:.6s}

/* ── Reading Progress Bar ── */
.reading-progress{position:fixed;top:0;left:0;width:0;height:3px;background:linear-gradient(90deg,var(--accent),#ec4899);z-index:10000;transition:width .1s linear;border-radius:0 2px 2px 0}
.reading-progress::after{content:'';position:absolute;right:0;top:0;width:40px;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4));border-radius:0 2px 2px 0}

/* ── Navigation ── */
.nav{position:sticky;top:0;z-index:1000;background:rgba(250,250,249,.85);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid var(--border);transition:var(--transition)}
[data-theme="dark"] .nav{background:rgba(12,10,9,.85)}
.nav-inner{max-width:var(--max-w);margin:0 auto;padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between}
.nav-brand{font-family:var(--serif);font-size:24px;font-weight:700;letter-spacing:-.02em;display:flex;align-items:center;gap:10px}
.nav-brand .logo-icon{width:32px;height:32px;background:linear-gradient(135deg,var(--accent),#ec4899);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--serif);font-size:16px;font-weight:700;font-style:italic}
.nav-links{display:flex;align-items:center;gap:8px}
.nav-link{padding:8px 14px;font-size:14px;font-weight:500;color:var(--muted);border-radius:8px;transition:var(--transition);cursor:pointer}
.nav-link:hover{color:var(--text);background:var(--bg-alt)}
.nav-link.active{color:var(--accent);background:var(--accent-light)}
.nav-actions{display:flex;align-items:center;gap:6px}
.nav-icon-btn{width:38px;height:38px;border-radius:10px;border:none;background:transparent;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:var(--transition)}
.nav-icon-btn:hover{background:var(--bg-alt);color:var(--text)}
.nav-icon-btn.theme-toggle i{transition:transform .4s}
.nav-icon-btn.theme-toggle:hover i{transform:rotate(180deg)}
.nav-subscribe{padding:8px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:var(--transition);white-space:nowrap}
.nav-subscribe:hover{background:var(--accent-hover);transform:translateY(-1px);box-shadow:0 4px 12px var(--accent-glow)}

/* ── Search Overlay ── */
.search-overlay{position:fixed;inset:0;background:rgba(28,25,23,.6);backdrop-filter:blur(8px);z-index:2000;display:none;align-items:flex-start;justify-content:center;padding:120px 24px;animation:fadeIn .2s}
.search-overlay.active{display:flex}
[data-theme="dark"] .search-overlay{background:rgba(0,0,0,.7)}
.search-modal{width:100%;max-width:600px;background:var(--card);border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:var(--shadow-xl);animation:scaleIn .25s ease}
.search-header{padding:16px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border)}
.search-header i{color:var(--muted);font-size:18px}
.search-header input{flex:1;border:none;background:transparent;font-size:16px;font-family:var(--sans);color:var(--text);outline:none}
.search-header input::placeholder{color:var(--muted-light)}
.search-header kbd{padding:2px 8px;background:var(--bg-alt);border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--muted);font-family:var(--sans)}
.search-body{padding:16px 20px}
.search-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px}
.search-suggestions{display:flex;flex-direction:column;gap:2px}
.search-suggestion{padding:10px 12px;border-radius:8px;font-size:14px;color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;gap:10px;transition:var(--transition)}
.search-suggestion:hover{background:var(--accent-light);color:var(--accent)}
.search-suggestion i{font-size:12px;color:var(--muted)}
.search-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.search-tag{padding:5px 12px;background:var(--bg-alt);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--muted);cursor:pointer;transition:var(--transition)}
.search-tag:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light)}
.search-footer{padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}
.search-footer span{display:flex;align-items:center;gap:6px}
.search-footer kbd{padding:1px 6px;background:var(--bg-alt);border:1px solid var(--border);border-radius:4px;font-size:10px}

/* ── Hero / Featured Post ── */
.hero{max-width:var(--max-w);margin:48px auto 0;padding:0 32px}
.hero-card{display:grid;grid-template-columns:1.1fr 1fr;border-radius:var(--radius-xl);overflow:hidden;background:var(--card);border:1px solid var(--border);transition:var(--transition);cursor:pointer;position:relative}
.hero-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-4px)}
.hero-image{min-height:440px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 40%,#a855f7 70%,#ec4899 100%);background-size:200% 200%;animation:gradientShift 8s ease infinite;position:relative;overflow:hidden}
.hero-image::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E");opacity:.5}
.hero-image .hero-badge{position:absolute;top:24px;left:24px;padding:6px 16px;background:rgba(255,255,255,.95);border-radius:8px;font-size:12px;font-weight:700;color:var(--accent);display:flex;align-items:center;gap:6px;z-index:1;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.hero-image .hero-badge i{font-size:10px}
.hero-image .hero-shapes{position:absolute;inset:0;z-index:0}
.hero-shape{position:absolute;border-radius:50%;background:rgba(255,255,255,.06);animation:float 6s ease-in-out infinite}
.hero-shape:nth-child(1){width:120px;height:120px;top:20%;right:15%;animation-delay:0s}
.hero-shape:nth-child(2){width:80px;height:80px;bottom:25%;left:20%;animation-delay:2s}
.hero-shape:nth-child(3){width:50px;height:50px;top:40%;left:60%;animation-delay:4s}
.hero-content{padding:48px 44px;display:flex;flex-direction:column;justify-content:center}
.hero-content .meta-row{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.hero-content .category-badge{padding:4px 12px;background:var(--accent-light);color:var(--accent);border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.hero-content .read-time{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px}
.hero-content .read-time i{font-size:11px}
.hero-content .date{font-size:12px;color:var(--muted)}
.hero-content h1{font-family:var(--serif);font-size:32px;font-weight:700;line-height:1.25;letter-spacing:-.02em;margin-bottom:14px}
.hero-content .excerpt{font-size:15px;color:var(--text-secondary);line-height:1.7;margin-bottom:24px}
.hero-author{display:flex;align-items:center;gap:14px}
.hero-author .av{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0}
.hero-author .info .name{font-size:14px;font-weight:600;margin-bottom:1px}
.hero-author .info .role{font-size:12px;color:var(--muted)}
.hero-author .follow-btn{margin-left:auto;padding:6px 16px;border:1px solid var(--border);border-radius:8px;background:transparent;font-size:12px;font-weight:600;color:var(--text);cursor:pointer;transition:var(--transition)}
.hero-author .follow-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light)}

/* ── Category Tabs ── */
.categories{max-width:var(--max-w);margin:48px auto 0;padding:0 32px}
.cat-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.cat-pill{padding:8px 18px;border-radius:20px;border:1px solid var(--border);background:transparent;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;transition:var(--transition);white-space:nowrap}
.cat-pill:hover{border-color:var(--accent);color:var(--accent)}
.cat-pill.active{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 2px 8px var(--accent-glow)}
.cat-count{margin-left:6px;padding:1px 7px;background:rgba(255,255,255,.2);border-radius:10px;font-size:10px;font-weight:700}
.cat-pill:not(.active) .cat-count{background:var(--bg-alt);color:var(--muted)}

/* ── Articles Grid ── */
.articles{max-width:var(--max-w);margin:40px auto 0;padding:0 32px}
.articles-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.articles-header h2{font-size:22px;font-weight:800;letter-spacing:-.01em}
.articles-header .view-toggle{display:flex;gap:4px}
.articles-header .view-btn{width:34px;height:34px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:var(--transition)}
.articles-header .view-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.articles-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.article-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;transition:var(--transition);cursor:pointer;position:relative}
.article-card:hover{transform:translateY(-6px);box-shadow:var(--shadow-lg)}
.article-card:hover .article-img::after{opacity:1}
.article-card.featured-article{grid-column:span 2;display:grid;grid-template-columns:1.2fr 1fr}
.article-card.featured-article .article-img{min-height:280px}
.article-card.featured-article .article-body{padding:32px;display:flex;flex-direction:column;justify-content:center}
.article-card.featured-article .article-title{font-size:24px}
.article-img{height:200px;position:relative;overflow:hidden}
.article-img::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.3),transparent 60%);opacity:0;transition:opacity .3s}
.article-img .bookmark-btn{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.9);border:none;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:var(--transition);z-index:1;backdrop-filter:blur(4px)}
.article-img .bookmark-btn:hover,.article-img .bookmark-btn.saved{color:var(--accent);background:#fff}
.article-img .bookmark-btn.saved{color:var(--accent)}
.article-body{padding:20px}
.article-cat{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:8px}
.article-title{font-family:var(--serif);font-size:19px;font-weight:600;line-height:1.35;margin-bottom:8px;letter-spacing:-.01em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.article-excerpt{font-size:14px;color:var(--muted);line-height:1.65;margin-bottom:16px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.article-footer{display:flex;justify-content:space-between;align-items:center}
.article-author{display:flex;align-items:center;gap:8px}
.article-author .tiny-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;flex-shrink:0}
.article-author span{font-size:12px;font-weight:500;color:var(--text-secondary)}
.article-stats{display:flex;align-items:center;gap:12px;font-size:11px;color:var(--muted)}
.article-stats span{display:flex;align-items:center;gap:4px}
.article-stats i{font-size:10px}
.article-tag{position:absolute;bottom:12px;left:12px;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700;color:#fff;z-index:1}

/* ── Newsletter Mid-CTA ── */
.newsletter-mid{max-width:var(--max-w);margin:64px auto;padding:0 32px}
.newsletter-mid-inner{background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 50%,#4f46e5 100%);border-radius:var(--radius-xl);padding:48px;display:flex;align-items:center;justify-content:space-between;gap:32px;position:relative;overflow:hidden}
.newsletter-mid-inner::before{content:'';position:absolute;top:-50%;right:-10%;width:300px;height:300px;background:rgba(255,255,255,.06);border-radius:50%;animation:float 8s ease infinite}
.newsletter-mid-inner::after{content:'';position:absolute;bottom:-30%;left:5%;width:200px;height:200px;background:rgba(255,255,255,.04);border-radius:50%;animation:float 6s ease infinite reverse}
.newsletter-mid .nl-text{position:relative;z-index:1}
.newsletter-mid .nl-text h3{font-family:var(--serif);font-size:26px;color:#fff;font-weight:700;margin-bottom:6px}
.newsletter-mid .nl-text p{font-size:14px;color:rgba(255,255,255,.75)}
.newsletter-mid form{display:flex;gap:8px;position:relative;z-index:1;flex-shrink:0}
.newsletter-mid input{padding:12px 18px;border-radius:10px;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.12);color:#fff;font-size:14px;font-family:var(--sans);width:260px;outline:none;transition:var(--transition)}
.newsletter-mid input::placeholder{color:rgba(255,255,255,.5)}
.newsletter-mid input:focus{border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.18)}
.newsletter-mid button{padding:12px 28px;background:#fff;color:var(--accent);border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:var(--transition);white-space:nowrap}
.newsletter-mid button:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.2)}

/* ── Trending Section ── */
.trending-section{max-width:var(--max-w);margin:0 auto;padding:0 32px}
.trending-section h2{font-size:22px;font-weight:800;margin-bottom:24px;letter-spacing:-.01em}
.trending-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.trending-item{display:flex;align-items:center;gap:16px;padding:16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:var(--transition)}
.trending-item:hover{border-color:var(--accent);box-shadow:var(--shadow-md);transform:translateX(4px)}
.trending-num{font-size:32px;font-weight:900;color:var(--accent);line-height:1;min-width:42px;font-family:var(--serif)}
.trending-thumb{width:64px;height:64px;border-radius:10px;flex-shrink:0;position:relative;overflow:hidden}
.trending-info{flex:1;min-width:0}
.trending-info .t-cat{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:4px}
.trending-info .t-title{font-family:var(--serif);font-size:15px;font-weight:600;line-height:1.35;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trending-info .t-meta{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:8px}
.trending-fire{font-size:18px;animation:pulse 2s infinite}

/* ── Author Spotlight ── */
.author-spotlight{max-width:var(--max-w);margin:64px auto 0;padding:0 32px}
.author-spotlight h2{font-size:22px;font-weight:800;margin-bottom:24px;letter-spacing:-.01em}
.author-card{display:grid;grid-template-columns:280px 1fr;border-radius:var(--radius-xl);overflow:hidden;background:var(--card);border:1px solid var(--border);transition:var(--transition)}
.author-card:hover{box-shadow:var(--shadow-lg)}
.author-left{background:linear-gradient(135deg,#0f172a,#1e293b);padding:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff}
.author-avatar{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;margin-bottom:16px;border:3px solid rgba(255,255,255,.2);box-shadow:0 0 0 8px rgba(124,58,237,.2)}
.author-left h3{font-family:var(--serif);font-size:20px;font-weight:700;margin-bottom:4px}
.author-left .author-title{font-size:13px;color:rgba(255,255,255,.6);margin-bottom:20px}
.author-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%}
.author-stat{text-align:center}
.author-stat .stat-num{font-size:22px;font-weight:800;display:block}
.author-stat .stat-label{font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em}
.author-left .author-social{display:flex;gap:8px;margin-top:20px}
.author-left .author-social a{width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;transition:var(--transition)}
.author-left .author-social a:hover{background:var(--accent);transform:translateY(-2px)}
.author-right{padding:40px}
.author-right .bio{font-size:15px;color:var(--text-secondary);line-height:1.7;margin-bottom:24px}
.author-right .bio em{color:var(--accent);font-style:normal;font-weight:600}
.author-posts-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:12px}
.author-posts-list{display:flex;flex-direction:column;gap:10px}
.author-post-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;transition:var(--transition);cursor:pointer}
.author-post-item:hover{background:var(--bg-alt)}
.author-post-item .ap-num{font-size:11px;font-weight:700;color:var(--muted-light);min-width:20px}
.author-post-item .ap-title{font-size:14px;font-weight:500;flex:1}
.author-post-item .ap-reads{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:4px}

/* ── Tags Cloud ── */
.tags-cloud{max-width:var(--max-w);margin:64px auto 0;padding:0 32px}
.tags-cloud h2{font-size:22px;font-weight:800;margin-bottom:24px;letter-spacing:-.01em}
.tags-wrap{display:flex;flex-wrap:wrap;gap:8px}
.tag-chip{padding:8px 18px;border-radius:20px;border:1px solid var(--border);background:var(--card);font-size:13px;font-weight:500;color:var(--text-secondary);cursor:pointer;transition:var(--transition);display:flex;align-items:center;gap:6px}
.tag-chip:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-light);transform:translateY(-2px)}
.tag-chip .tag-count{padding:2px 8px;background:var(--bg-alt);border-radius:10px;font-size:10px;font-weight:700;color:var(--muted)}
.tag-chip:hover .tag-count{background:rgba(124,58,237,.15);color:var(--accent)}
.tag-chip.large{font-size:15px;padding:10px 22px;font-weight:600}
.tag-chip.small{font-size:11px;padding:6px 14px}

/* ── Comments Section ── */
.comments-section{max-width:var(--max-w);margin:64px auto 0;padding:0 32px}
.comments-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.comments-header h2{font-size:22px;font-weight:800;letter-spacing:-.01em}
.comments-header .comment-count{padding:4px 12px;background:var(--accent-light);color:var(--accent);border-radius:20px;font-size:12px;font-weight:700}
.comment-compose{display:flex;gap:12px;margin-bottom:32px;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg)}
.comment-compose .compose-av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0}
.comment-compose .compose-input{flex:1;display:flex;flex-direction:column;gap:10px}
.comment-compose textarea{border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-family:var(--sans);font-size:14px;color:var(--text);background:var(--bg);resize:none;outline:none;min-height:80px;transition:var(--transition)}
.comment-compose textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.comment-compose .compose-actions{display:flex;justify-content:flex-end;gap:8px}
.comment-compose .compose-actions button{padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:var(--transition)}
.comment-compose .cancel-btn{background:transparent;border:1px solid var(--border);color:var(--muted)}
.comment-compose .submit-btn{background:var(--accent);border:none;color:#fff}
.comment-compose .submit-btn:hover{background:var(--accent-hover);transform:translateY(-1px)}
.comments-list{display:flex;flex-direction:column;gap:4px}
.comment{padding:20px;border-radius:var(--radius);transition:var(--transition)}
.comment:hover{background:var(--bg-alt)}
.comment-main{display:flex;gap:12px}
.comment .c-av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0}
.comment .c-body{flex:1;min-width:0}
.comment .c-header{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}
.comment .c-name{font-size:14px;font-weight:600}
.comment .c-badge{padding:2px 8px;background:var(--accent-light);color:var(--accent);border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.comment .c-time{font-size:11px;color:var(--muted)}
.comment .c-text{font-size:14px;color:var(--text-secondary);line-height:1.65}
.comment .c-actions{display:flex;gap:16px;margin-top:10px}
.comment .c-action{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer;transition:var(--transition);background:none;border:none;font-family:var(--sans);padding:0}
.comment .c-action:hover{color:var(--accent)}
.comment .c-action.liked{color:#ef4444}
.comment .c-action.liked i{animation:heartBeat .6s}
.comment .c-action i{font-size:11px}
.comment-replies{margin-left:48px;padding-left:16px;border-left:2px solid var(--border);margin-top:4px}
.comment-replies .comment{padding:14px}

/* ── Newsletter Full ── */
.newsletter-full{max-width:var(--max-w);margin:80px auto 0;padding:0 32px}
.newsletter-full-inner{background:var(--text);border-radius:var(--radius-xl);padding:72px 48px;text-align:center;position:relative;overflow:hidden}
.newsletter-full-inner::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,var(--accent-glow) 0%,transparent 70%);opacity:.4;pointer-events:none}
.nl-icon{width:64px;height:64px;background:linear-gradient(135deg,var(--accent),#ec4899);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:28px;color:#fff;position:relative;z-index:1}
.newsletter-full h2{font-family:var(--serif);font-size:36px;color:#fff;font-weight:700;margin-bottom:12px;position:relative;z-index:1}
.newsletter-full .nl-sub{font-size:16px;color:#9ca3af;margin-bottom:32px;position:relative;z-index:1;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.6}
.newsletter-full form{display:flex;gap:10px;max-width:460px;margin:0 auto;position:relative;z-index:1}
.newsletter-full input{flex:1;padding:16px 20px;border-radius:12px;border:2px solid transparent;font-size:15px;font-family:var(--sans);outline:none;background:rgba(255,255,255,.95);transition:var(--transition)}
.newsletter-full input:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-glow)}
.newsletter-full button{padding:16px 32px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:var(--transition);white-space:nowrap}
.newsletter-full button:hover{background:var(--accent-hover);transform:translateY(-2px);box-shadow:0 4px 16px var(--accent-glow)}
.nl-trust{display:flex;justify-content:center;gap:24px;margin-top:20px;position:relative;z-index:1}
.nl-trust span{font-size:12px;color:#6b7280;display:flex;align-items:center;gap:5px}
.nl-trust i{color:var(--accent);font-size:11px}

/* ── Footer ── */
.site-footer{max-width:var(--max-w);margin:80px auto 0;padding:0 32px}
.footer-top{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:48px;padding:48px 0;border-top:1px solid var(--border)}
.footer-brand{font-family:var(--serif);font-size:22px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.footer-brand .f-icon{width:28px;height:28px;background:linear-gradient(135deg,var(--accent),#ec4899);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;font-style:italic;font-family:var(--serif)}
.footer-desc{font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:16px;max-width:280px}
.footer-social{display:flex;gap:6px}
.footer-social a{width:34px;height:34px;border-radius:8px;background:var(--bg-alt);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;transition:var(--transition)}
.footer-social a:hover{background:var(--accent);color:#fff;border-color:var(--accent);transform:translateY(-2px)}
.footer-col h4{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:16px}
.footer-col a{display:block;font-size:14px;color:var(--text-secondary);padding:4px 0;transition:var(--transition)}
.footer-col a:hover{color:var(--accent);transform:translateX(4px)}
.footer-bottom{display:flex;justify-content:space-between;align-items:center;padding:24px 0;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
.footer-bottom a{color:var(--muted);transition:var(--transition)}
.footer-bottom a:hover{color:var(--accent)}
.footer-links{display:flex;gap:20px}

/* ── Responsive ── */
@media(max-width:1100px){
  .articles-grid{grid-template-columns:repeat(2,1fr)}
  .article-card.featured-article{grid-column:span 2}
  .footer-top{grid-template-columns:1fr 1fr;gap:32px}
}
@media(max-width:860px){
  .hero-card{grid-template-columns:1fr}
  .hero-image{min-height:240px}
  .hero-content{padding:32px}
  .hero-content h1{font-size:26px}
  .trending-grid{grid-template-columns:1fr}
  .author-card{grid-template-columns:1fr}
  .author-left{padding:32px}
  .newsletter-mid-inner{flex-direction:column;text-align:center;padding:36px}
  .newsletter-mid form{flex-direction:column;width:100%}
  .newsletter-mid input{width:100%}
  .article-card.featured-article{grid-column:span 1;display:block}
  .article-card.featured-article .article-img{min-height:200px}
  .article-card.featured-article .article-body{padding:20px}
  .article-card.featured-article .article-title{font-size:19px}
  .nav-links{display:none}
}
@media(max-width:640px){
  .nav-inner{padding:0 16px}
  .hero{padding:0 16px;margin-top:24px}
  .categories,.articles,.newsletter-mid,.trending-section,.author-spotlight,.tags-cloud,.comments-section,.newsletter-full,.site-footer{padding:0 16px}
  .articles-grid{grid-template-columns:1fr}
  .article-card.featured-article{grid-column:span 1}
  .newsletter-full-inner{padding:48px 24px}
  .newsletter-full h2{font-size:28px}
  .newsletter-full form{flex-direction:column}
  .footer-top{grid-template-columns:1fr 1fr;gap:24px}
  .footer-bottom{flex-direction:column;gap:12px;text-align:center}
  .cat-row{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:8px}
  .cat-row::-webkit-scrollbar{display:none}
}

/* ═══ MAGIC UI — Shimmer CTA ═══ */
.shimmer-btn{position:relative;overflow:hidden;isolation:isolate}.shimmer-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);animation:shimmer-sweep 3s ease-in-out infinite;z-index:1}@keyframes shimmer-sweep{0%,100%{left:-100%}50%{left:150%}}
/* ═══ MAGIC UI — Glow Card (theme-aware) ═══ */
.glow-card{position:relative;overflow:hidden;z-index:1}.glow-card .glow-effect{position:absolute;width:300px;height:300px;background:radial-gradient(circle,rgba(99,102,241,.06),transparent 70%);border-radius:50%;opacity:0;transition:opacity .5s;pointer-events:none;transform:translate(-50%,-50%);z-index:0}.glow-card:hover .glow-effect{opacity:1}
[data-theme="dark"] .glow-card .glow-effect{background:radial-gradient(circle,rgba(129,140,248,.1),transparent 70%)}
/* ═══ MAGIC UI — Dot Pattern (theme-aware) ═══ */
.magic-dots-blog{position:absolute;inset:0;background-image:radial-gradient(circle,rgba(0,0,0,.04) 1px,transparent 1px);background-size:20px 20px;pointer-events:none;mask-image:radial-gradient(ellipse at center,black 20%,transparent 60%);z-index:0}
[data-theme="dark"] .magic-dots-blog{background-image:radial-gradient(circle,rgba(255,255,255,.04) 1px,transparent 1px)}
/* ═══ MAGIC UI — Border Beam (accent) ═══ */
@property --beam-angle-b{syntax:'<angle>';initial-value:0deg;inherits:false}
.border-beam{position:relative;overflow:hidden}.border-beam::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:2px;background:conic-gradient(from var(--beam-angle-b),transparent 60%,var(--accent) 80%,transparent 100%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:beam-spin-b 5s linear infinite;pointer-events:none;z-index:2}@keyframes beam-spin-b{to{--beam-angle-b:360deg}}
/* ═══ MAGIC UI — Blur Fade ═══ */
.magic-reveal{opacity:0;filter:blur(5px);transform:translateY(16px);transition:all .7s cubic-bezier(.22,1,.36,1)}.magic-reveal.visible{opacity:1;filter:blur(0);transform:translateY(0)}
/* ═══ MAGIC UI — Shine Hover Card ═══ */
.shine-hover{position:relative;overflow:hidden}.shine-hover::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(99,102,241,.04),transparent);transition:left .6s}.shine-hover:hover::after{left:150%}
[data-theme="dark"] .shine-hover::after{background:linear-gradient(90deg,transparent,rgba(129,140,248,.06),transparent)}
</style>
</head>
<body>

<!-- Reading Progress Bar -->
<div class="reading-progress" id="readingProgress"></div>

<!-- Navigation -->
<nav class="nav">
  <div class="nav-inner">
    <a href="#" class="nav-brand">
      <div class="logo-icon">J</div>
      The Journal
    </a>
    <div class="nav-links">
      <a href="#" class="nav-link active">Articles</a>
      <a href="#" class="nav-link">Topics</a>
      <a href="#" class="nav-link">Authors</a>
      <a href="#" class="nav-link">About</a>
    </div>
    <div class="nav-actions">
      <button class="nav-icon-btn search-trigger" title="Search (Ctrl+K)">
        <i class="fa-solid fa-magnifying-glass"></i>
      </button>
      <button class="nav-icon-btn theme-toggle" title="Toggle dark mode">
        <i class="fa-solid fa-moon"></i>
      </button>
      <button class="nav-subscribe shimmer-btn">Subscribe</button>
    </div>
  </div>
</nav>

<!-- Search Overlay -->
<div class="search-overlay" id="searchOverlay">
  <div class="search-modal">
    <div class="search-header">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input type="text" placeholder="Search articles, topics, authors..." id="searchInput" autocomplete="off">
      <kbd>ESC</kbd>
    </div>
    <div class="search-body">
      <div class="search-label">Recent Searches</div>
      <div class="search-suggestions">
        <div class="search-suggestion"><i class="fa-solid fa-clock-rotate-left"></i> Design systems at scale</div>
        <div class="search-suggestion"><i class="fa-solid fa-clock-rotate-left"></i> React server components</div>
        <div class="search-suggestion"><i class="fa-solid fa-clock-rotate-left"></i> AI in product design</div>
      </div>
      <div class="search-label" style="margin-top:20px">Popular Topics</div>
      <div class="search-tags">
        <span class="search-tag">Design</span>
        <span class="search-tag">Engineering</span>
        <span class="search-tag">AI & ML</span>
        <span class="search-tag">Product</span>
        <span class="search-tag">Startup</span>
        <span class="search-tag">UX Research</span>
        <span class="search-tag">Culture</span>
      </div>
    </div>
    <div class="search-footer">
      <span><kbd>\\u2191</kbd><kbd>\\u2193</kbd> Navigate</span>
      <span><kbd>\\u21B5</kbd> Select</span>
      <span><kbd>ESC</kbd> Close</span>
    </div>
  </div>
</div>

<!-- Hero / Featured Post -->
<section class="hero animate-on-scroll" style="position:relative;overflow:hidden">
  <div class="magic-dots-blog"></div>
  <div class="hero-card" style="position:relative;z-index:1">
    <div class="hero-image">
      <div class="hero-badge"><i class="fa-solid fa-star"></i> Editor's Pick</div>
      <div class="hero-shapes">
        <div class="hero-shape"></div>
        <div class="hero-shape"></div>
        <div class="hero-shape"></div>
      </div>
    </div>
    <div class="hero-content">
      <div class="meta-row">
        <span class="category-badge">Design Systems</span>
        <span class="read-time"><i class="fa-regular fa-clock"></i> 12 min read</span>
        <span class="date">Dec 12, 2024</span>
      </div>
      <h1>The Art of Building Design Systems That Actually Scale</h1>
      <p class="excerpt">How the best product teams create consistent, maintainable design systems that evolve gracefully with their products\\u2014without breaking every downstream component.</p>
      <div class="hero-author">
        <div class="av">SM</div>
        <div class="info">
          <div class="name">Sarah Mitchell</div>
          <div class="role">Head of Design at Figma</div>
        </div>
        <button class="follow-btn">+ Follow</button>
      </div>
    </div>
  </div>
</section>

<!-- Category Tabs -->
<section class="categories animate-on-scroll">
  <div class="cat-row">
    <button class="cat-pill active">All <span class="cat-count">42</span></button>
    <button class="cat-pill">Design <span class="cat-count">12</span></button>
    <button class="cat-pill">Engineering <span class="cat-count">9</span></button>
    <button class="cat-pill">Product <span class="cat-count">7</span></button>
    <button class="cat-pill">AI & ML <span class="cat-count">6</span></button>
    <button class="cat-pill">Culture <span class="cat-count">4</span></button>
    <button class="cat-pill">Startup <span class="cat-count">3</span></button>
    <button class="cat-pill">UX Research <span class="cat-count">1</span></button>
  </div>
</section>

<!-- Articles Grid -->
<section class="articles">
  <div class="articles-header">
    <h2>Latest Articles</h2>
    <div class="view-toggle">
      <button class="view-btn active" title="Grid view"><i class="fa-solid fa-grid-2"></i></button>
      <button class="view-btn" title="List view"><i class="fa-solid fa-list"></i></button>
    </div>
  </div>
  <div class="articles-grid">

    <!-- Featured Article (spans 2 cols) -->
    <div class="article-card featured-article animate-on-scroll glow-card border-beam" data-cat="engineering">
      <div class="glow-effect"></div>
      <div class="article-img" style="background:linear-gradient(135deg,#fde68a,#f59e0b)">
        <button class="bookmark-btn" title="Save"><i class="fa-regular fa-bookmark"></i></button>
      </div>
      <div class="article-body">
        <div class="article-cat">Engineering</div>
        <div class="article-title">Why We Migrated Our Entire Platform to Edge Functions\\u2014and What Broke Along the Way</div>
        <div class="article-excerpt">Our 6-month journey from traditional Node.js servers to a fully edge-native architecture. We saw 3x performance gains, but the road was full of surprising pitfalls.</div>
        <div class="article-footer">
          <div class="article-author">
            <div class="tiny-av" style="background:linear-gradient(135deg,#f59e0b,#d97706)">JP</div>
            <span>James Park</span>
          </div>
          <div class="article-stats">
            <span><i class="fa-regular fa-heart"></i> 234</span>
            <span><i class="fa-regular fa-comment"></i> 18</span>
            <span><i class="fa-regular fa-clock"></i> 8 min</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Article 2 -->
    <div class="article-card animate-on-scroll stagger-1 glow-card shine-hover" data-cat="product">
      <div class="glow-effect"></div>
      <div class="article-img" style="background:linear-gradient(135deg,#a7f3d0,#34d399)">
        <button class="bookmark-btn" title="Save"><i class="fa-regular fa-bookmark"></i></button>
      </div>
      <div class="article-body">
        <div class="article-cat">Product</div>
        <div class="article-title">Designing for Accessibility First</div>
        <div class="article-excerpt">Building inclusive products isn't just the right thing to do\\u2014it makes everything better for everyone.</div>
        <div class="article-footer">
          <div class="article-author">
            <div class="tiny-av" style="background:linear-gradient(135deg,#34d399,#059669)">EC</div>
            <span>Emily Chen</span>
          </div>
          <div class="article-stats">
            <span><i class="fa-regular fa-heart"></i> 189</span>
            <span><i class="fa-regular fa-clock"></i> 7 min</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Article 3 -->
    <div class="article-card animate-on-scroll stagger-2 glow-card shine-hover" data-cat="ai">
      <div class="glow-effect"></div>
      <div class="article-img" style="background:linear-gradient(135deg,#c4b5fd,#8b5cf6)">
        <button class="bookmark-btn" title="Save"><i class="fa-regular fa-bookmark"></i></button>
      </div>
      <div class="article-body">
        <div class="article-cat">AI & ML</div>
        <div class="article-title">Practical AI for Small Teams</div>
        <div class="article-excerpt">How we integrated AI tools into our daily workflow without a dedicated ML team or massive budget.</div>
        <div class="article-footer">
          <div class="article-author">
            <div class="tiny-av" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed)">AW</div>
            <span>Alex Wong</span>
          </div>
          <div class="article-stats">
            <span><i class="fa-regular fa-heart"></i> 312</span>
            <span><i class="fa-regular fa-clock"></i> 6 min</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Article 4 -->
    <div class="article-card animate-on-scroll stagger-3 glow-card shine-hover" data-cat="design">
      <div class="glow-effect"></div>
      <div class="article-img" style="background:linear-gradient(135deg,#fecdd3,#fb7185)">
        <button class="bookmark-btn" title="Save"><i class="fa-regular fa-bookmark"></i></button>
      </div>
      <div class="article-body">
        <div class="article-cat">Design</div>
        <div class="article-title">The Typography Revival in Digital Interfaces</div>
        <div class="article-excerpt">Serif fonts are making a massive comeback. Here's why designers are embracing editorial aesthetics in product UI.</div>
        <div class="article-footer">
          <div class="article-author">
            <div class="tiny-av" style="background:linear-gradient(135deg,#fb7185,#e11d48)">LR</div>
            <span>Lisa Rodriguez</span>
          </div>
          <div class="article-stats">
            <span><i class="fa-regular fa-heart"></i> 156</span>
            <span><i class="fa-regular fa-clock"></i> 5 min</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Article 5 -->
    <div class="article-card animate-on-scroll stagger-4 glow-card shine-hover" data-cat="startup">
      <div class="glow-effect"></div>
      <div class="article-img" style="background:linear-gradient(135deg,#bfdbfe,#3b82f6)">
        <button class="bookmark-btn" title="Save"><i class="fa-regular fa-bookmark"></i></button>
      </div>
      <div class="article-body">
        <div class="article-cat">Startup</div>
        <div class="article-title">From 0 to 10K Users in 90 Days</div>
        <div class="article-excerpt">The exact growth playbook we used to hit our first 10,000 active users without spending on ads.</div>
        <div class="article-footer">
          <div class="article-author">
            <div class="tiny-av" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)">MK</div>
            <span>Marcus Kim</span>
          </div>
          <div class="article-stats">
            <span><i class="fa-regular fa-heart"></i> 421</span>
            <span><i class="fa-regular fa-clock"></i> 10 min</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Article 6 -->
    <div class="article-card animate-on-scroll stagger-5 glow-card shine-hover" data-cat="culture">
      <div class="glow-effect"></div>
      <div class="article-img" style="background:linear-gradient(135deg,#d9f99d,#84cc16)">
        <button class="bookmark-btn" title="Save"><i class="fa-regular fa-bookmark"></i></button>
      </div>
      <div class="article-body">
        <div class="article-cat">Culture</div>
        <div class="article-title">Remote Work Isn't Dead\\u2014It Evolved</div>
        <div class="article-excerpt">The post-pandemic workplace looks nothing like anyone predicted. Here's what's actually working.</div>
        <div class="article-footer">
          <div class="article-author">
            <div class="tiny-av" style="background:linear-gradient(135deg,#84cc16,#65a30d)">NK</div>
            <span>Nina Kowalski</span>
          </div>
          <div class="article-stats">
            <span><i class="fa-regular fa-heart"></i> 278</span>
            <span><i class="fa-regular fa-clock"></i> 9 min</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</section>

<!-- Newsletter Mid-CTA -->
<section class="newsletter-mid animate-on-scroll">
  <div class="newsletter-mid-inner">
    <div class="nl-text">
      <h3>Get smarter every week</h3>
      <p>Join 12,000+ designers & engineers. No spam, unsubscribe anytime.</p>
    </div>
    <form onsubmit="event.preventDefault();this.querySelector('button').textContent='Subscribed \\u2713';this.querySelector('button').style.background='#059669'">
      <input type="email" placeholder="your@email.com" required>
      <button type="submit">Subscribe Free</button>
    </form>
  </div>
</section>

<!-- Trending -->
<section class="trending-section animate-on-scroll">
  <h2>Trending This Week <span class="trending-fire">\\ud83d\\udd25</span></h2>
  <div class="trending-grid">
    <div class="trending-item">
      <div class="trending-num">01</div>
      <div class="trending-thumb" style="background:linear-gradient(135deg,#818cf8,#4f46e5);border-radius:10px"></div>
      <div class="trending-info">
        <div class="t-cat">Engineering</div>
        <div class="t-title">The Complete Guide to React Server Components</div>
        <div class="t-meta"><span>Daniel Roe</span> <span>\\u00b7</span> <span>14 min</span></div>
      </div>
    </div>
    <div class="trending-item">
      <div class="trending-num">02</div>
      <div class="trending-thumb" style="background:linear-gradient(135deg,#fb923c,#ea580c);border-radius:10px"></div>
      <div class="trending-info">
        <div class="t-cat">AI & ML</div>
        <div class="t-title">Building RAG Systems That Don't Hallucinate</div>
        <div class="t-meta"><span>Priya Sharma</span> <span>\\u00b7</span> <span>11 min</span></div>
      </div>
    </div>
    <div class="trending-item">
      <div class="trending-num">03</div>
      <div class="trending-thumb" style="background:linear-gradient(135deg,#f472b6,#db2777);border-radius:10px"></div>
      <div class="trending-info">
        <div class="t-cat">Design</div>
        <div class="t-title">Why Every SaaS Dashboard Looks the Same Now</div>
        <div class="t-meta"><span>Kate Brennan</span> <span>\\u00b7</span> <span>7 min</span></div>
      </div>
    </div>
    <div class="trending-item">
      <div class="trending-num">04</div>
      <div class="trending-thumb" style="background:linear-gradient(135deg,#34d399,#059669);border-radius:10px"></div>
      <div class="trending-info">
        <div class="t-cat">Product</div>
        <div class="t-title">The Metrics That Actually Matter for PLG</div>
        <div class="t-meta"><span>Tom Nguyen</span> <span>\\u00b7</span> <span>9 min</span></div>
      </div>
    </div>
    <div class="trending-item">
      <div class="trending-num">05</div>
      <div class="trending-thumb" style="background:linear-gradient(135deg,#a78bfa,#7c3aed);border-radius:10px"></div>
      <div class="trending-info">
        <div class="t-cat">Startup</div>
        <div class="t-title">What I Learned Raising a \\$4M Seed Round in 2024</div>
        <div class="t-meta"><span>Jordan Lee</span> <span>\\u00b7</span> <span>12 min</span></div>
      </div>
    </div>
    <div class="trending-item">
      <div class="trending-num">06</div>
      <div class="trending-thumb" style="background:linear-gradient(135deg,#fbbf24,#d97706);border-radius:10px"></div>
      <div class="trending-info">
        <div class="t-cat">Culture</div>
        <div class="t-title">The Four-Day Work Week Experiment: 1 Year Later</div>
        <div class="t-meta"><span>Sophie Lang</span> <span>\\u00b7</span> <span>8 min</span></div>
      </div>
    </div>
  </div>
</section>

<!-- Author Spotlight -->
<section class="author-spotlight animate-on-scroll">
  <h2>Author Spotlight</h2>
  <div class="author-card">
    <div class="author-left">
      <div class="author-avatar">SM</div>
      <h3>Sarah Mitchell</h3>
      <div class="author-title">Head of Design at Figma</div>
      <div class="author-stats">
        <div class="author-stat"><span class="stat-num">47</span><span class="stat-label">Articles</span></div>
        <div class="author-stat"><span class="stat-num">8.2K</span><span class="stat-label">Followers</span></div>
        <div class="author-stat"><span class="stat-num">12K</span><span class="stat-label">Likes</span></div>
      </div>
      <div class="author-social">
        <a href="#"><i class="fa-brands fa-x-twitter"></i></a>
        <a href="#"><i class="fa-brands fa-linkedin-in"></i></a>
        <a href="#"><i class="fa-brands fa-dribbble"></i></a>
        <a href="#"><i class="fa-solid fa-globe"></i></a>
      </div>
    </div>
    <div class="author-right">
      <div class="bio">
        Sarah has been designing digital products for over a decade. Previously at Stripe and Airbnb, she now leads the design systems team at Figma. She writes about <em>scaling design</em>, <em>creative leadership</em>, and the intersection of <em>art and engineering</em>.
      </div>
      <div class="author-posts-label">Most Popular Posts</div>
      <div class="author-posts-list">
        <div class="author-post-item"><span class="ap-num">01</span><span class="ap-title">The Art of Building Design Systems That Scale</span><span class="ap-reads"><i class="fa-solid fa-eye"></i> 24.3K</span></div>
        <div class="author-post-item"><span class="ap-num">02</span><span class="ap-title">Why Your Design Review Process Is Broken</span><span class="ap-reads"><i class="fa-solid fa-eye"></i> 18.7K</span></div>
        <div class="author-post-item"><span class="ap-num">03</span><span class="ap-title">From IC to Manager: A Designer's Guide</span><span class="ap-reads"><i class="fa-solid fa-eye"></i> 15.1K</span></div>
        <div class="author-post-item"><span class="ap-num">04</span><span class="ap-title">Color Theory for Interface Design</span><span class="ap-reads"><i class="fa-solid fa-eye"></i> 11.9K</span></div>
      </div>
    </div>
  </div>
</section>

<!-- Tags Cloud -->
<section class="tags-cloud animate-on-scroll">
  <h2>Explore Topics</h2>
  <div class="tags-wrap">
    <span class="tag-chip large">Design Systems <span class="tag-count">24</span></span>
    <span class="tag-chip">React <span class="tag-count">18</span></span>
    <span class="tag-chip large">AI & Machine Learning <span class="tag-count">16</span></span>
    <span class="tag-chip">TypeScript <span class="tag-count">14</span></span>
    <span class="tag-chip">Product Strategy <span class="tag-count">12</span></span>
    <span class="tag-chip small">Accessibility <span class="tag-count">11</span></span>
    <span class="tag-chip">UX Research <span class="tag-count">10</span></span>
    <span class="tag-chip small">Next.js <span class="tag-count">9</span></span>
    <span class="tag-chip">Remote Work <span class="tag-count">8</span></span>
    <span class="tag-chip large">Startup <span class="tag-count">8</span></span>
    <span class="tag-chip small">CSS <span class="tag-count">7</span></span>
    <span class="tag-chip">Performance <span class="tag-count">6</span></span>
    <span class="tag-chip">Leadership <span class="tag-count">5</span></span>
    <span class="tag-chip small">GraphQL <span class="tag-count">4</span></span>
    <span class="tag-chip">Go <span class="tag-count">3</span></span>
    <span class="tag-chip small">Rust <span class="tag-count">3</span></span>
    <span class="tag-chip">Web3 <span class="tag-count">2</span></span>
  </div>
</section>

<!-- Comments Section -->
<section class="comments-section animate-on-scroll">
  <div class="comments-header">
    <h2>Discussion</h2>
    <span class="comment-count">24 comments</span>
  </div>

  <!-- Compose -->
  <div class="comment-compose">
    <div class="compose-av">Y</div>
    <div class="compose-input">
      <textarea placeholder="Share your thoughts on this article..."></textarea>
      <div class="compose-actions">
        <button class="cancel-btn">Cancel</button>
        <button class="submit-btn">Comment</button>
      </div>
    </div>
  </div>

  <!-- Comments List -->
  <div class="comments-list">
    <!-- Comment 1 -->
    <div class="comment">
      <div class="comment-main">
        <div class="c-av" style="background:linear-gradient(135deg,#7c3aed,#a855f7)">DK</div>
        <div class="c-body">
          <div class="c-header">
            <span class="c-name">David Kim</span>
            <span class="c-badge">Author</span>
            <span class="c-time">2 hours ago</span>
          </div>
          <div class="c-text">This is exactly the kind of article I've been looking for. We've been struggling with token-based design at our startup and the approach described here would solve so many of our inconsistency issues. Bookmarked!</div>
          <div class="c-actions">
            <button class="c-action like-btn"><i class="fa-regular fa-heart"></i> 12</button>
            <button class="c-action"><i class="fa-regular fa-comment"></i> Reply</button>
            <button class="c-action"><i class="fa-solid fa-share-nodes"></i> Share</button>
          </div>
        </div>
      </div>

      <!-- Nested Reply -->
      <div class="comment-replies">
        <div class="comment">
          <div class="comment-main">
            <div class="c-av" style="background:linear-gradient(135deg,#ec4899,#db2777)">SM</div>
            <div class="c-body">
              <div class="c-header">
                <span class="c-name">Sarah Mitchell</span>
                <span class="c-badge">Author</span>
                <span class="c-time">1 hour ago</span>
              </div>
              <div class="c-text">Thanks David! Token-based design is a game changer. Happy to do a follow-up deep dive on implementation patterns if there's interest.</div>
              <div class="c-actions">
                <button class="c-action like-btn"><i class="fa-regular fa-heart"></i> 8</button>
                <button class="c-action"><i class="fa-regular fa-comment"></i> Reply</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comment 2 -->
    <div class="comment">
      <div class="comment-main">
        <div class="c-av" style="background:linear-gradient(135deg,#f59e0b,#d97706)">RJ</div>
        <div class="c-body">
          <div class="c-header">
            <span class="c-name">Rachel Johnson</span>
            <span class="c-time">5 hours ago</span>
          </div>
          <div class="c-text">We implemented a similar system at our company last year. One thing I'd add: make sure you have buy-in from engineering early on. The best design system means nothing if developers don't adopt it.</div>
          <div class="c-actions">
            <button class="c-action like-btn"><i class="fa-regular fa-heart"></i> 23</button>
            <button class="c-action"><i class="fa-regular fa-comment"></i> Reply</button>
            <button class="c-action"><i class="fa-solid fa-share-nodes"></i> Share</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Comment 3 -->
    <div class="comment">
      <div class="comment-main">
        <div class="c-av" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)">AT</div>
        <div class="c-body">
          <div class="c-header">
            <span class="c-name">Amir Taheri</span>
            <span class="c-time">8 hours ago</span>
          </div>
          <div class="c-text">Great read! I especially liked the section about version control for design tokens. That's something no one talks about but it's critical for large teams. Would love to see more case studies.</div>
          <div class="c-actions">
            <button class="c-action like-btn"><i class="fa-regular fa-heart"></i> 6</button>
            <button class="c-action"><i class="fa-regular fa-comment"></i> Reply</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Comment 4 -->
    <div class="comment">
      <div class="comment-main">
        <div class="c-av" style="background:linear-gradient(135deg,#34d399,#059669)">MW</div>
        <div class="c-body">
          <div class="c-header">
            <span class="c-name">Maya Williams</span>
            <span class="c-time">1 day ago</span>
          </div>
          <div class="c-text">Hot take: most design systems fail not because of technical limitations but because of organizational ones. You need a dedicated team maintaining it, not a side project someone works on when they have time.</div>
          <div class="c-actions">
            <button class="c-action like-btn"><i class="fa-regular fa-heart"></i> 41</button>
            <button class="c-action"><i class="fa-regular fa-comment"></i> Reply</button>
            <button class="c-action"><i class="fa-solid fa-share-nodes"></i> Share</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Newsletter Full -->
<section class="newsletter-full animate-on-scroll">
  <div class="newsletter-full-inner">
    <div class="nl-icon"><i class="fa-regular fa-envelope"></i></div>
    <h2>Never miss an insight</h2>
    <p class="nl-sub">Join 12,000+ designers and engineers who get our best articles delivered to their inbox every Thursday morning.</p>
    <form onsubmit="event.preventDefault();var b=this.querySelector('button');b.textContent='Subscribed \\u2713';b.style.background='#059669'">
      <input type="email" placeholder="Enter your email address" required>
      <button type="submit">Subscribe Free</button>
    </form>
    <div class="nl-trust">
      <span><i class="fa-solid fa-check-circle"></i> Free forever</span>
      <span><i class="fa-solid fa-check-circle"></i> No spam</span>
      <span><i class="fa-solid fa-check-circle"></i> Unsubscribe anytime</span>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="site-footer">
  <div class="footer-top">
    <div>
      <div class="footer-brand"><div class="f-icon">J</div> The Journal</div>
      <p class="footer-desc">A publication for designers, engineers, and makers who care about building thoughtful digital products.</p>
      <div class="footer-social">
        <a href="#"><i class="fa-brands fa-x-twitter"></i></a>
        <a href="#"><i class="fa-brands fa-linkedin-in"></i></a>
        <a href="#"><i class="fa-brands fa-github"></i></a>
        <a href="#"><i class="fa-brands fa-youtube"></i></a>
        <a href="#"><i class="fa-solid fa-rss"></i></a>
      </div>
    </div>
    <div class="footer-col">
      <h4>Content</h4>
      <a href="#">Latest Articles</a>
      <a href="#">Topics</a>
      <a href="#">Trending</a>
      <a href="#">Newsletter</a>
      <a href="#">Podcast</a>
    </div>
    <div class="footer-col">
      <h4>Company</h4>
      <a href="#">About</a>
      <a href="#">Authors</a>
      <a href="#">Careers</a>
      <a href="#">Advertise</a>
      <a href="#">Contact</a>
    </div>
    <div class="footer-col">
      <h4>Resources</h4>
      <a href="#">Style Guide</a>
      <a href="#">RSS Feed</a>
      <a href="#">API</a>
      <a href="#">Open Source</a>
      <a href="#">Status</a>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; 2025 The Journal. All rights reserved.</span>
    <div class="footer-links">
      <a href="#">Privacy</a>
      <a href="#">Terms</a>
      <a href="#">Cookies</a>
      <a href="#">Sitemap</a>
    </div>
  </div>
</footer>

<script>
/* ── Dark Mode Toggle ── */
(function(){
  var html = document.documentElement;
  var saved = localStorage.getItem('journal-theme');
  if(saved) html.setAttribute('data-theme', saved);
  else if(window.matchMedia('(prefers-color-scheme:dark)').matches) html.setAttribute('data-theme','dark');

  var toggle = document.querySelector('.theme-toggle');
  if(toggle) toggle.addEventListener('click', function(){
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('journal-theme', next);
    var icon = toggle.querySelector('i');
    icon.className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
  var icon = toggle ? toggle.querySelector('i') : null;
  if(icon && html.getAttribute('data-theme') === 'dark') icon.className = 'fa-solid fa-sun';
})();

/* ── Reading Progress Bar ── */
(function(){
  var bar = document.getElementById('readingProgress');
  window.addEventListener('scroll', function(){
    var scrollTop = window.scrollY;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docH > 0 ? (scrollTop / docH) * 100 : 0;
    bar.style.width = pct + '%';
  });
})();

/* ── Search Overlay ── */
(function(){
  var overlay = document.getElementById('searchOverlay');
  var input = document.getElementById('searchInput');
  var triggers = document.querySelectorAll('.search-trigger');
  function open(){ overlay.classList.add('active'); setTimeout(function(){ input.focus(); }, 100); }
  function close(){ overlay.classList.remove('active'); input.value = ''; }
  triggers.forEach(function(t){ t.addEventListener('click', open); });
  overlay.addEventListener('click', function(e){ if(e.target === overlay) close(); });
  document.addEventListener('keydown', function(e){
    if((e.ctrlKey || e.metaKey) && e.key === 'k'){ e.preventDefault(); open(); }
    if(e.key === 'Escape') close();
  });
  document.querySelectorAll('.search-tag').forEach(function(tag){
    tag.addEventListener('click', function(){ input.value = tag.textContent; input.focus(); });
  });
})();

/* ── Category Filter ── */
(function(){
  var pills = document.querySelectorAll('.cat-pill');
  var articles = document.querySelectorAll('.article-card');
  pills.forEach(function(pill){
    pill.addEventListener('click', function(){
      pills.forEach(function(p){ p.classList.remove('active'); });
      pill.classList.add('active');
      var cat = pill.textContent.trim().split(' ')[0].toLowerCase().replace('&','');
      articles.forEach(function(card){
        if(cat === 'all'){
          card.style.display = '';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        } else {
          var dc = card.getAttribute('data-cat') || '';
          if(dc.includes(cat) || dc === cat){
            card.style.display = '';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';
            setTimeout(function(){ card.style.display = 'none'; }, 300);
          }
        }
      });
    });
  });
})();

/* ── Bookmark Toggle ── */
(function(){
  document.querySelectorAll('.bookmark-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      btn.classList.toggle('saved');
      var icon = btn.querySelector('i');
      icon.className = btn.classList.contains('saved') ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
    });
  });
})();

/* ── Like/Heart Toggle ── */
(function(){
  document.querySelectorAll('.like-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var wasLiked = btn.classList.contains('liked');
      btn.classList.toggle('liked');
      var icon = btn.querySelector('i');
      icon.className = wasLiked ? 'fa-regular fa-heart' : 'fa-solid fa-heart';
      var txt = btn.textContent.trim();
      var num = parseInt(txt.match(/\\d+/)[0]);
      var newNum = wasLiked ? num - 1 : num + 1;
      btn.innerHTML = '<i class="' + icon.className + '"></i> ' + newNum;
    });
  });
})();

/* ── Follow Button ── */
(function(){
  var fb = document.querySelector('.follow-btn');
  if(fb) fb.addEventListener('click', function(){
    var isFollowing = fb.textContent.includes('Following');
    fb.textContent = isFollowing ? '+ Follow' : 'Following \\u2713';
    fb.style.background = isFollowing ? 'transparent' : 'var(--accent)';
    fb.style.color = isFollowing ? 'var(--text)' : '#fff';
    fb.style.borderColor = isFollowing ? 'var(--border)' : 'var(--accent)';
  });
})();

/* ── Nav Link Active ── */
(function(){
  document.querySelectorAll('.nav-link').forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(function(l){ l.classList.remove('active'); });
      link.classList.add('active');
    });
  });
})();

/* ── View Toggle ── */
(function(){
  document.querySelectorAll('.view-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.view-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });
})();

/* ── Scroll Animations ── */
(function(){
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.animate-on-scroll').forEach(function(el){ observer.observe(el); });
})();

/* ── Comment Submit ── */
(function(){
  var submitBtn = document.querySelector('.submit-btn');
  var textarea = document.querySelector('.comment-compose textarea');
  if(submitBtn && textarea){
    submitBtn.addEventListener('click', function(){
      if(!textarea.value.trim()) return;
      textarea.value = '';
      submitBtn.textContent = 'Posted \\u2713';
      submitBtn.style.background = '#059669';
      setTimeout(function(){ submitBtn.textContent = 'Comment'; submitBtn.style.background = ''; }, 2000);
    });
  }
})();

/* ── Trending Hover Lift ── */
(function(){
  document.querySelectorAll('.trending-item').forEach(function(item, i){
    item.style.animationDelay = (i * 0.08) + 's';
  });
})();

/* ── Tag Chip Ripple ── */
(function(){
  document.querySelectorAll('.tag-chip').forEach(function(chip){
    chip.addEventListener('click', function(){
      chip.style.transform = 'scale(0.95)';
      setTimeout(function(){ chip.style.transform = ''; }, 150);
    });
  });
})();

/* ── Author Post Item Hover Highlight ── */
(function(){
  document.querySelectorAll('.author-post-item').forEach(function(item){
    item.addEventListener('mouseenter', function(){
      item.querySelector('.ap-num').style.color = 'var(--accent)';
    });
    item.addEventListener('mouseleave', function(){
      item.querySelector('.ap-num').style.color = '';
    });
  });
})();

/* ── Subscribe Button Scroll Into View ── */
(function(){
  var navSub = document.querySelector('.nav-subscribe');
  if(navSub) navSub.addEventListener('click', function(){
    var nl = document.querySelector('.newsletter-full');
    if(nl) nl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();

/* ── Magic UI — Glow Card Mouse Tracking ── */
document.querySelectorAll('.glow-card').forEach(function(card){
  card.addEventListener('mousemove',function(e){
    var r=card.getBoundingClientRect();
    var g=card.querySelector('.glow-effect');
    if(g){g.style.left=e.clientX-r.left+'px';g.style.top=e.clientY-r.top+'px';}
  });
});
</script>
</body>
</html>`, language: 'html' },
    },
  },
  {
    name: 'Next.js App', desc: 'Full-stack React with file-based routing and Tailwind', icon: '▲',
    files: {
      'app/page.tsx': { content: `export default function Home() {\n  return (\n    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">\n      <div className="text-center">\n        <h1 className="text-5xl font-bold text-white mb-4">Welcome to Next.js</h1>\n        <p className="text-gray-400 text-lg">Edit app/page.tsx to get started</p>\n      </div>\n    </main>\n  );\n}`, language: 'typescript' },
      'app/layout.tsx': { content: `import './globals.css';\nexport const metadata = { title: 'My App', description: 'Built with Aurion' };\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="en"><body>{children}</body></html>;\n}`, language: 'typescript' },
      'app/globals.css': { content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }`, language: 'css' },
      'package.json': { content: `{\n  "name": "my-nextjs-app",\n  "version": "1.0.0",\n  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },\n  "dependencies": { "next": "14.0.0", "react": "18.2.0", "react-dom": "18.2.0" }\n}`, language: 'json' },
    },
  },
  {
    name: 'API Server', desc: 'Express.js REST API with CRUD routes', icon: '🔌',
    files: {
      'server.js': { content: `const express = require('express');\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.use(express.json());\n\nlet items = [\n  { id: 1, name: 'Item 1', done: false },\n  { id: 2, name: 'Item 2', done: true },\n];\n\napp.get('/api/items', (req, res) => res.json(items));\napp.post('/api/items', (req, res) => {\n  const item = { id: Date.now(), ...req.body, done: false };\n  items.push(item);\n  res.status(201).json(item);\n});\napp.delete('/api/items/:id', (req, res) => {\n  items = items.filter(i => i.id !== Number(req.params.id));\n  res.status(204).end();\n});\n\napp.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`, language: 'javascript' },
      'package.json': { content: `{\n  "name": "api-server",\n  "version": "1.0.0",\n  "scripts": { "start": "node server.js", "dev": "nodemon server.js" },\n  "dependencies": { "express": "4.18.2" }\n}`, language: 'json' },
    },
  },
];

/* ────────── DiffEditor dynamic import ────────── */
const MonacoDiffEditor = dynamic(() => import('@monaco-editor/react').then(m => m.DiffEditor), { ssr: false, loading: () => <div className="flex-1 bg-[#1e1e1e]" /> });

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

  // A/B Model Comparison Mode
  const [abMode, setAbMode] = useState(false);
  const [abModelB, setAbModelB] = useState(MODELS[5].id); // second model for comparison
  const [abResultB, setAbResultB] = useState<string>('');
  const [abStreaming, setAbStreaming] = useState(false);
  const abAbortRef = useRef<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<'app' | 'code' | 'database' | 'payments'>('app');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
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

  // Clone refinement/iteration state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastScrapeDataRef = useRef<any>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');

  // Visual Editor mode
  const [isEditMode, setIsEditMode] = useState(false);
  const pendingEditHtmlRef = useRef<string | null>(null);

  // Select & Prompt — click element in preview, AI modifies just that element
  const [selectPromptData, setSelectPromptData] = useState<{ outerHtml: string; cssPath: string; tagName: string; rect: { top: number; left: number; width: number; height: number } } | null>(null);
  const [selectPromptInput, setSelectPromptInput] = useState('');
  const [selectPromptLoading, setSelectPromptLoading] = useState(false);
  const selectPromptRef = useRef<HTMLInputElement>(null);

  // 21st.dev Component Browser
  type Component21st = { id: string; name: string; description: string; slug?: string; username?: string; code?: string; preview_url?: string; demo_url?: string; tags?: string[] };
  const [show21stBrowser, setShow21stBrowser] = useState(false);
  const [browser21stQuery, setBrowser21stQuery] = useState('');
  const [browser21stResults, setBrowser21stResults] = useState<Component21st[]>([]);
  const [browser21stLoading, setBrowser21stLoading] = useState(false);
  const [injecting21stComponent, setInjecting21stComponent] = useState<string | null>(null);
  const browser21stInputRef = useRef<HTMLInputElement>(null);

  // Virtual File System
  const [projectFiles, setProjectFiles] = useState<VirtualFS>({});
  const [selectedFile, setSelectedFile] = useState<string>('index.html');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Version History (VFS snapshots)
  const [vfsHistory, setVfsHistory] = useState<VirtualFS[]>([]);
  const [vfsHistoryIdx, setVfsHistoryIdx] = useState(-1);
  const vfsSnapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snapshot VFS on every change (debounced)
  useEffect(() => {
    if (Object.keys(projectFiles).length === 0) return;
    if (vfsSnapshotTimer.current) clearTimeout(vfsSnapshotTimer.current);
    vfsSnapshotTimer.current = setTimeout(() => {
      setVfsHistory(prev => {
        const trimmed = prev.slice(0, vfsHistoryIdx + 1);
        // Don't snapshot if identical to latest
        if (trimmed.length > 0 && JSON.stringify(trimmed[trimmed.length - 1]) === JSON.stringify(projectFiles)) return prev;
        const next = [...trimmed, structuredClone(projectFiles)].slice(-50); // max 50 snapshots
        setVfsHistoryIdx(next.length - 1);
        return next;
      });
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFiles]);

  const vfsUndo = useCallback(() => {
    if (vfsHistoryIdx <= 0) return;
    const newIdx = vfsHistoryIdx - 1;
    setVfsHistoryIdx(newIdx);
    setProjectFiles(vfsHistory[newIdx]);
  }, [vfsHistory, vfsHistoryIdx]);

  const vfsRedo = useCallback(() => {
    if (vfsHistoryIdx >= vfsHistory.length - 1) return;
    const newIdx = vfsHistoryIdx + 1;
    setVfsHistoryIdx(newIdx);
    setProjectFiles(vfsHistory[newIdx]);
  }, [vfsHistory, vfsHistoryIdx]);

  // GitHub push state
  const [isGitHubPushing, setIsGitHubPushing] = useState(false);

  // Multi-project
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([{ id: 'default', name: 'My Project' }]);
  const [currentProjectId, setCurrentProjectId] = useState('default');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameProjectName, setRenameProjectName] = useState('');

  // File search (Cmd+P) / Content search (Cmd+Shift+F)
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [showContentSearch, setShowContentSearch] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const fileSearchRef = useRef<HTMLInputElement>(null);
  const contentSearchRef = useRef<HTMLInputElement>(null);

  // Templates
  const [showTemplates, setShowTemplates] = useState(false);

  // Diff view
  const [showDiffView, setShowDiffView] = useState(false);

  // .env management
  const [showEnvPanel, setShowEnvPanel] = useState(false);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  // Command palette (Cmd+K)
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandIdx, setCommandIdx] = useState(0);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop
  const [isDragOver, setIsDragOver] = useState(false);

  // Media asset gallery (generated videos/images)
  const [mediaAssets, setMediaAssets] = useState<{ id: string; type: 'video' | 'image'; url: string; prompt: string; timestamp: number }[]>([]);
  const [showMediaGallery, setShowMediaGallery] = useState(false);

  // Runtime error forwarding from iframe preview
  const [runtimeErrors, setRuntimeErrors] = useState<{ message: string; source?: string; line?: number; col?: number; timestamp: number }[]>([]);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const autoFixInFlightRef = useRef(false);

  // Persist project files to IndexedDB (debounced) — fast, 100MB+ capacity
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (Object.keys(projectFiles).length === 0) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      idbSet('vfs', projectFiles).catch(() => {
        // Fallback to localStorage
        try { localStorage.setItem('aurion_project_files', JSON.stringify(projectFiles)); } catch { /* ignore */ }
      });
    }, 800);
  }, [projectFiles]);

  // Load project files from IndexedDB on mount (fallback: localStorage)
  useEffect(() => {
    idbGet<VirtualFS>('vfs').then(saved => {
      if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        setProjectFiles(saved);
        setSelectedFile(Object.keys(saved)[0] || 'index.html');
      } else {
        // Fallback to localStorage (migration path)
        try {
          const ls = localStorage.getItem('aurion_project_files');
          if (ls) {
            const parsed = JSON.parse(ls) as VirtualFS;
            if (parsed && Object.keys(parsed).length > 0) {
              setProjectFiles(parsed);
              setSelectedFile(Object.keys(parsed)[0] || 'index.html');
              // Migrate to IndexedDB
              idbSet('vfs', parsed).catch(() => {});
            }
          }
        } catch { /* ignore */ }
      }
    }).catch(() => {
      try {
        const ls = localStorage.getItem('aurion_project_files');
        if (ls) {
          const parsed = JSON.parse(ls) as VirtualFS;
          if (parsed && Object.keys(parsed).length > 0) {
            setProjectFiles(parsed);
            setSelectedFile(Object.keys(parsed)[0] || 'index.html');
          }
        }
      } catch { /* ignore */ }
    });
  }, []);

  // Multi-project: persist project list + per-project VFS
  useEffect(() => {
    idbGet<{ id: string; name: string }[]>('projects_index').then(saved => {
      if (saved && saved.length > 0) {
        setProjects(saved);
        setCurrentProjectId(saved[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      idbSet('projects_index', projects).catch(() => {});
    }
  }, [projects]);

  // Persist VFS per project
  useEffect(() => {
    if (Object.keys(projectFiles).length === 0) return;
    idbSet(`vfs_${currentProjectId}`, projectFiles).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFiles]);

  // Persist chat messages per project (debounced)
  const msgPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (msgPersistTimer.current) clearTimeout(msgPersistTimer.current);
    msgPersistTimer.current = setTimeout(() => {
      idbSet(`msgs_${currentProjectId}`, messages).catch(() => {});
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Load messages from IDB on mount
  useEffect(() => {
    idbGet<Message[]>(`msgs_${currentProjectId}`).then(saved => {
      if (saved && saved.length > 0) setMessages(saved);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchProject = useCallback((id: string) => {
    // Save current project VFS + messages
    if (Object.keys(projectFiles).length > 0) {
      idbSet(`vfs_${currentProjectId}`, projectFiles).catch(() => {});
    }
    idbSet(`msgs_${currentProjectId}`, messages).catch(() => {});
    setCurrentProjectId(id);
    setShowProjectMenu(false);
    // Load target project VFS + messages
    idbGet<VirtualFS>(`vfs_${id}`).then(saved => {
      if (saved && Object.keys(saved).length > 0) {
        setProjectFiles(saved);
        setSelectedFile(Object.keys(saved)[0] || 'index.html');
      } else {
        setProjectFiles({});
        setSelectedFile('index.html');
      }
      setVfsHistory([]);
      setVfsHistoryIdx(-1);
    }).catch(() => {
      setProjectFiles({});
    });
    idbGet<Message[]>(`msgs_${id}`).then(saved => {
      setMessages(saved && saved.length > 0 ? saved : []);
    }).catch(() => {
      setMessages([]);
    });
  }, [currentProjectId, projectFiles, messages]);

  const createProject = useCallback((name: string, templateFiles?: VirtualFS) => {
    const id = 'proj_' + Date.now().toString(36);
    setProjects(prev => [...prev, { id, name }]);
    // Save current
    if (Object.keys(projectFiles).length > 0) {
      idbSet(`vfs_${currentProjectId}`, projectFiles).catch(() => {});
    }
    setCurrentProjectId(id);
    setShowProjectMenu(false);
    setShowTemplates(false);
    const files = templateFiles || {};
    setProjectFiles(files);
    setSelectedFile(Object.keys(files)[0] || 'index.html');
    setVfsHistory([]);
    setVfsHistoryIdx(-1);
    setMessages([]);
    if (Object.keys(files).length > 0) {
      idbSet(`vfs_${id}`, files).catch(() => {});
      setActiveTab('code');
    }
  }, [currentProjectId, projectFiles]);

  const deleteProject = useCallback((id: string) => {
    if (projects.length <= 1) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    idbSet(`vfs_${id}`, null).catch(() => {});
    idbSet(`msgs_${id}`, null).catch(() => {});
    if (currentProjectId === id) {
      const remaining = projects.filter(p => p.id !== id);
      if (remaining.length > 0) switchProject(remaining[0].id);
    }
  }, [projects, currentProjectId, switchProject]);

  // .env sync: populate envVars from .env file in VFS
  useEffect(() => {
    const envFile = projectFiles['.env'];
    if (envFile) {
      const vars = envFile.content.split('\n').filter(l => l.includes('=')).map(l => {
        const idx = l.indexOf('=');
        return { key: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() };
      });
      setEnvVars(vars);
    }
  }, [projectFiles]);

  // Supabase query state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseQuery, setSupabaseQuery] = useState('');
  const [supabaseTable, setSupabaseTable] = useState('');
  const [supabaseResult, setSupabaseResult] = useState<Record<string, unknown>[] | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);

  // Stripe state
  const [stripeBalance, setStripeBalance] = useState<{ available: number; pending: number } | null>(null);
  const [stripeProducts, setStripeProducts] = useState<unknown[]>([]);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);

  // Sandbox state
  const [sandboxDb, setSandboxDb] = useState(false);
  const [sandboxDbTable, setSandboxDbTable] = useState('users');
  const [sandboxPay, setSandboxPay] = useState(false);
  const [sandboxEmail, setSandboxEmail] = useState(false);
  const [sandboxEmailLog, setSandboxEmailLog] = useState(SANDBOX_EMAILS);
  const [sandboxEmailForm, setSandboxEmailForm] = useState({ to: '', subject: '', body: '' });
  const [sandboxMsg, setSandboxMsg] = useState(false);
  const [sandboxMsgLog, setSandboxMsgLog] = useState(SANDBOX_MESSAGES);
  const [sandboxMsgForm, setSandboxMsgForm] = useState({ channel: '', text: '', platform: 'Slack' });

  // Load supabaseUrl from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aurion_supabase_url');
      if (saved) setSupabaseUrl(saved);
    } catch { /* ignore */ }
  }, []);

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

  // Drag & drop files into project
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files.length) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = () => {
          const data = reader.result as string;
          setProjectFiles(prev => ({
            ...prev,
            [`images/${file.name}`]: { content: data, language: 'plaintext' },
          }));
          setTerminalLines(prev => [...prev, `$ ✓ imported image: images/${file.name}`]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const content = reader.result as string;
          setProjectFiles(prev => ({
            ...prev,
            [file.name]: { content, language: detectLanguage(file.name) },
          }));
          setTerminalLines(prev => [...prev, `$ ✓ imported file: ${file.name}`]);
          setSelectedFile(file.name);
        };
        reader.readAsText(file);
      }
    });
    setActiveTab('code');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // .env helpers
  const syncEnvToVFS = useCallback((vars: { key: string; value: string }[]) => {
    const content = vars.map(v => `${v.key}=${v.value}`).join('\n');
    setProjectFiles(prev => ({
      ...prev,
      '.env': { content, language: 'bash' },
    }));
  }, []);

  const addEnvVar = useCallback(() => {
    if (!newEnvKey.trim()) return;
    const updated = [...envVars, { key: newEnvKey.trim(), value: newEnvValue }];
    setEnvVars(updated);
    syncEnvToVFS(updated);
    setNewEnvKey('');
    setNewEnvValue('');
  }, [newEnvKey, newEnvValue, envVars, syncEnvToVFS]);

  const removeEnvVar = useCallback((idx: number) => {
    const updated = envVars.filter((_, i) => i !== idx);
    setEnvVars(updated);
    syncEnvToVFS(updated);
  }, [envVars, syncEnvToVFS]);

  // Content search results
  const contentSearchResults = useMemo(() => {
    if (!contentSearchQuery.trim()) return [];
    const q = contentSearchQuery.toLowerCase();
    const results: { file: string; line: number; text: string }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      file.content.split('\n').forEach((line, i) => {
        if (line.toLowerCase().includes(q)) {
          results.push({ file: path, line: i + 1, text: line.trim() });
        }
      });
    }
    return results.slice(0, 50);
  }, [contentSearchQuery, projectFiles]);

  // File search results (fuzzy)
  const fileSearchResults = useMemo(() => {
    const q = fileSearchQuery.toLowerCase();
    return Object.keys(projectFiles).filter(f => {
      if (!q) return true;
      let qi = 0;
      for (let i = 0; i < f.length && qi < q.length; i++) {
        if (f[i].toLowerCase() === q[qi]) qi++;
      }
      return qi === q.length;
    }).slice(0, 20);
  }, [fileSearchQuery, projectFiles]);

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

  // Close dropdowns and modals on Escape + keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;

      // Cmd+K → command palette
      if (isCmd && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        setCommandQuery('');
        return;
      }
      // Cmd+P → file search
      if (isCmd && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        setShowFileSearch(prev => !prev);
        setFileSearchQuery('');
        return;
      }
      // Cmd+Shift+F → content search
      if (isCmd && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowContentSearch(prev => !prev);
        setContentSearchQuery('');
        return;
      }
      // Cmd+Z / Cmd+Shift+Z for VFS undo/redo (only when not in Monaco)
      if (isCmd && e.key === 'z' && !(e.target as HTMLElement)?.closest('.monaco-editor')) {
        e.preventDefault();
        if (e.shiftKey) vfsRedo();
        else vfsUndo();
        return;
      }

      if (e.key !== 'Escape') return;
      if (showCommandPalette) setShowCommandPalette(false);
      else if (showFileSearch) setShowFileSearch(false);
      else if (showContentSearch) setShowContentSearch(false);
      else if (showTemplates) setShowTemplates(false);
      else if (showMediaGallery) setShowMediaGallery(false);
      else if (showEnvPanel) setShowEnvPanel(false);
      else if (showCloneModal) setShowCloneModal(false);
      else if (showModelMenu) setShowModelMenu(false);
      else if (showGitHubModal) setShowGitHubModal(false);
      else if (showIntegrations) setShowIntegrations(false);
      else if (showProjectMenu) setShowProjectMenu(false);
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [showModelMenu, showGitHubModal, showCloneModal, showIntegrations, showCommandPalette, showFileSearch, showContentSearch, showTemplates, showEnvPanel, showProjectMenu, showMediaGallery, vfsUndo, vfsRedo]);

  // Clipboard paste → auto-attach screenshots (Ctrl+V anywhere)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) continue;
        e.preventDefault();
        const file = item.getAsFile();
        if (!file || file.size > 10 * 1024 * 1024) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const data = reader.result as string;
          setAttachedImages(prev => [...prev, { name: `screenshot-${Date.now()}.png`, data, type: file.type }]);
          // Auto-switch to workspace if on landing page
          if (view === 'landing') setView('workspace');
        };
        reader.readAsDataURL(file);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [view]);

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  // Bridge: when clonedHtml changes, push to VFS
  useEffect(() => {
    if (clonedHtml) {
      setProjectFiles(prev => ({ ...prev, 'index.html': { content: clonedHtml, language: 'html' } }));
    }
  }, [clonedHtml]);

  // Bridge: extract HTML from messages and push to VFS
  useEffect(() => {
    if (!clonedHtml) {
      const html = extractPreviewHtml(messages);
      if (html) {
        setProjectFiles(prev => ({ ...prev, 'index.html': { content: html, language: 'html' } }));
      }
    }
  }, [messages, clonedHtml]);

  // Extract preview HTML — prefer VFS assembled, fall back to legacy
  const rawPreviewHtml = useMemo(() => {
    if (Object.keys(projectFiles).length > 0) {
      return assemblePreview(projectFiles);
    }
    return clonedHtml ?? extractPreviewHtml(messages);
  }, [projectFiles, messages, clonedHtml]);

  // Clear runtime errors when preview changes (fix was applied)
  const prevPreviewRef = useRef<string | null>(null);
  useEffect(() => {
    if (rawPreviewHtml && prevPreviewRef.current && rawPreviewHtml !== prevPreviewRef.current) {
      setRuntimeErrors([]);
    }
    prevPreviewRef.current = rawPreviewHtml;
  }, [rawPreviewHtml]);

  // Inject link-intercept script + visual editor script when edit mode is on
  const previewHtml = useMemo(() => {
    if (!rawPreviewHtml) return null;

    // Error capture script — always injected in both edit and non-edit modes
    const errorCaptureScript = `<script>(function(){var sent={};function fwd(msg,src,ln,col){var k=msg+(src||"")+(ln||"");if(sent[k])return;sent[k]=1;try{parent.postMessage({type:"aurion_error",error:{message:String(msg).slice(0,500),source:src||"",line:ln||0,col:col||0}},"*")}catch(e){}}window.onerror=function(m,s,l,c){fwd(m,s,l,c);};window.addEventListener("unhandledrejection",function(e){fwd("Unhandled Promise: "+(e.reason&&e.reason.message||e.reason||"unknown"))});var _ce=console.error;console.error=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==="object"?JSON.stringify(x):String(x)}).join(" ");fwd("console.error: "+a);_ce.apply(console,arguments)};})();</script>`;

    // When NOT in edit mode: simple link+form blocker
    if (!isEditMode) {
      const interceptScript = `<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(a){e.preventDefault();e.stopPropagation();}},true);document.addEventListener('submit',function(e){e.preventDefault();},true);</script>`;
      const combined = errorCaptureScript + interceptScript;
      if (rawPreviewHtml.includes('</body>')) {
        return rawPreviewHtml.replace('</body>', combined + '</body>');
      }
      return rawPreviewHtml + combined;
    }

    // ─── EDIT MODE: full visual editor ───
    // Build the script as an array of lines to avoid all escaping issues
    const L: string[] = [];
    L.push('<script>');
    L.push('(function(){');
    L.push('document.addEventListener("submit",function(e){e.preventDefault();},true);');

    // ── Tag classification ──
    L.push('var TT="H1,H2,H3,H4,H5,H6,P,SPAN,A,LI,TD,TH,LABEL,BUTTON,FIGCAPTION,BLOCKQUOTE,CAPTION,SUMMARY,LEGEND,DT,DD,STRONG,EM,B,I,U,SMALL,SUB,SUP,MARK,DEL,INS,CITE,CODE,PRE,KBD,ABBR,TIME,ADDRESS".split(",");');
    L.push('var BT="DIV,SECTION,HEADER,FOOTER,NAV,MAIN,ARTICLE,ASIDE,FIGURE,UL,OL,TABLE,FORM,FIELDSET".split(",");');
    L.push('function hasText(el){for(var i=0;i<el.childNodes.length;i++){if(el.childNodes[i].nodeType===3&&el.childNodes[i].textContent.trim())return true;}return false;}');
    L.push('function isTextOk(el){if(!el||el===document.body||el===document.documentElement)return false;if(el.closest("#__ed_tb,#__ed_mv"))return false;var t=el.tagName;if(TT.indexOf(t)!==-1)return true;if(BT.indexOf(t)!==-1&&hasText(el))return true;return false;}');
    L.push('function findTextEl(n){while(n&&n!==document.body){if(isTextOk(n))return n;n=n.parentElement;}return null;}');

    // ── Any visible element is draggable (not just sections) ──
    L.push('var SKIP_DRAG="HTML,BODY,HEAD,SCRIPT,STYLE,LINK,META,TITLE,BR,HR,WBR,NOSCRIPT".split(",");');
    L.push('function isDragOk(el){if(!el||el===document.body||el===document.documentElement)return false;if(el.closest("#__ed_tb,#__ed_mv"))return false;if(SKIP_DRAG.indexOf(el.tagName)!==-1)return false;var r=el.getBoundingClientRect();if(r.width<10||r.height<10)return false;return true;}');
    L.push('function findDragEl(n){var best=null;while(n&&n!==document.body){if(isDragOk(n))best=n;n=n.parentElement;}return best;}');
    // Find the deepest draggable (closest to what was hovered)
    L.push('function findDeepDrag(n){while(n&&n!==document.body){if(isDragOk(n))return n;n=n.parentElement;}return null;}');

    L.push('var sel=null,hov=null,mvTarget=null;');

    // ── Floating Text Toolbar ──
    L.push('var tb=document.createElement("div");tb.id="__ed_tb";');
    L.push('tb.style.cssText="position:fixed;top:-999px;left:0;z-index:2147483647;display:flex;align-items:center;gap:4px;padding:5px 10px;background:#111;border:1px solid #333;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.7);font-family:system-ui,sans-serif;font-size:12px;color:#fff;pointer-events:auto;";');
    L.push('function mkBtn(label,cmd,extra){var b=document.createElement("button");b.textContent=label;b.dataset.cmd=cmd;b.style.cssText="all:unset;cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:14px;"+(extra||"");b.onmouseenter=function(){b.style.background="#333";};b.onmouseleave=function(){b.style.background="transparent";};return b;}');
    L.push('function mkSep(){var s=document.createElement("span");s.style.cssText="width:1px;height:20px;background:#333;margin:0 2px;";return s;}');
    L.push('tb.appendChild(mkBtn("B","bold","font-weight:bold;"));');
    L.push('tb.appendChild(mkBtn("I","italic","font-style:italic;"));');
    L.push('tb.appendChild(mkBtn("U","underline","text-decoration:underline;"));');
    L.push('tb.appendChild(mkBtn("S","strikeThrough","text-decoration:line-through;"));');
    L.push('tb.appendChild(mkSep());');
    L.push('function mkColor(title,role,visual){var lbl=document.createElement("label");lbl.title=title;lbl.style.cssText="cursor:pointer;display:flex;align-items:center;position:relative;width:28px;height:28px;justify-content:center;border-radius:6px;";lbl.onmouseenter=function(){lbl.style.background="#333";};lbl.onmouseleave=function(){lbl.style.background="transparent";};var vis=document.createElement("span");vis.style.cssText=visual;lbl.appendChild(vis);var inp=document.createElement("input");inp.type="color";inp.dataset.role=role;inp.style.cssText="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;";lbl.appendChild(inp);return lbl;}');
    L.push('tb.appendChild(mkColor("Text color","fg","font-size:14px;font-weight:bold;border-bottom:3px solid #3b82f6;display:block;line-height:1;"));');
    L.push('tb.appendChild(mkColor("Highlight","bg","width:16px;height:16px;background:linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff);border-radius:4px;display:block;"));');
    L.push('tb.appendChild(mkSep());');
    L.push('var szSel=document.createElement("select");szSel.style.cssText="all:unset;cursor:pointer;padding:2px 6px;border-radius:6px;font-size:11px;background:#222;color:#fff;height:28px;";');
    L.push('["Size:","XS:1","S:2","M:3","L:4","XL:5","2XL:6","3XL:7"].forEach(function(s){var p=s.split(":");var o=document.createElement("option");o.textContent=p[0];o.value=p[1]||"";szSel.appendChild(o);});');
    L.push('tb.appendChild(szSel);tb.appendChild(mkSep());');
    L.push('tb.appendChild(mkBtn("\\u2261","justifyLeft","font-size:16px;"));');
    L.push('tb.appendChild(mkBtn("\\u2263","justifyCenter","font-size:16px;"));');
    L.push('tb.appendChild(mkSep());');
    L.push('tb.appendChild(mkBtn("\\u2715","removeFormat","font-size:13px;color:#ef4444;"));');
    L.push('document.body.appendChild(tb);');

    // ── Move Panel (appears on left of ANY hovered element) ──
    L.push('var mv=document.createElement("div");mv.id="__ed_mv";');
    L.push('mv.style.cssText="position:fixed;top:-999px;left:0;z-index:2147483646;display:flex;flex-direction:column;gap:2px;pointer-events:auto;";');
    L.push('function mkMvBtn(label,title,fn){var b=document.createElement("button");b.innerHTML=label;b.title=title;b.style.cssText="all:unset;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(17,17,17,.9);border:1px solid #333;color:#fff;font-size:11px;backdrop-filter:blur(8px);";b.onmouseenter=function(){b.style.background="#333";};b.onmouseleave=function(){b.style.background="rgba(17,17,17,.9)";};b.onclick=function(e){e.preventDefault();e.stopPropagation();fn();};return b;}');

    // Move up
    L.push('var mvUp=mkMvBtn("\\u25B2","Move up",function(){if(!mvTarget||!mvTarget.previousElementSibling)return;mvTarget.previousElementSibling.insertAdjacentElement("beforebegin",mvTarget);posMv(mvTarget);notifySync();});');
    // Move down
    L.push('var mvDown=mkMvBtn("\\u25BC","Move down",function(){if(!mvTarget||!mvTarget.nextElementSibling)return;mvTarget.nextElementSibling.insertAdjacentElement("afterend",mvTarget);posMv(mvTarget);notifySync();});');
    // Duplicate
    L.push('var mvDup=mkMvBtn("\\u2750","Duplicate",function(){if(!mvTarget)return;var cl=mvTarget.cloneNode(true);mvTarget.insertAdjacentElement("afterend",cl);notifySync();});');
    // Delete
    L.push('var mvDel=mkMvBtn("\\u2716","Delete",function(){if(!mvTarget)return;mvTarget.remove();mvTarget=null;mv.style.top="-999px";notifySync();});');
    L.push('mvDel.style.color="#ef4444";');
    // AI Prompt button — sends element to parent for AI modification
    L.push('var mvAI=mkMvBtn("\\u2728","AI: modify this element",function(){if(!mvTarget)return;var r=mvTarget.getBoundingClientRect();function cssPath(el){if(!el||el===document.body)return"body";var p=el.parentElement;if(!p)return el.tagName.toLowerCase();var sibs=Array.from(p.children).filter(function(c){return c.tagName===el.tagName;});var idx=sibs.indexOf(el);var s=el.tagName.toLowerCase();if(el.id)s+="#"+el.id;else if(sibs.length>1)s+=":nth-of-type("+(idx+1)+")";return cssPath(p)+" > "+s;}var c=document.documentElement.cloneNode(false);var path=cssPath(mvTarget);parent.postMessage({type:"aurion_select_prompt",element:{outerHtml:mvTarget.outerHTML.slice(0,8000),cssPath:path,tagName:mvTarget.tagName,rect:{top:r.top,left:r.left,width:r.width,height:r.height}}},"*");});');
    L.push('mvAI.style.color="#a78bfa";mvAI.style.background="rgba(167,139,250,.15)";mvAI.style.border="1px solid rgba(167,139,250,.3)";');
    // Drag handle
    L.push('var mvDrag=document.createElement("div");mvDrag.title="Drag to move";mvDrag.innerHTML="\\u2630";mvDrag.style.cssText="cursor:grab;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(17,17,17,.9);border:1px solid #333;color:#888;font-size:12px;user-select:none;";');
    L.push('mv.appendChild(mvUp);mv.appendChild(mvDrag);mv.appendChild(mvDown);');
    L.push('var mvSep=document.createElement("div");mvSep.style.cssText="height:1px;background:#333;margin:1px 0;";mv.appendChild(mvSep);');
    L.push('mv.appendChild(mvDup);mv.appendChild(mvDel);mv.appendChild(mvAI);');
    L.push('document.body.appendChild(mv);');

    // ── Drag & Drop for ANY element ──
    L.push('var dragEl=null,dragGhost=null,dragPlaceholder=null;');
    L.push('mvDrag.addEventListener("mousedown",function(e){if(!mvTarget)return;e.preventDefault();dragEl=mvTarget;');
    L.push('dragGhost=dragEl.cloneNode(true);var w=Math.min(dragEl.offsetWidth,400);dragGhost.style.cssText="position:fixed;pointer-events:none;opacity:0.5;z-index:2147483645;width:"+w+"px;max-height:200px;overflow:hidden;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.5);transform:scale(0.92);";');
    L.push('document.body.appendChild(dragGhost);');
    L.push('dragPlaceholder=document.createElement("div");dragPlaceholder.style.cssText="height:4px;background:#3b82f6;border-radius:2px;margin:4px 0;transition:all .15s;pointer-events:none;";');
    L.push('dragEl.style.opacity="0.25";dragEl.style.outline="2px dashed #3b82f6";');
    L.push('moveDragGhost(e);document.addEventListener("mousemove",onDragMove);document.addEventListener("mouseup",onDragEnd);});');

    L.push('function moveDragGhost(e){if(dragGhost){dragGhost.style.top=(e.clientY+10)+"px";dragGhost.style.left=(e.clientX+10)+"px";}}');

    L.push('function onDragMove(e){moveDragGhost(e);if(!dragEl||!dragEl.parentElement)return;');
    L.push('var parent=dragEl.parentElement;var siblings=Array.from(parent.children).filter(function(c){return c!==dragEl&&c!==dragPlaceholder&&c!==dragGhost&&!c.id&&c.tagName!=="SCRIPT"&&c.tagName!=="STYLE";});');
    L.push('if(dragPlaceholder.parentElement)dragPlaceholder.remove();');
    L.push('var closest=null,closestDist=99999,before=true;');
    L.push('siblings.forEach(function(sib){var r=sib.getBoundingClientRect();var mid=r.top+r.height/2;var dist=Math.abs(e.clientY-mid);if(dist<closestDist){closestDist=dist;closest=sib;before=e.clientY<mid;}});');
    L.push('if(closest){if(before){closest.insertAdjacentElement("beforebegin",dragPlaceholder);}else{closest.insertAdjacentElement("afterend",dragPlaceholder);}}');
    L.push('}');

    L.push('function onDragEnd(){document.removeEventListener("mousemove",onDragMove);document.removeEventListener("mouseup",onDragEnd);');
    L.push('if(dragGhost){dragGhost.remove();dragGhost=null;}');
    L.push('if(dragEl){dragEl.style.opacity="";dragEl.style.outline="";if(dragPlaceholder&&dragPlaceholder.parentElement){dragPlaceholder.insertAdjacentElement("beforebegin",dragEl);}if(dragPlaceholder)dragPlaceholder.remove();dragPlaceholder=null;posMv(dragEl);notifySync();}dragEl=null;}');

    // Position move panel  
    L.push('function posMv(el){if(!el){mv.style.top="-999px";return;}mvTarget=el;var r=el.getBoundingClientRect();var panelLeft=r.left-32;if(panelLeft<4)panelLeft=r.right+4;mv.style.top=Math.max(4,r.top)+"px";mv.style.left=panelLeft+"px";}');

    // ── Toolbar events ──
    L.push('tb.addEventListener("mousedown",function(e){e.preventDefault();e.stopPropagation();},true);');
    L.push('tb.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();var btn=e.target.closest("button[data-cmd]");if(btn){document.execCommand(btn.dataset.cmd,false,null);notifySync();}},true);');
    L.push('mv.addEventListener("mousedown",function(e){if(e.target===mvDrag)return;e.preventDefault();e.stopPropagation();},true);');
    L.push('tb.querySelectorAll("input[type=color]").forEach(function(inp){inp.addEventListener("input",function(){if(inp.dataset.role==="fg"){document.execCommand("foreColor",false,inp.value);}else{document.execCommand("hiliteColor",false,inp.value);}notifySync();});});');
    L.push('szSel.addEventListener("change",function(){if(szSel.value){document.execCommand("fontSize",false,szSel.value);notifySync();}szSel.selectedIndex=0;});');

    // Position text toolbar
    L.push('function posTb(el){if(!el)return;var r=el.getBoundingClientRect();var tw=tb.offsetWidth||300;var th=tb.offsetHeight||40;var tx=Math.max(4,Math.min(r.left+(r.width-tw)/2,window.innerWidth-tw-4));var ty=r.top-th-8;if(ty<4)ty=r.bottom+8;tb.style.top=ty+"px";tb.style.left=tx+"px";}');

    // ── Editor styles ──
    L.push('var st=document.createElement("style");st.id="__ed_st";');
    L.push('st.textContent=".__ed_h{outline:2px dashed rgba(59,130,246,.35)!important;outline-offset:2px;cursor:text!important;position:relative}.__ed_s{outline:2px solid #3b82f6!important;outline-offset:2px;cursor:text!important;min-height:1em}.__ed_h:not(.__ed_s)::after{content:attr(data-tag);position:absolute;top:-18px;left:0;font-size:9px;background:#3b82f6;color:#fff;padding:1px 5px;border-radius:3px;pointer-events:none;font-family:system-ui,sans-serif;font-weight:500;line-height:14px;z-index:2147483646;white-space:nowrap}.__ed_dh{outline:2px dashed rgba(168,85,247,.35)!important;outline-offset:1px;position:relative}.__ed_dh::before{content:attr(data-dtag);position:absolute;top:-16px;right:0;font-size:8px;background:#a855f7;color:#fff;padding:1px 4px;border-radius:3px;pointer-events:none;font-family:system-ui,sans-serif;font-weight:500;line-height:12px;z-index:2147483646;white-space:nowrap}[contenteditable=true]{cursor:text!important}#__ed_tb button:hover,#__ed_tb select:hover{background:#333!important}";');
    L.push('document.head.appendChild(st);');

    // ── Hover — text elements + draggable elements ──
    L.push('document.addEventListener("mouseover",function(e){');
    // Text hover
    L.push('var tel=findTextEl(e.target);if(hov&&hov!==tel){hov.classList.remove("__ed_h");hov.removeAttribute("data-tag");}if(tel){tel.classList.add("__ed_h");tel.setAttribute("data-tag",tel.tagName.toLowerCase());hov=tel;}else{hov=null;}');
    // Drag hover — show move panel on any meaningful element
    L.push('var del=findDeepDrag(e.target);if(del&&del!==mvTarget){posMv(del);}');
    L.push('},true);');

    // ── Click — text editing (let browser place cursor naturally) ──
    L.push('document.addEventListener("click",function(e){');
    L.push('if(e.target.closest("#__ed_tb,#__ed_mv"))return;');
    L.push('var a=e.target.closest("a");if(a)e.preventDefault();');
    L.push('var el=findTextEl(e.target);');
    L.push('if(!el){doDesel();return;}');
    L.push('e.preventDefault();');
    L.push('if(sel&&sel!==el){sel.contentEditable="false";sel.classList.remove("__ed_s");}');
    L.push('var isNew=sel!==el;sel=el;el.contentEditable="true";el.classList.add("__ed_s");');
    // DON'T move cursor — let browser handle naturally. Only focus if new element
    L.push('if(isNew){el.focus();setTimeout(function(){posTb(el);},0);}else{posTb(el);}');
    L.push('},true);');

    // mouseup — reposition toolbar after cursor placement
    L.push('document.addEventListener("mouseup",function(e){if(sel&&sel.contentEditable==="true"){setTimeout(function(){posTb(sel);},10);}},true);');

    // deselect
    L.push('function doDesel(){if(sel){sel.contentEditable="false";sel.classList.remove("__ed_s");}sel=null;tb.style.top="-999px";}');

    // Tab navigation (this one places cursor at end)
    L.push('function doSelTab(el){if(sel&&sel!==el){sel.contentEditable="false";sel.classList.remove("__ed_s");}sel=el;el.contentEditable="true";el.classList.add("__ed_s");el.focus();var rng=document.createRange();var s=window.getSelection();rng.selectNodeContents(el);rng.collapse(false);s.removeAllRanges();s.addRange(rng);posTb(el);}');

    // ── Input / keyboard ──
    L.push('document.addEventListener("input",function(){if(sel)posTb(sel);notifySync();},true);');
    L.push('document.addEventListener("keydown",function(e){if(e.key==="Escape"){doDesel();e.preventDefault();}if(e.key==="Tab"&&sel){e.preventDefault();var all=Array.from(document.querySelectorAll("*")).filter(isTextOk);var i=all.indexOf(sel);var nx=all[e.shiftKey?(i-1+all.length)%all.length:(i+1)%all.length];if(nx)doSelTab(nx);}});');
    L.push('window.addEventListener("scroll",function(){if(sel)posTb(sel);if(mvTarget)posMv(mvTarget);},true);');
    L.push('window.addEventListener("resize",function(){if(sel)posTb(sel);if(mvTarget)posMv(mvTarget);});');

    // ── Sync to parent — ONLY sends data, parent stores in ref (no re-render) ──
    L.push('var syncT;');
    L.push('function notifySync(){clearTimeout(syncT);syncT=setTimeout(function(){var c=document.documentElement.cloneNode(true);c.querySelectorAll("#__ed_tb,#__ed_st,#__ed_mv").forEach(function(n){n.remove();});c.querySelectorAll(".__ed_h,.__ed_s,.__ed_dh,[contenteditable],[data-tag],[data-dtag]").forEach(function(n){n.classList.remove("__ed_h","__ed_s","__ed_dh");n.removeAttribute("contenteditable");n.removeAttribute("data-tag");n.removeAttribute("data-dtag");});c.querySelectorAll("script").forEach(function(s){var t=s.textContent||"";if(t.indexOf("__ed_")!==-1||t.indexOf("aurion_edit")!==-1)s.remove();});parent.postMessage({type:"aurion_edit",html:"<!DOCTYPE html>"+c.outerHTML},"*");},600);}');

    L.push('})();');
    L.push('</scr'+'ipt>');

    const editorScript = L.join('\n');

    if (rawPreviewHtml.includes('</body>')) {
      return rawPreviewHtml.replace('</body>', errorCaptureScript + '\n' + editorScript + '\n</body>');
    }
    return rawPreviewHtml + '\n' + editorScript;
  }, [rawPreviewHtml, isEditMode]);
  const codeBlocks = useMemo(() => extractAllCodeBlocks(messages), [messages]);

  // Build workspace context string for AI
  const buildWorkspaceContext = useCallback(() => {
    const parts: string[] = [];
    parts.push('[WORKSPACE STATE]');
    parts.push(`Active tab: ${activeTab}`);
    parts.push(`Preview: ${previewHtml ? 'has content' : 'empty'}`);
    if (clonedHtml) {
      parts.push(`Clone: active (from ${cloneUrl || 'URL'})`);
    }
    if (showTerminal && terminalLines.length > 0) {
      parts.push(`Terminal (last 5 lines):`);
      terminalLines.slice(-5).forEach(l => parts.push(`  ${l}`));
    } else {
      parts.push(`Terminal: ${showTerminal ? 'visible (empty)' : 'hidden'}`);
    }
    const connectedKeys = Object.keys(integrationKeys);
    if (connectedKeys.length > 0) {
      parts.push(`Connected integrations: ${connectedKeys.join(', ')}`);
    }
    const fileList = Object.keys(projectFiles);
    if (fileList.length > 0) {
      parts.push(`Project files (${fileList.length}): ${fileList.join(', ')}`);
      // Prioritize: selected file gets full content, others get summaries
      // Total budget: ~6000 chars to avoid bloating the prompt
      const selectedBudget = 2000;
      const otherBudget = fileList.length <= 3 ? 800 : fileList.length <= 8 ? 400 : 200;
      for (const path of fileList) {
        const file = projectFiles[path];
        const isSelected = path === selectedFile;
        const budget = isSelected ? selectedBudget : otherBudget;
        parts.push(`--- ${path} (${file.language}, ${file.content.length} chars)${isSelected ? ' [ACTIVE]' : ''} ---`);
        parts.push(file.content.slice(0, budget) + (file.content.length > budget ? '\n... (truncated)' : ''));
      }
    } else if (codeBlocks.length > 0) {
      parts.push(`Code blocks generated: ${codeBlocks.length}`);
    }
    parts.push(`Model: ${selectedModel.name}`);
    parts.push(`Device preview: ${deviceMode}`);
    parts.push('');
    parts.push('Use <<FILE:path>>content<</FILE>> to create/update files (FULL content, not diffs).');
    parts.push('For incremental edits, only emit changed files. Other files are preserved.');
    parts.push('[/WORKSPACE STATE]');
    return parts.join('\n');
  }, [activeTab, previewHtml, clonedHtml, cloneUrl, codeBlocks, selectedModel, showTerminal, terminalLines, integrationKeys, projectFiles, selectedFile, deviceMode]);

  /* ── Send message & stream response ── */
  const streamToAssistant = useCallback(async (
    allMessages: { role: string; content: string }[],
    assistantMsgId: string,
    useModel: string,
    signal: AbortSignal,
    images?: { data: string; type: string }[],
  ) => {
    const selectedModel = MODELS.find(m => m.id === useModel);
    const endpoint = getApiEndpoint(selectedModel?.provider || 'ollama');
    const res = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: allMessages, model: useModel, ...(images?.length ? { images } : {}) }),
      signal,
      timeout: 120000, // 2 min for AI streaming
    }, 2);

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
        if (data.error) {
          const clean = data.error.replace(/\[GoogleGenerativeAI Error\]:?\s*/gi, '').replace(/Error fetching from https:\/\/[^\s]+/gi, '').replace(/\[{"@type"[\s\S]*/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 150) || 'Request failed. Please try again.';
          throw new Error(clean);
        }
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
    // Smart model auto-routing
    const optimalModel = getOptimalModel(model, text, !!(imgs && imgs.length > 0));
    if (optimalModel !== model) setModel(optimalModel);
    const useModelId = optimalModel;
    const userMsg: Message = { id: generateId(), role: 'user', content: text.trim() };
    const assistantMsg: Message = { id: generateId(), role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Build context & messages once
    const ctx = buildWorkspaceContext();
    const allMessages = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
    if (allMessages.length > 0) {
      allMessages[allMessages.length - 1] = {
        ...allMessages[allMessages.length - 1],
        content: allMessages[allMessages.length - 1].content + '\n\n' + ctx,
      };
    }

    // A/B comparison: fire model B in parallel
    if (abMode && abModelB !== useModelId) {
      setAbResultB('');
      setAbStreaming(true);
      const abController = new AbortController();
      abAbortRef.current = abController;
      const abMsgId = generateId();
      // Stream model B in background — collect result in state
      (async () => {
        try {
          const selectedModelB = MODELS.find(m => m.id === abModelB);
          const endpoint = getApiEndpoint(selectedModelB?.provider || 'ollama');
          const res = await fetchWithRetry(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: allMessages, model: abModelB, ...(imgs?.length ? { images: imgs } : {}) }),
            signal: abController.signal,
            timeout: 120000,
          }, 2);
          if (!res.ok) throw new Error('Model B request failed');
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) return;
          let buf = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6);
              if (payload === '[DONE]') break;
              try {
                const d = JSON.parse(payload);
                if (d.text) setAbResultB(prev => prev + d.text);
              } catch { continue; }
            }
          }
        } catch { /* Model B failed silently — A is primary */ }
        finally { setAbStreaming(false); abAbortRef.current = null; }
      })();
    }

    try {
      await streamToAssistant(allMessages, assistantMsg.id, useModelId, controller.signal, imgs);
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const raw = err instanceof Error ? err.message : 'Unknown error';
      // Clean ugly SDK/API errors for display
      const msg = raw
        .replace(/\[GoogleGenerativeAI Error\]:?\s*/gi, '')
        .replace(/Error fetching from https:\/\/[^\s]+/gi, '')
        .replace(/\[{"@type"[\s\S]*/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 150) || 'Request failed. Please try again.';
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id || m.content.length > 0));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      autoFixInFlightRef.current = false;
    }
  }, [isStreaming, messages, model, streamToAssistant, buildWorkspaceContext, abMode, abModelB]);

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
      const res = await fetchWithRetry('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, projectName: projectName || 'aurion-app-' + Date.now().toString(36) }),
        timeout: 60000, // 60s for deploy
      }, 1);

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
  const streamClone = async (url: string, html: string, tokens: { colors: string[]; fonts: string[]; cssVariables?: Record<string, string>; gradients?: string[]; shadows?: string[]; borderRadii?: string[]; mediaQueries?: string[]; keyframes?: string[] }, screenshot: string | null, signal: AbortSignal, pageName?: string, rawHtml?: string, branding?: unknown, navigation?: unknown[], images?: unknown[], videos?: unknown[], styleBlocks?: string, linkedResources?: unknown, screenshots?: string[], currentHtml?: string, feedback?: string, extraData?: { cssFramework?: string; iconLibraries?: string[]; animationLibraries?: string[]; colorFrequency?: Record<string, number> }): Promise<string> => {
    const res = await fetch('/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, html, rawHtml, tokens, branding, screenshot, screenshots, pageName, navigation, images, videos, styleBlocks, linkedResources, model, currentHtml, feedback, ...(extraData || {}) }),
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
    let rawBytes = 0;
    let eventCount = 0;
    let textEvents = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rawBytes += value?.byteLength ?? 0;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        eventCount++;
        const payload = line.slice(6);
        if (payload === '[DONE]') break;
        let data;
        try { data = JSON.parse(payload); } catch { continue; }
        if (data.error) {
          const clean = data.error.replace(/\[GoogleGenerativeAI Error\]:?\s*/gi, '').replace(/Error fetching from https:\/\/[^\s]+/gi, '').replace(/\[{"@type"[\s\S]*/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 150) || 'Clone failed. Please try again.';
          throw new Error(clean);
        }
        if (data.model) setCloneProgress(`Cloning with ${data.model}...`);
        if (data.text) { result += data.text; textEvents++; }
      }
    }
    console.log(`[streamClone] rawBytes=${rawBytes}, events=${eventCount}, textEvents=${textEvents}, resultLen=${result.length}, starts=${result.slice(0, 60)}`);
    // Extract HTML content — adapted from screenshot-to-code codegen/utils.py
    let cleaned = result.trim();
    // 1. Extract from <file path="...">...</file> wrapper (screenshot-to-code format)
    const fileMatch = cleaned.match(/<file\s+path="[^"]+"\s*>([\s\S]*?)<\/file>/i);
    if (fileMatch) {
      cleaned = fileMatch[1].trim();
    }
    // 2. Strip markdown code fences if AI wrapped the HTML
    cleaned = cleaned.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    // 3. Strip <think> reasoning blocks from models that include them
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
    // 4. Extract <!DOCTYPE html>.....</html> if there's extra text around it
    const doctypeMatch = cleaned.match(/(<!DOCTYPE\s+html[^>]*>[\s\S]*<\/html>)/i);
    if (doctypeMatch) {
      cleaned = doctypeMatch[1];
    } else {
      const htmlMatch = cleaned.match(/(<html[\s\S]*<\/html>)/i);
      if (htmlMatch) cleaned = htmlMatch[1];
    }
    // 5. Remove external resource links that cause CORS errors in iframe
    cleaned = cleaned.replace(/<link[^>]*rel=["'](?:manifest|preconnect|dns-prefetch|preload|prefetch|modulepreload)[^>]*>/gi, '');
    cleaned = cleaned.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
    cleaned = cleaned.replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, '');
    // 6. Fix duplicate HTML documents: if AI echoed scraped HTML after its clone, keep only the first document
    const secondDoctype = cleaned.indexOf('<!DOCTYPE', 10);
    if (secondDoctype > 0) {
      cleaned = cleaned.slice(0, secondDoctype).trim();
      if (!cleaned.includes('</html>')) cleaned += '\n</html>';
      if (!cleaned.includes('</body>')) cleaned = cleaned.replace('</html>', '</body>\n</html>');
    }
    // 7. Post-processing: inject <base href> for relative asset URLs
    if (url && cleaned.includes('<head')) {
      try {
        const origin = new URL(url).origin;
        if (!cleaned.includes('<base ')) {
          cleaned = cleaned.replace(/<head([^>]*)>/, `<head$1>\n<base href="${origin}/" target="_self">`);
        }
      } catch { /* invalid url, skip */ }
    }
    // 8. Ensure Font Awesome CDN if fa- classes are used
    if (/\bfa-[a-z]/.test(cleaned) && !cleaned.includes('font-awesome') && !cleaned.includes('fontawesome')) {
      cleaned = cleaned.replace('</head>', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">\n</head>');
    }
    // 9. HTML integrity: ensure closing tags exist
    if (!/<\/body>/i.test(cleaned) && /<body/i.test(cleaned)) cleaned += '\n</body>';
    if (!/<\/html>/i.test(cleaned) && /<html/i.test(cleaned)) cleaned += '\n</html>';
    return cleaned;
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
      const scrapeRes = await fetchWithRetry('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
        timeout: 45000, // 45s for scraping
      }, 1);

      if (!scrapeRes.ok) {
        const err = await scrapeRes.json().catch(() => ({ error: 'Scrape failed' }));
        throw new Error(err.error || `Scrape HTTP ${scrapeRes.status}`);
      }

      const scrapeData = await scrapeRes.json();

      // Store scrapeData for future refinement iterations
      lastScrapeDataRef.current = scrapeData;

      // Step 2: Clone main page with AI
      setCloneProgress('Cloning main page with AI...');
      let mainHtml = '';
      let cloneErrorMsg = '';
      try {
        mainHtml = await streamClone(
          url,
          scrapeData.html,
          scrapeData.tokens,
          scrapeData.screenshot,
          controller.signal,
          undefined,
          scrapeData.rawHtml, // pass full raw HTML for complete page reconstruction
          scrapeData.branding,
          scrapeData.navigation,
          scrapeData.images,
          scrapeData.videos,
          scrapeData.styleBlocks,
          scrapeData.linkedResources,
          scrapeData.screenshots, // multi-screenshot scroll captures
          undefined, // currentHtml
          undefined, // feedback
          { cssFramework: scrapeData.cssFramework, iconLibraries: scrapeData.iconLibraries, animationLibraries: scrapeData.animationLibraries, colorFrequency: scrapeData.colorFrequency },
        );
        console.log('[clone] AI returned', mainHtml.length, 'chars. Starts with:', mainHtml.slice(0, 100));
      } catch (cloneErr) {
        cloneErrorMsg = cloneErr instanceof Error ? cloneErr.message : 'Unknown clone error';
        console.warn(`[clone] AI clone failed (model: ${model}):`, cloneErrorMsg);
      }

      // If AI produced valid HTML (has doctype or body tag and substantial content), use it
      const aiWorked = mainHtml.length > 200 && (/<body/i.test(mainHtml) || /<!DOCTYPE/i.test(mainHtml));

      if (!aiWorked) {
        // Show the actual error from the API so user can diagnose
        const safeErr = cloneErrorMsg
          ? cloneErrorMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 200)
          : `AI returned ${mainHtml.length} chars. Check browser console (F12) for [streamClone] debug info.`;
        console.log('[clone] AI failed:', safeErr);
        mainHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clone Error</title></head><body style="background:#0a0a0a;color:#e0e0e0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0"><div style="text-align:center;max-width:480px;padding:40px"><div style="font-size:48px;margin-bottom:16px">⚠️</div><h2 style="font-size:22px;font-weight:600;margin:0 0 12px">Clone Failed</h2><p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 16px">${safeErr}</p><p style="color:#666;font-size:13px">Try a different URL, retry, or check API keys in Vercel dashboard.</p></div></body></html>`;
      }

      // Auto-refinement: if clone succeeded, do a self-check refinement pass
      if (aiWorked && !controller.signal.aborted) {
        setCloneProgress('Auto-refining for accuracy...');
        try {
          const autoFeedback = 'Self-check: compare your output against the original. Fix any missing sections, wrong colors, broken layouts, missing images, incorrect fonts, or misaligned elements. Make it pixel-perfect.';
          const refined = await streamClone(
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
            scrapeData.videos,
            scrapeData.styleBlocks,
            scrapeData.linkedResources,
            scrapeData.screenshots,
            mainHtml,       // currentHtml
            autoFeedback,   // feedback
            { cssFramework: scrapeData.cssFramework, iconLibraries: scrapeData.iconLibraries, animationLibraries: scrapeData.animationLibraries, colorFrequency: scrapeData.colorFrequency },
          );
          const refinedWorked = refined.length > 200 && (/<body/i.test(refined) || /<!DOCTYPE/i.test(refined));
          if (refinedWorked) {
            mainHtml = refined;
            setTerminalLines(prev => [...prev, '$ \u2713 auto-refined clone for accuracy']);
          }
        } catch {
          // Auto-refine failed, keep original clone — not critical
        }
      }

      setCloneProgress('Done');
      setClonedHtml(mainHtml);
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
    setIsRefining(false);
    setCloneProgress('');
  };

  const refineClone = useCallback(async () => {
    const feedbackText = refineFeedback.trim().slice(0, 2000); // Cap feedback to prevent context overflow
    if (!feedbackText || !clonedHtml || !lastScrapeDataRef.current || isRefining) return;

    setIsRefining(true);
    setCloneProgress('Refining clone...');
    setCloneError(null);

    const controller = new AbortController();
    cloneAbortRef.current = controller;
    const scrapeData = lastScrapeDataRef.current;

    try {
      const refined = await streamClone(
        cloneUrl,
        scrapeData.html,
        scrapeData.tokens,
        scrapeData.screenshot,
        controller.signal,
        undefined,
        scrapeData.rawHtml, // pass rawHtml for structured content + SPA data extraction
        scrapeData.branding,
        scrapeData.navigation,
        scrapeData.images,
        scrapeData.videos,
        scrapeData.styleBlocks,
        scrapeData.linkedResources,
        scrapeData.screenshots,
        clonedHtml,    // currentHtml
        feedbackText,  // feedback
        { cssFramework: scrapeData.cssFramework, iconLibraries: scrapeData.iconLibraries, animationLibraries: scrapeData.animationLibraries, colorFrequency: scrapeData.colorFrequency },
      );

      const aiWorked = refined.length > 200 && (/<body/i.test(refined) || /<!DOCTYPE/i.test(refined));
      if (aiWorked) {
        setClonedHtml(refined);
        setRefineFeedback('');
      } else {
        setCloneError('Refinement produced invalid HTML. Try different feedback.');
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Refine failed';
      setCloneError(msg);
    } finally {
      setIsRefining(false);
      setCloneProgress('');
      cloneAbortRef.current = null;
    }
  }, [refineFeedback, clonedHtml, cloneUrl, isRefining, model]);

  // Listen for visual edits from the iframe — store in ref, don't update state (prevents iframe re-render)
  useEffect(() => {
    function handleEditorMessage(e: MessageEvent) {
      if (e.data?.type !== 'aurion_edit' || !e.data.html) return;
      pendingEditHtmlRef.current = e.data.html as string;
    }
    if (isEditMode) {
      window.addEventListener('message', handleEditorMessage);
      return () => window.removeEventListener('message', handleEditorMessage);
    }
  }, [isEditMode]);

  // Listen for runtime errors from the iframe preview
  useEffect(() => {
    function handleIframeError(e: MessageEvent) {
      if (e.data?.type !== 'aurion_error' || !e.data.error) return;
      const err = e.data.error as { message: string; source?: string; line?: number; col?: number };
      // Ignore noise: ResizeObserver, extensions, browser internals
      if (/ResizeObserver|Script error\.|chrome-extension|moz-extension/i.test(err.message)) return;
      const entry = { ...err, timestamp: Date.now() };
      setRuntimeErrors(prev => {
        // Deduplicate within 3 seconds
        if (prev.some(p => p.message === err.message && entry.timestamp - p.timestamp < 3000)) return prev;
        const next = [...prev, entry].slice(-20); // keep last 20
        return next;
      });
      setTerminalLines(prev => [...prev, `✗ Runtime Error: ${err.message}${err.line ? ` (line ${err.line})` : ''}`]);
      setShowTerminal(true);
    }
    window.addEventListener('message', handleIframeError);
    return () => window.removeEventListener('message', handleIframeError);
  }, []);

  // Auto-fix: when enabled and new errors appear, automatically send fix request to AI
  useEffect(() => {
    if (!autoFixEnabled || runtimeErrors.length === 0 || isStreaming || autoFixInFlightRef.current) return;
    const latestError = runtimeErrors[runtimeErrors.length - 1];
    // Only auto-fix errors from the last 5 seconds
    if (Date.now() - latestError.timestamp > 5000) return;
    autoFixInFlightRef.current = true;
    const currentHtml = rawPreviewHtml || '';
    const codeSnippet = currentHtml.length > 6000 ? currentHtml.slice(0, 3000) + '\n... (truncated) ...\n' + currentHtml.slice(-3000) : currentHtml;
    const fixPrompt = `🔧 AUTO-FIX: Runtime error detected in the preview:\n\nError: ${latestError.message}${latestError.line ? `\nLine: ${latestError.line}` : ''}${latestError.source ? `\nSource: ${latestError.source}` : ''}\n\nCurrent code:\n\`\`\`html\n${codeSnippet}\n\`\`\`\n\nFix this error. Return the COMPLETE corrected HTML. Do not explain, just fix the code.`;
    sendToAI(fixPrompt);
    // Reset after sending (prevent loops)
    setTimeout(() => { autoFixInFlightRef.current = false; }, 10000);
  }, [runtimeErrors, autoFixEnabled, isStreaming, rawPreviewHtml, sendToAI]);

  // Manual fix — user clicks "Fix" on a specific error
  const fixRuntimeError = useCallback((err: { message: string; source?: string; line?: number }) => {
    if (isStreaming) return;
    const currentHtml = rawPreviewHtml || '';
    const codeSnippet = currentHtml.length > 6000 ? currentHtml.slice(0, 3000) + '\n... (truncated) ...\n' + currentHtml.slice(-3000) : currentHtml;
    const fixPrompt = `Fix this runtime error in my preview:\n\nError: ${err.message}${err.line ? `\nLine: ${err.line}` : ''}${err.source ? `\nSource: ${err.source}` : ''}\n\nCurrent code:\n\`\`\`html\n${codeSnippet}\n\`\`\`\n\nReturn the COMPLETE corrected HTML with the fix applied.`;
    sendToAI(fixPrompt);
  }, [isStreaming, rawPreviewHtml, sendToAI]);

  // Listen for Select & Prompt — element selected in iframe for AI modification
  useEffect(() => {
    function handleSelectPrompt(e: MessageEvent) {
      if (e.data?.type !== 'aurion_select_prompt' || !e.data.element) return;
      const el = e.data.element as { outerHtml: string; cssPath: string; tagName: string; rect: { top: number; left: number; width: number; height: number } };
      setSelectPromptData(el);
      setSelectPromptInput('');
      setTimeout(() => selectPromptRef.current?.focus(), 100);
    }
    window.addEventListener('message', handleSelectPrompt);
    return () => window.removeEventListener('message', handleSelectPrompt);
  }, []);

  // Select & Prompt — surgically modify one element via AI
  const submitSelectPrompt = useCallback(async () => {
    if (!selectPromptData || !selectPromptInput.trim() || selectPromptLoading) return;
    setSelectPromptLoading(true);
    const instruction = selectPromptInput.trim();
    const elementHtml = selectPromptData.outerHtml;
    const cssPath = selectPromptData.cssPath;

    try {
      const optimalModel = getOptimalModel(model, instruction, false);
      const endpoint = getApiEndpoint(MODELS.find(m => m.id === optimalModel)?.provider || 'ollama');
      const sysMsg = `You are a surgical HTML editor. The user selected a specific element in their page and wants you to modify ONLY that element. Return ONLY the modified element's HTML — no explanation, no markdown, no code fences, no surrounding HTML. Just the raw modified element HTML that will replace the original.`;
      const userMsg = `Modify this HTML element:\n\n\`\`\`html\n${elementHtml}\n\`\`\`\n\nInstruction: ${instruction}\n\nReturn ONLY the modified element HTML. Nothing else.`;

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: sysMsg },
            { role: 'user', content: userMsg },
          ],
          model: optimalModel,
        }),
        timeout: 60000,
      }, 2);

      if (!res.ok) throw new Error('AI request failed');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader');

      let newElementHtml = '';
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const d = JSON.parse(payload);
            if (d.text) newElementHtml += d.text;
          } catch { continue; }
        }
      }

      // Clean the response — strip code fences if AI added them
      newElementHtml = newElementHtml.trim()
        .replace(/^```(?:html)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

      if (!newElementHtml || newElementHtml.length < 5) throw new Error('Empty AI response');

      // Surgically replace the element in the full HTML
      const currentHtml = rawPreviewHtml || '';
      // Strategy: find the original element's outerHTML in the full page and replace it
      const idx = currentHtml.indexOf(elementHtml);
      if (idx !== -1) {
        const updated = currentHtml.slice(0, idx) + newElementHtml + currentHtml.slice(idx + elementHtml.length);
        if (projectFiles['index.html']) {
          setProjectFiles(prev => ({ ...prev, 'index.html': { content: updated, language: 'html' } }));
        } else {
          setClonedHtml(updated);
        }
        setTerminalLines(prev => [...prev, `$ ✓ AI modified <${selectPromptData.tagName.toLowerCase()}> — "${instruction.slice(0, 50)}"`]);
      } else {
        // Fallback: use CSS path to inject via iframe script
        setTerminalLines(prev => [...prev, `$ ✗ Element not found for replacement — try modifying via chat`]);
      }

      setSelectPromptData(null);
      setSelectPromptInput('');
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ ✗ Select & Prompt failed: ${err instanceof Error ? err.message : 'unknown'}`]);
    } finally {
      setSelectPromptLoading(false);
    }
  }, [selectPromptData, selectPromptInput, selectPromptLoading, model, rawPreviewHtml, projectFiles, setProjectFiles, setClonedHtml]);

  // ── 21st.dev: search components ──────────────────────────────────────────
  const search21stComponents = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setBrowser21stLoading(true);
    setBrowser21stResults([]);
    try {
      const res = await fetch('/api/magic21st', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, action: 'search' }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        const details = data?.details ? ` — ${String(data.details).slice(0, 180)}` : '';
        setTerminalLines(prev => [...prev, `$ ✗ 21st.dev search failed: ${data?.error || `HTTP ${res.status}`}${details}`]);
        return;
      }
      // Normalise various response shapes from 21st.dev
      const results: Component21st[] = Array.isArray(data) ? data
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.results) ? data.results
        : [];
      setBrowser21stResults(results);
      if (results.length === 0) {
        setTerminalLines(prev => [...prev, `$ ℹ 21st.dev: no components found for "${q}"`]);
      }
    } catch (e) {
      setTerminalLines(prev => [...prev, `$ ✗ 21st.dev search error: ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setBrowser21stLoading(false);
    }
  }, []);

  // ── 21st.dev: inject component into current page via AI ───────────────────
  const inject21stComponent = useCallback(async (component: Component21st) => {
    if (previewHtml === null) {
      setTerminalLines(prev => [...prev, '$ ✗ Create a page first before injecting a component.']);
      return;
    }
    setInjecting21stComponent(component.name);
    setShow21stBrowser(false);

    const codeSnippet = component.code
      ? `\`\`\`tsx\n${component.code.slice(0, 3000)}\n\`\`\``
      : '(source not available — use the name and description as inspiration)';

    const prompt = `I want to add a "${component.name}" component from 21st.dev to my current page.

Component description: ${component.description || ''}
${component.tags?.length ? `Tags: ${component.tags.join(', ')}` : ''}

Reference implementation (React/Tailwind):
${codeSnippet}

Task: Convert this component to pure HTML with Tailwind CDN classes (no JSX, no imports, no React). Then integrate it naturally into my existing page at the most appropriate location (e.g. after the hero, before the footer, or as a new section). Return the complete updated HTML page.`;

    sendToAI(prompt);
    setInjecting21stComponent(null);
  }, [previewHtml, sendToAI]);

  // Commit pending edits when exiting edit mode
  useEffect(() => {
    if (!isEditMode && pendingEditHtmlRef.current) {
      const html = pendingEditHtmlRef.current;
      pendingEditHtmlRef.current = null;
      if (projectFiles['index.html']) {
        setProjectFiles(prev => ({ ...prev, 'index.html': { content: html, language: 'html' } }));
      } else {
        setClonedHtml(html);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

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

  // Smart context-aware suggestions based on project state
  const smartSuggestions = useMemo(() => {
    const fileNames = Object.keys(projectFiles);
    const allContent = Object.values(projectFiles).map(f => f.content).join('\n').toLowerCase();
    const hasFiles = fileNames.length > 0;
    const hasHtml = fileNames.some(f => f.endsWith('.html'));
    const hasCss = fileNames.some(f => f.endsWith('.css')) || allContent.includes('<style');
    const hasJs = fileNames.some(f => f.endsWith('.js') || f.endsWith('.ts'));
    const hasResponsive = allContent.includes('@media') || allContent.includes('responsive');
    const hasDarkMode = allContent.includes('dark-mode') || allContent.includes('prefers-color-scheme') || allContent.includes('dark:');
    const hasAnimation = allContent.includes('animation') || allContent.includes('gsap') || allContent.includes('lenis');
    const hasNav = allContent.includes('<nav') || allContent.includes('navbar');
    const hasFooter = allContent.includes('<footer');
    const hasForm = allContent.includes('<form') || allContent.includes('<input');
    const hasAuth = allContent.includes('login') || allContent.includes('signup') || allContent.includes('auth');

    if (!hasFiles) {
      return [
        { title: 'SaaS Landing Page', desc: 'Modern landing page with hero, pricing & testimonials' },
        { title: 'Dashboard App', desc: 'Analytics dashboard with data charts' },
        { title: 'Portfolio Site', desc: 'Personal portfolio with projects showcase' },
      ];
    }

    const suggestions: { title: string; desc: string }[] = [];
    if (hasHtml && !hasResponsive) suggestions.push({ title: 'Make Responsive', desc: 'Add mobile/tablet breakpoints' });
    if (hasHtml && !hasDarkMode) suggestions.push({ title: 'Add Dark Mode', desc: 'Toggle + prefers-color-scheme' });
    if (hasHtml && !hasAnimation) suggestions.push({ title: 'Add Animations', desc: 'GSAP scroll + hover animations' });
    if (hasHtml && !hasNav) suggestions.push({ title: 'Add Navigation', desc: 'Sticky navbar with smooth scroll' });
    if (hasHtml && !hasFooter) suggestions.push({ title: 'Add Footer', desc: 'Footer with links & social icons' });
    if (hasHtml && !hasForm) suggestions.push({ title: 'Add Contact Form', desc: 'Form with validation & submit' });
    if (!hasCss) suggestions.push({ title: 'Add Custom CSS', desc: 'Styling & design polish' });
    if (!hasJs) suggestions.push({ title: 'Add Interactivity', desc: 'JS logic for dynamic behavior' });
    if (hasForm && !hasAuth) suggestions.push({ title: 'Add Auth Pages', desc: 'Login & signup flow' });
    if (hasHtml && hasCss && hasJs) suggestions.push({ title: 'Performance Audit', desc: 'Optimize speed & bundle size' });

    return suggestions.slice(0, 3);
  }, [projectFiles]);

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

  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [gitCommits, setGitCommits] = useState<{ hash: string; msg: string; date: string }[]>([]);
  const [gitStaged, setGitStaged] = useState(false);

  const runTerminalCommand = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    setTerminalHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);
    setTerminalInput('');
    setTerminalLines(prev => [...prev, '$ ' + cmd]);

    const c = cmd.trim().toLowerCase();
    const raw = cmd.trim();
    if (c === 'clear') { setTerminalLines([]); return; }
    if (c === 'help') { setTerminalLines(prev => [...prev, 'Commands: clear, help, ls [dir], cat <file>, touch <file>, rm <file>, mkdir <dir>, tree, pwd, whoami, date, echo <msg>', '  npm install <pkg>, npm run dev|build, node -e "...", git status|add|commit|log, env, grep <pattern> <file>, cp <src> <dest>, mv <src> <dest>, head/tail <file>, wc <file>, find <pattern>']); return; }
    if (c === 'ls' || c === 'ls .') {
      setProjectFiles(prev => {
        const names = Object.keys(prev);
        if (names.length === 0) {
          setTerminalLines(p => [...p, '(empty project)']);
        } else {
          const topLevel = new Set<string>();
          for (const n of names) {
            const first = n.split('/')[0];
            topLevel.add(n.includes('/') ? first + '/' : first);
          }
          setTerminalLines(p => [...p, Array.from(topLevel).sort().join('  ')]);
        }
        return prev;
      });
      return;
    }
    if (c.startsWith('ls ')) {
      const dir = raw.slice(3).trim().split('\\').join('/').replace(/\/$/, '');
      setProjectFiles(prev => {
        const entries = new Set<string>();
        for (const p of Object.keys(prev)) {
          if (p.startsWith(dir + '/')) {
            const rest = p.slice(dir.length + 1);
            const first = rest.split('/')[0];
            entries.add(rest.includes('/') ? first + '/' : first);
          }
        }
        if (entries.size === 0) setTerminalLines(p => [...p, `ls: cannot access '${dir}': No such file or directory`]);
        else setTerminalLines(p => [...p, Array.from(entries).sort().join('  ')]);
        return prev;
      });
      return;
    }
    if (c === 'tree') {
      setProjectFiles(prev => {
        const names = Object.keys(prev).sort();
        if (names.length === 0) setTerminalLines(p => [...p, '(empty project)']);
        else {
          setTerminalLines(p => [...p, '.', ...names.map(n => '├── ' + n), `\n${names.length} file(s)`]);
        }
        return prev;
      });
      return;
    }
    if (c.startsWith('cat ')) {
      const file = raw.slice(4).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const lines = f.content.split('\n').slice(0, 50);
          setTerminalLines(p => [...p, ...lines, f.content.split('\n').length > 50 ? `... (${f.content.split('\n').length} lines total)` : '']);
        } else {
          setTerminalLines(p => [...p, `cat: ${file}: No such file`]);
        }
        return prev;
      });
      return;
    }
    if (c.startsWith('head ')) {
      const file = raw.slice(5).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const lines = f.content.split('\n').slice(0, 10);
          setTerminalLines(p => [...p, ...lines]);
        } else setTerminalLines(p => [...p, `head: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('tail ')) {
      const file = raw.slice(5).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const lines = f.content.split('\n').slice(-10);
          setTerminalLines(p => [...p, ...lines]);
        } else setTerminalLines(p => [...p, `tail: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('wc ')) {
      const file = raw.slice(3).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const lines = f.content.split('\n').length;
          const words = f.content.split(/\s+/).filter(Boolean).length;
          const chars = f.content.length;
          setTerminalLines(p => [...p, `  ${lines}  ${words}  ${chars} ${file}`]);
        } else setTerminalLines(p => [...p, `wc: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('grep ')) {
      const parts = raw.slice(5).trim().split(/\s+/);
      if (parts.length < 2) { setTerminalLines(p => [...p, 'Usage: grep <pattern> <file>']); return; }
      const pattern = parts[0];
      const file = parts.slice(1).join(' ');
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const matches = f.content.split('\n')
            .map((line, i) => ({ line, num: i + 1 }))
            .filter(({ line }) => line.toLowerCase().includes(pattern.toLowerCase()));
          if (matches.length === 0) setTerminalLines(p => [...p, '(no matches)']);
          else setTerminalLines(p => [...p, ...matches.slice(0, 20).map(m => `${m.num}: ${m.line}`)]);
        } else setTerminalLines(p => [...p, `grep: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('find ')) {
      const pattern = raw.slice(5).trim().toLowerCase();
      setProjectFiles(prev => {
        const matches = Object.keys(prev).filter(f => f.toLowerCase().includes(pattern));
        if (matches.length === 0) setTerminalLines(p => [...p, '(no matches)']);
        else setTerminalLines(p => [...p, ...matches]);
        return prev;
      });
      return;
    }
    if (c.startsWith('touch ')) {
      const file = raw.slice(6).trim();
      if (file) {
        setProjectFiles(prev => prev[file] ? prev : { ...prev, [file]: { content: '', language: detectLanguage(file) } });
        setTerminalLines(prev => [...prev, `created ${file}`]);
      }
      return;
    }
    if (c.startsWith('rm ')) {
      const file = raw.slice(3).trim();
      setProjectFiles(prev => {
        if (!prev[file]) { setTerminalLines(p => [...p, `rm: ${file}: No such file`]); return prev; }
        const next = { ...prev };
        delete next[file];
        setTerminalLines(p => [...p, `removed ${file}`]);
        return next;
      });
      return;
    }
    if (c.startsWith('cp ')) {
      const parts = raw.slice(3).trim().split(/\s+/);
      if (parts.length < 2) { setTerminalLines(p => [...p, 'Usage: cp <src> <dest>']); return; }
      const [src, dest] = parts;
      setProjectFiles(prev => {
        if (!prev[src]) { setTerminalLines(p => [...p, `cp: ${src}: No such file`]); return prev; }
        return { ...prev, [dest]: { content: prev[src].content, language: detectLanguage(dest) } };
      });
      setTerminalLines(prev => [...prev, `copied ${parts[0]} → ${parts[1]}`]);
      return;
    }
    if (c.startsWith('mv ')) {
      const parts = raw.slice(3).trim().split(/\s+/);
      if (parts.length < 2) { setTerminalLines(p => [...p, 'Usage: mv <src> <dest>']); return; }
      const [src, dest] = parts;
      setProjectFiles(prev => {
        if (!prev[src]) { setTerminalLines(p => [...p, `mv: ${src}: No such file`]); return prev; }
        const next = { ...prev, [dest]: { content: prev[src].content, language: detectLanguage(dest) } };
        delete next[src];
        return next;
      });
      setTerminalLines(prev => [...prev, `moved ${parts[0]} → ${parts[1]}`]);
      return;
    }
    if (c.startsWith('mkdir ')) {
      setTerminalLines(prev => [...prev, 'directory noted (create files inside it)']);
      return;
    }
    if (c === 'pwd') { setTerminalLines(prev => [...prev, '/project']); return; }
    if (c === 'whoami') { setTerminalLines(prev => [...prev, 'aurion']); return; }
    if (c === 'date') { setTerminalLines(prev => [...prev, new Date().toString()]); return; }
    if (c.startsWith('echo ')) { setTerminalLines(prev => [...prev, cmd.slice(5)]); return; }

    // npm commands
    if (c.startsWith('npm install ') || c.startsWith('npm i ')) {
      const pkg = raw.replace(/^npm\s+(install|i)\s+/, '').trim();
      if (!pkg) { setTerminalLines(p => [...p, 'Usage: npm install <package>']); return; }
      const pkgs = pkg.split(/\s+/);
      setInstalledPackages(prev => [...new Set([...prev, ...pkgs])]);
      setTerminalLines(prev => [...prev, '', `added ${pkgs.length} package(s):`, ...pkgs.map(p => `  + ${p}@latest`), '', `${pkgs.length} package(s) installed`]);
      return;
    }
    if (c === 'npm run dev' || c === 'npm start') {
      setTerminalLines(prev => [...prev, '', '> aurion-project@1.0.0 dev', '> next dev', '', '  ▲ Next.js 16.1.6', '  - Local:    http://localhost:3000', '  - Network:  http://192.168.1.42:3000', '', '  ✓ Ready in 1.2s']);
      return;
    }
    if (c === 'npm run build') {
      setProjectFiles(prev => {
        const fileCount = Object.keys(prev).length;
        setTerminalLines(p => [...p, '', '> aurion-project@1.0.0 build', '> next build', '', `  ✓ Compiled ${fileCount} file(s) successfully`, '  ✓ Collecting page data', '  ✓ Generating static pages', `  ✓ Build completed in 3.2s`, '', 'Route (app)                              Size', '┌ ○ /                                    5.2 kB', '└ ○ /api/*                               1.1 kB', '', `✓ ${fileCount} file(s) built`]);
        return prev;
      });
      return;
    }
    if (c === 'npm ls' || c === 'npm list') {
      setTerminalLines(prev => [...prev, 'aurion-project@1.0.0 /project', ...(installedPackages.length > 0 ? installedPackages.map(p => `├── ${p}@latest`) : ['(no packages installed)'])]);
      return;
    }

    // git commands
    if (c === 'git status') {
      setProjectFiles(prev => {
        const files = Object.keys(prev);
        if (files.length === 0) {
          setTerminalLines(p => [...p, 'On branch main', '', 'No commits yet', '', 'nothing to commit']);
        } else {
          setTerminalLines(p => [...p, 'On branch main', '', gitStaged ? 'Changes to be committed:' : 'Changes not staged for commit:', ...files.map(f => `  ${gitStaged ? 'new file' : 'modified'}:   ${f}`), '', `${files.length} file(s) ${gitStaged ? 'staged' : 'unstaged'}`]);
        }
        return prev;
      });
      return;
    }
    if (c === 'git add .' || c === 'git add -A') {
      setGitStaged(true);
      setProjectFiles(prev => {
        setTerminalLines(p => [...p, `staged ${Object.keys(prev).length} file(s)`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('git commit')) {
      const msgMatch = raw.match(/-m\s+["'](.+?)["']/);
      const msg = msgMatch ? msgMatch[1] : 'update';
      if (!gitStaged) { setTerminalLines(p => [...p, 'nothing to commit (run git add . first)']); return; }
      const hash = Math.random().toString(36).slice(2, 9);
      setGitCommits(prev => [{ hash, msg, date: new Date().toISOString().slice(0, 19).replace('T', ' ') }, ...prev]);
      setGitStaged(false);
      setProjectFiles(prev => {
        setTerminalLines(p => [...p, `[main ${hash}] ${msg}`, ` ${Object.keys(prev).length} file(s) changed`]);
        return prev;
      });
      return;
    }
    if (c === 'git log') {
      if (gitCommits.length === 0) { setTerminalLines(p => [...p, '(no commits yet)']); return; }
      setTerminalLines(prev => [...prev, ...gitCommits.flatMap(c => [`commit ${c.hash}`, `Date: ${c.date}`, `  ${c.msg}`, ''])]);
      return;
    }
    if (c === 'git init') { setTerminalLines(prev => [...prev, 'Initialized empty Git repository in /project/.git/']); return; }

    // env command
    if (c === 'env') {
      const keys = Object.entries(integrationKeys);
      if (keys.length === 0) { setTerminalLines(p => [...p, '(no environment variables set — connect integrations to add API keys)']); return; }
      setTerminalLines(prev => [...prev, ...keys.map(([name, key]) => `${name.toUpperCase().replace(/\s+/g, '_')}_KEY=${key.slice(0, 4)}${'*'.repeat(Math.max(0, key.length - 4))}`)]);
      return;
    }

    // node -e: execute JS via server
    if (c.startsWith('node -e ') || c.startsWith("node -e '") || c.startsWith('node -e "')) {
      const code = raw.replace(/^node\s+-e\s+["']?/, '').replace(/["']$/, '');
      setTerminalLines(p => [...p, 'executing...']);
      fetch('/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
        .then(r => r.json())
        .then(data => {
          if (data.logs?.length) setTerminalLines(p => [...p, ...data.logs]);
          if (data.error) setTerminalLines(p => [...p, `Error: ${data.error}`]);
          if (data.result !== undefined) setTerminalLines(p => [...p, String(data.result)]);
        })
        .catch(err => setTerminalLines(p => [...p, `Error: ${err instanceof Error ? err.message : 'exec failed'}`]));
      return;
    }
    // node <file>: execute a VFS file via server
    if (c.startsWith('node ') && !c.startsWith('node -')) {
      const file = raw.slice(5).trim();
      const currentFiles = projectFiles;
      const f = currentFiles[file];
      if (!f) { setTerminalLines(p => [...p, `node: ${file}: No such file`]); return; }
      setTerminalLines(p => [...p, `running ${file}...`]);
      fetch('/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: f.content }) })
        .then(r => r.json())
        .then(data => {
          if (data.logs?.length) setTerminalLines(p => [...p, ...data.logs]);
          if (data.error) setTerminalLines(p => [...p, `Error: ${data.error}`]);
        })
        .catch(err => setTerminalLines(p => [...p, `Error: ${err instanceof Error ? err.message : 'exec failed'}`]));
      return;
    }
    // npm info: fetch real package metadata from npm registry
    if (c.startsWith('npm info ') || c.startsWith('npm view ')) {
      const pkg = raw.replace(/^npm\s+(info|view)\s+/, '').trim();
      if (!pkg) { setTerminalLines(p => [...p, 'Usage: npm info <package>']); return; }
      setTerminalLines(p => [...p, `fetching ${pkg}...`]);
      fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`)
        .then(r => { if (!r.ok) throw new Error('Package not found'); return r.json(); })
        .then((data: Record<string, unknown>) => {
          setTerminalLines(p => [...p,
            `${data.name}@${data.version}`,
            `description: ${data.description || '(none)'}`,
            `license: ${data.license || 'N/A'}`,
            `homepage: ${(data.homepage as string) || 'N/A'}`,
          ]);
        })
        .catch(err => setTerminalLines(p => [...p, `npm ERR! ${err instanceof Error ? err.message : 'fetch failed'}`]));
      return;
    }

    // which command
    if (c.startsWith('which ')) {
      const bin = raw.slice(6).trim();
      const available = ['node', 'npm', 'git', 'ls', 'cat', 'tree', 'echo', 'pwd', 'date', 'touch', 'rm', 'cp', 'mv', 'mkdir', 'grep', 'find', 'head', 'tail', 'wc', 'clear', 'env', 'whoami'];
      if (available.includes(bin)) setTerminalLines(prev => [...prev, `/usr/bin/${bin}`]);
      else setTerminalLines(prev => [...prev, `${bin} not found`]);
      return;
    }

    // uptime / hostname
    if (c === 'uptime') { setTerminalLines(prev => [...prev, `up ${Math.floor(Math.random() * 30 + 1)} days, load average: 0.${Math.floor(Math.random() * 99)}`]); return; }
    if (c === 'hostname') { setTerminalLines(prev => [...prev, 'aurion-cloud']); return; }

    setTerminalLines(prev => [...prev, `${cmd.split(' ')[0]}: command not found. Type 'help' for available commands.`]);
  }, [installedPackages, gitStaged, gitCommits, integrationKeys, projectFiles]);

  const saveIntegrationKey = useCallback((name: string, key: string) => {
    setIntegrationKeys(prev => ({ ...prev, [name]: key }));
    setEditingIntegration(null);
    setTerminalLines(prev => [...prev, '$ Connected: ' + name]);
  }, []);

  // Test integration — calls the real API route for a connected integration
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const INTEGRATION_ROUTE_MAP: Record<string, string> = {
    'OpenAI': '/api/openai', 'Resend': '/api/resend', 'SendGrid': '/api/sendgrid',
    'Twilio': '/api/twilio', 'Upstash': '/api/upstash', 'Neon': '/api/neon',
    'Slack': '/api/slack', 'Discord': '/api/discord', 'Lemon Squeezy': '/api/lemonsqueezy',
    'Contentful': '/api/contentful', 'Algolia': '/api/algolia', 'Klaviyo': '/api/klaviyo',
    'Sanity': '/api/sanity', 'Stripe': '/api/stripe', 'Supabase': '/api/supabase',
  };

  const testIntegration = useCallback(async (name: string) => {
    const key = integrationKeys[name];
    if (!key) return;
    setTestingIntegration(name);
    setTestResult(prev => { const n = { ...prev }; delete n[name]; return n; });
    const route = INTEGRATION_ROUTE_MAP[name];
    if (!route) { setTestingIntegration(null); return; }

    try {
      let body: Record<string, unknown> = {};
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // Build test payloads per integration
      if (name === 'OpenAI') {
        body = { messages: [{ role: 'user', content: 'Say OK' }], model: 'gpt-4o-mini', apiKey: key, stream: false };
      } else if (name === 'Resend') {
        body = { apiKey: key, to: 'test@test.com', subject: 'Test', html: '<p>Test</p>', from: 'onboarding@resend.dev', _test: true };
      } else if (name === 'SendGrid') {
        body = { apiKey: key, to: 'test@test.com', subject: 'Test', html: '<p>Test</p>', from: 'test@test.com', _test: true };
      } else if (name === 'Twilio') {
        body = { accountSid: key.split(':')[0] || key, authToken: key.split(':')[1] || '', action: 'account' };
      } else if (name === 'Upstash') {
        const parts = key.split('|');
        body = { url: parts[0] || key, token: parts[1] || '', command: 'PING' };
      } else if (name === 'Neon') {
        body = { connectionString: key, query: 'SELECT 1 as test' };
      } else if (name === 'Slack') {
        body = { token: key, action: 'auth.test' };
      } else if (name === 'Discord') {
        body = { token: key, action: 'guilds' };
      } else if (name === 'Lemon Squeezy') {
        body = { apiKey: key, endpoint: 'products' };
      } else if (name === 'Contentful') {
        const parts = key.split('|');
        body = { spaceId: parts[0] || '', accessToken: parts[1] || key, endpoint: '/content_types', limit: 1 };
      } else if (name === 'Algolia') {
        const parts = key.split('|');
        body = { appId: parts[0] || '', apiKey: parts[1] || key, action: 'listIndices' };
      } else if (name === 'Klaviyo') {
        body = { apiKey: key, endpoint: 'lists' };
      } else if (name === 'Sanity') {
        const parts = key.split('|');
        body = { projectId: parts[0] || '', dataset: parts[1] || 'production', token: parts[2] || key, query: '*[_type == "sanity.imageAsset"][0...1]' };
      } else if (name === 'Stripe') {
        body = { stripeKey: key, endpoint: 'balance' };
      } else if (name === 'Supabase') {
        body = { supabaseUrl: supabaseUrl || '', supabaseKey: key, table: '_health_check', method: 'GET' };
      }

      const res = await fetch(route, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.ok) {
        setTestResult(prev => ({ ...prev, [name]: { ok: true, msg: 'Connection successful' } }));
        setTerminalLines(prev => [...prev, `$ ✓ ${name}: connection OK`]);
      } else {
        const data = await res.json().catch(() => ({ error: 'Failed' }));
        setTestResult(prev => ({ ...prev, [name]: { ok: false, msg: data.error || `HTTP ${res.status}` } }));
        setTerminalLines(prev => [...prev, `$ ✗ ${name}: ${data.error || res.status}`]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setTestResult(prev => ({ ...prev, [name]: { ok: false, msg } }));
      setTerminalLines(prev => [...prev, `$ ✗ ${name}: ${msg}`]);
    } finally {
      setTestingIntegration(null);
    }
  }, [integrationKeys, supabaseUrl]);

  // Send real email via connected route
  const sendRealEmail = useCallback(async (to: string, subject: string, body: string) => {
    const resendKey = integrationKeys['Resend'];
    const sendgridKey = integrationKeys['SendGrid'];
    if (!resendKey && !sendgridKey) return false;

    try {
      const route = resendKey ? '/api/resend' : '/api/sendgrid';
      const payload = resendKey
        ? { apiKey: resendKey, to, subject, html: body, from: 'onboarding@resend.dev' }
        : { apiKey: sendgridKey, to, subject, html: body, from: 'noreply@example.com' };
      const res = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return res.ok;
    } catch { return false; }
  }, [integrationKeys]);

  // Send real message via connected route
  const sendRealMessage = useCallback(async (platform: string, channel: string, text: string) => {
    const key = integrationKeys[platform];
    if (!key) return false;

    try {
      let route = '', payload: Record<string, unknown> = {};
      if (platform === 'Slack') {
        route = '/api/slack';
        payload = { token: key, action: 'send', channel, text };
      } else if (platform === 'Discord') {
        route = '/api/discord';
        payload = { token: key, action: 'send', channelId: channel, content: text };
      } else if (platform === 'Twilio') {
        route = '/api/twilio';
        const parts = key.split(':');
        payload = { accountSid: parts[0], authToken: parts[1] || '', from: parts[2] || '', to: channel, body: text };
      }
      if (!route) return false;
      const res = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return res.ok;
    } catch { return false; }
  }, [integrationKeys]);

  // ── Real GitHub Push ──
  const pushToGitHub = useCallback(async () => {
    if (!githubToken.trim() || !repoName.trim()) return;
    if (Object.keys(projectFiles).length === 0) {
      setTerminalLines(prev => [...prev, '$ Error: No files in project to push']);
      return;
    }
    setIsGitHubPushing(true);
    setShowGitHubModal(false);
    setShowTerminal(true);
    setTerminalLines(prev => [...prev, `$ Pushing ${Object.keys(projectFiles).length} files to github.com/${repoName}...`]);
    try {
      const filesMap: Record<string, string> = {};
      for (const [path, file] of Object.entries(projectFiles)) {
        filesMap[path] = file.content;
      }
      const resp = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken, repoName, files: filesMap }),
      });
      const data = await resp.json();
      if (data.error) {
        setTerminalLines(prev => [...prev, `$ Error: ${data.error}`]);
      } else {
        setTerminalLines(prev => [...prev,
          `$ ✓ ${data.isNew ? 'Created' : 'Updated'} repository: ${data.repoUrl}`,
          `$ ✓ Pushed ${data.filesCount} files (commit: ${data.commitSha?.slice(0, 7)})`,
        ]);
      }
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ Error: ${err instanceof Error ? err.message : 'Push failed'}`]);
    } finally {
      setIsGitHubPushing(false);
    }
  }, [githubToken, repoName, projectFiles]);

  // ── Download ZIP ──
  const downloadProjectZip = useCallback(() => {
    const files = projectFiles;
    const fileEntries = Object.entries(files);
    if (fileEntries.length === 0) return;

    // Build a simple ZIP file in memory (no external library)
    // Using the minimal ZIP format spec
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;

    for (const [name, file] of fileEntries) {
      const nameBytes = encoder.encode(name);
      const contentBytes = encoder.encode(file.content);

      // Local file header
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lView = new DataView(localHeader.buffer);
      lView.setUint32(0, 0x04034b50, true); // signature
      lView.setUint16(4, 20, true); // version needed
      lView.setUint16(6, 0, true); // flags
      lView.setUint16(8, 0, true); // compression: stored
      lView.setUint16(10, 0, true); // mod time
      lView.setUint16(12, 0, true); // mod date
      lView.setUint32(14, 0, true); // crc32 (0 for simplicity — most unzippers handle it)
      lView.setUint32(18, contentBytes.length, true); // compressed size
      lView.setUint32(22, contentBytes.length, true); // uncompressed size
      lView.setUint16(26, nameBytes.length, true); // file name length
      lView.setUint16(28, 0, true); // extra field length
      localHeader.set(nameBytes, 30);

      // Central directory entry
      const cdEntry = new Uint8Array(46 + nameBytes.length);
      const cView = new DataView(cdEntry.buffer);
      cView.setUint32(0, 0x02014b50, true);
      cView.setUint16(4, 20, true); // version made by
      cView.setUint16(6, 20, true); // version needed
      cView.setUint16(8, 0, true); // flags
      cView.setUint16(10, 0, true); // compression
      cView.setUint16(12, 0, true); // mod time
      cView.setUint16(14, 0, true); // mod date
      cView.setUint32(16, 0, true); // crc32
      cView.setUint32(20, contentBytes.length, true);
      cView.setUint32(24, contentBytes.length, true);
      cView.setUint16(28, nameBytes.length, true);
      cView.setUint16(30, 0, true); // extra field length
      cView.setUint16(32, 0, true); // file comment length
      cView.setUint16(34, 0, true); // disk number start
      cView.setUint16(36, 0, true); // internal file attributes
      cView.setUint32(38, 0, true); // external file attributes
      cView.setUint32(42, offset, true); // relative offset of local header
      cdEntry.set(nameBytes, 46);

      parts.push(localHeader, contentBytes);
      centralDir.push(cdEntry);
      offset += localHeader.length + contentBytes.length;
    }

    // End of central directory
    let cdSize = 0;
    for (const c of centralDir) cdSize += c.length;
    const eocd = new Uint8Array(22);
    const eView = new DataView(eocd.buffer);
    eView.setUint32(0, 0x06054b50, true);
    eView.setUint16(4, 0, true);
    eView.setUint16(6, 0, true);
    eView.setUint16(8, fileEntries.length, true);
    eView.setUint16(10, fileEntries.length, true);
    eView.setUint32(12, cdSize, true);
    eView.setUint32(16, offset, true);
    eView.setUint16(20, 0, true);

    const blob = new Blob([...parts, ...centralDir, eocd].map(b => b.buffer as ArrayBuffer), { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurion-project.zip';
    a.click();
    URL.revokeObjectURL(url);
    setTerminalLines(prev => [...prev, `$ ✓ Downloaded ${fileEntries.length} files as aurion-project.zip`]);
  }, [projectFiles]);

  // ── Real Supabase Query ──
  const runSupabaseQuery = useCallback(async () => {
    const key = integrationKeys['Supabase'];
    if (!key || !supabaseUrl || !supabaseTable) return;
    setIsSupabaseLoading(true);
    setSupabaseError(null);
    setSupabaseResult(null);
    try {
      localStorage.setItem('aurion_supabase_url', supabaseUrl);
      const resp = await fetch('/api/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl, supabaseKey: key, table: supabaseTable, method: 'GET', select: '*' }),
      });
      const data = await resp.json();
      if (data.error) {
        setSupabaseError(data.error + (data.hint ? ` (${data.hint})` : ''));
      } else {
        setSupabaseResult(data.data as Record<string, unknown>[]);
      }
    } catch (err) {
      setSupabaseError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setIsSupabaseLoading(false);
    }
  }, [integrationKeys, supabaseUrl, supabaseTable]);

  // ── Real Stripe Fetch ──
  const fetchStripeData = useCallback(async () => {
    const key = integrationKeys['Stripe'];
    if (!key) return;
    setIsStripeLoading(true);
    setStripeError(null);
    try {
      const [balResp, prodResp] = await Promise.all([
        fetch('/api/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripeKey: key, endpoint: 'balance', method: 'GET' }),
        }),
        fetch('/api/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripeKey: key, endpoint: 'products', method: 'GET' }),
        }),
      ]);
      const balData = await balResp.json();
      const prodData = await prodResp.json();
      if (balData.error) {
        setStripeError(balData.error + (balData.details?.message ? `: ${balData.details.message}` : ''));
      } else {
        const available = balData.data?.available?.[0]?.amount || 0;
        const pending = balData.data?.pending?.[0]?.amount || 0;
        setStripeBalance({ available, pending });
      }
      if (prodData.data?.data) {
        setStripeProducts(prodData.data.data.slice(0, 10));
      }
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : 'Stripe error');
    } finally {
      setIsStripeLoading(false);
    }
  }, [integrationKeys]);

  // Command palette commands
  const commands = useMemo(() => {
    const list = [
      // File operations
      { id: 'new-file', label: 'New File', shortcut: '', category: 'File', action: () => { const name = prompt('File name:'); if (name) { setProjectFiles(prev => ({ ...prev, [name]: { content: '', language: detectLanguage(name) } })); setSelectedFile(name); setActiveTab('code'); } } },
      { id: 'rename-file', label: 'Rename Current File', shortcut: '', category: 'File', action: () => { if (!selectedFile) return; const name = prompt('New name:', selectedFile); if (name && name !== selectedFile) { setProjectFiles(prev => { const next = { ...prev }; next[name] = { ...next[selectedFile], language: detectLanguage(name) }; delete next[selectedFile]; return next; }); setSelectedFile(name); } } },
      { id: 'delete-file', label: 'Delete Current File', shortcut: '', category: 'File', action: () => { if (!selectedFile) return; const files = Object.keys(projectFiles); if (files.length <= 1) return; setProjectFiles(prev => { const next = { ...prev }; delete next[selectedFile]; return next; }); setSelectedFile(files.find(f => f !== selectedFile) || 'index.html'); } },
      { id: 'duplicate-file', label: 'Duplicate Current File', shortcut: '', category: 'File', action: () => { if (!selectedFile || !projectFiles[selectedFile]) return; const ext = selectedFile.lastIndexOf('.'); const newName = ext > 0 ? selectedFile.slice(0, ext) + '-copy' + selectedFile.slice(ext) : selectedFile + '-copy'; setProjectFiles(prev => ({ ...prev, [newName]: { ...prev[selectedFile] } })); setSelectedFile(newName); } },
      { id: 'file-search', label: 'Go to File', shortcut: '⌘P', category: 'File', action: () => { setShowFileSearch(true); setFileSearchQuery(''); } },
      { id: 'content-search', label: 'Search in Files', shortcut: '⌘⇧F', category: 'File', action: () => { setShowContentSearch(true); setContentSearchQuery(''); } },
      // Project
      { id: 'new-project', label: 'New Project', shortcut: '', category: 'Project', action: () => createProject('Project ' + (projects.length + 1)) },
      { id: 'templates', label: 'Start from Template', shortcut: '', category: 'Project', action: () => setShowTemplates(true) },
      { id: 'download', label: 'Download as ZIP', shortcut: '', category: 'Project', action: () => downloadProjectZip() },
      // View
      { id: 'toggle-terminal', label: showTerminal ? 'Hide Terminal' : 'Show Terminal', shortcut: '⌘`', category: 'View', action: () => setShowTerminal(prev => !prev) },
      { id: 'toggle-chat', label: showChat ? 'Hide Chat' : 'Show Chat', shortcut: '⌘B', category: 'View', action: () => setShowChat(prev => !prev) },
      { id: 'toggle-edit', label: isEditMode ? 'Exit Visual Editor' : 'Visual Editor Mode', shortcut: '', category: 'View', action: () => setIsEditMode(prev => !prev) },
      { id: 'diff-view', label: showDiffView ? 'Exit Diff View' : 'Show Diff View', shortcut: '', category: 'View', action: () => setShowDiffView(prev => !prev) },
      { id: 'env-panel', label: 'Manage Environment Variables', shortcut: '', category: 'View', action: () => setShowEnvPanel(true) },
      { id: 'integrations', label: 'Toggle Integrations', shortcut: '', category: 'View', action: () => setShowIntegrations(prev => !prev) },
      { id: 'tab-app', label: 'Switch to App Tab', shortcut: '', category: 'View', action: () => setActiveTab('app') },
      { id: 'tab-code', label: 'Switch to Code Tab', shortcut: '', category: 'View', action: () => setActiveTab('code') },
      { id: 'tab-db', label: 'Switch to Database Tab', shortcut: '', category: 'View', action: () => setActiveTab('database') },
      { id: 'tab-pay', label: 'Switch to Payments Tab', shortcut: '', category: 'View', action: () => setActiveTab('payments') },
      { id: 'device-desktop', label: 'Desktop Preview', shortcut: '', category: 'View', action: () => setDeviceMode('desktop') },
      { id: 'device-tablet', label: 'Tablet Preview', shortcut: '', category: 'View', action: () => setDeviceMode('tablet') },
      { id: 'device-mobile', label: 'Mobile Preview', shortcut: '', category: 'View', action: () => setDeviceMode('mobile') },
      // Deploy
      { id: 'deploy', label: 'Deploy to Vercel', shortcut: '', category: 'Deploy', action: () => deployToVercel() },
      { id: 'github', label: 'Push to GitHub', shortcut: '', category: 'Deploy', action: () => setShowGitHubModal(true) },
      { id: 'clone', label: 'Clone Website', shortcut: '', category: 'Deploy', action: () => setShowCloneModal(true) },
      // Edit
      { id: 'undo', label: 'Undo (VFS)', shortcut: '⌘Z', category: 'Edit', action: () => vfsUndo() },
      { id: 'redo', label: 'Redo (VFS)', shortcut: '⌘⇧Z', category: 'Edit', action: () => vfsRedo() },
      { id: 'clear-chat', label: 'Clear Chat', shortcut: '', category: 'Edit', action: () => clearChat() },
      { id: 'media-gallery', label: 'Media Gallery', shortcut: '', category: 'View', action: () => setShowMediaGallery(true) },
      // Models
      ...MODELS.map(m => ({ id: `model-${m.id}`, label: `Switch to ${m.name}`, shortcut: '', category: 'Model', action: () => setModel(m.id) })),
    ];
    if (!commandQuery) return list;
    const q = commandQuery.toLowerCase();
    return list.filter(c => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandQuery, showTerminal, showChat, showDiffView, isEditMode, projects.length, selectedFile]);

  // ── LTX Video Generation ──
  const generateLTXVideo = useCallback(async (videoId: string, prompt: string) => {
    setTerminalLines(prev => [...prev, `$ 🎬 Generating LTX video "${videoId}"...`]);
    try {
      const res = await fetchWithRetry('/api/ltx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'ltx-2-3-fast',
          duration: 6,
          resolution: '1920x1080',
          fps: 24,
          generate_audio: false,
        }),
        timeout: 300000, // 5 min for video
      }, 1);

      // Check if response is binary video (new streaming format) or legacy JSON
      const contentType = res.headers.get('content-type') || '';
      let videoUrl: string;
      if (contentType.includes('video/')) {
        // Binary stream: convert to Blob URL (memory-efficient, no base64 bloat)
        const blob = await res.blob();
        videoUrl = URL.createObjectURL(blob);
      } else {
        // Legacy JSON format fallback
        const data = await res.json();
        if (!data.success || !data.video_url) {
          setTerminalLines(prev => [...prev, `$ ✗ Video "${videoId}" failed: ${data.error || 'Unknown error'}`]);
          return;
        }
        videoUrl = data.video_url;
      }

      const placeholder = `__LTX_VIDEO_${videoId}__`;
      setProjectFiles(prev => {
        const updated = { ...prev };
        for (const [path, file] of Object.entries(updated)) {
          if (file.content.includes(placeholder)) {
            updated[path] = {
              ...file,
              content: file.content.replaceAll(placeholder, videoUrl),
            };
          }
        }
        return updated;
      });
      const dur = res.headers.get('x-video-duration') || '6';
      const rez = res.headers.get('x-video-resolution') || '1920x1080';
      setTerminalLines(prev => [...prev, `$ ✓ Video "${videoId}" generated (${dur}s ${rez})`]);
      setMediaAssets(prev => [...prev, { id: videoId, type: 'video', url: videoUrl, prompt, timestamp: Date.now() }]);
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ ✗ Video "${videoId}" error: ${err instanceof Error ? err.message : 'Unknown'}`]);
    }
  }, []);

  // ── Gemini Image Generation ──
  const generateGeminiImage = useCallback(async (imageId: string, prompt: string) => {
    setTerminalLines(prev => [...prev, `$ 🎨 Generating Gemini image "${imageId}"...`]);
    try {
      const res = await fetchWithRetry('/api/deepai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        timeout: 90000, // 90s for image
      }, 1);
      const data = await res.json();
      if (data.success && data.image_url) {
        const placeholder = `__GEMINI_IMAGE_${imageId}__`;
        setProjectFiles(prev => {
          const updated = { ...prev };
          for (const [path, file] of Object.entries(updated)) {
            if (file.content.includes(placeholder)) {
              updated[path] = {
                ...file,
                content: file.content.replaceAll(placeholder, data.image_url),
              };
            }
          }
          return updated;
        });
        setTerminalLines(prev => [...prev, `$ ✓ Image "${imageId}" generated successfully`]);
        setMediaAssets(prev => [...prev, { id: imageId, type: 'image', url: data.image_url, prompt, timestamp: Date.now() }]);
      } else {
        setTerminalLines(prev => [...prev, `$ ✗ Image "${imageId}" failed: ${data.error || 'Unknown error'}`]);
      }
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ ✗ Image "${imageId}" error: ${err instanceof Error ? err.message : 'Unknown'}`]);
    }
  }, []);

  // ── AI Action Parser & Executor ──
  // The AI can emit special action blocks that get executed by the frontend
  const executedActionsRef = useRef<Set<string>>(new Set());

  const parseAndExecuteActions = useCallback((content: string) => {
    // Parse <<FILE:path>>content<</FILE>> tags
    const fileRegex = /<<FILE:([^>]+)>>([\s\S]*?)<<\/FILE>>/g;
    let fileMatch;
    while ((fileMatch = fileRegex.exec(content)) !== null) {
      const fileId = 'file_' + fileMatch.index;
      if (executedActionsRef.current.has(fileId)) continue;
      executedActionsRef.current.add(fileId);
      const filePath = fileMatch[1].trim();
      const fileContent = fileMatch[2].trim();
      if (filePath && fileContent) {
        setProjectFiles(prev => ({
          ...prev,
          [filePath]: { content: fileContent, language: detectLanguage(filePath) },
        }));
        setTerminalLines(prev => [...prev, `$ \u2713 ${prev.some?.(l => l.includes(filePath)) ? 'updated' : 'created'} ${filePath}`]);
        setActiveTab('code');
        setSelectedFile(filePath);
      }
    }

    const actionRegex = /<<(TERMINAL|CONNECT|DEPLOY|TAB|CLONE|SHOW_TERMINAL|SHOW_INTEGRATIONS|LTX_VIDEO|GEMINI_IMAGE):?([^>]*)>>/g;
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
        case 'LTX_VIDEO': {
          const pipeIdx = payload.indexOf('|');
          if (pipeIdx > 0) {
            const videoId = payload.slice(0, pipeIdx).trim();
            const videoPrompt = payload.slice(pipeIdx + 1).trim();
            if (videoId && videoPrompt) {
              generateLTXVideo(videoId, videoPrompt);
            }
          }
          break;
        }
        case 'GEMINI_IMAGE': {
          const pipeIdx = payload.indexOf('|');
          if (pipeIdx > 0) {
            const imgId = payload.slice(0, pipeIdx).trim();
            const imgPrompt = payload.slice(pipeIdx + 1).trim();
            if (imgId && imgPrompt) {
              generateGeminiImage(imgId, imgPrompt);
            }
          }
          break;
        }
      }
    }
  }, [deployToVercel, cloneWebsite, runTerminalCommand, generateLTXVideo, generateGeminiImage]);

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
          <h1 className="text-[32px] sm:text-[42px] md:text-[52px] font-bold text-white leading-[1.1] mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Build any app
          </h1>
          <p className="text-[#888] text-[15px] mb-10 leading-relaxed">
            Use Ollama Cloud AI and Firecrawl to<br />
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
                        {[...new Set(MODELS.map(m => m.provider))].map((provider, pi) => (
                          <div key={provider}>
                            {pi > 0 && <div className="h-px bg-[#222] my-1.5" />}
                            <div className="px-3 py-1 text-[10px] font-medium text-[#555] uppercase tracking-wider">{PROVIDER_LABELS[provider] || provider}</div>
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
          <div className="mt-3">
            <button onClick={() => { setView('workspace'); setShowTemplates(true); }} className="px-4 py-2 rounded-full bg-[#1a1a1a] border border-purple-500/20 text-[13px] text-purple-400 hover:text-purple-300 hover:border-purple-500/40 transition-colors">
              📦 Start from Template
            </button>
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
    <div className="h-screen bg-[#0c0c0c] flex relative overflow-hidden select-none workspace-layout">

      {/* ═══ Left: Chat panel (resizable) ═══ */}
      <AnimatePresence initial={false}>
        {showChat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: chatWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ width: chatWidth }}
            className="chat-panel h-full border-r border-[#1e1e1e] flex flex-col bg-[#0f0f0f] shrink-0 overflow-hidden"
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
                        {smartSuggestions.map((ex) => (
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
                    {/* A/B Model Comparison result */}
                    {abMode && (abResultB || abStreaming) && (
                      <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-purple-500/10">
                          <span className="text-[10px] font-medium text-purple-400">Model B: {MODELS.find(m => m.id === abModelB)?.name || abModelB}</span>
                          <div className="flex items-center gap-1.5">
                            {abStreaming && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-2.5 h-2.5 border border-purple-400 border-t-transparent rounded-full" />}
                            {abResultB && !abStreaming && (
                              <button onClick={() => {
                                // Use Model B result: replace the last assistant message with B's output
                                setMessages(prev => {
                                  const last = [...prev].reverse().find(m => m.role === 'assistant');
                                  if (!last) return prev;
                                  return prev.map(m => m.id === last.id ? { ...m, content: abResultB } : m);
                                });
                                setAbResultB('');
                              }} className="px-2 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors">
                                Use this
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="px-3 py-2 max-h-[200px] overflow-y-auto prose prose-invert prose-sm max-w-none text-[12px] text-gray-400">
                          {abResultB ? <MarkdownContent content={abResultB} /> : <TypingIndicator />}
                        </div>
                      </div>
                    )}
                    {error && <div className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-red-400 text-[11px] flex items-start gap-2"><span className="flex-1">{error}</span><button onClick={() => { setError(null); if (messages.length >= 2) { const lastUserMsg = [...messages].reverse().find(m => m.role === 'user'); if (lastUserMsg) sendToAI(lastUserMsg.content); } }} className="shrink-0 text-[10px] underline hover:text-red-300 cursor-pointer">Try again</button></div>}
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
                              {[...new Set(MODELS.map(m => m.provider))].map((provider, pi) => (
                                <div key={provider}>
                                  {pi > 0 && <div className="h-px bg-[#222] my-1.5" />}
                                  <div className="px-3 py-1 text-[9px] font-medium text-[#555] uppercase tracking-wider">{PROVIDER_LABELS[provider] || provider}</div>
                                  {MODELS.filter(m => m.provider === provider).map(m => (
                                    <button key={m.id} onClick={() => { setModel(m.id); setShowModelMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${m.id === model ? 'text-white' : 'text-[#777]'}`}>
                                      {PROVIDER_ICON[m.provider]}
                                      <span className="flex-1 text-left">{m.name}</span>
                                      <span className="flex items-center gap-0.5">
                                        {m.tags.map(t => <span key={t} className={`px-1 py-px rounded text-[8px] font-medium border ${TAG_COLORS[t] || 'text-[#555] bg-[#1a1a1a] border-[#333]'}`}>{t}</span>)}
                                      </span>
                                      {m.id === model && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {/* A/B comparison toggle */}
                      <button onClick={() => setAbMode(prev => !prev)} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${abMode ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' : 'bg-[#222] hover:bg-[#2a2a2a] text-[#888] hover:text-white'}`} title="A/B Model Comparison">
                        A/B
                      </button>
                      {abMode && (
                        <select value={abModelB} onChange={e => setAbModelB(e.target.value)} className="bg-[#222] border border-[#333] rounded-md px-1.5 py-0.5 text-[9px] text-[#888] outline-none max-w-[100px]">
                          {MODELS.filter(m => m.id !== model).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      )}
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
                  {/* Image previews + Screenshot-to-Code action */}
                  {attachedImages.length > 0 && (
                    <div className="px-3 pb-2 space-y-1.5">
                      <div className="flex gap-1.5 overflow-x-auto">
                        {attachedImages.map((img, i) => (
                          <div key={i} className="relative shrink-0 group">
                            <img src={img.data} alt={img.name} className="w-12 h-12 rounded-lg object-cover border border-[#333]" />
                            <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#333] text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">&times;</button>
                          </div>
                        ))}
                      </div>
                      {/* Quick actions for attached images */}
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => { setInput('Reproduce this design exactly as a pixel-perfect responsive HTML/CSS page with all the visual elements, colors, typography, spacing and layout shown in the screenshot'); }} className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 hover:bg-blue-500/20 transition-colors">
                          Screenshot → Code
                        </button>
                        <button onClick={() => { setInput('Analyze this screenshot and describe every UI element, color, font, spacing and layout detail you see'); }} className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 hover:bg-purple-500/20 transition-colors">
                          Analyze Design
                        </button>
                        <button onClick={() => { setInput('Improve this design: make it more modern, add better spacing, smoother gradients, micro-interactions and animations while keeping the same layout'); }} className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 hover:bg-green-500/20 transition-colors">
                          Improve Design
                        </button>
                      </div>
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
          className="chat-drag-handle w-[4px] h-full cursor-col-resize hover:bg-[#444] active:bg-[#555] transition-colors shrink-0 z-10"
          onMouseDown={() => { chatDragRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
        />
      )}

      {/* ═══ Right: Main panel ═══ */}
      <div id="right-panel" className="right-panel h-full flex-1 flex flex-col bg-[#0c0c0c] min-w-0">

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
            {/* Project switcher */}
            <div className="relative mr-1" data-model-menu>
              <button onClick={() => setShowProjectMenu(!showProjectMenu)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors font-medium max-w-[140px]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <span className="truncate">{projects.find(p => p.id === currentProjectId)?.name || 'Project'}</span>
                <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
              </button>
              <AnimatePresence>
                {showProjectMenu && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }} className="absolute left-0 top-9 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1.5 min-w-[220px] shadow-2xl shadow-black/60">
                    <div className="px-3 py-1 text-[9px] font-medium text-[#555] uppercase tracking-wider">Projects</div>
                    {projects.map(p => (
                      <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors group ${p.id === currentProjectId ? 'text-white' : 'text-[#777]'}`}>
                        {renameProjectId === p.id ? (
                          <input type="text" value={renameProjectName} onChange={(e) => setRenameProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, name: renameProjectName } : pr)); setRenameProjectId(null); } if (e.key === 'Escape') setRenameProjectId(null); }} onBlur={() => { setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, name: renameProjectName } : pr)); setRenameProjectId(null); }} autoFocus className="flex-1 bg-[#0c0c0c] border border-[#333] rounded px-1.5 py-0.5 text-[11px] text-white outline-none" />
                        ) : (
                          <button onClick={() => switchProject(p.id)} className="flex-1 text-left truncate">{p.name}</button>
                        )}
                        {p.id === currentProjectId && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>}
                        <button onClick={(e) => { e.stopPropagation(); setRenameProjectId(p.id); setRenameProjectName(p.name); }} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-white transition-all" title="Rename">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        {projects.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-400 transition-all" title="Delete">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>}
                      </div>
                    ))}
                    <div className="h-px bg-[#222] my-1" />
                    <button onClick={() => createProject('Project ' + (projects.length + 1))} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#888] hover:text-white hover:bg-[#222] transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      New Empty Project
                    </button>
                    <button onClick={() => setShowTemplates(true)} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#888] hover:text-white hover:bg-[#222] transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                      From Template...
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="w-px h-4 bg-[#222] mr-1" />
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
                <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'tablet' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setDeviceMode('tablet')} title="Tablet (810×1080)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg></button>
                <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'mobile' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setDeviceMode('mobile')}><MobileIcon /></button>
                <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${isEditMode ? 'text-blue-400 bg-blue-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} onClick={() => setIsEditMode(!isEditMode)} title={isEditMode ? 'Save & Exit Edit Mode' : 'Visual Editor'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button
                  className={`flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-medium transition-colors ${show21stBrowser ? 'text-white bg-indigo-500/20 border border-indigo-500/40' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`}
                  onClick={() => { setShow21stBrowser(v => !v); setTimeout(() => browser21stInputRef.current?.focus(), 50); }}
                  title="21st.dev Component Library"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  21st
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {Object.keys(projectFiles).length > 0 && (
              <>
                <button onClick={vfsUndo} disabled={vfsHistoryIdx <= 0} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-20" title="Undo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
                <button onClick={vfsRedo} disabled={vfsHistoryIdx >= vfsHistory.length - 1} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-20" title="Redo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
                <button onClick={() => setShowDiffView(!showDiffView)} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${showDiffView ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Diff View">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18"/></svg>
                </button>
                <button onClick={downloadProjectZip} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Download ZIP"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                <div className="w-px h-4 bg-[#222]"/>
              </>
            )}
            <button onClick={() => setShowEnvPanel(true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Environment Variables">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </button>
            <button onClick={() => { setShowCommandPalette(true); setCommandQuery(''); }} className="flex items-center gap-1 px-2 py-1 rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors text-[10px]" title="Command Palette (Ctrl+K)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span className="hidden sm:inline">⌘K</span>
            </button>
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
                      <div className="relative w-full h-full bg-[#0c0c0c] flex flex-col">
                        <div className={`flex-1 min-h-0 flex items-center justify-center`}>
                          <div className={`bg-white ${deviceMode === 'mobile' ? 'w-[393px] h-[852px] rounded-[20px] border-4 border-[#333]' : deviceMode === 'tablet' ? 'w-[810px] h-[1080px] rounded-[12px] border-4 border-[#333]' : 'w-full h-full'} overflow-hidden relative`}>
                            <iframe ref={iframeRef} className="w-full h-full border-none bg-white" srcDoc={previewHtml ?? ''} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Preview" />
                            {isEditMode && (
                              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/90 text-white text-[10px] font-medium shadow-lg pointer-events-none z-10">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit Mode
                              </div>
                            )}
                            {/* Select & Prompt — floating AI prompt for element modification */}
                            {selectPromptData && (
                              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={(e) => { if (e.target === e.currentTarget) { setSelectPromptData(null); setSelectPromptInput(''); } }}>
                                <div className="bg-[#161616] rounded-xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                  <div className="px-4 py-3 border-b border-[#222] flex items-center gap-2">
                                    <span className="text-lg">✨</span>
                                    <div className="flex-1">
                                      <p className="text-[12px] text-white font-medium">AI Modify Element</p>
                                      <p className="text-[10px] text-[#555]">&lt;{selectPromptData.tagName.toLowerCase()}&gt; — Only this element will be changed</p>
                                    </div>
                                    <button onClick={() => { setSelectPromptData(null); setSelectPromptInput(''); }} className="text-[#555] hover:text-white transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                                  </div>
                                  <div className="p-3">
                                    <div className="mb-3 max-h-[100px] overflow-auto rounded-lg bg-[#0c0c0c] border border-[#222] p-2">
                                      <pre className="text-[10px] text-[#666] font-mono whitespace-pre-wrap break-all leading-4">{selectPromptData.outerHtml.slice(0, 500)}{selectPromptData.outerHtml.length > 500 ? '...' : ''}</pre>
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        ref={selectPromptRef}
                                        value={selectPromptInput}
                                        onChange={(e) => setSelectPromptInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitSelectPrompt(); } if (e.key === 'Escape') { setSelectPromptData(null); setSelectPromptInput(''); } }}
                                        placeholder="e.g. Make it blue, add a gradient, change text to..."
                                        className="flex-1 bg-[#0c0c0c] border border-[#333] rounded-lg px-3 py-2 text-[12px] text-white placeholder-[#555] outline-none focus:border-purple-500/50 transition-colors"
                                        disabled={selectPromptLoading}
                                        autoFocus
                                      />
                                      <button
                                        onClick={submitSelectPrompt}
                                        disabled={!selectPromptInput.trim() || selectPromptLoading}
                                        className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-[11px] font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-30 shrink-0 flex items-center gap-1.5"
                                      >
                                        {selectPromptLoading ? (
                                          <><svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" /></svg> Applying...</>
                                        ) : (
                                          <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Apply</>
                                        )}
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {['Make it bigger', 'Change colors', 'Add animation', 'Make responsive', 'Modernize style'].map((s) => (
                                        <button key={s} onClick={() => { setSelectPromptInput(s); }} className="text-[9px] px-2 py-1 rounded-md bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222] transition-colors">{s}</button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* 21st.dev Component Browser — overlay from bottom of preview */}
                            {show21stBrowser && (
                              <div className="absolute inset-0 z-30 flex flex-col bg-[#0d0d0d]/95 backdrop-blur-sm rounded-[inherit] overflow-hidden">
                                {/* Header */}
                                <div className="shrink-0 px-4 py-3 border-b border-[#222] flex items-center gap-3">
                                  <div className="flex items-center gap-2 shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                                    <span className="text-[12px] font-semibold text-white">21st.dev Components</span>
                                  </div>
                                  <form className="flex-1 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); search21stComponents(browser21stQuery); }}>
                                    <input
                                      ref={browser21stInputRef}
                                      value={browser21stQuery}
                                      onChange={(e) => setBrowser21stQuery(e.target.value)}
                                      placeholder="Search components… e.g. pricing card, nav bar, hero section"
                                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-[#555] outline-none focus:border-indigo-500/50 transition-colors"
                                      autoFocus
                                    />
                                    <button type="submit" disabled={browser21stLoading || !browser21stQuery.trim()} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-[11px] font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0">
                                      {browser21stLoading
                                        ? <><svg width="11" height="11" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70"/></svg> Searching…</>
                                        : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search</>}
                                    </button>
                                  </form>
                                  <button onClick={() => setShow21stBrowser(false)} className="shrink-0 w-6 h-6 flex items-center justify-center text-[#555] hover:text-white transition-colors rounded-md hover:bg-[#1a1a1a]">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                  </button>
                                </div>
                                {/* Quick category chips */}
                                <div className="shrink-0 px-4 py-2 flex flex-wrap gap-1.5 border-b border-[#1a1a1a]">
                                  {['Hero section', 'Pricing card', 'Navigation bar', 'Card grid', 'CTA button', 'Footer', 'Modal', 'Form', 'Feature grid', 'Testimonials'].map(chip => (
                                    <button key={chip} onClick={() => { setBrowser21stQuery(chip); search21stComponents(chip); }} className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#252525] text-[10px] text-[#777] hover:text-white hover:border-indigo-500/40 transition-colors">{chip}</button>
                                  ))}
                                </div>
                                {/* Results */}
                                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                                  {browser21stLoading && (
                                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                                      <svg width="20" height="20" viewBox="0 0 24 24" className="animate-spin text-indigo-400"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70"/></svg>
                                      <p className="text-[12px] text-[#555]">Searching 21st.dev…</p>
                                    </div>
                                  )}
                                  {!browser21stLoading && browser21stResults.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                                      <p className="text-[12px] text-[#555]">Search for components above</p>
                                      <p className="text-[10px] text-[#333]">or click a quick category chip</p>
                                    </div>
                                  )}
                                  {!browser21stLoading && browser21stResults.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                      {browser21stResults.map((comp, i) => (
                                        <div key={comp.id || i} className="flex flex-col bg-[#111] border border-[#1e1e1e] rounded-xl p-3 gap-2 hover:border-indigo-500/30 transition-colors group">
                                          <div className="flex-1">
                                            <p className="text-[11px] font-semibold text-white leading-tight mb-1">{comp.name || 'Component'}</p>
                                            <p className="text-[10px] text-[#666] leading-snug line-clamp-2">{comp.description || ''}</p>
                                            {comp.tags && comp.tags.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1.5">
                                                {comp.tags.slice(0, 3).map(t => (
                                                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#777]">{t}</span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          {comp.preview_url || comp.demo_url ? (
                                            <a href={comp.preview_url || comp.demo_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-400/70 hover:text-indigo-300 transition-colors underline truncate">Preview ↗</a>
                                          ) : null}
                                          <button
                                            onClick={() => inject21stComponent(comp)}
                                            disabled={!!injecting21stComponent}
                                            className="w-full py-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-[10px] font-medium hover:bg-indigo-500/25 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 group-hover:bg-indigo-500/20"
                                          >
                                            {injecting21stComponent === comp.name
                                              ? <><svg width="10" height="10" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70"/></svg> Injecting…</>
                                              : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Use in page</>}
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Refine Clone Panel — appears when a clone exists */}
                        {clonedHtml && lastScrapeDataRef.current && (
                          <div className="shrink-0 border-t border-[#222] bg-[#111] px-3 py-2">
                            {/* Quick fix suggestions */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {[
                                'Fix colors to match the original exactly',
                                'Fix the header/navbar layout and styling',
                                'Add the missing footer content',
                                'Fix responsive layout for mobile',
                                'Make fonts match the original site',
                                'Fix spacing and padding to match original',
                              ].map(suggestion => (
                                <button
                                  key={suggestion}
                                  onClick={() => { setRefineFeedback(suggestion); }}
                                  className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#252525] text-[10px] text-[#777] hover:text-white hover:border-[#444] transition-colors"
                                  disabled={isRefining}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={refineFeedback}
                                onChange={(e) => setRefineFeedback(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); refineClone(); } }}
                                placeholder="Describe what to fix (e.g. &quot;make the header darker&quot;, &quot;add the missing footer&quot;)..."
                                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-[12px] text-white placeholder-[#555] focus:outline-none focus:border-[#444] transition-colors"
                                disabled={isRefining}
                              />
                              <button
                                onClick={refineClone}
                                disabled={!refineFeedback.trim() || isRefining}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-[11px] text-white font-medium transition-colors hover:bg-[#333] disabled:opacity-30"
                              >
                                {isRefining ? (
                                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border border-white border-t-transparent rounded-full" /> Refining...</>
                                ) : (
                                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Refine</>
                                )}
                              </button>
                              {isRefining && (
                                <button onClick={stopClone} className="px-2 py-1.5 rounded-lg border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                              )}
                            </div>
                          </div>
                        )}
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
                  <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex bg-[#0c0c0c]" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
                    {/* Drag overlay */}
                    {isDragOver && (
                      <div className="absolute inset-0 z-40 bg-purple-500/10 border-2 border-dashed border-purple-500/40 rounded-lg flex items-center justify-center">
                        <div className="text-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" className="mx-auto mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><p className="text-purple-400 text-sm font-medium">Drop files here</p></div>
                      </div>
                    )}
                    {/* File tree sidebar */}
                    {Object.keys(projectFiles).length > 0 ? (
                      <>
                        <div className="file-tree-sidebar w-[200px] shrink-0 border-r border-[#1e1e1e] bg-[#0f0f0f] flex flex-col overflow-hidden">
                          <div className="px-3 py-2 text-[10px] font-medium text-[#555] uppercase tracking-wider border-b border-[#1e1e1e] flex items-center justify-between">
                            <span>Explorer</span>
                            <span className="text-[9px] text-[#444]">{Object.keys(projectFiles).length} files</span>
                          </div>
                          <div className="flex-1 overflow-y-auto py-1">
                            {(() => {
                              const { entries } = buildFileTree(projectFiles);
                              return entries.map((entry) => {
                                if (entry.isDir) {
                                  const isOpen = expandedDirs.has(entry.path);
                                  return (
                                    <button key={entry.path} onClick={() => setExpandedDirs(prev => { const next = new Set(prev); if (next.has(entry.path)) next.delete(entry.path); else next.add(entry.path); return next; })} className="w-full flex items-center gap-1.5 px-2 py-[3px] text-[11px] text-[#888] hover:text-white hover:bg-[#161616] transition-colors" style={{ paddingLeft: 8 + entry.depth * 12 }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"/></svg>
                                      <FolderIcon open={isOpen} size={12} />
                                      <span className="truncate">{entry.name}</span>
                                    </button>
                                  );
                                }
                                // Check if parent dir is collapsed
                                const parentDir = entry.path.includes('/') ? entry.path.split('/').slice(0, -1).join('/') : null;
                                if (parentDir) {
                                  const parts = entry.path.split('/');
                                  for (let i = 1; i < parts.length; i++) {
                                    const dir = parts.slice(0, i).join('/');
                                    if (!expandedDirs.has(dir)) return null;
                                  }
                                }
                                return (
                                  <button key={entry.path} onClick={() => setSelectedFile(entry.path)} className={`w-full flex items-center gap-1.5 px-2 py-[3px] text-[11px] transition-colors ${selectedFile === entry.path ? 'text-white bg-[#1a1a1a]' : 'text-[#888] hover:text-white hover:bg-[#161616]'}`} style={{ paddingLeft: 8 + entry.depth * 12 + (parentDir ? 10 : 0) }}>
                                    <FileIcon size={12} />
                                    <span className="truncate">{entry.name}</span>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                        {/* File editor */}
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                          {/* File tabs */}
                          <div className="h-[32px] flex items-center border-b border-[#1e1e1e] bg-[#111] overflow-x-auto shrink-0">
                            {Object.keys(projectFiles).filter(f => f === selectedFile || f === 'index.html').map(f => (
                              <button key={f} onClick={() => setSelectedFile(f)} className={`h-full px-3 flex items-center gap-1.5 text-[11px] border-r border-[#1e1e1e] shrink-0 transition-colors ${f === selectedFile ? 'bg-[#0c0c0c] text-white' : 'text-[#555] hover:text-[#888]'}`}>
                                <FileIcon size={11} />
                                <span>{f.split('/').pop()}</span>
                              </button>
                            ))}
                          </div>
                          {/* Monaco Code Editor / Diff View */}
                          <div className="flex-1 overflow-hidden">
                            {projectFiles[selectedFile] ? (
                              showDiffView && vfsHistoryIdx > 0 ? (
                                <MonacoDiffEditor
                                  height="100%"
                                  language={projectFiles[selectedFile]?.language || 'plaintext'}
                                  original={vfsHistory[vfsHistoryIdx - 1]?.[selectedFile]?.content || ''}
                                  modified={projectFiles[selectedFile]?.content || ''}
                                  theme="vs-dark"
                                  options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 13, automaticLayout: true }}
                                />
                              ) : (
                              <MonacoEditor
                                height="100%"
                                language={projectFiles[selectedFile].language || 'plaintext'}
                                value={projectFiles[selectedFile].content}
                                onChange={(val) => {
                                  if (val !== undefined) {
                                    setProjectFiles(prev => ({
                                      ...prev,
                                      [selectedFile]: { ...prev[selectedFile], content: val },
                                    }));
                                  }
                                }}
                                theme="vs-dark"
                                options={{
                                  minimap: { enabled: true },
                                  fontSize: 13,
                                  lineNumbers: 'on',
                                  scrollBeyondLastLine: false,
                                  wordWrap: 'on',
                                  tabSize: 2,
                                  automaticLayout: true,
                                  bracketPairColorization: { enabled: true },
                                  padding: { top: 8, bottom: 8 },
                                  suggestOnTriggerCharacters: true,
                                  quickSuggestions: true,
                                  folding: true,
                                  renderWhitespace: 'selection',
                                  smoothScrolling: true,
                                  cursorBlinking: 'smooth',
                                  cursorSmoothCaretAnimation: 'on',
                                  formatOnPaste: true,
                                  linkedEditing: true,
                                }}
                              />
                              )
                            ) : (
                              <div className="text-[12px] text-[#555] p-4">Select a file from the explorer</div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : codeBlocks.length > 0 ? (
                      <div className="flex-1 p-4 space-y-4 overflow-auto">{codeBlocks.map((block, idx) => <CodeBlock key={idx} code={block.code} language={block.language} />)}</div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center"><div className="text-center"><CodeIcon /><p className="text-[12px] text-[#555] mt-3">Code will appear here when you build something</p></div></div>
                    )}
                  </motion.div>
                ) : activeTab === 'database' ? (
                  <motion.div key="database" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto bg-[#0c0c0c]">
                    <div className="max-w-2xl mx-auto p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-1">Database</h2>
                          <p className="text-[12px] text-[#555]">Connect and manage your project database</p>
                        </div>
                        {integrationKeys['Supabase'] && <span className="px-2 py-1 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px]">Connected</span>}
                      </div>
                      {integrationKeys['Supabase'] ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DatabaseIcon /></div>
                              <div><p className="text-[13px] text-white font-medium">Supabase Connected</p><p className="text-[10px] text-[#555]">Query your database directly from here</p></div>
                            </div>
                            <div className="space-y-2">
                              <div><label className="block text-[10px] text-[#555] mb-1">Project URL</label><input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxxx.supabase.co" className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" /></div>
                              <div><label className="block text-[10px] text-[#555] mb-1">Table Name</label><input type="text" value={supabaseTable} onChange={(e) => setSupabaseTable(e.target.value)} placeholder="users, posts, products..." className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" /></div>
                              <button onClick={runSupabaseQuery} disabled={!supabaseUrl || !supabaseTable || isSupabaseLoading} className="px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-30">{isSupabaseLoading ? 'Querying...' : `SELECT * FROM ${supabaseTable || '...'}`}</button>
                            </div>
                          </div>
                          {supabaseError && <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-[11px]">{supabaseError}</div>}
                          {supabaseResult && (
                            <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                              <p className="text-[10px] text-[#555] mb-2">Results ({Array.isArray(supabaseResult) ? supabaseResult.length : 0} rows)</p>
                              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                {Array.isArray(supabaseResult) && supabaseResult.length > 0 ? (
                                  <table className="w-full text-[10px]">
                                    <thead><tr className="border-b border-[#222]">{Object.keys(supabaseResult[0]).map(k => <th key={k} className="text-left py-1 px-2 text-[#888] font-medium">{k}</th>)}</tr></thead>
                                    <tbody>{supabaseResult.slice(0, 100).map((row, i) => <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#161616]">{Object.values(row).map((v, j) => <td key={j} className="py-1 px-2 text-gray-400 truncate max-w-[200px]">{String(v ?? 'null')}</td>)}</tr>)}</tbody>
                                  </table>
                                ) : <p className="text-[11px] text-[#555]">No rows returned</p>}
                              </div>
                            </div>
                          )}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Supabase auth flow with login/signup pages')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Generate auth flow with Supabase</button>
                              <button onClick={() => sendPrompt('Build a CRUD dashboard that connects to Supabase')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Build a CRUD dashboard</button>
                            </div>
                          </div>
                          <button onClick={() => { setIntegrationKeys(prev => { const next = { ...prev }; delete next['Supabase']; return next; }); setSupabaseResult(null); setSupabaseError(null); }} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">Remove Supabase Key</button>
                        </div>
                      ) : sandboxDb ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[12px] text-amber-400 font-medium">Sandbox Mode</span>
                              </div>
                              <button onClick={() => setSandboxDb(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Exit Sandbox</button>
                            </div>
                            <p className="text-[10px] text-amber-400/60">Mock database with sample data. Connect a real database for live queries.</p>
                          </div>
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DatabaseIcon /></div>
                              <div><p className="text-[13px] text-white font-medium">Sandbox Database</p><p className="text-[10px] text-[#555]">3 tables &middot; {Object.values(SANDBOX_DB).reduce((a, b) => a + b.length, 0)} rows</p></div>
                            </div>
                            <div className="flex gap-2 mb-3">
                              {Object.keys(SANDBOX_DB).map(t => (
                                <button key={t} onClick={() => setSandboxDbTable(t)} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${sandboxDbTable === t ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>{t}</button>
                              ))}
                            </div>
                            <div className="bg-[#0c0c0c] rounded-md border border-[#1e1e1e] px-3 py-1.5 mb-3">
                              <span className="text-[10px] text-emerald-400 font-mono">SELECT * FROM {sandboxDbTable} LIMIT 100;</span>
                            </div>
                            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                              <table className="w-full text-[10px]">
                                <thead><tr className="border-b border-[#222]">{Object.keys(SANDBOX_DB[sandboxDbTable][0]).map(k => <th key={k} className="text-left py-1 px-2 text-[#888] font-medium">{k}</th>)}</tr></thead>
                                <tbody>{SANDBOX_DB[sandboxDbTable].map((row, i) => <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#161616]">{Object.values(row).map((v, j) => <td key={j} className="py-1 px-2 text-gray-400 truncate max-w-[200px]">{String(v ?? 'null')}</td>)}</tr>)}</tbody>
                              </table>
                            </div>
                          </div>
                          {/* Email Sandbox */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/></svg></div>
                                <div><p className="text-[13px] text-white font-medium">Email Sandbox</p><p className="text-[10px] text-[#555]">Test email sending (Resend / SendGrid)</p></div>
                              </div>
                              {!sandboxEmail && <button onClick={() => setSandboxEmail(true)} className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 text-[10px] hover:bg-blue-500/30 transition-colors">Open</button>}
                              {sandboxEmail && <button onClick={() => setSandboxEmail(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Close</button>}
                            </div>
                            {sandboxEmail && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <input type="text" value={sandboxEmailForm.to} onChange={(e) => setSandboxEmailForm(p => ({ ...p, to: e.target.value }))} placeholder="to@example.com" className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" />
                                  <input type="text" value={sandboxEmailForm.subject} onChange={(e) => setSandboxEmailForm(p => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333]" />
                                  <textarea value={sandboxEmailForm.body} onChange={(e) => setSandboxEmailForm(p => ({ ...p, body: e.target.value }))} placeholder="Email body..." rows={3} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] resize-none" />
                                  <button onClick={async () => { if (sandboxEmailForm.to && sandboxEmailForm.subject) { const hasReal = !!(integrationKeys['Resend'] || integrationKeys['SendGrid']); if (hasReal) { const ok = await sendRealEmail(sandboxEmailForm.to, sandboxEmailForm.subject, sandboxEmailForm.body || '<p>No body</p>'); setSandboxEmailLog(prev => [{ id: `em_${Date.now()}`, to: sandboxEmailForm.to, subject: sandboxEmailForm.subject, status: ok ? 'delivered' : 'failed', date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } else { setSandboxEmailLog(prev => [{ id: `em_${Date.now()}`, to: sandboxEmailForm.to, subject: sandboxEmailForm.subject, status: 'delivered', date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } setSandboxEmailForm({ to: '', subject: '', body: '' }); } }} disabled={!sandboxEmailForm.to || !sandboxEmailForm.subject} className="px-3 py-1.5 rounded-md bg-blue-500/20 text-blue-400 text-[11px] font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-30">{integrationKeys['Resend'] || integrationKeys['SendGrid'] ? 'Send (Real)' : 'Send (Sandbox)'}</button>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-[#555]">Sent ({sandboxEmailLog.length})</p>
                                  {sandboxEmailLog.map(em => (
                                    <div key={em.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${em.status === 'delivered' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                        <span className="text-[10px] text-gray-400 truncate">{em.to}</span>
                                        <span className="text-[10px] text-[#555] truncate">{em.subject}</span>
                                      </div>
                                      <span className="text-[9px] text-[#555] shrink-0 ml-2">{em.date}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Supabase auth flow with login/signup pages')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Generate auth flow with Supabase</button>
                              <button onClick={() => sendPrompt('Build a CRUD dashboard that connects to Supabase')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Build a CRUD dashboard</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Sandbox CTA */}
                          <button onClick={() => setSandboxDb(true)} className="w-full p-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                              <div>
                                <p className="text-[13px] text-amber-400 font-medium group-hover:text-amber-300 transition-colors">Try Sandbox Mode</p>
                                <p className="text-[10px] text-[#555]">Explore database queries + email sending with mock data</p>
                              </div>
                            </div>
                          </button>
                          {INTEGRATIONS.filter(i => i.cat === 'Database').map(intg => (
                            <div key={intg.name} className="p-4 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><DatabaseIcon /></div>
                                  <div><p className="text-[13px] text-white font-medium">{intg.name}</p><p className="text-[11px] text-[#555]">{intg.desc}</p></div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${integrationKeys[intg.name] ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                              </div>
                              {editingIntegration === intg.name ? (
                                <div className="space-y-2 mt-2">
                                  {intg.name === 'Supabase' && (
                                    <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxxx.supabase.co" className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444] font-mono" />
                                  )}
                                  <div className="flex gap-2">
                                    <input type="password" placeholder={intg.keyPlaceholder} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); if (intg.name === 'Supabase' && supabaseUrl) localStorage.setItem('aurion_supabase_url', supabaseUrl); } }} />
                                    <button onClick={() => setEditingIntegration(null)} className="px-2.5 py-1.5 rounded-md border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setEditingIntegration(intg.name)} className="mt-2 px-3 py-1.5 rounded-md bg-white text-black text-[11px] font-medium hover:bg-gray-200 transition-colors">
                                  {integrationKeys[intg.name] ? 'Reconnect' : 'Connect'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : activeTab === 'payments' ? (
                  <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto bg-[#0c0c0c]">
                    <div className="max-w-2xl mx-auto p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-1">Payments</h2>
                          <p className="text-[12px] text-[#555]">Payment processing for your app</p>
                        </div>
                        {integrationKeys['Stripe'] && <span className="px-2 py-1 rounded-md bg-purple-400/10 text-purple-400 text-[10px]">Connected</span>}
                      </div>
                      {integrationKeys['Stripe'] ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><PaymentsIcon /></div>
                                <div><p className="text-[13px] text-white font-medium">Stripe Connected</p><p className="text-[10px] text-[#555]">{integrationKeys['Stripe'].startsWith('sk_live') ? 'Live mode' : 'Test mode'}</p></div>
                              </div>
                              <button onClick={fetchStripeData} disabled={isStripeLoading} className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-400 text-[10px] hover:bg-purple-500/30 transition-colors disabled:opacity-30">{isStripeLoading ? 'Loading...' : 'Fetch Data'}</button>
                            </div>
                            {stripeBalance && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                  <p className="text-[10px] text-[#555] mb-1">Available</p>
                                  <span className="text-[13px] text-emerald-400 font-medium">${(stripeBalance.available / 100).toFixed(2)}</span>
                                </div>
                                <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                  <p className="text-[10px] text-[#555] mb-1">Pending</p>
                                  <span className="text-[13px] text-amber-400 font-medium">${(stripeBalance.pending / 100).toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          {stripeError && <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-[11px]">{stripeError}</div>}
                          {stripeProducts.length > 0 && (
                            <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                              <p className="text-[10px] text-[#555] mb-2">Products ({stripeProducts.length})</p>
                              <div className="space-y-1.5">
                                {stripeProducts.map((p: unknown) => {
                                  const prod = p as { id: string; name: string; active: boolean };
                                  return (
                                    <div key={prod.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                      <span className="text-[11px] text-gray-300">{prod.name}</span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${prod.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#333] text-[#888]'}`}>{prod.active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Stripe checkout page with a pricing table using my Stripe key')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Generate a checkout page</button>
                              <button onClick={() => sendPrompt('Create a subscription pricing page with 3 tiers using Stripe')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Build a pricing page</button>
                            </div>
                          </div>
                          <button onClick={() => { setIntegrationKeys(prev => { const next = { ...prev }; delete next['Stripe']; return next; }); setStripeBalance(null); setStripeProducts([]); setStripeError(null); }} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">Remove Stripe Key</button>
                        </div>
                      ) : sandboxPay ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[12px] text-amber-400 font-medium">Sandbox Mode</span>
                              </div>
                              <button onClick={() => setSandboxPay(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Exit Sandbox</button>
                            </div>
                            <p className="text-[10px] text-amber-400/60">Mock payment data. Connect a real Stripe key for live data.</p>
                          </div>
                          {/* Mock Balance */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><PaymentsIcon /></div>
                              <div><p className="text-[13px] text-white font-medium">Stripe Sandbox</p><p className="text-[10px] text-[#555]">Test mode &middot; sk_test_sandbox</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                <p className="text-[10px] text-[#555] mb-1">Available</p>
                                <span className="text-[13px] text-emerald-400 font-medium">${(SANDBOX_STRIPE.balance.available / 100).toFixed(2)}</span>
                              </div>
                              <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                <p className="text-[10px] text-[#555] mb-1">Pending</p>
                                <span className="text-[13px] text-amber-400 font-medium">${(SANDBOX_STRIPE.balance.pending / 100).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          {/* Mock Products */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[10px] text-[#555] mb-2">Products ({SANDBOX_STRIPE.products.length})</p>
                            <div className="space-y-1.5">
                              {SANDBOX_STRIPE.products.map(prod => (
                                <div key={prod.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                  <span className="text-[11px] text-gray-300">{prod.name}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${prod.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#333] text-[#888]'}`}>{prod.active ? 'Active' : 'Inactive'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Mock Transactions */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[10px] text-[#555] mb-2">Recent Transactions ({SANDBOX_STRIPE.transactions.length})</p>
                            <div className="space-y-1.5">
                              {SANDBOX_STRIPE.transactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'succeeded' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    <span className="text-[10px] text-gray-400">{tx.customer}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-white font-medium">${(tx.amount / 100).toFixed(2)}</span>
                                    <span className="text-[9px] text-[#555]">{tx.date}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Messaging Sandbox */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                                <div><p className="text-[13px] text-white font-medium">Messaging Sandbox</p><p className="text-[10px] text-[#555]">Test Slack / Discord / Twilio messaging</p></div>
                              </div>
                              {!sandboxMsg && <button onClick={() => setSandboxMsg(true)} className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-[10px] hover:bg-cyan-500/30 transition-colors">Open</button>}
                              {sandboxMsg && <button onClick={() => setSandboxMsg(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Close</button>}
                            </div>
                            {sandboxMsg && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    {['Slack', 'Discord', 'Twilio'].map(p => (
                                      <button key={p} onClick={() => setSandboxMsgForm(f => ({ ...f, platform: p }))} className={`px-2.5 py-1 rounded-md text-[10px] transition-colors ${sandboxMsgForm.platform === p ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>{p}</button>
                                    ))}
                                  </div>
                                  <input type="text" value={sandboxMsgForm.channel} onChange={(e) => setSandboxMsgForm(p => ({ ...p, channel: e.target.value }))} placeholder={sandboxMsgForm.platform === 'Twilio' ? '+1 555-0123' : '#channel-name'} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" />
                                  <textarea value={sandboxMsgForm.text} onChange={(e) => setSandboxMsgForm(p => ({ ...p, text: e.target.value }))} placeholder="Message..." rows={2} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] resize-none" />
                                  <button onClick={async () => { if (sandboxMsgForm.channel && sandboxMsgForm.text) { const hasReal = !!integrationKeys[sandboxMsgForm.platform]; if (hasReal) { const ok = await sendRealMessage(sandboxMsgForm.platform, sandboxMsgForm.channel, sandboxMsgForm.text); setSandboxMsgLog(prev => [{ id: `msg_${Date.now()}`, channel: sandboxMsgForm.channel, text: sandboxMsgForm.text, platform: sandboxMsgForm.platform + (ok ? '' : ' ✗'), date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } else { setSandboxMsgLog(prev => [{ id: `msg_${Date.now()}`, channel: sandboxMsgForm.channel, text: sandboxMsgForm.text, platform: sandboxMsgForm.platform, date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } setSandboxMsgForm(f => ({ ...f, channel: '', text: '' })); } }} disabled={!sandboxMsgForm.channel || !sandboxMsgForm.text} className="px-3 py-1.5 rounded-md bg-cyan-500/20 text-cyan-400 text-[11px] font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-30">{integrationKeys[sandboxMsgForm.platform] ? `Send via ${sandboxMsgForm.platform}` : 'Send (Sandbox)'}</button>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-[#555]">Messages ({sandboxMsgLog.length})</p>
                                  {sandboxMsgLog.map(msg => (
                                    <div key={msg.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 shrink-0">{msg.platform}</span>
                                        <span className="text-[10px] text-gray-400 truncate">{msg.channel}</span>
                                        <span className="text-[10px] text-[#555] truncate">{msg.text}</span>
                                      </div>
                                      <span className="text-[9px] text-[#555] shrink-0 ml-2">{msg.date}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Stripe checkout page with a pricing table using my Stripe key')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Generate a checkout page</button>
                              <button onClick={() => sendPrompt('Create a subscription pricing page with 3 tiers using Stripe')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Build a pricing page</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Sandbox CTA */}
                          <button onClick={() => setSandboxPay(true)} className="w-full p-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                              <div>
                                <p className="text-[13px] text-amber-400 font-medium group-hover:text-amber-300 transition-colors">Try Sandbox Mode</p>
                                <p className="text-[10px] text-[#555]">Explore payments dashboard + messaging with mock data</p>
                              </div>
                            </div>
                          </button>
                          {INTEGRATIONS.filter(i => i.cat === 'Payments').map(intg => (
                            <div key={intg.name} className="p-4 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><PaymentsIcon /></div>
                                  <div><p className="text-[13px] text-white font-medium">{intg.name}</p><p className="text-[11px] text-[#555]">{intg.desc}</p></div>
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
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Integrations side panel */}
            <AnimatePresence>
              {showIntegrations && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="integration-side-panel h-full border-l border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden shrink-0">
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
                                  {testResult[intg.name] && (
                                    <p className={`text-[9px] mt-0.5 ${testResult[intg.name].ok ? 'text-emerald-400' : 'text-red-400'}`}>{testResult[intg.name].msg}</p>
                                  )}
                                </div>
                                {isConnected && !intg.builtIn && INTEGRATION_ROUTE_MAP[intg.name] ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); testIntegration(intg.name); }}
                                    disabled={testingIntegration === intg.name}
                                    className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition-colors shrink-0 disabled:opacity-50"
                                  >
                                    {testingIntegration === intg.name ? '...' : 'Test'}
                                  </button>
                                ) : isConnected ? (
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
                {runtimeErrors.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">{runtimeErrors.length} error{runtimeErrors.length > 1 ? 's' : ''}</span>}
              </div>
              <div className="flex items-center gap-2">
                {/* Auto-Fix toggle */}
                <div onClick={(e) => { e.stopPropagation(); setAutoFixEnabled(!autoFixEnabled); }} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors cursor-pointer ${autoFixEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a1a] text-[#555] hover:text-[#888]'}`} title="Auto-fix runtime errors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  Auto-Fix {autoFixEnabled ? 'ON' : 'OFF'}
                </div>
                {runtimeErrors.length > 0 && <div onClick={(e) => { e.stopPropagation(); setRuntimeErrors([]); }} className="text-[9px] text-[#555] hover:text-white cursor-pointer px-1">Clear</div>}
                {showTerminal ? <ChevronDownIcon /> : <ChevronUpIcon />}
                <PlusIcon />
              </div>
            </button>
            {showTerminal && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Error panel — shows clickable runtime errors with Fix button */}
                {runtimeErrors.length > 0 && (
                  <div className="border-b border-[#1a1a1a] px-4 py-1.5 max-h-[120px] overflow-y-auto">
                    {runtimeErrors.slice(-5).map((err, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 group">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span className="text-[10px] text-red-400/90 flex-1 font-mono leading-4 break-all">{err.message}{err.line ? <span className="text-[#555]"> :L{err.line}</span> : ''}</span>
                        <button
                          onClick={() => fixRuntimeError(err)}
                          disabled={isStreaming}
                          className="shrink-0 text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
                        >
                          Fix
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex-1 overflow-auto px-4 pb-1 font-mono text-[11px] text-[#888]" onClick={() => terminalInputRef.current?.focus()}>
                  {terminalLines.map((line, i) => (
                    <div key={i} className={`leading-5 ${line.startsWith('$') ? 'text-[#ccc]' : line.startsWith('command not found') ? 'text-red-400' : line.startsWith('✗') ? 'text-red-400' : ''}`}>{line}</div>
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
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const cmds = ['clear','help','ls','cat','touch','rm','mkdir','tree','pwd','whoami','date','echo','npm','git','env','node','grep','find','cp','mv','head','tail','wc','which','uptime','hostname'];
                        const match = cmds.filter(c => c.startsWith(terminalInput.trim().toLowerCase()));
                        if (match.length === 1) setTerminalInput(match[0] + ' ');
                        else if (match.length > 1) setTerminalLines(prev => [...prev, '$ ' + terminalInput, match.join('  ')]);
                      }
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
                <button disabled={!githubToken.trim() || !repoName.trim() || isGitHubPushing || Object.keys(projectFiles).length === 0} onClick={pushToGitHub} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">{isGitHubPushing ? 'Pushing...' : `Push ${Object.keys(projectFiles).length} files`}</button>
                {Object.keys(projectFiles).length === 0 && <p className="text-[10px] text-[#555] text-center mt-1">Build something first — no files to push</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Command Palette (Cmd+K) ═══ */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowCommandPalette(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={commandInputRef} value={commandQuery} onChange={(e) => { setCommandQuery(e.target.value); setCommandIdx(0); }} placeholder="Type a command..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setCommandIdx(i => Math.min(i + 1, commands.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setCommandIdx(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter' && commands.length > 0) { commands[commandIdx]?.action(); setShowCommandPalette(false); }
                }} />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">ESC</span>
              </div>
              <div className="max-h-[340px] overflow-y-auto py-1">
                {(() => {
                  let lastCat = '';
                  let flatIdx = -1;
                  return commands.map((cmd) => {
                    flatIdx++;
                    const idx = flatIdx;
                    const showCat = cmd.category !== lastCat;
                    lastCat = cmd.category;
                    return (
                      <div key={cmd.id}>
                        {showCat && <div className="px-4 pt-2 pb-1 text-[9px] font-medium text-[#555] uppercase tracking-wider">{cmd.category}</div>}
                        <button onClick={() => { cmd.action(); setShowCommandPalette(false); }} onMouseEnter={() => setCommandIdx(idx)} className={`w-full flex items-center justify-between px-4 py-2 text-[12px] transition-colors ${idx === commandIdx ? 'bg-[#222] text-white' : 'text-[#ccc] hover:bg-[#1e1e1e]'}`}>
                          <span>{cmd.label}</span>
                          {cmd.shortcut && <span className="text-[10px] text-[#555]">{cmd.shortcut}</span>}
                        </button>
                      </div>
                    );
                  });
                })()}
                {commands.length === 0 && <div className="px-4 py-3 text-[12px] text-[#555]">No matching commands</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ File Search (Cmd+P) ═══ */}
      <AnimatePresence>
        {showFileSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowFileSearch(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <input ref={fileSearchRef} value={fileSearchQuery} onChange={(e) => setFileSearchQuery(e.target.value)} placeholder="Go to file..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && fileSearchResults.length > 0) { setSelectedFile(fileSearchResults[0]); setActiveTab('code'); setShowFileSearch(false); } }} />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">⌘P</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto py-1">
                {fileSearchResults.map((f) => (
                  <button key={f} onClick={() => { setSelectedFile(f); setActiveTab('code'); setShowFileSearch(false); }} className={`w-full flex items-center gap-2 px-4 py-2 text-[12px] hover:bg-[#222] transition-colors ${f === selectedFile ? 'text-white' : 'text-[#ccc]'}`}>
                    <FileIcon size={12} />
                    <span className="truncate">{f}</span>
                    <span className="text-[9px] text-[#555] ml-auto">{projectFiles[f]?.language}</span>
                  </button>
                ))}
                {fileSearchResults.length === 0 && <div className="px-4 py-3 text-[12px] text-[#555]">No files found</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Content Search (Cmd+Shift+F) ═══ */}
      <AnimatePresence>
        {showContentSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowContentSearch(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={contentSearchRef} value={contentSearchQuery} onChange={(e) => setContentSearchQuery(e.target.value)} placeholder="Search in all files..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">⌘⇧F</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto py-1">
                {contentSearchResults.map((r, i) => (
                  <button key={i} onClick={() => { setSelectedFile(r.file); setActiveTab('code'); setShowContentSearch(false); }} className="w-full flex items-start gap-2 px-4 py-2 text-[11px] hover:bg-[#222] transition-colors text-left">
                    <div className="shrink-0 text-[#888] w-[140px] truncate">{r.file}<span className="text-[#555]">:{r.line}</span></div>
                    <div className="flex-1 text-[#ccc] truncate font-mono">{r.text}</div>
                  </button>
                ))}
                {contentSearchQuery && contentSearchResults.length === 0 && <div className="px-4 py-3 text-[12px] text-[#555]">No matches found</div>}
                {!contentSearchQuery && <div className="px-4 py-3 text-[12px] text-[#555]">Type to search across all project files</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Media Gallery ═══ */}
      <AnimatePresence>
        {showMediaGallery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowMediaGallery(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <h2 className="text-sm font-semibold text-white">Media Gallery</h2>
                  <span className="text-[10px] text-[#555] bg-[#222] px-1.5 py-0.5 rounded">{mediaAssets.length} items</span>
                </div>
                <button onClick={() => setShowMediaGallery(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {mediaAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#555]">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    <p className="text-[13px]">No media generated yet</p>
                    <p className="text-[11px] mt-1">Use /image or /video commands to generate media</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaAssets.slice().reverse().map((asset) => (
                      <div key={asset.id} className="group relative rounded-lg border border-[#2a2a2a] bg-[#111] overflow-hidden hover:border-[#444] transition-colors">
                        <div className="aspect-video bg-black flex items-center justify-center">
                          {asset.type === 'image' ? (
                            <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" />
                          ) : (
                            <video src={asset.url} className="w-full h-full object-cover" muted loop onMouseEnter={(e) => (e.target as HTMLVideoElement).play()} onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                          )}
                        </div>
                        <div className="p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${asset.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{asset.type === 'video' ? '🎬 Video' : '🖼 Image'}</span>
                            <span className="text-[9px] text-[#555]">{new Date(asset.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[10px] text-[#888] line-clamp-2">{asset.prompt}</p>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button onClick={() => { navigator.clipboard.writeText(asset.url); }} className="p-1.5 rounded bg-black/70 text-white hover:bg-black/90 transition-colors" title="Copy URL">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </button>
                          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded bg-black/70 text-white hover:bg-black/90 transition-colors" title="Open">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Templates Modal ═══ */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowTemplates(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Start from Template</h2>
                <button onClick={() => setShowTemplates(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TEMPLATES.map((t) => (
                  <button key={t.name} onClick={() => createProject(t.name, t.files)} className="p-4 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111] hover:bg-[#161616] transition-colors text-left group">
                    <div className="text-2xl mb-2">{t.icon}</div>
                    <p className="text-[13px] text-white font-medium group-hover:text-purple-300 transition-colors">{t.name}</p>
                    <p className="text-[10px] text-[#555] mt-1">{t.desc}</p>
                    <p className="text-[9px] text-[#444] mt-2">{Object.keys(t.files).length} files</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ .env Management Modal ═══ */}
      <AnimatePresence>
        {showEnvPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowEnvPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Environment Variables</h2>
                  <p className="text-[10px] text-[#555] mt-0.5">Stored in .env file in your project</p>
                </div>
                <button onClick={() => setShowEnvPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
                {envVars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={v.key} onChange={(e) => { const updated = [...envVars]; updated[i] = { ...updated[i], key: e.target.value }; setEnvVars(updated); syncEnvToVFS(updated); }} className="w-[140px] bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 outline-none focus:border-[#444] font-mono" placeholder="KEY" />
                    <span className="text-[#555] text-[11px]">=</span>
                    <input type="text" value={v.value} onChange={(e) => { const updated = [...envVars]; updated[i] = { ...updated[i], value: e.target.value }; setEnvVars(updated); syncEnvToVFS(updated); }} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 outline-none focus:border-[#444] font-mono" placeholder="value" />
                    <button onClick={() => removeEnvVar(i)} className="text-[#555] hover:text-red-400 transition-colors shrink-0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 border-t border-[#222]">
                  <input type="text" value={newEnvKey} onChange={(e) => setNewEnvKey(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addEnvVar(); }} className="w-[140px] bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 outline-none focus:border-[#444] font-mono" placeholder="NEW_KEY" />
                  <span className="text-[#555] text-[11px]">=</span>
                  <input type="text" value={newEnvValue} onChange={(e) => setNewEnvValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addEnvVar(); }} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 outline-none focus:border-[#444] font-mono" placeholder="value" />
                  <button onClick={addEnvVar} disabled={!newEnvKey.trim()} className="px-2.5 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-30">Add</button>
                </div>
                {/* Auto-populate from connected integrations */}
                {Object.keys(integrationKeys).length > 0 && (
                  <div className="pt-2 border-t border-[#222]">
                    <p className="text-[10px] text-[#555] mb-2">Auto-populate from connected integrations:</p>
                    <button onClick={() => {
                      const newVars = Object.entries(integrationKeys).map(([name, key]) => ({
                        key: name.toUpperCase().replace(/\s+/g, '_') + '_API_KEY',
                        value: key,
                      }));
                      const merged = [...envVars];
                      for (const nv of newVars) {
                        if (!merged.find(v => v.key === nv.key)) merged.push(nv);
                      }
                      setEnvVars(merged);
                      syncEnvToVFS(merged);
                    }} className="px-3 py-1.5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-medium hover:bg-purple-500/30 transition-colors">
                      Import {Object.keys(integrationKeys).length} integration key(s)
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}