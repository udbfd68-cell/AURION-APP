'use client';
import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

function InspectorPanels({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showAnimPanel, showAriaPanel, showBundlePanel, showChangeSummary, showColorEdit, showConsoleFilter, showContrastPanel, showDepGraph, showDomTreePanel, showElementCountPanel, showEventAudit, showFontPanel, showHtmlValidatorPanel, showLazyImgPanel, showLinkCheckerPanel, showMetaEditorPanel, showOgPreview, showPerfBudget, showPwaPanel, showRegexPanel, showResponsiveGrid, showSchemaPanel, showSecurityPanel, showSemanticPanel, showSpecificityPanel, showTextStatsPanel, showTodoScanPanel, showTreemapPanel, showUnusedCssPanel, showWhitespacePanel, showZIndexPanel } = panelStore;

  const setShowAnimPanel = (v: boolean) => setPanel('showAnimPanel', v);
  const setShowAriaPanel = (v: boolean) => setPanel('showAriaPanel', v);
  const setShowBundlePanel = (v: boolean) => setPanel('showBundlePanel', v);
  const setShowChangeSummary = (v: boolean) => setPanel('showChangeSummary', v);
  const setShowColorEdit = (v: boolean) => setPanel('showColorEdit', v);
  const setShowConsoleFilter = (v: boolean) => setPanel('showConsoleFilter', v);
  const setShowContrastPanel = (v: boolean) => setPanel('showContrastPanel', v);
  const setShowDepGraph = (v: boolean) => setPanel('showDepGraph', v);
  const setShowDomTreePanel = (v: boolean) => setPanel('showDomTreePanel', v);
  const setShowElementCountPanel = (v: boolean) => setPanel('showElementCountPanel', v);
  const setShowEventAudit = (v: boolean) => setPanel('showEventAudit', v);
  const setShowFontPanel = (v: boolean) => setPanel('showFontPanel', v);
  const setShowHtmlValidatorPanel = (v: boolean) => setPanel('showHtmlValidatorPanel', v);
  const setShowLazyImgPanel = (v: boolean) => setPanel('showLazyImgPanel', v);
  const setShowLinkCheckerPanel = (v: boolean) => setPanel('showLinkCheckerPanel', v);
  const setShowMetaEditorPanel = (v: boolean) => setPanel('showMetaEditorPanel', v);
  const setShowOgPreview = (v: boolean) => setPanel('showOgPreview', v);
  const setShowPerfBudget = (v: boolean) => setPanel('showPerfBudget', v);
  const setShowPwaPanel = (v: boolean) => setPanel('showPwaPanel', v);
  const setShowRegexPanel = (v: boolean) => setPanel('showRegexPanel', v);
  const setShowResponsiveGrid = (v: boolean) => setPanel('showResponsiveGrid', v);
  const setShowSchemaPanel = (v: boolean) => setPanel('showSchemaPanel', v);
  const setShowSecurityPanel = (v: boolean) => setPanel('showSecurityPanel', v);
  const setShowSemanticPanel = (v: boolean) => setPanel('showSemanticPanel', v);
  const setShowSpecificityPanel = (v: boolean) => setPanel('showSpecificityPanel', v);
  const setShowTextStatsPanel = (v: boolean) => setPanel('showTextStatsPanel', v);
  const setShowTodoScanPanel = (v: boolean) => setPanel('showTodoScanPanel', v);
  const setShowTreemapPanel = (v: boolean) => setPanel('showTreemapPanel', v);
  const setShowUnusedCssPanel = (v: boolean) => setPanel('showUnusedCssPanel', v);
  const setShowWhitespacePanel = (v: boolean) => setPanel('showWhitespacePanel', v);
  const setShowZIndexPanel = (v: boolean) => setPanel('showZIndexPanel', v);

  const {
    RESPONSIVE_VIEWPORTS,
    applyColorEdit,
    ariaRoles,
    brokenLinks,
    bundleEstimate,
    changeSummary,
    colorEditTarget,
    colorEditValue,
    consoleFilterLevel,
    contrastIssues,
    cssAnimations,
    cssSpecificity,
    depGraph,
    detectedColors,
    detectedFonts,
    domTree,
    elementCounts,
    exportConsoleLogs,
    fileSizeTreemap,
    filteredConsoleLogs,
    htmlErrors,
    inlineEvents,
    lazyImgIssues,
    metaTags,
    monacoEditorRef,
    ogData,
    perfBudget,
    previewHtml,
    pwaChecks,
    regexInput,
    regexMatches,
    regexTestStr,
    schemaData,
    securityChecks,
    semanticIssues,
    setActiveTab,
    setColorEditTarget,
    setColorEditValue,
    setConsoleFilterLevel,
    setRegexInput,
    setRegexTestStr,
    setSelectedFile,
    textStats,
    todoComments,
    unusedCssSelectors,
    whitespaceIssues,
    zIndexMap,
  } = p;

  return (
    <>
      {/* --- HTML Validator Panel --- */}
      {showHtmlValidatorPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>
              <span className="text-sm font-medium text-white">HTML Validator</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{htmlErrors.length} issue{htmlErrors.length !== 1 ? 's' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowHtmlValidatorPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {htmlErrors.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No HTML issues detected âœ“</div>}
            {htmlErrors.map((err: any, i: any) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-[11px] ${err.type === 'error' ? 'bg-red-500/5 border border-red-500/10' : 'bg-yellow-500/5 border border-yellow-500/10'}`}>
                <span className="shrink-0 mt-0.5">{err.type === 'error' ? 'ðŸ”´' : 'ðŸŸ¡'}</span>
                <div>
                  <div className="text-[#ccc]">{err.message}</div>
                  {err.line !== undefined && <div className="text-[#555] mt-0.5">Line ~{err.line}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Font Inspector Panel --- */}
      {showFontPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm">ðŸ”¤</span>
              <span className="text-sm font-medium text-white">Font Inspector</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{detectedFonts.length} font{detectedFonts.length !== 1 ? 's' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowFontPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {detectedFonts.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No fonts detected</div>}
            {detectedFonts.map((f: { name: string; source: string; type: string }, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs font-bold">{f.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white font-medium truncate" style={{ fontFamily: f.name }}>{f.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{f.type}</span>
                    <span className="text-[9px] text-[#555]">{f.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- File Size Treemap Panel --- */}
      {showTreemapPanel && (
        <div className="fixed top-16 right-4 z-40 w-[450px] max-h-[550px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
              <span className="text-sm font-medium text-white">File Size Treemap</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{fileSizeTreemap.length} file{fileSizeTreemap.length !== 1 ? 's' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowTreemapPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {fileSizeTreemap.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No files in project</div>}
            {(() => {
              const totalSize = fileSizeTreemap.reduce((a: any, f: any) => a + f.bytes, 0);
              return (
                <div className="flex flex-wrap gap-1">
                  {fileSizeTreemap.map((f: any, i: any) => {
                    const pct = Math.max(f.pct, 5);
                    return (
                      <div key={i} className="rounded border border-[#333] flex flex-col items-center justify-center p-1.5 text-center transition-all hover:border-[#555]" style={{ width: `${Math.max(pct * 3.5, 45)}px`, height: `${Math.max(pct * 2, 40)}px`, background: `${f.color}15` }} title={`${f.path} â€” ${f.bytes > 1024 ? (f.bytes / 1024).toFixed(1) + ' KB' : f.bytes + ' B'}`}>
                        <div className="text-[8px] text-[#ccc] truncate w-full">{f.path.split('/').pop()}</div>
                        <div className="text-[7px] mt-0.5" style={{ color: f.color }}>{f.bytes > 1024 ? (f.bytes / 1024).toFixed(1) + 'K' : f.bytes + 'B'}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {fileSizeTreemap.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[#222] pt-2">
                {Object.entries(fileSizeTreemap.reduce((acc: Record<string, { bytes: number; color: string }>, f: any) => {
                  const ext = f.path.split('.').pop() || '?';
                  if (!acc[ext]) acc[ext] = { bytes: 0, color: f.color };
                  acc[ext].bytes += f.bytes;
                  return acc;
                }, {} as Record<string, { bytes: number; color: string }>)).sort((a: any, b: any) => b[1].bytes - a[1].bytes).map(([ext, v]: any) => (
                  <span key={ext} className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: (v as any).color }} />{ext} <span className="text-[#555]">{(v as any).bytes > 1024 ? ((v as any).bytes / 1024).toFixed(1) + 'KB' : (v as any).bytes + 'B'}</span></span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* --- Unused CSS Detector Panel --- */}
      {showUnusedCssPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M3 3l18 18"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94"/></svg>
              <span className="text-sm font-medium text-white">Unused CSS</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{unusedCssSelectors.length} unused</span>
            </div>
            <button aria-label="Close" onClick={() => setShowUnusedCssPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {unusedCssSelectors.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No unused CSS selectors detected âœ“</div>}
            {unusedCssSelectors.map((s: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[11px]">
                <span className="text-amber-400 font-mono flex-1 truncate">{s.selector}</span>
                <span className="text-[#555] shrink-0">L{s.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Link Checker Panel --- */}
      {showLinkCheckerPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span className="text-sm font-medium text-white">Link Checker</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{brokenLinks.length} issue{brokenLinks.length !== 1 ? 's' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowLinkCheckerPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {brokenLinks.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">All links valid âœ“</div>}
            {brokenLinks.map((l: any, i: any) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-[11px]">
                <span className="shrink-0 mt-0.5">{l.type === 'anchor' ? 'âš“' : l.type === 'empty' ? 'âš ï¸' : 'ðŸ”—'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-cyan-300 font-mono truncate">{l.href}</div>
                  <div className="text-[#666] mt-0.5">{l.reason}</div>
                </div>
                <span className="text-[#555] shrink-0">L{l.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- DOM Tree Viewer Panel --- */}
      {showDomTreePanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[550px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="14"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="19" r="3"/><line x1="12" y1="14" x2="6" y2="16"/><line x1="12" y1="14" x2="18" y2="16"/></svg>
              <span className="text-sm font-medium text-white">DOM Tree</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{domTree.length} elements</span>
            </div>
            <button aria-label="Close" onClick={() => setShowDomTreePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px]">
            {domTree.length === 0 && <div className="text-center py-6 text-[#555] text-[11px] font-sans">No HTML file found</div>}
            {domTree.map((node: any, i: any) => {
              const tagColors: Record<string, string> = { html: '#e34c26', head: '#f59e0b', body: '#10b981', div: '#3b82f6', span: '#8b5cf6', a: '#06b6d4', p: '#6b7280', h1: '#ef4444', h2: '#ef4444', h3: '#ef4444', section: '#14b8a6', nav: '#f97316', main: '#22c55e', header: '#eab308', footer: '#a855f7', script: '#f59e0b', style: '#a855f7', img: '#ec4899', button: '#6366f1', input: '#8b5cf6', form: '#0ea5e9', ul: '#64748b', ol: '#64748b', li: '#94a3b8' };
              const color = tagColors[node.tag] || '#888';
              return (
                <div key={i} className="flex items-center py-0.5 hover:bg-[#1a1a1a] rounded transition-colors" style={{ paddingLeft: `${node.depth * 16 + 4}px` }}>
                  <span className="text-[#555] mr-1">{node.selfClose ? 'â—‡' : 'â–¸'}</span>
                  <span style={{ color }}>&lt;{node.tag}</span>
                  {node.attrs && <span className="text-[#555] ml-1 truncate max-w-[200px]">{node.attrs}</span>}
                  <span style={{ color }}>{node.selfClose ? ' />' : '>'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* --- Meta Tag Editor Panel --- */}
      {showMetaEditorPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              <span className="text-sm font-medium text-white">Meta Tags</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{metaTags.length} tag{metaTags.length !== 1 ? 's' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowMetaEditorPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {metaTags.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No meta tags found</div>}
            {metaTags.map((tag: any, i: any) => {
              const iconMap: Record<string, string> = { title: 'ðŸ“', description: 'ðŸ“„', 'og:title': 'ðŸŒ', 'og:description': 'ðŸŒ', 'og:image': 'ðŸ–¼ï¸', 'twitter:card': 'ðŸ¦', 'twitter:title': 'ðŸ¦', viewport: 'ðŸ“±', charset: 'ðŸ”¤', robots: 'ðŸ¤–', author: 'ðŸ‘¤' };
              return (
                <div key={i} className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs">{iconMap[tag.name] || 'ðŸ·ï¸'}</span>
                    <span className="text-[10px] font-medium text-purple-400">{tag.name}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-[#222] text-[#555]">{tag.type}</span>
                  </div>
                  <div className="text-[11px] text-[#ccc] font-mono break-all">{tag.content || '(empty)'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* --- Color Contrast Checker Panel --- */}
      {showContrastPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>
              <span className="text-sm font-medium text-white">Contrast Checker</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{contrastIssues.length} pair{contrastIssues.length !== 1 ? 's' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowContrastPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {contrastIssues.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No color pairs with explicit bg+fg found</div>}
            {contrastIssues.map((c: any, i: any) => (
              <div key={i} className={`p-2.5 rounded-lg border text-[11px] ${c.aaPass ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#ccc] font-mono truncate flex-1">{c.selector}</span>
                  <span className={`text-[10px] font-bold ${c.aaPass ? 'text-green-400' : 'text-red-400'}`}>{c.ratio}:1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-[#333]" style={{ background: c.fg }} /><span className="text-[9px] text-[#888]">{c.fg}</span></div>
                  <span className="text-[#555]">/</span>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-[#333]" style={{ background: c.bg }} /><span className="text-[9px] text-[#888]">{c.bg}</span></div>
                  <div className="ml-auto flex gap-1">
                    <span className={`text-[8px] px-1 py-0.5 rounded ${c.aaPass ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>AA</span>
                    <span className={`text-[8px] px-1 py-0.5 rounded ${c.aaaPass ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>AAA</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Z-Index Map Panel --- */}
      {showZIndexPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span className="text-sm font-medium text-white">Z-Index Map</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{zIndexMap.length}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowZIndexPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {zIndexMap.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No z-index values found</div>}
            {zIndexMap.map((z: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className="w-12 text-right font-mono font-bold" style={{ color: z.value > 100 ? '#ef4444' : z.value > 10 ? '#f59e0b' : '#10b981' }}>{z.value}</span>
                <span className="text-[#ccc] font-mono flex-1 truncate">{z.selector}</span>
                <span className="text-[9px] text-[#555] shrink-0">{z.file.split('/').pop()}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- TODO/FIXME Scanner Panel --- */}
      {showTodoScanPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span className="text-sm font-medium text-white">TODO Scanner</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{todoComments.length} comment{todoComments.length !== 1 ? 's' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowTodoScanPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {todoComments.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No TODO/FIXME comments found âœ“</div>}
            {todoComments.map((t: any, i: any) => {
              const typeColors: Record<string, string> = { TODO: '#3b82f6', FIXME: '#ef4444', HACK: '#f59e0b', NOTE: '#10b981', BUG: '#ef4444', XXX: '#f97316', OPTIMIZE: '#8b5cf6' };
              return (
                <button key={i} onClick={() => { setSelectedFile(t.file); setActiveTab('code'); const ed = monacoEditorRef.current as any; if (ed) setTimeout(() => { ed.revealLineInCenter(t.line); ed.setPosition({ lineNumber: t.line, column: 1 }); }, 100); }} className="w-full flex items-start gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px] text-left hover:border-[#333] transition-colors">
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0" style={{ background: `${typeColors[t.type] || '#555'}20`, color: typeColors[t.type] || '#888' }}>{t.type}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#ccc] truncate">{t.text}</div>
                    <div className="text-[#555] mt-0.5">{t.file}:{t.line}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* --- Regex Tester Panel --- */}
      {showRegexPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2"><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/></svg>
              <span className="text-sm font-medium text-white">Regex Tester</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{regexMatches.length} match{regexMatches.length !== 1 ? 'es' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowRegexPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3 space-y-2">
            <input value={regexInput} onChange={e => setRegexInput(e.target.value)} placeholder="Enter regex pattern..." className="w-full bg-[#111] border border-[#333] rounded px-3 py-1.5 text-[11px] text-white font-mono outline-none focus:border-rose-500/50" />
            <textarea value={regexTestStr} onChange={e => setRegexTestStr(e.target.value)} placeholder="Test string..." rows={3} className="w-full bg-[#111] border border-[#333] rounded px-3 py-1.5 text-[11px] text-white font-mono outline-none focus:border-rose-500/50 resize-none" />
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {regexMatches.map((m: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-rose-500/5 border border-rose-500/10 text-[10px]">
                <span className="text-rose-400 font-mono font-bold">{i + 1}</span>
                <span className="text-white font-mono flex-1 truncate">&quot;{m.match}&quot;</span>
                <span className="text-[#555]">@{m.index}</span>
                {m.groups.length > 0 && <span className="text-[#888]">({m.groups.length} groups)</span>}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- CSS Specificity Panel --- */}
      {showSpecificityPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              <span className="text-sm font-medium text-white">CSS Specificity</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{cssSpecificity.length} selectors</span>
            </div>
            <button aria-label="Close" onClick={() => setShowSpecificityPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {cssSpecificity.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No CSS file found</div>}
            {cssSpecificity.map((s: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <div className="flex gap-0.5 shrink-0">
                  <span className={`w-6 text-center text-[9px] font-bold rounded px-1 py-0.5 ${s.specificity[0] > 0 ? 'bg-red-500/20 text-red-400' : 'bg-[#222] text-[#555]'}`}>{s.specificity[0]}</span>
                  <span className={`w-6 text-center text-[9px] font-bold rounded px-1 py-0.5 ${s.specificity[1] > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-[#222] text-[#555]'}`}>{s.specificity[1]}</span>
                  <span className={`w-6 text-center text-[9px] font-bold rounded px-1 py-0.5 ${s.specificity[2] > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-[#222] text-[#555]'}`}>{s.specificity[2]}</span>
                </div>
                <span className="text-[#ccc] font-mono flex-1 truncate">{s.selector}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Image Lazy Loading Panel --- */}
      {showLazyImgPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              <span className="text-sm font-medium text-white">Image Checker</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{lazyImgIssues.length} image{lazyImgIssues.length !== 1 ? 's' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowLazyImgPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {lazyImgIssues.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No images found</div>}
            {lazyImgIssues.map((img: any, i: any) => (
              <div key={i} className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <div className="text-[#ccc] font-mono truncate mb-1">{img.src}</div>
                <div className="flex items-center gap-2 text-[9px]">
                  <span className={`px-1.5 py-0.5 rounded ${img.hasLazy ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{img.hasLazy ? 'âœ“ lazy' : 'âœ— no lazy'}</span>
                  <span className={`px-1.5 py-0.5 rounded ${img.hasAlt ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{img.hasAlt ? 'âœ“ alt' : 'âœ— no alt'}</span>
                  <span className={`px-1.5 py-0.5 rounded ${img.hasWidth ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>{img.hasWidth ? 'âœ“ dimensions' : 'âš  no dimensions'}</span>
                  <span className="text-[#555] ml-auto">{img.file}:{img.line}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Text Statistics Panel --- */}
      {showTextStatsPanel && textStats && (
        <div className="fixed top-16 right-4 z-40 w-[340px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
              <span className="text-sm font-medium text-white">Text Statistics</span>
            </div>
            <button aria-label="Close" onClick={() => setShowTextStatsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Words', value: textStats.words, color: '#6366f1' },
              { label: 'Characters', value: textStats.chars, color: '#8b5cf6' },
              { label: 'Sentences', value: textStats.sentences, color: '#a855f7' },
              { label: 'Paragraphs', value: textStats.paragraphs, color: '#d946ef' },
              { label: 'Headings', value: textStats.headings, color: '#ec4899' },
              { label: 'Links', value: textStats.links, color: '#06b6d4' },
              { label: 'Images', value: textStats.images, color: '#10b981' },
              { label: 'Read Time', value: `${textStats.readingTime}m`, color: '#f59e0b' },
              { label: 'Readability', value: textStats.readability, color: textStats.readability > 60 ? '#10b981' : textStats.readability > 30 ? '#f59e0b' : '#ef4444' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[9px] text-[#888] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Element Counter Panel --- */}
      {showElementCountPanel && elementCounts && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3L8 21"/><path d="M16 3l-2 18"/></svg>
              <span className="text-sm font-medium text-white">Element Counter</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{elementCounts.totalElements} total</span>
            </div>
            <button aria-label="Close" onClick={() => setShowElementCountPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Elements', value: elementCounts.totalElements, color: '#14b8a6' },
                { label: 'Unique Tags', value: elementCounts.uniqueTags, color: '#06b6d4' },
                { label: 'Classes', value: elementCounts.totalClasses, color: '#8b5cf6' },
                { label: 'IDs', value: elementCounts.totalIds, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} className="text-center p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[8px] text-[#888]">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="text-[9px] text-[#555] mb-1">Top elements:</div>
            <div className="max-h-[250px] overflow-y-auto space-y-0.5">
              {elementCounts.tagCounts.slice(0, 30).map(([tag, count]: any) => (
                <div key={tag} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] text-[11px]">
                  <span className="text-teal-400 font-mono w-20 truncate">&lt;{tag}&gt;</span>
                  <div className="flex-1 h-1.5 bg-[#222] rounded-full overflow-hidden"><div className="h-full bg-teal-500/40 rounded-full" style={{ width: `${Math.min(100, (count / elementCounts.totalElements) * 100 * 3)}%` }} /></div>
                  <span className="text-[#888] w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* --- Console Filter & Export Panel --- */}
      {showConsoleFilter && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              <span className="text-sm font-medium text-white">Console Filter</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{filteredConsoleLogs.length} entries</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={exportConsoleLogs} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Export .log</button>
              <button aria-label="Close" onClick={() => setShowConsoleFilter(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3 pt-2">
            {(['all', 'log', 'warn', 'error'] as const).map(level => (
              <button key={level} onClick={() => setConsoleFilterLevel(level)} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${consoleFilterLevel === level ? (level === 'error' ? 'bg-red-500/20 text-red-400' : level === 'warn' ? 'bg-amber-500/20 text-amber-400' : level === 'log' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#333] text-white') : 'text-[#555] hover:text-white'}`}>{level.toUpperCase()}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5 max-h-[350px]">
            {filteredConsoleLogs.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No console output</div>}
            {filteredConsoleLogs.map((log: any, i: any) => (
              <div key={i} className={`flex items-start gap-2 p-1.5 rounded text-[10px] font-mono ${log.type === 'error' ? 'bg-red-500/5 text-red-300' : log.type === 'warn' ? 'bg-amber-500/5 text-amber-300' : 'text-[#ccc]'}`}>
                <span className={`shrink-0 w-10 text-[8px] font-bold uppercase ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-blue-400'}`}>{log.type}</span>
                <span className="flex-1 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Inline Color Picker Panel --- */}
      {showColorEdit && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17.2 9.8l-4.7 4.7L8 18l-.5 3.5L11 21l3.5-4.5 4.7-4.7"/></svg>
              <span className="text-sm font-medium text-white">Color Picker</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{detectedColors.length} colors</span>
            </div>
            <button aria-label="Close" onClick={() => setShowColorEdit(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          {colorEditTarget && (
            <div className="px-3 pt-2 flex items-center gap-2">
              <input type="color" value={colorEditValue} onChange={e => setColorEditValue(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
              <input value={colorEditValue} onChange={e => setColorEditValue(e.target.value)} className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1 text-[11px] text-white font-mono outline-none" />
              <button onClick={applyColorEdit} className="px-2 py-1 rounded bg-pink-500/20 text-pink-400 text-[10px] hover:bg-pink-500/30 transition-colors">Apply</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 max-h-[350px]">
            {detectedColors.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No colors detected</div>}
            {detectedColors.map((c: any, i: any) => (
              <button key={i} onClick={() => { setColorEditTarget({ file: c.file, match: c.color, index: c.index }); setColorEditValue(c.color); }} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[#1a1a1a] border border-transparent hover:border-[#222] text-[11px] text-left transition-colors">
                <div className="w-5 h-5 rounded border border-[#333] shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-white font-mono flex-1 truncate">{c.color}</span>
                <span className="text-[#555] text-[9px]">{c.file.split('/').pop()}:{c.line}</span>
              </button>
            ))}
          </div>
        </div>
      )}


      {/* --- Dependency Graph Panel --- */}
      {showDepGraph && (
        <div className="fixed top-16 right-4 z-40 w-[440px] max-h-[520px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span className="text-sm font-medium text-white">Dependency Graph</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{depGraph.nodes.length} files, {depGraph.edges.length} imports</span>
            </div>
            <button aria-label="Close" onClick={() => setShowDepGraph(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[420px]">
            {depGraph.nodes.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No files in project</div>}
            {depGraph.nodes.map((node: any) => {
              const imports = depGraph.edges.filter((e: any) => e.from === node.id);
              const importedBy = depGraph.edges.filter((e: any) => e.to === node.id);
              return (
                <div key={node.id} className="rounded-lg bg-[#1a1a1a] border border-[#222] p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${node.type === 'tsx' || node.type === 'jsx' ? 'bg-blue-500/20 text-blue-400' : node.type === 'ts' || node.type === 'js' ? 'bg-amber-500/20 text-amber-400' : node.type === 'css' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#222] text-[#888]'}`}>{node.type}</span>
                    <span className="text-[11px] text-white font-mono truncate">{node.id}</span>
                    {importedBy.length > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 ml-auto">{importedBy.length} dependents</span>}
                  </div>
                  {imports.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {imports.map((imp: any) => <span key={imp.to} className="text-[8px] px-1.5 py-0.5 rounded bg-[#222] text-[#888] font-mono">â†’ {imp.to.split('/').pop()}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* --- Performance Budget Panel --- */}
      {showPerfBudget && (
        <div className="fixed top-16 right-4 z-40 w-[360px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-6"/></svg>
              <span className="text-sm font-medium text-white">Performance Budget</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${perfBudget.score >= 80 ? 'bg-green-500/20 text-green-400' : perfBudget.score >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{perfBudget.score}%</span>
            </div>
            <button aria-label="Close" onClick={() => setShowPerfBudget(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3 space-y-2">
            {perfBudget.checks.map((check: any) => (
              <div key={check.name} className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <span className={`text-sm ${check.pass ? 'text-green-400' : 'text-red-400'}`}>{check.pass ? 'âœ“' : 'âœ—'}</span>
                <div className="flex-1">
                  <div className="text-[11px] text-white">{check.name}</div>
                  <div className="text-[9px] text-[#555]">Limit: {check.limit}</div>
                </div>
                <span className={`text-[11px] font-mono font-bold ${check.pass ? 'text-green-400' : 'text-red-400'}`}>{check.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Responsive Preview Grid --- */}
      {showResponsiveGrid && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#222]">
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span className="text-sm font-medium text-white">Responsive Preview Grid</span>
              <span className="text-[10px] text-[#888]">4 viewports side by side</span>
            </div>
            <button aria-label="Close" onClick={() => setShowResponsiveGrid(false)} className="text-[#555] hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 p-4 overflow-hidden">
            {RESPONSIVE_VIEWPORTS.map((vp: any) => (
              <div key={vp.name} className="flex flex-col rounded-lg border border-[#333] overflow-hidden bg-[#0a0a0a]">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#222] bg-[#111]">
                  <span className="text-sm">{vp.icon}</span>
                  <span className="text-[11px] text-white font-medium">{vp.name}</span>
                  <span className="text-[9px] text-[#555] ml-auto">{vp.w}Ã—{vp.h}</span>
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <iframe
                    srcDoc={previewHtml || ''}
                    sandbox="allow-scripts allow-same-origin"
                    className="absolute inset-0 bg-white"
                    style={{
                      width: vp.w,
                      height: vp.h,
                      transform: `scale(${Math.min(1, 0.45)})`,
                      transformOrigin: 'top left',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- CSS Animation Inspector Panel --- */}
      {showAnimPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d946ef" strokeWidth="2"><path d="M5 3v18"/><path d="M12 3v18"/><path d="M19 3v18"/><path d="M5 12c2-4 5-4 7 0s5 4 7 0"/></svg>
              <span className="text-sm font-medium text-white">CSS Animations</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{cssAnimations.length} found</span>
            </div>
            <button aria-label="Close" onClick={() => setShowAnimPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {cssAnimations.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No CSS animations found</div>}
            {cssAnimations.map((a: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0 ${a.type === 'keyframes' ? 'bg-fuchsia-500/20 text-fuchsia-400' : a.type === 'animation' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{a.type}</span>
                <span className="text-white font-mono truncate">{a.name}</span>
                <span className="text-[#555] text-[9px] ml-auto truncate max-w-[120px]">{a.file.split('/').pop()}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Event Listener Audit Panel --- */}
      {showEventAudit && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              <span className="text-sm font-medium text-white">Event Listeners</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{inlineEvents.length} inline</span>
            </div>
            <button aria-label="Close" onClick={() => setShowEventAudit(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {inlineEvents.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No inline event handlers found âœ“</div>}
            {inlineEvents.map((ev: any, i: any) => (
              <div key={i} className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-mono font-bold">{ev.event}</span>
                  <span className="text-[#888]">on</span>
                  <span className="text-cyan-400 font-mono">&lt;{ev.element}&gt;</span>
                  <span className="text-[#555] text-[9px] ml-auto">{ev.file.split('/').pop()}:{ev.line}</span>
                </div>
                {ev.handler && <div className="text-[9px] text-[#666] font-mono mt-1 truncate">{ev.handler}</div>}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Open Graph Preview Panel --- */}
      {showOgPreview && ogData && (
        <div className="fixed top-16 right-4 z-40 w-[420px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              <span className="text-sm font-medium text-white">Social Preview</span>
            </div>
            <button aria-label="Close" onClick={() => setShowOgPreview(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-[10px] text-[#888] mb-1">Facebook / Twitter Card Preview</div>
            <div className="rounded-lg border border-[#333] overflow-hidden bg-white">
              {ogData.image && <div className="h-32 bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 overflow-hidden">
                <img src={ogData.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>}
              <div className="p-3 bg-[#f0f0f0]">
                {ogData.siteName && <div className="text-[10px] text-gray-500 uppercase">{ogData.siteName}</div>}
                <div className="text-sm font-bold text-gray-900 leading-tight">{ogData.title}</div>
                {ogData.desc && <div className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{ogData.desc}</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded bg-[#1a1a1a] border border-[#222]"><span className="text-[#555]">Title:</span> <span className="text-white">{ogData.title || 'â€”'}</span></div>
              <div className="p-2 rounded bg-[#1a1a1a] border border-[#222]"><span className="text-[#555]">Card:</span> <span className="text-white">{ogData.twitterCard}</span></div>
              <div className="p-2 rounded bg-[#1a1a1a] border border-[#222] col-span-2"><span className="text-[#555]">Description:</span> <span className="text-white">{ogData.desc || 'â€”'}</span></div>
            </div>
          </div>
        </div>
      )}


      {/* --- Semantic HTML Checker Panel --- */}
      {showSemanticPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              <span className="text-sm font-medium text-white">Semantic HTML</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${semanticIssues.length === 0 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{semanticIssues.length === 0 ? 'Clean âœ“' : `${semanticIssues.length} issues`}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowSemanticPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {semanticIssues.length === 0 && <div className="text-center py-6 text-green-400 text-[11px]">All HTML is semantic âœ“</div>}
            {semanticIssues.map((s: any, i: any) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 mt-0.5 ${s.severity === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{s.severity}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white">{s.issue}</div>
                  <div className="text-green-400 text-[9px]">â†’ {s.suggestion}</div>
                </div>
                <span className="text-[#555] text-[9px] shrink-0">{s.file.split('/').pop()}:{s.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- File Change Summary Panel --- */}
      {showChangeSummary && (
        <div className="fixed top-16 right-4 z-40 w-[360px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span className="text-sm font-medium text-white">Change Summary</span>
            </div>
            <button aria-label="Close" onClick={() => setShowChangeSummary(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          {!changeSummary ? (
            <div className="p-6 text-center text-[#555] text-[11px]">No previous snapshot to compare</div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="text-lg font-bold text-green-400">{changeSummary.added.length}</div>
                  <div className="text-[9px] text-[#888]">Added</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="text-lg font-bold text-amber-400">{changeSummary.modified.length}</div>
                  <div className="text-[9px] text-[#888]">Modified</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="text-lg font-bold text-red-400">{changeSummary.removed.length}</div>
                  <div className="text-[9px] text-[#888]">Removed</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-green-400">+{changeSummary.totalLinesAdded} lines</span>
                <span className="text-red-400">-{changeSummary.totalLinesRemoved} lines</span>
              </div>
              {changeSummary.added.length > 0 && <div className="space-y-0.5">{changeSummary.added.map((f: any) => <div key={f} className="text-[10px] text-green-400 font-mono">+ {f}</div>)}</div>}
              {changeSummary.modified.length > 0 && <div className="space-y-0.5">{changeSummary.modified.map((f: any) => <div key={f} className="text-[10px] text-amber-400 font-mono">~ {f}</div>)}</div>}
              {changeSummary.removed.length > 0 && <div className="space-y-0.5">{changeSummary.removed.map((f: any) => <div key={f} className="text-[10px] text-red-400 font-mono">- {f}</div>)}</div>}
            </div>
          )}
        </div>
      )}


      {/* --- Whitespace/Indent Checker Panel --- */}
      {showWhitespacePanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M21 10H3"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M21 18H3"/></svg>
              <span className="text-sm font-medium text-white">Whitespace Check</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${whitespaceIssues.length === 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{whitespaceIssues.length === 0 ? 'Clean âœ“' : `${whitespaceIssues.length} issues`}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowWhitespacePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {whitespaceIssues.length === 0 && <div className="text-center py-6 text-green-400 text-[11px]">No whitespace issues found âœ“</div>}
            {whitespaceIssues.map((w: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0 ${w.type === 'mixed-indent' ? 'bg-red-500/20 text-red-400' : w.type === 'trailing' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>{w.type}</span>
                <span className="text-[#ccc] flex-1 truncate">{w.issue}</span>
                <span className="text-[#555] text-[9px] shrink-0">{w.file.split('/').pop()}:{w.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- PWA Checker Panel --- */}
      {showPwaPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              <span className="text-sm font-medium text-white">PWA Checker</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${pwaChecks.score >= 80 ? 'bg-green-500/20 text-green-400' : pwaChecks.score >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{pwaChecks.score}%</span>
            </div>
            <button aria-label="Close" onClick={() => setShowPwaPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3 space-y-1.5">
            {pwaChecks.checks.map((check: any) => (
              <div key={check.name} className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <span className={`text-sm ${check.pass ? 'text-green-400' : 'text-red-400'}`}>{check.pass ? '\u2713' : '\u2717'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white">{check.name}</div>
                  <div className="text-[9px] text-[#555] truncate">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Schema.org Validator Panel --- */}
      {showSchemaPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span className="text-sm font-medium text-white">Schema.org / JSON-LD</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{schemaData.length} found</span>
            </div>
            <button aria-label="Close" onClick={() => setShowSchemaPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {schemaData.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No JSON-LD structured data found</div>}
            {schemaData.map((s: any, i: any) => (
              <div key={i} className="rounded-lg bg-[#1a1a1a] border border-[#222] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#222]">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${s.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.valid ? 'Valid' : 'Invalid'}</span>
                  <span className="text-[11px] text-amber-400 font-bold">{s.type}</span>
                  <span className="text-[9px] text-[#555] ml-auto">{s.props.length} properties</span>
                </div>
                {s.props.length > 0 && <div className="px-3 py-1.5 flex flex-wrap gap-1">{s.props.map((p: any) => <span key={p} className="text-[8px] px-1 py-0.5 rounded bg-[#222] text-[#888] font-mono">{p}</span>)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Bundle Size Estimator Panel --- */}
      {showBundlePanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <span className="text-sm font-medium text-white">Bundle Size</span>
            </div>
            <button aria-label="Close" onClick={() => setShowBundlePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="px-4 py-3 border-b border-[#222] grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-sm font-bold text-white">{(bundleEstimate.totalRaw / 1024).toFixed(1)} KB</div>
              <div className="text-[9px] text-[#555]">Raw Total</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-green-400">{(bundleEstimate.totalMin / 1024).toFixed(1)} KB</div>
              <div className="text-[9px] text-[#555]">Minified</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-amber-400">-{(bundleEstimate.savings / 1024).toFixed(1)} KB</div>
              <div className="text-[9px] text-[#555]">Savings</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {bundleEstimate.files.map((f: any) => (
              <div key={f.path} className="flex items-center gap-2 p-1.5 rounded hover:bg-[#1a1a1a] text-[11px]">
                <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${f.ext === 'js' || f.ext === 'ts' || f.ext === 'tsx' ? 'bg-amber-500/20 text-amber-400' : f.ext === 'css' ? 'bg-purple-500/20 text-purple-400' : f.ext === 'html' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#222] text-[#888]'}`}>{f.ext}</span>
                <span className="text-[#ccc] font-mono flex-1 truncate">{f.path}</span>
                <span className="text-[#888] text-[9px] w-16 text-right">{(f.raw / 1024).toFixed(1)} KB</span>
                <span className="text-green-400 text-[9px] w-16 text-right">{(f.minified / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- ARIA Roles Inspector Panel --- */}
      {showAriaPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              <span className="text-sm font-medium text-white">ARIA Inspector</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{ariaRoles.length} attributes</span>
            </div>
            <button aria-label="Close" onClick={() => setShowAriaPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {ariaRoles.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No ARIA attributes found</div>}
            {ariaRoles.map((r: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className="text-purple-400 font-mono font-bold text-[10px]">{r.role}</span>
                <span className="text-[#888]">on</span>
                <span className="text-cyan-400 font-mono">&lt;{r.element}&gt;</span>
                {!r.hasLabel && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">no label</span>}
                <span className="text-[#555] text-[9px] ml-auto">{r.file.split('/').pop()}:{r.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Security Headers Check Panel --- */}
      {showSecurityPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span className="text-sm font-medium text-white">Security Check</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${securityChecks.score >= 80 ? 'bg-green-500/20 text-green-400' : securityChecks.score >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{securityChecks.score}%</span>
            </div>
            <button aria-label="Close" onClick={() => setShowSecurityPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3 space-y-1.5">
            {securityChecks.checks.map((check: any) => (
              <div key={check.name} className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <span className={`text-sm ${check.pass ? 'text-green-400' : 'text-red-400'}`}>{check.pass ? '\u2713' : '\u2717'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white">{check.name}</div>
                  <div className="text-[9px] text-[#555]">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  );
}

export default memo(InspectorPanels);
