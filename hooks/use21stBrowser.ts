'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  show21stBrowser: boolean;
}

// All categories to query in parallel for full catalog browsing
const BROWSE_CATEGORIES = [
  'hero section landing page',
  'pricing card table',
  'navigation bar header',
  'footer section',
  'card grid layout',
  'CTA call to action button',
  'testimonials reviews',
  'feature grid section',
  'modal dialog popup',
  'form input contact',
  'sidebar menu',
  'dashboard analytics',
  'login signup auth',
  'profile avatar card',
  'notification toast alert',
  'accordion FAQ collapse',
  'tabs panel',
  'carousel slider',
  'timeline steps progress',
  'badge tag chip',
  'dropdown select menu',
  'breadcrumb pagination',
  'file upload drag drop',
  'date picker calendar',
  'animated gradient background',
  'skeleton loading placeholder',
  'dark mode toggle switch',
  'search command palette',
  'table data grid list',
  'stat counter number',
  'marquee scroll text',
];

async function fetchCategory(query: string): Promise<Component21st[]> {
  try {
    const res = await fetch('/api/magic21st', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, action: 'search' }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const arr: Component21st[] = Array.isArray(data) ? data
      : Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.results) ? data.results
      : [];
    return arr;
  } catch {
    return [];
  }
}

function dedupeComponents(components: Component21st[]): Component21st[] {
  const seen = new Set<string>();
  return components.filter(c => {
    const key = c.name?.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function use21stBrowser(deps: Use21stBrowserDeps) {
  const { setTerminalLines, previewHtml, sendToAI, panelActions, show21stBrowser } = deps;

  const [browser21stQuery, setBrowser21stQuery] = useState('');
  const [browser21stResults, setBrowser21stResults] = useState<Component21st[]>([]);
  const [browser21stLoading, setBrowser21stLoading] = useState(false);
  const [injecting21stComponent, setInjecting21stComponent] = useState<string | null>(null);
  const browser21stInputRef = useRef<HTMLInputElement>(null);
  const hasAutoLoaded = useRef(false);

  // Auto-load ALL categories when browser opens for the first time
  useEffect(() => {
    if (!show21stBrowser || hasAutoLoaded.current || browser21stResults.length > 0) return;
    hasAutoLoaded.current = true;
    browseAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show21stBrowser]);

  const browseAll = useCallback(async () => {
    setBrowser21stLoading(true);
    setBrowser21stResults([]);
    setTerminalLines(prev => [...prev, `$ 21st.dev: loading ${BROWSE_CATEGORIES.length} categories…`]);

    // Fire all searches in parallel batches of 6 to avoid overwhelming
    const batchSize = 6;
    const allResults: Component21st[] = [];

    for (let i = 0; i < BROWSE_CATEGORIES.length; i += batchSize) {
      const batch = BROWSE_CATEGORIES.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(q => fetchCategory(q)));
      for (const results of batchResults) {
        allResults.push(...results);
      }
      // Update results progressively as batches complete
      const deduped = dedupeComponents(allResults);
      setBrowser21stResults([...deduped]);
    }

    const final = dedupeComponents(allResults);
    setBrowser21stResults(final);
    setBrowser21stLoading(false);
    setTerminalLines(prev => [...prev, `$ ✓ 21st.dev: loaded ${final.length} unique components`]);
  }, [setTerminalLines]);

  const search21stComponents = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setBrowser21stLoading(true);
    setBrowser21stResults([]);

    // Fire multiple related queries in parallel for more results
    const queries = [q];
    const words = q.trim().split(/\s+/);
    if (words.length >= 2) {
      queries.push(words[0]); // search first word alone
    }
    // Add related variations
    const variations: Record<string, string[]> = {
      pricing: ['pricing card', 'pricing table', 'pricing section', 'pricing tiers', 'subscription plans'],
      hero: ['hero section', 'hero banner', 'landing page hero', 'hero with image', 'hero gradient'],
      nav: ['navigation bar', 'header navbar', 'sidebar navigation', 'mobile menu'],
      card: ['card grid', 'card component', 'product card', 'profile card', 'feature card'],
      button: ['CTA button', 'button group', 'animated button', 'gradient button'],
      form: ['contact form', 'login form', 'signup form', 'input field', 'textarea'],
      footer: ['footer section', 'footer links', 'footer with newsletter'],
      modal: ['modal dialog', 'popup overlay', 'drawer sidebar'],
      table: ['data table', 'table grid', 'sortable table'],
      testimonial: ['testimonials', 'reviews section', 'customer quotes'],
    };
    for (const [key, vals] of Object.entries(variations)) {
      if (q.toLowerCase().includes(key)) {
        queries.push(...vals.filter(v => v !== q));
        break;
      }
    }

    try {
      const allResults = await Promise.all(queries.slice(0, 8).map(query => fetchCategory(query)));
      const merged: Component21st[] = [];
      for (const results of allResults) merged.push(...results);
      const final = dedupeComponents(merged);
      setBrowser21stResults(final);
      if (final.length === 0) {
        setTerminalLines(prev => [...prev, `$ ℹ 21st.dev: no components found for "${q}"`]);
      } else {
        setTerminalLines(prev => [...prev, `$ ✓ 21st.dev: found ${final.length} components for "${q}"`]);
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
