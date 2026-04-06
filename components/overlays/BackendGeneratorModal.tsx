'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import { BackendGenerator } from '@/lib/backend-generator';

export default function BackendGeneratorModal({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showBackendGenerator } = panelStore;

  const setShowBackendGenerator = (v: boolean) => setPanel('showBackendGenerator', v);

  const {
    backendEntityName,
    backendGeneratedFiles,
    backendPreset,
    generateBackend,
    setBackendEntityName,
    setBackendPreset,
  } = p;

  return (
    <>
      {/* --- Backend Generator Modal --- */}
      <AnimatePresence>
        {showBackendGenerator && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowBackendGenerator(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-white">Backend Generator</h2>
                  <p className="text-[10px] text-[#555] mt-0.5">Generate production-ready backend code</p>
                </div>
                <button aria-label="Close" onClick={() => setShowBackendGenerator(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-[11px] text-[#888] mb-1.5">Preset</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(BackendGenerator.presets).map(([key, config]) => (
                      <button key={key} onClick={() => setBackendPreset(key)} className={`p-3 rounded-lg border text-left transition-colors ${backendPreset === key ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-[#222] bg-[#111] hover:border-[#333]'}`}>
                        <p className={`text-[12px] font-medium ${backendPreset === key ? 'text-emerald-400' : 'text-white'}`}>{key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                        <p className="text-[9px] text-[#555] mt-0.5">{config.framework} &middot; {config.database} &middot; {config.features.length} features</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">{config.features.slice(0, 4).map(f => <span key={f} className="px-1 py-0.5 rounded bg-[#1a1a1a] text-[8px] text-[#888]">{f}</span>)}{config.features.length > 4 && <span className="text-[8px] text-[#555]">+{config.features.length - 4}</span>}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-[#888] mb-1.5">Main Entity Name</label>
                  <input type="text" value={backendEntityName} onChange={(e) => setBackendEntityName(e.target.value)} placeholder="items, products, posts..." className="w-full bg-[#111] border border-[#2a2a2a] rounded-md px-3 py-2 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" />
                </div>
                {backendGeneratedFiles.length > 0 && (
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] text-emerald-400 mb-1.5">Generated {backendGeneratedFiles.length} files:</p>
                    <div className="space-y-0.5 max-h-[120px] overflow-y-auto">{backendGeneratedFiles.map((f: any) => <p key={f.path} className="text-[10px] text-[#888] font-mono truncate">+ {f.path}</p>)}</div>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-[#222] flex justify-end gap-2 shrink-0">
                <button onClick={() => setShowBackendGenerator(false)} className="px-4 py-2 rounded-md border border-[#2a2a2a] text-[12px] text-[#888] hover:text-white transition-colors">Cancel</button>
                <button onClick={generateBackend} className="px-4 py-2 rounded-md bg-emerald-500 text-black text-[12px] font-medium hover:bg-emerald-400 transition-colors">Generate Backend</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
