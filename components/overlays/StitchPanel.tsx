'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function StitchPanel({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showStitchPanel } = panelStore;

  const setShowStitchPanel = (v: boolean) => setPanel('showStitchPanel', v);

  const {
    setProjectFiles,
    setStitchDesignSystem,
    setStitchMode,
    setStitchPages,
    setStitchPrompt,
    showToast,
    stitchDesignSystem,
    stitchError,
    stitchGenerate,
    stitchLoading,
    stitchMode,
    stitchPages,
    stitchProjectId,
    stitchPrompt,
    stitchRunLoop,
    stitchScreens,
  } = p;

  return (
    <>
      {/* --- Google Stitch Design Panel --- */}
      {showStitchPanel && (
        <div className="fixed top-16 right-4 z-40 w-[460px] max-h-[80vh] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl flex flex-col">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span className="text-sm font-medium text-white">Google Stitch</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">AI Design</span>
            </div>
            <button aria-label="Close" onClick={() => setShowStitchPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {/* Mode selector */}
            <div className="flex gap-1 bg-[#111] rounded-lg p-0.5">
              <button onClick={() => setStitchMode('single')} className={`flex-1 text-[11px] py-1.5 rounded-md transition-colors ${stitchMode === 'single' ? 'bg-purple-600/20 text-purple-300' : 'text-[#555] hover:text-white'}`}>Single Screen</button>
              <button onClick={() => setStitchMode('loop')} className={`flex-1 text-[11px] py-1.5 rounded-md transition-colors ${stitchMode === 'loop' ? 'bg-purple-600/20 text-purple-300' : 'text-[#555] hover:text-white'}`}>Multi-Page Loop</button>
            </div>

            {/* Design System */}
            <div>
              <label className="text-[10px] text-[#666] uppercase tracking-wider mb-1 block">Design System (optional)</label>
              <textarea
                value={stitchDesignSystem}
                onChange={e => setStitchDesignSystem(e.target.value)}
                placeholder="Palette: Deep Blue (#1a365d), Warm Cream (#faf5f0)&#10;Font: Inter, clean sans-serif&#10;Style: Minimal, dark, rounded corners (12px)"
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none resize-none"
                rows={3}
              />
            </div>

            {stitchMode === 'single' ? (
              <>
                {/* Single screen prompt */}
                <div>
                  <label className="text-[10px] text-[#666] uppercase tracking-wider mb-1 block">Describe your page</label>
                  <textarea
                    value={stitchPrompt}
                    onChange={e => setStitchPrompt(e.target.value)}
                    placeholder="A modern SaaS landing page with hero section, features grid, pricing cards, and testimonials. Dark theme with purple accents."
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none resize-none"
                    rows={4}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) stitchGenerate(); }}
                  />
                </div>
                <button
                  onClick={stitchGenerate}
                  disabled={stitchLoading || !stitchPrompt.trim()}
                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-[12px] font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {stitchLoading ? (
                    <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Generating...</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg> Generate with Stitch</>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Multi-page loop */}
                <div className="space-y-2">
                  <label className="text-[10px] text-[#666] uppercase tracking-wider mb-1 block">Pages to generate</label>
                  {stitchPages.map((page: any, i: any) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={page.name}
                        onChange={e => setStitchPages((prev: any) => prev.map((p: any, j: any) => j === i ? { ...p, name: e.target.value } : p))}
                        placeholder="Page name"
                        className="w-24 px-2 py-1.5 rounded-md bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none"
                      />
                      <input
                        value={page.prompt}
                        onChange={e => setStitchPages((prev: any) => prev.map((p: any, j: any) => j === i ? { ...p, prompt: e.target.value } : p))}
                        placeholder="Description for this page..."
                        className="flex-1 px-2 py-1.5 rounded-md bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none"
                      />
                      {stitchPages.length > 1 && (
                        <button onClick={() => setStitchPages((prev: any) => prev.filter((_: any, j: any) => j !== i))} className="text-[#555] hover:text-red-400 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setStitchPages((prev: any) => [...prev, { name: '', prompt: '' }])} className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors">+ Add page</button>
                </div>
                <button
                  onClick={stitchRunLoop}
                  disabled={stitchLoading || stitchPages.every((p: any) => !p.name.trim() || !p.prompt.trim())}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-[12px] font-medium transition-all flex items-center justify-center gap-2"
                >
                  {stitchLoading ? (
                    <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Building {stitchPages.filter((p: any) => p.name.trim()).length} pages...</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg> Run Stitch Loop</>
                  )}
                </button>
              </>
            )}

            {/* Error display */}
            {stitchError && (
              <div className="text-[11px] text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                {stitchError}
              </div>
            )}

            {/* Project ID */}
            {stitchProjectId && (
              <div className="text-[10px] text-[#555] flex items-center gap-1.5">
                <span className="text-[#444]">Project:</span>
                <span className="font-mono text-[#777]">{stitchProjectId}</span>
              </div>
            )}

            {/* Generated screens */}
            {stitchScreens.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#222]">
                <div className="text-[10px] text-[#666] uppercase tracking-wider">Generated Screens ({stitchScreens.length})</div>
                {stitchScreens.map((s: any, i: any) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#111] border border-[#222] hover:border-purple-500/30 transition-colors group">
                    {s.imageUrl && (
                      <img src={s.imageUrl} alt={s.page} className="w-16 h-12 rounded object-cover bg-[#1a1a1a]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-white font-medium truncate">{s.page}</div>
                      <div className="text-[9px] text-[#555] font-mono truncate">{s.screenId}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {s.html && (
                        <button
                          onClick={() => {
                            const fileName = s.page.toLowerCase().replace(/\s+/g, '-') + '.html';
                            setProjectFiles((prev: any) => ({ ...prev, [fileName]: { content: s.html!, language: 'html' } }));
                            showToast(`Imported ${fileName}`, 'success');
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                        >
                          Import
                        </button>
                      )}
                      {s.htmlUrl && (
                        <a href={s.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#888] hover:text-white">
                          HTML
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* How it works */}
            {stitchScreens.length === 0 && !stitchLoading && (
              <div className="text-[10px] text-[#444] pt-2 border-t border-[#222] space-y-1">
                <div className="text-[#666] font-medium mb-1">How it works</div>
                <div>1. Describe your page â†’ Stitch generates a high-fidelity design</div>
                <div>2. Auto-enhanced prompts for professional UI/UX results</div>
                <div>3. HTML imported directly into your project files</div>
                <div>4. Use Loop mode to build an entire multi-page site</div>
                <div className="pt-1 text-[#555]">Requires STITCH_API_KEY in .env.local</div>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}
