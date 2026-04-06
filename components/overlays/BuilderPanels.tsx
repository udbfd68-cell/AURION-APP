'use client';
import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

function BuilderPanels({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showAnimBuilder, showDesignSystem, showVisualBuilder } = panelStore;

  const setShowAnimBuilder = (v: boolean) => setPanel('showAnimBuilder', v);
  const setShowDesignSystem = (v: boolean) => setPanel('showDesignSystem', v);
  const setShowVisualBuilder = (v: boolean) => setPanel('showVisualBuilder', v);

  const {
    COMPONENTS,
    animAddFrame,
    animAddNew,
    animCopyCSS,
    animDeleteAnim,
    animGenerateCSS,
    animInjectToProject,
    animKeyframes,
    animPreviewPlaying,
    animSelected,
    animUpdateFrame,
    dsAddColor,
    dsBorderRadius,
    dsColors,
    dsFontPrimary,
    dsFontSecondary,
    dsGenerateCSS,
    dsGenerateTokensJSON,
    dsShadows,
    dsSpacing,
    dsTab,
    dsTypeScale,
    setAnimKeyframes,
    setAnimPreviewPlaying,
    setAnimSelected,
    setDsColors,
    setDsFontPrimary,
    setDsFontSecondary,
    setDsTab,
    setVbCanvas,
    setVbDragging,
    setVbPropertyTab,
    setVbSelectedIdx,
    vbAddComponent,
    vbCanvas,
    vbDragging,
    vbGenerateCode,
    vbMoveComponent,
    vbPropertyTab,
    vbRemoveComponent,
    vbSelectedIdx,
  } = p;

  return (
    <>
      {/* --- v24: Visual Drag & Drop Builder --- */}
      {showVisualBuilder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          {/* Component Palette */}
          <div className="w-[280px] bg-[#111] border-r border-[#2a2a2a] flex flex-col">
            <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
              <span className="text-[13px] font-bold text-white">Components</span>
              <button aria-label="Close" onClick={() => setShowVisualBuilder(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {COMPONENTS.map((comp: any) => (
                <button key={comp.id} onClick={() => vbAddComponent(comp.id)} draggable onDragStart={() => setVbDragging(comp.id)} onDragEnd={() => setVbDragging(null)} className="w-full p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] hover:border-purple-500/40 transition-colors text-left flex items-center gap-3 group cursor-grab active:cursor-grabbing">
                  <span className="text-xl">{comp.icon}</span>
                  <div>
                    <div className="text-[12px] text-white font-medium group-hover:text-purple-400 transition-colors">{comp.name}</div>
                    <div className="text-[10px] text-[#555]">Click or drag to add</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2.5 bg-[#161616] border-b border-[#2a2a2a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold text-white">Canvas</span>
                <span className="text-[10px] text-[#555]">{vbCanvas.length} components</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setVbCanvas([])} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Clear All</button>
                <button onClick={vbGenerateCode} disabled={vbCanvas.length === 0} className="px-3 py-1 text-[10px] text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-30">Generate Code â†’</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6" onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={e => { e.preventDefault(); if (vbDragging) vbAddComponent(vbDragging); }}>
              {vbCanvas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#333] border-2 border-dashed border-[#222] rounded-xl">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  <p className="mt-3 text-[13px]">Drag & drop components here</p>
                  <p className="text-[10px] text-[#444] mt-1">Or click a component to add it</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vbCanvas.map((html: any, idx: any) => (
                    <div key={idx} onClick={() => setVbSelectedIdx(idx)} className={`relative group rounded-lg overflow-hidden transition-all ${vbSelectedIdx === idx ? 'ring-2 ring-purple-500' : 'ring-1 ring-transparent hover:ring-[#333]'}`}>
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); vbMoveComponent(idx, 'up'); }} disabled={idx === 0} className="w-6 h-6 flex items-center justify-center bg-black/80 rounded text-white text-[10px] hover:bg-purple-600 disabled:opacity-30">â†‘</button>
                        <button onClick={(e) => { e.stopPropagation(); vbMoveComponent(idx, 'down'); }} disabled={idx === vbCanvas.length - 1} className="w-6 h-6 flex items-center justify-center bg-black/80 rounded text-white text-[10px] hover:bg-purple-600 disabled:opacity-30">â†“</button>
                        <button onClick={(e) => { e.stopPropagation(); vbRemoveComponent(idx); }} className="w-6 h-6 flex items-center justify-center bg-black/80 rounded text-red-400 text-[10px] hover:bg-red-600 hover:text-white">Ã—</button>
                      </div>
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/80 rounded text-[9px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">{idx + 1}</div>
                      <iframe sandbox="" srcDoc={html} className="w-full h-[120px] border-0 pointer-events-none" title={`Component ${idx + 1}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          {vbSelectedIdx >= 0 && (
            <div className="w-[300px] bg-[#111] border-l border-[#2a2a2a] flex flex-col">
              <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
                <span className="text-[12px] font-bold text-white">Properties</span>
                <div className="flex gap-1">
                  {(['style', 'content'] as const).map(tab => (
                    <button key={tab} onClick={() => setVbPropertyTab(tab)} className={`px-2 py-0.5 rounded text-[10px] transition-colors ${vbPropertyTab === tab ? 'bg-purple-600 text-white' : 'text-[#666] hover:text-white'}`}>{tab}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {vbPropertyTab === 'content' ? (
                  <textarea value={vbCanvas[vbSelectedIdx] || ''} onChange={e => setVbCanvas((prev: any) => { const n = [...prev]; n[vbSelectedIdx] = e.target.value; return n; })} className="w-full h-full bg-[#0a0a0a] text-[11px] text-green-400 font-mono p-3 rounded-lg border border-[#222] focus:border-purple-500 focus:outline-none resize-none" spellCheck={false} />
                ) : (
                  <div className="space-y-3 text-[11px]">
                    <p className="text-[#555]">Select a component on the canvas to edit its HTML directly in the Content tab.</p>
                    <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#222]">
                      <div className="text-[10px] text-[#888] mb-1">Component #{vbSelectedIdx + 1}</div>
                      <div className="text-[10px] text-[#555]">{vbCanvas[vbSelectedIdx]?.length || 0} chars</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}


      {/* --- v24: Animation Timeline Builder --- */}
      {showAnimBuilder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[800px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-bold text-white">Animation Builder</span>
                <span className="text-[10px] text-[#555]">{animKeyframes.length} animations</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={animCopyCSS} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Copy CSS</button>
                <button onClick={animInjectToProject} disabled={animKeyframes.length === 0} className="px-3 py-1 text-[10px] text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-30">Inject to Project</button>
                <button aria-label="Close" onClick={() => setShowAnimBuilder(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </div>
            <div className="flex flex-1 min-h-0">
              {/* Animation List */}
              <div className="w-[200px] border-r border-[#222] flex flex-col">
                <button onClick={animAddNew} className="m-2 px-3 py-2 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors">+ New Animation</button>
                <div className="flex-1 overflow-y-auto">
                  {animKeyframes.map((anim: any, i: any) => (
                    <div key={anim.id} onClick={() => setAnimSelected(i)} className={`px-3 py-2 cursor-pointer border-b border-[#1a1a1a] flex items-center justify-between ${animSelected === i ? 'bg-indigo-500/10 text-white' : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'}`}>
                      <span className="text-[11px] truncate">{anim.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); animDeleteAnim(i); }} className="text-[#555] hover:text-red-400 shrink-0"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-y-auto p-4">
                {animSelected >= 0 && animKeyframes[animSelected] ? (() => {
                  const anim = animKeyframes[animSelected];
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div><label className="text-[9px] text-[#555] uppercase">Name</label><input value={anim.name} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; n[animSelected] = { ...n[animSelected], name: e.target.value }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none" /></div>
                        <div><label className="text-[9px] text-[#555] uppercase">Duration (s)</label><input type="number" step="0.1" min="0.1" value={anim.duration} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; n[animSelected] = { ...n[animSelected], duration: parseFloat(e.target.value) || 0.1 }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none" /></div>
                        <div><label className="text-[9px] text-[#555] uppercase">Easing</label><select value={anim.easing} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; n[animSelected] = { ...n[animSelected], easing: e.target.value }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none">{['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'cubic-bezier(0.22,1,0.36,1)'].map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                        <div><label className="text-[9px] text-[#555] uppercase">Iteration</label><select value={anim.iteration} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; n[animSelected] = { ...n[animSelected], iteration: e.target.value }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none">{['1', '2', '3', 'infinite'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                      </div>

                      {/* Timeline */}
                      <div className="relative h-8 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
                        {anim.frames.map((frame: any, fi: any) => (
                          <div key={fi} className="absolute top-0 h-full w-1 bg-indigo-500 rounded-full" style={{ left: `${frame.pct}%` }}>
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-indigo-400 whitespace-nowrap">{frame.pct}%</div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-500 rounded-full border-2 border-indigo-300" />
                          </div>
                        ))}
                      </div>

                      {/* Keyframes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white font-medium">Keyframes</span>
                          <button onClick={() => animAddFrame(animSelected)} className="text-[10px] text-indigo-400 hover:text-indigo-300">+ Add Frame</button>
                        </div>
                        {anim.frames.map((frame: any, fi: any) => (
                          <div key={fi} className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-indigo-400 font-bold">{frame.pct}%</span>
                                <input type="range" min="0" max="100" value={frame.pct} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; const a = { ...n[animSelected], frames: [...n[animSelected].frames] }; a.frames[fi] = { ...a.frames[fi], pct: parseInt(e.target.value) }; n[animSelected] = a; return n; })} className="w-20 h-1 accent-indigo-500" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(frame.props).map(([prop, val]) => (
                                <div key={prop} className="flex items-center gap-1">
                                  <span className="text-[9px] text-[#666] w-16 truncate">{prop}</span>
                                  <input value={val as string} onChange={(e: any) => animUpdateFrame(animSelected, fi, prop, e.target.value)} className="flex-1 px-1.5 py-0.5 bg-[#0a0a0a] border border-[#222] rounded text-[10px] text-white focus:border-indigo-500 focus:outline-none" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Preview */}
                      <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] text-white font-medium">Preview</span>
                          <button onClick={() => setAnimPreviewPlaying((p: any) => !p)} className={`px-3 py-1 rounded text-[10px] transition-colors ${animPreviewPlaying ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{animPreviewPlaying ? 'â¹ Stop' : 'â–¶ Play'}</button>
                        </div>
                        <div className="h-20 flex items-center justify-center">
                          <div className="w-16 h-16 bg-indigo-600 rounded-xl" style={animPreviewPlaying ? { animation: `${anim.name} ${anim.duration}s ${anim.easing} ${anim.iteration === 'infinite' ? 'infinite' : anim.iteration}` } : undefined} />
                        </div>
                        {animPreviewPlaying && <style>{animGenerateCSS()}</style>}
                      </div>

                      {/* Generated CSS */}
                      <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                        <div className="text-[9px] text-[#555] uppercase mb-2">Generated CSS</div>
                        <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap">{animGenerateCSS()}</pre>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="h-full flex items-center justify-center text-[#333]">
                    <div className="text-center">
                      <p className="text-[13px] mb-2">No animation selected</p>
                      <button onClick={animAddNew} className="px-4 py-2 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20">Create your first animation</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}


      {/* --- v24: Design System Manager --- */}
      {showDesignSystem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[900px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-bold text-white">Design System</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { const css = dsGenerateCSS(); navigator.clipboard.writeText(css); }} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Copy CSS</button>
                <button onClick={() => { const json = dsGenerateTokensJSON(); navigator.clipboard.writeText(json); }} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Copy JSON</button>
                <button aria-label="Close" onClick={() => setShowDesignSystem(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#222] px-4">
              {(['colors', 'typography', 'spacing', 'shadows', 'export'] as const).map(tab => (
                <button key={tab} onClick={() => setDsTab(tab)} className={`px-4 py-2.5 text-[11px] font-medium transition-colors border-b-2 ${dsTab === tab ? 'text-pink-400 border-pink-400' : 'text-[#666] border-transparent hover:text-white'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {dsTab === 'colors' && (
                <div className="space-y-6">
                  {dsColors.map((color: any, ci: any) => (
                    <div key={ci}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-6 h-6 rounded-md border border-[#333]" style={{ backgroundColor: color.value }} />
                        <span className="text-[12px] text-white font-medium">{color.name}</span>
                        <span className="text-[10px] text-[#555]">{color.value}</span>
                        <button onClick={() => setDsColors((prev: any) => prev.filter((_: any, i: any) => i !== ci))} className="text-[10px] text-[#555] hover:text-red-400 ml-auto">Remove</button>
                      </div>
                      <div className="flex gap-1">
                        {color.variants.map((v: any, vi: any) => (
                          <div key={vi} className="flex-1 group cursor-pointer" onClick={() => navigator.clipboard.writeText(v)}>
                            <div className="h-10 rounded-md transition-transform group-hover:scale-110" style={{ backgroundColor: v }} />
                            <div className="text-[8px] text-[#555] text-center mt-1 group-hover:text-white">{(vi + 1) * 100}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => dsAddColor('Custom', '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))} className="w-full py-2.5 border-2 border-dashed border-[#2a2a2a] rounded-lg text-[11px] text-[#555] hover:text-pink-400 hover:border-pink-500/30 transition-colors">+ Add Color</button>
                </div>
              )}

              {dsTab === 'typography' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#555] uppercase">Primary Font</label>
                      <select value={dsFontPrimary} onChange={e => setDsFontPrimary(e.target.value)} className="w-full mt-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-white focus:border-pink-500 focus:outline-none">
                        {['Inter', 'Plus Jakarta Sans', 'DM Sans', 'Space Grotesk', 'Outfit', 'Sora', 'Poppins', 'Manrope', 'Geist'].map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#555] uppercase">Monospace Font</label>
                      <select value={dsFontSecondary} onChange={e => setDsFontSecondary(e.target.value)} className="w-full mt-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-white focus:border-pink-500 focus:outline-none">
                        {['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Geist Mono'].map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[11px] text-white font-medium">Type Scale</span>
                    {dsTypeScale.map((t: any, i: any) => (
                      <div key={i} className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex items-center gap-4">
                        <span className="text-[10px] text-pink-400 w-16 shrink-0">{t.name}</span>
                        <span style={{ fontSize: t.size, fontWeight: parseInt(t.weight), lineHeight: t.lineHeight }} className="text-white truncate flex-1">The quick brown fox</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-[#555]">{t.size}</span>
                          <span className="text-[9px] text-[#555]">w{t.weight}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dsTab === 'spacing' && (
                <div className="space-y-4">
                  <span className="text-[11px] text-white font-medium">Spacing Scale</span>
                  <div className="space-y-2">
                    {dsSpacing.map((s: any) => (
                      <div key={s} className="flex items-center gap-4">
                        <span className="text-[10px] text-[#555] w-12 shrink-0">{s}px</span>
                        <div className="h-4 bg-pink-500/30 rounded-sm" style={{ width: `${Math.min(s * 2, 300)}px` }} />
                        <span className="text-[9px] text-[#666]">--space-{s}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] text-white font-medium block mt-6">Border Radius</span>
                  <div className="flex gap-3 flex-wrap">
                    {dsBorderRadius.map((r: any) => (
                      <div key={r} className="text-center">
                        <div className="w-12 h-12 bg-pink-500/20 border border-pink-500/30" style={{ borderRadius: `${r}px` }} />
                        <span className="text-[9px] text-[#555] mt-1 block">{r === 9999 ? 'full' : `${r}px`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dsTab === 'shadows' && (
                <div className="space-y-4">
                  <span className="text-[11px] text-white font-medium">Shadow Scale</span>
                  <div className="grid grid-cols-3 gap-4">
                    {dsShadows.map((s: any) => (
                      <div key={s.name} className="p-6 bg-[#1a1a1a] rounded-xl text-center cursor-pointer hover:scale-105 transition-transform" style={{ boxShadow: s.value }} onClick={() => navigator.clipboard.writeText(s.value)}>
                        <span className="text-[11px] text-white font-medium">{s.name}</span>
                        <div className="text-[8px] text-[#555] mt-1 truncate">{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dsTab === 'export' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#222]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-white font-medium">CSS Variables</span>
                      <button onClick={() => navigator.clipboard.writeText(dsGenerateCSS())} className="text-[10px] text-pink-400 hover:text-pink-300">Copy</button>
                    </div>
                    <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">{dsGenerateCSS()}</pre>
                  </div>
                  <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#222]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-white font-medium">Design Tokens (JSON)</span>
                      <button onClick={() => navigator.clipboard.writeText(dsGenerateTokensJSON())} className="text-[10px] text-pink-400 hover:text-pink-300">Copy</button>
                    </div>
                    <pre className="text-[10px] text-amber-400 font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">{dsGenerateTokensJSON()}</pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </>
  );
}

export default memo(BuilderPanels);
