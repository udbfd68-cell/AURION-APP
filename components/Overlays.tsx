'use client';
import { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { FileIcon, LinkIcon } from '@/lib/page-helpers';
import { detectLanguage } from '@/lib/client-utils';
import { TEMPLATES } from '@/lib/templates-data';
import { BackendGenerator } from '@/lib/backend-generator';
import { usePanelStore } from '@/stores/usePanelStore';

export default function Overlays({ p }: { p: any }) {
  // Panel state from Zustand store
  const panelStore = usePanelStore();
  const { setPanel } = panelStore;
  const {
    show21stBrowser, showA11yPanel, showAnimBuilder, showAnimPanel, showApiTester,
    showAriaPanel, showBackendGenerator, showBookmarks, showBreakpointRuler, showBundlePanel, showChangelog,
    showChangeSummary, showCloneModal, showCodeReview, showCollabPanel, showColorEdit,
    showColorPalettePanel, showCommandPalette, showComplexityPanel, showComponentPalette,
    showConsoleFilter, showConsolePanel, showContentSearch, showContrastPanel, showConversationHistory,
    showCssVarsPanel, showDepGraph, showDepsPanel, showDesignSystem, showDiffStatsPanel,
    showDomTreePanel, showDuplicatePanel, showElementCountPanel, showEnvPanel, showEventAudit,
    showFeedbackPanel, showFigmaPanel, showFileSearch, showFindReplace, showFoldMap, showFontPanel,
    showGitHubModal, showGitPanel, showGotoLine, showHtmlValidatorPanel, showImageOptPanel,
    showLazyImgPanel, showLinkCheckerPanel, showMediaGallery, showMetaEditorPanel,
    showNetworkPanel, showOgPreview, showOnboarding, showOutlinePanel, showPerfBudget, showPerfPanel,
    showPromptTemplates, showPwaPanel, showRegexPanel, showResponsiveGrid, showSchemaPanel,
    showScreenshotAnalyzer, showSecurityPanel, showSemanticPanel, showSeoPanel, showShortcuts,
    showShortcutsRef, showSnippetsPanel, showSpecificityPanel, showStatsPanel, showStitchPanel,
    showTailwindPanel, showTemplates, showTestRunner, showTextStatsPanel, showThemeSelector,
    showTodoScanPanel, showTreemapPanel, showUnusedCssPanel, showVersionTimeline, showVisualBuilder,
    showWhitespacePanel, showZIndexPanel,
  } = panelStore;

  // Panel setter aliases
  const setShowA11yPanel = (v: boolean) => setPanel('showA11yPanel', v);
  const setShowAnimBuilder = (v: boolean) => setPanel('showAnimBuilder', v);
  const setShowAnimPanel = (v: boolean) => setPanel('showAnimPanel', v);
  const setShowApiTester = (v: boolean) => setPanel('showApiTester', v);
  const setShowAriaPanel = (v: boolean) => setPanel('showAriaPanel', v);
  const setShowBackendGenerator = (v: boolean) => setPanel('showBackendGenerator', v);
  const setShowBookmarks = (v: boolean) => setPanel('showBookmarks', v);
  const setShowBundlePanel = (v: boolean) => setPanel('showBundlePanel', v);
  const setShowChangeSummary = (v: boolean) => setPanel('showChangeSummary', v);
  const setShowChangelog = (v: boolean) => setPanel('showChangelog', v);
  const setShowCloneModal = (v: boolean) => setPanel('showCloneModal', v);
  const setShowCodeReview = (v: boolean) => setPanel('showCodeReview', v);
  const setShowCollabPanel = (v: boolean) => setPanel('showCollabPanel', v);
  const setShowColorEdit = (v: boolean) => setPanel('showColorEdit', v);
  const setShowColorPalettePanel = (v: boolean) => setPanel('showColorPalettePanel', v);
  const setShowCommandPalette = (v: boolean) => setPanel('showCommandPalette', v);
  const setShowComplexityPanel = (v: boolean) => setPanel('showComplexityPanel', v);
  const setShowComponentPalette = (v: boolean) => setPanel('showComponentPalette', v);
  const setShowConsoleFilter = (v: boolean) => setPanel('showConsoleFilter', v);
  const setShowConsolePanel = (v: boolean) => setPanel('showConsolePanel', v);
  const setShowContentSearch = (v: boolean) => setPanel('showContentSearch', v);
  const setShowContrastPanel = (v: boolean) => setPanel('showContrastPanel', v);
  const setShowConversationHistory = (v: boolean) => setPanel('showConversationHistory', v);
  const setShowCssVarsPanel = (v: boolean) => setPanel('showCssVarsPanel', v);
  const setShowDepGraph = (v: boolean) => setPanel('showDepGraph', v);
  const setShowDepsPanel = (v: boolean) => setPanel('showDepsPanel', v);
  const setShowDesignSystem = (v: boolean) => setPanel('showDesignSystem', v);
  const setShowDiffStatsPanel = (v: boolean) => setPanel('showDiffStatsPanel', v);
  const setShowDomTreePanel = (v: boolean) => setPanel('showDomTreePanel', v);
  const setShowDuplicatePanel = (v: boolean) => setPanel('showDuplicatePanel', v);
  const setShowElementCountPanel = (v: boolean) => setPanel('showElementCountPanel', v);
  const setShowEnvPanel = (v: boolean) => setPanel('showEnvPanel', v);
  const setShowEventAudit = (v: boolean) => setPanel('showEventAudit', v);
  const setShowFeedbackPanel = (v: boolean) => setPanel('showFeedbackPanel', v);
  const setShowFigmaPanel = (v: boolean) => setPanel('showFigmaPanel', v);
  const setShowFileSearch = (v: boolean) => setPanel('showFileSearch', v);
  const setShowFindReplace = (v: boolean) => setPanel('showFindReplace', v);
  const setShowFoldMap = (v: boolean) => setPanel('showFoldMap', v);
  const setShowFontPanel = (v: boolean) => setPanel('showFontPanel', v);
  const setShowGitHubModal = (v: boolean) => setPanel('showGitHubModal', v);
  const setShowGitPanel = (v: boolean) => setPanel('showGitPanel', v);
  const setShowGotoLine = (v: boolean) => setPanel('showGotoLine', v);
  const setShowHtmlValidatorPanel = (v: boolean) => setPanel('showHtmlValidatorPanel', v);
  const setShowImageOptPanel = (v: boolean) => setPanel('showImageOptPanel', v);
  const setShowLazyImgPanel = (v: boolean) => setPanel('showLazyImgPanel', v);
  const setShowLinkCheckerPanel = (v: boolean) => setPanel('showLinkCheckerPanel', v);
  const setShowMediaGallery = (v: boolean) => setPanel('showMediaGallery', v);
  const setShowMetaEditorPanel = (v: boolean) => setPanel('showMetaEditorPanel', v);
  const setShowNetworkPanel = (v: boolean) => setPanel('showNetworkPanel', v);
  const setShowOgPreview = (v: boolean) => setPanel('showOgPreview', v);
  const setShowOutlinePanel = (v: boolean) => setPanel('showOutlinePanel', v);
  const setShowPerfBudget = (v: boolean) => setPanel('showPerfBudget', v);
  const setShowPerfPanel = (v: boolean) => setPanel('showPerfPanel', v);
  const setShowPromptTemplates = (v: boolean) => setPanel('showPromptTemplates', v);
  const setShowPwaPanel = (v: boolean) => setPanel('showPwaPanel', v);
  const setShowRegexPanel = (v: boolean) => setPanel('showRegexPanel', v);
  const setShowResponsiveGrid = (v: boolean) => setPanel('showResponsiveGrid', v);
  const setShowSchemaPanel = (v: boolean) => setPanel('showSchemaPanel', v);
  const setShowScreenshotAnalyzer = (v: boolean) => setPanel('showScreenshotAnalyzer', v);
  const setShowSecurityPanel = (v: boolean) => setPanel('showSecurityPanel', v);
  const setShowSemanticPanel = (v: boolean) => setPanel('showSemanticPanel', v);
  const setShowSeoPanel = (v: boolean) => setPanel('showSeoPanel', v);
  const setShowShortcuts = (v: boolean) => setPanel('showShortcuts', v);
  const setShowShortcutsRef = (v: boolean) => setPanel('showShortcutsRef', v);
  const setShowSnippetsPanel = (v: boolean) => setPanel('showSnippetsPanel', v);
  const setShowSpecificityPanel = (v: boolean) => setPanel('showSpecificityPanel', v);
  const setShowStatsPanel = (v: boolean) => setPanel('showStatsPanel', v);
  const setShowStitchPanel = (v: boolean) => setPanel('showStitchPanel', v);
  const setShowTailwindPanel = (v: boolean) => setPanel('showTailwindPanel', v);
  const setShowTemplates = (v: boolean) => setPanel('showTemplates', v);
  const setShowTestRunner = (v: boolean) => setPanel('showTestRunner', v);
  const setShowTextStatsPanel = (v: boolean) => setPanel('showTextStatsPanel', v);
  const setShowThemeSelector = (v: boolean) => setPanel('showThemeSelector', v);
  const setShowTodoScanPanel = (v: boolean) => setPanel('showTodoScanPanel', v);
  const setShowTreemapPanel = (v: boolean) => setPanel('showTreemapPanel', v);
  const setShowUnusedCssPanel = (v: boolean) => setPanel('showUnusedCssPanel', v);
  const setShowVersionTimeline = (v: boolean) => setPanel('showVersionTimeline', v);
  const setShowVisualBuilder = (v: boolean) => setPanel('showVisualBuilder', v);
  const setShowWhitespacePanel = (v: boolean) => setPanel('showWhitespacePanel', v);
  const setShowZIndexPanel = (v: boolean) => setPanel('showZIndexPanel', v);

  const {
    BREAKPOINT_SIZES, COMPONENTS, EDITOR_THEMES, PROMPT_TEMPLATES, RESPONSIVE_VIEWPORTS, SHORTCUTS, a11yIssues, 
    activeConversationId, activeTab, addEnvVar, animAddFrame, animAddNew, animCopyCSS, animDeleteAnim, animGenerateCSS, 
    animInjectToProject, animKeyframes, animPreviewPlaying, animSelected, animUpdateFrame, apiAddHeader, apiBody, 
    apiHeaders, apiHistory, apiLoading, apiMethod, apiRemoveHeader, apiResponse, apiSendRequest, apiTab, apiUrl, 
    applyColorEdit, ariaRoles, backendEntityName, backendGeneratedFiles, backendPreset, bookmarkedLines, bookmarks, 
    breakpointTestActive, breakpointTestIdx, brokenLinks, bundleEstimate, changeSummary, cloneProgress, cloneUrl, 
    cloneWebsite, closeTab, codeComplexity, codeReviewLoading, codeReviewResult, codeSymbols, collabChatInput, 
    collabChatMessages, collabColorRef, collabColors, collabJoinInput, collabMode, collabRoomId, collabUserId, 
    collabUserName, collabUsers, colorEditTarget, colorEditValue, commandIdx, commandInputRef, commandQuery, commands, 
    consoleFilterLevel, consoleLogs, contentSearchQuery, contentSearchRef, contentSearchResults, contrastIssues, 
    conversations, createProject, cssAnimations, cssSpecificity, cssVariables, deleteBookmark, deleteConversation, 
    deleteSnippet, depGraph, detectedColors, detectedDeps, detectedFonts, diffStats, domTree, dsAddColor, dsBorderRadius, dsColors, 
    dsFontPrimary, dsFontSecondary, dsGenerateCSS, dsGenerateTokensJSON, dsShadows, dsSpacing, dsTab, dsTypeScale, duplicateBlocks, 
    editorTheme, elementCounts, envVars, error, explorerContextMenu, exportConsoleLogs, extractedColors, 
    feedbackComment, feedbackHistory, feedbackRating, feedbackSubmitted, figmaData, figmaFrames, figmaGenCode, 
    figmaImport, figmaListFrames, figmaLoading, figmaToken, figmaUrl, fileSearchQuery, fileSearchRef, 
    fileSearchResults, fileSizeTreemap, filteredConsoleLogs, findCaseSensitive, findInputRef, findQuery, findRegex, 
    findResults, finishOnboarding, foldRegions, generateAndRunTests, generateBackend, gitBranchCommits, gitBranches, 
    gitCommit, gitCommitMsg, gitCreateBranch, gitCreatePR, gitCurrentBranch, gitDeleteBranch, gitFetchBranches, 
    gitFetchCommits, gitFetchPRs, gitFetchRepos, gitMergeBranch, gitMergePR, gitNewBranch, gitPRBase, gitPRHead, 
    gitPRTitle, gitPRs, gitRemoteBranches, gitRemoteCommits, gitRemoteLoading, gitRepos, gitSelectedRepo, gitStash, 
    gitStashPop, gitStashSave, gitSwitchBranch, gitTab, githubToken, gotoLineRef, gotoLineValue, hoveredImage, 
    htmlErrors, imageAssets, inlineEvents, input, insertBookmark, insertComponent, insertSnippet, integrationKeys, 
    isCloning, isGitHubPushing, joinCollabRoom, jumpToBookmark, lazyImgIssues, leaveCollabRoom, loadConversation, 
    mediaAssets, messages, metaTags, monacoEditorRef, networkCalls, newConversation, newEnvKey, newEnvValue, ogData, 
    onboardingStep, onboardingSteps, openFile, openTabs, perfBudget, perfIssues, previewHtml, projectFiles, 
    projectStats, pushToGitHub, pwaChecks, regexInput, regexMatches, regexTestStr, removeEnvVar, renameInputRef, 
    replaceInFiles, replaceQuery, repoName, runA11yAudit, runAICodeReview, runPerfAudit, runTestsInContainer, 
    saveSnippet, savedSnippets, schemaData, securityChecks, selectedFile, semanticIssues, sendCollabChat, sendPrompt, 
    seoDescription, seoOgImage, seoTitle, setActiveTab, setAnimKeyframes, setAnimPreviewPlaying, setAnimSelected, 
    setApiBody, setApiHeaders, setApiMethod, setApiTab, setApiUrl, setBackendEntityName, setBackendPreset, 
    setBookmarkedLines, setBreakpointTestActive, setBreakpointTestIdx, setCloneUrl, setCollabChatInput, 
    setCollabJoinInput, setColorEditTarget, setColorEditValue, setCommandIdx, setCommandQuery, setConsoleFilterLevel, 
    setConsoleLogs, setContentSearchQuery, setDsColors, setDsFontPrimary, setDsFontSecondary, setDsTab, setEditorTheme, 
    setEnvVars, setExplorerContextMenu, setFeedbackComment, setFeedbackRating, setFigmaToken, setFigmaUrl, 
    setFileSearchQuery, setFindCaseSensitive, setFindQuery, setFindRegex, setGitCommitMsg, setGitNewBranch, 
    setGitPRBase, setGitPRHead, setGitPRTitle, setGitSelectedRepo, setGitTab, setGithubToken, setGotoLineValue, 
    setNewEnvKey, setNewEnvValue, setOnboardingStep, setProjectFiles, setRegexInput, setRegexTestStr, setRenameTarget, 
    setRenameValue, setReplaceQuery, setRepoName, setSelectedFile, setSeoDescription, setSeoOgImage, setSeoTitle, setSsDragOver, 
    setSsImage, setSsResult, setStitchDesignSystem, setStitchMode, setStitchPages, setStitchPrompt, setTabContextMenu, 
    setVbCanvas, setVbDragging, setVbPropertyTab, setVbSelectedIdx, setVfsHistoryIdx, 
    showToast, 
    ssAnalyze, ssAnalyzing, ssApplyCode, ssDragOver, ssHandleDrop, ssHandlePaste, 
    ssImage, ssResult, startCollabRoom, stitchDesignSystem, stitchError, stitchGenerate, stitchLoading, stitchMode, 
    stitchPages, stitchProjectId, stitchPrompt, stitchRunLoop, stitchScreens, stopClone, submitFeedback, syncEnvToVFS, 
    tabContextMenu, testFile, testRawOutput, testResults, testRunning, textStats, toasts, todoComments, toggleBookmark, 
    unusedCssSelectors, vbAddComponent, vbCanvas, vbDragging, vbGenerateCode, vbMoveComponent, vbPropertyTab, 
    vbRemoveComponent, vbSelectedIdx, vfsHistory, vfsHistoryIdx, webContainer, whitespaceIssues, zIndexMap,
  } = p;

  return (
    <>
      {/* â•â•â• Backend Generator Modal â•â•â• */}
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
                    <div className="space-y-0.5 max-h-[120px] overflow-y-auto">{backendGeneratedFiles.map((f: any) => <p key={f.path} className="text-[10px] text-[#888] font-mono truncate">+ {f.path}</p>)}</div>
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

      {/* â•â•â• Clone Website Modal â•â•â• */}
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

      {/* â•â•â• GitHub Modal â•â•â• */}
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
                {Object.keys(projectFiles).length === 0 && <p className="text-[10px] text-[#555] text-center mt-1">Build something first â€” no files to push</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â•â•â• Command Palette (Cmd+K) â•â•â• */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowCommandPalette(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={commandInputRef} value={commandQuery} onChange={(e) => { setCommandQuery(e.target.value); setCommandIdx(0); }} placeholder="Type a command..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setCommandIdx((i: any) => Math.min(i + 1, commands.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setCommandIdx((i: any) => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter' && commands.length > 0) { commands[commandIdx]?.action(); setShowCommandPalette(false); }
                }} />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">ESC</span>
              </div>
              <div className="max-h-[340px] overflow-y-auto py-1">
                {(() => {
                  let lastCat = '';
                  let flatIdx = -1;
                  return commands.map((cmd: any) => {
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

      {/* â•â•â• File Search (Cmd+P) â•â•â• */}
      <AnimatePresence>
        {showFileSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowFileSearch(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-lg mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <input ref={fileSearchRef} value={fileSearchQuery} onChange={(e) => setFileSearchQuery(e.target.value)} placeholder="Go to file..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && fileSearchResults.length > 0) { setSelectedFile(fileSearchResults[0]); setActiveTab('code'); setShowFileSearch(false); } }} />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">âŒ˜P</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto py-1">
                {fileSearchResults.map((f: any) => (
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

      {/* â•â•â• Component Palette â•â•â• */}
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
                {COMPONENTS.map((comp: any) => (
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

      {/* â•â•â• Conversation History â•â•â• */}
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
                ) : conversations.sort((a: any, b: any) => b.timestamp - a.timestamp).map((conv: any) => (
                  <div key={conv.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-[#222] transition-colors cursor-pointer group ${conv.id === activeConversationId ? 'bg-[#1e1e1e] border-l-2 border-blue-500' : ''}`} onClick={() => loadConversation(conv)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-white truncate">{conv.title}</p>
                      <p className="text-[10px] text-[#555]">{conv.messages.length} messages Â· {new Date(conv.timestamp).toLocaleDateString()}</p>
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

      {/* â•â•â• AI Prompt Templates â•â•â• */}
      <AnimatePresence>
        {showPromptTemplates && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowPromptTemplates(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-2xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">ðŸš€</span>
                  <h2 className="text-sm font-semibold text-white">Prompt Templates</h2>
                </div>
                <button onClick={() => setShowPromptTemplates(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3">
                {['Page', 'Enhance', 'Component'].map(cat => (
                  <div key={cat} className="mb-4">
                    <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider px-2 mb-2">{cat === 'Page' ? 'Full Pages' : cat === 'Enhance' ? 'Enhancements' : 'Components'}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {PROMPT_TEMPLATES.filter((t: any) => t.cat === cat).map((t: any) => (
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

      {/* â•â•â• Code Bookmarks â•â•â• */}
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
                ) : bookmarks.map((bm: any) => (
                  <div key={bm.id} className="px-5 py-3 border-b border-[#1e1e1e] hover:bg-[#222] transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white font-medium">{bm.label}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => insertBookmark(bm.code)} className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">Insert</button>
                        <button onClick={() => deleteBookmark(bm.id)} className="text-[#555] hover:text-red-400 transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                      </div>
                    </div>
                    <div className="text-[9px] text-[#555] font-mono line-clamp-2 leading-4 bg-[#111] rounded p-1.5">{bm.code.slice(0, 200)}</div>
                    <span className="text-[8px] text-[#444] mt-1 block">{bm.file} Â· {bm.language}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â•â•â• Version Timeline â•â•â• */}
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
                    {vfsHistory.map((snapshot: any, i: any) => {
                      const fileCount = Object.keys(snapshot).length;
                      const totalSize = Object.values(snapshot).reduce((acc: any, f: any) => acc + (f.content?.length || 0), 0);
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
                            <p className="text-[10px] text-[#555]">{fileCount} files · {((totalSize as number) / 1024).toFixed(1)}KB</p>
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

      {/* â•â•â• Find & Replace â•â•â• */}
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
                  {findResults.slice(0, 50).map((r: any, i: any) => (
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

      {/* â•â•â• Keyboard Shortcuts â•â•â• */}
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
                  const catShortcuts = SHORTCUTS.filter((s: any) => s.cat === cat);
                  if (catShortcuts.length === 0) return null;
                  return (
                    <div key={cat} className="mb-4">
                      <h3 className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">{cat}</h3>
                      {catShortcuts.map((s: any) => (
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

      {/* â•â•â• Editor Theme Selector â•â•â• */}
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
                {EDITOR_THEMES.map((t: any) => (
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

      {/* â•â•â• Content Search (Cmd+Shift+F) â•â•â• */}
      <AnimatePresence>
        {showContentSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowContentSearch(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.97, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -10 }} className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] w-full max-w-xl mx-4 shadow-2xl shadow-black/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input ref={contentSearchRef} value={contentSearchQuery} onChange={(e) => setContentSearchQuery(e.target.value)} placeholder="Search in all files..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#555]" autoFocus />
                <span className="text-[9px] text-[#555] px-1.5 py-0.5 rounded bg-[#222]">âŒ˜â‡§F</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto py-1">
                {contentSearchResults.map((r: any, i: any) => (
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

      {/* â•â•â• Media Gallery â•â•â• */}
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
                    {mediaAssets.slice().reverse().map((asset: any) => (
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
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${asset.type === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{asset.type === 'video' ? 'ðŸŽ¬ Video' : 'ðŸ–¼ Image'}</span>
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

      {/* â•â•â• Templates Modal â•â•â• */}
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

      {/* â•â•â• .env Management Modal â•â•â• */}
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
                {envVars.map((v: any, i: any) => (
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
          {toasts.map((t: any) => (
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
            <button onClick={() => { const others = openTabs.filter((t: any) => t !== tabContextMenu.file); others.forEach((t: any) => closeTab(t)); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Close Others</button>
            <button onClick={() => { openTabs.forEach((t: any) => closeTab(t)); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Close All</button>
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
                <button onClick={() => { const name = prompt('New file name:', explorerContextMenu.path + '/'); if (name?.trim()) { setProjectFiles((prev: any) => ({ ...prev, [name.trim()]: { content: '', language: detectLanguage(name.trim()) } })); openFile(name.trim()); showToast(`Created ${name.trim()}`, 'success'); } }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">New File in Folder</button>
                <button onClick={() => {
                  const prefix = explorerContextMenu.path + '/';
                  const files = Object.keys(projectFiles).filter(f => f.startsWith(prefix));
                  if (files.length === 0 || confirm(`Delete folder "${explorerContextMenu.path}" and ${files.length} file(s)?`)) {
                    setProjectFiles((prev: any) => {
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
                <button onClick={() => { const src = explorerContextMenu.path; const ext = src.lastIndexOf('.'); const cp = ext > 0 ? src.slice(0, ext) + '-copy' + src.slice(ext) : src + '-copy'; setProjectFiles((prev: any) => ({ ...prev, [cp]: { ...prev[src] } })); showToast(`Duplicated as ${cp.split('/').pop()}`, 'success'); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Duplicate</button>
                <button onClick={() => { navigator.clipboard.writeText(explorerContextMenu.path); showToast('Path copied', 'success'); }} className="w-full px-3 py-1.5 text-left text-[11px] text-[#ccc] hover:bg-[#2a2a2a] transition-colors">Copy Path</button>
                <div className="border-t border-[#333] my-1" />
                <button onClick={() => {
                  const file = explorerContextMenu.path;
                  if (confirm(`Delete "${file}"?`)) {
                    setProjectFiles((prev: any) => { const next = { ...prev }; delete next[file]; return next; });
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
                {a11yIssues.map((issue: any, i: any) => (
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
                  setProjectFiles((prev: any) => ({ ...prev, 'index.html': { ...prev['index.html'], content: html } }));
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
                    {extractedColors.map((color: any, i: any) => (
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
                {perfIssues.map((issue: any, i: any) => (
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
                    {projectStats.languages.map(([lang, info]: any) => {
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
                ) : cssVariables.map((v: any, i: any) => (
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
              ) : consoleLogs.map((log: any, i: any) => (
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
                ) : detectedDeps.map((dep: any, i: any) => (
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
                    {codeComplexity.map((f: any, i: any) => (
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
                ) : codeSymbols.map((sym: any, i: any) => (
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
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-[#888]">{imageAssets.reduce((a: any, b: any) => a + b.count, 0)} images</span>
                </div>
                <button onClick={() => setShowImageOptPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {imageAssets.length === 0 ? (
                  <p className="text-[#555] text-sm text-center py-8">No inline base64 images detected</p>
                ) : imageAssets.map((asset: any, i: any) => (
                  <div key={i} className="p-3 rounded-lg border border-[#2a2a2a] hover:border-[#333] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-white font-medium font-mono">{asset.file}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${asset.totalSize > 100 ? 'bg-red-500/20 text-red-400' : asset.totalSize > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{asset.totalSize}KB total</span>
                    </div>
                    <div className="space-y-1">
                      {asset.images.map((img: any, j: any) => (
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
                      <span className="text-[11px] text-emerald-400">+{diffStats.reduce((a: any, b: any) => a + b.added, 0)} additions</span>
                      <span className="text-[11px] text-red-400">-{diffStats.reduce((a: any, b: any) => a + b.removed, 0)} deletions</span>
                      <span className="text-[11px] text-[#666]">{diffStats.length} files changed</span>
                    </div>
                    {diffStats.map((s: any, i: any) => (
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
                ) : networkCalls.map((call: any, i: any) => (
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
      {/* â•â•â• HTML Validator Panel â•â•â• */}
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
            {htmlErrors.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No HTML issues detected âœ“</div>}
            {htmlErrors.map((err: any, i: any) => (
              <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-[11px] ${err.type === 'error' ? 'bg-red-500/5 border border-red-500/10' : 'bg-yellow-500/5 border border-yellow-500/10'}`}>
                <span className="shrink-0 mt-0.5">{err.type === 'error' ? 'ðŸ”´' : 'ðŸŸ¡'}</span>
                <div>
                  <div className="text-[#ccc]">{err.message}</div>
                  {err.line !== undefined && <div className="text-[#555] mt-0.5">Line ~{err.line}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• Font Inspector Panel â•â•â• */}
      {showFontPanel && (
        <div className="fixed top-16 right-4 z-40 w-[380px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm">ðŸ”¤</span>
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

      {/* â•â•â• Code Snippets Manager Panel â•â•â• */}
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
            {savedSnippets.map((s: any) => (
              <div key={s.id} className="rounded-lg bg-[#1a1a1a] border border-[#222] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#222]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{s.language}</span>
                    <span className="text-[11px] text-white">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => insertSnippet(s.code)} className="text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">Insert</button>
                    <button onClick={() => { navigator.clipboard.writeText(s.code); }} className="text-[9px] px-2 py-0.5 rounded bg-[#222] text-[#888] hover:text-white transition-colors">Copy</button>
                    <button onClick={() => deleteSnippet(s.id)} className="text-[9px] px-2 py-0.5 rounded text-red-400/60 hover:text-red-400 transition-colors">âœ•</button>
                  </div>
                </div>
                <pre className="p-2 text-[10px] text-[#888] font-mono max-h-[100px] overflow-y-auto">{s.code.slice(0, 500)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• File Size Treemap Panel â•â•â• */}
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
              const totalSize = fileSizeTreemap.reduce((a: any, f: any) => a + f.bytes, 0);
              return (
                <div className="flex flex-wrap gap-1">
                  {fileSizeTreemap.map((f: any, i: any) => {
                    const pct = Math.max(f.pct, 5);
                    return (
                      <div key={i} className="rounded border border-[#333] flex flex-col items-center justify-center p-1.5 text-center transition-all hover:border-[#555]" style={{ width: `${Math.max(pct * 3.5, 45)}px`, height: `${Math.max(pct * 2, 40)}px`, background: `${f.color}15` }} title={`${f.path} â€” ${f.bytes > 1024 ? (f.bytes / 1024).toFixed(1) + ' KB' : f.bytes + ' B'}`}>
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
                {Object.entries(fileSizeTreemap.reduce((acc: Record<string, { bytes: number; color: string }>, f: any) => {
                  const ext = f.path.split('.').pop() || '?';
                  if (!acc[ext]) acc[ext] = { bytes: 0, color: f.color };
                  acc[ext].bytes += f.bytes;
                  return acc;
                }, {} as Record<string, { bytes: number; color: string }>)).sort((a: any, b: any) => b[1].bytes - a[1].bytes).map(([ext, v]: any) => (
                  <span key={ext} className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: (v as any).color }} />{ext} <span className="text-[#555]">{(v as any).bytes > 1024 ? ((v as any).bytes / 1024).toFixed(1) + 'KB' : (v as any).bytes + 'B'}</span></span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* â•â•â• Unused CSS Detector Panel â•â•â• */}
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
            {unusedCssSelectors.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No unused CSS selectors detected âœ“</div>}
            {unusedCssSelectors.map((s: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[11px]">
                <span className="text-amber-400 font-mono flex-1 truncate">{s.selector}</span>
                <span className="text-[#555] shrink-0">L{s.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• Link Checker Panel â•â•â• */}
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
            {brokenLinks.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">All links valid âœ“</div>}
            {brokenLinks.map((l: any, i: any) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-[11px]">
                <span className="shrink-0 mt-0.5">{l.type === 'anchor' ? 'âš“' : l.type === 'empty' ? 'âš ï¸' : 'ðŸ”—'}</span>
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

      {/* â•â•â• DOM Tree Viewer Panel â•â•â• */}
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
            {domTree.map((node: any, i: any) => {
              const tagColors: Record<string, string> = { html: '#e34c26', head: '#f59e0b', body: '#10b981', div: '#3b82f6', span: '#8b5cf6', a: '#06b6d4', p: '#6b7280', h1: '#ef4444', h2: '#ef4444', h3: '#ef4444', section: '#14b8a6', nav: '#f97316', main: '#22c55e', header: '#eab308', footer: '#a855f7', script: '#f59e0b', style: '#a855f7', img: '#ec4899', button: '#6366f1', input: '#8b5cf6', form: '#0ea5e9', ul: '#64748b', ol: '#64748b', li: '#94a3b8' };
              const color = tagColors[node.tag] || '#888';
              return (
                <div key={i} className="flex items-center py-0.5 hover:bg-[#1a1a1a] rounded transition-colors" style={{ paddingLeft: `${node.depth * 16 + 4}px` }}>
                  <span className="text-[#555] mr-1">{node.selfClose ? 'â—‡' : 'â–¸'}</span>
                  <span style={{ color }}>&lt;{node.tag}</span>
                  {node.attrs && <span className="text-[#555] ml-1 truncate max-w-[200px]">{node.attrs}</span>}
                  <span style={{ color }}>{node.selfClose ? ' />' : '>'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* â•â•â• Meta Tag Editor Panel â•â•â• */}
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
            {metaTags.map((tag: any, i: any) => {
              const iconMap: Record<string, string> = { title: 'ðŸ“', description: 'ðŸ“„', 'og:title': 'ðŸŒ', 'og:description': 'ðŸŒ', 'og:image': 'ðŸ–¼ï¸', 'twitter:card': 'ðŸ¦', 'twitter:title': 'ðŸ¦', viewport: 'ðŸ“±', charset: 'ðŸ”¤', robots: 'ðŸ¤–', author: 'ðŸ‘¤' };
              return (
                <div key={i} className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#222]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs">{iconMap[tag.name] || 'ðŸ·ï¸'}</span>
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

      {/* â•â•â• Keyboard Shortcuts Reference â•â•â• */}
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
              { title: 'General', shortcuts: [['âŒ˜K', 'Command Palette'], ['âŒ˜P', 'File Search'], ['âŒ˜â‡§F', 'Search in Files'], ['Escape', 'Close Panel'], ['âŒ˜Z', 'Undo (VFS)'], ['âŒ˜â‡§Z', 'Redo (VFS)']] },
              { title: 'Editor', shortcuts: [['âŒ˜S', 'Save File'], ['âŒ˜H', 'Find & Replace'], ['âŒ˜G', 'Go to Line'], ['âŒ˜D', 'Delete Line'], ['â‡§âŒ¥F', 'Format Code']] },
              { title: 'View', shortcuts: [['âŒ˜1', 'Code Tab'], ['âŒ˜2', 'Preview Tab'], ['âŒ˜3', 'Console Tab'], ['âŒ˜B', 'Toggle Sidebar'], ['âŒ˜\\\\', 'Split Preview']] },
              { title: 'AI', shortcuts: [['Enter', 'Send Message'], ['â‡§Enter', 'New Line in Input']] },
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

      {/* â•â•â• Bookmarked Lines Panel â•â•â• */}
      {bookmarkedLines.length > 0 && activeTab === 'code' && (
        <div className="fixed bottom-12 right-4 z-40 w-[220px] bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
            <span className="text-[10px] font-medium text-white flex items-center gap-1">ðŸ”– Bookmarks <span className="text-[#555]">({bookmarkedLines.length})</span></span>
            <button onClick={() => setBookmarkedLines([])} className="text-[9px] text-[#555] hover:text-white transition-colors">Clear</button>
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {bookmarkedLines.map((line: any) => (
              <button key={line} onClick={() => jumpToBookmark(line)} className="w-full flex items-center justify-between px-3 py-1 text-[10px] hover:bg-[#1a1a1a] transition-colors">
                <span className="text-blue-400">Line {line}</span>
                <button onClick={(e) => { e.stopPropagation(); toggleBookmark(line); }} className="text-[#555] hover:text-red-400 transition-colors">âœ•</button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• Color Contrast Checker Panel â•â•â• */}
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
            {contrastIssues.map((c: any, i: any) => (
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

      {/* â•â•â• Z-Index Map Panel â•â•â• */}
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
            {zIndexMap.map((z: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className="w-12 text-right font-mono font-bold" style={{ color: z.value > 100 ? '#ef4444' : z.value > 10 ? '#f59e0b' : '#10b981' }}>{z.value}</span>
                <span className="text-[#ccc] font-mono flex-1 truncate">{z.selector}</span>
                <span className="text-[9px] text-[#555] shrink-0">{z.file.split('/').pop()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• TODO/FIXME Scanner Panel â•â•â• */}
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
            {todoComments.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No TODO/FIXME comments found âœ“</div>}
            {todoComments.map((t: any, i: any) => {
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

      {/* â•â•â• Regex Tester Panel â•â•â• */}
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
            {regexMatches.map((m: any, i: any) => (
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

      {/* â•â•â• CSS Specificity Panel â•â•â• */}
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
            {cssSpecificity.map((s: any, i: any) => (
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

      {/* â•â•â• Image Lazy Loading Panel â•â•â• */}
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
            {lazyImgIssues.map((img: any, i: any) => (
              <div key={i} className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <div className="text-[#ccc] font-mono truncate mb-1">{img.src}</div>
                <div className="flex items-center gap-2 text-[9px]">
                  <span className={`px-1.5 py-0.5 rounded ${img.hasLazy ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{img.hasLazy ? 'âœ“ lazy' : 'âœ— no lazy'}</span>
                  <span className={`px-1.5 py-0.5 rounded ${img.hasAlt ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{img.hasAlt ? 'âœ“ alt' : 'âœ— no alt'}</span>
                  <span className={`px-1.5 py-0.5 rounded ${img.hasWidth ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>{img.hasWidth ? 'âœ“ dimensions' : 'âš  no dimensions'}</span>
                  <span className="text-[#555] ml-auto">{img.file}:{img.line}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• Text Statistics Panel â•â•â• */}
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

      {/* â•â•â• Duplicate Code Panel â•â•â• */}
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
            {duplicateBlocks.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No duplicate code blocks found âœ“</div>}
            {duplicateBlocks.map((d: any, i: any) => (
              <div key={i} className="rounded-lg bg-[#1a1a1a] border border-[#222] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#222]">
                  <span className="text-[10px] text-orange-400 font-medium">Found in {d.count} files</span>
                  <div className="flex gap-1">{d.files.map((f: any) => <span key={f} className="text-[8px] px-1 py-0.5 rounded bg-[#222] text-[#888]">{f.split('/').pop()}</span>)}</div>
                </div>
                <pre className="p-2 text-[9px] text-[#888] font-mono overflow-x-auto">{d.code}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• Element Counter Panel â•â•â• */}
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
              {elementCounts.tagCounts.slice(0, 30).map(([tag, count]: any) => (
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

      {/* â•â•â• Console Filter & Export Panel â•â•â• */}
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
            {filteredConsoleLogs.map((log: any, i: any) => (
              <div key={i} className={`flex items-start gap-2 p-1.5 rounded text-[10px] font-mono ${log.type === 'error' ? 'bg-red-500/5 text-red-300' : log.type === 'warn' ? 'bg-amber-500/5 text-amber-300' : 'text-[#ccc]'}`}>
                <span className={`shrink-0 w-10 text-[8px] font-bold uppercase ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-blue-400'}`}>{log.type}</span>
                <span className="flex-1 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• Inline Color Picker Panel â•â•â• */}
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
            {detectedColors.map((c: any, i: any) => (
              <button key={i} onClick={() => { setColorEditTarget({ file: c.file, match: c.color, index: c.index }); setColorEditValue(c.color); }} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[#1a1a1a] border border-transparent hover:border-[#222] text-[11px] text-left transition-colors">
                <div className="w-5 h-5 rounded border border-[#333] shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-white font-mono flex-1 truncate">{c.color}</span>
                <span className="text-[#555] text-[9px]">{c.file.split('/').pop()}:{c.line}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• Code Folding Map Panel â•â•â• */}
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
            {foldRegions.map((r: any, i: any) => (
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

      {/* â•â•â• Dependency Graph Panel â•â•â• */}
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
            {depGraph.nodes.map((node: any) => {
              const imports = depGraph.edges.filter((e: any) => e.from === node.id);
              const importedBy = depGraph.edges.filter((e: any) => e.to === node.id);
              return (
                <div key={node.id} className="rounded-lg bg-[#1a1a1a] border border-[#222] p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${node.type === 'tsx' || node.type === 'jsx' ? 'bg-blue-500/20 text-blue-400' : node.type === 'ts' || node.type === 'js' ? 'bg-amber-500/20 text-amber-400' : node.type === 'css' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#222] text-[#888]'}`}>{node.type}</span>
                    <span className="text-[11px] text-white font-mono truncate">{node.id}</span>
                    {importedBy.length > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 ml-auto">{importedBy.length} dependents</span>}
                  </div>
                  {imports.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {imports.map((imp: any) => <span key={imp.to} className="text-[8px] px-1.5 py-0.5 rounded bg-[#222] text-[#888] font-mono">â†’ {imp.to.split('/').pop()}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* â•â•â• Performance Budget Panel â•â•â• */}
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
            {perfBudget.checks.map((check: any) => (
              <div key={check.name} className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a] border border-[#222]">
                <span className={`text-sm ${check.pass ? 'text-green-400' : 'text-red-400'}`}>{check.pass ? 'âœ“' : 'âœ—'}</span>
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

      {/* â•â•â• Responsive Preview Grid â•â•â• */}
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
            {RESPONSIVE_VIEWPORTS.map((vp: any) => (
              <div key={vp.name} className="flex flex-col rounded-lg border border-[#333] overflow-hidden bg-[#0a0a0a]">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#222] bg-[#111]">
                  <span className="text-sm">{vp.icon}</span>
                  <span className="text-[11px] text-white font-medium">{vp.name}</span>
                  <span className="text-[9px] text-[#555] ml-auto">{vp.w}Ã—{vp.h}</span>
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

      {/* â•â•â• CSS Animation Inspector Panel â•â•â• */}
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
            {cssAnimations.map((a: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0 ${a.type === 'keyframes' ? 'bg-fuchsia-500/20 text-fuchsia-400' : a.type === 'animation' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{a.type}</span>
                <span className="text-white font-mono truncate">{a.name}</span>
                <span className="text-[#555] text-[9px] ml-auto truncate max-w-[120px]">{a.file.split('/').pop()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• Event Listener Audit Panel â•â•â• */}
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
            {inlineEvents.length === 0 && <div className="text-center py-6 text-[#555] text-[11px]">No inline event handlers found âœ“</div>}
            {inlineEvents.map((ev: any, i: any) => (
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

      {/* â•â•â• Open Graph Preview Panel â•â•â• */}
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
              <div className="p-2 rounded bg-[#1a1a1a] border border-[#222]"><span className="text-[#555]">Title:</span> <span className="text-white">{ogData.title || 'â€”'}</span></div>
              <div className="p-2 rounded bg-[#1a1a1a] border border-[#222]"><span className="text-[#555]">Card:</span> <span className="text-white">{ogData.twitterCard}</span></div>
              <div className="p-2 rounded bg-[#1a1a1a] border border-[#222] col-span-2"><span className="text-[#555]">Description:</span> <span className="text-white">{ogData.desc || 'â€”'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â• Semantic HTML Checker Panel â•â•â• */}
      {showSemanticPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              <span className="text-sm font-medium text-white">Semantic HTML</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${semanticIssues.length === 0 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{semanticIssues.length === 0 ? 'Clean âœ“' : `${semanticIssues.length} issues`}</span>
            </div>
            <button onClick={() => setShowSemanticPanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {semanticIssues.length === 0 && <div className="text-center py-6 text-green-400 text-[11px]">All HTML is semantic âœ“</div>}
            {semanticIssues.map((s: any, i: any) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 mt-0.5 ${s.severity === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{s.severity}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white">{s.issue}</div>
                  <div className="text-green-400 text-[9px]">â†’ {s.suggestion}</div>
                </div>
                <span className="text-[#555] text-[9px] shrink-0">{s.file.split('/').pop()}:{s.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• File Change Summary Panel â•â•â• */}
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
              {changeSummary.added.length > 0 && <div className="space-y-0.5">{changeSummary.added.map((f: any) => <div key={f} className="text-[10px] text-green-400 font-mono">+ {f}</div>)}</div>}
              {changeSummary.modified.length > 0 && <div className="space-y-0.5">{changeSummary.modified.map((f: any) => <div key={f} className="text-[10px] text-amber-400 font-mono">~ {f}</div>)}</div>}
              {changeSummary.removed.length > 0 && <div className="space-y-0.5">{changeSummary.removed.map((f: any) => <div key={f} className="text-[10px] text-red-400 font-mono">- {f}</div>)}</div>}
            </div>
          )}
        </div>
      )}

      {/* â•â•â• Whitespace/Indent Checker Panel â•â•â• */}
      {showWhitespacePanel && (
        <div className="fixed top-16 right-4 z-40 w-[400px] max-h-[500px] flex flex-col bg-[#161616] rounded-xl border border-[#2a2a2a] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M21 10H3"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M21 18H3"/></svg>
              <span className="text-sm font-medium text-white">Whitespace Check</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${whitespaceIssues.length === 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{whitespaceIssues.length === 0 ? 'Clean âœ“' : `${whitespaceIssues.length} issues`}</span>
            </div>
            <button onClick={() => setShowWhitespacePanel(false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {whitespaceIssues.length === 0 && <div className="text-center py-6 text-green-400 text-[11px]">No whitespace issues found âœ“</div>}
            {whitespaceIssues.map((w: any, i: any) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[11px]">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold shrink-0 ${w.type === 'mixed-indent' ? 'bg-red-500/20 text-red-400' : w.type === 'trailing' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>{w.type}</span>
                <span className="text-[#ccc] flex-1 truncate">{w.issue}</span>
                <span className="text-[#555] text-[9px] shrink-0">{w.file.split('/').pop()}:{w.line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• PWA Checker Panel â•â•â• */}
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
            {pwaChecks.checks.map((check: any) => (
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

      {/* â•â•â• Schema.org Validator Panel â•â•â• */}
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
            {schemaData.map((s: any, i: any) => (
              <div key={i} className="rounded-lg bg-[#1a1a1a] border border-[#222] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#222]">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${s.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{s.valid ? 'Valid' : 'Invalid'}</span>
                  <span className="text-[11px] text-amber-400 font-bold">{s.type}</span>
                  <span className="text-[9px] text-[#555] ml-auto">{s.props.length} properties</span>
                </div>
                {s.props.length > 0 && <div className="px-3 py-1.5 flex flex-wrap gap-1">{s.props.map((p: any) => <span key={p} className="text-[8px] px-1 py-0.5 rounded bg-[#222] text-[#888] font-mono">{p}</span>)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â• Bundle Size Estimator Panel â•â•â• */}
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
            {bundleEstimate.files.map((f: any) => (
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

      {/* â•â•â• ARIA Roles Inspector Panel â•â•â• */}
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
            {ariaRoles.map((r: any, i: any) => (
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

      {/* â•â•â• Security Headers Check Panel â•â•â• */}
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
            {securityChecks.checks.map((check: any) => (
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

      {/* â•â•â• v23: Collaboration Room Panel â•â•â• */}
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
                  {collabUsers.map((u: any) => (
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
                {/* â•â•â• v24: Collab Chat â•â•â• */}
                <div className="border-t border-[#222] pt-3">
                  <div className="text-[11px] text-[#888] mb-2">Chat</div>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5 mb-2">
                    {collabChatMessages.length === 0 && <p className="text-[10px] text-[#555] italic">No messages yet</p>}
                    {collabChatMessages.slice(-20).map((msg: any, i: any) => (
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

      {/* â•â•â• Google Stitch Design Panel â•â•â• */}
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
                  {stitchPages.map((page: any, i: any) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={page.name}
                        onChange={e => setStitchPages((prev: any) => prev.map((p: any, j: any) => j === i ? { ...p, name: e.target.value } : p))}
                        placeholder="Page name"
                        className="w-24 px-2 py-1.5 rounded-md bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none"
                      />
                      <input
                        value={page.prompt}
                        onChange={e => setStitchPages((prev: any) => prev.map((p: any, j: any) => j === i ? { ...p, prompt: e.target.value } : p))}
                        placeholder="Description for this page..."
                        className="flex-1 px-2 py-1.5 rounded-md bg-[#1a1a1a] border border-[#333] text-white text-[11px] placeholder:text-[#444] focus:border-purple-500/50 outline-none"
                      />
                      {stitchPages.length > 1 && (
                        <button onClick={() => setStitchPages((prev: any) => prev.filter((_: any, j: any) => j !== i))} className="text-[#555] hover:text-red-400 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setStitchPages((prev: any) => [...prev, { name: '', prompt: '' }])} className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors">+ Add page</button>
                </div>
                <button
                  onClick={stitchRunLoop}
                  disabled={stitchLoading || stitchPages.every((p: any) => !p.name.trim() || !p.prompt.trim())}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-[12px] font-medium transition-all flex items-center justify-center gap-2"
                >
                  {stitchLoading ? (
                    <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Building {stitchPages.filter((p: any) => p.name.trim()).length} pages...</>
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
                {stitchScreens.map((s: any, i: any) => (
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
                            setProjectFiles((prev: any) => ({ ...prev, [fileName]: { content: s.html!, language: 'html' } }));
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
                <div>1. Describe your page â†’ Stitch generates a high-fidelity design</div>
                <div>2. Auto-enhanced prompts for professional UI/UX results</div>
                <div>3. HTML imported directly into your project files</div>
                <div>4. Use Loop mode to build an entire multi-page site</div>
                <div className="pt-1 text-[#555]">Requires STITCH_API_KEY in .env.local</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* â•â•â• v23: Feedback Panel â•â•â• */}
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
                <div className="text-3xl mb-2">ðŸŽ‰</div>
                <div className="text-sm text-white font-medium">Thank you for your feedback!</div>
                <div className="text-[11px] text-[#555] mt-1">It helps us improve Aurion.</div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-[12px] text-[#aaa] mb-3">How would you rate your experience?</div>
                  <div className="flex justify-center gap-3">
                    {[
                      { emoji: 'ðŸ˜ž', label: 'Terrible', value: 1 },
                      { emoji: 'ðŸ˜•', label: 'Poor', value: 2 },
                      { emoji: 'ðŸ˜', label: 'Okay', value: 3 },
                      { emoji: 'ðŸ˜Š', label: 'Good', value: 4 },
                      { emoji: 'ðŸ˜', label: 'Amazing', value: 5 },
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

      {/* â•â•â• v23: Onboarding Tour Overlay â•â•â• */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-[480px] bg-[#161616] rounded-2xl border border-[#2a2a2a] shadow-2xl overflow-hidden">
            <div className="relative h-36 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-cyan-600/10 flex items-center justify-center">
              <span className="text-5xl">{onboardingSteps[onboardingStep]?.icon}</span>
              <div className="absolute top-3 right-3 flex gap-1">
                {onboardingSteps.map((_: any, i: any) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === onboardingStep ? 'bg-white w-4' : i < onboardingStep ? 'bg-white/50' : 'bg-white/20'}`} />)}
              </div>
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-lg font-bold text-white">{onboardingSteps[onboardingStep]?.title}</h3>
              <p className="text-[13px] text-[#aaa] leading-relaxed">{onboardingSteps[onboardingStep]?.desc}</p>
            </div>
            <div className="px-6 pb-6 flex items-center justify-between">
              <button onClick={finishOnboarding} className="text-[11px] text-[#555] hover:text-white transition-colors">Skip tour</button>
              <div className="flex gap-2">
                {onboardingStep > 0 && <button onClick={() => setOnboardingStep((s: any) => s - 1)} className="px-4 py-2 rounded-lg bg-[#222] text-[12px] text-white hover:bg-[#2a2a2a] transition-colors">Back</button>}
                {onboardingStep < onboardingSteps.length - 1 ? (
                  <button onClick={() => setOnboardingStep((s: any) => s + 1)} className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[12px] font-medium hover:bg-indigo-500/30 transition-colors">Next</button>
                ) : (
                  <button onClick={finishOnboarding} className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[12px] font-medium hover:bg-indigo-500/30 transition-colors">Get Started</button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* â•â•â• v23: Changelog / What's New â•â•â• */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowChangelog(false)}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={e => e.stopPropagation()} className="w-[520px] max-h-[600px] bg-[#161616] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">ðŸš€</span>
                <span className="text-base font-bold text-white">{"What's New in Aurion"}</span>
              </div>
              <button onClick={() => setShowChangelog(false)} className="text-[#555] hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {[
                { version: 'v23', date: 'Latest', title: 'Collaboration, Feedback & AI Quality', items: ['Real-time collaboration rooms with BroadcastChannel sync', 'Feedback widget with emoji ratings', 'Interactive onboarding tour for new users', 'Enhanced AI system prompts for better code generation', 'Iterative editing intelligence â€” AI preserves existing code', 'Error recovery protocol â€” smarter debugging', 'Changelog panel (you are here!)'] },
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

      {/* â•â•â• v24: Visual Drag & Drop Builder â•â•â• */}
      {showVisualBuilder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          {/* Component Palette */}
          <div className="w-[280px] bg-[#111] border-r border-[#2a2a2a] flex flex-col">
            <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
              <span className="text-[13px] font-bold text-white">Components</span>
              <button onClick={() => setShowVisualBuilder(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {COMPONENTS.map((comp: any) => (
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
                <button onClick={vbGenerateCode} disabled={vbCanvas.length === 0} className="px-3 py-1 text-[10px] text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-30">Generate Code â†’</button>
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
                  {vbCanvas.map((html: any, idx: any) => (
                    <div key={idx} onClick={() => setVbSelectedIdx(idx)} className={`relative group rounded-lg overflow-hidden transition-all ${vbSelectedIdx === idx ? 'ring-2 ring-purple-500' : 'ring-1 ring-transparent hover:ring-[#333]'}`}>
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); vbMoveComponent(idx, 'up'); }} disabled={idx === 0} className="w-6 h-6 flex items-center justify-center bg-black/80 rounded text-white text-[10px] hover:bg-purple-600 disabled:opacity-30">â†‘</button>
                        <button onClick={(e) => { e.stopPropagation(); vbMoveComponent(idx, 'down'); }} disabled={idx === vbCanvas.length - 1} className="w-6 h-6 flex items-center justify-center bg-black/80 rounded text-white text-[10px] hover:bg-purple-600 disabled:opacity-30">â†“</button>
                        <button onClick={(e) => { e.stopPropagation(); vbRemoveComponent(idx); }} className="w-6 h-6 flex items-center justify-center bg-black/80 rounded text-red-400 text-[10px] hover:bg-red-600 hover:text-white">Ã—</button>
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
                  <textarea value={vbCanvas[vbSelectedIdx] || ''} onChange={e => setVbCanvas((prev: any) => { const n = [...prev]; n[vbSelectedIdx] = e.target.value; return n; })} className="w-full h-full bg-[#0a0a0a] text-[11px] text-green-400 font-mono p-3 rounded-lg border border-[#222] focus:border-purple-500 focus:outline-none resize-none" spellCheck={false} />
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

      {/* â•â•â• v24: Animation Timeline Builder â•â•â• */}
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
                  {animKeyframes.map((anim: any, i: any) => (
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
                        <div><label className="text-[9px] text-[#555] uppercase">Name</label><input value={anim.name} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; n[animSelected] = { ...n[animSelected], name: e.target.value }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none" /></div>
                        <div><label className="text-[9px] text-[#555] uppercase">Duration (s)</label><input type="number" step="0.1" min="0.1" value={anim.duration} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; n[animSelected] = { ...n[animSelected], duration: parseFloat(e.target.value) || 0.1 }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none" /></div>
                        <div><label className="text-[9px] text-[#555] uppercase">Easing</label><select value={anim.easing} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; n[animSelected] = { ...n[animSelected], easing: e.target.value }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none">{['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'cubic-bezier(0.22,1,0.36,1)'].map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                        <div><label className="text-[9px] text-[#555] uppercase">Iteration</label><select value={anim.iteration} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; n[animSelected] = { ...n[animSelected], iteration: e.target.value }; return n; })} className="w-full mt-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[11px] text-white focus:border-indigo-500 focus:outline-none">{['1', '2', '3', 'infinite'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                      </div>

                      {/* Timeline */}
                      <div className="relative h-8 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
                        {anim.frames.map((frame: any, fi: any) => (
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
                        {anim.frames.map((frame: any, fi: any) => (
                          <div key={fi} className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-indigo-400 font-bold">{frame.pct}%</span>
                                <input type="range" min="0" max="100" value={frame.pct} onChange={e => setAnimKeyframes((prev: any) => { const n = [...prev]; const a = { ...n[animSelected], frames: [...n[animSelected].frames] }; a.frames[fi] = { ...a.frames[fi], pct: parseInt(e.target.value) }; n[animSelected] = a; return n; })} className="w-20 h-1 accent-indigo-500" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(frame.props).map(([prop, val]) => (
                                <div key={prop} className="flex items-center gap-1">
                                  <span className="text-[9px] text-[#666] w-16 truncate">{prop}</span>
                                  <input value={val as string} onChange={(e: any) => animUpdateFrame(animSelected, fi, prop, e.target.value)} className="flex-1 px-1.5 py-0.5 bg-[#0a0a0a] border border-[#222] rounded text-[10px] text-white focus:border-indigo-500 focus:outline-none" />
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
                          <button onClick={() => setAnimPreviewPlaying((p: any) => !p)} className={`px-3 py-1 rounded text-[10px] transition-colors ${animPreviewPlaying ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{animPreviewPlaying ? 'â¹ Stop' : 'â–¶ Play'}</button>
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

      {/* â•â•â• v24: Design System Manager â•â•â• */}
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
                  {dsColors.map((color: any, ci: any) => (
                    <div key={ci}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-6 h-6 rounded-md border border-[#333]" style={{ backgroundColor: color.value }} />
                        <span className="text-[12px] text-white font-medium">{color.name}</span>
                        <span className="text-[10px] text-[#555]">{color.value}</span>
                        <button onClick={() => setDsColors((prev: any) => prev.filter((_: any, i: any) => i !== ci))} className="text-[10px] text-[#555] hover:text-red-400 ml-auto">Remove</button>
                      </div>
                      <div className="flex gap-1">
                        {color.variants.map((v: any, vi: any) => (
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
                    {dsTypeScale.map((t: any, i: any) => (
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
                    {dsSpacing.map((s: any) => (
                      <div key={s} className="flex items-center gap-4">
                        <span className="text-[10px] text-[#555] w-12 shrink-0">{s}px</span>
                        <div className="h-4 bg-pink-500/30 rounded-sm" style={{ width: `${Math.min(s * 2, 300)}px` }} />
                        <span className="text-[9px] text-[#666]">--space-{s}</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] text-white font-medium block mt-6">Border Radius</span>
                  <div className="flex gap-3 flex-wrap">
                    {dsBorderRadius.map((r: any) => (
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
                    {dsShadows.map((s: any) => (
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

      {/* â•â•â• v24: REST API Tester â•â•â• */}
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
                      {apiHeaders.map((h: any, i: any) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={h.key} onChange={e => setApiHeaders((prev: any) => { const n = [...prev]; n[i] = { ...n[i], key: e.target.value }; return n; })} placeholder="Key" className="flex-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#222] rounded text-[10px] text-white focus:border-amber-500 focus:outline-none" />
                          <input value={h.value} onChange={e => setApiHeaders((prev: any) => { const n = [...prev]; n[i] = { ...n[i], value: e.target.value }; return n; })} placeholder="Value" className="flex-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#222] rounded text-[10px] text-white focus:border-amber-500 focus:outline-none" />
                          <button onClick={() => apiRemoveHeader(i)} className="text-[#555] hover:text-red-400"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                        </div>
                      ))}
                      <button onClick={apiAddHeader} className="w-full py-1.5 border border-dashed border-[#333] rounded text-[10px] text-[#555] hover:text-amber-400 hover:border-amber-500/30 transition-colors">+ Add Header</button>
                    </div>
                  )}
                  {apiTab === 'history' && (
                    <div className="space-y-1">
                      {apiHistory.length === 0 ? <p className="text-[11px] text-[#444] text-center py-8">No requests yet</p> :
                        apiHistory.map((h: any, i: any) => (
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

      {/* â•â•â• v24: Git Branch Manager â•â•â• */}
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
                {gitBranches.map((branch: any) => (
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
                    {gitBranchCommits.map((commit: any) => (
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
                  gitStash.map((stash: any, i: any) => (
                    <div key={stash.id} className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-white">{stash.message}</div>
                        <div className="text-[9px] text-[#555] mt-0.5">{Object.keys(stash.files).length} files Â· {new Date(stash.timestamp).toLocaleString()}</div>
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
                      {gitRepos.map((r: any) => <option key={r.fullName} value={r.fullName}>{r.fullName} {r.language ? `(${r.language})` : ''}</option>)}
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
                          {gitRemoteBranches.map((b: any) => (
                            <div key={b.name} className="flex items-center justify-between p-1.5 bg-[#1a1a1a] rounded border border-[#222] text-[10px]">
                              <span className="text-white truncate">{b.name}</span>
                              <div className="flex gap-1">
                                <button onClick={() => gitFetchCommits(gitSelectedRepo, b.name)} className="px-1.5 py-0.5 text-[8px] text-[#888] bg-[#222] rounded hover:text-white">Log</button>
                                {b.name !== 'main' && <button onClick={() => gitMergeBranch(b.name, 'main')} className="px-1.5 py-0.5 text-[8px] text-orange-400 bg-orange-500/10 rounded hover:bg-orange-500/20">Mergeâ†’main</button>}
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
                          {gitRemoteBranches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                        <span className="text-[10px] text-[#555] self-center">â†’</span>
                        <select value={gitPRBase} onChange={e => setGitPRBase(e.target.value)} className="flex-1 px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-[10px] text-white focus:outline-none">
                          {gitRemoteBranches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                      <button onClick={gitCreatePR} disabled={!gitPRTitle || !gitPRHead} className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-bold rounded transition-colors disabled:opacity-30">Create PR</button>
                    </div>

                    {/* Open PRs */}
                    {gitPRs.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] text-[#888] font-medium">Pull Requests ({gitPRs.length})</div>
                        {gitPRs.map((pr: any) => (
                          <div key={pr.number} className="p-2 bg-[#1a1a1a] rounded-lg border border-[#222] flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-white truncate">#{pr.number} {pr.title}</div>
                              <div className="text-[8px] text-[#555]">{pr.head} â†’ {pr.base} Â· {pr.author}</div>
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
                          {gitRemoteCommits.slice(0, 10).map((c: any) => (
                            <div key={c.sha} className="flex items-center gap-2 p-1.5 bg-[#1a1a1a] rounded border border-[#222]">
                              {c.avatar && <img src={c.avatar} alt="" className="w-4 h-4 rounded-full" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] text-white truncate">{c.message}</div>
                                <div className="text-[8px] text-[#555]">{c.sha} Â· {c.author}</div>
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

      {/* â•â•â• Figma Import Panel â•â•â• */}
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
                  {figmaFrames.pages.map((page: any, pi: any) => (
                    <div key={pi} className="space-y-1">
                      <div className="text-[10px] text-purple-400 font-medium">{page.name}</div>
                      {page.frames.map((frame: any) => (
                        <button key={frame.id} onClick={() => figmaImport(frame.id)} className="w-full flex items-center justify-between p-2.5 bg-[#1a1a1a] rounded-lg border border-[#222] hover:border-purple-500/30 transition-colors text-left">
                          <div>
                            <div className="text-[11px] text-white">{frame.name}</div>
                            <div className="text-[9px] text-[#555]">{frame.width}x{frame.height} Â· {frame.childCount} children</div>
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
                      <div className="text-[9px] text-[#555]">{figmaData.fileName} {figmaData.frameSize ? `Â· ${figmaData.frameSize.width}x${figmaData.frameSize.height}` : ''}</div>
                    </div>
                    <button onClick={figmaGenCode} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all">Generate Code</button>
                  </div>
                  {figmaData.screenshotUrl && <img src={figmaData.screenshotUrl} alt="Frame" className="w-full rounded-lg border border-[#222] max-h-[200px] object-contain bg-[#0a0a0a]" />}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-[#888] mb-1.5">Colors</div>
                      <div className="flex flex-wrap gap-1">{figmaData.colors.map((c: any, i: any) => (<div key={i} className="w-5 h-5 rounded border border-[#333]" style={{ background: c }} title={c} />))}</div>
                    </div>
                    <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-[#888] mb-1.5">Fonts</div>
                      <div className="text-[10px] text-white">{figmaData.fonts.join(', ') || 'None detected'}</div>
                    </div>
                  </div>
                  {figmaData.components && figmaData.components.length > 0 && (
                    <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-[#888] mb-1.5">Components ({figmaData.components.length})</div>
                      <div className="flex flex-wrap gap-1">{figmaData.components.slice(0, 12).map((c: any, i: any) => (
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

      {/* â•â•â• Test Runner Panel â•â•â• */}
      {showTestRunner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[750px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">Test Runner</span>
                <span className="text-[10px] text-[#555]">Vitest â€¢ {webContainer.state.status === 'ready' ? 'WebContainer Ready' : 'WebContainer Idle'}</span>
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
                  <div className="text-[11px] text-[#888] font-medium">Results ({testResults.filter((r: any) => r.status === 'pass').length}/{testResults.length} passed)</div>
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#222] divide-y divide-[#1a1a1a]">
                    {testResults.map((t: any, i: any) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 text-[11px]">
                        {t.status === 'pass' ? <span className="text-emerald-400">âœ“</span> : t.status === 'fail' ? <span className="text-red-400">âœ—</span> : <span className="text-yellow-400">â—‹</span>}
                        <span className={t.status === 'pass' ? 'text-emerald-400/80' : t.status === 'fail' ? 'text-red-400/80' : 'text-yellow-400/80'}>{t.name}</span>
                        {t.duration && <span className="text-[#555] ml-auto">{t.duration}ms</span>}
                      </div>
                    ))}
                  </div>
                  {/* Summary bar */}
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-emerald-400">{testResults.filter((r: any) => r.status === 'pass').length} passed</span>
                    <span className="text-red-400">{testResults.filter((r: any) => r.status === 'fail').length} failed</span>
                    <span className="text-yellow-400">{testResults.filter((r: any) => r.status === 'skip').length} skipped</span>
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
                        <span className="text-purple-400">ðŸ§ª</span>
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
                  <div className="text-2xl mb-2">ðŸ§ª</div>
                  <div>Select a source file and click &quot;Generate &amp; Run Tests&quot;</div>
                  <div className="mt-1 text-[10px]">Tests are generated by AI and executed in a real WebContainer runtime</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* â•â•â• AI Code Review Panel â•â•â• */}
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
                  <div dangerouslySetInnerHTML={{ __html: (() => { const e = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); return e(codeReviewResult).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code style="background:#1a1a1a;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>').replace(/^### (.*$)/gm, '<h3 style="color:white;font-size:14px;margin-top:16px">$1</h3>').replace(/^## (.*$)/gm, '<h2 style="color:white;font-size:15px;margin-top:18px">$1</h2>').replace(/^- (.*$)/gm, '<div style="padding-left:12px;margin:4px 0">â€¢ $1</div>').replace(/^(\d+)\. (.*$)/gm, '<div style="padding-left:12px;margin:4px 0">$1. $2</div>').replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:12px;margin:8px 0;overflow-x:auto"><code>$2</code></pre>').replace(/\n/g, '<br/>'); })() }} />
                </div>
              ) : !codeReviewLoading ? (
                <div className="text-center py-10 text-[#555] text-[11px]">
                  <div className="text-2xl mb-2">ðŸ”</div>
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

      {/* â•â•â• v24: AI Screenshot Analyzer â•â•â• */}
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
                    {ssAnalyzing ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Analyzing with Claude...</>) : 'ðŸ§  Analyze & Generate Code'}
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
          {BREAKPOINT_SIZES.map((bp: any, i: any) => (
            <button key={bp.name} onClick={() => setBreakpointTestIdx(i)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${i === breakpointTestIdx ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-[#666] hover:text-white'}`}>{bp.w}</button>
          ))}
          <span className="text-[10px] text-[#888] ml-1">{BREAKPOINT_SIZES[breakpointTestIdx].name}</span>
          <button onClick={() => setBreakpointTestActive(false)} className="ml-2 text-[#555] hover:text-white transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
      )}
    </>
  );
}
