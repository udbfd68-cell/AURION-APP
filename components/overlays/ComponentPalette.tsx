'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function ComponentPalette({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showComponentPalette } = panelStore;

  const setShowComponentPalette = (v: boolean) => setPanel('showComponentPalette', v);

  const {
    COMPONENTS,
    insertComponent,
  } = p;

  return (
    <>
      {/* --- Component Palette --- */}
      <AnimatePresence>
        {showComponentPalette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowComponentPalette(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17.5h7M17.5 14v7"/></svg>
                  <h2 className="text-sm font-semibold text-white">Insert Component</h2>
                </div>
                <button aria-label="Close" onClick={() => setShowComponentPalette(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3 grid grid-cols-2 gap-2">
                {COMPONENTS.map((comp: any) => (
                  <button key={comp.name} onClick={() => insertComponent(comp.code)} className="text-left p-3 rounded-lg bg-[#111] border border-[#222] hover:border-[#444] hover:bg-[#161616] transition-all group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-white">{comp.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#666]">{comp.cat}</span>
                    </div>
                    <div className="text-[10px] text-[#555] font-mono line-clamp-2 leading-4">{comp.code.slice(0, 80)}...</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
