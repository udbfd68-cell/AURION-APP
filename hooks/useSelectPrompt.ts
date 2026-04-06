'use client';

import { useCallback, useRef, useState } from 'react';
import { fetchWithRetry } from '@/lib/client-utils';

interface SelectPromptData {
  outerHtml: string;
  cssPath: string;
  tagName: string;
  rect: { top: number; left: number; width: number; height: number };
}

interface UseSelectPromptDeps {
  model: string;
  rawPreviewHtml: string;
  projectFiles: Record<string, { content: string; language: string }>;
  setProjectFiles: React.Dispatch<React.SetStateAction<Record<string, { content: string; language: string }>>>;
  setClonedHtml: (html: string | null) => void;
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  getOptimalModel: (model: string, instruction: string, isLong: boolean) => string;
}

export function useSelectPrompt(deps: UseSelectPromptDeps) {
  const { model, rawPreviewHtml, projectFiles, setProjectFiles, setClonedHtml, setTerminalLines, getOptimalModel } = deps;

  const [selectPromptData, setSelectPromptData] = useState<SelectPromptData | null>(null);
  const [selectPromptInput, setSelectPromptInput] = useState('');
  const [selectPromptLoading, setSelectPromptLoading] = useState(false);
  const selectPromptRef = useRef<HTMLInputElement>(null);

  const submitSelectPrompt = useCallback(async () => {
    if (!selectPromptData || !selectPromptInput.trim() || selectPromptLoading) return;
    setSelectPromptLoading(true);
    const instruction = selectPromptInput.trim();
    const elementHtml = selectPromptData.outerHtml;

    try {
      const optimalModel = getOptimalModel(model, instruction, false);
      const endpoint = '/api/claude-code';
      const userMsg = `You are a surgical HTML editor. The user selected a specific element in their page and wants you to modify ONLY that element. Return ONLY the modified element's HTML — no explanation, no markdown, no code fences, no surrounding HTML. Just the raw modified element HTML that will replace the original.\n\nModify this HTML element:\n\n\`\`\`html\n${elementHtml}\n\`\`\`\n\nInstruction: ${instruction}\n\nReturn ONLY the modified element HTML. Nothing else.`;

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'jarvis-execute',
          prompt: userMsg,
          model: optimalModel,
        }),
        timeout: 60000,
      }, 2);

      if (!res.ok) throw new Error('AI request failed');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader');

      let newElementHtml = '';
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
            if (d.text) newElementHtml += d.text;
          } catch { continue; }
        }
      }

      newElementHtml = newElementHtml.trim()
        .replace(/^```(?:html)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

      if (!newElementHtml || newElementHtml.length < 5) throw new Error('Empty AI response');

      const currentHtml = rawPreviewHtml || '';
      const idx = currentHtml.indexOf(elementHtml);
      if (idx !== -1) {
        const updated = currentHtml.slice(0, idx) + newElementHtml + currentHtml.slice(idx + elementHtml.length);
        if (projectFiles['index.html']) {
          setProjectFiles(prev => ({ ...prev, 'index.html': { content: updated, language: 'html' } }));
        } else {
          setClonedHtml(updated);
        }
        setTerminalLines(prev => [...prev, `$ ✓ AI modified <${selectPromptData.tagName.toLowerCase()}> — "${instruction.slice(0, 50)}"`]);
      } else {
        setTerminalLines(prev => [...prev, `$ ✗ Element not found for replacement — try modifying via chat`]);
      }

      setSelectPromptData(null);
      setSelectPromptInput('');
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ ✗ Select & Prompt failed: ${err instanceof Error ? err.message : 'unknown'}`]);
    } finally {
      setSelectPromptLoading(false);
    }
  }, [selectPromptData, selectPromptInput, selectPromptLoading, model, rawPreviewHtml, projectFiles, setProjectFiles, setClonedHtml, setTerminalLines, getOptimalModel]);

  return {
    selectPromptData, setSelectPromptData,
    selectPromptInput, setSelectPromptInput,
    selectPromptLoading, setSelectPromptLoading,
    selectPromptRef,
    submitSelectPrompt,
  };
}
