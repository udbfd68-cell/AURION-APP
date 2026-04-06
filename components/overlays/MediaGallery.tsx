'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function MediaGallery({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showMediaGallery } = panelStore;

  const setShowMediaGallery = (v: boolean) => setPanel('showMediaGallery', v);

  const {
    commands,
    mediaAssets,
  } = p;

  return (
    <>
      {/* --- Media Gallery --- */}
      <AnimatePresence>
        {showMediaGallery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowMediaGallery(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <h2 className="text-sm font-semibold text-white">Media Gallery</h2>
                  <span className="text-[10px] text-[#555] bg-[#222] px-1.5 py-0.5 rounded">{mediaAssets.length} items</span>
                </div>
                <button aria-label="Close" onClick={() => setShowMediaGallery(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {mediaAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#555]">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    <p className="text-[13px]">No media generated yet</p>
                    <p className="text-[11px] mt-1">Use /image or /video commands to generate media</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaAssets.slice().reverse().map((asset: any) => (
                      <div key={asset.id} className="group relative rounded-lg border border-[#2a2a2a] bg-[#111] overflow-hidden hover:border-[#444] transition-colors">
                        <div className="aspect-video bg-black flex items-center justify-center">
                          {asset.type === 'image' ? (
                            <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" />
                          ) : (
                            <video src={asset.url} className="w-full h-full object-cover" muted loop onMouseEnter={(e) => (e.target as HTMLVideoElement).play()} onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                          )}
                        </div>
                        <div className="p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${asset.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{asset.type === 'video' ? 'ðŸŽ¬ Video' : 'ðŸ–¼ Image'}</span>
                            <span className="text-[9px] text-[#555]">{new Date(asset.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[10px] text-[#888] line-clamp-2">{asset.prompt}</p>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button onClick={() => { navigator.clipboard.writeText(asset.url); }} className="p-1.5 rounded bg-black/70 text-white hover:bg-black/90 transition-colors" title="Copy URL">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </button>
                          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded bg-black/70 text-white hover:bg-black/90 transition-colors" title="Open">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
