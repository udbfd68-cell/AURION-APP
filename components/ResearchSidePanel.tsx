'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export interface ResearchSidePanelProps {
  researchMode: boolean;
  setResearchMode: (v: boolean) => void;
  researchQuery: string;
  setResearchQuery: (v: string) => void;
  researchResults: { topic: string; confidence: number; sources: number; insights: string[]; summary: string } | null;
  setResearchResults: (v: null) => void;
  isResearching: boolean;
  researchError: string | null;
  researchContext: string;
  setResearchContext: (v: string) => void;
  performResearch: (q: string) => void;
  integrationKeys: Record<string, string>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
}

const ResearchSidePanel = React.memo(function ResearchSidePanel(props: ResearchSidePanelProps) {
  const { showResearchPanel } = usePanelStore();
  const panelActions = usePanelStore();
  const {
    researchMode, setResearchMode, researchQuery, setResearchQuery,
    researchResults, setResearchResults, isResearching, researchError,
    setResearchContext, performResearch, integrationKeys, setInput,
  } = props;

  return (
    <AnimatePresence>
      {showResearchPanel && (
        <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="h-full border-l border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden shrink-0">
          <div className="w-[340px] h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                <h3 className="text-[13px] font-medium text-white">Research & Analysis</h3>
              </div>
              <button onClick={() => panelActions.setPanel('showResearchPanel', false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>

            {/* Toggles */}
            <div className="px-4 py-3 border-b border-[#1e1e1e] space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  <span className="text-[11px] text-[#ccc]">NotebookLM Research</span>
                </div>
                <button onClick={() => setResearchMode(!researchMode)} className={`w-8 h-4 rounded-full transition-all relative ${researchMode ? 'bg-violet-500' : 'bg-[#333]'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${researchMode ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
                  <span className="text-[11px] text-[#ccc]">Jarvis Brain</span>
                </div>
                <span className="text-[9px] text-orange-400 font-medium">Active</span>
              </div>
            </div>

            {/* Search/Research Input */}
            <div className="px-4 py-3 border-b border-[#1e1e1e] shrink-0">
              <div className="flex items-center gap-2">
                <input
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && researchQuery.trim()) performResearch(researchQuery); }}
                  placeholder="Research any topic..."
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[11px] text-white placeholder-[#555] outline-none focus:border-violet-500/50 transition-colors"
                />
                <button
                  onClick={() => researchQuery.trim() && performResearch(researchQuery)}
                  disabled={isResearching || !researchQuery.trim()}
                  className="px-3 py-2 rounded-lg bg-violet-500/20 text-violet-400 text-[11px] font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-30"
                >
                  {isResearching ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full" />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  )}
                </button>
              </div>
              {researchError && <p className="text-[10px] text-red-400 mt-2">{researchError}</p>}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {researchResults ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-white">{researchResults.topic}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
                      {(researchResults.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <div className="text-[10px] text-[#666]">{researchResults.sources} sources analyzed</div>
                  {researchResults.insights.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">Key Insights</span>
                      {researchResults.insights.slice(0, 5).map((insight, i) => (
                        <div key={i} className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[10px] text-[#bbb] leading-relaxed">
                          {insight.slice(0, 300)}{insight.length > 300 ? '...' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                  {researchResults.summary && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">Summary</span>
                      <div className="p-2 rounded-lg bg-violet-500/5 border border-violet-500/20 text-[10px] text-[#bbb] leading-relaxed">
                        {researchResults.summary.slice(0, 500)}{researchResults.summary.length > 500 ? '...' : ''}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => { setResearchResults(null); setResearchContext(''); setResearchQuery(''); }}
                    className="w-full py-2 rounded-lg border border-[#333] text-[10px] text-[#666] hover:text-white hover:border-[#555] transition-colors"
                  >
                    Clear Research
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#333] mb-3"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  <span className="text-[11px] text-[#555] mb-1">No research active</span>
                  <span className="text-[10px] text-[#444]">Search any topic to enhance AI generation with deep research and analysis</span>
                </div>
              )}

              {/* Jarvis Brain Status */}
              <div className="mt-4 space-y-2">
                <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">Orchestrator Status</span>
                <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/5 to-red-500/5 border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-[11px] text-orange-400 font-medium">🧠 Jarvis Active</span>
                  </div>
                  <ul className="space-y-1 text-[10px] text-[#888]">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Multi-model routing (auto-fallback)</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Quality gate + post-processing</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Auto-continue on truncation</li>
                    <li className="flex items-center gap-1.5"><span className={researchMode ? 'text-emerald-400' : 'text-[#555]'}>{researchMode ? '✓' : '○'}</span> NotebookLM research {researchMode ? '' : '(off)'}</li>
                    <li className="flex items-center gap-1.5"><span className={Object.keys(integrationKeys).length > 0 ? 'text-emerald-400' : 'text-[#555]'}>{Object.keys(integrationKeys).length > 0 ? '✓' : '○'}</span> Integrations ({Object.keys(integrationKeys).length} configured)</li>
                  </ul>
                </div>

                {/* Subsystem Quick Actions */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(['anthropic', 'stitch', 'notebooklm', 'reactbits', '21stdev', 'firecrawl'] as const).map(sys => (
                    <button key={sys} onClick={() => setInput(prev => `${prev} [USE: ${sys}] `)} className="p-1.5 rounded-lg bg-[#1a1a1a] border border-[#222] hover:border-orange-500/30 text-[8px] text-[#666] hover:text-orange-400 transition-all text-center truncate">
                      {sys === 'anthropic' ? '🤖 Claude' : sys === 'stitch' ? '🎨 Stitch' : sys === 'notebooklm' ? '📚 Research' : sys === 'reactbits' ? '⚡ ReactBits' : sys === '21stdev' ? '✨ 21st.dev' : '🕷️ Scrape'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intelligence Status */}
              <div className="mt-4 space-y-2">
                <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">Intelligence Status</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded-lg border text-center ${researchMode ? 'border-violet-500/30 bg-violet-500/5' : 'border-[#222] bg-[#1a1a1a]'}`}>
                    <div className={`text-[10px] font-medium ${researchMode ? 'text-violet-400' : 'text-[#555]'}`}>NotebookLM</div>
                    <div className="text-[9px] text-[#666] mt-0.5">{researchMode ? 'Active' : 'Off'}</div>
                  </div>
                  <div className="p-2 rounded-lg border text-center border-orange-500/30 bg-orange-500/5">
                    <div className="text-[10px] font-medium text-orange-400">Jarvis Brain</div>
                    <div className="text-[9px] text-[#666] mt-0.5">Active</div>
                  </div>
                </div>
                {researchMode && (
                  <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500/10 to-orange-500/10 border border-[#333] text-center">
                    <span className="text-[10px] font-medium bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">🧠 JARVIS GOD MODE</span>
                    <p className="text-[9px] text-[#666] mt-0.5">Research-enhanced orchestration</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default ResearchSidePanel;
