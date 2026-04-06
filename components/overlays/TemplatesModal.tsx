'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import { TEMPLATES } from '@/lib/templates-data';

export default function TemplatesModal({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showTemplates } = panelStore;

  const setShowTemplates = (v: boolean) => setPanel('showTemplates', v);

  const {
    createProject,
  } = p;

  return (
    <>
      {/* --- Templates Modal --- */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowTemplates(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Start from Template</h2>
                <button aria-label="Close" onClick={() => setShowTemplates(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TEMPLATES.map((t) => (
                  <button key={t.name} onClick={() => createProject(t.name, t.files)} className="p-4 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111] hover:bg-[#161616] transition-colors text-left group">
                    <div className="text-2xl mb-2">{t.icon}</div>
                    <p className="text-[13px] text-white font-medium group-hover:text-purple-300 transition-colors">{t.name}</p>
                    <p className="text-[10px] text-[#555] mt-1">{t.desc}</p>
                    <p className="text-[9px] text-[#444] mt-2">{Object.keys(t.files).length} files</p>
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
