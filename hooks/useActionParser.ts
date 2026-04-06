import { useCallback, useRef, useEffect } from 'react';
import { parseAIContent } from '@/lib/ai-content-parser';
import type { Message, VirtualFS } from '@/lib/types';

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    json: 'json', md: 'markdown', py: 'python', rb: 'ruby', php: 'php',
    java: 'java', go: 'go', rs: 'rust', swift: 'swift', kt: 'kotlin',
    yaml: 'yaml', yml: 'yaml', xml: 'xml', svg: 'xml', sql: 'sql',
    sh: 'shell', bash: 'shell', toml: 'toml', env: 'plaintext', txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
}

interface UseActionParserDeps {
  messages: Message[];
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<'app' | 'code' | 'database' | 'payments' | 'ide'>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<string>>;
  setIntegrationKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCloneUrl: (url: string) => void;
  setStitchPrompt: (prompt: string) => void;
  setShowStitchPanel: (show: boolean) => void;
  setShowTerminal: (b: boolean) => void;
  setShowIntegrations: (b: boolean) => void;
  panelActions: { setPanel: (key: string, value: boolean) => void };
  deployToVercel: () => void;
  cloneWebsite: (url: string) => void;
  runTerminalCommand: (cmd: string) => void;
  generateLTXVideo: (id: string, prompt: string) => void;
  generateGeminiImage: (id: string, prompt: string) => void;
}

export function useActionParser(deps: UseActionParserDeps) {
  const executedActionsRef = useRef<Set<string>>(new Set());

  const parseAndExecuteActions = useCallback((content: string) => {
    const { files, codeBlocks, actions } = parseAIContent(content, executedActionsRef.current);

    for (const f of files) {
      deps.setProjectFiles(prev => ({
        ...prev,
        [f.path]: { content: f.content, language: detectLanguage(f.path) },
      }));
      deps.setTerminalLines(prev => [...prev, `$ ✓ ${prev.some?.(l => l.includes(f.path)) ? 'updated' : 'created'} ${f.path}`]);
      if (f.path === 'index.html' || f.path.endsWith('.html') || f.path.endsWith('.jsx') || f.path.endsWith('.tsx')) {
        deps.setActiveTab('app');
      }
      deps.setSelectedFile(f.path);
    }

    for (const cb of codeBlocks) {
      deps.setProjectFiles(prev => ({
        ...prev,
        [cb.path]: { content: cb.content, language: detectLanguage(cb.path) },
      }));
      if (cb.path.endsWith('.html') || cb.path.endsWith('.jsx') || cb.path.endsWith('.tsx')) {
        deps.setActiveTab('app');
      }
    }

    for (const a of actions) {
      switch (a.type) {
        case 'TERMINAL': {
          const cmd = a.payload.trim();
          if (cmd) { deps.panelActions.setPanel('showTerminal', true); deps.runTerminalCommand(cmd); }
          break;
        }
        case 'CONNECT': {
          const [name, key] = a.payload.split('|').map(s => s.trim());
          if (name && key) {
            deps.setIntegrationKeys(prev => ({ ...prev, [name]: key }));
            deps.setTerminalLines(prev => [...prev, `$ ✓ Integration connected: ${name}`]);
          }
          break;
        }
        case 'DEPLOY': deps.deployToVercel(); break;
        case 'TAB': {
          const tab = a.payload.trim().toLowerCase() as 'app' | 'code' | 'database' | 'payments' | 'ide';
          if (['app', 'code', 'database', 'payments', 'ide'].includes(tab)) deps.setActiveTab(tab);
          break;
        }
        case 'CLONE': {
          const url = a.payload.trim();
          if (url) { deps.setCloneUrl(url); deps.cloneWebsite(url); }
          break;
        }
        case 'SHOW_TERMINAL': deps.setShowTerminal(a.payload.trim() !== 'false'); break;
        case 'SHOW_INTEGRATIONS': deps.setShowIntegrations(a.payload.trim() !== 'false'); break;
        case 'LTX_VIDEO': {
          const pi = a.payload.indexOf('|');
          if (pi > 0) { const vid = a.payload.slice(0, pi).trim(), vp = a.payload.slice(pi + 1).trim(); if (vid && vp) deps.generateLTXVideo(vid, vp); }
          break;
        }
        case 'GEMINI_IMAGE': {
          const pi = a.payload.indexOf('|');
          if (pi > 0) { const iid = a.payload.slice(0, pi).trim(), ip = a.payload.slice(pi + 1).trim(); if (iid && ip) deps.generateGeminiImage(iid, ip); }
          break;
        }
        case 'STITCH': {
          const sp = a.payload.trim();
          if (sp) { deps.setStitchPrompt(sp); deps.setShowStitchPanel(true); } else { deps.setShowStitchPanel(true); }
          break;
        }
      }
    }
  }, [deps.deployToVercel, deps.cloneWebsite, deps.runTerminalCommand, deps.generateLTXVideo, deps.generateGeminiImage]);

  // Watch for AI actions in streaming messages
  useEffect(() => {
    const lastMsg = deps.messages[deps.messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.content) {
      parseAndExecuteActions(lastMsg.content);
    }
  }, [deps.messages, parseAndExecuteActions]);

  return { parseAndExecuteActions, executedActionsRef };
}
