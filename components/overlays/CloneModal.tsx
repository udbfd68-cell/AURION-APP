'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import { LinkIcon } from '@/lib/page-helpers';

export default function CloneModal({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showCloneModal } = panelStore;

  const setShowCloneModal = (v: boolean) => setPanel('showCloneModal', v);

  const {
    cloneProgress,
    cloneUrl,
    cloneWebsite,
    isCloning,
    setCloneUrl,
    stopClone,
  } = p;

  return (
    <>
      {/* --- Clone Website Modal --- */}
      <AnimatePresence>
        {showCloneModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowCloneModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Clone Website</h2>
                <button aria-label="Close" onClick={() => setShowCloneModal(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 focus-within:border-[#444] transition-colors">
                  <LinkIcon />
                  <input type="url" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') cloneWebsite(); }} placeholder="https://example.com" className="flex-1 bg-transparent outline-none text-sm text-gray-300 placeholder-[#555] ml-2" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: 'Stripe', url: 'https://stripe.com' }, { label: 'Linear', url: 'https://linear.app' }, { label: 'Vercel', url: 'https://vercel.com' }].map((ex) => (
                    <button key={ex.label} onClick={() => setCloneUrl(ex.url)} className="px-3 py-2 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111] text-xs text-[#888] hover:text-white transition-colors text-center">{ex.label}</button>
                  ))}
                </div>
                {isCloning ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#2a2a2a]">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span className="text-[12px] text-white">{cloneProgress || 'Cloning...'}</span>
                    </div>
                    <button onClick={stopClone} className="w-full py-2.5 rounded-lg border border-[#2a2a2a] text-[#888] text-sm hover:text-white transition-colors">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => cloneWebsite()} disabled={!cloneUrl.trim()} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">Clone</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
