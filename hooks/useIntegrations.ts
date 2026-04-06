'use client';

import { useCallback, useEffect, useState } from 'react';
import { INTEGRATION_ROUTE_MAP } from '@/lib/constants';

type VirtualFS = Record<string, { content: string; language: string }>;

interface UseIntegrationsDeps {
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  projectFiles: VirtualFS;
  supabaseUrl: string;
  supabaseTable: string;
  githubToken: string;
  repoName: string;
  setIsGitHubPushing: (v: boolean) => void;
  setIsSupabaseLoading: (v: boolean) => void;
  setSupabaseError: (v: string | null) => void;
  setSupabaseResult: (v: Record<string, unknown>[] | null) => void;
  setIsStripeLoading: (v: boolean) => void;
  setStripeError: (v: string | null) => void;
  setStripeBalance: (v: { available: number; pending: number }) => void;
  setStripeProducts: (v: unknown[]) => void;
  panelActions: { setPanel: (key: string, value: boolean) => void };
}

export function useIntegrations(deps: UseIntegrationsDeps) {
  const {
    setTerminalLines, projectFiles, supabaseUrl, supabaseTable,
    githubToken, repoName, setIsGitHubPushing, setIsSupabaseLoading,
    setSupabaseError, setSupabaseResult, setIsStripeLoading, setStripeError,
    setStripeBalance, setStripeProducts, panelActions,
  } = deps;

  const [integrationKeys, setIntegrationKeys] = useState<Record<string, string>>({});
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Persist integration keys to localStorage
  useEffect(() => {
    if (Object.keys(integrationKeys).length > 0) {
      try { localStorage.setItem('aurion_integration_keys', JSON.stringify(integrationKeys)); } catch { /* ignore */ }
    }
  }, [integrationKeys]);

  const saveIntegrationKey = useCallback((name: string, key: string) => {
    setIntegrationKeys(prev => ({ ...prev, [name]: key }));
    setEditingIntegration(null);
    setTerminalLines(prev => [...prev, '$ Connected: ' + name]);
  }, [setTerminalLines]);

  const testIntegration = useCallback(async (name: string) => {
    const key = integrationKeys[name];
    if (!key) return;
    setTestingIntegration(name);
    setTestResult(prev => { const n = { ...prev }; delete n[name]; return n; });
    const route = INTEGRATION_ROUTE_MAP[name];
    if (!route) { setTestingIntegration(null); return; }

    try {
      let body: Record<string, unknown> = {};
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (name === 'OpenAI') {
        body = { messages: [{ role: 'user', content: 'Say OK' }], model: 'gpt-4o-mini', apiKey: key, stream: false };
      } else if (name === 'Resend') {
        body = { apiKey: key, to: 'test@test.com', subject: 'Test', html: '<p>Test</p>', from: 'onboarding@resend.dev', _test: true };
      } else if (name === 'SendGrid') {
        body = { apiKey: key, to: 'test@test.com', subject: 'Test', html: '<p>Test</p>', from: 'test@test.com', _test: true };
      } else if (name === 'Twilio') {
        body = { accountSid: key.split(':')[0] || key, authToken: key.split(':')[1] || '', action: 'account' };
      } else if (name === 'Upstash') {
        const parts = key.split('|');
        body = { url: parts[0] || key, token: parts[1] || '', command: 'PING' };
      } else if (name === 'Neon') {
        body = { connectionString: key, query: 'SELECT 1 as test' };
      } else if (name === 'Slack') {
        body = { token: key, action: 'auth.test' };
      } else if (name === 'Discord') {
        body = { token: key, action: 'guilds' };
      } else if (name === 'Lemon Squeezy') {
        body = { apiKey: key, endpoint: 'products' };
      } else if (name === 'Contentful') {
        const parts = key.split('|');
        body = { spaceId: parts[0] || '', accessToken: parts[1] || key, endpoint: '/content_types', limit: 1 };
      } else if (name === 'Algolia') {
        const parts = key.split('|');
        body = { appId: parts[0] || '', apiKey: parts[1] || key, action: 'listIndices' };
      } else if (name === 'Klaviyo') {
        body = { apiKey: key, endpoint: 'lists' };
      } else if (name === 'Sanity') {
        const parts = key.split('|');
        body = { projectId: parts[0] || '', dataset: parts[1] || 'production', token: parts[2] || key, query: '*[_type == "sanity.imageAsset"][0...1]' };
      } else if (name === 'Stripe') {
        body = { stripeKey: key, endpoint: 'balance' };
      } else if (name === 'Supabase') {
        body = { supabaseUrl: supabaseUrl || '', supabaseKey: key, table: '_health_check', method: 'GET' };
      }

      const res = await fetch(route, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.ok) {
        setTestResult(prev => ({ ...prev, [name]: { ok: true, msg: 'Connection successful' } }));
        setTerminalLines(prev => [...prev, `$ ✓ ${name}: connection OK`]);
      } else {
        const data = await res.json().catch(() => ({ error: 'Failed' }));
        setTestResult(prev => ({ ...prev, [name]: { ok: false, msg: data.error || `HTTP ${res.status}` } }));
        setTerminalLines(prev => [...prev, `$ ✗ ${name}: ${data.error || res.status}`]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setTestResult(prev => ({ ...prev, [name]: { ok: false, msg } }));
      setTerminalLines(prev => [...prev, `$ ✗ ${name}: ${msg}`]);
    } finally {
      setTestingIntegration(null);
    }
  }, [integrationKeys, supabaseUrl, setTerminalLines]);

  const sendRealEmail = useCallback(async (to: string, subject: string, body: string) => {
    const resendKey = integrationKeys['Resend'];
    const sendgridKey = integrationKeys['SendGrid'];
    if (!resendKey && !sendgridKey) return false;
    try {
      const route = resendKey ? '/api/resend' : '/api/sendgrid';
      const payload = resendKey
        ? { apiKey: resendKey, to, subject, html: body, from: 'onboarding@resend.dev' }
        : { apiKey: sendgridKey, to, subject, html: body, from: 'noreply@example.com' };
      const res = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return res.ok;
    } catch { return false; }
  }, [integrationKeys]);

  const sendRealMessage = useCallback(async (platform: string, channel: string, text: string) => {
    const key = integrationKeys[platform];
    if (!key) return false;
    try {
      let route = '', payload: Record<string, unknown> = {};
      if (platform === 'Slack') { route = '/api/slack'; payload = { token: key, action: 'send', channel, text }; }
      else if (platform === 'Discord') { route = '/api/discord'; payload = { token: key, action: 'send', channelId: channel, content: text }; }
      else if (platform === 'Twilio') {
        route = '/api/twilio';
        const parts = key.split(':');
        payload = { accountSid: parts[0], authToken: parts[1] || '', from: parts[2] || '', to: channel, body: text };
      }
      if (!route) return false;
      const res = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return res.ok;
    } catch { return false; }
  }, [integrationKeys]);

  const pushToGitHub = useCallback(async () => {
    if (!githubToken.trim() || !repoName.trim()) return;
    if (Object.keys(projectFiles).length === 0) {
      setTerminalLines(prev => [...prev, '$ Error: No files in project to push']);
      return;
    }
    setIsGitHubPushing(true);
    panelActions.setPanel('showGitHubModal', false);
    panelActions.setPanel('showTerminal', true);
    setTerminalLines(prev => [...prev, `$ Pushing ${Object.keys(projectFiles).length} files to github.com/${repoName}...`]);
    try {
      const filesMap: Record<string, string> = {};
      for (const [path, file] of Object.entries(projectFiles)) { filesMap[path] = file.content; }
      const resp = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken, repoName, files: filesMap }),
      });
      const data = await resp.json();
      if (data.error) {
        setTerminalLines(prev => [...prev, `$ Error: ${data.error}`]);
      } else {
        setTerminalLines(prev => [...prev,
          `$ ✓ ${data.isNew ? 'Created' : 'Updated'} repository: ${data.repoUrl}`,
          `$ ✓ Pushed ${data.filesCount} files (commit: ${data.commitSha?.slice(0, 7)})`,
        ]);
      }
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ Error: ${err instanceof Error ? err.message : 'Push failed'}`]);
    } finally {
      setIsGitHubPushing(false);
    }
  }, [githubToken, repoName, projectFiles, setTerminalLines, setIsGitHubPushing, panelActions]);

  const runSupabaseQuery = useCallback(async () => {
    const key = integrationKeys['Supabase'];
    if (!key || !supabaseUrl || !supabaseTable) return;
    setIsSupabaseLoading(true);
    setSupabaseError(null);
    setSupabaseResult(null);
    try {
      localStorage.setItem('aurion_supabase_url', supabaseUrl);
      const resp = await fetch('/api/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl, supabaseKey: key, table: supabaseTable, method: 'GET', select: '*' }),
      });
      const data = await resp.json();
      if (data.error) {
        setSupabaseError(data.error + (data.hint ? ` (${data.hint})` : ''));
      } else {
        setSupabaseResult(data.data as Record<string, unknown>[]);
      }
    } catch (err) {
      setSupabaseError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setIsSupabaseLoading(false);
    }
  }, [integrationKeys, supabaseUrl, supabaseTable, setIsSupabaseLoading, setSupabaseError, setSupabaseResult]);

  const fetchStripeData = useCallback(async () => {
    const key = integrationKeys['Stripe'];
    if (!key) return;
    setIsStripeLoading(true);
    setStripeError(null);
    try {
      const [balResp, prodResp] = await Promise.all([
        fetch('/api/stripe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stripeKey: key, endpoint: 'balance', method: 'GET' }) }),
        fetch('/api/stripe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stripeKey: key, endpoint: 'products', method: 'GET' }) }),
      ]);
      const balData = await balResp.json();
      const prodData = await prodResp.json();
      if (balData.error) {
        setStripeError(balData.error + (balData.details?.message ? `: ${balData.details.message}` : ''));
      } else {
        const available = balData.data?.available?.[0]?.amount || 0;
        const pending = balData.data?.pending?.[0]?.amount || 0;
        setStripeBalance({ available, pending });
      }
      if (prodData.data?.data) {
        setStripeProducts(prodData.data.data.slice(0, 10));
      }
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : 'Stripe error');
    } finally {
      setIsStripeLoading(false);
    }
  }, [integrationKeys, setIsStripeLoading, setStripeError, setStripeBalance, setStripeProducts]);

  return {
    integrationKeys, setIntegrationKeys,
    editingIntegration, setEditingIntegration,
    testingIntegration, testResult,
    saveIntegrationKey, testIntegration,
    sendRealEmail, sendRealMessage,
    pushToGitHub, runSupabaseQuery, fetchStripeData,
  };
}
