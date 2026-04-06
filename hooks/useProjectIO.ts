import { useEffect, useCallback } from 'react';
import { downloadProjectAsZip } from '@/lib/zip-utils';
import { buildShareUrl, decompressProject } from '@/lib/share-utils';
import type { VirtualFS } from '@/lib/types';

interface UseProjectIODeps {
  projectFiles: VirtualFS;
  setProjectFiles: (fn: VirtualFS | ((prev: VirtualFS) => VirtualFS)) => void;
  setSelectedFile: (f: string) => void;
  setView: (v: 'workspace' | 'landing') => void;
  setTerminalLines: (fn: (prev: string[]) => string[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function useProjectIO(deps: UseProjectIODeps) {
  const { projectFiles, setProjectFiles, setSelectedFile, setView, setTerminalLines, showToast } = deps;

  // Share project via URL
  const shareProjectUrl = useCallback(async () => {
    if (Object.keys(projectFiles).length === 0) return;
    try {
      const shareUrl = await buildShareUrl(projectFiles);
      await navigator.clipboard.writeText(shareUrl);
      setTerminalLines(prev => [...prev, '$ ✓ Share URL copied to clipboard']);
      showToast('Share URL copied to clipboard', 'success');
    } catch {
      setTerminalLines(prev => [...prev, '$ ✗ Failed to generate share URL']);
    }
  }, [projectFiles]);

  // Import project from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#project=')) return;
    const encoded = hash.slice(9);
    (async () => {
      const files = await decompressProject(encoded);
      if (files) {
        setProjectFiles(files);
        setSelectedFile(Object.keys(files)[0]);
        setView('workspace');
        setTerminalLines(prev => [...prev, `$ ✓ Imported shared project (${Object.keys(files).length} files)`]);
        window.location.hash = '';
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Download project as ZIP
  const downloadProjectZip = useCallback(() => {
    const count = downloadProjectAsZip(projectFiles);
    if (count > 0) {
      setTerminalLines(prev => [...prev, `$ ✓ Downloaded ${count} files as aurion-project.zip`]);
      showToast(`Downloaded ${count} files as ZIP`, 'success');
    }
  }, [projectFiles]);

  return { shareProjectUrl, downloadProjectZip };
}
