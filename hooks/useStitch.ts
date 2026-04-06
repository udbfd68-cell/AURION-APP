'use client';
import { useCallback, useState } from 'react';
import { fetchWithRetry } from '@/lib/client-utils';
import type { VirtualFS } from '@/lib/client-utils';

export interface UseStitchOptions {
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function useStitch(options: UseStitchOptions) {
  const { setProjectFiles, showToast } = options;

  const [showStitchPanel, setShowStitchPanel] = useState(false);
  const [stitchProjectId, setStitchProjectId] = useState('');
  const [stitchScreens, setStitchScreens] = useState<{ page: string; screenId: string; htmlUrl: string; imageUrl: string; html?: string }[]>([]);
  const [stitchLoading, setStitchLoading] = useState(false);
  const [stitchError, setStitchError] = useState<string | null>(null);
  const [stitchPrompt, setStitchPrompt] = useState('');
  const [stitchDesignSystem, setStitchDesignSystem] = useState('');
  const [stitchPages, setStitchPages] = useState<{ name: string; prompt: string }[]>([{ name: 'Home', prompt: '' }]);
  const [stitchMode, setStitchMode] = useState<'single' | 'loop'>('single');

  const stitchCall = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    setStitchError(null);
    setStitchLoading(true);
    try {
      const res = await fetchWithRetry('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Stitch error: ${res.status}`);
      return json;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stitch request failed';
      setStitchError(msg);
      throw err;
    } finally {
      setStitchLoading(false);
    }
  }, []);

  const stitchGenerate = useCallback(async () => {
    if (!stitchPrompt.trim()) return;
    try {
      const enhancedRes = await stitchCall('enhance_prompt', {
        prompt: stitchPrompt,
        designSystem: stitchDesignSystem || undefined,
      });
      let projId = stitchProjectId;
      if (!projId) {
        const projRes = await stitchCall('create_project', { title: 'Aurion - ' + stitchPrompt.slice(0, 30) });
        projId = projRes.projectId;
        setStitchProjectId(projId);
      }
      const result = await stitchCall('generate_screen', {
        projectId: projId,
        prompt: enhancedRes.enhanced,
        deviceType: 'DESKTOP',
      });
      const htmlRes = await fetch(result.htmlUrl);
      const html = await htmlRes.text();
      setStitchScreens(prev => [...prev, {
        page: stitchPrompt.slice(0, 30),
        screenId: result.screenId,
        htmlUrl: result.htmlUrl,
        imageUrl: result.imageUrl,
        html,
      }]);
      setProjectFiles(prev => ({
        ...prev,
        ['stitch-' + (stitchScreens.length + 1) + '.html']: { content: html, language: 'html' },
      }));
      showToast('Stitch screen generated!', 'success');
    } catch { /* error already set */ }
  }, [stitchPrompt, stitchDesignSystem, stitchProjectId, stitchCall, stitchScreens.length, showToast, setProjectFiles]);

  const stitchRunLoop = useCallback(async () => {
    const validPages = stitchPages.filter(p => p.name.trim() && p.prompt.trim());
    if (validPages.length === 0) return;
    try {
      const result = await stitchCall('stitch_loop', {
        projectId: stitchProjectId || undefined,
        title: 'Aurion Loop Project',
        pages: validPages,
        designSystem: stitchDesignSystem || undefined,
      });
      if (!stitchProjectId && result.projectId) setStitchProjectId(result.projectId);
      setStitchScreens(result.pages);
      const newFiles: Record<string, { content: string; language: string }> = {};
      for (const page of result.pages) {
        if (page.html) {
          newFiles[page.page.toLowerCase().replace(/\s+/g, '-') + '.html'] = { content: page.html, language: 'html' };
        }
      }
      setProjectFiles(prev => ({ ...prev, ...newFiles }));
      showToast(`Stitch loop: ${result.pages.length} pages generated!`, 'success');
    } catch { /* error already set */ }
  }, [stitchPages, stitchProjectId, stitchDesignSystem, stitchCall, showToast, setProjectFiles]);

  return {
    showStitchPanel, setShowStitchPanel,
    stitchProjectId, setStitchProjectId, stitchScreens, setStitchScreens,
    stitchLoading, stitchError, setStitchError,
    stitchPrompt, setStitchPrompt,
    stitchDesignSystem, setStitchDesignSystem,
    stitchPages, setStitchPages,
    stitchMode, setStitchMode,
    stitchGenerate, stitchRunLoop,
  };
}
