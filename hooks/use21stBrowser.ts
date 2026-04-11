'use client';

import { useCallback, useRef, useState } from 'react';

export type Component21st = {
  id: string;
  name: string;
  description: string;
  slug?: string;
  username?: string;
  code?: string;
  demoCode?: string;
  preview_url?: string;
  demo_url?: string;
  tags?: string[];
  similarity?: number;
  npmDependencies?: Record<string, string>;
};

interface Use21stBrowserDeps {
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  previewHtml: string | null;
  sendToAI: (prompt: string) => void;
  panelActions: { setPanel: (key: string, value: boolean) => void };
}

export function use21stBrowser(deps: Use21stBrowserDeps) {
  const { setTerminalLines, previewHtml, sendToAI, panelActions } = deps;

  const [browser21stQuery, setBrowser21stQuery] = useState('');
  const [browser21stResults, setBrowser21stResults] = useState<Component21st[]>([]);
  const [browser21stLoading, setBrowser21stLoading] = useState(false);
  const [injecting21stComponent, setInjecting21stComponent] = useState<string | null>(null);
  const browser21stInputRef = useRef<HTMLInputElement>(null);

  const search21stComponents = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setBrowser21stLoading(true);
    setBrowser21stResults([]);
    try {
      const res = await fetch('/api/magic21st', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, action: 'search' }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        const details = data?.details ? ` — ${String(data.details).slice(0, 180)}` : '';
        setTerminalLines(prev => [...prev, `$ ✗ 21st.dev search failed: ${data?.error || `HTTP ${res.status}`}${details}`]);
        return;
      }
      const results: Component21st[] = Array.isArray(data) ? data
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.results) ? data.results
        : [];
      setBrowser21stResults(results);
      if (results.length === 0) {
        setTerminalLines(prev => [...prev, `$ ℹ 21st.dev: no components found for "${q}"`]);
      }
    } catch (e) {
      setTerminalLines(prev => [...prev, `$ ✗ 21st.dev search error: ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setBrowser21stLoading(false);
    }
  }, [setTerminalLines]);

  const inject21stComponent = useCallback(async (component: Component21st) => {
    if (previewHtml === null) {
      setTerminalLines(prev => [...prev, '$ ✗ Create a page first before injecting a component.']);
      return;
    }
    setInjecting21stComponent(component.name);
    panelActions.setPanel('show21stBrowser', false);

    const codeSnippet = component.code
      ? `\`\`\`tsx\n${component.code.slice(0, 8000)}\n\`\`\``
      : '(source not available — use the name and description as inspiration)';

    const prompt = `I want to add a "${component.name}" component from 21st.dev to my current page.

Component description: ${component.description || ''}
${component.tags?.length ? `Tags: ${component.tags.join(', ')}` : ''}

Reference implementation (React/Tailwind):
${codeSnippet}

Task: Convert this component to pure HTML with Tailwind CDN classes (no JSX, no imports, no React). Then integrate it naturally into my existing page at the most appropriate location (e.g. after the hero, before the footer, or as a new section). Return the complete updated HTML page.`;

    sendToAI(prompt);
    setInjecting21stComponent(null);
  }, [previewHtml, sendToAI, setTerminalLines, panelActions]);

  return {
    browser21stQuery, setBrowser21stQuery,
    browser21stResults, setBrowser21stResults,
    browser21stLoading, setBrowser21stLoading,
    injecting21stComponent, setInjecting21stComponent,
    browser21stInputRef,
    search21stComponents, inject21stComponent,
  };
}
