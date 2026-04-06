'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import { TEMPLATES } from '@/lib/templates-data';

export default function ConversationHistory({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showConversationHistory, showPromptTemplates } = panelStore;

  const setShowConversationHistory = (v: boolean) => setPanel('showConversationHistory', v);
  const setShowPromptTemplates = (v: boolean) => setPanel('showPromptTemplates', v);

  const {
    PROMPT_TEMPLATES,
    activeConversationId,
    conversations,
    deleteConversation,
    loadConversation,
    messages,
    newConversation,
    sendPrompt,
  } = p;

  return (
    <>
      {/* --- Conversation History --- */}
      <AnimatePresence>
        {showConversationHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowConversationHistory(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                  <h2 className="text-sm font-semibold text-white">Conversation History</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{conversations.length}</span>
                </div>
                <button aria-label="Close" onClick={() => setShowConversationHistory(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[12px] text-[#555]">No saved conversations yet</div>
                ) : conversations.sort((a: any, b: any) => b.timestamp - a.timestamp).map((conv: any) => (
                  <div key={conv.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-[#222] transition-colors cursor-pointer group ${conv.id === activeConversationId ? 'bg-[#1e1e1e] border-l-2 border-blue-500' : ''}`} onClick={() => loadConversation(conv)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-white truncate">{conv.title}</p>
                      <p className="text-[10px] text-[#555]">{conv.messages.length} messages Â· {new Date(conv.timestamp).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-400 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-[#222]">
                <button onClick={() => { newConversation(); setShowConversationHistory(false); }} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium transition-colors">New Conversation</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* --- AI Prompt Templates --- */}
      <AnimatePresence>
        {showPromptTemplates && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowPromptTemplates(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">ðŸš€</span>
                  <h2 className="text-sm font-semibold text-white">Prompt Templates</h2>
                </div>
                <button aria-label="Close" onClick={() => setShowPromptTemplates(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3">
                {['Page', 'Enhance', 'Component'].map(cat => (
                  <div key={cat} className="mb-4">
                    <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider px-2 mb-2">{cat === 'Page' ? 'Full Pages' : cat === 'Enhance' ? 'Enhancements' : 'Components'}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {PROMPT_TEMPLATES.filter((t: any) => t.cat === cat).map((t: any) => (
                        <button key={t.title} onClick={() => { sendPrompt(t.prompt); setShowPromptTemplates(false); }} className="text-left p-3 rounded-lg bg-[#111] border border-[#222] hover:border-[#444] hover:bg-[#161616] transition-all group">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{t.icon}</span>
                            <span className="text-[12px] font-medium text-white">{t.title}</span>
                          </div>
                          <p className="text-[10px] text-[#555] leading-4 line-clamp-2">{t.prompt.slice(0, 100)}...</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
