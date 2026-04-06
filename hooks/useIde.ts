'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type IdeStatus = 'none' | 'creating' | 'deploying' | 'booting' | 'live' | 'error';

interface UseIdeDeps {
  activeTab: string;
  currentProjectId: string;
  projectFiles: Record<string, { content: string; language: string }>;
}

export function useIde(deps: UseIdeDeps) {
  const { activeTab, currentProjectId, projectFiles } = deps;

  const [ideServiceId, setIdeServiceId] = useState<string | null>(null);
  const [ideUrl, setIdeUrl] = useState<string | null>(null);
  const [ideLoading, setIdeLoading] = useState(false);
  const [ideError, setIdeError] = useState<string | null>(null);
  const [ideStatus, setIdeStatus] = useState<IdeStatus>('none');
  const [ideCountdown, setIdeCountdown] = useState(0);
  const idePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-launch IDE when switching to IDE tab
  useEffect(() => {
    if (activeTab !== 'ide' || ideStatus !== 'none' || ideLoading) return;
    (async () => {
      setIdeLoading(true); setIdeError(null); setIdeStatus('creating');
      try {
        const res = await fetch('/api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectName: currentProjectId, files: projectFiles }) });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setIdeServiceId(data.id); setIdeStatus('deploying');
        if (idePollRef.current) clearInterval(idePollRef.current);
        idePollRef.current = setInterval(async () => {
          try {
            const st = await fetch('/api/render?serviceId=' + data.id).then(r => r.json());
            if (st.url && st.status === 'not_suspended') {
              if (idePollRef.current) clearInterval(idePollRef.current);
              const baseUrl = st.url.startsWith('http') ? st.url : 'https://' + st.url;
              const fullUrl = baseUrl.replace(/\/$/, '') + '/?folder=/home/coder/project';
              setIdeStatus('booting');
              let remaining = 90;
              setIdeCountdown(remaining);
              const countdownTimer = setInterval(() => {
                remaining--;
                setIdeCountdown(remaining);
                if (remaining <= 0) {
                  clearInterval(countdownTimer);
                  setIdeUrl(fullUrl); setIdeStatus('live'); setIdeLoading(false);
                }
              }, 1000);
            }
          } catch { /* polling error, keep retrying */ }
        }, 8000);
        setTimeout(() => { if (idePollRef.current) clearInterval(idePollRef.current); setIdeError('Deployment timed out. Check Render dashboard.'); setIdeStatus('error'); setIdeLoading(false); }, 300000);
      } catch (err) {
        setIdeError((err as Error).message); setIdeStatus('error'); setIdeLoading(false);
      }
    })();
    return () => { if (idePollRef.current) clearInterval(idePollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return {
    ideServiceId, setIdeServiceId,
    ideUrl, setIdeUrl,
    ideLoading, setIdeLoading,
    ideError, setIdeError,
    ideStatus, setIdeStatus,
    ideCountdown, setIdeCountdown,
  };
}
