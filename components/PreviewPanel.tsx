'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import { GlobeIcon, RefreshIcon } from '@/lib/page-helpers';
import type { ActiveTab, VirtualFS } from '@/lib/types';

/* ── Build an iframe-renderable HTML page from React/Tailwind component code ── */

/** Find the largest `return (...)` block using balanced parentheses */
function extractReturnJsx(code: string): string | null {
  const results: string[] = [];
  let searchFrom = 0;
  while (true) {
    const idx = code.indexOf('return (', searchFrom);
    if (idx === -1) break;
    const after = code.slice(idx + 7);
    let depth = 0, start = -1, end = -1;
    for (let i = 0; i < after.length; i++) {
      if (after[i] === '(') { if (depth === 0) start = i; depth++; }
      else if (after[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (start !== -1 && end !== -1) results.push(after.slice(start + 1, end).trim());
    searchFrom = idx + 1;
  }
  if (results.length === 0) return null;
  return results.reduce((a, b) => (a.length > b.length ? a : b));
}

function build21stPreviewHtml(code: string): string {
  if (!code?.trim()) return '<!DOCTYPE html><html><body style="background:#09090b;color:#555;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><p>No preview</p></body></html>';

  // Step 1: Strip non-visual code (imports, types, "use client", exports)
  let text = code
    .replace(/^["']use client["'];?\s*/gm, '')
    .replace(/^import\b.*$/gm, '')
    .replace(/(?:export\s+)?(?:interface|type)\s+\w+[^{]*\{[^}]*\}/gm, '')
    .replace(/^export\s+default\s+function/gm, 'function')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/:\s*(?:\w+(?:Props|Type|Interface)|React\.\w+|string|number|boolean)(?:\[\])?\s*/g, ' ');

  // Step 2: Extract JSX from the largest return() block (balanced parens)
  let jsx = extractReturnJsx(text);

  // Fallback: try arrow function implicit return => (...)
  if (!jsx) {
    const arrowMatch = text.match(/=>\s*\(([\s\S]+)\)\s*;?\s*(?:\}|$)/);
    if (arrowMatch) jsx = arrowMatch[1];
  }
  // Last fallback: try return <div... without parens
  if (!jsx) {
    const directReturn = text.match(/return\s+(<[\s\S]+)/);
    if (directReturn) jsx = directReturn[1];
  }
  if (!jsx) jsx = text;

  // Step 3: Convert React JSX → HTML
  jsx = jsx
    .replace(/className=/g, 'class=')
    .replace(/htmlFor=/g, 'for=')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')               // JSX comments
    .replace(/\{`([^`]*)`\}/g, '$1')                      // Template literals → text
    .replace(/\{"([^"]*)"\}/g, '$1')                       // String expressions
    .replace(/\{'([^']*)'\}/g, '$1')                       // String expressions
    .replace(/<(\w+)([^>]*)\s\/>/g, '<$1$2></$1>');       // Self-closing → explicit close

  // Step 4: Iteratively remove nested JS expressions {...{...}...}
  for (let i = 0; i < 20; i++) {
    const before: string = jsx;
    jsx = jsx.replace(/\{[^{}]*\}/g, '');
    if (jsx === before) break;
  }

  // Step 5: Convert PascalCase React components to divs
  jsx = jsx
    .replace(/<([A-Z][a-zA-Z0-9]*)([\s>\/])/g, '<div$2')
    .replace(/<\/[A-Z][a-zA-Z0-9]*>/g, '</div>');

  // Step 6: Fix SVG attributes + fragments
  jsx = jsx
    .replace(/strokeWidth=/g, 'stroke-width=')
    .replace(/strokeLinecap=/g, 'stroke-linecap=')
    .replace(/strokeLinejoin=/g, 'stroke-linejoin=')
    .replace(/fillRule=/g, 'fill-rule=')
    .replace(/clipRule=/g, 'clip-rule=')
    .replace(/<>/g, '<div>').replace(/<\/>/g, '</div>');

  // Step 7: Clean up empty artifacts
  jsx = jsx
    .replace(/<(\w+)(\s[^>]*)?>(\s*)<\/\1>/g, '')         // Remove empty tags
    .replace(/\n\s*\n\s*\n/g, '\n');                       // Collapse blank lines

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><script src="https://cdn.tailwindcss.com"><\/script><script>tailwind.config={darkMode:'class',theme:{extend:{colors:{background:'#09090b',foreground:'#fafafa',primary:{DEFAULT:'#818cf8',foreground:'#fff'},'primary-foreground':'#fff',secondary:{DEFAULT:'#27272a',foreground:'#fafafa'},'secondary-foreground':'#fafafa',muted:{DEFAULT:'#27272a',foreground:'#a1a1aa'},'muted-foreground':'#a1a1aa',accent:{DEFAULT:'#27272a',foreground:'#fafafa'},'accent-foreground':'#fafafa',destructive:{DEFAULT:'#ef4444',foreground:'#fff'},border:'#27272a',input:'#27272a',ring:'#818cf8',card:{DEFAULT:'#111',foreground:'#fafafa'},'card-foreground':'#fafafa',popover:{DEFAULT:'#111',foreground:'#fafafa'}},borderRadius:{lg:'0.5rem',md:'calc(0.5rem - 2px)',sm:'calc(0.5rem - 4px)'}}}}<\/script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#09090b;color:#fafafa;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}body>*{max-width:100%}img{max-width:100%;height:auto}a{color:inherit;text-decoration:none}button,input{font:inherit;color:inherit}[class*="rounded"]{border-radius:0.5rem}svg{display:inline-block;vertical-align:middle}</style></head><body class="dark">${jsx}</body></html>`;
}

export interface PreviewPanelProps {
  hasPreviewContent: boolean;
  webContainer: { previewUrl: string | null };
  selectedFile: string;
  refreshPreview: () => void;
  deviceMode: 'desktop' | 'tablet' | 'mobile';
  isLandscape: boolean;
  previewZoom: number;
  breakpointTestActive: boolean;
  breakpointTestIdx: number;
  previewLoading: boolean;
  wcInstalling: boolean;
  wcInstallProgress: string | null;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  setPreviewLoading: (v: boolean) => void;
  previewHtml: string | null;
  isEditMode: boolean;
  selectPromptData: { tagName: string; outerHtml: string; cssPath?: string; rect?: { top: number; left: number; width: number; height: number } } | null;
  setSelectPromptData: (v: any) => void;
  BREAKPOINT_SIZES: Array<{ name: string; w: number }>;
  selectPromptInput: string;
  setSelectPromptInput: (v: string) => void;
  selectPromptRef: React.RefObject<HTMLInputElement | null>;
  submitSelectPrompt: () => void;
  selectPromptLoading: boolean;
  browser21stQuery: string;
  setBrowser21stQuery: (v: string) => void;
  browser21stInputRef: React.RefObject<HTMLInputElement | null>;
  search21stComponents: (query: string) => void;
  browser21stLoading: boolean;
  browser21stResults: Array<{ id?: string; name?: string; description?: string; tags?: string[]; code?: string; preview_url?: string; demo_url?: string }>;
  inject21stComponent: (comp: any) => void;
  injecting21stComponent: string | null;
  clonedHtml: string | null;
  setRefineFeedback: (v: string) => void;
  isRefining: boolean;
  refineFeedback: string;
  refineClone: () => void;
  stopClone: () => void;
  isCloning: boolean;
  cloneProgress: string | null;
  isStreaming: boolean;
  cloneError: string | null;
  setCloneError: (v: string | null) => void;
  setShowCloneModal: (v: boolean) => void;
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
  setSelectedFile: (v: string) => void;
  setActiveTab: (v: ActiveTab) => void;
}

const PreviewPanel = React.memo(function PreviewPanel(props: PreviewPanelProps) {
  const { showBreakpointRuler, showSplitPreview, show21stBrowser } = usePanelStore();
  const panelActions = usePanelStore();
  const {
    hasPreviewContent, webContainer, selectedFile, refreshPreview, deviceMode, isLandscape,
    previewZoom, breakpointTestActive, breakpointTestIdx, previewLoading, wcInstalling,
    wcInstallProgress, iframeRef, setPreviewLoading, previewHtml, isEditMode,
    selectPromptData, setSelectPromptData, selectPromptInput, setSelectPromptInput,
    selectPromptRef, submitSelectPrompt, selectPromptLoading, browser21stQuery,
    setBrowser21stQuery, browser21stInputRef, search21stComponents, browser21stLoading,
    browser21stResults, inject21stComponent, injecting21stComponent, clonedHtml,
    setRefineFeedback, isRefining, refineFeedback, refineClone, stopClone, isCloning,
    cloneProgress, isStreaming, cloneError, setCloneError, setShowCloneModal,
    setProjectFiles, setSelectedFile, setActiveTab, BREAKPOINT_SIZES,
  } = props;

  return (
    <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full" role="region" aria-label="Preview panel">
      {hasPreviewContent ? (
        <div className="relative w-full h-full bg-[#0c0c0c] flex flex-col">
          {/* Preview URL bar */}
          <div className="h-[28px] flex items-center gap-2 px-2 bg-[#111] border-b border-[#1e1e1e] shrink-0">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 flex items-center bg-[#0a0a0a] border border-[#222] rounded-md px-2 py-0.5 text-[10px] text-[#555] font-mono">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 shrink-0 text-[#444]"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span className="truncate">{webContainer.previewUrl || `localhost:3000/${selectedFile === 'index.html' ? '' : selectedFile}`}</span>
            </div>
            <button onClick={refreshPreview} className="w-5 h-5 flex items-center justify-center text-[#555] hover:text-white rounded transition-colors"><RefreshIcon /></button>
          </div>
          {/* Responsive Breakpoint Ruler */}
          {showBreakpointRuler && deviceMode === 'desktop' && (
            <div className="h-[20px] relative bg-[#0a0a0a] border-b border-[#1e1e1e] shrink-0 overflow-hidden">
              {[
                { w: 320, label: '320', color: '#ef4444' },
                { w: 480, label: '480', color: '#f97316' },
                { w: 640, label: 'sm', color: '#eab308' },
                { w: 768, label: 'md', color: '#22c55e' },
                { w: 1024, label: 'lg', color: '#3b82f6' },
                { w: 1280, label: 'xl', color: '#8b5cf6' },
                { w: 1536, label: '2xl', color: '#ec4899' },
              ].map(bp => (
                <div key={bp.w} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${(bp.w / 1920) * 100}%` }}>
                  <div className="w-px h-[10px]" style={{ background: bp.color, opacity: 0.5 }} />
                  <span className="text-[7px] font-mono leading-none" style={{ color: bp.color, opacity: 0.7 }}>{bp.label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex-1 min-h-0 flex items-center justify-center" style={previewZoom !== 100 ? { transform: `scale(${previewZoom / 100})`, transformOrigin: 'center center' } : undefined}>
            <div className={`bg-white transition-all duration-300 ${
              breakpointTestActive
                ? 'h-full rounded-[4px] border-2 border-orange-500/30'
                : deviceMode === 'mobile'
                ? isLandscape ? 'w-[852px] h-[393px] rounded-[20px] border-4 border-[#333]' : 'w-[393px] h-[852px] rounded-[20px] border-4 border-[#333]'
                : deviceMode === 'tablet'
                ? isLandscape ? 'w-[1080px] h-[810px] rounded-[12px] border-4 border-[#333]' : 'w-[810px] h-[1080px] rounded-[12px] border-4 border-[#333]'
                : 'w-full h-full'
            } overflow-hidden relative`} style={breakpointTestActive ? { width: `${BREAKPOINT_SIZES[breakpointTestIdx].w}px` } : undefined}>
              {deviceMode === 'mobile' && !isLandscape && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#333] rounded-b-[14px] z-10" />
              )}
              {previewLoading && (
                <div className="absolute inset-0 z-[5] bg-white animate-pulse">
                  <div className="h-14 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2"><div className="h-3 w-24 bg-gray-200 rounded" /><div className="h-2 w-16 bg-gray-200 rounded" /></div>
                    <div className="flex gap-2"><div className="w-16 h-8 bg-gray-200 rounded-md" /><div className="w-16 h-8 bg-gray-200 rounded-md" /></div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="h-8 w-3/4 bg-gray-100 rounded" /><div className="h-4 w-full bg-gray-100 rounded" /><div className="h-4 w-5/6 bg-gray-100 rounded" /><div className="h-4 w-2/3 bg-gray-100 rounded" />
                    <div className="grid grid-cols-3 gap-4 mt-6"><div className="h-32 bg-gray-100 rounded-lg" /><div className="h-32 bg-gray-100 rounded-lg" /><div className="h-32 bg-gray-100 rounded-lg" /></div>
                    <div className="h-4 w-full bg-gray-100 rounded mt-4" /><div className="h-4 w-4/5 bg-gray-100 rounded" />
                  </div>
                </div>
              )}
              {wcInstalling && (
                <div className="absolute inset-0 z-20 bg-[#0a0a0a]/95 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-2 border-[#333] border-t-emerald-400 rounded-full animate-spin" />
                  <div className="text-emerald-400 text-sm font-mono">{wcInstallProgress || 'Setting up...'}</div>
                  <div className="flex gap-1">{[0,1,2,3,4].map(i => (<div key={i} className="w-1.5 h-4 bg-emerald-500/30 rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />))}</div>
                </div>
              )}
              {webContainer.previewUrl ? (
                <iframe ref={iframeRef} className="w-full h-full border-none bg-white" src={webContainer.previewUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Preview" aria-label="Website preview" onLoad={() => setPreviewLoading(false)} />
              ) : (
                <iframe ref={iframeRef} className="w-full h-full border-none bg-white" srcDoc={previewHtml ?? ''} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Preview" aria-label="Website preview" onLoad={() => setPreviewLoading(false)} />
              )}
              {showSplitPreview && deviceMode === 'desktop' && previewHtml && (
                <div className="absolute right-0 top-0 bottom-0 w-[200px] border-l-2 border-dashed border-[#333] bg-[#0a0a0a] flex flex-col items-center z-[6]">
                  <div className="text-[9px] text-[#555] py-1 bg-[#111] w-full text-center border-b border-[#222]">Mobile (375px)</div>
                  <div className="flex-1 w-[187px] overflow-hidden">
                    <iframe className="border-none bg-white origin-top-left" style={{ width: '375px', height: '812px', transform: 'scale(0.5)', transformOrigin: 'top left' }} srcDoc={previewHtml} sandbox="allow-scripts allow-same-origin" title="Mobile Preview" />
                  </div>
                </div>
              )}
              {isEditMode && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/90 text-white text-[10px] font-medium shadow-lg pointer-events-none z-10">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit Mode
                </div>
              )}
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
                        <input ref={selectPromptRef} value={selectPromptInput} onChange={(e) => setSelectPromptInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitSelectPrompt(); } if (e.key === 'Escape') { setSelectPromptData(null); setSelectPromptInput(''); } }} placeholder="e.g. Make it blue, add a gradient, change text to..." className="flex-1 bg-[#0c0c0c] border border-[#333] rounded-lg px-3 py-2 text-[12px] text-white placeholder-[#555] outline-none focus:border-purple-500/50 transition-colors" disabled={selectPromptLoading} autoFocus />
                        <button onClick={submitSelectPrompt} disabled={!selectPromptInput.trim() || selectPromptLoading} className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-[11px] font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-30 shrink-0 flex items-center gap-1.5">
                          {selectPromptLoading ? (<><svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" /></svg> Applying...</>) : (<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Apply</>)}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {['Make it bigger', 'Change colors', 'Add animation', 'Make responsive', 'Modernize style'].map((s) => (
                          <button key={s} onClick={() => setSelectPromptInput(s)} className="text-[9px] px-2 py-1 rounded-md bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222] transition-colors">{s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {show21stBrowser && (
                <div className="absolute inset-0 z-30 flex flex-col bg-[#0d0d0d]/95 backdrop-blur-sm rounded-[inherit] overflow-hidden">
                  <div className="shrink-0 px-4 py-3 border-b border-[#222] flex items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                      <span className="text-[12px] font-semibold text-white">21st.dev Components</span>
                      {browser21stResults.length > 0 && <span className="text-[10px] text-indigo-400/70 font-mono">{browser21stResults.length} found</span>}
                    </div>
                    <form className="flex-1 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); search21stComponents(browser21stQuery); }}>
                      <input ref={browser21stInputRef} value={browser21stQuery} onChange={(e) => setBrowser21stQuery(e.target.value)} placeholder="Search components… e.g. pricing card, nav bar, hero section" className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-[#555] outline-none focus:border-indigo-500/50 transition-colors" autoFocus />
                      <button type="submit" disabled={browser21stLoading || !browser21stQuery.trim()} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-[11px] font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0">
                        {browser21stLoading ? <><svg width="11" height="11" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70"/></svg> Searching…</> : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search</>}
                      </button>
                    </form>
                    <button onClick={() => panelActions.setPanel('show21stBrowser', false)} className="shrink-0 w-6 h-6 flex items-center justify-center text-[#555] hover:text-white transition-colors rounded-md hover:bg-[#1a1a1a]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div className="shrink-0 px-4 py-2 flex flex-wrap gap-1.5 border-b border-[#1a1a1a]">
                    {['Hero section', 'Pricing card', 'Navigation bar', 'Card grid', 'CTA button', 'Footer', 'Modal', 'Form', 'Feature grid', 'Testimonials'].map(chip => (
                      <button key={chip} onClick={() => { setBrowser21stQuery(chip); search21stComponents(chip); }} className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#252525] text-[10px] text-[#777] hover:text-white hover:border-indigo-500/40 transition-colors">{chip}</button>
                    ))}
                  </div>
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
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {browser21stResults.map((comp, i) => (
                          <div key={comp.id || i} className="flex flex-col bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden hover:border-indigo-500/30 transition-colors group">
                            {/* Iframe preview */}
                            {comp.code && (
                              <div className="relative w-full bg-[#09090b] border-b border-[#1a1a1a]" style={{ height: '170px' }}>
                                <iframe
                                  srcDoc={build21stPreviewHtml(comp.code)}
                                  sandbox="allow-scripts"
                                  className="w-full h-full border-0 pointer-events-none"
                                  loading="lazy"
                                  title={comp.name || 'Component preview'}
                                  style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: `${100 / 0.35}%`, height: `${100 / 0.35}%` }}
                                />
                                <div className="absolute inset-0" />
                              </div>
                            )}
                            <div className="p-3 flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-1">
                                <p className="text-[11px] font-semibold text-white leading-tight">{comp.name || 'Component'}</p>
                                {comp.code && <span className="shrink-0 text-[8px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-emerald-400/70 font-mono">{Math.round(comp.code.length / 1000)}k</span>}
                              </div>
                              {comp.tags && comp.tags.length > 0 && (<div className="flex flex-wrap gap-1">{comp.tags.slice(0, 5).map(t => (<span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#777]">{t}</span>))}</div>)}
                              <button onClick={() => inject21stComponent(comp)} disabled={!!injecting21stComponent} className="w-full py-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-[10px] font-medium hover:bg-indigo-500/25 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 group-hover:bg-indigo-500/20">
                                {injecting21stComponent === comp.name ? <><svg width="10" height="10" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70"/></svg> Injecting…</> : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Use in page</>}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {deviceMode !== 'desktop' && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#1a1a1a]/80 backdrop-blur-sm text-[9px] text-[#666] font-mono">
                {deviceMode === 'mobile' ? isLandscape ? '852 × 393' : '393 × 852' : isLandscape ? '1080 × 810' : '810 × 1080'}
              </div>
            )}
          </div>
          {clonedHtml && (
            <div className="shrink-0 border-t border-[#222] bg-[#111] px-3 py-2">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Fix colors to match the original exactly', 'Fix the header/navbar layout and styling', 'Add the missing footer content', 'Fix responsive layout for mobile', 'Make fonts match the original site', 'Fix spacing and padding to match original'].map(suggestion => (
                  <button key={suggestion} onClick={() => setRefineFeedback(suggestion)} className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#252525] text-[10px] text-[#777] hover:text-white hover:border-[#444] transition-colors" disabled={isRefining}>{suggestion}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="text" value={refineFeedback} onChange={(e) => setRefineFeedback(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); refineClone(); } }} placeholder='Describe what to fix (e.g. "make the header darker", "add the missing footer")...' className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-[12px] text-white placeholder-[#555] focus:outline-none focus:border-[#444] transition-colors" disabled={isRefining} />
                <button onClick={refineClone} disabled={!refineFeedback.trim() || isRefining} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-[11px] text-white font-medium transition-colors hover:bg-[#333] disabled:opacity-30">
                  {isRefining ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border border-white border-t-transparent rounded-full" /> Refining...</>) : (<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Refine</>)}
                </button>
                {isRefining && <button onClick={stopClone} className="px-2 py-1.5 rounded-lg border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>}
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
              <div className="relative w-12 h-12 mx-auto mb-4">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 border-2 border-transparent border-t-white rounded-full" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="absolute inset-1.5 border-2 border-transparent border-t-[#444] rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </motion.div>
              </div>
              <p className="text-[13px] text-white mb-1 font-medium">Building your app</p>
              <p className="text-[11px] text-[#555]">AI is writing code...</p>
              <div className="flex items-center justify-center gap-1 mt-3">{[0,1,2,3,4].map(i => (<motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-white" />))}</div>
            </div>
          ) : (
            <div className="text-center max-w-sm mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center"><GlobeIcon /></div>
              <p className="text-[14px] text-white font-medium mb-1">No preview yet</p>
              <p className="text-[11px] text-[#555] mb-5">Start building by chatting with AI or pick a template</p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <button onClick={() => panelActions.setPanel('showTemplates', true)} className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium hover:bg-purple-500/20 transition-all hover:scale-105">Templates</button>
                <button onClick={() => setShowCloneModal(true)} className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-medium hover:bg-blue-500/20 transition-all hover:scale-105">Clone Site</button>
                <button onClick={() => { setProjectFiles({ 'App.jsx': { content: 'function App() {\n  return (\n    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">\n      <h1 className="text-4xl font-bold">Hello World</h1>\n    </div>\n  );\n}', language: 'jsx' } } as VirtualFS); setSelectedFile('App.jsx'); setActiveTab('code'); }} className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium hover:bg-emerald-500/20 transition-all hover:scale-105">React App</button>
              </div>
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
  );
});

export default PreviewPanel;
