import { MODELS } from '@/lib/cdn-models';
import { PROVIDER_LABELS } from '@/lib/page-helpers';
import type { VirtualFS } from '@/lib/types';

export interface CommandEntry {
  id: string;
  label: string;
  shortcut: string;
  category: string;
  action: () => void;
}

export interface CommandContext {
  // State (read-only)
  projectFiles: VirtualFS;
  selectedFile: string;
  projects: { id: string }[];
  showTerminal: boolean;
  showChat: boolean;
  isEditMode: boolean;
  showDiffView: boolean;
  showStitchPanel: boolean;
  splitFile: string | null;
  isLandscape: boolean;
  minimapEnabled: boolean;
  wordWrapEnabled: boolean;

  // Panel actions
  panelActions: {
    setPanel: (key: string, value: boolean) => void;
    togglePanel: (key: string) => void;
  };

  // Setters
  setProjectFiles: (fn: (prev: VirtualFS) => VirtualFS) => void;
  setSelectedFile: (f: string) => void;
  setActiveTab: (t: 'app' | 'code' | 'database' | 'payments' | 'ide') => void;
  setFileSearchQuery: (q: string) => void;
  setContentSearchQuery: (q: string) => void;
  setIsEditMode: (fn: (prev: boolean) => boolean) => void;
  setDeviceMode: (m: 'desktop' | 'tablet' | 'mobile') => void;
  setSplitFile: (f: string | null) => void;
  setPreviewZoom: (z: number) => void;
  setIsLandscape: (fn: (prev: boolean) => boolean) => void;
  setShowStitchPanel: (fn: (prev: boolean) => boolean) => void;
  setSeoTitle: (t: string) => void;
  setSeoDescription: (d: string) => void;
  setSeoOgImage: (i: string) => void;
  setPreviewDarkMode: (fn: (prev: 'dark' | 'auto' | 'light') => 'dark' | 'auto' | 'light') => void;
  setBreakpointTestActive: (fn: (prev: boolean) => boolean) => void;
  setLayoutDebugActive: (fn: (prev: boolean) => boolean) => void;
  setGridFlexDebugActive: (fn: (prev: boolean) => boolean) => void;
  setGitTab: (t: 'commits' | 'branches' | 'remote' | 'stash') => void;
  setOnboardingStep: (n: number) => void;
  setNewFileName: (n: string) => void;
  setGotoLineValue: (v: string) => void;
  setDbViewMode: (m: 'templates' | 'query' | 'schema' | 'history') => void;
  setModel: (m: string) => void;
  setOutputFramework: (f: 'html' | 'react' | 'nextjs' | 'vue' | 'svelte' | 'angular' | 'python' | 'fullstack') => void;
  setShowCloneModal: (b: boolean) => void;
  setMinimapEnabled: (fn: (prev: boolean) => boolean) => void;
  setWordWrapEnabled: (fn: (prev: boolean) => boolean) => void;

  // Callbacks
  downloadProjectZip: () => void;
  createProject: (name: string) => void;
  deployToVercel: () => void;
  vfsUndo: () => void;
  vfsRedo: () => void;
  clearChat: () => void;
  formatCurrentFile: () => void;
  openPreviewNewTab: () => void;
  copyPreviewHtml: () => void;
  detectLanguage: (name: string) => string;
  newConversation: () => void;
  saveCurrentConversation: () => void;
  addBookmark: (file: string, content: string) => void;
  shareProjectUrl: () => void;
  explainCurrentCode: () => void;
  capturePreviewScreenshot: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  minifyProject: () => void;
  exportSingleHtml: () => void;
  runA11yAudit: () => void;
  runPerfAudit: () => void;
  saveSnippet: (name: string, code: string) => void;
  copyPreviewAsImage: () => void;
  gitStashSave: () => void;
  generateAndRunTests: () => void;
  runTestsInContainer: () => void;
  scaffoldFrameworkProject: (fw: 'html' | 'react' | 'nextjs' | 'vue' | 'svelte' | 'angular' | 'python' | 'fullstack') => void;
  runAICodeReview: () => void;
  startCollabRoom: () => void;
  formatCode: () => void;
  toggleBookmark: () => void;
  exportProjectZip: () => void;
  webContainer: {
    boot: () => Promise<any>;
    installDeps: () => Promise<any>;
    startDevServer: () => void;
    startBackendServer: () => void;
  };

  // Refs
  findInputRef: React.RefObject<HTMLInputElement | null>;
  newFileInputRef: React.RefObject<HTMLInputElement | null>;
  gotoLineRef: React.RefObject<HTMLInputElement | null>;
  monacoEditorRef: React.RefObject<any>;
}

export function buildCommandList(ctx: CommandContext): CommandEntry[] {
  const {
    projectFiles, selectedFile, projects, showTerminal, showChat, isEditMode, showDiffView,
    splitFile, isLandscape, minimapEnabled, wordWrapEnabled,
    panelActions, setProjectFiles, setSelectedFile, setActiveTab, setFileSearchQuery,
    setContentSearchQuery, setIsEditMode, setDeviceMode, setSplitFile, setPreviewZoom,
    setIsLandscape, setShowStitchPanel, setSeoTitle, setSeoDescription, setSeoOgImage,
    setPreviewDarkMode, setBreakpointTestActive, setLayoutDebugActive, setGridFlexDebugActive,
    setGitTab, setOnboardingStep, setNewFileName, setGotoLineValue, setDbViewMode, setModel,
    setOutputFramework, setShowCloneModal, setMinimapEnabled, setWordWrapEnabled,
    downloadProjectZip, createProject, deployToVercel, vfsUndo, vfsRedo, clearChat,
    formatCurrentFile, openPreviewNewTab, copyPreviewHtml, detectLanguage, newConversation,
    saveCurrentConversation, addBookmark, shareProjectUrl, explainCurrentCode,
    capturePreviewScreenshot, showToast, minifyProject, exportSingleHtml, runA11yAudit,
    runPerfAudit, saveSnippet, copyPreviewAsImage, gitStashSave, generateAndRunTests,
    runTestsInContainer, scaffoldFrameworkProject, runAICodeReview, startCollabRoom,
    formatCode, toggleBookmark, exportProjectZip, webContainer,
    findInputRef, newFileInputRef, gotoLineRef, monacoEditorRef,
  } = ctx;

  return [
    // File operations
    { id: 'new-file', label: 'New File', shortcut: '', category: 'File', action: () => { const name = prompt('File name:'); if (name) { setProjectFiles(prev => ({ ...prev, [name]: { content: '', language: detectLanguage(name) } })); setSelectedFile(name); setActiveTab('code'); } } },
    { id: 'rename-file', label: 'Rename Current File', shortcut: '', category: 'File', action: () => { if (!selectedFile) return; const name = prompt('New name:', selectedFile); if (name && name !== selectedFile) { setProjectFiles(prev => { const next = { ...prev }; next[name] = { ...next[selectedFile], language: detectLanguage(name) }; delete next[selectedFile]; return next; }); setSelectedFile(name); } } },
    { id: 'delete-file', label: 'Delete Current File', shortcut: '', category: 'File', action: () => { if (!selectedFile) return; const files = Object.keys(projectFiles); if (files.length <= 1) return; setProjectFiles(prev => { const next = { ...prev }; delete next[selectedFile]; return next; }); setSelectedFile(files.find(f => f !== selectedFile) || 'index.html'); } },
    { id: 'duplicate-file', label: 'Duplicate Current File', shortcut: '', category: 'File', action: () => { if (!selectedFile || !projectFiles[selectedFile]) return; const ext = selectedFile.lastIndexOf('.'); const newName = ext > 0 ? selectedFile.slice(0, ext) + '-copy' + selectedFile.slice(ext) : selectedFile + '-copy'; setProjectFiles(prev => ({ ...prev, [newName]: { ...prev[selectedFile] } })); setSelectedFile(newName); } },
    { id: 'file-search', label: 'Go to File', shortcut: '⌘P', category: 'File', action: () => { panelActions.setPanel('showFileSearch', true); setFileSearchQuery(''); } },
    { id: 'content-search', label: 'Search in Files', shortcut: '⌘⇧F', category: 'File', action: () => { panelActions.setPanel('showContentSearch', true); setContentSearchQuery(''); } },
    // Project
    { id: 'new-project', label: 'New Project', shortcut: '', category: 'Project', action: () => createProject('Project ' + (projects.length + 1)) },
    { id: 'templates', label: 'Start from Template', shortcut: '', category: 'Project', action: () => panelActions.setPanel('showTemplates', true) },
    { id: 'download', label: 'Download as ZIP', shortcut: '⌘D', category: 'Project', action: () => downloadProjectZip() },
    // View
    { id: 'toggle-terminal', label: showTerminal ? 'Hide Terminal' : 'Show Terminal', shortcut: '⌘`', category: 'View', action: () => panelActions.togglePanel('showTerminal') },
    { id: 'toggle-chat', label: showChat ? 'Hide Chat' : 'Show Chat', shortcut: '⌘B', category: 'View', action: () => panelActions.togglePanel('showChat') },
    { id: 'toggle-edit', label: isEditMode ? 'Exit Visual Editor' : 'Visual Editor Mode', shortcut: '⌘E', category: 'View', action: () => setIsEditMode(prev => !prev) },
    { id: 'diff-view', label: showDiffView ? 'Exit Diff View' : 'Show Diff View', shortcut: '', category: 'View', action: () => panelActions.togglePanel('showDiffView') },
    { id: 'env-panel', label: 'Manage Environment Variables', shortcut: '', category: 'View', action: () => panelActions.setPanel('showEnvPanel', true) },
    { id: 'integrations', label: 'Toggle Integrations', shortcut: '', category: 'View', action: () => panelActions.togglePanel('showIntegrations') },
    { id: 'stitch', label: 'Google Stitch Panel', shortcut: '', category: 'View', action: () => setShowStitchPanel(prev => !prev) },
    { id: 'tab-app', label: 'Switch to App Tab', shortcut: '⌘1', category: 'View', action: () => setActiveTab('app') },
    { id: 'tab-code', label: 'Switch to Code Tab', shortcut: '⌘2', category: 'View', action: () => setActiveTab('code') },
    { id: 'tab-db', label: 'Switch to Database Tab', shortcut: '⌘3', category: 'View', action: () => setActiveTab('database') },
    { id: 'tab-pay', label: 'Switch to Payments Tab', shortcut: '⌘4', category: 'View', action: () => setActiveTab('payments') },
    { id: 'tab-ide', label: 'Switch to IDE Tab', shortcut: '⌘5', category: 'View', action: () => setActiveTab('ide') },
    { id: 'device-desktop', label: 'Desktop Preview', shortcut: '', category: 'View', action: () => setDeviceMode('desktop') },
    { id: 'device-tablet', label: 'Tablet Preview', shortcut: '', category: 'View', action: () => setDeviceMode('tablet') },
    { id: 'device-mobile', label: 'Mobile Preview', shortcut: '', category: 'View', action: () => setDeviceMode('mobile') },
    // Deploy
    { id: 'deploy', label: 'Deploy to Vercel', shortcut: '', category: 'Deploy', action: () => deployToVercel() },
    { id: 'github', label: 'Push to GitHub', shortcut: '', category: 'Deploy', action: () => panelActions.setPanel('showGitHubModal', true) },
    { id: 'clone', label: 'Clone Website', shortcut: '', category: 'Deploy', action: () => setShowCloneModal(true) },
    { id: 'backend-gen', label: 'Generate Backend', shortcut: '', category: 'Deploy', action: () => panelActions.setPanel('showBackendGenerator', true) },
    { id: 'db-connect', label: 'Database: Connect', shortcut: '', category: 'View', action: () => { setActiveTab('database'); setDbViewMode('query'); } },
    { id: 'db-schema', label: 'Database: Browse Schema', shortcut: '', category: 'View', action: () => { setActiveTab('database'); setDbViewMode('schema'); } },
    // Edit
    { id: 'undo', label: 'Undo (VFS)', shortcut: '⌘Z', category: 'Edit', action: () => vfsUndo() },
    { id: 'redo', label: 'Redo (VFS)', shortcut: '⌘⇧Z', category: 'Edit', action: () => vfsRedo() },
    { id: 'clear-chat', label: 'Clear Chat', shortcut: '', category: 'Edit', action: () => clearChat() },
    { id: 'media-gallery', label: 'Media Gallery', shortcut: '', category: 'View', action: () => panelActions.setPanel('showMediaGallery', true) },
    // Format & Components
    { id: 'format', label: 'Format Document', shortcut: '⌘⇧P', category: 'Edit', action: () => formatCurrentFile() },
    { id: 'components', label: 'Insert Component', shortcut: '', category: 'Edit', action: () => panelActions.setPanel('showComponentPalette', true) },
    { id: 'split-view', label: splitFile ? 'Close Split View' : 'Split Editor', shortcut: '', category: 'View', action: () => { if (splitFile) { setSplitFile(null); } else { const files = Object.keys(projectFiles).filter(f => f !== selectedFile); if (files.length > 0) setSplitFile(files[0]); } } },
    { id: 'open-new-tab', label: 'Open Preview in New Tab', shortcut: '', category: 'View', action: () => openPreviewNewTab() },
    { id: 'copy-html', label: 'Copy Preview HTML', shortcut: '', category: 'Edit', action: () => copyPreviewHtml() },
    { id: 'zoom-reset', label: 'Reset Preview Zoom', shortcut: '', category: 'View', action: () => setPreviewZoom(100) },
    { id: 'landscape', label: isLandscape ? 'Portrait Mode' : 'Landscape Mode', shortcut: '', category: 'View', action: () => setIsLandscape(prev => !prev) },
    // History & Bookmarks
    { id: 'conversation-history', label: 'Conversation History', shortcut: '⌘H', category: 'Chat', action: () => panelActions.setPanel('showConversationHistory', true) },
    { id: 'new-conversation', label: 'New Conversation', shortcut: '', category: 'Chat', action: () => newConversation() },
    { id: 'save-conversation', label: 'Save Conversation', shortcut: '', category: 'Chat', action: () => saveCurrentConversation() },
    { id: 'bookmarks', label: 'Code Bookmarks', shortcut: '', category: 'Edit', action: () => panelActions.setPanel('showBookmarks', true) },
    { id: 'add-bookmark', label: 'Bookmark Selection', shortcut: '', category: 'Edit', action: () => { if (selectedFile && projectFiles[selectedFile]) addBookmark(selectedFile, projectFiles[selectedFile].content.slice(0, 500)); } },
    { id: 'prompt-templates', label: 'Prompt Templates', shortcut: '', category: 'Chat', action: () => panelActions.setPanel('showPromptTemplates', true) },
    { id: 'version-timeline', label: 'Version Timeline', shortcut: '', category: 'View', action: () => panelActions.setPanel('showVersionTimeline', true) },
    // Find & Replace, Shortcuts, Themes
    { id: 'find-replace', label: 'Find & Replace in Files', shortcut: '⌘⇧H', category: 'Edit', action: () => { panelActions.setPanel('showFindReplace', true); setTimeout(() => findInputRef.current?.focus(), 50); } },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', shortcut: '⌘/', category: 'Help', action: () => panelActions.setPanel('showShortcuts', true) },
    { id: 'theme', label: 'Change Editor Theme', shortcut: '', category: 'View', action: () => panelActions.setPanel('showThemeSelector', true) },
    { id: 'explain-code', label: 'AI Explain Current File', shortcut: '', category: 'Chat', action: () => explainCurrentCode() },
    { id: 'screenshot', label: 'Screenshot Preview', shortcut: '', category: 'View', action: () => capturePreviewScreenshot() },
    { id: 'new-file-quick', label: 'Quick New File', shortcut: '', category: 'File', action: () => { panelActions.setPanel('showNewFileInput', true); setNewFileName(''); setTimeout(() => newFileInputRef.current?.focus(), 50); } },
    { id: 'share-url', label: 'Share Project via URL', shortcut: '', category: 'Project', action: () => shareProjectUrl() },
    { id: 'toggle-minimap', label: minimapEnabled ? 'Hide Minimap' : 'Show Minimap', shortcut: '', category: 'View', action: () => setMinimapEnabled(p => !p) },
    { id: 'toggle-wordwrap', label: wordWrapEnabled ? 'Disable Word Wrap' : 'Enable Word Wrap', shortcut: '', category: 'View', action: () => setWordWrapEnabled(p => !p) },
    { id: 'color-picker', label: 'Color Picker', shortcut: '', category: 'Edit', action: () => panelActions.setPanel('showColorPicker', true) },
    { id: 'goto-line', label: 'Go to Line', shortcut: '⌘G', category: 'Edit', action: () => { panelActions.setPanel('showGotoLine', true); setGotoLineValue(''); setTimeout(() => gotoLineRef.current?.focus(), 50); } },
    // Emmet Snippets
    { id: 'emmet-html5', label: 'Emmet: HTML5 Boilerplate', shortcut: '', category: 'Snippets', action: () => { if (selectedFile) setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>' } })); showToast('Inserted HTML5 boilerplate', 'success'); } },
    { id: 'emmet-flexbox', label: 'Emmet: Flexbox Container', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<div class="flex items-center justify-center gap-4">\n  <div>Item 1</div>\n  <div>Item 2</div>\n  <div>Item 3</div>\n</div>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted flexbox container', 'success'); } } },
    { id: 'emmet-grid', label: 'Emmet: CSS Grid', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<div class="grid grid-cols-3 gap-4">\n  <div>Cell 1</div>\n  <div>Cell 2</div>\n  <div>Cell 3</div>\n  <div>Cell 4</div>\n  <div>Cell 5</div>\n  <div>Cell 6</div>\n</div>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted CSS grid', 'success'); } } },
    { id: 'emmet-form', label: 'Emmet: Form with Inputs', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<form class="space-y-4 max-w-md mx-auto">\n  <div>\n    <label class="block text-sm font-medium mb-1">Name</label>\n    <input type="text" class="w-full px-3 py-2 border rounded-lg" placeholder="Your name" />\n  </div>\n  <div>\n    <label class="block text-sm font-medium mb-1">Email</label>\n    <input type="email" class="w-full px-3 py-2 border rounded-lg" placeholder="your@email.com" />\n  </div>\n  <button type="submit" class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Submit</button>\n</form>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted form', 'success'); } } },
    { id: 'emmet-nav', label: 'Emmet: Navigation Bar', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<nav class="flex items-center justify-between px-6 py-4 bg-white shadow-sm">\n  <a href="#" class="text-xl font-bold">Logo</a>\n  <div class="flex items-center gap-6">\n    <a href="#" class="text-gray-600 hover:text-black">Home</a>\n    <a href="#" class="text-gray-600 hover:text-black">About</a>\n    <a href="#" class="text-gray-600 hover:text-black">Contact</a>\n    <button class="px-4 py-2 bg-black text-white rounded-lg">Sign up</button>\n  </div>\n</nav>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted navbar', 'success'); } } },
    { id: 'emmet-card', label: 'Emmet: Card Component', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<div class="bg-white rounded-xl shadow-lg overflow-hidden max-w-sm">\n  <div class="h-48 bg-gray-200"></div>\n  <div class="p-6">\n    <h3 class="text-lg font-semibold mb-2">Card Title</h3>\n    <p class="text-gray-600 text-sm">Card description goes here with some sample text.</p>\n    <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Learn More</button>\n  </div>\n</div>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted card', 'success'); } } },
    { id: 'emmet-hero', label: 'Emmet: Hero Section', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<section class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 text-white">\n  <div class="text-center max-w-2xl px-4">\n    <h1 class="text-5xl font-bold mb-6">Welcome to Our Site</h1>\n    <p class="text-xl opacity-90 mb-8">Build something amazing with modern web technologies.</p>\n    <div class="flex gap-4 justify-center">\n      <button class="px-8 py-3 bg-white text-blue-600 rounded-full font-medium hover:shadow-lg">Get Started</button>\n      <button class="px-8 py-3 border-2 border-white rounded-full font-medium hover:bg-white/10">Learn More</button>\n    </div>\n  </div>\n</section>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted hero section', 'success'); } } },
    { id: 'emmet-footer', label: 'Emmet: Footer', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<footer class="bg-gray-900 text-gray-400 py-12 px-6">\n  <div class="max-w-6xl mx-auto grid grid-cols-4 gap-8">\n    <div><h3 class="text-white font-semibold mb-4">Company</h3><p class="text-sm">Making the web better, one pixel at a time.</p></div>\n    <div><h3 class="text-white font-semibold mb-4">Links</h3><ul class="space-y-2 text-sm"><li><a href="#" class="hover:text-white">Home</a></li><li><a href="#" class="hover:text-white">About</a></li><li><a href="#" class="hover:text-white">Blog</a></li></ul></div>\n    <div><h3 class="text-white font-semibold mb-4">Support</h3><ul class="space-y-2 text-sm"><li><a href="#" class="hover:text-white">FAQ</a></li><li><a href="#" class="hover:text-white">Contact</a></li></ul></div>\n    <div><h3 class="text-white font-semibold mb-4">Social</h3><ul class="space-y-2 text-sm"><li><a href="#" class="hover:text-white">Twitter</a></li><li><a href="#" class="hover:text-white">GitHub</a></li></ul></div>\n  </div>\n  <div class="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-sm text-center">© 2026 Company. All rights reserved.</div>\n</footer>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted footer', 'success'); } } },
    { id: 'breakpoint-ruler', label: 'Toggle Breakpoint Ruler', shortcut: '', category: 'View', action: () => panelActions.togglePanel('showBreakpointRuler') },
    { id: 'a11y-audit', label: 'Run Accessibility Audit', shortcut: '', category: 'Tools', action: () => runA11yAudit() },
    { id: 'seo-editor', label: 'Open SEO Meta Editor', shortcut: '', category: 'Tools', action: () => { const html = projectFiles['index.html']?.content || ''; const tMatch = html.match(/<title>([^<]*)<\/title>/i); const dMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i); const oMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i); setSeoTitle(tMatch?.[1] || ''); setSeoDescription(dMatch?.[1] || ''); setSeoOgImage(oMatch?.[1] || ''); panelActions.setPanel('showSeoPanel', true); } },
    { id: 'tailwind-browser', label: 'Open Tailwind Classes Browser', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showTailwindPanel', true) },
    { id: 'color-palette', label: 'Extract Color Palette', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showColorPalettePanel', true) },
    { id: 'perf-audit', label: 'Run Performance Audit', shortcut: '', category: 'Tools', action: () => runPerfAudit() },
    { id: 'project-stats', label: 'Show Project Statistics', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showStatsPanel', true) },
    { id: 'css-vars', label: 'CSS Variables Manager', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showCssVarsPanel', true) },
    { id: 'console-panel', label: 'Toggle Console Output', shortcut: '', category: 'View', action: () => panelActions.togglePanel('showConsolePanel') },
    { id: 'insert-region', label: 'Insert Code Region', shortcut: '', category: 'Editor', action: () => { const ed = monacoEditorRef.current as any; if (ed) { const pos = ed.getPosition(); if (pos) { const model = ed.getModel(); if (model) { const indent = '  '; model.pushEditOperations([], [{ range: { startLineNumber: pos.lineNumber, startColumn: 1, endLineNumber: pos.lineNumber, endColumn: 1 }, text: `${indent}// #region MyRegion\n${indent}\n${indent}// #endregion\n` }], () => null); } } showToast('Region markers inserted', 'success'); } } },
    { id: 'dep-inspector', label: 'Dependency Inspector', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showDepsPanel', true) },
    { id: 'code-complexity', label: 'Code Complexity Analyzer', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showComplexityPanel', true) },
    { id: 'minify-project', label: 'Minify All Files', shortcut: '', category: 'Tools', action: () => minifyProject() },
    { id: 'split-preview', label: 'Toggle Split Preview (Desktop + Mobile)', shortcut: '', category: 'View', action: () => panelActions.togglePanel('showSplitPreview') },
    { id: 'wrap-div', label: 'Wrap Selection in <div>', shortcut: '', category: 'Editor', action: () => { const ed = monacoEditorRef.current as any; if (ed) { const sel = ed.getSelection(); const model = ed.getModel(); if (sel && model) { const text = model.getValueInRange(sel); model.pushEditOperations([], [{ range: sel, text: `<div>\n  ${text}\n</div>` }], () => null); showToast('Wrapped in <div>', 'success'); } } } },
    { id: 'toggle-comments', label: 'Toggle HTML Comment', shortcut: '', category: 'Editor', action: () => { const ed = monacoEditorRef.current as any; if (ed) { const sel = ed.getSelection(); const model = ed.getModel(); if (sel && model) { const text = model.getValueInRange(sel); const newText = text.startsWith('<!--') ? text.replace(/^<!--\s*/, '').replace(/\s*-->$/, '') : `<!-- ${text} -->`; model.pushEditOperations([], [{ range: sel, text: newText }], () => null); showToast('Comment toggled', 'success'); } } } },
    { id: 'code-outline', label: 'Code Outline / Symbols', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showOutlinePanel', true) },
    { id: 'image-optimizer', label: 'Image Size Analyzer', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showImageOptPanel', true) },
    { id: 'export-single-html', label: 'Export as Single HTML', shortcut: '', category: 'Project', action: () => exportSingleHtml() },
    { id: 'diff-stats', label: 'Code Diff Statistics', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showDiffStatsPanel', true) },
    { id: 'breakpoint-test', label: 'Responsive Breakpoint Tester', shortcut: '', category: 'View', action: () => setBreakpointTestActive(p => !p) },
    { id: 'network-panel', label: 'Network / API Calls', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showNetworkPanel', true) },
    { id: 'html-validator', label: 'HTML Validator', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showHtmlValidatorPanel', true) },
    { id: 'font-inspector', label: 'Font Inspector', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showFontPanel', true) },
    { id: 'snippets-manager', label: 'Code Snippets Manager', shortcut: '', category: 'Edit', action: () => panelActions.setPanel('showSnippetsPanel', true) },
    { id: 'save-snippet', label: 'Save Selection as Snippet', shortcut: '', category: 'Edit', action: () => { const ed = monacoEditorRef.current as any; if (ed) { const sel = ed.getSelection(); const model = ed.getModel(); if (sel && model) { const text = model.getValueInRange(sel); if (text) { const name = prompt('Snippet name:'); if (name) saveSnippet(name, text); } } } } },
    { id: 'layout-debug', label: 'Toggle Layout Debugger', shortcut: '', category: 'View', action: () => setLayoutDebugActive(p => !p) },
    { id: 'preview-dark', label: 'Preview: Force Dark Mode', shortcut: '', category: 'View', action: () => setPreviewDarkMode(p => p === 'dark' ? 'auto' : 'dark') },
    { id: 'preview-light', label: 'Preview: Force Light Mode', shortcut: '', category: 'View', action: () => setPreviewDarkMode(p => p === 'light' ? 'auto' : 'light') },
    { id: 'file-treemap', label: 'File Size Treemap', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showTreemapPanel', true) },
    { id: 'unused-css', label: 'Unused CSS Detector', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showUnusedCssPanel', true) },
    { id: 'link-checker', label: 'Link Checker', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showLinkCheckerPanel', true) },
    { id: 'dom-tree', label: 'DOM Tree Viewer', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showDomTreePanel', true) },
    { id: 'meta-editor', label: 'Meta Tag Editor', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showMetaEditorPanel', true) },
    { id: 'format-code', label: 'Format / Prettify Code', shortcut: '⇧⌥F', category: 'Edit', action: () => formatCode() },
    { id: 'shortcuts-ref', label: 'Keyboard Shortcuts', shortcut: '', category: 'Help', action: () => panelActions.setPanel('showShortcutsRef', true) },
    { id: 'grid-flex-debug', label: 'Toggle Grid/Flex Visualizer', shortcut: '', category: 'View', action: () => setGridFlexDebugActive(p => !p) },
    { id: 'toggle-bookmark', label: 'Toggle Line Bookmark', shortcut: '⌘F2', category: 'Edit', action: () => toggleBookmark() },
    { id: 'contrast-checker', label: 'Color Contrast Checker (WCAG)', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showContrastPanel', true) },
    { id: 'z-index-map', label: 'Z-Index Map', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showZIndexPanel', true) },
    { id: 'todo-scanner', label: 'TODO/FIXME Scanner', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showTodoScanPanel', true) },
    { id: 'copy-preview-image', label: 'Copy Preview as Image', shortcut: '', category: 'Project', action: () => copyPreviewAsImage() },
    { id: 'regex-tester', label: 'Regex Tester', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showRegexPanel', true) },
    { id: 'css-specificity', label: 'CSS Specificity Calculator', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showSpecificityPanel', true) },
    { id: 'lazy-images', label: 'Image Lazy Loading Checker', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showLazyImgPanel', true) },
    { id: 'text-stats', label: 'Text Statistics', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showTextStatsPanel', true) },
    { id: 'duplicate-code', label: 'Duplicate Code Detector', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showDuplicatePanel', true) },
    { id: 'element-counter', label: 'Element Counter', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showElementCountPanel', true) },
    { id: 'console-filter', label: 'Console Filter & Export', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showConsoleFilter', true) },
    { id: 'color-edit', label: 'Inline Color Picker', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showColorEdit', true) },
    { id: 'fold-map', label: 'Code Folding Map', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showFoldMap', true) },
    { id: 'dep-graph', label: 'Dependency Graph', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showDepGraph', true) },
    { id: 'perf-budget', label: 'Performance Budget', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showPerfBudget', true) },
    { id: 'responsive-grid', label: 'Responsive Preview Grid', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showResponsiveGrid', true) },
    { id: 'css-animations', label: 'CSS Animation Inspector', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showAnimPanel', true) },
    { id: 'event-audit', label: 'Event Listener Audit', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showEventAudit', true) },
    { id: 'og-preview', label: 'Open Graph Preview', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showOgPreview', true) },
    { id: 'semantic-html', label: 'Semantic HTML Checker', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showSemanticPanel', true) },
    { id: 'change-summary', label: 'File Change Summary', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showChangeSummary', true) },
    { id: 'whitespace-check', label: 'Whitespace/Indent Checker', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showWhitespacePanel', true) },
    { id: 'pwa-checker', label: 'PWA Checker', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showPwaPanel', true) },
    { id: 'schema-validator', label: 'Schema.org Validator', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showSchemaPanel', true) },
    { id: 'bundle-size', label: 'Bundle Size Estimator', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showBundlePanel', true) },
    { id: 'aria-inspector', label: 'ARIA Roles Inspector', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showAriaPanel', true) },
    { id: 'security-headers', label: 'Security Headers Check', shortcut: '', category: 'Tools', action: () => panelActions.setPanel('showSecurityPanel', true) },
    { id: 'export-zip', label: 'Export Project as ZIP', shortcut: '', category: 'Project', action: () => exportProjectZip() },
    // v23: Collaboration & Feedback
    { id: 'collab', label: 'Collaboration Room', shortcut: '', category: 'Collaborate', action: () => panelActions.setPanel('showCollabPanel', true) },
    { id: 'share-room', label: 'Create & Share Room', shortcut: '', category: 'Collaborate', action: () => { startCollabRoom(); panelActions.setPanel('showCollabPanel', true); } },
    { id: 'feedback', label: 'Send Feedback', shortcut: '', category: 'Help', action: () => panelActions.setPanel('showFeedbackPanel', true) },
    { id: 'changelog', label: "What's New (Changelog)", shortcut: '', category: 'Help', action: () => panelActions.setPanel('showChangelog', true) },
    { id: 'onboarding', label: 'Product Tour', shortcut: '', category: 'Help', action: () => { setOnboardingStep(0); panelActions.setPanel('showOnboarding', true); } },
    // v24: Advanced Builder Tools
    { id: 'visual-builder', label: 'Visual Drag & Drop Builder', shortcut: '', category: 'Builder', action: () => panelActions.setPanel('showVisualBuilder', true) },
    { id: 'anim-builder', label: 'Animation Timeline Builder', shortcut: '', category: 'Builder', action: () => panelActions.setPanel('showAnimBuilder', true) },
    { id: 'design-system', label: 'Design System Manager', shortcut: '', category: 'Design', action: () => panelActions.setPanel('showDesignSystem', true) },
    { id: 'api-tester', label: 'REST API Tester', shortcut: '', category: 'Developer', action: () => panelActions.setPanel('showApiTester', true) },
    { id: 'git-panel', label: 'Git Branch Manager', shortcut: '', category: 'Git', action: () => panelActions.setPanel('showGitPanel', true) },
    { id: 'git-commit', label: 'Git Commit Changes', shortcut: '', category: 'Git', action: () => { panelActions.setPanel('showGitPanel', true); setGitTab('commits'); } },
    { id: 'git-stash', label: 'Git Stash Changes', shortcut: '', category: 'Git', action: () => gitStashSave() },
    { id: 'screenshot-analyzer', label: 'AI Screenshot to Code', shortcut: '', category: 'AI', action: () => panelActions.setPanel('showScreenshotAnalyzer', true) },
    // Figma Import
    { id: 'figma-import', label: 'Import from Figma', shortcut: '', category: 'AI', action: () => panelActions.setPanel('showFigmaPanel', true) },
    // Test Generation & Runner
    { id: 'test-gen', label: 'Generate & Run Tests', shortcut: '', category: 'Testing', action: () => { panelActions.setPanel('showTestRunner', true); generateAndRunTests(); } },
    { id: 'test-runner', label: 'Open Test Runner', shortcut: '', category: 'Testing', action: () => panelActions.setPanel('showTestRunner', true) },
    { id: 'run-tests', label: 'Run All Tests in WebContainer', shortcut: '', category: 'Testing', action: () => { panelActions.setPanel('showTestRunner', true); runTestsInContainer(); } },
    // Framework
    { id: 'framework-html', label: 'Set Output: HTML (Vanilla)', shortcut: '', category: 'Framework', action: () => { setOutputFramework('html'); showToast('Framework: HTML', 'info'); } },
    { id: 'framework-react', label: 'Set Output: React + shadcn/ui', shortcut: '', category: 'Framework', action: () => { setOutputFramework('react'); showToast('Framework: React', 'info'); } },
    { id: 'framework-nextjs', label: 'Set Output: Next.js App Router', shortcut: '', category: 'Framework', action: () => { setOutputFramework('nextjs'); showToast('Framework: Next.js', 'info'); } },
    { id: 'framework-vue', label: 'Set Output: Vue 3', shortcut: '', category: 'Framework', action: () => { setOutputFramework('vue'); showToast('Framework: Vue', 'info'); } },
    { id: 'framework-svelte', label: 'Set Output: Svelte', shortcut: '', category: 'Framework', action: () => { setOutputFramework('svelte'); showToast('Framework: Svelte', 'info'); } },
    { id: 'framework-angular', label: 'Set Output: Angular 17+', shortcut: '', category: 'Framework', action: () => { setOutputFramework('angular'); showToast('Framework: Angular', 'info'); } },
    { id: 'framework-python', label: 'Set Output: Python FastAPI', shortcut: '', category: 'Framework', action: () => { setOutputFramework('python'); showToast('Framework: Python', 'info'); } },
    { id: 'framework-fullstack', label: 'Set Output: Full-Stack (React + Express)', shortcut: '', category: 'Framework', action: () => { setOutputFramework('fullstack'); showToast('Framework: Full-Stack', 'info'); } },
    // Scaffold full projects
    { id: 'scaffold-react', label: 'Scaffold React + Vite + Tailwind Project', shortcut: '', category: 'Framework', action: () => scaffoldFrameworkProject('react') },
    { id: 'scaffold-nextjs', label: 'Scaffold Next.js App Router Project', shortcut: '', category: 'Framework', action: () => scaffoldFrameworkProject('nextjs') },
    { id: 'scaffold-vue', label: 'Scaffold Vue 3 + Vite Project', shortcut: '', category: 'Framework', action: () => scaffoldFrameworkProject('vue') },
    { id: 'scaffold-svelte', label: 'Scaffold Svelte + Vite Project', shortcut: '', category: 'Framework', action: () => scaffoldFrameworkProject('svelte') },
    { id: 'scaffold-angular', label: 'Scaffold Angular 17 Project', shortcut: '', category: 'Framework', action: () => scaffoldFrameworkProject('angular') },
    { id: 'scaffold-python', label: 'Scaffold Python FastAPI Project', shortcut: '', category: 'Framework', action: () => scaffoldFrameworkProject('python') },
    { id: 'scaffold-fullstack', label: 'Scaffold Full-Stack (React + Express)', shortcut: '', category: 'Framework', action: () => scaffoldFrameworkProject('fullstack') },
    { id: 'scaffold-html', label: 'Scaffold HTML + Tailwind Project', shortcut: '', category: 'Framework', action: () => scaffoldFrameworkProject('html') },
    // AI Code Review
    { id: 'code-review', label: 'AI Code Review (Current File)', shortcut: '', category: 'AI', action: () => runAICodeReview() },
    // Backend / WebContainer
    { id: 'wc-boot', label: 'Boot WebContainer Runtime', shortcut: '', category: 'Runtime', action: async () => { await webContainer.boot(); showToast('WebContainer booted', 'success'); } },
    { id: 'wc-install', label: 'npm install (WebContainer)', shortcut: '', category: 'Runtime', action: async () => { showToast('Installing...', 'info'); await webContainer.installDeps(); showToast('Dependencies installed', 'success'); } },
    { id: 'wc-dev', label: 'npm run dev (WebContainer)', shortcut: '', category: 'Runtime', action: () => { webContainer.startDevServer(); showToast('Dev server starting...', 'info'); } },
    { id: 'wc-start-backend', label: 'Start Backend Server (node)', shortcut: '', category: 'Runtime', action: () => { webContainer.startBackendServer(); showToast('Backend server starting...', 'info'); } },
    // Git History
    { id: 'git-history', label: 'View Git Commit History', shortcut: '', category: 'Git', action: () => { panelActions.setPanel('showGitPanel', true); setGitTab('commits'); } },
    { id: 'git-branches', label: 'Browse Git Branches', shortcut: '', category: 'Git', action: () => { panelActions.setPanel('showGitPanel', true); setGitTab('branches'); } },
    { id: 'git-remote', label: 'Git Remote: Repos, PRs & Merge', shortcut: '', category: 'Git', action: () => { panelActions.setPanel('showGitPanel', true); setGitTab('remote'); } },
    { id: 'git-create-pr', label: 'Create Pull Request', shortcut: '', category: 'Git', action: () => { panelActions.setPanel('showGitPanel', true); setGitTab('remote'); } },
    // Models
    ...MODELS.map(m => ({ id: `model-${m.id}`, label: `Switch to ${m.name} (${PROVIDER_LABELS[m.provider] || m.provider})`, shortcut: '', category: 'Model', action: () => setModel(m.id) })),
  ];
}

export function filterCommands(list: CommandEntry[], query: string): CommandEntry[] {
  if (!query) return list;
  const q = query.toLowerCase();
  return list.filter(c => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
}
