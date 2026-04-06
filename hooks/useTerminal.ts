'use client';
import { useCallback, useState, useRef, useEffect } from 'react';
import { detectLanguage } from '@/lib/client-utils';
import type { VirtualFS } from '@/lib/client-utils';
import { BackendGenerator } from '@/lib/backend-generator';

export interface UseTerminalOptions {
  projectFiles: VirtualFS;
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
  selectedFile: string;
  setSelectedFile: (f: string) => void;
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: (tab: 'app' | 'code' | 'database' | 'payments' | 'ide') => void;
  integrationKeys: Record<string, string>;
  terminalLines: string[];
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  // WebContainer
  webContainer: { state: { status: string }; runCommand: (bin: string, args: string[]) => Promise<number>; terminalOutput: { content: string }[] };
  // External callbacks
  scaffoldFrameworkProject: (fw: 'html' | 'react' | 'nextjs' | 'vue') => void;
  runAICodeReview: () => void;
  // Database
  dbActiveConnection: unknown;
  setDbSqlInput: (s: string) => void;
  setDbViewMode: (m: 'query' | 'schema' | 'history' | 'templates') => void;
  // Backend generator panel
  setShowBackendGenerator: (b: boolean) => void;
}

export function useTerminal(options: UseTerminalOptions) {
  const {
    projectFiles, setProjectFiles, selectedFile,
    setSelectedFile, setOpenTabs, setActiveTab,
    integrationKeys, terminalLines, setTerminalLines, webContainer,
    scaffoldFrameworkProject, runAICodeReview,
    dbActiveConnection, setDbSqlInput, setDbViewMode,
    setShowBackendGenerator,
  } = options;

  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [gitCommits, setGitCommits] = useState<{ hash: string; msg: string; date: string }[]>([]);
  const [gitStaged, setGitStaged] = useState(false);

  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [terminalLines]);

  const runTerminalCommand = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    setTerminalHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);
    setTerminalInput('');
    setTerminalLines(prev => [...prev, '$ ' + cmd]);

    // Route npm/node commands through WebContainer when available
    if (webContainer.state.status === 'ready') {
      const parts = cmd.trim().split(/\s+/);
      const binary = parts[0];
      if (['npm', 'node', 'npx', 'yarn', 'pnpm', 'vitest', 'jest', 'tsc', 'eslint'].includes(binary)) {
        (async () => {
          try {
            const code = await webContainer.runCommand(binary, parts.slice(1));
            for (const line of webContainer.terminalOutput.slice(-20)) {
              setTerminalLines(prev => [...prev, line.content]);
            }
            if (code !== 0) {
              setTerminalLines(prev => [...prev, `Process exited with code ${code}`]);
            }
          } catch (err) {
            setTerminalLines(prev => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown'}`]);
          }
        })();
        return;
      }
    }

    const c = cmd.trim().toLowerCase();
    const raw = cmd.trim();
    if (c === 'clear') { setTerminalLines([]); return; }
    if (c === 'help') { setTerminalLines(prev => [...prev, 'Commands: clear, help, ls [dir], cat <file>, touch <file>, rm <file>, mkdir <dir>, tree, pwd, whoami, date, echo <msg>', '  npm install <pkg>, npm run dev|build, node -e "...", git status|add|commit|log, env, grep <pattern> <file>', '  cp <src> <dest>, mv <src> <dest>, head/tail <file>, wc <file>, find <pattern>, stat <file>', '  diff <file1> <file2>, history, du, sort <file>, uniq <file>, which <cmd>, uptime, hostname', '  backend generate <preset>, backend presets, backend panel — Backend code generation', '  sql <query>, db — Database commands']); return; }
    if (c === 'ls' || c === 'ls .') {
      setProjectFiles(prev => {
        const names = Object.keys(prev);
        if (names.length === 0) {
          setTerminalLines(p => [...p, '(empty project)']);
        } else {
          const topLevel = new Set<string>();
          for (const n of names) {
            const first = n.split('/')[0];
            topLevel.add(n.includes('/') ? first + '/' : first);
          }
          setTerminalLines(p => [...p, Array.from(topLevel).sort().join('  ')]);
        }
        return prev;
      });
      return;
    }
    if (c.startsWith('ls ')) {
      const dir = raw.slice(3).trim().split('\\').join('/').replace(/\/$/, '');
      setProjectFiles(prev => {
        const entries = new Set<string>();
        for (const p of Object.keys(prev)) {
          if (p.startsWith(dir + '/')) {
            const rest = p.slice(dir.length + 1);
            const first = rest.split('/')[0];
            entries.add(rest.includes('/') ? first + '/' : first);
          }
        }
        if (entries.size === 0) setTerminalLines(p => [...p, `ls: cannot access '${dir}': No such file or directory`]);
        else setTerminalLines(p => [...p, Array.from(entries).sort().join('  ')]);
        return prev;
      });
      return;
    }
    if (c === 'tree') {
      setProjectFiles(prev => {
        const names = Object.keys(prev).sort();
        if (names.length === 0) setTerminalLines(p => [...p, '(empty project)']);
        else setTerminalLines(p => [...p, '.', ...names.map(n => '\u251c\u2500\u2500 ' + n), `\n${names.length} file(s)`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('cat ')) {
      const file = raw.slice(4).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const lines = f.content.split('\n').slice(0, 50);
          setTerminalLines(p => [...p, ...lines, f.content.split('\n').length > 50 ? `... (${f.content.split('\n').length} lines total)` : '']);
        } else setTerminalLines(p => [...p, `cat: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('head ')) {
      const file = raw.slice(5).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) setTerminalLines(p => [...p, ...f.content.split('\n').slice(0, 10)]);
        else setTerminalLines(p => [...p, `head: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('tail ')) {
      const file = raw.slice(5).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) setTerminalLines(p => [...p, ...f.content.split('\n').slice(-10)]);
        else setTerminalLines(p => [...p, `tail: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('wc ')) {
      const file = raw.slice(3).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const lines = f.content.split('\n').length;
          const words = f.content.split(/\s+/).filter(Boolean).length;
          const chars = f.content.length;
          setTerminalLines(p => [...p, `  ${lines}  ${words}  ${chars} ${file}`]);
        } else setTerminalLines(p => [...p, `wc: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('grep ')) {
      const parts = raw.slice(5).trim().split(/\s+/);
      if (parts.length < 2) { setTerminalLines(p => [...p, 'Usage: grep <pattern> <file>']); return; }
      const pattern = parts[0];
      const file = parts.slice(1).join(' ');
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const matches = f.content.split('\n').map((line, i) => ({ line, num: i + 1 })).filter(({ line }) => line.toLowerCase().includes(pattern.toLowerCase()));
          if (matches.length === 0) setTerminalLines(p => [...p, '(no matches)']);
          else setTerminalLines(p => [...p, ...matches.slice(0, 20).map(m => `${m.num}: ${m.line}`)]);
        } else setTerminalLines(p => [...p, `grep: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('find ')) {
      const pattern = raw.slice(5).trim().toLowerCase();
      setProjectFiles(prev => {
        const matches = Object.keys(prev).filter(f => f.toLowerCase().includes(pattern));
        if (matches.length === 0) setTerminalLines(p => [...p, '(no matches)']);
        else setTerminalLines(p => [...p, ...matches]);
        return prev;
      });
      return;
    }
    if (c.startsWith('touch ')) {
      const file = raw.slice(6).trim();
      if (file) {
        setProjectFiles(prev => prev[file] ? prev : { ...prev, [file]: { content: '', language: detectLanguage(file) } });
        setTerminalLines(prev => [...prev, `created ${file}`]);
      }
      return;
    }
    if (c.startsWith('rm ')) {
      const file = raw.slice(3).trim();
      setProjectFiles(prev => {
        if (!prev[file]) { setTerminalLines(p => [...p, `rm: ${file}: No such file`]); return prev; }
        const next = { ...prev };
        delete next[file];
        setTerminalLines(p => [...p, `removed ${file}`]);
        return next;
      });
      return;
    }
    if (c.startsWith('cp ')) {
      const parts = raw.slice(3).trim().split(/\s+/);
      if (parts.length < 2) { setTerminalLines(p => [...p, 'Usage: cp <src> <dest>']); return; }
      const [src, dest] = parts;
      setProjectFiles(prev => {
        if (!prev[src]) { setTerminalLines(p => [...p, `cp: ${src}: No such file`]); return prev; }
        return { ...prev, [dest]: { content: prev[src].content, language: detectLanguage(dest) } };
      });
      setTerminalLines(prev => [...prev, `copied ${parts[0]} \u2192 ${parts[1]}`]);
      return;
    }
    if (c.startsWith('mv ')) {
      const parts = raw.slice(3).trim().split(/\s+/);
      if (parts.length < 2) { setTerminalLines(p => [...p, 'Usage: mv <src> <dest>']); return; }
      const [src, dest] = parts;
      setProjectFiles(prev => {
        if (!prev[src]) { setTerminalLines(p => [...p, `mv: ${src}: No such file`]); return prev; }
        const next = { ...prev, [dest]: { content: prev[src].content, language: detectLanguage(dest) } };
        delete next[src];
        return next;
      });
      setTerminalLines(prev => [...prev, `moved ${parts[0]} \u2192 ${parts[1]}`]);
      return;
    }
    if (c.startsWith('mkdir ')) { setTerminalLines(prev => [...prev, 'directory noted (create files inside it)']); return; }
    if (c === 'pwd') { setTerminalLines(prev => [...prev, '/project']); return; }
    if (c === 'whoami') { setTerminalLines(prev => [...prev, 'aurion']); return; }
    if (c === 'date') { setTerminalLines(prev => [...prev, new Date().toString()]); return; }
    if (c.startsWith('echo ')) { setTerminalLines(prev => [...prev, cmd.slice(5)]); return; }

    // Scaffold
    if (c.startsWith('scaffold ')) {
      const fw = raw.slice(9).trim().toLowerCase() as 'html' | 'react' | 'nextjs' | 'vue';
      if (['html', 'react', 'nextjs', 'vue'].includes(fw)) {
        scaffoldFrameworkProject(fw);
        setTerminalLines(prev => [...prev, `\u2713 Scaffolded ${fw} project`]);
      } else setTerminalLines(prev => [...prev, 'Usage: scaffold <html|react|nextjs|vue>']);
      return;
    }
    if (c === 'review' || c === 'code-review') {
      runAICodeReview();
      setTerminalLines(prev => [...prev, `Running AI code review on ${selectedFile || 'current file'}...`]);
      return;
    }

    // npm commands
    if (c.startsWith('npm install ') || c.startsWith('npm i ')) {
      const pkg = raw.replace(/^npm\s+(install|i)\s+/, '').trim();
      if (!pkg) { setTerminalLines(p => [...p, 'Usage: npm install <package>']); return; }
      const pkgs = pkg.split(/\s+/);
      setInstalledPackages(prev => [...new Set([...prev, ...pkgs])]);
      setTerminalLines(prev => [...prev, '', `added ${pkgs.length} package(s):`, ...pkgs.map(p => `  + ${p}@latest`), '', `${pkgs.length} package(s) installed`]);
      return;
    }
    if (c === 'npm run dev' || c === 'npm start') {
      setTerminalLines(prev => [...prev, '', '> aurion-project@1.0.0 dev', '> next dev', '', '  \u25b2 Next.js 16.1.6', '  - Local:    http://localhost:3000', '  - Network:  http://192.168.1.42:3000', '', '  \u2713 Ready in 1.2s']);
      return;
    }
    if (c === 'npm run build') {
      setProjectFiles(prev => {
        const fileCount = Object.keys(prev).length;
        setTerminalLines(p => [...p, '', '> aurion-project@1.0.0 build', '> next build', '', `  \u2713 Compiled ${fileCount} file(s) successfully`, '  \u2713 Collecting page data', '  \u2713 Generating static pages', `  \u2713 Build completed in 3.2s`, '', 'Route (app)                              Size', '\u250c \u25cb /                                    5.2 kB', '\u2514 \u25cb /api/*                               1.1 kB', '', `\u2713 ${fileCount} file(s) built`]);
        return prev;
      });
      return;
    }
    if (c === 'npm ls' || c === 'npm list') {
      setTerminalLines(prev => [...prev, 'aurion-project@1.0.0 /project', ...(installedPackages.length > 0 ? installedPackages.map(p => `\u251c\u2500\u2500 ${p}@latest`) : ['(no packages installed)'])]);
      return;
    }

    // git commands
    if (c === 'git status') {
      setProjectFiles(prev => {
        const files = Object.keys(prev);
        if (files.length === 0) {
          setTerminalLines(p => [...p, 'On branch main', '', 'No commits yet', '', 'nothing to commit']);
        } else {
          setTerminalLines(p => [...p, 'On branch main', '', gitStaged ? 'Changes to be committed:' : 'Changes not staged for commit:', ...files.map(f => `  ${gitStaged ? 'new file' : 'modified'}:   ${f}`), '', `${files.length} file(s) ${gitStaged ? 'staged' : 'unstaged'}`]);
        }
        return prev;
      });
      return;
    }
    if (c === 'git add .' || c === 'git add -A') {
      setGitStaged(true);
      setProjectFiles(prev => {
        setTerminalLines(p => [...p, `staged ${Object.keys(prev).length} file(s)`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('git commit')) {
      const msgMatch = raw.match(/-m\s+["'](.+?)["']/);
      const msg = msgMatch ? msgMatch[1] : 'update';
      if (!gitStaged) { setTerminalLines(p => [...p, 'nothing to commit (run git add . first)']); return; }
      const hash = Math.random().toString(36).slice(2, 9);
      setGitCommits(prev => [{ hash, msg, date: new Date().toISOString().slice(0, 19).replace('T', ' ') }, ...prev]);
      setGitStaged(false);
      setProjectFiles(prev => {
        setTerminalLines(p => [...p, `[main ${hash}] ${msg}`, ` ${Object.keys(prev).length} file(s) changed`]);
        return prev;
      });
      return;
    }
    if (c === 'git log') {
      if (gitCommits.length === 0) { setTerminalLines(p => [...p, '(no commits yet)']); return; }
      setTerminalLines(prev => [...prev, ...gitCommits.flatMap(c => [`commit ${c.hash}`, `Date: ${c.date}`, `  ${c.msg}`, ''])]);
      return;
    }
    if (c === 'git init') { setTerminalLines(prev => [...prev, 'Initialized empty Git repository in /project/.git/']); return; }

    // env
    if (c === 'env') {
      const keys = Object.entries(integrationKeys);
      if (keys.length === 0) { setTerminalLines(p => [...p, '(no environment variables set \u2014 connect integrations to add API keys)']); return; }
      setTerminalLines(prev => [...prev, ...keys.map(([name, key]) => `${name.toUpperCase().replace(/\s+/g, '_')}_KEY=${key.slice(0, 4)}${'*'.repeat(Math.max(0, key.length - 4))}`)]);
      return;
    }

    // node -e
    if (c.startsWith('node -e ') || c.startsWith("node -e '") || c.startsWith('node -e "')) {
      const code = raw.replace(/^node\s+-e\s+["']?/, '').replace(/["']$/, '');
      setTerminalLines(p => [...p, 'executing...']);
      fetch('/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
        .then(r => r.json())
        .then(data => {
          if (data.logs?.length) setTerminalLines(p => [...p, ...data.logs]);
          if (data.error) setTerminalLines(p => [...p, `Error: ${data.error}`]);
          if (data.result !== undefined) setTerminalLines(p => [...p, String(data.result)]);
        })
        .catch(err => setTerminalLines(p => [...p, `Error: ${err instanceof Error ? err.message : 'exec failed'}`]));
      return;
    }
    if (c.startsWith('node ') && !c.startsWith('node -')) {
      const file = raw.slice(5).trim();
      const f = projectFiles[file];
      if (!f) { setTerminalLines(p => [...p, `node: ${file}: No such file`]); return; }
      setTerminalLines(p => [...p, `running ${file}...`]);
      fetch('/api/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: f.content }) })
        .then(r => r.json())
        .then(data => {
          if (data.logs?.length) setTerminalLines(p => [...p, ...data.logs]);
          if (data.error) setTerminalLines(p => [...p, `Error: ${data.error}`]);
        })
        .catch(err => setTerminalLines(p => [...p, `Error: ${err instanceof Error ? err.message : 'exec failed'}`]));
      return;
    }
    if (c.startsWith('npm info ') || c.startsWith('npm view ')) {
      const pkg = raw.replace(/^npm\s+(info|view)\s+/, '').trim();
      if (!pkg) { setTerminalLines(p => [...p, 'Usage: npm info <package>']); return; }
      setTerminalLines(p => [...p, `fetching ${pkg}...`]);
      fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`)
        .then(r => { if (!r.ok) throw new Error('Package not found'); return r.json(); })
        .then((data: Record<string, unknown>) => {
          setTerminalLines(p => [...p, `${data.name}@${data.version}`, `description: ${data.description || '(none)'}`, `license: ${data.license || 'N/A'}`, `homepage: ${(data.homepage as string) || 'N/A'}`]);
        })
        .catch(err => setTerminalLines(p => [...p, `npm ERR! ${err instanceof Error ? err.message : 'fetch failed'}`]));
      return;
    }

    // which
    if (c.startsWith('which ')) {
      const bin = raw.slice(6).trim();
      const available = ['node', 'npm', 'git', 'ls', 'cat', 'tree', 'echo', 'pwd', 'date', 'touch', 'rm', 'cp', 'mv', 'mkdir', 'grep', 'find', 'head', 'tail', 'wc', 'clear', 'env', 'whoami'];
      if (available.includes(bin)) setTerminalLines(prev => [...prev, `/usr/bin/${bin}`]);
      else setTerminalLines(prev => [...prev, `${bin} not found`]);
      return;
    }
    if (c === 'uptime') { setTerminalLines(prev => [...prev, `up ${Math.floor(Math.random() * 30 + 1)} days, load average: 0.${Math.floor(Math.random() * 99)}`]); return; }
    if (c === 'hostname') { setTerminalLines(prev => [...prev, 'aurion-cloud']); return; }
    if (c === 'history') { setTerminalLines(prev => [...prev, ...terminalHistory.map((h, i) => `  ${i + 1}  ${h}`)]); return; }

    // stat
    if (c.startsWith('stat ')) {
      const file = raw.slice(5).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const lines = f.content.split('\n').length;
          const words = f.content.split(/\s+/).filter(Boolean).length;
          setTerminalLines(p => [...p, `  File: ${file}`, `  Size: ${f.content.length} bytes`, `  Lines: ${lines}`, `  Words: ${words}`, `  Language: ${f.language || 'unknown'}`, `  Modified: ${new Date().toISOString()}`]);
        } else setTerminalLines(p => [...p, `stat: ${file}: No such file`]);
        return prev;
      });
      return;
    }

    // diff
    if (c.startsWith('diff ')) {
      const parts = raw.slice(5).trim().split(/\s+/);
      if (parts.length < 2) { setTerminalLines(p => [...p, 'Usage: diff <file1> <file2>']); return; }
      setProjectFiles(prev => {
        const a = prev[parts[0]], b = prev[parts[1]];
        if (!a) { setTerminalLines(p => [...p, `diff: ${parts[0]}: No such file`]); return prev; }
        if (!b) { setTerminalLines(p => [...p, `diff: ${parts[1]}: No such file`]); return prev; }
        const la = a.content.split('\n'), lb = b.content.split('\n');
        const maxL = Math.max(la.length, lb.length);
        const diffs: string[] = [];
        for (let i = 0; i < maxL && diffs.length < 30; i++) {
          if (la[i] !== lb[i]) {
            if (la[i] !== undefined) diffs.push(`- ${i + 1}: ${la[i].slice(0, 80)}`);
            if (lb[i] !== undefined) diffs.push(`+ ${i + 1}: ${lb[i].slice(0, 80)}`);
          }
        }
        if (diffs.length === 0) setTerminalLines(p => [...p, 'Files are identical']);
        else setTerminalLines(p => [...p, `--- ${parts[0]}`, `+++ ${parts[1]}`, ...diffs]);
        return prev;
      });
      return;
    }

    // du
    if (c === 'du' || c === 'du .') {
      setProjectFiles(prev => {
        const total = Object.values(prev).reduce((s, f) => s + f.content.length, 0);
        setTerminalLines(p => [...p, `${(total / 1024).toFixed(1)}K\t.`, `${Object.keys(prev).length} file(s), ${total} bytes total`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('sort ')) {
      const file = raw.slice(5).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) setTerminalLines(p => [...p, ...f.content.split('\n').sort().slice(0, 50)]);
        else setTerminalLines(p => [...p, `sort: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('uniq ')) {
      const file = raw.slice(5).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) setTerminalLines(p => [...p, ...[...new Set(f.content.split('\n'))].slice(0, 50)]);
        else setTerminalLines(p => [...p, `uniq: ${file}: No such file`]);
        return prev;
      });
      return;
    }

    // Backend generator
    if (c === 'backend' || c === 'backend help') {
      setTerminalLines(prev => [...prev, '\ud83d\udda5\ufe0f Backend Generator Commands:', '  backend generate <preset>  \u2014 Generate backend from preset', '  backend presets            \u2014 List all presets', '  backend files              \u2014 Show generated backend files', '  backend panel              \u2014 Open backend generator panel']);
      return;
    }
    if (c === 'backend presets') {
      setTerminalLines(prev => [...prev, '\ud83d\udce6 Available backend presets:', ...Object.entries(BackendGenerator.presets).map(([k, v]) => `  ${k.padEnd(18)} \u2192 ${v.framework} + ${v.database} + ${v.features.length} features`)]);
      return;
    }
    if (c.startsWith('backend generate ')) {
      const preset = raw.slice(17).trim();
      const config = BackendGenerator.presets[preset];
      if (!config) { setTerminalLines(prev => [...prev, `\u2717 Unknown preset: ${preset}. Run 'backend presets' to see options.`]); return; }
      const generator = new BackendGenerator();
      const files = generator.generate(config, 'items');
      setProjectFiles(prev => {
        const next = { ...prev };
        for (const f of files) next[f.path] = { content: f.content, language: f.language };
        return next;
      });
      if (files.length > 0) {
        setSelectedFile(files[0].path);
        setOpenTabs(prev => prev.includes(files[0].path) ? prev : [...prev, files[0].path]);
        setActiveTab('code');
      }
      setTerminalLines(prev => [...prev, `\u2705 Generated ${files.length} backend files (${preset}):`, ...files.map(f => `  + ${f.path}`)]);
      return;
    }
    if (c === 'backend panel') {
      setShowBackendGenerator(true);
      setTerminalLines(prev => [...prev, '\ud83d\udce6 Backend generator panel opened']);
      return;
    }

    // Database commands
    if (c === 'sql' || c === 'db') {
      setActiveTab('database');
      setDbViewMode('query');
      setTerminalLines(prev => [...prev, '\ud83d\udcca Switched to database tab']);
      return;
    }
    if (c.startsWith('sql ')) {
      const query = raw.slice(4).trim();
      if (dbActiveConnection) {
        setDbSqlInput(query);
        setActiveTab('database');
        setDbViewMode('query');
        setTerminalLines(prev => [...prev, '\ud83d\udcca SQL loaded in editor. Press Execute to run.']);
      } else {
        setTerminalLines(prev => [...prev, '\u2717 No database connected. Use the Database tab to connect first.']);
      }
      return;
    }

    setTerminalLines(prev => [...prev, `${cmd.split(' ')[0]}: command not found. Type 'help' for available commands.`]);
  }, [installedPackages, gitStaged, gitCommits, integrationKeys, projectFiles, webContainer, scaffoldFrameworkProject, runAICodeReview, selectedFile, dbActiveConnection, setDbSqlInput, setDbViewMode, setShowBackendGenerator, setActiveTab, setProjectFiles, setSelectedFile, setOpenTabs, terminalHistory]);

  // ── Claude Code Terminal Mode ──
  const [claudeCodeMode, setClaudeCodeMode] = useState(false);
  const [isClaudeCodeStreaming, setIsClaudeCodeStreaming] = useState(false);

  const runClaudeCodeCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;
    setTerminalHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);
    setTerminalInput('');
    setTerminalLines(prev => [...prev, '⚡ ' + cmd]);
    setTerminalLines(prev => [...prev, '🧠 Analyzing...']);
    setIsClaudeCodeStreaming(true);

    try {
      const res = await fetch('/api/claude-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claude-code-terminal',
          prompt: cmd,
          projectFiles: Object.fromEntries(
            Object.entries(projectFiles).slice(0, 30).map(([k, v]) => [k, typeof v === 'string' ? v : (v as { content: string }).content || ''])
          ),
          terminalHistory: terminalHistory.slice(-10),
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        setTerminalLines(prev => [...prev, `❌ ${data.error || 'Request failed'}`]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setTerminalLines(prev => [...prev, '❌ No response stream']); return; }

      let fullResponse = '';
      let buffer = '';
      setTerminalLines(prev => prev.filter(l => l !== '🧠 Analyzing...'));

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
          try {
            const data = JSON.parse(payload);
            if (data.text) fullResponse += data.text;
          } catch { continue; }
        }
      }

      // Process Claude Code response — extract actions
      if (fullResponse) {
        // Extract <<EXPLAIN>> blocks for terminal output
        const explainRegex = /<<EXPLAIN>>([\s\S]*?)<<\/EXPLAIN>>/g;
        let match;
        while ((match = explainRegex.exec(fullResponse)) !== null) {
          const explanation = match[1].trim();
          for (const line of explanation.split('\n')) {
            setTerminalLines(prev => [...prev, `  ${line}`]);
          }
        }

        // Extract <<FILE:path>> blocks → create files in project
        const fileRegex = /<<FILE:([^>]+)>>([\s\S]*?)<<\/FILE>>/g;
        let fileCount = 0;
        while ((match = fileRegex.exec(fullResponse)) !== null) {
          const filePath = match[1].trim();
          const content = match[2];
          setProjectFiles(prev => ({
            ...prev,
            [filePath]: { content, language: detectLanguage(filePath) },
          }));
          setTerminalLines(prev => [...prev, `  📄 Created: ${filePath}`]);
          fileCount++;
        }

        // Extract <<TERMINAL:cmd>> blocks → execute commands
        const termRegex = /<<TERMINAL:([^>]+)>>/g;
        while ((match = termRegex.exec(fullResponse)) !== null) {
          const termCmd = match[1].trim();
          setTerminalLines(prev => [...prev, `  ▶ Executing: ${termCmd}`]);
          // Execute the command through the normal terminal pipeline
          runTerminalCommand(termCmd);
        }

        if (fileCount > 0) {
          setTerminalLines(prev => [...prev, `✅ ${fileCount} file(s) created/updated`]);
        }

        // If no structured actions found, display the raw response
        if (!fullResponse.includes('<<FILE:') && !fullResponse.includes('<<EXPLAIN>>') && !fullResponse.includes('<<TERMINAL:')) {
          for (const line of fullResponse.split('\n').slice(0, 30)) {
            setTerminalLines(prev => [...prev, `  ${line}`]);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setTerminalLines(prev => [...prev, `❌ ${msg}`]);
    } finally {
      setIsClaudeCodeStreaming(false);
    }
  }, [projectFiles, terminalHistory, runTerminalCommand, setProjectFiles]);

  return {
    terminalInput, setTerminalInput,
    terminalHistory, historyIdx, setHistoryIdx,
    terminalEndRef, terminalInputRef,
    installedPackages, gitCommits, gitStaged,
    runTerminalCommand,
    // Claude Code Mode
    claudeCodeMode, setClaudeCodeMode,
    isClaudeCodeStreaming, runClaudeCodeCommand,
  };
}
