import { useEffect, useCallback, type RefObject } from 'react';

interface UseUIEffectsDeps {
  input: string;
  landingInput: string;
  showModelMenu: boolean;
  view: 'workspace' | 'landing';
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  landingTextareaRef: RefObject<HTMLTextAreaElement | null>;
  chatEndRef: RefObject<HTMLDivElement | null>;
  messages: any[];
  panelActions: { setPanel: (key: string, value: boolean) => void };
  setAttachedImages: (fn: (prev: any[]) => any[]) => void;
  setView: (v: 'workspace' | 'landing') => void;
}

export function useUIEffects(deps: UseUIEffectsDeps) {
  const {
    input, landingInput, showModelMenu, view,
    textareaRef, landingTextareaRef, chatEndRef, messages,
    panelActions, setAttachedImages, setView,
  } = deps;

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  // Close model menu on click outside
  useEffect(() => {
    if (!showModelMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-model-menu]')) {
        panelActions.setPanel('showModelMenu', false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelMenu]);

  // Auto-resize landing textarea
  useEffect(() => {
    const ta = landingTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [landingInput]);

  // Clipboard paste → auto-attach screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) continue;
        e.preventDefault();
        const file = item.getAsFile();
        if (!file || file.size > 10 * 1024 * 1024) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const data = reader.result as string;
          setAttachedImages(prev => [...prev, { name: `screenshot-${Date.now()}.png`, data, type: file.type }]);
          if (view === 'landing') setView('workspace');
        };
        reader.readAsDataURL(file);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [view]);

  return { scrollToBottom };
}
