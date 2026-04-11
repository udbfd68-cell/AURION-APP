"use client";
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePageState } from '@/hooks/usePageState';
import LandingView from '@/components/LandingView';
import ChatPanel from '@/components/ChatPanel';
import TopBar from '@/components/TopBar';
import PreviewPanel from '@/components/PreviewPanel';
import DeployBanner from '@/components/DeployBanner';
import IntegrationsSidePanel from '@/components/IntegrationsSidePanel';
import ResearchSidePanel from '@/components/ResearchSidePanel';
import TerminalSection from '@/components/TerminalSection';
import ErrorBoundary from '@/components/ErrorBoundary';

const PanelLoader = () => <div className="flex-1 bg-[#0c0c0c] flex items-center justify-center text-[#555]">Loading...</div>;

const CodeEditorPanel = dynamic(() => import('@/components/CodeEditorPanel'), { loading: PanelLoader });
const DatabasePanel = dynamic(() => import('@/components/DatabasePanel'), { loading: PanelLoader });
const PaymentsPanel = dynamic(() => import('@/components/PaymentsPanel'), { loading: PanelLoader });
const IdePanel = dynamic(() => import('@/components/IdePanel'), { loading: PanelLoader });
const Overlays = dynamic(() => import('@/components/Overlays'), { ssr: false });

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(m => m.default), { ssr: false, loading: () => <div className="flex-1 bg-[#1e1e1e]" /> });
const MonacoDiffEditor = dynamic(() => import('@monaco-editor/react').then(m => m.DiffEditor), { ssr: false, loading: () => <div className="flex-1 bg-[#1e1e1e]" /> });

export default function HomePage() {
  const state = usePageState();
  const { pageProps, ...rest } = state;

  const {
    abMode, abModelB, abResultB, abStreaming, activeTab, attachedImages, autoFixEnabled, BREAKPOINT_SIZES,
    breakpointTestActive, breakpointTestIdx, browser21stInputRef, browser21stLoading, browser21stQuery,
    browser21stResults, capturePreviewScreenshot, chatDragRef, chatEndRef, chatWidth, claudeCodeMode, clonedHtml, cloneError,
    cloneProgress, cloneUrl, cloneWebsite, closeTab, codeBlocks, collabRoomId, collabUsers, connectDatabase,
    copyPreviewAsImage, copyPreviewHtml, createNewFile, createProject, currentProjectId, dbActiveConnection,
    dbEngineRef, dbQueryHistory, dbQueryResult, dbQueryRunning, dbSchema, dbSchemaLoading, dbSqlInput, dbViewMode,
    deleteProject, deployError, deployResult, deployToVercel, deviceMode, downloadProjectZip, editingIntegration,
    editorTheme, enterWorkspace, error, expandedDirs, explainCurrentCode, explorerContextMenu, exportProjectZip,
    fetchStripeData, fileInputRef, findInputRef, fixRuntimeError, followUpSuggestions, formatCode, formatCurrentFile,
    buildFileTree, CodeBlock, gridFlexDebugActive, handleDragLeave, handleDragOver, handleDrop, handleImageSelect, hasContent, hasPreviewContent,
    historyIdx, hoveredImage, ideCountdown, ideError, ideLoading, ideServiceId, ideStatus, ideUrl, iframeRef,
    inject21stComponent, injecting21stComponent, input, integrationKeys, isCloning, isDeploying, isDragOver,
    isClaudeCodeStreaming, isEditMode, isExplaining, isFileModified, isLandscape, isRefining, isResearching, isStreaming, isStripeLoading,
    isSupabaseLoading, landingFileInputRef, landingInput, landingTextareaRef, layoutDebugActive, messages,
    minimapEnabled, model, monacoEditorRef, newConversation, newFileInputRef, newFileName, openFile, openPreviewNewTab,
    openTabs, outputFramework, performResearch, pickedColor, preview21stComponent, previewDarkMode, previewHtml, previewLoading, previewZoom,
    projectFiles, projects, refineClone, refineFeedback, refreshPreview, removeImage, renameInputRef, renameProjectId,
    renameProjectName, renameTarget, renameValue, researchContext, researchError, researchMode, researchQuery,
    researchResults, runA11yAudit, runDatabaseQuery, runPerfAudit, runSchemaTemplate, runSupabaseQuery,
    runTerminalCommand, runClaudeCodeCommand, runtimeErrors, sandboxDb, sandboxDbTable, sandboxEmail, sandboxEmailForm, sandboxEmailLog,
    sandboxMsg, sandboxMsgForm, sandboxMsgLog, sandboxPay, saveIntegrationKey, search21stComponents, selectedFile,
    selectedModel, selectPromptData, selectPromptInput, selectPromptLoading, selectPromptRef, sendMessage, sendPrompt,
    sendRealEmail, sendRealMessage, sendToAI, setAbMode, setAbModelB, setAbResultB, setActiveTab, setAutoFixEnabled,
    setBreakpointTestActive, setBrowser21stQuery, setCloneError, setCloneUrl, setCommandQuery, setCursorPosition,
    setDbSchema, setDbSqlInput, setDbViewMode, setDeployError, setDeployResult, setDeviceMode, setEditingIntegration,
    setError, setExpandedDirs, setExplorerContextMenu, setGridFlexDebugActive, setHistoryIdx, setHoveredImage,
    setIdeError, setIdeLoading, setIdeServiceId, setIdeStatus, setIdeUrl, setInput, setIntegrationKeys, setIsEditMode,
    setIsLandscape, setLandingInput, setLayoutDebugActive, setMessages, setMinimapEnabled, setModel, setNewFileName,
    setOpenTabs, setOutputFramework, setPreview21stComponent, setPreviewDarkMode, setPreviewLoading, setPreviewZoom, setProjectFiles,
    setProjects, setRefineFeedback, setRenameProjectId, setRenameProjectName, setRenameTarget, setRenameValue,
    setResearchContext, setResearchMode, setResearchQuery, setResearchResults, setRuntimeErrors, setSandboxDb,
    setSandboxDbTable, setSandboxEmail, setSandboxEmailForm, setSandboxEmailLog, setSandboxMsg, setSandboxMsgForm,
    setSandboxMsgLog, setSandboxPay, setSelectedFile, setSelectPromptData, setSelectPromptInput, setSeoDescription,
    setSeoOgImage, setSeoTitle, setShowBackendGenerator, setShowCloneModal, setShowModelMenu, setShowStitchPanel,
    setShowTemplates, setShowTestRunner, setSplitFile, setStripeBalance, setStripeError, setStripeProducts,
    setSupabaseError, setSupabaseResult, setSupabaseTable, setSupabaseUrl, setTabContextMenu, setTerminalInput,
    setClaudeCodeMode, setTerminalLines, setView, setWordWrapEnabled, shareProjectUrl, showChat, showCloneModal, showDiffView,
    showModelMenu, showStitchPanel, showToast, smartSuggestions, splitFile, stopClone, stopStream, streamingChars,
    streamStartTime, stripeBalance, stripeError, stripeProducts, submitSelectPrompt, supabaseError, supabaseResult,
    supabaseTable, supabaseUrl, switchProject, tabContextMenu, termDragRef, terminalEndRef, terminalHeight,
    terminalHistory, terminalInput, terminalInputRef, terminalLines, testingIntegration, testIntegration, testResult,
    textareaRef, toasts, vfsHistory, vfsHistoryIdx, vfsRedo, vfsUndo, view, wcInstalling, wcInstallProgress,
    webContainer, wordWrapEnabled
  } = state;


  if (view === 'landing') {
    return (
      <LandingView
        attachedImages={attachedImages}
        cloneUrl={cloneUrl}
        cloneWebsite={cloneWebsite}
        enterWorkspace={enterWorkspace}
        handleImageSelect={handleImageSelect}
        landingFileInputRef={landingFileInputRef}
        landingInput={landingInput}
        landingTextareaRef={landingTextareaRef}
        model={model}
        removeImage={removeImage}
        selectedModel={selectedModel}
        setCloneUrl={setCloneUrl}
        setLandingInput={setLandingInput}
        setModel={setModel}
        setShowCloneModal={setShowCloneModal}
        setShowModelMenu={setShowModelMenu}
        setShowTemplates={setShowTemplates}
        setView={setView}
        showCloneModal={showCloneModal}
        showModelMenu={showModelMenu}
      />
    );
  }

  // ─── WORKSPACE VIEW ─────────────────────────

  return (
    <div className="h-screen bg-[#0c0c0c] flex relative overflow-hidden select-none workspace-layout">

      {/* ═══ Left: Chat panel (resizable) ═══ */}
      {showChat && (
        <ChatPanel
          chatWidth={chatWidth} messages={messages} newConversation={newConversation}
          hasContent={hasContent} smartSuggestions={smartSuggestions} sendPrompt={sendPrompt}
          isStreaming={isStreaming} showToast={showToast} selectedFile={selectedFile}
          projectFiles={projectFiles} setProjectFiles={setProjectFiles}
          abMode={abMode} abResultB={abResultB} abStreaming={abStreaming} abModelB={abModelB}
          setAbResultB={setAbResultB} setMessages={setMessages} error={error} setError={setError}
          sendToAI={sendToAI} followUpSuggestions={followUpSuggestions} chatEndRef={chatEndRef}
          streamingChars={streamingChars} streamStartTime={streamStartTime} model={model}
          textareaRef={textareaRef} input={input} setInput={setInput} sendMessage={sendMessage}
          setModel={setModel} selectedModel={selectedModel} setAbMode={setAbMode}
          setAbModelB={setAbModelB}
          researchMode={researchMode} fileInputRef={fileInputRef} handleImageSelect={handleImageSelect}
          stopStream={stopStream} attachedImages={attachedImages} removeImage={removeImage}
        />
      )}

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
        <ErrorBoundary name="TopBar">
          <TopBar {...{ activeTab, setActiveTab, projects, currentProjectId, renameProjectId, renameProjectName, setRenameProjectId, setRenameProjectName, setProjects, switchProject, deleteProject, createProject, hasPreviewContent, refreshPreview, openPreviewNewTab, copyPreviewHtml, capturePreviewScreenshot, deviceMode, setDeviceMode, isLandscape, setIsLandscape, previewZoom, setPreviewZoom, isEditMode, setIsEditMode, browser21stInputRef, layoutDebugActive, setLayoutDebugActive, gridFlexDebugActive, setGridFlexDebugActive, breakpointTestActive, setBreakpointTestActive, runA11yAudit, runPerfAudit, setSeoTitle, setSeoDescription, setSeoOgImage, projectFiles, selectedFile, vfsUndo, vfsRedo, vfsHistoryIdx, vfsHistory, downloadProjectZip, formatCurrentFile, splitFile, setSplitFile, minimapEnabled, setMinimapEnabled, wordWrapEnabled, setWordWrapEnabled, pickedColor, explainCurrentCode, isStreaming, isExplaining, findInputRef, shareProjectUrl, deployToVercel, isDeploying, previewDarkMode, setPreviewDarkMode, formatCode, copyPreviewAsImage, exportProjectZip, collabRoomId, collabUsers, autoFixEnabled, setAutoFixEnabled, showStitchPanel, setShowStitchPanel, setCommandQuery, researchMode, newFileInputRef, setNewFileName }} />
        </ErrorBoundary>

        <DeployBanner deployResult={deployResult} setDeployResult={setDeployResult} deployError={deployError} setDeployError={setDeployError} />
        {/* Content area */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <ErrorBoundary name="TabContent">
              <Suspense fallback={<PanelLoader />}>
              <AnimatePresence initial={false}>
                {activeTab === 'app' ? (
                  <PreviewPanel {...{ hasPreviewContent, webContainer, selectedFile, refreshPreview, deviceMode, isLandscape, previewZoom, breakpointTestActive, breakpointTestIdx, BREAKPOINT_SIZES, previewLoading, wcInstalling, wcInstallProgress, iframeRef, setPreviewLoading, previewHtml, isEditMode, selectPromptData, setSelectPromptData, selectPromptInput, setSelectPromptInput, selectPromptRef, submitSelectPrompt, selectPromptLoading, browser21stQuery, setBrowser21stQuery, browser21stInputRef, search21stComponents, browser21stLoading, browser21stResults, inject21stComponent, injecting21stComponent, preview21stComponent, setPreview21stComponent, clonedHtml, setRefineFeedback, isRefining, refineFeedback, refineClone, stopClone, isCloning, cloneProgress, isStreaming, cloneError, setCloneError, setShowCloneModal, setProjectFiles, setSelectedFile, setActiveTab }} />
                ) : activeTab === 'code' ? (
                  <CodeEditorPanel {...{ projectFiles, selectedFile, setSelectedFile, openTabs, setOpenTabs, openFile, closeTab, setProjectFiles, expandedDirs, setExpandedDirs, buildFileTree, explorerContextMenu, setExplorerContextMenu, renameTarget, setRenameTarget, renameValue, setRenameValue, renameInputRef, hoveredImage, setHoveredImage, tabContextMenu, setTabContextMenu, isFileModified, editorTheme, minimapEnabled, wordWrapEnabled, monacoEditorRef, setCursorPosition, showDiffView, vfsHistoryIdx, vfsHistory, splitFile, setSplitFile, isDragOver, handleDrop, handleDragOver, handleDragLeave, codeBlocks, CodeBlock, newFileName, setNewFileName, newFileInputRef, createNewFile, showToast }} />
                ) : activeTab === 'database' ? (
                  <DatabasePanel {...{ dbActiveConnection, dbViewMode, setDbViewMode, dbSqlInput, setDbSqlInput, dbQueryRunning, dbQueryResult, dbSchema, dbSchemaLoading, dbQueryHistory, runDatabaseQuery, runSchemaTemplate, connectDatabase, integrationKeys, setIntegrationKeys, supabaseUrl, setSupabaseUrl, supabaseTable, setSupabaseTable, supabaseResult, setSupabaseResult, supabaseError, setSupabaseError, isSupabaseLoading, runSupabaseQuery, sandboxDb, setSandboxDb, sandboxDbTable, setSandboxDbTable, sandboxEmail, setSandboxEmail, sandboxEmailForm, setSandboxEmailForm, sandboxEmailLog, setSandboxEmailLog, sendRealEmail, editingIntegration, setEditingIntegration, saveIntegrationKey, sendPrompt, dbEngineRef, setDbSchema }} />
                ) : activeTab === 'payments' ? (
                  <PaymentsPanel {...{ integrationKeys, setIntegrationKeys, stripeBalance, setStripeBalance, stripeProducts, setStripeProducts, stripeError, setStripeError, isStripeLoading, fetchStripeData, sandboxPay, setSandboxPay, sandboxMsg, setSandboxMsg, sandboxMsgForm, setSandboxMsgForm, sandboxMsgLog, setSandboxMsgLog, sendRealMessage, editingIntegration, setEditingIntegration, saveIntegrationKey, sendPrompt }} />
                ) : activeTab === 'ide' ? (
                  <IdePanel {...{ ideStatus, ideUrl, ideServiceId, ideLoading, ideError, ideCountdown, setIdeServiceId, setIdeUrl, setIdeLoading, setIdeStatus, setIdeError }} />
                ) : null}
              </AnimatePresence>
              </Suspense>
              </ErrorBoundary>
            </div>

            {/* Integrations side panel */}
            <IntegrationsSidePanel {...{ integrationKeys, editingIntegration, testingIntegration, testResult, setEditingIntegration, saveIntegrationKey, testIntegration }} />

            {/* Research & Analysis Panel */}
            <ResearchSidePanel {...{ researchMode, setResearchMode, researchQuery, setResearchQuery, researchResults, setResearchResults, isResearching, researchError, researchContext, setResearchContext, performResearch, integrationKeys, setInput }} />
          </div>

          {/* Terminal */}
          <TerminalSection {...{ terminalHeight, termDragRef, runtimeErrors, setRuntimeErrors, autoFixEnabled, setAutoFixEnabled, webContainer, setShowTestRunner, fixRuntimeError, isStreaming, terminalLines, setTerminalLines, terminalInput, setTerminalInput, runTerminalCommand, terminalHistory, historyIdx, setHistoryIdx, terminalInputRef, terminalEndRef, claudeCodeMode, setClaudeCodeMode, runClaudeCodeCommand, isClaudeCodeStreaming }} />
        </div>
      </div>



      {/* All modals, overlays, toasts */}
      <Overlays p={pageProps} />

    </div>
  );
}