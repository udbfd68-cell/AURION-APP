'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import { FileIcon } from '@/lib/page-helpers';

export default function CommandPalette({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showCommandPalette, showContentSearch, showFileSearch } = panelStore;

  const setShowCommandPalette = (v: boolean) => setPanel('showCommandPalette', v);
  const setShowContentSearch = (v: boolean) => setPanel('showContentSearch', v);
  const setShowFileSearch = (v: boolean) => setPanel('showFileSearch', v);

  const {
    commandIdx,
    commandInputRef,
    commandQuery,
    commands,
    contentSearchQuery,
    contentSearchRef,
    contentSearchResults,
    fileSearchQuery,
    fileSearchRef,
    fileSearchResults,
    projectFiles,
    selectedFile,
    setActiveTab,
    setCommandIdx,
    setCommandQuery,
    setContentSearchQuery,
    setFileSearchQuery,
    setSelectedFile,
  } = p;

  return (
    <>
      {/* --- Command Palette (Cmd+K) --- */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowCommandPalette(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={commandInputRef} value={commandQuery} onChange={(e) => { setCommandQuery(e.target.value); setCommandIdx(0); }} placeholder="Type a command..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setCommandIdx((i: any) => Math.min(i + 1, commands.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setCommandIdx((i: any) => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter' && commands.length > 0) { commands[commandIdx]?.action(); setShowCommandPalette(false); }
                }} />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">ESC</span>
              </div>
              <div className="max-h-[340px] overflow-y-auto py-1">
                {(() => {
                  let lastCat = '';
                  let flatIdx = -1;
                  return commands.map((cmd: any) => {
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


      {/* --- File Search (Cmd+P) --- */}
      <AnimatePresence>
        {showFileSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowFileSearch(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <input ref={fileSearchRef} value={fileSearchQuery} onChange={(e) => setFileSearchQuery(e.target.value)} placeholder="Go to file..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && fileSearchResults.length > 0) { setSelectedFile(fileSearchResults[0]); setActiveTab('code'); setShowFileSearch(false); } }} />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">âŒ˜P</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto py-1">
                {fileSearchResults.map((f: any) => (
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


      {/* --- Content Search (Cmd+Shift+F) --- */}
      <AnimatePresence>
        {showContentSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowContentSearch(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={contentSearchRef} value={contentSearchQuery} onChange={(e) => setContentSearchQuery(e.target.value)} placeholder="Search in all files..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">âŒ˜â‡§F</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto py-1">
                {contentSearchResults.map((r: any, i: any) => (
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

    </>
  );
}
