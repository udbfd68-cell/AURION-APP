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

// Exhaustive component categories — each fires one API call returning ~3 components
const BROWSE_CATEGORIES = [
  // Heroes
  'hero section', 'hero banner gradient', 'hero with image', 'hero animated text', 'hero dark landing',
  'hero dithering card', 'hero minimal clean', 'hero with video background', 'hero split layout',
  // Pricing
  'pricing card', 'pricing table comparison', 'pricing toggle monthly yearly', 'pricing section gradient',
  // Navigation
  'navigation bar', 'header navbar responsive', 'sidebar navigation', 'mobile hamburger menu',
  'breadcrumb navigation', 'bottom tab bar mobile',
  // Cards
  'card grid', 'product card ecommerce', 'profile card avatar', 'feature card icon',
  'blog post card', 'stats card dashboard', 'image gallery card', 'team member card',
  // Buttons & CTAs
  'CTA button animated', 'button group variant', 'gradient button glow', 'floating action button',
  'magnetic button hover', 'shimmer button effect',
  // Forms & Inputs
  'contact form', 'login form', 'signup form registration', 'input field animated label',
  'search bar command palette', 'textarea rich editor', 'file upload drag drop',
  'OTP input verification code', 'password strength input', 'multi step form wizard',
  // Footer
  'footer section links', 'footer newsletter signup', 'footer minimal dark',
  // Modals & Overlays
  'modal dialog popup', 'drawer sidebar sheet', 'alert dialog confirm', 'command palette',
  'popover dropdown menu', 'tooltip hover info',
  // Layout
  'bento grid layout', 'masonry grid gallery', 'split screen layout', 'dock taskbar',
  'kanban board columns', 'infinite scroll feed',
  // Data Display
  'data table sortable', 'chart bar graph', 'stat counter animated', 'progress bar steps',
  'timeline vertical horizontal', 'tree view hierarchy',
  // Testimonials & Social
  'testimonials carousel', 'reviews star rating', 'social proof logos', 'avatar group stack',
  'marquee scroll infinite', 'tweet embed card',
  // Feedback
  'notification toast', 'alert banner warning', 'skeleton loading placeholder', 'empty state illustration',
  'error page 404', 'success confetti animation',
  // Interactive
  'accordion FAQ', 'tabs panel', 'carousel slider', 'date picker calendar',
  'color picker palette', 'slider range input', 'toggle switch dark mode',
  'dropdown select combobox', 'tag input multi select',
  // Animation & Effects
  'animated gradient background', 'text reveal animation', 'parallax scroll effect',
  'cursor follower effect', 'particles background', 'blur fade transition',
  'globe 3d animated', 'typewriter text effect', 'count up number animation',
  'liquid gradient mesh', 'aurora northern lights', 'spotlight hover card',
  // Special
  'badge chip label', 'divider separator ornament', 'scroll area custom scrollbar',
  'aspect ratio media container', 'clipboard copy button', 'dark theme component',
  'comparison before after', 'video player controls', 'audio player waveform',
  'code block syntax highlight', 'terminal console output',
  'payment checkout stripe', 'cookie consent banner', 'onboarding walkthrough',
  'changelog release notes', 'waitlist early access',
];

async function fetchCategory(query: string, signal?: AbortSignal): Promise<Component21st[]> {
  try {
    const res = await fetch('/api/magic21st', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, action: 'search' }),
      signal,
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
  const [preview21stComponent, setPreview21stComponent] = useState<Component21st | null>(null);
  const browser21stInputRef = useRef<HTMLInputElement>(null);
  const hasAutoLoaded = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-load ALL categories when browser opens for the first time
  useEffect(() => {
    if (!show21stBrowser || hasAutoLoaded.current || browser21stResults.length > 0) return;
    hasAutoLoaded.current = true;
    browseAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show21stBrowser]);

  const browseAll = useCallback(async () => {
    // Cancel any in-flight requests
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBrowser21stLoading(true);
    setBrowser21stResults([]);
    setTerminalLines(prev => [...prev, `$ 21st.dev: loading ${BROWSE_CATEGORIES.length} categories…`]);

    const batchSize = 4; // smaller batches = less chance of failures
    const allResults: Component21st[] = [];
    let completed = 0;

    for (let i = 0; i < BROWSE_CATEGORIES.length; i += batchSize) {
      if (controller.signal.aborted) break;
      const batch = BROWSE_CATEGORIES.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(q => fetchCategory(q, controller.signal))
      );
      for (const result of batchResults) {
        if (result.status === 'fulfilled') allResults.push(...result.value);
      }
      completed += batch.length;
      // Progressive update
      const deduped = dedupeComponents(allResults);
      setBrowser21stResults([...deduped]);
    }

    if (!controller.signal.aborted) {
      const final = dedupeComponents(allResults);
      setBrowser21stResults(final);
      setBrowser21stLoading(false);
      setTerminalLines(prev => [...prev, `$ ✓ 21st.dev: loaded ${final.length} unique components from ${BROWSE_CATEGORIES.length} categories`]);
    }
  }, [setTerminalLines]);

  const search21stComponents = useCallback(async (q: string) => {
    if (!q.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBrowser21stLoading(true);
    setBrowser21stResults([]);

    // Always fire multiple related queries
    const queries = new Set<string>([q]);
    const lower = q.toLowerCase();

    // Add word-level variations
    const words = q.trim().split(/\s+/);
    if (words.length >= 2) queries.add(words[0]);
    queries.add(`${q} component`);
    queries.add(`${q} section`);

    // Keyword-specific expansions
    const expansions: Record<string, string[]> = {
      pricing: ['pricing card', 'pricing table', 'pricing section', 'pricing tiers', 'subscription plan'],
      hero: ['hero section', 'hero banner', 'landing page hero', 'hero animated', 'hero gradient dark'],
      nav: ['navigation bar', 'header navbar', 'sidebar navigation', 'mobile menu', 'bottom tab bar'],
      card: ['card grid', 'product card', 'profile card', 'feature card', 'blog card', 'stats card'],
      button: ['CTA button', 'button group', 'animated button', 'gradient button', 'shimmer button'],
      form: ['contact form', 'login form', 'signup form', 'input field animated', 'multi step form'],
      footer: ['footer section', 'footer links', 'footer newsletter'],
      modal: ['modal dialog', 'drawer sidebar', 'popup overlay', 'alert dialog', 'command palette'],
      table: ['data table', 'table grid sortable', 'comparison table'],
      testimonial: ['testimonials carousel', 'reviews section', 'customer quotes', 'social proof'],
      dashboard: ['dashboard layout', 'analytics dashboard', 'stats dashboard', 'admin panel'],
      login: ['login form', 'signup form', 'auth page', 'password reset'],
      animation: ['animated gradient', 'text animation', 'parallax scroll', 'particles', 'typewriter'],
      sidebar: ['sidebar navigation', 'drawer sidebar', 'dock taskbar'],
    };
    for (const [key, vals] of Object.entries(expansions)) {
      if (lower.includes(key)) {
        vals.forEach(v => queries.add(v));
        break;
      }
    }

    try {
      const queryArr = Array.from(queries).slice(0, 10);
      const allResults = await Promise.allSettled(
        queryArr.map(query => fetchCategory(query, controller.signal))
      );
      const merged: Component21st[] = [];
      for (const r of allResults) {
        if (r.status === 'fulfilled') merged.push(...r.value);
      }
      const final = dedupeComponents(merged);
      if (!controller.signal.aborted) {
        setBrowser21stResults(final);
        if (final.length === 0) {
          setTerminalLines(prev => [...prev, `$ ℹ 21st.dev: no components found for "${q}"`]);
        } else {
          setTerminalLines(prev => [...prev, `$ ✓ 21st.dev: found ${final.length} components for "${q}" (${queryArr.length} queries)`]);
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        setTerminalLines(prev => [...prev, `$ ✗ 21st.dev search error: ${e instanceof Error ? e.message : String(e)}`]);
      }
    } finally {
      if (!controller.signal.aborted) setBrowser21stLoading(false);
    }
  }, [setTerminalLines]);

  const inject21stComponent = useCallback(async (component: Component21st) => {
    if (previewHtml === null) {
      setTerminalLines(prev => [...prev, '$ ✗ Create a page first before injecting a component.']);
      return;
    }
    setInjecting21stComponent(component.name);
    setPreview21stComponent(null);
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
    preview21stComponent, setPreview21stComponent,
    browser21stInputRef,
    search21stComponents, inject21stComponent,
  };
}
