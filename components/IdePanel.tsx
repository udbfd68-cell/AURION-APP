'use client';
import React from 'react';
import { motion } from 'framer-motion';

export interface IdePanelProps {
  ideStatus: string;
  ideUrl: string | null;
  ideServiceId: string | null;
  ideLoading: boolean;
  ideError: string | null;
  ideCountdown: number;
  setIdeServiceId: (v: any) => void;
  setIdeUrl: (v: any) => void;
  setIdeLoading: (v: any) => void;
  setIdeStatus: (v: any) => void;
  setIdeError: (v: any) => void;
}

const IdePanel = React.memo(function IdePanel({
  ideStatus, ideUrl, ideServiceId, ideLoading, ideError, ideCountdown,
  setIdeServiceId, setIdeUrl, setIdeLoading, setIdeStatus, setIdeError,
}: IdePanelProps) {
  return (
    <motion.div key="ide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col bg-[#0c0c0c]">
      {ideStatus === 'live' && ideUrl ? (
        <div className="flex-1 flex flex-col h-full">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-[#888] font-medium">VS Code IDE</span>
              <span className="text-[9px] text-[#333]">•</span>
              <span className="text-[9px] text-[#444] truncate max-w-[200px]">{ideUrl}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { const url = ideUrl?.endsWith('/') ? ideUrl : ideUrl + '/'; window.open(url, '_blank'); }} className="px-2 py-0.5 rounded bg-[#161616] border border-[#222] text-[9px] text-[#666] hover:text-white hover:border-[#444] transition-all" title="Open in new tab">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </button>
              <button onClick={async () => { if (!ideServiceId) return; setIdeLoading(true); try { await fetch('/api/render?serviceId=' + ideServiceId, { method: 'DELETE' }); setIdeServiceId(null); setIdeUrl(null); setIdeStatus('none'); } catch {} setIdeLoading(false); }} className="px-2 py-0.5 rounded bg-[#161616] border border-red-500/20 text-[9px] text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-all" title="Stop IDE">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
              </button>
            </div>
          </div>
          <iframe src={ideUrl} className="flex-1 w-full border-0" allow="clipboard-read; clipboard-write" style={{ minHeight: 0 }} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
          </div>
          <div className="text-center">
            <p className="text-[13px] text-white font-medium mb-1">Launching IDE...</p>
            <p className="text-[11px] text-[#555]">Deploying code-server on Render — this usually takes 1-3 minutes</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-[10px] text-yellow-500/80">{ideStatus === 'creating' ? 'Creating service...' : ideStatus === 'booting' ? `Starting code-server... ${ideCountdown}s remaining` : ideStatus === 'error' ? ideError || 'Error' : 'Waiting for deployment...'}</span>
          </div>
          {ideStatus === 'error' && (
            <button onClick={() => { setIdeStatus('none'); setIdeError(null); }} className="px-4 py-1.5 rounded-lg bg-[#161616] border border-[#333] text-[11px] text-[#888] hover:text-white hover:border-[#555] transition-all">
              Retry
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
});

export default IdePanel;
