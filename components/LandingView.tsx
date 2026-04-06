'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MODELS } from '@/lib/cdn-models';
import { GlobeIcon, LinkIcon, PROVIDER_LABELS, PROVIDER_ICON } from '@/lib/page-helpers';

interface LandingViewProps {
  attachedImages: { data: string; name: string }[];
  cloneUrl: string;
  cloneWebsite: (url: string) => void;
  enterWorkspace: (prompt: string) => void;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  landingFileInputRef: React.RefObject<HTMLInputElement | null>;
  landingInput: string;
  landingTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  model: string;
  outputFramework: string;
  removeImage: (idx: number) => void;
  selectedModel: { name: string; id: string; provider: string };
  setCloneUrl: (v: string) => void;
  setLandingInput: (v: string) => void;
  setModel: (v: string) => void;
  setOutputFramework: (v: any) => void;
  setShowBackendGenerator: (v: boolean) => void;
  setShowCloneModal: (v: boolean) => void;
  setShowModelMenu: (v: boolean) => void;
  setShowTemplates: (v: boolean) => void;
  setView: (v: any) => void;
  showCloneModal: boolean;
  showModelMenu: boolean;
}

const LandingView = React.memo(function LandingView({
  attachedImages, cloneUrl, cloneWebsite, enterWorkspace, handleImageSelect,
  landingFileInputRef, landingInput, landingTextareaRef, model, outputFramework,
  removeImage, selectedModel, setCloneUrl, setLandingInput, setModel, setOutputFramework,
  setShowBackendGenerator, setShowCloneModal, setShowModelMenu, setShowTemplates,
  setView, showCloneModal, showModelMenu,
}: LandingViewProps) {

  return (
  <div className="h-screen bg-[#0c0c0c] flex flex-col items-center justify-center relative">

    <div className="w-full max-w-[680px] mx-auto px-6 text-center">
      <h1 className="text-[32px] sm:text-[42px] md:text-[52px] font-bold text-white leading-[1.1] mb-10" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        Build any app
      </h1>

      {/* Prompt input — Orchids style */}
      <div className="bg-[#161616] rounded-2xl border border-[#252525] relative">
        <textarea
          ref={landingTextareaRef}
          value={landingInput}
          onChange={(e) => setLandingInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enterWorkspace(landingInput);
            }
          }}
          placeholder="Ask Aurion to build a Slack bot..."
          className="w-full resize-none bg-transparent outline-none text-gray-300 placeholder-[#555] text-[15px] px-5 pt-5 pb-8 min-h-[100px] max-h-[160px]"
          rows={2}
          autoFocus
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-1">
            {/* Model selector in prompt area */}
            <div className="relative" data-model-menu>
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                {selectedModel.name}
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
              </button>
              <AnimatePresence>
                {showModelMenu && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }} className="absolute left-0 bottom-10 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1.5 min-w-[220px] shadow-2xl shadow-black/60">
                    {[...new Set(MODELS.map(m => m.provider))].map((provider, pi) => (
                      <div key={provider}>
                        {pi > 0 && <div className="h-px bg-[#222] my-1.5" />}
                        <div className="px-3 py-1 text-[10px] font-medium text-[#555] uppercase tracking-wider">{PROVIDER_LABELS[provider] || provider}</div>
                        {MODELS.filter(m => m.provider === provider).map(m => (
                          <button key={m.id} onClick={() => { setModel(m.id); setShowModelMenu(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] hover:bg-[#222] transition-colors ${m.id === model ? 'text-white' : 'text-[#777]'}`}>
                            {PROVIDER_ICON[m.provider]}
                            <span className="flex-1 text-left">{m.name}</span>
                            {m.id === model && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Framework selector */}
            <select value={outputFramework} onChange={e => setOutputFramework(e.target.value as typeof outputFramework)} className="px-2 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors border-none outline-none cursor-pointer appearance-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 20 20\' fill=\'%23666\'%3E%3Cpath d=\'M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '18px' }}>
              <option value="html">HTML</option>
              <option value="react">React</option>
              <option value="nextjs">Next.js</option>
              <option value="vue">Vue</option>
              <option value="svelte">Svelte</option>
              <option value="angular">Angular</option>
              <option value="python">Python</option>
              <option value="fullstack">Full-Stack</option>
            </select>
            <button onClick={() => setShowCloneModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">
              <GlobeIcon /> Clone
            </button>
            <button onClick={() => setShowBackendGenerator(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-purple-400 hover:text-purple-300 transition-colors" title="Generate Backend">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
              Backend
            </button>
            <button onClick={() => setLandingInput('Create a CINEMATIC 3D scroll landing page. MANDATORY: preloader animation, aurora gradient hero with split text reveal, horizontal scroll gallery pinned with GSAP ScrollTrigger, 3D parallax image reveals, glassmorphic cards with hover tilt (perspective 1000px rotateX/Y), infinite marquee logos, scroll word-color-reveal section, staggered stats counters, gradient glow CTA, glass footer. Use Lenis smooth scroll, GSAP ScrollTrigger for 5+ animations. Dark theme with glass morphism. 1500+ lines minimum. Topic: ')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-[11px] text-cyan-400 hover:text-cyan-300 transition-all group" title="Mode 3D Cinématique — Génère des sites avec scroll 3D, parallax et animations immersives">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 17l10 6 10-6"/><path d="M2 13l10 6 10-6"/></svg>
              3D
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input ref={landingFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
            <button onClick={() => landingFileInputRef.current?.click()} className="w-8 h-8 rounded-lg hover:bg-[#222] flex items-center justify-center text-[#555] hover:text-white transition-colors" title="Attach image">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button
              onClick={() => enterWorkspace(landingInput)}
              disabled={!landingInput.trim() && attachedImages.length === 0}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
          </div>
        </div>
        {/* Image previews */}
        {attachedImages.length > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            {attachedImages.map((img, i) => (
              <div key={i} className="relative shrink-0 group">
                <img src={img.data} alt={img.name} className="w-16 h-16 rounded-lg object-cover border border-[#333]" />
                <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#333] text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">&times;</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick suggestion chips */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {['Web', 'Mobile', 'Slack Bot', 'AI Agent', 'Chrome Extension'].map((s) => (
          <button key={s} onClick={() => enterWorkspace(`Build me a ${s.toLowerCase()} app`)} className="px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[13px] text-[#888] hover:text-white hover:border-[#444] transition-colors">{s}</button>
        ))}
      </div>
      <div className="mt-3">
        <button onClick={() => { setView('workspace'); setShowTemplates(true); }} className="px-4 py-2 rounded-full bg-[#1a1a1a] border border-purple-500/20 text-[13px] text-purple-400 hover:text-purple-300 hover:border-purple-500/40 transition-colors">
          Start from Template
        </button>
      </div>
    </div>

    {/* Clone Modal on landing */}
    <AnimatePresence>
      {showCloneModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowCloneModal(false); }}>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
            <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Clone Website</h2>
              <button onClick={() => setShowCloneModal(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 focus-within:border-[#444] transition-colors">
                <LinkIcon />
                <input type="url" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && cloneUrl.trim()) { setView('workspace'); setShowCloneModal(false); cloneWebsite(cloneUrl.trim()); } }} placeholder="https://example.com" className="flex-1 bg-transparent outline-none text-sm text-gray-300 placeholder-[#555] ml-2" autoFocus />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ label: 'Stripe', url: 'https://stripe.com' }, { label: 'Linear', url: 'https://linear.app' }, { label: 'Vercel', url: 'https://vercel.com' }].map((ex) => (
                  <button key={ex.label} onClick={() => setCloneUrl(ex.url)} className="px-3 py-2 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111] text-xs text-[#888] hover:text-white transition-colors text-center">{ex.label}</button>
                ))}
              </div>
              <button onClick={() => { setView('workspace'); setShowCloneModal(false); cloneWebsite(cloneUrl.trim()); }} disabled={!cloneUrl.trim()} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">Clone</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  );
});
export default LandingView;
