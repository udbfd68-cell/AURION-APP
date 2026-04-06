/* ════════════════════════════════════════════
   Utility Functions — Aurion App Builder
   Extracted from page.tsx for cleaner architecture
   ════════════════════════════════════════════ */

export type VirtualFS = Record<string, { content: string; language: string }>;

/** Detect file language from extension */
export function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css', js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript', json: 'json', md: 'markdown',
    py: 'python', sql: 'sql', sh: 'bash', yml: 'yaml', yaml: 'yaml',
    svg: 'xml', xml: 'xml', env: 'bash', toml: 'toml',
  };
  return map[ext] || 'plaintext';
}

/** Build a file tree structure from a flat VirtualFS */
export function buildFileTree(files: VirtualFS): { dirs: Set<string>; entries: { path: string; name: string; depth: number; isDir: boolean }[] } {
  const dirs = new Set<string>();
  const allPaths = Object.keys(files).sort();
  for (const p of allPaths) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  const entries: { path: string; name: string; depth: number; isDir: boolean }[] = [];
  const sortedAll = [...Array.from(dirs), ...allPaths].sort((a, b): number => {
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

/** Detect if files contain React code */
export function detectReactCode(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\b(useState|useEffect|useRef|useCallback|useMemo|React\.|ReactDOM\.|createRoot|jsx|<\w+\s[^>]*\/?>)/i.test(f.content)) return true;
    if (f.language === 'tsx' || f.language === 'jsx') return true;
  }
  return false;
}

/** Detect if files use Tailwind CSS */
export function detectTailwindCode(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\bclassName=["'][^"']*(?:flex|grid|p-|m-|text-|bg-|rounded|border|shadow|hover:|dark:|sm:|md:|lg:)/.test(f.content)) return true;
    if (/\bclass=["'][^"']*(?:flex|grid|p-|m-|text-|bg-|rounded|border|shadow)/.test(f.content)) return true;
  }
  return false;
}

/** Detect if files use Recharts */
export function detectRechartsCode(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\b(Recharts|LineChart|BarChart|PieChart|AreaChart|ResponsiveContainer)\b/.test(f.content)) return true;
  }
  return false;
}

/** Detect if files use React Router */
export function detectReactRouter(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\b(BrowserRouter|HashRouter|Routes|Route|Link|useNavigate|useParams|useLocation|NavLink)\b/.test(f.content)) return true;
  }
  return false;
}

/** Detect if files use Framer Motion */
export function detectFramerMotion(files: VirtualFS): boolean {
  for (const f of Object.values(files)) {
    if (/\b(motion\.|AnimatePresence|useAnimation|useMotionValue|useTransform|useSpring)\b/.test(f.content)) return true;
  }
  return false;
}

/** Generate a short unique ID */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Determine which API endpoint to use for a model */
export function getApiEndpoint(_provider: string): string {
  return '/api/ollama';
}

/** Get the optimal model for the request (auto-switch to vision if images attached) */
export function getOptimalModel(currentModel: string, _text: string, hasImages: boolean): string {
  const VISION_MODELS = new Set(['gemini-3-flash', 'glm-4.7', 'glm-4.6', 'kimi-k2.5', 'qwen3.5-397b']);
  if (hasImages && !VISION_MODELS.has(currentModel)) return 'gemini-3-flash';
  return currentModel;
}
