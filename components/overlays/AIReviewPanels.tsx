'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function AIReviewPanels({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showCodeReview, showScreenshotAnalyzer } = panelStore;

  const setShowCodeReview = (v: boolean) => setPanel('showCodeReview', v);
  const setShowScreenshotAnalyzer = (v: boolean) => setPanel('showScreenshotAnalyzer', v);

  const {
    codeReviewLoading,
    codeReviewResult,
    runAICodeReview,
    selectedFile,
    setSsDragOver,
    setSsImage,
    setSsResult,
    ssAnalyze,
    ssAnalyzing,
    ssApplyCode,
    ssDragOver,
    ssHandleDrop,
    ssHandlePaste,
    ssImage,
    ssResult,
  } = p;

  return (
    <>
      {/* --- AI Code Review Panel --- */}
      {showCodeReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[750px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">AI Code Review</span>
                <span className="text-[10px] text-[#555]">{selectedFile || 'No file'}</span>
                {codeReviewLoading && <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => runAICodeReview()} disabled={codeReviewLoading} className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 text-[10px] font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-30">Re-run</button>
                <button aria-label="Close" onClick={() => setShowCodeReview(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {codeReviewResult ? (
                <div className="prose prose-invert prose-sm max-w-none text-[12px] leading-relaxed" style={{ color: '#ccc' }}>
                  <div dangerouslySetInnerHTML={{ __html: (() => { const e = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); return e(codeReviewResult).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code style="background:#1a1a1a;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>').replace(/^### (.*$)/gm, '<h3 style="color:white;font-size:14px;margin-top:16px">$1</h3>').replace(/^## (.*$)/gm, '<h2 style="color:white;font-size:15px;margin-top:18px">$1</h2>').replace(/^- (.*$)/gm, '<div style="padding-left:12px;margin:4px 0">â€¢ $1</div>').replace(/^(\d+)\. (.*$)/gm, '<div style="padding-left:12px;margin:4px 0">$1. $2</div>').replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:12px;margin:8px 0;overflow-x:auto"><code>$2</code></pre>').replace(/\n/g, '<br/>'); })() }} />
                </div>
              ) : !codeReviewLoading ? (
                <div className="text-center py-10 text-[#555] text-[11px]">
                  <div className="text-2xl mb-2">ðŸ”</div>
                  <div>Select a file and run AI Code Review</div>
                  <div className="mt-1 text-[10px]">Get bug detection, performance tips, and refactoring suggestions</div>
                </div>
              ) : (
                <div className="text-center py-10 text-[#555] text-[11px]">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <div>Analyzing {selectedFile}...</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}


      {/* --- v24: AI Screenshot Analyzer --- */}
      {showScreenshotAnalyzer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[700px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden" onPaste={ssHandlePaste}>
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">Screenshot to Code</span>
                <span className="text-[10px] text-[#555]">AI-powered design to code</span>
              </div>
              <button aria-label="Close" onClick={() => setShowScreenshotAnalyzer(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Drop Zone */}
              {!ssImage && (
                <div onDragOver={e => { e.preventDefault(); setSsDragOver(true); }} onDragLeave={() => setSsDragOver(false)} onDrop={ssHandleDrop} className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${ssDragOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-[#2a2a2a] hover:border-[#444]'}`}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={ssDragOver ? '#06b6d4' : '#333'} strokeWidth="1" className="mx-auto mb-4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                  <p className="text-[13px] text-[#888] mb-2">Drop a screenshot here</p>
                  <p className="text-[10px] text-[#555] mb-4">or paste from clipboard (Ctrl+V)</p>
                  <label className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors">
                    Browse Files
                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setSsImage(r.result as string); r.readAsDataURL(f); } }} />
                  </label>
                </div>
              )}

              {/* Preview */}
              {ssImage && (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-[#2a2a2a]">
                    <img src={ssImage} alt="Screenshot" className="w-full max-h-[300px] object-contain bg-[#0a0a0a]" />
                    <button onClick={() => { setSsImage(null); setSsResult(null); }} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-black/80 rounded-full text-[#888] hover:text-white">&times;</button>
                  </div>

                  <button onClick={ssAnalyze} disabled={ssAnalyzing} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-[12px] font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {ssAnalyzing ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Analyzing with Claude...</>) : 'ðŸ§  Analyze & Generate Code'}
                  </button>

                  {ssResult && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white font-medium">Generated Code</span>
                        <div className="flex gap-2">
                          <button onClick={() => navigator.clipboard.writeText(ssResult)} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Copy</button>
                          <button onClick={ssApplyCode} className="px-3 py-1 text-[10px] text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors">Apply to Project</button>
                        </div>
                      </div>
                      <pre className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222] text-[10px] text-cyan-400 font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">{ssResult}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
