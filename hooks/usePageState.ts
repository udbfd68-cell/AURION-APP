'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useWebContainer } from '@/hooks/useWebContainer';
import { useChat } from '@/hooks/useChat';
import { useClone } from '@/hooks/useClone';
import { useTerminal } from '@/hooks/useTerminal';
import { useStitch } from '@/hooks/useStitch';
import { useDeploy } from '@/hooks/useDeploy';
import { buildWorkspaceContext } from '@/lib/workspace-context';
import { buildCommandList, filterCommands } from '@/lib/commands';
import { computeSmartSuggestions, computeFollowUpSuggestions } from '@/lib/suggestions';
import { useActionParser } from '@/hooks/useActionParser';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePreviewPipeline } from '@/hooks/usePreviewPipeline';
import { useUIEffects } from '@/hooks/useUIEffects';
import { useDragResize } from '@/hooks/useDragResize';
import { useProjectIO } from '@/hooks/useProjectIO';
import { postProcessOutput } from '@/lib/claude-code-engine';
import { LiveDatabaseEngine, getDatabaseEngine, SCHEMA_TEMPLATES, SQL_KEYWORDS, type DBTable, type QueryResult, type QueryHistoryEntry } from '@/lib/database-live';
import { CollaborationEngine, getRandomCollabColor, getRandomUserName, type CollabUser as CollabUserFull, type CollabMessage, type CollabEvent } from '@/lib/collaboration-engine';
import { BackendGenerator, type BackendProject, type BackendFeature, type GeneratedFile } from '@/lib/backend-generator';
import { fetchWithRetry, idbGet, idbSet, detectLanguage, buildFileTree } from '@/lib/client-utils';
import type { Message, ProjectFile, VirtualFS } from '@/lib/client-utils';
import {
  REACT_CDN, TAILWIND_CDN, LUCIDE_CDN, RECHARTS_CDN, REACT_ROUTER_CDN, FRAMER_MOTION_CDN,
  MODELS,
} from '@/lib/cdn-models';
import {
  TAG_COLORS, PROVIDER_LABELS, PROVIDER_ICON, getApiEndpoint,
  VISION_MODELS, BEST_VISION_MODEL, getOptimalModel, generateId,
  CodeBlock, MarkdownContent, TypingIndicator,
  DesktopIcon, CodeIcon, MobileIcon, RefreshIcon, GlobeIcon, LinkIcon,
  DatabaseIcon, PaymentsIcon, DeployIcon, GitHubIcon, SettingsIcon, PlusIcon,
  ChevronDownIcon, ChevronUpIcon, CheckCircleIcon, FileIcon, getFileIcon, FolderIcon,
  INTEGRATIONS, SANDBOX_DB, SANDBOX_STRIPE, SANDBOX_EMAILS, SANDBOX_MESSAGES,
} from '@/lib/page-helpers';
import { TEMPLATES } from '@/lib/templates-data';
import { PROMPT_TEMPLATES, EDITOR_THEMES, KEYBOARD_SHORTCUTS, COMPONENT_SNIPPETS, INTEGRATION_ROUTE_MAP, ESCAPE_PANEL_PRIORITY } from '@/lib/constants';
import { useMediaGeneration } from '@/hooks/useMediaGeneration';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useResearch } from '@/hooks/useResearch';
import { use21stBrowser } from '@/hooks/use21stBrowser';
import { useIde } from '@/hooks/useIde';
import { useSelectPrompt } from '@/hooks/useSelectPrompt';
import { useEditorState, type ConversationEntry, type Bookmark } from '@/hooks/useEditorState';
import { useConversations } from '@/hooks/useConversations';
import { usePreviewHandlers } from '@/hooks/usePreviewHandlers';
import { useFileOperations } from '@/hooks/useFileOperations';
import { useInspectors } from '@/hooks/useInspectors';
import { useFeatures } from '@/hooks/useFeatures';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePanelStore } from '@/stores/usePanelStore';

export function usePageState() {
  // Panel booleans from Zustand store
  const panelState = usePanelStore();
  const panelActions = usePanelStore();
  const {
    show21stBrowser, showA11yPanel, showAnalyzeMenu, showAnimBuilder, showAnimPanel, showApiTester,
    showAriaPanel, showBackendGenerator, showBookmarks, showBreakpointRuler, showBundlePanel, showChangelog,
    showChangeSummary, showChat, showCodeReview, showCodeToolsMenu, showCollabPanel, showColorEdit,
    showColorPalettePanel, showColorPicker, showCommandPalette, showComplexityPanel, showComponentPalette,
    showConsoleFilter, showConsolePanel, showContentSearch, showContrastPanel, showConversationHistory,
    showCssVarsPanel, showDebugMenu, showDepGraph, showDepsPanel, showDesignSystem, showDiffStatsPanel,
    showDiffView, showDomTreePanel, showDuplicatePanel, showElementCountPanel, showEnvPanel, showEventAudit,
    showFeedbackPanel, showFigmaPanel, showFileSearch, showFindReplace, showFoldMap, showFontPanel,
    showGitHubModal, showGitPanel, showGotoLine, showHtmlValidatorPanel, showImageOptPanel, showInspectMenu,
    showIntegrations, showLazyImgPanel, showLinkCheckerPanel, showMediaGallery, showMetaEditorPanel,
    showModelMenu, showMoreToolsMenu, showNetworkPanel, showNewFileInput, showOgPreview, showOnboarding,
    showOutlinePanel, showPerfBudget, showPerfPanel, showProjectMenu, showPromptTemplates, showPwaPanel,
    showRegexPanel, showResearchPanel, showResponsiveGrid, showSchemaPanel, showScreenshotAnalyzer,
    showSecurityPanel, showSemanticPanel, showSeoPanel, showShortcuts, showShortcutsRef, showSnippetsPanel, showSpecificityPanel,
    showSplitPreview, showStatsPanel, showTailwindPanel, showTemplates, showTerminal, showTestRunner,
    showTextStatsPanel, showThemeSelector, showTodoScanPanel, showTreemapPanel, showUnusedCssPanel,
    showVersionTimeline, showVisualBuilder, showWhitespacePanel, showZIndexPanel,
  } = panelState;

  // Setter aliases for backward compatibility
  const setShowModelMenu = (v: boolean) => panelActions.setPanel('showModelMenu', v);
  const setShowTerminal = (v: boolean) => panelActions.setPanel('showTerminal', v);
  const setShowIntegrations = (v: boolean) => panelActions.setPanel('showIntegrations', v);
  const setShowBackendGenerator = (v: boolean) => panelActions.setPanel('showBackendGenerator', v);
  const setShowTemplates = (v: boolean) => panelActions.setPanel('showTemplates', v);
  const setShowTestRunner = (v: boolean) => panelActions.setPanel('showTestRunner', v);

  // View state: landing → workspace
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [landingInput, setLandingInput] = useState('');
  const landingTextareaRef = useRef<HTMLTextAreaElement>(null);


  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState(MODELS[0].id);
  
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'app' | 'code' | 'database' | 'payments' | 'ide'>('app');

  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLandscape, setIsLandscape] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Right panel features
  
  const [terminalLines, setTerminalLines] = useState<string[]>(['$ aurion ready', '> Listening on port 3000']);
  
  
  const [githubToken, setGithubToken] = useState('');
  const [repoName, setRepoName] = useState('');

  // ── NotebookLM Research ──
  const {
    researchMode, setResearchMode,
    researchQuery, setResearchQuery,
    researchResults, setResearchResults,
    isResearching, setIsResearching,
    researchError, setResearchError,
    researchContext, setResearchContext,
    performResearch, enhanceWithResearch,
  } = useResearch();



  // Visual Editor mode
  const [isEditMode, setIsEditMode] = useState(false);
  const pendingEditHtmlRef = useRef<string | null>(null);

  // Virtual File System
  const [projectFiles, setProjectFiles] = useState<VirtualFS>({});
  const [selectedFile, setSelectedFile] = useState<string>('index.html');
  const [openTabs, setOpenTabs] = useState<string[]>(['index.html']);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Clone website (hook)
  const {
    showCloneModal, setShowCloneModal,
    cloneUrl, setCloneUrl,
    isCloning, cloneProgress, cloneError, setCloneError,
    clonedHtml, setClonedHtml,
    isRefining, refineFeedback, setRefineFeedback,
    cloneWebsite, stopClone, refineClone,
  } = useClone({ model, setActiveTab, setTerminalLines, setProjectFiles, setError });

  // Deploy (hook)
  const {
    isDeploying, deployResult, setDeployResult,
    deployError, setDeployError,
    deployToVercel,
  } = useDeploy({ messages, clonedHtml, setTerminalLines });

  // Streaming stats

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

  // Editor state (hook)
  const {
    findQuery, setFindQuery, replaceQuery, setReplaceQuery,
    findRegex, setFindRegex, findCaseSensitive, setFindCaseSensitive, findInputRef,
    editorTheme, setEditorTheme, minimapEnabled, setMinimapEnabled,
    wordWrapEnabled, setWordWrapEnabled,
    newFileName, setNewFileName, newFileInputRef,
    isExplaining, setIsExplaining,
    conversations, setConversations, activeConversationId, setActiveConversationId,
    bookmarks, setBookmarks,
    splitFile, setSplitFile,
    gotoLineValue, setGotoLineValue, gotoLineRef,
    explorerContextMenu, setExplorerContextMenu,
    renameTarget, setRenameTarget, renameValue, setRenameValue, renameInputRef,
    tabContextMenu, setTabContextMenu,
    hoveredImage, setHoveredImage,
    savedFileContents, setSavedFileContents,
    pickedColor, setPickedColor,
    cursorPosition, setCursorPosition,
    seoTitle, setSeoTitle, seoDescription, setSeoDescription, seoOgImage, setSeoOgImage,
    a11yIssues, setA11yIssues,
  } = useEditorState();

  // Auto-save indicator
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'toast_' + Date.now().toString(36);
    setToasts(prev => [...prev, { id, message, type }].slice(-5));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // Stitch (hook)
  const {
    showStitchPanel, setShowStitchPanel,
    stitchProjectId, setStitchProjectId,
    stitchScreens, setStitchScreens,
    stitchLoading, stitchError,
    stitchPrompt, setStitchPrompt,
    stitchDesignSystem, setStitchDesignSystem,
    stitchPages, setStitchPages,
    stitchMode, setStitchMode,
    stitchGenerate, stitchRunLoop,
  } = useStitch({ setProjectFiles, showToast });

  const monacoEditorRef = useRef<unknown>(null);

  // Responsive breakpoint ruler
  

  // Modified file tracking
  const isFileModified = useCallback((path: string) => {
    if (!projectFiles[path] || savedFileContents[path] === undefined) return false;
    return projectFiles[path].content !== savedFileContents[path];
  }, [projectFiles, savedFileContents]);

  // A11y Audit
  const runA11yAudit = useCallback(() => {
    const issues: { type: 'error' | 'warning' | 'info'; message: string; element: string }[] = [];
    const html = Object.values(projectFiles).map(f => f.content).join('\n');
    const imgNoAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi);
    if (imgNoAlt) imgNoAlt.forEach(m => issues.push({ type: 'error', message: 'Image missing alt attribute', element: m.slice(0, 60) }));
    if (html.includes('<html') && !html.includes('lang=')) issues.push({ type: 'warning', message: 'Missing lang attribute on <html>', element: '<html>' });
    const emptyBtns = html.match(/<button[^>]*>\s*<\/button>/gi);
    if (emptyBtns) emptyBtns.forEach(() => issues.push({ type: 'error', message: 'Empty button without text content', element: '<button></button>' }));
    const emptyLinks = html.match(/<a[^>]*>\s*<\/a>/gi);
    if (emptyLinks) emptyLinks.forEach(() => issues.push({ type: 'error', message: 'Empty link without text content', element: '<a></a>' }));
    const inputs = html.match(/<input(?![^>]*aria-label)[^>]*>/gi);
    const labels = (html.match(/<label/gi) || []).length;
    if (inputs && inputs.length > labels) issues.push({ type: 'warning', message: `${inputs.length - labels} input(s) may be missing associated labels`, element: '<input>' });
    if (html.includes('text-gray-300') && html.includes('bg-gray-200')) issues.push({ type: 'info', message: 'Potential low contrast: light text on light background', element: 'text-gray-300 on bg-gray-200' });
    const h1Count = (html.match(/<h1/gi) || []).length;
    if (h1Count === 0 && html.includes('<h2')) issues.push({ type: 'warning', message: 'Page has <h2> but no <h1> — check heading hierarchy', element: '<h2>' });
    if (h1Count > 1) issues.push({ type: 'warning', message: `Multiple <h1> tags found (${h1Count}) — use only one per page`, element: '<h1>' });
    if (html.includes('<head') && !html.includes('viewport')) issues.push({ type: 'info', message: 'Missing viewport meta tag for responsive design', element: '<meta viewport>' });
    if (issues.length === 0) issues.push({ type: 'info', message: 'No accessibility issues detected!', element: '✓' });
    setA11yIssues(issues);
    panelActions.setPanel('showA11yPanel', true);
    showToast(`A11y audit: ${issues.filter(i => i.type === 'error').length} errors, ${issues.filter(i => i.type === 'warning').length} warnings`, issues.some(i => i.type === 'error') ? 'error' : 'success');
  }, [projectFiles, showToast, setA11yIssues]);

  // Tailwind classes browser
  

  // ═══ Inspectors & Analyzers (extracted to useInspectors hook) ═══
  const {
    extractedColors, projectStats, cssVariables, detectedDeps, codeComplexity,
    codeSymbols, imageAssets, networkCalls, BREAKPOINT_SIZES, htmlErrors,
    detectedFonts, fileSizeTreemap, unusedCssSelectors, brokenLinks, domTree,
    metaTags, contrastIssues, zIndexMap, todoComments, regexMatches,
    cssSpecificity, lazyImgIssues, textStats, duplicateBlocks, elementCounts,
    filteredConsoleLogs, detectedColors, foldRegions, depGraph, perfBudget,
    cssAnimations, inlineEvents, ogData, semanticIssues, whitespaceIssues,
    pwaChecks, schemaData, bundleEstimate, ariaRoles, securityChecks,
    perfIssues, setPerfIssues, consoleLogs, setConsoleLogs,
    breakpointTestActive, setBreakpointTestActive, breakpointTestIdx, setBreakpointTestIdx,
    savedSnippets, setSavedSnippets, layoutDebugActive, setLayoutDebugActive,
    previewDarkMode, setPreviewDarkMode, gridFlexDebugActive, setGridFlexDebugActive,
    bookmarkedLines, setBookmarkedLines, consoleFilterLevel, setConsoleFilterLevel,
    colorEditValue, setColorEditValue, colorEditTarget, setColorEditTarget,
    regexInput, setRegexInput, regexTestStr, setRegexTestStr,
    runPerfAudit, exportSingleHtml, minifyProject, formatCode,
    saveSnippet, deleteSnippet, insertSnippet, copyPreviewAsImage,
    toggleBookmark, jumpToBookmark,
    exportConsoleLogs, applyColorEdit, RESPONSIVE_VIEWPORTS, exportProjectZip,
  } = useInspectors(projectFiles, selectedFile, showToast, panelActions, iframeRef, monacoEditorRef, setProjectFiles);

  // ═══ Features v23/v24 (extracted to useFeatures hook) ═══
  const {
    collabRoomId,
    setCollabRoomId,
    collabUsers,
    setCollabUsers,
    collabJoinInput,
    setCollabJoinInput,
    collabMode,
    setCollabMode,
    feedbackRating,
    setFeedbackRating,
    feedbackComment,
    setFeedbackComment,
    feedbackSubmitted,
    setFeedbackSubmitted,
    feedbackHistory,
    setFeedbackHistory,
    dbActiveConnection,
    setDbActiveConnection,
    dbSqlInput,
    setDbSqlInput,
    dbQueryResult,
    setDbQueryResult,
    dbQueryRunning,
    setDbQueryRunning,
    dbSchema,
    setDbSchema,
    dbSchemaLoading,
    setDbSchemaLoading,
    dbQueryHistory,
    setDbQueryHistory,
    dbSchemaTemplate,
    setDbSchemaTemplate,
    dbViewMode,
    setDbViewMode,
    collabChatMessages,
    setCollabChatMessages,
    collabChatInput,
    setCollabChatInput,
    backendPreset,
    setBackendPreset,
    backendEntityName,
    setBackendEntityName,
    backendGeneratedFiles,
    setBackendGeneratedFiles,
    onboardingStep,
    setOnboardingStep,
    vbCanvas,
    setVbCanvas,
    vbDragging,
    setVbDragging,
    vbSelectedIdx,
    setVbSelectedIdx,
    vbPropertyTab,
    setVbPropertyTab,
    animKeyframes,
    setAnimKeyframes,
    animSelected,
    setAnimSelected,
    animPreviewPlaying,
    setAnimPreviewPlaying,
    dsTab,
    setDsTab,
    dsColors,
    setDsColors,
    dsFontPrimary,
    setDsFontPrimary,
    dsFontSecondary,
    setDsFontSecondary,
    dsTypeScale,
    setDsTypeScale,
    apiMethod,
    setApiMethod,
    apiUrl,
    setApiUrl,
    apiHeaders,
    setApiHeaders,
    apiBody,
    setApiBody,
    apiResponse,
    setApiResponse,
    apiLoading,
    setApiLoading,
    apiHistory,
    setApiHistory,
    apiTab,
    setApiTab,
    gitBranches,
    setGitBranches,
    gitBranchCommits,
    setGitBranchCommits,
    gitNewBranch,
    setGitNewBranch,
    gitCommitMsg,
    setGitCommitMsg,
    gitTab,
    setGitTab,
    gitStash,
    setGitStash,
    ssImage,
    setSsImage,
    ssAnalyzing,
    setSsAnalyzing,
    ssResult,
    setSsResult,
    ssDragOver,
    setSsDragOver,
    figmaUrl,
    setFigmaUrl,
    figmaToken,
    setFigmaToken,
    figmaLoading,
    setFigmaLoading,
    figmaData,
    setFigmaData,
    figmaFrames,
    setFigmaFrames,
    gitPRs,
    setGitPRs,
    gitPRTitle,
    setGitPRTitle,
    gitPRHead,
    setGitPRHead,
    gitPRBase,
    setGitPRBase,
    gitRemoteCommits,
    setGitRemoteCommits,
    gitRemoteLoading,
    setGitRemoteLoading,
    gitSelectedRepo,
    setGitSelectedRepo,
    gitRepos,
    setGitRepos,
    gitRemoteBranches,
    setGitRemoteBranches,
    connectCollabSSE,
    startCollabRoom,
    joinCollabRoom,
    leaveCollabRoom,
    connectDatabase,
    runDatabaseQuery,
    runSchemaTemplate,
    initCollabEngine,
    sendCollabChat,
    generateBackend,
    submitFeedback,
    finishOnboarding,
    vbAddComponent,
    vbRemoveComponent,
    vbMoveComponent,
    vbGenerateCode,
    animAddNew,
    animUpdateFrame,
    animAddFrame,
    animDeleteAnim,
    animGenerateCSS,
    animCopyCSS,
    animInjectToProject,
    dsGenerateCSS,
    dsGenerateTokensJSON,
    dsAddColor,
    apiSendRequest,
    apiAddHeader,
    apiRemoveHeader,
    gitCreateBranch,
    gitSwitchBranch,
    gitDeleteBranch,
    gitCommit,
    gitStashSave,
    gitStashPop,
    figmaImport,
    figmaListFrames,
    figmaGenCode,
    gitFetchRepos,
    gitFetchBranches,
    gitFetchCommits,
    gitCreatePR,
    gitFetchPRs,
    gitMergePR,
    gitMergeBranch,
    ssHandleDrop,
    ssHandlePaste,
    ssAnalyze,
    ssApplyCode,
    onboardingSteps,
    gitCurrentBranch,
    collabUserId,
    collabUserName,
    collabColorRef,
    collabChannelRef,
    collabSSERef,
    dbEngineRef,
    collabEngineRef,
    backendGeneratorRef,
    collabColors,
    dsSpacing,
    dsBorderRadius,
    dsShadows,
  } = useFeatures(showToast, panelActions, githubToken, projectFiles, setProjectFiles, setSelectedFile, selectedFile, setTerminalLines, setOpenTabs, setActiveTab, setInput);


  // ═══ Workspace Management (extracted to useWorkspace hook) ═══
  const setAttachedImagesRef = useRef<React.Dispatch<React.SetStateAction<{ name: string; data: string; type: string }[]>> | null>(null);
  const {
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
  } = useWorkspace(projectFiles, setProjectFiles, selectedFile, setSelectedFile, showToast, panelActions, githubToken, setTerminalLines, setOpenTabs, setActiveTab, setInput, model, messages, setMessages, openTabs, activeTab, input, isStreaming, autoSaveTimerRef, setAutoSaveStatus, openFile, setAttachedImagesRef);

  // ── Integration hooks ──
  const {
    integrationKeys, setIntegrationKeys,
    editingIntegration, setEditingIntegration,
    testingIntegration, testResult,
    saveIntegrationKey, testIntegration,
    sendRealEmail, sendRealMessage,
    pushToGitHub, runSupabaseQuery, fetchStripeData,
  } = useIntegrations({
    setTerminalLines, projectFiles, supabaseUrl, supabaseTable,
    githubToken, repoName, setIsGitHubPushing, setIsSupabaseLoading,
    setSupabaseError, setSupabaseResult, setIsStripeLoading, setStripeError,
    setStripeBalance, setStripeProducts, panelActions,
  });

  // IDE (hook)
  const {
    ideServiceId, setIdeServiceId,
    ideUrl, setIdeUrl,
    ideLoading, setIdeLoading,
    ideError, setIdeError,
    ideStatus, setIdeStatus,
    ideCountdown, setIdeCountdown,
  } = useIde({ activeTab, currentProjectId, projectFiles });


  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0];

  // Preview pipeline: clonedHtml/messages → VFS → rawPreviewHtml → previewHtml
  const { rawPreviewHtml, previewHtml, codeBlocks } = usePreviewPipeline({
    messages, clonedHtml, projectFiles, isStreaming,
    isEditMode, layoutDebugActive, previewDarkMode, gridFlexDebugActive,
    setProjectFiles, setRuntimeErrors, setPreviewLoading,
  });

  // Select & Prompt (hook)
  const {
    selectPromptData, setSelectPromptData,
    selectPromptInput, setSelectPromptInput,
    selectPromptLoading, setSelectPromptLoading,
    selectPromptRef,
    submitSelectPrompt,
  } = useSelectPrompt({ model, rawPreviewHtml: rawPreviewHtml || '', projectFiles, setProjectFiles, setClonedHtml, setTerminalLines, getOptimalModel });

  // Generation memory (shared with useChat + buildWorkspaceContext)
  const [generationHistory, setGenerationHistory] = useState<{ font?: string; accent?: string; template?: string; ts: number }[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('aurion_gen_history') || '[]').slice(-5); } catch { return []; }
  });

  // Build workspace context string for AI
  const buildWorkspaceCtx = useCallback(() => buildWorkspaceContext({
    activeTab, previewHtml, clonedHtml, cloneUrl, codeBlocks, selectedModel,
    showTerminal, terminalLines, integrationKeys, projectFiles, selectedFile,
    deviceMode, runtimeErrors, outputFramework, researchMode, researchContext,
    stitchScreens, generationHistory,
  }), [activeTab, previewHtml, clonedHtml, cloneUrl, codeBlocks, selectedModel, showTerminal, terminalLines, integrationKeys, projectFiles, selectedFile, deviceMode, runtimeErrors, outputFramework, researchMode, researchContext, stitchScreens, generationHistory]);

  // Chat (hook)
  const {
    abMode, setAbMode,
    abModelB, setAbModelB,
    abResultB, setAbResultB,
    abStreaming,
    streamingChars, streamStartTime,
    attachedImages, setAttachedImages,
    brainAnalysis, brainAnalyzing,
    autoFixInFlightRef,
    sendToAI, sendMessage, sendPrompt,
    stopStream, clearChat,
  } = useChat({
    messages, setMessages, input, setInput, isStreaming, setIsStreaming,
    model, setModel, showModelMenu, setShowModelMenu, error, setError,
    setClonedHtml, setCloneError,
    generationHistory, setGenerationHistory,
    buildWorkspaceContext: buildWorkspaceCtx, researchMode, researchContext, setResearchContext,
    enhanceWithResearch, outputFramework, activeTab, deviceMode,
  });

  // Sync setAttachedImages ref for useWorkspace
  setAttachedImagesRef.current = setAttachedImages;

  // UI effects: textarea resize, model menu click-outside, clipboard paste, scrollToBottom
  const { scrollToBottom } = useUIEffects({
    input, landingInput, showModelMenu, view,
    textareaRef, landingTextareaRef, chatEndRef, messages,
    panelActions, setAttachedImages, setView,
  });

  // 21st.dev Component Browser (hook)
  const {
    browser21stQuery, setBrowser21stQuery,
    browser21stResults, setBrowser21stResults,
    browser21stLoading, setBrowser21stLoading,
    injecting21stComponent, setInjecting21stComponent,
    browser21stInputRef,
    search21stComponents, inject21stComponent,
  } = use21stBrowser({ setTerminalLines, previewHtml, sendToAI, panelActions });

  // Landing → Workspace transition
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const enterWorkspace = useCallback((prompt: string) => {
    const text = prompt.trim();
    if (!text) return;
    setView('workspace');
    setLandingInput('');
    setPendingPrompt(text);
  }, []);
  useEffect(() => {
    if (pendingPrompt && view === 'workspace' && !isStreaming) {
      const text = pendingPrompt;
      setPendingPrompt(null);
      sendPrompt(text);
    }
  }, [pendingPrompt, view, isStreaming, sendPrompt]);

  /* ── Send message & stream response ── */

  // ── Conversation & Bookmark Management (hook) ──
  const {
    saveCurrentConversation, loadConversation, deleteConversation, newConversation,
    addBookmark, deleteBookmark, insertBookmark,
  } = useConversations({
    messages, activeConversationId, conversations, bookmarks,
    setConversations, setActiveConversationId, setBookmarks, setMessages,
    panelActions, clearChat, selectedFile, projectFiles, setProjectFiles,
  });

  // ── AI Prompt Templates — imported from @/lib/constants

  // ── Find & Replace results ──
  // ── File Operations (hook) ──
  const {
    findResults, replaceInFiles, explainCurrentCode, createNewFile,
    formatCurrentFile, insertComponent,
  } = useFileOperations({
    selectedFile, projectFiles, findQuery, replaceQuery, findRegex, findCaseSensitive,
    isStreaming, setProjectFiles, setTerminalLines, setActiveTab, setIsExplaining,
    setNewFileName, openFile, sendPrompt, panelActions,
  });

  // ── Editor Themes — imported from @/lib/constants

  // ── Keyboard Shortcuts Reference — imported from @/lib/constants
  const SHORTCUTS = KEYBOARD_SHORTCUTS;

  // ── Preview Handlers (hook) ──
  const {
    fixRuntimeError, refreshPreview, copyPreviewHtml, openPreviewNewTab,
    capturePreviewScreenshot,
  } = usePreviewHandlers({
    isEditMode, isStreaming, rawPreviewHtml, previewHtml, projectFiles,
    autoFixEnabled, runtimeErrors, iframeRef, pendingEditHtmlRef,
    setTerminalLines, setConsoleLogs, setRuntimeErrors, setProjectFiles,
    setClonedHtml, setSelectPromptData, setSelectPromptInput, selectPromptRef,
    panelActions, sendToAI, showToast, autoFixInFlightRef,
  });

  // Keyboard shortcuts & escape handler
  useKeyboardShortcuts({
    panelActions, setCommandQuery, setFileSearchQuery, setContentSearchQuery,
    refreshPreview, setTerminalLines, setIsEditMode, setActiveTab,
    vfsUndo, vfsRedo, setFindQuery, setReplaceQuery, findInputRef,
    setGotoLineValue, gotoLineRef, tabContextMenu, setTabContextMenu,
    explorerContextMenu, setExplorerContextMenu, renameTarget, setRenameTarget,
    setRenameValue, showStitchPanel, setShowStitchPanel, showOnboarding,
    finishOnboarding, showCloneModal, setShowCloneModal,
  });

  const hasContent = messages.length > 0;
  const hasPreviewContent = previewHtml !== null;

  const smartSuggestions = useMemo(() => computeSmartSuggestions(projectFiles), [projectFiles]);
  const followUpSuggestions = useMemo(() => computeFollowUpSuggestions(messages, isStreaming), [messages, isStreaming]);

  // Panel visibility & sizing
  const { chatWidth, setChatWidth, terminalHeight, setTerminalHeight, chatDragRef, termDragRef } = useDragResize();

  // Terminal input


  // Terminal (hook)
  const {
    terminalInput, setTerminalInput,
    terminalHistory, historyIdx, setHistoryIdx,
    terminalEndRef, terminalInputRef,
    installedPackages, gitCommits, gitStaged,
    runTerminalCommand,
    claudeCodeMode, setClaudeCodeMode,
    isClaudeCodeStreaming, runClaudeCodeCommand,
  } = useTerminal({
    projectFiles, setProjectFiles, selectedFile, setSelectedFile, setOpenTabs, setActiveTab,
    integrationKeys, terminalLines, setTerminalLines, webContainer, scaffoldFrameworkProject, runAICodeReview,
    dbActiveConnection, setDbSqlInput, setDbViewMode, setShowBackendGenerator,
  });

  // Project I/O: share URL, import from URL hash, download ZIP
  const { shareProjectUrl, downloadProjectZip } = useProjectIO({
    projectFiles, setProjectFiles, setSelectedFile, setView, setTerminalLines, showToast,
  });

  // Quick Component Palette — imported from @/lib/constants
  const COMPONENTS = COMPONENT_SNIPPETS;

  // Command palette commands
  const commands = useMemo(() => {
    const list = buildCommandList({
      projectFiles, selectedFile, projects, showTerminal, showChat, isEditMode, showDiffView,
      showStitchPanel, splitFile, isLandscape, minimapEnabled, wordWrapEnabled,
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
    });
    return filterCommands(list, commandQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandQuery, showTerminal, showChat, showDiffView, isEditMode, projects.length, selectedFile]);

  // ── Media Generation (video + image) ──
  const { generateLTXVideo, generateGeminiImage } = useMediaGeneration({ setTerminalLines, setProjectFiles, setMediaAssets });

  // ── AI Action Parser & Executor ──
  const { parseAndExecuteActions } = useActionParser({
    messages, setProjectFiles, setTerminalLines, setActiveTab, setSelectedFile,
    setIntegrationKeys, setCloneUrl, setStitchPrompt, setShowStitchPanel,
    setShowTerminal, setShowIntegrations, panelActions,
    deployToVercel, cloneWebsite, runTerminalCommand, generateLTXVideo, generateGeminiImage,
  });

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */

  // ─── LANDING PAGE ─────────────────────────

  const pageProps: Record<string, any> = {
    BREAKPOINT_SIZES, COMPONENTS, EDITOR_THEMES, PROMPT_TEMPLATES, RESPONSIVE_VIEWPORTS, 
    SHORTCUTS, a11yIssues, abMode, abModelB, abResultB, abStreaming, activeConversationId, activeTab, addBookmark, 
    addEnvVar, animAddFrame, animAddNew, animCopyCSS, animDeleteAnim, animGenerateCSS, animInjectToProject, 
    animKeyframes, animPreviewPlaying, animSelected, animUpdateFrame, apiAddHeader, apiBody, apiHeaders, apiHistory, 
    apiLoading, apiMethod, apiRemoveHeader, apiResponse, apiSendRequest, apiTab, apiUrl, applyColorEdit, ariaRoles, 
    attachedImages, autoFixEnabled, autoFixInFlightRef, autoSaveStatus, autoSaveTimerRef, backendEntityName, 
    backendGeneratedFiles, backendGeneratorRef, backendPreset, bookmarkedLines, bookmarks, breakpointTestActive, 
    breakpointTestIdx, brainAnalysis, brainAnalyzing, brokenLinks, browser21stInputRef, browser21stLoading, browser21stQuery, browser21stResults, 
    buildWorkspaceContext, bundleEstimate, capturePreviewScreenshot, changeSummary, chatDragRef, chatEndRef, chatWidth, 
    claudeCodeMode, clearChat, cloneError, cloneProgress, cloneUrl, cloneWebsite, clonedHtml, closeTab, codeBlocks, codeComplexity, 
    codeReviewLoading, codeReviewResult, codeSymbols, collabChannelRef, collabChatInput, collabChatMessages, 
    collabColorRef, collabColors, collabEngineRef, collabJoinInput, collabMode, collabRoomId, collabSSERef, 
    collabUserId, collabUserName, collabUsers, colorEditTarget, colorEditValue, commandIdx, commandInputRef, 
    commandQuery, commands, connectCollabSSE, connectDatabase, consoleFilterLevel, consoleLogs, contentSearchQuery, 
    contentSearchRef, contentSearchResults, contrastIssues, conversations, copyPreviewAsImage, copyPreviewHtml, 
    createNewFile, createProject, cssAnimations, cssSpecificity, cssVariables, currentProjectId, cursorPosition, 
    dbActiveConnection, dbEngineRef, dbQueryHistory, dbQueryResult, dbQueryRunning, dbSchema, dbSchemaLoading, 
    dbSchemaTemplate, dbSqlInput, dbViewMode, deleteBookmark, deleteConversation, deleteProject, deleteSnippet, 
    depGraph, deployError, deployResult, deployToVercel, detectedColors, detectedDeps, detectedFonts, deviceMode, 
    diffStats, domTree, downloadProjectZip, dsAddColor, dsBorderRadius, dsColors, dsFontPrimary, dsFontSecondary, dsGenerateCSS, 
    dsGenerateTokensJSON, dsShadows, dsSpacing, dsTab, dsTypeScale, duplicateBlocks, editingIntegration, editorTheme, elementCounts, 
    enhanceWithResearch, enterWorkspace, envVars, error, expandedDirs, explainCurrentCode, 
    explorerContextMenu, exportConsoleLogs, exportProjectZip, exportSingleHtml, extractedColors, feedbackComment, 
    feedbackHistory, feedbackRating, feedbackSubmitted, fetchStripeData, figmaData, figmaFrames, figmaGenCode, 
    figmaImport, figmaListFrames, figmaLoading, figmaToken, figmaUrl, fileInputRef, fileSearchQuery, fileSearchRef, 
    fileSearchResults, fileSizeTreemap, filteredConsoleLogs, findCaseSensitive, findInputRef, findQuery, findRegex, 
    findResults, finishOnboarding, fixRuntimeError, foldRegions, followUpSuggestions, formatCode, formatCurrentFile, 
    generateAndRunTests, generateBackend, generateGeminiImage, generateLTXVideo, generationHistory, gitBranchCommits, 
    gitBranches, gitCommit, gitCommitMsg, gitCommits, gitCreateBranch, gitCreatePR, gitCurrentBranch, gitDeleteBranch, 
    gitFetchBranches, gitFetchCommits, gitFetchPRs, gitFetchRepos, gitMergeBranch, gitMergePR, gitNewBranch, gitPRBase, 
    gitPRHead, gitPRTitle, gitPRs, gitRemoteBranches, gitRemoteCommits, gitRemoteLoading, gitRepos, gitSelectedRepo, 
    gitStaged, gitStash, gitStashPop, gitStashSave, gitSwitchBranch, gitTab, githubToken, gotoLineRef, gotoLineValue, 
    gridFlexDebugActive, handleDragLeave, handleDragOver, handleDrop, handleImageSelect, hasContent, hasPreviewContent, 
    historyIdx, hoveredImage, htmlErrors, ideCountdown, ideError, ideLoading, ideServiceId, ideStatus, 
    ideUrl, iframeRef, imageAssets, initCollabEngine, inject21stComponent, injecting21stComponent, inlineEvents, input, 
    insertBookmark, insertComponent, insertSnippet, installedPackages, integrationKeys, isCloning, isDeploying, 
    isDragOver, isEditMode, isExplaining, isFileModified, isGitHubPushing, isLandscape, isClaudeCodeStreaming, isRefining, isResearching, 
    isStreaming, isStripeLoading, isSupabaseLoading, joinCollabRoom, jumpToBookmark, landingFileInputRef, landingInput, 
    landingTextareaRef, layoutDebugActive, lazyImgIssues, leaveCollabRoom, loadConversation, mediaAssets, messages, 
    metaTags, minifyProject, minimapEnabled, model, monacoEditorRef, msgPersistTimer, networkCalls, newConversation, 
    newEnvKey, newEnvValue, newFileInputRef, newFileName, ogData, onboardingStep, onboardingSteps, openFile, 
    openPreviewNewTab, openTabs, outputFramework, parseAndExecuteActions, pendingEditHtmlRef, 
    pendingPrompt, perfBudget, perfIssues, performResearch, persistTimer, pickedColor, prevFilesRef, 
    previewDarkMode, previewHtml, previewLoading, previewZoom, projectFiles, 
    projectStats, projects, pushToGitHub, pwaChecks, rawPreviewHtml, refineClone, refineFeedback, refreshPreview, 
    regexInput, regexMatches, regexTestStr, removeEnvVar, removeImage, renameInputRef, renameProjectId, 
    renameProjectName, renameTarget, renameValue, replaceInFiles, replaceQuery, repoName, researchContext, 
    researchError, researchMode, researchQuery, researchResults, runA11yAudit, runAICodeReview, runDatabaseQuery, 
    runPerfAudit, runSchemaTemplate, runSupabaseQuery, runClaudeCodeCommand, runTerminalCommand, runTestsInContainer, runtimeErrors, 
    sandboxDb, sandboxDbTable, sandboxEmail, sandboxEmailForm, sandboxEmailLog, sandboxMsg, sandboxMsgForm, 
    sandboxMsgLog, sandboxPay, saveCurrentConversation, saveIntegrationKey, saveSnippet, savedFileContents, 
    savedSnippets, scaffoldFrameworkProject, schemaData, scrollToBottom, search21stComponents, securityChecks, 
    selectPromptData, selectPromptInput, selectPromptLoading, selectPromptRef, selectedFile, selectedModel, 
    semanticIssues, sendCollabChat, sendMessage, sendPrompt, sendRealEmail, sendRealMessage, sendToAI, seoDescription, 
    seoOgImage, seoTitle, setA11yIssues, setAbMode, setAbModelB, setAbResultB, setActiveConversationId, setActiveTab, 
    setAnimKeyframes, setAnimPreviewPlaying, setAnimSelected, setApiBody, setApiHeaders, setApiHistory, setApiLoading, 
    setApiMethod, setApiResponse, setApiTab, setApiUrl, setAttachedImages, setAutoFixEnabled, setAutoSaveStatus, 
    setBackendEntityName, setBackendGeneratedFiles, setBackendPreset, setBookmarkedLines, setBookmarks, 
    setBreakpointTestActive, setBreakpointTestIdx, setBrowser21stLoading, setBrowser21stQuery, setBrowser21stResults, 
    setChatWidth, setClaudeCodeMode, setCloneError, setCloneUrl, setClonedHtml, setCodeReviewLoading, setCodeReviewResult, 
    setCollabChatInput, setCollabChatMessages, setCollabJoinInput, setCollabMode, setCollabRoomId, setCollabUsers, 
    setColorEditTarget, setColorEditValue, setCommandIdx, setCommandQuery, setConsoleFilterLevel, setConsoleLogs, 
    setContentSearchQuery, setConversations, setCurrentProjectId, setCursorPosition, setDbActiveConnection, 
    setDbQueryHistory, setDbQueryResult, setDbQueryRunning, setDbSchema, setDbSchemaLoading, setDbSchemaTemplate, 
    setDbSqlInput, setDbViewMode, setDeployError, setDeployResult, setDeviceMode, setDsColors, setDsFontPrimary, 
    setDsFontSecondary, setDsTab, setDsTypeScale, setEditingIntegration, setEditorTheme, setEnvVars, setError, 
    setExpandedDirs, setExplorerContextMenu, setFeedbackComment, setFeedbackHistory, setFeedbackRating, 
    setFeedbackSubmitted, setFigmaData, setFigmaFrames, setFigmaLoading, setFigmaToken, setFigmaUrl, 
    setFileSearchQuery, setFindCaseSensitive, setFindQuery, setFindRegex, setGenerationHistory, setGitBranchCommits, 
    setGitBranches, setGitCommitMsg, setGitNewBranch, setGitPRBase, setGitPRHead, setGitPRTitle, setGitPRs, 
    setGitRemoteBranches, setGitRemoteCommits, setGitRemoteLoading, setGitRepos, setGitSelectedRepo, setGitStash, 
    setGitTab, setGithubToken, setGotoLineValue, setGridFlexDebugActive, setHistoryIdx, setHoveredImage, 
    setIdeCountdown, setIdeError, setIdeLoading, setIdeServiceId, setIdeStatus, setIdeUrl, setInjecting21stComponent, 
    setInput, setIntegrationKeys, setIsDragOver, setIsEditMode, setIsExplaining, setIsGitHubPushing, setIsLandscape, 
    setIsResearching, setIsStreaming, setIsStripeLoading, setIsSupabaseLoading, setLandingInput, setLayoutDebugActive, 
    setMediaAssets, setMessages, setMinimapEnabled, setModel, setNewEnvKey, setNewEnvValue, setNewFileName, 
    setOnboardingStep, setOpenTabs, setOutputFramework, setPendingPrompt, setPerfIssues, setPickedColor, 
    setPreviewDarkMode, setPreviewLoading, setPreviewZoom, setProjectFiles, setProjects, 
    setRefineFeedback, setRegexInput, setRegexTestStr, setRenameProjectId, setRenameProjectName, setRenameTarget, 
    setRenameValue, setReplaceQuery, setRepoName, setResearchContext, setResearchError, setResearchMode, 
    setResearchQuery, setResearchResults, setRuntimeErrors, setSandboxDb, setSandboxDbTable, setSandboxEmail, 
    setSandboxEmailForm, setSandboxEmailLog, setSandboxMsg, setSandboxMsgForm, setSandboxMsgLog, setSandboxPay, 
    setSavedFileContents, setSavedSnippets, setSelectPromptData, setSelectPromptInput, setSelectPromptLoading, 
    setSelectedFile, setSeoDescription, setSeoOgImage, setSeoTitle, setSplitFile, 
    setSsAnalyzing, setSsDragOver, setSsImage, setSsResult, setStitchDesignSystem, setStitchMode, setStitchPages, 
    setStitchProjectId, setStitchPrompt, setStitchScreens, setStripeBalance, setStripeError, setStripeProducts, 
    setSupabaseError, setSupabaseQuery, setSupabaseResult, setSupabaseTable, setSupabaseUrl, setTabContextMenu, 
    setTerminalHeight, setTerminalInput, setTerminalLines, setTestFile, setTestRawOutput, 
    setTestResults, setTestRunning, setToasts, setVbCanvas, setVbDragging, setVbPropertyTab, 
    setVbSelectedIdx, setVfsHistory, setVfsHistoryIdx, setView, setWcInstallProgress, setWcInstalling, 
    setWordWrapEnabled, shareProjectUrl, showToast, smartSuggestions, splitFile, 
    ssAnalyze, ssAnalyzing, ssApplyCode, ssDragOver, ssHandleDrop, ssHandlePaste, ssImage, ssResult, startCollabRoom, 
    stitchDesignSystem, stitchError, stitchGenerate, stitchLoading, stitchMode, stitchPages, stitchProjectId, 
    stitchPrompt, stitchRunLoop, stitchScreens, stopClone, stopStream, streamStartTime, streamingChars, stripeBalance, 
    stripeError, stripeProducts, submitFeedback, submitSelectPrompt, supabaseError, supabaseQuery, supabaseResult, 
    supabaseTable, supabaseUrl, switchProject, syncEnvToVFS, tabContextMenu, termDragRef, terminalEndRef, 
    terminalHeight, terminalHistory, terminalInput, terminalInputRef, terminalLines, testFile, testIntegration, 
    testRawOutput, testResult, testResults, testRunning, testingIntegration, textStats, textareaRef, toasts, 
    todoComments, toggleBookmark, unusedCssSelectors, vbAddComponent, vbCanvas, vbDragging, vbGenerateCode, 
    vbMoveComponent, vbPropertyTab, vbRemoveComponent, vbSelectedIdx, vfsHistory, vfsHistoryIdx, vfsRedo, 
    vfsSnapshotTimer, vfsUndo, view, wcInstallProgress, wcInstalling, webContainer, webContainerBootedRef, 
    whitespaceIssues, wordWrapEnabled, zIndexMap,
  };

  return { pageProps,
    a11yIssues, abMode, abModelB, abResultB, abStreaming, activeConversationId, activeTab, addBookmark, addEnvVar,
    animAddFrame, animAddNew, animCopyCSS, animDeleteAnim, animGenerateCSS, animInjectToProject, animKeyframes,
    animPreviewPlaying, animSelected, animUpdateFrame, apiAddHeader, apiBody, apiHeaders, apiHistory, apiLoading,
    apiMethod, apiRemoveHeader, apiResponse, apiSendRequest, apiTab, apiUrl, applyColorEdit, ariaRoles,
    attachedImages, autoFixEnabled, autoFixInFlightRef, autoSaveStatus, autoSaveTimerRef, backendEntityName,
    backendGeneratedFiles, backendGeneratorRef, backendPreset, bookmarkedLines, bookmarks, BREAKPOINT_SIZES,
    breakpointTestActive, breakpointTestIdx, brainAnalysis, brainAnalyzing, brokenLinks, browser21stInputRef, browser21stLoading, browser21stQuery,
    browser21stResults, buildFileTree, buildWorkspaceContext, bundleEstimate,
    capturePreviewScreenshot, changeSummary, chatDragRef, chatEndRef, chatWidth, claudeCodeMode, clearChat, clonedHtml,
    cloneError, cloneProgress, cloneUrl, cloneWebsite, closeTab, codeBlocks, codeComplexity, codeReviewLoading,
    codeReviewResult, codeSymbols, collabChannelRef, collabChatInput, collabChatMessages, collabColorRef, collabColors,
    collabEngineRef, collabJoinInput, collabMode, collabRoomId, collabSSERef, collabUserId, collabUserName,
    collabUsers, colorEditTarget, colorEditValue, commandIdx, commandInputRef, commandQuery, commands, COMPONENTS,
    connectCollabSSE, connectDatabase, consoleFilterLevel, consoleLogs, contentSearchQuery, contentSearchRef,
    contentSearchResults, contrastIssues, conversations, copyPreviewAsImage, copyPreviewHtml, createNewFile,
    createProject, cssAnimations, cssSpecificity, cssVariables, currentProjectId, cursorPosition, CodeBlock, dbActiveConnection,
    dbEngineRef, dbQueryHistory, dbQueryResult, dbQueryRunning, dbSchema, dbSchemaLoading, dbSchemaTemplate,
    dbSqlInput, dbViewMode, deleteBookmark, deleteConversation, deleteProject, deleteSnippet, depGraph, deployError,
    deployResult, deployToVercel, detectedColors, detectedDeps, detectedFonts, deviceMode, diffStats, domTree,
    downloadProjectZip, dsAddColor, dsColors, dsFontPrimary, dsFontSecondary, dsGenerateCSS, dsGenerateTokensJSON,
    dsTab, dsTypeScale, duplicateBlocks, editingIntegration, editorTheme, elementCounts, enhanceWithResearch,
    enterWorkspace, envVars, error, expandedDirs, explainCurrentCode, explorerContextMenu, exportConsoleLogs,
    exportProjectZip, exportSingleHtml, extractedColors, feedbackComment, feedbackHistory, feedbackRating,
    feedbackSubmitted, fetchStripeData, figmaData, figmaFrames, figmaGenCode, figmaImport, figmaListFrames,
    figmaLoading, figmaToken, figmaUrl, fileInputRef, fileSearchQuery, fileSearchRef, fileSearchResults,
    fileSizeTreemap, filteredConsoleLogs, findCaseSensitive, findInputRef, findQuery, findRegex, findResults,
    finishOnboarding, fixRuntimeError, foldRegions, followUpSuggestions, formatCode, formatCurrentFile,
    generateAndRunTests, generateBackend, generateGeminiImage, generateLTXVideo, generationHistory, gitBranchCommits,
    gitBranches, gitCommit, gitCommitMsg, gitCommits, gitCreateBranch, gitCreatePR, gitCurrentBranch, gitDeleteBranch,
    gitFetchBranches, gitFetchCommits, gitFetchPRs, gitFetchRepos, githubToken, gitMergeBranch, gitMergePR,
    gitNewBranch, gitPRBase, gitPRHead, gitPRs, gitPRTitle, gitRemoteBranches, gitRemoteCommits, gitRemoteLoading,
    gitRepos, gitSelectedRepo, gitStaged, gitStash, gitStashPop, gitStashSave, gitSwitchBranch, gitTab, gotoLineRef,
    gotoLineValue, gridFlexDebugActive, handleDragLeave, handleDragOver, handleDrop, handleImageSelect, hasContent,
    hasPreviewContent, historyIdx, hoveredImage, htmlErrors, ideCountdown, ideError, ideLoading, ideServiceId,
    ideStatus, ideUrl, iframeRef, imageAssets, initCollabEngine, inject21stComponent, injecting21stComponent,
    inlineEvents, input, insertBookmark, insertComponent, insertSnippet, installedPackages, integrationKeys, isCloning,
    isDeploying, isDragOver, isEditMode, isExplaining, isFileModified, isGitHubPushing, isLandscape, isClaudeCodeStreaming, isRefining,
    isResearching, isStreaming, isStripeLoading, isSupabaseLoading, joinCollabRoom, jumpToBookmark,
    landingFileInputRef, landingInput, landingTextareaRef, layoutDebugActive, lazyImgIssues, leaveCollabRoom,
    loadConversation, mediaAssets, messages, metaTags, minifyProject, minimapEnabled, model, monacoEditorRef,
    msgPersistTimer, networkCalls, newConversation, newEnvKey, newEnvValue, newFileInputRef, newFileName, ogData,
    onboardingStep, onboardingSteps, openFile, openPreviewNewTab, openTabs, outputFramework, parseAndExecuteActions,
    pendingEditHtmlRef, pendingPrompt, perfBudget, perfIssues, performResearch, persistTimer, pickedColor,
    prevFilesRef, previewDarkMode, previewHtml, previewLoading, previewZoom, projectFiles, projects, projectStats,
    pushToGitHub, pwaChecks, rawPreviewHtml, refineClone, refineFeedback, refreshPreview, regexInput, regexMatches,
    regexTestStr, removeEnvVar, removeImage, renameInputRef, renameProjectId, renameProjectName, renameTarget,
    renameValue, replaceInFiles, replaceQuery, repoName, researchContext, researchError, researchMode, researchQuery,
    researchResults, RESPONSIVE_VIEWPORTS, runA11yAudit, runAICodeReview, runDatabaseQuery, runPerfAudit,
    runSchemaTemplate, runSupabaseQuery, runClaudeCodeCommand, runTerminalCommand, runTestsInContainer, runtimeErrors, sandboxDb,
    sandboxDbTable, sandboxEmail, sandboxEmailForm, sandboxEmailLog, sandboxMsg, sandboxMsgForm, sandboxMsgLog,
    sandboxPay, saveCurrentConversation, savedFileContents, savedSnippets, saveIntegrationKey, saveSnippet,
    scaffoldFrameworkProject, schemaData, scrollToBottom, search21stComponents, securityChecks, selectedFile,
    selectedModel, selectPromptData, selectPromptInput, selectPromptLoading, selectPromptRef, semanticIssues,
    sendCollabChat, sendMessage, sendPrompt, sendRealEmail, sendRealMessage, sendToAI, seoDescription, seoOgImage,
    seoTitle, setA11yIssues, setAbMode, setAbModelB, setAbResultB, setActiveConversationId, setActiveTab,
    setAnimKeyframes, setAnimPreviewPlaying, setAnimSelected, setApiBody, setApiHeaders, setApiHistory, setApiLoading,
    setApiMethod, setApiResponse, setApiTab, setApiUrl, setAttachedImages, setAutoFixEnabled, setAutoSaveStatus,
    setBackendEntityName, setBackendGeneratedFiles, setBackendPreset, setBookmarkedLines, setBookmarks,
    setBreakpointTestActive, setBreakpointTestIdx, setBrowser21stLoading, setBrowser21stQuery, setBrowser21stResults,
    setChatWidth, setClaudeCodeMode, setClonedHtml, setCloneError, setCloneUrl, setCodeReviewLoading, setCodeReviewResult,
    setCollabChatInput, setCollabChatMessages, setCollabJoinInput, setCollabMode, setCollabRoomId, setCollabUsers,
    setColorEditTarget, setColorEditValue, setCommandIdx, setCommandQuery, setConsoleFilterLevel, setConsoleLogs,
    setContentSearchQuery, setConversations, setCurrentProjectId, setCursorPosition, setDbActiveConnection,
    setDbQueryHistory, setDbQueryResult, setDbQueryRunning, setDbSchema, setDbSchemaLoading, setDbSchemaTemplate,
    setDbSqlInput, setDbViewMode, setDeployError, setDeployResult, setDeviceMode, setDsColors, setDsFontPrimary,
    setDsFontSecondary, setDsTab, setDsTypeScale, setEditingIntegration, setEditorTheme, setEnvVars, setError,
    setExpandedDirs, setExplorerContextMenu, setFeedbackComment, setFeedbackHistory, setFeedbackRating,
    setFeedbackSubmitted, setFigmaData, setFigmaFrames, setFigmaLoading, setFigmaToken, setFigmaUrl,
    setFileSearchQuery, setFindCaseSensitive, setFindQuery, setFindRegex, setGenerationHistory, setGitBranchCommits,
    setGitBranches, setGitCommitMsg, setGithubToken, setGitNewBranch, setGitPRBase, setGitPRHead, setGitPRs,
    setGitPRTitle, setGitRemoteBranches, setGitRemoteCommits, setGitRemoteLoading, setGitRepos, setGitSelectedRepo,
    setGitStash, setGitTab, setGotoLineValue, setGridFlexDebugActive, setHistoryIdx, setHoveredImage, setIdeCountdown,
    setIdeError, setIdeLoading, setIdeServiceId, setIdeStatus, setIdeUrl, setInjecting21stComponent, setInput,
    setIntegrationKeys, setIsDragOver, setIsEditMode, setIsExplaining, setIsGitHubPushing, setIsLandscape,
    setIsResearching, setIsStreaming, setIsStripeLoading, setIsSupabaseLoading, setLandingInput, setLayoutDebugActive,
    setMediaAssets, setMessages, setMinimapEnabled, setModel, setNewEnvKey, setNewEnvValue, setNewFileName,
    setOnboardingStep, setOpenTabs, setOutputFramework, setPendingPrompt, setPerfIssues, setPickedColor,
    setPreviewDarkMode, setPreviewLoading, setPreviewZoom, setProjectFiles, setProjects, setRefineFeedback,
    setRegexInput, setRegexTestStr, setRenameProjectId, setRenameProjectName, setRenameTarget, setRenameValue,
    setReplaceQuery, setRepoName, setResearchContext, setResearchError, setResearchMode, setResearchQuery,
    setResearchResults, setRuntimeErrors, setSandboxDb, setSandboxDbTable, setSandboxEmail, setSandboxEmailForm,
    setSandboxEmailLog, setSandboxMsg, setSandboxMsgForm, setSandboxMsgLog, setSandboxPay, setSavedFileContents,
    setSavedSnippets, setSelectedFile, setSelectPromptData, setSelectPromptInput, setSelectPromptLoading,
    setSeoDescription, setSeoOgImage, setSeoTitle, setShowBackendGenerator, setShowCloneModal, setShowModelMenu,
    setShowStitchPanel, setShowTemplates, setShowTestRunner, setSplitFile, setSsAnalyzing, setSsDragOver, setSsImage,
    setSsResult, setStitchDesignSystem, setStitchMode, setStitchPages, setStitchProjectId, setStitchPrompt,
    setStitchScreens, setStripeBalance, setStripeError, setStripeProducts, setSupabaseError, setSupabaseQuery,
    setSupabaseResult, setSupabaseTable, setSupabaseUrl, setTabContextMenu, setTerminalHeight, setTerminalInput,
    setTerminalLines, setTestFile, setTestRawOutput, setTestResults, setTestRunning, setToasts, setVbCanvas,
    setVbDragging, setVbPropertyTab, setVbSelectedIdx, setVfsHistory, setVfsHistoryIdx, setView, setWcInstalling,
    setWcInstallProgress, setWordWrapEnabled, shareProjectUrl, SHORTCUTS, showChat, showCloneModal, showDiffView,
    showModelMenu, showStitchPanel, showToast, smartSuggestions, splitFile, ssAnalyze, ssAnalyzing, ssApplyCode,
    ssDragOver, ssHandleDrop, ssHandlePaste, ssImage, ssResult, startCollabRoom, stitchDesignSystem, stitchError,
    stitchGenerate, stitchLoading, stitchMode, stitchPages, stitchProjectId, stitchPrompt, stitchRunLoop,
    stitchScreens, stopClone, stopStream, streamingChars, streamStartTime, stripeBalance, stripeError, stripeProducts,
    submitFeedback, submitSelectPrompt, supabaseError, supabaseQuery, supabaseResult, supabaseTable, supabaseUrl,
    switchProject, syncEnvToVFS, tabContextMenu, termDragRef, terminalEndRef, terminalHeight, terminalHistory,
    terminalInput, terminalInputRef, terminalLines, testFile, testingIntegration, testIntegration, testRawOutput,
    testResult, testResults, testRunning, textareaRef, textStats, toasts, todoComments, toggleBookmark,
    unusedCssSelectors, vbAddComponent, vbCanvas, vbDragging, vbGenerateCode, vbMoveComponent, vbPropertyTab,
    vbRemoveComponent, vbSelectedIdx, vfsHistory, vfsHistoryIdx, vfsRedo, vfsSnapshotTimer, vfsUndo, view,
    wcInstalling, wcInstallProgress, webContainer, webContainerBootedRef, whitespaceIssues, wordWrapEnabled, zIndexMap
  };
}
