'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function OnboardingPanels({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showChangelog, showOnboarding } = panelStore;

  const setShowChangelog = (v: boolean) => setPanel('showChangelog', v);

  const {
    finishOnboarding,
    onboardingStep,
    onboardingSteps,
    setOnboardingStep,
  } = p;

  return (
    <>
      {/* --- v23: Onboarding Tour Overlay --- */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-[480px] bg-[#161616] rounded-2xl border border-[#2a2a2a] shadow-2xl overflow-hidden">
            <div className="relative h-36 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-cyan-600/10 flex items-center justify-center">
              <span className="text-5xl">{onboardingSteps[onboardingStep]?.icon}</span>
              <div className="absolute top-3 right-3 flex gap-1">
                {onboardingSteps.map((_: any, i: any) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === onboardingStep ? 'bg-white w-4' : i < onboardingStep ? 'bg-white/50' : 'bg-white/20'}`} />)}
              </div>
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-lg font-bold text-white">{onboardingSteps[onboardingStep]?.title}</h3>
              <p className="text-[13px] text-[#aaa] leading-relaxed">{onboardingSteps[onboardingStep]?.desc}</p>
            </div>
            <div className="px-6 pb-6 flex items-center justify-between">
              <button onClick={finishOnboarding} className="text-[11px] text-[#555] hover:text-white transition-colors">Skip tour</button>
              <div className="flex gap-2">
                {onboardingStep > 0 && <button onClick={() => setOnboardingStep((s: any) => s - 1)} className="px-4 py-2 rounded-lg bg-[#222] text-[12px] text-white hover:bg-[#2a2a2a] transition-colors">Back</button>}
                {onboardingStep < onboardingSteps.length - 1 ? (
                  <button onClick={() => setOnboardingStep((s: any) => s + 1)} className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[12px] font-medium hover:bg-indigo-500/30 transition-colors">Next</button>
                ) : (
                  <button onClick={finishOnboarding} className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[12px] font-medium hover:bg-indigo-500/30 transition-colors">Get Started</button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}


      {/* --- v23: Changelog / What's New --- */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowChangelog(false)}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={e => e.stopPropagation()} className="w-[520px] max-h-[600px] bg-[#161616] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">ðŸš€</span>
                <span className="text-base font-bold text-white">{"What's New in Aurion"}</span>
              </div>
              <button aria-label="Close" onClick={() => setShowChangelog(false)} className="text-[#555] hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {[
                { version: 'v23', date: 'Latest', title: 'Collaboration, Feedback & AI Quality', items: ['Real-time collaboration rooms with BroadcastChannel sync', 'Feedback widget with emoji ratings', 'Interactive onboarding tour for new users', 'Enhanced AI system prompts for better code generation', 'Iterative editing intelligence â€” AI preserves existing code', 'Error recovery protocol â€” smarter debugging', 'Changelog panel (you are here!)'] },
                { version: 'v22', date: 'Previous', title: 'PWA, Schema, Bundle & Security', items: ['PWA Checker', 'Schema.org/JSON-LD Validator', 'Bundle Size Estimator', 'ARIA Roles Inspector', 'Security Headers Check', 'Project Export as ZIP'] },
                { version: 'v21', date: 'Previous', title: 'CSS Animations & Semantic HTML', items: ['CSS Animation Inspector', 'Event Listener Audit', 'Open Graph Preview', 'Semantic HTML Checker', 'File Change Summary', 'Whitespace/Indent Checker'] },
                { version: 'v20', date: 'Previous', title: 'Console, Colors & Performance', items: ['Console Filter & Export', 'Inline Color Picker', 'Code Folding Map', 'Dependency Graph', 'Performance Budget', 'Responsive Preview Grid'] },
                { version: 'v19', date: 'Previous', title: 'Regex, CSS & Code Analysis', items: ['Regex Tester', 'CSS Specificity Calculator', 'Image Lazy Loading Checker', 'Text Statistics', 'Duplicate Code Detector', 'Element Counter'] },
              ].map(release => (
                <div key={release.version}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold">{release.version}</span>
                    <span className="text-[10px] text-[#555]">{release.date}</span>
                  </div>
                  <h4 className="text-[13px] font-bold text-white mb-2">{release.title}</h4>
                  <ul className="space-y-1">
                    {release.items.map((item, i) => (
                      <li key={i} className="text-[11px] text-[#aaa] flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5 shrink-0">+</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

    </>
  );
}
