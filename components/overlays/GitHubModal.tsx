'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function GitHubModal({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showGitHubModal } = panelStore;

  const setShowGitHubModal = (v: boolean) => setPanel('showGitHubModal', v);

  const {
    githubToken,
    isGitHubPushing,
    projectFiles,
    pushToGitHub,
    repoName,
    setGithubToken,
    setRepoName,
  } = p;

  return (
    <>
      {/* --- GitHub Modal --- */}
      <AnimatePresence>
        {showGitHubModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowGitHubModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Push to GitHub</h2>
                <button aria-label="Close" onClick={() => setShowGitHubModal(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-3">
                <div><label className="block text-[12px] text-[#888] mb-1.5">GitHub Token</label><input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_..." className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" /></div>
                <div><label className="block text-[12px] text-[#888] mb-1.5">Repository Name</label><input type="text" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="my-aurion-app" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" /></div>
                <button disabled={!githubToken.trim() || !repoName.trim() || isGitHubPushing || Object.keys(projectFiles).length === 0} onClick={pushToGitHub} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">{isGitHubPushing ? 'Pushing...' : `Push ${Object.keys(projectFiles).length} files`}</button>
                {Object.keys(projectFiles).length === 0 && <p className="text-[10px] text-[#555] text-center mt-1">Build something first â€” no files to push</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
