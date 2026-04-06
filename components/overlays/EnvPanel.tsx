'use client';
import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import { detectLanguage } from '@/lib/client-utils';

function EnvPanel({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showA11yPanel, showColorPalettePanel, showComplexityPanel, showConsolePanel, showCssVarsPanel, showDepsPanel, showDiffStatsPanel, showEnvPanel, showGotoLine, showImageOptPanel, showNetworkPanel, showOutlinePanel, showPerfPanel, showSeoPanel, showStatsPanel, showTailwindPanel } = panelStore;

  const setShowA11yPanel = (v: boolean) => setPanel('showA11yPanel', v);
  const setShowColorPalettePanel = (v: boolean) => setPanel('showColorPalettePanel', v);
  const setShowComplexityPanel = (v: boolean) => setPanel('showComplexityPanel', v);
  const setShowConsolePanel = (v: boolean) => setPanel('showConsolePanel', v);
  const setShowCssVarsPanel = (v: boolean) => setPanel('showCssVarsPanel', v);
  const setShowDepsPanel = (v: boolean) => setPanel('showDepsPanel', v);
  const setShowDiffStatsPanel = (v: boolean) => setPanel('showDiffStatsPanel', v);
  const setShowEnvPanel = (v: boolean) => setPanel('showEnvPanel', v);
  const setShowGotoLine = (v: boolean) => setPanel('showGotoLine', v);
  const setShowImageOptPanel = (v: boolean) => setPanel('showImageOptPanel', v);
  const setShowNetworkPanel = (v: boolean) => setPanel('showNetworkPanel', v);
  const setShowOutlinePanel = (v: boolean) => setPanel('showOutlinePanel', v);
  const setShowPerfPanel = (v: boolean) => setPanel('showPerfPanel', v);
  const setShowSeoPanel = (v: boolean) => setPanel('showSeoPanel', v);
  const setShowStatsPanel = (v: boolean) => setPanel('showStatsPanel', v);
  const setShowTailwindPanel = (v: boolean) => setPanel('showTailwindPanel', v);

  const {
    a11yIssues,
    addEnvVar,
    closeTab,
    codeComplexity,
    codeSymbols,
    consoleLogs,
    cssVariables,
    detectedDeps,
    diffStats,
    envVars,
    explorerContextMenu,
    extractedColors,
    gotoLineRef,
    gotoLineValue,
    hoveredImage,
    imageAssets,
    integrationKeys,
    monacoEditorRef,
    networkCalls,
    newEnvKey,
    newEnvValue,
    openFile,
    openTabs,
    perfIssues,
    projectFiles,
    projectStats,
    removeEnvVar,
    renameInputRef,
    runA11yAudit,
    runPerfAudit,
    selectedFile,
    seoDescription,
    seoOgImage,
    seoTitle,
    setConsoleLogs,
    setEnvVars,
    setExplorerContextMenu,
    setGotoLineValue,
    setNewEnvKey,
    setNewEnvValue,
    setProjectFiles,
    setRenameTarget,
    setRenameValue,
    setSelectedFile,
    setSeoDescription,
    setSeoOgImage,
    setSeoTitle,
    setTabContextMenu,
    showToast,
    syncEnvToVFS,
    tabContextMenu,
    toasts,
  } = p;

  return (
    <>
      {/* --- .env Management Modal --- */}
      <AnimatePresence>
        {showEnvPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowEnvPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Environment Variables</h2>
                  <p className="text-[10px] text-[#555] mt-0.5">Stored in .env file in your project</p>
                </div>
                <button aria-label="Close" onClick={() => setShowEnvPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
                {envVars.map((v: any, i: any) => (
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

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t: any) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.95 }} transition={{ duration: 0.2 }}
              className={`pointer-events-auto px-3 py-2 rounded-lg text-[11px] font-medium shadow-lg backdrop-blur-sm border ${t.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' : t.type === 'info' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'}`}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tab Context Menu */}
      <AnimatePresence>
        {tabContextMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
            className="fixed z-[9999] bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: tabContextMenu.x, top: tabContextMenu.y }}
            onClick={() => setTabContextMenu(null)}>
            <button onClick={() => { closeTab(tabContextMenu.file); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Close</button>
            <button onClick={() => { const others = openTabs.filter((t: any) => t !== tabContextMenu.file); others.forEach((t: any) => closeTab(t)); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Close Others</button>
            <button onClick={() => { openTabs.forEach((t: any) => closeTab(t)); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Close All</button>
            <div className="border-t border-[#333] my-1" />
            <button onClick={() => { navigator.clipboard.writeText(tabContextMenu.file); showToast('Path copied', 'success'); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Copy Path</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goto Line Dialog */}
      <AnimatePresence>
        {showGotoLine && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9998] flex items-start justify-center pt-[20vh]" onClick={() => setShowGotoLine(false)}>
            <motion.div initial={{ y: -10, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -10, scale: 0.97 }} onClick={e => e.stopPropagation()}
              className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl p-3 w-[280px]">
              <p className="text-[10px] text-[#555] mb-2 font-medium">Go to Line</p>
              <input ref={gotoLineRef} value={gotoLineValue} onChange={e => setGotoLineValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const line = parseInt(gotoLineValue);
                    if (!isNaN(line) && line > 0 && monacoEditorRef.current) {
                      const editor = monacoEditorRef.current as { revealLineInCenter: (n: number) => void; setPosition: (p: { lineNumber: number; column: number }) => void; focus: () => void };
                      editor.revealLineInCenter(line);
                      editor.setPosition({ lineNumber: line, column: 1 });
                      editor.focus();
                    }
                    setShowGotoLine(false);
                    setGotoLineValue('');
                  }
                }}
                placeholder="Line number..."
                className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-white text-[12px] placeholder:text-[#444] outline-none focus:border-[#555]"
                autoFocus
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explorer Context Menu */}
      <AnimatePresence>
        {explorerContextMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
            className="fixed z-[9999] bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-1 min-w-[170px]"
            style={{ left: explorerContextMenu.x, top: explorerContextMenu.y }}
            onClick={() => setExplorerContextMenu(null)}>
            {explorerContextMenu.isDir ? (
              <>
                <button onClick={() => { const name = prompt('New file name:', explorerContextMenu.path + '/'); if (name?.trim()) { setProjectFiles((prev: any) => ({ ...prev, [name.trim()]: { content: '', language: detectLanguage(name.trim()) } })); openFile(name.trim()); showToast(`Created ${name.trim()}`, 'success'); } }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">New File in Folder</button>
                <button onClick={() => {
                  const prefix = explorerContextMenu.path + '/';
                  const files = Object.keys(projectFiles).filter(f => f.startsWith(prefix));
                  if (files.length === 0 || confirm(`Delete folder "${explorerContextMenu.path}" and ${files.length} file(s)?`)) {
                    setProjectFiles((prev: any) => {
                      const next = { ...prev };
                      files.forEach(f => delete next[f]);
                      return next;
                    });
                    showToast(`Deleted folder: ${explorerContextMenu.path}`, 'success');
                  }
                }} className="w-full px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-[#2a2a2a] transition-colors">Delete Folder</button>
              </>
            ) : (
              <>
                <button onClick={() => { setRenameTarget(explorerContextMenu.path); setRenameValue(explorerContextMenu.path.split('/').pop() || ''); setTimeout(() => renameInputRef.current?.focus(), 50); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Rename</button>
                <button onClick={() => { const src = explorerContextMenu.path; const ext = src.lastIndexOf('.'); const cp = ext > 0 ? src.slice(0, ext) + '-copy' + src.slice(ext) : src + '-copy'; setProjectFiles((prev: any) => ({ ...prev, [cp]: { ...prev[src] } })); showToast(`Duplicated as ${cp.split('/').pop()}`, 'success'); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Duplicate</button>
                <button onClick={() => { navigator.clipboard.writeText(explorerContextMenu.path); showToast('Path copied', 'success'); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Copy Path</button>
                <div className="border-t border-[#333] my-1" />
                <button onClick={() => {
                  const file = explorerContextMenu.path;
                  if (confirm(`Delete "${file}"?`)) {
                    setProjectFiles((prev: any) => { const next = { ...prev }; delete next[file]; return next; });
                    if (selectedFile === file) { const remaining = Object.keys(projectFiles).filter(f => f !== file); setSelectedFile(remaining[0] || ''); }
                    closeTab(file);
                    showToast(`Deleted ${file.split('/').pop()}`, 'success');
                  }
                }} className="w-full px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-[#2a2a2a] transition-colors">Delete</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Tooltip */}
      {hoveredImage && projectFiles[hoveredImage.path] && (
        <div className="fixed z-[9999] pointer-events-none" style={{ left: hoveredImage.x + 16, top: hoveredImage.y - 60 }}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl p-2 max-w-[200px]">
            {projectFiles[hoveredImage.path].content.startsWith('<svg') || projectFiles[hoveredImage.path].content.startsWith('<?xml') ? (
              <iframe
                sandbox=""
                srcDoc={projectFiles[hoveredImage.path].content.slice(0, 5000)}
                className="w-[180px] h-[120px] bg-[#111] rounded overflow-hidden border-0"
                title="SVG preview"
              />
            ) : projectFiles[hoveredImage.path].content.startsWith('data:') ? (
              <img src={projectFiles[hoveredImage.path].content} alt="" className="max-w-[180px] max-h-[120px] rounded object-contain" />
            ) : (
              <div className="w-[180px] h-[60px] flex items-center justify-center text-[10px] text-[#555] bg-[#111] rounded">Image file</div>
            )}
            <p className="text-[9px] text-[#666] mt-1 truncate">{hoveredImage.path.split('/').pop()}</p>
          </div>
        </div>
      )}

      {/* A11y Audit Panel */}
      <AnimatePresence>
        {showA11yPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowA11yPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="4" r="2"/><path d="M12 6v6"/><path d="M8 22l4-10 4 10"/><path d="M6 14h12"/></svg>
                  <h2 className="text-sm font-semibold text-white">Accessibility Audit</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{a11yIssues.length} issues</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={runA11yAudit} className="px-2 py-1 text-[10px] rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Re-scan</button>
                  <button aria-label="Close" onClick={() => setShowA11yPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                {a11yIssues.map((issue: any, i: any) => (
                  <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${issue.type === 'error' ? 'border-red-500/20 bg-red-500/5' : issue.type === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}>
                    <span className="mt-0.5 shrink-0">
                      {issue.type === 'error' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> : issue.type === 'warning' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/90">{issue.message}</p>
                      <p className="text-[10px] text-[#666] mt-0.5 font-mono truncate">{issue.element}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEO Meta Editor Panel */}
      <AnimatePresence>
        {showSeoPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowSeoPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <h2 className="text-sm font-semibold text-white">SEO Meta Editor</h2>
                </div>
                <button aria-label="Close" onClick={() => setShowSeoPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] text-[#888] mb-1.5 block">Page Title <span className="text-[#555]">({seoTitle.length}/60)</span></label>
                  <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="My Awesome App" className={`w-full px-3 py-2 bg-[#111] border rounded-lg text-sm text-white outline-none transition-colors ${seoTitle.length > 60 ? 'border-red-500/50 focus:border-red-500' : 'border-[#2a2a2a] focus:border-[#444]'}`} />
                </div>
                <div>
                  <label className="text-[11px] text-[#888] mb-1.5 block">Meta Description <span className="text-[#555]">({seoDescription.length}/160)</span></label>
                  <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="A brief description of your page..." rows={3} className={`w-full px-3 py-2 bg-[#111] border rounded-lg text-sm text-white outline-none resize-none transition-colors ${seoDescription.length > 160 ? 'border-red-500/50 focus:border-red-500' : 'border-[#2a2a2a] focus:border-[#444]'}`} />
                </div>
                <div>
                  <label className="text-[11px] text-[#888] mb-1.5 block">OG Image URL</label>
                  <input value={seoOgImage} onChange={(e) => setSeoOgImage(e.target.value)} placeholder="https://example.com/og-image.png" className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white outline-none focus:border-[#444] transition-colors" />
                </div>
                {/* Google Preview */}
                <div className="p-3 bg-[#111] rounded-lg border border-[#222]">
                  <p className="text-[10px] text-[#555] mb-2">Google Preview</p>
                  <p className="text-[#8ab4f8] text-sm leading-snug truncate">{seoTitle || 'Page Title'}</p>
                  <p className="text-[#bdc1c6] text-[11px] mt-0.5 line-clamp-2">{seoDescription || 'No description provided.'}</p>
                  <p className="text-[#969ba1] text-[10px] mt-0.5">https://yoursite.com</p>
                </div>
                <button onClick={() => {
                  if (!projectFiles['index.html']) { showToast('No index.html found', 'error'); return; }
                  let html = projectFiles['index.html'].content;
                  // Update or insert title
                  if (/<title>[^<]*<\/title>/i.test(html)) html = html.replace(/<title>[^<]*<\/title>/i, `<title>${seoTitle}</title>`);
                  else html = html.replace(/<head([^>]*)>/i, `<head$1><title>${seoTitle}</title>`);
                  // Update or insert description
                  if (/<meta[^>]*name=["']description["'][^>]*>/i.test(html)) html = html.replace(/<meta[^>]*name=["']description["'][^>]*>/i, `<meta name="description" content="${seoDescription}">`);
                  else html = html.replace(/<\/head>/i, `<meta name="description" content="${seoDescription}"></head>`);
                  // Update or insert og:image
                  if (seoOgImage) {
                    if (/<meta[^>]*property=["']og:image["'][^>]*>/i.test(html)) html = html.replace(/<meta[^>]*property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${seoOgImage}">`);
                    else html = html.replace(/<\/head>/i, `<meta property="og:image" content="${seoOgImage}"></head>`);
                  }
                  setProjectFiles((prev: any) => ({ ...prev, 'index.html': { ...prev['index.html'], content: html } }));
                  showToast('SEO meta tags updated', 'success');
                  setShowSeoPanel(false);
                }} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors">Apply Meta Tags</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tailwind Classes Browser */}
      <AnimatePresence>
        {showTailwindPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowTailwindPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  <h2 className="text-sm font-semibold text-white">Tailwind CSS Classes</h2>
                </div>
                <button aria-label="Close" onClick={() => setShowTailwindPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                {[
                  { cat: 'Spacing', classes: ['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'px-4', 'py-2', 'm-0', 'm-1', 'm-2', 'm-4', 'mx-auto', 'my-4', 'gap-1', 'gap-2', 'gap-4', 'gap-6', 'space-x-2', 'space-y-2', 'space-x-4', 'space-y-4'] },
                  { cat: 'Layout', classes: ['flex', 'inline-flex', 'grid', 'block', 'inline-block', 'hidden', 'items-center', 'items-start', 'items-end', 'justify-center', 'justify-between', 'justify-start', 'justify-end', 'flex-col', 'flex-row', 'flex-wrap', 'flex-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'col-span-2'] },
                  { cat: 'Sizing', classes: ['w-full', 'w-1/2', 'w-1/3', 'w-auto', 'w-screen', 'h-full', 'h-screen', 'h-auto', 'min-h-screen', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-4xl', 'max-w-6xl'] },
                  { cat: 'Typography', classes: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'text-center', 'text-left', 'text-right', 'uppercase', 'lowercase', 'capitalize', 'truncate', 'leading-tight', 'leading-relaxed', 'tracking-wide'] },
                  { cat: 'Colors', classes: ['text-white', 'text-black', 'text-gray-500', 'text-red-500', 'text-blue-500', 'text-green-500', 'text-yellow-500', 'text-purple-500', 'bg-white', 'bg-black', 'bg-gray-100', 'bg-gray-900', 'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-gradient-to-r', 'from-blue-500', 'to-purple-500'] },
                  { cat: 'Borders', classes: ['border', 'border-2', 'border-0', 'border-t', 'border-b', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full', 'border-gray-200', 'border-gray-700', 'divide-y', 'divide-x', 'ring-1', 'ring-2'] },
                  { cat: 'Effects', classes: ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'opacity-0', 'opacity-50', 'opacity-100', 'blur-sm', 'blur', 'backdrop-blur-sm', 'backdrop-blur-md', 'transition', 'transition-all', 'duration-200', 'duration-300', 'hover:scale-105', 'hover:opacity-80'] },
                  { cat: 'Positioning', classes: ['relative', 'absolute', 'fixed', 'sticky', 'top-0', 'right-0', 'bottom-0', 'left-0', 'inset-0', 'z-10', 'z-20', 'z-50', 'overflow-hidden', 'overflow-auto', 'overflow-x-auto', 'overflow-y-auto'] },
                ].map(group => (
                  <div key={group.cat} className="mb-4">
                    <h3 className="text-[11px] font-semibold text-[#888] mb-2 uppercase tracking-wider">{group.cat}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.classes.map(cls => (
                        <button key={cls} onClick={() => { navigator.clipboard.writeText(cls); showToast(`Copied: ${cls}`, 'success'); }} className="px-2 py-1 text-[10px] font-mono rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc] hover:border-[#444] hover:text-white transition-colors cursor-pointer">{cls}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color Palette Extractor */}
      <AnimatePresence>
        {showColorPalettePanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowColorPalettePanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5.5-4.5-9-10-9z"/></svg>
                  <h2 className="text-sm font-semibold text-white">Color Palette</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{extractedColors.length} colors</span>
                </div>
                <button aria-label="Close" onClick={() => setShowColorPalettePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                {extractedColors.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No colors found in project files</p>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {extractedColors.map((color: any, i: any) => (
                      <button key={i} onClick={() => { navigator.clipboard.writeText(color); showToast(`Copied: ${color}`, 'success'); }} className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors" title={color}>
                        <div className="w-10 h-10 rounded-lg border border-[#333] shadow-inner group-hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                        <span className="text-[8px] text-[#666] group-hover:text-white font-mono truncate max-w-[60px] transition-colors">{color}</span>
                      </button>
                    ))}
                  </div>
                )}
                {extractedColors.length > 0 && (
                  <button onClick={() => { navigator.clipboard.writeText(extractedColors.join(', ')); showToast('All colors copied', 'success'); }} className="mt-4 w-full py-2 rounded-lg border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white hover:border-[#444] transition-colors">Copy All Colors</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Audit Panel */}
      <AnimatePresence>
        {showPerfPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowPerfPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  <h2 className="text-sm font-semibold text-white">Performance Audit</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={runPerfAudit} className="px-2 py-1 text-[10px] rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">Re-scan</button>
                  <button aria-label="Close" onClick={() => setShowPerfPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                {perfIssues.map((issue: any, i: any) => (
                  <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${i === 0 ? 'border-[#333] bg-[#1a1a1a]' : issue.type === 'error' ? 'border-red-500/20 bg-red-500/5' : issue.type === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}>
                    <span className="mt-0.5 shrink-0">
                      {i === 0 ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> : issue.type === 'error' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> : issue.type === 'warning' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] ${i === 0 ? 'text-white font-semibold' : 'text-white/90'}`}>{issue.message}</p>
                      <p className="text-[10px] text-[#666] mt-0.5">{issue.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Stats Panel */}
      <AnimatePresence>
        {showStatsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowStatsPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-md mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                  <h2 className="text-sm font-semibold text-white">Project Statistics</h2>
                </div>
                <button aria-label="Close" onClick={() => setShowStatsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[#111] border border-[#222] text-center">
                    <p className="text-xl font-bold text-white">{projectStats.total}</p>
                    <p className="text-[10px] text-[#666] mt-1">Files</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111] border border-[#222] text-center">
                    <p className="text-xl font-bold text-white">{projectStats.totalLines.toLocaleString()}</p>
                    <p className="text-[10px] text-[#666] mt-1">Lines</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111] border border-[#222] text-center">
                    <p className="text-xl font-bold text-white">{(projectStats.totalBytes / 1024).toFixed(1)}KB</p>
                    <p className="text-[10px] text-[#666] mt-1">Size</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] text-[#888] mb-2 font-medium">Language Breakdown</h3>
                  <div className="space-y-1.5">
                    {projectStats.languages.map(([lang, info]: any) => {
                      const pct = projectStats.totalLines > 0 ? (info.lines / projectStats.totalLines * 100) : 0;
                      const colors: Record<string, string> = { html: '#e34c26', css: '#563d7c', javascript: '#f7df1e', typescript: '#3178c6', json: '#292929', markdown: '#083fa1', plaintext: '#555' };
                      return (
                        <div key={lang} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[lang] || '#555' }} />
                          <span className="text-[11px] text-[#ccc] w-20 truncate">{lang}</span>
                          <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[lang] || '#555' }} />
                          </div>
                          <span className="text-[10px] text-[#666] w-12 text-right">{info.files}f {info.lines}L</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Variables Manager */}
      <AnimatePresence>
        {showCssVarsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowCssVarsPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  <h2 className="text-sm font-semibold text-white">CSS Variables</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{cssVariables.length} vars</span>
                </div>
                <button aria-label="Close" onClick={() => setShowCssVarsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1">
                {cssVariables.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No CSS custom properties found</p>
                ) : cssVariables.map((v: any, i: any) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#1a1a1a] group transition-colors">
                    {(v.value.startsWith('#') || v.value.startsWith('rgb') || v.value.startsWith('hsl')) && (
                      <span className="w-4 h-4 rounded border border-[#333] shrink-0" style={{ backgroundColor: v.value }} />
                    )}
                    <span className="text-[11px] font-mono text-purple-400 shrink-0">{v.name}</span>
                    <span className="text-[10px] text-[#666]">:</span>
                    <span className="text-[11px] font-mono text-[#ccc] truncate flex-1">{v.value}</span>
                    <span className="text-[9px] text-[#444] shrink-0">{v.file.split('/').pop()}</span>
                    <button onClick={() => { navigator.clipboard.writeText(`var(${v.name})`); showToast(`Copied: var(${v.name})`, 'success'); }} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-white transition-all shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Console Output Panel */}
      <AnimatePresence>
        {showConsolePanel && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-8 right-4 z-40 w-96 max-h-[300px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl flex flex-col">
            <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                <span className="text-[11px] text-white font-medium">Console</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{consoleLogs.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setConsoleLogs([])} className="text-[9px] text-[#555] hover:text-white transition-colors px-1">Clear</button>
                <button aria-label="Close" onClick={() => setShowConsolePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-0.5 font-mono text-[10px]">
              {consoleLogs.length === 0 ? (
                <p className="text-[#444] text-center py-4">No console output</p>
              ) : consoleLogs.map((log: any, i: any) => (
                <div key={i} className={`px-2 py-1 rounded ${log.type === 'error' ? 'text-red-400 bg-red-500/5' : log.type === 'warn' ? 'text-yellow-400 bg-yellow-500/5' : 'text-[#aaa]'}`}>
                  <span className="text-[#444] mr-2">{new Date(log.ts).toLocaleTimeString()}</span>
                  {log.message}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dependency Inspector */}
      <AnimatePresence>
        {showDepsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowDepsPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  <h2 className="text-sm font-semibold text-white">Dependencies</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{detectedDeps.length} detected</span>
                </div>
                <button aria-label="Close" onClick={() => setShowDepsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                {detectedDeps.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No CDN dependencies detected</p>
                ) : detectedDeps.map((dep: any, i: any) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#2a2a2a] hover:border-[#333] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 text-[11px] font-bold shrink-0">{dep.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-white font-medium">{dep.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666] font-mono">{dep.version}</span>
                      </div>
                      <span className="text-[10px] text-[#555]">{dep.type}</span>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(dep.name.toLowerCase()); showToast(`Copied: ${dep.name}`, 'success'); }} className="text-[#555] hover:text-white transition-colors shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code Complexity Analyzer */}
      <AnimatePresence>
        {showComplexityPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowComplexityPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  <h2 className="text-sm font-semibold text-white">Code Complexity</h2>
                </div>
                <button aria-label="Close" onClick={() => setShowComplexityPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-[#666] border-b border-[#222]">
                      <th className="text-left py-2 pl-2">File</th>
                      <th className="text-right py-2 px-2">Lines</th>
                      <th className="text-right py-2 px-2">Functions</th>
                      <th className="text-right py-2 px-2">Max Depth</th>
                      <th className="text-right py-2 pr-2">Complexity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codeComplexity.map((f: any, i: any) => (
                      <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                        <td className="py-2 pl-2 text-[#ccc] font-mono truncate max-w-[150px]">{f.file}</td>
                        <td className="py-2 px-2 text-right text-[#888]">{f.lines}</td>
                        <td className="py-2 px-2 text-right text-[#888]">{f.functions}</td>
                        <td className="py-2 px-2 text-right text-[#888]">{f.maxDepth}</td>
                        <td className={`py-2 pr-2 text-right font-medium ${f.complexity === 'High' ? 'text-red-400' : f.complexity === 'Medium' ? 'text-yellow-400' : 'text-emerald-400'}`}>{f.complexity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Code Outline / Symbol Navigator */}
      <AnimatePresence>
        {showOutlinePanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowOutlinePanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
                  <h2 className="text-sm font-semibold text-white">Code Outline</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{codeSymbols.length} symbols</span>
                </div>
                <button aria-label="Close" onClick={() => setShowOutlinePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {codeSymbols.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No symbols found in {selectedFile || 'current file'}</p>
                ) : codeSymbols.map((sym: any, i: any) => (
                  <button key={i} onClick={() => { const ed = monacoEditorRef.current as any; if (ed) { ed.revealLineInCenter(sym.line); ed.setPosition({ lineNumber: sym.line, column: 1 }); ed.focus(); } setShowOutlinePanel(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${sym.type === 'function' ? 'bg-blue-500/20 text-blue-400' : sym.type === 'class' ? 'bg-purple-500/20 text-purple-400' : sym.type === 'component' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{sym.type === 'function' ? 'fn' : sym.type === 'class' ? 'cls' : sym.type === 'component' ? 'cmp' : 'id'}</span>
                    <span className="text-[12px] text-white font-mono truncate flex-1">{sym.name}</span>
                    <span className="text-[10px] text-[#555] shrink-0">:{sym.line}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Image Size Analyzer */}
      <AnimatePresence>
        {showImageOptPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowImageOptPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <h2 className="text-sm font-semibold text-white">Image Size Analyzer</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{imageAssets.reduce((a: any, b: any) => a + b.count, 0)} images</span>
                </div>
                <button aria-label="Close" onClick={() => setShowImageOptPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {imageAssets.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No inline base64 images detected</p>
                ) : imageAssets.map((asset: any, i: any) => (
                  <div key={i} className="p-3 rounded-lg border border-[#2a2a2a] hover:border-[#333] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-white font-medium font-mono">{asset.file}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${asset.totalSize > 100 ? 'bg-red-500/20 text-red-400' : asset.totalSize > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{asset.totalSize}KB total</span>
                    </div>
                    <div className="space-y-1">
                      {asset.images.map((img: any, j: any) => (
                        <div key={j} className="flex items-center gap-2 text-[10px]">
                          <span className="text-[#666] font-mono truncate flex-1">{img.src}</span>
                          <span className={`shrink-0 ${img.sizeKB > 50 ? 'text-red-400' : 'text-[#888]'}`}>{img.sizeKB}KB</span>
                        </div>
                      ))}
                    </div>
                    {asset.totalSize > 100 && <p className="text-[10px] text-yellow-400 mt-2">Consider using external URLs instead of inline base64 for large images</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Code Diff Statistics */}
      <AnimatePresence>
        {showDiffStatsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowDiffStatsPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M12 3v18M3 12h18"/></svg>
                  <h2 className="text-sm font-semibold text-white">Diff Statistics</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{diffStats.length} changed</span>
                </div>
                <button aria-label="Close" onClick={() => setShowDiffStatsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3">
                {diffStats.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No changes detected (need at least 2 snapshots)</p>
                ) : (
                  <>
                    <div className="flex items-center gap-4 mb-3 px-2">
                      <span className="text-[11px] text-emerald-400">+{diffStats.reduce((a: any, b: any) => a + b.added, 0)} additions</span>
                      <span className="text-[11px] text-red-400">-{diffStats.reduce((a: any, b: any) => a + b.removed, 0)} deletions</span>
                      <span className="text-[11px] text-[#666]">{diffStats.length} files changed</span>
                    </div>
                    {diffStats.map((s: any, i: any) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-2 rounded hover:bg-[#1a1a1a] transition-colors">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${s.status === 'added' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'deleted' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{s.status.charAt(0).toUpperCase()}</span>
                        <span className="text-[11px] text-[#ccc] font-mono truncate flex-1">{s.file}</span>
                        <span className="text-[10px] text-emerald-400 shrink-0">+{s.added}</span>
                        <span className="text-[10px] text-red-400 shrink-0">-{s.removed}</span>
                        <div className="w-20 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden flex shrink-0">
                          <div className="h-full bg-emerald-500" style={{ width: `${s.added / (s.added + s.removed + 1) * 100}%` }} />
                          <div className="h-full bg-red-500" style={{ width: `${s.removed / (s.added + s.removed + 1) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Network / API Calls Panel */}
      <AnimatePresence>
        {showNetworkPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowNetworkPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  <h2 className="text-sm font-semibold text-white">Network / API Calls</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{networkCalls.length} calls</span>
                </div>
                <button aria-label="Close" onClick={() => setShowNetworkPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1">
                {networkCalls.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No API calls detected in project files</p>
                ) : networkCalls.map((call: any, i: any) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#2a2a2a] hover:border-[#333] transition-colors">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${call.method.includes('post') || call.method === 'POST' ? 'bg-yellow-500/20 text-yellow-400' : call.method.includes('delete') || call.method === 'DELETE' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{call.method.toUpperCase().replace('AXIOS.', '')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white font-mono truncate">{call.url}</p>
                      <p className="text-[9px] text-[#555]">{call.file}:{call.line}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(call.url); showToast('URL copied', 'success'); }} className="text-[#555] hover:text-white transition-colors shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Breakpoint Tester Overlay */}
    </>
  );
}

export default memo(EnvPanel);
