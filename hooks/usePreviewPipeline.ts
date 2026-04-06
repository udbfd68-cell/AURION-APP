import { useState, useEffect, useRef, useMemo } from 'react';
import { extractPreviewHtml, extractAllCodeBlocks } from '@/lib/page-helpers';
import { assemblePreview } from '@/lib/cdn-models';
import { buildPreviewHtml } from '@/lib/preview-builder';
import type { Message, VirtualFS } from '@/lib/types';

interface UsePreviewPipelineDeps {
  messages: Message[];
  clonedHtml: string | null;
  projectFiles: VirtualFS;
  isStreaming: boolean;
  isEditMode: boolean;
  layoutDebugActive: boolean;
  previewDarkMode: string;
  gridFlexDebugActive: boolean;
  setProjectFiles: (fn: (prev: VirtualFS) => VirtualFS) => void;
  setRuntimeErrors: (errors: any[]) => void;
  setPreviewLoading: (b: boolean) => void;
}

export function usePreviewPipeline(deps: UsePreviewPipelineDeps) {
  const {
    messages, clonedHtml, projectFiles, isStreaming,
    isEditMode, layoutDebugActive, previewDarkMode, gridFlexDebugActive,
    setProjectFiles, setRuntimeErrors, setPreviewLoading,
  } = deps;

  // Bridge: when clonedHtml changes, push to VFS
  useEffect(() => {
    if (clonedHtml) {
      setProjectFiles(prev => ({ ...prev, 'index.html': { content: clonedHtml, language: 'html' } }));
    }
  }, [clonedHtml]);

  // Bridge: extract HTML from messages and push to VFS
  useEffect(() => {
    if (!clonedHtml) {
      const html = extractPreviewHtml(messages);
      if (html) {
        setProjectFiles(prev => ({ ...prev, 'index.html': { content: html, language: 'html' } }));
      }
    }
  }, [messages, clonedHtml]);

  // Extract preview HTML — debounced during streaming for performance
  const [rawPreviewHtml, setRawPreviewHtml] = useState<string | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const compute = () => {
      if (Object.keys(projectFiles).length > 0) {
        const assembled = assemblePreview(projectFiles);
        if (assembled) { setRawPreviewHtml(assembled); return; }
      }
      setRawPreviewHtml(clonedHtml ?? extractPreviewHtml(messages));
    };
    if (isStreaming) {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = setTimeout(compute, 300);
    } else {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      compute();
    }
    return () => { if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current); };
  }, [projectFiles, messages, clonedHtml, isStreaming]);

  // Clear runtime errors when preview changes
  const prevPreviewRef = useRef<string | null>(null);
  useEffect(() => {
    if (rawPreviewHtml && prevPreviewRef.current && rawPreviewHtml !== prevPreviewRef.current) {
      setRuntimeErrors([]);
      setPreviewLoading(true);
    }
    prevPreviewRef.current = rawPreviewHtml;
  }, [rawPreviewHtml]);

  // Inject link-intercept script + visual editor script
  const previewHtml = useMemo(() => {
    if (!rawPreviewHtml) return null;
    return buildPreviewHtml({ rawHtml: rawPreviewHtml, isEditMode, layoutDebugActive, previewDarkMode, gridFlexDebugActive });
  }, [rawPreviewHtml, isEditMode, layoutDebugActive, previewDarkMode, gridFlexDebugActive]);

  const codeBlocks = useMemo(() => extractAllCodeBlocks(messages), [messages]);

  return { rawPreviewHtml, previewHtml, codeBlocks };
}
