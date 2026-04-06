'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DeployBannerProps {
  deployResult: { url: string } | null;
  setDeployResult: (v: null) => void;
  deployError: string | null;
  setDeployError: (v: null) => void;
}

const DeployBanner = React.memo(function DeployBanner({ deployResult, setDeployResult, deployError, setDeployError }: DeployBannerProps) {
  return (
    <AnimatePresence>
      {deployResult && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-2 text-[12px] text-emerald-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Deployed! <a href={deployResult.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-300">{deployResult.url}</a>
          </div>
          <button onClick={() => setDeployResult(null)} className="text-[#555] hover:text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </motion.div>
      )}
      {deployError && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between overflow-hidden">
          <span className="text-[12px] text-red-400">{deployError}</span>
          <button onClick={() => setDeployError(null)} className="text-[#555] hover:text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default DeployBanner;
