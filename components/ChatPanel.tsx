'use client';
import React, { RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import { MODELS } from '@/lib/cdn-models';
import {
  TAG_COLORS, PROVIDER_LABELS, PROVIDER_ICON,
  MarkdownContent, TypingIndicator, PlusIcon,
} from '@/lib/page-helpers';

export interface ChatPanelProps {
  chatWidth: number;
  messages: { id: string; role: string; content: string }[];
  newConversation: () => void;
  hasContent: boolean;
  smartSuggestions: { title: string; desc: string }[];
  sendPrompt: (text: string) => void;
  isStreaming: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  selectedFile: string;
  projectFiles: Record<string, { content: string; [key: string]: any }>;
  setProjectFiles: (fn: (prev: any) => any) => void;
  abMode: boolean;
  abResultB: string;
  abStreaming: boolean;
  abModelB: string;
  setAbResultB: (v: string) => void;
  setMessages: (fn: (prev: any[]) => any[]) => void;
  error: string | null;
  setError: (v: string | null) => void;
  sendToAI: (text: string) => void;
  followUpSuggestions: string[];
  chatEndRef: RefObject<HTMLDivElement | null>;
  streamingChars: number;
  streamStartTime: RefObject<number>;
  model: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void;
  setModel: (v: string) => void;
  selectedModel: { name: string; [key: string]: any };
  setAbMode: (fn: (prev: boolean) => boolean) => void;
  setAbModelB: (v: string) => void;
  outputFramework: string;
  setOutputFramework: (v: any) => void;
  researchMode: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageSelect: (e: any) => void;
  stopStream: () => void;
  attachedImages: { data: string; name: string }[];
  removeImage: (i: number) => void;
}

const ChatPanel = React.memo(function ChatPanel({
  chatWidth, messages, newConversation, hasContent, smartSuggestions, sendPrompt,
  isStreaming, showToast, selectedFile, projectFiles, setProjectFiles,
  abMode, abResultB, abStreaming, abModelB, setAbResultB, setMessages,
  error, setError, sendToAI, followUpSuggestions, chatEndRef,
  streamingChars, streamStartTime, model, textareaRef, input, setInput,
  sendMessage, setModel, selectedModel, setAbMode, setAbModelB,
  outputFramework, setOutputFramework, researchMode, fileInputRef,
  handleImageSelect, stopStream, attachedImages, removeImage,
}: ChatPanelProps) {
  const { showModelMenu } = usePanelStore();
  const panelActions = usePanelStore();

  return (
    <AnimatePresence initial={false}>
      {(
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: chatWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ width: chatWidth }}
          className="chat-panel h-full border-r border-[#1e1e1e] flex flex-col bg-[#0f0f0f] shrink-0 overflow-hidden"
        >
          <div style={{ width: chatWidth }} className="h-full flex flex-col">
            {/* Chat header */}
            <div className="h-[44px] border-b border-[#1e1e1e] px-3 flex items-center justify-between shrink-0">
              <span className="text-[13px] font-medium text-white truncate max-w-[50%]">
                {messages.length > 0 ? (messages[0]?.content?.slice(0, 40) + (messages[0]?.content?.length > 40 ? '...' : '')) : 'New Chat'}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => panelActions.setPanel('showConversationHistory', true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="History" aria-label="Chat history"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg></button>
                <button onClick={() => panelActions.setPanel('showPromptTemplates', true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Templates" aria-label="Prompt templates"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
                <button onClick={newConversation} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="New chat" aria-label="New chat"><PlusIcon /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto" role="log" aria-live="polite">
              {!hasContent ? (
                <div className="flex flex-col items-center justify-center h-full px-6">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#161616] border border-[#222] flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">A</span>
                    </div>
                    <h2 className="text-base font-semibold text-white mb-1.5">What do you want to build?</h2>
                    <p className="text-[12px] text-[#555] mb-5">Describe your idea or clone a website.</p>
                    <div className="space-y-1.5 text-left max-w-[260px] mx-auto">
                      {smartSuggestions.map((ex) => (
                        <button key={ex.title} onClick={() => sendPrompt(`Build me a ${ex.desc.toLowerCase()}`)} className="w-full p-2.5 rounded-lg border border-[#222] hover:border-[#444] bg-[#111] hover:bg-[#161616] transition-colors text-left">
                          <p className="text-[12px] text-white">{ex.title}</p>
                          <p className="text-[10px] text-[#555]">{ex.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-3 px-3 space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className={msg.role === 'user' ? 'flex justify-end' : 'group/msg'}>
                        {msg.role === 'user' ? (
                          <div className="max-w-[90%] px-3 py-2 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-white">
                            <p className="whitespace-pre-wrap text-[13px]">{msg.content}</p>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="prose prose-invert prose-sm max-w-none text-[13px] text-gray-300">
                              {msg.content ? <MarkdownContent content={msg.content} /> : isStreaming ? <TypingIndicator /> : null}
                            </div>
                            {msg.content && !isStreaming && (
                              <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('Response copied', 'success'); }} className="px-1.5 py-0.5 rounded text-[9px] text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Copy response">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </button>
                                {(() => { const codeMatch = msg.content.match(/```\w*\n([\s\S]*?)```/); return codeMatch ? (
                                  <button onClick={() => { const code = codeMatch[1].trim(); if (selectedFile && projectFiles[selectedFile]) { setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + code } })); showToast('Code inserted', 'success'); } }} className="px-1.5 py-0.5 rounded text-[9px] text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Insert code into current file">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                  </button>
                                ) : null; })()}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {/* A/B Model Comparison result */}
                  {abMode && (abResultB || abStreaming) && (
                    <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-purple-500/10">
                        <span className="text-[10px] font-medium text-purple-400">Model B: {MODELS.find(m => m.id === abModelB)?.name || abModelB}</span>
                        <div className="flex items-center gap-1.5">
                          {abStreaming && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-2.5 h-2.5 border border-purple-400 border-t-transparent rounded-full" />}
                          {abResultB && !abStreaming && (
                            <button onClick={() => {
                              setMessages(prev => {
                                const last = [...prev].reverse().find(m => m.role === 'assistant');
                                if (!last) return prev;
                                return prev.map(m => m.id === last.id ? { ...m, content: abResultB } : m);
                              });
                              setAbResultB('');
                            }} className="px-2 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors">
                              Use this
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="px-3 py-2 max-h-[200px] overflow-y-auto prose prose-invert prose-sm max-w-none text-[12px] text-gray-400">
                        {abResultB ? <MarkdownContent content={abResultB} /> : <TypingIndicator />}
                      </div>
                    </div>
                  )}
                  {error && <div className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-red-400 text-[11px] flex items-start gap-2"><span className="flex-1">{error}</span><button onClick={() => { setError(null); if (messages.length >= 2) { const lastUserMsg = [...messages].reverse().find(m => m.role === 'user'); if (lastUserMsg) sendToAI(lastUserMsg.content); } }} className="shrink-0 text-[10px] underline hover:text-red-300 cursor-pointer">Try again</button></div>}
                  {/* Follow-up suggestion chips */}
                  {followUpSuggestions.length > 0 && !isStreaming && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {followUpSuggestions.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => sendPrompt(chip)}
                          className="px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white hover:border-[#444] hover:bg-[#222] transition-all"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Prompt input */}
            <div className="p-3 shrink-0 relative">
              {isStreaming && streamingChars > 0 && (
                <div className="flex items-center justify-between px-3 py-1 mb-1 rounded-lg bg-[#111] border border-[#1e1e1e] text-[10px] text-[#555]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full" /> Streaming</span>
                    <span>{streamingChars.toLocaleString()} chars</span>
                    <span>{((Date.now() - streamStartTime.current) / 1000).toFixed(1)}s</span>
                  </div>
                  <span className="text-[#444]">{MODELS.find(m => m.id === model)?.name}</span>
                </div>
              )}
              <div className="bg-[#161616] rounded-xl border border-[#222] focus-within:border-[#444] transition-colors relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Give Aurion a followup..."
                  aria-label="Chat message input"
                  className="w-full resize-none bg-transparent outline-none text-gray-300 placeholder-[#555] text-[13px] px-3 pt-3 pb-6 max-h-[140px]"
                  rows={1}
                  disabled={isStreaming}
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <div className="flex items-center gap-1">
                    {/* Model selector */}
                    <div className="relative" data-model-menu>
                      <button onClick={() => panelActions.togglePanel('showModelMenu')} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#222] hover:bg-[#2a2a2a] text-[10px] text-[#888] hover:text-white transition-colors">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                        {selectedModel.name}
                        <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                      </button>
                      <AnimatePresence>
                        {showModelMenu && (
                          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }} className="absolute left-0 bottom-8 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1.5 min-w-[200px] shadow-2xl shadow-black/60">
                            {[...new Set(MODELS.map(m => m.provider))].map((provider, pi) => (
                              <div key={provider}>
                                {pi > 0 && <div className="h-px bg-[#222] my-1.5" />}
                                <div className="px-3 py-1 text-[9px] font-medium text-[#555] uppercase tracking-wider">{PROVIDER_LABELS[provider] || provider}</div>
                                {MODELS.filter(m => m.provider === provider).map(m => (
                                  <button key={m.id} onClick={() => { setModel(m.id); panelActions.setPanel('showModelMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${m.id === model ? 'text-white' : 'text-[#777]'}`}>
                                    {PROVIDER_ICON[m.provider]}
                                    <span className="flex-1 text-left">{m.name}</span>
                                    <span className="flex items-center gap-0.5">
                                      {m.tags.map(t => <span key={t} className={`px-1 py-px rounded text-[8px] font-medium border ${TAG_COLORS[t] || 'text-[#555] bg-[#1a1a1a] border-[#333]'}`}>{t}</span>)}
                                    </span>
                                    {m.id === model && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                                  </button>
                                ))}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {/* A/B comparison toggle */}
                    <button onClick={() => setAbMode(prev => !prev)} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${abMode ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' : 'bg-[#222] hover:bg-[#2a2a2a] text-[#888] hover:text-white'}`} title="A/B Model Comparison">
                      A/B
                    </button>
                    {abMode && (
                      <select value={abModelB} onChange={e => setAbModelB(e.target.value)} className="bg-[#222] border border-[#333] rounded-md px-1.5 py-0.5 text-[9px] text-[#888] outline-none max-w-[100px]">
                        {MODELS.filter(m => m.id !== model).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    )}
                    {/* Framework selector */}
                    <select value={outputFramework} onChange={e => setOutputFramework(e.target.value as typeof outputFramework)} className="bg-[#222] border border-[#333] rounded-md px-1.5 py-0.5 text-[9px] text-[#888] outline-none cursor-pointer" title="Output framework">
                      <option value="html">HTML</option>
                      <option value="react">React</option>
                      <option value="nextjs">Next.js</option>
                      <option value="vue">Vue</option>
                      <option value="svelte">Svelte</option>
                      <option value="angular">Angular</option>
                      <option value="python">Python</option>
                      <option value="fullstack">Full-Stack</option>
                    </select>
                    {/* 3D Cinematic mode button */}
                    <button onClick={() => setInput('Create a CINEMATIC 3D scroll landing page. MANDATORY: preloader animation, aurora gradient hero with split text reveal, horizontal scroll gallery pinned with GSAP ScrollTrigger, 3D parallax image reveals, glassmorphic cards with hover tilt (perspective 1000px rotateX/Y), infinite marquee logos, scroll word-color-reveal section, staggered stats counters, gradient glow CTA, glass footer. Use Lenis smooth scroll, GSAP ScrollTrigger for 5+ animations. Dark theme with glass morphism. 1500+ lines minimum. Topic: ')} className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-[10px] text-cyan-400 hover:text-cyan-300 transition-all group" title="Mode 3D Cinématique">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 17l10 6 10-6"/><path d="M2 13l10 6 10-6"/></svg>
                      3D
                    </button>
                    {/* Research & Claude Code mode indicators */}
                    {researchMode && (
                      <button onClick={() => panelActions.setPanel('showResearchPanel', true)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400 hover:bg-violet-500/20 transition-all" title="NotebookLM Research Active">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                      </button>
                    )}
                    <button onClick={() => panelActions.setPanel('showResearchPanel', true)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 text-[10px] text-orange-400 hover:bg-orange-500/20 transition-all" title="Jarvis Brain Active — Click for Status">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
                        <span className="font-medium">JARVIS</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                      </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                    <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded-lg hover:bg-[#222] flex items-center justify-center text-[#555] hover:text-white transition-colors" title="Attach image" aria-label="Attach image"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                    {isStreaming ? (
                      <button onClick={stopStream} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center transition-colors" title="Stop" aria-label="Stop streaming"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
                    ) : (
                      <button data-send-btn onClick={sendMessage} disabled={!input.trim() && attachedImages.length === 0} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center transition-all disabled:opacity-20 hover:bg-gray-200" title="Send" aria-label="Send message"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
                    )}
                  </div>
                </div>
                {/* Image previews + Screenshot-to-Code action */}
                {attachedImages.length > 0 && (
                  <div className="px-3 pb-2 space-y-1.5">
                    <div className="flex gap-1.5 overflow-x-auto">
                      {attachedImages.map((img, i) => (
                        <div key={i} className="relative shrink-0 group">
                          <img src={img.data} alt={img.name} className="w-12 h-12 rounded-lg object-cover border border-[#333]" />
                          <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#333] text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">&times;</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => { setInput('Reproduce this design exactly as a pixel-perfect responsive HTML/CSS page with all the visual elements, colors, typography, spacing and layout shown in the screenshot'); }} className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 hover:bg-blue-500/20 transition-colors">
                        Screenshot → Code
                      </button>
                      <button onClick={() => { setInput('Analyze this screenshot and describe every UI element, color, font, spacing and layout detail you see'); }} className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 hover:bg-purple-500/20 transition-colors">
                        Analyze Design
                      </button>
                      <button onClick={() => { setInput('Improve this design: make it more modern, add better spacing, smoother gradients, micro-interactions and animations while keeping the same layout'); }} className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 hover:bg-green-500/20 transition-colors">
                        Improve Design
                      </button>
                    </div>
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
export default ChatPanel;
