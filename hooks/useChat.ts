'use client';
import { useCallback, useRef, useState } from 'react';
import { fetchWithRetry } from '@/lib/client-utils';
import type { Message } from '@/lib/client-utils';
import { MODELS, assemblePreview } from '@/lib/cdn-models';
import { getOptimalModel, generateId, extractPreviewHtml, extractAllCodeBlocks } from '@/lib/page-helpers';
import { postProcessOutput, validateGeneratedCode } from '@/lib/claude-code-engine';
import { autoDetectFramework } from '@/lib/claude-code-brain';

export interface UseChatOptions {
  // Shared state passed in from parent
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isStreaming: boolean;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  showModelMenu: boolean;
  setShowModelMenu: (v: boolean) => void;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setClonedHtml: React.Dispatch<React.SetStateAction<string | null>>;
  setCloneError: React.Dispatch<React.SetStateAction<string | null>>;
  generationHistory: { font?: string; accent?: string; template?: string; ts: number }[];
  setGenerationHistory: React.Dispatch<React.SetStateAction<{ font?: string; accent?: string; template?: string; ts: number }[]>>;
  // Dependencies
  buildWorkspaceContext: () => string;
  researchMode: boolean;
  researchContext: string;
  setResearchContext: (ctx: string) => void;
  enhanceWithResearch: (tool: string, prompt: string) => Promise<string>;
  activeTab: string;
  deviceMode: string;
}

export function useChat(options: UseChatOptions) {
  const {
    messages, setMessages,
    input, setInput,
    isStreaming, setIsStreaming,
    model, setModel,
    showModelMenu, setShowModelMenu,
    error, setError,
    setClonedHtml, setCloneError,
    generationHistory, setGenerationHistory,
    buildWorkspaceContext,
    researchMode,
    researchContext,
    setResearchContext,
    enhanceWithResearch,
  } = options;

  // A/B Mode
  const [abMode, setAbMode] = useState(false);
  const [abModelB, setAbModelB] = useState(MODELS[5]?.id || MODELS[0].id);
  const [abResultB, setAbResultB] = useState<string>('');
  const [abStreaming, setAbStreaming] = useState(false);
  const abAbortRef = useRef<AbortController | null>(null);

  // Streaming stats
  const [streamingChars, setStreamingChars] = useState(0);
  const streamStartTime = useRef<number>(0);

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const autoFixInFlightRef = useRef(false);

  // Attached images
  const [attachedImages, setAttachedImages] = useState<{ data: string; type: string; name: string }[]>([]);

  // Claude Code Brain analysis state
  const [brainAnalysis, setBrainAnalysis] = useState<{
    domains: { domain: string; confidence: number }[];
    complexity: string;
    executionPlan: string;
    qualityGates: string[];
  } | null>(null);
  const [brainAnalyzing, setBrainAnalyzing] = useState(false);

  const extractGenMetadata = useCallback((html: string): { font?: string; accent?: string; template?: string } => {
    const meta: { font?: string; accent?: string; template?: string } = {};
    const fontImport = html.match(/fonts\.googleapis\.com\/css2?\?family=([^&"']+)/);
    if (fontImport) meta.font = decodeURIComponent(fontImport[1]).split('&')[0].replace(/\+/g, ' ').split(':')[0];
    const accentVar = html.match(/--accent\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
    if (accentVar) meta.accent = accentVar[1];
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) meta.template = titleMatch[1].trim().slice(0, 40);
    return meta;
  }, []);

  const recordGeneration = useCallback((html: string) => {
    const meta = extractGenMetadata(html);
    if (!meta.font && !meta.accent) return;
    const entry = { ...meta, ts: Date.now() };
    setGenerationHistory(prev => {
      const next = [...prev, entry].slice(-5);
      try { localStorage.setItem('aurion_gen_history', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [extractGenMetadata]);

  // Core streaming function
  const streamToAssistant = useCallback(async (
    allMessages: { role: string; content: string }[],
    assistantMsgId: string,
    useModel: string,
    signal: AbortSignal,
    images?: { data: string; type: string }[],
    directResearchContext?: string,
    clientBrainAnalysis?: { domains: { domain: string; confidence: number }[]; complexity: string; executionPlan: string; qualityGates: string[] } | null,
  ) => {
    const endpoint = '/api/claude-code';
    const effectiveResearch = directResearchContext || researchContext || undefined;

    const bodyPayload = {
      action: 'jarvis-execute',
      prompt: allMessages[allMessages.length - 1]?.content || '',
      messages: allMessages.slice(0, -1),
      model: useModel,
      researchContext: effectiveResearch,
      ...(images?.length ? { images } : {}),
      ...(clientBrainAnalysis ? { brainAnalysis: clientBrainAnalysis } : {}),
    };

    const res = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal,
      timeout: 0,
    }, 0);

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('No response stream');

    let accumulatedText = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') break;
        let data;
        try { data = JSON.parse(payload); } catch { continue; }
        if (data.error) {
          const clean = data.error.replace(/\[GoogleGenerativeAI Error\]:?\s*/gi, '').replace(/Error fetching from https:\/\/[^\s]+/gi, '').replace(/\[{"@type"[\s\S]*/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 150) || 'Request failed. Please try again.';
          throw new Error(clean);
        }
        // Handle subsystem status metadata event
        if (data.subsystemStatus) {
          const statuses = data.subsystemStatus as Record<string, { status: string; ms?: number }>;
          const failed = Object.entries(statuses)
            .filter(([, v]) => v.status === 'timeout' || v.status === 'error')
            .map(([k, v]) => `${k}: ${v.status}${v.ms ? ` (${Math.round(v.ms / 1000)}s)` : ''}`);
          if (failed.length > 0) {
            setError(`Subsystems: ${failed.join(', ')}`);
          }
          continue;
        }
        if (data.text) {
          accumulatedText += data.text;
          setStreamingChars(prev => prev + data.text.length);
          setMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? { ...m, content: m.content + data.text } : m))
          );
        }
      }
    }
    return accumulatedText;
  }, [researchContext]);

  // Build framework instructions — AUTO-DETECTED from prompt (no manual selector)
  const getFrameworkInstructions = useCallback((promptText?: string) => {
    const text = promptText || input || '';
    if (!text.trim()) return '';
    const { instructions } = autoDetectFramework(text);
    return instructions;
  }, [input]);

  // Main send function
  const sendToAI = useCallback(async (text: string, imgs?: { data: string; type: string }[]) => {
    if (!text.trim() || isStreaming) return;
    setError(null);
    const optimalModel = getOptimalModel(model, text, !!(imgs && imgs.length > 0));
    if (optimalModel !== model) setModel(optimalModel);
    const useModelId = optimalModel;

    const userMsg: Message = { id: generateId(), role: 'user', content: text.trim() };
    const assistantMsg: Message = { id: generateId(), role: 'assistant', content: '' };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingChars(0);
    streamStartTime.current = Date.now();

    const controller = new AbortController();
    abortRef.current = controller;

    // Claude Code Brain: Pre-analyze the prompt (non-blocking, fast)
    setBrainAnalyzing(true);
    try {
      const brainRes = await fetch('/api/claude-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'brain-analyze', prompt: text.trim() }),
        signal: AbortSignal.timeout(3000),
      });
      if (brainRes.ok) {
        const brainData = await brainRes.json();
        if (brainData?.data) setBrainAnalysis(brainData.data);
      }
    } catch { /* non-blocking — brain analysis is optional */ }
    setBrainAnalyzing(false);

    const ctx = buildWorkspaceContext();
    let directResearchResult: string | undefined;
    if (researchMode && !researchContext && text.length > 10) {
      try {
        const enhancement = await Promise.race([
          enhanceWithResearch('generate', text),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
        ]);
        if (enhancement) {
          directResearchResult = enhancement;
          setResearchContext(enhancement);
        }
      } catch { /* continue without research */ }
    }

    const fwInstructions = getFrameworkInstructions(text);
    const allMessages = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
    if (allMessages.length > 0) {
      allMessages[allMessages.length - 1] = {
        ...allMessages[allMessages.length - 1],
        content: allMessages[allMessages.length - 1].content + '\n\n' + ctx + fwInstructions,
      };
    }

    // A/B comparison
    if (abMode && abModelB !== useModelId) {
      setAbResultB('');
      setAbStreaming(true);
      const abController = new AbortController();
      abAbortRef.current = abController;
      (async () => {
        try {
          const res = await fetchWithRetry('/api/claude-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'jarvis-execute', prompt: allMessages[allMessages.length - 1]?.content || '', messages: allMessages.slice(0, -1), model: abModelB, ...(imgs?.length ? { images: imgs } : {}), ...(brainAnalysis ? { brainAnalysis } : {}) }),
            signal: abController.signal,
            timeout: 300000,
          }, 2);
          if (!res.ok) throw new Error('Model B request failed');
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) return;
          let buf = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6);
              if (payload === '[DONE]') break;
              try {
                const d = JSON.parse(payload);
                if (d.text) setAbResultB(prev => prev + d.text);
              } catch { continue; }
            }
          }
        } catch { /* Model B failed silently */ }
        finally { setAbStreaming(false); abAbortRef.current = null; }
      })();
    }

    try {
      const generatedOutput = await streamToAssistant(allMessages, assistantMsg.id, useModelId, controller.signal, imgs, directResearchResult, brainAnalysis);

      // Quality Gates + Auto-Continue
      if (generatedOutput && generatedOutput.length > 200) {
        const output = generatedOutput;
        const hasDoctype = /<!DOCTYPE\s+html/i.test(output);
        const hasClosingHtml = /<\/html\s*>/i.test(output);
        const hasBody = /<body[^>]*>/i.test(output);
        const hasClosingBody = /<\/body\s*>/i.test(output);
        const isHtmlOutput = hasDoctype || hasBody;

        // Detect React multi-file output truncation
        const fileTagOpens = (output.match(/<<FILE:/g) || []).length;
        const fileTagCloses = (output.match(/<\/FILE>>/g) || []).length;
        const isReactOutput = fileTagOpens > 1; // Multi-file = React project
        const isReactTruncated = isReactOutput && fileTagOpens > fileTagCloses;

        // Auto-continue if truncated (HTML or React)
        const isTruncated = isReactTruncated || (isHtmlOutput && (!hasClosingHtml || !hasClosingBody));
        if (isTruncated && output.length > 1000) {
          try {
            const continueRes = await fetch('/api/claude-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'continue', code: output, model: useModelId }),
              signal: AbortSignal.timeout(120000),
            });
            if (continueRes.ok) {
              const reader = continueRes.body?.getReader();
              const decoder = new TextDecoder();
              if (reader) {
                let buf = '';
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  const lines = buf.split('\n');
                  buf = lines.pop() ?? '';
                  for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6);
                    if (payload === '[DONE]') break;
                    try { const d = JSON.parse(payload); if (d.text) setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + d.text } : m)); } catch { continue; }
                  }
                }
              }
            }
          } catch { /* auto-continue failed */ }
        }

        // Quality gate (works for both HTML and React multi-file output)
        // NOW: auto-fix if quality < 50% (up to 1 retry)
        if (isHtmlOutput || isReactOutput) {
          try {
            const currentOutput = generatedOutput;
            const qcRes = await fetch('/api/claude-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'quality-check', code: currentOutput }),
              signal: AbortSignal.timeout(5000),
            });
            if (qcRes.ok) {
              const qcData = await qcRes.json();
              if (qcData?.data) {
                const { score, errors: qcErrors, warnings } = qcData.data;
                if (score < 50 && qcErrors?.length > 0 && !autoFixInFlightRef.current) {
                  autoFixInFlightRef.current = true;
                  // Auto-fix: send the errors back to the LLM for a targeted repair
                  try {
                    const fixRes = await fetch('/api/claude-code', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'quality-fix', code: currentOutput, errors: qcErrors, model: useModelId }),
                      signal: AbortSignal.timeout(60000),
                    });
                    if (fixRes.ok) {
                      const reader = fixRes.body?.getReader();
                      const decoder = new TextDecoder();
                      if (reader) {
                        let fixText = '';
                        let buf = '';
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          buf += decoder.decode(value, { stream: true });
                          const lines = buf.split('\n');
                          buf = lines.pop() ?? '';
                          for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const payload = line.slice(6);
                            if (payload === '[DONE]') break;
                            try { const d = JSON.parse(payload); if (d.text) fixText += d.text; } catch { continue; }
                          }
                        }
                        // Only use fix if it passes quality check better AND is substantial
                        if (fixText.length > currentOutput.length * 0.5) {
                          // Re-validate the fix before applying
                          const fixQcRes = await fetch('/api/claude-code', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'quality-check', code: fixText }),
                            signal: AbortSignal.timeout(3000),
                          });
                          const fixQc = fixQcRes.ok ? await fixQcRes.json() : null;
                          const fixScore = fixQc?.data?.score ?? 0;
                          if (fixScore > score) {
                            // Fix is better — apply it but notify user
                            setMessages(prev => prev.map(m =>
                              m.id === assistantMsg.id ? { ...m, content: fixText } : m
                            ));
                            setError(`Auto-fixed: ${score}% → ${fixScore}%`);
                          } else {
                            // Fix is worse — keep original, just report
                            setError(`Quality: ${score}% — auto-fix didn't improve (${fixScore}%). Keeping original.`);
                          }
                        }
                      }
                    }
                  } catch { /* auto-fix failed, keep original */ }
                } else if (score < 70 && (qcErrors?.length > 0 || warnings?.length > 0)) {
                  setError(`Quality: ${score}% — ${[...qcErrors, ...warnings.slice(0, 2)].join(', ')}`);
                }
              }
            }
          } catch { /* non-blocking */ }
        }

        // Post-processing
        const ppResult = postProcessOutput(output);
        if (ppResult.fixes.length > 0) {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsg.id ? { ...m, content: ppResult.code } : m
          ));
        }

        // Code validation feedback loop — structural checks
        const validation = validateGeneratedCode(ppResult.code || output);
        if (!validation.valid || validation.fileIssues.length > 0) {
          const issues = [
            ...validation.errors,
            ...validation.fileIssues.map(fi => `${fi.file}: ${fi.issue}`),
          ].slice(0, 5);
          if (issues.length > 0) {
            setError(`Code issues: ${issues.join(' | ')}`);
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const raw = err instanceof Error ? err.message : 'Unknown error';
      const msg = raw.replace(/\[GoogleGenerativeAI Error\]:?\s*/gi, '').replace(/Error fetching from https:\/\/[^\s]+/gi, '').replace(/\[{"@type"[\s\S]*/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 150) || 'Request failed. Please try again.';
      setError(msg);
      setMessages(prev => prev.filter(m => m.id !== assistantMsg.id || m.content.length > 0));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      autoFixInFlightRef.current = false;
      setMessages(prev => {
        const last = prev.find(m => m.id === assistantMsg.id);
        if (last?.content) recordGeneration(last.content);
        return prev;
      });
    }
  }, [isStreaming, messages, model, streamToAssistant, buildWorkspaceContext, abMode, abModelB, recordGeneration, researchMode, researchContext, enhanceWithResearch, setResearchContext, getFrameworkInstructions]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const imgInfo = attachedImages.length > 0 ? `\n[${attachedImages.length} image(s) attached: ${attachedImages.map(i => i.name).join(', ')}]` : '';
    const imgs = attachedImages.length > 0 ? attachedImages.map(i => ({ data: i.data, type: i.type })) : undefined;
    setAttachedImages([]);
    sendToAI(text + imgInfo, imgs);
  }, [input, attachedImages, sendToAI]);

  const sendPrompt = useCallback((text: string) => { sendToAI(text); }, [sendToAI]);

  const stopStream = useCallback(() => { abortRef.current?.abort(); setIsStreaming(false); }, []);

  const clearChat = useCallback(() => {
    if (isStreaming) { abortRef.current?.abort(); setIsStreaming(false); }
    setMessages([]);
    setError(null);
  }, [isStreaming]);

  return {
    // A/B
    abMode, setAbMode,
    abModelB, setAbModelB,
    abResultB, setAbResultB,
    abStreaming,
    // Streaming stats
    streamingChars, streamStartTime,
    // Images
    attachedImages, setAttachedImages,
    // Claude Code Brain
    brainAnalysis, brainAnalyzing,
    // Refs
    autoFixInFlightRef,
    // Actions
    sendToAI, sendMessage, sendPrompt,
    stopStream, clearChat,
  };
}
