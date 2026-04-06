import { useState, useMemo, useCallback, useEffect, useRef, RefObject } from 'react';
import type { ProjectFile } from '@/lib/client-utils';
import { idbGet, idbSet } from '@/lib/client-utils';

type PanelActions = {
  setPanel: (name: string, value: boolean) => void;
  togglePanel: (name: string) => void;
};

export function useInspectors(
  projectFiles: Record<string, ProjectFile>,
  selectedFile: string,
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
  panelActions: PanelActions,
  iframeRef: RefObject<HTMLIFrameElement | null>,
  monacoEditorRef: RefObject<any>,
  setProjectFiles: (v: Record<string, ProjectFile> | ((prev: Record<string, ProjectFile>) => Record<string, ProjectFile>)) => void,
) {
// v13: Color Palette Extractor

const extractedColors = useMemo(() => {
  const all = Object.values(projectFiles).map(f => f.content).join('\n');
  const colorSet = new Set<string>();
  // hex
  (all.match(/#(?:[0-9a-fA-F]{3,4}){1,2}\b/g) || []).forEach(c => colorSet.add(c.toLowerCase()));
  // rgb/rgba
  (all.match(/rgba?\([^)]+\)/gi) || []).forEach(c => colorSet.add(c));
  // hsl/hsla
  (all.match(/hsla?\([^)]+\)/gi) || []).forEach(c => colorSet.add(c));
  // Tailwind color classes
  const twColors: Record<string, string> = { 'red-500': '#ef4444', 'blue-500': '#3b82f6', 'green-500': '#22c55e', 'yellow-500': '#eab308', 'purple-500': '#a855f7', 'pink-500': '#ec4899', 'indigo-500': '#6366f1', 'gray-500': '#6b7280', 'gray-900': '#111827', 'gray-100': '#f3f4f6', 'white': '#ffffff', 'black': '#000000', 'emerald-500': '#10b981', 'orange-500': '#f97316', 'cyan-500': '#06b6d4', 'teal-500': '#14b8a6' };
  Object.entries(twColors).forEach(([name, hex]) => { if (all.includes(name)) colorSet.add(hex); });
  return Array.from(colorSet).slice(0, 50);
}, [projectFiles]);

// v13: Performance Audit

const [perfIssues, setPerfIssues] = useState<{ type: 'error' | 'warning' | 'info'; message: string; detail: string }[]>([]);
const runPerfAudit = useCallback(() => {
  const issues: { type: 'error' | 'warning' | 'info'; message: string; detail: string }[] = [];
  const html = Object.values(projectFiles).map(f => f.content).join('\n');
  const totalSize = new Blob([html]).size;
  // Large page
  if (totalSize > 500000) issues.push({ type: 'error', message: 'Page size exceeds 500KB', detail: `Total: ${(totalSize/1024).toFixed(0)}KB — consider code splitting` });
  else if (totalSize > 200000) issues.push({ type: 'warning', message: 'Page size is over 200KB', detail: `Total: ${(totalSize/1024).toFixed(0)}KB` });
  // Inline styles
  const inlineStyles = (html.match(/style="[^"]{100,}"/gi) || []).length;
  if (inlineStyles > 0) issues.push({ type: 'warning', message: `${inlineStyles} element(s) with large inline styles (>100 chars)`, detail: 'Move styles to CSS classes for better caching' });
  // Images without lazy loading
  const imgsNoLazy = html.match(/<img(?![^>]*loading=)[^>]*>/gi);
  if (imgsNoLazy && imgsNoLazy.length > 2) issues.push({ type: 'warning', message: `${imgsNoLazy.length} images without lazy loading`, detail: 'Add loading="lazy" to below-fold images' });
  // Images without dimensions
  const imgsNoDim = html.match(/<img(?![^>]*(?:width|w-))[^>]*>/gi);
  if (imgsNoDim && imgsNoDim.length > 0) issues.push({ type: 'info', message: `${imgsNoDim.length} images without explicit dimensions`, detail: 'Set width/height to prevent layout shift (CLS)' });
  // Too many scripts
  const scripts = (html.match(/<script/gi) || []).length;
  if (scripts > 10) issues.push({ type: 'warning', message: `${scripts} <script> tags detected`, detail: 'Consider bundling scripts to reduce HTTP requests' });
  // Render-blocking CSS
  const linkCSS = (html.match(/<link[^>]*stylesheet[^>]*>/gi) || []).length;
  if (linkCSS > 5) issues.push({ type: 'info', message: `${linkCSS} external stylesheets`, detail: 'Consider inlining critical CSS' });
  // DOM depth estimate
  const divCount = (html.match(/<div/gi) || []).length;
  if (divCount > 200) issues.push({ type: 'warning', message: `High DOM complexity: ${divCount} <div> elements`, detail: 'Reduce nesting for better rendering performance' });
  // No compression hints
  if (html.includes('base64') && html.length > 100000) issues.push({ type: 'info', message: 'Large base64-encoded assets detected', detail: 'Use external files for better caching' });
  // Score
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warnCount = issues.filter(i => i.type === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 20 - warnCount * 10 - issues.filter(i => i.type === 'info').length * 3);
  if (issues.length === 0) issues.push({ type: 'info', message: 'No performance issues detected!', detail: 'Score: 100/100' });
  else issues.unshift({ type: score >= 80 ? 'info' : score >= 50 ? 'warning' : 'error', message: `Performance Score: ${score}/100`, detail: `${errorCount} errors, ${warnCount} warnings` });
  setPerfIssues(issues);
  panelActions.setPanel('showPerfPanel', true);
  showToast(`Perf audit: score ${score}/100`, score >= 80 ? 'success' : score >= 50 ? 'info' : 'error');
}, [projectFiles, showToast]);

// v13: Project Stats

const projectStats = useMemo(() => {
  const files = Object.entries(projectFiles);
  const langMap: Record<string, { files: number; lines: number; bytes: number }> = {};
  let totalLines = 0, totalBytes = 0;
  files.forEach(([, f]) => {
    const lang = f.language || 'plaintext';
    const lines = f.content.split('\n').length;
    const bytes = new Blob([f.content]).size;
    totalLines += lines;
    totalBytes += bytes;
    if (!langMap[lang]) langMap[lang] = { files: 0, lines: 0, bytes: 0 };
    langMap[lang].files++;
    langMap[lang].lines += lines;
    langMap[lang].bytes += bytes;
  });
  return { total: files.length, totalLines, totalBytes, languages: Object.entries(langMap).sort((a, b) => b[1].lines - a[1].lines) };
}, [projectFiles]);

// v13: CSS Variables Manager

const cssVariables = useMemo(() => {
  const vars: { name: string; value: string; file: string }[] = [];
  Object.entries(projectFiles).forEach(([path, f]) => {
    const matches = f.content.matchAll(/--([\w-]+)\s*:\s*([^;]+)/g);
    for (const m of matches) vars.push({ name: `--${m[1]}`, value: m[2].trim(), file: path });
  });
  return vars;
}, [projectFiles]);

// v13: Console capture from preview
const [consoleLogs, setConsoleLogs] = useState<{ type: string; message: string; ts: number }[]>([]);


// v14: Dependency Inspector

const detectedDeps = useMemo(() => {
  const html = Object.values(projectFiles).map(f => f.content).join('\n');
  const deps: { name: string; version: string; url: string; type: string }[] = [];
  const cdnPatterns: [RegExp, string, string][] = [
    [/react@([\d.]+)/i, 'React', 'UI Library'],
    [/react-dom@([\d.]+)/i, 'ReactDOM', 'UI Library'],
    [/tailwindcss[/@]([\d.]+)/i, 'Tailwind CSS', 'CSS Framework'],
    [/lucide[/@]([\d.]+)/i, 'Lucide Icons', 'Icons'],
    [/recharts[/@]([\d.]+)/i, 'Recharts', 'Charts'],
    [/framer-motion[/@]([\d.]+)/i, 'Framer Motion', 'Animation'],
    [/react-router[/@]([\d.]+)/i, 'React Router', 'Routing'],
    [/three[/@]([\d.]+)/i, 'Three.js', '3D Graphics'],
    [/chart\.js[/@]([\d.]+)/i, 'Chart.js', 'Charts'],
    [/gsap[/@]([\d.]+)/i, 'GSAP', 'Animation'],
    [/axios[/@]([\d.]+)/i, 'Axios', 'HTTP Client'],
    [/lodash[/@]([\d.]+)/i, 'Lodash', 'Utility'],
  ];
  cdnPatterns.forEach(([regex, name, type]) => {
    const m = html.match(regex);
    if (m) deps.push({ name, version: m[1], url: `https://www.npmjs.com/package/${name.toLowerCase().replace(/\s+/g, '-')}`, type });
  });
  // Detect without version
  if (html.includes('tailwindcss') && !deps.find(d => d.name === 'Tailwind CSS')) deps.push({ name: 'Tailwind CSS', version: 'latest', url: 'https://tailwindcss.com', type: 'CSS Framework' });
  if (html.includes('font-awesome') || html.includes('fontawesome')) deps.push({ name: 'Font Awesome', version: 'detected', url: 'https://fontawesome.com', type: 'Icons' });
  if (html.includes('bootstrap') && !html.includes('tailwind')) deps.push({ name: 'Bootstrap', version: 'detected', url: 'https://getbootstrap.com', type: 'CSS Framework' });
  return deps;
}, [projectFiles]);

// v14: Code Complexity Analyzer

const codeComplexity = useMemo(() => {
  const files = Object.entries(projectFiles);
  const results: { file: string; lines: number; functions: number; maxDepth: number; complexity: string }[] = [];
  files.forEach(([path, f]) => {
    const content = f.content;
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s|=>|\bclass\s/g) || []).length;
    let maxDepth = 0, depth = 0;
    for (const ch of content) { if (ch === '{') { depth++; maxDepth = Math.max(maxDepth, depth); } else if (ch === '}') depth--; }
    const score = functions * 2 + maxDepth * 3 + Math.floor(lines / 50);
    results.push({ file: path, lines, functions, maxDepth, complexity: score > 30 ? 'High' : score > 15 ? 'Medium' : 'Low' });
  });
  return results.sort((a, b) => b.functions - a.functions);
}, [projectFiles]);

// v14: Responsive Split Preview


// v15: Code Outline / Symbol Navigator

const codeSymbols = useMemo(() => {
  if (!selectedFile || !projectFiles[selectedFile]) return [];
  const content = projectFiles[selectedFile].content;
  const symbols: { name: string; type: string; line: number }[] = [];
  content.split('\n').forEach((ln, i) => {
    const fnMatch = ln.match(/(?:function|const|let|var)\s+(\w+)/);
    if (fnMatch && (ln.includes('=>') || ln.includes('function'))) symbols.push({ name: fnMatch[1], type: 'function', line: i + 1 });
    const classMatch = ln.match(/class\s+(\w+)/);
    if (classMatch) symbols.push({ name: classMatch[1], type: 'class', line: i + 1 });
    const tagMatch = ln.match(/<(\w+)[\s>]/);
    if (tagMatch && /^[A-Z]/.test(tagMatch[1])) symbols.push({ name: `<${tagMatch[1]}>`, type: 'component', line: i + 1 });
    const idMatch = ln.match(/id=["'](\w+)["']/);
    if (idMatch) symbols.push({ name: `#${idMatch[1]}`, type: 'id', line: i + 1 });
  });
  return symbols;
}, [selectedFile, projectFiles]);

// v15: Image Optimizer Panel

const imageAssets = useMemo(() => {
  const assets: { file: string; count: number; totalSize: number; images: { src: string; sizeKB: number }[] }[] = [];
  Object.entries(projectFiles).forEach(([path, f]) => {
    const dataMatches = f.content.match(/data:image\/[^"'\s]+/g) || [];
    if (dataMatches.length > 0) {
      const images = dataMatches.map(src => ({ src: src.slice(0, 60) + '...', sizeKB: Math.round(src.length * 0.75 / 1024) }));
      const totalSize = images.reduce((a, b) => a + b.sizeKB, 0);
      assets.push({ file: path, count: images.length, totalSize, images });
    }
  });
  return assets;
}, [projectFiles]);

// v15: Code Diff Stats


// v15: Network / API Calls Panel

const networkCalls = useMemo(() => {
  const calls: { file: string; line: number; method: string; url: string }[] = [];
  Object.entries(projectFiles).forEach(([path, f]) => {
    f.content.split('\n').forEach((ln, i) => {
      const fetchMatch = ln.match(/fetch\(['"`]([^'"`]+)['"`]/);
      if (fetchMatch) calls.push({ file: path, line: i + 1, method: 'fetch', url: fetchMatch[1] });
      const axiosMatch = ln.match(/axios\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/);
      if (axiosMatch) calls.push({ file: path, line: i + 1, method: `axios.${axiosMatch[1]}`, url: axiosMatch[2] });
      const xhrMatch = ln.match(/\.open\(['"`](GET|POST|PUT|DELETE)['"`],\s*['"`]([^'"`]+)['"`]/);
      if (xhrMatch) calls.push({ file: path, line: i + 1, method: xhrMatch[1], url: xhrMatch[2] });
    });
  });
  return calls;
}, [projectFiles]);

// v15: Export Single HTML
const exportSingleHtml = useCallback(() => {
  const html = projectFiles['index.html']?.content || '';
  if (!html) { showToast('No index.html found', 'error'); return; }
  let result = html;
  // Inline CSS files
  Object.entries(projectFiles).forEach(([path, f]) => {
    if (path.endsWith('.css')) {
      const linkRegex = new RegExp(`<link[^>]*href=['"]${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^>]*/?>`, 'gi');
      result = result.replace(linkRegex, `<style>${f.content}</style>`);
      if (!linkRegex.test(html)) result = result.replace('</head>', `<style>/* ${path} */\n${f.content}</style>\n</head>`);
    }
  });
  // Inline JS files
  Object.entries(projectFiles).forEach(([path, f]) => {
    if (path.endsWith('.js') || path.endsWith('.ts')) {
      const scriptRegex = new RegExp(`<script[^>]*src=['"]${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^>]*>\\s*</script>`, 'gi');
      result = result.replace(scriptRegex, `<script>/* ${path} */\n${f.content}</script>`);
    }
  });
  const blob = new Blob([result], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'export.html'; a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported single HTML (${(result.length / 1024).toFixed(1)}KB)`, 'success');
}, [projectFiles, showToast]);

// v15: Responsive Breakpoint Tester
const [breakpointTestActive, setBreakpointTestActive] = useState(false);
const [breakpointTestIdx, setBreakpointTestIdx] = useState(0);
const BREAKPOINT_SIZES = useMemo(() => [
  { name: 'iPhone SE', w: 320 },
  { name: 'iPhone 14', w: 375 },
  { name: 'iPad Mini', w: 768 },
  { name: 'Laptop', w: 1024 },
  { name: 'Desktop', w: 1440 },
], []);
useEffect(() => {
  if (!breakpointTestActive) return;
  const timer = setInterval(() => {
    setBreakpointTestIdx(prev => (prev + 1) % 5);
  }, 3000);
  return () => clearInterval(timer);
}, [breakpointTestActive]);

// v14: HTML Minifier
const minifyProject = useCallback(() => {
  const minified = { ...projectFiles };
  let saved = 0;
  Object.entries(minified).forEach(([path, f]) => {
    const orig = f.content.length;
    let c = f.content;
    if (path.endsWith('.html') || path.endsWith('.htm')) {
      c = c.replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*\n/g, '\n').replace(/^\s+/gm, '').replace(/\s{2,}/g, ' ');
    } else if (path.endsWith('.css')) {
      c = c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n').replace(/\s*([{:;,}])\s*/g, '$1').replace(/^\s+/gm, '');
    } else if (path.endsWith('.js') || path.endsWith('.ts')) {
      c = c.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n');
    }
    saved += orig - c.length;
    minified[path] = { ...f, content: c };
  });
  setProjectFiles(minified);
  showToast(`Minified: saved ${(saved / 1024).toFixed(1)}KB`, 'success');
}, [projectFiles, showToast]);

// v16: HTML Validator

const htmlErrors = useMemo(() => {
  const html = projectFiles['index.html']?.content || '';
  if (!html) return [];
  const errors: { type: string; message: string; line: number }[] = [];
  const lines = html.split('\n');
  // Check doctype
  if (!html.trim().toLowerCase().startsWith('<!doctype')) errors.push({ type: 'warning', message: 'Missing <!DOCTYPE html> declaration', line: 1 });
  // Check duplicate IDs
  const idMap = new Map<string, number[]>();
  lines.forEach((ln, i) => {
    const ids = [...ln.matchAll(/id=["'](\w+)["']/g)];
    ids.forEach(m => { const arr = idMap.get(m[1]) || []; arr.push(i + 1); idMap.set(m[1], arr); });
  });
  idMap.forEach((lns, id) => { if (lns.length > 1) errors.push({ type: 'error', message: `Duplicate id="${id}" on lines ${lns.join(', ')}`, line: lns[0] }); });
  // Check unclosed tags
  const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const stack: { tag: string; line: number }[] = [];
  lines.forEach((ln, i) => {
    const opens = [...ln.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)(?:\s|>)/g)];
    const closes = [...ln.matchAll(/<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g)];
    opens.forEach(m => { if (!voidTags.has(m[1].toLowerCase()) && !ln.includes('/>')) stack.push({ tag: m[1].toLowerCase(), line: i + 1 }); });
    closes.forEach(m => { const idx = stack.findLastIndex(s => s.tag === m[1].toLowerCase()); if (idx >= 0) stack.splice(idx, 1); else errors.push({ type: 'error', message: `Extra closing </${m[1]}> without matching open tag`, line: i + 1 }); });
  });
  stack.forEach(s => errors.push({ type: 'error', message: `Unclosed <${s.tag}> tag`, line: s.line }));
  // Missing lang attribute
  if (html.includes('<html') && !html.match(/<html[^>]*lang=/)) errors.push({ type: 'warning', message: 'Missing lang attribute on <html>', line: 1 });
  // Missing charset
  if (!html.includes('charset')) errors.push({ type: 'warning', message: 'Missing charset meta tag', line: 1 });
  if (errors.length === 0) errors.push({ type: 'success', message: 'No HTML issues found!', line: 0 });
  return errors;
}, [projectFiles]);

// v16: Font Inspector

const detectedFonts = useMemo(() => {
  const allContent = Object.values(projectFiles).map(f => f.content).join('\n');
  const fonts: { name: string; source: string; type: string }[] = [];
  // Google Fonts
  const googleFonts = [...allContent.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&\s]+)/g)];
  googleFonts.forEach(m => { const name = decodeURIComponent(m[1]).replace(/\+/g, ' ').split(':')[0]; if (!fonts.find(f => f.name === name)) fonts.push({ name, source: 'Google Fonts', type: 'Web' }); });
  // @font-face
  const fontFaces = [...allContent.matchAll(/@font-face[^}]*font-family:\s*["']?([^"';]+)/g)];
  fontFaces.forEach(m => { if (!fonts.find(f => f.name === m[1].trim())) fonts.push({ name: m[1].trim(), source: '@font-face', type: 'Custom' }); });
  // font-family declarations
  const fontFamilies = [...allContent.matchAll(/font-family:\s*["']?([^"';,}]+)/g)];
  fontFamilies.forEach(m => {
    const name = m[1].trim();
    if (!fonts.find(f => f.name === name) && !['inherit', 'initial', 'unset', 'revert'].includes(name.toLowerCase()))
      fonts.push({ name, source: 'CSS', type: /mono|code|courier/i.test(name) ? 'Monospace' : /serif/i.test(name) ? 'Serif' : 'Sans-serif' });
  });
  return fonts;
}, [projectFiles]);

// v16: Code Snippets Manager

const [savedSnippets, setSavedSnippets] = useState<{ id: string; name: string; code: string; language: string }[]>([]);
// Load snippets from IDB on mount
useEffect(() => {
  idbGet('aurion-snippets').then(data => { if (Array.isArray(data)) setSavedSnippets(data as typeof savedSnippets); });
}, []);
const saveSnippet = useCallback((name: string, code: string) => {
  const snippet = { id: Date.now().toString(), name, code, language: selectedFile?.split('.').pop() || 'text' };
  setSavedSnippets(prev => { const next = [...prev, snippet]; idbSet('aurion-snippets', next); return next; });
  showToast(`Snippet "${name}" saved`, 'success');
}, [selectedFile, showToast]);
const deleteSnippet = useCallback((id: string) => {
  setSavedSnippets(prev => { const next = prev.filter(s => s.id !== id); idbSet('aurion-snippets', next); return next; });
}, []);
const insertSnippet = useCallback((code: string) => {
  if (!selectedFile || !projectFiles[selectedFile]) return;
  const content = projectFiles[selectedFile].content;
  setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: content + '\n' + code } }));
  panelActions.setPanel('showSnippetsPanel', false);
  showToast('Snippet inserted', 'success');
}, [selectedFile, projectFiles, showToast]);

// v16: Layout Debugger (outline all elements in preview)
const [layoutDebugActive, setLayoutDebugActive] = useState(false);

// v16: Preview Dark/Light Mode Toggle
const [previewDarkMode, setPreviewDarkMode] = useState<'auto' | 'dark' | 'light'>('auto');

// v16: File Size Treemap

const fileSizeTreemap = useMemo(() => {
  const totalBytes = Object.values(projectFiles).reduce((a, f) => a + f.content.length, 0);
  return Object.entries(projectFiles).map(([path, f]) => ({
    path, bytes: f.content.length, pct: totalBytes > 0 ? (f.content.length / totalBytes * 100) : 0,
    color: path.endsWith('.html') ? '#e34c26' : path.endsWith('.css') ? '#563d7c' : path.endsWith('.js') || path.endsWith('.jsx') ? '#f7df1e' : path.endsWith('.ts') || path.endsWith('.tsx') ? '#3178c6' : '#555',
  })).sort((a, b) => b.bytes - a.bytes);
}, [projectFiles]);

// v17: Unused CSS Detector

const unusedCssSelectors = useMemo(() => {
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
  const cssFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.css'));
  if (!htmlFile || !cssFile) return [];
  const htmlContent = htmlFile[1].content;
  const cssContent = cssFile[1].content;
  const selectorRegex = /([^{}@\n][^{]*?)\s*\{/g;
  const results: { selector: string; line: number }[] = [];
  let m;
  while ((m = selectorRegex.exec(cssContent)) !== null) {
    const sel = m[1].trim();
    if (!sel || sel.startsWith('@') || sel.startsWith('from') || sel.startsWith('to') || sel.startsWith('/*') || /^\d+%$/.test(sel)) continue;
    const parts = sel.split(',').map(s => s.trim());
    for (const part of parts) {
      const clean = part.replace(/:hover|:focus|:active|:visited|:first-child|:last-child|:nth-child\([^)]*\)|::before|::after|::placeholder/g, '').trim();
      if (!clean || clean === '*' || clean === 'html' || clean === 'body') continue;
      const tagMatch = clean.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
      const classMatch = clean.match(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/);
      const idMatch = clean.match(/#([a-zA-Z_-][a-zA-Z0-9_-]*)/);
      let found = false;
      if (idMatch && htmlContent.includes(`id="${idMatch[1]}"`)) found = true;
      if (!found && classMatch && (htmlContent.includes(`class="${classMatch[1]}"`) || htmlContent.includes(`class="${classMatch[1]} `) || htmlContent.includes(` ${classMatch[1]}"`) || htmlContent.includes(` ${classMatch[1]} `))) found = true;
      if (!found && tagMatch && !classMatch && !idMatch && new RegExp(`<${tagMatch[1]}[\\s>]`, 'i').test(htmlContent)) found = true;
      if (!found) {
        const line = cssContent.substring(0, m.index).split('\n').length;
        results.push({ selector: part, line });
      }
    }
  }
  return results.slice(0, 100);
}, [projectFiles]);

// v17: Link Checker

const brokenLinks = useMemo(() => {
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
  if (!htmlFile) return [];
  const html = htmlFile[1].content;
  const results: { href: string; type: string; reason: string; line: number }[] = [];
  const linkRegex = /href=["']([^"']*)["']/g;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1];
    const line = html.substring(0, m.index).split('\n').length;
    if (href.startsWith('#')) {
      const anchor = href.slice(1);
      if (anchor && !html.includes(`id="${anchor}"`) && !html.includes(`name="${anchor}"`)) {
        results.push({ href, type: 'anchor', reason: `Anchor #${anchor} not found`, line });
      }
    } else if (href.startsWith('/') || (!href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:'))) {
      const target = href.split('?')[0].split('#')[0];
      if (target && !projectFiles[target] && !projectFiles[target.replace(/^\//, '')]) {
        results.push({ href, type: 'internal', reason: 'File not found in project', line });
      }
    } else if (!href || href === '#') {
      results.push({ href: href || '(empty)', type: 'empty', reason: 'Empty or placeholder href', line });
    }
  }
  return results.slice(0, 50);
}, [projectFiles]);

// v17: DOM Tree Viewer

const domTree = useMemo(() => {
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
  if (!htmlFile) return [];
  const html = htmlFile[1].content;
  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\/?>|<!--[\s\S]*?-->/g;
  const tree: { tag: string; depth: number; attrs: string; selfClose: boolean }[] = [];
  let depth = 0;
  const selfClosing = new Set(['br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr']);
  let m;
  while ((m = tagRegex.exec(html)) !== null) {
    if (m[0].startsWith('<!--')) continue;
    const isClose = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrs = (m[3] || '').trim().slice(0, 80);
    const isSelf = selfClosing.has(tag) || m[0].endsWith('/>');
    if (isClose) { depth = Math.max(0, depth - 1); continue; }
    tree.push({ tag, depth, attrs, selfClose: isSelf });
    if (!isSelf) depth++;
  }
  return tree.slice(0, 300);
}, [projectFiles]);

// v17: Meta Tag Editor

const metaTags = useMemo(() => {
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
  if (!htmlFile) return [];
  const html = htmlFile[1].content;
  const tags: { type: string; name: string; content: string }[] = [];
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) tags.push({ type: 'title', name: 'title', content: titleMatch[1] });
  const metaRegex = /<meta\s+([^>]*)>/gi;
  let m;
  while ((m = metaRegex.exec(html)) !== null) {
    const attrs = m[1];
    const nameMatch = attrs.match(/(?:name|property)=["']([^"']*)["']/i);
    const contentMatch = attrs.match(/content=["']([^"']*)["']/i);
    const charsetMatch = attrs.match(/charset=["']([^"']*)["']/i);
    if (nameMatch && contentMatch) tags.push({ type: 'meta', name: nameMatch[1], content: contentMatch[1] });
    else if (charsetMatch) tags.push({ type: 'charset', name: 'charset', content: charsetMatch[1] });
  }
  return tags;
}, [projectFiles]);

// v17: Code Formatter
const formatCode = useCallback(() => {
  if (!selectedFile) return;
  const file = projectFiles[selectedFile];
  if (!file) return;
  let content = file.content;
  const ext = selectedFile.split('.').pop() || '';
  if (['html', 'htm'].includes(ext)) {
    const lines = content.replace(/></g, '>\n<').split('\n');
    let indent = 0;
    const sc = new Set(['br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr','!doctype']);
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      const isClose = trimmed.startsWith('</') && !trimmed.includes('><');
      if (isClose) indent = Math.max(0, indent - 1);
      const result = '  '.repeat(indent) + trimmed;
      const openMatch = trimmed.match(/^<([a-zA-Z!][a-zA-Z0-9]*)/);
      if (openMatch && !isClose && !sc.has(openMatch[1].toLowerCase()) && !trimmed.endsWith('/>') && !trimmed.includes('</')) indent++;
      return result;
    }).filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));
    content = formatted.join('\n');
  } else if (['css'].includes(ext)) {
    content = content.replace(/\{/g, ' {\n  ').replace(/;/g, ';\n  ').replace(/\}/g, '\n}\n').replace(/  \n}/g, '\n}').replace(/\n\n+/g, '\n\n');
  } else if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
    content = content.replace(/;(?!\n)/g, ';\n').replace(/\{(?!\n)/g, '{\n').replace(/\}(?!\n)/g, '}\n');
  }
  setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content } }));
  showToast('Code formatted', 'success');
}, [selectedFile, projectFiles, setProjectFiles, showToast]);

// v17: Shortcuts Reference


// v18: CSS Grid/Flex Visualizer
const [gridFlexDebugActive, setGridFlexDebugActive] = useState(false);

// v18: Bookmark Lines
const [bookmarkedLines, setBookmarkedLines] = useState<number[]>([]);
const toggleBookmark = useCallback((line?: number) => {
  const l = line ?? (monacoEditorRef.current as any)?.getPosition?.()?.lineNumber;
  if (!l) return;
  setBookmarkedLines(prev => prev.includes(l) ? prev.filter(b => b !== l) : [...prev, l].sort((a, b) => a - b));
}, []);
const jumpToBookmark = useCallback((line: number) => {
  const ed = monacoEditorRef.current as any;
  if (ed) { ed.revealLineInCenter(line); ed.setPosition({ lineNumber: line, column: 1 }); ed.focus(); }
}, []);

// v18: Color Contrast Checker

const contrastIssues = useMemo(() => {
  const cssFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.css'));
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
  const allContent = (cssFile?.[1]?.content || '') + (htmlFile?.[1]?.content || '');
  const colorPairs: { fg: string; bg: string; selector: string }[] = [];
  const blockRegex = /([^{}]+)\{([^}]+)\}/g;
  let m;
  while ((m = blockRegex.exec(allContent)) !== null) {
    const sel = m[1].trim();
    const body = m[2];
    const colorM = body.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
    const bgM = body.match(/background(?:-color)?\s*:\s*([^;]+)/i);
    if (colorM && bgM) colorPairs.push({ fg: colorM[1].trim(), bg: bgM[1].trim(), selector: sel });
  }
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
    if (h.length === 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    return null;
  };
  const namedColors: Record<string, string> = { white: '#ffffff', black: '#000000', red: '#ff0000', blue: '#0000ff', green: '#008000', gray: '#808080', grey: '#808080', yellow: '#ffff00', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', transparent: '#ffffff' };
  const toHex = (c: string) => namedColors[c.toLowerCase()] || (c.startsWith('#') ? c : null);
  const luminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  const results: { selector: string; fg: string; bg: string; ratio: number; aaPass: boolean; aaaPass: boolean }[] = [];
  for (const pair of colorPairs) {
    const fgHex = toHex(pair.fg);
    const bgHex = toHex(pair.bg);
    if (!fgHex || !bgHex) continue;
    const fgRgb = hexToRgb(fgHex);
    const bgRgb = hexToRgb(bgHex);
    if (!fgRgb || !bgRgb) continue;
    const l1 = luminance(fgRgb[0], fgRgb[1], fgRgb[2]);
    const l2 = luminance(bgRgb[0], bgRgb[1], bgRgb[2]);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    results.push({ selector: pair.selector.slice(0, 60), fg: pair.fg, bg: pair.bg, ratio: Math.round(ratio * 100) / 100, aaPass: ratio >= 4.5, aaaPass: ratio >= 7 });
  }
  return results;
}, [projectFiles]);

// v18: Z-Index Map

const zIndexMap = useMemo(() => {
  const results: { selector: string; value: number; file: string }[] = [];
  for (const [path, file] of Object.entries(projectFiles)) {
    const blockRegex = /([^{}]+)\{([^}]+)\}/g;
    let m;
    while ((m = blockRegex.exec(file.content)) !== null) {
      const sel = m[1].trim();
      const zM = m[2].match(/z-index\s*:\s*(-?\d+)/i);
      if (zM) results.push({ selector: sel.slice(0, 60), value: parseInt(zM[1]), file: path });
    }
    const inlineRegex = /style=["'][^"']*z-index\s*:\s*(-?\d+)/gi;
    let im;
    while ((im = inlineRegex.exec(file.content)) !== null) {
      results.push({ selector: '(inline style)', value: parseInt(im[1]), file: path });
    }
  }
  return results.sort((a, b) => b.value - a.value).slice(0, 50);
}, [projectFiles]);

// v18: Todo/Fixme Scanner

const todoComments = useMemo(() => {
  const results: { text: string; type: string; file: string; line: number }[] = [];
  for (const [path, file] of Object.entries(projectFiles)) {
    const lines = file.content.split('\n');
    lines.forEach((l, i) => {
      const m = l.match(/\/\/\s*(TODO|FIXME|HACK|NOTE|BUG|XXX|OPTIMIZE)\b[:\s]*(.*)/i) || l.match(/\/\*\s*(TODO|FIXME|HACK|NOTE|BUG|XXX|OPTIMIZE)\b[:\s]*(.*?)\*\//i) || l.match(/<!--\s*(TODO|FIXME|HACK|NOTE|BUG|XXX|OPTIMIZE)\b[:\s]*(.*?)-->/i);
      if (m) results.push({ text: m[2].trim() || m[1], type: m[1].toUpperCase(), file: path, line: i + 1 });
    });
  }
  return results.slice(0, 100);
}, [projectFiles]);

// v18: Copy Preview as Image
const copyPreviewAsImage = useCallback(async () => {
  if (!iframeRef.current) return;
  try {
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    if (!doc) { showToast('Cannot access iframe content', 'error'); return; }
    const canvas = document.createElement('canvas');
    const rect = iframe.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${new XMLSerializer().serializeToString(doc.documentElement)}</div></foreignObject></svg>`;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showToast('Preview copied as image!', 'success');
        }
      }, 'image/png');
    };
    img.onerror = () => showToast('Screenshot failed — CORS restriction', 'error');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
  } catch { showToast('Screenshot failed', 'error'); }
}, [showToast]);

// v19: Regex Tester

const [regexInput, setRegexInput] = useState('');
const [regexTestStr, setRegexTestStr] = useState('');
const regexMatches = useMemo(() => {
  if (!regexInput || !regexTestStr) return [];
  try {
    const re = new RegExp(regexInput, 'g');
    const matches: { match: string; index: number; groups: string[] }[] = [];
    let m;
    let safety = 0;
    while ((m = re.exec(regexTestStr)) !== null && safety++ < 200) {
      matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
      if (!m[0]) re.lastIndex++;
    }
    return matches;
  } catch { return []; }
}, [regexInput, regexTestStr]);

// v19: CSS Specificity Calculator

const cssSpecificity = useMemo(() => {
  const cssFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.css'));
  if (!cssFile) return [];
  const selectorRegex = /([^{}@\n][^{]*?)\s*\{/g;
  const results: { selector: string; specificity: [number, number, number]; score: number }[] = [];
  let m;
  while ((m = selectorRegex.exec(cssFile[1].content)) !== null) {
    const sel = m[1].trim();
    if (!sel || sel.startsWith('@') || sel.startsWith('from') || sel.startsWith('to') || /^\d+%$/.test(sel)) continue;
    const ids = (sel.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).length;
    const classes = (sel.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).length + (sel.match(/\[[^\]]+\]/g) || []).length + (sel.match(/:[a-zA-Z-]+/g) || []).filter(p => !p.startsWith('::') && p !== ':not' && p !== ':is' && p !== ':where').length;
    const elements = (sel.match(/(?:^|[\s>+~])([a-zA-Z][a-zA-Z0-9]*)/g) || []).length + (sel.match(/::[a-zA-Z-]+/g) || []).length;
    results.push({ selector: sel.slice(0, 80), specificity: [ids, classes, elements], score: ids * 100 + classes * 10 + elements });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 80);
}, [projectFiles]);

// v19: Image Lazy Loading Checker

const lazyImgIssues = useMemo(() => {
  const results: { src: string; file: string; line: number; hasLazy: boolean; hasAlt: boolean; hasWidth: boolean }[] = [];
  for (const [path, file] of Object.entries(projectFiles)) {
    const imgRegex = /<img\s([^>]*)>/gi;
    let m;
    while ((m = imgRegex.exec(file.content)) !== null) {
      const attrs = m[1];
      const src = attrs.match(/src=["']([^"']*)["']/i)?.[1] || '(no src)';
      const line = file.content.substring(0, m.index).split('\n').length;
      results.push({
        src: src.slice(0, 60), file: path, line,
        hasLazy: /loading=["']lazy["']/i.test(attrs),
        hasAlt: /alt=["']/i.test(attrs),
        hasWidth: /width=/i.test(attrs) && /height=/i.test(attrs),
      });
    }
  }
  return results;
}, [projectFiles]);

// v19: Text Statistics

const textStats = useMemo(() => {
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
  if (!htmlFile) return null;
  const html = htmlFile[1].content;
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  const words = textOnly.split(/\s+/).filter(w => w.length > 0);
  const sentences = textOnly.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const syllables = (word: string) => { const w = word.toLowerCase().replace(/[^a-z]/g, ''); const m = w.match(/[aeiouy]+/g); return m ? m.length : 1; };
  const totalSyllables = words.reduce((a, w) => a + syllables(w), 0);
  const fleschKincaid = words.length > 0 && sentences.length > 0 ? 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (totalSyllables / words.length) : 0;
  return {
    chars: textOnly.length, words: words.length, sentences: sentences.length, paragraphs: html.split(/<\/p>/i).length - 1,
    readingTime: Math.ceil(words.length / 200),
    readability: Math.round(Math.max(0, Math.min(100, fleschKincaid))),
    headings: (html.match(/<h[1-6][^>]*>/gi) || []).length,
    links: (html.match(/<a\s/gi) || []).length,
    images: (html.match(/<img\s/gi) || []).length,
  };
}, [projectFiles]);

// v19: Duplicate Code Detector

const duplicateBlocks = useMemo(() => {
  const results: { code: string; files: string[]; count: number }[] = [];
  const allBlocks: Map<string, string[]> = new Map();
  for (const [path, file] of Object.entries(projectFiles)) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length - 2; i++) {
      const block = lines.slice(i, i + 3).map(l => l.trim()).join('\n');
      if (block.length < 30 || block.replace(/\s/g, '').length < 15) continue;
      const existing = allBlocks.get(block) || [];
      if (!existing.includes(path)) existing.push(path);
      allBlocks.set(block, existing);
    }
  }
  for (const [code, files] of allBlocks) {
    if (files.length > 1 || Array.from(allBlocks.values()).filter(f => f.includes(files[0])).length > 2) {
      const count = Array.from(allBlocks.entries()).filter(([c]) => c === code).length;
      if (files.length > 1) results.push({ code: code.slice(0, 150), files, count: files.length });
    }
  }
  return results.sort((a, b) => b.count - a.count).slice(0, 30);
}, [projectFiles]);

// v19: Element Counter

const elementCounts = useMemo(() => {
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
  if (!htmlFile) return null;
  const html = htmlFile[1].content;
  const tagCounts: Record<string, number> = {};
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9]*)(?:\s|>|\/)/g;
  let m;
  while ((m = tagRegex.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  const classes = new Set((html.match(/class=["']([^"']*)["']/g) || []).flatMap(c => c.replace(/class=["']/,'').replace(/["']$/,'').split(/\s+/)));
  const ids = new Set((html.match(/id=["']([^"']*)["']/g) || []).map(c => c.replace(/id=["']/,'').replace(/["']$/,'')));
  return {
    totalElements: Object.values(tagCounts).reduce((a, b) => a + b, 0),
    uniqueTags: Object.keys(tagCounts).length,
    tagCounts: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]),
    totalClasses: classes.size,
    totalIds: ids.size,
    scripts: tagCounts['script'] || 0,
    styles: tagCounts['style'] || 0,
    divs: tagCounts['div'] || 0,
    spans: tagCounts['span'] || 0,
  };
}, [projectFiles]);

// v20: Console Filter & Export

const [consoleFilterLevel, setConsoleFilterLevel] = useState<'all' | 'log' | 'warn' | 'error'>('all');
const filteredConsoleLogs = useMemo(() => {
  if (consoleFilterLevel === 'all') return consoleLogs;
  return consoleLogs.filter(l => l.type === consoleFilterLevel);
}, [consoleLogs, consoleFilterLevel]);
const exportConsoleLogs = () => {
  const text = filteredConsoleLogs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `console-${Date.now()}.log`; a.click();
  URL.revokeObjectURL(url);
};

// v20: Inline Color Picker

const [colorEditValue, setColorEditValue] = useState('#ffffff');
const [colorEditTarget, setColorEditTarget] = useState<{ file: string; match: string; index: number } | null>(null);
const detectedColors = useMemo(() => {
  const results: { color: string; file: string; line: number; index: number }[] = [];
  for (const [path, file] of Object.entries(projectFiles)) {
    const colorRegex = /(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\))/g;
    let m;
    while ((m = colorRegex.exec(file.content)) !== null) {
      results.push({ color: m[1], file: path, line: file.content.substring(0, m.index).split('\n').length, index: m.index });
    }
  }
  return results.slice(0, 100);
}, [projectFiles]);
const applyColorEdit = () => {
  if (!colorEditTarget) return;
  setProjectFiles(prev => {
    const file = prev[colorEditTarget.file];
    if (!file) return prev;
    const content = file.content.substring(0, colorEditTarget.index) + colorEditValue + file.content.substring(colorEditTarget.index + colorEditTarget.match.length);
    return { ...prev, [colorEditTarget.file]: { ...file, content } };
  });
  setColorEditTarget(null);
};

// v20: Code Folding Map

const foldRegions = useMemo(() => {
  if (!selectedFile) return [];
  const content = projectFiles[selectedFile]?.content || '';
  const lines = content.split('\n');
  const regions: { start: number; end: number; depth: number; label: string }[] = [];
  const stack: number[] = [];
  lines.forEach((line, i) => {
    const opens = (line.match(/[{(\[]/g) || []).length;
    const closes = (line.match(/[})\]]/g) || []).length;
    if (opens > closes) {
      stack.push(i);
    } else if (closes > opens && stack.length > 0) {
      const start = stack.pop()!;
      if (i - start > 2) {
        regions.push({ start: start + 1, end: i + 1, depth: stack.length + 1, label: lines[start].trim().slice(0, 50) });
      }
    }
  });
  return regions.sort((a, b) => a.start - b.start).slice(0, 100);
}, [selectedFile, projectFiles]);

// v20: Dependency Graph

const depGraph = useMemo(() => {
  const nodes: { id: string; type: string }[] = [];
  const edges: { from: string; to: string }[] = [];
  const fileNames = Object.keys(projectFiles);
  for (const [path, file] of Object.entries(projectFiles)) {
    const ext = path.split('.').pop() || '';
    nodes.push({ id: path, type: ext });
    const importRegex = /(?:import|require)\s*(?:\(\s*)?['"]([^'"]+)['"]/g;
    let m;
    while ((m = importRegex.exec(file.content)) !== null) {
      const dep = m[1];
      const resolved = fileNames.find(f => f.endsWith(dep) || f.endsWith(dep + '.ts') || f.endsWith(dep + '.tsx') || f.endsWith(dep + '.js') || f.endsWith(dep + '.jsx'));
      if (resolved) edges.push({ from: path, to: resolved });
    }
  }
  return { nodes, edges };
}, [projectFiles]);

// v20: Performance Budget

const perfBudget = useMemo(() => {
  const totalSize = Object.values(projectFiles).reduce((a, f) => a + new Blob([f.content]).size, 0);
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html'));
  const html = htmlFile?.[1]?.content || '';
  const scriptCount = (html.match(/<script/gi) || []).length;
  const styleCount = (html.match(/<link[^>]*stylesheet/gi) || []).length + (html.match(/<style/gi) || []).length;
  const imgCount = (html.match(/<img/gi) || []).length;
  const domDepth = (() => { let max = 0, cur = 0; for (const ch of html) { if (ch === '<') cur++; else if (ch === '/') { cur--; max = Math.max(max, cur); } } return max; })();
  const checks = [
    { name: 'Total Size', value: `${(totalSize / 1024).toFixed(1)} KB`, pass: totalSize < 500 * 1024, limit: '< 500 KB' },
    { name: 'Scripts', value: `${scriptCount}`, pass: scriptCount <= 10, limit: '≤ 10' },
    { name: 'Stylesheets', value: `${styleCount}`, pass: styleCount <= 5, limit: '≤ 5' },
    { name: 'Images', value: `${imgCount}`, pass: imgCount <= 20, limit: '≤ 20' },
    { name: 'DOM Depth', value: `${domDepth}`, pass: domDepth < 32, limit: '< 32' },
    { name: 'Files', value: `${Object.keys(projectFiles).length}`, pass: Object.keys(projectFiles).length <= 50, limit: '≤ 50' },
  ];
  return { checks, score: Math.round((checks.filter(c => c.pass).length / checks.length) * 100) };
}, [projectFiles]);

// v20: Responsive Preview Grid

const RESPONSIVE_VIEWPORTS = [
  { name: 'Mobile', w: 375, h: 667, icon: '📱' },
  { name: 'Tablet', w: 768, h: 1024, icon: '📋' },
  { name: 'Laptop', w: 1280, h: 800, icon: '💻' },
  { name: 'Desktop', w: 1920, h: 1080, icon: '🖥' },
];

// v21: CSS Animation Inspector

const cssAnimations = useMemo(() => {
  const results: { name: string; type: 'keyframes' | 'animation' | 'transition'; detail: string; file: string }[] = [];
  for (const [path, file] of Object.entries(projectFiles)) {
    if (!path.endsWith('.css') && !path.endsWith('.html')) continue;
    const kf = file.content.matchAll(/@keyframes\s+([\w-]+)/g);
    for (const m of kf) results.push({ name: m[1], type: 'keyframes', detail: 'Keyframe definition', file: path });
    const anim = file.content.matchAll(/animation(?:-name)?\s*:\s*([^;{]+)/g);
    for (const m of anim) results.push({ name: m[1].trim().split(/\s+/)[0], type: 'animation', detail: m[1].trim().slice(0, 60), file: path });
    const trans = file.content.matchAll(/transition\s*:\s*([^;{]+)/g);
    for (const m of trans) results.push({ name: m[1].trim().split(/\s+/)[0], type: 'transition', detail: m[1].trim().slice(0, 60), file: path });
  }
  return results.slice(0, 80);
}, [projectFiles]);

// v21: Event Listener Audit

const inlineEvents = useMemo(() => {
  const results: { event: string; element: string; file: string; line: number; handler: string }[] = [];
  const eventNames = ['onclick', 'onchange', 'onsubmit', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur', 'oninput', 'onload', 'onerror', 'onscroll', 'onresize'];
  for (const [path, file] of Object.entries(projectFiles)) {
    const lines = file.content.split('\n');
    lines.forEach((line, i) => {
      for (const evt of eventNames) {
        const regex = new RegExp(`<(\\w+)[^>]*\\s${evt}=(["'])([^"']*?)\\2`, 'gi');
        let m;
        while ((m = regex.exec(line)) !== null) {
          results.push({ event: evt, element: m[1], file: path, line: i + 1, handler: m[3].slice(0, 50) });
        }
      }
    });
  }
  return results.slice(0, 100);
}, [projectFiles]);

// v21: Open Graph Preview

const ogData = useMemo(() => {
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html'));
  if (!htmlFile) return null;
  const html = htmlFile[1].content;
  const getMeta = (prop: string) => html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'))?.[1] || '';
  const title = getMeta('og:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1] || 'Untitled';
  const desc = getMeta('og:description') || getMeta('description') || '';
  const image = getMeta('og:image') || '';
  const siteName = getMeta('og:site_name') || '';
  const twitterCard = getMeta('twitter:card') || 'summary';
  return { title, desc, image, siteName, twitterCard };
}, [projectFiles]);

// v21: Semantic HTML Checker

const semanticIssues = useMemo(() => {
  const results: { issue: string; suggestion: string; line: number; file: string; severity: 'warn' | 'error' }[] = [];
  for (const [path, file] of Object.entries(projectFiles)) {
    if (!path.endsWith('.html') && !path.endsWith('.htm')) continue;
    const lines = file.content.split('\n');
    lines.forEach((line, i) => {
      if (/<div[^>]*class=["'][^"']*header[^"']*["']/i.test(line)) results.push({ issue: '<div> used as header', suggestion: 'Use <header>', line: i + 1, file: path, severity: 'warn' });
      if (/<div[^>]*class=["'][^"']*footer[^"']*["']/i.test(line)) results.push({ issue: '<div> used as footer', suggestion: 'Use <footer>', line: i + 1, file: path, severity: 'warn' });
      if (/<div[^>]*class=["'][^"']*nav[^"']*["']/i.test(line)) results.push({ issue: '<div> used as navigation', suggestion: 'Use <nav>', line: i + 1, file: path, severity: 'warn' });
      if (/<div[^>]*class=["'][^"']*sidebar[^"']*["']/i.test(line)) results.push({ issue: '<div> used as sidebar', suggestion: 'Use <aside>', line: i + 1, file: path, severity: 'warn' });
      if (/<div[^>]*class=["'][^"']*main[^"']*["']/i.test(line)) results.push({ issue: '<div> used as main content', suggestion: 'Use <main>', line: i + 1, file: path, severity: 'warn' });
      if (/<div[^>]*class=["'][^"']*article[^"']*["']/i.test(line)) results.push({ issue: '<div> used as article', suggestion: 'Use <article>', line: i + 1, file: path, severity: 'warn' });
      if (/<div[^>]*class=["'][^"']*section[^"']*["']/i.test(line)) results.push({ issue: '<div> used as section', suggestion: 'Use <section>', line: i + 1, file: path, severity: 'warn' });
      if (/<b>/i.test(line)) results.push({ issue: '<b> tag used', suggestion: 'Use <strong> for semantic emphasis', line: i + 1, file: path, severity: 'warn' });
      if (/<i>/i.test(line) && !/<i\s+class/i.test(line)) results.push({ issue: '<i> tag used', suggestion: 'Use <em> for semantic emphasis', line: i + 1, file: path, severity: 'warn' });
    });
  }
  return results.slice(0, 100);
}, [projectFiles]);

// v21: Whitespace/Indent Checker

const whitespaceIssues = useMemo(() => {
  const results: { issue: string; file: string; line: number; type: 'mixed-indent' | 'trailing' | 'inconsistent' }[] = [];
  for (const [path, file] of Object.entries(projectFiles)) {
    const lines = file.content.split('\n');
    let tabCount = 0, spaceCount = 0;
    lines.forEach((line, i) => {
      if (line.match(/^\t/)) tabCount++;
      if (line.match(/^  /)) spaceCount++;
      if (line.match(/^\t+ /) || line.match(/^ +\t/)) results.push({ issue: 'Mixed tabs and spaces', file: path, line: i + 1, type: 'mixed-indent' });
      if (line.match(/\s+$/) && line.trim().length > 0) results.push({ issue: 'Trailing whitespace', file: path, line: i + 1, type: 'trailing' });
    });
    if (tabCount > 0 && spaceCount > 0 && Math.min(tabCount, spaceCount) > 3) {
      results.push({ issue: `Inconsistent indentation (${tabCount} tab lines, ${spaceCount} space lines)`, file: path, line: 1, type: 'inconsistent' });
    }
  }
  return results.slice(0, 150);
}, [projectFiles]);

// v22: PWA Checker

const pwaChecks = useMemo(() => {
  const manifest = Object.entries(projectFiles).find(([p]) => p.includes('manifest') && p.endsWith('.json'));
  const sw = Object.entries(projectFiles).find(([p]) => p.includes('service-worker') || p.includes('sw.js'));
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html'));
  const html = htmlFile?.[1]?.content || '';
  const hasManifestLink = /<link[^>]*manifest/i.test(html);
  const hasThemeColor = /<meta[^>]*theme-color/i.test(html);
  const hasViewport = /<meta[^>]*viewport/i.test(html);
  const hasAppleTouchIcon = /<link[^>]*apple-touch-icon/i.test(html);
  const hasHttpsLinks = !html.includes('http://') || html.includes('https://');
  const checks = [
    { name: 'Manifest file', pass: !!manifest, detail: manifest ? manifest[0] : 'Not found' },
    { name: 'Manifest link in HTML', pass: hasManifestLink, detail: hasManifestLink ? 'Found' : 'Missing <link rel="manifest">' },
    { name: 'Service Worker', pass: !!sw, detail: sw ? sw[0] : 'Not found' },
    { name: 'Theme Color', pass: hasThemeColor, detail: hasThemeColor ? 'Found' : 'Missing <meta name="theme-color">' },
    { name: 'Viewport Meta', pass: hasViewport, detail: hasViewport ? 'Found' : 'Missing viewport meta' },
    { name: 'Apple Touch Icon', pass: hasAppleTouchIcon, detail: hasAppleTouchIcon ? 'Found' : 'Missing apple-touch-icon' },
    { name: 'HTTPS Resources', pass: hasHttpsLinks, detail: hasHttpsLinks ? 'All secure' : 'Mixed content detected' },
  ];
  return { checks, score: Math.round((checks.filter(c => c.pass).length / checks.length) * 100) };
}, [projectFiles]);

// v22: Schema.org / JSON-LD Validator

const schemaData = useMemo(() => {
  const results: { type: string; props: string[]; valid: boolean; raw: string }[] = [];
  for (const [, file] of Object.entries(projectFiles)) {
    const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = regex.exec(file.content)) !== null) {
      try {
        const json = JSON.parse(m[1]);
        const type = json['@type'] || 'Unknown';
        const props = Object.keys(json).filter(k => k !== '@context' && k !== '@type');
        results.push({ type, props, valid: true, raw: m[1].trim().slice(0, 200) });
      } catch {
        results.push({ type: 'Invalid JSON', props: [], valid: false, raw: m[1].trim().slice(0, 200) });
      }
    }
  }
  return results;
}, [projectFiles]);

// v22: Bundle Size Estimator

const bundleEstimate = useMemo(() => {
  const files = Object.entries(projectFiles).map(([path, file]) => {
    const raw = new Blob([file.content]).size;
    const minified = new Blob([file.content.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')]).size;
    const ext = path.split('.').pop() || '';
    return { path, raw, minified, savings: raw - minified, ext };
  });
  const totalRaw = files.reduce((a, f) => a + f.raw, 0);
  const totalMin = files.reduce((a, f) => a + f.minified, 0);
  return { files: files.sort((a, b) => b.raw - a.raw), totalRaw, totalMin, savings: totalRaw - totalMin };
}, [projectFiles]);

// v22: ARIA Roles Inspector

const ariaRoles = useMemo(() => {
  const results: { role: string; element: string; file: string; line: number; hasLabel: boolean }[] = [];
  for (const [path, file] of Object.entries(projectFiles)) {
    const lines = file.content.split('\n');
    lines.forEach((line, i) => {
      const roleMatch = line.matchAll(/role=["']([^"']+)["']/gi);
      for (const m of roleMatch) {
        const tagMatch = line.match(/<(\w+)/);
        const hasLabel = /aria-label/i.test(line) || /aria-labelledby/i.test(line);
        results.push({ role: m[1], element: tagMatch?.[1] || '?', file: path, line: i + 1, hasLabel });
      }
      const ariaAttrs = line.matchAll(/aria-([a-z]+)=["']([^"']*)["']/gi);
      for (const m of ariaAttrs) {
        if (m[1] === 'label' || m[1] === 'labelledby' || m[1] === 'describedby') continue;
        const tagMatch = line.match(/<(\w+)/);
        results.push({ role: `aria-${m[1]}`, element: tagMatch?.[1] || '?', file: path, line: i + 1, hasLabel: true });
      }
    });
  }
  return results.slice(0, 100);
}, [projectFiles]);

// v22: Security Headers Check

const securityChecks = useMemo(() => {
  const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html'));
  const html = htmlFile?.[1]?.content || '';
  const checks = [
    { name: 'Content-Security-Policy', pass: /<meta[^>]*Content-Security-Policy/i.test(html), detail: 'CSP header/meta tag' },
    { name: 'X-Frame-Options', pass: /<meta[^>]*X-Frame-Options/i.test(html), detail: 'Clickjacking protection' },
    { name: 'No inline scripts', pass: !(/<script(?![^>]*src)[^>]*>[^<]+/i.test(html)), detail: 'Avoid inline JS for XSS protection' },
    { name: 'No eval() usage', pass: !Object.values(projectFiles).some(f => /\beval\s*\(/i.test(f.content)), detail: 'eval() is a security risk' },
    { name: 'No document.write', pass: !Object.values(projectFiles).some(f => /document\.write/i.test(f.content)), detail: 'document.write is a vulnerability' },
    { name: 'No innerHTML', pass: !Object.values(projectFiles).some(f => /\.innerHTML\s*=/i.test(f.content)), detail: 'innerHTML enables XSS' },
    { name: 'Subresource Integrity', pass: /<script[^>]*integrity=/i.test(html) || !(/<script[^>]*src=["']http/i.test(html)), detail: 'SRI for external scripts' },
    { name: 'HTTPS only', pass: !/(src|href)=["']http:\/\//i.test(html), detail: 'All resources over HTTPS' },
  ];
  return { checks, score: Math.round((checks.filter(c => c.pass).length / checks.length) * 100) };
}, [projectFiles]);

// v22: Project Export ZIP
const exportProjectZip = async () => {
  const files = Object.entries(projectFiles);
  if (files.length === 0) return;
  // Simple ZIP creation (store method, no compression for browser compat)
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;
  for (const [path, file] of files) {
    const nameBytes = encoder.encode(path);
    const dataBytes = encoder.encode(file.content);
    // Local file header
    const header = new Uint8Array(30 + nameBytes.length);
    const hView = new DataView(header.buffer);
    hView.setUint32(0, 0x04034b50, true); // signature
    hView.setUint16(4, 20, true); // version
    hView.setUint16(8, 0, true); // method (store)
    hView.setUint32(18, dataBytes.length, true); // compressed
    hView.setUint32(22, dataBytes.length, true); // uncompressed
    hView.setUint16(26, nameBytes.length, true);
    header.set(nameBytes, 30);
    parts.push(header, dataBytes);
    // Central directory entry
    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cdEntry.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint32(20, dataBytes.length, true);
    cdView.setUint32(24, dataBytes.length, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint32(42, offset, true);
    cdEntry.set(nameBytes, 46);
    centralDir.push(cdEntry);
    offset += header.length + dataBytes.length;
  }
  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) { parts.push(cd); cdSize += cd.length; }
  // End of central directory
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdOffset, true);
  parts.push(eocd);
  const blob = new Blob(parts as BlobPart[], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `project-${Date.now()}.zip`; a.click();
  URL.revokeObjectURL(url);
};

  return {
    // useMemo results
    extractedColors, projectStats, cssVariables, detectedDeps, codeComplexity,
    codeSymbols, imageAssets, networkCalls, BREAKPOINT_SIZES, htmlErrors,
    detectedFonts, fileSizeTreemap, unusedCssSelectors, brokenLinks, domTree,
    metaTags, contrastIssues, zIndexMap, todoComments, regexMatches,
    cssSpecificity, lazyImgIssues, textStats, duplicateBlocks, elementCounts,
    filteredConsoleLogs, detectedColors, foldRegions, depGraph, perfBudget,
    cssAnimations, inlineEvents, ogData, semanticIssues, whitespaceIssues,
    pwaChecks, schemaData, bundleEstimate, ariaRoles, securityChecks,
    // useState values + setters
    perfIssues, setPerfIssues, consoleLogs, setConsoleLogs,
    breakpointTestActive, setBreakpointTestActive, breakpointTestIdx, setBreakpointTestIdx,
    savedSnippets, setSavedSnippets, layoutDebugActive, setLayoutDebugActive,
    previewDarkMode, setPreviewDarkMode, gridFlexDebugActive, setGridFlexDebugActive,
    bookmarkedLines, setBookmarkedLines, consoleFilterLevel, setConsoleFilterLevel,
    colorEditValue, setColorEditValue, colorEditTarget, setColorEditTarget,
    regexInput, setRegexInput, regexTestStr, setRegexTestStr,
    // useCallback functions
    runPerfAudit, exportSingleHtml, minifyProject, formatCode,
    saveSnippet, deleteSnippet, insertSnippet, copyPreviewAsImage,
    toggleBookmark, jumpToBookmark,
    exportConsoleLogs, applyColorEdit, RESPONSIVE_VIEWPORTS, exportProjectZip,
  };
}
