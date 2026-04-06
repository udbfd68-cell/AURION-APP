'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function EditorPanels({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showFindReplace, showShortcuts, showShortcutsRef, showThemeSelector, showVersionTimeline } = panelStore;

  const setShowFindReplace = (v: boolean) => setPanel('showFindReplace', v);
  const setShowShortcuts = (v: boolean) => setPanel('showShortcuts', v);
  const setShowShortcutsRef = (v: boolean) => setPanel('showShortcutsRef', v);
  const setShowThemeSelector = (v: boolean) => setPanel('showThemeSelector', v);
  const setShowVersionTimeline = (v: boolean) => setPanel('showVersionTimeline', v);

  const {
    EDITOR_THEMES,
    SHORTCUTS,
    editorTheme,
    findCaseSensitive,
    findInputRef,
    findQuery,
    findRegex,
    findResults,
    openFile,
    replaceInFiles,
    replaceQuery,
    setActiveTab,
    setEditorTheme,
    setFindCaseSensitive,
    setFindQuery,
    setFindRegex,
    setProjectFiles,
    setReplaceQuery,
    setVfsHistoryIdx,
    vfsHistory,
    vfsHistoryIdx,
  } = p;

  return (
    <>
      {/* --- Keyboard Shortcuts --- */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowShortcuts(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-md mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>
                  <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
                </div>
                <button aria-label="Close" onClick={() => setShowShortcuts(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                {['General', 'View', 'Edit', 'Chat', 'Project'].map(cat => {
                  const catShortcuts = SHORTCUTS.filter((s: any) => s.cat === cat);
                  if (catShortcuts.length === 0) return null;
                  return (
                    <div key={cat} className="mb-4">
                      <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">{cat}</h3>
                      {catShortcuts.map((s: any) => (
                        <div key={s.keys} className="flex items-center justify-between py-1.5">
                          <span className="text-[12px] text-[#aaa]">{s.desc}</span>
                          <kbd className="px-2 py-0.5 rounded bg-[#222] border border-[#333] text-[11px] text-white font-mono">{s.keys}</kbd>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* --- Editor Theme Selector --- */}
      <AnimatePresence>
        {showThemeSelector && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowThemeSelector(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-sm mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                  <h2 className="text-sm font-semibold text-white">Editor Theme</h2>
                </div>
                <button aria-label="Close" onClick={() => setShowThemeSelector(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-3 space-y-1">
                {EDITOR_THEMES.map((t: any) => (
                  <button key={t.id} onClick={() => { setEditorTheme(t.id); setShowThemeSelector(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${editorTheme === t.id ? 'bg-[#222] border border-[#444]' : 'hover:bg-[#1e1e1e] border border-transparent'}`}>
                    <div>
                      <p className="text-[12px] text-white font-medium text-left">{t.name}</p>
                      <p className="text-[10px] text-[#555] text-left">{t.desc}</p>
                    </div>
                    {editorTheme === t.id && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* --- Find & Replace --- */}
      <AnimatePresence>
        {showFindReplace && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowFindReplace(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <h2 className="text-sm font-semibold text-white">Find & Replace</h2>
                  {findQuery && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{findResults.length} matches</span>}
                </div>
                <button aria-label="Close" onClick={() => setShowFindReplace(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-[#111] border border-[#333] rounded-lg px-3 py-2 focus-within:border-[#555]">
                    <input ref={findInputRef} value={findQuery} onChange={(e) => setFindQuery(e.target.value)} placeholder="Find..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus />
                  </div>
                  <button onClick={() => setFindCaseSensitive(!findCaseSensitive)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${findCaseSensitive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#222] text-[#555] hover:text-white'}`} title="Case Sensitive">Aa</button>
                  <button onClick={() => setFindRegex(!findRegex)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${findRegex ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#222] text-[#555] hover:text-white'}`} title="Regex">.*</button>
                </div>
                <div className="flex gap-2">
                  <input value={replaceQuery} onChange={(e) => setReplaceQuery(e.target.value)} placeholder="Replace with..." className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] outline-none focus:border-[#555]" />
                  <button onClick={() => replaceInFiles(false)} disabled={!findQuery || !replaceQuery} className="px-3 py-1.5 rounded-lg bg-[#222] text-[11px] text-[#888] hover:text-white hover:bg-[#333] disabled:opacity-30 transition-colors">Replace</button>
                  <button onClick={() => replaceInFiles(true)} disabled={!findQuery || !replaceQuery} className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-[11px] text-blue-400 hover:bg-blue-600/30 disabled:opacity-30 transition-colors">All</button>
                </div>
                <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[#222]">
                  {findResults.length === 0 && findQuery && <div className="p-3 text-[11px] text-[#555] text-center">No matches</div>}
                  {findResults.slice(0, 50).map((r: any, i: any) => (
                    <button key={i} onClick={() => { openFile(r.file); setActiveTab('code'); }} className="w-full flex items-start gap-2 px-3 py-1.5 text-[10px] hover:bg-[#222] transition-colors text-left border-b border-[#1e1e1e] last:border-0">
                      <span className="text-[#666] w-[120px] truncate shrink-0">{r.file}:{r.line}</span>
                      <span className="text-[#aaa] truncate font-mono">{r.text.trim()}</span>
                    </button>
                  ))}
                  {findResults.length > 50 && <div className="p-2 text-[9px] text-[#555] text-center">...and {findResults.length - 50} more</div>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* --- Version Timeline --- */}
      <AnimatePresence>
        {showVersionTimeline && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowVersionTimeline(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-md mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <h2 className="text-sm font-semibold text-white">Version Timeline</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{vfsHistory.length} snapshots</span>
                </div>
                <button aria-label="Close" onClick={() => setShowVersionTimeline(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
                {vfsHistory.length === 0 ? (
                  <div className="py-8 text-center text-[12px] text-[#555]">No versions yet. Start editing to create snapshots.</div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[#222]" />
                    {vfsHistory.map((snapshot: any, i: any) => {
                      const fileCount = Object.keys(snapshot).length;
                      const totalSize = Object.values(snapshot).reduce((acc: any, f: any) => acc + (f.content?.length || 0), 0);
                      const isActive = i === vfsHistoryIdx;
                      return (
                        <div key={i} className={`relative flex items-start gap-3 py-2 pl-1 cursor-pointer hover:bg-[#222] rounded-lg px-2 transition-colors ${isActive ? 'bg-[#1e1e1e]' : ''}`} onClick={() => { setVfsHistoryIdx(i); setProjectFiles(snapshot); setShowVersionTimeline(false); }}>
                          <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${isActive ? 'border-emerald-500 bg-emerald-500/20' : 'border-[#333] bg-[#1a1a1a]'}`}>
                            {isActive && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-white font-medium">v{i + 1}</span>
                              {isActive && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Current</span>}
                            </div>
                            <p className="text-[10px] text-[#555]">{fileCount} files · {((totalSize as number) / 1024).toFixed(1)}KB</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* --- Keyboard Shortcuts Reference --- */}
      {showShortcutsRef && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[600px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M8 16h8"/></svg>
              <span className="text-sm font-medium text-white">Keyboard Shortcuts</span>
            </div>
            <button aria-label="Close" onClick={() => setShowShortcutsRef(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {[
              { title: 'General', shortcuts: [['âŒ˜K', 'Command Palette'], ['âŒ˜P', 'File Search'], ['âŒ˜â‡§F', 'Search in Files'], ['Escape', 'Close Panel'], ['âŒ˜Z', 'Undo (VFS)'], ['âŒ˜â‡§Z', 'Redo (VFS)']] },
              { title: 'Editor', shortcuts: [['âŒ˜S', 'Save File'], ['âŒ˜H', 'Find & Replace'], ['âŒ˜G', 'Go to Line'], ['âŒ˜D', 'Delete Line'], ['â‡§âŒ¥F', 'Format Code']] },
              { title: 'View', shortcuts: [['âŒ˜1', 'Code Tab'], ['âŒ˜2', 'Preview Tab'], ['âŒ˜3', 'Console Tab'], ['âŒ˜B', 'Toggle Sidebar'], ['âŒ˜\\\\', 'Split Preview']] },
              { title: 'AI', shortcuts: [['Enter', 'Send Message'], ['â‡§Enter', 'New Line in Input']] },
            ].map(group => (
              <div key={group.title}>
                <div className="text-[10px] font-medium text-[#888] uppercase tracking-wider mb-1.5">{group.title}</div>
                {group.shortcuts.map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between py-1 px-1 text-[11px] hover:bg-[#1a1a1a] rounded transition-colors">
                    <span className="text-[#ccc]">{desc}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[#222] border border-[#333] text-[9px] text-[#888] font-mono">{key}</kbd>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  );
}
