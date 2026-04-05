/* ════════════════════════════════════════════
   WebContainer Hook — Real Runtime Execution
   ════════════════════════════════════════════ */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VirtualFS, TerminalLine, WebContainerState } from '@/lib/types';

// Dynamic import to avoid SSR issues
let WebContainer: typeof import('@webcontainer/api').WebContainer | null = null;

export type TestResult = {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration?: number;
  error?: string;
};

export function useWebContainer() {
  const containerRef = useRef<InstanceType<typeof import('@webcontainer/api').WebContainer> | null>(null);
  const [state, setState] = useState<WebContainerState>({ status: 'idle' });
  const [terminalOutput, setTerminalOutput] = useState<TerminalLine[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const bootingRef = useRef(false);
  // Callback for real-time line streaming to parent
  const onLineRef = useRef<((line: string) => void) | null>(null);

  const addTerminalLine = useCallback((type: TerminalLine['type'], content: string) => {
    setTerminalOutput(prev => [...prev, { type, content, timestamp: Date.now() }]);
    // Stream to parent in real-time
    if (onLineRef.current) onLineRef.current(content);
  }, []);

  // Register a callback for real-time terminal streaming
  const onTerminalLine = useCallback((cb: ((line: string) => void) | null) => {
    onLineRef.current = cb;
  }, []);

  // Boot WebContainer
  const boot = useCallback(async () => {
    if (containerRef.current || bootingRef.current) return containerRef.current;
    bootingRef.current = true;

    try {
      setState({ status: 'booting' });
      addTerminalLine('info', '⚡ Booting WebContainer...');

      if (!WebContainer) {
        const mod = await import('@webcontainer/api');
        WebContainer = mod.WebContainer;
      }

      const instance = await WebContainer.boot();
      containerRef.current = instance;

      // Listen for server-ready event (when dev server starts)
      instance.on('server-ready', (_port: number, url: string) => {
        setPreviewUrl(url);
        addTerminalLine('info', `✅ Dev server ready at ${url}`);
      });

      // Listen for errors
      instance.on('error', (err: { message: string }) => {
        addTerminalLine('error', `❌ ${err.message}`);
      });

      setState({ status: 'ready' });
      addTerminalLine('info', '✅ WebContainer ready');
      return instance;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to boot WebContainer';
      setState({ status: 'error', error: message });
      addTerminalLine('error', `❌ ${message}`);
      bootingRef.current = false;
      return null;
    }
  }, [addTerminalLine]);

  // Mount files into WebContainer
  const mountFiles = useCallback(async (files: VirtualFS) => {
    const instance = containerRef.current || await boot();
    if (!instance) return;

    // Convert VirtualFS to WebContainer FileSystemTree
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tree: any = {};
    for (const [path, file] of Object.entries(files)) {
      const parts = path.split('/');
      let current = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = { directory: {} };
        }
        current = current[parts[i]].directory;
      }
      const fileName = parts[parts.length - 1];
      current[fileName] = { file: { contents: file.content } };
    }

    await instance.mount(tree);
    addTerminalLine('info', `📁 Mounted ${Object.keys(files).length} files`);
  }, [boot, addTerminalLine]);

  // Run a command in WebContainer — returns exit code + collected output
  const runCommand = useCallback(async (command: string, args: string[] = []): Promise<number> => {
    const instance = containerRef.current || await boot();
    if (!instance) return 1;

    addTerminalLine('input', `$ ${command} ${args.join(' ')}`);

    const process = await instance.spawn(command, args);

    // Stream stdout in real-time
    const stdoutReader = process.output.getReader();
    (async () => {
      while (true) {
        const { done, value } = await stdoutReader.read();
        if (done) break;
        // Split by newlines and emit each line
        const lines = value.split('\n');
        for (const line of lines) {
          if (line.trim()) addTerminalLine('output', line);
        }
      }
    })();

    const exitCode = await process.exit;
    if (exitCode !== 0) {
      addTerminalLine('error', `Process exited with code ${exitCode}`);
    }
    return exitCode;
  }, [boot, addTerminalLine]);

  // Run a command and collect all output as a string
  const runCommandCollect = useCallback(async (command: string, args: string[] = []): Promise<{ code: number; output: string }> => {
    const instance = containerRef.current || await boot();
    if (!instance) return { code: 1, output: '' };

    addTerminalLine('input', `$ ${command} ${args.join(' ')}`);
    const process = await instance.spawn(command, args);
    const chunks: string[] = [];

    const reader = process.output.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      const lines = value.split('\n');
      for (const line of lines) {
        if (line.trim()) addTerminalLine('output', line);
      }
    }

    const exitCode = await process.exit;
    return { code: exitCode, output: chunks.join('') };
  }, [boot, addTerminalLine]);

  // Install dependencies
  const installDeps = useCallback(async () => {
    addTerminalLine('info', '📦 Installing dependencies...');
    const code = await runCommand('npm', ['install']);
    if (code === 0) {
      addTerminalLine('info', '✅ Dependencies installed');
    }
    return code;
  }, [runCommand, addTerminalLine]);

  // Start dev server
  const startDevServer = useCallback(async () => {
    addTerminalLine('info', '🚀 Starting dev server...');
    // Don't await — dev server runs indefinitely
    runCommand('npm', ['run', 'dev']);
  }, [runCommand, addTerminalLine]);

  // Full workflow: mount → install → dev
  const runProject = useCallback(async (files: VirtualFS) => {
    await mountFiles(files);
    const installCode = await installDeps();
    if (installCode === 0) {
      await startDevServer();
    }
  }, [mountFiles, installDeps, startDevServer]);

  // Write a single file (hot-reload: WebContainer's dev server detects changes)
  const writeFile = useCallback(async (path: string, content: string) => {
    const instance = containerRef.current;
    if (!instance) return;
    // Ensure parent directories exist
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/');
      try { await instance.fs.mkdir(dir, { recursive: true }); } catch { /* exists */ }
    }
    await instance.fs.writeFile(path, content);
  }, []);

  // Run tests (vitest/jest) and parse results
  const runTests = useCallback(async (testFile?: string): Promise<{ results: TestResult[]; raw: string; exitCode: number }> => {
    addTerminalLine('info', '🧪 Running tests...');
    const args = ['run', 'test', '--', '--reporter=verbose', '--run'];
    if (testFile) args.push(testFile);
    const { code, output } = await runCommandCollect('npm', args);

    // Parse test results from vitest/jest verbose output
    const results: TestResult[] = [];
    const lines = output.split('\n');
    for (const line of lines) {
      const passMatch = line.match(/✓|✅|PASS|√/);
      const failMatch = line.match(/✗|✕|❌|FAIL|×/);
      const skipMatch = line.match(/⊘|⊘|SKIP|-/);
      const nameMatch = line.match(/(?:✓|✅|PASS|√|✗|✕|❌|FAIL|×|⊘|SKIP|-)\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/);
      if (nameMatch) {
        results.push({
          name: nameMatch[1].trim(),
          status: passMatch ? 'pass' : failMatch ? 'fail' : skipMatch ? 'skip' : 'pass',
          duration: nameMatch[2] ? parseInt(nameMatch[2]) : undefined,
        });
      }
    }

    // If no results parsed, try fallback: look for summary line
    if (results.length === 0) {
      const summaryMatch = output.match(/Tests:\s+(\d+)\s+passed.*?(\d+)\s+failed/i) ||
        output.match(/(\d+)\s+passed/i);
      if (summaryMatch) {
        results.push({ name: `${summaryMatch[1]} test(s) passed`, status: 'pass' });
      }
    }

    addTerminalLine('info', `🧪 Tests done: ${results.filter(r => r.status === 'pass').length} passed, ${results.filter(r => r.status === 'fail').length} failed`);
    return { results, raw: output, exitCode: code };
  }, [runCommandCollect, addTerminalLine]);

  // Start a backend server (Express/Fastify/etc.)
  const startBackendServer = useCallback(async (scriptOrCommand?: string) => {
    addTerminalLine('info', '🖥️ Starting backend server...');
    if (scriptOrCommand) {
      // Custom command like "node server.js" or "npm run start"
      const parts = scriptOrCommand.trim().split(/\s+/);
      runCommand(parts[0], parts.slice(1));
    } else {
      // Try npm start, then node server.js, then node index.js
      runCommand('npm', ['start']);
    }
  }, [runCommand, addTerminalLine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      containerRef.current?.teardown();
      containerRef.current = null;
      bootingRef.current = false;
    };
  }, []);

  return {
    state,
    previewUrl,
    terminalOutput,
    boot,
    mountFiles,
    runCommand,
    runCommandCollect,
    installDeps,
    startDevServer,
    runProject,
    writeFile,
    runTests,
    startBackendServer,
    onTerminalLine,
    clearTerminal: () => setTerminalOutput([]),
  };
}
