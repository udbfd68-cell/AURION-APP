"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import hljs from 'highlight.js';
import dynamic from 'next/dynamic';
import { useWebContainer } from '@/hooks/useWebContainer';
import { buildReactBitsContextSection } from '@/lib/system-prompts';
import { postProcessOutput } from '@/lib/claude-code-engine';
import { LiveDatabaseEngine, getDatabaseEngine, SCHEMA_TEMPLATES, SQL_KEYWORDS, type DBTable, type QueryResult, type QueryHistoryEntry } from '@/lib/database-live';
import { CollaborationEngine, getRandomCollabColor, getRandomUserName, type CollabUser as CollabUserFull, type CollabMessage, type CollabEvent } from '@/lib/collaboration-engine';
import { BackendGenerator, type BackendProject, type BackendFeature, type GeneratedFile } from '@/lib/backend-generator';

// Extracted modules
import { fetchWithRetry, idbGet, idbSet, detectLanguage, buildFileTree } from '@/lib/client-utils';
import type { Message, ProjectFile, VirtualFS } from '@/lib/client-utils';
import {
  REACT_CDN, TAILWIND_CDN, LUCIDE_CDN, RECHARTS_CDN, REACT_ROUTER_CDN, FRAMER_MOTION_CDN,
  PREMIUM_FONTS_CDN, GSAP_CDN, LENIS_CDN, FA_CDN, SHADCN_BASE_CSS, MODELS,
  assemblePreview,
} from '@/lib/cdn-models';
import {
  TAG_COLORS, PROVIDER_LABELS, PROVIDER_ICON, getApiEndpoint,
  VISION_MODELS, BEST_VISION_MODEL, getOptimalModel, generateId,
  extractPreviewHtml, extractAllCodeBlocks, CodeBlock, MarkdownContent, TypingIndicator,
  DesktopIcon, CodeIcon, MobileIcon, RefreshIcon, GlobeIcon, LinkIcon,
  DatabaseIcon, PaymentsIcon, DeployIcon, GitHubIcon, SettingsIcon, PlusIcon,
  ChevronDownIcon, ChevronUpIcon, CheckCircleIcon, FileIcon, getFileIcon, FolderIcon,
  INTEGRATIONS, SANDBOX_DB, SANDBOX_STRIPE, SANDBOX_EMAILS, SANDBOX_MESSAGES,
} from '@/lib/page-helpers';
import { TEMPLATES } from '@/lib/templates-data';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(m => m.default), { ssr: false, loading: () => <div className="flex-1 bg-[#1e1e1e]" /> });


/* ────────── DiffEditor dynamic import ────────── */
const MonacoDiffEditor = dynamic(() => import('@monaco-editor/react').then(m => m.DiffEditor), { ssr: false, loading: () => <div className="flex-1 bg-[#1e1e1e]" /> });

export default function HomePage() {
  // View state: landing → workspace
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [landingInput, setLandingInput] = useState('');
  const landingTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Generation memory — tracks what AI used to avoid repetition
  const [generationHistory, setGenerationHistory] = useState<{ font?: string; accent?: string; template?: string; ts: number }[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('aurion_gen_history') || '[]').slice(-5); } catch { return []; }
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState(MODELS[0].id);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A/B Model Comparison Mode
  const [abMode, setAbMode] = useState(false);
  const [abModelB, setAbModelB] = useState(MODELS[5].id); // second model for comparison
  const [abResultB, setAbResultB] = useState<string>('');
  const [abStreaming, setAbStreaming] = useState(false);
  const abAbortRef = useRef<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<'app' | 'code' | 'database' | 'payments' | 'ide'>('app');
  // IDE (code-server on Render) state
  const [ideServiceId, setIdeServiceId] = useState<string | null>(null);
  const [ideUrl, setIdeUrl] = useState<string | null>(null);
  const [ideLoading, setIdeLoading] = useState(false);
  const [ideError, setIdeError] = useState<string | null>(null);
  const [ideStatus, setIdeStatus] = useState<'none' | 'creating' | 'deploying' | 'booting' | 'live' | 'error'>('none');
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
              // Service is deployed on Render, now wait ~90s for code-server to fully boot
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
          } catch {}
        }, 8000);
        setTimeout(() => { if (idePollRef.current) clearInterval(idePollRef.current); setIdeError('Deployment timed out. Check Render dashboard.'); setIdeStatus('error'); setIdeLoading(false); }, 300000);
      } catch (err) {
        setIdeError((err as Error).message); setIdeStatus('error'); setIdeLoading(false);
      }
    })();
    return () => { if (idePollRef.current) clearInterval(idePollRef.current); };
  }, [activeTab]);

  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLandscape, setIsLandscape] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Right panel features
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalLines, setTerminalLines] = useState<string[]>(['$ aurion ready', '> Listening on port 3000']);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [repoName, setRepoName] = useState('');

  // ─── Google Stitch Integration ───
  const [showStitchPanel, setShowStitchPanel] = useState(false);
  const [stitchProjectId, setStitchProjectId] = useState('');
  const [stitchScreens, setStitchScreens] = useState<{ page: string; screenId: string; htmlUrl: string; imageUrl: string; html?: string }[]>([]);
  const [stitchLoading, setStitchLoading] = useState(false);
  const [stitchError, setStitchError] = useState<string | null>(null);
  const [stitchPrompt, setStitchPrompt] = useState('');
  const [stitchDesignSystem, setStitchDesignSystem] = useState('');
  const [stitchPages, setStitchPages] = useState<{ name: string; prompt: string }[]>([
    { name: 'Home', prompt: '' },
  ]);
  const [stitchMode, setStitchMode] = useState<'single' | 'loop'>('single');

  // Integration API keys (persisted in localStorage)
  const [integrationKeys, setIntegrationKeys] = useState<Record<string, string>>({});
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);

  // Load integration keys from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aurion_integration_keys');
      if (saved) setIntegrationKeys(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Persist integration keys to localStorage
  useEffect(() => {
    if (Object.keys(integrationKeys).length > 0) {
      try { localStorage.setItem('aurion_integration_keys', JSON.stringify(integrationKeys)); } catch { /* ignore */ }
    }
  }, [integrationKeys]);

  // ── NotebookLM Research & Claude Code Integration ──
  const [researchMode, setResearchMode] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [researchResults, setResearchResults] = useState<{
    topic: string;
    sources: number;
    insights: string[];
    summary: string;
    confidence: number;
  } | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [showResearchPanel, setShowResearchPanel] = useState(false);
  const [researchContext, setResearchContext] = useState<string>('');
  const [claudeCodeMode, setClaudeCodeMode] = useState(true); // Always ON — full orchestration by default
  const [jarvisPlan, setJarvisPlan] = useState<{ id: string; goal: string; tasks: { id: string; name: string; description: string; status: string }[]; status: string; completedTasks: number; totalTasks: number } | null>(null);
  const [jarvisSubsystems, setJarvisSubsystems] = useState<string[]>([]);

  // Perform NotebookLM research
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

  // Enhance tool with research
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

  // Deploy
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ url: string; projectName: string } | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Clone website
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneProgress, setCloneProgress] = useState('');
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [clonedHtml, setClonedHtml] = useState<string | null>(null);
  const cloneAbortRef = useRef<AbortController | null>(null);

  // Clone refinement/iteration state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastScrapeDataRef = useRef<any>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');

  // Visual Editor mode
  const [isEditMode, setIsEditMode] = useState(false);
  const pendingEditHtmlRef = useRef<string | null>(null);

  // Select & Prompt — click element in preview, AI modifies just that element
  const [selectPromptData, setSelectPromptData] = useState<{ outerHtml: string; cssPath: string; tagName: string; rect: { top: number; left: number; width: number; height: number } } | null>(null);
  const [selectPromptInput, setSelectPromptInput] = useState('');
  const [selectPromptLoading, setSelectPromptLoading] = useState(false);
  const selectPromptRef = useRef<HTMLInputElement>(null);

  // 21st.dev Component Browser
  type Component21st = { id: string; name: string; description: string; slug?: string; username?: string; code?: string; preview_url?: string; demo_url?: string; tags?: string[] };
  const [show21stBrowser, setShow21stBrowser] = useState(false);
  const [browser21stQuery, setBrowser21stQuery] = useState('');
  const [browser21stResults, setBrowser21stResults] = useState<Component21st[]>([]);
  const [browser21stLoading, setBrowser21stLoading] = useState(false);
  const [injecting21stComponent, setInjecting21stComponent] = useState<string | null>(null);
  const browser21stInputRef = useRef<HTMLInputElement>(null);

  // Virtual File System
  const [projectFiles, setProjectFiles] = useState<VirtualFS>({});
  const [selectedFile, setSelectedFile] = useState<string>('index.html');
  const [openTabs, setOpenTabs] = useState<string[]>(['index.html']);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Streaming stats
  const [streamingChars, setStreamingChars] = useState(0);
  const streamStartTime = useRef<number>(0);

  // Tab management helpers
  const openFile = useCallback((file: string) => {
    setSelectedFile(file);
    setOpenTabs(prev => prev.includes(file) ? prev : [...prev, file]);
  }, []);
  const closeTab = useCallback((file: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenTabs(prev => {
      const next = prev.filter(f => f !== file);
      if (next.length === 0) return prev;
      if (selectedFile === file) setSelectedFile(next[next.length - 1]);
      return next;
    });
  }, [selectedFile]);

  // Split view
  const [splitFile, setSplitFile] = useState<string | null>(null);

  // Quick Component Palette
  const [showComponentPalette, setShowComponentPalette] = useState(false);

  // Conversation History
  type ConversationEntry = { id: string; title: string; messages: Message[]; timestamp: number };
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [showConversationHistory, setShowConversationHistory] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv_default');

  // Code Snippet Bookmarks
  type Bookmark = { id: string; label: string; code: string; language: string; file: string; timestamp: number };
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // AI Prompt Templates
  const [showPromptTemplates, setShowPromptTemplates] = useState(false);

  // Version Timeline
  const [showVersionTimeline, setShowVersionTimeline] = useState(false);

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [findRegex, setFindRegex] = useState(false);
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts Cheatsheet
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Editor Theme
  const [editorTheme, setEditorTheme] = useState<string>('vs-dark');
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Quick File Creator
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // AI Explain
  const [isExplaining, setIsExplaining] = useState(false);

  // Minimap & Word Wrap toggles
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [wordWrapEnabled, setWordWrapEnabled] = useState(true);

  // Auto-save indicator
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Color picker
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickedColor, setPickedColor] = useState('#3b82f6');

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'toast_' + Date.now().toString(36);
    setToasts(prev => [...prev, { id, message, type }].slice(-5));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ─── Google Stitch Callbacks ───
  const stitchCall = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    setStitchError(null);
    setStitchLoading(true);
    try {
      const res = await fetchWithRetry('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Stitch error: ${res.status}`);
      return json;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stitch request failed';
      setStitchError(msg);
      throw err;
    } finally {
      setStitchLoading(false);
    }
  }, []);

  const stitchGenerate = useCallback(async () => {
    if (!stitchPrompt.trim()) return;
    try {
      const enhancedRes = await stitchCall('enhance_prompt', {
        prompt: stitchPrompt,
        designSystem: stitchDesignSystem || undefined,
      });
      let projId = stitchProjectId;
      if (!projId) {
        const projRes = await stitchCall('create_project', { title: 'Aurion - ' + stitchPrompt.slice(0, 30) });
        projId = projRes.projectId;
        setStitchProjectId(projId);
      }
      const result = await stitchCall('generate_screen', {
        projectId: projId,
        prompt: enhancedRes.enhanced,
        deviceType: 'DESKTOP',
      });
      const htmlRes = await fetch(result.htmlUrl);
      const html = await htmlRes.text();
      setStitchScreens(prev => [...prev, {
        page: stitchPrompt.slice(0, 30),
        screenId: result.screenId,
        htmlUrl: result.htmlUrl,
        imageUrl: result.imageUrl,
        html,
      }]);
      setProjectFiles(prev => ({
        ...prev,
        ['stitch-' + (stitchScreens.length + 1) + '.html']: { content: html, language: 'html' },
      }));
      showToast('Stitch screen generated!', 'success');
    } catch { /* error already set */ }
  }, [stitchPrompt, stitchDesignSystem, stitchProjectId, stitchCall, stitchScreens.length, showToast]);

  const stitchRunLoop = useCallback(async () => {
    const validPages = stitchPages.filter(p => p.name.trim() && p.prompt.trim());
    if (validPages.length === 0) return;
    try {
      const result = await stitchCall('stitch_loop', {
        projectId: stitchProjectId || undefined,
        title: 'Aurion Loop Project',
        pages: validPages,
        designSystem: stitchDesignSystem || undefined,
      });
      if (!stitchProjectId && result.projectId) setStitchProjectId(result.projectId);
      setStitchScreens(result.pages);
      const newFiles: Record<string, { content: string; language: string }> = {};
      for (const page of result.pages) {
        if (page.html) {
          newFiles[page.page.toLowerCase().replace(/\s+/g, '-') + '.html'] = { content: page.html, language: 'html' };
        }
      }
      setProjectFiles(prev => ({ ...prev, ...newFiles }));
      showToast(`Stitch loop: ${result.pages.length} pages generated!`, 'success');
    } catch { /* error already set */ }
  }, [stitchPages, stitchProjectId, stitchDesignSystem, stitchCall, showToast]);

  // Tab context menu
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; file: string } | null>(null);

  // Goto Line
  const [showGotoLine, setShowGotoLine] = useState(false);
  const [gotoLineValue, setGotoLineValue] = useState('');
  const gotoLineRef = useRef<HTMLInputElement>(null);
  const monacoEditorRef = useRef<unknown>(null);

  // Explorer context menu
  const [explorerContextMenu, setExplorerContextMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Image preview hover
  const [hoveredImage, setHoveredImage] = useState<{ path: string; x: number; y: number } | null>(null);

  // Responsive breakpoint ruler
  const [showBreakpointRuler, setShowBreakpointRuler] = useState(false);

  // Modified file tracking
  const [savedFileContents, setSavedFileContents] = useState<Record<string, string>>({});
  const isFileModified = useCallback((path: string) => {
    if (!projectFiles[path] || savedFileContents[path] === undefined) return false;
    return projectFiles[path].content !== savedFileContents[path];
  }, [projectFiles, savedFileContents]);

  // A11y Audit
  const [showA11yPanel, setShowA11yPanel] = useState(false);
  const [a11yIssues, setA11yIssues] = useState<{ type: 'error' | 'warning' | 'info'; message: string; element: string }[]>([]);
  const runA11yAudit = useCallback(() => {
    const issues: { type: 'error' | 'warning' | 'info'; message: string; element: string }[] = [];
    const html = Object.values(projectFiles).map(f => f.content).join('\n');
    // Check for images without alt
    const imgNoAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi);
    if (imgNoAlt) imgNoAlt.forEach(m => issues.push({ type: 'error', message: 'Image missing alt attribute', element: m.slice(0, 60) }));
    // Check for missing lang
    if (html.includes('<html') && !html.includes('lang=')) issues.push({ type: 'warning', message: 'Missing lang attribute on <html>', element: '<html>' });
    // Check for empty buttons/links
    const emptyBtns = html.match(/<button[^>]*>\s*<\/button>/gi);
    if (emptyBtns) emptyBtns.forEach(() => issues.push({ type: 'error', message: 'Empty button without text content', element: '<button></button>' }));
    const emptyLinks = html.match(/<a[^>]*>\s*<\/a>/gi);
    if (emptyLinks) emptyLinks.forEach(() => issues.push({ type: 'error', message: 'Empty link without text content', element: '<a></a>' }));
    // Check for missing form labels
    const inputs = html.match(/<input(?![^>]*aria-label)[^>]*>/gi);
    const labels = (html.match(/<label/gi) || []).length;
    if (inputs && inputs.length > labels) issues.push({ type: 'warning', message: `${inputs.length - labels} input(s) may be missing associated labels`, element: '<input>' });
    // Check color contrast hint
    if (html.includes('text-gray-300') && html.includes('bg-gray-200')) issues.push({ type: 'info', message: 'Potential low contrast: light text on light background', element: 'text-gray-300 on bg-gray-200' });
    // Check for heading hierarchy
    const h1Count = (html.match(/<h1/gi) || []).length;
    if (h1Count === 0 && html.includes('<h2')) issues.push({ type: 'warning', message: 'Page has <h2> but no <h1> — check heading hierarchy', element: '<h2>' });
    if (h1Count > 1) issues.push({ type: 'warning', message: `Multiple <h1> tags found (${h1Count}) — use only one per page`, element: '<h1>' });
    // Check for missing viewport
    if (html.includes('<head') && !html.includes('viewport')) issues.push({ type: 'info', message: 'Missing viewport meta tag for responsive design', element: '<meta viewport>' });
    if (issues.length === 0) issues.push({ type: 'info', message: 'No accessibility issues detected!', element: '✓' });
    setA11yIssues(issues);
    setShowA11yPanel(true);
    showToast(`A11y audit: ${issues.filter(i => i.type === 'error').length} errors, ${issues.filter(i => i.type === 'warning').length} warnings`, issues.some(i => i.type === 'error') ? 'error' : 'success');
  }, [projectFiles, showToast]);

  // SEO Meta Editor
  const [showSeoPanel, setShowSeoPanel] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoOgImage, setSeoOgImage] = useState('');

  // Cursor position tracking
  const [cursorPosition, setCursorPosition] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  // Tailwind classes browser
  const [showTailwindPanel, setShowTailwindPanel] = useState(false);

  // v13: Color Palette Extractor
  const [showColorPalettePanel, setShowColorPalettePanel] = useState(false);
  const extractedColors = useMemo(() => {
    const all = Object.values(projectFiles).map(f => f.content).join('\n');
    const colorSet = new Set<string>();
    // hex
    (all.match(/#(?:[0-9a-fA-F]{3,4}){1,2}\b/g) || []).forEach(c => colorSet.add(c.toLowerCase()));
    // rgb/rgba
    (all.match(/rgba?\([^)]+\)/gi) || []).forEach(c => colorSet.add(c));
    // hsl/hsla
    (all.match(/hsla?\([^)]+\)/gi) || []).forEach(c => colorSet.add(c));
    // Tailwind color classes
    const twColors: Record<string, string> = { 'red-500': '#ef4444', 'blue-500': '#3b82f6', 'green-500': '#22c55e', 'yellow-500': '#eab308', 'purple-500': '#a855f7', 'pink-500': '#ec4899', 'indigo-500': '#6366f1', 'gray-500': '#6b7280', 'gray-900': '#111827', 'gray-100': '#f3f4f6', 'white': '#ffffff', 'black': '#000000', 'emerald-500': '#10b981', 'orange-500': '#f97316', 'cyan-500': '#06b6d4', 'teal-500': '#14b8a6' };
    Object.entries(twColors).forEach(([name, hex]) => { if (all.includes(name)) colorSet.add(hex); });
    return Array.from(colorSet).slice(0, 50);
  }, [projectFiles]);

  // v13: Performance Audit
  const [showPerfPanel, setShowPerfPanel] = useState(false);
  const [perfIssues, setPerfIssues] = useState<{ type: 'error' | 'warning' | 'info'; message: string; detail: string }[]>([]);
  const runPerfAudit = useCallback(() => {
    const issues: { type: 'error' | 'warning' | 'info'; message: string; detail: string }[] = [];
    const html = Object.values(projectFiles).map(f => f.content).join('\n');
    const totalSize = new Blob([html]).size;
    // Large page
    if (totalSize > 500000) issues.push({ type: 'error', message: 'Page size exceeds 500KB', detail: `Total: ${(totalSize/1024).toFixed(0)}KB — consider code splitting` });
    else if (totalSize > 200000) issues.push({ type: 'warning', message: 'Page size is over 200KB', detail: `Total: ${(totalSize/1024).toFixed(0)}KB` });
    // Inline styles
    const inlineStyles = (html.match(/style="[^"]{100,}"/gi) || []).length;
    if (inlineStyles > 0) issues.push({ type: 'warning', message: `${inlineStyles} element(s) with large inline styles (>100 chars)`, detail: 'Move styles to CSS classes for better caching' });
    // Images without lazy loading
    const imgsNoLazy = html.match(/<img(?![^>]*loading=)[^>]*>/gi);
    if (imgsNoLazy && imgsNoLazy.length > 2) issues.push({ type: 'warning', message: `${imgsNoLazy.length} images without lazy loading`, detail: 'Add loading="lazy" to below-fold images' });
    // Images without dimensions
    const imgsNoDim = html.match(/<img(?![^>]*(?:width|w-))[^>]*>/gi);
    if (imgsNoDim && imgsNoDim.length > 0) issues.push({ type: 'info', message: `${imgsNoDim.length} images without explicit dimensions`, detail: 'Set width/height to prevent layout shift (CLS)' });
    // Too many scripts
    const scripts = (html.match(/<script/gi) || []).length;
    if (scripts > 10) issues.push({ type: 'warning', message: `${scripts} <script> tags detected`, detail: 'Consider bundling scripts to reduce HTTP requests' });
    // Render-blocking CSS
    const linkCSS = (html.match(/<link[^>]*stylesheet[^>]*>/gi) || []).length;
    if (linkCSS > 5) issues.push({ type: 'info', message: `${linkCSS} external stylesheets`, detail: 'Consider inlining critical CSS' });
    // DOM depth estimate
    const divCount = (html.match(/<div/gi) || []).length;
    if (divCount > 200) issues.push({ type: 'warning', message: `High DOM complexity: ${divCount} <div> elements`, detail: 'Reduce nesting for better rendering performance' });
    // No compression hints
    if (html.includes('base64') && html.length > 100000) issues.push({ type: 'info', message: 'Large base64-encoded assets detected', detail: 'Use external files for better caching' });
    // Score
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warnCount = issues.filter(i => i.type === 'warning').length;
    const score = Math.max(0, 100 - errorCount * 20 - warnCount * 10 - issues.filter(i => i.type === 'info').length * 3);
    if (issues.length === 0) issues.push({ type: 'info', message: 'No performance issues detected!', detail: 'Score: 100/100' });
    else issues.unshift({ type: score >= 80 ? 'info' : score >= 50 ? 'warning' : 'error', message: `Performance Score: ${score}/100`, detail: `${errorCount} errors, ${warnCount} warnings` });
    setPerfIssues(issues);
    setShowPerfPanel(true);
    showToast(`Perf audit: score ${score}/100`, score >= 80 ? 'success' : score >= 50 ? 'info' : 'error');
  }, [projectFiles, showToast]);

  // v13: Project Stats
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const projectStats = useMemo(() => {
    const files = Object.entries(projectFiles);
    const langMap: Record<string, { files: number; lines: number; bytes: number }> = {};
    let totalLines = 0, totalBytes = 0;
    files.forEach(([, f]) => {
      const lang = f.language || 'plaintext';
      const lines = f.content.split('\n').length;
      const bytes = new Blob([f.content]).size;
      totalLines += lines;
      totalBytes += bytes;
      if (!langMap[lang]) langMap[lang] = { files: 0, lines: 0, bytes: 0 };
      langMap[lang].files++;
      langMap[lang].lines += lines;
      langMap[lang].bytes += bytes;
    });
    return { total: files.length, totalLines, totalBytes, languages: Object.entries(langMap).sort((a, b) => b[1].lines - a[1].lines) };
  }, [projectFiles]);

  // v13: CSS Variables Manager
  const [showCssVarsPanel, setShowCssVarsPanel] = useState(false);
  const cssVariables = useMemo(() => {
    const vars: { name: string; value: string; file: string }[] = [];
    Object.entries(projectFiles).forEach(([path, f]) => {
      const matches = f.content.matchAll(/--([\w-]+)\s*:\s*([^;]+)/g);
      for (const m of matches) vars.push({ name: `--${m[1]}`, value: m[2].trim(), file: path });
    });
    return vars;
  }, [projectFiles]);

  // v13: Console capture from preview
  const [consoleLogs, setConsoleLogs] = useState<{ type: string; message: string; ts: number }[]>([]);
  const [showConsolePanel, setShowConsolePanel] = useState(false);

  // v14: Dependency Inspector
  const [showDepsPanel, setShowDepsPanel] = useState(false);
  const detectedDeps = useMemo(() => {
    const html = Object.values(projectFiles).map(f => f.content).join('\n');
    const deps: { name: string; version: string; url: string; type: string }[] = [];
    const cdnPatterns: [RegExp, string, string][] = [
      [/react@([\d.]+)/i, 'React', 'UI Library'],
      [/react-dom@([\d.]+)/i, 'ReactDOM', 'UI Library'],
      [/tailwindcss[/@]([\d.]+)/i, 'Tailwind CSS', 'CSS Framework'],
      [/lucide[/@]([\d.]+)/i, 'Lucide Icons', 'Icons'],
      [/recharts[/@]([\d.]+)/i, 'Recharts', 'Charts'],
      [/framer-motion[/@]([\d.]+)/i, 'Framer Motion', 'Animation'],
      [/react-router[/@]([\d.]+)/i, 'React Router', 'Routing'],
      [/three[/@]([\d.]+)/i, 'Three.js', '3D Graphics'],
      [/chart\.js[/@]([\d.]+)/i, 'Chart.js', 'Charts'],
      [/gsap[/@]([\d.]+)/i, 'GSAP', 'Animation'],
      [/axios[/@]([\d.]+)/i, 'Axios', 'HTTP Client'],
      [/lodash[/@]([\d.]+)/i, 'Lodash', 'Utility'],
    ];
    cdnPatterns.forEach(([regex, name, type]) => {
      const m = html.match(regex);
      if (m) deps.push({ name, version: m[1], url: `https://www.npmjs.com/package/${name.toLowerCase().replace(/\s+/g, '-')}`, type });
    });
    // Detect without version
    if (html.includes('tailwindcss') && !deps.find(d => d.name === 'Tailwind CSS')) deps.push({ name: 'Tailwind CSS', version: 'latest', url: 'https://tailwindcss.com', type: 'CSS Framework' });
    if (html.includes('font-awesome') || html.includes('fontawesome')) deps.push({ name: 'Font Awesome', version: 'detected', url: 'https://fontawesome.com', type: 'Icons' });
    if (html.includes('bootstrap') && !html.includes('tailwind')) deps.push({ name: 'Bootstrap', version: 'detected', url: 'https://getbootstrap.com', type: 'CSS Framework' });
    return deps;
  }, [projectFiles]);

  // v14: Code Complexity Analyzer
  const [showComplexityPanel, setShowComplexityPanel] = useState(false);
  const codeComplexity = useMemo(() => {
    const files = Object.entries(projectFiles);
    const results: { file: string; lines: number; functions: number; maxDepth: number; complexity: string }[] = [];
    files.forEach(([path, f]) => {
      const content = f.content;
      const lines = content.split('\n').length;
      const functions = (content.match(/function\s|=>|\bclass\s/g) || []).length;
      let maxDepth = 0, depth = 0;
      for (const ch of content) { if (ch === '{') { depth++; maxDepth = Math.max(maxDepth, depth); } else if (ch === '}') depth--; }
      const score = functions * 2 + maxDepth * 3 + Math.floor(lines / 50);
      results.push({ file: path, lines, functions, maxDepth, complexity: score > 30 ? 'High' : score > 15 ? 'Medium' : 'Low' });
    });
    return results.sort((a, b) => b.functions - a.functions);
  }, [projectFiles]);

  // v14: Responsive Split Preview
  const [showSplitPreview, setShowSplitPreview] = useState(false);

  // v15: Code Outline / Symbol Navigator
  const [showOutlinePanel, setShowOutlinePanel] = useState(false);
  const codeSymbols = useMemo(() => {
    if (!selectedFile || !projectFiles[selectedFile]) return [];
    const content = projectFiles[selectedFile].content;
    const symbols: { name: string; type: string; line: number }[] = [];
    content.split('\n').forEach((ln, i) => {
      const fnMatch = ln.match(/(?:function|const|let|var)\s+(\w+)/);
      if (fnMatch && (ln.includes('=>') || ln.includes('function'))) symbols.push({ name: fnMatch[1], type: 'function', line: i + 1 });
      const classMatch = ln.match(/class\s+(\w+)/);
      if (classMatch) symbols.push({ name: classMatch[1], type: 'class', line: i + 1 });
      const tagMatch = ln.match(/<(\w+)[\s>]/);
      if (tagMatch && /^[A-Z]/.test(tagMatch[1])) symbols.push({ name: `<${tagMatch[1]}>`, type: 'component', line: i + 1 });
      const idMatch = ln.match(/id=["'](\w+)["']/);
      if (idMatch) symbols.push({ name: `#${idMatch[1]}`, type: 'id', line: i + 1 });
    });
    return symbols;
  }, [selectedFile, projectFiles]);

  // v15: Image Optimizer Panel
  const [showImageOptPanel, setShowImageOptPanel] = useState(false);
  const imageAssets = useMemo(() => {
    const assets: { file: string; count: number; totalSize: number; images: { src: string; sizeKB: number }[] }[] = [];
    Object.entries(projectFiles).forEach(([path, f]) => {
      const dataMatches = f.content.match(/data:image\/[^"'\s]+/g) || [];
      if (dataMatches.length > 0) {
        const images = dataMatches.map(src => ({ src: src.slice(0, 60) + '...', sizeKB: Math.round(src.length * 0.75 / 1024) }));
        const totalSize = images.reduce((a, b) => a + b.sizeKB, 0);
        assets.push({ file: path, count: images.length, totalSize, images });
      }
    });
    return assets;
  }, [projectFiles]);

  // v15: Code Diff Stats
  const [showDiffStatsPanel, setShowDiffStatsPanel] = useState(false);

  // v15: Network / API Calls Panel
  const [showNetworkPanel, setShowNetworkPanel] = useState(false);
  const networkCalls = useMemo(() => {
    const calls: { file: string; line: number; method: string; url: string }[] = [];
    Object.entries(projectFiles).forEach(([path, f]) => {
      f.content.split('\n').forEach((ln, i) => {
        const fetchMatch = ln.match(/fetch\(['"`]([^'"`]+)['"`]/);
        if (fetchMatch) calls.push({ file: path, line: i + 1, method: 'fetch', url: fetchMatch[1] });
        const axiosMatch = ln.match(/axios\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/);
        if (axiosMatch) calls.push({ file: path, line: i + 1, method: `axios.${axiosMatch[1]}`, url: axiosMatch[2] });
        const xhrMatch = ln.match(/\.open\(['"`](GET|POST|PUT|DELETE)['"`],\s*['"`]([^'"`]+)['"`]/);
        if (xhrMatch) calls.push({ file: path, line: i + 1, method: xhrMatch[1], url: xhrMatch[2] });
      });
    });
    return calls;
  }, [projectFiles]);

  // v15: Export Single HTML
  const exportSingleHtml = useCallback(() => {
    const html = projectFiles['index.html']?.content || '';
    if (!html) { showToast('No index.html found', 'error'); return; }
    let result = html;
    // Inline CSS files
    Object.entries(projectFiles).forEach(([path, f]) => {
      if (path.endsWith('.css')) {
        const linkRegex = new RegExp(`<link[^>]*href=['"]${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^>]*/?>`, 'gi');
        result = result.replace(linkRegex, `<style>${f.content}</style>`);
        if (!linkRegex.test(html)) result = result.replace('</head>', `<style>/* ${path} */\n${f.content}</style>\n</head>`);
      }
    });
    // Inline JS files
    Object.entries(projectFiles).forEach(([path, f]) => {
      if (path.endsWith('.js') || path.endsWith('.ts')) {
        const scriptRegex = new RegExp(`<script[^>]*src=['"]${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][^>]*>\\s*</script>`, 'gi');
        result = result.replace(scriptRegex, `<script>/* ${path} */\n${f.content}</script>`);
      }
    });
    const blob = new Blob([result], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'export.html'; a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported single HTML (${(result.length / 1024).toFixed(1)}KB)`, 'success');
  }, [projectFiles, showToast]);

  // v15: Responsive Breakpoint Tester
  const [breakpointTestActive, setBreakpointTestActive] = useState(false);
  const [breakpointTestIdx, setBreakpointTestIdx] = useState(0);
  const BREAKPOINT_SIZES = useMemo(() => [
    { name: 'iPhone SE', w: 320 },
    { name: 'iPhone 14', w: 375 },
    { name: 'iPad Mini', w: 768 },
    { name: 'Laptop', w: 1024 },
    { name: 'Desktop', w: 1440 },
  ], []);
  useEffect(() => {
    if (!breakpointTestActive) return;
    const timer = setInterval(() => {
      setBreakpointTestIdx(prev => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(timer);
  }, [breakpointTestActive]);

  // v14: HTML Minifier
  const minifyProject = useCallback(() => {
    const minified = { ...projectFiles };
    let saved = 0;
    Object.entries(minified).forEach(([path, f]) => {
      const orig = f.content.length;
      let c = f.content;
      if (path.endsWith('.html') || path.endsWith('.htm')) {
        c = c.replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*\n/g, '\n').replace(/^\s+/gm, '').replace(/\s{2,}/g, ' ');
      } else if (path.endsWith('.css')) {
        c = c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n').replace(/\s*([{:;,}])\s*/g, '$1').replace(/^\s+/gm, '');
      } else if (path.endsWith('.js') || path.endsWith('.ts')) {
        c = c.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n');
      }
      saved += orig - c.length;
      minified[path] = { ...f, content: c };
    });
    setProjectFiles(minified);
    showToast(`Minified: saved ${(saved / 1024).toFixed(1)}KB`, 'success');
  }, [projectFiles, showToast]);

  // v16: HTML Validator
  const [showHtmlValidatorPanel, setShowHtmlValidatorPanel] = useState(false);
  const htmlErrors = useMemo(() => {
    const html = projectFiles['index.html']?.content || '';
    if (!html) return [];
    const errors: { type: string; message: string; line: number }[] = [];
    const lines = html.split('\n');
    // Check doctype
    if (!html.trim().toLowerCase().startsWith('<!doctype')) errors.push({ type: 'warning', message: 'Missing <!DOCTYPE html> declaration', line: 1 });
    // Check duplicate IDs
    const idMap = new Map<string, number[]>();
    lines.forEach((ln, i) => {
      const ids = [...ln.matchAll(/id=["'](\w+)["']/g)];
      ids.forEach(m => { const arr = idMap.get(m[1]) || []; arr.push(i + 1); idMap.set(m[1], arr); });
    });
    idMap.forEach((lns, id) => { if (lns.length > 1) errors.push({ type: 'error', message: `Duplicate id="${id}" on lines ${lns.join(', ')}`, line: lns[0] }); });
    // Check unclosed tags
    const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    const stack: { tag: string; line: number }[] = [];
    lines.forEach((ln, i) => {
      const opens = [...ln.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)(?:\s|>)/g)];
      const closes = [...ln.matchAll(/<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g)];
      opens.forEach(m => { if (!voidTags.has(m[1].toLowerCase()) && !ln.includes('/>')) stack.push({ tag: m[1].toLowerCase(), line: i + 1 }); });
      closes.forEach(m => { const idx = stack.findLastIndex(s => s.tag === m[1].toLowerCase()); if (idx >= 0) stack.splice(idx, 1); else errors.push({ type: 'error', message: `Extra closing </${m[1]}> without matching open tag`, line: i + 1 }); });
    });
    stack.forEach(s => errors.push({ type: 'error', message: `Unclosed <${s.tag}> tag`, line: s.line }));
    // Missing lang attribute
    if (html.includes('<html') && !html.match(/<html[^>]*lang=/)) errors.push({ type: 'warning', message: 'Missing lang attribute on <html>', line: 1 });
    // Missing charset
    if (!html.includes('charset')) errors.push({ type: 'warning', message: 'Missing charset meta tag', line: 1 });
    if (errors.length === 0) errors.push({ type: 'success', message: 'No HTML issues found!', line: 0 });
    return errors;
  }, [projectFiles]);

  // v16: Font Inspector
  const [showFontPanel, setShowFontPanel] = useState(false);
  const detectedFonts = useMemo(() => {
    const allContent = Object.values(projectFiles).map(f => f.content).join('\n');
    const fonts: { name: string; source: string; type: string }[] = [];
    // Google Fonts
    const googleFonts = [...allContent.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&\s]+)/g)];
    googleFonts.forEach(m => { const name = decodeURIComponent(m[1]).replace(/\+/g, ' ').split(':')[0]; if (!fonts.find(f => f.name === name)) fonts.push({ name, source: 'Google Fonts', type: 'Web' }); });
    // @font-face
    const fontFaces = [...allContent.matchAll(/@font-face[^}]*font-family:\s*["']?([^"';]+)/g)];
    fontFaces.forEach(m => { if (!fonts.find(f => f.name === m[1].trim())) fonts.push({ name: m[1].trim(), source: '@font-face', type: 'Custom' }); });
    // font-family declarations
    const fontFamilies = [...allContent.matchAll(/font-family:\s*["']?([^"';,}]+)/g)];
    fontFamilies.forEach(m => {
      const name = m[1].trim();
      if (!fonts.find(f => f.name === name) && !['inherit', 'initial', 'unset', 'revert'].includes(name.toLowerCase()))
        fonts.push({ name, source: 'CSS', type: /mono|code|courier/i.test(name) ? 'Monospace' : /serif/i.test(name) ? 'Serif' : 'Sans-serif' });
    });
    return fonts;
  }, [projectFiles]);

  // v16: Code Snippets Manager
  const [showSnippetsPanel, setShowSnippetsPanel] = useState(false);
  const [savedSnippets, setSavedSnippets] = useState<{ id: string; name: string; code: string; language: string }[]>([]);
  // Load snippets from IDB on mount
  useEffect(() => {
    idbGet('aurion-snippets').then(data => { if (Array.isArray(data)) setSavedSnippets(data as typeof savedSnippets); });
  }, []);
  const saveSnippet = useCallback((name: string, code: string) => {
    const snippet = { id: Date.now().toString(), name, code, language: selectedFile?.split('.').pop() || 'text' };
    setSavedSnippets(prev => { const next = [...prev, snippet]; idbSet('aurion-snippets', next); return next; });
    showToast(`Snippet "${name}" saved`, 'success');
  }, [selectedFile, showToast]);
  const deleteSnippet = useCallback((id: string) => {
    setSavedSnippets(prev => { const next = prev.filter(s => s.id !== id); idbSet('aurion-snippets', next); return next; });
  }, []);
  const insertSnippet = useCallback((code: string) => {
    if (!selectedFile || !projectFiles[selectedFile]) return;
    const content = projectFiles[selectedFile].content;
    setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: content + '\n' + code } }));
    setShowSnippetsPanel(false);
    showToast('Snippet inserted', 'success');
  }, [selectedFile, projectFiles, showToast]);

  // v16: Layout Debugger (outline all elements in preview)
  const [layoutDebugActive, setLayoutDebugActive] = useState(false);

  // v16: Preview Dark/Light Mode Toggle
  const [previewDarkMode, setPreviewDarkMode] = useState<'auto' | 'dark' | 'light'>('auto');

  // v16: File Size Treemap
  const [showTreemapPanel, setShowTreemapPanel] = useState(false);
  const fileSizeTreemap = useMemo(() => {
    const totalBytes = Object.values(projectFiles).reduce((a, f) => a + f.content.length, 0);
    return Object.entries(projectFiles).map(([path, f]) => ({
      path, bytes: f.content.length, pct: totalBytes > 0 ? (f.content.length / totalBytes * 100) : 0,
      color: path.endsWith('.html') ? '#e34c26' : path.endsWith('.css') ? '#563d7c' : path.endsWith('.js') || path.endsWith('.jsx') ? '#f7df1e' : path.endsWith('.ts') || path.endsWith('.tsx') ? '#3178c6' : '#555',
    })).sort((a, b) => b.bytes - a.bytes);
  }, [projectFiles]);

  // v17: Unused CSS Detector
  const [showUnusedCssPanel, setShowUnusedCssPanel] = useState(false);
  const unusedCssSelectors = useMemo(() => {
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
    const cssFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.css'));
    if (!htmlFile || !cssFile) return [];
    const htmlContent = htmlFile[1].content;
    const cssContent = cssFile[1].content;
    const selectorRegex = /([^{}@\n][^{]*?)\s*\{/g;
    const results: { selector: string; line: number }[] = [];
    let m;
    while ((m = selectorRegex.exec(cssContent)) !== null) {
      const sel = m[1].trim();
      if (!sel || sel.startsWith('@') || sel.startsWith('from') || sel.startsWith('to') || sel.startsWith('/*') || /^\d+%$/.test(sel)) continue;
      const parts = sel.split(',').map(s => s.trim());
      for (const part of parts) {
        const clean = part.replace(/:hover|:focus|:active|:visited|:first-child|:last-child|:nth-child\([^)]*\)|::before|::after|::placeholder/g, '').trim();
        if (!clean || clean === '*' || clean === 'html' || clean === 'body') continue;
        const tagMatch = clean.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
        const classMatch = clean.match(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/);
        const idMatch = clean.match(/#([a-zA-Z_-][a-zA-Z0-9_-]*)/);
        let found = false;
        if (idMatch && htmlContent.includes(`id="${idMatch[1]}"`)) found = true;
        if (!found && classMatch && (htmlContent.includes(`class="${classMatch[1]}"`) || htmlContent.includes(`class="${classMatch[1]} `) || htmlContent.includes(` ${classMatch[1]}"`) || htmlContent.includes(` ${classMatch[1]} `))) found = true;
        if (!found && tagMatch && !classMatch && !idMatch && new RegExp(`<${tagMatch[1]}[\\s>]`, 'i').test(htmlContent)) found = true;
        if (!found) {
          const line = cssContent.substring(0, m.index).split('\n').length;
          results.push({ selector: part, line });
        }
      }
    }
    return results.slice(0, 100);
  }, [projectFiles]);

  // v17: Link Checker
  const [showLinkCheckerPanel, setShowLinkCheckerPanel] = useState(false);
  const brokenLinks = useMemo(() => {
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
    if (!htmlFile) return [];
    const html = htmlFile[1].content;
    const results: { href: string; type: string; reason: string; line: number }[] = [];
    const linkRegex = /href=["']([^"']*)["']/g;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1];
      const line = html.substring(0, m.index).split('\n').length;
      if (href.startsWith('#')) {
        const anchor = href.slice(1);
        if (anchor && !html.includes(`id="${anchor}"`) && !html.includes(`name="${anchor}"`)) {
          results.push({ href, type: 'anchor', reason: `Anchor #${anchor} not found`, line });
        }
      } else if (href.startsWith('/') || (!href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:'))) {
        const target = href.split('?')[0].split('#')[0];
        if (target && !projectFiles[target] && !projectFiles[target.replace(/^\//, '')]) {
          results.push({ href, type: 'internal', reason: 'File not found in project', line });
        }
      } else if (!href || href === '#') {
        results.push({ href: href || '(empty)', type: 'empty', reason: 'Empty or placeholder href', line });
      }
    }
    return results.slice(0, 50);
  }, [projectFiles]);

  // v17: DOM Tree Viewer
  const [showDomTreePanel, setShowDomTreePanel] = useState(false);
  const domTree = useMemo(() => {
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
    if (!htmlFile) return [];
    const html = htmlFile[1].content;
    const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\/?>|<!--[\s\S]*?-->/g;
    const tree: { tag: string; depth: number; attrs: string; selfClose: boolean }[] = [];
    let depth = 0;
    const selfClosing = new Set(['br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr']);
    let m;
    while ((m = tagRegex.exec(html)) !== null) {
      if (m[0].startsWith('<!--')) continue;
      const isClose = m[1] === '/';
      const tag = m[2].toLowerCase();
      const attrs = (m[3] || '').trim().slice(0, 80);
      const isSelf = selfClosing.has(tag) || m[0].endsWith('/>');
      if (isClose) { depth = Math.max(0, depth - 1); continue; }
      tree.push({ tag, depth, attrs, selfClose: isSelf });
      if (!isSelf) depth++;
    }
    return tree.slice(0, 300);
  }, [projectFiles]);

  // v17: Meta Tag Editor
  const [showMetaEditorPanel, setShowMetaEditorPanel] = useState(false);
  const metaTags = useMemo(() => {
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
    if (!htmlFile) return [];
    const html = htmlFile[1].content;
    const tags: { type: string; name: string; content: string }[] = [];
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) tags.push({ type: 'title', name: 'title', content: titleMatch[1] });
    const metaRegex = /<meta\s+([^>]*)>/gi;
    let m;
    while ((m = metaRegex.exec(html)) !== null) {
      const attrs = m[1];
      const nameMatch = attrs.match(/(?:name|property)=["']([^"']*)["']/i);
      const contentMatch = attrs.match(/content=["']([^"']*)["']/i);
      const charsetMatch = attrs.match(/charset=["']([^"']*)["']/i);
      if (nameMatch && contentMatch) tags.push({ type: 'meta', name: nameMatch[1], content: contentMatch[1] });
      else if (charsetMatch) tags.push({ type: 'charset', name: 'charset', content: charsetMatch[1] });
    }
    return tags;
  }, [projectFiles]);

  // v17: Code Formatter
  const formatCode = useCallback(() => {
    if (!selectedFile) return;
    const file = projectFiles[selectedFile];
    if (!file) return;
    let content = file.content;
    const ext = selectedFile.split('.').pop() || '';
    if (['html', 'htm'].includes(ext)) {
      const lines = content.replace(/></g, '>\n<').split('\n');
      let indent = 0;
      const sc = new Set(['br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr','!doctype']);
      const formatted = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        const isClose = trimmed.startsWith('</') && !trimmed.includes('><');
        if (isClose) indent = Math.max(0, indent - 1);
        const result = '  '.repeat(indent) + trimmed;
        const openMatch = trimmed.match(/^<([a-zA-Z!][a-zA-Z0-9]*)/);
        if (openMatch && !isClose && !sc.has(openMatch[1].toLowerCase()) && !trimmed.endsWith('/>') && !trimmed.includes('</')) indent++;
        return result;
      }).filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));
      content = formatted.join('\n');
    } else if (['css'].includes(ext)) {
      content = content.replace(/\{/g, ' {\n  ').replace(/;/g, ';\n  ').replace(/\}/g, '\n}\n').replace(/  \n}/g, '\n}').replace(/\n\n+/g, '\n\n');
    } else if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
      content = content.replace(/;(?!\n)/g, ';\n').replace(/\{(?!\n)/g, '{\n').replace(/\}(?!\n)/g, '}\n');
    }
    setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content } }));
    showToast('Code formatted', 'success');
  }, [selectedFile, projectFiles, setProjectFiles, showToast]);

  // v17: Shortcuts Reference
  const [showShortcutsRef, setShowShortcutsRef] = useState(false);

  // v18: CSS Grid/Flex Visualizer
  const [gridFlexDebugActive, setGridFlexDebugActive] = useState(false);

  // v18: Bookmark Lines
  const [bookmarkedLines, setBookmarkedLines] = useState<number[]>([]);
  const toggleBookmark = useCallback((line?: number) => {
    const l = line ?? (monacoEditorRef.current as any)?.getPosition?.()?.lineNumber;
    if (!l) return;
    setBookmarkedLines(prev => prev.includes(l) ? prev.filter(b => b !== l) : [...prev, l].sort((a, b) => a - b));
  }, []);
  const jumpToBookmark = useCallback((line: number) => {
    const ed = monacoEditorRef.current as any;
    if (ed) { ed.revealLineInCenter(line); ed.setPosition({ lineNumber: line, column: 1 }); ed.focus(); }
  }, []);

  // v18: Color Contrast Checker
  const [showContrastPanel, setShowContrastPanel] = useState(false);
  const contrastIssues = useMemo(() => {
    const cssFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.css'));
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
    const allContent = (cssFile?.[1]?.content || '') + (htmlFile?.[1]?.content || '');
    const colorPairs: { fg: string; bg: string; selector: string }[] = [];
    const blockRegex = /([^{}]+)\{([^}]+)\}/g;
    let m;
    while ((m = blockRegex.exec(allContent)) !== null) {
      const sel = m[1].trim();
      const body = m[2];
      const colorM = body.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      const bgM = body.match(/background(?:-color)?\s*:\s*([^;]+)/i);
      if (colorM && bgM) colorPairs.push({ fg: colorM[1].trim(), bg: bgM[1].trim(), selector: sel });
    }
    const hexToRgb = (hex: string) => {
      const h = hex.replace('#', '');
      if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
      if (h.length === 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
      return null;
    };
    const namedColors: Record<string, string> = { white: '#ffffff', black: '#000000', red: '#ff0000', blue: '#0000ff', green: '#008000', gray: '#808080', grey: '#808080', yellow: '#ffff00', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', transparent: '#ffffff' };
    const toHex = (c: string) => namedColors[c.toLowerCase()] || (c.startsWith('#') ? c : null);
    const luminance = (r: number, g: number, b: number) => {
      const [rs, gs, bs] = [r, g, b].map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };
    const results: { selector: string; fg: string; bg: string; ratio: number; aaPass: boolean; aaaPass: boolean }[] = [];
    for (const pair of colorPairs) {
      const fgHex = toHex(pair.fg);
      const bgHex = toHex(pair.bg);
      if (!fgHex || !bgHex) continue;
      const fgRgb = hexToRgb(fgHex);
      const bgRgb = hexToRgb(bgHex);
      if (!fgRgb || !bgRgb) continue;
      const l1 = luminance(fgRgb[0], fgRgb[1], fgRgb[2]);
      const l2 = luminance(bgRgb[0], bgRgb[1], bgRgb[2]);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      results.push({ selector: pair.selector.slice(0, 60), fg: pair.fg, bg: pair.bg, ratio: Math.round(ratio * 100) / 100, aaPass: ratio >= 4.5, aaaPass: ratio >= 7 });
    }
    return results;
  }, [projectFiles]);

  // v18: Z-Index Map
  const [showZIndexPanel, setShowZIndexPanel] = useState(false);
  const zIndexMap = useMemo(() => {
    const results: { selector: string; value: number; file: string }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      const blockRegex = /([^{}]+)\{([^}]+)\}/g;
      let m;
      while ((m = blockRegex.exec(file.content)) !== null) {
        const sel = m[1].trim();
        const zM = m[2].match(/z-index\s*:\s*(-?\d+)/i);
        if (zM) results.push({ selector: sel.slice(0, 60), value: parseInt(zM[1]), file: path });
      }
      const inlineRegex = /style=["'][^"']*z-index\s*:\s*(-?\d+)/gi;
      let im;
      while ((im = inlineRegex.exec(file.content)) !== null) {
        results.push({ selector: '(inline style)', value: parseInt(im[1]), file: path });
      }
    }
    return results.sort((a, b) => b.value - a.value).slice(0, 50);
  }, [projectFiles]);

  // v18: Todo/Fixme Scanner
  const [showTodoScanPanel, setShowTodoScanPanel] = useState(false);
  const todoComments = useMemo(() => {
    const results: { text: string; type: string; file: string; line: number }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      const lines = file.content.split('\n');
      lines.forEach((l, i) => {
        const m = l.match(/\/\/\s*(TODO|FIXME|HACK|NOTE|BUG|XXX|OPTIMIZE)\b[:\s]*(.*)/i) || l.match(/\/\*\s*(TODO|FIXME|HACK|NOTE|BUG|XXX|OPTIMIZE)\b[:\s]*(.*?)\*\//i) || l.match(/<!--\s*(TODO|FIXME|HACK|NOTE|BUG|XXX|OPTIMIZE)\b[:\s]*(.*?)-->/i);
        if (m) results.push({ text: m[2].trim() || m[1], type: m[1].toUpperCase(), file: path, line: i + 1 });
      });
    }
    return results.slice(0, 100);
  }, [projectFiles]);

  // v18: Copy Preview as Image
  const copyPreviewAsImage = useCallback(async () => {
    if (!iframeRef.current) return;
    try {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument;
      if (!doc) { showToast('Cannot access iframe content', 'error'); return; }
      const canvas = document.createElement('canvas');
      const rect = iframe.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(2, 2);
      const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${new XMLSerializer().serializeToString(doc.documentElement)}</div></foreignObject></svg>`;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast('Preview copied as image!', 'success');
          }
        }, 'image/png');
      };
      img.onerror = () => showToast('Screenshot failed — CORS restriction', 'error');
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
    } catch { showToast('Screenshot failed', 'error'); }
  }, [showToast]);

  // v19: Regex Tester
  const [showRegexPanel, setShowRegexPanel] = useState(false);
  const [regexInput, setRegexInput] = useState('');
  const [regexTestStr, setRegexTestStr] = useState('');
  const regexMatches = useMemo(() => {
    if (!regexInput || !regexTestStr) return [];
    try {
      const re = new RegExp(regexInput, 'g');
      const matches: { match: string; index: number; groups: string[] }[] = [];
      let m;
      let safety = 0;
      while ((m = re.exec(regexTestStr)) !== null && safety++ < 200) {
        matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
        if (!m[0]) re.lastIndex++;
      }
      return matches;
    } catch { return []; }
  }, [regexInput, regexTestStr]);

  // v19: CSS Specificity Calculator
  const [showSpecificityPanel, setShowSpecificityPanel] = useState(false);
  const cssSpecificity = useMemo(() => {
    const cssFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.css'));
    if (!cssFile) return [];
    const selectorRegex = /([^{}@\n][^{]*?)\s*\{/g;
    const results: { selector: string; specificity: [number, number, number]; score: number }[] = [];
    let m;
    while ((m = selectorRegex.exec(cssFile[1].content)) !== null) {
      const sel = m[1].trim();
      if (!sel || sel.startsWith('@') || sel.startsWith('from') || sel.startsWith('to') || /^\d+%$/.test(sel)) continue;
      const ids = (sel.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).length;
      const classes = (sel.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g) || []).length + (sel.match(/\[[^\]]+\]/g) || []).length + (sel.match(/:[a-zA-Z-]+/g) || []).filter(p => !p.startsWith('::') && p !== ':not' && p !== ':is' && p !== ':where').length;
      const elements = (sel.match(/(?:^|[\s>+~])([a-zA-Z][a-zA-Z0-9]*)/g) || []).length + (sel.match(/::[a-zA-Z-]+/g) || []).length;
      results.push({ selector: sel.slice(0, 80), specificity: [ids, classes, elements], score: ids * 100 + classes * 10 + elements });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 80);
  }, [projectFiles]);

  // v19: Image Lazy Loading Checker
  const [showLazyImgPanel, setShowLazyImgPanel] = useState(false);
  const lazyImgIssues = useMemo(() => {
    const results: { src: string; file: string; line: number; hasLazy: boolean; hasAlt: boolean; hasWidth: boolean }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      const imgRegex = /<img\s([^>]*)>/gi;
      let m;
      while ((m = imgRegex.exec(file.content)) !== null) {
        const attrs = m[1];
        const src = attrs.match(/src=["']([^"']*)["']/i)?.[1] || '(no src)';
        const line = file.content.substring(0, m.index).split('\n').length;
        results.push({
          src: src.slice(0, 60), file: path, line,
          hasLazy: /loading=["']lazy["']/i.test(attrs),
          hasAlt: /alt=["']/i.test(attrs),
          hasWidth: /width=/i.test(attrs) && /height=/i.test(attrs),
        });
      }
    }
    return results;
  }, [projectFiles]);

  // v19: Text Statistics
  const [showTextStatsPanel, setShowTextStatsPanel] = useState(false);
  const textStats = useMemo(() => {
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
    if (!htmlFile) return null;
    const html = htmlFile[1].content;
    const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    const words = textOnly.split(/\s+/).filter(w => w.length > 0);
    const sentences = textOnly.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = (word: string) => { const w = word.toLowerCase().replace(/[^a-z]/g, ''); const m = w.match(/[aeiouy]+/g); return m ? m.length : 1; };
    const totalSyllables = words.reduce((a, w) => a + syllables(w), 0);
    const fleschKincaid = words.length > 0 && sentences.length > 0 ? 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (totalSyllables / words.length) : 0;
    return {
      chars: textOnly.length, words: words.length, sentences: sentences.length, paragraphs: html.split(/<\/p>/i).length - 1,
      readingTime: Math.ceil(words.length / 200),
      readability: Math.round(Math.max(0, Math.min(100, fleschKincaid))),
      headings: (html.match(/<h[1-6][^>]*>/gi) || []).length,
      links: (html.match(/<a\s/gi) || []).length,
      images: (html.match(/<img\s/gi) || []).length,
    };
  }, [projectFiles]);

  // v19: Duplicate Code Detector
  const [showDuplicatePanel, setShowDuplicatePanel] = useState(false);
  const duplicateBlocks = useMemo(() => {
    const results: { code: string; files: string[]; count: number }[] = [];
    const allBlocks: Map<string, string[]> = new Map();
    for (const [path, file] of Object.entries(projectFiles)) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length - 2; i++) {
        const block = lines.slice(i, i + 3).map(l => l.trim()).join('\n');
        if (block.length < 30 || block.replace(/\s/g, '').length < 15) continue;
        const existing = allBlocks.get(block) || [];
        if (!existing.includes(path)) existing.push(path);
        allBlocks.set(block, existing);
      }
    }
    for (const [code, files] of allBlocks) {
      if (files.length > 1 || Array.from(allBlocks.values()).filter(f => f.includes(files[0])).length > 2) {
        const count = Array.from(allBlocks.entries()).filter(([c]) => c === code).length;
        if (files.length > 1) results.push({ code: code.slice(0, 150), files, count: files.length });
      }
    }
    return results.sort((a, b) => b.count - a.count).slice(0, 30);
  }, [projectFiles]);

  // v19: Element Counter
  const [showElementCountPanel, setShowElementCountPanel] = useState(false);
  const elementCounts = useMemo(() => {
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html') || p.endsWith('.htm'));
    if (!htmlFile) return null;
    const html = htmlFile[1].content;
    const tagCounts: Record<string, number> = {};
    const tagRegex = /<([a-zA-Z][a-zA-Z0-9]*)(?:\s|>|\/)/g;
    let m;
    while ((m = tagRegex.exec(html)) !== null) {
      const tag = m[1].toLowerCase();
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    const classes = new Set((html.match(/class=["']([^"']*)["']/g) || []).flatMap(c => c.replace(/class=["']/,'').replace(/["']$/,'').split(/\s+/)));
    const ids = new Set((html.match(/id=["']([^"']*)["']/g) || []).map(c => c.replace(/id=["']/,'').replace(/["']$/,'')));
    return {
      totalElements: Object.values(tagCounts).reduce((a, b) => a + b, 0),
      uniqueTags: Object.keys(tagCounts).length,
      tagCounts: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]),
      totalClasses: classes.size,
      totalIds: ids.size,
      scripts: tagCounts['script'] || 0,
      styles: tagCounts['style'] || 0,
      divs: tagCounts['div'] || 0,
      spans: tagCounts['span'] || 0,
    };
  }, [projectFiles]);

  // v20: Console Filter & Export
  const [showConsoleFilter, setShowConsoleFilter] = useState(false);
  const [consoleFilterLevel, setConsoleFilterLevel] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  const filteredConsoleLogs = useMemo(() => {
    if (consoleFilterLevel === 'all') return consoleLogs;
    return consoleLogs.filter(l => l.type === consoleFilterLevel);
  }, [consoleLogs, consoleFilterLevel]);
  const exportConsoleLogs = () => {
    const text = filteredConsoleLogs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `console-${Date.now()}.log`; a.click();
    URL.revokeObjectURL(url);
  };

  // v20: Inline Color Picker
  const [showColorEdit, setShowColorEdit] = useState(false);
  const [colorEditValue, setColorEditValue] = useState('#ffffff');
  const [colorEditTarget, setColorEditTarget] = useState<{ file: string; match: string; index: number } | null>(null);
  const detectedColors = useMemo(() => {
    const results: { color: string; file: string; line: number; index: number }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      const colorRegex = /(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\))/g;
      let m;
      while ((m = colorRegex.exec(file.content)) !== null) {
        results.push({ color: m[1], file: path, line: file.content.substring(0, m.index).split('\n').length, index: m.index });
      }
    }
    return results.slice(0, 100);
  }, [projectFiles]);
  const applyColorEdit = () => {
    if (!colorEditTarget) return;
    setProjectFiles(prev => {
      const file = prev[colorEditTarget.file];
      if (!file) return prev;
      const content = file.content.substring(0, colorEditTarget.index) + colorEditValue + file.content.substring(colorEditTarget.index + colorEditTarget.match.length);
      return { ...prev, [colorEditTarget.file]: { ...file, content } };
    });
    setColorEditTarget(null);
  };

  // v20: Code Folding Map
  const [showFoldMap, setShowFoldMap] = useState(false);
  const foldRegions = useMemo(() => {
    if (!selectedFile) return [];
    const content = projectFiles[selectedFile]?.content || '';
    const lines = content.split('\n');
    const regions: { start: number; end: number; depth: number; label: string }[] = [];
    const stack: number[] = [];
    lines.forEach((line, i) => {
      const opens = (line.match(/[{(\[]/g) || []).length;
      const closes = (line.match(/[})\]]/g) || []).length;
      if (opens > closes) {
        stack.push(i);
      } else if (closes > opens && stack.length > 0) {
        const start = stack.pop()!;
        if (i - start > 2) {
          regions.push({ start: start + 1, end: i + 1, depth: stack.length + 1, label: lines[start].trim().slice(0, 50) });
        }
      }
    });
    return regions.sort((a, b) => a.start - b.start).slice(0, 100);
  }, [selectedFile, projectFiles]);

  // v20: Dependency Graph
  const [showDepGraph, setShowDepGraph] = useState(false);
  const depGraph = useMemo(() => {
    const nodes: { id: string; type: string }[] = [];
    const edges: { from: string; to: string }[] = [];
    const fileNames = Object.keys(projectFiles);
    for (const [path, file] of Object.entries(projectFiles)) {
      const ext = path.split('.').pop() || '';
      nodes.push({ id: path, type: ext });
      const importRegex = /(?:import|require)\s*(?:\(\s*)?['"]([^'"]+)['"]/g;
      let m;
      while ((m = importRegex.exec(file.content)) !== null) {
        const dep = m[1];
        const resolved = fileNames.find(f => f.endsWith(dep) || f.endsWith(dep + '.ts') || f.endsWith(dep + '.tsx') || f.endsWith(dep + '.js') || f.endsWith(dep + '.jsx'));
        if (resolved) edges.push({ from: path, to: resolved });
      }
    }
    return { nodes, edges };
  }, [projectFiles]);

  // v20: Performance Budget
  const [showPerfBudget, setShowPerfBudget] = useState(false);
  const perfBudget = useMemo(() => {
    const totalSize = Object.values(projectFiles).reduce((a, f) => a + new Blob([f.content]).size, 0);
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html'));
    const html = htmlFile?.[1]?.content || '';
    const scriptCount = (html.match(/<script/gi) || []).length;
    const styleCount = (html.match(/<link[^>]*stylesheet/gi) || []).length + (html.match(/<style/gi) || []).length;
    const imgCount = (html.match(/<img/gi) || []).length;
    const domDepth = (() => { let max = 0, cur = 0; for (const ch of html) { if (ch === '<') cur++; else if (ch === '/') { cur--; max = Math.max(max, cur); } } return max; })();
    const checks = [
      { name: 'Total Size', value: `${(totalSize / 1024).toFixed(1)} KB`, pass: totalSize < 500 * 1024, limit: '< 500 KB' },
      { name: 'Scripts', value: `${scriptCount}`, pass: scriptCount <= 10, limit: '≤ 10' },
      { name: 'Stylesheets', value: `${styleCount}`, pass: styleCount <= 5, limit: '≤ 5' },
      { name: 'Images', value: `${imgCount}`, pass: imgCount <= 20, limit: '≤ 20' },
      { name: 'DOM Depth', value: `${domDepth}`, pass: domDepth < 32, limit: '< 32' },
      { name: 'Files', value: `${Object.keys(projectFiles).length}`, pass: Object.keys(projectFiles).length <= 50, limit: '≤ 50' },
    ];
    return { checks, score: Math.round((checks.filter(c => c.pass).length / checks.length) * 100) };
  }, [projectFiles]);

  // v20: Responsive Preview Grid
  const [showResponsiveGrid, setShowResponsiveGrid] = useState(false);
  const RESPONSIVE_VIEWPORTS = [
    { name: 'Mobile', w: 375, h: 667, icon: '📱' },
    { name: 'Tablet', w: 768, h: 1024, icon: '📋' },
    { name: 'Laptop', w: 1280, h: 800, icon: '💻' },
    { name: 'Desktop', w: 1920, h: 1080, icon: '🖥' },
  ];

  // v21: CSS Animation Inspector
  const [showAnimPanel, setShowAnimPanel] = useState(false);
  const cssAnimations = useMemo(() => {
    const results: { name: string; type: 'keyframes' | 'animation' | 'transition'; detail: string; file: string }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      if (!path.endsWith('.css') && !path.endsWith('.html')) continue;
      const kf = file.content.matchAll(/@keyframes\s+([\w-]+)/g);
      for (const m of kf) results.push({ name: m[1], type: 'keyframes', detail: 'Keyframe definition', file: path });
      const anim = file.content.matchAll(/animation(?:-name)?\s*:\s*([^;{]+)/g);
      for (const m of anim) results.push({ name: m[1].trim().split(/\s+/)[0], type: 'animation', detail: m[1].trim().slice(0, 60), file: path });
      const trans = file.content.matchAll(/transition\s*:\s*([^;{]+)/g);
      for (const m of trans) results.push({ name: m[1].trim().split(/\s+/)[0], type: 'transition', detail: m[1].trim().slice(0, 60), file: path });
    }
    return results.slice(0, 80);
  }, [projectFiles]);

  // v21: Event Listener Audit
  const [showEventAudit, setShowEventAudit] = useState(false);
  const inlineEvents = useMemo(() => {
    const results: { event: string; element: string; file: string; line: number; handler: string }[] = [];
    const eventNames = ['onclick', 'onchange', 'onsubmit', 'onmouseover', 'onmouseout', 'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur', 'oninput', 'onload', 'onerror', 'onscroll', 'onresize'];
    for (const [path, file] of Object.entries(projectFiles)) {
      const lines = file.content.split('\n');
      lines.forEach((line, i) => {
        for (const evt of eventNames) {
          const regex = new RegExp(`<(\\w+)[^>]*\\s${evt}=(["'])([^"']*?)\\2`, 'gi');
          let m;
          while ((m = regex.exec(line)) !== null) {
            results.push({ event: evt, element: m[1], file: path, line: i + 1, handler: m[3].slice(0, 50) });
          }
        }
      });
    }
    return results.slice(0, 100);
  }, [projectFiles]);

  // v21: Open Graph Preview
  const [showOgPreview, setShowOgPreview] = useState(false);
  const ogData = useMemo(() => {
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html'));
    if (!htmlFile) return null;
    const html = htmlFile[1].content;
    const getMeta = (prop: string) => html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'))?.[1] || '';
    const title = getMeta('og:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1] || 'Untitled';
    const desc = getMeta('og:description') || getMeta('description') || '';
    const image = getMeta('og:image') || '';
    const siteName = getMeta('og:site_name') || '';
    const twitterCard = getMeta('twitter:card') || 'summary';
    return { title, desc, image, siteName, twitterCard };
  }, [projectFiles]);

  // v21: Semantic HTML Checker
  const [showSemanticPanel, setShowSemanticPanel] = useState(false);
  const semanticIssues = useMemo(() => {
    const results: { issue: string; suggestion: string; line: number; file: string; severity: 'warn' | 'error' }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      if (!path.endsWith('.html') && !path.endsWith('.htm')) continue;
      const lines = file.content.split('\n');
      lines.forEach((line, i) => {
        if (/<div[^>]*class=["'][^"']*header[^"']*["']/i.test(line)) results.push({ issue: '<div> used as header', suggestion: 'Use <header>', line: i + 1, file: path, severity: 'warn' });
        if (/<div[^>]*class=["'][^"']*footer[^"']*["']/i.test(line)) results.push({ issue: '<div> used as footer', suggestion: 'Use <footer>', line: i + 1, file: path, severity: 'warn' });
        if (/<div[^>]*class=["'][^"']*nav[^"']*["']/i.test(line)) results.push({ issue: '<div> used as navigation', suggestion: 'Use <nav>', line: i + 1, file: path, severity: 'warn' });
        if (/<div[^>]*class=["'][^"']*sidebar[^"']*["']/i.test(line)) results.push({ issue: '<div> used as sidebar', suggestion: 'Use <aside>', line: i + 1, file: path, severity: 'warn' });
        if (/<div[^>]*class=["'][^"']*main[^"']*["']/i.test(line)) results.push({ issue: '<div> used as main content', suggestion: 'Use <main>', line: i + 1, file: path, severity: 'warn' });
        if (/<div[^>]*class=["'][^"']*article[^"']*["']/i.test(line)) results.push({ issue: '<div> used as article', suggestion: 'Use <article>', line: i + 1, file: path, severity: 'warn' });
        if (/<div[^>]*class=["'][^"']*section[^"']*["']/i.test(line)) results.push({ issue: '<div> used as section', suggestion: 'Use <section>', line: i + 1, file: path, severity: 'warn' });
        if (/<b>/i.test(line)) results.push({ issue: '<b> tag used', suggestion: 'Use <strong> for semantic emphasis', line: i + 1, file: path, severity: 'warn' });
        if (/<i>/i.test(line) && !/<i\s+class/i.test(line)) results.push({ issue: '<i> tag used', suggestion: 'Use <em> for semantic emphasis', line: i + 1, file: path, severity: 'warn' });
      });
    }
    return results.slice(0, 100);
  }, [projectFiles]);

  // v21: Whitespace/Indent Checker
  const [showWhitespacePanel, setShowWhitespacePanel] = useState(false);
  const whitespaceIssues = useMemo(() => {
    const results: { issue: string; file: string; line: number; type: 'mixed-indent' | 'trailing' | 'inconsistent' }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      const lines = file.content.split('\n');
      let tabCount = 0, spaceCount = 0;
      lines.forEach((line, i) => {
        if (line.match(/^\t/)) tabCount++;
        if (line.match(/^  /)) spaceCount++;
        if (line.match(/^\t+ /) || line.match(/^ +\t/)) results.push({ issue: 'Mixed tabs and spaces', file: path, line: i + 1, type: 'mixed-indent' });
        if (line.match(/\s+$/) && line.trim().length > 0) results.push({ issue: 'Trailing whitespace', file: path, line: i + 1, type: 'trailing' });
      });
      if (tabCount > 0 && spaceCount > 0 && Math.min(tabCount, spaceCount) > 3) {
        results.push({ issue: `Inconsistent indentation (${tabCount} tab lines, ${spaceCount} space lines)`, file: path, line: 1, type: 'inconsistent' });
      }
    }
    return results.slice(0, 150);
  }, [projectFiles]);

  // v22: PWA Checker
  const [showPwaPanel, setShowPwaPanel] = useState(false);
  const pwaChecks = useMemo(() => {
    const manifest = Object.entries(projectFiles).find(([p]) => p.includes('manifest') && p.endsWith('.json'));
    const sw = Object.entries(projectFiles).find(([p]) => p.includes('service-worker') || p.includes('sw.js'));
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html'));
    const html = htmlFile?.[1]?.content || '';
    const hasManifestLink = /<link[^>]*manifest/i.test(html);
    const hasThemeColor = /<meta[^>]*theme-color/i.test(html);
    const hasViewport = /<meta[^>]*viewport/i.test(html);
    const hasAppleTouchIcon = /<link[^>]*apple-touch-icon/i.test(html);
    const hasHttpsLinks = !html.includes('http://') || html.includes('https://');
    const checks = [
      { name: 'Manifest file', pass: !!manifest, detail: manifest ? manifest[0] : 'Not found' },
      { name: 'Manifest link in HTML', pass: hasManifestLink, detail: hasManifestLink ? 'Found' : 'Missing <link rel="manifest">' },
      { name: 'Service Worker', pass: !!sw, detail: sw ? sw[0] : 'Not found' },
      { name: 'Theme Color', pass: hasThemeColor, detail: hasThemeColor ? 'Found' : 'Missing <meta name="theme-color">' },
      { name: 'Viewport Meta', pass: hasViewport, detail: hasViewport ? 'Found' : 'Missing viewport meta' },
      { name: 'Apple Touch Icon', pass: hasAppleTouchIcon, detail: hasAppleTouchIcon ? 'Found' : 'Missing apple-touch-icon' },
      { name: 'HTTPS Resources', pass: hasHttpsLinks, detail: hasHttpsLinks ? 'All secure' : 'Mixed content detected' },
    ];
    return { checks, score: Math.round((checks.filter(c => c.pass).length / checks.length) * 100) };
  }, [projectFiles]);

  // v22: Schema.org / JSON-LD Validator
  const [showSchemaPanel, setShowSchemaPanel] = useState(false);
  const schemaData = useMemo(() => {
    const results: { type: string; props: string[]; valid: boolean; raw: string }[] = [];
    for (const [, file] of Object.entries(projectFiles)) {
      const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = regex.exec(file.content)) !== null) {
        try {
          const json = JSON.parse(m[1]);
          const type = json['@type'] || 'Unknown';
          const props = Object.keys(json).filter(k => k !== '@context' && k !== '@type');
          results.push({ type, props, valid: true, raw: m[1].trim().slice(0, 200) });
        } catch {
          results.push({ type: 'Invalid JSON', props: [], valid: false, raw: m[1].trim().slice(0, 200) });
        }
      }
    }
    return results;
  }, [projectFiles]);

  // v22: Bundle Size Estimator
  const [showBundlePanel, setShowBundlePanel] = useState(false);
  const bundleEstimate = useMemo(() => {
    const files = Object.entries(projectFiles).map(([path, file]) => {
      const raw = new Blob([file.content]).size;
      const minified = new Blob([file.content.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')]).size;
      const ext = path.split('.').pop() || '';
      return { path, raw, minified, savings: raw - minified, ext };
    });
    const totalRaw = files.reduce((a, f) => a + f.raw, 0);
    const totalMin = files.reduce((a, f) => a + f.minified, 0);
    return { files: files.sort((a, b) => b.raw - a.raw), totalRaw, totalMin, savings: totalRaw - totalMin };
  }, [projectFiles]);

  // v22: ARIA Roles Inspector
  const [showAriaPanel, setShowAriaPanel] = useState(false);
  const ariaRoles = useMemo(() => {
    const results: { role: string; element: string; file: string; line: number; hasLabel: boolean }[] = [];
    for (const [path, file] of Object.entries(projectFiles)) {
      const lines = file.content.split('\n');
      lines.forEach((line, i) => {
        const roleMatch = line.matchAll(/role=["']([^"']+)["']/gi);
        for (const m of roleMatch) {
          const tagMatch = line.match(/<(\w+)/);
          const hasLabel = /aria-label/i.test(line) || /aria-labelledby/i.test(line);
          results.push({ role: m[1], element: tagMatch?.[1] || '?', file: path, line: i + 1, hasLabel });
        }
        const ariaAttrs = line.matchAll(/aria-([a-z]+)=["']([^"']*)["']/gi);
        for (const m of ariaAttrs) {
          if (m[1] === 'label' || m[1] === 'labelledby' || m[1] === 'describedby') continue;
          const tagMatch = line.match(/<(\w+)/);
          results.push({ role: `aria-${m[1]}`, element: tagMatch?.[1] || '?', file: path, line: i + 1, hasLabel: true });
        }
      });
    }
    return results.slice(0, 100);
  }, [projectFiles]);

  // v22: Security Headers Check
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const securityChecks = useMemo(() => {
    const htmlFile = Object.entries(projectFiles).find(([p]) => p.endsWith('.html'));
    const html = htmlFile?.[1]?.content || '';
    const checks = [
      { name: 'Content-Security-Policy', pass: /<meta[^>]*Content-Security-Policy/i.test(html), detail: 'CSP header/meta tag' },
      { name: 'X-Frame-Options', pass: /<meta[^>]*X-Frame-Options/i.test(html), detail: 'Clickjacking protection' },
      { name: 'No inline scripts', pass: !(/<script(?![^>]*src)[^>]*>[^<]+/i.test(html)), detail: 'Avoid inline JS for XSS protection' },
      { name: 'No eval() usage', pass: !Object.values(projectFiles).some(f => /\beval\s*\(/i.test(f.content)), detail: 'eval() is a security risk' },
      { name: 'No document.write', pass: !Object.values(projectFiles).some(f => /document\.write/i.test(f.content)), detail: 'document.write is a vulnerability' },
      { name: 'No innerHTML', pass: !Object.values(projectFiles).some(f => /\.innerHTML\s*=/i.test(f.content)), detail: 'innerHTML enables XSS' },
      { name: 'Subresource Integrity', pass: /<script[^>]*integrity=/i.test(html) || !(/<script[^>]*src=["']http/i.test(html)), detail: 'SRI for external scripts' },
      { name: 'HTTPS only', pass: !/(src|href)=["']http:\/\//i.test(html), detail: 'All resources over HTTPS' },
    ];
    return { checks, score: Math.round((checks.filter(c => c.pass).length / checks.length) * 100) };
  }, [projectFiles]);

  // v22: Project Export ZIP
  const exportProjectZip = async () => {
    const files = Object.entries(projectFiles);
    if (files.length === 0) return;
    // Simple ZIP creation (store method, no compression for browser compat)
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;
    for (const [path, file] of files) {
      const nameBytes = encoder.encode(path);
      const dataBytes = encoder.encode(file.content);
      // Local file header
      const header = new Uint8Array(30 + nameBytes.length);
      const hView = new DataView(header.buffer);
      hView.setUint32(0, 0x04034b50, true); // signature
      hView.setUint16(4, 20, true); // version
      hView.setUint16(8, 0, true); // method (store)
      hView.setUint32(18, dataBytes.length, true); // compressed
      hView.setUint32(22, dataBytes.length, true); // uncompressed
      hView.setUint16(26, nameBytes.length, true);
      header.set(nameBytes, 30);
      parts.push(header, dataBytes);
      // Central directory entry
      const cdEntry = new Uint8Array(46 + nameBytes.length);
      const cdView = new DataView(cdEntry.buffer);
      cdView.setUint32(0, 0x02014b50, true);
      cdView.setUint16(4, 20, true);
      cdView.setUint16(6, 20, true);
      cdView.setUint32(20, dataBytes.length, true);
      cdView.setUint32(24, dataBytes.length, true);
      cdView.setUint16(28, nameBytes.length, true);
      cdView.setUint32(42, offset, true);
      cdEntry.set(nameBytes, 46);
      centralDir.push(cdEntry);
      offset += header.length + dataBytes.length;
    }
    const cdOffset = offset;
    let cdSize = 0;
    for (const cd of centralDir) { parts.push(cd); cdSize += cd.length; }
    // End of central directory
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(8, files.length, true);
    eocdView.setUint16(10, files.length, true);
    eocdView.setUint32(12, cdSize, true);
    eocdView.setUint32(16, cdOffset, true);
    parts.push(eocd);
    const blob = new Blob(parts as BlobPart[], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `project-${Date.now()}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  // ═══ v23: Real-Time Collaboration ═══
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [collabRoomId, setCollabRoomId] = useState('');
  const [collabUsers, setCollabUsers] = useState<{ id: string; name: string; color: string; active: boolean; cursor?: { file: string; line: number; col: number } }[]>([]);
  const [collabJoinInput, setCollabJoinInput] = useState('');
  const collabUserId = useRef(Math.random().toString(36).slice(2, 8));
  const collabUserName = useRef('User-' + Math.random().toString(36).slice(2, 5).toUpperCase());
  const collabColors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
  const collabColorRef = useRef(collabColors[Math.floor(Math.random() * collabColors.length)]);
  const collabChannelRef = useRef<BroadcastChannel | null>(null);
  const collabSSERef = useRef<EventSource | null>(null);
  const [collabMode, setCollabMode] = useState<'local' | 'remote'>('local');

  const connectCollabSSE = useCallback((roomId: string, selfId: string) => {
    if (collabSSERef.current) { collabSSERef.current.close(); collabSSERef.current = null; }
    const es = new EventSource(`/api/collab?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(selfId)}`);
    collabSSERef.current = es;
    es.addEventListener('users', (e) => {
      try {
        const users = JSON.parse(e.data);
        setCollabUsers(users.map((u: { id: string; name: string; color: string; cursor?: { file: string; line: number; col: number } }) => ({ ...u, active: true })));
      } catch {}
    });
    es.addEventListener('signals', (e) => {
      try { JSON.parse(e.data); /* handle WebRTC signals if needed */ } catch {}
    });
    es.addEventListener('file-ops', (e) => {
      try {
        const ops = JSON.parse(e.data);
        for (const op of ops) {
          setProjectFiles(prev => ({ ...prev, [op.path]: { content: op.content, language: op.language } }));
        }
      } catch {}
    });
    es.addEventListener('error', () => {
      // Auto-reconnect is built into EventSource
    });
  }, []);

  const startCollabRoom = useCallback(async () => {
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    setCollabRoomId(roomId);
    const self = { id: collabUserId.current, name: collabUserName.current, color: collabColorRef.current, active: true };

    // Try API-based (cross-device)
    try {
      const res = await fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', roomId, userId: self.id, userName: self.name, userColor: self.color }),
      });
      if (res.ok) {
        setCollabMode('remote');
        setCollabUsers([self]);
        // Connect SSE stream for real-time updates
        connectCollabSSE(roomId, self.id);
        navigator.clipboard?.writeText(roomId).catch(() => {});
        return;
      }
    } catch { /* API unavailable, fall back to BroadcastChannel */ }

    // Fallback: BroadcastChannel (same-origin tabs)
    setCollabMode('local');
    const ch = new BroadcastChannel(`aurion-collab-${roomId}`);
    collabChannelRef.current = ch;
    setCollabUsers([self]);
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'join') {
        setCollabUsers(prev => {
          if (prev.find(u => u.id === msg.user.id)) return prev;
          return [...prev, { ...msg.user, active: true }];
        });
        ch.postMessage({ type: 'presence', user: self });
      } else if (msg.type === 'presence') {
        setCollabUsers(prev => {
          if (prev.find(u => u.id === msg.user.id)) return prev;
          return [...prev, { ...msg.user, active: true }];
        });
      } else if (msg.type === 'file-change' && msg.userId !== collabUserId.current) {
        setProjectFiles(prev => ({ ...prev, [msg.path]: { content: msg.content, language: msg.language } }));
      } else if (msg.type === 'cursor-update' && msg.userId !== collabUserId.current) {
        setCollabUsers(prev => prev.map(u => u.id === msg.userId ? { ...u, cursor: msg.cursor } : u));
      } else if (msg.type === 'leave') {
        setCollabUsers(prev => prev.filter(u => u.id !== msg.userId));
      }
    };
    navigator.clipboard?.writeText(roomId).catch(() => {});
  }, [connectCollabSSE]);

  const joinCollabRoom = useCallback(async (roomId: string) => {
    if (!roomId.trim()) return;
    const rid = roomId.trim().toUpperCase();
    setCollabRoomId(rid);
    const self = { id: collabUserId.current, name: collabUserName.current, color: collabColorRef.current, active: true };

    // Try API join first
    try {
      const res = await fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomId: rid, userId: self.id, userName: self.name, userColor: self.color }),
      });
      if (res.ok) {
        const data = await res.json();
        setCollabMode('remote');
        setCollabUsers(data.users.map((u: { id: string; name: string; color: string }) => ({ ...u, active: true })));
        // Connect SSE stream for real-time updates
        connectCollabSSE(rid, self.id);
        return;
      }
    } catch { /* fallback */ }

    // Fallback: BroadcastChannel
    setCollabMode('local');
    const ch = new BroadcastChannel(`aurion-collab-${rid}`);
    collabChannelRef.current = ch;
    setCollabUsers([self]);
    ch.postMessage({ type: 'join', user: self });
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'join' || msg.type === 'presence') {
        setCollabUsers(prev => {
          if (prev.find(u => u.id === msg.user.id)) return prev;
          return [...prev, { ...msg.user, active: true }];
        });
        if (msg.type === 'join') ch.postMessage({ type: 'presence', user: self });
      } else if (msg.type === 'file-change' && msg.userId !== collabUserId.current) {
        setProjectFiles(prev => ({ ...prev, [msg.path]: { content: msg.content, language: msg.language } }));
      } else if (msg.type === 'cursor-update' && msg.userId !== collabUserId.current) {
        setCollabUsers(prev => prev.map(u => u.id === msg.userId ? { ...u, cursor: msg.cursor } : u));
      } else if (msg.type === 'leave') {
        setCollabUsers(prev => prev.filter(u => u.id !== msg.userId));
      }
    };
  }, [connectCollabSSE]);

  const leaveCollabRoom = useCallback(() => {
    // Close SSE stream
    if (collabSSERef.current) {
      collabSSERef.current.close();
      collabSSERef.current = null;
    }
    // Notify server
    if (collabMode === 'remote' && collabRoomId) {
      fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', roomId: collabRoomId, userId: collabUserId.current }),
      }).catch(() => {});
    }
    // BroadcastChannel cleanup
    if (collabChannelRef.current) {
      collabChannelRef.current.postMessage({ type: 'leave', userId: collabUserId.current });
      collabChannelRef.current.close();
      collabChannelRef.current = null;
    }
    setCollabRoomId('');
    setCollabUsers([]);
    setCollabMode('local');
  }, [collabMode, collabRoomId]);

  // Broadcast file changes to collaborators
  useEffect(() => {
    if (!collabRoomId) return;
    const timer = setTimeout(() => {
      if (selectedFile && projectFiles[selectedFile]) {
        // Remote mode: send via API
        if (collabMode === 'remote') {
          fetch('/api/collab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'file-change',
              roomId: collabRoomId,
              userId: collabUserId.current,
              path: selectedFile,
              content: projectFiles[selectedFile].content,
              language: projectFiles[selectedFile].language,
            }),
          }).catch(() => {});
        }
        // BroadcastChannel (always send for local tabs)
        collabChannelRef.current?.postMessage({
          type: 'file-change',
          userId: collabUserId.current,
          path: selectedFile,
          content: projectFiles[selectedFile].content,
          language: projectFiles[selectedFile].language,
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFiles[selectedFile]?.content, collabRoomId, collabMode]);

  // Cleanup collab on unmount
  useEffect(() => {
    return () => {
      if (collabSSERef.current) collabSSERef.current.close();
      if (collabChannelRef.current) {
        collabChannelRef.current.postMessage({ type: 'leave', userId: collabUserId.current });
        collabChannelRef.current.close();
      }
    };
  }, []);

  // ═══ v23: Feedback & Rating System ═══
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<{ rating: number; comment: string; ts: number }[]>([]);

  // ═══ Toolbar dropdown menus ═══
  const [showInspectMenu, setShowInspectMenu] = useState(false);
  const [showAnalyzeMenu, setShowAnalyzeMenu] = useState(false);

  // ═══ v24: Live Database Engine ═══
  const dbEngineRef = useRef(getDatabaseEngine());
  const [dbActiveConnection, setDbActiveConnection] = useState<string | null>(null);
  const [dbSqlInput, setDbSqlInput] = useState('SELECT * FROM users LIMIT 20;');
  const [dbQueryResult, setDbQueryResult] = useState<QueryResult | null>(null);
  const [dbQueryRunning, setDbQueryRunning] = useState(false);
  const [dbSchema, setDbSchema] = useState<DBTable[]>([]);
  const [dbSchemaLoading, setDbSchemaLoading] = useState(false);
  const [dbQueryHistory, setDbQueryHistory] = useState<QueryHistoryEntry[]>([]);
  const [dbSchemaTemplate, setDbSchemaTemplate] = useState<string | null>(null);
  const [dbViewMode, setDbViewMode] = useState<'query' | 'schema' | 'history' | 'templates'>('query');

  const connectDatabase = useCallback((provider: 'supabase' | 'neon', url: string, apiKey: string) => {
    const id = `${provider}_${Date.now()}`;
    dbEngineRef.current.addConnection({ id, provider, name: `${provider} DB`, url, apiKey, status: 'disconnected' });
    setDbActiveConnection(id);
    setTerminalLines(prev => [...prev, `$ ✓ Database connected: ${provider}`]);
    // Auto-fetch schema
    setDbSchemaLoading(true);
    dbEngineRef.current.getSchema(id).then(schema => {
      setDbSchema(schema);
      setDbSchemaLoading(false);
    }).catch(() => setDbSchemaLoading(false));
  }, []);

  const runDatabaseQuery = useCallback(async () => {
    if (!dbActiveConnection || !dbSqlInput.trim()) return;
    setDbQueryRunning(true);
    setDbQueryResult(null);
    const result = await dbEngineRef.current.executeQuery(dbActiveConnection, dbSqlInput.trim());
    setDbQueryResult(result);
    setDbQueryHistory(dbEngineRef.current.getHistory());
    setDbQueryRunning(false);
    if (result.error) {
      setTerminalLines(prev => [...prev, `$ ✗ SQL error: ${result.error}`]);
    } else {
      setTerminalLines(prev => [...prev, `$ ✓ Query OK: ${result.rowCount} row(s) in ${result.duration}ms`]);
    }
  }, [dbActiveConnection, dbSqlInput]);

  const runSchemaTemplate = useCallback(async (templateKey: string) => {
    if (!dbActiveConnection) return;
    const template = SCHEMA_TEMPLATES[templateKey];
    if (!template) return;
    setDbQueryRunning(true);
    const result = await dbEngineRef.current.executeQuery(dbActiveConnection, template.sql);
    setDbQueryResult(result);
    setDbQueryHistory(dbEngineRef.current.getHistory());
    setDbQueryRunning(false);
    if (!result.error) {
      setTerminalLines(prev => [...prev, `$ ✓ Schema "${template.name}" applied`]);
      // Refresh schema
      dbEngineRef.current.getSchema(dbActiveConnection).then(setDbSchema);
    }
  }, [dbActiveConnection]);

  // ═══ v24: Collaboration Engine (CRDT upgrade) ═══
  const collabEngineRef = useRef<CollaborationEngine | null>(null);
  const [collabChatMessages, setCollabChatMessages] = useState<CollabMessage[]>([]);
  const [collabChatInput, setCollabChatInput] = useState('');

  const initCollabEngine = useCallback(() => {
    if (!collabEngineRef.current) {
      collabEngineRef.current = new CollaborationEngine(
        collabUserId.current,
        collabUserName.current,
        collabColorRef.current,
      );
      collabEngineRef.current.on((event: CollabEvent) => {
        switch (event.type) {
          case 'user-joined':
            setCollabUsers(prev => {
              if (prev.find(u => u.id === event.user.id)) return prev;
              return [...prev, { id: event.user.id, name: event.user.name, color: event.user.color, active: true }];
            });
            break;
          case 'user-left':
            setCollabUsers(prev => prev.filter(u => u.id !== event.userId));
            break;
          case 'file-change':
            setProjectFiles(prev => ({ ...prev, [event.file]: { content: event.content, language: prev[event.file]?.language || 'plaintext' } }));
            break;
          case 'file-create':
            setProjectFiles(prev => ({ ...prev, [event.file]: { content: event.content, language: event.language } }));
            break;
          case 'file-delete':
            setProjectFiles(prev => { const next = { ...prev }; delete next[event.file]; return next; });
            break;
          case 'cursor-move':
            setCollabUsers(prev => prev.map(u => u.id === event.userId ? { ...u, cursor: { file: event.cursor.file, line: event.cursor.line, col: event.cursor.column } } : u));
            break;
          case 'chat-message':
            setCollabChatMessages(prev => [...prev, event.message]);
            break;
          case 'sync-response':
            setProjectFiles(prev => {
              const merged = { ...prev };
              for (const [path, file] of Object.entries(event.files)) {
                merged[path] = { content: file.content, language: file.language };
              }
              return merged;
            });
            break;
        }
      });
    }
    return collabEngineRef.current;
  }, []);

  const sendCollabChat = useCallback(() => {
    if (!collabChatInput.trim() || !collabEngineRef.current) return;
    collabEngineRef.current.sendMessage(collabChatInput.trim());
    setCollabChatInput('');
  }, [collabChatInput]);

  // ═══ v24: Backend Generator ═══
  const [showBackendGenerator, setShowBackendGenerator] = useState(false);
  const [backendPreset, setBackendPreset] = useState<string>('saas-starter');
  const [backendEntityName, setBackendEntityName] = useState('items');
  const [backendGeneratedFiles, setBackendGeneratedFiles] = useState<GeneratedFile[]>([]);
  const backendGeneratorRef = useRef(new BackendGenerator());

  const generateBackend = useCallback(() => {
    const preset = BackendGenerator.presets[backendPreset];
    if (!preset) return;
    const files = backendGeneratorRef.current.generate(preset, backendEntityName || 'items');
    setBackendGeneratedFiles(files);
    // Optionally inject all files into VFS
    setProjectFiles(prev => {
      const next = { ...prev };
      for (const f of files) {
        next[f.path] = { content: f.content, language: f.language };
      }
      return next;
    });
    // Open first file
    if (files.length > 0) {
      const firstFile = files[0].path;
      setSelectedFile(firstFile);
      setOpenTabs(prev => prev.includes(firstFile) ? prev : [...prev, firstFile]);
    }
    setActiveTab('code');
    setTerminalLines(prev => [...prev, `$ ✓ Backend generated: ${files.length} files (${backendPreset})`, ...files.map(f => `  + ${f.path}`)]);
    setShowBackendGenerator(false);
  }, [backendPreset, backendEntityName]);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [showCodeToolsMenu, setShowCodeToolsMenu] = useState(false);
  const [showMoreToolsMenu, setShowMoreToolsMenu] = useState(false);

  // Load feedback history
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aurion_feedback');
      if (saved) setFeedbackHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const submitFeedback = useCallback(() => {
    if (feedbackRating === 0) return;
    const entry = { rating: feedbackRating, comment: feedbackComment, ts: Date.now() };
    const updated = [...feedbackHistory, entry];
    setFeedbackHistory(updated);
    try { localStorage.setItem('aurion_feedback', JSON.stringify(updated)); } catch { /* ignore */ }
    setFeedbackSubmitted(true);
    setFeedbackComment('');
    setTimeout(() => { setFeedbackSubmitted(false); setFeedbackRating(0); setShowFeedbackPanel(false); }, 2000);
  }, [feedbackRating, feedbackComment, feedbackHistory]);

  // ═══ v23: Onboarding Tour ═══
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const onboardingSteps = useMemo(() => [
    { title: 'Welcome to Aurion', desc: 'Build stunning web apps with AI. Type a prompt to get started!', icon: '01' },
    { title: 'AI Chat Panel', desc: 'Describe what you want to build in natural language. Aurion AI will generate the code.', icon: '02' },
    { title: 'Live Preview', desc: 'See your app in real-time as code is generated. Toggle between preview and code views.', icon: '03' },
    { title: 'Code Editor', desc: 'Full Monaco editor with syntax highlighting, autocomplete, and multi-file support.', icon: '04' },
    { title: 'Terminal', desc: 'Run shell commands, install packages, and manage your project with a real terminal.', icon: '05' },
    { title: '40+ Audit Tools', desc: 'Accessibility checker, SEO analyzer, performance budget, and more in the command palette (Ctrl+K).', icon: '06' },
    { title: 'Deploy to Vercel', desc: 'One-click deployment to Vercel. Your app goes live instantly.', icon: '07' },
    { title: 'Collaboration', desc: 'Share a room code with your team. Edit together in real-time.', icon: '08' },
  ], []);

  // Show onboarding on first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem('aurion_onboarded')) {
        setShowOnboarding(true);
      }
    } catch { /* ignore */ }
  }, []);

  const finishOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setOnboardingStep(0);
    try { localStorage.setItem('aurion_onboarded', 'true'); } catch { /* ignore */ }
  }, []);

  // ═══ v23: Changelog / What's New ═══
  const [showChangelog, setShowChangelog] = useState(false);

  // ═══ v24: Drag & Drop Visual Builder ═══
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [vbComponents] = useState([
    { id: 'hero', name: 'Hero Section', icon: '🏠', html: '<section class="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center"><h1 class="text-5xl font-bold mb-4">Hero Title</h1><p class="text-xl opacity-80 mb-8">Subtitle goes here</p><button class="px-8 py-3 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100 transition">Get Started</button></section>' },
    { id: 'navbar', name: 'Navigation Bar', icon: '🧭', html: '<nav class="flex items-center justify-between px-6 py-4 bg-gray-900 text-white"><div class="text-xl font-bold">Brand</div><div class="flex gap-6 text-sm"><a href="#" class="hover:text-indigo-400">Home</a><a href="#" class="hover:text-indigo-400">About</a><a href="#" class="hover:text-indigo-400">Services</a><a href="#" class="hover:text-indigo-400">Contact</a></div></nav>' },
    { id: 'features', name: 'Features Grid', icon: '✨', html: '<section class="py-16 px-6 bg-gray-950"><h2 class="text-3xl font-bold text-white text-center mb-12">Features</h2><div class="grid grid-cols-3 gap-8 max-w-5xl mx-auto"><div class="p-6 bg-gray-900 rounded-xl border border-gray-800"><div class="text-3xl mb-3">🚀</div><h3 class="text-lg font-semibold text-white mb-2">Fast</h3><p class="text-gray-400 text-sm">Lightning-fast performance</p></div><div class="p-6 bg-gray-900 rounded-xl border border-gray-800"><div class="text-3xl mb-3">🔒</div><h3 class="text-lg font-semibold text-white mb-2">Secure</h3><p class="text-gray-400 text-sm">Enterprise-grade security</p></div><div class="p-6 bg-gray-900 rounded-xl border border-gray-800"><div class="text-3xl mb-3">⚡</div><h3 class="text-lg font-semibold text-white mb-2">Modern</h3><p class="text-gray-400 text-sm">Built with latest tech</p></div></div></section>' },
    { id: 'pricing', name: 'Pricing Cards', icon: '💰', html: '<section class="py-16 px-6 bg-gray-950"><h2 class="text-3xl font-bold text-white text-center mb-12">Pricing</h2><div class="grid grid-cols-3 gap-8 max-w-5xl mx-auto"><div class="p-8 bg-gray-900 rounded-xl border border-gray-800 text-center"><h3 class="text-lg font-bold text-white mb-2">Free</h3><div class="text-4xl font-black text-white mb-4">$0</div><ul class="space-y-2 text-sm text-gray-400 mb-6"><li>5 Projects</li><li>Basic Support</li></ul><button class="w-full py-2 bg-gray-800 text-white rounded-lg">Start Free</button></div><div class="p-8 bg-indigo-600 rounded-xl border border-indigo-500 text-center ring-2 ring-indigo-400"><h3 class="text-lg font-bold text-white mb-2">Pro</h3><div class="text-4xl font-black text-white mb-4">$19</div><ul class="space-y-2 text-sm text-indigo-200 mb-6"><li>Unlimited Projects</li><li>Priority Support</li></ul><button class="w-full py-2 bg-white text-indigo-700 rounded-lg font-semibold">Upgrade</button></div><div class="p-8 bg-gray-900 rounded-xl border border-gray-800 text-center"><h3 class="text-lg font-bold text-white mb-2">Enterprise</h3><div class="text-4xl font-black text-white mb-4">Custom</div><ul class="space-y-2 text-sm text-gray-400 mb-6"><li>Everything in Pro</li><li>Custom SLA</li></ul><button class="w-full py-2 bg-gray-800 text-white rounded-lg">Contact</button></div></div></section>' },
    { id: 'testimonials', name: 'Testimonials', icon: '💬', html: '<section class="py-16 px-6 bg-gray-900"><h2 class="text-3xl font-bold text-white text-center mb-12">What People Say</h2><div class="grid grid-cols-3 gap-6 max-w-5xl mx-auto"><div class="p-6 bg-gray-800 rounded-xl"><p class="text-gray-300 text-sm mb-4">"Amazing product, saved us hours."</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">JD</div><span class="text-white text-sm font-medium">John Doe</span></div></div><div class="p-6 bg-gray-800 rounded-xl"><p class="text-gray-300 text-sm mb-4">"Best tool we ever used."</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">AS</div><span class="text-white text-sm font-medium">Alice Smith</span></div></div><div class="p-6 bg-gray-800 rounded-xl"><p class="text-gray-300 text-sm mb-4">"Incredible experience."</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">BJ</div><span class="text-white text-sm font-medium">Bob Jones</span></div></div></div></section>' },
    { id: 'footer', name: 'Footer', icon: '🔻', html: '<footer class="py-12 px-6 bg-gray-950 border-t border-gray-800"><div class="max-w-5xl mx-auto grid grid-cols-4 gap-8"><div><h4 class="text-white font-bold mb-4">Brand</h4><p class="text-gray-500 text-sm">Building the future.</p></div><div><h4 class="text-white font-bold mb-4">Product</h4><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Features</a><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Pricing</a></div><div><h4 class="text-white font-bold mb-4">Company</h4><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">About</a><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Blog</a></div><div><h4 class="text-white font-bold mb-4">Legal</h4><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Privacy</a><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Terms</a></div></div></footer>' },
    { id: 'cta', name: 'Call to Action', icon: '📢', html: '<section class="py-20 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-center"><h2 class="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2><p class="text-lg text-purple-200 mb-8">Join thousands of happy customers today.</p><div class="flex gap-4 justify-center"><button class="px-8 py-3 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100 transition">Start Free</button><button class="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition">Learn More</button></div></section>' },
    { id: 'contact', name: 'Contact Form', icon: '📧', html: '<section class="py-16 px-6 bg-gray-950"><div class="max-w-lg mx-auto"><h2 class="text-3xl font-bold text-white text-center mb-8">Contact Us</h2><form class="space-y-4"><input type="text" placeholder="Your Name" class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"><input type="email" placeholder="Email" class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"><textarea placeholder="Message" rows="4" class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none resize-none"></textarea><button type="submit" class="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">Send Message</button></form></div></section>' },
    { id: 'faq', name: 'FAQ Accordion', icon: '❓', html: '<section class="py-16 px-6 bg-gray-950"><h2 class="text-3xl font-bold text-white text-center mb-12">FAQ</h2><div class="max-w-2xl mx-auto space-y-3"><details class="group p-4 bg-gray-900 rounded-xl border border-gray-800"><summary class="text-white font-medium cursor-pointer flex items-center justify-between">What is this product? <span class="text-indigo-400 group-open:rotate-45 transition-transform text-xl">+</span></summary><p class="text-gray-400 text-sm mt-3">A powerful tool for building modern websites with AI.</p></details><details class="group p-4 bg-gray-900 rounded-xl border border-gray-800"><summary class="text-white font-medium cursor-pointer flex items-center justify-between">How does pricing work? <span class="text-indigo-400 group-open:rotate-45 transition-transform text-xl">+</span></summary><p class="text-gray-400 text-sm mt-3">We offer free, pro, and enterprise plans. See pricing above.</p></details><details class="group p-4 bg-gray-900 rounded-xl border border-gray-800"><summary class="text-white font-medium cursor-pointer flex items-center justify-between">Is there a trial? <span class="text-indigo-400 group-open:rotate-45 transition-transform text-xl">+</span></summary><p class="text-gray-400 text-sm mt-3">Yes! Start free and upgrade anytime.</p></details></div></section>' },
    { id: 'stats', name: 'Stats Counter', icon: '📊', html: '<section class="py-16 px-6 bg-gray-900"><div class="grid grid-cols-4 gap-8 max-w-4xl mx-auto text-center"><div><div class="text-4xl font-black text-white">10K+</div><div class="text-gray-400 text-sm mt-1">Users</div></div><div><div class="text-4xl font-black text-white">50M+</div><div class="text-gray-400 text-sm mt-1">Requests</div></div><div><div class="text-4xl font-black text-white">99.9%</div><div class="text-gray-400 text-sm mt-1">Uptime</div></div><div><div class="text-4xl font-black text-white">4.9★</div><div class="text-gray-400 text-sm mt-1">Rating</div></div></div></section>' },
    { id: 'gallery', name: 'Image Gallery', icon: '🖼️', html: '<section class="py-16 px-6 bg-gray-950"><h2 class="text-3xl font-bold text-white text-center mb-12">Gallery</h2><div class="grid grid-cols-3 gap-4 max-w-5xl mx-auto"><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 1</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 2</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 3</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 4</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 5</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 6</div></div></section>' },
    { id: 'team', name: 'Team Section', icon: '👥', html: '<section class="py-16 px-6 bg-gray-900"><h2 class="text-3xl font-bold text-white text-center mb-12">Our Team</h2><div class="grid grid-cols-4 gap-6 max-w-5xl mx-auto"><div class="text-center"><div class="w-20 h-20 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl mb-3">👩‍💻</div><h4 class="text-white font-semibold">Sarah Chen</h4><p class="text-gray-400 text-xs">CEO</p></div><div class="text-center"><div class="w-20 h-20 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center text-2xl mb-3">👨‍💻</div><h4 class="text-white font-semibold">Alex Rivera</h4><p class="text-gray-400 text-xs">CTO</p></div><div class="text-center"><div class="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl mb-3">👩‍🎨</div><h4 class="text-white font-semibold">Maya Patel</h4><p class="text-gray-400 text-xs">Design Lead</p></div><div class="text-center"><div class="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center text-2xl mb-3">👨‍🔬</div><h4 class="text-white font-semibold">Tom Baker</h4><p class="text-gray-400 text-xs">Lead Engineer</p></div></div></section>' },
  ]);
  const [vbCanvas, setVbCanvas] = useState<string[]>([]);
  const [vbDragging, setVbDragging] = useState<string | null>(null);
  const [vbSelectedIdx, setVbSelectedIdx] = useState<number>(-1);
  const [vbPropertyTab, setVbPropertyTab] = useState<'style' | 'content'>('style');

  const vbAddComponent = useCallback((componentId: string) => {
    const comp = vbComponents.find(c => c.id === componentId);
    if (comp) setVbCanvas(prev => [...prev, comp.html]);
  }, [vbComponents]);

  const vbRemoveComponent = useCallback((idx: number) => {
    setVbCanvas(prev => prev.filter((_, i) => i !== idx));
    setVbSelectedIdx(-1);
  }, []);

  const vbMoveComponent = useCallback((idx: number, dir: 'up' | 'down') => {
    setVbCanvas(prev => {
      const next = [...prev];
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      setVbSelectedIdx(targetIdx);
      return next;
    });
  }, []);

  const vbGenerateCode = useCallback(() => {
    if (vbCanvas.length === 0) return;
    const fullHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Website</title>\n  <script src="https://cdn.tailwindcss.com"><\/script>\n  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">\n  <style>*{font-family:'Inter',sans-serif;}</style>\n</head>\n<body class="bg-gray-950 text-white">\n${vbCanvas.join('\n')}\n</body>\n</html>`;
    const newFiles: Record<string, { content: string; language: string }> = { 'index.html': { content: fullHtml, language: 'html' } };
    setProjectFiles(newFiles);
    setSelectedFile('index.html');
    setShowVisualBuilder(false);
  }, [vbCanvas]);

  // ═══ v24: Animation Timeline Builder ═══
  const [showAnimBuilder, setShowAnimBuilder] = useState(false);
  const [animKeyframes, setAnimKeyframes] = useState<{ id: string; name: string; frames: { pct: number; props: Record<string, string> }[]; duration: number; easing: string; iteration: string }[]>([]);
  const [animSelected, setAnimSelected] = useState<number>(-1);
  const [animPreviewPlaying, setAnimPreviewPlaying] = useState(false);

  const animAddNew = useCallback(() => {
    setAnimKeyframes(prev => [...prev, {
      id: `anim-${Date.now()}`,
      name: `animation-${prev.length + 1}`,
      frames: [
        { pct: 0, props: { opacity: '0', transform: 'translateY(20px)' } },
        { pct: 100, props: { opacity: '1', transform: 'translateY(0)' } },
      ],
      duration: 0.6,
      easing: 'ease-out',
      iteration: '1',
    }]);
    setAnimSelected(animKeyframes.length);
  }, [animKeyframes.length]);

  const animUpdateFrame = useCallback((animIdx: number, frameIdx: number, prop: string, value: string) => {
    setAnimKeyframes(prev => {
      const next = [...prev];
      const anim = { ...next[animIdx] };
      const frames = [...anim.frames];
      frames[frameIdx] = { ...frames[frameIdx], props: { ...frames[frameIdx].props, [prop]: value } };
      anim.frames = frames;
      next[animIdx] = anim;
      return next;
    });
  }, []);

  const animAddFrame = useCallback((animIdx: number) => {
    setAnimKeyframes(prev => {
      const next = [...prev];
      const anim = { ...next[animIdx], frames: [...next[animIdx].frames] };
      const lastPct = anim.frames[anim.frames.length - 1]?.pct ?? 0;
      anim.frames.push({ pct: Math.min(lastPct + 25, 100), props: { opacity: '1', transform: 'none' } });
      next[animIdx] = anim;
      return next;
    });
  }, []);

  const animDeleteAnim = useCallback((idx: number) => {
    setAnimKeyframes(prev => prev.filter((_, i) => i !== idx));
    setAnimSelected(-1);
  }, []);

  const animGenerateCSS = useCallback(() => {
    if (animKeyframes.length === 0) return '';
    return animKeyframes.map(anim => {
      const keyframeStr = anim.frames.map(f => `  ${f.pct}% { ${Object.entries(f.props).map(([k, v]) => `${k}: ${v}`).join('; ')}; }`).join('\n');
      return `@keyframes ${anim.name} {\n${keyframeStr}\n}\n.${anim.name} {\n  animation: ${anim.name} ${anim.duration}s ${anim.easing} ${anim.iteration === 'infinite' ? 'infinite' : anim.iteration};\n}`;
    }).join('\n\n');
  }, [animKeyframes]);

  const animCopyCSS = useCallback(() => {
    const css = animGenerateCSS();
    if (css) navigator.clipboard.writeText(css);
  }, [animGenerateCSS]);

  const animInjectToProject = useCallback(() => {
    const css = animGenerateCSS();
    if (!css) return;
    const file = selectedFile || 'index.html';
    const content = projectFiles[file]?.content || '';
    if (content.includes('</style>')) {
      const updated = content.replace('</style>', `\n/* Aurion Animations */\n${css}\n</style>`);
      setProjectFiles(prev => ({ ...prev, [file]: { ...prev[file], content: updated } }));
    } else if (content.includes('</head>')) {
      const updated = content.replace('</head>', `<style>\n/* Aurion Animations */\n${css}\n</style>\n</head>`);
      setProjectFiles(prev => ({ ...prev, [file]: { ...prev[file], content: updated } }));
    }
    setShowAnimBuilder(false);
  }, [animGenerateCSS, selectedFile, projectFiles]);

  // ═══ v24: Design System Manager ═══
  const [showDesignSystem, setShowDesignSystem] = useState(false);
  const [dsTab, setDsTab] = useState<'colors' | 'typography' | 'spacing' | 'shadows' | 'export'>('colors');
  const [dsColors, setDsColors] = useState<{ name: string; value: string; variants: string[] }[]>([
    { name: 'Primary', value: '#6366f1', variants: ['#eef2ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
    { name: 'Secondary', value: '#ec4899', variants: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
    { name: 'Success', value: '#10b981', variants: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'] },
    { name: 'Warning', value: '#f59e0b', variants: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
    { name: 'Error', value: '#ef4444', variants: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
    { name: 'Neutral', value: '#6b7280', variants: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'] },
  ]);
  const [dsFontPrimary, setDsFontPrimary] = useState('Inter');
  const [dsFontSecondary, setDsFontSecondary] = useState('JetBrains Mono');
  const [dsTypeScale, setDsTypeScale] = useState<{ name: string; size: string; weight: string; lineHeight: string }[]>([
    { name: 'Display', size: '4rem', weight: '800', lineHeight: '1.1' },
    { name: 'H1', size: '2.5rem', weight: '700', lineHeight: '1.2' },
    { name: 'H2', size: '2rem', weight: '700', lineHeight: '1.3' },
    { name: 'H3', size: '1.5rem', weight: '600', lineHeight: '1.4' },
    { name: 'H4', size: '1.25rem', weight: '600', lineHeight: '1.4' },
    { name: 'Body', size: '1rem', weight: '400', lineHeight: '1.6' },
    { name: 'Small', size: '0.875rem', weight: '400', lineHeight: '1.5' },
    { name: 'Caption', size: '0.75rem', weight: '500', lineHeight: '1.4' },
  ]);
  const [dsSpacing] = useState([4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]);
  const [dsShadows] = useState([
    { name: 'sm', value: '0 1px 2px rgba(0,0,0,0.05)' },
    { name: 'md', value: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' },
    { name: 'lg', value: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
    { name: 'xl', value: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' },
    { name: '2xl', value: '0 25px 50px -12px rgba(0,0,0,0.25)' },
    { name: 'glow', value: '0 0 20px rgba(99,102,241,0.3)' },
  ]);
  const [dsBorderRadius] = useState([0, 2, 4, 6, 8, 12, 16, 24, 9999]);

  const dsGenerateCSS = useCallback(() => {
    let css = ':root {\n';
    dsColors.forEach(c => {
      c.variants.forEach((v, i) => { css += `  --${c.name.toLowerCase()}-${(i + 1) * 100}: ${v};\n`; });
    });
    css += `\n  --font-primary: '${dsFontPrimary}', sans-serif;\n  --font-mono: '${dsFontSecondary}', monospace;\n`;
    dsSpacing.forEach(s => { css += `  --space-${s}: ${s}px;\n`; });
    dsShadows.forEach(s => { css += `  --shadow-${s.name}: ${s.value};\n`; });
    dsBorderRadius.forEach(r => { css += `  --radius-${r}: ${r}px;\n`; });
    css += '}\n\n';
    dsTypeScale.forEach(t => {
      css += `.text-${t.name.toLowerCase()} { font-size: ${t.size}; font-weight: ${t.weight}; line-height: ${t.lineHeight}; }\n`;
    });
    return css;
  }, [dsColors, dsFontPrimary, dsFontSecondary, dsTypeScale, dsSpacing, dsShadows, dsBorderRadius]);

  const dsGenerateTokensJSON = useCallback(() => {
    return JSON.stringify({
      colors: Object.fromEntries(dsColors.map(c => [c.name.toLowerCase(), { base: c.value, scale: Object.fromEntries(c.variants.map((v, i) => [`${(i + 1) * 100}`, v])) }])),
      typography: { primary: dsFontPrimary, mono: dsFontSecondary, scale: dsTypeScale },
      spacing: dsSpacing,
      shadows: Object.fromEntries(dsShadows.map(s => [s.name, s.value])),
      borderRadius: dsBorderRadius,
    }, null, 2);
  }, [dsColors, dsFontPrimary, dsFontSecondary, dsTypeScale, dsSpacing, dsShadows, dsBorderRadius]);

  const dsAddColor = useCallback((name: string, hex: string) => {
    const h = parseInt(hex.slice(1), 16);
    const r = (h >> 16) & 255, g = (h >> 8) & 255, b = h & 255;
    const variants = Array.from({ length: 9 }, (_, i) => {
      const factor = (i - 4) * 0.15;
      const nr = Math.min(255, Math.max(0, Math.round(r + (factor > 0 ? (255 - r) * factor * 2 : r * factor * 2))));
      const ng = Math.min(255, Math.max(0, Math.round(g + (factor > 0 ? (255 - g) * factor * 2 : g * factor * 2))));
      const nb = Math.min(255, Math.max(0, Math.round(b + (factor > 0 ? (255 - b) * factor * 2 : b * factor * 2))));
      return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
    });
    setDsColors(prev => [...prev, { name, value: hex, variants }]);
  }, []);

  // ═══ v24: REST API Tester ═══
  const [showApiTester, setShowApiTester] = useState(false);
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [apiUrl, setApiUrl] = useState('');
  const [apiHeaders, setApiHeaders] = useState<{ key: string; value: string }[]>([{ key: 'Content-Type', value: 'application/json' }]);
  const [apiBody, setApiBody] = useState('{\n  \n}');
  const [apiResponse, setApiResponse] = useState<{ status: number; time: number; data: string; headers: Record<string, string> } | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiHistory, setApiHistory] = useState<{ method: string; url: string; status: number; time: number; ts: number }[]>([]);
  const [apiTab, setApiTab] = useState<'body' | 'headers' | 'history'>('body');

  const apiSendRequest = useCallback(async () => {
    if (!apiUrl.trim()) return;
    setApiLoading(true);
    setApiResponse(null);
    const start = performance.now();
    try {
      const headers: Record<string, string> = {};
      apiHeaders.forEach(h => { if (h.key.trim()) headers[h.key.trim()] = h.value; });
      const opts: RequestInit = { method: apiMethod, headers };
      if (apiMethod !== 'GET' && apiMethod !== 'DELETE' && apiBody.trim()) {
        opts.body = apiBody;
      }
      const res = await fetch(apiUrl, opts);
      const elapsed = Math.round(performance.now() - start);
      const text = await res.text();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      setApiResponse({ status: res.status, time: elapsed, data: text, headers: resHeaders });
      setApiHistory(prev => [{ method: apiMethod, url: apiUrl, status: res.status, time: elapsed, ts: Date.now() }, ...prev].slice(0, 50));
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setApiResponse({ status: 0, time: elapsed, data: `Error: ${err instanceof Error ? err.message : String(err)}`, headers: {} });
    } finally {
      setApiLoading(false);
    }
  }, [apiUrl, apiMethod, apiHeaders, apiBody]);

  const apiAddHeader = useCallback(() => {
    setApiHeaders(prev => [...prev, { key: '', value: '' }]);
  }, []);

  const apiRemoveHeader = useCallback((idx: number) => {
    setApiHeaders(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ═══ v24: Git Branch Manager ═══
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [gitBranches, setGitBranches] = useState<{ name: string; current: boolean; commits: number; lastCommit: string }[]>([
    { name: 'main', current: true, commits: 1, lastCommit: new Date().toISOString() },
  ]);
  const [gitBranchCommits, setGitBranchCommits] = useState<{ id: string; message: string; branch: string; files: string[]; timestamp: string }[]>([]);
  const [gitNewBranch, setGitNewBranch] = useState('');
  const [gitCommitMsg, setGitCommitMsg] = useState('');
  const [gitTab, setGitTab] = useState<'branches' | 'commits' | 'stash' | 'remote'>('branches');
  const [gitStash, setGitStash] = useState<{ id: string; message: string; files: Record<string, { content: string; language: string }>; timestamp: string }[]>([]);

  const gitCurrentBranch = useMemo(() => gitBranches.find(b => b.current)?.name || 'main', [gitBranches]);

  const gitCreateBranch = useCallback((name: string) => {
    if (!name.trim() || gitBranches.some(b => b.name === name.trim())) return;
    setGitBranches(prev => [
      ...prev.map(b => ({ ...b, current: false })),
      { name: name.trim(), current: true, commits: 0, lastCommit: new Date().toISOString() },
    ]);
    setGitNewBranch('');
  }, [gitBranches]);

  const gitSwitchBranch = useCallback((name: string) => {
    setGitBranches(prev => prev.map(b => ({ ...b, current: b.name === name })));
  }, []);

  const gitDeleteBranch = useCallback((name: string) => {
    if (name === 'main') return;
    setGitBranches(prev => {
      const next = prev.filter(b => b.name !== name);
      if (!next.some(b => b.current)) next[0].current = true;
      return next;
    });
    setGitBranchCommits(prev => prev.filter(c => c.branch !== name));
  }, []);

  const gitCommit = useCallback((message: string) => {
    if (!message.trim()) return;
    const changedFiles = Object.keys(projectFiles);
    const commit = { id: Math.random().toString(36).slice(2, 10), message: message.trim(), branch: gitCurrentBranch, files: changedFiles, timestamp: new Date().toISOString() };
    setGitBranchCommits(prev => [commit, ...prev]);
    setGitBranches(prev => prev.map(b => b.name === gitCurrentBranch ? { ...b, commits: b.commits + 1, lastCommit: commit.timestamp } : b));
    setGitCommitMsg('');
  }, [gitCurrentBranch, projectFiles]);

  const gitStashSave = useCallback(() => {
    setGitStash(prev => [{ id: Math.random().toString(36).slice(2, 10), message: `WIP on ${gitCurrentBranch}`, files: { ...projectFiles }, timestamp: new Date().toISOString() }, ...prev]);
  }, [gitCurrentBranch, projectFiles]);

  const gitStashPop = useCallback((idx: number) => {
    const stash = gitStash[idx];
    if (!stash) return;
    setProjectFiles(stash.files);
    setGitStash(prev => prev.filter((_, i) => i !== idx));
  }, [gitStash]);

  // ═══ v24: AI Screenshot Analyzer ═══
  const [showScreenshotAnalyzer, setShowScreenshotAnalyzer] = useState(false);
  const [ssImage, setSsImage] = useState<string | null>(null);
  const [ssAnalyzing, setSsAnalyzing] = useState(false);
  const [ssResult, setSsResult] = useState<string | null>(null);
  const [ssDragOver, setSsDragOver] = useState(false);

  // ═══ Figma Import Panel ═══
  const [showFigmaPanel, setShowFigmaPanel] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [figmaLoading, setFigmaLoading] = useState(false);
  const [figmaData, setFigmaData] = useState<{ fileName: string; frameName: string; frameSize: { width: number; height: number } | null; screenshotUrl: string; colors: string[]; fonts: string[]; components: Array<{ name: string; type: string; count: number }>; designPrompt: string } | null>(null);
  const [figmaFrames, setFigmaFrames] = useState<{ pages: Array<{ name: string; frames: Array<{ id: string; name: string; width: number; height: number; childCount: number }> }> } | null>(null);

  const figmaImport = useCallback(async (nodeId?: string) => {
    if (!figmaUrl.trim()) return;
    setFigmaLoading(true);
    try {
      const url = nodeId ? figmaUrl + (figmaUrl.includes('?') ? '&' : '?') + `node-id=${nodeId}` : figmaUrl;
      const res = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token: figmaToken || undefined }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Failed' })); showToast(e.error || 'Figma import failed', 'error'); return; }
      const data = await res.json();
      setFigmaData(data);
    } catch { showToast('Figma import failed', 'error'); }
    finally { setFigmaLoading(false); }
  }, [figmaUrl, figmaToken, showToast]);

  const figmaListFrames = useCallback(async () => {
    if (!figmaUrl.trim()) return;
    setFigmaLoading(true);
    try {
      const res = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: figmaUrl, token: figmaToken || undefined, mode: 'frames' }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Failed' })); showToast(e.error || 'Failed to load frames', 'error'); return; }
      const data = await res.json();
      setFigmaFrames(data);
    } catch { showToast('Failed to load frames', 'error'); }
    finally { setFigmaLoading(false); }
  }, [figmaUrl, figmaToken, showToast]);

  const figmaGenCode = useCallback(() => {
    if (!figmaData?.designPrompt) return;
    setShowFigmaPanel(false);
    // Inject into input and trigger send (sendToAI is defined later, use input + button approach)
    const prompt = figmaData.designPrompt + (figmaData.screenshotUrl ? `\n\n[Screenshot: ${figmaData.screenshotUrl}]` : '');
    setInput(prompt);
    // Auto-send after a tick
    setTimeout(() => {
      const sendBtn = document.querySelector('[data-send-btn]') as HTMLButtonElement;
      if (sendBtn) sendBtn.click();
    }, 100);
  }, [figmaData]);

  // ═══ Git PR State ═══
  const [gitPRs, setGitPRs] = useState<Array<{ number: number; title: string; state: string; head: string; base: string; author: string; avatar: string; mergeable: boolean }>>([]);
  const [gitPRTitle, setGitPRTitle] = useState('');
  const [gitPRHead, setGitPRHead] = useState('');
  const [gitPRBase, setGitPRBase] = useState('main');
  const [gitRemoteCommits, setGitRemoteCommits] = useState<Array<{ sha: string; message: string; author: string; date: string; avatar: string }>>([]);
  const [gitRemoteLoading, setGitRemoteLoading] = useState(false);
  const [gitSelectedRepo, setGitSelectedRepo] = useState('');
  const [gitRepos, setGitRepos] = useState<Array<{ name: string; fullName: string; url: string; language: string; defaultBranch: string }>>([]);
  const [gitRemoteBranches, setGitRemoteBranches] = useState<Array<{ name: string; sha: string }>>([]);

  const gitFetchRepos = useCallback(async () => {
    if (!githubToken) return;
    setGitRemoteLoading(true);
    try {
      const res = await fetch(`/api/github?action=repos&token=${encodeURIComponent(githubToken)}`);
      if (res.ok) { const data = await res.json(); setGitRepos(data); }
    } catch {} finally { setGitRemoteLoading(false); }
  }, [githubToken]);

  const gitFetchBranches = useCallback(async (repo: string) => {
    if (!githubToken || !repo) return;
    const [owner, name] = repo.split('/');
    try {
      const res = await fetch(`/api/github?action=branches&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`);
      if (res.ok) { const data = await res.json(); setGitRemoteBranches(data); }
    } catch {}
  }, [githubToken]);

  const gitFetchCommits = useCallback(async (repo: string, branch?: string) => {
    if (!githubToken || !repo) return;
    const [owner, name] = repo.split('/');
    try {
      const res = await fetch(`/api/github?action=commits&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`);
      if (res.ok) { const data = await res.json(); setGitRemoteCommits(data); }
    } catch {}
  }, [githubToken]);

  const gitCreatePR = useCallback(async () => {
    if (!githubToken || !gitSelectedRepo || !gitPRHead || !gitPRTitle) return;
    const [owner, name] = gitSelectedRepo.split('/');
    try {
      const res = await fetch(`/api/github?action=create-pr&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}&title=${encodeURIComponent(gitPRTitle)}&head=${encodeURIComponent(gitPRHead)}&base=${encodeURIComponent(gitPRBase)}`);
      if (res.ok) { const data = await res.json(); showToast(`PR #${data.number} created`, 'success'); gitFetchPRs(); }
      else { const e = await res.json().catch(() => ({})); showToast(e.error || 'Failed to create PR', 'error'); }
    } catch { showToast('Failed to create PR', 'error'); }
  }, [githubToken, gitSelectedRepo, gitPRHead, gitPRTitle, gitPRBase, showToast]);

  const gitFetchPRs = useCallback(async () => {
    if (!githubToken || !gitSelectedRepo) return;
    const [owner, name] = gitSelectedRepo.split('/');
    try {
      const res = await fetch(`/api/github?action=list-prs&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`);
      if (res.ok) { const data = await res.json(); setGitPRs(data); }
    } catch {}
  }, [githubToken, gitSelectedRepo]);

  const gitMergePR = useCallback(async (prNumber: number) => {
    if (!githubToken || !gitSelectedRepo) return;
    const [owner, name] = gitSelectedRepo.split('/');
    try {
      const res = await fetch(`/api/github?action=merge-pr&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}&pr=${prNumber}`);
      if (res.ok) { showToast(`PR #${prNumber} merged`, 'success'); gitFetchPRs(); }
      else { const e = await res.json().catch(() => ({})); showToast(e.error || 'Merge failed', 'error'); }
    } catch { showToast('Merge failed', 'error'); }
  }, [githubToken, gitSelectedRepo, showToast, gitFetchPRs]);

  const gitMergeBranch = useCallback(async (head: string, base: string) => {
    if (!githubToken || !gitSelectedRepo) return;
    const [owner, name] = gitSelectedRepo.split('/');
    try {
      const res = await fetch(`/api/github?action=merge-branch&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}&head=${encodeURIComponent(head)}&base=${encodeURIComponent(base)}`);
      if (res.ok) { showToast(`Merged ${head} into ${base}`, 'success'); }
      else {
        const e = await res.json().catch(() => ({}));
        if (e.conflict) { showToast('Merge conflict! Resolve manually on GitHub.', 'error'); }
        else { showToast(e.error || 'Merge failed', 'error'); }
      }
    } catch { showToast('Merge failed', 'error'); }
  }, [githubToken, gitSelectedRepo, showToast]);

  const ssHandleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setSsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setSsImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const ssHandlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => setSsImage(reader.result as string);
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  const ssAnalyze = useCallback(async () => {
    if (!ssImage) return;
    setSsAnalyzing(true);
    setSsResult(null);
    try {
      const base64 = ssImage.split(',')[1];
      const mimeType = ssImage.split(';')[0].split(':')[1] || 'image/png';
      const res = await fetch('/api/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Analyze this screenshot and generate a pixel-perfect HTML/Tailwind CSS recreation of this design. Include ALL visual details, exact colors, fonts, spacing, and layout. Generate COMPLETE, WORKING HTML with Tailwind CDN. Make it responsive.' }],
          model: 'claude-sonnet-4-20250514',
          images: [{ data: base64, type: mimeType }],
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      let fullText = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.text) fullText += parsed.text;
            } catch { /* skip */ }
          }
        }
      }
      setSsResult(fullText);
    } catch (err) {
      setSsResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSsAnalyzing(false);
    }
  }, [ssImage]);

  const ssApplyCode = useCallback(() => {
    if (!ssResult) return;
    const htmlMatch = ssResult.match(/```html\n([\s\S]*?)```/) || ssResult.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
    const code = htmlMatch ? htmlMatch[1] : ssResult;
    setProjectFiles(prev => ({ ...prev, 'screenshot-clone.html': { content: code, language: 'html' } }));
    setSelectedFile('screenshot-clone.html');
    setShowScreenshotAnalyzer(false);
  }, [ssResult]);

  // Version History (VFS snapshots)
  const [vfsHistory, setVfsHistory] = useState<VirtualFS[]>([]);
  const [vfsHistoryIdx, setVfsHistoryIdx] = useState(-1);
  const vfsSnapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // v21: File Change Summary (declared after vfsHistory)
  const [showChangeSummary, setShowChangeSummary] = useState(false);
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
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameProjectName, setRenameProjectName] = useState('');

  // File search (Cmd+P) / Content search (Cmd+Shift+F)
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [showContentSearch, setShowContentSearch] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const fileSearchRef = useRef<HTMLInputElement>(null);
  const contentSearchRef = useRef<HTMLInputElement>(null);

  // Templates
  const [showTemplates, setShowTemplates] = useState(false);

  // Diff view
  const [showDiffView, setShowDiffView] = useState(false);

  // .env management
  const [showEnvPanel, setShowEnvPanel] = useState(false);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  // Command palette (Cmd+K)
  const [showCommandPalette, setShowCommandPalette] = useState(false);
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

  // Framework selector for design-to-code
  const [outputFramework, setOutputFramework] = useState<'html' | 'react' | 'nextjs' | 'vue' | 'svelte' | 'angular' | 'python' | 'fullstack'>('html');

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
  const [showTestRunner, setShowTestRunner] = useState(false);
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
  const [showCodeReview, setShowCodeReview] = useState(false);
  const [codeReviewLoading, setCodeReviewLoading] = useState(false);

  const runAICodeReview = useCallback(async () => {
    if (!selectedFile || !projectFiles[selectedFile]) {
      showToast('No file selected for review', 'error');
      return;
    }
    setShowCodeReview(true);
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

      const res = await fetch('/api/huggingface', {
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
  const [showMediaGallery, setShowMediaGallery] = useState(false);

  // Runtime error forwarding from iframe preview
  const [runtimeErrors, setRuntimeErrors] = useState<{ message: string; source?: string; line?: number; col?: number; timestamp: number }[]>([]);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const autoFixInFlightRef = useRef(false);

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
    setShowProjectMenu(false);
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
    setShowProjectMenu(false);
    setShowTemplates(false);
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
  const [attachedImages, setAttachedImages] = useState<{ name: string; data: string; type: string }[]>([]);
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
        setAttachedImages(prev => [...prev, { name: file.name, data, type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, []);

  const removeImage = useCallback((idx: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== idx));
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

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  // Close model menu on click outside
  useEffect(() => {
    if (!showModelMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-model-menu]')) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelMenu]);

  // Auto-resize landing textarea
  useEffect(() => {
    const ta = landingTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [landingInput]);

  // Close dropdowns and modals on Escape + keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;

      // Cmd+K → command palette
      if (isCmd && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        setCommandQuery('');
        return;
      }
      // Cmd+P → file search
      if (isCmd && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        setShowFileSearch(prev => !prev);
        setFileSearchQuery('');
        return;
      }
      // Cmd+Shift+F → content search
      if (isCmd && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowContentSearch(prev => !prev);
        setContentSearchQuery('');
        return;
      }
      // Cmd+S → save (prevent browser save, refresh preview)
      if (isCmd && e.key === 's') {
        e.preventDefault();
        refreshPreview();
        setTerminalLines(prev => [...prev, '$ ✓ Saved & refreshed preview']);
        return;
      }
      // Cmd+E → toggle edit mode
      if (isCmd && e.key === 'e' && !e.shiftKey) {
        e.preventDefault();
        setIsEditMode(prev => !prev);
        return;
      }
      // Cmd+` → toggle terminal
      if (isCmd && e.key === '`') {
        e.preventDefault();
        setShowTerminal(prev => !prev);
        return;
      }
      // Cmd+B → toggle sidebar (left panel)
      if (isCmd && e.key === 'b' && !e.shiftKey) {
        e.preventDefault();
        setShowChat(prev => !prev);
        return;
      }
      // Cmd+1/2/3/4 → switch tabs
      if (isCmd && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs: ('app' | 'code' | 'database' | 'payments' | 'ide')[] = ['app', 'code', 'database', 'payments', 'ide'];
        setActiveTab(tabs[parseInt(e.key) - 1] || 'app');
        return;
      }
      // Cmd+Z / Cmd+Shift+Z for VFS undo/redo (only when not in Monaco)
      if (isCmd && e.key === 'z' && !(e.target as HTMLElement)?.closest('.monaco-editor')) {
        e.preventDefault();
        if (e.shiftKey) vfsRedo();
        else vfsUndo();
        return;
      }
      // Cmd+Shift+H → Find & Replace
      if (isCmd && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setShowFindReplace(prev => !prev);
        setFindQuery('');
        setReplaceQuery('');
        setTimeout(() => findInputRef.current?.focus(), 50);
        return;
      }
      // Cmd+/ → Keyboard shortcuts
      if (isCmd && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }
      // Ctrl+G → Goto Line
      if (isCmd && e.key === 'g') {
        e.preventDefault();
        setShowGotoLine(prev => !prev);
        setGotoLineValue('');
        setTimeout(() => gotoLineRef.current?.focus(), 50);
        return;
      }

      if (e.key !== 'Escape') return;
      if (showCommandPalette) setShowCommandPalette(false);
      else if (showFileSearch) setShowFileSearch(false);
      else if (showContentSearch) setShowContentSearch(false);
      else if (showFindReplace) setShowFindReplace(false);
      else if (showShortcuts) setShowShortcuts(false);
      else if (showThemeSelector) setShowThemeSelector(false);
      else if (showColorPicker) setShowColorPicker(false);
      else if (showGotoLine) setShowGotoLine(false);
      else if (tabContextMenu) setTabContextMenu(null);
      else if (explorerContextMenu) setExplorerContextMenu(null);
      else if (renameTarget) { setRenameTarget(null); setRenameValue(''); }
      else if (showA11yPanel) setShowA11yPanel(false);
      else if (showSeoPanel) setShowSeoPanel(false);
      else if (showTailwindPanel) setShowTailwindPanel(false);
      else if (showColorPalettePanel) setShowColorPalettePanel(false);
      else if (showPerfPanel) setShowPerfPanel(false);
      else if (showStatsPanel) setShowStatsPanel(false);
      else if (showCssVarsPanel) setShowCssVarsPanel(false);
      else if (showConsolePanel) setShowConsolePanel(false);
      else if (showDepsPanel) setShowDepsPanel(false);
      else if (showComplexityPanel) setShowComplexityPanel(false);
      else if (showOutlinePanel) setShowOutlinePanel(false);
      else if (showImageOptPanel) setShowImageOptPanel(false);
      else if (showDiffStatsPanel) setShowDiffStatsPanel(false);
      else if (showNetworkPanel) setShowNetworkPanel(false);
      else if (showHtmlValidatorPanel) setShowHtmlValidatorPanel(false);
      else if (showFontPanel) setShowFontPanel(false);
      else if (showSnippetsPanel) setShowSnippetsPanel(false);
      else if (showTreemapPanel) setShowTreemapPanel(false);
      else if (showUnusedCssPanel) setShowUnusedCssPanel(false);
      else if (showLinkCheckerPanel) setShowLinkCheckerPanel(false);
      else if (showDomTreePanel) setShowDomTreePanel(false);
      else if (showMetaEditorPanel) setShowMetaEditorPanel(false);
      else if (showShortcutsRef) setShowShortcutsRef(false);
      else if (showContrastPanel) setShowContrastPanel(false);
      else if (showZIndexPanel) setShowZIndexPanel(false);
      else if (showTodoScanPanel) setShowTodoScanPanel(false);
      else if (showRegexPanel) setShowRegexPanel(false);
      else if (showSpecificityPanel) setShowSpecificityPanel(false);
      else if (showLazyImgPanel) setShowLazyImgPanel(false);
      else if (showTextStatsPanel) setShowTextStatsPanel(false);
      else if (showDuplicatePanel) setShowDuplicatePanel(false);
      else if (showElementCountPanel) setShowElementCountPanel(false);
      else if (showConsoleFilter) setShowConsoleFilter(false);
      else if (showColorEdit) setShowColorEdit(false);
      else if (showFoldMap) setShowFoldMap(false);
      else if (showDepGraph) setShowDepGraph(false);
      else if (showPerfBudget) setShowPerfBudget(false);
      else if (showResponsiveGrid) setShowResponsiveGrid(false);
      else if (showAnimPanel) setShowAnimPanel(false);
      else if (showEventAudit) setShowEventAudit(false);
      else if (showOgPreview) setShowOgPreview(false);
      else if (showSemanticPanel) setShowSemanticPanel(false);
      else if (showChangeSummary) setShowChangeSummary(false);
      else if (showWhitespacePanel) setShowWhitespacePanel(false);
      else if (showPwaPanel) setShowPwaPanel(false);
      else if (showSchemaPanel) setShowSchemaPanel(false);
      else if (showBundlePanel) setShowBundlePanel(false);
      else if (showAriaPanel) setShowAriaPanel(false);
      else if (showSecurityPanel) setShowSecurityPanel(false);
      else if (showCollabPanel) setShowCollabPanel(false);
      else if (showStitchPanel) setShowStitchPanel(false);
      else if (showFeedbackPanel) setShowFeedbackPanel(false);
      else if (showOnboarding) finishOnboarding();
      else if (showChangelog) setShowChangelog(false);
      else if (showVisualBuilder) setShowVisualBuilder(false);
      else if (showAnimBuilder) setShowAnimBuilder(false);
      else if (showDesignSystem) setShowDesignSystem(false);
      else if (showApiTester) setShowApiTester(false);
      else if (showGitPanel) setShowGitPanel(false);
      else if (showScreenshotAnalyzer) setShowScreenshotAnalyzer(false);
      else if (showTemplates) setShowTemplates(false);
      else if (showMediaGallery) setShowMediaGallery(false);
      else if (showEnvPanel) setShowEnvPanel(false);
      else if (showCloneModal) setShowCloneModal(false);
      else if (showModelMenu) setShowModelMenu(false);
      else if (showGitHubModal) setShowGitHubModal(false);
      else if (showIntegrations) setShowIntegrations(false);
      else if (showResearchPanel) setShowResearchPanel(false);
      else if (showProjectMenu) setShowProjectMenu(false);
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [showModelMenu, showGitHubModal, showCloneModal, showIntegrations, showResearchPanel, showCommandPalette, showFileSearch, showContentSearch, showFindReplace, showShortcuts, showThemeSelector, showColorPicker, showGotoLine, tabContextMenu, explorerContextMenu, renameTarget, showA11yPanel, showSeoPanel, showTailwindPanel, showColorPalettePanel, showPerfPanel, showStatsPanel, showCssVarsPanel, showConsolePanel, showDepsPanel, showComplexityPanel, showOutlinePanel, showImageOptPanel, showDiffStatsPanel, showNetworkPanel, showHtmlValidatorPanel, showFontPanel, showSnippetsPanel, showTreemapPanel, showUnusedCssPanel, showLinkCheckerPanel, showDomTreePanel, showMetaEditorPanel, showShortcutsRef, showContrastPanel, showZIndexPanel, showTodoScanPanel, showRegexPanel, showSpecificityPanel, showLazyImgPanel, showTextStatsPanel, showDuplicatePanel, showElementCountPanel, showConsoleFilter, showColorEdit, showFoldMap, showDepGraph, showPerfBudget, showResponsiveGrid, showAnimPanel, showEventAudit, showOgPreview, showSemanticPanel, showChangeSummary, showWhitespacePanel, showPwaPanel, showSchemaPanel, showBundlePanel, showAriaPanel, showSecurityPanel, showCollabPanel, showStitchPanel, showFeedbackPanel, showOnboarding, showChangelog, finishOnboarding, showTemplates, showEnvPanel, showProjectMenu, showMediaGallery, vfsUndo, vfsRedo]);

  // Clipboard paste → auto-attach screenshots (Ctrl+V anywhere)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) continue;
        e.preventDefault();
        const file = item.getAsFile();
        if (!file || file.size > 10 * 1024 * 1024) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const data = reader.result as string;
          setAttachedImages(prev => [...prev, { name: `screenshot-${Date.now()}.png`, data, type: file.type }]);
          // Auto-switch to workspace if on landing page
          if (view === 'landing') setView('workspace');
        };
        reader.readAsDataURL(file);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [view]);

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  // Bridge: when clonedHtml changes, push to VFS
  useEffect(() => {
    if (clonedHtml) {
      setProjectFiles(prev => ({ ...prev, 'index.html': { content: clonedHtml, language: 'html' } }));
    }
  }, [clonedHtml]);

  // Bridge: extract HTML from messages and push to VFS
  useEffect(() => {
    if (!clonedHtml) {
      const html = extractPreviewHtml(messages);
      if (html) {
        setProjectFiles(prev => ({ ...prev, 'index.html': { content: html, language: 'html' } }));
      }
    }
  }, [messages, clonedHtml]);

  // Extract preview HTML — debounced during streaming for performance
  const [rawPreviewHtml, setRawPreviewHtml] = useState<string | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const compute = () => {
      if (Object.keys(projectFiles).length > 0) {
        const assembled = assemblePreview(projectFiles);
        if (assembled) { setRawPreviewHtml(assembled); return; }
      }
      setRawPreviewHtml(clonedHtml ?? extractPreviewHtml(messages));
    };
    if (isStreaming) {
      // Debounce during streaming — prevents excessive re-renders while AI is typing
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = setTimeout(compute, 300);
    } else {
      // Immediate update when not streaming (user edits, clone, etc.)
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
      compute();
    }
    return () => { if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current); };
  }, [projectFiles, messages, clonedHtml, isStreaming]);

  // Clear runtime errors when preview changes (fix was applied)
  const prevPreviewRef = useRef<string | null>(null);
  useEffect(() => {
    if (rawPreviewHtml && prevPreviewRef.current && rawPreviewHtml !== prevPreviewRef.current) {
      setRuntimeErrors([]);
      setPreviewLoading(true);
    }
    prevPreviewRef.current = rawPreviewHtml;
  }, [rawPreviewHtml]);

  // Inject link-intercept script + visual editor script when edit mode is on
  const previewHtml = useMemo(() => {
    if (!rawPreviewHtml) return null;

    // Replace unresolved AI-generated placeholders with fallbacks
    let html = rawPreviewHtml
      .replace(/__GEMINI_IMAGE_([a-zA-Z0-9_-]+)__/g, (_m: string, id: string) =>
        `https://placehold.co/800x600/1a1a2e/eaeaea?text=${encodeURIComponent(id)}`)
      .replace(/__LTX_VIDEO_URL__/g, '');

    // Strip Tailwind CDN script — causes CORS errors in srcdoc iframes
    html = html.replace(/<script[^>]*src=["']https?:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>/gi, '<!-- tailwind cdn removed -->')
      .replace(/<script[^>]*src=["']https?:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*\/>/gi, '<!-- tailwind cdn removed -->');

    // Auto-inject premium fonts if not present
    if (!html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com')) {
      const headEnd = html.indexOf('</head>');
      if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + PREMIUM_FONTS_CDN + '\n' + html.slice(headEnd);
    }

    // Auto-inject design system CSS only if HTML lacks its own design system
    const hasOwnCSS = /<style[^>]*>[\s\S]{300,}<\/style>/i.test(html) && (/:root\s*\{/.test(html) || /--\w+\s*:/.test(html));
    if (!html.includes('aurion-design-system') && !hasOwnCSS) {
      const headEnd = html.indexOf('</head>');
      if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + SHADCN_BASE_CSS + '\n' + html.slice(headEnd);
    }

    // Auto-inject GSAP if code references it
    if (/\bgsap\b|ScrollTrigger/i.test(html) && !html.includes('gsap.min.js')) {
      const headEnd = html.indexOf('</head>');
      if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + GSAP_CDN + '\n' + html.slice(headEnd);
    }

    // Auto-inject Lenis if code references it
    if (/\bLenis\b/i.test(html) && !html.includes('lenis.min.js')) {
      const headEnd = html.indexOf('</head>');
      if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + LENIS_CDN + '\n' + html.slice(headEnd);
    }

    // Auto-inject Font Awesome if code uses fa- classes
    if (/\bfa-|fas |far |fab /.test(html) && !html.includes('font-awesome')) {
      const headEnd = html.indexOf('</head>');
      if (headEnd !== -1) html = html.slice(0, headEnd) + '\n' + FA_CDN + '\n' + html.slice(headEnd);
    }

    // Error capture + console forwarding script — forwards errors + console.log/warn/info to parent
    const errorCaptureScript = `<script>(function(){var sent={};var overlay=null;function showOverlay(msg){if(overlay)overlay.remove();overlay=document.createElement('div');overlay.id='__err_overlay';overlay.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:999999;background:rgba(24,24,27,0.97);border-top:2px solid #ef4444;padding:16px 20px;font-family:ui-monospace,monospace;font-size:13px;color:#fca5a5;max-height:40vh;overflow:auto;backdrop-filter:blur(8px)';var h=document.createElement('div');h.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:8px';var t=document.createElement('span');t.style.cssText='color:#ef4444;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px';t.textContent='Runtime Error';var btn=document.createElement('button');btn.textContent='\\u2715';btn.style.cssText='background:none;border:none;color:#666;font-size:16px;cursor:pointer;padding:0 4px';btn.onclick=function(){overlay.remove();overlay=null};h.appendChild(t);h.appendChild(btn);overlay.appendChild(h);var m=document.createElement('pre');m.style.cssText='margin:0;white-space:pre-wrap;word-break:break-all;line-height:1.5;color:#fecaca;font-size:12px';m.textContent=msg;overlay.appendChild(m);document.body.appendChild(overlay)}function fwd(msg,src,ln,col){var k=msg+(src||"")+(ln||"");if(sent[k])return;sent[k]=1;showOverlay(String(msg)+(ln?' (line '+ln+')':''));try{parent.postMessage({type:"aurion_error",error:{message:String(msg).slice(0,500),source:src||"",line:ln||0,col:col||0}},"*")}catch(e){}}window.onerror=function(m,s,l,c){fwd(m,s,l,c)};window.addEventListener("unhandledrejection",function(e){fwd("Unhandled Promise: "+(e.reason&&e.reason.message||e.reason||"unknown"))});var _ce=console.error;console.error=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==="object"?JSON.stringify(x):String(x)}).join(" ");fwd("console.error: "+a);_ce.apply(console,arguments)};var _cl=console.log;console.log=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==="object"?JSON.stringify(x,null,2):String(x)}).join(" ");try{parent.postMessage({type:"aurion_console",level:"log",text:a},"*")}catch(e){}_cl.apply(console,arguments)};var _cw=console.warn;console.warn=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==="object"?JSON.stringify(x):String(x)}).join(" ");try{parent.postMessage({type:"aurion_console",level:"warn",text:a},"*")}catch(e){}_cw.apply(console,arguments)};var _ci=console.info;console.info=function(){var a=Array.prototype.slice.call(arguments).map(function(x){return typeof x==="object"?JSON.stringify(x):String(x)}).join(" ");try{parent.postMessage({type:"aurion_console",level:"info",text:a},"*")}catch(e){}_ci.apply(console,arguments)}})();</script>`;

    // When NOT in edit mode: simple link+form blocker
    if (!isEditMode) {
      const interceptScript = `<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(a){e.preventDefault();e.stopPropagation();}},true);document.addEventListener('submit',function(e){e.preventDefault();},true);</script>`;
      // v16: Layout debugger + dark/light mode CSS
      const layoutDebugCss = layoutDebugActive ? `<style>*{outline:1px solid rgba(59,130,246,0.35)!important;}*:hover{outline:2px solid rgba(59,130,246,0.8)!important;}</style>` : '';
      const darkModeCss = previewDarkMode === 'dark' ? `<style>html{filter:invert(1) hue-rotate(180deg)!important;}img,video,canvas,svg{filter:invert(1) hue-rotate(180deg)!important;}</style>` : previewDarkMode === 'light' ? `<style>html{background:#fff!important;color:#000!important;}</style>` : '';
      // v18: Grid/Flex visualizer
      const gridFlexCss = gridFlexDebugActive ? `<style>[style*="display:grid"],[style*="display: grid"]{outline:2px dashed #ec4899!important;position:relative!important;}[style*="display:grid"]::after,[style*="display: grid"]::after{content:"GRID";position:absolute;top:0;right:0;background:#ec4899;color:#fff;font-size:9px;padding:1px 4px;z-index:9999;}[style*="display:flex"],[style*="display: flex"]{outline:2px dashed #a855f7!important;position:relative!important;}[style*="display:flex"]::after,[style*="display: flex"]::after{content:"FLEX";position:absolute;top:0;right:0;background:#a855f7;color:#fff;font-size:9px;padding:1px 4px;z-index:9999;}</style>` : '';
      const combined = errorCaptureScript + interceptScript + layoutDebugCss + darkModeCss + gridFlexCss;
      if (html.includes('</body>')) {
        return html.replace('</body>', combined + '</body>');
      }
      return html + combined;
    }

    // ─── EDIT MODE: full visual editor ───
    // Build the script as an array of lines to avoid all escaping issues
    const L: string[] = [];
    L.push('<script>');
    L.push('(function(){');
    L.push('document.addEventListener("submit",function(e){e.preventDefault();},true);');

    // ── Tag classification ──
    L.push('var TT="H1,H2,H3,H4,H5,H6,P,SPAN,A,LI,TD,TH,LABEL,BUTTON,FIGCAPTION,BLOCKQUOTE,CAPTION,SUMMARY,LEGEND,DT,DD,STRONG,EM,B,I,U,SMALL,SUB,SUP,MARK,DEL,INS,CITE,CODE,PRE,KBD,ABBR,TIME,ADDRESS".split(",");');
    L.push('var BT="DIV,SECTION,HEADER,FOOTER,NAV,MAIN,ARTICLE,ASIDE,FIGURE,UL,OL,TABLE,FORM,FIELDSET".split(",");');
    L.push('function hasText(el){for(var i=0;i<el.childNodes.length;i++){if(el.childNodes[i].nodeType===3&&el.childNodes[i].textContent.trim())return true;}return false;}');
    L.push('function isTextOk(el){if(!el||el===document.body||el===document.documentElement)return false;if(el.closest("#__ed_tb,#__ed_mv"))return false;var t=el.tagName;if(TT.indexOf(t)!==-1)return true;if(BT.indexOf(t)!==-1&&hasText(el))return true;return false;}');
    L.push('function findTextEl(n){while(n&&n!==document.body){if(isTextOk(n))return n;n=n.parentElement;}return null;}');

    // ── Any visible element is draggable (not just sections) ──
    L.push('var SKIP_DRAG="HTML,BODY,HEAD,SCRIPT,STYLE,LINK,META,TITLE,BR,HR,WBR,NOSCRIPT".split(",");');
    L.push('function isDragOk(el){if(!el||el===document.body||el===document.documentElement)return false;if(el.closest("#__ed_tb,#__ed_mv"))return false;if(SKIP_DRAG.indexOf(el.tagName)!==-1)return false;var r=el.getBoundingClientRect();if(r.width<10||r.height<10)return false;return true;}');
    L.push('function findDragEl(n){var best=null;while(n&&n!==document.body){if(isDragOk(n))best=n;n=n.parentElement;}return best;}');
    // Find the deepest draggable (closest to what was hovered)
    L.push('function findDeepDrag(n){while(n&&n!==document.body){if(isDragOk(n))return n;n=n.parentElement;}return null;}');

    L.push('var sel=null,hov=null,mvTarget=null;');

    // ── Floating Text Toolbar ──
    L.push('var tb=document.createElement("div");tb.id="__ed_tb";');
    L.push('tb.style.cssText="position:fixed;top:-999px;left:0;z-index:2147483647;display:flex;align-items:center;gap:4px;padding:5px 10px;background:#111;border:1px solid #333;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.7);font-family:system-ui,sans-serif;font-size:12px;color:#fff;pointer-events:auto;";');
    L.push('function mkBtn(label,cmd,extra){var b=document.createElement("button");b.textContent=label;b.dataset.cmd=cmd;b.style.cssText="all:unset;cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:14px;"+(extra||"");b.onmouseenter=function(){b.style.background="#333";};b.onmouseleave=function(){b.style.background="transparent";};return b;}');
    L.push('function mkSep(){var s=document.createElement("span");s.style.cssText="width:1px;height:20px;background:#333;margin:0 2px;";return s;}');
    L.push('tb.appendChild(mkBtn("B","bold","font-weight:bold;"));');
    L.push('tb.appendChild(mkBtn("I","italic","font-style:italic;"));');
    L.push('tb.appendChild(mkBtn("U","underline","text-decoration:underline;"));');
    L.push('tb.appendChild(mkBtn("S","strikeThrough","text-decoration:line-through;"));');
    L.push('tb.appendChild(mkSep());');
    L.push('function mkColor(title,role,visual){var lbl=document.createElement("label");lbl.title=title;lbl.style.cssText="cursor:pointer;display:flex;align-items:center;position:relative;width:28px;height:28px;justify-content:center;border-radius:6px;";lbl.onmouseenter=function(){lbl.style.background="#333";};lbl.onmouseleave=function(){lbl.style.background="transparent";};var vis=document.createElement("span");vis.style.cssText=visual;lbl.appendChild(vis);var inp=document.createElement("input");inp.type="color";inp.dataset.role=role;inp.style.cssText="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;";lbl.appendChild(inp);return lbl;}');
    L.push('tb.appendChild(mkColor("Text color","fg","font-size:14px;font-weight:bold;border-bottom:3px solid #3b82f6;display:block;line-height:1;"));');
    L.push('tb.appendChild(mkColor("Highlight","bg","width:16px;height:16px;background:linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff);border-radius:4px;display:block;"));');
    L.push('tb.appendChild(mkSep());');
    L.push('var szSel=document.createElement("select");szSel.style.cssText="all:unset;cursor:pointer;padding:2px 6px;border-radius:6px;font-size:11px;background:#222;color:#fff;height:28px;";');
    L.push('["Size:","XS:1","S:2","M:3","L:4","XL:5","2XL:6","3XL:7"].forEach(function(s){var p=s.split(":");var o=document.createElement("option");o.textContent=p[0];o.value=p[1]||"";szSel.appendChild(o);});');
    L.push('tb.appendChild(szSel);tb.appendChild(mkSep());');
    L.push('tb.appendChild(mkBtn("\\u2261","justifyLeft","font-size:16px;"));');
    L.push('tb.appendChild(mkBtn("\\u2263","justifyCenter","font-size:16px;"));');
    L.push('tb.appendChild(mkSep());');
    L.push('tb.appendChild(mkBtn("\\u2715","removeFormat","font-size:13px;color:#ef4444;"));');
    L.push('document.body.appendChild(tb);');

    // ── Move Panel (appears on left of ANY hovered element) ──
    L.push('var mv=document.createElement("div");mv.id="__ed_mv";');
    L.push('mv.style.cssText="position:fixed;top:-999px;left:0;z-index:2147483646;display:flex;flex-direction:column;gap:2px;pointer-events:auto;";');
    L.push('function mkMvBtn(label,title,fn){var b=document.createElement("button");b.innerHTML=label;b.title=title;b.style.cssText="all:unset;cursor:pointer;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(17,17,17,.9);border:1px solid #333;color:#fff;font-size:11px;backdrop-filter:blur(8px);";b.onmouseenter=function(){b.style.background="#333";};b.onmouseleave=function(){b.style.background="rgba(17,17,17,.9)";};b.onclick=function(e){e.preventDefault();e.stopPropagation();fn();};return b;}');

    // Move up
    L.push('var mvUp=mkMvBtn("\\u25B2","Move up",function(){if(!mvTarget||!mvTarget.previousElementSibling)return;mvTarget.previousElementSibling.insertAdjacentElement("beforebegin",mvTarget);posMv(mvTarget);notifySync();});');
    // Move down
    L.push('var mvDown=mkMvBtn("\\u25BC","Move down",function(){if(!mvTarget||!mvTarget.nextElementSibling)return;mvTarget.nextElementSibling.insertAdjacentElement("afterend",mvTarget);posMv(mvTarget);notifySync();});');
    // Duplicate
    L.push('var mvDup=mkMvBtn("\\u2750","Duplicate",function(){if(!mvTarget)return;var cl=mvTarget.cloneNode(true);mvTarget.insertAdjacentElement("afterend",cl);notifySync();});');
    // Delete
    L.push('var mvDel=mkMvBtn("\\u2716","Delete",function(){if(!mvTarget)return;mvTarget.remove();mvTarget=null;mv.style.top="-999px";notifySync();});');
    L.push('mvDel.style.color="#ef4444";');
    // AI Prompt button — sends element to parent for AI modification
    L.push('var mvAI=mkMvBtn("\\u2728","AI: modify this element",function(){if(!mvTarget)return;var r=mvTarget.getBoundingClientRect();function cssPath(el){if(!el||el===document.body)return"body";var p=el.parentElement;if(!p)return el.tagName.toLowerCase();var sibs=Array.from(p.children).filter(function(c){return c.tagName===el.tagName;});var idx=sibs.indexOf(el);var s=el.tagName.toLowerCase();if(el.id)s+="#"+el.id;else if(sibs.length>1)s+=":nth-of-type("+(idx+1)+")";return cssPath(p)+" > "+s;}var c=document.documentElement.cloneNode(false);var path=cssPath(mvTarget);parent.postMessage({type:"aurion_select_prompt",element:{outerHtml:mvTarget.outerHTML.slice(0,8000),cssPath:path,tagName:mvTarget.tagName,rect:{top:r.top,left:r.left,width:r.width,height:r.height}}},"*");});');
    L.push('mvAI.style.color="#a78bfa";mvAI.style.background="rgba(167,139,250,.15)";mvAI.style.border="1px solid rgba(167,139,250,.3)";');
    // Drag handle
    L.push('var mvDrag=document.createElement("div");mvDrag.title="Drag to move";mvDrag.innerHTML="\\u2630";mvDrag.style.cssText="cursor:grab;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(17,17,17,.9);border:1px solid #333;color:#888;font-size:12px;user-select:none;";');
    L.push('mv.appendChild(mvUp);mv.appendChild(mvDrag);mv.appendChild(mvDown);');
    L.push('var mvSep=document.createElement("div");mvSep.style.cssText="height:1px;background:#333;margin:1px 0;";mv.appendChild(mvSep);');
    L.push('mv.appendChild(mvDup);mv.appendChild(mvDel);mv.appendChild(mvAI);');
    L.push('document.body.appendChild(mv);');

    // ── Drag & Drop for ANY element ──
    L.push('var dragEl=null,dragGhost=null,dragPlaceholder=null;');
    L.push('mvDrag.addEventListener("mousedown",function(e){if(!mvTarget)return;e.preventDefault();dragEl=mvTarget;');
    L.push('dragGhost=dragEl.cloneNode(true);var w=Math.min(dragEl.offsetWidth,400);dragGhost.style.cssText="position:fixed;pointer-events:none;opacity:0.5;z-index:2147483645;width:"+w+"px;max-height:200px;overflow:hidden;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.5);transform:scale(0.92);";');
    L.push('document.body.appendChild(dragGhost);');
    L.push('dragPlaceholder=document.createElement("div");dragPlaceholder.style.cssText="height:4px;background:#3b82f6;border-radius:2px;margin:4px 0;transition:all .15s;pointer-events:none;";');
    L.push('dragEl.style.opacity="0.25";dragEl.style.outline="2px dashed #3b82f6";');
    L.push('moveDragGhost(e);document.addEventListener("mousemove",onDragMove);document.addEventListener("mouseup",onDragEnd);});');

    L.push('function moveDragGhost(e){if(dragGhost){dragGhost.style.top=(e.clientY+10)+"px";dragGhost.style.left=(e.clientX+10)+"px";}}');

    L.push('function onDragMove(e){moveDragGhost(e);if(!dragEl||!dragEl.parentElement)return;');
    L.push('var parent=dragEl.parentElement;var siblings=Array.from(parent.children).filter(function(c){return c!==dragEl&&c!==dragPlaceholder&&c!==dragGhost&&!c.id&&c.tagName!=="SCRIPT"&&c.tagName!=="STYLE";});');
    L.push('if(dragPlaceholder.parentElement)dragPlaceholder.remove();');
    L.push('var closest=null,closestDist=99999,before=true;');
    L.push('siblings.forEach(function(sib){var r=sib.getBoundingClientRect();var mid=r.top+r.height/2;var dist=Math.abs(e.clientY-mid);if(dist<closestDist){closestDist=dist;closest=sib;before=e.clientY<mid;}});');
    L.push('if(closest){if(before){closest.insertAdjacentElement("beforebegin",dragPlaceholder);}else{closest.insertAdjacentElement("afterend",dragPlaceholder);}}');
    L.push('}');

    L.push('function onDragEnd(){document.removeEventListener("mousemove",onDragMove);document.removeEventListener("mouseup",onDragEnd);');
    L.push('if(dragGhost){dragGhost.remove();dragGhost=null;}');
    L.push('if(dragEl){dragEl.style.opacity="";dragEl.style.outline="";if(dragPlaceholder&&dragPlaceholder.parentElement){dragPlaceholder.insertAdjacentElement("beforebegin",dragEl);}if(dragPlaceholder)dragPlaceholder.remove();dragPlaceholder=null;posMv(dragEl);notifySync();}dragEl=null;}');

    // Position move panel  
    L.push('function posMv(el){if(!el){mv.style.top="-999px";return;}mvTarget=el;var r=el.getBoundingClientRect();var panelLeft=r.left-32;if(panelLeft<4)panelLeft=r.right+4;mv.style.top=Math.max(4,r.top)+"px";mv.style.left=panelLeft+"px";}');

    // ── Toolbar events ──
    L.push('tb.addEventListener("mousedown",function(e){e.preventDefault();e.stopPropagation();},true);');
    L.push('tb.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();var btn=e.target.closest("button[data-cmd]");if(btn){document.execCommand(btn.dataset.cmd,false,null);notifySync();}},true);');
    L.push('mv.addEventListener("mousedown",function(e){if(e.target===mvDrag)return;e.preventDefault();e.stopPropagation();},true);');
    L.push('tb.querySelectorAll("input[type=color]").forEach(function(inp){inp.addEventListener("input",function(){if(inp.dataset.role==="fg"){document.execCommand("foreColor",false,inp.value);}else{document.execCommand("hiliteColor",false,inp.value);}notifySync();});});');
    L.push('szSel.addEventListener("change",function(){if(szSel.value){document.execCommand("fontSize",false,szSel.value);notifySync();}szSel.selectedIndex=0;});');

    // Position text toolbar
    L.push('function posTb(el){if(!el)return;var r=el.getBoundingClientRect();var tw=tb.offsetWidth||300;var th=tb.offsetHeight||40;var tx=Math.max(4,Math.min(r.left+(r.width-tw)/2,window.innerWidth-tw-4));var ty=r.top-th-8;if(ty<4)ty=r.bottom+8;tb.style.top=ty+"px";tb.style.left=tx+"px";}');

    // ── Editor styles ──
    L.push('var st=document.createElement("style");st.id="__ed_st";');
    L.push('st.textContent=".__ed_h{outline:2px dashed rgba(59,130,246,.35)!important;outline-offset:2px;cursor:text!important;position:relative}.__ed_s{outline:2px solid #3b82f6!important;outline-offset:2px;cursor:text!important;min-height:1em}.__ed_h:not(.__ed_s)::after{content:attr(data-tag);position:absolute;top:-18px;left:0;font-size:9px;background:#3b82f6;color:#fff;padding:1px 5px;border-radius:3px;pointer-events:none;font-family:system-ui,sans-serif;font-weight:500;line-height:14px;z-index:2147483646;white-space:nowrap}.__ed_dh{outline:2px dashed rgba(168,85,247,.35)!important;outline-offset:1px;position:relative}.__ed_dh::before{content:attr(data-dtag);position:absolute;top:-16px;right:0;font-size:8px;background:#a855f7;color:#fff;padding:1px 4px;border-radius:3px;pointer-events:none;font-family:system-ui,sans-serif;font-weight:500;line-height:12px;z-index:2147483646;white-space:nowrap}[contenteditable=true]{cursor:text!important}#__ed_tb button:hover,#__ed_tb select:hover{background:#333!important}";');
    L.push('document.head.appendChild(st);');

    // ── Hover — text elements + draggable elements ──
    L.push('document.addEventListener("mouseover",function(e){');
    // Text hover
    L.push('var tel=findTextEl(e.target);if(hov&&hov!==tel){hov.classList.remove("__ed_h");hov.removeAttribute("data-tag");}if(tel){tel.classList.add("__ed_h");tel.setAttribute("data-tag",tel.tagName.toLowerCase());hov=tel;}else{hov=null;}');
    // Drag hover — show move panel on any meaningful element
    L.push('var del=findDeepDrag(e.target);if(del&&del!==mvTarget){posMv(del);}');
    L.push('},true);');

    // ── Click — text editing (let browser place cursor naturally) ──
    L.push('document.addEventListener("click",function(e){');
    L.push('if(e.target.closest("#__ed_tb,#__ed_mv"))return;');
    L.push('var a=e.target.closest("a");if(a)e.preventDefault();');
    L.push('var el=findTextEl(e.target);');
    L.push('if(!el){doDesel();return;}');
    L.push('e.preventDefault();');
    L.push('if(sel&&sel!==el){sel.contentEditable="false";sel.classList.remove("__ed_s");}');
    L.push('var isNew=sel!==el;sel=el;el.contentEditable="true";el.classList.add("__ed_s");');
    // DON'T move cursor — let browser handle naturally. Only focus if new element
    L.push('if(isNew){el.focus();setTimeout(function(){posTb(el);},0);}else{posTb(el);}');
    L.push('},true);');

    // mouseup — reposition toolbar after cursor placement
    L.push('document.addEventListener("mouseup",function(e){if(sel&&sel.contentEditable==="true"){setTimeout(function(){posTb(sel);},10);}},true);');

    // deselect
    L.push('function doDesel(){if(sel){sel.contentEditable="false";sel.classList.remove("__ed_s");}sel=null;tb.style.top="-999px";}');

    // Tab navigation (this one places cursor at end)
    L.push('function doSelTab(el){if(sel&&sel!==el){sel.contentEditable="false";sel.classList.remove("__ed_s");}sel=el;el.contentEditable="true";el.classList.add("__ed_s");el.focus();var rng=document.createRange();var s=window.getSelection();rng.selectNodeContents(el);rng.collapse(false);s.removeAllRanges();s.addRange(rng);posTb(el);}');

    // ── Input / keyboard ──
    L.push('document.addEventListener("input",function(){if(sel)posTb(sel);notifySync();},true);');
    L.push('document.addEventListener("keydown",function(e){if(e.key==="Escape"){doDesel();e.preventDefault();}if(e.key==="Tab"&&sel){e.preventDefault();var all=Array.from(document.querySelectorAll("*")).filter(isTextOk);var i=all.indexOf(sel);var nx=all[e.shiftKey?(i-1+all.length)%all.length:(i+1)%all.length];if(nx)doSelTab(nx);}});');
    L.push('window.addEventListener("scroll",function(){if(sel)posTb(sel);if(mvTarget)posMv(mvTarget);},true);');
    L.push('window.addEventListener("resize",function(){if(sel)posTb(sel);if(mvTarget)posMv(mvTarget);});');

    // ── Sync to parent — ONLY sends data, parent stores in ref (no re-render) ──
    L.push('var syncT;');
    L.push('function notifySync(){clearTimeout(syncT);syncT=setTimeout(function(){var c=document.documentElement.cloneNode(true);c.querySelectorAll("#__ed_tb,#__ed_st,#__ed_mv").forEach(function(n){n.remove();});c.querySelectorAll(".__ed_h,.__ed_s,.__ed_dh,[contenteditable],[data-tag],[data-dtag]").forEach(function(n){n.classList.remove("__ed_h","__ed_s","__ed_dh");n.removeAttribute("contenteditable");n.removeAttribute("data-tag");n.removeAttribute("data-dtag");});c.querySelectorAll("script").forEach(function(s){var t=s.textContent||"";if(t.indexOf("__ed_")!==-1||t.indexOf("aurion_edit")!==-1)s.remove();});parent.postMessage({type:"aurion_edit",html:"<!DOCTYPE html>"+c.outerHTML},"*");},600);}');

    L.push('})();');
    L.push('</scr'+'ipt>');

    const editorScript = L.join('\n');

    // v16: Layout debugger + dark/light mode CSS for edit mode too
    const layoutDebugCss = layoutDebugActive ? `<style>*{outline:1px solid rgba(59,130,246,0.35)!important;}*:hover{outline:2px solid rgba(59,130,246,0.8)!important;}</style>` : '';
    const darkModeCss = previewDarkMode === 'dark' ? `<style>html{filter:invert(1) hue-rotate(180deg)!important;}img,video,canvas,svg{filter:invert(1) hue-rotate(180deg)!important;}</style>` : previewDarkMode === 'light' ? `<style>html{background:#fff!important;color:#000!important;}</style>` : '';
    // v18: Grid/Flex visualizer
    const gridFlexCss = gridFlexDebugActive ? `<style>[style*="display:grid"],[style*="display: grid"]{outline:2px dashed #ec4899!important;position:relative!important;}[style*="display:flex"],[style*="display: flex"]{outline:2px dashed #a855f7!important;position:relative!important;}</style>` : '';

    if (html.includes('</body>')) {
      return html.replace('</body>', errorCaptureScript + '\n' + editorScript + '\n' + layoutDebugCss + darkModeCss + gridFlexCss + '\n</body>');
    }
    return html + '\n' + editorScript + layoutDebugCss + darkModeCss + gridFlexCss;
  }, [rawPreviewHtml, isEditMode, layoutDebugActive, previewDarkMode, gridFlexDebugActive]);
  const codeBlocks = useMemo(() => extractAllCodeBlocks(messages), [messages]);

  // Build workspace context string for AI
  const buildWorkspaceContext = useCallback(() => {
    const parts: string[] = [];
    parts.push('[WORKSPACE STATE]');
    parts.push(`Active tab: ${activeTab}`);
    parts.push(`Preview: ${previewHtml ? 'has content' : 'empty'}`);
    if (clonedHtml) {
      parts.push(`Clone: active (from ${cloneUrl || 'URL'})`);
    }
    if (showTerminal && terminalLines.length > 0) {
      parts.push(`Terminal (last 5 lines):`);
      terminalLines.slice(-5).forEach(l => parts.push(`  ${l}`));
    } else {
      parts.push(`Terminal: ${showTerminal ? 'visible (empty)' : 'hidden'}`);
    }
    const connectedKeys = Object.keys(integrationKeys);
    if (connectedKeys.length > 0) {
      parts.push(`Connected integrations: ${connectedKeys.join(', ')}`);
    }
    const fileList = Object.keys(projectFiles);
    if (fileList.length > 0) {
      parts.push(`Project files (${fileList.length}): ${fileList.join(', ')}`);
      // Prioritize: selected file gets full content, others get summaries
      // Total budget: ~6000 chars to avoid bloating the prompt
      const selectedBudget = 2000;
      const otherBudget = fileList.length <= 3 ? 800 : fileList.length <= 8 ? 400 : 200;
      for (const path of fileList) {
        const file = projectFiles[path];
        const isSelected = path === selectedFile;
        const budget = isSelected ? selectedBudget : otherBudget;
        parts.push(`--- ${path} (${file.language}, ${file.content.length} chars)${isSelected ? ' [ACTIVE]' : ''} ---`);
        parts.push(file.content.slice(0, budget) + (file.content.length > budget ? '\n... (truncated)' : ''));
      }
    } else if (codeBlocks.length > 0) {
      parts.push(`Code blocks generated: ${codeBlocks.length}`);
    }
    parts.push(`Model: ${selectedModel.name}`);
    const fwDescriptions: Record<string, string> = {
      html: ' (Vanilla HTML/CSS/JS + Tailwind)',
      react: ' (React + TypeScript + Vite + Tailwind + shadcn/ui)',
      nextjs: ' (Next.js 14 App Router + React + TypeScript + Tailwind + shadcn/ui)',
      vue: ' (Vue 3 + Composition API + TypeScript + Vite + Tailwind)',
      svelte: ' (Svelte 4 + Vite + Tailwind)',
      angular: ' (Angular 17+ Standalone + TypeScript + Tailwind)',
      python: ' (Python FastAPI + SQLAlchemy + Pydantic)',
      fullstack: ' (React + TypeScript frontend + Express + TypeScript backend)',
    };
    parts.push(`Target framework: ${outputFramework}${fwDescriptions[outputFramework] || ''}`);
    parts.push(`Device preview: ${deviceMode}`);
    if (runtimeErrors.length > 0) {
      parts.push(`Runtime errors (${runtimeErrors.length}):`);
      runtimeErrors.slice(-5).forEach(e => parts.push(`  ✗ ${e.message}${e.line ? ` (line ${e.line})` : ''}`));
    }
    parts.push('');
    parts.push('Use <<FILE:path>>content<</FILE>> to create/update files (FULL content, not diffs).');
    parts.push('For incremental edits, only emit changed files. Other files are preserved.');
    parts.push('');
    parts.push('[VISUAL QUALITY — MANDATORY]');
    parts.push('Every page MUST achieve Awwwards/FWA visual quality. Dark theme #0a0a0a. Syne headings + DM Sans body. clamp() typography.');
    parts.push('Aurora/particle hero bg. Glass navbar. GSAP ScrollTrigger + Lenis smooth scroll. Noise grain. Shimmer text. Glow buttons.');
    parts.push('80-120px section padding. Scroll progress bar. Mobile hamburger 768px. 4-col footer. Accent color consistency.');
    parts.push('.reveal + IntersectionObserver on all sections. ALL CSS self-contained (define .glass, .card, .btn-primary, .container).');
    parts.push('');
    parts.push(buildReactBitsContextSection());
    parts.push('[/VISUAL QUALITY]');
    // Inject generation memory to avoid repetition
    if (generationHistory.length > 0) {
      parts.push('');
      parts.push('[GENERATION MEMORY — avoid repeating these choices]');
      generationHistory.forEach((g, i) => {
        const items = [g.font && `font: ${g.font}`, g.accent && `accent: ${g.accent}`, g.template && `"${g.template}"`].filter(Boolean).join(', ');
        if (items) parts.push(`  Gen ${i + 1}: ${items}`);
      });
      parts.push('Pick DIFFERENT fonts and accent colors from the above. Vary the visual identity.');
      parts.push('[/GENERATION MEMORY]');
    }
    // Inject research context if available
    if (researchMode && researchContext) {
      parts.push('');
      parts.push('[NOTEBOOKLM RESEARCH CONTEXT]');
      parts.push(researchContext.slice(0, 12000));
      parts.push('[/NOTEBOOKLM RESEARCH CONTEXT]');
    }
    // Inject Stitch design reference if screens were generated
    if (stitchScreens.length > 0) {
      parts.push('');
      parts.push('[STITCH DESIGN REFERENCE — use these AI-generated designs as structural inspiration]');
      stitchScreens.slice(-3).forEach((s, i) => {
        if (s.html && s.html.length > 100) {
          parts.push(`  Screen ${i + 1} (${s.page}): ${s.html.slice(0, 3000)}`);
        }
      });
      parts.push('Adapt layout patterns, component structure, and visual approach from these Stitch designs.');
      parts.push('[/STITCH DESIGN REFERENCE]');
    }
    // Inject Claude Code mode
    if (claudeCodeMode) {
      parts.push('');
      parts.push('[JARVIS MODE: ACTIVE — Central Brain Orchestrating All Subsystems]');
      parts.push('You are Jarvis — the God-level orchestrator of Aurion with access to 19 subsystems.');
      parts.push('Apply iterative development: error-first thinking, parallel awareness, context management.');
      parts.push('Use smart retry patterns, quality gates, and output recovery for production-grade code.');
      parts.push('You can leverage: Claude + Gemini + Groq + OpenAI for AI, Stitch for UI design, NotebookLM for research,');
      parts.push('ReactBits for 135+ components, 21st.dev for premium effects, MotionSite for video assets,');
      parts.push('67 UI styles, 96 palettes, 57 font pairings, 22 premium templates.');
      if (jarvisSubsystems.length > 0) {
        parts.push(`Active subsystems: ${jarvisSubsystems.join(', ')}`);
      }
      parts.push('[/JARVIS MODE]');
    }
    parts.push('[/WORKSPACE STATE]');
    return parts.join('\n');
  }, [activeTab, previewHtml, clonedHtml, cloneUrl, codeBlocks, selectedModel, showTerminal, terminalLines, integrationKeys, projectFiles, selectedFile, deviceMode, runtimeErrors, outputFramework, researchMode, researchContext, claudeCodeMode, jarvisSubsystems, generationHistory, stitchScreens]);

  /* ── Send message & stream response ── */
  const streamToAssistant = useCallback(async (
    allMessages: { role: string; content: string }[],
    assistantMsgId: string,
    useModel: string,
    signal: AbortSignal,
    images?: { data: string; type: string }[],
    directResearchContext?: string,
  ) => {
    const selectedModel = MODELS.find(m => m.id === useModel);
    const isAnthropicModel = selectedModel?.provider === 'anthropic' || useModel.startsWith('claude-');

    // Route all generation through the orchestrator
    const endpoint = '/api/claude-code';

    // Use directly-passed research context (from THIS generation's await)
    // instead of stale React state closure
    const effectiveResearch = directResearchContext || researchContext || undefined;

    const bodyPayload = {
      action: 'jarvis-execute',
      prompt: allMessages[allMessages.length - 1]?.content || '',
      messages: allMessages.slice(0, -1),
      model: useModel,
      researchContext: effectiveResearch,
      jarvisContext: {
        activeTab,
        currentHtml: previewHtml?.slice(0, 2000),
        integrationKeys: Object.fromEntries(Object.entries(integrationKeys).map(([k]) => [k, '***'])),
        deviceMode,
      },
      ...(images?.length ? { images } : {}),
    };

    const res = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal,
      timeout: 0,
    }, 0);

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('No response stream');

    let buffer = '';
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
        let data;
        try { data = JSON.parse(payload); } catch { continue; }
        if (data.error) {
          const clean = data.error.replace(/\[GoogleGenerativeAI Error\]:?\s*/gi, '').replace(/Error fetching from https:\/\/[^\s]+/gi, '').replace(/\[{"@type"[\s\S]*/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 150) || 'Request failed. Please try again.';
          throw new Error(clean);
        }
        if (data.text) {
          setStreamingChars(prev => prev + data.text.length);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: m.content + data.text } : m))
          );
        }
      }
    }
  }, [claudeCodeMode, researchContext]);

  // Extract generation metadata from AI output for memory
  const extractGenMetadata = useCallback((html: string): { font?: string; accent?: string; template?: string } => {
    const meta: { font?: string; accent?: string; template?: string } = {};
    // Extract primary font from font-family or Google Fonts import
    const fontImport = html.match(/fonts\.googleapis\.com\/css2?\?family=([^&"']+)/);
    if (fontImport) meta.font = decodeURIComponent(fontImport[1]).split('&')[0].replace(/\+/g, ' ').split(':')[0];
    // Extract accent color from --accent CSS variable
    const accentVar = html.match(/--accent\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/);
    if (accentVar) meta.accent = accentVar[1];
    // Detect template style from content
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) meta.template = titleMatch[1].trim().slice(0, 40);
    return meta;
  }, []);

  const recordGeneration = useCallback((html: string) => {
    const meta = extractGenMetadata(html);
    if (!meta.font && !meta.accent) return;
    const entry = { ...meta, ts: Date.now() };
    setGenerationHistory(prev => {
      const next = [...prev, entry].slice(-5);
      try { localStorage.setItem('aurion_gen_history', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [extractGenMetadata]);

  const sendToAI = useCallback(async (text: string, imgs?: { data: string; type: string }[]) => {
    if (!text.trim() || isStreaming) return;
    setError(null);
    // Smart model auto-routing
    const optimalModel = getOptimalModel(model, text, !!(imgs && imgs.length > 0));
    if (optimalModel !== model) setModel(optimalModel);
    const useModelId = optimalModel;
    const userMsg: Message = { id: generateId(), role: 'user', content: text.trim() };
    const assistantMsg: Message = { id: generateId(), role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingChars(0);
    streamStartTime.current = Date.now();

    const controller = new AbortController();
    abortRef.current = controller;

    // Build context & messages once
    const ctx = buildWorkspaceContext();
    // Research: await with timeout, pass result DIRECTLY to streamToAssistant
    // (not via React state which would only be available on next render)
    let directResearchResult: string | undefined;
    if (researchMode && !researchContext && text.length > 10) {
      try {
        const enhancement = await Promise.race([
          enhanceWithResearch('generate', text),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
        ]);
        if (enhancement) {
          directResearchResult = enhancement;
          setResearchContext(enhancement); // also save for future messages
        }
      } catch { /* continue without research */ }
    }
    // Framework-specific generation instructions — multi-language support
    const fwInstructions = outputFramework === 'react'
      ? '\n[FRAMEWORK: React + TypeScript + Vite]\nGenerate a COMPLETE multi-file React project. Use TypeScript everywhere (.tsx/.ts). Use shadcn/ui patterns: Button, Card, Input, Dialog, Sheet, Tabs, Badge, Avatar. Use Tailwind CSS utility classes. Use Lucide React icons. Export default function components. Use useState, useEffect, useCallback hooks.\nProject structure: src/main.tsx (entry), src/App.tsx (root), src/components/*.tsx, src/hooks/*.ts, src/lib/utils.ts. Use <<FILE:src/components/Navbar.tsx>> format for EACH file.\nAlso generate: package.json, vite.config.ts, tailwind.config.js, tsconfig.json, postcss.config.js.\n'
      : outputFramework === 'nextjs'
      ? '\n[FRAMEWORK: Next.js 14+ App Router + TypeScript]\nGenerate a COMPLETE multi-file Next.js project. Use TypeScript. Server/Client components (mark "use client" when needed). Use shadcn/ui components + Tailwind CSS. Use Next.js Image, Link, metadata.\nProject structure: app/layout.tsx, app/page.tsx, app/globals.css, components/*.tsx, lib/*.ts. Use <<FILE:app/about/page.tsx>> for routes, <<FILE:components/Header.tsx>> for components.\nAlso generate: package.json, next.config.js, tailwind.config.ts, tsconfig.json.\n'
      : outputFramework === 'vue'
      ? '\n[FRAMEWORK: Vue 3 SFC + TypeScript + Vite]\nGenerate a COMPLETE multi-file Vue 3 project. Use <script setup lang="ts"> syntax. Use Composition API (ref, computed, onMounted, watch). Use Tailwind CSS.\nProject structure: src/App.vue (root), src/main.ts (entry), src/components/*.vue, src/composables/*.ts, src/stores/*.ts (Pinia). Use <<FILE:src/components/Navbar.vue>> format.\nAlso generate: package.json, vite.config.ts, tailwind.config.js.\n'
      : outputFramework === 'svelte'
      ? '\n[FRAMEWORK: Svelte 4 + Vite]\nGenerate a COMPLETE multi-file Svelte project. Use <script> with TypeScript where possible. Use reactive statements ($:). Use Tailwind CSS.\nProject structure: src/App.svelte (root), src/main.js (entry), src/lib/components/*.svelte, src/lib/stores/*.ts. Use <<FILE:src/lib/components/Navbar.svelte>> format.\nAlso generate: package.json, vite.config.js, tailwind.config.js.\n'
      : outputFramework === 'angular'
      ? '\n[FRAMEWORK: Angular 17+ Standalone]\nGenerate a COMPLETE multi-file Angular project. Use standalone components (no NgModules). Use Angular signals where possible. Use TypeScript.\nProject structure: src/app/app.component.ts (root), src/app/components/*.ts, src/app/services/*.ts, src/main.ts (bootstrap). Use <<FILE:src/app/components/header.component.ts>> format.\nAlso generate: package.json, tsconfig.json, angular.json, src/styles.css.\n'
      : outputFramework === 'python'
      ? '\n[FRAMEWORK: Python FastAPI + SQLAlchemy]\nGenerate a COMPLETE multi-file Python backend. Use FastAPI with type hints. Use Pydantic for models. Use SQLAlchemy for ORM. Use async/await.\nProject structure: main.py (entry), app/routes/*.py, app/models/*.py, app/schemas/*.py, app/database.py, app/config.py. Use <<FILE:app/routes/users.py>> format.\nAlso generate: requirements.txt, .env, Dockerfile, README.md.\nFor the frontend, also generate a simple HTML file in static/index.html with Tailwind CSS.\n'
      : outputFramework === 'fullstack'
      ? '\n[FRAMEWORK: Full-Stack — React Frontend + Express/Node Backend]\nGenerate a COMPLETE full-stack project with BOTH frontend and backend code.\nFrontend: React + TypeScript + Vite + Tailwind in src/. Use shadcn/ui patterns.\nBackend: Express + TypeScript in server/. REST API with proper routes, middleware, error handling.\nProject structure: src/main.tsx, src/App.tsx, src/components/*.tsx, server/index.ts, server/routes/*.ts, server/middleware/*.ts.\nUse <<FILE:server/routes/api.ts>> and <<FILE:src/components/Dashboard.tsx>> format.\nAlso generate: package.json (with both deps), vite.config.ts (with proxy), tsconfig.json.\n'
      : '';
    const allMessages = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
    if (allMessages.length > 0) {
      allMessages[allMessages.length - 1] = {
        ...allMessages[allMessages.length - 1],
        content: allMessages[allMessages.length - 1].content + '\n\n' + ctx + fwInstructions,
      };
    }

    // A/B comparison: fire model B in parallel
    if (abMode && abModelB !== useModelId) {
      setAbResultB('');
      setAbStreaming(true);
      const abController = new AbortController();
      abAbortRef.current = abController;
      const abMsgId = generateId();
      // Stream model B in background — collect result in state
      (async () => {
        try {
          const selectedModelB = MODELS.find(m => m.id === abModelB);
          const endpoint = '/api/claude-code';
          const res = await fetchWithRetry(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'jarvis-execute', prompt: allMessages[allMessages.length - 1]?.content || '', messages: allMessages.slice(0, -1), model: abModelB, jarvisContext: { activeTab, deviceMode }, ...(imgs?.length ? { images: imgs } : {}) }),
            signal: abController.signal,
            timeout: 300000,
          }, 2);
          if (!res.ok) throw new Error('Model B request failed');
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) return;
          let buf = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6);
              if (payload === '[DONE]') break;
              try {
                const d = JSON.parse(payload);
                if (d.text) setAbResultB(prev => prev + d.text);
              } catch { continue; }
            }
          }
        } catch { /* Model B failed silently — A is primary */ }
        finally { setAbStreaming(false); abAbortRef.current = null; }
      })();
    }

    try {
      // ── Jarvis Brain: ALWAYS analyze + plan before streaming ──
      // All generations go through the full orchestration pipeline
      try {
        const analyzeRes = await fetch('/api/claude-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'jarvis-analyze',
            prompt: text,
            jarvisContext: { activeTab, deviceMode },
          }),
        });
        if (analyzeRes.ok) {
          const { data } = await analyzeRes.json();
          if (data?.plan) setJarvisPlan(data.plan);
          if (data?.analysis?.subsystems) setJarvisSubsystems(data.analysis.subsystems);
        }
      } catch { /* non-blocking — continue even if analyze fails */ }

      await streamToAssistant(allMessages, assistantMsg.id, useModelId, controller.signal, imgs, directResearchResult);

      // ── Quality Gates + Auto-Continue (REAL post-generation validation) ──
      // Check if the output is truncated or incomplete, and auto-fix
      const finalMessages = messages.concat([userMsg, assistantMsg]);
      const lastMsg = finalMessages.find(m => m.id === assistantMsg.id);
      if (lastMsg?.content && lastMsg.content.length > 200) {
        const output = lastMsg.content;
        const hasDoctype = /<!DOCTYPE\s+html/i.test(output);
        const hasClosingHtml = /<\/html\s*>/i.test(output);
        const hasBody = /<body[^>]*>/i.test(output);
        const hasClosingBody = /<\/body\s*>/i.test(output);
        const isHtmlOutput = hasDoctype || hasBody;

        // Auto-continue if HTML output is truncated (missing closing tags)
        if (isHtmlOutput && (!hasClosingHtml || !hasClosingBody) && output.length > 1000) {
          try {
            const continueRes = await fetch('/api/claude-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'continue', code: output, model: useModelId }),
              signal: AbortSignal.timeout(120000),
            });
            if (continueRes.ok) {
              const reader = continueRes.body?.getReader();
              const decoder = new TextDecoder();
              if (reader) {
                let buf = '';
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  const lines = buf.split('\n');
                  buf = lines.pop() ?? '';
                  for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6);
                    if (payload === '[DONE]') break;
                    try {
                      const d = JSON.parse(payload);
                      if (d.text) {
                        setMessages(prev => prev.map(m =>
                          m.id === assistantMsg.id ? { ...m, content: m.content + d.text } : m
                        ));
                      }
                    } catch { continue; }
                  }
                }
              }
            }
          } catch { /* auto-continue failed — show what we have */ }
        }

        // Quality gate — REAL validation with UI feedback
        if (isHtmlOutput) {
          try {
            const qcRes = await fetch('/api/claude-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'quality-check', code: output }),
              signal: AbortSignal.timeout(5000),
            });
            if (qcRes.ok) {
              const qcData = await qcRes.json();
              if (qcData?.data) {
                const { score, errors, warnings } = qcData.data;
                if (score < 50 && errors?.length > 0) {
                  // Show real quality issues to the user
                  const issueList = [...(errors || []), ...(warnings || []).slice(0, 3)].join(', ');
                  setError(`Quality: ${score}% — ${issueList}`);
                } else if (score < 80 && warnings?.length > 0) {
                  console.info(`[Quality] ${score}% — Warnings: ${warnings.join(', ')}`);
                }
              }
            }
          } catch { /* non-blocking */ }
        }

        // ── Post-Processing Pipeline: auto-fix, format, validate generated code ──
        const ppResult = postProcessOutput(output);
        if (ppResult.fixes.length > 0) {
          // Apply fixes to the assistant message
          setMessages(prev => prev.map(m =>
            m.id === assistantMsg.id ? { ...m, content: ppResult.code } : m
          ));
          console.log('[Post-Process]', ppResult.fixes.length, 'fixes applied:', ppResult.fixes.join(', '));
        }
        if (ppResult.warnings.length > 0) {
          console.warn('[Post-Process] Warnings:', ppResult.warnings.join(', '));
        }
        if (ppResult.languages.length > 0) {
          console.log('[Post-Process] Languages detected:', ppResult.languages.join(', '), '| Files:', ppResult.fileCount);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const raw = err instanceof Error ? err.message : 'Unknown error';
      // Clean ugly SDK/API errors for display
      const msg = raw
        .replace(/\[GoogleGenerativeAI Error\]:?\s*/gi, '')
        .replace(/Error fetching from https:\/\/[^\s]+/gi, '')
        .replace(/\[{"@type"[\s\S]*/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 150) || 'Request failed. Please try again.';
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id || m.content.length > 0));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      autoFixInFlightRef.current = false;
      // Mark Jarvis plan as completed on success
      if (jarvisPlan) {
        setJarvisPlan(prev => prev ? { ...prev, status: 'completed', completedTasks: prev.totalTasks, tasks: prev.tasks.map(t => ({ ...t, status: 'completed' })) } : null);
      }
      // Record generation metadata for memory
      setMessages(prev => {
        const last = prev.find(m => m.id === assistantMsg.id);
        if (last?.content) recordGeneration(last.content);
        return prev;
      });
    }
  }, [isStreaming, messages, model, streamToAssistant, buildWorkspaceContext, abMode, abModelB, outputFramework, recordGeneration, claudeCodeMode, jarvisPlan, activeTab, deviceMode]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const imgInfo = attachedImages.length > 0 ? `\n[${attachedImages.length} image(s) attached: ${attachedImages.map(i => i.name).join(', ')}]` : '';
    const imgs = attachedImages.length > 0 ? attachedImages.map(i => ({ data: i.data, type: i.type })) : undefined;
    setAttachedImages([]);
    sendToAI(text + imgInfo, imgs);
  }, [input, attachedImages, sendToAI]);

  const sendPrompt = useCallback((text: string) => {
    sendToAI(text);
  }, [sendToAI]);

  /* ── Landing \u2192 Workspace transition ── */
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const enterWorkspace = useCallback((prompt: string) => {
    const text = prompt.trim();
    if (!text) return;
    setView('workspace');
    setLandingInput('');
    setPendingPrompt(text);
  }, []);

  // Fire pending prompt from landing page
  useEffect(() => {
    if (pendingPrompt && view === 'workspace' && !isStreaming) {
      const text = pendingPrompt;
      setPendingPrompt(null);
      sendPrompt(text);
    }
  }, [pendingPrompt, view, isStreaming, sendPrompt]);

  const stopStream = () => { abortRef.current?.abort(); setIsStreaming(false); };
  const clearChat = () => { if (isStreaming) stopStream(); setMessages([]); setError(null); setClonedHtml(null); setCloneError(null); };

  // ── Conversation History Management ──
  // Load conversation list from IndexedDB on mount
  useEffect(() => {
    idbGet<ConversationEntry[]>('aurion_conversations').then(saved => {
      if (saved && Array.isArray(saved)) setConversations(saved);
    }).catch(() => {});
  }, []);

  const saveCurrentConversation = useCallback(() => {
    if (messages.length === 0) return;
    const title = messages[0]?.content?.slice(0, 60) || 'Untitled';
    setConversations(prev => {
      const existing = prev.findIndex(c => c.id === activeConversationId);
      const entry: ConversationEntry = { id: activeConversationId, title, messages: [...messages], timestamp: Date.now() };
      const updated = existing >= 0 ? prev.map(c => c.id === activeConversationId ? entry : c) : [entry, ...prev];
      idbSet('aurion_conversations', updated).catch(() => {});
      return updated;
    });
  }, [messages, activeConversationId]);

  const loadConversation = useCallback((conv: ConversationEntry) => {
    // Save current first
    saveCurrentConversation();
    setMessages(conv.messages);
    setActiveConversationId(conv.id);
    setShowConversationHistory(false);
  }, [saveCurrentConversation]);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      idbSet('aurion_conversations', updated).catch(() => {});
      return updated;
    });
  }, []);

  const newConversation = useCallback(() => {
    saveCurrentConversation();
    const newId = 'conv_' + Date.now().toString(36);
    setActiveConversationId(newId);
    clearChat();
  }, [saveCurrentConversation, clearChat]);

  // Auto-save conversation periodically
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => saveCurrentConversation(), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages, saveCurrentConversation]);

  // ── Code Snippet Bookmarks ──
  useEffect(() => {
    idbGet<Bookmark[]>('aurion_bookmarks').then(saved => {
      if (saved && Array.isArray(saved)) setBookmarks(saved);
    }).catch(() => {});
  }, []);

  const addBookmark = useCallback((label: string, code: string) => {
    const bm: Bookmark = { id: 'bm_' + Date.now().toString(36), label, code, language: projectFiles[selectedFile]?.language || 'html', file: selectedFile, timestamp: Date.now() };
    setBookmarks(prev => {
      const updated = [bm, ...prev].slice(0, 50);
      idbSet('aurion_bookmarks', updated).catch(() => {});
      return updated;
    });
  }, [selectedFile, projectFiles]);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const updated = prev.filter(b => b.id !== id);
      idbSet('aurion_bookmarks', updated).catch(() => {});
      return updated;
    });
  }, []);

  const insertBookmark = useCallback((code: string) => {
    if (!selectedFile || !projectFiles[selectedFile]) return;
    setProjectFiles(prev => ({
      ...prev,
      [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + code },
    }));
    setShowBookmarks(false);
  }, [selectedFile, projectFiles]);

  // ── AI Prompt Templates ──
  const PROMPT_TEMPLATES = useMemo(() => [
    { icon: '🏠', title: 'Landing Page', prompt: 'Build a modern landing page with hero section, features grid, testimonials, pricing cards, and footer. Use gradients, animations, and professional typography.', cat: 'Page' },
    { icon: '📊', title: 'Dashboard', prompt: 'Create an admin dashboard with sidebar navigation, stats cards, line/bar charts, recent activity table, and a clean dark theme.', cat: 'Page' },
    { icon: '🛒', title: 'E-commerce', prompt: 'Build an e-commerce product listing page with product cards, filters sidebar, search bar, cart icon with badge, and responsive grid layout.', cat: 'Page' },
    { icon: '📝', title: 'Blog', prompt: 'Create a modern blog with featured post hero, post cards grid, categories sidebar, newsletter signup, and dark/light theme toggle.', cat: 'Page' },
    { icon: '🎨', title: 'Portfolio', prompt: 'Build a creative portfolio website with animated hero, project gallery with hover effects, about section, skills bars, and contact form.', cat: 'Page' },
    { icon: '📱', title: 'Mobile App UI', prompt: 'Design a mobile app interface with bottom navigation, profile screen, settings list, notification badges, and swipeable cards.', cat: 'Page' },
    { icon: '✨', title: 'Add Animations', prompt: 'Add smooth entrance animations, hover effects, scroll-triggered reveals, and micro-interactions to the current page using CSS animations and transitions.', cat: 'Enhance' },
    { icon: '🌙', title: 'Dark Mode', prompt: 'Add a dark/light theme toggle with smooth transition. Use CSS variables for theming. Dark: #0f0f0f bg, light: #ffffff bg.', cat: 'Enhance' },
    { icon: '📐', title: 'Make Responsive', prompt: 'Make the current page fully responsive with mobile-first breakpoints, hamburger menu for mobile nav, and proper spacing/sizing for all screen sizes.', cat: 'Enhance' },
    { icon: '♿', title: 'Accessibility', prompt: 'Improve accessibility: add ARIA labels, keyboard navigation, focus styles, semantic HTML, proper heading hierarchy, alt texts, and color contrast fixes.', cat: 'Enhance' },
    { icon: '⚡', title: 'Optimize Performance', prompt: 'Optimize the code: lazy load images, minimize DOM, use CSS containment, add loading states, optimize animations with will-change and transform.', cat: 'Enhance' },
    { icon: '🧩', title: 'Add Form', prompt: 'Add a professional contact form with name, email, message fields, validation feedback, submit button with loading state, and success/error toast notifications.', cat: 'Component' },
    { icon: '📊', title: 'Add Charts', prompt: 'Add interactive data visualization charts using Recharts: line chart, bar chart, and pie chart with sample data, tooltips, and legends.', cat: 'Component' },
    { icon: '🗺️', title: 'Add Navigation', prompt: 'Add a professional navbar with logo, links, dropdown menus, mobile hamburger menu, and smooth scroll to sections. Sticky on scroll.', cat: 'Component' },
  ], []);

  // ── Find & Replace results ──
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
  }, [findQuery, replaceQuery, findRegex, findCaseSensitive]);

  // ── AI Code Explainer ──
  const explainCurrentCode = useCallback(async () => {
    if (!selectedFile || !projectFiles[selectedFile] || isStreaming) return;
    setIsExplaining(true);
    const code = projectFiles[selectedFile].content.slice(0, 8000);
    const explainPrompt = `Explain this code concisely. What does it do, key patterns used, and any potential issues:\n\n\`\`\`${projectFiles[selectedFile].language || 'html'}\n${code}\n\`\`\``;
    sendPrompt(explainPrompt);
    setIsExplaining(false);
  }, [selectedFile, projectFiles, isStreaming, sendPrompt]);

  // ── Editor Themes ──
  const EDITOR_THEMES = useMemo(() => [
    { id: 'vs-dark', name: 'Dark+ (Default)', desc: 'VS Code dark theme' },
    { id: 'vs', name: 'Light', desc: 'VS Code light theme' },
    { id: 'hc-black', name: 'High Contrast Dark', desc: 'Accessibility focused' },
    { id: 'hc-light', name: 'High Contrast Light', desc: 'Light accessibility' },
  ], []);

  // ── Keyboard Shortcuts Reference ──
  const SHORTCUTS = useMemo(() => [
    { keys: '⌘K', desc: 'Command Palette', cat: 'General' },
    { keys: '⌘P', desc: 'Go to File', cat: 'General' },
    { keys: '⌘⇧F', desc: 'Search in Files', cat: 'General' },
    { keys: '⌘S', desc: 'Save & Refresh Preview', cat: 'General' },
    { keys: 'Esc', desc: 'Close Modals/Panels', cat: 'General' },
    { keys: '⌘B', desc: 'Toggle Chat Panel', cat: 'View' },
    { keys: '⌘`', desc: 'Toggle Terminal', cat: 'View' },
    { keys: '⌘E', desc: 'Toggle Visual Editor', cat: 'View' },
    { keys: '⌘1-4', desc: 'Switch Tabs (App/Code/DB/Pay)', cat: 'View' },
    { keys: '⌘H', desc: 'Conversation History', cat: 'Chat' },
    { keys: '⌘Z', desc: 'Undo (VFS)', cat: 'Edit' },
    { keys: '⌘⇧Z', desc: 'Redo (VFS)', cat: 'Edit' },
    { keys: '⌘D', desc: 'Download ZIP', cat: 'Project' },
    { keys: '⌘⇧H', desc: 'Find & Replace', cat: 'Edit' },
    { keys: '⌘/', desc: 'Keyboard Shortcuts', cat: 'General' },
    { keys: '⌘G', desc: 'Go to Line', cat: 'Edit' },
  ], []);

  // ── Quick File Creator ──
  const createNewFile = useCallback((name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    setProjectFiles(prev => ({
      ...prev,
      [trimmed]: { content: '', language: detectLanguage(trimmed) },
    }));
    openFile(trimmed);
    setActiveTab('code');
    setShowNewFileInput(false);
    setNewFileName('');
  }, [openFile]);

  // ── Preview Screenshot ──
  const capturePreviewScreenshot = useCallback(async () => {
    if (!iframeRef.current) return;
    try {
      const iframe = iframeRef.current;
      const canvas = document.createElement('canvas');
      const rect = iframe.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(2, 2);
      // Use the iframe's srcdoc to render
      const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${iframe.srcdoc || '<p>No preview</p>'}</div></foreignObject></svg>`;
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => {
          if (!b) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = `aurion-preview-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        // Fallback: download HTML directly
        const htmlBlob = new Blob([iframe.srcdoc || ''], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        window.open(htmlUrl, '_blank');
      };
      img.src = url;
    } catch {
      // Fallback: open in new tab
      if (iframeRef.current?.srcdoc) {
        const htmlBlob = new Blob([iframeRef.current.srcdoc], { type: 'text/html' });
        window.open(URL.createObjectURL(htmlBlob), '_blank');
      }
    }
  }, []);

  /* ── Auto-deploy to Vercel (server token) ── */
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
        timeout: 60000, // 60s for deploy
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
  }, [clonedHtml, messages]);

  /* ── Clone website functions ── */
  const streamClone = async (url: string, html: string, tokens: { colors: string[]; fonts: string[]; cssVariables?: Record<string, string>; gradients?: string[]; shadows?: string[]; borderRadii?: string[]; mediaQueries?: string[]; keyframes?: string[] }, screenshot: string | null, signal: AbortSignal, pageName?: string, rawHtml?: string, branding?: unknown, navigation?: unknown[], images?: unknown[], videos?: unknown[], styleBlocks?: string, linkedResources?: unknown, screenshots?: string[], currentHtml?: string, feedback?: string, extraData?: { cssFramework?: string; iconLibraries?: string[]; animationLibraries?: string[]; colorFrequency?: Record<string, number>; interactionModels?: unknown[]; layeredAssets?: unknown[]; multiStateContent?: unknown[]; scrollBehaviors?: unknown[]; computedPatterns?: Record<string, Record<string, string>>; zIndexLayers?: unknown[]; pageTopology?: unknown[]; fontStack?: unknown[]; hoverTransitions?: unknown[]; responsiveBreakpoints?: unknown[]; componentSpecs?: string; designSystemCard?: string }): Promise<string> => {
    const res = await fetch('/api/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, html, rawHtml, tokens, branding, screenshot, screenshots, pageName, navigation, images, videos, styleBlocks, linkedResources, model, currentHtml, feedback, ...(extraData || {}) }),
      signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Clone request failed' }));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('No response stream');

    let result = '';
    let buffer = '';
    let rawBytes = 0;
    let eventCount = 0;
    let textEvents = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rawBytes += value?.byteLength ?? 0;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        eventCount++;
        const payload = line.slice(6);
        if (payload === '[DONE]') break;
        let data;
        try { data = JSON.parse(payload); } catch { continue; }
        if (data.error) {
          const clean = data.error.replace(/\[GoogleGenerativeAI Error\]:?\s*/gi, '').replace(/Error fetching from https:\/\/[^\s]+/gi, '').replace(/\[{"@type"[\s\S]*/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, 150) || 'Clone failed. Please try again.';
          throw new Error(clean);
        }
        if (data.model) setCloneProgress(`Cloning with ${data.model}...`);
        if (data.text) { result += data.text; textEvents++; }
      }
    }
    console.log(`[streamClone] rawBytes=${rawBytes}, events=${eventCount}, textEvents=${textEvents}, resultLen=${result.length}, starts=${result.slice(0, 60)}`);
    // Extract HTML content — adapted from screenshot-to-code codegen/utils.py
    let cleaned = result.trim();
    // 1. Extract from <file path="...">...</file> wrapper (screenshot-to-code format)
    const fileMatch = cleaned.match(/<file\s+path="[^"]+"\s*>([\s\S]*?)<\/file>/i);
    if (fileMatch) {
      cleaned = fileMatch[1].trim();
    }
    // 2. Strip markdown code fences if AI wrapped the HTML
    cleaned = cleaned.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    // 3. Strip <think> reasoning blocks from models that include them
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
    // 4. Extract <!DOCTYPE html>.....</html> if there's extra text around it
    const doctypeMatch = cleaned.match(/(<!DOCTYPE\s+html[^>]*>[\s\S]*<\/html>)/i);
    if (doctypeMatch) {
      cleaned = doctypeMatch[1];
    } else {
      const htmlMatch = cleaned.match(/(<html[\s\S]*<\/html>)/i);
      if (htmlMatch) cleaned = htmlMatch[1];
    }
    // 5. Remove external resource links that cause CORS errors in iframe
    cleaned = cleaned.replace(/<link[^>]*rel=["'](?:manifest|preconnect|dns-prefetch|preload|prefetch|modulepreload)[^>]*>/gi, '');
    cleaned = cleaned.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
    cleaned = cleaned.replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, '');
    // 6. Fix duplicate HTML documents: if AI echoed scraped HTML after its clone, keep only the first document
    const secondDoctype = cleaned.indexOf('<!DOCTYPE', 10);
    if (secondDoctype > 0) {
      cleaned = cleaned.slice(0, secondDoctype).trim();
      if (!cleaned.includes('</html>')) cleaned += '\n</html>';
      if (!cleaned.includes('</body>')) cleaned = cleaned.replace('</html>', '</body>\n</html>');
    }
    // 7. Post-processing: inject <base href> for relative asset URLs
    if (url && cleaned.includes('<head')) {
      try {
        const origin = new URL(url).origin;
        if (!cleaned.includes('<base ')) {
          cleaned = cleaned.replace(/<head([^>]*)>/, `<head$1>\n<base href="${origin}/" target="_self">`);
        }
      } catch { /* invalid url, skip */ }
    }
    // 8. Ensure Font Awesome CDN if fa- classes are used
    if (/\bfa-[a-z]/.test(cleaned) && !cleaned.includes('font-awesome') && !cleaned.includes('fontawesome')) {
      cleaned = cleaned.replace('</head>', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">\n</head>');
    }
    // 9. HTML integrity: ensure closing tags exist
    if (!/<\/body>/i.test(cleaned) && /<body/i.test(cleaned)) cleaned += '\n</body>';
    if (!/<\/html>/i.test(cleaned) && /<html/i.test(cleaned)) cleaned += '\n</html>';
    return cleaned;
  };

  const cloneWebsite = useCallback(async (urlOverride?: string) => {
    const url = (urlOverride || cloneUrl).trim();
    if (!url || isCloning) return;

    setIsCloning(true);
    setCloneProgress('Scraping website...');
    setCloneError(null);
    setShowCloneModal(false);
    setActiveTab('app');

    const controller = new AbortController();
    cloneAbortRef.current = controller;

    try {
      // Step 1: Scrape the main page
      const scrapeRes = await fetchWithRetry('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
        timeout: 45000, // 45s for scraping
      }, 1);

      if (!scrapeRes.ok) {
        const err = await scrapeRes.json().catch(() => ({ error: 'Scrape failed' }));
        throw new Error(err.error || `Scrape HTTP ${scrapeRes.status}`);
      }

      const scrapeData = await scrapeRes.json();

      // Store scrapeData for future refinement iterations
      lastScrapeDataRef.current = scrapeData;

      // Step 2: Clone main page with AI
      setCloneProgress('Cloning main page with AI...');
      let mainHtml = '';
      let cloneErrorMsg = '';
      try {
        mainHtml = await streamClone(
          url,
          scrapeData.html,
          scrapeData.tokens,
          scrapeData.screenshot,
          controller.signal,
          undefined,
          scrapeData.rawHtml, // pass full raw HTML for complete page reconstruction
          scrapeData.branding,
          scrapeData.navigation,
          scrapeData.images,
          scrapeData.videos,
          scrapeData.styleBlocks,
          scrapeData.linkedResources,
          scrapeData.screenshots, // multi-screenshot scroll captures
          undefined, // currentHtml
          undefined, // feedback
          { cssFramework: scrapeData.cssFramework, iconLibraries: scrapeData.iconLibraries, animationLibraries: scrapeData.animationLibraries, colorFrequency: scrapeData.colorFrequency, interactionModels: scrapeData.interactionModels, layeredAssets: scrapeData.layeredAssets, multiStateContent: scrapeData.multiStateContent, scrollBehaviors: scrapeData.scrollBehaviors, computedPatterns: scrapeData.computedPatterns, zIndexLayers: scrapeData.zIndexLayers, pageTopology: scrapeData.pageTopology, fontStack: scrapeData.fontStack, hoverTransitions: scrapeData.hoverTransitions, responsiveBreakpoints: scrapeData.responsiveBreakpoints, componentSpecs: scrapeData.componentSpecs, designSystemCard: scrapeData.designSystemCard },
        );
        console.log('[clone] AI returned', mainHtml.length, 'chars. Starts with:', mainHtml.slice(0, 100));
      } catch (cloneErr) {
        cloneErrorMsg = cloneErr instanceof Error ? cloneErr.message : 'Unknown clone error';
        console.warn(`[clone] AI clone failed (model: ${model}):`, cloneErrorMsg);
      }

      // If AI produced valid HTML (has doctype or body tag and substantial content), use it
      const aiWorked = mainHtml.length > 200 && (/<body/i.test(mainHtml) || /<!DOCTYPE/i.test(mainHtml));

      if (!aiWorked) {
        // Show the actual error from the API so user can diagnose
        const safeErr = cloneErrorMsg
          ? cloneErrorMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 200)
          : `AI returned ${mainHtml.length} chars. Check browser console (F12) for [streamClone] debug info.`;
        console.log('[clone] AI failed:', safeErr);
        mainHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clone Error</title></head><body style="background:#0a0a0a;color:#e0e0e0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0"><div style="text-align:center;max-width:480px;padding:40px"><div style="font-size:48px;margin-bottom:16px">⚠️</div><h2 style="font-size:22px;font-weight:600;margin:0 0 12px">Clone Failed</h2><p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 16px">${safeErr}</p><p style="color:#666;font-size:13px">Try a different URL, retry, or check API keys in Vercel dashboard.</p></div></body></html>`;
      }

      // Auto-refinement: if clone succeeded, do a self-check refinement pass
      if (aiWorked && !controller.signal.aborted) {
        setCloneProgress('Auto-refining for accuracy...');
        try {
          const autoFeedback = 'Self-check: compare your output against the original. Fix any missing sections, wrong colors, broken layouts, missing images, incorrect fonts, or misaligned elements. Make it pixel-perfect.';
          const refined = await streamClone(
            url,
            scrapeData.html,
            scrapeData.tokens,
            scrapeData.screenshot,
            controller.signal,
            undefined,
            scrapeData.rawHtml,
            scrapeData.branding,
            scrapeData.navigation,
            scrapeData.images,
            scrapeData.videos,
            scrapeData.styleBlocks,
            scrapeData.linkedResources,
            scrapeData.screenshots,
            mainHtml,       // currentHtml
            autoFeedback,   // feedback
            { cssFramework: scrapeData.cssFramework, iconLibraries: scrapeData.iconLibraries, animationLibraries: scrapeData.animationLibraries, colorFrequency: scrapeData.colorFrequency, interactionModels: scrapeData.interactionModels, layeredAssets: scrapeData.layeredAssets, multiStateContent: scrapeData.multiStateContent, scrollBehaviors: scrapeData.scrollBehaviors, computedPatterns: scrapeData.computedPatterns, zIndexLayers: scrapeData.zIndexLayers, pageTopology: scrapeData.pageTopology, fontStack: scrapeData.fontStack, hoverTransitions: scrapeData.hoverTransitions, responsiveBreakpoints: scrapeData.responsiveBreakpoints, componentSpecs: scrapeData.componentSpecs, designSystemCard: scrapeData.designSystemCard },
          );
          const refinedWorked = refined.length > 200 && (/<body/i.test(refined) || /<!DOCTYPE/i.test(refined));
          if (refinedWorked) {
            mainHtml = refined;
            setTerminalLines(prev => [...prev, '$ \u2713 auto-refined clone for accuracy']);
          }
        } catch {
          // Auto-refine failed, keep original clone — not critical
        }
      }

      setCloneProgress('Done');
      setClonedHtml(mainHtml);
      setCloneProgress('');
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Clone failed';
      setCloneError(msg);
      setError(msg);
    } finally {
      setIsCloning(false);
      setCloneProgress('');
      cloneAbortRef.current = null;
    }
  }, [cloneUrl, isCloning, model]);

  const stopClone = () => {
    cloneAbortRef.current?.abort();
    setIsCloning(false);
    setIsRefining(false);
    setCloneProgress('');
  };

  const refineClone = useCallback(async () => {
    const feedbackText = refineFeedback.trim().slice(0, 5000); // Cap feedback to prevent context overflow
    if (!feedbackText || !clonedHtml || !lastScrapeDataRef.current || isRefining) return;

    setIsRefining(true);
    setCloneProgress('Refining clone...');
    setCloneError(null);

    const controller = new AbortController();
    cloneAbortRef.current = controller;
    const scrapeData = lastScrapeDataRef.current;

    try {
      const refined = await streamClone(
        cloneUrl,
        scrapeData.html,
        scrapeData.tokens,
        scrapeData.screenshot,
        controller.signal,
        undefined,
        scrapeData.rawHtml, // pass rawHtml for structured content + SPA data extraction
        scrapeData.branding,
        scrapeData.navigation,
        scrapeData.images,
        scrapeData.videos,
        scrapeData.styleBlocks,
        scrapeData.linkedResources,
        scrapeData.screenshots,
        clonedHtml,    // currentHtml
        feedbackText,  // feedback
        { cssFramework: scrapeData.cssFramework, iconLibraries: scrapeData.iconLibraries, animationLibraries: scrapeData.animationLibraries, colorFrequency: scrapeData.colorFrequency, interactionModels: scrapeData.interactionModels, layeredAssets: scrapeData.layeredAssets, multiStateContent: scrapeData.multiStateContent, scrollBehaviors: scrapeData.scrollBehaviors, computedPatterns: scrapeData.computedPatterns, zIndexLayers: scrapeData.zIndexLayers, pageTopology: scrapeData.pageTopology, fontStack: scrapeData.fontStack, hoverTransitions: scrapeData.hoverTransitions, responsiveBreakpoints: scrapeData.responsiveBreakpoints, componentSpecs: scrapeData.componentSpecs, designSystemCard: scrapeData.designSystemCard },
      );

      const aiWorked = refined.length > 200 && (/<body/i.test(refined) || /<!DOCTYPE/i.test(refined));
      if (aiWorked) {
        setClonedHtml(refined);
        setRefineFeedback('');
      } else {
        setCloneError('Refinement produced invalid HTML. Try different feedback.');
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Refine failed';
      setCloneError(msg);
    } finally {
      setIsRefining(false);
      setCloneProgress('');
      cloneAbortRef.current = null;
    }
  }, [refineFeedback, clonedHtml, cloneUrl, isRefining, model]);

  // Listen for visual edits from the iframe — store in ref, don't update state (prevents iframe re-render)
  useEffect(() => {
    function handleEditorMessage(e: MessageEvent) {
      if (e.data?.type !== 'aurion_edit' || !e.data.html) return;
      pendingEditHtmlRef.current = e.data.html as string;
    }
    if (isEditMode) {
      window.addEventListener('message', handleEditorMessage);
      return () => window.removeEventListener('message', handleEditorMessage);
    }
  }, [isEditMode]);

  // Listen for runtime errors + console output from the iframe preview
  useEffect(() => {
    function handleIframeMessage(e: MessageEvent) {
      // Console log/warn/info forwarding
      if (e.data?.type === 'aurion_console') {
        const { level, text } = e.data as { level: string; text: string };
        const prefix = level === 'warn' ? '⚠ ' : level === 'info' ? 'ℹ ' : '';
        const color = level === 'warn' ? 'text-yellow-400' : level === 'info' ? 'text-blue-400' : 'text-[#888]';
        // We store as plain string with a prefix for coloring in the render
        setTerminalLines(prev => [...prev.slice(-200), `${prefix}${text}`]);
        return;
      }
      if (e.data?.type === 'aurion_console' && e.data.text) {
        setConsoleLogs(prev => [...prev.slice(-99), { type: e.data.level || 'log', message: String(e.data.text).slice(0, 500), ts: Date.now() }]);
        return;
      }
      if (e.data?.type !== 'aurion_error' || !e.data.error) return;
      const err = e.data.error as { message: string; source?: string; line?: number; col?: number };
      // Ignore noise: ResizeObserver, extensions, browser internals
      if (/ResizeObserver|Script error\.|chrome-extension|moz-extension/i.test(err.message)) return;
      const entry = { ...err, timestamp: Date.now() };
      setRuntimeErrors(prev => {
        // Deduplicate within 3 seconds
        if (prev.some(p => p.message === err.message && entry.timestamp - p.timestamp < 3000)) return prev;
        const next = [...prev, entry].slice(-20); // keep last 20
        return next;
      });
      setTerminalLines(prev => [...prev, `✗ Runtime Error: ${err.message}${err.line ? ` (line ${err.line})` : ''}`]);
      setShowTerminal(true);
    }
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  // Auto-fix: when enabled and new errors appear, automatically send fix request to AI
  useEffect(() => {
    if (!autoFixEnabled || runtimeErrors.length === 0 || isStreaming || autoFixInFlightRef.current) return;
    const latestError = runtimeErrors[runtimeErrors.length - 1];
    // Only auto-fix errors from the last 5 seconds
    if (Date.now() - latestError.timestamp > 5000) return;
    autoFixInFlightRef.current = true;
    const currentHtml = rawPreviewHtml || '';
    const codeSnippet = currentHtml.length > 12000 ? currentHtml.slice(0, 6000) + '\n... (truncated) ...\n' + currentHtml.slice(-6000) : currentHtml;
    const fixPrompt = `🔧 AUTO-FIX: Runtime error detected in the preview:\n\nError: ${latestError.message}${latestError.line ? `\nLine: ${latestError.line}` : ''}${latestError.source ? `\nSource: ${latestError.source}` : ''}\n\nCurrent code:\n\`\`\`html\n${codeSnippet}\n\`\`\`\n\nFix this error. Return the COMPLETE corrected HTML. Do not explain, just fix the code.`;
    sendToAI(fixPrompt);
    // Reset after sending (prevent loops)
    setTimeout(() => { autoFixInFlightRef.current = false; }, 10000);
  }, [runtimeErrors, autoFixEnabled, isStreaming, rawPreviewHtml, sendToAI]);

  // Manual fix — user clicks "Fix" on a specific error
  const fixRuntimeError = useCallback((err: { message: string; source?: string; line?: number }) => {
    if (isStreaming) return;
    const currentHtml = rawPreviewHtml || '';
    const codeSnippet = currentHtml.length > 12000 ? currentHtml.slice(0, 6000) + '\n... (truncated) ...\n' + currentHtml.slice(-6000) : currentHtml;
    const fixPrompt = `Fix this runtime error in my preview:\n\nError: ${err.message}${err.line ? `\nLine: ${err.line}` : ''}${err.source ? `\nSource: ${err.source}` : ''}\n\nCurrent code:\n\`\`\`html\n${codeSnippet}\n\`\`\`\n\nReturn the COMPLETE corrected HTML with the fix applied.`;
    sendToAI(fixPrompt);
  }, [isStreaming, rawPreviewHtml, sendToAI]);

  // Listen for Select & Prompt — element selected in iframe for AI modification
  useEffect(() => {
    function handleSelectPrompt(e: MessageEvent) {
      if (e.data?.type !== 'aurion_select_prompt' || !e.data.element) return;
      const el = e.data.element as { outerHtml: string; cssPath: string; tagName: string; rect: { top: number; left: number; width: number; height: number } };
      setSelectPromptData(el);
      setSelectPromptInput('');
      setTimeout(() => selectPromptRef.current?.focus(), 100);
    }
    window.addEventListener('message', handleSelectPrompt);
    return () => window.removeEventListener('message', handleSelectPrompt);
  }, []);

  // Select & Prompt — surgically modify one element via AI
  const submitSelectPrompt = useCallback(async () => {
    if (!selectPromptData || !selectPromptInput.trim() || selectPromptLoading) return;
    setSelectPromptLoading(true);
    const instruction = selectPromptInput.trim();
    const elementHtml = selectPromptData.outerHtml;
    const cssPath = selectPromptData.cssPath;

    try {
      const optimalModel = getOptimalModel(model, instruction, false);
      const endpoint = '/api/claude-code';
      const userMsg = `You are a surgical HTML editor. The user selected a specific element in their page and wants you to modify ONLY that element. Return ONLY the modified element's HTML — no explanation, no markdown, no code fences, no surrounding HTML. Just the raw modified element HTML that will replace the original.\n\nModify this HTML element:\n\n\`\`\`html\n${elementHtml}\n\`\`\`\n\nInstruction: ${instruction}\n\nReturn ONLY the modified element HTML. Nothing else.`;

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'jarvis-execute',
          prompt: userMsg,
          model: optimalModel,
          jarvisContext: { activeTab, deviceMode },
        }),
        timeout: 60000,
      }, 2);

      if (!res.ok) throw new Error('AI request failed');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader');

      let newElementHtml = '';
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const d = JSON.parse(payload);
            if (d.text) newElementHtml += d.text;
          } catch { continue; }
        }
      }

      // Clean the response — strip code fences if AI added them
      newElementHtml = newElementHtml.trim()
        .replace(/^```(?:html)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

      if (!newElementHtml || newElementHtml.length < 5) throw new Error('Empty AI response');

      // Surgically replace the element in the full HTML
      const currentHtml = rawPreviewHtml || '';
      // Strategy: find the original element's outerHTML in the full page and replace it
      const idx = currentHtml.indexOf(elementHtml);
      if (idx !== -1) {
        const updated = currentHtml.slice(0, idx) + newElementHtml + currentHtml.slice(idx + elementHtml.length);
        if (projectFiles['index.html']) {
          setProjectFiles(prev => ({ ...prev, 'index.html': { content: updated, language: 'html' } }));
        } else {
          setClonedHtml(updated);
        }
        setTerminalLines(prev => [...prev, `$ ✓ AI modified <${selectPromptData.tagName.toLowerCase()}> — "${instruction.slice(0, 50)}"`]);
      } else {
        // Fallback: use CSS path to inject via iframe script
        setTerminalLines(prev => [...prev, `$ ✗ Element not found for replacement — try modifying via chat`]);
      }

      setSelectPromptData(null);
      setSelectPromptInput('');
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ ✗ Select & Prompt failed: ${err instanceof Error ? err.message : 'unknown'}`]);
    } finally {
      setSelectPromptLoading(false);
    }
  }, [selectPromptData, selectPromptInput, selectPromptLoading, model, rawPreviewHtml, projectFiles, setProjectFiles, setClonedHtml]);

  // ── 21st.dev: search components ──────────────────────────────────────────
  const search21stComponents = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setBrowser21stLoading(true);
    setBrowser21stResults([]);
    try {
      const res = await fetch('/api/magic21st', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, action: 'search' }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        const details = data?.details ? ` — ${String(data.details).slice(0, 180)}` : '';
        setTerminalLines(prev => [...prev, `$ ✗ 21st.dev search failed: ${data?.error || `HTTP ${res.status}`}${details}`]);
        return;
      }
      // Normalise various response shapes from 21st.dev
      const results: Component21st[] = Array.isArray(data) ? data
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.results) ? data.results
        : [];
      setBrowser21stResults(results);
      if (results.length === 0) {
        setTerminalLines(prev => [...prev, `$ ℹ 21st.dev: no components found for "${q}"`]);
      }
    } catch (e) {
      setTerminalLines(prev => [...prev, `$ ✗ 21st.dev search error: ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setBrowser21stLoading(false);
    }
  }, []);

  // ── 21st.dev: inject component into current page via AI ───────────────────
  const inject21stComponent = useCallback(async (component: Component21st) => {
    if (previewHtml === null) {
      setTerminalLines(prev => [...prev, '$ ✗ Create a page first before injecting a component.']);
      return;
    }
    setInjecting21stComponent(component.name);
    setShow21stBrowser(false);

    const codeSnippet = component.code
      ? `\`\`\`tsx\n${component.code.slice(0, 8000)}\n\`\`\``
      : '(source not available — use the name and description as inspiration)';

    const prompt = `I want to add a "${component.name}" component from 21st.dev to my current page.

Component description: ${component.description || ''}
${component.tags?.length ? `Tags: ${component.tags.join(', ')}` : ''}

Reference implementation (React/Tailwind):
${codeSnippet}

Task: Convert this component to pure HTML with Tailwind CDN classes (no JSX, no imports, no React). Then integrate it naturally into my existing page at the most appropriate location (e.g. after the hero, before the footer, or as a new section). Return the complete updated HTML page.`;

    sendToAI(prompt);
    setInjecting21stComponent(null);
  }, [previewHtml, sendToAI]);

  // Commit pending edits when exiting edit mode
  useEffect(() => {
    if (!isEditMode && pendingEditHtmlRef.current) {
      const html = pendingEditHtmlRef.current;
      pendingEditHtmlRef.current = null;
      if (projectFiles['index.html']) {
        setProjectFiles(prev => ({ ...prev, 'index.html': { content: html, language: 'html' } }));
      } else {
        setClonedHtml(html);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const refreshPreview = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const src = iframe.srcdoc;
      iframe.srcdoc = '';
      requestAnimationFrame(() => { iframe.srcdoc = src; });
    }
  };

  const copyPreviewHtml = () => {
    if (previewHtml) {
      navigator.clipboard.writeText(previewHtml).then(() => {
        setTerminalLines(prev => [...prev, 'ℹ Preview HTML copied to clipboard']);
        showToast('HTML copied to clipboard', 'success');
      });
    }
  };

  const openPreviewNewTab = () => {
    if (previewHtml) {
      const blob = new Blob([previewHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };

  const hasContent = messages.length > 0;
  const hasPreviewContent = previewHtml !== null;

  // Smart context-aware suggestions based on project state
  const smartSuggestions = useMemo(() => {
    const fileNames = Object.keys(projectFiles);
    const allContent = Object.values(projectFiles).map(f => f.content).join('\n').toLowerCase();
    const hasFiles = fileNames.length > 0;
    const hasHtml = fileNames.some(f => f.endsWith('.html'));
    const hasCss = fileNames.some(f => f.endsWith('.css')) || allContent.includes('<style');
    const hasJs = fileNames.some(f => f.endsWith('.js') || f.endsWith('.ts'));
    const hasResponsive = allContent.includes('@media') || allContent.includes('responsive');
    const hasDarkMode = allContent.includes('dark-mode') || allContent.includes('prefers-color-scheme') || allContent.includes('dark:');
    const hasAnimation = allContent.includes('animation') || allContent.includes('gsap') || allContent.includes('lenis');
    const hasNav = allContent.includes('<nav') || allContent.includes('navbar');
    const hasFooter = allContent.includes('<footer');
    const hasForm = allContent.includes('<form') || allContent.includes('<input');
    const hasAuth = allContent.includes('login') || allContent.includes('signup') || allContent.includes('auth');

    if (!hasFiles) {
      return [
        { title: 'SaaS Landing Page', desc: 'Modern landing page with hero, pricing & testimonials' },
        { title: 'Dashboard App', desc: 'Analytics dashboard with data charts' },
        { title: 'Portfolio Site', desc: 'Personal portfolio with projects showcase' },
      ];
    }

    const suggestions: { title: string; desc: string }[] = [];
    if (hasHtml && !hasResponsive) suggestions.push({ title: 'Make Responsive', desc: 'Add mobile/tablet breakpoints' });
    if (hasHtml && !hasDarkMode) suggestions.push({ title: 'Add Dark Mode', desc: 'Toggle + prefers-color-scheme' });
    if (hasHtml && !hasAnimation) suggestions.push({ title: 'Add Animations', desc: 'GSAP scroll + hover animations' });
    if (hasHtml && !hasNav) suggestions.push({ title: 'Add Navigation', desc: 'Sticky navbar with smooth scroll' });
    if (hasHtml && !hasFooter) suggestions.push({ title: 'Add Footer', desc: 'Footer with links & social icons' });
    if (hasHtml && !hasForm) suggestions.push({ title: 'Add Contact Form', desc: 'Form with validation & submit' });
    if (!hasCss) suggestions.push({ title: 'Add Custom CSS', desc: 'Styling & design polish' });
    if (!hasJs) suggestions.push({ title: 'Add Interactivity', desc: 'JS logic for dynamic behavior' });
    if (hasForm && !hasAuth) suggestions.push({ title: 'Add Auth Pages', desc: 'Login & signup flow' });
    if (hasHtml && hasCss && hasJs) suggestions.push({ title: 'Performance Audit', desc: 'Optimize speed & bundle size' });

    return suggestions.slice(0, 3);
  }, [projectFiles]);

  // Follow-up suggestion chips after AI response
  const followUpSuggestions = useMemo(() => {
    if (isStreaming || messages.length < 2) return [];
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant?.content) return [];
    const content = lastAssistant.content.toLowerCase();
    const chips: string[] = [];

    // Context-aware suggestions based on what AI just generated
    if (content.includes('```html') || content.includes('```jsx') || content.includes('```tsx')) {
      if (!content.includes('dark')) chips.push('Add dark mode toggle');
      if (!content.includes('animation') && !content.includes('motion')) chips.push('Add animations');
      if (!content.includes('responsive') && !content.includes('@media')) chips.push('Make it responsive');
      if (!content.includes('loading') && !content.includes('skeleton')) chips.push('Add loading states');
      chips.push('Improve the design');
      chips.push('Add more sections');
    } else if (content.includes('```css')) {
      chips.push('Add hover effects');
      chips.push('Add transitions');
      chips.push('Make it responsive');
    } else if (content.includes('```')) {
      chips.push('Explain this code');
      chips.push('Add error handling');
      chips.push('Optimize performance');
    } else {
      chips.push('Show me the code');
      chips.push('Give me more details');
      chips.push('Create a prototype');
    }
    return chips.slice(0, 4);
  }, [messages, isStreaming]);

  // Panel visibility & sizing
  const [showChat, setShowChat] = useState(true);
  const [chatWidth, setChatWidth] = useState(380);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const chatDragRef = useRef(false);
  const termDragRef = useRef(false);

  // Terminal input
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [terminalLines]);

  // Drag resize for chat panel
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (chatDragRef.current) {
        const w = Math.max(280, Math.min(600, e.clientX));
        setChatWidth(w);
      }
      if (termDragRef.current) {
        const rect = document.getElementById('right-panel')?.getBoundingClientRect();
        if (rect) {
          const h = Math.max(100, Math.min(500, rect.bottom - e.clientY));
          setTerminalHeight(h);
        }
      }
    };
    const onUp = () => { chatDragRef.current = false; termDragRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [gitCommits, setGitCommits] = useState<{ hash: string; msg: string; date: string }[]>([]);
  const [gitStaged, setGitStaged] = useState(false);

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
            // Terminal output is handled by the hook's terminalOutput state
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
        else {
          setTerminalLines(p => [...p, '.', ...names.map(n => '├── ' + n), `\n${names.length} file(s)`]);
        }
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
        } else {
          setTerminalLines(p => [...p, `cat: ${file}: No such file`]);
        }
        return prev;
      });
      return;
    }
    if (c.startsWith('head ')) {
      const file = raw.slice(5).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const lines = f.content.split('\n').slice(0, 10);
          setTerminalLines(p => [...p, ...lines]);
        } else setTerminalLines(p => [...p, `head: ${file}: No such file`]);
        return prev;
      });
      return;
    }
    if (c.startsWith('tail ')) {
      const file = raw.slice(5).trim();
      setProjectFiles(prev => {
        const f = prev[file];
        if (f) {
          const lines = f.content.split('\n').slice(-10);
          setTerminalLines(p => [...p, ...lines]);
        } else setTerminalLines(p => [...p, `tail: ${file}: No such file`]);
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
          const matches = f.content.split('\n')
            .map((line, i) => ({ line, num: i + 1 }))
            .filter(({ line }) => line.toLowerCase().includes(pattern.toLowerCase()));
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
      setTerminalLines(prev => [...prev, `copied ${parts[0]} → ${parts[1]}`]);
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
      setTerminalLines(prev => [...prev, `moved ${parts[0]} → ${parts[1]}`]);
      return;
    }
    if (c.startsWith('mkdir ')) {
      setTerminalLines(prev => [...prev, 'directory noted (create files inside it)']);
      return;
    }
    if (c === 'pwd') { setTerminalLines(prev => [...prev, '/project']); return; }
    if (c === 'whoami') { setTerminalLines(prev => [...prev, 'aurion']); return; }
    if (c === 'date') { setTerminalLines(prev => [...prev, new Date().toString()]); return; }
    if (c.startsWith('echo ')) { setTerminalLines(prev => [...prev, cmd.slice(5)]); return; }

    // Scaffold command
    if (c.startsWith('scaffold ')) {
      const fw = raw.slice(9).trim().toLowerCase() as 'html' | 'react' | 'nextjs' | 'vue';
      if (['html', 'react', 'nextjs', 'vue'].includes(fw)) {
        scaffoldFrameworkProject(fw);
        setTerminalLines(prev => [...prev, `✓ Scaffolded ${fw} project`]);
      } else {
        setTerminalLines(prev => [...prev, 'Usage: scaffold <html|react|nextjs|vue>']);
      }
      return;
    }
    // AI code review shortcut
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
      setTerminalLines(prev => [...prev, '', '> aurion-project@1.0.0 dev', '> next dev', '', '  ▲ Next.js 16.1.6', '  - Local:    http://localhost:3000', '  - Network:  http://192.168.1.42:3000', '', '  ✓ Ready in 1.2s']);
      return;
    }
    if (c === 'npm run build') {
      setProjectFiles(prev => {
        const fileCount = Object.keys(prev).length;
        setTerminalLines(p => [...p, '', '> aurion-project@1.0.0 build', '> next build', '', `  ✓ Compiled ${fileCount} file(s) successfully`, '  ✓ Collecting page data', '  ✓ Generating static pages', `  ✓ Build completed in 3.2s`, '', 'Route (app)                              Size', '┌ ○ /                                    5.2 kB', '└ ○ /api/*                               1.1 kB', '', `✓ ${fileCount} file(s) built`]);
        return prev;
      });
      return;
    }
    if (c === 'npm ls' || c === 'npm list') {
      setTerminalLines(prev => [...prev, 'aurion-project@1.0.0 /project', ...(installedPackages.length > 0 ? installedPackages.map(p => `├── ${p}@latest`) : ['(no packages installed)'])]);
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

    // env command
    if (c === 'env') {
      const keys = Object.entries(integrationKeys);
      if (keys.length === 0) { setTerminalLines(p => [...p, '(no environment variables set — connect integrations to add API keys)']); return; }
      setTerminalLines(prev => [...prev, ...keys.map(([name, key]) => `${name.toUpperCase().replace(/\s+/g, '_')}_KEY=${key.slice(0, 4)}${'*'.repeat(Math.max(0, key.length - 4))}`)]);
      return;
    }

    // node -e: execute JS via server
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
    // node <file>: execute a VFS file via server
    if (c.startsWith('node ') && !c.startsWith('node -')) {
      const file = raw.slice(5).trim();
      const currentFiles = projectFiles;
      const f = currentFiles[file];
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
    // npm info: fetch real package metadata from npm registry
    if (c.startsWith('npm info ') || c.startsWith('npm view ')) {
      const pkg = raw.replace(/^npm\s+(info|view)\s+/, '').trim();
      if (!pkg) { setTerminalLines(p => [...p, 'Usage: npm info <package>']); return; }
      setTerminalLines(p => [...p, `fetching ${pkg}...`]);
      fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`)
        .then(r => { if (!r.ok) throw new Error('Package not found'); return r.json(); })
        .then((data: Record<string, unknown>) => {
          setTerminalLines(p => [...p,
            `${data.name}@${data.version}`,
            `description: ${data.description || '(none)'}`,
            `license: ${data.license || 'N/A'}`,
            `homepage: ${(data.homepage as string) || 'N/A'}`,
          ]);
        })
        .catch(err => setTerminalLines(p => [...p, `npm ERR! ${err instanceof Error ? err.message : 'fetch failed'}`]));
      return;
    }

    // which command
    if (c.startsWith('which ')) {
      const bin = raw.slice(6).trim();
      const available = ['node', 'npm', 'git', 'ls', 'cat', 'tree', 'echo', 'pwd', 'date', 'touch', 'rm', 'cp', 'mv', 'mkdir', 'grep', 'find', 'head', 'tail', 'wc', 'clear', 'env', 'whoami'];
      if (available.includes(bin)) setTerminalLines(prev => [...prev, `/usr/bin/${bin}`]);
      else setTerminalLines(prev => [...prev, `${bin} not found`]);
      return;
    }

    // uptime / hostname
    if (c === 'uptime') { setTerminalLines(prev => [...prev, `up ${Math.floor(Math.random() * 30 + 1)} days, load average: 0.${Math.floor(Math.random() * 99)}`]); return; }
    if (c === 'hostname') { setTerminalLines(prev => [...prev, 'aurion-cloud']); return; }

    // history command
    if (c === 'history') {
      setTerminalLines(prev => [...prev, ...terminalHistory.map((h, i) => `  ${i + 1}  ${h}`)]);
      return;
    }

    // stat command — show file details
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

    // diff command — compare two files
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

    // du command — disk usage
    if (c === 'du' || c === 'du .') {
      setProjectFiles(prev => {
        const total = Object.values(prev).reduce((s, f) => s + f.content.length, 0);
        setTerminalLines(p => [...p, `${(total / 1024).toFixed(1)}K\t.`, `${Object.keys(prev).length} file(s), ${total} bytes total`]);
        return prev;
      });
      return;
    }

    // sort command
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

    // uniq command
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

    // ═══ v24: Backend Generator commands ═══
    if (c === 'backend' || c === 'backend help') {
      setTerminalLines(prev => [...prev,
        '🖥️ Backend Generator Commands:',
        '  backend generate <preset>  — Generate backend from preset (saas-starter, blog-platform, ecommerce, api-only, realtime-app)',
        '  backend presets            — List all presets',
        '  backend files              — Show generated backend files',
        '  backend panel              — Open backend generator panel',
      ]);
      return;
    }
    if (c === 'backend presets') {
      setTerminalLines(prev => [...prev,
        '📦 Available backend presets:',
        ...Object.entries(BackendGenerator.presets).map(([k, v]) => `  ${k.padEnd(18)} → ${v.framework} + ${v.database} + ${v.features.length} features`),
      ]);
      return;
    }
    if (c.startsWith('backend generate ')) {
      const preset = raw.slice(17).trim();
      const config = BackendGenerator.presets[preset];
      if (!config) {
        setTerminalLines(prev => [...prev, `✗ Unknown preset: ${preset}. Run 'backend presets' to see options.`]);
        return;
      }
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
      setTerminalLines(prev => [...prev, `✅ Generated ${files.length} backend files (${preset}):`, ...files.map(f => `  + ${f.path}`)]);
      return;
    }
    if (c === 'backend panel') {
      setShowBackendGenerator(true);
      setTerminalLines(prev => [...prev, '📦 Backend generator panel opened']);
      return;
    }

    // ═══ v24: Database commands ═══
    if (c === 'sql' || c === 'db') {
      setActiveTab('database');
      setDbViewMode('query');
      setTerminalLines(prev => [...prev, '📊 Switched to database tab']);
      return;
    }
    if (c.startsWith('sql ')) {
      const query = raw.slice(4).trim();
      if (dbActiveConnection) {
        setDbSqlInput(query);
        setActiveTab('database');
        setDbViewMode('query');
        setTerminalLines(prev => [...prev, '📊 SQL loaded in editor. Press Execute to run.']);
      } else {
        setTerminalLines(prev => [...prev, '✗ No database connected. Use the Database tab to connect first.']);
      }
      return;
    }

    setTerminalLines(prev => [...prev, `${cmd.split(' ')[0]}: command not found. Type 'help' for available commands.`]);
  }, [installedPackages, gitStaged, gitCommits, integrationKeys, projectFiles, webContainer]);

  const saveIntegrationKey = useCallback((name: string, key: string) => {
    setIntegrationKeys(prev => ({ ...prev, [name]: key }));
    setEditingIntegration(null);
    setTerminalLines(prev => [...prev, '$ Connected: ' + name]);
  }, []);

  // Test integration — calls the real API route for a connected integration
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const INTEGRATION_ROUTE_MAP: Record<string, string> = {
    'OpenAI': '/api/openai', 'Resend': '/api/resend', 'SendGrid': '/api/sendgrid',
    'Twilio': '/api/twilio', 'Upstash': '/api/upstash', 'Neon': '/api/neon',
    'Slack': '/api/slack', 'Discord': '/api/discord', 'Lemon Squeezy': '/api/lemonsqueezy',
    'Contentful': '/api/contentful', 'Algolia': '/api/algolia', 'Klaviyo': '/api/klaviyo',
    'Sanity': '/api/sanity', 'Stripe': '/api/stripe', 'Supabase': '/api/supabase',
  };

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

      // Build test payloads per integration
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
  }, [integrationKeys, supabaseUrl]);

  // Send real email via connected route
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

  // Send real message via connected route
  const sendRealMessage = useCallback(async (platform: string, channel: string, text: string) => {
    const key = integrationKeys[platform];
    if (!key) return false;

    try {
      let route = '', payload: Record<string, unknown> = {};
      if (platform === 'Slack') {
        route = '/api/slack';
        payload = { token: key, action: 'send', channel, text };
      } else if (platform === 'Discord') {
        route = '/api/discord';
        payload = { token: key, action: 'send', channelId: channel, content: text };
      } else if (platform === 'Twilio') {
        route = '/api/twilio';
        const parts = key.split(':');
        payload = { accountSid: parts[0], authToken: parts[1] || '', from: parts[2] || '', to: channel, body: text };
      }
      if (!route) return false;
      const res = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return res.ok;
    } catch { return false; }
  }, [integrationKeys]);

  // ── Real GitHub Push ──
  const pushToGitHub = useCallback(async () => {
    if (!githubToken.trim() || !repoName.trim()) return;
    if (Object.keys(projectFiles).length === 0) {
      setTerminalLines(prev => [...prev, '$ Error: No files in project to push']);
      return;
    }
    setIsGitHubPushing(true);
    setShowGitHubModal(false);
    setShowTerminal(true);
    setTerminalLines(prev => [...prev, `$ Pushing ${Object.keys(projectFiles).length} files to github.com/${repoName}...`]);
    try {
      const filesMap: Record<string, string> = {};
      for (const [path, file] of Object.entries(projectFiles)) {
        filesMap[path] = file.content;
      }
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
  }, [githubToken, repoName, projectFiles]);

  // ── Share Project via URL ──
  const shareProjectUrl = useCallback(async () => {
    const files = projectFiles;
    if (Object.keys(files).length === 0) return;
    try {
      const json = JSON.stringify(files);
      const encoder = new TextEncoder();
      const data = encoder.encode(json);
      // Compress with CompressionStream
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(data);
      writer.close();
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const compressed = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
      let offset = 0;
      for (const c of chunks) { compressed.set(c, offset); offset += c.length; }
      // Convert to base64url
      let b64 = '';
      for (let i = 0; i < compressed.length; i++) b64 += String.fromCharCode(compressed[i]);
      const hash = btoa(b64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const shareUrl = `${window.location.origin}${window.location.pathname}#project=${hash}`;
      await navigator.clipboard.writeText(shareUrl);
      setTerminalLines(prev => [...prev, '$ ✓ Share URL copied to clipboard']);
      showToast('Share URL copied to clipboard', 'success');
    } catch {
      // Fallback: copy uncompressed base64
      try {
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(files))));
        const shareUrl = `${window.location.origin}${window.location.pathname}#project=${b64}`;
        await navigator.clipboard.writeText(shareUrl);
        setTerminalLines(prev => [...prev, '$ ✓ Share URL copied (uncompressed)']);
      } catch {
        setTerminalLines(prev => [...prev, '$ ✗ Failed to generate share URL']);
      }
    }
  }, [projectFiles]);

  // Import project from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#project=')) return;
    const encoded = hash.slice(9);
    try {
      // Try decompressing first
      const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const result = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
        let off = 0;
        for (const c of chunks) { result.set(c, off); off += c.length; }
        const json = new TextDecoder().decode(result);
        const files = JSON.parse(json) as VirtualFS;
        if (files && typeof files === 'object' && Object.keys(files).length > 0) {
          setProjectFiles(files);
          setSelectedFile(Object.keys(files)[0]);
          setView('workspace');
          setTerminalLines(prev => [...prev, `$ ✓ Imported shared project (${Object.keys(files).length} files)`]);
          window.location.hash = '';
        }
      })();
    } catch {
      // Fallback: try uncompressed base64
      try {
        const json = decodeURIComponent(escape(atob(encoded)));
        const files = JSON.parse(json) as VirtualFS;
        if (files && typeof files === 'object' && Object.keys(files).length > 0) {
          setProjectFiles(files);
          setSelectedFile(Object.keys(files)[0]);
          setView('workspace');
          setTerminalLines(prev => [...prev, `$ ✓ Imported shared project (${Object.keys(files).length} files)`]);
          window.location.hash = '';
        }
      } catch { /* invalid hash, ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Download ZIP ──
  const downloadProjectZip = useCallback(() => {
    const files = projectFiles;
    const fileEntries = Object.entries(files);
    if (fileEntries.length === 0) return;

    // Build a simple ZIP file in memory (no external library)
    // Using the minimal ZIP format spec
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;

    for (const [name, file] of fileEntries) {
      const nameBytes = encoder.encode(name);
      const contentBytes = encoder.encode(file.content);

      // Local file header
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lView = new DataView(localHeader.buffer);
      lView.setUint32(0, 0x04034b50, true); // signature
      lView.setUint16(4, 20, true); // version needed
      lView.setUint16(6, 0, true); // flags
      lView.setUint16(8, 0, true); // compression: stored
      lView.setUint16(10, 0, true); // mod time
      lView.setUint16(12, 0, true); // mod date
      lView.setUint32(14, 0, true); // crc32 (0 for simplicity — most unzippers handle it)
      lView.setUint32(18, contentBytes.length, true); // compressed size
      lView.setUint32(22, contentBytes.length, true); // uncompressed size
      lView.setUint16(26, nameBytes.length, true); // file name length
      lView.setUint16(28, 0, true); // extra field length
      localHeader.set(nameBytes, 30);

      // Central directory entry
      const cdEntry = new Uint8Array(46 + nameBytes.length);
      const cView = new DataView(cdEntry.buffer);
      cView.setUint32(0, 0x02014b50, true);
      cView.setUint16(4, 20, true); // version made by
      cView.setUint16(6, 20, true); // version needed
      cView.setUint16(8, 0, true); // flags
      cView.setUint16(10, 0, true); // compression
      cView.setUint16(12, 0, true); // mod time
      cView.setUint16(14, 0, true); // mod date
      cView.setUint32(16, 0, true); // crc32
      cView.setUint32(20, contentBytes.length, true);
      cView.setUint32(24, contentBytes.length, true);
      cView.setUint16(28, nameBytes.length, true);
      cView.setUint16(30, 0, true); // extra field length
      cView.setUint16(32, 0, true); // file comment length
      cView.setUint16(34, 0, true); // disk number start
      cView.setUint16(36, 0, true); // internal file attributes
      cView.setUint32(38, 0, true); // external file attributes
      cView.setUint32(42, offset, true); // relative offset of local header
      cdEntry.set(nameBytes, 46);

      parts.push(localHeader, contentBytes);
      centralDir.push(cdEntry);
      offset += localHeader.length + contentBytes.length;
    }

    // End of central directory
    let cdSize = 0;
    for (const c of centralDir) cdSize += c.length;
    const eocd = new Uint8Array(22);
    const eView = new DataView(eocd.buffer);
    eView.setUint32(0, 0x06054b50, true);
    eView.setUint16(4, 0, true);
    eView.setUint16(6, 0, true);
    eView.setUint16(8, fileEntries.length, true);
    eView.setUint16(10, fileEntries.length, true);
    eView.setUint32(12, cdSize, true);
    eView.setUint32(16, offset, true);
    eView.setUint16(20, 0, true);

    const blob = new Blob([...parts, ...centralDir, eocd].map(b => b.buffer as ArrayBuffer), { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurion-project.zip';
    a.click();
    URL.revokeObjectURL(url);
    setTerminalLines(prev => [...prev, `$ ✓ Downloaded ${fileEntries.length} files as aurion-project.zip`]);
    showToast(`Downloaded ${fileEntries.length} files as ZIP`, 'success');
  }, [projectFiles]);

  // ── Real Supabase Query ──
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
  }, [integrationKeys, supabaseUrl, supabaseTable]);

  // ── Real Stripe Fetch ──
  const fetchStripeData = useCallback(async () => {
    const key = integrationKeys['Stripe'];
    if (!key) return;
    setIsStripeLoading(true);
    setStripeError(null);
    try {
      const [balResp, prodResp] = await Promise.all([
        fetch('/api/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripeKey: key, endpoint: 'balance', method: 'GET' }),
        }),
        fetch('/api/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripeKey: key, endpoint: 'products', method: 'GET' }),
        }),
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
  }, [integrationKeys]);

  // Quick Component Palette — insertable UI snippets
  const COMPONENTS = useMemo(() => [
    { name: 'Button', cat: 'Basic', code: '<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Click me</button>' },
    { name: 'Card', cat: 'Layout', code: '<div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">\n  <h3 className="text-lg font-semibold mb-2">Card Title</h3>\n  <p className="text-gray-600">Card description goes here.</p>\n</div>' },
    { name: 'Input', cat: 'Form', code: '<input type="text" placeholder="Enter text..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />' },
    { name: 'Badge', cat: 'Basic', code: '<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Badge</span>' },
    { name: 'Avatar', cat: 'Basic', code: '<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">A</div>' },
    { name: 'Alert', cat: 'Feedback', code: '<div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">\n  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>\n  <p className="text-sm text-blue-800">This is an info alert message.</p>\n</div>' },
    { name: 'Modal', cat: 'Overlay', code: '<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">\n  <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">\n    <h2 className="text-xl font-bold mb-2">Modal Title</h2>\n    <p className="text-gray-600 mb-4">Modal description text goes here.</p>\n    <div className="flex justify-end gap-2">\n      <button className="px-4 py-2 rounded-lg border hover:bg-gray-50">Cancel</button>\n      <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Confirm</button>\n    </div>\n  </div>\n</div>' },
    { name: 'Navbar', cat: 'Navigation', code: '<nav className="flex items-center justify-between px-6 py-4 bg-white border-b">\n  <div className="text-xl font-bold">Logo</div>\n  <div className="flex items-center gap-6">\n    <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Home</a>\n    <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>\n    <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>\n    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Sign Up</button>\n  </div>\n</nav>' },
    { name: 'Hero', cat: 'Section', code: '<section className="py-20 px-6 text-center bg-gradient-to-br from-blue-50 to-indigo-100">\n  <h1 className="text-5xl font-bold text-gray-900 mb-4">Build Something Amazing</h1>\n  <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">A brief description of your product or service that explains the value.</p>\n  <div className="flex justify-center gap-4">\n    <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Get Started</button>\n    <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 font-medium">Learn More</button>\n  </div>\n</section>' },
    { name: 'Footer', cat: 'Section', code: '<footer className="bg-gray-900 text-gray-400 py-12 px-6">\n  <div className="max-w-6xl mx-auto grid grid-cols-4 gap-8">\n    <div>\n      <h3 className="text-white font-semibold mb-4">Company</h3>\n      <ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white">About</a></li><li><a href="#" className="hover:text-white">Careers</a></li></ul>\n    </div>\n    <div>\n      <h3 className="text-white font-semibold mb-4">Product</h3>\n      <ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white">Features</a></li><li><a href="#" className="hover:text-white">Pricing</a></li></ul>\n    </div>\n    <div>\n      <h3 className="text-white font-semibold mb-4">Resources</h3>\n      <ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white">Docs</a></li><li><a href="#" className="hover:text-white">Blog</a></li></ul>\n    </div>\n    <div>\n      <h3 className="text-white font-semibold mb-4">Legal</h3>\n      <ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white">Privacy</a></li><li><a href="#" className="hover:text-white">Terms</a></li></ul>\n    </div>\n  </div>\n</footer>' },
    { name: 'Pricing Card', cat: 'Section', code: '<div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-sm">\n  <h3 className="text-lg font-medium text-gray-500">Pro Plan</h3>\n  <div className="mt-4 flex items-baseline gap-1"><span className="text-5xl font-bold">$29</span><span className="text-gray-500">/month</span></div>\n  <ul className="mt-6 space-y-3">\n    <li className="flex items-center gap-2 text-sm"><svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> Unlimited projects</li>\n    <li className="flex items-center gap-2 text-sm"><svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> Priority support</li>\n  </ul>\n  <button className="mt-8 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">Get Started</button>\n</div>' },
    { name: 'Table', cat: 'Data', code: '<div className="overflow-hidden rounded-lg border border-gray-200">\n  <table className="min-w-full divide-y divide-gray-200">\n    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th></tr></thead>\n    <tbody className="bg-white divide-y divide-gray-200">\n      <tr><td className="px-6 py-4 text-sm font-medium text-gray-900">John Doe</td><td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span></td><td className="px-6 py-4 text-sm text-gray-500">Admin</td></tr>\n      <tr><td className="px-6 py-4 text-sm font-medium text-gray-900">Jane Smith</td><td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span></td><td className="px-6 py-4 text-sm text-gray-500">User</td></tr>\n    </tbody>\n  </table>\n</div>' },
    { name: 'Toggle', cat: 'Form', code: '<label className="relative inline-flex items-center cursor-pointer">\n  <input type="checkbox" className="sr-only peer" />\n  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>\n  <span className="ml-3 text-sm font-medium text-gray-700">Toggle</span>\n</label>' },
    { name: 'Loading Spinner', cat: 'Feedback', code: '<div className="flex items-center justify-center">\n  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>\n</div>' },
  ], []);

  // Format code — simple indent fix
  const formatCurrentFile = useCallback(() => {
    if (!selectedFile || !projectFiles[selectedFile]) return;
    const content = projectFiles[selectedFile].content;
    const lang = projectFiles[selectedFile].language;
    let formatted = content;
    if (lang === 'html' || lang === 'xml') {
      // Simple HTML formatter — fix indentation
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
      setTerminalLines(prev => [...prev, `$ \u2713 Formatted ${selectedFile}`]);
    }
  }, [selectedFile, projectFiles]);

  const insertComponent = useCallback((code: string) => {
    if (!selectedFile || !projectFiles[selectedFile]) return;
    const content = projectFiles[selectedFile].content;
    // Insert before closing </body> or </div> or at the end
    const bodyClose = content.lastIndexOf('</body>');
    const insertPos = bodyClose > 0 ? bodyClose : content.length;
    const newContent = content.slice(0, insertPos) + '\n' + code + '\n' + content.slice(insertPos);
    setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: newContent } }));
    setShowComponentPalette(false);
    setTerminalLines(prev => [...prev, `$ \u2713 Component inserted into ${selectedFile}`]);
  }, [selectedFile, projectFiles]);

  // Command palette commands
  const commands = useMemo(() => {
    const list = [
      // File operations
      { id: 'new-file', label: 'New File', shortcut: '', category: 'File', action: () => { const name = prompt('File name:'); if (name) { setProjectFiles(prev => ({ ...prev, [name]: { content: '', language: detectLanguage(name) } })); setSelectedFile(name); setActiveTab('code'); } } },
      { id: 'rename-file', label: 'Rename Current File', shortcut: '', category: 'File', action: () => { if (!selectedFile) return; const name = prompt('New name:', selectedFile); if (name && name !== selectedFile) { setProjectFiles(prev => { const next = { ...prev }; next[name] = { ...next[selectedFile], language: detectLanguage(name) }; delete next[selectedFile]; return next; }); setSelectedFile(name); } } },
      { id: 'delete-file', label: 'Delete Current File', shortcut: '', category: 'File', action: () => { if (!selectedFile) return; const files = Object.keys(projectFiles); if (files.length <= 1) return; setProjectFiles(prev => { const next = { ...prev }; delete next[selectedFile]; return next; }); setSelectedFile(files.find(f => f !== selectedFile) || 'index.html'); } },
      { id: 'duplicate-file', label: 'Duplicate Current File', shortcut: '', category: 'File', action: () => { if (!selectedFile || !projectFiles[selectedFile]) return; const ext = selectedFile.lastIndexOf('.'); const newName = ext > 0 ? selectedFile.slice(0, ext) + '-copy' + selectedFile.slice(ext) : selectedFile + '-copy'; setProjectFiles(prev => ({ ...prev, [newName]: { ...prev[selectedFile] } })); setSelectedFile(newName); } },
      { id: 'file-search', label: 'Go to File', shortcut: '⌘P', category: 'File', action: () => { setShowFileSearch(true); setFileSearchQuery(''); } },
      { id: 'content-search', label: 'Search in Files', shortcut: '⌘⇧F', category: 'File', action: () => { setShowContentSearch(true); setContentSearchQuery(''); } },
      // Project
      { id: 'new-project', label: 'New Project', shortcut: '', category: 'Project', action: () => createProject('Project ' + (projects.length + 1)) },
      { id: 'templates', label: 'Start from Template', shortcut: '', category: 'Project', action: () => setShowTemplates(true) },
      { id: 'download', label: 'Download as ZIP', shortcut: '⌘D', category: 'Project', action: () => downloadProjectZip() },
      // View
      { id: 'toggle-terminal', label: showTerminal ? 'Hide Terminal' : 'Show Terminal', shortcut: '⌘`', category: 'View', action: () => setShowTerminal(prev => !prev) },
      { id: 'toggle-chat', label: showChat ? 'Hide Chat' : 'Show Chat', shortcut: '⌘B', category: 'View', action: () => setShowChat(prev => !prev) },
      { id: 'toggle-edit', label: isEditMode ? 'Exit Visual Editor' : 'Visual Editor Mode', shortcut: '⌘E', category: 'View', action: () => setIsEditMode(prev => !prev) },
      { id: 'diff-view', label: showDiffView ? 'Exit Diff View' : 'Show Diff View', shortcut: '', category: 'View', action: () => setShowDiffView(prev => !prev) },
      { id: 'env-panel', label: 'Manage Environment Variables', shortcut: '', category: 'View', action: () => setShowEnvPanel(true) },
      { id: 'integrations', label: 'Toggle Integrations', shortcut: '', category: 'View', action: () => setShowIntegrations(prev => !prev) },
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
      { id: 'github', label: 'Push to GitHub', shortcut: '', category: 'Deploy', action: () => setShowGitHubModal(true) },
      { id: 'clone', label: 'Clone Website', shortcut: '', category: 'Deploy', action: () => setShowCloneModal(true) },
      { id: 'backend-gen', label: 'Generate Backend', shortcut: '', category: 'Deploy', action: () => setShowBackendGenerator(true) },
      { id: 'db-connect', label: 'Database: Connect', shortcut: '', category: 'View', action: () => { setActiveTab('database'); setDbViewMode('query'); } },
      { id: 'db-schema', label: 'Database: Browse Schema', shortcut: '', category: 'View', action: () => { setActiveTab('database'); setDbViewMode('schema'); } },
      // Edit
      { id: 'undo', label: 'Undo (VFS)', shortcut: '⌘Z', category: 'Edit', action: () => vfsUndo() },
      { id: 'redo', label: 'Redo (VFS)', shortcut: '⌘⇧Z', category: 'Edit', action: () => vfsRedo() },
      { id: 'clear-chat', label: 'Clear Chat', shortcut: '', category: 'Edit', action: () => clearChat() },
      { id: 'media-gallery', label: 'Media Gallery', shortcut: '', category: 'View', action: () => setShowMediaGallery(true) },
      // Format & Components
      { id: 'format', label: 'Format Document', shortcut: '⌘⇧P', category: 'Edit', action: () => formatCurrentFile() },
      { id: 'components', label: 'Insert Component', shortcut: '', category: 'Edit', action: () => setShowComponentPalette(true) },
      { id: 'split-view', label: splitFile ? 'Close Split View' : 'Split Editor', shortcut: '', category: 'View', action: () => { if (splitFile) { setSplitFile(null); } else { const files = Object.keys(projectFiles).filter(f => f !== selectedFile); if (files.length > 0) setSplitFile(files[0]); } } },
      { id: 'open-new-tab', label: 'Open Preview in New Tab', shortcut: '', category: 'View', action: () => openPreviewNewTab() },
      { id: 'copy-html', label: 'Copy Preview HTML', shortcut: '', category: 'Edit', action: () => copyPreviewHtml() },
      { id: 'zoom-reset', label: 'Reset Preview Zoom', shortcut: '', category: 'View', action: () => setPreviewZoom(100) },
      { id: 'landscape', label: isLandscape ? 'Portrait Mode' : 'Landscape Mode', shortcut: '', category: 'View', action: () => setIsLandscape(prev => !prev) },
      // History & Bookmarks
      { id: 'conversation-history', label: 'Conversation History', shortcut: '⌘H', category: 'Chat', action: () => setShowConversationHistory(true) },
      { id: 'new-conversation', label: 'New Conversation', shortcut: '', category: 'Chat', action: () => newConversation() },
      { id: 'save-conversation', label: 'Save Conversation', shortcut: '', category: 'Chat', action: () => saveCurrentConversation() },
      { id: 'bookmarks', label: 'Code Bookmarks', shortcut: '', category: 'Edit', action: () => setShowBookmarks(true) },
      { id: 'add-bookmark', label: 'Bookmark Selection', shortcut: '', category: 'Edit', action: () => { if (selectedFile && projectFiles[selectedFile]) addBookmark(selectedFile, projectFiles[selectedFile].content.slice(0, 500)); } },
      { id: 'prompt-templates', label: 'Prompt Templates', shortcut: '', category: 'Chat', action: () => setShowPromptTemplates(true) },
      { id: 'version-timeline', label: 'Version Timeline', shortcut: '', category: 'View', action: () => setShowVersionTimeline(true) },
      // Find & Replace, Shortcuts, Themes
      { id: 'find-replace', label: 'Find & Replace in Files', shortcut: '⌘⇧H', category: 'Edit', action: () => { setShowFindReplace(true); setTimeout(() => findInputRef.current?.focus(), 50); } },
      { id: 'shortcuts', label: 'Keyboard Shortcuts', shortcut: '⌘/', category: 'Help', action: () => setShowShortcuts(true) },
      { id: 'theme', label: 'Change Editor Theme', shortcut: '', category: 'View', action: () => setShowThemeSelector(true) },
      { id: 'explain-code', label: 'AI Explain Current File', shortcut: '', category: 'Chat', action: () => explainCurrentCode() },
      { id: 'screenshot', label: 'Screenshot Preview', shortcut: '', category: 'View', action: () => capturePreviewScreenshot() },
      { id: 'new-file-quick', label: 'Quick New File', shortcut: '', category: 'File', action: () => { setShowNewFileInput(true); setNewFileName(''); setTimeout(() => newFileInputRef.current?.focus(), 50); } },
      { id: 'share-url', label: 'Share Project via URL', shortcut: '', category: 'Project', action: () => shareProjectUrl() },
      { id: 'toggle-minimap', label: minimapEnabled ? 'Hide Minimap' : 'Show Minimap', shortcut: '', category: 'View', action: () => setMinimapEnabled(p => !p) },
      { id: 'toggle-wordwrap', label: wordWrapEnabled ? 'Disable Word Wrap' : 'Enable Word Wrap', shortcut: '', category: 'View', action: () => setWordWrapEnabled(p => !p) },
      { id: 'color-picker', label: 'Color Picker', shortcut: '', category: 'Edit', action: () => setShowColorPicker(true) },
      { id: 'goto-line', label: 'Go to Line', shortcut: '⌘G', category: 'Edit', action: () => { setShowGotoLine(true); setGotoLineValue(''); setTimeout(() => gotoLineRef.current?.focus(), 50); } },
      // Emmet Snippets
      { id: 'emmet-html5', label: 'Emmet: HTML5 Boilerplate', shortcut: '', category: 'Snippets', action: () => { if (selectedFile) setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>' } })); showToast('Inserted HTML5 boilerplate', 'success'); } },
      { id: 'emmet-flexbox', label: 'Emmet: Flexbox Container', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<div class="flex items-center justify-center gap-4">\n  <div>Item 1</div>\n  <div>Item 2</div>\n  <div>Item 3</div>\n</div>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted flexbox container', 'success'); } } },
      { id: 'emmet-grid', label: 'Emmet: CSS Grid', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<div class="grid grid-cols-3 gap-4">\n  <div>Cell 1</div>\n  <div>Cell 2</div>\n  <div>Cell 3</div>\n  <div>Cell 4</div>\n  <div>Cell 5</div>\n  <div>Cell 6</div>\n</div>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted CSS grid', 'success'); } } },
      { id: 'emmet-form', label: 'Emmet: Form with Inputs', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<form class="space-y-4 max-w-md mx-auto">\n  <div>\n    <label class="block text-sm font-medium mb-1">Name</label>\n    <input type="text" class="w-full px-3 py-2 border rounded-lg" placeholder="Your name" />\n  </div>\n  <div>\n    <label class="block text-sm font-medium mb-1">Email</label>\n    <input type="email" class="w-full px-3 py-2 border rounded-lg" placeholder="your@email.com" />\n  </div>\n  <button type="submit" class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Submit</button>\n</form>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted form', 'success'); } } },
      { id: 'emmet-nav', label: 'Emmet: Navigation Bar', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<nav class="flex items-center justify-between px-6 py-4 bg-white shadow-sm">\n  <a href="#" class="text-xl font-bold">Logo</a>\n  <div class="flex items-center gap-6">\n    <a href="#" class="text-gray-600 hover:text-black">Home</a>\n    <a href="#" class="text-gray-600 hover:text-black">About</a>\n    <a href="#" class="text-gray-600 hover:text-black">Contact</a>\n    <button class="px-4 py-2 bg-black text-white rounded-lg">Sign up</button>\n  </div>\n</nav>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted navbar', 'success'); } } },
      { id: 'emmet-card', label: 'Emmet: Card Component', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<div class="bg-white rounded-xl shadow-lg overflow-hidden max-w-sm">\n  <div class="h-48 bg-gray-200"></div>\n  <div class="p-6">\n    <h3 class="text-lg font-semibold mb-2">Card Title</h3>\n    <p class="text-gray-600 text-sm">Card description goes here with some sample text.</p>\n    <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Learn More</button>\n  </div>\n</div>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted card', 'success'); } } },
      { id: 'emmet-hero', label: 'Emmet: Hero Section', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<section class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 text-white">\n  <div class="text-center max-w-2xl px-4">\n    <h1 class="text-5xl font-bold mb-6">Welcome to Our Site</h1>\n    <p class="text-xl opacity-90 mb-8">Build something amazing with modern web technologies.</p>\n    <div class="flex gap-4 justify-center">\n      <button class="px-8 py-3 bg-white text-blue-600 rounded-full font-medium hover:shadow-lg">Get Started</button>\n      <button class="px-8 py-3 border-2 border-white rounded-full font-medium hover:bg-white/10">Learn More</button>\n    </div>\n  </div>\n</section>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted hero section', 'success'); } } },
      { id: 'emmet-footer', label: 'Emmet: Footer', shortcut: '', category: 'Snippets', action: () => { if (selectedFile && projectFiles[selectedFile]) { const snippet = '<footer class="bg-gray-900 text-gray-400 py-12 px-6">\n  <div class="max-w-6xl mx-auto grid grid-cols-4 gap-8">\n    <div><h3 class="text-white font-semibold mb-4">Company</h3><p class="text-sm">Making the web better, one pixel at a time.</p></div>\n    <div><h3 class="text-white font-semibold mb-4">Links</h3><ul class="space-y-2 text-sm"><li><a href="#" class="hover:text-white">Home</a></li><li><a href="#" class="hover:text-white">About</a></li><li><a href="#" class="hover:text-white">Blog</a></li></ul></div>\n    <div><h3 class="text-white font-semibold mb-4">Support</h3><ul class="space-y-2 text-sm"><li><a href="#" class="hover:text-white">FAQ</a></li><li><a href="#" class="hover:text-white">Contact</a></li></ul></div>\n    <div><h3 class="text-white font-semibold mb-4">Social</h3><ul class="space-y-2 text-sm"><li><a href="#" class="hover:text-white">Twitter</a></li><li><a href="#" class="hover:text-white">GitHub</a></li></ul></div>\n  </div>\n  <div class="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-sm text-center">© 2026 Company. All rights reserved.</div>\n</footer>'; setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + snippet } })); showToast('Inserted footer', 'success'); } } },
      { id: 'breakpoint-ruler', label: 'Toggle Breakpoint Ruler', shortcut: '', category: 'View', action: () => setShowBreakpointRuler(p => !p) },
      { id: 'a11y-audit', label: 'Run Accessibility Audit', shortcut: '', category: 'Tools', action: () => runA11yAudit() },
      { id: 'seo-editor', label: 'Open SEO Meta Editor', shortcut: '', category: 'Tools', action: () => { const html = projectFiles['index.html']?.content || ''; const tMatch = html.match(/<title>([^<]*)<\/title>/i); const dMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i); const oMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i); setSeoTitle(tMatch?.[1] || ''); setSeoDescription(dMatch?.[1] || ''); setSeoOgImage(oMatch?.[1] || ''); setShowSeoPanel(true); } },
      { id: 'tailwind-browser', label: 'Open Tailwind Classes Browser', shortcut: '', category: 'Tools', action: () => setShowTailwindPanel(true) },
      { id: 'color-palette', label: 'Extract Color Palette', shortcut: '', category: 'Tools', action: () => setShowColorPalettePanel(true) },
      { id: 'perf-audit', label: 'Run Performance Audit', shortcut: '', category: 'Tools', action: () => runPerfAudit() },
      { id: 'project-stats', label: 'Show Project Statistics', shortcut: '', category: 'Tools', action: () => setShowStatsPanel(true) },
      { id: 'css-vars', label: 'CSS Variables Manager', shortcut: '', category: 'Tools', action: () => setShowCssVarsPanel(true) },
      { id: 'console-panel', label: 'Toggle Console Output', shortcut: '', category: 'View', action: () => setShowConsolePanel(p => !p) },
      { id: 'insert-region', label: 'Insert Code Region', shortcut: '', category: 'Editor', action: () => { const ed = monacoEditorRef.current as any; if (ed) { const pos = ed.getPosition(); if (pos) { const model = ed.getModel(); if (model) { const indent = '  '; model.pushEditOperations([], [{ range: { startLineNumber: pos.lineNumber, startColumn: 1, endLineNumber: pos.lineNumber, endColumn: 1 }, text: `${indent}// #region MyRegion\n${indent}\n${indent}// #endregion\n` }], () => null); } } showToast('Region markers inserted', 'success'); } } },
      { id: 'dep-inspector', label: 'Dependency Inspector', shortcut: '', category: 'Tools', action: () => setShowDepsPanel(true) },
      { id: 'code-complexity', label: 'Code Complexity Analyzer', shortcut: '', category: 'Tools', action: () => setShowComplexityPanel(true) },
      { id: 'minify-project', label: 'Minify All Files', shortcut: '', category: 'Tools', action: () => minifyProject() },
      { id: 'split-preview', label: 'Toggle Split Preview (Desktop + Mobile)', shortcut: '', category: 'View', action: () => setShowSplitPreview(p => !p) },
      { id: 'wrap-div', label: 'Wrap Selection in <div>', shortcut: '', category: 'Editor', action: () => { const ed = monacoEditorRef.current as any; if (ed) { const sel = ed.getSelection(); const model = ed.getModel(); if (sel && model) { const text = model.getValueInRange(sel); model.pushEditOperations([], [{ range: sel, text: `<div>\n  ${text}\n</div>` }], () => null); showToast('Wrapped in <div>', 'success'); } } } },
      { id: 'toggle-comments', label: 'Toggle HTML Comment', shortcut: '', category: 'Editor', action: () => { const ed = monacoEditorRef.current as any; if (ed) { const sel = ed.getSelection(); const model = ed.getModel(); if (sel && model) { const text = model.getValueInRange(sel); const newText = text.startsWith('<!--') ? text.replace(/^<!--\s*/, '').replace(/\s*-->$/, '') : `<!-- ${text} -->`; model.pushEditOperations([], [{ range: sel, text: newText }], () => null); showToast('Comment toggled', 'success'); } } } },
      { id: 'code-outline', label: 'Code Outline / Symbols', shortcut: '', category: 'Tools', action: () => setShowOutlinePanel(true) },
      { id: 'image-optimizer', label: 'Image Size Analyzer', shortcut: '', category: 'Tools', action: () => setShowImageOptPanel(true) },
      { id: 'export-single-html', label: 'Export as Single HTML', shortcut: '', category: 'Project', action: () => exportSingleHtml() },
      { id: 'diff-stats', label: 'Code Diff Statistics', shortcut: '', category: 'Tools', action: () => setShowDiffStatsPanel(true) },
      { id: 'breakpoint-test', label: 'Responsive Breakpoint Tester', shortcut: '', category: 'View', action: () => setBreakpointTestActive(p => !p) },
      { id: 'network-panel', label: 'Network / API Calls', shortcut: '', category: 'Tools', action: () => setShowNetworkPanel(true) },
      { id: 'html-validator', label: 'HTML Validator', shortcut: '', category: 'Tools', action: () => setShowHtmlValidatorPanel(true) },
      { id: 'font-inspector', label: 'Font Inspector', shortcut: '', category: 'Tools', action: () => setShowFontPanel(true) },
      { id: 'snippets-manager', label: 'Code Snippets Manager', shortcut: '', category: 'Edit', action: () => setShowSnippetsPanel(true) },
      { id: 'save-snippet', label: 'Save Selection as Snippet', shortcut: '', category: 'Edit', action: () => { const ed = monacoEditorRef.current as any; if (ed) { const sel = ed.getSelection(); const model = ed.getModel(); if (sel && model) { const text = model.getValueInRange(sel); if (text) { const name = prompt('Snippet name:'); if (name) saveSnippet(name, text); } } } } },
      { id: 'layout-debug', label: 'Toggle Layout Debugger', shortcut: '', category: 'View', action: () => setLayoutDebugActive(p => !p) },
      { id: 'preview-dark', label: 'Preview: Force Dark Mode', shortcut: '', category: 'View', action: () => setPreviewDarkMode(p => p === 'dark' ? 'auto' : 'dark') },
      { id: 'preview-light', label: 'Preview: Force Light Mode', shortcut: '', category: 'View', action: () => setPreviewDarkMode(p => p === 'light' ? 'auto' : 'light') },
      { id: 'file-treemap', label: 'File Size Treemap', shortcut: '', category: 'Tools', action: () => setShowTreemapPanel(true) },
      { id: 'unused-css', label: 'Unused CSS Detector', shortcut: '', category: 'Tools', action: () => setShowUnusedCssPanel(true) },
      { id: 'link-checker', label: 'Link Checker', shortcut: '', category: 'Tools', action: () => setShowLinkCheckerPanel(true) },
      { id: 'dom-tree', label: 'DOM Tree Viewer', shortcut: '', category: 'Tools', action: () => setShowDomTreePanel(true) },
      { id: 'meta-editor', label: 'Meta Tag Editor', shortcut: '', category: 'Tools', action: () => setShowMetaEditorPanel(true) },
      { id: 'format-code', label: 'Format / Prettify Code', shortcut: '⇧⌥F', category: 'Edit', action: () => formatCode() },
      { id: 'shortcuts-ref', label: 'Keyboard Shortcuts', shortcut: '', category: 'Help', action: () => setShowShortcutsRef(true) },
      { id: 'grid-flex-debug', label: 'Toggle Grid/Flex Visualizer', shortcut: '', category: 'View', action: () => setGridFlexDebugActive(p => !p) },
      { id: 'toggle-bookmark', label: 'Toggle Line Bookmark', shortcut: '⌘F2', category: 'Edit', action: () => toggleBookmark() },
      { id: 'contrast-checker', label: 'Color Contrast Checker (WCAG)', shortcut: '', category: 'Tools', action: () => setShowContrastPanel(true) },
      { id: 'z-index-map', label: 'Z-Index Map', shortcut: '', category: 'Tools', action: () => setShowZIndexPanel(true) },
      { id: 'todo-scanner', label: 'TODO/FIXME Scanner', shortcut: '', category: 'Tools', action: () => setShowTodoScanPanel(true) },
      { id: 'copy-preview-image', label: 'Copy Preview as Image', shortcut: '', category: 'Project', action: () => copyPreviewAsImage() },
      { id: 'regex-tester', label: 'Regex Tester', shortcut: '', category: 'Tools', action: () => setShowRegexPanel(true) },
      { id: 'css-specificity', label: 'CSS Specificity Calculator', shortcut: '', category: 'Tools', action: () => setShowSpecificityPanel(true) },
      { id: 'lazy-images', label: 'Image Lazy Loading Checker', shortcut: '', category: 'Tools', action: () => setShowLazyImgPanel(true) },
      { id: 'text-stats', label: 'Text Statistics', shortcut: '', category: 'Tools', action: () => setShowTextStatsPanel(true) },
      { id: 'duplicate-code', label: 'Duplicate Code Detector', shortcut: '', category: 'Tools', action: () => setShowDuplicatePanel(true) },
      { id: 'element-counter', label: 'Element Counter', shortcut: '', category: 'Tools', action: () => setShowElementCountPanel(true) },
      { id: 'console-filter', label: 'Console Filter & Export', shortcut: '', category: 'Tools', action: () => setShowConsoleFilter(true) },
      { id: 'color-edit', label: 'Inline Color Picker', shortcut: '', category: 'Tools', action: () => setShowColorEdit(true) },
      { id: 'fold-map', label: 'Code Folding Map', shortcut: '', category: 'Tools', action: () => setShowFoldMap(true) },
      { id: 'dep-graph', label: 'Dependency Graph', shortcut: '', category: 'Tools', action: () => setShowDepGraph(true) },
      { id: 'perf-budget', label: 'Performance Budget', shortcut: '', category: 'Tools', action: () => setShowPerfBudget(true) },
      { id: 'responsive-grid', label: 'Responsive Preview Grid', shortcut: '', category: 'Tools', action: () => setShowResponsiveGrid(true) },
      { id: 'css-animations', label: 'CSS Animation Inspector', shortcut: '', category: 'Tools', action: () => setShowAnimPanel(true) },
      { id: 'event-audit', label: 'Event Listener Audit', shortcut: '', category: 'Tools', action: () => setShowEventAudit(true) },
      { id: 'og-preview', label: 'Open Graph Preview', shortcut: '', category: 'Tools', action: () => setShowOgPreview(true) },
      { id: 'semantic-html', label: 'Semantic HTML Checker', shortcut: '', category: 'Tools', action: () => setShowSemanticPanel(true) },
      { id: 'change-summary', label: 'File Change Summary', shortcut: '', category: 'Tools', action: () => setShowChangeSummary(true) },
      { id: 'whitespace-check', label: 'Whitespace/Indent Checker', shortcut: '', category: 'Tools', action: () => setShowWhitespacePanel(true) },
      { id: 'pwa-checker', label: 'PWA Checker', shortcut: '', category: 'Tools', action: () => setShowPwaPanel(true) },
      { id: 'schema-validator', label: 'Schema.org Validator', shortcut: '', category: 'Tools', action: () => setShowSchemaPanel(true) },
      { id: 'bundle-size', label: 'Bundle Size Estimator', shortcut: '', category: 'Tools', action: () => setShowBundlePanel(true) },
      { id: 'aria-inspector', label: 'ARIA Roles Inspector', shortcut: '', category: 'Tools', action: () => setShowAriaPanel(true) },
      { id: 'security-headers', label: 'Security Headers Check', shortcut: '', category: 'Tools', action: () => setShowSecurityPanel(true) },
      { id: 'export-zip', label: 'Export Project as ZIP', shortcut: '', category: 'Project', action: () => exportProjectZip() },
      // v23: Collaboration & Feedback
      { id: 'collab', label: 'Collaboration Room', shortcut: '', category: 'Collaborate', action: () => setShowCollabPanel(true) },
      { id: 'share-room', label: 'Create & Share Room', shortcut: '', category: 'Collaborate', action: () => { startCollabRoom(); setShowCollabPanel(true); } },
      { id: 'feedback', label: 'Send Feedback', shortcut: '', category: 'Help', action: () => setShowFeedbackPanel(true) },
      { id: 'changelog', label: "What's New (Changelog)", shortcut: '', category: 'Help', action: () => setShowChangelog(true) },
      { id: 'onboarding', label: 'Product Tour', shortcut: '', category: 'Help', action: () => { setOnboardingStep(0); setShowOnboarding(true); } },
      // v24: Advanced Builder Tools
      { id: 'visual-builder', label: 'Visual Drag & Drop Builder', shortcut: '', category: 'Builder', action: () => setShowVisualBuilder(true) },
      { id: 'anim-builder', label: 'Animation Timeline Builder', shortcut: '', category: 'Builder', action: () => setShowAnimBuilder(true) },
      { id: 'design-system', label: 'Design System Manager', shortcut: '', category: 'Design', action: () => setShowDesignSystem(true) },
      { id: 'api-tester', label: 'REST API Tester', shortcut: '', category: 'Developer', action: () => setShowApiTester(true) },
      { id: 'git-panel', label: 'Git Branch Manager', shortcut: '', category: 'Git', action: () => setShowGitPanel(true) },
      { id: 'git-commit', label: 'Git Commit Changes', shortcut: '', category: 'Git', action: () => { setShowGitPanel(true); setGitTab('commits'); } },
      { id: 'git-stash', label: 'Git Stash Changes', shortcut: '', category: 'Git', action: () => gitStashSave() },
      { id: 'screenshot-analyzer', label: 'AI Screenshot to Code', shortcut: '', category: 'AI', action: () => setShowScreenshotAnalyzer(true) },
      // Figma Import
      { id: 'figma-import', label: 'Import from Figma', shortcut: '', category: 'AI', action: () => setShowFigmaPanel(true) },
      // Test Generation & Runner
      { id: 'test-gen', label: 'Generate & Run Tests', shortcut: '', category: 'Testing', action: () => { setShowTestRunner(true); generateAndRunTests(); } },
      { id: 'test-runner', label: 'Open Test Runner', shortcut: '', category: 'Testing', action: () => setShowTestRunner(true) },
      { id: 'run-tests', label: 'Run All Tests in WebContainer', shortcut: '', category: 'Testing', action: () => { setShowTestRunner(true); runTestsInContainer(); } },
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
      { id: 'git-history', label: 'View Git Commit History', shortcut: '', category: 'Git', action: () => { setShowGitPanel(true); setGitTab('commits'); } },
      { id: 'git-branches', label: 'Browse Git Branches', shortcut: '', category: 'Git', action: () => { setShowGitPanel(true); setGitTab('branches'); } },
      { id: 'git-remote', label: 'Git Remote: Repos, PRs & Merge', shortcut: '', category: 'Git', action: () => { setShowGitPanel(true); setGitTab('remote'); } },
      { id: 'git-create-pr', label: 'Create Pull Request', shortcut: '', category: 'Git', action: () => { setShowGitPanel(true); setGitTab('remote'); } },
      // Models
      ...MODELS.map(m => ({ id: `model-${m.id}`, label: `Switch to ${m.name} (${PROVIDER_LABELS[m.provider] || m.provider})`, shortcut: '', category: 'Model', action: () => setModel(m.id) })),
    ];
    if (!commandQuery) return list;
    const q = commandQuery.toLowerCase();
    return list.filter(c => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandQuery, showTerminal, showChat, showDiffView, isEditMode, projects.length, selectedFile]);

  // ── LTX Video Generation (rate-limited) ──
  const pendingVideoRef = useRef(0);
  const generateLTXVideo = useCallback(async (videoId: string, prompt: string) => {
    // Flood protection: only 1 video at a time
    if (pendingVideoRef.current >= 1) {
      setTerminalLines(prev => [...prev, `$ ⏳ Video "${videoId}" skipped (limit reached)`]);
      return;
    }
    pendingVideoRef.current++;
    setTerminalLines(prev => [...prev, `$ 🎬 Generating video "${videoId}"...`]);
    try {
      const res = await fetchWithRetry('/api/ltx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'ltx-2-3-fast',
          duration: 6,
          resolution: '1920x1080',
          fps: 24,
          generate_audio: false,
        }),
        timeout: 300000, // 5 min for video
      }, 0); // No retries — placeholder is returned on failure

      // Check if response is binary video (new streaming format) or JSON (placeholder/legacy)
      const contentType = res.headers.get('content-type') || '';
      let videoUrl: string;
      if (contentType.includes('video/')) {
        // Binary stream: convert to Blob URL (memory-efficient, no base64 bloat)
        const blob = await res.blob();
        videoUrl = URL.createObjectURL(blob);
      } else {
        // JSON format (placeholder or legacy)
        const data = await res.json();
        if (!data.success || !data.video_url) {
          setTerminalLines(prev => [...prev, `$ ✗ Video "${videoId}" failed: ${data.error || 'Unknown error'}`]);
          return;
        }
        videoUrl = data.video_url;
      }

      const placeholder = `__LTX_VIDEO_${videoId}__`;
      setProjectFiles(prev => {
        const updated = { ...prev };
        for (const [path, file] of Object.entries(updated)) {
          if (file.content.includes(placeholder)) {
            updated[path] = {
              ...file,
              content: file.content.replaceAll(placeholder, videoUrl),
            };
          }
        }
        return updated;
      });
      const dur = res.headers.get('x-video-duration') || '6';
      const rez = res.headers.get('x-video-resolution') || '1920x1080';
      setTerminalLines(prev => [...prev, `$ ✓ Video "${videoId}" generated (${dur}s ${rez})`]);
      setMediaAssets(prev => [...prev, { id: videoId, type: 'video', url: videoUrl, prompt, timestamp: Date.now() }]);
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ ✗ Video "${videoId}" error: ${err instanceof Error ? err.message : 'Unknown'}`]);
    } finally {
      pendingVideoRef.current--;
    }
  }, []);

  // ── Image Generation (rate-limited) ──
  const pendingImageRef = useRef(0);
  const MAX_CONCURRENT_IMAGES = 4;
  const generateGeminiImage = useCallback(async (imageId: string, prompt: string) => {
    // Flood protection: skip if too many concurrent requests
    if (pendingImageRef.current >= MAX_CONCURRENT_IMAGES) {
      setTerminalLines(prev => [...prev, `$ ⏳ Image "${imageId}" queued (limit reached)`]);
      return;
    }
    pendingImageRef.current++;
    setTerminalLines(prev => [...prev, `$ 🎨 Generating image "${imageId}"...`]);
    try {
      const res = await fetchWithRetry('/api/deepai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        timeout: 300000,
      }, 0); // No retries — placeholder is returned on failure
      const data = await res.json();
      if (data.success && data.image_url) {
        const placeholder = `__GEMINI_IMAGE_${imageId}__`;
        setProjectFiles(prev => {
          const updated = { ...prev };
          for (const [path, file] of Object.entries(updated)) {
            if (file.content.includes(placeholder)) {
              updated[path] = {
                ...file,
                content: file.content.replaceAll(placeholder, data.image_url),
              };
            }
          }
          return updated;
        });
        setTerminalLines(prev => [...prev, `$ ✓ Image "${imageId}" generated${data.note ? ' (placeholder)' : ''}`]);
        setMediaAssets(prev => [...prev, { id: imageId, type: 'image', url: data.image_url, prompt, timestamp: Date.now() }]);
      } else {
        setTerminalLines(prev => [...prev, `$ ✗ Image "${imageId}" failed: ${data.error || 'Unknown error'}`]);
      }
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ ✗ Image "${imageId}" error: ${err instanceof Error ? err.message : 'Unknown'}`]);
    } finally {
      pendingImageRef.current--;
    }
  }, []);

  // ── AI Action Parser & Executor ──
  // The AI can emit special action blocks that get executed by the frontend
  const executedActionsRef = useRef<Set<string>>(new Set());

  const parseAndExecuteActions = useCallback((content: string) => {
    // Phase 1: Parse closed file tags — <<FILE:path>>...<</FILE>> AND <FILE:path>...</FILE>
    const closedFilePatterns = [
      /<<FILE:([^>]+)>>([\s\S]*?)<<\/FILE>>/g,
      /<FILE:([^>]+)>([\s\S]*?)<\/FILE>/g,
    ];
    for (const fileRegex of closedFilePatterns) {
      let fileMatch;
      while ((fileMatch = fileRegex.exec(content)) !== null) {
        const fileId = 'file_' + fileMatch[0].slice(0, 30) + '_' + fileMatch.index;
        if (executedActionsRef.current.has(fileId)) continue;
        executedActionsRef.current.add(fileId);
        const filePath = fileMatch[1].trim();
        const fileContent = fileMatch[2].trim();
        if (filePath && fileContent) {
          setProjectFiles(prev => ({
            ...prev,
            [filePath]: { content: fileContent, language: detectLanguage(filePath) },
          }));
          setTerminalLines(prev => [...prev, `$ \u2713 ${prev.some?.(l => l.includes(filePath)) ? 'updated' : 'created'} ${filePath}`]);
          if (filePath === 'index.html' || filePath.endsWith('.html')) {
            setActiveTab('app');
          }
          setSelectedFile(filePath);
        }
      }
    }

    // Phase 2: Handle unclosed FILE tags — use content hash to allow updates during streaming
    const unclosedFilePatterns = [
      /<<FILE:([^>]+)>>([\s\S]+?)(?=<<FILE:|$)/g,
      /<FILE:([^>]+)>([\s\S]+?)(?=<FILE:|$)/g,
    ];
    for (const fileRegex of unclosedFilePatterns) {
      let fileMatch;
      while ((fileMatch = fileRegex.exec(content)) !== null) {
        const filePath = fileMatch[1].trim();
        let fileContent = fileMatch[2].trim();
        fileContent = fileContent.replace(/<\/?FILE>/gi, '').replace(/<<\/FILE>>/g, '');
        if (filePath.endsWith('.html')) {
          const htmlEnd = fileContent.search(/<\/html>/i);
          if (htmlEnd !== -1) fileContent = fileContent.slice(0, htmlEnd + 7);
        }
        if (filePath && fileContent && fileContent.length > 50) {
          const fileId = 'unclosed_' + filePath + '_' + fileContent.length;
          if (executedActionsRef.current.has(fileId)) continue;
          executedActionsRef.current.add(fileId);
          setProjectFiles(prev => ({
            ...prev,
            [filePath]: { content: fileContent, language: detectLanguage(filePath) },
          }));
          if (filePath === 'index.html' || filePath.endsWith('.html') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
            setActiveTab('app');
          }
          setSelectedFile(filePath);
        }
      }
    }

    // Phase 3: Parse ```lang code blocks — detect filenames from comments or context
    const codeBlockRegex = /```(html|jsx|tsx|css|js|javascript|typescript)\s*\n([\s\S]*?)```/g;
    let cbMatch;
    while ((cbMatch = codeBlockRegex.exec(content)) !== null) {
      const lang = cbMatch[1];
      const code = cbMatch[2].trim();
      if (code.length < 50) continue;
      const cbId = 'codeblock_' + lang + '_' + cbMatch.index;
      if (executedActionsRef.current.has(cbId)) continue;
      executedActionsRef.current.add(cbId);

      // Determine filename from language
      let fileName: string;
      if (lang === 'html') fileName = 'index.html';
      else if (lang === 'jsx' || lang === 'tsx') fileName = 'App.' + lang;
      else if (lang === 'css') fileName = 'styles.css';
      else if (lang === 'js' || lang === 'javascript') fileName = 'script.js';
      else if (lang === 'typescript') fileName = 'script.ts';
      else fileName = `file.${lang}`;

      setProjectFiles(prev => ({
        ...prev,
        [fileName]: { content: code, language: detectLanguage(fileName) },
      }));
      if (fileName.endsWith('.html') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) {
        setActiveTab('app');
      }
    }

    const actionRegex = /<<(TERMINAL|CONNECT|DEPLOY|TAB|CLONE|SHOW_TERMINAL|SHOW_INTEGRATIONS|LTX_VIDEO|GEMINI_IMAGE|STITCH):?([^>]*)>>/g;
    let match;
    while ((match = actionRegex.exec(content)) !== null) {
      const actionId = match[0] + match.index;
      if (executedActionsRef.current.has(actionId)) continue;
      executedActionsRef.current.add(actionId);

      const [, action, payload] = match;
      switch (action) {
        case 'TERMINAL': {
          const cmd = payload.trim();
          if (cmd) {
            setShowTerminal(true);
            runTerminalCommand(cmd);
          }
          break;
        }
        case 'CONNECT': {
          const [name, key] = payload.split('|').map(s => s.trim());
          if (name && key) {
            setIntegrationKeys(prev => ({ ...prev, [name]: key }));
            setTerminalLines(prev => [...prev, `$ ✓ Integration connected: ${name}`]);
          }
          break;
        }
        case 'DEPLOY': {
          deployToVercel();
          break;
        }
        case 'TAB': {
          const tab = payload.trim().toLowerCase() as 'app' | 'code' | 'database' | 'payments' | 'ide';
          if (['app', 'code', 'database', 'payments', 'ide'].includes(tab)) {
            setActiveTab(tab);
          }
          break;
        }
        case 'CLONE': {
          const url = payload.trim();
          if (url) {
            setCloneUrl(url);
            cloneWebsite(url);
          }
          break;
        }
        case 'SHOW_TERMINAL': {
          setShowTerminal(payload.trim() !== 'false');
          break;
        }
        case 'SHOW_INTEGRATIONS': {
          setShowIntegrations(payload.trim() !== 'false');
          break;
        }
        case 'LTX_VIDEO': {
          const pipeIdx = payload.indexOf('|');
          if (pipeIdx > 0) {
            const videoId = payload.slice(0, pipeIdx).trim();
            const videoPrompt = payload.slice(pipeIdx + 1).trim();
            if (videoId && videoPrompt) {
              generateLTXVideo(videoId, videoPrompt);
            }
          }
          break;
        }
        case 'GEMINI_IMAGE': {
          const pipeIdx = payload.indexOf('|');
          if (pipeIdx > 0) {
            const imgId = payload.slice(0, pipeIdx).trim();
            const imgPrompt = payload.slice(pipeIdx + 1).trim();
            if (imgId && imgPrompt) {
              generateGeminiImage(imgId, imgPrompt);
            }
          }
          break;
        }
        case 'STITCH': {
          const sp = payload.trim();
          if (sp) {
            setStitchPrompt(sp);
            setShowStitchPanel(true);
          } else {
            setShowStitchPanel(true);
          }
          break;
        }
      }
    }
  }, [deployToVercel, cloneWebsite, runTerminalCommand, generateLTXVideo, generateGeminiImage]);

  // Watch for AI actions in streaming messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.content) {
      parseAndExecuteActions(lastMsg.content);
    }
  }, [messages, parseAndExecuteActions]);

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */

  // ─── LANDING PAGE ─────────────────────────
  if (view === 'landing') {
    return (
      <div className="h-screen bg-[#0c0c0c] flex flex-col items-center justify-center relative">

        <div className="w-full max-w-[680px] mx-auto px-6 text-center">
          <h1 className="text-[32px] sm:text-[42px] md:text-[52px] font-bold text-white leading-[1.1] mb-10" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Build any app
          </h1>

          {/* Prompt input — Orchids style */}
          <div className="bg-[#161616] rounded-2xl border border-[#252525] relative">
            <textarea
              ref={landingTextareaRef}
              value={landingInput}
              onChange={(e) => setLandingInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enterWorkspace(landingInput);
                }
              }}
              placeholder="Ask Aurion to build a Slack bot..."
              className="w-full resize-none bg-transparent outline-none text-gray-300 placeholder-[#555] text-[15px] px-5 pt-5 pb-8 min-h-[100px] max-h-[160px]"
              rows={2}
              autoFocus
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-1">
                {/* Model selector in prompt area */}
                <div className="relative" data-model-menu>
                  <button
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                    {selectedModel.name}
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                  </button>
                  <AnimatePresence>
                    {showModelMenu && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }} className="absolute left-0 bottom-10 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1.5 min-w-[220px] shadow-2xl shadow-black/60">
                        {[...new Set(MODELS.map(m => m.provider))].map((provider, pi) => (
                          <div key={provider}>
                            {pi > 0 && <div className="h-px bg-[#222] my-1.5" />}
                            <div className="px-3 py-1 text-[10px] font-medium text-[#555] uppercase tracking-wider">{PROVIDER_LABELS[provider] || provider}</div>
                            {MODELS.filter(m => m.provider === provider).map(m => (
                              <button key={m.id} onClick={() => { setModel(m.id); setShowModelMenu(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] hover:bg-[#222] transition-colors ${m.id === model ? 'text-white' : 'text-[#777]'}`}>
                                {PROVIDER_ICON[m.provider]}
                                <span className="flex-1 text-left">{m.name}</span>
                                {m.id === model && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                              </button>
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Framework selector */}
                <select value={outputFramework} onChange={e => setOutputFramework(e.target.value as typeof outputFramework)} className="px-2 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors border-none outline-none cursor-pointer appearance-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 20 20\' fill=\'%23666\'%3E%3Cpath d=\'M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '18px' }}>
                  <option value="html">HTML</option>
                  <option value="react">React</option>
                  <option value="nextjs">Next.js</option>
                  <option value="vue">Vue</option>
                  <option value="svelte">Svelte</option>
                  <option value="angular">Angular</option>
                  <option value="python">Python</option>
                  <option value="fullstack">Full-Stack</option>
                </select>
                <button onClick={() => setShowCloneModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">
                  <GlobeIcon /> Clone
                </button>
                <button onClick={() => setShowBackendGenerator(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-[11px] text-purple-400 hover:text-purple-300 transition-colors" title="Generate Backend">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                  Backend
                </button>
                <button onClick={() => setLandingInput('Create a CINEMATIC 3D scroll landing page. MANDATORY: preloader animation, aurora gradient hero with split text reveal, horizontal scroll gallery pinned with GSAP ScrollTrigger, 3D parallax image reveals, glassmorphic cards with hover tilt (perspective 1000px rotateX/Y), infinite marquee logos, scroll word-color-reveal section, staggered stats counters, gradient glow CTA, glass footer. Use Lenis smooth scroll, GSAP ScrollTrigger for 5+ animations. Dark theme with glass morphism. 1500+ lines minimum. Topic: ')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-[11px] text-cyan-400 hover:text-cyan-300 transition-all group" title="Mode 3D Cinématique — Génère des sites avec scroll 3D, parallax et animations immersives">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 17l10 6 10-6"/><path d="M2 13l10 6 10-6"/></svg>
                  3D
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input ref={landingFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                <button onClick={() => landingFileInputRef.current?.click()} className="w-8 h-8 rounded-lg hover:bg-[#222] flex items-center justify-center text-[#555] hover:text-white transition-colors" title="Attach image">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <button
                  onClick={() => enterWorkspace(landingInput)}
                  disabled={!landingInput.trim() && attachedImages.length === 0}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                </button>
              </div>
            </div>
            {/* Image previews */}
            {attachedImages.length > 0 && (
              <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
                {attachedImages.map((img, i) => (
                  <div key={i} className="relative shrink-0 group">
                    <img src={img.data} alt={img.name} className="w-16 h-16 rounded-lg object-cover border border-[#333]" />
                    <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#333] text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick suggestion chips */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {['Web', 'Mobile', 'Slack Bot', 'AI Agent', 'Chrome Extension'].map((s) => (
              <button key={s} onClick={() => enterWorkspace(`Build me a ${s.toLowerCase()} app`)} className="px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[13px] text-[#888] hover:text-white hover:border-[#444] transition-colors">{s}</button>
            ))}
          </div>
          <div className="mt-3">
            <button onClick={() => { setView('workspace'); setShowTemplates(true); }} className="px-4 py-2 rounded-full bg-[#1a1a1a] border border-purple-500/20 text-[13px] text-purple-400 hover:text-purple-300 hover:border-purple-500/40 transition-colors">
              Start from Template
            </button>
          </div>
        </div>

        {/* Clone Modal on landing */}
        <AnimatePresence>
          {showCloneModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowCloneModal(false); }}>
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
                <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Clone Website</h2>
                  <button onClick={() => setShowCloneModal(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 focus-within:border-[#444] transition-colors">
                    <LinkIcon />
                    <input type="url" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && cloneUrl.trim()) { setView('workspace'); setShowCloneModal(false); cloneWebsite(cloneUrl.trim()); } }} placeholder="https://example.com" className="flex-1 bg-transparent outline-none text-sm text-gray-300 placeholder-[#555] ml-2" autoFocus />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: 'Stripe', url: 'https://stripe.com' }, { label: 'Linear', url: 'https://linear.app' }, { label: 'Vercel', url: 'https://vercel.com' }].map((ex) => (
                      <button key={ex.label} onClick={() => setCloneUrl(ex.url)} className="px-3 py-2 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111] text-xs text-[#888] hover:text-white transition-colors text-center">{ex.label}</button>
                    ))}
                  </div>
                  <button onClick={() => { setView('workspace'); setShowCloneModal(false); cloneWebsite(cloneUrl.trim()); }} disabled={!cloneUrl.trim()} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">Clone</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── WORKSPACE VIEW ─────────────────────────

  return (
    <div className="h-screen bg-[#0c0c0c] flex relative overflow-hidden select-none workspace-layout">

      {/* ═══ Left: Chat panel (resizable) ═══ */}
      <AnimatePresence initial={false}>
        {showChat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: chatWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ width: chatWidth }}
            className="chat-panel h-full border-r border-[#1e1e1e] flex flex-col bg-[#0f0f0f] shrink-0 overflow-hidden"
          >
            <div style={{ width: chatWidth }} className="h-full flex flex-col">
              {/* Chat header */}
              <div className="h-[44px] border-b border-[#1e1e1e] px-3 flex items-center justify-between shrink-0">
                <span className="text-[13px] font-medium text-white truncate max-w-[50%]">
                  {messages.length > 0 ? (messages[0]?.content?.slice(0, 40) + (messages[0]?.content?.length > 40 ? '...' : '')) : 'New Chat'}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowConversationHistory(true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="History"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg></button>
                  <button onClick={() => setShowPromptTemplates(true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Templates"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
                  <button onClick={newConversation} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="New chat"><PlusIcon /></button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {!hasContent ? (
                  <div className="flex flex-col items-center justify-center h-full px-6">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#161616] border border-[#222] flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">A</span>
                      </div>
                      <h2 className="text-base font-semibold text-white mb-1.5">What do you want to build?</h2>
                      <p className="text-[12px] text-[#555] mb-5">Describe your idea or clone a website.</p>
                      <div className="space-y-1.5 text-left max-w-[260px] mx-auto">
                        {smartSuggestions.map((ex) => (
                          <button key={ex.title} onClick={() => sendPrompt(`Build me a ${ex.desc.toLowerCase()}`)} className="w-full p-2.5 rounded-lg border border-[#222] hover:border-[#444] bg-[#111] hover:bg-[#161616] transition-colors text-left">
                            <p className="text-[12px] text-white">{ex.title}</p>
                            <p className="text-[10px] text-[#555]">{ex.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 px-3 space-y-3">
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className={msg.role === 'user' ? 'flex justify-end' : 'group/msg'}>
                          {msg.role === 'user' ? (
                            <div className="max-w-[90%] px-3 py-2 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-white">
                              <p className="whitespace-pre-wrap text-[13px]">{msg.content}</p>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="prose prose-invert prose-sm max-w-none text-[13px] text-gray-300">
                                {msg.content ? <MarkdownContent content={msg.content} /> : isStreaming ? <TypingIndicator /> : null}
                              </div>
                              {msg.content && !isStreaming && (
                                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                  <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('Response copied', 'success'); }} className="px-1.5 py-0.5 rounded text-[9px] text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Copy response">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                  </button>
                                  {(() => { const codeMatch = msg.content.match(/```\w*\n([\s\S]*?)```/); return codeMatch ? (
                                    <button onClick={() => { const code = codeMatch[1].trim(); if (selectedFile && projectFiles[selectedFile]) { setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + code } })); showToast('Code inserted', 'success'); } }} className="px-1.5 py-0.5 rounded text-[9px] text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Insert code into current file">
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                    </button>
                                  ) : null; })()}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {/* A/B Model Comparison result */}
                    {abMode && (abResultB || abStreaming) && (
                      <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-purple-500/10">
                          <span className="text-[10px] font-medium text-purple-400">Model B: {MODELS.find(m => m.id === abModelB)?.name || abModelB}</span>
                          <div className="flex items-center gap-1.5">
                            {abStreaming && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-2.5 h-2.5 border border-purple-400 border-t-transparent rounded-full" />}
                            {abResultB && !abStreaming && (
                              <button onClick={() => {
                                // Use Model B result: replace the last assistant message with B's output
                                setMessages(prev => {
                                  const last = [...prev].reverse().find(m => m.role === 'assistant');
                                  if (!last) return prev;
                                  return prev.map(m => m.id === last.id ? { ...m, content: abResultB } : m);
                                });
                                setAbResultB('');
                              }} className="px-2 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors">
                                Use this
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="px-3 py-2 max-h-[200px] overflow-y-auto prose prose-invert prose-sm max-w-none text-[12px] text-gray-400">
                          {abResultB ? <MarkdownContent content={abResultB} /> : <TypingIndicator />}
                        </div>
                      </div>
                    )}
                    {error && <div className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-red-400 text-[11px] flex items-start gap-2"><span className="flex-1">{error}</span><button onClick={() => { setError(null); if (messages.length >= 2) { const lastUserMsg = [...messages].reverse().find(m => m.role === 'user'); if (lastUserMsg) sendToAI(lastUserMsg.content); } }} className="shrink-0 text-[10px] underline hover:text-red-300 cursor-pointer">Try again</button></div>}
                    {/* Follow-up suggestion chips */}
                    {followUpSuggestions.length > 0 && !isStreaming && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {followUpSuggestions.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => sendPrompt(chip)}
                            className="px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white hover:border-[#444] hover:bg-[#222] transition-all"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Prompt input — Orchids style */}
              <div className="p-3 shrink-0 relative">
                {/* Streaming stats bar */}
                {isStreaming && streamingChars > 0 && (
                  <div className="flex items-center justify-between px-3 py-1 mb-1 rounded-lg bg-[#111] border border-[#1e1e1e] text-[10px] text-[#555]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full" /> Streaming</span>
                      <span>{streamingChars.toLocaleString()} chars</span>
                      <span>{((Date.now() - streamStartTime.current) / 1000).toFixed(1)}s</span>
                    </div>
                    <span className="text-[#444]">{MODELS.find(m => m.id === model)?.name}</span>
                  </div>
                )}
                <div className="bg-[#161616] rounded-xl border border-[#222] focus-within:border-[#444] transition-colors relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Give Aurion a followup..."
                    className="w-full resize-none bg-transparent outline-none text-gray-300 placeholder-[#555] text-[13px] px-3 pt-3 pb-6 max-h-[140px]"
                    rows={1}
                    disabled={isStreaming}
                  />
                  <div className="flex items-center justify-between px-3 pb-2">
                    <div className="flex items-center gap-1">
                      {/* Model selector */}
                      <div className="relative" data-model-menu>
                        <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#222] hover:bg-[#2a2a2a] text-[10px] text-[#888] hover:text-white transition-colors">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                          {selectedModel.name}
                          <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                        </button>
                        <AnimatePresence>
                          {showModelMenu && (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }} className="absolute left-0 bottom-8 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1.5 min-w-[200px] shadow-2xl shadow-black/60">
                              {[...new Set(MODELS.map(m => m.provider))].map((provider, pi) => (
                                <div key={provider}>
                                  {pi > 0 && <div className="h-px bg-[#222] my-1.5" />}
                                  <div className="px-3 py-1 text-[9px] font-medium text-[#555] uppercase tracking-wider">{PROVIDER_LABELS[provider] || provider}</div>
                                  {MODELS.filter(m => m.provider === provider).map(m => (
                                    <button key={m.id} onClick={() => { setModel(m.id); setShowModelMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${m.id === model ? 'text-white' : 'text-[#777]'}`}>
                                      {PROVIDER_ICON[m.provider]}
                                      <span className="flex-1 text-left">{m.name}</span>
                                      <span className="flex items-center gap-0.5">
                                        {m.tags.map(t => <span key={t} className={`px-1 py-px rounded text-[8px] font-medium border ${TAG_COLORS[t] || 'text-[#555] bg-[#1a1a1a] border-[#333]'}`}>{t}</span>)}
                                      </span>
                                      {m.id === model && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {/* A/B comparison toggle */}
                      <button onClick={() => setAbMode(prev => !prev)} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${abMode ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' : 'bg-[#222] hover:bg-[#2a2a2a] text-[#888] hover:text-white'}`} title="A/B Model Comparison">
                        A/B
                      </button>
                      {abMode && (
                        <select value={abModelB} onChange={e => setAbModelB(e.target.value)} className="bg-[#222] border border-[#333] rounded-md px-1.5 py-0.5 text-[9px] text-[#888] outline-none max-w-[100px]">
                          {MODELS.filter(m => m.id !== model).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      )}
                      {/* Framework selector */}
                      <select value={outputFramework} onChange={e => setOutputFramework(e.target.value as typeof outputFramework)} className="bg-[#222] border border-[#333] rounded-md px-1.5 py-0.5 text-[9px] text-[#888] outline-none cursor-pointer" title="Output framework">
                        <option value="html">HTML</option>
                        <option value="react">React</option>
                        <option value="nextjs">Next.js</option>
                        <option value="vue">Vue</option>
                        <option value="svelte">Svelte</option>
                        <option value="angular">Angular</option>
                        <option value="python">Python</option>
                        <option value="fullstack">Full-Stack</option>
                      </select>
                      {/* 3D Cinematic mode button */}
                      <button onClick={() => setInput('Create a CINEMATIC 3D scroll landing page. MANDATORY: preloader animation, aurora gradient hero with split text reveal, horizontal scroll gallery pinned with GSAP ScrollTrigger, 3D parallax image reveals, glassmorphic cards with hover tilt (perspective 1000px rotateX/Y), infinite marquee logos, scroll word-color-reveal section, staggered stats counters, gradient glow CTA, glass footer. Use Lenis smooth scroll, GSAP ScrollTrigger for 5+ animations. Dark theme with glass morphism. 1500+ lines minimum. Topic: ')} className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-[10px] text-cyan-400 hover:text-cyan-300 transition-all group" title="Mode 3D Cinématique">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M12 3L2 9l10 6 10-6-10-6z"/><path d="M2 17l10 6 10-6"/><path d="M2 13l10 6 10-6"/></svg>
                        3D
                      </button>
                      {/* Research & Claude Code mode indicators */}
                      {researchMode && (
                        <button onClick={() => setShowResearchPanel(true)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400 hover:bg-violet-500/20 transition-all" title="NotebookLM Research Active">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        </button>
                      )}
                      {claudeCodeMode && (
                        <button onClick={() => setShowResearchPanel(true)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 text-[10px] text-orange-400 hover:bg-orange-500/20 transition-all" title="Jarvis Brain Active — Click for Status">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
                          <span className="font-medium">JARVIS</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                      <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded-lg hover:bg-[#222] flex items-center justify-center text-[#555] hover:text-white transition-colors" title="Attach image"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                      {isStreaming ? (
                        <button onClick={stopStream} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center transition-colors" title="Stop"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
                      ) : (
                        <button data-send-btn onClick={sendMessage} disabled={!input.trim() && attachedImages.length === 0} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center transition-all disabled:opacity-20 hover:bg-gray-200" title="Send"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></button>
                      )}
                    </div>
                  </div>
                  {/* Image previews + Screenshot-to-Code action */}
                  {attachedImages.length > 0 && (
                    <div className="px-3 pb-2 space-y-1.5">
                      <div className="flex gap-1.5 overflow-x-auto">
                        {attachedImages.map((img, i) => (
                          <div key={i} className="relative shrink-0 group">
                            <img src={img.data} alt={img.name} className="w-12 h-12 rounded-lg object-cover border border-[#333]" />
                            <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#333] text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">&times;</button>
                          </div>
                        ))}
                      </div>
                      {/* Quick actions for attached images */}
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => { setInput('Reproduce this design exactly as a pixel-perfect responsive HTML/CSS page with all the visual elements, colors, typography, spacing and layout shown in the screenshot'); }} className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 hover:bg-blue-500/20 transition-colors">
                          Screenshot → Code
                        </button>
                        <button onClick={() => { setInput('Analyze this screenshot and describe every UI element, color, font, spacing and layout detail you see'); }} className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 hover:bg-purple-500/20 transition-colors">
                          Analyze Design
                        </button>
                        <button onClick={() => { setInput('Improve this design: make it more modern, add better spacing, smoother gradients, micro-interactions and animations while keeping the same layout'); }} className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 hover:bg-green-500/20 transition-colors">
                          Improve Design
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat resize handle */}
      {showChat && (
        <div
          className="chat-drag-handle w-[4px] h-full cursor-col-resize hover:bg-[#444] active:bg-[#555] transition-colors shrink-0 z-10"
          onMouseDown={() => { chatDragRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
        />
      )}

      {/* ═══ Right: Main panel ═══ */}
      <div id="right-panel" className="right-panel h-full flex-1 flex flex-col bg-[#0c0c0c] min-w-0">

        {/* Top bar */}
        <div className="h-[44px] border-b border-[#1e1e1e] px-3 flex items-center justify-between shrink-0 bg-[#0f0f0f]">
          <div className="flex items-center gap-1">
            {/* Toggle chat sidebar */}
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors mr-1"
              title={showChat ? 'Hide chat' : 'Show chat'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            </button>
            {/* Project switcher */}
            <div className="relative mr-1" data-model-menu>
              <button onClick={() => setShowProjectMenu(!showProjectMenu)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors font-medium max-w-[140px]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <span className="truncate">{projects.find(p => p.id === currentProjectId)?.name || 'Project'}</span>
                <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
              </button>
              <AnimatePresence>
                {showProjectMenu && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }} className="absolute left-0 top-9 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1.5 min-w-[220px] shadow-2xl shadow-black/60">
                    <div className="px-3 py-1 text-[9px] font-medium text-[#555] uppercase tracking-wider">Projects</div>
                    {projects.map(p => (
                      <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors group ${p.id === currentProjectId ? 'text-white' : 'text-[#777]'}`}>
                        {renameProjectId === p.id ? (
                          <input type="text" value={renameProjectName} onChange={(e) => setRenameProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, name: renameProjectName } : pr)); setRenameProjectId(null); } if (e.key === 'Escape') setRenameProjectId(null); }} onBlur={() => { setProjects(prev => prev.map(pr => pr.id === p.id ? { ...pr, name: renameProjectName } : pr)); setRenameProjectId(null); }} autoFocus className="flex-1 bg-[#0c0c0c] border border-[#333] rounded px-1.5 py-0.5 text-[11px] text-white outline-none" />
                        ) : (
                          <button onClick={() => switchProject(p.id)} className="flex-1 text-left truncate">{p.name}</button>
                        )}
                        {p.id === currentProjectId && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>}
                        <button onClick={(e) => { e.stopPropagation(); setRenameProjectId(p.id); setRenameProjectName(p.name); }} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-white transition-all" title="Rename">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        {projects.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-400 transition-all" title="Delete">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>}
                      </div>
                    ))}
                    <div className="h-px bg-[#222] my-1" />
                    <button onClick={() => createProject('Project ' + (projects.length + 1))} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#888] hover:text-white hover:bg-[#222] transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      New Empty Project
                    </button>
                    <button onClick={() => setShowTemplates(true)} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#888] hover:text-white hover:bg-[#222] transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                      From Template...
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="w-px h-4 bg-[#222] mr-1" />
            {/* Tabs */}
            {([
              { id: 'app' as const, label: 'App', icon: <DesktopIcon /> },
              { id: 'code' as const, label: 'Code', icon: <CodeIcon /> },
              { id: 'database' as const, label: 'Database', icon: <DatabaseIcon /> },
              { id: 'payments' as const, label: 'Payments', icon: <PaymentsIcon /> },
              { id: 'ide' as const, label: 'IDE', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-[#888]'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            {activeTab === 'app' && hasPreviewContent && (
              <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-[#222]">
                <button className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white rounded-md hover:bg-[#1a1a1a] transition-colors" onClick={refreshPreview} title="Refresh"><RefreshIcon /></button>
                <button className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white rounded-md hover:bg-[#1a1a1a] transition-colors" onClick={openPreviewNewTab} title="Open in new tab"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>
                <button className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white rounded-md hover:bg-[#1a1a1a] transition-colors" onClick={copyPreviewHtml} title="Copy HTML"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                <button className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white rounded-md hover:bg-[#1a1a1a] transition-colors" onClick={capturePreviewScreenshot} title="Screenshot"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>
                <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'desktop' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => { setDeviceMode('desktop'); setIsLandscape(false); }}><DesktopIcon /></button>
                <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'tablet' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setDeviceMode('tablet')} title="Tablet (810×1080)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg></button>
                <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'mobile' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setDeviceMode('mobile')}><MobileIcon /></button>
                {deviceMode !== 'desktop' && (
                  <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${isLandscape ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setIsLandscape(!isLandscape)} title={isLandscape ? 'Portrait' : 'Landscape'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 21H2V9h21v12h-5.5M7.5 21l3-3m-3 3l3 3"/></svg>
                  </button>
                )}
                <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${isEditMode ? 'text-blue-400 bg-blue-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} onClick={() => setIsEditMode(!isEditMode)} title={isEditMode ? 'Save & Exit Edit Mode' : 'Visual Editor'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button
                  className={`flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-medium transition-colors ${show21stBrowser ? 'text-white bg-indigo-500/20 border border-indigo-500/40' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`}
                  onClick={() => { setShow21stBrowser(v => !v); setTimeout(() => browser21stInputRef.current?.focus(), 50); }}
                  title="21st.dev Component Library"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  21st
                </button>
                {/* Zoom control */}
                <div className="flex items-center gap-1 ml-1 pl-1 border-l border-[#222]">
                  <button onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))} className="w-5 h-5 flex items-center justify-center text-[#555] hover:text-white rounded transition-colors text-[10px] font-bold">−</button>
                  <button onClick={() => setPreviewZoom(100)} className="text-[9px] text-[#666] hover:text-white min-w-[32px] text-center transition-colors">{previewZoom}%</button>
                  <button onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))} className="w-5 h-5 flex items-center justify-center text-[#555] hover:text-white rounded transition-colors text-[10px] font-bold">+</button>
                  <button onClick={() => setShowBreakpointRuler(p => !p)} className={`w-5 h-5 flex items-center justify-center rounded transition-colors text-[10px] ${showBreakpointRuler ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} title="Breakpoint Ruler">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 17V9"/><path d="M11 17V5"/><path d="M15 17v-4"/><path d="M19 17V9"/></svg>
                  </button>
                  {/* ═══ Inspect dropdown ═══ */}
                  <div className="relative">
                    <button onClick={() => { setShowInspectMenu(p => !p); setShowAnalyzeMenu(false); setShowDebugMenu(false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded transition-colors text-[9px] font-medium ${showInspectMenu || showA11yPanel || showSeoPanel || showPerfPanel || showHtmlValidatorPanel || showSecurityPanel || showContrastPanel || showSemanticPanel || showWhitespacePanel || showPwaPanel ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Quality & Audit tools">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      Inspect
                    </button>
                    {showInspectMenu && (<>
                      <div className="fixed inset-0 z-40" onClick={() => setShowInspectMenu(false)} />
                      <div className="absolute left-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[180px] shadow-2xl shadow-black/60">
                        <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Quality & Audit</div>
                        <button onClick={() => { runA11yAudit(); setShowInspectMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showA11yPanel ? 'text-emerald-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="4" r="2"/><path d="M12 6v6"/><path d="M8 22l4-10 4 10"/><path d="M6 14h12"/></svg>
                          Accessibility {showA11yPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </button>
                        <button onClick={() => { const html = projectFiles['index.html']?.content || ''; const tMatch = html.match(/<title>([^<]*)<\/title>/i); const dMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i); const oMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i); setSeoTitle(tMatch?.[1] || ''); setSeoDescription(dMatch?.[1] || ''); setSeoOgImage(oMatch?.[1] || ''); setShowSeoPanel(true); setShowInspectMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showSeoPanel ? 'text-blue-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                          SEO Editor {showSeoPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        </button>
                        <button onClick={() => { runPerfAudit(); setShowInspectMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showPerfPanel ? 'text-amber-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                          Performance {showPerfPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </button>
                        <button onClick={() => { setShowHtmlValidatorPanel(true); setShowInspectMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showHtmlValidatorPanel ? 'text-red-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                          HTML Validator {showHtmlValidatorPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400" />}
                        </button>
                        <button onClick={() => { setShowSecurityPanel(p => !p); setShowInspectMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showSecurityPanel ? 'text-red-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          Security {showSecurityPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400" />}
                        </button>
                        <button onClick={() => { setShowContrastPanel(p => !p); setShowInspectMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showContrastPanel ? 'text-violet-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>
                          Contrast {showContrastPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                        </button>
                        <button onClick={() => { setShowSemanticPanel(p => !p); setShowInspectMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showSemanticPanel ? 'text-amber-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
                          Semantic HTML {showSemanticPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </button>
                        <button onClick={() => { setShowWhitespacePanel(p => !p); setShowInspectMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showWhitespacePanel ? 'text-gray-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H3"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M21 18H3"/></svg>
                          Whitespace {showWhitespacePanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-400" />}
                        </button>
                        <button onClick={() => { setShowPwaPanel(p => !p); setShowInspectMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showPwaPanel ? 'text-blue-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                          PWA Check {showPwaPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                        </button>
                      </div>
                    </>)}
                  </div>

                  {/* ═══ Analyze dropdown ═══ */}
                  <div className="relative">
                    <button onClick={() => { setShowAnalyzeMenu(p => !p); setShowInspectMenu(false); setShowDebugMenu(false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded transition-colors text-[9px] font-medium ${showAnalyzeMenu || showStatsPanel || showDepsPanel || showColorPalettePanel || showDepGraph || showPerfBudget || showBundlePanel || showUnusedCssPanel || showElementCountPanel || showTextStatsPanel || showTodoScanPanel ? 'text-cyan-400 bg-cyan-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Analysis & Stats tools">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                      Analyze
                    </button>
                    {showAnalyzeMenu && (<>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAnalyzeMenu(false)} />
                      <div className="absolute left-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[180px] shadow-2xl shadow-black/60">
                        <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Analysis & Stats</div>
                        <button onClick={() => { setShowStatsPanel(true); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showStatsPanel ? 'text-cyan-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                          Project Stats {showStatsPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        </button>
                        <button onClick={() => { setShowDepsPanel(true); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showDepsPanel ? 'text-violet-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                          Dependencies {showDepsPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                        </button>
                        <button onClick={() => { setShowColorPalettePanel(true); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showColorPalettePanel ? 'text-pink-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5.5-4.5-9-10-9z"/></svg>
                          Color Palette {showColorPalettePanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-400" />}
                        </button>
                        <button onClick={() => { setShowDepGraph(p => !p); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showDepGraph ? 'text-cyan-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                          Dep Graph {showDepGraph && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        </button>
                        <button onClick={() => { setShowPerfBudget(p => !p); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showPerfBudget ? 'text-lime-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-6"/></svg>
                          Perf Budget {showPerfBudget && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-lime-400" />}
                        </button>
                        <button onClick={() => { setShowBundlePanel(p => !p); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showBundlePanel ? 'text-green-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                          Bundle Size {showBundlePanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />}
                        </button>
                        <button onClick={() => { setShowUnusedCssPanel(p => !p); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showUnusedCssPanel ? 'text-amber-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94"/></svg>
                          Unused CSS {showUnusedCssPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </button>
                        <button onClick={() => { setShowElementCountPanel(p => !p); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showElementCountPanel ? 'text-teal-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3L8 21"/><path d="M16 3l-2 18"/></svg>
                          Element Count {showElementCountPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />}
                        </button>
                        <button onClick={() => { setShowTextStatsPanel(p => !p); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showTextStatsPanel ? 'text-indigo-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                          Text Stats {showTextStatsPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                        </button>
                        <button onClick={() => { setShowTodoScanPanel(p => !p); setShowAnalyzeMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showTodoScanPanel ? 'text-lime-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                          TODO Scanner {showTodoScanPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-lime-400" />}
                        </button>
                      </div>
                    </>)}
                  </div>

                  {/* ═══ Debug dropdown ═══ */}
                  <div className="relative">
                    <button onClick={() => { setShowDebugMenu(p => !p); setShowInspectMenu(false); setShowAnalyzeMenu(false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded transition-colors text-[9px] font-medium ${showDebugMenu || layoutDebugActive || gridFlexDebugActive || breakpointTestActive || showResponsiveGrid || showDomTreePanel || showLinkCheckerPanel || showAnimPanel || showOgPreview || showConsoleFilter || showColorEdit || showRegexPanel || showSplitPreview || showOutlinePanel || showNetworkPanel ? 'text-sky-400 bg-sky-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Debug & Visual tools">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                      Debug
                    </button>
                    {showDebugMenu && (<>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDebugMenu(false)} />
                      <div className="absolute left-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[180px] shadow-2xl shadow-black/60 max-h-[320px] overflow-y-auto">
                        <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Debug & Visual</div>
                        <button onClick={() => { setLayoutDebugActive(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${layoutDebugActive ? 'text-sky-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                          Layout Debug {layoutDebugActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />}
                        </button>
                        <button onClick={() => { setGridFlexDebugActive(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${gridFlexDebugActive ? 'text-pink-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                          Grid/Flex Visual {gridFlexDebugActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-400" />}
                        </button>
                        <button onClick={() => { setBreakpointTestActive(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${breakpointTestActive ? 'text-orange-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                          Breakpoint Test {breakpointTestActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
                        </button>
                        <button onClick={() => { setShowResponsiveGrid(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showResponsiveGrid ? 'text-violet-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                          Responsive Grid {showResponsiveGrid && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                        </button>
                        <button onClick={() => { setShowDomTreePanel(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showDomTreePanel ? 'text-emerald-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="14"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="19" r="3"/><line x1="12" y1="14" x2="6" y2="16"/><line x1="12" y1="14" x2="18" y2="16"/></svg>
                          DOM Tree {showDomTreePanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </button>
                        <button onClick={() => { setShowLinkCheckerPanel(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showLinkCheckerPanel ? 'text-cyan-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          Link Checker {showLinkCheckerPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                        </button>
                        <button onClick={() => { setShowAnimPanel(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showAnimPanel ? 'text-fuchsia-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3v18"/><path d="M12 3v18"/><path d="M19 3v18"/><path d="M5 12c2-4 5-4 7 0s5 4 7 0"/></svg>
                          CSS Animations {showAnimPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-fuchsia-400" />}
                        </button>
                        <button onClick={() => { setShowOgPreview(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showOgPreview ? 'text-sky-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                          OG Preview {showOgPreview && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />}
                        </button>
                        <button onClick={() => { setShowConsoleFilter(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showConsoleFilter ? 'text-emerald-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                          Console Filter {showConsoleFilter && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </button>
                        <button onClick={() => { setShowColorEdit(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showColorEdit ? 'text-pink-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17.2 9.8l-4.7 4.7L8 18l-.5 3.5L11 21l3.5-4.5 4.7-4.7"/></svg>
                          Color Picker {showColorEdit && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-400" />}
                        </button>
                        <button onClick={() => { setShowRegexPanel(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showRegexPanel ? 'text-rose-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/></svg>
                          Regex Tester {showRegexPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-400" />}
                        </button>
                        <div className="border-t border-[#2a2a2a] my-1" />
                        <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Panels</div>
                        <button onClick={() => { setShowSplitPreview(p => !p); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showSplitPreview ? 'text-lime-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                          Split Preview {showSplitPreview && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-lime-400" />}
                        </button>
                        <button onClick={() => { setShowOutlinePanel(true); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showOutlinePanel ? 'text-teal-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
                          Code Outline {showOutlinePanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />}
                        </button>
                        <button onClick={() => { setShowNetworkPanel(true); setShowDebugMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showNetworkPanel ? 'text-rose-400' : 'text-[#999]'}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                          Network / API {showNetworkPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-400" />}
                        </button>
                      </div>
                    </>)}
                  </div>

                  {/* ═══ Standalone actions ═══ */}
                  <button onClick={() => formatCode()} className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[10px] text-[#555] hover:text-white" title="Format Code">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
                  </button>
                  <button onClick={() => copyPreviewAsImage()} className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[10px] text-[#555] hover:text-white" title="Copy as Image">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  </button>
                  <button onClick={exportProjectZip} className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[10px] text-[#555] hover:text-white" title="Export ZIP">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button onClick={() => setPreviewDarkMode(p => p === 'dark' ? 'auto' : p === 'light' ? 'dark' : 'dark')} className={`w-5 h-5 flex items-center justify-center rounded transition-colors text-[10px] ${previewDarkMode !== 'auto' ? 'text-yellow-400 bg-yellow-500/10' : 'text-[#555] hover:text-white'}`} title={`Preview: ${previewDarkMode}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{previewDarkMode === 'dark' ? <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/> : <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></>}</svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {Object.keys(projectFiles).length > 0 && (
              <>
                <button onClick={vfsUndo} disabled={vfsHistoryIdx <= 0} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-20" title="Undo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
                <button onClick={vfsRedo} disabled={vfsHistoryIdx >= vfsHistory.length - 1} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-20" title="Redo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
                <button onClick={() => setShowDiffView(!showDiffView)} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${showDiffView ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Diff View">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18"/></svg>
                </button>
                <button onClick={downloadProjectZip} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Download ZIP"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                <button onClick={formatCurrentFile} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Format Document"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg></button>
                {/* ═══ Editor Tools dropdown ═══ */}
                <div className="relative">
                  <button onClick={() => { setShowCodeToolsMenu(p => !p); setShowMoreToolsMenu(false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded-md transition-colors text-[9px] font-medium ${showCodeToolsMenu || splitFile || minimapEnabled || wordWrapEnabled || showColorPicker ? 'text-violet-400 bg-violet-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Editor tools">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Editor
                  </button>
                  {showCodeToolsMenu && (<>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCodeToolsMenu(false)} />
                    <div className="absolute right-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[190px] shadow-2xl shadow-black/60 max-h-[340px] overflow-y-auto">
                      <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Editor Tools</div>
                      <button onClick={() => { if (splitFile) { setSplitFile(null); } else { const files = Object.keys(projectFiles).filter(f => f !== selectedFile); if (files.length > 0) setSplitFile(files[0]); } setShowCodeToolsMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${splitFile ? 'text-white' : 'text-[#999]'}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                        {splitFile ? 'Close Split' : 'Split Editor'} {splitFile && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                      <button onClick={() => { setShowComponentPalette(true); setShowCodeToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17.5h7M17.5 14v7"/></svg>
                        Insert Component
                      </button>
                      <button onClick={() => { setShowVersionTimeline(true); setShowCodeToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Version Timeline
                      </button>
                      <button onClick={() => { setShowBookmarks(true); setShowCodeToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        Code Bookmarks
                      </button>
                      <button onClick={() => { setShowFindReplace(true); setTimeout(() => findInputRef.current?.focus(), 50); setShowCodeToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Find & Replace <span className="ml-auto text-[8px] text-[#444]">⌘⇧H</span>
                      </button>
                      <button onClick={() => { explainCurrentCode(); setShowCodeToolsMenu(false); }} disabled={isStreaming || isExplaining} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999] disabled:opacity-30">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        AI Explain Code
                      </button>
                      <div className="border-t border-[#2a2a2a] my-1" />
                      <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Preferences</div>
                      <button onClick={() => { setShowThemeSelector(true); setShowCodeToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                        Editor Theme
                      </button>
                      <button onClick={() => { setMinimapEnabled(p => !p); setShowCodeToolsMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${minimapEnabled ? 'text-white' : 'text-[#999]'}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="14" y="3" width="7" height="18" rx="1"/><line x1="3" y1="6" x2="10" y2="6"/><line x1="3" y1="10" x2="10" y2="10"/><line x1="3" y1="14" x2="8" y2="14"/><line x1="3" y1="18" x2="10" y2="18"/></svg>
                        {minimapEnabled ? 'Hide Minimap' : 'Show Minimap'} {minimapEnabled && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                      <button onClick={() => { setWordWrapEnabled(p => !p); setShowCodeToolsMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${wordWrapEnabled ? 'text-white' : 'text-[#999]'}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><polyline points="13 16 11 18 13 20"/><path d="M3 18h4"/></svg>
                        {wordWrapEnabled ? 'Disable Word Wrap' : 'Enable Word Wrap'} {wordWrapEnabled && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                      <button onClick={() => { setShowColorPicker(p => !p); setShowCodeToolsMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showColorPicker ? 'text-white' : 'text-[#999]'}`}>
                        <div className="w-3 h-3 rounded border border-[#444]" style={{ background: pickedColor }} />
                        Color Picker {showColorPicker && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                      <button onClick={() => { shareProjectUrl(); setShowCodeToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        Share Project URL
                      </button>
                    </div>
                  </>)}
                </div>
                <div className="w-px h-4 bg-[#222]"/>
              </>
            )}
            <button onClick={() => setShowEnvPanel(true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Environment Variables">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </button>
            <button onClick={() => { setShowCommandPalette(true); setCommandQuery(''); }} className="flex items-center gap-1 px-2 py-1 rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors text-[10px]" title="Command Palette (Ctrl+K)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span className="hidden sm:inline">⌘K</span>
            </button>
            <button onClick={() => setShowIntegrations(!showIntegrations)} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${showIntegrations ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Integrations">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
            <button onClick={() => setShowStitchPanel(!showStitchPanel)} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${showStitchPanel ? 'text-purple-400 bg-purple-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Google Stitch">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </button>
            <button onClick={() => setShowGitHubModal(true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"><GitHubIcon /></button>
            <button onClick={() => setShowCollabPanel(true)} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors relative ${collabRoomId ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title={collabRoomId ? `Room ${collabRoomId}` : 'Collaborate'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {collabUsers.length > 1 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-bold">{collabUsers.length}</span>}
            </button>
            <button onClick={() => setAutoFixEnabled(p => !p)} className={`flex items-center gap-1 px-1.5 h-6 rounded-md transition-colors text-[9px] font-medium ${autoFixEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Auto-fix runtime errors">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Fix {autoFixEnabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
                {/* ═══ Tools dropdown ═══ */}
                <div className="relative">
                  <button onClick={() => { setShowMoreToolsMenu(p => !p); setShowCodeToolsMenu(false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded-md transition-colors text-[9px] font-medium ${showMoreToolsMenu ? 'text-amber-400 bg-amber-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="More tools">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    Tools
                  </button>
                  {showMoreToolsMenu && (<>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMoreToolsMenu(false)} />
                    <div className="absolute right-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[190px] shadow-2xl shadow-black/60">
                      <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Tools</div>
                      <button onClick={() => { setShowResearchPanel(true); setShowMoreToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        <span>NotebookLM Research</span>
                        {researchMode && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
                      </button>
                      <button onClick={() => { setClaudeCodeMode(p => !p); setShowMoreToolsMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${claudeCodeMode ? 'text-orange-400' : 'text-[#999]'}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
                        <span>Jarvis Brain {claudeCodeMode ? '(Active)' : ''}</span>
                        {claudeCodeMode && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
                      </button>
                      <div className="h-px bg-[#222] my-1" />
                      <button onClick={() => { setShowFeedbackPanel(true); setShowMoreToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Send Feedback
                      </button>
                      <button onClick={() => { setShowVisualBuilder(true); setShowMoreToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                        Visual Builder
                      </button>
                      <button onClick={() => { setShowDesignSystem(true); setShowMoreToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/><circle cx="8.5" cy="15.5" r="2.5"/><path d="M13 9v1M10.5 14l-1-1.5M16 14l1-1.5"/></svg>
                        Design System
                      </button>
                      <button onClick={() => { setShowApiTester(true); setShowMoreToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                        API Tester
                      </button>
                      <button onClick={() => { setShowScreenshotAnalyzer(true); setShowMoreToolsMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                        Screenshot to Code
                      </button>
                    </div>
                  </>)}
                </div>
            <button
              onClick={() => deployToVercel()}
              disabled={!hasPreviewContent || isDeploying}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white text-black text-[11px] font-medium transition-colors disabled:opacity-20 hover:bg-gray-200"
            >
              {isDeploying ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border border-black border-t-transparent rounded-full" /> Deploying...</>) : (<><DeployIcon /> Deploy</>)}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {deployResult && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="px-4 py-2 bg-[#111] border-b border-[#1e1e1e] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                  <CheckCircleIcon />
                  Deployed: <a href={deployResult.url} target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-[#aaa] ml-1 truncate max-w-[400px]">{deployResult.url}</a>
                </div>
                <button onClick={() => setDeployResult(null)} className="text-[11px] text-[#555] hover:text-white transition-colors">Dismiss</button>
              </div>
            </motion.div>
          )}
          {deployError && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="px-4 py-2 bg-[#111] border-b border-red-500/20 flex items-center justify-between">
                <span className="text-red-400 text-[11px]">{deployError}</span>
                <button onClick={() => setDeployError(null)} className="text-[11px] text-[#555] hover:text-white transition-colors">Dismiss</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content area */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <AnimatePresence initial={false}>
                {activeTab === 'app' ? (
                  <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    {hasPreviewContent ? (
                      <div className="relative w-full h-full bg-[#0c0c0c] flex flex-col">
                        {/* Preview URL bar */}
                        <div className="h-[28px] flex items-center gap-2 px-2 bg-[#111] border-b border-[#1e1e1e] shrink-0">
                          <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                          </div>
                          <div className="flex-1 flex items-center bg-[#0a0a0a] border border-[#222] rounded-md px-2 py-0.5 text-[10px] text-[#555] font-mono">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 shrink-0 text-[#444]"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span className="truncate">{webContainer.previewUrl || `localhost:3000/${selectedFile === 'index.html' ? '' : selectedFile}`}</span>
                          </div>
                          <button onClick={refreshPreview} className="w-5 h-5 flex items-center justify-center text-[#555] hover:text-white rounded transition-colors"><RefreshIcon /></button>
                        </div>
                        {/* Responsive Breakpoint Ruler */}
                        {showBreakpointRuler && deviceMode === 'desktop' && (
                          <div className="h-[20px] relative bg-[#0a0a0a] border-b border-[#1e1e1e] shrink-0 overflow-hidden">
                            {[
                              { w: 320, label: '320', color: '#ef4444' },
                              { w: 480, label: '480', color: '#f97316' },
                              { w: 640, label: 'sm', color: '#eab308' },
                              { w: 768, label: 'md', color: '#22c55e' },
                              { w: 1024, label: 'lg', color: '#3b82f6' },
                              { w: 1280, label: 'xl', color: '#8b5cf6' },
                              { w: 1536, label: '2xl', color: '#ec4899' },
                            ].map(bp => (
                              <div key={bp.w} className="absolute top-0 h-full flex flex-col items-center" style={{ left: `${(bp.w / 1920) * 100}%` }}>
                                <div className="w-px h-[10px]" style={{ background: bp.color, opacity: 0.5 }} />
                                <span className="text-[7px] font-mono leading-none" style={{ color: bp.color, opacity: 0.7 }}>{bp.label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className={`flex-1 min-h-0 flex items-center justify-center`} style={previewZoom !== 100 ? { transform: `scale(${previewZoom / 100})`, transformOrigin: 'center center' } : undefined}>
                          <div className={`bg-white transition-all duration-300 ${
                            breakpointTestActive
                              ? 'h-full rounded-[4px] border-2 border-orange-500/30'
                              : deviceMode === 'mobile'
                              ? isLandscape ? 'w-[852px] h-[393px] rounded-[20px] border-4 border-[#333]' : 'w-[393px] h-[852px] rounded-[20px] border-4 border-[#333]'
                              : deviceMode === 'tablet'
                              ? isLandscape ? 'w-[1080px] h-[810px] rounded-[12px] border-4 border-[#333]' : 'w-[810px] h-[1080px] rounded-[12px] border-4 border-[#333]'
                              : 'w-full h-full'
                          } overflow-hidden relative`} style={breakpointTestActive ? { width: `${BREAKPOINT_SIZES[breakpointTestIdx].w}px` } : undefined}>
                            {/* Device notch for mobile */}
                            {deviceMode === 'mobile' && !isLandscape && (
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-[#333] rounded-b-[14px] z-10" />
                            )}
                            {/* Preview loading skeleton */}
                            {previewLoading && (
                              <div className="absolute inset-0 z-[5] bg-white animate-pulse">
                                <div className="h-14 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                                  <div className="flex-1 space-y-2">
                                    <div className="h-3 w-24 bg-gray-200 rounded" />
                                    <div className="h-2 w-16 bg-gray-200 rounded" />
                                  </div>
                                  <div className="flex gap-2">
                                    <div className="w-16 h-8 bg-gray-200 rounded-md" />
                                    <div className="w-16 h-8 bg-gray-200 rounded-md" />
                                  </div>
                                </div>
                                <div className="p-6 space-y-4">
                                  <div className="h-8 w-3/4 bg-gray-100 rounded" />
                                  <div className="h-4 w-full bg-gray-100 rounded" />
                                  <div className="h-4 w-5/6 bg-gray-100 rounded" />
                                  <div className="h-4 w-2/3 bg-gray-100 rounded" />
                                  <div className="grid grid-cols-3 gap-4 mt-6">
                                    <div className="h-32 bg-gray-100 rounded-lg" />
                                    <div className="h-32 bg-gray-100 rounded-lg" />
                                    <div className="h-32 bg-gray-100 rounded-lg" />
                                  </div>
                                  <div className="h-4 w-full bg-gray-100 rounded mt-4" />
                                  <div className="h-4 w-4/5 bg-gray-100 rounded" />
                                </div>
                              </div>
                            )}
                            {wcInstalling && (
                              <div className="absolute inset-0 z-20 bg-[#0a0a0a]/95 flex flex-col items-center justify-center gap-4">
                                <div className="w-10 h-10 border-2 border-[#333] border-t-emerald-400 rounded-full animate-spin" />
                                <div className="text-emerald-400 text-sm font-mono">{wcInstallProgress || 'Setting up...'}</div>
                                <div className="flex gap-1">
                                  {[0,1,2,3,4].map(i => (
                                    <div key={i} className="w-1.5 h-4 bg-emerald-500/30 rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {webContainer.previewUrl ? (
                              <iframe ref={iframeRef} className="w-full h-full border-none bg-white" src={webContainer.previewUrl} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Preview" onLoad={() => setPreviewLoading(false)} />
                            ) : (
                              <iframe ref={iframeRef} className="w-full h-full border-none bg-white" srcDoc={previewHtml ?? ''} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="Preview" onLoad={() => setPreviewLoading(false)} />
                            )}
                            {/* Split Preview: mobile view side-by-side */}
                            {showSplitPreview && deviceMode === 'desktop' && previewHtml && (
                              <div className="absolute right-0 top-0 bottom-0 w-[200px] border-l-2 border-dashed border-[#333] bg-[#0a0a0a] flex flex-col items-center z-[6]">
                                <div className="text-[9px] text-[#555] py-1 bg-[#111] w-full text-center border-b border-[#222]">Mobile (375px)</div>
                                <div className="flex-1 w-[187px] overflow-hidden">
                                  <iframe className="border-none bg-white origin-top-left" style={{ width: '375px', height: '812px', transform: 'scale(0.5)', transformOrigin: 'top left' }} srcDoc={previewHtml} sandbox="allow-scripts allow-same-origin" title="Mobile Preview" />
                                </div>
                              </div>
                            )}
                            {isEditMode && (
                              <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/90 text-white text-[10px] font-medium shadow-lg pointer-events-none z-10">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit Mode
                              </div>
                            )}
                            {/* Select & Prompt — floating AI prompt for element modification */}
                            {selectPromptData && (
                              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={(e) => { if (e.target === e.currentTarget) { setSelectPromptData(null); setSelectPromptInput(''); } }}>
                                <div className="bg-[#161616] rounded-xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                  <div className="px-4 py-3 border-b border-[#222] flex items-center gap-2">
                                    <span className="text-lg">✨</span>
                                    <div className="flex-1">
                                      <p className="text-[12px] text-white font-medium">AI Modify Element</p>
                                      <p className="text-[10px] text-[#555]">&lt;{selectPromptData.tagName.toLowerCase()}&gt; — Only this element will be changed</p>
                                    </div>
                                    <button onClick={() => { setSelectPromptData(null); setSelectPromptInput(''); }} className="text-[#555] hover:text-white transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                                  </div>
                                  <div className="p-3">
                                    <div className="mb-3 max-h-[100px] overflow-auto rounded-lg bg-[#0c0c0c] border border-[#222] p-2">
                                      <pre className="text-[10px] text-[#666] font-mono whitespace-pre-wrap break-all leading-4">{selectPromptData.outerHtml.slice(0, 500)}{selectPromptData.outerHtml.length > 500 ? '...' : ''}</pre>
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        ref={selectPromptRef}
                                        value={selectPromptInput}
                                        onChange={(e) => setSelectPromptInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitSelectPrompt(); } if (e.key === 'Escape') { setSelectPromptData(null); setSelectPromptInput(''); } }}
                                        placeholder="e.g. Make it blue, add a gradient, change text to..."
                                        className="flex-1 bg-[#0c0c0c] border border-[#333] rounded-lg px-3 py-2 text-[12px] text-white placeholder-[#555] outline-none focus:border-purple-500/50 transition-colors"
                                        disabled={selectPromptLoading}
                                        autoFocus
                                      />
                                      <button
                                        onClick={submitSelectPrompt}
                                        disabled={!selectPromptInput.trim() || selectPromptLoading}
                                        className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-[11px] font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-30 shrink-0 flex items-center gap-1.5"
                                      >
                                        {selectPromptLoading ? (
                                          <><svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" /></svg> Applying...</>
                                        ) : (
                                          <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Apply</>
                                        )}
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {['Make it bigger', 'Change colors', 'Add animation', 'Make responsive', 'Modernize style'].map((s) => (
                                        <button key={s} onClick={() => { setSelectPromptInput(s); }} className="text-[9px] px-2 py-1 rounded-md bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222] transition-colors">{s}</button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* 21st.dev Component Browser — overlay from bottom of preview */}
                            {show21stBrowser && (
                              <div className="absolute inset-0 z-30 flex flex-col bg-[#0d0d0d]/95 backdrop-blur-sm rounded-[inherit] overflow-hidden">
                                {/* Header */}
                                <div className="shrink-0 px-4 py-3 border-b border-[#222] flex items-center gap-3">
                                  <div className="flex items-center gap-2 shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                                    <span className="text-[12px] font-semibold text-white">21st.dev Components</span>
                                  </div>
                                  <form className="flex-1 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); search21stComponents(browser21stQuery); }}>
                                    <input
                                      ref={browser21stInputRef}
                                      value={browser21stQuery}
                                      onChange={(e) => setBrowser21stQuery(e.target.value)}
                                      placeholder="Search components… e.g. pricing card, nav bar, hero section"
                                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-[#555] outline-none focus:border-indigo-500/50 transition-colors"
                                      autoFocus
                                    />
                                    <button type="submit" disabled={browser21stLoading || !browser21stQuery.trim()} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-[11px] font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0">
                                      {browser21stLoading
                                        ? <><svg width="11" height="11" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70"/></svg> Searching…</>
                                        : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search</>}
                                    </button>
                                  </form>
                                  <button onClick={() => setShow21stBrowser(false)} className="shrink-0 w-6 h-6 flex items-center justify-center text-[#555] hover:text-white transition-colors rounded-md hover:bg-[#1a1a1a]">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                  </button>
                                </div>
                                {/* Quick category chips */}
                                <div className="shrink-0 px-4 py-2 flex flex-wrap gap-1.5 border-b border-[#1a1a1a]">
                                  {['Hero section', 'Pricing card', 'Navigation bar', 'Card grid', 'CTA button', 'Footer', 'Modal', 'Form', 'Feature grid', 'Testimonials'].map(chip => (
                                    <button key={chip} onClick={() => { setBrowser21stQuery(chip); search21stComponents(chip); }} className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#252525] text-[10px] text-[#777] hover:text-white hover:border-indigo-500/40 transition-colors">{chip}</button>
                                  ))}
                                </div>
                                {/* Results */}
                                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                                  {browser21stLoading && (
                                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                                      <svg width="20" height="20" viewBox="0 0 24 24" className="animate-spin text-indigo-400"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70"/></svg>
                                      <p className="text-[12px] text-[#555]">Searching 21st.dev…</p>
                                    </div>
                                  )}
                                  {!browser21stLoading && browser21stResults.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                                      <p className="text-[12px] text-[#555]">Search for components above</p>
                                      <p className="text-[10px] text-[#333]">or click a quick category chip</p>
                                    </div>
                                  )}
                                  {!browser21stLoading && browser21stResults.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                      {browser21stResults.map((comp, i) => (
                                        <div key={comp.id || i} className="flex flex-col bg-[#111] border border-[#1e1e1e] rounded-xl p-3 gap-2 hover:border-indigo-500/30 transition-colors group">
                                          <div className="flex-1">
                                            <p className="text-[11px] font-semibold text-white leading-tight mb-1">{comp.name || 'Component'}</p>
                                            <p className="text-[10px] text-[#666] leading-snug line-clamp-2">{comp.description || ''}</p>
                                            {comp.tags && comp.tags.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1.5">
                                                {comp.tags.slice(0, 3).map(t => (
                                                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#777]">{t}</span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          {comp.preview_url || comp.demo_url ? (
                                            <a href={comp.preview_url || comp.demo_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-400/70 hover:text-indigo-300 transition-colors underline truncate">Preview ↗</a>
                                          ) : null}
                                          <button
                                            onClick={() => inject21stComponent(comp)}
                                            disabled={!!injecting21stComponent}
                                            className="w-full py-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-[10px] font-medium hover:bg-indigo-500/25 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 group-hover:bg-indigo-500/20"
                                          >
                                            {injecting21stComponent === comp.name
                                              ? <><svg width="10" height="10" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70"/></svg> Injecting…</>
                                              : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Use in page</>}
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Device dimension label */}
                          {deviceMode !== 'desktop' && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#1a1a1a]/80 backdrop-blur-sm text-[9px] text-[#666] font-mono">
                              {deviceMode === 'mobile'
                                ? isLandscape ? '852 × 393' : '393 × 852'
                                : isLandscape ? '1080 × 810' : '810 × 1080'
                              }
                            </div>
                          )}
                        </div>
                        {/* Refine Clone Panel — appears when a clone exists */}
                        {clonedHtml && lastScrapeDataRef.current && (
                          <div className="shrink-0 border-t border-[#222] bg-[#111] px-3 py-2">
                            {/* Quick fix suggestions */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {[
                                'Fix colors to match the original exactly',
                                'Fix the header/navbar layout and styling',
                                'Add the missing footer content',
                                'Fix responsive layout for mobile',
                                'Make fonts match the original site',
                                'Fix spacing and padding to match original',
                              ].map(suggestion => (
                                <button
                                  key={suggestion}
                                  onClick={() => { setRefineFeedback(suggestion); }}
                                  className="px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#252525] text-[10px] text-[#777] hover:text-white hover:border-[#444] transition-colors"
                                  disabled={isRefining}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={refineFeedback}
                                onChange={(e) => setRefineFeedback(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); refineClone(); } }}
                                placeholder="Describe what to fix (e.g. &quot;make the header darker&quot;, &quot;add the missing footer&quot;)..."
                                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-[12px] text-white placeholder-[#555] focus:outline-none focus:border-[#444] transition-colors"
                                disabled={isRefining}
                              />
                              <button
                                onClick={refineClone}
                                disabled={!refineFeedback.trim() || isRefining}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-[11px] text-white font-medium transition-colors hover:bg-[#333] disabled:opacity-30"
                              >
                                {isRefining ? (
                                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border border-white border-t-transparent rounded-full" /> Refining...</>
                                ) : (
                                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Refine</>
                                )}
                              </button>
                              {isRefining && (
                                <button onClick={stopClone} className="px-2 py-1.5 rounded-lg border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-[#0c0c0c]">
                        {isCloning ? (
                          <div className="text-center">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="w-6 h-6 mx-auto mb-3 border-2 border-white border-t-transparent rounded-full" />
                            <p className="text-[13px] text-white mb-1">Cloning...</p>
                            <p className="text-[11px] text-[#555]">{cloneProgress || 'Processing'}</p>
                            <button onClick={stopClone} className="mt-3 px-3 py-1 rounded-md border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                          </div>
                        ) : isStreaming ? (
                          <div className="text-center">
                            <div className="relative w-12 h-12 mx-auto mb-4">
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 border-2 border-transparent border-t-white rounded-full" />
                              <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="absolute inset-1.5 border-2 border-transparent border-t-[#444] rounded-full" />
                              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                              </motion.div>
                            </div>
                            <p className="text-[13px] text-white mb-1 font-medium">Building your app</p>
                            <p className="text-[11px] text-[#555]">AI is writing code...</p>
                            <div className="flex items-center justify-center gap-1 mt-3">
                              {[0, 1, 2, 3, 4].map(i => (
                                <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-white" />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center max-w-sm mx-auto">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
                              <GlobeIcon />
                            </div>
                            <p className="text-[14px] text-white font-medium mb-1">No preview yet</p>
                            <p className="text-[11px] text-[#555] mb-5">Start building by chatting with AI or pick a template</p>
                            <div className="flex flex-wrap justify-center gap-2 mb-4">
                              <button onClick={() => setShowTemplates(true)} className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium hover:bg-purple-500/20 transition-all hover:scale-105">Templates</button>
                              <button onClick={() => setShowCloneModal(true)} className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-medium hover:bg-blue-500/20 transition-all hover:scale-105">Clone Site</button>
                              <button onClick={() => { setProjectFiles({ 'App.jsx': { content: 'function App() {\n  return (\n    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">\n      <h1 className="text-4xl font-bold">Hello World</h1>\n    </div>\n  );\n}', language: 'jsx' } }); setSelectedFile('App.jsx'); setActiveTab('code'); }} className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium hover:bg-emerald-500/20 transition-all hover:scale-105">React App</button>
                            </div>
                            {cloneError && (
                              <div className="mt-3 p-3 rounded-lg border border-[#2a2a2a] max-w-xs mx-auto">
                                <p className="text-red-400 text-[11px]">{cloneError}</p>
                                <button onClick={() => { setCloneError(null); setShowCloneModal(true); }} className="mt-2 text-[11px] text-[#888] hover:text-white underline">Try again</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : activeTab === 'code' ? (
                  <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex bg-[#0c0c0c]" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
                    {/* Drag overlay */}
                    {isDragOver && (
                      <div className="absolute inset-0 z-40 bg-purple-500/10 border-2 border-dashed border-purple-500/40 rounded-lg flex items-center justify-center">
                        <div className="text-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" className="mx-auto mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><p className="text-purple-400 text-sm font-medium">Drop files here</p></div>
                      </div>
                    )}
                    {/* File tree sidebar */}
                    {Object.keys(projectFiles).length > 0 ? (
                      <>
                        <div className="file-tree-sidebar w-[200px] shrink-0 border-r border-[#1e1e1e] bg-[#0f0f0f] flex flex-col overflow-hidden">
                          <div className="px-3 py-2 text-[10px] font-medium text-[#555] uppercase tracking-wider border-b border-[#1e1e1e] flex items-center justify-between">
                            <span>Explorer</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-[#444] normal-case tracking-normal">{Object.keys(projectFiles).length}</span>
                              <button onClick={() => { setShowNewFileInput(true); setNewFileName(''); setTimeout(() => newFileInputRef.current?.focus(), 50); }} className="w-4 h-4 flex items-center justify-center rounded text-[#555] hover:text-white hover:bg-[#222] transition-colors" title="New File"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
                              <button onClick={() => { const name = prompt('Folder name:'); if (name?.trim()) { const dirPath = name.trim(); setProjectFiles(prev => ({ ...prev, [`${dirPath}/.gitkeep`]: { content: '', language: 'text' } })); setExpandedDirs(prev => { const n = new Set(prev); n.add(dirPath); return n; }); showToast(`Created folder: ${dirPath}`, 'success'); } }} className="w-4 h-4 flex items-center justify-center rounded text-[#555] hover:text-white hover:bg-[#222] transition-colors" title="New Folder"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg></button>
                            </div>
                          </div>
                          {/* Quick file creator */}
                          {showNewFileInput && (
                            <div className="px-2 py-1.5 border-b border-[#1e1e1e]">
                              <input
                                ref={newFileInputRef}
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') createNewFile(newFileName); if (e.key === 'Escape') setShowNewFileInput(false); }}
                                onBlur={() => { if (!newFileName.trim()) setShowNewFileInput(false); }}
                                placeholder="filename.ext"
                                className="w-full bg-[#111] border border-[#333] focus:border-[#555] rounded px-2 py-1 text-[11px] text-white placeholder-[#555] outline-none"
                                autoFocus
                              />
                            </div>
                          )}
                          <div className="flex-1 overflow-y-auto py-1">
                            {(() => {
                              const { entries } = buildFileTree(projectFiles);
                              return entries.map((entry) => {
                                if (entry.isDir) {
                                  const isOpen = expandedDirs.has(entry.path);
                                  return (
                                    <button key={entry.path} onClick={() => setExpandedDirs(prev => { const next = new Set(prev); if (next.has(entry.path)) next.delete(entry.path); else next.add(entry.path); return next; })}
                                      onContextMenu={(e) => { e.preventDefault(); setExplorerContextMenu({ x: e.clientX, y: e.clientY, path: entry.path, isDir: true }); }}
                                      className="w-full flex items-center gap-1.5 px-2 py-[3px] text-[11px] text-[#888] hover:text-white hover:bg-[#161616] transition-colors" style={{ paddingLeft: 8 + entry.depth * 12 }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"/></svg>
                                      <FolderIcon open={isOpen} size={12} />
                                      <span className="truncate">{entry.name}</span>
                                    </button>
                                  );
                                }
                                // Check if parent dir is collapsed
                                const parentDir = entry.path.includes('/') ? entry.path.split('/').slice(0, -1).join('/') : null;
                                if (parentDir) {
                                  const parts = entry.path.split('/');
                                  for (let i = 1; i < parts.length; i++) {
                                    const dir = parts.slice(0, i).join('/');
                                    if (!expandedDirs.has(dir)) return null;
                                  }
                                }
                                const isImage = /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp)$/i.test(entry.name);
                                return (
                                  <div key={entry.path} className="relative">
                                    {renameTarget === entry.path ? (
                                      <div className="flex items-center gap-1 px-2 py-[3px]" style={{ paddingLeft: 8 + entry.depth * 12 + (parentDir ? 10 : 0) }}>
                                        <input ref={renameInputRef} value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter' && renameValue.trim() && renameValue.trim() !== entry.name) {
                                              const dir = entry.path.includes('/') ? entry.path.split('/').slice(0, -1).join('/') + '/' : '';
                                              const newPath = dir + renameValue.trim();
                                              setProjectFiles(prev => {
                                                const next = { ...prev };
                                                next[newPath] = { ...next[entry.path], language: detectLanguage(newPath) };
                                                delete next[entry.path];
                                                return next;
                                              });
                                              if (selectedFile === entry.path) setSelectedFile(newPath);
                                              setOpenTabs(prev => prev.map(t => t === entry.path ? newPath : t));
                                              showToast(`Renamed to ${renameValue.trim()}`, 'success');
                                              setRenameTarget(null); setRenameValue('');
                                            }
                                            if (e.key === 'Escape') { setRenameTarget(null); setRenameValue(''); }
                                          }}
                                          onBlur={() => { setRenameTarget(null); setRenameValue(''); }}
                                          className="flex-1 bg-[#111] border border-[#555] rounded px-1.5 py-0.5 text-[11px] text-white outline-none" autoFocus />
                                      </div>
                                    ) : (
                                      <button onClick={() => openFile(entry.path)}
                                        onContextMenu={(e) => { e.preventDefault(); setExplorerContextMenu({ x: e.clientX, y: e.clientY, path: entry.path, isDir: false }); }}
                                        onMouseEnter={(e) => { if (isImage) setHoveredImage({ path: entry.path, x: e.clientX, y: e.clientY }); }}
                                        onMouseLeave={() => { if (isImage) setHoveredImage(null); }}
                                        className={`w-full flex items-center gap-1.5 px-2 py-[3px] text-[11px] transition-colors ${selectedFile === entry.path ? 'text-white bg-[#1a1a1a]' : 'text-[#888] hover:text-white hover:bg-[#161616]'}`} style={{ paddingLeft: 8 + entry.depth * 12 + (parentDir ? 10 : 0) }}>
                                        {getFileIcon(entry.name, 12)}
                                        <span className="truncate flex-1">{entry.name}</span>
                                        <span className="text-[9px] text-[#444] shrink-0">{projectFiles[entry.path] ? (projectFiles[entry.path].content.length < 1024 ? projectFiles[entry.path].content.length + 'B' : (projectFiles[entry.path].content.length / 1024).toFixed(1) + 'K') : ''}</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                        {/* File editor */}
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                          {/* File tabs */}
                          <div className="h-[32px] flex items-center border-b border-[#1e1e1e] bg-[#111] overflow-x-auto shrink-0">
                            {openTabs.filter(f => projectFiles[f]).map(f => (
                              <div key={f} onClick={() => setSelectedFile(f)} onContextMenu={(e) => { e.preventDefault(); setTabContextMenu({ x: e.clientX, y: e.clientY, file: f }); }} className={`h-full px-3 flex items-center gap-1.5 text-[11px] border-r border-[#1e1e1e] shrink-0 transition-colors cursor-pointer group ${f === selectedFile ? 'bg-[#0c0c0c] text-white' : 'text-[#555] hover:text-[#888]'}`}>
                                {isFileModified(f) && <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Modified" />}
                                {getFileIcon(f.split('/').pop() || f, 11)}
                                <span>{f.split('/').pop()}</span>
                                {openTabs.length > 1 && (
                                  <button onClick={(e) => closeTab(f, e)} className="ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-[#333] opacity-0 group-hover:opacity-100 transition-opacity text-[#666] hover:text-white">
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Breadcrumb */}
                          {selectedFile.includes('/') && (
                            <div className="h-[22px] flex items-center px-3 bg-[#0e0e0e] border-b border-[#1a1a1a] text-[10px] text-[#555] gap-1 shrink-0 overflow-x-auto">
                              {selectedFile.split('/').map((part, i, arr) => (
                                <span key={i} className="flex items-center gap-1 shrink-0">
                                  {i > 0 && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>}
                                  <span className={i === arr.length - 1 ? 'text-[#999]' : 'hover:text-[#999] cursor-pointer'}>{part}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Monaco Code Editor / Diff View */}
                          <div className="flex-1 overflow-hidden flex">
                            <div className={`${splitFile ? 'w-1/2 border-r border-[#1e1e1e]' : 'flex-1'} overflow-hidden`}>
                            {projectFiles[selectedFile] ? (
                              showDiffView && vfsHistoryIdx > 0 ? (
                                <MonacoDiffEditor
                                  height="100%"
                                  language={projectFiles[selectedFile]?.language || 'plaintext'}
                                  original={vfsHistory[vfsHistoryIdx - 1]?.[selectedFile]?.content || ''}
                                  modified={projectFiles[selectedFile]?.content || ''}
                                  theme={editorTheme}
                                  options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 13, automaticLayout: true }}
                                />
                              ) : (
                              <MonacoEditor
                                height="100%"
                                language={projectFiles[selectedFile].language || 'plaintext'}
                                value={projectFiles[selectedFile].content}
                                onChange={(val) => {
                                  if (val !== undefined) {
                                    setProjectFiles(prev => ({
                                      ...prev,
                                      [selectedFile]: { ...prev[selectedFile], content: val },
                                    }));
                                  }
                                }}
                                onMount={(editor) => { monacoEditorRef.current = editor; editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => setCursorPosition({ line: e.position.lineNumber, col: e.position.column })); }}
                                theme={editorTheme}
                                options={{
                                  minimap: { enabled: minimapEnabled, scale: 2, showSlider: 'mouseover' },
                                  fontSize: 13,
                                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
                                  fontLigatures: true,
                                  lineNumbers: 'on',
                                  scrollBeyondLastLine: false,
                                  wordWrap: wordWrapEnabled ? 'on' : 'off',
                                  tabSize: 2,
                                  automaticLayout: true,
                                  bracketPairColorization: { enabled: true },
                                  'bracketPairColorization.independentColorPoolPerBracketType': true,
                                  guides: { bracketPairs: true, indentation: true, highlightActiveIndentation: true },
                                  padding: { top: 8, bottom: 8 },
                                  suggestOnTriggerCharacters: true,
                                  quickSuggestions: { other: true, comments: false, strings: true },
                                  acceptSuggestionOnCommitCharacter: true,
                                  parameterHints: { enabled: true },
                                  folding: true,
                                  foldingStrategy: 'indentation',
                                  showFoldingControls: 'mouseover',
                                  renderWhitespace: 'selection',
                                  smoothScrolling: true,
                                  cursorBlinking: 'smooth',
                                  cursorSmoothCaretAnimation: 'on',
                                  cursorStyle: 'line',
                                  formatOnPaste: true,
                                  formatOnType: true,
                                  linkedEditing: true,
                                  autoClosingBrackets: 'always',
                                  autoClosingQuotes: 'always',
                                  autoSurround: 'languageDefined',
                                  matchBrackets: 'always',
                                  renderLineHighlight: 'all',
                                  renderLineHighlightOnlyWhenFocus: false,
                                  stickyScroll: { enabled: true },
                                  colorDecorators: true,
                                  inlineSuggest: { enabled: true },
                                }}
                              />
                              )
                            ) : (
                              <div className="text-[12px] text-[#555] p-4">Select a file from the explorer</div>
                            )}
                            </div>
                            {/* Split view — right pane */}
                            {splitFile && projectFiles[splitFile] && (
                              <div className="w-1/2 flex flex-col overflow-hidden">
                                <div className="h-[28px] flex items-center justify-between px-3 bg-[#111] border-b border-[#1e1e1e] shrink-0">
                                  <div className="flex items-center gap-1.5 text-[11px] text-[#888]">
                                    {getFileIcon(splitFile.split('/').pop() || splitFile, 11)}
                                    <span>{splitFile.split('/').pop()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <select value={splitFile} onChange={e => setSplitFile(e.target.value)} className="bg-transparent text-[9px] text-[#666] outline-none max-w-[100px]">
                                      {Object.keys(projectFiles).filter(f => f !== selectedFile).map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                    <button onClick={() => setSplitFile(null)} className="w-4 h-4 flex items-center justify-center text-[#555] hover:text-white rounded transition-colors">
                                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                    </button>
                                  </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <MonacoEditor
                                    height="100%"
                                    language={projectFiles[splitFile].language || 'plaintext'}
                                    value={projectFiles[splitFile].content}
                                    onChange={(val) => {
                                      if (val !== undefined) {
                                        setProjectFiles(prev => ({
                                          ...prev,
                                          [splitFile]: { ...prev[splitFile], content: val },
                                        }));
                                      }
                                    }}
                                    theme={editorTheme}
                                    options={{
                                      minimap: { enabled: false },
                                      fontSize: 13,
                                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
                                      fontLigatures: true,
                                      lineNumbers: 'on',
                                      scrollBeyondLastLine: false,
                                      wordWrap: 'on',
                                      tabSize: 2,
                                      automaticLayout: true,
                                      bracketPairColorization: { enabled: true },
                                      padding: { top: 8, bottom: 8 },
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : codeBlocks.length > 0 ? (
                      <div className="flex-1 p-4 space-y-4 overflow-auto">{codeBlocks.map((block, idx) => <CodeBlock key={idx} code={block.code} language={block.language} />)}</div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center"><div className="text-center"><CodeIcon /><p className="text-[12px] text-[#555] mt-3">Code will appear here when you build something</p></div></div>
                    )}
                  </motion.div>
                ) : activeTab === 'database' ? (
                  <motion.div key="database" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto bg-[#0c0c0c]">
                    <div className="max-w-2xl mx-auto p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-1">Database</h2>
                          <p className="text-[12px] text-[#555]">{dbActiveConnection ? 'Live database connected' : 'Connect and manage your project database'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {dbActiveConnection && <span className="px-2 py-1 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px]">Live</span>}
                          {integrationKeys['Supabase'] && <span className="px-2 py-1 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px]">Supabase</span>}
                        </div>
                      </div>
                      {/* Database mode tabs */}
                      <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-[#111] border border-[#222]">
                        {(['query', 'schema', 'history', 'templates'] as const).map(mode => (
                          <button key={mode} onClick={() => setDbViewMode(mode)} className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors capitalize ${dbViewMode === mode ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#555] hover:text-white'}`}>{mode === 'query' ? '⚡ SQL Editor' : mode === 'schema' ? '📊 Schema' : mode === 'history' ? '📋 History' : '🧱 Templates'}</button>
                        ))}
                      </div>

                      {/* ═══ SQL Editor View ═══ */}
                      {dbViewMode === 'query' && (
                        <div className="space-y-4">
                          {/* Quick connect if no active connection */}
                          {!dbActiveConnection && (
                            <div className="p-4 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5">
                              <p className="text-[12px] text-emerald-400 font-medium mb-3">Quick Connect</p>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => {
                                  const url = prompt('Supabase Project URL:');
                                  const key = prompt('Supabase API Key (service_role):');
                                  if (url && key) connectDatabase('supabase', url, key);
                                }} className="px-3 py-2 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] hover:bg-emerald-500/20 transition-colors">Connect Supabase</button>
                                <button onClick={() => {
                                  const url = prompt('Neon Connection String:');
                                  if (url) connectDatabase('neon', url, '');
                                }} className="px-3 py-2 rounded-md bg-blue-500/10 text-blue-400 text-[11px] hover:bg-blue-500/20 transition-colors">Connect Neon</button>
                              </div>
                              {integrationKeys['Supabase'] && (
                                <button onClick={() => connectDatabase('supabase', supabaseUrl || '', integrationKeys['Supabase'])} className="mt-2 w-full px-3 py-2 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors">Use saved Supabase key</button>
                              )}
                            </div>
                          )}
                          {/* SQL Editor */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-[#555] font-medium">SQL QUERY</span>
                              <div className="flex items-center gap-1">
                                {SQL_KEYWORDS.slice(0, 8).map(kw => (
                                  <button key={kw} onClick={() => setDbSqlInput(prev => prev + (prev.endsWith(' ') ? '' : ' ') + kw + ' ')} className="px-1.5 py-0.5 rounded text-[9px] bg-[#1a1a1a] text-[#555] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">{kw}</button>
                                ))}
                              </div>
                            </div>
                            <textarea value={dbSqlInput} onChange={(e) => setDbSqlInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runDatabaseQuery(); } }} placeholder="SELECT * FROM users..." rows={5} className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-md px-3 py-2 text-[12px] text-emerald-300 placeholder-[#555] outline-none focus:border-emerald-500/30 font-mono resize-none" spellCheck={false} />
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[9px] text-[#555]">Ctrl+Enter to run</span>
                              <button onClick={runDatabaseQuery} disabled={dbQueryRunning || !dbActiveConnection} className="px-4 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-30">{dbQueryRunning ? 'Running...' : '▶ Execute'}</button>
                            </div>
                          </div>
                          {/* Query Result */}
                          {dbQueryResult && (
                            <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-[#555]">
                                  {dbQueryResult.error ? '✗ Error' : `✓ ${dbQueryResult.rowCount} row(s) — ${dbQueryResult.duration}ms`}
                                </span>
                                {dbQueryResult.rows.length > 0 && <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(dbQueryResult.rows, null, 2)); }} className="text-[9px] text-[#555] hover:text-white transition-colors">Copy JSON</button>}
                              </div>
                              {dbQueryResult.error ? (
                                <div className="p-3 rounded-md bg-red-500/10 text-red-400 text-[11px] font-mono">{dbQueryResult.error}</div>
                              ) : dbQueryResult.rows.length > 0 ? (
                                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                  <table className="w-full text-[10px]">
                                    <thead><tr className="border-b border-[#222]">{dbQueryResult.columns.map(c => <th key={c} className="text-left py-1 px-2 text-[#888] font-medium sticky top-0 bg-[#111]">{c}</th>)}</tr></thead>
                                    <tbody>{dbQueryResult.rows.slice(0, 200).map((row, i) => <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#161616]">{dbQueryResult.columns.map(c => <td key={c} className="py-1 px-2 text-gray-400 truncate max-w-[200px] font-mono">{String(row[c] ?? 'null')}</td>)}</tr>)}</tbody>
                                  </table>
                                </div>
                              ) : <p className="text-[11px] text-[#555]">Query executed successfully (no rows returned)</p>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ═══ Schema Browser View ═══ */}
                      {dbViewMode === 'schema' && (
                        <div className="space-y-4">
                          {dbSchemaLoading ? (
                            <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p className="text-[11px] text-[#555]">Loading schema...</p></div>
                          ) : dbSchema.length > 0 ? (
                            dbSchema.map(table => (
                              <div key={table.name} className="p-4 rounded-lg border border-[#222] bg-[#111]">
                                <div className="flex items-center gap-2 mb-3">
                                  <DatabaseIcon />
                                  <span className="text-[13px] text-white font-medium">{table.name}</span>
                                  <span className="text-[9px] text-[#555] ml-auto">{table.columns.length} columns</span>
                                </div>
                                <div className="space-y-0.5">
                                  {table.columns.map(col => (
                                    <div key={col.name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors">
                                      <span className={`text-[10px] font-mono ${col.isPrimary ? 'text-amber-400' : col.references ? 'text-blue-400' : 'text-gray-400'}`}>{col.name}</span>
                                      <span className="text-[9px] text-[#555]">{col.type}</span>
                                      {col.isPrimary && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">PK</span>}
                                      {col.references && <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400">FK</span>}
                                      {!col.nullable && <span className="text-[8px] text-red-400/50">NOT NULL</span>}
                                      {col.defaultValue && <span className="text-[8px] text-[#555] ml-auto">{col.defaultValue}</span>}
                                    </div>
                                  ))}
                                </div>
                                {(table.foreignKeys ?? []).length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-[#1e1e1e]">
                                    {(table.foreignKeys ?? []).map((fk, i) => <p key={i} className="text-[9px] text-blue-400/60">{fk.column} → {fk.referencedTable}.{fk.referencedColumn}</p>)}
                                  </div>
                                )}
                                <button onClick={() => setDbSqlInput(`SELECT * FROM ${table.name} LIMIT 20;`)} className="mt-2 px-2 py-1 rounded text-[10px] text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">Query this table</button>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center">
                              <p className="text-[12px] text-[#555]">{dbActiveConnection ? 'No tables found. Run a CREATE TABLE query.' : 'Connect a database to browse schema.'}</p>
                              {dbActiveConnection && <button onClick={() => dbEngineRef.current.getSchema(dbActiveConnection).then(setDbSchema)} className="mt-2 px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] hover:bg-emerald-500/30 transition-colors">Refresh Schema</button>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ═══ Query History View ═══ */}
                      {dbViewMode === 'history' && (
                        <div className="space-y-2">
                          {dbQueryHistory.length > 0 ? dbQueryHistory.map(entry => (
                            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors cursor-pointer group" onClick={() => { setDbSqlInput(entry.sql); setDbViewMode('query'); }}>
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${entry.error ? 'bg-red-400' : 'bg-emerald-400'}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-gray-300 font-mono truncate">{entry.sql}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] text-[#555]">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                  <span className="text-[9px] text-[#555]">{entry.duration}ms</span>
                                  {entry.rowCount !== undefined && <span className="text-[9px] text-[#555]">{entry.rowCount} rows</span>}
                                  {entry.error && <span className="text-[9px] text-red-400 truncate">{entry.error}</span>}
                                </div>
                              </div>
                              <span className="text-[9px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity">Re-run →</span>
                            </div>
                          )) : <p className="text-center text-[12px] text-[#555] py-8">No queries yet. Run a SQL query to see history.</p>}
                        </div>
                      )}

                      {/* ═══ Schema Templates View ═══ */}
                      {dbViewMode === 'templates' && (
                        <div className="space-y-3">
                          <p className="text-[11px] text-[#555]">Apply pre-built database schemas to quickly set up your project.</p>
                          {Object.entries(SCHEMA_TEMPLATES).map(([key, tmpl]) => (
                            <div key={key} className="p-4 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[13px] text-white font-medium">{tmpl.name}</span>
                                <div className="flex gap-1">
                                  <button onClick={() => { setDbSqlInput(tmpl.sql); setDbViewMode('query'); }} className="px-2.5 py-1 rounded-md bg-[#1a1a1a] text-[10px] text-[#888] hover:text-white transition-colors">View SQL</button>
                                  <button onClick={() => runSchemaTemplate(key)} disabled={!dbActiveConnection || dbQueryRunning} className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/30 transition-colors disabled:opacity-30">Apply</button>
                                </div>
                              </div>
                              <p className="text-[10px] text-[#555]">{tmpl.description}</p>
                              <div className="mt-2 flex gap-1 flex-wrap">{tmpl.tables.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[9px] text-[#888]">{t}</span>)}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ═══ Legacy Supabase Connection (if connected) ═══ */}
                      {integrationKeys['Supabase'] ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DatabaseIcon /></div>
                              <div><p className="text-[13px] text-white font-medium">Supabase Connected</p><p className="text-[10px] text-[#555]">Query your database directly from here</p></div>
                            </div>
                            <div className="space-y-2">
                              <div><label className="block text-[10px] text-[#555] mb-1">Project URL</label><input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxxx.supabase.co" className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" /></div>
                              <div><label className="block text-[10px] text-[#555] mb-1">Table Name</label><input type="text" value={supabaseTable} onChange={(e) => setSupabaseTable(e.target.value)} placeholder="users, posts, products..." className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" /></div>
                              <button onClick={runSupabaseQuery} disabled={!supabaseUrl || !supabaseTable || isSupabaseLoading} className="px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-30">{isSupabaseLoading ? 'Querying...' : `SELECT * FROM ${supabaseTable || '...'}`}</button>
                            </div>
                          </div>
                          {supabaseError && <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-[11px]">{supabaseError}</div>}
                          {supabaseResult && (
                            <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                              <p className="text-[10px] text-[#555] mb-2">Results ({Array.isArray(supabaseResult) ? supabaseResult.length : 0} rows)</p>
                              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                {Array.isArray(supabaseResult) && supabaseResult.length > 0 ? (
                                  <table className="w-full text-[10px]">
                                    <thead><tr className="border-b border-[#222]">{Object.keys(supabaseResult[0]).map(k => <th key={k} className="text-left py-1 px-2 text-[#888] font-medium">{k}</th>)}</tr></thead>
                                    <tbody>{supabaseResult.slice(0, 100).map((row, i) => <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#161616]">{Object.values(row).map((v, j) => <td key={j} className="py-1 px-2 text-gray-400 truncate max-w-[200px]">{String(v ?? 'null')}</td>)}</tr>)}</tbody>
                                  </table>
                                ) : <p className="text-[11px] text-[#555]">No rows returned</p>}
                              </div>
                            </div>
                          )}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Supabase auth flow with login/signup pages')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Generate auth flow with Supabase</button>
                              <button onClick={() => sendPrompt('Build a CRUD dashboard that connects to Supabase')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Build a CRUD dashboard</button>
                            </div>
                          </div>
                          <button onClick={() => { setIntegrationKeys(prev => { const next = { ...prev }; delete next['Supabase']; return next; }); setSupabaseResult(null); setSupabaseError(null); }} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">Remove Supabase Key</button>
                        </div>
                      ) : sandboxDb ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[12px] text-amber-400 font-medium">Sandbox Mode</span>
                              </div>
                              <button onClick={() => setSandboxDb(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Exit Sandbox</button>
                            </div>
                            <p className="text-[10px] text-amber-400/60">Mock database with sample data. Connect a real database for live queries.</p>
                          </div>
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DatabaseIcon /></div>
                              <div><p className="text-[13px] text-white font-medium">Sandbox Database</p><p className="text-[10px] text-[#555]">3 tables &middot; {Object.values(SANDBOX_DB).reduce((a, b) => a + b.length, 0)} rows</p></div>
                            </div>
                            <div className="flex gap-2 mb-3">
                              {Object.keys(SANDBOX_DB).map(t => (
                                <button key={t} onClick={() => setSandboxDbTable(t)} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${sandboxDbTable === t ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>{t}</button>
                              ))}
                            </div>
                            <div className="bg-[#0c0c0c] rounded-md border border-[#1e1e1e] px-3 py-1.5 mb-3">
                              <span className="text-[10px] text-emerald-400 font-mono">SELECT * FROM {sandboxDbTable} LIMIT 100;</span>
                            </div>
                            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                              <table className="w-full text-[10px]">
                                <thead><tr className="border-b border-[#222]">{Object.keys(SANDBOX_DB[sandboxDbTable][0]).map(k => <th key={k} className="text-left py-1 px-2 text-[#888] font-medium">{k}</th>)}</tr></thead>
                                <tbody>{SANDBOX_DB[sandboxDbTable].map((row, i) => <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#161616]">{Object.values(row).map((v, j) => <td key={j} className="py-1 px-2 text-gray-400 truncate max-w-[200px]">{String(v ?? 'null')}</td>)}</tr>)}</tbody>
                              </table>
                            </div>
                          </div>
                          {/* Email Sandbox */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/></svg></div>
                                <div><p className="text-[13px] text-white font-medium">Email Sandbox</p><p className="text-[10px] text-[#555]">Test email sending (Resend / SendGrid)</p></div>
                              </div>
                              {!sandboxEmail && <button onClick={() => setSandboxEmail(true)} className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 text-[10px] hover:bg-blue-500/30 transition-colors">Open</button>}
                              {sandboxEmail && <button onClick={() => setSandboxEmail(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Close</button>}
                            </div>
                            {sandboxEmail && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <input type="text" value={sandboxEmailForm.to} onChange={(e) => setSandboxEmailForm(p => ({ ...p, to: e.target.value }))} placeholder="to@example.com" className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" />
                                  <input type="text" value={sandboxEmailForm.subject} onChange={(e) => setSandboxEmailForm(p => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333]" />
                                  <textarea value={sandboxEmailForm.body} onChange={(e) => setSandboxEmailForm(p => ({ ...p, body: e.target.value }))} placeholder="Email body..." rows={3} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] resize-none" />
                                  <button onClick={async () => { if (sandboxEmailForm.to && sandboxEmailForm.subject) { const hasReal = !!(integrationKeys['Resend'] || integrationKeys['SendGrid']); if (hasReal) { const ok = await sendRealEmail(sandboxEmailForm.to, sandboxEmailForm.subject, sandboxEmailForm.body || '<p>No body</p>'); setSandboxEmailLog(prev => [{ id: `em_${Date.now()}`, to: sandboxEmailForm.to, subject: sandboxEmailForm.subject, status: ok ? 'delivered' : 'failed', date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } else { setSandboxEmailLog(prev => [{ id: `em_${Date.now()}`, to: sandboxEmailForm.to, subject: sandboxEmailForm.subject, status: 'delivered', date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } setSandboxEmailForm({ to: '', subject: '', body: '' }); } }} disabled={!sandboxEmailForm.to || !sandboxEmailForm.subject} className="px-3 py-1.5 rounded-md bg-blue-500/20 text-blue-400 text-[11px] font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-30">{integrationKeys['Resend'] || integrationKeys['SendGrid'] ? 'Send (Real)' : 'Send (Sandbox)'}</button>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-[#555]">Sent ({sandboxEmailLog.length})</p>
                                  {sandboxEmailLog.map(em => (
                                    <div key={em.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${em.status === 'delivered' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                        <span className="text-[10px] text-gray-400 truncate">{em.to}</span>
                                        <span className="text-[10px] text-[#555] truncate">{em.subject}</span>
                                      </div>
                                      <span className="text-[9px] text-[#555] shrink-0 ml-2">{em.date}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Supabase auth flow with login/signup pages')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Generate auth flow with Supabase</button>
                              <button onClick={() => sendPrompt('Build a CRUD dashboard that connects to Supabase')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Build a CRUD dashboard</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Sandbox CTA */}
                          <button onClick={() => setSandboxDb(true)} className="w-full p-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                              <div>
                                <p className="text-[13px] text-amber-400 font-medium group-hover:text-amber-300 transition-colors">Try Sandbox Mode</p>
                                <p className="text-[10px] text-[#555]">Explore database queries + email sending with mock data</p>
                              </div>
                            </div>
                          </button>
                          {INTEGRATIONS.filter(i => i.cat === 'Database').map(intg => (
                            <div key={intg.name} className="p-4 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><DatabaseIcon /></div>
                                  <div><p className="text-[13px] text-white font-medium">{intg.name}</p><p className="text-[11px] text-[#555]">{intg.desc}</p></div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${integrationKeys[intg.name] ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                              </div>
                              {editingIntegration === intg.name ? (
                                <div className="space-y-2 mt-2">
                                  {intg.name === 'Supabase' && (
                                    <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxxx.supabase.co" className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444] font-mono" />
                                  )}
                                  <div className="flex gap-2">
                                    <input type="password" placeholder={intg.keyPlaceholder} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); if (intg.name === 'Supabase' && supabaseUrl) localStorage.setItem('aurion_supabase_url', supabaseUrl); } }} />
                                    <button onClick={() => setEditingIntegration(null)} className="px-2.5 py-1.5 rounded-md border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setEditingIntegration(intg.name)} className="mt-2 px-3 py-1.5 rounded-md bg-white text-black text-[11px] font-medium hover:bg-gray-200 transition-colors">
                                  {integrationKeys[intg.name] ? 'Reconnect' : 'Connect'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : activeTab === 'payments' ? (
                  <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto bg-[#0c0c0c]">
                    <div className="max-w-2xl mx-auto p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-1">Payments</h2>
                          <p className="text-[12px] text-[#555]">Payment processing for your app</p>
                        </div>
                        {integrationKeys['Stripe'] && <span className="px-2 py-1 rounded-md bg-purple-400/10 text-purple-400 text-[10px]">Connected</span>}
                      </div>
                      {integrationKeys['Stripe'] ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><PaymentsIcon /></div>
                                <div><p className="text-[13px] text-white font-medium">Stripe Connected</p><p className="text-[10px] text-[#555]">{integrationKeys['Stripe'].startsWith('sk_live') ? 'Live mode' : 'Test mode'}</p></div>
                              </div>
                              <button onClick={fetchStripeData} disabled={isStripeLoading} className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-400 text-[10px] hover:bg-purple-500/30 transition-colors disabled:opacity-30">{isStripeLoading ? 'Loading...' : 'Fetch Data'}</button>
                            </div>
                            {stripeBalance && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                  <p className="text-[10px] text-[#555] mb-1">Available</p>
                                  <span className="text-[13px] text-emerald-400 font-medium">${(stripeBalance.available / 100).toFixed(2)}</span>
                                </div>
                                <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                  <p className="text-[10px] text-[#555] mb-1">Pending</p>
                                  <span className="text-[13px] text-amber-400 font-medium">${(stripeBalance.pending / 100).toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          {stripeError && <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-[11px]">{stripeError}</div>}
                          {stripeProducts.length > 0 && (
                            <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                              <p className="text-[10px] text-[#555] mb-2">Products ({stripeProducts.length})</p>
                              <div className="space-y-1.5">
                                {stripeProducts.map((p: unknown) => {
                                  const prod = p as { id: string; name: string; active: boolean };
                                  return (
                                    <div key={prod.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                      <span className="text-[11px] text-gray-300">{prod.name}</span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${prod.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#333] text-[#888]'}`}>{prod.active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Stripe checkout page with a pricing table using my Stripe key')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Generate a checkout page</button>
                              <button onClick={() => sendPrompt('Create a subscription pricing page with 3 tiers using Stripe')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Build a pricing page</button>
                            </div>
                          </div>
                          <button onClick={() => { setIntegrationKeys(prev => { const next = { ...prev }; delete next['Stripe']; return next; }); setStripeBalance(null); setStripeProducts([]); setStripeError(null); }} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">Remove Stripe Key</button>
                        </div>
                      ) : sandboxPay ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[12px] text-amber-400 font-medium">Sandbox Mode</span>
                              </div>
                              <button onClick={() => setSandboxPay(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Exit Sandbox</button>
                            </div>
                            <p className="text-[10px] text-amber-400/60">Mock payment data. Connect a real Stripe key for live data.</p>
                          </div>
                          {/* Mock Balance */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><PaymentsIcon /></div>
                              <div><p className="text-[13px] text-white font-medium">Stripe Sandbox</p><p className="text-[10px] text-[#555]">Test mode &middot; sk_test_sandbox</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                <p className="text-[10px] text-[#555] mb-1">Available</p>
                                <span className="text-[13px] text-emerald-400 font-medium">${(SANDBOX_STRIPE.balance.available / 100).toFixed(2)}</span>
                              </div>
                              <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                <p className="text-[10px] text-[#555] mb-1">Pending</p>
                                <span className="text-[13px] text-amber-400 font-medium">${(SANDBOX_STRIPE.balance.pending / 100).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          {/* Mock Products */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[10px] text-[#555] mb-2">Products ({SANDBOX_STRIPE.products.length})</p>
                            <div className="space-y-1.5">
                              {SANDBOX_STRIPE.products.map(prod => (
                                <div key={prod.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                  <span className="text-[11px] text-gray-300">{prod.name}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${prod.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#333] text-[#888]'}`}>{prod.active ? 'Active' : 'Inactive'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Mock Transactions */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[10px] text-[#555] mb-2">Recent Transactions ({SANDBOX_STRIPE.transactions.length})</p>
                            <div className="space-y-1.5">
                              {SANDBOX_STRIPE.transactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'succeeded' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    <span className="text-[10px] text-gray-400">{tx.customer}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-white font-medium">${(tx.amount / 100).toFixed(2)}</span>
                                    <span className="text-[9px] text-[#555]">{tx.date}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Messaging Sandbox */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                                <div><p className="text-[13px] text-white font-medium">Messaging Sandbox</p><p className="text-[10px] text-[#555]">Test Slack / Discord / Twilio messaging</p></div>
                              </div>
                              {!sandboxMsg && <button onClick={() => setSandboxMsg(true)} className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-[10px] hover:bg-cyan-500/30 transition-colors">Open</button>}
                              {sandboxMsg && <button onClick={() => setSandboxMsg(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Close</button>}
                            </div>
                            {sandboxMsg && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    {['Slack', 'Discord', 'Twilio'].map(p => (
                                      <button key={p} onClick={() => setSandboxMsgForm(f => ({ ...f, platform: p }))} className={`px-2.5 py-1 rounded-md text-[10px] transition-colors ${sandboxMsgForm.platform === p ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>{p}</button>
                                    ))}
                                  </div>
                                  <input type="text" value={sandboxMsgForm.channel} onChange={(e) => setSandboxMsgForm(p => ({ ...p, channel: e.target.value }))} placeholder={sandboxMsgForm.platform === 'Twilio' ? '+1 555-0123' : '#channel-name'} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" />
                                  <textarea value={sandboxMsgForm.text} onChange={(e) => setSandboxMsgForm(p => ({ ...p, text: e.target.value }))} placeholder="Message..." rows={2} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] resize-none" />
                                  <button onClick={async () => { if (sandboxMsgForm.channel && sandboxMsgForm.text) { const hasReal = !!integrationKeys[sandboxMsgForm.platform]; if (hasReal) { const ok = await sendRealMessage(sandboxMsgForm.platform, sandboxMsgForm.channel, sandboxMsgForm.text); setSandboxMsgLog(prev => [{ id: `msg_${Date.now()}`, channel: sandboxMsgForm.channel, text: sandboxMsgForm.text, platform: sandboxMsgForm.platform + (ok ? '' : ' ✗'), date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } else { setSandboxMsgLog(prev => [{ id: `msg_${Date.now()}`, channel: sandboxMsgForm.channel, text: sandboxMsgForm.text, platform: sandboxMsgForm.platform, date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } setSandboxMsgForm(f => ({ ...f, channel: '', text: '' })); } }} disabled={!sandboxMsgForm.channel || !sandboxMsgForm.text} className="px-3 py-1.5 rounded-md bg-cyan-500/20 text-cyan-400 text-[11px] font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-30">{integrationKeys[sandboxMsgForm.platform] ? `Send via ${sandboxMsgForm.platform}` : 'Send (Sandbox)'}</button>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-[#555]">Messages ({sandboxMsgLog.length})</p>
                                  {sandboxMsgLog.map(msg => (
                                    <div key={msg.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 shrink-0">{msg.platform}</span>
                                        <span className="text-[10px] text-gray-400 truncate">{msg.channel}</span>
                                        <span className="text-[10px] text-[#555] truncate">{msg.text}</span>
                                      </div>
                                      <span className="text-[9px] text-[#555] shrink-0 ml-2">{msg.date}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Stripe checkout page with a pricing table using my Stripe key')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Generate a checkout page</button>
                              <button onClick={() => sendPrompt('Create a subscription pricing page with 3 tiers using Stripe')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Build a pricing page</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Sandbox CTA */}
                          <button onClick={() => setSandboxPay(true)} className="w-full p-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                              <div>
                                <p className="text-[13px] text-amber-400 font-medium group-hover:text-amber-300 transition-colors">Try Sandbox Mode</p>
                                <p className="text-[10px] text-[#555]">Explore payments dashboard + messaging with mock data</p>
                              </div>
                            </div>
                          </button>
                          {INTEGRATIONS.filter(i => i.cat === 'Payments').map(intg => (
                            <div key={intg.name} className="p-4 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><PaymentsIcon /></div>
                                  <div><p className="text-[13px] text-white font-medium">{intg.name}</p><p className="text-[11px] text-[#555]">{intg.desc}</p></div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${integrationKeys[intg.name] ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                              </div>
                              {editingIntegration === intg.name ? (
                                <div className="flex gap-2 mt-2">
                                  <input type="password" placeholder={intg.keyPlaceholder} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); }} />
                                  <button onClick={() => setEditingIntegration(null)} className="px-2.5 py-1.5 rounded-md border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => setEditingIntegration(intg.name)} className="mt-2 px-3 py-1.5 rounded-md bg-white text-black text-[11px] font-medium hover:bg-gray-200 transition-colors">
                                  {integrationKeys[intg.name] ? 'Reconnect' : 'Connect'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : activeTab === 'ide' ? (
                  <motion.div key="ide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col bg-[#0c0c0c]">
                    {ideStatus === 'live' && ideUrl ? (
                      <div className="flex-1 flex flex-col h-full">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] border-b border-[#1a1a1a]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] text-[#888] font-medium">VS Code IDE</span>
                            <span className="text-[9px] text-[#333]">•</span>
                            <span className="text-[9px] text-[#444] truncate max-w-[200px]">{ideUrl}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { const url = ideUrl?.endsWith('/') ? ideUrl : ideUrl + '/'; window.open(url, '_blank'); }} className="px-2 py-0.5 rounded bg-[#161616] border border-[#222] text-[9px] text-[#666] hover:text-white hover:border-[#444] transition-all" title="Open in new tab">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </button>
                            <button onClick={async () => { if (!ideServiceId) return; setIdeLoading(true); try { await fetch('/api/render?serviceId=' + ideServiceId, { method: 'DELETE' }); setIdeServiceId(null); setIdeUrl(null); setIdeStatus('none'); } catch {} setIdeLoading(false); }} className="px-2 py-0.5 rounded bg-[#161616] border border-red-500/20 text-[9px] text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-all" title="Stop IDE">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                            </button>
                          </div>
                        </div>
                        <iframe src={ideUrl} className="flex-1 w-full border-0" allow="clipboard-read; clipboard-write" style={{ minHeight: 0 }} />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                          <div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
                        </div>
                        <div className="text-center">
                          <p className="text-[13px] text-white font-medium mb-1">Launching IDE...</p>
                          <p className="text-[11px] text-[#555]">Deploying code-server on Render — this usually takes 1-3 minutes</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                          <span className="text-[10px] text-yellow-500/80">{ideStatus === 'creating' ? 'Creating service...' : ideStatus === 'booting' ? `Starting code-server... ${ideCountdown}s remaining` : ideStatus === 'error' ? ideError || 'Error' : 'Waiting for deployment...'}</span>
                        </div>
                        {ideStatus === 'error' && (
                          <button onClick={() => { setIdeStatus('none'); setIdeError(null); }} className="px-4 py-1.5 rounded-lg bg-[#161616] border border-[#333] text-[11px] text-[#888] hover:text-white hover:border-[#555] transition-all">
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Integrations side panel */}
            <AnimatePresence>
              {showIntegrations && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="integration-side-panel h-full border-l border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden shrink-0">
                  <div className="w-[300px] h-full flex flex-col">
                    <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between shrink-0">
                      <h3 className="text-[13px] font-medium text-white">Integrations</h3>
                      <button onClick={() => setShowIntegrations(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {INTEGRATIONS.map((intg) => {
                        const isConnected = intg.builtIn || !!integrationKeys[intg.name];
                        return (
                          <div key={intg.name} className="rounded-md hover:bg-[#161616] transition-colors">
                            {editingIntegration === intg.name ? (
                              <div className="px-3 py-2.5">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[12px] text-white">{intg.name}</span>
                                  <span className="text-[9px] text-[#444]">{intg.cat}</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <input type="password" placeholder={intg.keyPlaceholder || 'API Key'} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingIntegration(null); }} />
                                  <button onClick={() => setEditingIntegration(null)} className="px-2 py-1.5 rounded-md text-[10px] text-[#888] hover:text-white border border-[#2a2a2a] transition-colors">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => !intg.builtIn && setEditingIntegration(intg.name)} className="w-full flex items-center gap-3 px-3 py-2 text-left cursor-default">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] text-white">{intg.name}</span>
                                    <span className="text-[9px] text-[#444]">{intg.cat}</span>
                                  </div>
                                  <p className="text-[10px] text-[#555] truncate">{intg.desc}</p>
                                  {testResult[intg.name] && (
                                    <p className={`text-[9px] mt-0.5 ${testResult[intg.name].ok ? 'text-emerald-400' : 'text-red-400'}`}>{testResult[intg.name].msg}</p>
                                  )}
                                </div>
                                {isConnected && !intg.builtIn && INTEGRATION_ROUTE_MAP[intg.name] ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); testIntegration(intg.name); }}
                                    disabled={testingIntegration === intg.name}
                                    className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition-colors shrink-0 disabled:opacity-50"
                                  >
                                    {testingIntegration === intg.name ? '...' : 'Test'}
                                  </button>
                                ) : isConnected ? (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 shrink-0">{intg.builtIn ? 'built-in' : 'connected'}</span>
                                ) : (
                                  <span className="text-[9px] text-[#555] shrink-0 hover:text-white cursor-pointer">connect</span>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* NotebookLM Research + Claude Code Panel */}
            <AnimatePresence>
              {showResearchPanel && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="h-full border-l border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden shrink-0">
                  <div className="w-[340px] h-full flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        <h3 className="text-[13px] font-medium text-white">Research & Analysis</h3>
                      </div>
                      <button onClick={() => setShowResearchPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    </div>

                    {/* Toggles */}
                    <div className="px-4 py-3 border-b border-[#1e1e1e] space-y-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                          <span className="text-[11px] text-[#ccc]">NotebookLM Research</span>
                        </div>
                        <button onClick={() => setResearchMode(!researchMode)} className={`w-8 h-4 rounded-full transition-all relative ${researchMode ? 'bg-violet-500' : 'bg-[#333]'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${researchMode ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
                          <span className="text-[11px] text-[#ccc]">Jarvis Brain</span>
                        </div>
                        <button onClick={() => setClaudeCodeMode(!claudeCodeMode)} className={`w-8 h-4 rounded-full transition-all relative ${claudeCodeMode ? 'bg-orange-500' : 'bg-[#333]'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${claudeCodeMode ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Search/Research Input */}
                    <div className="px-4 py-3 border-b border-[#1e1e1e] shrink-0">
                      <div className="flex items-center gap-2">
                        <input
                          value={researchQuery}
                          onChange={(e) => setResearchQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && researchQuery.trim()) performResearch(researchQuery); }}
                          placeholder="Research any topic..."
                          className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[11px] text-white placeholder-[#555] outline-none focus:border-violet-500/50 transition-colors"
                        />
                        <button
                          onClick={() => researchQuery.trim() && performResearch(researchQuery)}
                          disabled={isResearching || !researchQuery.trim()}
                          className="px-3 py-2 rounded-lg bg-violet-500/20 text-violet-400 text-[11px] font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-30"
                        >
                          {isResearching ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full" />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          )}
                        </button>
                      </div>
                      {researchError && (
                        <p className="text-[10px] text-red-400 mt-2">{researchError}</p>
                      )}
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                      {researchResults ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-white">{researchResults.topic}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
                              {(researchResults.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          <div className="text-[10px] text-[#666]">{researchResults.sources} sources analyzed</div>

                          {researchResults.insights.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">Key Insights</span>
                              {researchResults.insights.slice(0, 5).map((insight, i) => (
                                <div key={i} className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[10px] text-[#bbb] leading-relaxed">
                                  {insight.slice(0, 300)}{insight.length > 300 ? '...' : ''}
                                </div>
                              ))}
                            </div>
                          )}

                          {researchResults.summary && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">Summary</span>
                              <div className="p-2 rounded-lg bg-violet-500/5 border border-violet-500/20 text-[10px] text-[#bbb] leading-relaxed">
                                {researchResults.summary.slice(0, 500)}{researchResults.summary.length > 500 ? '...' : ''}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setResearchResults(null);
                              setResearchContext('');
                              setResearchQuery('');
                            }}
                            className="w-full py-2 rounded-lg border border-[#333] text-[10px] text-[#666] hover:text-white hover:border-[#555] transition-colors"
                          >
                            Clear Research
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#333] mb-3"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                          <span className="text-[11px] text-[#555] mb-1">No research active</span>
                          <span className="text-[10px] text-[#444]">Search any topic to enhance AI generation with deep research and analysis</span>
                        </div>
                      )}

                      {/* Jarvis Brain Status */}
                      {claudeCodeMode && (
                        <div className="mt-4 space-y-2">
                          <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">Jarvis Brain — Central Orchestrator</span>
                          <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/5 to-red-500/5 border border-orange-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                              <span className="text-[11px] text-orange-400 font-medium">🧠 Jarvis Active — 19 Subsystems</span>
                            </div>
                            <ul className="space-y-1 text-[10px] text-[#888]">
                              <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> AI Models: Claude, Gemini, Groq, OpenAI</li>
                              <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Design: Stitch, 21st.dev, 67 styles, 96 palettes</li>
                              <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Components: ReactBits 135+, templates 22+</li>
                              <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Research: NotebookLM deep analysis</li>
                              <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Media: LTX Video, Gemini Images</li>
                              <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Quality: 9 gates, smart retry, 128K output</li>
                              <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Deploy: Vercel, GitHub, Terminal</li>
                              <li className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Clone: Firecrawl + design token extraction</li>
                            </ul>
                          </div>

                          {/* Active Jarvis Plan */}
                          {jarvisPlan && (
                            <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-medium text-white">Current Plan</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                                  {jarvisPlan.completedTasks}/{jarvisPlan.totalTasks}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#888] mb-2">{jarvisPlan.goal.slice(0, 80)}</p>
                              <div className="space-y-1">
                                {jarvisPlan.tasks.slice(0, 5).map((task) => (
                                  <div key={task.id} className="flex items-center gap-1.5 text-[9px]">
                                    <span>{task.status === 'completed' ? '✅' : task.status === 'running' ? '⚡' : task.status === 'failed' ? '❌' : '○'}</span>
                                    <span className={task.status === 'completed' ? 'text-[#555] line-through' : task.status === 'running' ? 'text-orange-400' : 'text-[#888]'}>{task.description.slice(0, 50)}</span>
                                  </div>
                                ))}
                              </div>
                              {/* Progress bar */}
                              <div className="mt-2 h-1 rounded-full bg-[#222] overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all" style={{ width: `${jarvisPlan.totalTasks > 0 ? (jarvisPlan.completedTasks / jarvisPlan.totalTasks) * 100 : 0}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Subsystem Quick Actions */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['anthropic', 'stitch', 'notebooklm', 'reactbits', '21stdev', 'firecrawl'] as const).map(sys => (
                              <button key={sys} onClick={() => setInput(prev => `${prev} [USE: ${sys}] `)} className="p-1.5 rounded-lg bg-[#1a1a1a] border border-[#222] hover:border-orange-500/30 text-[8px] text-[#666] hover:text-orange-400 transition-all text-center truncate">
                                {sys === 'anthropic' ? '🤖 Claude' : sys === 'stitch' ? '🎨 Stitch' : sys === 'notebooklm' ? '📚 Research' : sys === 'reactbits' ? '⚡ ReactBits' : sys === '21stdev' ? '✨ 21st.dev' : '🕷️ Scrape'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Integration Status */}
                      <div className="mt-4 space-y-2">
                        <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">Intelligence Status</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className={`p-2 rounded-lg border text-center ${researchMode ? 'border-violet-500/30 bg-violet-500/5' : 'border-[#222] bg-[#1a1a1a]'}`}>
                            <div className={`text-[10px] font-medium ${researchMode ? 'text-violet-400' : 'text-[#555]'}`}>NotebookLM</div>
                            <div className="text-[9px] text-[#666] mt-0.5">{researchMode ? 'Active' : 'Off'}</div>
                          </div>
                          <div className={`p-2 rounded-lg border text-center ${claudeCodeMode ? 'border-orange-500/30 bg-orange-500/5' : 'border-[#222] bg-[#1a1a1a]'}`}>
                            <div className={`text-[10px] font-medium ${claudeCodeMode ? 'text-orange-400' : 'text-[#555]'}`}>Jarvis Brain</div>
                            <div className="text-[9px] text-[#666] mt-0.5">{claudeCodeMode ? '19 Systems' : 'Off'}</div>
                          </div>
                        </div>
                        {researchMode && claudeCodeMode && (
                          <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500/10 to-orange-500/10 border border-[#333] text-center">
                            <span className="text-[10px] font-medium bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">🧠 JARVIS GOD MODE</span>
                            <p className="text-[9px] text-[#666] mt-0.5">Research-enhanced + 19 subsystem orchestration</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Terminal resize handle */}
          <div
            className="h-[4px] w-full cursor-row-resize hover:bg-[#444] active:bg-[#555] transition-colors shrink-0 z-10"
            onMouseDown={() => { termDragRef.current = true; document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; }}
          />

          {/* Terminal */}
          <div style={{ height: showTerminal ? terminalHeight : 32 }} className="border-t border-[#1e1e1e] bg-[#0c0c0c] flex flex-col shrink-0 transition-[height] duration-100">
            <button onClick={() => setShowTerminal(!showTerminal)} className="h-[32px] shrink-0 px-4 flex items-center justify-between text-[11px] text-[#555] hover:text-[#888] transition-colors w-full">
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                <span>Terminal</span>
                {runtimeErrors.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">{runtimeErrors.length} error{runtimeErrors.length > 1 ? 's' : ''}</span>}
              </div>
              <div className="flex items-center gap-2">
                {/* Auto-Fix toggle */}
                <div onClick={(e) => { e.stopPropagation(); setAutoFixEnabled(!autoFixEnabled); }} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors cursor-pointer ${autoFixEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a1a] text-[#555] hover:text-[#888]'}`} title="Auto-fix runtime errors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  Auto-Fix {autoFixEnabled ? 'ON' : 'OFF'}
                </div>
                {runtimeErrors.length > 0 && <div onClick={(e) => { e.stopPropagation(); setRuntimeErrors([]); }} className="text-[9px] text-[#555] hover:text-white cursor-pointer px-1">Clear</div>}
                {showTerminal ? <ChevronDownIcon /> : <ChevronUpIcon />}
                <PlusIcon />
              </div>
            </button>
            {showTerminal && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* WebContainer status bar */}
                <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#1a1a1a] text-[10px]">
                  <div className={`w-1.5 h-1.5 rounded-full ${webContainer.state.status === 'ready' ? 'bg-emerald-400' : webContainer.state.status === 'booting' ? 'bg-yellow-400 animate-pulse' : webContainer.state.status === 'error' ? 'bg-red-400' : 'bg-[#555]'}`} />
                  <span className="text-[#555]">WebContainer: {webContainer.state.status}</span>
                  {webContainer.previewUrl && <span className="text-emerald-400/60 ml-auto truncate max-w-[120px]">{webContainer.previewUrl}</span>}
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => setShowTestRunner(true)} className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="Test Runner">🧪</button>
                    <button onClick={() => { webContainer.startDevServer(); }} className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="npm run dev">▶</button>
                    <select value={outputFramework} onChange={e => setOutputFramework(e.target.value as typeof outputFramework)} className="bg-[#1a1a1a] text-[#555] text-[9px] rounded px-1 py-0.5 outline-none border-none cursor-pointer" title="Output framework">
                      <option value="html">HTML</option>
                      <option value="react">React</option>
                      <option value="nextjs">Next.js</option>
                      <option value="vue">Vue</option>
                      <option value="svelte">Svelte</option>
                      <option value="angular">Angular</option>
                      <option value="python">Python</option>
                      <option value="fullstack">Full-Stack</option>
                    </select>
                  </div>
                </div>
                {/* Error panel — shows clickable runtime errors with Fix button */}
                {runtimeErrors.length > 0 && (
                  <div className="border-b border-[#1a1a1a] px-4 py-1.5 max-h-[120px] overflow-y-auto">
                    {runtimeErrors.slice(-5).map((err, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 group">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span className="text-[10px] text-red-400/90 flex-1 font-mono leading-4 break-all">{err.message}{err.line ? <span className="text-[#555]"> :L{err.line}</span> : ''}</span>
                        <button
                          onClick={() => fixRuntimeError(err)}
                          disabled={isStreaming}
                          className="shrink-0 text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
                        >
                          Fix
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex-1 overflow-auto px-4 pb-1 font-mono text-[11px] text-[#888]" onClick={() => terminalInputRef.current?.focus()}>
                  {terminalLines.map((line, i) => (
                    <div key={i} className={`leading-5 ${line.startsWith('$') ? 'text-[#ccc]' : line.startsWith('command not found') ? 'text-red-400' : line.startsWith('✗') || line.startsWith('❌') ? 'text-red-400' : line.startsWith('⚠ ') ? 'text-yellow-400' : line.startsWith('ℹ ') || line.startsWith('✅') || line.startsWith('📦') || line.startsWith('🚀') || line.startsWith('📁') || line.startsWith('⚡') || line.startsWith('🧪') || line.startsWith('🖥️') ? 'text-blue-400' : line.includes('PASS') || line.includes('✓') ? 'text-emerald-400' : line.includes('FAIL') || line.includes('Error') || line.includes('ERR!') ? 'text-red-400' : line.includes('WARN') || line.includes('warn') ? 'text-yellow-400' : ''}`}>{line}</div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
                <div className="flex items-center gap-1 px-4 pb-2 font-mono text-[11px]">
                  <span className="text-emerald-400">$</span>
                  <input
                    ref={terminalInputRef}
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { runTerminalCommand(terminalInput); }
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        const cmds = ['clear','help','ls','cat','touch','rm','mkdir','tree','pwd','whoami','date','echo','npm','git','env','node','grep','find','cp','mv','head','tail','wc','which','uptime','hostname','history','stat','diff','du','sort','uniq'];
                        const match = cmds.filter(c => c.startsWith(terminalInput.trim().toLowerCase()));
                        if (match.length === 1) setTerminalInput(match[0] + ' ');
                        else if (match.length > 1) setTerminalLines(prev => [...prev, '$ ' + terminalInput, match.join('  ')]);
                      }
                      if (e.key === 'ArrowUp') { e.preventDefault(); if (terminalHistory.length > 0) { const idx = historyIdx < 0 ? terminalHistory.length - 1 : Math.max(0, historyIdx - 1); setHistoryIdx(idx); setTerminalInput(terminalHistory[idx]); } }
                      if (e.key === 'ArrowDown') { e.preventDefault(); if (historyIdx >= 0) { const idx = historyIdx + 1; if (idx >= terminalHistory.length) { setHistoryIdx(-1); setTerminalInput(''); } else { setHistoryIdx(idx); setTerminalInput(terminalHistory[idx]); } } }
                    }}
                    className="flex-1 bg-transparent outline-none text-[#ccc] placeholder-[#555] caret-emerald-400"
                    placeholder="Type a command..."
                    spellCheck={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* ═══ Backend Generator Modal ═══ */}
      <AnimatePresence>
        {showBackendGenerator && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowBackendGenerator(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-white">Backend Generator</h2>
                  <p className="text-[10px] text-[#555] mt-0.5">Generate production-ready backend code</p>
                </div>
                <button onClick={() => setShowBackendGenerator(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-[11px] text-[#888] mb-1.5">Preset</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(BackendGenerator.presets).map(([key, config]) => (
                      <button key={key} onClick={() => setBackendPreset(key)} className={`p-3 rounded-lg border text-left transition-colors ${backendPreset === key ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-[#222] bg-[#111] hover:border-[#333]'}`}>
                        <p className={`text-[12px] font-medium ${backendPreset === key ? 'text-emerald-400' : 'text-white'}`}>{key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                        <p className="text-[9px] text-[#555] mt-0.5">{config.framework} &middot; {config.database} &middot; {config.features.length} features</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">{config.features.slice(0, 4).map(f => <span key={f} className="px-1 py-0.5 rounded bg-[#1a1a1a] text-[8px] text-[#888]">{f}</span>)}{config.features.length > 4 && <span className="text-[8px] text-[#555]">+{config.features.length - 4}</span>}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-[#888] mb-1.5">Main Entity Name</label>
                  <input type="text" value={backendEntityName} onChange={(e) => setBackendEntityName(e.target.value)} placeholder="items, products, posts..." className="w-full bg-[#111] border border-[#2a2a2a] rounded-md px-3 py-2 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" />
                </div>
                {backendGeneratedFiles.length > 0 && (
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] text-emerald-400 mb-1.5">Generated {backendGeneratedFiles.length} files:</p>
                    <div className="space-y-0.5 max-h-[120px] overflow-y-auto">{backendGeneratedFiles.map(f => <p key={f.path} className="text-[10px] text-[#888] font-mono truncate">+ {f.path}</p>)}</div>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-[#222] flex justify-end gap-2 shrink-0">
                <button onClick={() => setShowBackendGenerator(false)} className="px-4 py-2 rounded-md border border-[#2a2a2a] text-[12px] text-[#888] hover:text-white transition-colors">Cancel</button>
                <button onClick={generateBackend} className="px-4 py-2 rounded-md bg-emerald-500 text-black text-[12px] font-medium hover:bg-emerald-400 transition-colors">Generate Backend</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Clone Website Modal ═══ */}
      <AnimatePresence>
        {showCloneModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowCloneModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Clone Website</h2>
                <button onClick={() => setShowCloneModal(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 focus-within:border-[#444] transition-colors">
                  <LinkIcon />
                  <input type="url" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') cloneWebsite(); }} placeholder="https://example.com" className="flex-1 bg-transparent outline-none text-sm text-gray-300 placeholder-[#555] ml-2" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: 'Stripe', url: 'https://stripe.com' }, { label: 'Linear', url: 'https://linear.app' }, { label: 'Vercel', url: 'https://vercel.com' }].map((ex) => (
                    <button key={ex.label} onClick={() => setCloneUrl(ex.url)} className="px-3 py-2 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111] text-xs text-[#888] hover:text-white transition-colors text-center">{ex.label}</button>
                  ))}
                </div>
                {isCloning ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#2a2a2a]">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span className="text-[12px] text-white">{cloneProgress || 'Cloning...'}</span>
                    </div>
                    <button onClick={stopClone} className="w-full py-2.5 rounded-lg border border-[#2a2a2a] text-[#888] text-sm hover:text-white transition-colors">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => cloneWebsite()} disabled={!cloneUrl.trim()} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">Clone</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ GitHub Modal ═══ */}
      <AnimatePresence>
        {showGitHubModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowGitHubModal(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Push to GitHub</h2>
                <button onClick={() => setShowGitHubModal(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-3">
                <div><label className="block text-[12px] text-[#888] mb-1.5">GitHub Token</label><input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_..." className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" /></div>
                <div><label className="block text-[12px] text-[#888] mb-1.5">Repository Name</label><input type="text" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="my-aurion-app" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" /></div>
                <button disabled={!githubToken.trim() || !repoName.trim() || isGitHubPushing || Object.keys(projectFiles).length === 0} onClick={pushToGitHub} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium transition-colors disabled:opacity-20 hover:bg-gray-200">{isGitHubPushing ? 'Pushing...' : `Push ${Object.keys(projectFiles).length} files`}</button>
                {Object.keys(projectFiles).length === 0 && <p className="text-[10px] text-[#555] text-center mt-1">Build something first — no files to push</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Command Palette (Cmd+K) ═══ */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowCommandPalette(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={commandInputRef} value={commandQuery} onChange={(e) => { setCommandQuery(e.target.value); setCommandIdx(0); }} placeholder="Type a command..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setCommandIdx(i => Math.min(i + 1, commands.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setCommandIdx(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter' && commands.length > 0) { commands[commandIdx]?.action(); setShowCommandPalette(false); }
                }} />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">ESC</span>
              </div>
              <div className="max-h-[340px] overflow-y-auto py-1">
                {(() => {
                  let lastCat = '';
                  let flatIdx = -1;
                  return commands.map((cmd) => {
                    flatIdx++;
                    const idx = flatIdx;
                    const showCat = cmd.category !== lastCat;
                    lastCat = cmd.category;
                    return (
                      <div key={cmd.id}>
                        {showCat && <div className="px-4 pt-2 pb-1 text-[9px] font-medium text-[#555] uppercase tracking-wider">{cmd.category}</div>}
                        <button onClick={() => { cmd.action(); setShowCommandPalette(false); }} onMouseEnter={() => setCommandIdx(idx)} className={`w-full flex items-center justify-between px-4 py-2 text-[12px] transition-colors ${idx === commandIdx ? 'bg-[#222] text-white' : 'text-[#ccc] hover:bg-[#1e1e1e]'}`}>
                          <span>{cmd.label}</span>
                          {cmd.shortcut && <span className="text-[10px] text-[#555]">{cmd.shortcut}</span>}
                        </button>
                      </div>
                    );
                  });
                })()}
                {commands.length === 0 && <div className="px-4 py-3 text-[12px] text-[#555]">No matching commands</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ File Search (Cmd+P) ═══ */}
      <AnimatePresence>
        {showFileSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowFileSearch(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <input ref={fileSearchRef} value={fileSearchQuery} onChange={(e) => setFileSearchQuery(e.target.value)} placeholder="Go to file..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && fileSearchResults.length > 0) { setSelectedFile(fileSearchResults[0]); setActiveTab('code'); setShowFileSearch(false); } }} />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">⌘P</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto py-1">
                {fileSearchResults.map((f) => (
                  <button key={f} onClick={() => { setSelectedFile(f); setActiveTab('code'); setShowFileSearch(false); }} className={`w-full flex items-center gap-2 px-4 py-2 text-[12px] hover:bg-[#222] transition-colors ${f === selectedFile ? 'text-white' : 'text-[#ccc]'}`}>
                    <FileIcon size={12} />
                    <span className="truncate">{f}</span>
                    <span className="text-[9px] text-[#555] ml-auto">{projectFiles[f]?.language}</span>
                  </button>
                ))}
                {fileSearchResults.length === 0 && <div className="px-4 py-3 text-[12px] text-[#555]">No files found</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Component Palette ═══ */}
      <AnimatePresence>
        {showComponentPalette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowComponentPalette(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17.5h7M17.5 14v7"/></svg>
                  <h2 className="text-sm font-semibold text-white">Insert Component</h2>
                </div>
                <button onClick={() => setShowComponentPalette(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3 grid grid-cols-2 gap-2">
                {COMPONENTS.map(comp => (
                  <button key={comp.name} onClick={() => insertComponent(comp.code)} className="text-left p-3 rounded-lg bg-[#111] border border-[#222] hover:border-[#444] hover:bg-[#161616] transition-all group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-white">{comp.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#666]">{comp.cat}</span>
                    </div>
                    <div className="text-[10px] text-[#555] font-mono line-clamp-2 leading-4">{comp.code.slice(0, 80)}...</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Conversation History ═══ */}
      <AnimatePresence>
        {showConversationHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowConversationHistory(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                  <h2 className="text-sm font-semibold text-white">Conversation History</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{conversations.length}</span>
                </div>
                <button onClick={() => setShowConversationHistory(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[12px] text-[#555]">No saved conversations yet</div>
                ) : conversations.sort((a, b) => b.timestamp - a.timestamp).map(conv => (
                  <div key={conv.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-[#222] transition-colors cursor-pointer group ${conv.id === activeConversationId ? 'bg-[#1e1e1e] border-l-2 border-blue-500' : ''}`} onClick={() => loadConversation(conv)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-white truncate">{conv.title}</p>
                      <p className="text-[10px] text-[#555]">{conv.messages.length} messages · {new Date(conv.timestamp).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-red-400 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-[#222]">
                <button onClick={() => { newConversation(); setShowConversationHistory(false); }} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium transition-colors">New Conversation</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ AI Prompt Templates ═══ */}
      <AnimatePresence>
        {showPromptTemplates && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowPromptTemplates(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚀</span>
                  <h2 className="text-sm font-semibold text-white">Prompt Templates</h2>
                </div>
                <button onClick={() => setShowPromptTemplates(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3">
                {['Page', 'Enhance', 'Component'].map(cat => (
                  <div key={cat} className="mb-4">
                    <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider px-2 mb-2">{cat === 'Page' ? 'Full Pages' : cat === 'Enhance' ? 'Enhancements' : 'Components'}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {PROMPT_TEMPLATES.filter(t => t.cat === cat).map(t => (
                        <button key={t.title} onClick={() => { sendPrompt(t.prompt); setShowPromptTemplates(false); }} className="text-left p-3 rounded-lg bg-[#111] border border-[#222] hover:border-[#444] hover:bg-[#161616] transition-all group">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{t.icon}</span>
                            <span className="text-[12px] font-medium text-white">{t.title}</span>
                          </div>
                          <p className="text-[10px] text-[#555] leading-4 line-clamp-2">{t.prompt.slice(0, 100)}...</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Code Bookmarks ═══ */}
      <AnimatePresence>
        {showBookmarks && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowBookmarks(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  <h2 className="text-sm font-semibold text-white">Code Bookmarks</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{bookmarks.length}</span>
                </div>
                <button onClick={() => setShowBookmarks(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {bookmarks.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[12px] text-[#555]">No bookmarks yet. Use the command palette to bookmark code.</div>
                ) : bookmarks.map(bm => (
                  <div key={bm.id} className="px-5 py-3 border-b border-[#1e1e1e] hover:bg-[#222] transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white font-medium">{bm.label}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => insertBookmark(bm.code)} className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">Insert</button>
                        <button onClick={() => deleteBookmark(bm.id)} className="text-[#555] hover:text-red-400 transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                      </div>
                    </div>
                    <div className="text-[9px] text-[#555] font-mono line-clamp-2 leading-4 bg-[#111] rounded p-1.5">{bm.code.slice(0, 200)}</div>
                    <span className="text-[8px] text-[#444] mt-1 block">{bm.file} · {bm.language}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Version Timeline ═══ */}
      <AnimatePresence>
        {showVersionTimeline && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowVersionTimeline(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-md mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <h2 className="text-sm font-semibold text-white">Version Timeline</h2>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{vfsHistory.length} snapshots</span>
                </div>
                <button onClick={() => setShowVersionTimeline(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
                {vfsHistory.length === 0 ? (
                  <div className="py-8 text-center text-[12px] text-[#555]">No versions yet. Start editing to create snapshots.</div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[#222]" />
                    {vfsHistory.map((snapshot, i) => {
                      const fileCount = Object.keys(snapshot).length;
                      const totalSize = Object.values(snapshot).reduce((acc, f) => acc + (f.content?.length || 0), 0);
                      const isActive = i === vfsHistoryIdx;
                      return (
                        <div key={i} className={`relative flex items-start gap-3 py-2 pl-1 cursor-pointer hover:bg-[#222] rounded-lg px-2 transition-colors ${isActive ? 'bg-[#1e1e1e]' : ''}`} onClick={() => { setVfsHistoryIdx(i); setProjectFiles(snapshot); setShowVersionTimeline(false); }}>
                          <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${isActive ? 'border-emerald-500 bg-emerald-500/20' : 'border-[#333] bg-[#1a1a1a]'}`}>
                            {isActive && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-white font-medium">v{i + 1}</span>
                              {isActive && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Current</span>}
                            </div>
                            <p className="text-[10px] text-[#555]">{fileCount} files · {(totalSize / 1024).toFixed(1)}KB</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Find & Replace ═══ */}
      <AnimatePresence>
        {showFindReplace && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowFindReplace(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <h2 className="text-sm font-semibold text-white">Find & Replace</h2>
                  {findQuery && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{findResults.length} matches</span>}
                </div>
                <button onClick={() => setShowFindReplace(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-[#111] border border-[#333] rounded-lg px-3 py-2 focus-within:border-[#555]">
                    <input ref={findInputRef} value={findQuery} onChange={(e) => setFindQuery(e.target.value)} placeholder="Find..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus />
                  </div>
                  <button onClick={() => setFindCaseSensitive(!findCaseSensitive)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${findCaseSensitive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#222] text-[#555] hover:text-white'}`} title="Case Sensitive">Aa</button>
                  <button onClick={() => setFindRegex(!findRegex)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${findRegex ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#222] text-[#555] hover:text-white'}`} title="Regex">.*</button>
                </div>
                <div className="flex gap-2">
                  <input value={replaceQuery} onChange={(e) => setReplaceQuery(e.target.value)} placeholder="Replace with..." className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] outline-none focus:border-[#555]" />
                  <button onClick={() => replaceInFiles(false)} disabled={!findQuery || !replaceQuery} className="px-3 py-1.5 rounded-lg bg-[#222] text-[11px] text-[#888] hover:text-white hover:bg-[#333] disabled:opacity-30 transition-colors">Replace</button>
                  <button onClick={() => replaceInFiles(true)} disabled={!findQuery || !replaceQuery} className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-[11px] text-blue-400 hover:bg-blue-600/30 disabled:opacity-30 transition-colors">All</button>
                </div>
                <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[#222]">
                  {findResults.length === 0 && findQuery && <div className="p-3 text-[11px] text-[#555] text-center">No matches</div>}
                  {findResults.slice(0, 50).map((r, i) => (
                    <button key={i} onClick={() => { openFile(r.file); setActiveTab('code'); }} className="w-full flex items-start gap-2 px-3 py-1.5 text-[10px] hover:bg-[#222] transition-colors text-left border-b border-[#1e1e1e] last:border-0">
                      <span className="text-[#666] w-[120px] truncate shrink-0">{r.file}:{r.line}</span>
                      <span className="text-[#aaa] truncate font-mono">{r.text.trim()}</span>
                    </button>
                  ))}
                  {findResults.length > 50 && <div className="p-2 text-[9px] text-[#555] text-center">...and {findResults.length - 50} more</div>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Keyboard Shortcuts ═══ */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowShortcuts(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-md mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>
                  <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
                </div>
                <button onClick={() => setShowShortcuts(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                {['General', 'View', 'Edit', 'Chat', 'Project'].map(cat => {
                  const catShortcuts = SHORTCUTS.filter(s => s.cat === cat);
                  if (catShortcuts.length === 0) return null;
                  return (
                    <div key={cat} className="mb-4">
                      <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">{cat}</h3>
                      {catShortcuts.map(s => (
                        <div key={s.keys} className="flex items-center justify-between py-1.5">
                          <span className="text-[12px] text-[#aaa]">{s.desc}</span>
                          <kbd className="px-2 py-0.5 rounded bg-[#222] border border-[#333] text-[11px] text-white font-mono">{s.keys}</kbd>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Editor Theme Selector ═══ */}
      <AnimatePresence>
        {showThemeSelector && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowThemeSelector(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-sm mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                  <h2 className="text-sm font-semibold text-white">Editor Theme</h2>
                </div>
                <button onClick={() => setShowThemeSelector(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-3 space-y-1">
                {EDITOR_THEMES.map(t => (
                  <button key={t.id} onClick={() => { setEditorTheme(t.id); setShowThemeSelector(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${editorTheme === t.id ? 'bg-[#222] border border-[#444]' : 'hover:bg-[#1e1e1e] border border-transparent'}`}>
                    <div>
                      <p className="text-[12px] text-white font-medium text-left">{t.name}</p>
                      <p className="text-[10px] text-[#555] text-left">{t.desc}</p>
                    </div>
                    {editorTheme === t.id && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Content Search (Cmd+Shift+F) ═══ */}
      <AnimatePresence>
        {showContentSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowContentSearch(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={contentSearchRef} value={contentSearchQuery} onChange={(e) => setContentSearchQuery(e.target.value)} placeholder="Search in all files..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">⌘⇧F</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto py-1">
                {contentSearchResults.map((r, i) => (
                  <button key={i} onClick={() => { setSelectedFile(r.file); setActiveTab('code'); setShowContentSearch(false); }} className="w-full flex items-start gap-2 px-4 py-2 text-[11px] hover:bg-[#222] transition-colors text-left">
                    <div className="shrink-0 text-[#888] w-[140px] truncate">{r.file}<span className="text-[#555]">:{r.line}</span></div>
                    <div className="flex-1 text-[#ccc] truncate font-mono">{r.text}</div>
                  </button>
                ))}
                {contentSearchQuery && contentSearchResults.length === 0 && <div className="px-4 py-3 text-[12px] text-[#555]">No matches found</div>}
                {!contentSearchQuery && <div className="px-4 py-3 text-[12px] text-[#555]">Type to search across all project files</div>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Media Gallery ═══ */}
      <AnimatePresence>
        {showMediaGallery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowMediaGallery(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <h2 className="text-sm font-semibold text-white">Media Gallery</h2>
                  <span className="text-[10px] text-[#555] bg-[#222] px-1.5 py-0.5 rounded">{mediaAssets.length} items</span>
                </div>
                <button onClick={() => setShowMediaGallery(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {mediaAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[#555]">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    <p className="text-[13px]">No media generated yet</p>
                    <p className="text-[11px] mt-1">Use /image or /video commands to generate media</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaAssets.slice().reverse().map((asset) => (
                      <div key={asset.id} className="group relative rounded-lg border border-[#2a2a2a] bg-[#111] overflow-hidden hover:border-[#444] transition-colors">
                        <div className="aspect-video bg-black flex items-center justify-center">
                          {asset.type === 'image' ? (
                            <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" />
                          ) : (
                            <video src={asset.url} className="w-full h-full object-cover" muted loop onMouseEnter={(e) => (e.target as HTMLVideoElement).play()} onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                          )}
                        </div>
                        <div className="p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${asset.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{asset.type === 'video' ? '🎬 Video' : '🖼 Image'}</span>
                            <span className="text-[9px] text-[#555]">{new Date(asset.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[10px] text-[#888] line-clamp-2">{asset.prompt}</p>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button onClick={() => { navigator.clipboard.writeText(asset.url); }} className="p-1.5 rounded bg-black/70 text-white hover:bg-black/90 transition-colors" title="Copy URL">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </button>
                          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded bg-black/70 text-white hover:bg-black/90 transition-colors" title="Open">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Templates Modal ═══ */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowTemplates(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Start from Template</h2>
                <button onClick={() => setShowTemplates(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TEMPLATES.map((t) => (
                  <button key={t.name} onClick={() => createProject(t.name, t.files)} className="p-4 rounded-lg border border-[#2a2a2a] hover:border-[#444] bg-[#111] hover:bg-[#161616] transition-colors text-left group">
                    <div className="text-2xl mb-2">{t.icon}</div>
                    <p className="text-[13px] text-white font-medium group-hover:text-purple-300 transition-colors">{t.name}</p>
                    <p className="text-[10px] text-[#555] mt-1">{t.desc}</p>
                    <p className="text-[9px] text-[#444] mt-2">{Object.keys(t.files).length} files</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ .env Management Modal ═══ */}
      <AnimatePresence>
        {showEnvPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowEnvPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Environment Variables</h2>
                  <p className="text-[10px] text-[#555] mt-0.5">Stored in .env file in your project</p>
                </div>
                <button onClick={() => setShowEnvPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
                {envVars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={v.key} onChange={(e) => { const updated = [...envVars]; updated[i] = { ...updated[i], key: e.target.value }; setEnvVars(updated); syncEnvToVFS(updated); }} className="w-[140px] bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 outline-none focus:border-[#444] font-mono" placeholder="KEY" />
                    <span className="text-[#555] text-[11px]">=</span>
                    <input type="text" value={v.value} onChange={(e) => { const updated = [...envVars]; updated[i] = { ...updated[i], value: e.target.value }; setEnvVars(updated); syncEnvToVFS(updated); }} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 outline-none focus:border-[#444] font-mono" placeholder="value" />
                    <button onClick={() => removeEnvVar(i)} className="text-[#555] hover:text-red-400 transition-colors shrink-0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 border-t border-[#222]">
                  <input type="text" value={newEnvKey} onChange={(e) => setNewEnvKey(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addEnvVar(); }} className="w-[140px] bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 outline-none focus:border-[#444] font-mono" placeholder="NEW_KEY" />
                  <span className="text-[#555] text-[11px]">=</span>
                  <input type="text" value={newEnvValue} onChange={(e) => setNewEnvValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addEnvVar(); }} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 outline-none focus:border-[#444] font-mono" placeholder="value" />
                  <button onClick={addEnvVar} disabled={!newEnvKey.trim()} className="px-2.5 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-30">Add</button>
                </div>
                {/* Auto-populate from connected integrations */}
                {Object.keys(integrationKeys).length > 0 && (
                  <div className="pt-2 border-t border-[#222]">
                    <p className="text-[10px] text-[#555] mb-2">Auto-populate from connected integrations:</p>
                    <button onClick={() => {
                      const newVars = Object.entries(integrationKeys).map(([name, key]) => ({
                        key: name.toUpperCase().replace(/\s+/g, '_') + '_API_KEY',
                        value: key,
                      }));
                      const merged = [...envVars];
                      for (const nv of newVars) {
                        if (!merged.find(v => v.key === nv.key)) merged.push(nv);
                      }
                      setEnvVars(merged);
                      syncEnvToVFS(merged);
                    }} className="px-3 py-1.5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-medium hover:bg-purple-500/30 transition-colors">
                      Import {Object.keys(integrationKeys).length} integration key(s)
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.95 }} transition={{ duration: 0.2 }}
              className={`pointer-events-auto px-3 py-2 rounded-lg text-[11px] font-medium shadow-lg backdrop-blur-sm border ${t.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' : t.type === 'info' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'}`}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tab Context Menu */}
      <AnimatePresence>
        {tabContextMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
            className="fixed z-[9999] bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: tabContextMenu.x, top: tabContextMenu.y }}
            onClick={() => setTabContextMenu(null)}>
            <button onClick={() => { closeTab(tabContextMenu.file); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Close</button>
            <button onClick={() => { const others = openTabs.filter(t => t !== tabContextMenu.file); others.forEach(t => closeTab(t)); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Close Others</button>
            <button onClick={() => { openTabs.forEach(t => closeTab(t)); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Close All</button>
            <div className="border-t border-[#333] my-1" />
            <button onClick={() => { navigator.clipboard.writeText(tabContextMenu.file); showToast('Path copied', 'success'); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Copy Path</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goto Line Dialog */}
      <AnimatePresence>
        {showGotoLine && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9998] flex items-start justify-center pt-[20vh]" onClick={() => setShowGotoLine(false)}>
            <motion.div initial={{ y: -10, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -10, scale: 0.97 }} onClick={e => e.stopPropagation()}
              className="bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl p-3 w-[280px]">
              <p className="text-[10px] text-[#555] mb-2 font-medium">Go to Line</p>
              <input ref={gotoLineRef} value={gotoLineValue} onChange={e => setGotoLineValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const line = parseInt(gotoLineValue);
                    if (!isNaN(line) && line > 0 && monacoEditorRef.current) {
                      const editor = monacoEditorRef.current as { revealLineInCenter: (n: number) => void; setPosition: (p: { lineNumber: number; column: number }) => void; focus: () => void };
                      editor.revealLineInCenter(line);
                      editor.setPosition({ lineNumber: line, column: 1 });
                      editor.focus();
                    }
                    setShowGotoLine(false);
                    setGotoLineValue('');
                  }
                }}
                placeholder="Line number..."
                className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-white text-[12px] placeholder:text-[#444] outline-none focus:border-[#555]"
                autoFocus
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explorer Context Menu */}
      <AnimatePresence>
        {explorerContextMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
            className="fixed z-[9999] bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-1 min-w-[170px]"
            style={{ left: explorerContextMenu.x, top: explorerContextMenu.y }}
            onClick={() => setExplorerContextMenu(null)}>
            {explorerContextMenu.isDir ? (
              <>
                <button onClick={() => { const name = prompt('New file name:', explorerContextMenu.path + '/'); if (name?.trim()) { setProjectFiles(prev => ({ ...prev, [name.trim()]: { content: '', language: detectLanguage(name.trim()) } })); openFile(name.trim()); showToast(`Created ${name.trim()}`, 'success'); } }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">New File in Folder</button>
                <button onClick={() => {
                  const prefix = explorerContextMenu.path + '/';
                  const files = Object.keys(projectFiles).filter(f => f.startsWith(prefix));
                  if (files.length === 0 || confirm(`Delete folder "${explorerContextMenu.path}" and ${files.length} file(s)?`)) {
                    setProjectFiles(prev => {
                      const next = { ...prev };
                      files.forEach(f => delete next[f]);
                      return next;
                    });
                    showToast(`Deleted folder: ${explorerContextMenu.path}`, 'success');
                  }
                }} className="w-full px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-[#2a2a2a] transition-colors">Delete Folder</button>
              </>
            ) : (
              <>
                <button onClick={() => { setRenameTarget(explorerContextMenu.path); setRenameValue(explorerContextMenu.path.split('/').pop() || ''); setTimeout(() => renameInputRef.current?.focus(), 50); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Rename</button>
                <button onClick={() => { const src = explorerContextMenu.path; const ext = src.lastIndexOf('.'); const cp = ext > 0 ? src.slice(0, ext) + '-copy' + src.slice(ext) : src + '-copy'; setProjectFiles(prev => ({ ...prev, [cp]: { ...prev[src] } })); showToast(`Duplicated as ${cp.split('/').pop()}`, 'success'); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Duplicate</button>
                <button onClick={() => { navigator.clipboard.writeText(explorerContextMenu.path); showToast('Path copied', 'success'); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Copy Path</button>
                <div className="border-t border-[#333] my-1" />
                <button onClick={() => {
                  const file = explorerContextMenu.path;
                  if (confirm(`Delete "${file}"?`)) {
                    setProjectFiles(prev => { const next = { ...prev }; delete next[file]; return next; });
                    if (selectedFile === file) { const remaining = Object.keys(projectFiles).filter(f => f !== file); setSelectedFile(remaining[0] || ''); }
                    closeTab(file);
                    showToast(`Deleted ${file.split('/').pop()}`, 'success');
                  }
                }} className="w-full px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-[#2a2a2a] transition-colors">Delete</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Tooltip */}
      {hoveredImage && projectFiles[hoveredImage.path] && (
        <div className="fixed z-[9999] pointer-events-none" style={{ left: hoveredImage.x + 16, top: hoveredImage.y - 60 }}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl p-2 max-w-[200px]">
            {projectFiles[hoveredImage.path].content.startsWith('<svg') || projectFiles[hoveredImage.path].content.startsWith('<?xml') ? (
              <iframe
                sandbox=""
                srcDoc={projectFiles[hoveredImage.path].content.slice(0, 5000)}
                className="w-[180px] h-[120px] bg-[#111] rounded overflow-hidden border-0"
                title="SVG preview"
              />
            ) : projectFiles[hoveredImage.path].content.startsWith('data:') ? (
              <img src={projectFiles[hoveredImage.path].content} alt="" className="max-w-[180px] max-h-[120px] rounded object-contain" />
            ) : (
              <div className="w-[180px] h-[60px] flex items-center justify-center text-[10px] text-[#555] bg-[#111] rounded">Image file</div>
            )}
            <p className="text-[9px] text-[#666] mt-1 truncate">{hoveredImage.path.split('/').pop()}</p>
          </div>
        </div>
      )}

      {/* A11y Audit Panel */}
      <AnimatePresence>
        {showA11yPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowA11yPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="4" r="2"/><path d="M12 6v6"/><path d="M8 22l4-10 4 10"/><path d="M6 14h12"/></svg>
                  <h2 className="text-sm font-semibold text-white">Accessibility Audit</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{a11yIssues.length} issues</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={runA11yAudit} className="px-2 py-1 text-[10px] rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Re-scan</button>
                  <button onClick={() => setShowA11yPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                {a11yIssues.map((issue, i) => (
                  <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${issue.type === 'error' ? 'border-red-500/20 bg-red-500/5' : issue.type === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}>
                    <span className="mt-0.5 shrink-0">
                      {issue.type === 'error' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> : issue.type === 'warning' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/90">{issue.message}</p>
                      <p className="text-[10px] text-[#666] mt-0.5 font-mono truncate">{issue.element}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEO Meta Editor Panel */}
      <AnimatePresence>
        {showSeoPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowSeoPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <h2 className="text-sm font-semibold text-white">SEO Meta Editor</h2>
                </div>
                <button onClick={() => setShowSeoPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] text-[#888] mb-1.5 block">Page Title <span className="text-[#555]">({seoTitle.length}/60)</span></label>
                  <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="My Awesome App" className={`w-full px-3 py-2 bg-[#111] border rounded-lg text-sm text-white outline-none transition-colors ${seoTitle.length > 60 ? 'border-red-500/50 focus:border-red-500' : 'border-[#2a2a2a] focus:border-[#444]'}`} />
                </div>
                <div>
                  <label className="text-[11px] text-[#888] mb-1.5 block">Meta Description <span className="text-[#555]">({seoDescription.length}/160)</span></label>
                  <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="A brief description of your page..." rows={3} className={`w-full px-3 py-2 bg-[#111] border rounded-lg text-sm text-white outline-none resize-none transition-colors ${seoDescription.length > 160 ? 'border-red-500/50 focus:border-red-500' : 'border-[#2a2a2a] focus:border-[#444]'}`} />
                </div>
                <div>
                  <label className="text-[11px] text-[#888] mb-1.5 block">OG Image URL</label>
                  <input value={seoOgImage} onChange={(e) => setSeoOgImage(e.target.value)} placeholder="https://example.com/og-image.png" className="w-full px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white outline-none focus:border-[#444] transition-colors" />
                </div>
                {/* Google Preview */}
                <div className="p-3 bg-[#111] rounded-lg border border-[#222]">
                  <p className="text-[10px] text-[#555] mb-2">Google Preview</p>
                  <p className="text-[#8ab4f8] text-sm leading-snug truncate">{seoTitle || 'Page Title'}</p>
                  <p className="text-[#bdc1c6] text-[11px] mt-0.5 line-clamp-2">{seoDescription || 'No description provided.'}</p>
                  <p className="text-[#969ba1] text-[10px] mt-0.5">https://yoursite.com</p>
                </div>
                <button onClick={() => {
                  if (!projectFiles['index.html']) { showToast('No index.html found', 'error'); return; }
                  let html = projectFiles['index.html'].content;
                  // Update or insert title
                  if (/<title>[^<]*<\/title>/i.test(html)) html = html.replace(/<title>[^<]*<\/title>/i, `<title>${seoTitle}</title>`);
                  else html = html.replace(/<head([^>]*)>/i, `<head$1><title>${seoTitle}</title>`);
                  // Update or insert description
                  if (/<meta[^>]*name=["']description["'][^>]*>/i.test(html)) html = html.replace(/<meta[^>]*name=["']description["'][^>]*>/i, `<meta name="description" content="${seoDescription}">`);
                  else html = html.replace(/<\/head>/i, `<meta name="description" content="${seoDescription}"></head>`);
                  // Update or insert og:image
                  if (seoOgImage) {
                    if (/<meta[^>]*property=["']og:image["'][^>]*>/i.test(html)) html = html.replace(/<meta[^>]*property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${seoOgImage}">`);
                    else html = html.replace(/<\/head>/i, `<meta property="og:image" content="${seoOgImage}"></head>`);
                  }
                  setProjectFiles(prev => ({ ...prev, 'index.html': { ...prev['index.html'], content: html } }));
                  showToast('SEO meta tags updated', 'success');
                  setShowSeoPanel(false);
                }} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors">Apply Meta Tags</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tailwind Classes Browser */}
      <AnimatePresence>
        {showTailwindPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowTailwindPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  <h2 className="text-sm font-semibold text-white">Tailwind CSS Classes</h2>
                </div>
                <button onClick={() => setShowTailwindPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                {[
                  { cat: 'Spacing', classes: ['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'px-4', 'py-2', 'm-0', 'm-1', 'm-2', 'm-4', 'mx-auto', 'my-4', 'gap-1', 'gap-2', 'gap-4', 'gap-6', 'space-x-2', 'space-y-2', 'space-x-4', 'space-y-4'] },
                  { cat: 'Layout', classes: ['flex', 'inline-flex', 'grid', 'block', 'inline-block', 'hidden', 'items-center', 'items-start', 'items-end', 'justify-center', 'justify-between', 'justify-start', 'justify-end', 'flex-col', 'flex-row', 'flex-wrap', 'flex-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'col-span-2'] },
                  { cat: 'Sizing', classes: ['w-full', 'w-1/2', 'w-1/3', 'w-auto', 'w-screen', 'h-full', 'h-screen', 'h-auto', 'min-h-screen', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-4xl', 'max-w-6xl'] },
                  { cat: 'Typography', classes: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'text-center', 'text-left', 'text-right', 'uppercase', 'lowercase', 'capitalize', 'truncate', 'leading-tight', 'leading-relaxed', 'tracking-wide'] },
                  { cat: 'Colors', classes: ['text-white', 'text-black', 'text-gray-500', 'text-red-500', 'text-blue-500', 'text-green-500', 'text-yellow-500', 'text-purple-500', 'bg-white', 'bg-black', 'bg-gray-100', 'bg-gray-900', 'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-gradient-to-r', 'from-blue-500', 'to-purple-500'] },
                  { cat: 'Borders', classes: ['border', 'border-2', 'border-0', 'border-t', 'border-b', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full', 'border-gray-200', 'border-gray-700', 'divide-y', 'divide-x', 'ring-1', 'ring-2'] },
                  { cat: 'Effects', classes: ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'opacity-0', 'opacity-50', 'opacity-100', 'blur-sm', 'blur', 'backdrop-blur-sm', 'backdrop-blur-md', 'transition', 'transition-all', 'duration-200', 'duration-300', 'hover:scale-105', 'hover:opacity-80'] },
                  { cat: 'Positioning', classes: ['relative', 'absolute', 'fixed', 'sticky', 'top-0', 'right-0', 'bottom-0', 'left-0', 'inset-0', 'z-10', 'z-20', 'z-50', 'overflow-hidden', 'overflow-auto', 'overflow-x-auto', 'overflow-y-auto'] },
                ].map(group => (
                  <div key={group.cat} className="mb-4">
                    <h3 className="text-[11px] font-semibold text-[#888] mb-2 uppercase tracking-wider">{group.cat}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.classes.map(cls => (
                        <button key={cls} onClick={() => { navigator.clipboard.writeText(cls); showToast(`Copied: ${cls}`, 'success'); }} className="px-2 py-1 text-[10px] font-mono rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc] hover:border-[#444] hover:text-white transition-colors cursor-pointer">{cls}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color Palette Extractor */}
      <AnimatePresence>
        {showColorPalettePanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowColorPalettePanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5.5-4.5-9-10-9z"/></svg>
                  <h2 className="text-sm font-semibold text-white">Color Palette</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{extractedColors.length} colors</span>
                </div>
                <button onClick={() => setShowColorPalettePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                {extractedColors.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No colors found in project files</p>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {extractedColors.map((color, i) => (
                      <button key={i} onClick={() => { navigator.clipboard.writeText(color); showToast(`Copied: ${color}`, 'success'); }} className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors" title={color}>
                        <div className="w-10 h-10 rounded-lg border border-[#333] shadow-inner group-hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                        <span className="text-[8px] text-[#666] group-hover:text-white font-mono truncate max-w-[60px] transition-colors">{color}</span>
                      </button>
                    ))}
                  </div>
                )}
                {extractedColors.length > 0 && (
                  <button onClick={() => { navigator.clipboard.writeText(extractedColors.join(', ')); showToast('All colors copied', 'success'); }} className="mt-4 w-full py-2 rounded-lg border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white hover:border-[#444] transition-colors">Copy All Colors</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Audit Panel */}
      <AnimatePresence>
        {showPerfPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowPerfPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  <h2 className="text-sm font-semibold text-white">Performance Audit</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={runPerfAudit} className="px-2 py-1 text-[10px] rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">Re-scan</button>
                  <button onClick={() => setShowPerfPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                {perfIssues.map((issue, i) => (
                  <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${i === 0 ? 'border-[#333] bg-[#1a1a1a]' : issue.type === 'error' ? 'border-red-500/20 bg-red-500/5' : issue.type === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}>
                    <span className="mt-0.5 shrink-0">
                      {i === 0 ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> : issue.type === 'error' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> : issue.type === 'warning' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] ${i === 0 ? 'text-white font-semibold' : 'text-white/90'}`}>{issue.message}</p>
                      <p className="text-[10px] text-[#666] mt-0.5">{issue.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Stats Panel */}
      <AnimatePresence>
        {showStatsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowStatsPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-md mx-4">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                  <h2 className="text-sm font-semibold text-white">Project Statistics</h2>
                </div>
                <button onClick={() => setShowStatsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[#111] border border-[#222] text-center">
                    <p className="text-xl font-bold text-white">{projectStats.total}</p>
                    <p className="text-[10px] text-[#666] mt-1">Files</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111] border border-[#222] text-center">
                    <p className="text-xl font-bold text-white">{projectStats.totalLines.toLocaleString()}</p>
                    <p className="text-[10px] text-[#666] mt-1">Lines</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111] border border-[#222] text-center">
                    <p className="text-xl font-bold text-white">{(projectStats.totalBytes / 1024).toFixed(1)}KB</p>
                    <p className="text-[10px] text-[#666] mt-1">Size</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] text-[#888] mb-2 font-medium">Language Breakdown</h3>
                  <div className="space-y-1.5">
                    {projectStats.languages.map(([lang, info]) => {
                      const pct = projectStats.totalLines > 0 ? (info.lines / projectStats.totalLines * 100) : 0;
                      const colors: Record<string, string> = { html: '#e34c26', css: '#563d7c', javascript: '#f7df1e', typescript: '#3178c6', json: '#292929', markdown: '#083fa1', plaintext: '#555' };
                      return (
                        <div key={lang} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[lang] || '#555' }} />
                          <span className="text-[11px] text-[#ccc] w-20 truncate">{lang}</span>
                          <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[lang] || '#555' }} />
                          </div>
                          <span className="text-[10px] text-[#666] w-12 text-right">{info.files}f {info.lines}L</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Variables Manager */}
      <AnimatePresence>
        {showCssVarsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowCssVarsPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  <h2 className="text-sm font-semibold text-white">CSS Variables</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{cssVariables.length} vars</span>
                </div>
                <button onClick={() => setShowCssVarsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1">
                {cssVariables.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No CSS custom properties found</p>
                ) : cssVariables.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#1a1a1a] group transition-colors">
                    {(v.value.startsWith('#') || v.value.startsWith('rgb') || v.value.startsWith('hsl')) && (
                      <span className="w-4 h-4 rounded border border-[#333] shrink-0" style={{ backgroundColor: v.value }} />
                    )}
                    <span className="text-[11px] font-mono text-purple-400 shrink-0">{v.name}</span>
                    <span className="text-[10px] text-[#666]">:</span>
                    <span className="text-[11px] font-mono text-[#ccc] truncate flex-1">{v.value}</span>
                    <span className="text-[9px] text-[#444] shrink-0">{v.file.split('/').pop()}</span>
                    <button onClick={() => { navigator.clipboard.writeText(`var(${v.name})`); showToast(`Copied: var(${v.name})`, 'success'); }} className="opacity-0 group-hover:opacity-100 text-[#555] hover:text-white transition-all shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Console Output Panel */}
      <AnimatePresence>
        {showConsolePanel && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-8 right-4 z-40 w-96 max-h-[300px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl flex flex-col">
            <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                <span className="text-[11px] text-white font-medium">Console</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">{consoleLogs.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setConsoleLogs([])} className="text-[9px] text-[#555] hover:text-white transition-colors px-1">Clear</button>
                <button onClick={() => setShowConsolePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-0.5 font-mono text-[10px]">
              {consoleLogs.length === 0 ? (
                <p className="text-[#444] text-center py-4">No console output</p>
              ) : consoleLogs.map((log, i) => (
                <div key={i} className={`px-2 py-1 rounded ${log.type === 'error' ? 'text-red-400 bg-red-500/5' : log.type === 'warn' ? 'text-yellow-400 bg-yellow-500/5' : 'text-[#aaa]'}`}>
                  <span className="text-[#444] mr-2">{new Date(log.ts).toLocaleTimeString()}</span>
                  {log.message}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dependency Inspector */}
      <AnimatePresence>
        {showDepsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowDepsPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  <h2 className="text-sm font-semibold text-white">Dependencies</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{detectedDeps.length} detected</span>
                </div>
                <button onClick={() => setShowDepsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
                {detectedDeps.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No CDN dependencies detected</p>
                ) : detectedDeps.map((dep, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#2a2a2a] hover:border-[#333] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 text-[11px] font-bold shrink-0">{dep.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-white font-medium">{dep.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#666] font-mono">{dep.version}</span>
                      </div>
                      <span className="text-[10px] text-[#555]">{dep.type}</span>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(dep.name.toLowerCase()); showToast(`Copied: ${dep.name}`, 'success'); }} className="text-[#555] hover:text-white transition-colors shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code Complexity Analyzer */}
      <AnimatePresence>
        {showComplexityPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowComplexityPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  <h2 className="text-sm font-semibold text-white">Code Complexity</h2>
                </div>
                <button onClick={() => setShowComplexityPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-[#666] border-b border-[#222]">
                      <th className="text-left py-2 pl-2">File</th>
                      <th className="text-right py-2 px-2">Lines</th>
                      <th className="text-right py-2 px-2">Functions</th>
                      <th className="text-right py-2 px-2">Max Depth</th>
                      <th className="text-right py-2 pr-2">Complexity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codeComplexity.map((f, i) => (
                      <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                        <td className="py-2 pl-2 text-[#ccc] font-mono truncate max-w-[150px]">{f.file}</td>
                        <td className="py-2 px-2 text-right text-[#888]">{f.lines}</td>
                        <td className="py-2 px-2 text-right text-[#888]">{f.functions}</td>
                        <td className="py-2 px-2 text-right text-[#888]">{f.maxDepth}</td>
                        <td className={`py-2 pr-2 text-right font-medium ${f.complexity === 'High' ? 'text-red-400' : f.complexity === 'Medium' ? 'text-yellow-400' : 'text-emerald-400'}`}>{f.complexity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Code Outline / Symbol Navigator */}
      <AnimatePresence>
        {showOutlinePanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowOutlinePanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
                  <h2 className="text-sm font-semibold text-white">Code Outline</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{codeSymbols.length} symbols</span>
                </div>
                <button onClick={() => setShowOutlinePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {codeSymbols.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No symbols found in {selectedFile || 'current file'}</p>
                ) : codeSymbols.map((sym, i) => (
                  <button key={i} onClick={() => { const ed = monacoEditorRef.current as any; if (ed) { ed.revealLineInCenter(sym.line); ed.setPosition({ lineNumber: sym.line, column: 1 }); ed.focus(); } setShowOutlinePanel(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${sym.type === 'function' ? 'bg-blue-500/20 text-blue-400' : sym.type === 'class' ? 'bg-purple-500/20 text-purple-400' : sym.type === 'component' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{sym.type === 'function' ? 'fn' : sym.type === 'class' ? 'cls' : sym.type === 'component' ? 'cmp' : 'id'}</span>
                    <span className="text-[12px] text-white font-mono truncate flex-1">{sym.name}</span>
                    <span className="text-[10px] text-[#555] shrink-0">:{sym.line}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Image Size Analyzer */}
      <AnimatePresence>
        {showImageOptPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowImageOptPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <h2 className="text-sm font-semibold text-white">Image Size Analyzer</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{imageAssets.reduce((a, b) => a + b.count, 0)} images</span>
                </div>
                <button onClick={() => setShowImageOptPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {imageAssets.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No inline base64 images detected</p>
                ) : imageAssets.map((asset, i) => (
                  <div key={i} className="p-3 rounded-lg border border-[#2a2a2a] hover:border-[#333] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-white font-medium font-mono">{asset.file}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${asset.totalSize > 100 ? 'bg-red-500/20 text-red-400' : asset.totalSize > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{asset.totalSize}KB total</span>
                    </div>
                    <div className="space-y-1">
                      {asset.images.map((img, j) => (
                        <div key={j} className="flex items-center gap-2 text-[10px]">
                          <span className="text-[#666] font-mono truncate flex-1">{img.src}</span>
                          <span className={`shrink-0 ${img.sizeKB > 50 ? 'text-red-400' : 'text-[#888]'}`}>{img.sizeKB}KB</span>
                        </div>
                      ))}
                    </div>
                    {asset.totalSize > 100 && <p className="text-[10px] text-yellow-400 mt-2">Consider using external URLs instead of inline base64 for large images</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Code Diff Statistics */}
      <AnimatePresence>
        {showDiffStatsPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowDiffStatsPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M12 3v18M3 12h18"/></svg>
                  <h2 className="text-sm font-semibold text-white">Diff Statistics</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{diffStats.length} changed</span>
                </div>
                <button onClick={() => setShowDiffStatsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3">
                {diffStats.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No changes detected (need at least 2 snapshots)</p>
                ) : (
                  <>
                    <div className="flex items-center gap-4 mb-3 px-2">
                      <span className="text-[11px] text-emerald-400">+{diffStats.reduce((a, b) => a + b.added, 0)} additions</span>
                      <span className="text-[11px] text-red-400">-{diffStats.reduce((a, b) => a + b.removed, 0)} deletions</span>
                      <span className="text-[11px] text-[#666]">{diffStats.length} files changed</span>
                    </div>
                    {diffStats.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-2 rounded hover:bg-[#1a1a1a] transition-colors">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ${s.status === 'added' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'deleted' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{s.status.charAt(0).toUpperCase()}</span>
                        <span className="text-[11px] text-[#ccc] font-mono truncate flex-1">{s.file}</span>
                        <span className="text-[10px] text-emerald-400 shrink-0">+{s.added}</span>
                        <span className="text-[10px] text-red-400 shrink-0">-{s.removed}</span>
                        <div className="w-20 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden flex shrink-0">
                          <div className="h-full bg-emerald-500" style={{ width: `${s.added / (s.added + s.removed + 1) * 100}%` }} />
                          <div className="h-full bg-red-500" style={{ width: `${s.removed / (s.added + s.removed + 1) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Network / API Calls Panel */}
      <AnimatePresence>
        {showNetworkPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) setShowNetworkPanel(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="bg-[#161616] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  <h2 className="text-sm font-semibold text-white">Network / API Calls</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{networkCalls.length} calls</span>
                </div>
                <button onClick={() => setShowNetworkPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-1">
                {networkCalls.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No API calls detected in project files</p>
                ) : networkCalls.map((call, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#2a2a2a] hover:border-[#333] transition-colors">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${call.method.includes('post') || call.method === 'POST' ? 'bg-yellow-500/20 text-yellow-400' : call.method.includes('delete') || call.method === 'DELETE' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{call.method.toUpperCase().replace('AXIOS.', '')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white font-mono truncate">{call.url}</p>
                      <p className="text-[9px] text-[#555]">{call.file}:{call.line}</p>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(call.url); showToast('URL copied', 'success'); }} className="text-[#555] hover:text-white transition-colors shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v15: Breakpoint Tester Overlay */}
      {/* ═══ HTML Validator Panel ═══ */}
      {showHtmlValidatorPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>
              <span className="text-sm font-medium text-white">HTML Validator</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{htmlErrors.length} issue{htmlErrors.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowHtmlValidatorPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {htmlErrors.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No HTML issues detected ✓</div>}
            {htmlErrors.map((err, i) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-[11px] ${err.type === 'error' ? 'bg-red-500/5 border border-red-500/10' : 'bg-yellow-500/5 border border-yellow-500/10'}`}>
                <span className="shrink-0 mt-0.5">{err.type === 'error' ? '🔴' : '🟡'}</span>
                <div>
                  <div className="text-[#ccc]">{err.message}</div>
                  {err.line !== undefined && <div className="text-[#555] mt-0.5">Line ~{err.line}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Font Inspector Panel ═══ */}
      {showFontPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔤</span>
              <span className="text-sm font-medium text-white">Font Inspector</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{detectedFonts.length} font{detectedFonts.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowFontPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {detectedFonts.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No fonts detected</div>}
            {detectedFonts.map((f: { name: string; source: string; type: string }, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs font-bold">{f.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white font-medium truncate" style={{ fontFamily: f.name }}>{f.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{f.type}</span>
                    <span className="text-[9px] text-[#555]">{f.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Code Snippets Manager Panel ═══ */}
      {showSnippetsPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[550px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
              <span className="text-sm font-medium text-white">Snippets Manager</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{savedSnippets.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { const code = selectedFile && projectFiles[selectedFile] ? projectFiles[selectedFile].content.slice(0, 2000) : ''; if (!code) return; saveSnippet(selectedFile || 'snippet', code); }} className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">+ Save Selection</button>
              <button onClick={() => setShowSnippetsPanel(false)} className="text-[#555] hover:text-white transition-colors ml-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {savedSnippets.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No snippets saved yet. Select code and click &quot;Save Selection&quot;</div>}
            {savedSnippets.map((s) => (
              <div key={s.id} className="rounded-lg bg-[#1a1a1a] border border-[#222] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#222]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{s.language}</span>
                    <span className="text-[11px] text-white">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => insertSnippet(s.code)} className="text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">Insert</button>
                    <button onClick={() => { navigator.clipboard.writeText(s.code); }} className="text-[9px] px-2 py-0.5 rounded bg-[#222] text-[#888] hover:text-white transition-colors">Copy</button>
                    <button onClick={() => deleteSnippet(s.id)} className="text-[9px] px-2 py-0.5 rounded text-red-400/60 hover:text-red-400 transition-colors">✕</button>
                  </div>
                </div>
                <pre className="p-2 text-[10px] text-[#888] font-mono max-h-[100px] overflow-y-auto">{s.code.slice(0, 500)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ File Size Treemap Panel ═══ */}
      {showTreemapPanel && (
        <div className="fixed top-16 right-4 z-40 w-[450px] max-h-[550px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
              <span className="text-sm font-medium text-white">File Size Treemap</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{fileSizeTreemap.length} file{fileSizeTreemap.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowTreemapPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {fileSizeTreemap.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No files in project</div>}
            {(() => {
              const totalSize = fileSizeTreemap.reduce((a, f) => a + f.bytes, 0);
              return (
                <div className="flex flex-wrap gap-1">
                  {fileSizeTreemap.map((f, i) => {
                    const pct = Math.max(f.pct, 5);
                    return (
                      <div key={i} className="rounded border border-[#333] flex flex-col items-center justify-center p-1.5 text-center transition-all hover:border-[#555]" style={{ width: `${Math.max(pct * 3.5, 45)}px`, height: `${Math.max(pct * 2, 40)}px`, background: `${f.color}15` }} title={`${f.path} — ${f.bytes > 1024 ? (f.bytes / 1024).toFixed(1) + ' KB' : f.bytes + ' B'}`}>
                        <div className="text-[8px] text-[#ccc] truncate w-full">{f.path.split('/').pop()}</div>
                        <div className="text-[7px] mt-0.5" style={{ color: f.color }}>{f.bytes > 1024 ? (f.bytes / 1024).toFixed(1) + 'K' : f.bytes + 'B'}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {fileSizeTreemap.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[#222] pt-2">
                {Object.entries(fileSizeTreemap.reduce((acc: Record<string, { bytes: number; color: string }>, f) => {
                  const ext = f.path.split('.').pop() || '?';
                  if (!acc[ext]) acc[ext] = { bytes: 0, color: f.color };
                  acc[ext].bytes += f.bytes;
                  return acc;
                }, {} as Record<string, { bytes: number; color: string }>)).sort((a, b) => b[1].bytes - a[1].bytes).map(([ext, v]) => (
                  <span key={ext} className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: v.color }} />{ext} <span className="text-[#555]">{v.bytes > 1024 ? (v.bytes / 1024).toFixed(1) + 'KB' : v.bytes + 'B'}</span></span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Unused CSS Detector Panel ═══ */}
      {showUnusedCssPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M3 3l18 18"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94"/></svg>
              <span className="text-sm font-medium text-white">Unused CSS</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{unusedCssSelectors.length} unused</span>
            </div>
            <button onClick={() => setShowUnusedCssPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {unusedCssSelectors.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No unused CSS selectors detected ✓</div>}
            {unusedCssSelectors.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[11px]">
                <span className="text-amber-400 font-mono flex-1 truncate">{s.selector}</span>
                <span className="text-[#555] shrink-0">L{s.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Link Checker Panel ═══ */}
      {showLinkCheckerPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span className="text-sm font-medium text-white">Link Checker</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{brokenLinks.length} issue{brokenLinks.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowLinkCheckerPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {brokenLinks.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">All links valid ✓</div>}
            {brokenLinks.map((l, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-[11px]">
                <span className="shrink-0 mt-0.5">{l.type === 'anchor' ? '⚓' : l.type === 'empty' ? '⚠️' : '🔗'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-cyan-300 font-mono truncate">{l.href}</div>
                  <div className="text-[#666] mt-0.5">{l.reason}</div>
                </div>
                <span className="text-[#555] shrink-0">L{l.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ DOM Tree Viewer Panel ═══ */}
      {showDomTreePanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[550px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="14"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="19" r="3"/><line x1="12" y1="14" x2="6" y2="16"/><line x1="12" y1="14" x2="18" y2="16"/></svg>
              <span className="text-sm font-medium text-white">DOM Tree</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{domTree.length} elements</span>
            </div>
            <button onClick={() => setShowDomTreePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px]">
            {domTree.length === 0 && <div className="text-center py-6 text-[#555] text-[11px] font-sans">No HTML file found</div>}
            {domTree.map((node, i) => {
              const tagColors: Record<string, string> = { html: '#e34c26', head: '#f59e0b', body: '#10b981', div: '#3b82f6', span: '#8b5cf6', a: '#06b6d4', p: '#6b7280', h1: '#ef4444', h2: '#ef4444', h3: '#ef4444', section: '#14b8a6', nav: '#f97316', main: '#22c55e', header: '#eab308', footer: '#a855f7', script: '#f59e0b', style: '#a855f7', img: '#ec4899', button: '#6366f1', input: '#8b5cf6', form: '#0ea5e9', ul: '#64748b', ol: '#64748b', li: '#94a3b8' };
              const color = tagColors[node.tag] || '#888';
              return (
                <div key={i} className="flex items-center py-0.5 hover:bg-[#1a1a1a] rounded transition-colors" style={{ paddingLeft: `${node.depth * 16 + 4}px` }}>
                  <span className="text-[#555] mr-1">{node.selfClose ? '◇' : '▸'}</span>
                  <span style={{ color }}>&lt;{node.tag}</span>
                  {node.attrs && <span className="text-[#555] ml-1 truncate max-w-[200px]">{node.attrs}</span>}
                  <span style={{ color }}>{node.selfClose ? ' />' : '>'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Meta Tag Editor Panel ═══ */}
      {showMetaEditorPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              <span className="text-sm font-medium text-white">Meta Tags</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{metaTags.length} tag{metaTags.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowMetaEditorPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {metaTags.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No meta tags found</div>}
            {metaTags.map((tag, i) => {
              const iconMap: Record<string, string> = { title: '📝', description: '📄', 'og:title': '🌐', 'og:description': '🌐', 'og:image': '🖼️', 'twitter:card': '🐦', 'twitter:title': '🐦', viewport: '📱', charset: '🔤', robots: '🤖', author: '👤' };
              return (
                <div key={i} className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs">{iconMap[tag.name] || '🏷️'}</span>
                    <span className="text-[10px] font-medium text-purple-400">{tag.name}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-[#222] text-[#555]">{tag.type}</span>
                  </div>
                  <div className="text-[11px] text-[#ccc] font-mono break-all">{tag.content || '(empty)'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Keyboard Shortcuts Reference ═══ */}
      {showShortcutsRef && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[600px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M8 16h8"/></svg>
              <span className="text-sm font-medium text-white">Keyboard Shortcuts</span>
            </div>
            <button onClick={() => setShowShortcutsRef(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {[
              { title: 'General', shortcuts: [['⌘K', 'Command Palette'], ['⌘P', 'File Search'], ['⌘⇧F', 'Search in Files'], ['Escape', 'Close Panel'], ['⌘Z', 'Undo (VFS)'], ['⌘⇧Z', 'Redo (VFS)']] },
              { title: 'Editor', shortcuts: [['⌘S', 'Save File'], ['⌘H', 'Find & Replace'], ['⌘G', 'Go to Line'], ['⌘D', 'Delete Line'], ['⇧⌥F', 'Format Code']] },
              { title: 'View', shortcuts: [['⌘1', 'Code Tab'], ['⌘2', 'Preview Tab'], ['⌘3', 'Console Tab'], ['⌘B', 'Toggle Sidebar'], ['⌘\\\\', 'Split Preview']] },
              { title: 'AI', shortcuts: [['Enter', 'Send Message'], ['⇧Enter', 'New Line in Input']] },
            ].map(group => (
              <div key={group.title}>
                <div className="text-[10px] font-medium text-[#888] uppercase tracking-wider mb-1.5">{group.title}</div>
                {group.shortcuts.map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between py-1 px-1 text-[11px] hover:bg-[#1a1a1a] rounded transition-colors">
                    <span className="text-[#ccc]">{desc}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[#222] border border-[#333] text-[9px] text-[#888] font-mono">{key}</kbd>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Bookmarked Lines Panel ═══ */}
      {bookmarkedLines.length > 0 && activeTab === 'code' && (
        <div className="fixed bottom-12 right-4 z-40 w-[220px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
            <span className="text-[10px] font-medium text-white flex items-center gap-1">🔖 Bookmarks <span className="text-[#555]">({bookmarkedLines.length})</span></span>
            <button onClick={() => setBookmarkedLines([])} className="text-[9px] text-[#555] hover:text-white transition-colors">Clear</button>
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {bookmarkedLines.map(line => (
              <button key={line} onClick={() => jumpToBookmark(line)} className="w-full flex items-center justify-between px-3 py-1 text-[10px] hover:bg-[#1a1a1a] transition-colors">
                <span className="text-blue-400">Line {line}</span>
                <button onClick={(e) => { e.stopPropagation(); toggleBookmark(line); }} className="text-[#555] hover:text-red-400 transition-colors">✕</button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Color Contrast Checker Panel ═══ */}
      {showContrastPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>
              <span className="text-sm font-medium text-white">Contrast Checker</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{contrastIssues.length} pair{contrastIssues.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowContrastPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {contrastIssues.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No color pairs with explicit bg+fg found</div>}
            {contrastIssues.map((c, i) => (
              <div key={i} className={`p-2.5 rounded-lg border text-[11px] ${c.aaPass ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#ccc] font-mono truncate flex-1">{c.selector}</span>
                  <span className={`text-[10px] font-bold ${c.aaPass ? 'text-green-400' : 'text-red-400'}`}>{c.ratio}:1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-[#333]" style={{ background: c.fg }} /><span className="text-[9px] text-[#888]">{c.fg}</span></div>
                  <span className="text-[#555]">/</span>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-[#333]" style={{ background: c.bg }} /><span className="text-[9px] text-[#888]">{c.bg}</span></div>
                  <div className="ml-auto flex gap-1">
                    <span className={`text-[8px] px-1 py-0.5 rounded ${c.aaPass ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>AA</span>
                    <span className={`text-[8px] px-1 py-0.5 rounded ${c.aaaPass ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>AAA</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Z-Index Map Panel ═══ */}
      {showZIndexPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span className="text-sm font-medium text-white">Z-Index Map</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{zIndexMap.length}</span>
            </div>
            <button onClick={() => setShowZIndexPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {zIndexMap.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No z-index values found</div>}
            {zIndexMap.map((z, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className="w-12 text-right font-mono font-bold" style={{ color: z.value > 100 ? '#ef4444' : z.value > 10 ? '#f59e0b' : '#10b981' }}>{z.value}</span>
                <span className="text-[#ccc] font-mono flex-1 truncate">{z.selector}</span>
                <span className="text-[9px] text-[#555] shrink-0">{z.file.split('/').pop()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TODO/FIXME Scanner Panel ═══ */}
      {showTodoScanPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span className="text-sm font-medium text-white">TODO Scanner</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{todoComments.length} comment{todoComments.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowTodoScanPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {todoComments.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No TODO/FIXME comments found ✓</div>}
            {todoComments.map((t, i) => {
              const typeColors: Record<string, string> = { TODO: '#3b82f6', FIXME: '#ef4444', HACK: '#f59e0b', NOTE: '#10b981', BUG: '#ef4444', XXX: '#f97316', OPTIMIZE: '#8b5cf6' };
              return (
                <button key={i} onClick={() => { setSelectedFile(t.file); setActiveTab('code'); const ed = monacoEditorRef.current as any; if (ed) setTimeout(() => { ed.revealLineInCenter(t.line); ed.setPosition({ lineNumber: t.line, column: 1 }); }, 100); }} className="w-full flex items-start gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px] text-left hover:border-[#333] transition-colors">
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0" style={{ background: `${typeColors[t.type] || '#555'}20`, color: typeColors[t.type] || '#888' }}>{t.type}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#ccc] truncate">{t.text}</div>
                    <div className="text-[#555] mt-0.5">{t.file}:{t.line}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Regex Tester Panel ═══ */}
      {showRegexPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2"><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/></svg>
              <span className="text-sm font-medium text-white">Regex Tester</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{regexMatches.length} match{regexMatches.length !== 1 ? 'es' : ''}</span>
            </div>
            <button onClick={() => setShowRegexPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3 space-y-2">
            <input value={regexInput} onChange={e => setRegexInput(e.target.value)} placeholder="Enter regex pattern..." className="w-full bg-[#111] border border-[#333] rounded px-3 py-1.5 text-[11px] text-white font-mono outline-none focus:border-rose-500/50" />
            <textarea value={regexTestStr} onChange={e => setRegexTestStr(e.target.value)} placeholder="Test string..." rows={3} className="w-full bg-[#111] border border-[#333] rounded px-3 py-1.5 text-[11px] text-white font-mono outline-none focus:border-rose-500/50 resize-none" />
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {regexMatches.map((m, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-rose-500/5 border border-rose-500/10 text-[10px]">
                <span className="text-rose-400 font-mono font-bold">{i + 1}</span>
                <span className="text-white font-mono flex-1 truncate">&quot;{m.match}&quot;</span>
                <span className="text-[#555]">@{m.index}</span>
                {m.groups.length > 0 && <span className="text-[#888]">({m.groups.length} groups)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CSS Specificity Panel ═══ */}
      {showSpecificityPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
              <span className="text-sm font-medium text-white">CSS Specificity</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{cssSpecificity.length} selectors</span>
            </div>
            <button onClick={() => setShowSpecificityPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {cssSpecificity.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No CSS file found</div>}
            {cssSpecificity.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <div className="flex gap-0.5 shrink-0">
                  <span className={`w-6 text-center text-[9px] font-bold rounded px-1 py-0.5 ${s.specificity[0] > 0 ? 'bg-red-500/20 text-red-400' : 'bg-[#222] text-[#555]'}`}>{s.specificity[0]}</span>
                  <span className={`w-6 text-center text-[9px] font-bold rounded px-1 py-0.5 ${s.specificity[1] > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-[#222] text-[#555]'}`}>{s.specificity[1]}</span>
                  <span className={`w-6 text-center text-[9px] font-bold rounded px-1 py-0.5 ${s.specificity[2] > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-[#222] text-[#555]'}`}>{s.specificity[2]}</span>
                </div>
                <span className="text-[#ccc] font-mono flex-1 truncate">{s.selector}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Image Lazy Loading Panel ═══ */}
      {showLazyImgPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              <span className="text-sm font-medium text-white">Image Checker</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{lazyImgIssues.length} image{lazyImgIssues.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowLazyImgPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {lazyImgIssues.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No images found</div>}
            {lazyImgIssues.map((img, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <div className="text-[#ccc] font-mono truncate mb-1">{img.src}</div>
                <div className="flex items-center gap-2 text-[9px]">
                  <span className={`px-1.5 py-0.5 rounded ${img.hasLazy ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{img.hasLazy ? '✓ lazy' : '✗ no lazy'}</span>
                  <span className={`px-1.5 py-0.5 rounded ${img.hasAlt ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{img.hasAlt ? '✓ alt' : '✗ no alt'}</span>
                  <span className={`px-1.5 py-0.5 rounded ${img.hasWidth ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>{img.hasWidth ? '✓ dimensions' : '⚠ no dimensions'}</span>
                  <span className="text-[#555] ml-auto">{img.file}:{img.line}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Text Statistics Panel ═══ */}
      {showTextStatsPanel && textStats && (
        <div className="fixed top-16 right-4 z-40 w-[340px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
              <span className="text-sm font-medium text-white">Text Statistics</span>
            </div>
            <button onClick={() => setShowTextStatsPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Words', value: textStats.words, color: '#6366f1' },
              { label: 'Characters', value: textStats.chars, color: '#8b5cf6' },
              { label: 'Sentences', value: textStats.sentences, color: '#a855f7' },
              { label: 'Paragraphs', value: textStats.paragraphs, color: '#d946ef' },
              { label: 'Headings', value: textStats.headings, color: '#ec4899' },
              { label: 'Links', value: textStats.links, color: '#06b6d4' },
              { label: 'Images', value: textStats.images, color: '#10b981' },
              { label: 'Read Time', value: `${textStats.readingTime}m`, color: '#f59e0b' },
              { label: 'Readability', value: textStats.readability, color: textStats.readability > 60 ? '#10b981' : textStats.readability > 30 ? '#f59e0b' : '#ef4444' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[9px] text-[#888] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Duplicate Code Panel ═══ */}
      {showDuplicatePanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><rect x="8" y="2" width="13" height="13" rx="2"/><path d="M4 15V6a2 2 0 0 1 2-2"/><rect x="2" y="9" width="13" height="13" rx="2"/></svg>
              <span className="text-sm font-medium text-white">Duplicate Code</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{duplicateBlocks.length} duplicate{duplicateBlocks.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setShowDuplicatePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {duplicateBlocks.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No duplicate code blocks found ✓</div>}
            {duplicateBlocks.map((d, i) => (
              <div key={i} className="rounded-lg bg-[#1a1a1a] border border-[#222] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#222]">
                  <span className="text-[10px] text-orange-400 font-medium">Found in {d.count} files</span>
                  <div className="flex gap-1">{d.files.map(f => <span key={f} className="text-[8px] px-1 py-0.5 rounded bg-[#222] text-[#888]">{f.split('/').pop()}</span>)}</div>
                </div>
                <pre className="p-2 text-[9px] text-[#888] font-mono overflow-x-auto">{d.code}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Element Counter Panel ═══ */}
      {showElementCountPanel && elementCounts && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3L8 21"/><path d="M16 3l-2 18"/></svg>
              <span className="text-sm font-medium text-white">Element Counter</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{elementCounts.totalElements} total</span>
            </div>
            <button onClick={() => setShowElementCountPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Elements', value: elementCounts.totalElements, color: '#14b8a6' },
                { label: 'Unique Tags', value: elementCounts.uniqueTags, color: '#06b6d4' },
                { label: 'Classes', value: elementCounts.totalClasses, color: '#8b5cf6' },
                { label: 'IDs', value: elementCounts.totalIds, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} className="text-center p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[8px] text-[#888]">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="text-[9px] text-[#555] mb-1">Top elements:</div>
            <div className="max-h-[250px] overflow-y-auto space-y-0.5">
              {elementCounts.tagCounts.slice(0, 30).map(([tag, count]) => (
                <div key={tag} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] text-[11px]">
                  <span className="text-teal-400 font-mono w-20 truncate">&lt;{tag}&gt;</span>
                  <div className="flex-1 h-1.5 bg-[#222] rounded-full overflow-hidden"><div className="h-full bg-teal-500/40 rounded-full" style={{ width: `${Math.min(100, (count / elementCounts.totalElements) * 100 * 3)}%` }} /></div>
                  <span className="text-[#888] w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Console Filter & Export Panel ═══ */}
      {showConsoleFilter && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              <span className="text-sm font-medium text-white">Console Filter</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{filteredConsoleLogs.length} entries</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={exportConsoleLogs} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">Export .log</button>
              <button onClick={() => setShowConsoleFilter(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3 pt-2">
            {(['all', 'log', 'warn', 'error'] as const).map(level => (
              <button key={level} onClick={() => setConsoleFilterLevel(level)} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${consoleFilterLevel === level ? (level === 'error' ? 'bg-red-500/20 text-red-400' : level === 'warn' ? 'bg-amber-500/20 text-amber-400' : level === 'log' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#333] text-white') : 'text-[#555] hover:text-white'}`}>{level.toUpperCase()}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5 max-h-[350px]">
            {filteredConsoleLogs.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No console output</div>}
            {filteredConsoleLogs.map((log, i) => (
              <div key={i} className={`flex items-start gap-2 p-1.5 rounded text-[10px] font-mono ${log.type === 'error' ? 'bg-red-500/5 text-red-300' : log.type === 'warn' ? 'bg-amber-500/5 text-amber-300' : 'text-[#ccc]'}`}>
                <span className={`shrink-0 w-10 text-[8px] font-bold uppercase ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-blue-400'}`}>{log.type}</span>
                <span className="flex-1 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Inline Color Picker Panel ═══ */}
      {showColorEdit && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17.2 9.8l-4.7 4.7L8 18l-.5 3.5L11 21l3.5-4.5 4.7-4.7"/></svg>
              <span className="text-sm font-medium text-white">Color Picker</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{detectedColors.length} colors</span>
            </div>
            <button onClick={() => setShowColorEdit(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          {colorEditTarget && (
            <div className="px-3 pt-2 flex items-center gap-2">
              <input type="color" value={colorEditValue} onChange={e => setColorEditValue(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
              <input value={colorEditValue} onChange={e => setColorEditValue(e.target.value)} className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1 text-[11px] text-white font-mono outline-none" />
              <button onClick={applyColorEdit} className="px-2 py-1 rounded bg-pink-500/20 text-pink-400 text-[10px] hover:bg-pink-500/30 transition-colors">Apply</button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 max-h-[350px]">
            {detectedColors.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No colors detected</div>}
            {detectedColors.map((c, i) => (
              <button key={i} onClick={() => { setColorEditTarget({ file: c.file, match: c.color, index: c.index }); setColorEditValue(c.color); }} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[#1a1a1a] border border-transparent hover:border-[#222] text-[11px] text-left transition-colors">
                <div className="w-5 h-5 rounded border border-[#333] shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-white font-mono flex-1 truncate">{c.color}</span>
                <span className="text-[#555] text-[9px]">{c.file.split('/').pop()}:{c.line}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Code Folding Map Panel ═══ */}
      {showFoldMap && (
        <div className="fixed top-16 right-4 z-40 w-[360px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M3 3h18"/><path d="M9 8h12"/><path d="M9 13h12"/><path d="M3 18h18"/></svg>
              <span className="text-sm font-medium text-white">Folding Map</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{foldRegions.length} regions</span>
            </div>
            <button onClick={() => setShowFoldMap(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5 max-h-[400px]">
            {foldRegions.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">Open a file to see folding regions</div>}
            {foldRegions.map((r, i) => (
              <button key={i} onClick={() => {
                const editor = monacoEditorRef.current as { revealLineInCenter?: (line: number) => void };
                if (editor?.revealLineInCenter) editor.revealLineInCenter(r.start);
              }} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-[#1a1a1a] text-[10px] text-left transition-colors">
                <div className="flex gap-px shrink-0">{Array.from({ length: Math.min(r.depth, 5) }).map((_, d) => <div key={d} className="w-1.5 h-3 rounded-sm bg-purple-500/30" />)}</div>
                <span className="text-[#888] w-12 text-right shrink-0">L{r.start}-{r.end}</span>
                <span className="text-[#ccc] font-mono flex-1 truncate">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Dependency Graph Panel ═══ */}
      {showDepGraph && (
        <div className="fixed top-16 right-4 z-40 w-[440px] max-h-[520px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span className="text-sm font-medium text-white">Dependency Graph</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{depGraph.nodes.length} files, {depGraph.edges.length} imports</span>
            </div>
            <button onClick={() => setShowDepGraph(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[420px]">
            {depGraph.nodes.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No files in project</div>}
            {depGraph.nodes.map(node => {
              const imports = depGraph.edges.filter(e => e.from === node.id);
              const importedBy = depGraph.edges.filter(e => e.to === node.id);
              return (
                <div key={node.id} className="rounded-lg bg-[#1a1a1a] border border-[#222] p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${node.type === 'tsx' || node.type === 'jsx' ? 'bg-blue-500/20 text-blue-400' : node.type === 'ts' || node.type === 'js' ? 'bg-amber-500/20 text-amber-400' : node.type === 'css' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#222] text-[#888]'}`}>{node.type}</span>
                    <span className="text-[11px] text-white font-mono truncate">{node.id}</span>
                    {importedBy.length > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 ml-auto">{importedBy.length} dependents</span>}
                  </div>
                  {imports.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {imports.map(imp => <span key={imp.to} className="text-[8px] px-1.5 py-0.5 rounded bg-[#222] text-[#888] font-mono">→ {imp.to.split('/').pop()}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Performance Budget Panel ═══ */}
      {showPerfBudget && (
        <div className="fixed top-16 right-4 z-40 w-[360px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-6"/></svg>
              <span className="text-sm font-medium text-white">Performance Budget</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${perfBudget.score >= 80 ? 'bg-green-500/20 text-green-400' : perfBudget.score >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{perfBudget.score}%</span>
            </div>
            <button onClick={() => setShowPerfBudget(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3 space-y-2">
            {perfBudget.checks.map(check => (
              <div key={check.name} className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <span className={`text-sm ${check.pass ? 'text-green-400' : 'text-red-400'}`}>{check.pass ? '✓' : '✗'}</span>
                <div className="flex-1">
                  <div className="text-[11px] text-white">{check.name}</div>
                  <div className="text-[9px] text-[#555]">Limit: {check.limit}</div>
                </div>
                <span className={`text-[11px] font-mono font-bold ${check.pass ? 'text-green-400' : 'text-red-400'}`}>{check.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Responsive Preview Grid ═══ */}
      {showResponsiveGrid && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#222]">
            <div className="flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span className="text-sm font-medium text-white">Responsive Preview Grid</span>
              <span className="text-[10px] text-[#888]">4 viewports side by side</span>
            </div>
            <button onClick={() => setShowResponsiveGrid(false)} className="text-[#555] hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 p-4 overflow-hidden">
            {RESPONSIVE_VIEWPORTS.map(vp => (
              <div key={vp.name} className="flex flex-col rounded-lg border border-[#333] overflow-hidden bg-[#0a0a0a]">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#222] bg-[#111]">
                  <span className="text-sm">{vp.icon}</span>
                  <span className="text-[11px] text-white font-medium">{vp.name}</span>
                  <span className="text-[9px] text-[#555] ml-auto">{vp.w}×{vp.h}</span>
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <iframe
                    srcDoc={previewHtml || ''}
                    sandbox="allow-scripts allow-same-origin"
                    className="absolute inset-0 bg-white"
                    style={{
                      width: vp.w,
                      height: vp.h,
                      transform: `scale(${Math.min(1, 0.45)})`,
                      transformOrigin: 'top left',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ CSS Animation Inspector Panel ═══ */}
      {showAnimPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d946ef" strokeWidth="2"><path d="M5 3v18"/><path d="M12 3v18"/><path d="M19 3v18"/><path d="M5 12c2-4 5-4 7 0s5 4 7 0"/></svg>
              <span className="text-sm font-medium text-white">CSS Animations</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{cssAnimations.length} found</span>
            </div>
            <button onClick={() => setShowAnimPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {cssAnimations.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No CSS animations found</div>}
            {cssAnimations.map((a, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0 ${a.type === 'keyframes' ? 'bg-fuchsia-500/20 text-fuchsia-400' : a.type === 'animation' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{a.type}</span>
                <span className="text-white font-mono truncate">{a.name}</span>
                <span className="text-[#555] text-[9px] ml-auto truncate max-w-[120px]">{a.file.split('/').pop()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Event Listener Audit Panel ═══ */}
      {showEventAudit && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              <span className="text-sm font-medium text-white">Event Listeners</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{inlineEvents.length} inline</span>
            </div>
            <button onClick={() => setShowEventAudit(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {inlineEvents.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No inline event handlers found ✓</div>}
            {inlineEvents.map((ev, i) => (
              <div key={i} className="p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-mono font-bold">{ev.event}</span>
                  <span className="text-[#888]">on</span>
                  <span className="text-cyan-400 font-mono">&lt;{ev.element}&gt;</span>
                  <span className="text-[#555] text-[9px] ml-auto">{ev.file.split('/').pop()}:{ev.line}</span>
                </div>
                {ev.handler && <div className="text-[9px] text-[#666] font-mono mt-1 truncate">{ev.handler}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Open Graph Preview Panel ═══ */}
      {showOgPreview && ogData && (
        <div className="fixed top-16 right-4 z-40 w-[420px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              <span className="text-sm font-medium text-white">Social Preview</span>
            </div>
            <button onClick={() => setShowOgPreview(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-[10px] text-[#888] mb-1">Facebook / Twitter Card Preview</div>
            <div className="rounded-lg border border-[#333] overflow-hidden bg-white">
              {ogData.image && <div className="h-32 bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 overflow-hidden">
                <img src={ogData.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>}
              <div className="p-3 bg-[#f0f0f0]">
                {ogData.siteName && <div className="text-[10px] text-gray-500 uppercase">{ogData.siteName}</div>}
                <div className="text-sm font-bold text-gray-900 leading-tight">{ogData.title}</div>
                {ogData.desc && <div className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{ogData.desc}</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded bg-[#1a1a1a] border border-[#222]"><span className="text-[#555]">Title:</span> <span className="text-white">{ogData.title || '—'}</span></div>
              <div className="p-2 rounded bg-[#1a1a1a] border border-[#222]"><span className="text-[#555]">Card:</span> <span className="text-white">{ogData.twitterCard}</span></div>
              <div className="p-2 rounded bg-[#1a1a1a] border border-[#222] col-span-2"><span className="text-[#555]">Description:</span> <span className="text-white">{ogData.desc || '—'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Semantic HTML Checker Panel ═══ */}
      {showSemanticPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              <span className="text-sm font-medium text-white">Semantic HTML</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${semanticIssues.length === 0 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{semanticIssues.length === 0 ? 'Clean ✓' : `${semanticIssues.length} issues`}</span>
            </div>
            <button onClick={() => setShowSemanticPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {semanticIssues.length === 0 && <div className="text-center py-6 text-green-400 text-[11px]">All HTML is semantic ✓</div>}
            {semanticIssues.map((s, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 mt-0.5 ${s.severity === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{s.severity}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white">{s.issue}</div>
                  <div className="text-green-400 text-[9px]">→ {s.suggestion}</div>
                </div>
                <span className="text-[#555] text-[9px] shrink-0">{s.file.split('/').pop()}:{s.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ File Change Summary Panel ═══ */}
      {showChangeSummary && (
        <div className="fixed top-16 right-4 z-40 w-[360px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span className="text-sm font-medium text-white">Change Summary</span>
            </div>
            <button onClick={() => setShowChangeSummary(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          {!changeSummary ? (
            <div className="p-6 text-center text-[#555] text-[11px]">No previous snapshot to compare</div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="text-lg font-bold text-green-400">{changeSummary.added.length}</div>
                  <div className="text-[9px] text-[#888]">Added</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="text-lg font-bold text-amber-400">{changeSummary.modified.length}</div>
                  <div className="text-[9px] text-[#888]">Modified</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="text-lg font-bold text-red-400">{changeSummary.removed.length}</div>
                  <div className="text-[9px] text-[#888]">Removed</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-green-400">+{changeSummary.totalLinesAdded} lines</span>
                <span className="text-red-400">-{changeSummary.totalLinesRemoved} lines</span>
              </div>
              {changeSummary.added.length > 0 && <div className="space-y-0.5">{changeSummary.added.map(f => <div key={f} className="text-[10px] text-green-400 font-mono">+ {f}</div>)}</div>}
              {changeSummary.modified.length > 0 && <div className="space-y-0.5">{changeSummary.modified.map(f => <div key={f} className="text-[10px] text-amber-400 font-mono">~ {f}</div>)}</div>}
              {changeSummary.removed.length > 0 && <div className="space-y-0.5">{changeSummary.removed.map(f => <div key={f} className="text-[10px] text-red-400 font-mono">- {f}</div>)}</div>}
            </div>
          )}
        </div>
      )}

      {/* ═══ Whitespace/Indent Checker Panel ═══ */}
      {showWhitespacePanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M21 10H3"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M21 18H3"/></svg>
              <span className="text-sm font-medium text-white">Whitespace Check</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${whitespaceIssues.length === 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{whitespaceIssues.length === 0 ? 'Clean ✓' : `${whitespaceIssues.length} issues`}</span>
            </div>
            <button onClick={() => setShowWhitespacePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {whitespaceIssues.length === 0 && <div className="text-center py-6 text-green-400 text-[11px]">No whitespace issues found ✓</div>}
            {whitespaceIssues.map((w, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0 ${w.type === 'mixed-indent' ? 'bg-red-500/20 text-red-400' : w.type === 'trailing' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>{w.type}</span>
                <span className="text-[#ccc] flex-1 truncate">{w.issue}</span>
                <span className="text-[#555] text-[9px] shrink-0">{w.file.split('/').pop()}:{w.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PWA Checker Panel ═══ */}
      {showPwaPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              <span className="text-sm font-medium text-white">PWA Checker</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${pwaChecks.score >= 80 ? 'bg-green-500/20 text-green-400' : pwaChecks.score >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{pwaChecks.score}%</span>
            </div>
            <button onClick={() => setShowPwaPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3 space-y-1.5">
            {pwaChecks.checks.map(check => (
              <div key={check.name} className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <span className={`text-sm ${check.pass ? 'text-green-400' : 'text-red-400'}`}>{check.pass ? '\u2713' : '\u2717'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white">{check.name}</div>
                  <div className="text-[9px] text-[#555] truncate">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Schema.org Validator Panel ═══ */}
      {showSchemaPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span className="text-sm font-medium text-white">Schema.org / JSON-LD</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{schemaData.length} found</span>
            </div>
            <button onClick={() => setShowSchemaPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {schemaData.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No JSON-LD structured data found</div>}
            {schemaData.map((s, i) => (
              <div key={i} className="rounded-lg bg-[#1a1a1a] border border-[#222] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#222]">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${s.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.valid ? 'Valid' : 'Invalid'}</span>
                  <span className="text-[11px] text-amber-400 font-bold">{s.type}</span>
                  <span className="text-[9px] text-[#555] ml-auto">{s.props.length} properties</span>
                </div>
                {s.props.length > 0 && <div className="px-3 py-1.5 flex flex-wrap gap-1">{s.props.map(p => <span key={p} className="text-[8px] px-1 py-0.5 rounded bg-[#222] text-[#888] font-mono">{p}</span>)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Bundle Size Estimator Panel ═══ */}
      {showBundlePanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              <span className="text-sm font-medium text-white">Bundle Size</span>
            </div>
            <button onClick={() => setShowBundlePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="px-4 py-3 border-b border-[#222] grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-sm font-bold text-white">{(bundleEstimate.totalRaw / 1024).toFixed(1)} KB</div>
              <div className="text-[9px] text-[#555]">Raw Total</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-green-400">{(bundleEstimate.totalMin / 1024).toFixed(1)} KB</div>
              <div className="text-[9px] text-[#555]">Minified</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-amber-400">-{(bundleEstimate.savings / 1024).toFixed(1)} KB</div>
              <div className="text-[9px] text-[#555]">Savings</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {bundleEstimate.files.map(f => (
              <div key={f.path} className="flex items-center gap-2 p-1.5 rounded hover:bg-[#1a1a1a] text-[11px]">
                <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${f.ext === 'js' || f.ext === 'ts' || f.ext === 'tsx' ? 'bg-amber-500/20 text-amber-400' : f.ext === 'css' ? 'bg-purple-500/20 text-purple-400' : f.ext === 'html' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#222] text-[#888]'}`}>{f.ext}</span>
                <span className="text-[#ccc] font-mono flex-1 truncate">{f.path}</span>
                <span className="text-[#888] text-[9px] w-16 text-right">{(f.raw / 1024).toFixed(1)} KB</span>
                <span className="text-green-400 text-[9px] w-16 text-right">{(f.minified / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ARIA Roles Inspector Panel ═══ */}
      {showAriaPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              <span className="text-sm font-medium text-white">ARIA Inspector</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222] text-[#888]">{ariaRoles.length} attributes</span>
            </div>
            <button onClick={() => setShowAriaPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {ariaRoles.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No ARIA attributes found</div>}
            {ariaRoles.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className="text-purple-400 font-mono font-bold text-[10px]">{r.role}</span>
                <span className="text-[#888]">on</span>
                <span className="text-cyan-400 font-mono">&lt;{r.element}&gt;</span>
                {!r.hasLabel && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">no label</span>}
                <span className="text-[#555] text-[9px] ml-auto">{r.file.split('/').pop()}:{r.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Security Headers Check Panel ═══ */}
      {showSecurityPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span className="text-sm font-medium text-white">Security Check</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${securityChecks.score >= 80 ? 'bg-green-500/20 text-green-400' : securityChecks.score >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{securityChecks.score}%</span>
            </div>
            <button onClick={() => setShowSecurityPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-3 space-y-1.5">
            {securityChecks.checks.map(check => (
              <div key={check.name} className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <span className={`text-sm ${check.pass ? 'text-green-400' : 'text-red-400'}`}>{check.pass ? '\u2713' : '\u2717'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white">{check.name}</div>
                  <div className="text-[9px] text-[#555]">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ v23: Collaboration Room Panel ═══ */}
      {showCollabPanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="text-sm font-medium text-white">Collaboration</span>
              {collabRoomId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">{collabRoomId}</span>}
              {collabRoomId && <span className={`text-[9px] px-1.5 py-0.5 rounded ${collabMode === 'remote' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{collabMode === 'remote' ? 'Cross-device' : 'Local tabs'}</span>}
            </div>
            <button onClick={() => setShowCollabPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-4 space-y-4">
            {!collabRoomId ? (
              <>
                <div className="space-y-2">
                  <div className="flex gap-2 mb-3">
                    <input value={collabUserName.current} onChange={e => { collabUserName.current = e.target.value; }} placeholder="Your name..." className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[12px] placeholder:text-[#444] focus:border-indigo-500/50 outline-none" />
                    <div className="w-8 h-8 rounded-full border-2 border-[#333] cursor-pointer flex items-center justify-center" style={{ background: collabColorRef.current }} onClick={() => { collabColorRef.current = collabColors[(collabColors.indexOf(collabColorRef.current) + 1) % collabColors.length]; }}>
                      <span className="text-[8px] text-white/80">&#x21bb;</span>
                    </div>
                  </div>
                  <button onClick={() => startCollabRoom()} className="w-full px-4 py-2.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[12px] font-medium hover:bg-indigo-500/30 transition-all flex items-center justify-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    Create New Room
                  </button>
                  <div className="text-center text-[10px] text-[#555]">or join an existing room</div>
                  <div className="flex gap-2">
                    <input value={collabJoinInput} onChange={e => setCollabJoinInput(e.target.value.toUpperCase())} placeholder="Room code..." maxLength={6} className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[12px] font-mono uppercase placeholder:text-[#444] focus:border-indigo-500/50 outline-none" />
                    <button onClick={() => joinCollabRoom(collabJoinInput)} className="px-4 py-2 rounded-lg bg-[#222] border border-[#333] text-white text-[12px] hover:bg-[#2a2a2a] transition-colors">Join</button>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#222] text-[10px] text-[#555] space-y-1">
                  <p>Real-time collaboration: share your room code with anyone.</p>
                  <p>Cross-device sync via signaling server. Local tabs use BroadcastChannel as fallback.</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <div>
                    <div className="text-[11px] text-[#888]">Room Code</div>
                    <div className="text-lg font-mono font-bold text-emerald-400 tracking-wider">{collabRoomId}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard?.writeText(collabRoomId)} className="px-3 py-1.5 rounded-lg bg-[#222] text-[11px] text-white hover:bg-[#2a2a2a] transition-colors">Copy</button>
                    <button onClick={leaveCollabRoom} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 hover:bg-red-500/20 transition-colors">Leave</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] text-[#888]">Connected ({collabUsers.length})</div>
                  {collabUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: u.color }}>{u.name.slice(0, 2)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-white truncate">{u.name} {u.id === collabUserId.current && <span className="text-[9px] text-[#555]">(you)</span>}</div>
                        {u.cursor && u.id !== collabUserId.current && <div className="text-[9px] text-[#555]">editing {u.cursor.file}</div>}
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  ))}
                </div>
                {/* ═══ v24: Collab Chat ═══ */}
                <div className="border-t border-[#222] pt-3">
                  <div className="text-[11px] text-[#888] mb-2">Chat</div>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5 mb-2">
                    {collabChatMessages.length === 0 && <p className="text-[10px] text-[#555] italic">No messages yet</p>}
                    {collabChatMessages.slice(-20).map((msg, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ background: msg.userColor }}>{msg.userName.slice(0, 2)}</div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium" style={{ color: msg.userColor }}>{msg.userName}</span>
                          <p className="text-[11px] text-gray-300 break-words">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input value={collabChatInput} onChange={e => setCollabChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendCollabChat(); }} placeholder="Message..." className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-indigo-500/50 outline-none" />
                    <button onClick={sendCollabChat} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-[10px] hover:bg-indigo-500/30 transition-colors">Send</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ Google Stitch Design Panel ═══ */}
      {showStitchPanel && (
        <div className="fixed top-16 right-4 z-40 w-[460px] max-h-[80vh] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl flex flex-col">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              <span className="text-sm font-medium text-white">Google Stitch</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">AI Design</span>
            </div>
            <button onClick={() => setShowStitchPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {/* Mode selector */}
            <div className="flex gap-1 bg-[#111] rounded-lg p-0.5">
              <button onClick={() => setStitchMode('single')} className={`flex-1 text-[11px] py-1.5 rounded-md transition-colors ${stitchMode === 'single' ? 'bg-purple-600/20 text-purple-300' : 'text-[#555] hover:text-white'}`}>Single Screen</button>
              <button onClick={() => setStitchMode('loop')} className={`flex-1 text-[11px] py-1.5 rounded-md transition-colors ${stitchMode === 'loop' ? 'bg-purple-600/20 text-purple-300' : 'text-[#555] hover:text-white'}`}>Multi-Page Loop</button>
            </div>

            {/* Design System */}
            <div>
              <label className="text-[10px] text-[#666] uppercase tracking-wider mb-1 block">Design System (optional)</label>
              <textarea
                value={stitchDesignSystem}
                onChange={e => setStitchDesignSystem(e.target.value)}
                placeholder="Palette: Deep Blue (#1a365d), Warm Cream (#faf5f0)&#10;Font: Inter, clean sans-serif&#10;Style: Minimal, dark, rounded corners (12px)"
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none resize-none"
                rows={3}
              />
            </div>

            {stitchMode === 'single' ? (
              <>
                {/* Single screen prompt */}
                <div>
                  <label className="text-[10px] text-[#666] uppercase tracking-wider mb-1 block">Describe your page</label>
                  <textarea
                    value={stitchPrompt}
                    onChange={e => setStitchPrompt(e.target.value)}
                    placeholder="A modern SaaS landing page with hero section, features grid, pricing cards, and testimonials. Dark theme with purple accents."
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none resize-none"
                    rows={4}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) stitchGenerate(); }}
                  />
                </div>
                <button
                  onClick={stitchGenerate}
                  disabled={stitchLoading || !stitchPrompt.trim()}
                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-[12px] font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {stitchLoading ? (
                    <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Generating...</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg> Generate with Stitch</>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Multi-page loop */}
                <div className="space-y-2">
                  <label className="text-[10px] text-[#666] uppercase tracking-wider mb-1 block">Pages to generate</label>
                  {stitchPages.map((page, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={page.name}
                        onChange={e => setStitchPages(prev => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))}
                        placeholder="Page name"
                        className="w-24 px-2 py-1.5 rounded-md bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none"
                      />
                      <input
                        value={page.prompt}
                        onChange={e => setStitchPages(prev => prev.map((p, j) => j === i ? { ...p, prompt: e.target.value } : p))}
                        placeholder="Description for this page..."
                        className="flex-1 px-2 py-1.5 rounded-md bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none"
                      />
                      {stitchPages.length > 1 && (
                        <button onClick={() => setStitchPages(prev => prev.filter((_, j) => j !== i))} className="text-[#555] hover:text-red-400 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setStitchPages(prev => [...prev, { name: '', prompt: '' }])} className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors">+ Add page</button>
                </div>
                <button
                  onClick={stitchRunLoop}
                  disabled={stitchLoading || stitchPages.every(p => !p.name.trim() || !p.prompt.trim())}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-[12px] font-medium transition-all flex items-center justify-center gap-2"
                >
                  {stitchLoading ? (
                    <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Building {stitchPages.filter(p => p.name.trim()).length} pages...</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg> Run Stitch Loop</>
                  )}
                </button>
              </>
            )}

            {/* Error display */}
            {stitchError && (
              <div className="text-[11px] text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                {stitchError}
              </div>
            )}

            {/* Project ID */}
            {stitchProjectId && (
              <div className="text-[10px] text-[#555] flex items-center gap-1.5">
                <span className="text-[#444]">Project:</span>
                <span className="font-mono text-[#777]">{stitchProjectId}</span>
              </div>
            )}

            {/* Generated screens */}
            {stitchScreens.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#222]">
                <div className="text-[10px] text-[#666] uppercase tracking-wider">Generated Screens ({stitchScreens.length})</div>
                {stitchScreens.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#111] border border-[#222] hover:border-purple-500/30 transition-colors group">
                    {s.imageUrl && (
                      <img src={s.imageUrl} alt={s.page} className="w-16 h-12 rounded object-cover bg-[#1a1a1a]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-white font-medium truncate">{s.page}</div>
                      <div className="text-[9px] text-[#555] font-mono truncate">{s.screenId}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {s.html && (
                        <button
                          onClick={() => {
                            const fileName = s.page.toLowerCase().replace(/\s+/g, '-') + '.html';
                            setProjectFiles(prev => ({ ...prev, [fileName]: { content: s.html!, language: 'html' } }));
                            showToast(`Imported ${fileName}`, 'success');
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                        >
                          Import
                        </button>
                      )}
                      {s.htmlUrl && (
                        <a href={s.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] px-1.5 py-0.5 rounded bg-[#222] text-[#888] hover:text-white">
                          HTML
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* How it works */}
            {stitchScreens.length === 0 && !stitchLoading && (
              <div className="text-[10px] text-[#444] pt-2 border-t border-[#222] space-y-1">
                <div className="text-[#666] font-medium mb-1">How it works</div>
                <div>1. Describe your page → Stitch generates a high-fidelity design</div>
                <div>2. Auto-enhanced prompts for professional UI/UX results</div>
                <div>3. HTML imported directly into your project files</div>
                <div>4. Use Loop mode to build an entire multi-page site</div>
                <div className="pt-1 text-[#555]">Requires STITCH_API_KEY in .env.local</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ v23: Feedback Panel ═══ */}
      {showFeedbackPanel && (
        <div className="fixed top-16 right-4 z-40 w-[360px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span className="text-sm font-medium text-white">Send Feedback</span>
            </div>
            <button onClick={() => setShowFeedbackPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="p-4 space-y-4">
            {feedbackSubmitted ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🎉</div>
                <div className="text-sm text-white font-medium">Thank you for your feedback!</div>
                <div className="text-[11px] text-[#555] mt-1">It helps us improve Aurion.</div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-[12px] text-[#aaa] mb-3">How would you rate your experience?</div>
                  <div className="flex justify-center gap-3">
                    {[
                      { emoji: '😞', label: 'Terrible', value: 1 },
                      { emoji: '😕', label: 'Poor', value: 2 },
                      { emoji: '😐', label: 'Okay', value: 3 },
                      { emoji: '😊', label: 'Good', value: 4 },
                      { emoji: '😍', label: 'Amazing', value: 5 },
                    ].map(r => (
                      <button key={r.value} onClick={() => setFeedbackRating(r.value)} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${feedbackRating === r.value ? 'bg-amber-500/15 border border-amber-500/30 scale-110' : 'hover:bg-[#1a1a1a] border border-transparent'}`}>
                        <span className="text-2xl">{r.emoji}</span>
                        <span className="text-[9px] text-[#666]">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="Tell us more (optional)..." rows={3} className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-[12px] placeholder:text-[#444] focus:border-amber-500/50 outline-none resize-none" />
                <button onClick={submitFeedback} disabled={feedbackRating === 0} className="w-full px-4 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[12px] font-medium hover:bg-amber-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed">Submit Feedback</button>
                {feedbackHistory.length > 0 && <div className="text-[9px] text-[#444] text-center">{feedbackHistory.length} previous feedback{feedbackHistory.length !== 1 ? 's' : ''} submitted</div>}
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ v23: Onboarding Tour Overlay ═══ */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-[480px] bg-[#161616] rounded-2xl border border-[#2a2a2a] shadow-2xl overflow-hidden">
            <div className="relative h-36 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-cyan-600/10 flex items-center justify-center">
              <span className="text-5xl">{onboardingSteps[onboardingStep]?.icon}</span>
              <div className="absolute top-3 right-3 flex gap-1">
                {onboardingSteps.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === onboardingStep ? 'bg-white w-4' : i < onboardingStep ? 'bg-white/50' : 'bg-white/20'}`} />)}
              </div>
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-lg font-bold text-white">{onboardingSteps[onboardingStep]?.title}</h3>
              <p className="text-[13px] text-[#aaa] leading-relaxed">{onboardingSteps[onboardingStep]?.desc}</p>
            </div>
            <div className="px-6 pb-6 flex items-center justify-between">
              <button onClick={finishOnboarding} className="text-[11px] text-[#555] hover:text-white transition-colors">Skip tour</button>
              <div className="flex gap-2">
                {onboardingStep > 0 && <button onClick={() => setOnboardingStep(s => s - 1)} className="px-4 py-2 rounded-lg bg-[#222] text-[12px] text-white hover:bg-[#2a2a2a] transition-colors">Back</button>}
                {onboardingStep < onboardingSteps.length - 1 ? (
                  <button onClick={() => setOnboardingStep(s => s + 1)} className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[12px] font-medium hover:bg-indigo-500/30 transition-colors">Next</button>
                ) : (
                  <button onClick={finishOnboarding} className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[12px] font-medium hover:bg-indigo-500/30 transition-colors">Get Started</button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ v23: Changelog / What's New ═══ */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowChangelog(false)}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={e => e.stopPropagation()} className="w-[520px] max-h-[600px] bg-[#161616] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚀</span>
                <span className="text-base font-bold text-white">{"What's New in Aurion"}</span>
              </div>
              <button onClick={() => setShowChangelog(false)} className="text-[#555] hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {[
                { version: 'v23', date: 'Latest', title: 'Collaboration, Feedback & AI Quality', items: ['Real-time collaboration rooms with BroadcastChannel sync', 'Feedback widget with emoji ratings', 'Interactive onboarding tour for new users', 'Enhanced AI system prompts for better code generation', 'Iterative editing intelligence — AI preserves existing code', 'Error recovery protocol — smarter debugging', 'Changelog panel (you are here!)'] },
                { version: 'v22', date: 'Previous', title: 'PWA, Schema, Bundle & Security', items: ['PWA Checker', 'Schema.org/JSON-LD Validator', 'Bundle Size Estimator', 'ARIA Roles Inspector', 'Security Headers Check', 'Project Export as ZIP'] },
                { version: 'v21', date: 'Previous', title: 'CSS Animations & Semantic HTML', items: ['CSS Animation Inspector', 'Event Listener Audit', 'Open Graph Preview', 'Semantic HTML Checker', 'File Change Summary', 'Whitespace/Indent Checker'] },
                { version: 'v20', date: 'Previous', title: 'Console, Colors & Performance', items: ['Console Filter & Export', 'Inline Color Picker', 'Code Folding Map', 'Dependency Graph', 'Performance Budget', 'Responsive Preview Grid'] },
                { version: 'v19', date: 'Previous', title: 'Regex, CSS & Code Analysis', items: ['Regex Tester', 'CSS Specificity Calculator', 'Image Lazy Loading Checker', 'Text Statistics', 'Duplicate Code Detector', 'Element Counter'] },
              ].map(release => (
                <div key={release.version}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold">{release.version}</span>
                    <span className="text-[10px] text-[#555]">{release.date}</span>
                  </div>
                  <h4 className="text-[13px] font-bold text-white mb-2">{release.title}</h4>
                  <ul className="space-y-1">
                    {release.items.map((item, i) => (
                      <li key={i} className="text-[11px] text-[#aaa] flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5 shrink-0">+</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ v24: Visual Drag & Drop Builder ═══ */}
      {showVisualBuilder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          {/* Component Palette */}
          <div className="w-[280px] bg-[#111] border-r border-[#2a2a2a] flex flex-col">
            <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
              <span className="text-[13px] font-bold text-white">Components</span>
              <button onClick={() => setShowVisualBuilder(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {vbComponents.map(comp => (
                <button key={comp.id} onClick={() => vbAddComponent(comp.id)} draggable onDragStart={() => setVbDragging(comp.id)} onDragEnd={() => setVbDragging(null)} className="w-full p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] hover:border-purple-500/40 transition-colors text-left flex items-center gap-3 group cursor-grab active:cursor-grabbing">
                  <span className="text-xl">{comp.icon}</span>
                  <div>
                    <div className="text-[12px] text-white font-medium group-hover:text-purple-400 transition-colors">{comp.name}</div>
                    <div className="text-[10px] text-[#555]">Click or drag to add</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-2.5 bg-[#161616] border-b border-[#2a2a2a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold text-white">Canvas</span>
                <span className="text-[10px] text-[#555]">{vbCanvas.length} components</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setVbCanvas([])} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Clear All</button>
                <button onClick={vbGenerateCode} disabled={vbCanvas.length === 0} className="px-3 py-1 text-[10px] text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-30">Generate Code →</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-6" onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={e => { e.preventDefault(); if (vbDragging) vbAddComponent(vbDragging); }}>
              {vbCanvas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#333] border-2 border-dashed border-[#222] rounded-xl">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  <p className="mt-3 text-[13px]">Drag & drop components here</p>
                  <p className="text-[10px] text-[#444] mt-1">Or click a component to add it</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vbCanvas.map((html, idx) => (
                    <div key={idx} onClick={() => setVbSelectedIdx(idx)} className={`relative group rounded-lg overflow-hidden transition-all ${vbSelectedIdx === idx ? 'ring-2 ring-purple-500' : 'ring-1 ring-transparent hover:ring-[#333]'}`}>
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); vbMoveComponent(idx, 'up'); }} disabled={idx === 0} className="w-6 h-6 flex items-center justify-center bg-black/80 rounded text-white text-[10px] hover:bg-purple-600 disabled:opacity-30">↑</button>
                        <button onClick={(e) => { e.stopPropagation(); vbMoveComponent(idx, 'down'); }} disabled={idx === vbCanvas.length - 1} className="w-6 h-6 flex items-center justify-center bg-black/80 rounded text-white text-[10px] hover:bg-purple-600 disabled:opacity-30">↓</button>
                        <button onClick={(e) => { e.stopPropagation(); vbRemoveComponent(idx); }} className="w-6 h-6 flex items-center justify-center bg-black/80 rounded text-red-400 text-[10px] hover:bg-red-600 hover:text-white">×</button>
                      </div>
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/80 rounded text-[9px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">{idx + 1}</div>
                      <iframe sandbox="" srcDoc={html} className="w-full h-[120px] border-0 pointer-events-none" title={`Component ${idx + 1}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          {vbSelectedIdx >= 0 && (
            <div className="w-[300px] bg-[#111] border-l border-[#2a2a2a] flex flex-col">
              <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
                <span className="text-[12px] font-bold text-white">Properties</span>
                <div className="flex gap-1">
                  {(['style', 'content'] as const).map(tab => (
                    <button key={tab} onClick={() => setVbPropertyTab(tab)} className={`px-2 py-0.5 rounded text-[10px] transition-colors ${vbPropertyTab === tab ? 'bg-purple-600 text-white' : 'text-[#666] hover:text-white'}`}>{tab}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {vbPropertyTab === 'content' ? (
                  <textarea value={vbCanvas[vbSelectedIdx] || ''} onChange={e => setVbCanvas(prev => { const n = [...prev]; n[vbSelectedIdx] = e.target.value; return n; })} className="w-full h-full bg-[#0a0a0a] text-[11px] text-green-400 font-mono p-3 rounded-lg border border-[#222] focus:border-purple-500 focus:outline-none resize-none" spellCheck={false} />
                ) : (
                  <div className="space-y-3 text-[11px]">
                    <p className="text-[#555]">Select a component on the canvas to edit its HTML directly in the Content tab.</p>
                    <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#222]">
                      <div className="text-[10px] text-[#888] mb-1">Component #{vbSelectedIdx + 1}</div>
                      <div className="text-[10px] text-[#555]">{vbCanvas[vbSelectedIdx]?.length || 0} chars</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ v24: Animation Timeline Builder ═══ */}
      {showAnimBuilder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[800px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-bold text-white">Animation Builder</span>
                <span className="text-[10px] text-[#555]">{animKeyframes.length} animations</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={animCopyCSS} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Copy CSS</button>
                <button onClick={animInjectToProject} disabled={animKeyframes.length === 0} className="px-3 py-1 text-[10px] text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-30">Inject to Project</button>
                <button onClick={() => setShowAnimBuilder(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </div>
            <div className="flex flex-1 min-h-0">
              {/* Animation List */}
              <div className="w-[200px] border-r border-[#222] flex flex-col">
                <button onClick={animAddNew} className="m-2 px-3 py-2 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors">+ New Animation</button>
                <div className="flex-1 overflow-y-auto">
                  {animKeyframes.map((anim, i) => (
                    <div key={anim.id} onClick={() => setAnimSelected(i)} className={`px-3 py-2 cursor-pointer border-b border-[#1a1a1a] flex items-center justify-between ${animSelected === i ? 'bg-indigo-500/10 text-white' : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'}`}>
                      <span className="text-[11px] truncate">{anim.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); animDeleteAnim(i); }} className="text-[#555] hover:text-red-400 shrink-0"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-y-auto p-4">
                {animSelected >= 0 && animKeyframes[animSelected] ? (() => {
                  const anim = animKeyframes[animSelected];
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div><label className="text-[9px] text-[#555] uppercase">Name</label><input value={anim.name} onChange={e => setAnimKeyframes(prev => { const n = [...prev]; n[animSelected] = { ...n[animSelected], name: e.target.value }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none" /></div>
                        <div><label className="text-[9px] text-[#555] uppercase">Duration (s)</label><input type="number" step="0.1" min="0.1" value={anim.duration} onChange={e => setAnimKeyframes(prev => { const n = [...prev]; n[animSelected] = { ...n[animSelected], duration: parseFloat(e.target.value) || 0.1 }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none" /></div>
                        <div><label className="text-[9px] text-[#555] uppercase">Easing</label><select value={anim.easing} onChange={e => setAnimKeyframes(prev => { const n = [...prev]; n[animSelected] = { ...n[animSelected], easing: e.target.value }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none">{['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'cubic-bezier(0.22,1,0.36,1)'].map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                        <div><label className="text-[9px] text-[#555] uppercase">Iteration</label><select value={anim.iteration} onChange={e => setAnimKeyframes(prev => { const n = [...prev]; n[animSelected] = { ...n[animSelected], iteration: e.target.value }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none">{['1', '2', '3', 'infinite'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                      </div>

                      {/* Timeline */}
                      <div className="relative h-8 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
                        {anim.frames.map((frame, fi) => (
                          <div key={fi} className="absolute top-0 h-full w-1 bg-indigo-500 rounded-full" style={{ left: `${frame.pct}%` }}>
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-indigo-400 whitespace-nowrap">{frame.pct}%</div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-500 rounded-full border-2 border-indigo-300" />
                          </div>
                        ))}
                      </div>

                      {/* Keyframes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white font-medium">Keyframes</span>
                          <button onClick={() => animAddFrame(animSelected)} className="text-[10px] text-indigo-400 hover:text-indigo-300">+ Add Frame</button>
                        </div>
                        {anim.frames.map((frame, fi) => (
                          <div key={fi} className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-indigo-400 font-bold">{frame.pct}%</span>
                                <input type="range" min="0" max="100" value={frame.pct} onChange={e => setAnimKeyframes(prev => { const n = [...prev]; const a = { ...n[animSelected], frames: [...n[animSelected].frames] }; a.frames[fi] = { ...a.frames[fi], pct: parseInt(e.target.value) }; n[animSelected] = a; return n; })} className="w-20 h-1 accent-indigo-500" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(frame.props).map(([prop, val]) => (
                                <div key={prop} className="flex items-center gap-1">
                                  <span className="text-[9px] text-[#666] w-16 truncate">{prop}</span>
                                  <input value={val} onChange={e => animUpdateFrame(animSelected, fi, prop, e.target.value)} className="flex-1 px-1.5 py-0.5 bg-[#0a0a0a] border border-[#222] rounded text-[10px] text-white focus:border-indigo-500 focus:outline-none" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Preview */}
                      <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] text-white font-medium">Preview</span>
                          <button onClick={() => setAnimPreviewPlaying(p => !p)} className={`px-3 py-1 rounded text-[10px] transition-colors ${animPreviewPlaying ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{animPreviewPlaying ? '⏹ Stop' : '▶ Play'}</button>
                        </div>
                        <div className="h-20 flex items-center justify-center">
                          <div className="w-16 h-16 bg-indigo-600 rounded-xl" style={animPreviewPlaying ? { animation: `${anim.name} ${anim.duration}s ${anim.easing} ${anim.iteration === 'infinite' ? 'infinite' : anim.iteration}` } : undefined} />
                        </div>
                        {animPreviewPlaying && <style>{animGenerateCSS()}</style>}
                      </div>

                      {/* Generated CSS */}
                      <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                        <div className="text-[9px] text-[#555] uppercase mb-2">Generated CSS</div>
                        <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap">{animGenerateCSS()}</pre>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="h-full flex items-center justify-center text-[#333]">
                    <div className="text-center">
                      <p className="text-[13px] mb-2">No animation selected</p>
                      <button onClick={animAddNew} className="px-4 py-2 text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20">Create your first animation</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ v24: Design System Manager ═══ */}
      {showDesignSystem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[900px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-bold text-white">Design System</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { const css = dsGenerateCSS(); navigator.clipboard.writeText(css); }} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Copy CSS</button>
                <button onClick={() => { const json = dsGenerateTokensJSON(); navigator.clipboard.writeText(json); }} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Copy JSON</button>
                <button onClick={() => setShowDesignSystem(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#222] px-4">
              {(['colors', 'typography', 'spacing', 'shadows', 'export'] as const).map(tab => (
                <button key={tab} onClick={() => setDsTab(tab)} className={`px-4 py-2.5 text-[11px] font-medium transition-colors border-b-2 ${dsTab === tab ? 'text-pink-400 border-pink-400' : 'text-[#666] border-transparent hover:text-white'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {dsTab === 'colors' && (
                <div className="space-y-6">
                  {dsColors.map((color, ci) => (
                    <div key={ci}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-6 h-6 rounded-md border border-[#333]" style={{ backgroundColor: color.value }} />
                        <span className="text-[12px] text-white font-medium">{color.name}</span>
                        <span className="text-[10px] text-[#555]">{color.value}</span>
                        <button onClick={() => setDsColors(prev => prev.filter((_, i) => i !== ci))} className="text-[10px] text-[#555] hover:text-red-400 ml-auto">Remove</button>
                      </div>
                      <div className="flex gap-1">
                        {color.variants.map((v, vi) => (
                          <div key={vi} className="flex-1 group cursor-pointer" onClick={() => navigator.clipboard.writeText(v)}>
                            <div className="h-10 rounded-md transition-transform group-hover:scale-110" style={{ backgroundColor: v }} />
                            <div className="text-[8px] text-[#555] text-center mt-1 group-hover:text-white">{(vi + 1) * 100}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => dsAddColor('Custom', '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))} className="w-full py-2.5 border-2 border-dashed border-[#2a2a2a] rounded-lg text-[11px] text-[#555] hover:text-pink-400 hover:border-pink-500/30 transition-colors">+ Add Color</button>
                </div>
              )}

              {dsTab === 'typography' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#555] uppercase">Primary Font</label>
                      <select value={dsFontPrimary} onChange={e => setDsFontPrimary(e.target.value)} className="w-full mt-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-white focus:border-pink-500 focus:outline-none">
                        {['Inter', 'Plus Jakarta Sans', 'DM Sans', 'Space Grotesk', 'Outfit', 'Sora', 'Poppins', 'Manrope', 'Geist'].map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#555] uppercase">Monospace Font</label>
                      <select value={dsFontSecondary} onChange={e => setDsFontSecondary(e.target.value)} className="w-full mt-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-white focus:border-pink-500 focus:outline-none">
                        {['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Geist Mono'].map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[11px] text-white font-medium">Type Scale</span>
                    {dsTypeScale.map((t, i) => (
                      <div key={i} className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex items-center gap-4">
                        <span className="text-[10px] text-pink-400 w-16 shrink-0">{t.name}</span>
                        <span style={{ fontSize: t.size, fontWeight: parseInt(t.weight), lineHeight: t.lineHeight }} className="text-white truncate flex-1">The quick brown fox</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-[#555]">{t.size}</span>
                          <span className="text-[9px] text-[#555]">w{t.weight}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dsTab === 'spacing' && (
                <div className="space-y-4">
                  <span className="text-[11px] text-white font-medium">Spacing Scale</span>
                  <div className="space-y-2">
                    {dsSpacing.map(s => (
                      <div key={s} className="flex items-center gap-4">
                        <span className="text-[10px] text-[#555] w-12 shrink-0">{s}px</span>
                        <div className="h-4 bg-pink-500/30 rounded-sm" style={{ width: `${Math.min(s * 2, 300)}px` }} />
                        <span className="text-[9px] text-[#666]">--space-{s}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] text-white font-medium block mt-6">Border Radius</span>
                  <div className="flex gap-3 flex-wrap">
                    {dsBorderRadius.map(r => (
                      <div key={r} className="text-center">
                        <div className="w-12 h-12 bg-pink-500/20 border border-pink-500/30" style={{ borderRadius: `${r}px` }} />
                        <span className="text-[9px] text-[#555] mt-1 block">{r === 9999 ? 'full' : `${r}px`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dsTab === 'shadows' && (
                <div className="space-y-4">
                  <span className="text-[11px] text-white font-medium">Shadow Scale</span>
                  <div className="grid grid-cols-3 gap-4">
                    {dsShadows.map(s => (
                      <div key={s.name} className="p-6 bg-[#1a1a1a] rounded-xl text-center cursor-pointer hover:scale-105 transition-transform" style={{ boxShadow: s.value }} onClick={() => navigator.clipboard.writeText(s.value)}>
                        <span className="text-[11px] text-white font-medium">{s.name}</span>
                        <div className="text-[8px] text-[#555] mt-1 truncate">{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dsTab === 'export' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#222]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-white font-medium">CSS Variables</span>
                      <button onClick={() => navigator.clipboard.writeText(dsGenerateCSS())} className="text-[10px] text-pink-400 hover:text-pink-300">Copy</button>
                    </div>
                    <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">{dsGenerateCSS()}</pre>
                  </div>
                  <div className="p-4 bg-[#0a0a0a] rounded-lg border border-[#222]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-white font-medium">Design Tokens (JSON)</span>
                      <button onClick={() => navigator.clipboard.writeText(dsGenerateTokensJSON())} className="text-[10px] text-pink-400 hover:text-pink-300">Copy</button>
                    </div>
                    <pre className="text-[10px] text-amber-400 font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">{dsGenerateTokensJSON()}</pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ v24: REST API Tester ═══ */}
      {showApiTester && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[850px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <span className="text-[14px] font-bold text-white">API Tester</span>
              <button onClick={() => setShowApiTester(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>

            {/* Request Bar */}
            <div className="px-4 py-3 border-b border-[#222] flex items-center gap-2">
              <select value={apiMethod} onChange={e => setApiMethod(e.target.value as typeof apiMethod)} className={`px-3 py-2 rounded-lg text-[12px] font-bold border border-[#2a2a2a] focus:outline-none ${apiMethod === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : apiMethod === 'POST' ? 'bg-amber-500/10 text-amber-400' : apiMethod === 'PUT' ? 'bg-blue-500/10 text-blue-400' : apiMethod === 'PATCH' ? 'bg-purple-500/10 text-purple-400' : 'bg-red-500/10 text-red-400'}`}>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://api.example.com/endpoint" className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-white placeholder-[#444] focus:border-amber-500 focus:outline-none" onKeyDown={e => e.key === 'Enter' && apiSendRequest()} />
              <button onClick={apiSendRequest} disabled={apiLoading || !apiUrl.trim()} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold rounded-lg transition-colors disabled:opacity-30 flex items-center gap-2">
                {apiLoading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : null}
                Send
              </button>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Request Panel */}
              <div className="w-1/2 border-r border-[#222] flex flex-col">
                <div className="flex border-b border-[#222]">
                  {(['body', 'headers', 'history'] as const).map(tab => (
                    <button key={tab} onClick={() => setApiTab(tab)} className={`flex-1 py-2 text-[10px] font-medium transition-colors border-b-2 ${apiTab === tab ? 'text-amber-400 border-amber-400' : 'text-[#555] border-transparent hover:text-white'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}{tab === 'headers' ? ` (${apiHeaders.length})` : tab === 'history' ? ` (${apiHistory.length})` : ''}</button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {apiTab === 'body' && (
                    <textarea value={apiBody} onChange={e => setApiBody(e.target.value)} className="w-full h-full bg-[#0a0a0a] border border-[#222] rounded-lg p-3 text-[11px] text-amber-400 font-mono focus:border-amber-500 focus:outline-none resize-none" placeholder='{ "key": "value" }' spellCheck={false} />
                  )}
                  {apiTab === 'headers' && (
                    <div className="space-y-2">
                      {apiHeaders.map((h, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={h.key} onChange={e => setApiHeaders(prev => { const n = [...prev]; n[i] = { ...n[i], key: e.target.value }; return n; })} placeholder="Key" className="flex-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#222] rounded text-[10px] text-white focus:border-amber-500 focus:outline-none" />
                          <input value={h.value} onChange={e => setApiHeaders(prev => { const n = [...prev]; n[i] = { ...n[i], value: e.target.value }; return n; })} placeholder="Value" className="flex-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#222] rounded text-[10px] text-white focus:border-amber-500 focus:outline-none" />
                          <button onClick={() => apiRemoveHeader(i)} className="text-[#555] hover:text-red-400"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                        </div>
                      ))}
                      <button onClick={apiAddHeader} className="w-full py-1.5 border border-dashed border-[#333] rounded text-[10px] text-[#555] hover:text-amber-400 hover:border-amber-500/30 transition-colors">+ Add Header</button>
                    </div>
                  )}
                  {apiTab === 'history' && (
                    <div className="space-y-1">
                      {apiHistory.length === 0 ? <p className="text-[11px] text-[#444] text-center py-8">No requests yet</p> :
                        apiHistory.map((h, i) => (
                          <button key={i} onClick={() => { setApiMethod(h.method as typeof apiMethod); setApiUrl(h.url); }} className="w-full p-2 bg-[#1a1a1a] rounded-lg border border-[#222] hover:border-[#333] transition-colors text-left flex items-center gap-2">
                            <span className={`text-[9px] font-bold ${h.method === 'GET' ? 'text-emerald-400' : h.method === 'POST' ? 'text-amber-400' : h.method === 'DELETE' ? 'text-red-400' : 'text-blue-400'}`}>{h.method}</span>
                            <span className="text-[10px] text-[#888] truncate flex-1">{h.url}</span>
                            <span className={`text-[9px] ${h.status < 300 ? 'text-emerald-400' : h.status < 400 ? 'text-amber-400' : 'text-red-400'}`}>{h.status}</span>
                            <span className="text-[9px] text-[#555]">{h.time}ms</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Response Panel */}
              <div className="w-1/2 flex flex-col">
                <div className="px-3 py-2 border-b border-[#222] flex items-center gap-3">
                  <span className="text-[10px] text-[#555]">Response</span>
                  {apiResponse && (
                    <>
                      <span className={`text-[10px] font-bold ${apiResponse.status < 300 ? 'text-emerald-400' : apiResponse.status < 400 ? 'text-amber-400' : 'text-red-400'}`}>{apiResponse.status || 'Error'}</span>
                      <span className="text-[10px] text-[#555]">{apiResponse.time}ms</span>
                      <span className="text-[10px] text-[#555]">{(apiResponse.data.length / 1024).toFixed(1)} KB</span>
                    </>
                  )}
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {apiResponse ? (
                    <pre className="text-[10px] text-emerald-400 font-mono whitespace-pre-wrap break-all">{(() => { try { return JSON.stringify(JSON.parse(apiResponse.data), null, 2); } catch { return apiResponse.data; } })()}</pre>
                  ) : (
                    <p className="text-[12px] text-[#333] text-center py-12">Send a request to see the response</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ v24: Git Branch Manager ═══ */}
      {showGitPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[70vh] bg-[#111] rounded-xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
              <span className="text-[13px] font-bold text-white">Git</span>
              <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[9px] rounded-full border border-orange-500/20">{gitCurrentBranch}</span>
            </div>
            <button onClick={() => setShowGitPanel(false)} className="text-[#555] hover:text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#222]">
            {(['branches', 'commits', 'stash', 'remote'] as const).map(tab => (
              <button key={tab} onClick={() => setGitTab(tab as 'branches' | 'commits' | 'stash')} className={`flex-1 py-2 text-[10px] font-medium transition-colors border-b-2 ${gitTab === tab ? 'text-orange-400 border-orange-400' : 'text-[#555] border-transparent hover:text-white'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}{tab === 'branches' ? ` (${gitBranches.length})` : tab === 'commits' ? ` (${gitBranchCommits.length})` : tab === 'stash' ? ` (${gitStash.length})` : ''}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {gitTab === 'branches' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input value={gitNewBranch} onChange={e => setGitNewBranch(e.target.value)} placeholder="New branch name..." className="flex-1 px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white placeholder-[#444] focus:border-orange-500 focus:outline-none" onKeyDown={e => e.key === 'Enter' && gitCreateBranch(gitNewBranch)} />
                  <button onClick={() => gitCreateBranch(gitNewBranch)} disabled={!gitNewBranch.trim()} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30">Create</button>
                </div>
                {gitBranches.map(branch => (
                  <div key={branch.name} className={`p-3 rounded-lg border transition-colors ${branch.current ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {branch.current && <div className="w-2 h-2 rounded-full bg-orange-400" />}
                        <span className={`text-[11px] font-medium ${branch.current ? 'text-orange-400' : 'text-white'}`}>{branch.name}</span>
                        <span className="text-[9px] text-[#555]">{branch.commits} commits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!branch.current && <button onClick={() => gitSwitchBranch(branch.name)} className="px-2 py-0.5 text-[9px] text-[#888] hover:text-white bg-[#222] rounded transition-colors">Checkout</button>}
                        {branch.name !== 'main' && !branch.current && <button onClick={() => gitDeleteBranch(branch.name)} className="px-2 py-0.5 text-[9px] text-red-400/50 hover:text-red-400 bg-[#222] rounded transition-colors">Delete</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {gitTab === 'commits' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input value={gitCommitMsg} onChange={e => setGitCommitMsg(e.target.value)} placeholder="Commit message..." className="flex-1 px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white placeholder-[#444] focus:border-orange-500 focus:outline-none" onKeyDown={e => e.key === 'Enter' && gitCommit(gitCommitMsg)} />
                  <button onClick={() => gitCommit(gitCommitMsg)} disabled={!gitCommitMsg.trim()} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30">Commit</button>
                </div>
                <div className="text-[9px] text-[#555]">{Object.keys(projectFiles).length} files in working tree</div>
                {gitBranchCommits.length === 0 ? <p className="text-[11px] text-[#444] text-center py-6">No commits yet</p> :
                  <div className="relative pl-4 border-l border-[#2a2a2a] space-y-3">
                    {gitBranchCommits.map(commit => (
                      <div key={commit.id} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-[#111]" />
                        <div className="p-2.5 bg-[#1a1a1a] rounded-lg border border-[#222]">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-white">{commit.message}</span>
                            <span className="text-[8px] text-orange-400 font-mono">{commit.id}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-[#555]">{commit.branch}</span>
                            <span className="text-[9px] text-[#555]">{commit.files.length} files</span>
                            <span className="text-[9px] text-[#555]">{new Date(commit.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}

            {gitTab === 'stash' && (
              <div className="space-y-2">
                <button onClick={gitStashSave} className="w-full py-2 border border-dashed border-[#333] rounded-lg text-[11px] text-[#888] hover:text-orange-400 hover:border-orange-500/30 transition-colors">Stash Current Changes</button>
                {gitStash.length === 0 ? <p className="text-[11px] text-[#444] text-center py-6">No stashes</p> :
                  gitStash.map((stash, i) => (
                    <div key={stash.id} className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-white">{stash.message}</div>
                        <div className="text-[9px] text-[#555] mt-0.5">{Object.keys(stash.files).length} files · {new Date(stash.timestamp).toLocaleString()}</div>
                      </div>
                      <button onClick={() => gitStashPop(i)} className="px-2.5 py-1 text-[9px] text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded hover:bg-orange-500/20 transition-colors">Pop</button>
                    </div>
                  ))
                }
              </div>
            )}

            {gitTab === 'remote' && (
              <div className="space-y-3">
                {/* GitHub Token */}
                <div><input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} placeholder="GitHub token (ghp_...)" className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white placeholder-[#444] focus:border-orange-500 focus:outline-none" /></div>
                <button onClick={gitFetchRepos} disabled={!githubToken || gitRemoteLoading} className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30">{gitRemoteLoading ? 'Loading...' : 'Fetch Repos'}</button>

                {gitRepos.length > 0 && (
                  <div className="space-y-2">
                    <select value={gitSelectedRepo} onChange={e => { setGitSelectedRepo(e.target.value); if (e.target.value) { gitFetchBranches(e.target.value); gitFetchPRs(); gitFetchCommits(e.target.value); } }} className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white focus:border-orange-500 focus:outline-none">
                      <option value="">Select repo...</option>
                      {gitRepos.map(r => <option key={r.fullName} value={r.fullName}>{r.fullName} {r.language ? `(${r.language})` : ''}</option>)}
                    </select>
                  </div>
                )}

                {gitSelectedRepo && (
                  <>
                    {/* Branches */}
                    {gitRemoteBranches.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] text-[#888] font-medium">Branches ({gitRemoteBranches.length})</div>
                        <div className="max-h-[100px] overflow-y-auto space-y-1">
                          {gitRemoteBranches.map(b => (
                            <div key={b.name} className="flex items-center justify-between p-1.5 bg-[#1a1a1a] rounded border border-[#222] text-[10px]">
                              <span className="text-white truncate">{b.name}</span>
                              <div className="flex gap-1">
                                <button onClick={() => gitFetchCommits(gitSelectedRepo, b.name)} className="px-1.5 py-0.5 text-[8px] text-[#888] bg-[#222] rounded hover:text-white">Log</button>
                                {b.name !== 'main' && <button onClick={() => gitMergeBranch(b.name, 'main')} className="px-1.5 py-0.5 text-[8px] text-orange-400 bg-orange-500/10 rounded hover:bg-orange-500/20">Merge→main</button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Create PR */}
                    <div className="space-y-2 p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-orange-400 font-medium">Create Pull Request</div>
                      <input value={gitPRTitle} onChange={e => setGitPRTitle(e.target.value)} placeholder="PR title..." className="w-full px-2 py-1.5 bg-[#111] border border-[#2a2a2a] rounded text-[10px] text-white placeholder-[#444] focus:outline-none" />
                      <div className="flex gap-2">
                        <select value={gitPRHead} onChange={e => setGitPRHead(e.target.value)} className="flex-1 px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-[10px] text-white focus:outline-none">
                          <option value="">Head branch...</option>
                          {gitRemoteBranches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                        <span className="text-[10px] text-[#555] self-center">→</span>
                        <select value={gitPRBase} onChange={e => setGitPRBase(e.target.value)} className="flex-1 px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-[10px] text-white focus:outline-none">
                          {gitRemoteBranches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                      <button onClick={gitCreatePR} disabled={!gitPRTitle || !gitPRHead} className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-bold rounded transition-colors disabled:opacity-30">Create PR</button>
                    </div>

                    {/* Open PRs */}
                    {gitPRs.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] text-[#888] font-medium">Pull Requests ({gitPRs.length})</div>
                        {gitPRs.map(pr => (
                          <div key={pr.number} className="p-2 bg-[#1a1a1a] rounded-lg border border-[#222] flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-white truncate">#{pr.number} {pr.title}</div>
                              <div className="text-[8px] text-[#555]">{pr.head} → {pr.base} · {pr.author}</div>
                            </div>
                            <button onClick={() => gitMergePR(pr.number)} className="px-2 py-1 text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 ml-2 shrink-0">Merge</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Remote Commits */}
                    {gitRemoteCommits.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] text-[#888] font-medium">Recent Commits</div>
                        <div className="max-h-[120px] overflow-y-auto space-y-1">
                          {gitRemoteCommits.slice(0, 10).map(c => (
                            <div key={c.sha} className="flex items-center gap-2 p-1.5 bg-[#1a1a1a] rounded border border-[#222]">
                              {c.avatar && <img src={c.avatar} alt="" className="w-4 h-4 rounded-full" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] text-white truncate">{c.message}</div>
                                <div className="text-[8px] text-[#555]">{c.sha} · {c.author}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Figma Import Panel ═══ */}
      {showFigmaPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowFigmaPanel(false); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[700px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                <span className="text-[14px] font-bold text-white">Import from Figma</span>
              </div>
              <button onClick={() => setShowFigmaPanel(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-3">
                <div><label className="block text-[11px] text-[#888] mb-1">Figma URL</label><input value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)} placeholder="https://www.figma.com/design/..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-purple-500/50" /></div>
                <div><label className="block text-[11px] text-[#888] mb-1">Access Token <span className="text-[#555]">(from figma.com/developers)</span></label><input type="password" value={figmaToken} onChange={e => setFigmaToken(e.target.value)} placeholder="figd_..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-purple-500/50" /></div>
                <div className="flex gap-2">
                  <button onClick={() => figmaImport()} disabled={figmaLoading || !figmaUrl.trim()} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-bold rounded-lg transition-colors disabled:opacity-30 flex items-center justify-center gap-2">{figmaLoading ? 'Loading...' : 'Import Frame'}</button>
                  <button onClick={() => figmaListFrames()} disabled={figmaLoading || !figmaUrl.trim()} className="px-4 py-2.5 bg-[#222] hover:bg-[#2a2a2a] text-white text-[12px] rounded-lg transition-colors disabled:opacity-30">List All Frames</button>
                </div>
              </div>

              {figmaFrames && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#888]">Pages & Frames</div>
                  {figmaFrames.pages.map((page, pi) => (
                    <div key={pi} className="space-y-1">
                      <div className="text-[10px] text-purple-400 font-medium">{page.name}</div>
                      {page.frames.map(frame => (
                        <button key={frame.id} onClick={() => figmaImport(frame.id)} className="w-full flex items-center justify-between p-2.5 bg-[#1a1a1a] rounded-lg border border-[#222] hover:border-purple-500/30 transition-colors text-left">
                          <div>
                            <div className="text-[11px] text-white">{frame.name}</div>
                            <div className="text-[9px] text-[#555]">{frame.width}x{frame.height} · {frame.childCount} children</div>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {figmaData && (
                <div className="space-y-3 pt-2 border-t border-[#222]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12px] text-white font-medium">{figmaData.frameName}</div>
                      <div className="text-[9px] text-[#555]">{figmaData.fileName} {figmaData.frameSize ? `· ${figmaData.frameSize.width}x${figmaData.frameSize.height}` : ''}</div>
                    </div>
                    <button onClick={figmaGenCode} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all">Generate Code</button>
                  </div>
                  {figmaData.screenshotUrl && <img src={figmaData.screenshotUrl} alt="Frame" className="w-full rounded-lg border border-[#222] max-h-[200px] object-contain bg-[#0a0a0a]" />}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-[#888] mb-1.5">Colors</div>
                      <div className="flex flex-wrap gap-1">{figmaData.colors.map((c, i) => (<div key={i} className="w-5 h-5 rounded border border-[#333]" style={{ background: c }} title={c} />))}</div>
                    </div>
                    <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-[#888] mb-1.5">Fonts</div>
                      <div className="text-[10px] text-white">{figmaData.fonts.join(', ') || 'None detected'}</div>
                    </div>
                  </div>
                  {figmaData.components && figmaData.components.length > 0 && (
                    <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-[#888] mb-1.5">Components ({figmaData.components.length})</div>
                      <div className="flex flex-wrap gap-1">{figmaData.components.slice(0, 12).map((c, i) => (
                        <span key={i} className="px-2 py-0.5 text-[9px] rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">{c.name} x{c.count}</span>
                      ))}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ Test Runner Panel ═══ */}
      {showTestRunner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[750px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">Test Runner</span>
                <span className="text-[10px] text-[#555]">Vitest • {webContainer.state.status === 'ready' ? 'WebContainer Ready' : 'WebContainer Idle'}</span>
              </div>
              <button onClick={() => setShowTestRunner(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => generateAndRunTests()} disabled={testRunning || !selectedFile} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-30 flex items-center gap-1.5">
                  {testRunning ? <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                  Generate & Run Tests
                </button>
                <button onClick={() => runTestsInContainer()} disabled={testRunning} className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-[11px] font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-30">
                  Run All Tests
                </button>
                {testFile && (
                  <button onClick={() => { openFile(testFile); setShowTestRunner(false); }} className="px-3 py-1.5 rounded-lg bg-[#222] text-[#888] text-[11px] hover:bg-[#2a2a2a] transition-colors">
                    Open {testFile}
                  </button>
                )}
              </div>
              {/* Results */}
              {testResults.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[#888] font-medium">Results ({testResults.filter(r => r.status === 'pass').length}/{testResults.length} passed)</div>
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#222] divide-y divide-[#1a1a1a]">
                    {testResults.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 text-[11px]">
                        {t.status === 'pass' ? <span className="text-emerald-400">✓</span> : t.status === 'fail' ? <span className="text-red-400">✗</span> : <span className="text-yellow-400">○</span>}
                        <span className={t.status === 'pass' ? 'text-emerald-400/80' : t.status === 'fail' ? 'text-red-400/80' : 'text-yellow-400/80'}>{t.name}</span>
                        {t.duration && <span className="text-[#555] ml-auto">{t.duration}ms</span>}
                      </div>
                    ))}
                  </div>
                  {/* Summary bar */}
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-emerald-400">{testResults.filter(r => r.status === 'pass').length} passed</span>
                    <span className="text-red-400">{testResults.filter(r => r.status === 'fail').length} failed</span>
                    <span className="text-yellow-400">{testResults.filter(r => r.status === 'skip').length} skipped</span>
                  </div>
                </div>
              )}
              {/* Raw output */}
              {testRawOutput && (
                <details className="text-[10px]">
                  <summary className="text-[#555] cursor-pointer hover:text-[#888]">Raw terminal output</summary>
                  <pre className="mt-2 p-3 bg-[#0a0a0a] rounded-lg border border-[#222] text-[#888] overflow-auto max-h-[200px] whitespace-pre-wrap font-mono text-[10px]">{testRawOutput}</pre>
                </details>
              )}
              {/* Test files in project */}
              {Object.keys(projectFiles).filter(f => f.includes('.test.') || f.includes('.spec.')).length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[#888] font-medium">Test files in project</div>
                  <div className="space-y-1">
                    {Object.keys(projectFiles).filter(f => f.includes('.test.') || f.includes('.spec.')).map(f => (
                      <div key={f} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-[#222] text-[11px]">
                        <span className="text-purple-400">🧪</span>
                        <span className="text-[#888] flex-1">{f}</span>
                        <button onClick={() => runTestsInContainer(f)} disabled={testRunning} className="text-[10px] text-blue-400 hover:text-blue-300">Run</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Getting started */}
              {testResults.length === 0 && !testRunning && (
                <div className="text-center py-6 text-[#555] text-[11px]">
                  <div className="text-2xl mb-2">🧪</div>
                  <div>Select a source file and click &quot;Generate &amp; Run Tests&quot;</div>
                  <div className="mt-1 text-[10px]">Tests are generated by AI and executed in a real WebContainer runtime</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ AI Code Review Panel ═══ */}
      {showCodeReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[750px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">AI Code Review</span>
                <span className="text-[10px] text-[#555]">{selectedFile || 'No file'}</span>
                {codeReviewLoading && <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => runAICodeReview()} disabled={codeReviewLoading} className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 text-[10px] font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-30">Re-run</button>
                <button onClick={() => setShowCodeReview(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {codeReviewResult ? (
                <div className="prose prose-invert prose-sm max-w-none text-[12px] leading-relaxed" style={{ color: '#ccc' }}>
                  <div dangerouslySetInnerHTML={{ __html: (() => { const e = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); return e(codeReviewResult).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code style="background:#1a1a1a;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>').replace(/^### (.*$)/gm, '<h3 style="color:white;font-size:14px;margin-top:16px">$1</h3>').replace(/^## (.*$)/gm, '<h2 style="color:white;font-size:15px;margin-top:18px">$1</h2>').replace(/^- (.*$)/gm, '<div style="padding-left:12px;margin:4px 0">• $1</div>').replace(/^(\d+)\. (.*$)/gm, '<div style="padding-left:12px;margin:4px 0">$1. $2</div>').replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:12px;margin:8px 0;overflow-x:auto"><code>$2</code></pre>').replace(/\n/g, '<br/>'); })() }} />
                </div>
              ) : !codeReviewLoading ? (
                <div className="text-center py-10 text-[#555] text-[11px]">
                  <div className="text-2xl mb-2">🔍</div>
                  <div>Select a file and run AI Code Review</div>
                  <div className="mt-1 text-[10px]">Get bug detection, performance tips, and refactoring suggestions</div>
                </div>
              ) : (
                <div className="text-center py-10 text-[#555] text-[11px]">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <div>Analyzing {selectedFile}...</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ v24: AI Screenshot Analyzer ═══ */}
      {showScreenshotAnalyzer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[700px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden" onPaste={ssHandlePaste}>
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">Screenshot to Code</span>
                <span className="text-[10px] text-[#555]">AI-powered design to code</span>
              </div>
              <button onClick={() => setShowScreenshotAnalyzer(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Drop Zone */}
              {!ssImage && (
                <div onDragOver={e => { e.preventDefault(); setSsDragOver(true); }} onDragLeave={() => setSsDragOver(false)} onDrop={ssHandleDrop} className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${ssDragOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-[#2a2a2a] hover:border-[#444]'}`}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={ssDragOver ? '#06b6d4' : '#333'} strokeWidth="1" className="mx-auto mb-4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                  <p className="text-[13px] text-[#888] mb-2">Drop a screenshot here</p>
                  <p className="text-[10px] text-[#555] mb-4">or paste from clipboard (Ctrl+V)</p>
                  <label className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors">
                    Browse Files
                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setSsImage(r.result as string); r.readAsDataURL(f); } }} />
                  </label>
                </div>
              )}

              {/* Preview */}
              {ssImage && (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-[#2a2a2a]">
                    <img src={ssImage} alt="Screenshot" className="w-full max-h-[300px] object-contain bg-[#0a0a0a]" />
                    <button onClick={() => { setSsImage(null); setSsResult(null); }} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-black/80 rounded-full text-[#888] hover:text-white">&times;</button>
                  </div>

                  <button onClick={ssAnalyze} disabled={ssAnalyzing} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-[12px] font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {ssAnalyzing ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Analyzing with Claude...</>) : '🧠 Analyze & Generate Code'}
                  </button>

                  {ssResult && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white font-medium">Generated Code</span>
                        <div className="flex gap-2">
                          <button onClick={() => navigator.clipboard.writeText(ssResult)} className="px-3 py-1 text-[10px] text-[#888] hover:text-white bg-[#222] rounded-md transition-colors">Copy</button>
                          <button onClick={ssApplyCode} className="px-3 py-1 text-[10px] text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors">Apply to Project</button>
                        </div>
                      </div>
                      <pre className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222] text-[10px] text-cyan-400 font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">{ssResult}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}



      {breakpointTestActive && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#333] shadow-2xl">
          {BREAKPOINT_SIZES.map((bp, i) => (
            <button key={bp.name} onClick={() => setBreakpointTestIdx(i)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${i === breakpointTestIdx ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-[#666] hover:text-white'}`}>{bp.w}</button>
          ))}
          <span className="text-[10px] text-[#888] ml-1">{BREAKPOINT_SIZES[breakpointTestIdx].name}</span>
          <button onClick={() => setBreakpointTestActive(false)} className="ml-2 text-[#555] hover:text-white transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
      )}

    </div>
  );
}