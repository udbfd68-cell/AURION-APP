'use client';
import { useCallback, useState, useRef, useEffect } from 'react';
import { fetchWithRetry } from '@/lib/client-utils';
import type { VirtualFS } from '@/lib/client-utils';

export interface UseCloneOptions {
  model: string;
  setActiveTab: (tab: 'app' | 'code' | 'database' | 'payments' | 'ide') => void;
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
  setError: (err: string | null) => void;
}

export function useClone(options: UseCloneOptions) {
  const { model, setActiveTab, setTerminalLines, setError } = options;

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneProgress, setCloneProgress] = useState('');
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [clonedHtml, setClonedHtml] = useState<string | null>(null);
  const cloneAbortRef = useRef<AbortController | null>(null);

  // Clone refinement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastScrapeDataRef = useRef<any>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');

  const streamClone = async (
    url: string, html: string,
    tokens: { colors: string[]; fonts: string[]; cssVariables?: Record<string, string>; gradients?: string[]; shadows?: string[]; borderRadii?: string[]; mediaQueries?: string[]; keyframes?: string[] },
    screenshot: string | null, signal: AbortSignal, pageName?: string, rawHtml?: string,
    branding?: unknown, navigation?: unknown[], images?: unknown[], videos?: unknown[],
    styleBlocks?: string, linkedResources?: unknown, screenshots?: string[],
    currentHtml?: string, feedback?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extraData?: any,
  ): Promise<string> => {
    const res = await fetch('/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, html, rawHtml, tokens, branding, screenshot, screenshots, pageName, navigation, images, videos, styleBlocks, linkedResources, model, currentHtml, feedback, ...(extraData || {}) }),
      signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Clone request failed' }));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('No response stream');

    let result = '';
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
          const clean = data.error.replace(/\[GoogleGenerativeAI Error\]:?\s*/gi, '').replace(/Error fetching from https:\/\/[^\s]+/gi, '').replace(/\[{"@type"[\s\S]*/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 150) || 'Clone failed. Please try again.';
          throw new Error(clean);
        }
        if (data.model) setCloneProgress(`Cloning with ${data.model}...`);
        if (data.text) { result += data.text; }
      }
    }

    // Clean and post-process the result
    let cleaned = result.trim();
    const fileMatch = cleaned.match(/<file\s+path="[^"]+"\s*>([\s\S]*?)<\/file>/i);
    if (fileMatch) cleaned = fileMatch[1].trim();
    cleaned = cleaned.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
    const doctypeMatch = cleaned.match(/(<!DOCTYPE\s+html[^>]*>[\s\S]*<\/html>)/i);
    if (doctypeMatch) cleaned = doctypeMatch[1];
    else { const htmlMatch = cleaned.match(/(<html[\s\S]*<\/html>)/i); if (htmlMatch) cleaned = htmlMatch[1]; }
    cleaned = cleaned.replace(/<link[^>]*rel=["'](?:manifest|preconnect|dns-prefetch|preload|prefetch|modulepreload)[^>]*>/gi, '');
    cleaned = cleaned.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
    cleaned = cleaned.replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, '');
    const secondDoctype = cleaned.indexOf('<!DOCTYPE', 10);
    if (secondDoctype > 0) {
      cleaned = cleaned.slice(0, secondDoctype).trim();
      if (!cleaned.includes('</html>')) cleaned += '\n</html>';
      if (!cleaned.includes('</body>')) cleaned = cleaned.replace('</html>', '</body>\n</html>');
    }
    if (url && cleaned.includes('<head')) {
      try {
        const origin = new URL(url).origin;
        if (!cleaned.includes('<base ')) {
          cleaned = cleaned.replace(/<head([^>]*)>/, `<head$1>\n<base href="${origin}/" target="_self">`);
        }
      } catch { /* invalid url */ }
    }
    if (/\bfa-[a-z]/.test(cleaned) && !cleaned.includes('font-awesome') && !cleaned.includes('fontawesome')) {
      cleaned = cleaned.replace('</head>', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">\n</head>');
    }
    if (!/<\/body>/i.test(cleaned) && /<body/i.test(cleaned)) cleaned += '\n</body>';
    if (!/<\/html>/i.test(cleaned) && /<html/i.test(cleaned)) cleaned += '\n</html>';
    return cleaned;
  };

  const cloneWebsite = useCallback(async (urlOverride?: string) => {
    const url = (urlOverride || cloneUrl).trim();
    if (!url || isCloning) return;

    setIsCloning(true);
    setCloneProgress('Scraping website...');
    setCloneError(null);
    setShowCloneModal(false);
    setActiveTab('app');

    const controller = new AbortController();
    cloneAbortRef.current = controller;

    try {
      const scrapeRes = await fetchWithRetry('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
        timeout: 45000,
      }, 1);

      if (!scrapeRes.ok) {
        const err = await scrapeRes.json().catch(() => ({ error: 'Scrape failed' }));
        throw new Error(err.error || `Scrape HTTP ${scrapeRes.status}`);
      }

      const scrapeData = await scrapeRes.json();
      lastScrapeDataRef.current = scrapeData;

      setCloneProgress('Cloning main page with AI...');
      let mainHtml = '';
      let cloneErrorMsg = '';
      try {
        mainHtml = await streamClone(
          url, scrapeData.html, scrapeData.tokens, scrapeData.screenshot, controller.signal,
          undefined, scrapeData.rawHtml, scrapeData.branding, scrapeData.navigation,
          scrapeData.images, scrapeData.videos, scrapeData.styleBlocks, scrapeData.linkedResources,
          scrapeData.screenshots, undefined, undefined,
          { cssFramework: scrapeData.cssFramework, iconLibraries: scrapeData.iconLibraries, animationLibraries: scrapeData.animationLibraries, colorFrequency: scrapeData.colorFrequency, interactionModels: scrapeData.interactionModels, layeredAssets: scrapeData.layeredAssets, multiStateContent: scrapeData.multiStateContent, scrollBehaviors: scrapeData.scrollBehaviors, computedPatterns: scrapeData.computedPatterns, zIndexLayers: scrapeData.zIndexLayers, pageTopology: scrapeData.pageTopology, fontStack: scrapeData.fontStack, hoverTransitions: scrapeData.hoverTransitions, responsiveBreakpoints: scrapeData.responsiveBreakpoints, componentSpecs: scrapeData.componentSpecs, designSystemCard: scrapeData.designSystemCard },
        );
      } catch (cloneErr) {
        cloneErrorMsg = cloneErr instanceof Error ? cloneErr.message : 'Unknown clone error';
      }

      const aiWorked = mainHtml.length > 200 && (/<body/i.test(mainHtml) || /<!DOCTYPE/i.test(mainHtml));

      if (!aiWorked) {
        const safeErr = cloneErrorMsg
          ? cloneErrorMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 200)
          : `AI returned ${mainHtml.length} chars.`;
        mainHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clone Error</title></head><body style="background:#0a0a0a;color:#e0e0e0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0"><div style="text-align:center;max-width:480px;padding:40px"><div style="font-size:48px;margin-bottom:16px">\u26a0\ufe0f</div><h2 style="font-size:22px;font-weight:600;margin:0 0 12px">Clone Failed</h2><p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 16px">${safeErr}</p><p style="color:#666;font-size:13px">Try a different URL, retry, or check API keys.</p></div></body></html>`;
      }

      // Auto-refinement
      if (aiWorked && !controller.signal.aborted) {
        setCloneProgress('Auto-refining for accuracy...');
        try {
          const refined = await streamClone(
            url, scrapeData.html, scrapeData.tokens, scrapeData.screenshot, controller.signal,
            undefined, scrapeData.rawHtml, scrapeData.branding, scrapeData.navigation,
            scrapeData.images, scrapeData.videos, scrapeData.styleBlocks, scrapeData.linkedResources,
            scrapeData.screenshots, mainHtml, 'Self-check: compare your output against the original. Fix any missing sections, wrong colors, broken layouts, missing images, incorrect fonts, or misaligned elements. Make it pixel-perfect.',
            { cssFramework: scrapeData.cssFramework, iconLibraries: scrapeData.iconLibraries, animationLibraries: scrapeData.animationLibraries, colorFrequency: scrapeData.colorFrequency, interactionModels: scrapeData.interactionModels, layeredAssets: scrapeData.layeredAssets, multiStateContent: scrapeData.multiStateContent, scrollBehaviors: scrapeData.scrollBehaviors, computedPatterns: scrapeData.computedPatterns, zIndexLayers: scrapeData.zIndexLayers, pageTopology: scrapeData.pageTopology, fontStack: scrapeData.fontStack, hoverTransitions: scrapeData.hoverTransitions, responsiveBreakpoints: scrapeData.responsiveBreakpoints, componentSpecs: scrapeData.componentSpecs, designSystemCard: scrapeData.designSystemCard },
          );
          const refinedWorked = refined.length > 200 && (/<body/i.test(refined) || /<!DOCTYPE/i.test(refined));
          if (refinedWorked) {
            mainHtml = refined;
            setTerminalLines(prev => [...prev, '$ \u2713 auto-refined clone for accuracy']);
          }
        } catch { /* keep original */ }
      }

      setCloneProgress('Done');
      setClonedHtml(mainHtml);
      setCloneProgress('');
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Clone failed';
      setCloneError(msg);
      setError(msg);
    } finally {
      setIsCloning(false);
      setCloneProgress('');
      cloneAbortRef.current = null;
    }
  }, [cloneUrl, isCloning, model, setActiveTab, setTerminalLines, setError]);

  const stopClone = useCallback(() => {
    cloneAbortRef.current?.abort();
    setIsCloning(false);
    setIsRefining(false);
    setCloneProgress('');
  }, []);

  const refineClone = useCallback(async () => {
    const feedbackText = refineFeedback.trim().slice(0, 5000);
    if (!feedbackText || !clonedHtml || !lastScrapeDataRef.current || isRefining) return;

    setIsRefining(true);
    setCloneProgress('Refining clone...');
    setCloneError(null);

    const controller = new AbortController();
    cloneAbortRef.current = controller;
    const scrapeData = lastScrapeDataRef.current;

    try {
      const refined = await streamClone(
        cloneUrl, scrapeData.html, scrapeData.tokens, scrapeData.screenshot, controller.signal,
        undefined, scrapeData.rawHtml, scrapeData.branding, scrapeData.navigation,
        scrapeData.images, scrapeData.videos, scrapeData.styleBlocks, scrapeData.linkedResources,
        scrapeData.screenshots, clonedHtml, feedbackText,
        { cssFramework: scrapeData.cssFramework, iconLibraries: scrapeData.iconLibraries, animationLibraries: scrapeData.animationLibraries, colorFrequency: scrapeData.colorFrequency, interactionModels: scrapeData.interactionModels, layeredAssets: scrapeData.layeredAssets, multiStateContent: scrapeData.multiStateContent, scrollBehaviors: scrapeData.scrollBehaviors, computedPatterns: scrapeData.computedPatterns, zIndexLayers: scrapeData.zIndexLayers, pageTopology: scrapeData.pageTopology, fontStack: scrapeData.fontStack, hoverTransitions: scrapeData.hoverTransitions, responsiveBreakpoints: scrapeData.responsiveBreakpoints, componentSpecs: scrapeData.componentSpecs, designSystemCard: scrapeData.designSystemCard },
      );
      const aiWorked = refined.length > 200 && (/<body/i.test(refined) || /<!DOCTYPE/i.test(refined));
      if (aiWorked) {
        setClonedHtml(refined);
        setRefineFeedback('');
      } else {
        setCloneError('Refinement produced invalid HTML. Try different feedback.');
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setCloneError(err instanceof Error ? err.message : 'Refine failed');
    } finally {
      setIsRefining(false);
      setCloneProgress('');
      cloneAbortRef.current = null;
    }
  }, [refineFeedback, clonedHtml, cloneUrl, isRefining, model]);

  return {
    showCloneModal, setShowCloneModal,
    cloneUrl, setCloneUrl,
    isCloning, cloneProgress, cloneError, setCloneError,
    clonedHtml, setClonedHtml,
    isRefining, refineFeedback, setRefineFeedback,
    cloneWebsite, stopClone, refineClone,
  };
}
