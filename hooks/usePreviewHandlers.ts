import { useCallback, useEffect } from 'react';
import type { VirtualFS } from '@/lib/types';

interface UsePreviewHandlersDeps {
  isEditMode: boolean;
  isStreaming: boolean;
  rawPreviewHtml: string | null;
  previewHtml: string | null;
  projectFiles: VirtualFS;
  autoFixEnabled: boolean;
  runtimeErrors: { message: string; source?: string; line?: number; col?: number; timestamp: number }[];
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  pendingEditHtmlRef: React.MutableRefObject<string | null>;
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  setConsoleLogs: React.Dispatch<React.SetStateAction<{ type: string; message: string; ts: number }[]>>;
  setRuntimeErrors: React.Dispatch<React.SetStateAction<{ message: string; source?: string; line?: number; col?: number; timestamp: number }[]>>;
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
  setClonedHtml: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectPromptData: React.Dispatch<React.SetStateAction<{ outerHtml: string; cssPath: string; tagName: string; rect: { top: number; left: number; width: number; height: number } } | null>>;
  setSelectPromptInput: React.Dispatch<React.SetStateAction<string>>;
  selectPromptRef: React.RefObject<HTMLInputElement | null>;
  panelActions: { setPanel: (key: string, value: boolean) => void };
  sendToAI: (prompt: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  autoFixInFlightRef: React.MutableRefObject<boolean>;
}

export function usePreviewHandlers(deps: UsePreviewHandlersDeps) {
  const {
    isEditMode, isStreaming, rawPreviewHtml, previewHtml, projectFiles,
    autoFixEnabled, runtimeErrors, iframeRef, pendingEditHtmlRef,
    setTerminalLines, setConsoleLogs, setRuntimeErrors, setProjectFiles,
    setClonedHtml, setSelectPromptData, setSelectPromptInput, selectPromptRef,
    panelActions, sendToAI, showToast, autoFixInFlightRef,
  } = deps;

  // Listen for visual edits from the iframe
  useEffect(() => {
    function handleEditorMessage(e: MessageEvent) {
      if (e.data?.type !== 'aurion_edit' || !e.data.html) return;
      pendingEditHtmlRef.current = e.data.html as string;
    }
    if (isEditMode) {
      window.addEventListener('message', handleEditorMessage);
      return () => window.removeEventListener('message', handleEditorMessage);
    }
  }, [isEditMode, pendingEditHtmlRef]);

  // Listen for runtime errors + console output from the iframe
  useEffect(() => {
    function handleIframeMessage(e: MessageEvent) {
      if (e.data?.type === 'aurion_console') {
        const { level, text } = e.data as { level: string; text: string };
        const prefix = level === 'warn' ? '⚠ ' : level === 'info' ? 'ℹ ' : '';
        setTerminalLines(prev => [...prev.slice(-200), `${prefix}${text}`]);
        return;
      }
      if (e.data?.type === 'aurion_console' && e.data.text) {
        setConsoleLogs(prev => [...prev.slice(-99), { type: e.data.level || 'log', message: String(e.data.text).slice(0, 500), ts: Date.now() }]);
        return;
      }
      if (e.data?.type !== 'aurion_error' || !e.data.error) return;
      const err = e.data.error as { message: string; source?: string; line?: number; col?: number };
      if (/ResizeObserver|Script error\.|chrome-extension|moz-extension/i.test(err.message)) return;
      const entry = { ...err, timestamp: Date.now() };
      setRuntimeErrors(prev => {
        if (prev.some(p => p.message === err.message && entry.timestamp - p.timestamp < 3000)) return prev;
        return [...prev, entry].slice(-20);
      });
      setTerminalLines(prev => [...prev, `✗ Runtime Error: ${err.message}${err.line ? ` (line ${err.line})` : ''}`]);
      panelActions.setPanel('showTerminal', true);
    }
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [setTerminalLines, setConsoleLogs, setRuntimeErrors, panelActions]);

  // Auto-fix runtime errors
  useEffect(() => {
    if (!autoFixEnabled || runtimeErrors.length === 0 || isStreaming || autoFixInFlightRef.current) return;
    const latestError = runtimeErrors[runtimeErrors.length - 1];
    if (Date.now() - latestError.timestamp > 5000) return;
    autoFixInFlightRef.current = true;
    const currentHtml = rawPreviewHtml || '';
    const codeSnippet = currentHtml.length > 12000 ? currentHtml.slice(0, 6000) + '\n... (truncated) ...\n' + currentHtml.slice(-6000) : currentHtml;
    const fixPrompt = `🔧 AUTO-FIX: Runtime error detected in the preview:\n\nError: ${latestError.message}${latestError.line ? `\nLine: ${latestError.line}` : ''}${latestError.source ? `\nSource: ${latestError.source}` : ''}\n\nCurrent code:\n\`\`\`html\n${codeSnippet}\n\`\`\`\n\nFix this error. Return the COMPLETE corrected HTML. Do not explain, just fix the code.`;
    sendToAI(fixPrompt);
    setTimeout(() => { autoFixInFlightRef.current = false; }, 10000);
  }, [runtimeErrors, autoFixEnabled, isStreaming, rawPreviewHtml, sendToAI]);

  // Listen for Select & Prompt
  useEffect(() => {
    function handleSelectPrompt(e: MessageEvent) {
      if (e.data?.type !== 'aurion_select_prompt' || !e.data.element) return;
      const el = e.data.element as { outerHtml: string; cssPath: string; tagName: string; rect: { top: number; left: number; width: number; height: number } };
      setSelectPromptData(el);
      setSelectPromptInput('');
      setTimeout(() => selectPromptRef.current?.focus(), 100);
    }
    window.addEventListener('message', handleSelectPrompt);
    return () => window.removeEventListener('message', handleSelectPrompt);
  }, [setSelectPromptData, setSelectPromptInput, selectPromptRef]);

  // Commit pending edits when exiting edit mode
  useEffect(() => {
    if (!isEditMode && pendingEditHtmlRef.current) {
      const html = pendingEditHtmlRef.current;
      pendingEditHtmlRef.current = null;
      if (projectFiles['index.html']) {
        setProjectFiles(prev => ({ ...prev, 'index.html': { content: html, language: 'html' } }));
      } else {
        setClonedHtml(html);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const fixRuntimeError = useCallback((err: { message: string; source?: string; line?: number }) => {
    if (isStreaming) return;
    const currentHtml = rawPreviewHtml || '';
    const codeSnippet = currentHtml.length > 12000 ? currentHtml.slice(0, 6000) + '\n... (truncated) ...\n' + currentHtml.slice(-6000) : currentHtml;
    const fixPrompt = `Fix this runtime error in my preview:\n\nError: ${err.message}${err.line ? `\nLine: ${err.line}` : ''}${err.source ? `\nSource: ${err.source}` : ''}\n\nCurrent code:\n\`\`\`html\n${codeSnippet}\n\`\`\`\n\nReturn the COMPLETE corrected HTML with the fix applied.`;
    sendToAI(fixPrompt);
  }, [isStreaming, rawPreviewHtml, sendToAI]);

  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const src = iframe.srcdoc;
      iframe.srcdoc = '';
      requestAnimationFrame(() => { iframe.srcdoc = src; });
    }
  }, [iframeRef]);

  const copyPreviewHtml = useCallback(() => {
    if (previewHtml) {
      navigator.clipboard.writeText(previewHtml).then(() => {
        setTerminalLines(prev => [...prev, 'ℹ Preview HTML copied to clipboard']);
        showToast('HTML copied to clipboard', 'success');
      });
    }
  }, [previewHtml, setTerminalLines, showToast]);

  const openPreviewNewTab = useCallback(() => {
    if (previewHtml) {
      const blob = new Blob([previewHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }, [previewHtml]);

  const capturePreviewScreenshot = useCallback(async () => {
    if (!iframeRef.current) return;
    try {
      const iframe = iframeRef.current;
      const canvas = document.createElement('canvas');
      const rect = iframe.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(2, 2);
      const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${iframe.srcdoc || '<p>No preview</p>'}</div></foreignObject></svg>`;
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => {
          if (!b) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = `aurion-preview-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const htmlBlob = new Blob([iframe.srcdoc || ''], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        window.open(htmlUrl, '_blank');
      };
      img.src = url;
    } catch {
      if (iframeRef.current?.srcdoc) {
        const htmlBlob = new Blob([iframeRef.current.srcdoc], { type: 'text/html' });
        window.open(URL.createObjectURL(htmlBlob), '_blank');
      }
    }
  }, [iframeRef]);

  return {
    fixRuntimeError, refreshPreview, copyPreviewHtml, openPreviewNewTab,
    capturePreviewScreenshot,
  };
}
