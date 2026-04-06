'use client';
import { useCallback, useState } from 'react';
import { fetchWithRetry } from '@/lib/client-utils';
import type { Message } from '@/lib/client-utils';
import { extractPreviewHtml } from '@/lib/page-helpers';

export interface UseDeployOptions {
  messages: Message[];
  clonedHtml: string | null;
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useDeploy(options: UseDeployOptions) {
  const { messages, clonedHtml, setTerminalLines } = options;

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ url: string; projectName: string } | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  const deployToVercel = useCallback(async (projectName?: string) => {
    const html = clonedHtml ?? extractPreviewHtml(messages);
    if (!html) return;
    setIsDeploying(true);
    setDeployError(null);
    setDeployResult(null);
    setTerminalLines(prev => [...prev, '$ deploying to vercel...']);

    try {
      const res = await fetchWithRetry('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, projectName: projectName || 'aurion-app-' + Date.now().toString(36) }),
        timeout: 60000,
      }, 1);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed');

      setDeployResult({ url: data.url, projectName: data.projectName });
      setTerminalLines(prev => [...prev, `\u2713 deployed: ${data.url}`]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deploy failed';
      setDeployError(msg);
      setTerminalLines(prev => [...prev, `\u2717 deploy error: ${msg}`]);
    } finally {
      setIsDeploying(false);
    }
  }, [clonedHtml, messages, setTerminalLines]);

  return {
    isDeploying, deployResult, setDeployResult,
    deployError, setDeployError,
    deployToVercel,
  };
}
