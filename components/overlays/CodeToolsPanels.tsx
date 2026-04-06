'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function CodeToolsPanels({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showBookmarks, showDuplicatePanel, showFoldMap, showSnippetsPanel } = panelStore;

  const setShowBookmarks = (v: boolean) => setPanel('showBookmarks', v);
  const setShowDuplicatePanel = (v: boolean) => setPanel('showDuplicatePanel', v);
  const setShowFoldMap = (v: boolean) => setPanel('showFoldMap', v);
  const setShowSnippetsPanel = (v: boolean) => setPanel('showSnippetsPanel', v);

  const {
    activeTab,
    bookmarkedLines,
    bookmarks,
    deleteBookmark,
    deleteSnippet,
    duplicateBlocks,
    foldRegions,
    insertBookmark,
    insertSnippet,
    jumpToBookmark,
    monacoEditorRef,
    projectFiles,
    saveSnippet,
    savedSnippets,
    selectedFile,
    setBookmarkedLines,
    toggleBookmark,
  } = p;

  return (
    <>
      {/* --- Code Bookmarks --- */}
      <AnimatePresence>
        {showBookmarks && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowBookmarks(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  <h2 className="text-sm font-semibold text-white">Code Bookmarks</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{bookmarks.length}</span>
                </div>
                <button aria-label="Close" onClick={() => setShowBookmarks(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {bookmarks.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[12px] text-[#555]">No bookmarks yet. Use the command palette to bookmark code.</div>
                ) : bookmarks.map((bm: any) => (
                  <div key={bm.id} className="px-5 py-3 border-b border-[#1e1e1e] hover:bg-[#222] transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white font-medium">{bm.label}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => insertBookmark(bm.code)} className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">Insert</button>
                        <button onClick={() => deleteBookmark(bm.id)} className="text-[#555] hover:text-red-400 transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                      </div>
                    </div>
                    <div className="text-[9px] text-[#555] font-mono line-clamp-2 leading-4 bg-[#111] rounded p-1.5">{bm.code.slice(0, 200)}</div>
                    <span className="text-[8px] text-[#444] mt-1 block">{bm.file} Â· {bm.language}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* --- Code Snippets Manager Panel --- */}
      {showSnippetsPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[550px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
              <span className="text-sm font-medium text-white">Snippets Manager</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{savedSnippets.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { const code = selectedFile && projectFiles[selectedFile] ? projectFiles[selectedFile].content.slice(0, 2000) : ''; if (!code) return; saveSnippet(selectedFile || 'snippet', code); }} className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">+ Save Selection</button>
              <button aria-label="Close" onClick={() => setShowSnippetsPanel(false)} className="text-[#555] hover:text-white transition-colors ml-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {savedSnippets.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No snippets saved yet. Select code and click &quot;Save Selection&quot;</div>}
            {savedSnippets.map((s: any) => (
              <div key={s.id} className="rounded-lg bg-[#1a1a1a] border border-[#222] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#222]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{s.language}</span>
                    <span className="text-[11px] text-white">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => insertSnippet(s.code)} className="text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">Insert</button>
                    <button onClick={() => { navigator.clipboard.writeText(s.code); }} className="text-[9px] px-2 py-0.5 rounded bg-[#222] text-[#888] hover:text-white transition-colors">Copy</button>
                    <button onClick={() => deleteSnippet(s.id)} className="text-[9px] px-2 py-0.5 rounded text-red-400/60 hover:text-red-400 transition-colors">âœ•</button>
                  </div>
                </div>
                <pre className="p-2 text-[10px] text-[#888] font-mono max-h-[100px] overflow-y-auto">{s.code.slice(0, 500)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Bookmarked Lines Panel --- */}
      {bookmarkedLines.length > 0 && activeTab === 'code' && (
        <div className="fixed bottom-12 right-4 z-40 w-[220px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
            <span className="text-[10px] font-medium text-white flex items-center gap-1">ðŸ”– Bookmarks <span className="text-[#555]">({bookmarkedLines.length})</span></span>
            <button onClick={() => setBookmarkedLines([])} className="text-[9px] text-[#555] hover:text-white transition-colors">Clear</button>
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {bookmarkedLines.map((line: any) => (
              <button key={line} onClick={() => jumpToBookmark(line)} className="w-full flex items-center justify-between px-3 py-1 text-[10px] hover:bg-[#1a1a1a] transition-colors">
                <span className="text-blue-400">Line {line}</span>
                <button onClick={(e) => { e.stopPropagation(); toggleBookmark(line); }} className="text-[#555] hover:text-red-400 transition-colors">âœ•</button>
              </button>
            ))}
          </div>
        </div>
      )}


      {/* --- Duplicate Code Panel --- */}
      {showDuplicatePanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><rect x="8" y="2" width="13" height="13" rx="2"/><path d="M4 15V6a2 2 0 0 1 2-2"/><rect x="2" y="9" width="13" height="13" rx="2"/></svg>
              <span className="text-sm font-medium text-white">Duplicate Code</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{duplicateBlocks.length} duplicate{duplicateBlocks.length !== 1 ? 's' : ''}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowDuplicatePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {duplicateBlocks.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No duplicate code blocks found âœ“</div>}
            {duplicateBlocks.map((d: any, i: any) => (
              <div key={i} className="rounded-lg bg-[#1a1a1a] border border-[#222] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#222]">
                  <span className="text-[10px] text-orange-400 font-medium">Found in {d.count} files</span>
                  <div className="flex gap-1">{d.files.map((f: any) => <span key={f} className="text-[8px] px-1 py-0.5 rounded bg-[#222] text-[#888]">{f.split('/').pop()}</span>)}</div>
                </div>
                <pre className="p-2 text-[9px] text-[#888] font-mono overflow-x-auto">{d.code}</pre>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* --- Code Folding Map Panel --- */}
      {showFoldMap && (
        <div className="fixed top-16 right-4 z-40 w-[360px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M3 3h18"/><path d="M9 8h12"/><path d="M9 13h12"/><path d="M3 18h18"/></svg>
              <span className="text-sm font-medium text-white">Folding Map</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{foldRegions.length} regions</span>
            </div>
            <button aria-label="Close" onClick={() => setShowFoldMap(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5 max-h-[400px]">
            {foldRegions.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">Open a file to see folding regions</div>}
            {foldRegions.map((r: any, i: any) => (
              <button key={i} onClick={() => {
                const editor = monacoEditorRef.current as { revealLineInCenter?: (line: number) => void };
                if (editor?.revealLineInCenter) editor.revealLineInCenter(r.start);
              }} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-[#1a1a1a] text-[10px] text-left transition-colors">
                <div className="flex gap-px shrink-0">{Array.from({ length: Math.min(r.depth, 5) }).map((_, d) => <div key={d} className="w-1.5 h-3 rounded-sm bg-purple-500/30" />)}</div>
                <span className="text-[#888] w-12 text-right shrink-0">L{r.start}-{r.end}</span>
                <span className="text-[#ccc] font-mono flex-1 truncate">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </>
  );
}
