'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function CollabPanels({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showCollabPanel, showFeedbackPanel } = panelStore;

  const setShowCollabPanel = (v: boolean) => setPanel('showCollabPanel', v);
  const setShowFeedbackPanel = (v: boolean) => setPanel('showFeedbackPanel', v);

  const {
    collabChatInput,
    collabChatMessages,
    collabColorRef,
    collabColors,
    collabJoinInput,
    collabMode,
    collabRoomId,
    collabUserId,
    collabUserName,
    collabUsers,
    feedbackComment,
    feedbackHistory,
    feedbackRating,
    feedbackSubmitted,
    joinCollabRoom,
    leaveCollabRoom,
    messages,
    sendCollabChat,
    setCollabChatInput,
    setCollabJoinInput,
    setFeedbackComment,
    setFeedbackRating,
    startCollabRoom,
    submitFeedback,
  } = p;

  return (
    <>
      {/* --- v23: Collaboration Room Panel --- */}
      {showCollabPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="text-sm font-medium text-white">Collaboration</span>
              {collabRoomId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">{collabRoomId}</span>}
              {collabRoomId && <span className={`text-[9px] px-1.5 py-0.5 rounded ${collabMode === 'remote' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{collabMode === 'remote' ? 'Cross-device' : 'Local tabs'}</span>}
            </div>
            <button aria-label="Close" onClick={() => setShowCollabPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-4 space-y-4">
            {!collabRoomId ? (
              <>
                <div className="space-y-2">
                  <div className="flex gap-2 mb-3">
                    <input value={collabUserName.current} onChange={e => { collabUserName.current = e.target.value; }} placeholder="Your name..." className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[12px] placeholder:text-[#444] focus:border-indigo-500/50 outline-none" />
                    <div className="w-8 h-8 rounded-full border-2 border-[#333] cursor-pointer flex items-center justify-center" style={{ background: collabColorRef.current }} onClick={() => { collabColorRef.current = collabColors[(collabColors.indexOf(collabColorRef.current) + 1) % collabColors.length]; }}>
                      <span className="text-[8px] text-white/80">&#x21bb;</span>
                    </div>
                  </div>
                  <button onClick={() => startCollabRoom()} className="w-full px-4 py-2.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[12px] font-medium hover:bg-indigo-500/30 transition-all flex items-center justify-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    Create New Room
                  </button>
                  <div className="text-center text-[10px] text-[#555]">or join an existing room</div>
                  <div className="flex gap-2">
                    <input value={collabJoinInput} onChange={e => setCollabJoinInput(e.target.value.toUpperCase())} placeholder="Room code..." maxLength={6} className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[12px] font-mono uppercase placeholder:text-[#444] focus:border-indigo-500/50 outline-none" />
                    <button onClick={() => joinCollabRoom(collabJoinInput)} className="px-4 py-2 rounded-lg bg-[#222] border border-[#333] text-white text-[12px] hover:bg-[#2a2a2a] transition-colors">Join</button>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#222] text-[10px] text-[#555] space-y-1">
                  <p>Real-time collaboration: share your room code with anyone.</p>
                  <p>Cross-device sync via signaling server. Local tabs use BroadcastChannel as fallback.</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <div>
                    <div className="text-[11px] text-[#888]">Room Code</div>
                    <div className="text-lg font-mono font-bold text-emerald-400 tracking-wider">{collabRoomId}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard?.writeText(collabRoomId)} className="px-3 py-1.5 rounded-lg bg-[#222] text-[11px] text-white hover:bg-[#2a2a2a] transition-colors">Copy</button>
                    <button onClick={leaveCollabRoom} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 hover:bg-red-500/20 transition-colors">Leave</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] text-[#888]">Connected ({collabUsers.length})</div>
                  {collabUsers.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: u.color }}>{u.name.slice(0, 2)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-white truncate">{u.name} {u.id === collabUserId.current && <span className="text-[9px] text-[#555]">(you)</span>}</div>
                        {u.cursor && u.id !== collabUserId.current && <div className="text-[9px] text-[#555]">editing {u.cursor.file}</div>}
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  ))}
                </div>

                {/* --- v24: Collab Chat --- */}
                <div className="border-t border-[#222] pt-3">
                  <div className="text-[11px] text-[#888] mb-2">Chat</div>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5 mb-2">
                    {collabChatMessages.length === 0 && <p className="text-[10px] text-[#555] italic">No messages yet</p>}
                    {collabChatMessages.slice(-20).map((msg: any, i: any) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ background: msg.userColor }}>{msg.userName.slice(0, 2)}</div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium" style={{ color: msg.userColor }}>{msg.userName}</span>
                          <p className="text-[11px] text-gray-300 break-words">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input value={collabChatInput} onChange={e => setCollabChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendCollabChat(); }} placeholder="Message..." className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-indigo-500/50 outline-none" />
                    <button onClick={sendCollabChat} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-[10px] hover:bg-indigo-500/30 transition-colors">Send</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {/* --- v23: Feedback Panel --- */}
      {showFeedbackPanel && (
        <div className="fixed top-16 right-4 z-40 w-[360px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span className="text-sm font-medium text-white">Send Feedback</span>
            </div>
            <button aria-label="Close" onClick={() => setShowFeedbackPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-4 space-y-4">
            {feedbackSubmitted ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">ðŸŽ‰</div>
                <div className="text-sm text-white font-medium">Thank you for your feedback!</div>
                <div className="text-[11px] text-[#555] mt-1">It helps us improve Aurion.</div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-[12px] text-[#aaa] mb-3">How would you rate your experience?</div>
                  <div className="flex justify-center gap-3">
                    {[
                      { emoji: 'ðŸ˜ž', label: 'Terrible', value: 1 },
                      { emoji: 'ðŸ˜•', label: 'Poor', value: 2 },
                      { emoji: 'ðŸ˜', label: 'Okay', value: 3 },
                      { emoji: 'ðŸ˜Š', label: 'Good', value: 4 },
                      { emoji: 'ðŸ˜', label: 'Amazing', value: 5 },
                    ].map(r => (
                      <button key={r.value} onClick={() => setFeedbackRating(r.value)} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${feedbackRating === r.value ? 'bg-amber-500/15 border border-amber-500/30 scale-110' : 'hover:bg-[#1a1a1a] border border-transparent'}`}>
                        <span className="text-2xl">{r.emoji}</span>
                        <span className="text-[9px] text-[#666]">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="Tell us more (optional)..." rows={3} className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[12px] placeholder:text-[#444] focus:border-amber-500/50 outline-none resize-none" />
                <button onClick={submitFeedback} disabled={feedbackRating === 0} className="w-full px-4 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[12px] font-medium hover:bg-amber-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed">Submit Feedback</button>
                {feedbackHistory.length > 0 && <div className="text-[9px] text-[#444] text-center">{feedbackHistory.length} previous feedback{feedbackHistory.length !== 1 ? 's' : ''} submitted</div>}
              </>
            )}
          </div>
        </div>
      )}

    </>
  );
}
