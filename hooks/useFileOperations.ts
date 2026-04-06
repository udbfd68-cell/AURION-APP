import { useCallback, useMemo } from 'react';
import type { VirtualFS } from '@/lib/types';

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    json: 'json', jsonc: 'jsonc', md: 'markdown', xml: 'xml', svg: 'xml',
    py: 'python', rb: 'ruby', php: 'php', java: 'java', go: 'go',
    rs: 'rust', sh: 'shell', bash: 'shell', yml: 'yaml', yaml: 'yaml',
  };
  return map[ext] || 'plaintext';
}

interface UseFileOperationsDeps {
  selectedFile: string;
  projectFiles: VirtualFS;
  findQuery: string;
  replaceQuery: string;
  findRegex: boolean;
  findCaseSensitive: boolean;
  isStreaming: boolean;
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<'app' | 'code' | 'database' | 'payments' | 'ide'>>;
  setIsExplaining: React.Dispatch<React.SetStateAction<boolean>>;
  setNewFileName: React.Dispatch<React.SetStateAction<string>>;
  openFile: (file: string) => void;
  sendPrompt: (prompt: string) => void;
  panelActions: { setPanel: (key: string, value: boolean) => void };
}

export function useFileOperations(deps: UseFileOperationsDeps) {
  const {
    selectedFile, projectFiles, findQuery, replaceQuery, findRegex, findCaseSensitive,
    isStreaming, setProjectFiles, setTerminalLines, setActiveTab, setIsExplaining,
    setNewFileName, openFile, sendPrompt, panelActions,
  } = deps;

  const findResults = useMemo(() => {
    if (!findQuery) return [];
    const results: { file: string; line: number; col: number; text: string; matchIdx: number }[] = [];
    let matchCount = 0;
    for (const [file, data] of Object.entries(projectFiles)) {
      const lines = data.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        try {
          const regex = findRegex ? new RegExp(findQuery, findCaseSensitive ? 'g' : 'gi') : new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), findCaseSensitive ? 'g' : 'gi');
          let match;
          while ((match = regex.exec(lines[i])) !== null) {
            results.push({ file, line: i + 1, col: match.index, text: lines[i], matchIdx: matchCount++ });
            if (results.length > 200) return results;
          }
        } catch { break; }
      }
    }
    return results;
  }, [findQuery, projectFiles, findRegex, findCaseSensitive]);

  const replaceInFiles = useCallback((replaceAll: boolean) => {
    if (!findQuery || !replaceQuery) return;
    setProjectFiles(prev => {
      const updated = { ...prev };
      for (const [file, data] of Object.entries(updated)) {
        try {
          const regex = findRegex ? new RegExp(findQuery, findCaseSensitive ? (replaceAll ? 'g' : '') : (replaceAll ? 'gi' : 'i')) : new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), findCaseSensitive ? (replaceAll ? 'g' : '') : (replaceAll ? 'gi' : 'i'));
          const newContent = data.content.replace(regex, replaceQuery);
          if (newContent !== data.content) {
            updated[file] = { ...data, content: newContent };
            if (!replaceAll) return updated;
          }
        } catch { /* skip */ }
      }
      return updated;
    });
  }, [findQuery, replaceQuery, findRegex, findCaseSensitive, setProjectFiles]);

  const explainCurrentCode = useCallback(async () => {
    if (!selectedFile || !projectFiles[selectedFile] || isStreaming) return;
    setIsExplaining(true);
    const code = projectFiles[selectedFile].content.slice(0, 8000);
    const explainPrompt = `Explain this code concisely. What does it do, key patterns used, and any potential issues:\n\n\`\`\`${projectFiles[selectedFile].language || 'html'}\n${code}\n\`\`\``;
    sendPrompt(explainPrompt);
    setIsExplaining(false);
  }, [selectedFile, projectFiles, isStreaming, sendPrompt, setIsExplaining]);

  const createNewFile = useCallback((name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    setProjectFiles(prev => ({
      ...prev,
      [trimmed]: { content: '', language: detectLanguage(trimmed) },
    }));
    openFile(trimmed);
    setActiveTab('code');
    panelActions.setPanel('showNewFileInput', false);
    setNewFileName('');
  }, [openFile, setProjectFiles, setActiveTab, panelActions, setNewFileName]);

  const formatCurrentFile = useCallback(() => {
    if (!selectedFile || !projectFiles[selectedFile]) return;
    const content = projectFiles[selectedFile].content;
    const lang = projectFiles[selectedFile].language;
    let formatted = content;
    if (lang === 'html' || lang === 'xml') {
      let indent = 0;
      formatted = content.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
        const result = '  '.repeat(indent) + trimmed;
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<!') && !trimmed.endsWith('/>') && !trimmed.includes('</')) indent++;
        return result;
      }).join('\n');
    } else if (lang === 'json' || lang === 'jsonc') {
      try { formatted = JSON.stringify(JSON.parse(content), null, 2); } catch { /* keep as-is */ }
    }
    if (formatted !== content) {
      setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: formatted } }));
      setTerminalLines(prev => [...prev, `$ ✓ Formatted ${selectedFile}`]);
    }
  }, [selectedFile, projectFiles, setProjectFiles, setTerminalLines]);

  const insertComponent = useCallback((code: string) => {
    if (!selectedFile || !projectFiles[selectedFile]) return;
    const content = projectFiles[selectedFile].content;
    const bodyClose = content.lastIndexOf('</body>');
    const insertPos = bodyClose > 0 ? bodyClose : content.length;
    const newContent = content.slice(0, insertPos) + '\n' + code + '\n' + content.slice(insertPos);
    setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: newContent } }));
    panelActions.setPanel('showComponentPalette', false);
    setTerminalLines(prev => [...prev, `$ ✓ Component inserted into ${selectedFile}`]);
  }, [selectedFile, projectFiles, setProjectFiles, setTerminalLines, panelActions]);

  return {
    findResults, replaceInFiles, explainCurrentCode, createNewFile,
    formatCurrentFile, insertComponent,
  };
}
