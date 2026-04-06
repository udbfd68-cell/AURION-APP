'use client';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { idbGet, idbSet, detectLanguage } from '@/lib/client-utils';
import type { Message } from '@/lib/client-utils';
import { useWebContainer } from '@/hooks/useWebContainer';
import { SANDBOX_EMAILS, SANDBOX_MESSAGES } from '@/lib/page-helpers';

type ProjectFile = { content: string; language: string };
type VirtualFS = Record<string, ProjectFile>;

export function useWorkspace(
  projectFiles: VirtualFS,
  setProjectFiles: (v: VirtualFS | ((prev: VirtualFS) => VirtualFS)) => void,
  selectedFile: string,
  setSelectedFile: (f: string) => void,
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
  panelActions: { setPanel: (name: string, value: boolean) => void; togglePanel: (name: string) => void },
  githubToken: string,
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>,
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>,
  setActiveTab: React.Dispatch<React.SetStateAction<'app' | 'code' | 'database' | 'payments' | 'ide'>>,
  setInput: (v: string) => void,
  model: string,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  openTabs: string[],
  activeTab: string,
  input: string,
  isStreaming: boolean,
  autoSaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  setAutoSaveStatus: React.Dispatch<React.SetStateAction<'saved' | 'unsaved' | 'saving'>>,
  openFile: (file: string) => void,
  setAttachedImagesRef: React.MutableRefObject<React.Dispatch<React.SetStateAction<{ name: string; data: string; type: string }[]>> | null>,
) {
  // Version History (VFS snapshots)
  const [vfsHistory, setVfsHistory] = useState<VirtualFS[]>([]);
  const [vfsHistoryIdx, setVfsHistoryIdx] = useState(-1);
  const vfsSnapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // v21: File Change Summary (declared after vfsHistory)
  
  const changeSummary = useMemo(() => {
    if (vfsHistoryIdx < 1) return null;
    const prev = vfsHistory[vfsHistoryIdx - 1];
    const curr = projectFiles;
    const added = Object.keys(curr).filter(k => !prev[k]);
    const removed = Object.keys(prev).filter(k => !curr[k]);
    const modified = Object.keys(curr).filter(k => prev[k] && prev[k].content !== curr[k].content);
    const totalLinesAdded = modified.reduce((a, k) => {
      const oldLines = prev[k].content.split('\n').length;
      const newLines = curr[k].content.split('\n').length;
      return a + Math.max(0, newLines - oldLines);
    }, 0);
    const totalLinesRemoved = modified.reduce((a, k) => {
      const oldLines = prev[k].content.split('\n').length;
      const newLines = curr[k].content.split('\n').length;
      return a + Math.max(0, oldLines - newLines);
    }, 0);
    return { added, removed, modified, totalLinesAdded, totalLinesRemoved };
  }, [projectFiles, vfsHistory, vfsHistoryIdx]);

  // Snapshot VFS on every change (debounced)
  useEffect(() => {
    if (Object.keys(projectFiles).length === 0) return;
    if (vfsSnapshotTimer.current) clearTimeout(vfsSnapshotTimer.current);
    vfsSnapshotTimer.current = setTimeout(() => {
      setVfsHistory(prev => {
        const trimmed = prev.slice(0, vfsHistoryIdx + 1);
        // Don't snapshot if identical to latest
        if (trimmed.length > 0 && JSON.stringify(trimmed[trimmed.length - 1]) === JSON.stringify(projectFiles)) return prev;
        const next = [...trimmed, structuredClone(projectFiles)].slice(-50); // max 50 snapshots
        setVfsHistoryIdx(next.length - 1);
        return next;
      });
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFiles]);

  // Auto-save status indicator
  useEffect(() => {
    if (Object.keys(projectFiles).length === 0) return;
    setAutoSaveStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saving');
      setTimeout(() => setAutoSaveStatus('saved'), 400);
    }, 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFiles]);

  // Sync open tabs when new files appear (AI generates files)
  useEffect(() => {
    const fileKeys = Object.keys(projectFiles);
    if (fileKeys.length > 0) {
      setOpenTabs(prev => {
        const valid = prev.filter(f => projectFiles[f]);
        // Add any new files that aren't in tabs yet (from AI generation)
        const newFiles = fileKeys.filter(f => !valid.includes(f));
        const updated = [...valid, ...newFiles];
        return updated.length > 0 ? updated : ['index.html'];
      });
    }
  }, [projectFiles]);

  // v15: Code Diff Stats (computed after vfsHistory is declared)
  const diffStats = useMemo(() => {
    if (vfsHistory.length < 2) return [];
    const first = vfsHistory[0];
    const current = projectFiles;
    const stats: { file: string; added: number; removed: number; status: string }[] = [];
    const allFiles = new Set([...Object.keys(first), ...Object.keys(current)]);
    allFiles.forEach(file => {
      const oldLines = (first[file]?.content || '').split('\n');
      const newLines = (current[file]?.content || '').split('\n');
      if (!first[file]) { stats.push({ file, added: newLines.length, removed: 0, status: 'added' }); }
      else if (!current[file]) { stats.push({ file, added: 0, removed: oldLines.length, status: 'deleted' }); }
      else {
        const added = newLines.filter(l => !oldLines.includes(l)).length;
        const removed = oldLines.filter(l => !newLines.includes(l)).length;
        if (added > 0 || removed > 0) stats.push({ file, added, removed, status: 'modified' });
      }
    });
    return stats.sort((a, b) => (b.added + b.removed) - (a.added + a.removed));
  }, [projectFiles, vfsHistory]);

  const vfsUndo = useCallback(() => {
    if (vfsHistoryIdx <= 0) return;
    const newIdx = vfsHistoryIdx - 1;
    setVfsHistoryIdx(newIdx);
    setProjectFiles(vfsHistory[newIdx]);
  }, [vfsHistory, vfsHistoryIdx]);

  const vfsRedo = useCallback(() => {
    if (vfsHistoryIdx >= vfsHistory.length - 1) return;
    const newIdx = vfsHistoryIdx + 1;
    setVfsHistoryIdx(newIdx);
    setProjectFiles(vfsHistory[newIdx]);
  }, [vfsHistory, vfsHistoryIdx]);

  // GitHub push state
  const [isGitHubPushing, setIsGitHubPushing] = useState(false);

  // Multi-project
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([{ id: 'default', name: 'My Project' }]);
  const [currentProjectId, setCurrentProjectId] = useState('default');
  
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameProjectName, setRenameProjectName] = useState('');

  // File search (Cmd+P) / Content search (Cmd+Shift+F)
  
  
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const fileSearchRef = useRef<HTMLInputElement>(null);
  const contentSearchRef = useRef<HTMLInputElement>(null);

  // Templates
  

  // Diff view
  

  // .env management
  
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  // Command palette (Cmd+K)
  
  const [commandQuery, setCommandQuery] = useState('');
  const [commandIdx, setCommandIdx] = useState(0);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop
  const [isDragOver, setIsDragOver] = useState(false);

  // WebContainer for real code execution
  const webContainer = useWebContainer();
  const [wcInstalling, setWcInstalling] = useState(false);
  const [wcInstallProgress, setWcInstallProgress] = useState('');

  // Auto-boot WebContainer when package.json appears in VFS (real Node.js runtime)
  const webContainerBootedRef = useRef(false);
  useEffect(() => {
    if (webContainerBootedRef.current) return;
    if (!projectFiles['package.json']) return;
    if (isStreaming) return; // Wait until streaming is done
    webContainerBootedRef.current = true;
    (async () => {
      try {
        setWcInstalling(true);
        setWcInstallProgress('Booting WebContainer...');
        setTerminalLines(prev => [...prev, '$ WebContainer: booting...']);
        await webContainer.mountFiles(projectFiles);
        setWcInstallProgress('Installing dependencies...');
        setTerminalLines(prev => [...prev, '$ npm install']);

        // Parse package.json to show what's being installed
        try {
          const pkg = JSON.parse(projectFiles['package.json'].content);
          const deps = Object.keys(pkg.dependencies || {});
          const devDeps = Object.keys(pkg.devDependencies || {});
          if (deps.length) setTerminalLines(prev => [...prev, `  Dependencies: ${deps.join(', ')}`]);
          if (devDeps.length) setTerminalLines(prev => [...prev, `  DevDependencies: ${devDeps.join(', ')}`]);
          setWcInstallProgress(`Installing ${deps.length + devDeps.length} packages...`);
        } catch {}

        const code = await webContainer.installDeps();
        if (code === 0) {
          setWcInstallProgress('Starting dev server...');
          setTerminalLines(prev => [...prev, '$ npm run dev']);
          await webContainer.startDevServer();
          setWcInstallProgress('');
        } else {
          setWcInstallProgress('Install failed');
          setTerminalLines(prev => [...prev, '$ WebContainer: install failed']);
        }
      } catch {
        webContainerBootedRef.current = false;
        setWcInstallProgress('');
      } finally {
        setWcInstalling(false);
      }
    })();
  }, [projectFiles, isStreaming, webContainer]);

  // Real-time terminal streaming from WebContainer → terminalLines
  useEffect(() => {
    webContainer.onTerminalLine((line: string) => {
      setTerminalLines(prev => [...prev, line]);
    });
    return () => { webContainer.onTerminalLine(null); };
  }, [webContainer]);

  // Hot-reload: when user edits a file, write it to WebContainer for live update
  const prevFilesRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (webContainer.state.status !== 'ready') return;
    for (const [path, file] of Object.entries(projectFiles)) {
      if (prevFilesRef.current[path] !== file.content) {
        webContainer.writeFile(path, file.content);
      }
    }
    prevFilesRef.current = Object.fromEntries(Object.entries(projectFiles).map(([k, v]) => [k, v.content]));
  }, [projectFiles, webContainer]);

  // Framework selector for design-to-code — React is the default (like v0, bolt, lovable)
  const [outputFramework, setOutputFramework] = useState<'html' | 'react' | 'nextjs' | 'vue' | 'svelte' | 'angular' | 'python' | 'fullstack'>('react');

  // Framework project scaffolding — generate proper project structures
  const scaffoldFrameworkProject = useCallback((fw: 'html' | 'react' | 'nextjs' | 'vue' | 'svelte' | 'angular' | 'python' | 'fullstack') => {
    const templates: Record<string, Record<string, { content: string; language: string }>> = {
      react: {
        'package.json': { content: JSON.stringify({ name: 'aurion-react-app', private: true, version: '0.0.0', type: 'module', scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' }, dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' }, devDependencies: { '@types/react': '^18.2.0', '@types/react-dom': '^18.2.0', '@vitejs/plugin-react': '^4.0.0', autoprefixer: '^10.4.0', postcss: '^8.4.0', tailwindcss: '^3.4.0', typescript: '^5.0.0', vite: '^5.0.0' } }, null, 2), language: 'json' },
        'vite.config.ts': { content: `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n})\n`, language: 'typescript' },
        'tailwind.config.js': { content: `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],\n  theme: { extend: {} },\n  plugins: [],\n}\n`, language: 'javascript' },
        'postcss.config.js': { content: `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}\n`, language: 'javascript' },
        'tsconfig.json': { content: JSON.stringify({ compilerOptions: { target: 'ES2020', useDefineForClassFields: true, lib: ['ES2020', 'DOM', 'DOM.Iterable'], module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler', allowImportingTsExtensions: true, resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: 'react-jsx', strict: true }, include: ['src'] }, null, 2), language: 'json' },
        'index.html': { content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Aurion React App</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>\n`, language: 'html' },
        'src/main.tsx': { content: `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n)\n`, language: 'typescriptreact' },
        'src/App.tsx': { content: `export default function App() {\n  return (\n    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">\n      <div className="text-center">\n        <h1 className="text-4xl font-bold mb-4">Hello from Aurion</h1>\n        <p className="text-gray-400">Edit src/App.tsx to get started</p>\n      </div>\n    </div>\n  )\n}\n`, language: 'typescriptreact' },
        'src/index.css': { content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`, language: 'css' },
      },
      nextjs: {
        'package.json': { content: JSON.stringify({ name: 'aurion-nextjs-app', version: '0.1.0', private: true, scripts: { dev: 'next dev', build: 'next build', start: 'next start' }, dependencies: { next: '^14.0.0', react: '^18.2.0', 'react-dom': '^18.2.0' }, devDependencies: { '@types/node': '^20.0.0', '@types/react': '^18.2.0', '@types/react-dom': '^18.2.0', autoprefixer: '^10.4.0', postcss: '^8.4.0', tailwindcss: '^3.4.0', typescript: '^5.0.0' } }, null, 2), language: 'json' },
        'next.config.js': { content: `/** @type {import('next').NextConfig} */\nconst nextConfig = {}\nmodule.exports = nextConfig\n`, language: 'javascript' },
        'tailwind.config.ts': { content: `import type { Config } from 'tailwindcss'\n\nconst config: Config = {\n  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],\n  theme: { extend: {} },\n  plugins: [],\n}\nexport default config\n`, language: 'typescript' },
        'postcss.config.js': { content: `module.exports = {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}\n`, language: 'javascript' },
        'tsconfig.json': { content: JSON.stringify({ compilerOptions: { target: 'es5', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'preserve', incremental: true, plugins: [{ name: 'next' }], paths: { '@/*': ['./*'] } }, include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'], exclude: ['node_modules'] }, null, 2), language: 'json' },
        'app/layout.tsx': { content: `import type { Metadata } from 'next'\nimport './globals.css'\n\nexport const metadata: Metadata = {\n  title: 'Aurion Next.js App',\n  description: 'Built with Aurion',\n}\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  )\n}\n`, language: 'typescriptreact' },
        'app/page.tsx': { content: `export default function Home() {\n  return (\n    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">\n      <div className="text-center">\n        <h1 className="text-4xl font-bold mb-4">Hello from Aurion</h1>\n        <p className="text-gray-400">Edit app/page.tsx to get started</p>\n      </div>\n    </main>\n  )\n}\n`, language: 'typescriptreact' },
        'app/globals.css': { content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`, language: 'css' },
      },
      vue: {
        'package.json': { content: JSON.stringify({ name: 'aurion-vue-app', private: true, version: '0.0.0', type: 'module', scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' }, dependencies: { vue: '^3.3.0' }, devDependencies: { '@vitejs/plugin-vue': '^4.0.0', autoprefixer: '^10.4.0', postcss: '^8.4.0', tailwindcss: '^3.4.0', typescript: '^5.0.0', vite: '^5.0.0', 'vue-tsc': '^1.8.0' } }, null, 2), language: 'json' },
        'vite.config.ts': { content: `import { defineConfig } from 'vite'\nimport vue from '@vitejs/plugin-vue'\n\nexport default defineConfig({\n  plugins: [vue()],\n})\n`, language: 'typescript' },
        'tailwind.config.js': { content: `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],\n  theme: { extend: {} },\n  plugins: [],\n}\n`, language: 'javascript' },
        'postcss.config.js': { content: `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}\n`, language: 'javascript' },
        'index.html': { content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Aurion Vue App</title>\n</head>\n<body>\n  <div id="app"></div>\n  <script type="module" src="/src/main.ts"></script>\n</body>\n</html>\n`, language: 'html' },
        'src/main.ts': { content: `import { createApp } from 'vue'\nimport App from './App.vue'\nimport './style.css'\n\ncreateApp(App).mount('#app')\n`, language: 'typescript' },
        'src/App.vue': { content: `<script setup lang="ts">\nimport { ref } from 'vue'\nconst count = ref(0)\n</script>\n\n<template>\n  <div class="min-h-screen bg-gray-950 text-white flex items-center justify-center">\n    <div class="text-center">\n      <h1 class="text-4xl font-bold mb-4">Hello from Aurion</h1>\n      <p class="text-gray-400">Edit src/App.vue to get started</p>\n      <button @click="count++" class="mt-4 px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500 transition">Count: {{ count }}</button>\n    </div>\n  </div>\n</template>\n`, language: 'vue' },
        'src/style.css': { content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`, language: 'css' },
      },
      html: {
        'index.html': { content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Aurion Project</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="min-h-screen bg-gray-950 text-white">\n  <div class="flex items-center justify-center min-h-screen">\n    <div class="text-center">\n      <h1 class="text-4xl font-bold mb-4">Hello from Aurion</h1>\n      <p class="text-gray-400">Edit index.html to get started</p>\n    </div>\n  </div>\n</body>\n</html>\n`, language: 'html' },
        'style.css': { content: `/* Custom styles */\n`, language: 'css' },
        'script.js': { content: `// Your JavaScript here\nconsole.log('Aurion project ready');\n`, language: 'javascript' },
      },
      svelte: {
        'package.json': { content: JSON.stringify({ name: 'aurion-svelte-app', private: true, version: '0.0.0', type: 'module', scripts: { dev: 'vite dev', build: 'vite build', preview: 'vite preview' }, devDependencies: { '@sveltejs/vite-plugin-svelte': '^3.0.0', svelte: '^4.2.0', vite: '^5.0.0', autoprefixer: '^10.4.0', postcss: '^8.4.0', tailwindcss: '^3.4.0' } }, null, 2), language: 'json' },
        'vite.config.js': { content: `import { defineConfig } from 'vite'\nimport { svelte } from '@sveltejs/vite-plugin-svelte'\n\nexport default defineConfig({\n  plugins: [svelte()],\n})\n`, language: 'javascript' },
        'tailwind.config.js': { content: `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./src/**/*.{html,js,svelte,ts}'],\n  theme: { extend: {} },\n  plugins: [],\n}\n`, language: 'javascript' },
        'index.html': { content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Aurion Svelte App</title>\n</head>\n<body>\n  <div id="app"></div>\n  <script type="module" src="/src/main.js"></script>\n</body>\n</html>\n`, language: 'html' },
        'src/main.js': { content: `import App from './App.svelte'\nimport './app.css'\n\nconst app = new App({ target: document.getElementById('app') })\nexport default app\n`, language: 'javascript' },
        'src/App.svelte': { content: `<script>\n  let count = 0\n</script>\n\n<main class="min-h-screen bg-gray-950 text-white flex items-center justify-center">\n  <div class="text-center">\n    <h1 class="text-4xl font-bold mb-4">Hello from Aurion</h1>\n    <p class="text-gray-400">Edit src/App.svelte to get started</p>\n    <button on:click={() => count++} class="mt-4 px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500 transition">Count: {count}</button>\n  </div>\n</main>\n\n<style>\n  @tailwind base;\n  @tailwind components;\n  @tailwind utilities;\n</style>\n`, language: 'svelte' },
        'src/app.css': { content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`, language: 'css' },
      },
      angular: {
        'package.json': { content: JSON.stringify({ name: 'aurion-angular-app', version: '0.0.0', scripts: { ng: 'ng', start: 'ng serve', build: 'ng build' }, dependencies: { '@angular/animations': '^17.0.0', '@angular/common': '^17.0.0', '@angular/compiler': '^17.0.0', '@angular/core': '^17.0.0', '@angular/forms': '^17.0.0', '@angular/platform-browser': '^17.0.0', '@angular/platform-browser-dynamic': '^17.0.0', '@angular/router': '^17.0.0', rxjs: '~7.8.0', tslib: '^2.3.0', 'zone.js': '~0.14.0' }, devDependencies: { '@angular-devkit/build-angular': '^17.0.0', '@angular/cli': '^17.0.0', '@angular/compiler-cli': '^17.0.0', typescript: '~5.2.0' } }, null, 2), language: 'json' },
        'src/app/app.component.ts': { content: `import { Component } from '@angular/core';\nimport { CommonModule } from '@angular/common';\n\n@Component({\n  selector: 'app-root',\n  standalone: true,\n  imports: [CommonModule],\n  template: \`\n    <main class="min-h-screen bg-gray-950 text-white flex items-center justify-center">\n      <div class="text-center">\n        <h1 class="text-4xl font-bold mb-4">Hello from Aurion</h1>\n        <p class="text-gray-400">Edit src/app/app.component.ts</p>\n      </div>\n    </main>\n  \`,\n})\nexport class AppComponent {}\n`, language: 'typescript' },
        'src/main.ts': { content: `import { bootstrapApplication } from '@angular/platform-browser';\nimport { AppComponent } from './app/app.component';\n\nbootstrapApplication(AppComponent).catch(err => console.error(err));\n`, language: 'typescript' },
        'src/styles.css': { content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`, language: 'css' },
        'tsconfig.json': { content: JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ES2022', lib: ['ES2022', 'dom'], skipLibCheck: true, strict: true, forceConsistentCasingInFileNames: true, esModuleInterop: true, moduleResolution: 'bundler', experimentalDecorators: true }, angularCompilerOptions: { strictInjectionParameters: true, strictTemplates: true } }, null, 2), language: 'json' },
      },
      python: {
        'main.py': { content: `"""Aurion Python App — FastAPI backend"""\nfrom fastapi import FastAPI, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom pydantic import BaseModel\nimport uvicorn\n\napp = FastAPI(title="Aurion API", version="1.0.0")\napp.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])\n\n@app.get("/")\ndef root():\n    return {"message": "Hello from Aurion", "status": "running"}\n\nif __name__ == "__main__":\n    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)\n`, language: 'python' },
        'requirements.txt': { content: `fastapi>=0.104.0\nuvicorn[standard]>=0.24.0\npydantic>=2.0.0\npython-dotenv>=1.0.0\n`, language: 'plaintext' },
        'Dockerfile': { content: `FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]\n`, language: 'dockerfile' },
        '.env': { content: `# Environment variables\nDATABASE_URL=sqlite:///./app.db\nSECRET_KEY=change-me-in-production\n`, language: 'plaintext' },
      },
      fullstack: {
        'package.json': { content: JSON.stringify({ name: 'aurion-fullstack', private: true, version: '0.0.0', type: 'module', scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview', 'dev:server': 'tsx watch server/index.ts' }, dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' }, devDependencies: { '@types/react': '^18.2.0', '@types/react-dom': '^18.2.0', '@vitejs/plugin-react': '^4.0.0', autoprefixer: '^10.4.0', postcss: '^8.4.0', tailwindcss: '^3.4.0', typescript: '^5.0.0', vite: '^5.0.0', tsx: '^4.0.0', express: '^4.18.0', '@types/express': '^4.17.0' } }, null, 2), language: 'json' },
        'vite.config.ts': { content: `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { proxy: { '/api': 'http://localhost:3001' } },\n})\n`, language: 'typescript' },
        'server/index.ts': { content: `import express from 'express';\nconst app = express();\napp.use(express.json());\n\napp.get('/api/health', (req, res) => res.json({ status: 'ok' }));\n\napp.listen(3001, () => console.log('API server on :3001'));\n`, language: 'typescript' },
        'src/main.tsx': { content: `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App'\nimport './index.css'\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n)\n`, language: 'typescriptreact' },
        'src/App.tsx': { content: `import { useState, useEffect } from 'react'\n\nexport default function App() {\n  const [status, setStatus] = useState('loading...')\n  useEffect(() => {\n    fetch('/api/health').then(r => r.json()).then(d => setStatus(d.status)).catch(() => setStatus('API offline'))\n  }, [])\n  return (\n    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">\n      <div className="text-center">\n        <h1 className="text-4xl font-bold mb-4">Aurion Full-Stack</h1>\n        <p className="text-gray-400">Frontend + Express API</p>\n        <p className="mt-2 text-sm text-emerald-400">API status: {status}</p>\n      </div>\n    </div>\n  )\n}\n`, language: 'typescriptreact' },
        'src/index.css': { content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`, language: 'css' },
        'tailwind.config.js': { content: `export default {\n  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],\n  theme: { extend: {} },\n  plugins: [],\n}\n`, language: 'javascript' },
        'index.html': { content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Aurion Full-Stack</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>\n`, language: 'html' },
      },
    };
    const files = templates[fw];
    if (files) {
      setProjectFiles(files);
      const mainFiles: Record<string, string> = {
        react: 'src/App.tsx', nextjs: 'app/page.tsx', vue: 'src/App.vue',
        svelte: 'src/App.svelte', angular: 'src/app/app.component.ts',
        python: 'main.py', fullstack: 'src/App.tsx', html: 'index.html',
      };
      const fwLabels: Record<string, string> = {
        react: 'React', nextjs: 'Next.js', vue: 'Vue 3', svelte: 'Svelte',
        angular: 'Angular 17', python: 'Python FastAPI', fullstack: 'Full-Stack (React + Express)', html: 'HTML',
      };
      setSelectedFile(mainFiles[fw] || 'index.html');
      setOutputFramework(fw);
      showToast(`Scaffolded ${fwLabels[fw] || fw} project (${Object.keys(files).length} files)`, 'success');
    }
  }, [showToast]);

  // Test runner state
  
  const [testResults, setTestResults] = useState<{ name: string; status: 'pass' | 'fail' | 'skip'; duration?: number; error?: string }[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [testRawOutput, setTestRawOutput] = useState('');
  const [testFile, setTestFile] = useState('');

  // Run tests via WebContainer
  const runTestsInContainer = useCallback(async (file?: string) => {
    setTestRunning(true);
    setTestResults([]);
    setTestRawOutput('');
    try {
      if (webContainer.state.status !== 'ready') {
        // Boot and install first
        await webContainer.mountFiles(projectFiles);
        await webContainer.installDeps();
      }
      const { results, raw, exitCode } = await webContainer.runTests(file);
      setTestResults(results);
      setTestRawOutput(raw);
      if (exitCode === 0) {
        showToast(`Tests passed: ${results.filter(r => r.status === 'pass').length}/${results.length}`, 'success');
      } else {
        showToast(`Tests failed: ${results.filter(r => r.status === 'fail').length} failures`, 'error');
      }
    } catch (err) {
      showToast('Test runner error: ' + (err instanceof Error ? err.message : 'Unknown'), 'error');
    } finally {
      setTestRunning(false);
    }
  }, [webContainer, projectFiles, showToast]);

  // Generate + run tests for current file
  const generateAndRunTests = useCallback(async () => {
    if (!selectedFile || !projectFiles[selectedFile]) {
      showToast('No file selected', 'error');
      return;
    }
    setTestRunning(true);
    try {
      // Step 1: Generate tests via AI
      const code = projectFiles[selectedFile].content;
      const res = await fetch('/api/test-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          fileName: selectedFile,
          framework: 'vitest',
          language: selectedFile.endsWith('.ts') || selectedFile.endsWith('.tsx') ? 'typescript' : 'javascript',
        }),
      });
      if (!res.ok) throw new Error('Test generation failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let testCode = '', buf = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const p = line.slice(6);
            if (p === '[DONE]') break;
            try { const d = JSON.parse(p); if (d.text) testCode += d.text; } catch {}
          }
        }
      }

      // Extract code from markdown code block
      const codeMatch = testCode.match(/```(?:\w+)?\n([\s\S]*?)```/);
      const finalCode = codeMatch ? codeMatch[1] : testCode;

      const testFileName = selectedFile.replace(/\.(\w+)$/, '.test.$1');
      setProjectFiles(prev => ({ ...prev, [testFileName]: { content: finalCode, language: detectLanguage(testFileName) } }));
      setTestFile(testFileName);

      // Step 2: Run tests in WebContainer
      await runTestsInContainer(testFileName);
    } catch (err) {
      showToast('Test generation failed: ' + (err instanceof Error ? err.message : 'Unknown'), 'error');
    } finally {
      setTestRunning(false);
    }
  }, [selectedFile, projectFiles, runTestsInContainer, showToast]);

  // AI Code Review — sends current file to AI and streams review feedback
  const [codeReviewResult, setCodeReviewResult] = useState('');
  
  const [codeReviewLoading, setCodeReviewLoading] = useState(false);

  const runAICodeReview = useCallback(async () => {
    if (!selectedFile || !projectFiles[selectedFile]) {
      showToast('No file selected for review', 'error');
      return;
    }
    panelActions.setPanel('showCodeReview', true);
    setCodeReviewLoading(true);
    setCodeReviewResult('');
    try {
      const code = projectFiles[selectedFile].content;
      const reviewPrompt = `Review this code file "${selectedFile}" and provide:
1. **Issues** — bugs, security vulnerabilities, potential crashes
2. **Performance** — slow patterns, unnecessary re-renders, memory leaks
3. **Best Practices** — naming, structure, readability improvements
4. **Suggestions** — concrete refactoring proposals with code examples

Be concise and actionable. Use markdown formatting.

\`\`\`
${code}
\`\`\``;

      const res = await fetch('/api/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: reviewPrompt }], model: model }),
      });
      if (!res.ok) throw new Error('Review request failed');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = '', buf = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const p = line.slice(6);
            if (p === '[DONE]') break;
            try { const d = JSON.parse(p); if (d.text) { result += d.text; setCodeReviewResult(result); } } catch {}
          }
        }
      }
    } catch (err) {
      setCodeReviewResult('Code review failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setCodeReviewLoading(false);
    }
  }, [selectedFile, projectFiles, model, showToast]);

  // Media asset gallery (generated videos/images)
  const [mediaAssets, setMediaAssets] = useState<{ id: string; type: 'video' | 'image'; url: string; prompt: string; timestamp: number }[]>([]);
  

  // Runtime error forwarding from iframe preview
  const [runtimeErrors, setRuntimeErrors] = useState<{ message: string; source?: string; line?: number; col?: number; timestamp: number }[]>([]);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);

  // Persist project files to IndexedDB (debounced) — fast, 100MB+ capacity
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (Object.keys(projectFiles).length === 0) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      idbSet('vfs', projectFiles).catch(() => {
        // Fallback to localStorage
        try { localStorage.setItem('aurion_project_files', JSON.stringify(projectFiles)); } catch { /* ignore */ }
      });
    }, 800);
  }, [projectFiles]);

  // Load project files from IndexedDB on mount (fallback: localStorage)
  useEffect(() => {
    idbGet<VirtualFS>('vfs').then(saved => {
      if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        setProjectFiles(saved);
        setSelectedFile(Object.keys(saved)[0] || 'index.html');
      } else {
        // Fallback to localStorage (migration path)
        try {
          const ls = localStorage.getItem('aurion_project_files');
          if (ls) {
            const parsed = JSON.parse(ls) as VirtualFS;
            if (parsed && Object.keys(parsed).length > 0) {
              setProjectFiles(parsed);
              setSelectedFile(Object.keys(parsed)[0] || 'index.html');
              // Migrate to IndexedDB
              idbSet('vfs', parsed).catch(() => {});
            }
          }
        } catch { /* ignore */ }
      }
    }).catch(() => {
      try {
        const ls = localStorage.getItem('aurion_project_files');
        if (ls) {
          const parsed = JSON.parse(ls) as VirtualFS;
          if (parsed && Object.keys(parsed).length > 0) {
            setProjectFiles(parsed);
            setSelectedFile(Object.keys(parsed)[0] || 'index.html');
          }
        }
      } catch { /* ignore */ }
    });
  }, []);

  // Multi-project: persist project list + per-project VFS
  useEffect(() => {
    idbGet<{ id: string; name: string }[]>('projects_index').then(saved => {
      if (saved && saved.length > 0) {
        setProjects(saved);
        setCurrentProjectId(saved[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      idbSet('projects_index', projects).catch(() => {});
    }
  }, [projects]);

  // Conversation persistence — auto-save messages to IndexedDB
  useEffect(() => {
    if (messages.length > 0) {
      idbSet('aurion_messages', messages).catch(() => {
        try { localStorage.setItem('aurion_messages', JSON.stringify(messages)); } catch { /* ignore */ }
      });
    }
  }, [messages]);

  // Load saved conversation on mount
  useEffect(() => {
    idbGet<Message[]>('aurion_messages').then(saved => {
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setMessages(saved);
      }
    }).catch(() => {
      try {
        const ls = localStorage.getItem('aurion_messages');
        if (ls) { const parsed = JSON.parse(ls); if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed); }
      } catch { /* ignore */ }
    });
  }, []);

  // Persist VFS per project
  useEffect(() => {
    if (Object.keys(projectFiles).length === 0) return;
    idbSet(`vfs_${currentProjectId}`, projectFiles).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFiles]);

  // Persist chat messages per project (debounced)
  const msgPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (msgPersistTimer.current) clearTimeout(msgPersistTimer.current);
    msgPersistTimer.current = setTimeout(() => {
      idbSet(`msgs_${currentProjectId}`, messages).catch(() => {});
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Load messages from IDB on mount
  useEffect(() => {
    idbGet<Message[]>(`msgs_${currentProjectId}`).then(saved => {
      if (saved && saved.length > 0) setMessages(saved);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchProject = useCallback((id: string) => {
    // Save current project VFS + messages
    if (Object.keys(projectFiles).length > 0) {
      idbSet(`vfs_${currentProjectId}`, projectFiles).catch(() => {});
    }
    idbSet(`msgs_${currentProjectId}`, messages).catch(() => {});
    setCurrentProjectId(id);
    panelActions.setPanel('showProjectMenu', false);
    // Load target project VFS + messages
    idbGet<VirtualFS>(`vfs_${id}`).then(saved => {
      if (saved && Object.keys(saved).length > 0) {
        setProjectFiles(saved);
        setSelectedFile(Object.keys(saved)[0] || 'index.html');
      } else {
        setProjectFiles({});
        setSelectedFile('index.html');
      }
      setVfsHistory([]);
      setVfsHistoryIdx(-1);
    }).catch(() => {
      setProjectFiles({});
    });
    idbGet<Message[]>(`msgs_${id}`).then(saved => {
      setMessages(saved && saved.length > 0 ? saved : []);
    }).catch(() => {
      setMessages([]);
    });
  }, [currentProjectId, projectFiles, messages]);

  const createProject = useCallback((name: string, templateFiles?: VirtualFS) => {
    const id = 'proj_' + Date.now().toString(36);
    setProjects(prev => [...prev, { id, name }]);
    // Save current
    if (Object.keys(projectFiles).length > 0) {
      idbSet(`vfs_${currentProjectId}`, projectFiles).catch(() => {});
    }
    setCurrentProjectId(id);
    panelActions.setPanel('showProjectMenu', false);
    panelActions.setPanel('showTemplates', false);
    const files = templateFiles || {};
    setProjectFiles(files);
    setSelectedFile(Object.keys(files)[0] || 'index.html');
    setVfsHistory([]);
    setVfsHistoryIdx(-1);
    setMessages([]);
    if (Object.keys(files).length > 0) {
      idbSet(`vfs_${id}`, files).catch(() => {});
      setActiveTab('code');
    }
  }, [currentProjectId, projectFiles]);

  const deleteProject = useCallback((id: string) => {
    if (projects.length <= 1) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    idbSet(`vfs_${id}`, null).catch(() => {});
    idbSet(`msgs_${id}`, null).catch(() => {});
    if (currentProjectId === id) {
      const remaining = projects.filter(p => p.id !== id);
      if (remaining.length > 0) switchProject(remaining[0].id);
    }
  }, [projects, currentProjectId, switchProject]);

  // .env sync: populate envVars from .env file in VFS
  useEffect(() => {
    const envFile = projectFiles['.env'];
    if (envFile) {
      const vars = envFile.content.split('\n').filter(l => l.includes('=')).map(l => {
        const idx = l.indexOf('=');
        return { key: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() };
      });
      setEnvVars(vars);
    }
  }, [projectFiles]);

  // Supabase query state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseQuery, setSupabaseQuery] = useState('');
  const [supabaseTable, setSupabaseTable] = useState('');
  const [supabaseResult, setSupabaseResult] = useState<Record<string, unknown>[] | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);

  // Stripe state
  const [stripeBalance, setStripeBalance] = useState<{ available: number; pending: number } | null>(null);
  const [stripeProducts, setStripeProducts] = useState<unknown[]>([]);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);

  // Sandbox state
  const [sandboxDb, setSandboxDb] = useState(false);
  const [sandboxDbTable, setSandboxDbTable] = useState('users');
  const [sandboxPay, setSandboxPay] = useState(false);
  const [sandboxEmail, setSandboxEmail] = useState(false);
  const [sandboxEmailLog, setSandboxEmailLog] = useState(SANDBOX_EMAILS);
  const [sandboxEmailForm, setSandboxEmailForm] = useState({ to: '', subject: '', body: '' });
  const [sandboxMsg, setSandboxMsg] = useState(false);
  const [sandboxMsgLog, setSandboxMsgLog] = useState(SANDBOX_MESSAGES);
  const [sandboxMsgForm, setSandboxMsgForm] = useState({ channel: '', text: '', platform: 'Slack' });

  // Load supabaseUrl from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aurion_supabase_url');
      if (saved) setSupabaseUrl(saved);
    } catch { /* ignore */ }
  }, []);

  // Image attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
  const landingFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return; // 10MB max
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        setAttachedImagesRef.current?.(prev => [...prev, { name: file.name, data, type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, []);

  const removeImage = useCallback((idx: number) => {
    setAttachedImagesRef.current?.(prev => prev.filter((_, i: number) => i !== idx));
  }, []);

  // Drag & drop files into project
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files.length) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = () => {
          const data = reader.result as string;
          setProjectFiles(prev => ({
            ...prev,
            [`images/${file.name}`]: { content: data, language: 'plaintext' },
          }));
          setTerminalLines(prev => [...prev, `$ ✓ imported image: images/${file.name}`]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const content = reader.result as string;
          setProjectFiles(prev => ({
            ...prev,
            [file.name]: { content, language: detectLanguage(file.name) },
          }));
          setTerminalLines(prev => [...prev, `$ ✓ imported file: ${file.name}`]);
          openFile(file.name);
        };
        reader.readAsText(file);
      }
    });
    setActiveTab('code');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // .env helpers
  const syncEnvToVFS = useCallback((vars: { key: string; value: string }[]) => {
    const content = vars.map(v => `${v.key}=${v.value}`).join('\n');
    setProjectFiles(prev => ({
      ...prev,
      '.env': { content, language: 'bash' },
    }));
  }, []);

  const addEnvVar = useCallback(() => {
    if (!newEnvKey.trim()) return;
    const updated = [...envVars, { key: newEnvKey.trim(), value: newEnvValue }];
    setEnvVars(updated);
    syncEnvToVFS(updated);
    setNewEnvKey('');
    setNewEnvValue('');
  }, [newEnvKey, newEnvValue, envVars, syncEnvToVFS]);

  const removeEnvVar = useCallback((idx: number) => {
    const updated = envVars.filter((_, i) => i !== idx);
    setEnvVars(updated);
    syncEnvToVFS(updated);
  }, [envVars, syncEnvToVFS]);

  // Content search results
  const contentSearchResults = useMemo(() => {
    if (!contentSearchQuery.trim()) return [];
    const q = contentSearchQuery.toLowerCase();
    const results: { file: string; line: number; text: string }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      file.content.split('\n').forEach((line, i) => {
        if (line.toLowerCase().includes(q)) {
          results.push({ file: path, line: i + 1, text: line.trim() });
        }
      });
    }
    return results.slice(0, 50);
  }, [contentSearchQuery, projectFiles]);

  // File search results (fuzzy)
  const fileSearchResults = useMemo(() => {
    const q = fileSearchQuery.toLowerCase();
    return Object.keys(projectFiles).filter(f => {
      if (!q) return true;
      let qi = 0;
      for (let i = 0; i < f.length && qi < q.length; i++) {
        if (f[i].toLowerCase() === q[qi]) qi++;
      }
      return qi === q.length;
    }).slice(0, 20);
  }, [fileSearchQuery, projectFiles]);


  return {
    vfsHistory,
    setVfsHistory,
    vfsHistoryIdx,
    setVfsHistoryIdx,
    isGitHubPushing,
    setIsGitHubPushing,
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    renameProjectId,
    setRenameProjectId,
    renameProjectName,
    setRenameProjectName,
    fileSearchQuery,
    setFileSearchQuery,
    contentSearchQuery,
    setContentSearchQuery,
    envVars,
    setEnvVars,
    newEnvKey,
    setNewEnvKey,
    newEnvValue,
    setNewEnvValue,
    commandQuery,
    setCommandQuery,
    commandIdx,
    setCommandIdx,
    isDragOver,
    setIsDragOver,
    wcInstalling,
    setWcInstalling,
    wcInstallProgress,
    setWcInstallProgress,
    outputFramework,
    setOutputFramework,
    webContainer,
    testResults,
    setTestResults,
    testRunning,
    setTestRunning,
    testRawOutput,
    setTestRawOutput,
    testFile,
    setTestFile,
    codeReviewResult,
    setCodeReviewResult,
    codeReviewLoading,
    setCodeReviewLoading,
    mediaAssets,
    setMediaAssets,
    runtimeErrors,
    setRuntimeErrors,
    autoFixEnabled,
    setAutoFixEnabled,
    supabaseUrl,
    setSupabaseUrl,
    supabaseQuery,
    setSupabaseQuery,
    supabaseTable,
    setSupabaseTable,
    supabaseResult,
    setSupabaseResult,
    supabaseError,
    setSupabaseError,
    isSupabaseLoading,
    setIsSupabaseLoading,
    stripeBalance,
    setStripeBalance,
    stripeProducts,
    setStripeProducts,
    stripeError,
    setStripeError,
    isStripeLoading,
    setIsStripeLoading,
    sandboxDb,
    setSandboxDb,
    sandboxDbTable,
    setSandboxDbTable,
    sandboxPay,
    setSandboxPay,
    sandboxEmail,
    setSandboxEmail,
    sandboxEmailLog,
    setSandboxEmailLog,
    sandboxEmailForm,
    setSandboxEmailForm,
    sandboxMsg,
    setSandboxMsg,
    sandboxMsgLog,
    setSandboxMsgLog,
    sandboxMsgForm,
    setSandboxMsgForm,
    vfsUndo,
    vfsRedo,
    scaffoldFrameworkProject,
    runTestsInContainer,
    generateAndRunTests,
    runAICodeReview,
    switchProject,
    createProject,
    deleteProject,
    handleImageSelect,
    removeImage,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    syncEnvToVFS,
    addEnvVar,
    removeEnvVar,
    changeSummary,
    diffStats,
    contentSearchResults,
    fileSearchResults,
    vfsSnapshotTimer,
    fileSearchRef,
    contentSearchRef,
    commandInputRef,
    webContainerBootedRef,
    prevFilesRef,
    persistTimer,
    msgPersistTimer,
    fileInputRef,
    landingFileInputRef,
  };
}
