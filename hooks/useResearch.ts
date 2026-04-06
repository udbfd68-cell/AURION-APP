'use client';

import { useCallback, useState } from 'react';
import { fetchWithRetry } from '@/lib/client-utils';

interface ResearchResults {
  topic: string;
  sources: number;
  insights: string[];
  summary: string;
  confidence: number;
}

export function useResearch() {
  const [researchMode, setResearchMode] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [researchResults, setResearchResults] = useState<ResearchResults | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchContext, setResearchContext] = useState<string>('');

  const performResearch = useCallback(async (query: string, urls: string[] = []) => {
    if (!query.trim()) return;
    setIsResearching(true);
    setResearchError(null);
    try {
      const res = await fetchWithRetry('/api/notebooklm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deep-research', query, urls }),
        timeout: 180000,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Research failed');
      const { analysis, context } = data.data;
      setResearchResults({
        topic: analysis.topic,
        sources: analysis.sources?.length || 0,
        insights: analysis.key_insights || [],
        summary: analysis.summary || '',
        confidence: analysis.confidence || 0,
      });
      setResearchContext(context || '');
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setIsResearching(false);
    }
  }, []);

  const enhanceWithResearch = useCallback(async (tool: string, prompt: string) => {
    try {
      const res = await fetchWithRetry('/api/notebooklm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enhance-tool', tool, prompt }),
        timeout: 60000,
      });
      const data = await res.json();
      if (data.success) {
        return data.data.systemPromptAddition || '';
      }
    } catch { /* continue without enhancement */ }
    return '';
  }, []);

  return {
    researchMode, setResearchMode,
    researchQuery, setResearchQuery,
    researchResults, setResearchResults,
    isResearching, setIsResearching,
    researchError, setResearchError,
    researchContext, setResearchContext,
    performResearch, enhanceWithResearch,
  };
}
