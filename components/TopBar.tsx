'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import type { ActiveTab, DeviceMode, PreviewDarkMode, VirtualFS } from '@/lib/types';
import {
  DesktopIcon, CodeIcon, DatabaseIcon, PaymentsIcon, DeployIcon, GitHubIcon,
} from '@/lib/page-helpers';

export interface TopBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  projects: Array<{ id: string; name: string }>;
  currentProjectId: string;
  renameProjectId: string | null;
  renameProjectName: string;
  setRenameProjectId: (id: string | null) => void;
  setRenameProjectName: (name: string) => void;
  setProjects: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string }>>>;
  switchProject: (id: string) => void;
  deleteProject: (id: string) => void;
  createProject: (name: string) => void;
  hasPreviewContent: boolean;
  refreshPreview: () => void;
  openPreviewNewTab: () => void;
  copyPreviewHtml: () => void;
  capturePreviewScreenshot: () => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  isLandscape: boolean;
  setIsLandscape: (v: boolean | ((p: boolean) => boolean)) => void;
  previewZoom: number;
  setPreviewZoom: (v: number | ((p: number) => number)) => void;
  isEditMode: boolean;
  setIsEditMode: (v: boolean | ((p: boolean) => boolean)) => void;
  browser21stInputRef: React.RefObject<HTMLInputElement | null>;
  layoutDebugActive: boolean;
  setLayoutDebugActive: (v: boolean | ((p: boolean) => boolean)) => void;
  gridFlexDebugActive: boolean;
  setGridFlexDebugActive: (v: boolean | ((p: boolean) => boolean)) => void;
  breakpointTestActive: boolean;
  setBreakpointTestActive: (v: boolean | ((p: boolean) => boolean)) => void;
  runA11yAudit: () => void;
  runPerfAudit: () => void;
  setSeoTitle: (v: string) => void;
  setSeoDescription: (v: string) => void;
  setSeoOgImage: (v: string) => void;
  projectFiles: VirtualFS;
  selectedFile: string;
  vfsUndo: () => void;
  vfsRedo: () => void;
  vfsHistoryIdx: number;
  vfsHistory: VirtualFS[];
  downloadProjectZip: () => void;
  formatCurrentFile: () => void;
  splitFile: string | null;
  setSplitFile: (v: string | null) => void;
  minimapEnabled: boolean;
  setMinimapEnabled: (v: boolean | ((p: boolean) => boolean)) => void;
  wordWrapEnabled: boolean;
  setWordWrapEnabled: (v: boolean | ((p: boolean) => boolean)) => void;
  pickedColor: string;
  explainCurrentCode: () => void;
  isStreaming: boolean;
  isExplaining: boolean;
  findInputRef: React.RefObject<HTMLInputElement | null>;
  shareProjectUrl: () => void;
  deployToVercel: () => void;
  isDeploying: boolean;
  previewDarkMode: PreviewDarkMode;
  setPreviewDarkMode: (v: PreviewDarkMode | ((p: PreviewDarkMode) => PreviewDarkMode)) => void;
  formatCode: () => void;
  copyPreviewAsImage: () => void;
  exportProjectZip: () => void;
  collabRoomId: string | null;
  collabUsers: unknown[];
  autoFixEnabled: boolean;
  setAutoFixEnabled: (v: boolean | ((p: boolean) => boolean)) => void;
  showStitchPanel: boolean;
  setShowStitchPanel: (v: boolean | ((p: boolean) => boolean)) => void;
  setCommandQuery: (v: string) => void;
  researchMode: boolean;
  newFileInputRef: React.RefObject<HTMLInputElement | null>;
  setNewFileName: (v: string) => void;
}

const TopBar = React.memo(function TopBar(props: TopBarProps) {
  const panelActions = usePanelStore();
  const {
    show21stBrowser, showA11yPanel, showAnalyzeMenu, showBreakpointRuler,
    showBundlePanel, showChat, showCodeToolsMenu, showCollabPanel,
    showColorEdit, showColorPalettePanel, showColorPicker, showConsoleFilter,
    showContrastPanel, showDebugMenu, showDepGraph, showDepsPanel, showDiffView,
    showDomTreePanel, showElementCountPanel, showHtmlValidatorPanel, showInspectMenu,
    showIntegrations, showLinkCheckerPanel, showMoreToolsMenu, showAnimPanel,
    showNetworkPanel, showOgPreview, showOutlinePanel, showPerfBudget,
    showPerfPanel, showProjectMenu, showPwaPanel, showRegexPanel, showResearchPanel,
    showResponsiveGrid, showSecurityPanel, showSemanticPanel, showSeoPanel,
    showSplitPreview, showStatsPanel, showTextStatsPanel, showTodoScanPanel,
    showUnusedCssPanel, showWhitespacePanel,
  } = usePanelStore();

  const {
    activeTab, setActiveTab, projects, currentProjectId, renameProjectId,
    renameProjectName, setRenameProjectId, setRenameProjectName, setProjects,
    switchProject, deleteProject, createProject, hasPreviewContent,
    refreshPreview, openPreviewNewTab, copyPreviewHtml, capturePreviewScreenshot,
    deviceMode, setDeviceMode, isLandscape, setIsLandscape,
    previewZoom, setPreviewZoom, isEditMode, setIsEditMode,
    browser21stInputRef, layoutDebugActive, setLayoutDebugActive,
    gridFlexDebugActive, setGridFlexDebugActive, breakpointTestActive,
    setBreakpointTestActive, runA11yAudit, runPerfAudit,
    setSeoTitle, setSeoDescription, setSeoOgImage, projectFiles, selectedFile,
    vfsUndo, vfsRedo, vfsHistoryIdx, vfsHistory, downloadProjectZip,
    formatCurrentFile, splitFile, setSplitFile, minimapEnabled, setMinimapEnabled,
    wordWrapEnabled, setWordWrapEnabled, pickedColor, explainCurrentCode,
    isStreaming, isExplaining, findInputRef, shareProjectUrl,
    deployToVercel, isDeploying, previewDarkMode, setPreviewDarkMode,
    formatCode, copyPreviewAsImage, exportProjectZip, collabRoomId,
    collabUsers, autoFixEnabled, setAutoFixEnabled, showStitchPanel,
    setShowStitchPanel, setCommandQuery, researchMode, newFileInputRef, setNewFileName,
  } = props;

  return (
    <div className="h-[44px] border-b border-[#1e1e1e] px-3 flex items-center justify-between shrink-0 bg-[#0f0f0f]">
      <div className="flex items-center gap-1">
        {/* Toggle chat sidebar */}
        <button
          onClick={() => panelActions.togglePanel('showChat')}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors mr-1"
          title={showChat ? 'Hide chat' : 'Show chat'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        </button>
        {/* Project switcher */}
        <div className="relative mr-1" data-model-menu>
          <button onClick={() => panelActions.togglePanel('showProjectMenu')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors font-medium max-w-[140px]">
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
                <button onClick={() => panelActions.setPanel('showTemplates', true)} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[#888] hover:text-white hover:bg-[#222] transition-colors">
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
            <button className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white rounded-md hover:bg-[#1a1a1a] transition-colors" onClick={refreshPreview} title="Refresh"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
            <button className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white rounded-md hover:bg-[#1a1a1a] transition-colors" onClick={openPreviewNewTab} title="Open in new tab"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>
            <button className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white rounded-md hover:bg-[#1a1a1a] transition-colors" onClick={copyPreviewHtml} title="Copy HTML"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
            <button className="w-6 h-6 flex items-center justify-center text-[#555] hover:text-white rounded-md hover:bg-[#1a1a1a] transition-colors" onClick={capturePreviewScreenshot} title="Screenshot"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>
            <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'desktop' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => { setDeviceMode('desktop'); setIsLandscape(false); }}><DesktopIcon /></button>
            <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'tablet' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setDeviceMode('tablet')} title="Tablet (810×1080)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg></button>
            <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${deviceMode === 'mobile' ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setDeviceMode('mobile')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></button>
            {deviceMode !== 'desktop' && (
              <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${isLandscape ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} onClick={() => setIsLandscape(p => !p)} title={isLandscape ? 'Portrait' : 'Landscape'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 21H2V9h21v12h-5.5M7.5 21l3-3m-3 3l3 3"/></svg>
              </button>
            )}
            <button className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${isEditMode ? 'text-blue-400 bg-blue-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} onClick={() => setIsEditMode(p => !p)} title={isEditMode ? 'Save & Exit Edit Mode' : 'Visual Editor'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button
              className={`flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-medium transition-colors ${show21stBrowser ? 'text-white bg-indigo-500/20 border border-indigo-500/40' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`}
              onClick={() => { panelActions.togglePanel('show21stBrowser'); setTimeout(() => browser21stInputRef.current?.focus(), 50); }}
              title="21st.dev Component Library"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              21st
            </button>
            {/* Zoom control */}
            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-[#222]">
              <button onClick={() => setPreviewZoom(v => Math.max(25, v - 25))} className="w-5 h-5 flex items-center justify-center text-[#555] hover:text-white rounded transition-colors text-[10px] font-bold">−</button>
              <button onClick={() => setPreviewZoom(100)} className="text-[9px] text-[#666] hover:text-white min-w-[32px] text-center transition-colors">{previewZoom}%</button>
              <button onClick={() => setPreviewZoom(v => Math.min(200, v + 25))} className="w-5 h-5 flex items-center justify-center text-[#555] hover:text-white rounded transition-colors text-[10px] font-bold">+</button>
              <button onClick={() => panelActions.togglePanel('showBreakpointRuler')} className={`w-5 h-5 flex items-center justify-center rounded transition-colors text-[10px] ${showBreakpointRuler ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white'}`} title="Breakpoint Ruler">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 17V9"/><path d="M11 17V5"/><path d="M15 17v-4"/><path d="M19 17V9"/></svg>
              </button>
              {/* Inspect dropdown */}
              <div className="relative">
                <button onClick={() => { panelActions.togglePanel('showInspectMenu'); panelActions.setPanel('showAnalyzeMenu', false); panelActions.setPanel('showDebugMenu', false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded transition-colors text-[9px] font-medium ${showInspectMenu || showA11yPanel || showSeoPanel || showPerfPanel || showHtmlValidatorPanel || showSecurityPanel || showContrastPanel || showSemanticPanel || showWhitespacePanel || showPwaPanel ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Quality & Audit tools">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Inspect
                </button>
                {showInspectMenu && (<>
                  <div className="fixed inset-0 z-40" onClick={() => panelActions.setPanel('showInspectMenu', false)} />
                  <div className="absolute left-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[180px] shadow-2xl shadow-black/60">
                    <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Quality & Audit</div>
                    <button onClick={() => { runA11yAudit(); panelActions.setPanel('showInspectMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showA11yPanel ? 'text-emerald-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="4" r="2"/><path d="M12 6v6"/><path d="M8 22l4-10 4 10"/><path d="M6 14h12"/></svg>
                      Accessibility {showA11yPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                    <button onClick={() => { const html = projectFiles['index.html']?.content || ''; const tMatch = html.match(/<title>([^<]*)<\/title>/i); const dMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i); const oMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i); setSeoTitle(tMatch?.[1] || ''); setSeoDescription(dMatch?.[1] || ''); setSeoOgImage(oMatch?.[1] || ''); panelActions.setPanel('showSeoPanel', true); panelActions.setPanel('showInspectMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showSeoPanel ? 'text-blue-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                      SEO Editor {showSeoPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    </button>
                    <button onClick={() => { runPerfAudit(); panelActions.setPanel('showInspectMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showPerfPanel ? 'text-amber-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      Performance {showPerfPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </button>
                    <button onClick={() => { panelActions.setPanel('showHtmlValidatorPanel', true); panelActions.setPanel('showInspectMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showHtmlValidatorPanel ? 'text-red-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                      HTML Validator {showHtmlValidatorPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400" />}
                    </button>
                    <button onClick={() => { panelActions.togglePanel('showSecurityPanel'); panelActions.setPanel('showInspectMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showSecurityPanel ? 'text-red-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Security {showSecurityPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400" />}
                    </button>
                    <button onClick={() => { panelActions.togglePanel('showContrastPanel'); panelActions.setPanel('showInspectMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showContrastPanel ? 'text-violet-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>
                      Contrast {showContrastPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                    </button>
                    <button onClick={() => { panelActions.togglePanel('showSemanticPanel'); panelActions.setPanel('showInspectMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showSemanticPanel ? 'text-amber-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
                      Semantic HTML {showSemanticPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </button>
                    <button onClick={() => { panelActions.togglePanel('showWhitespacePanel'); panelActions.setPanel('showInspectMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showWhitespacePanel ? 'text-gray-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H3"/><path d="M21 6H3"/><path d="M21 14H3"/><path d="M21 18H3"/></svg>
                      Whitespace {showWhitespacePanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-400" />}
                    </button>
                    <button onClick={() => { panelActions.togglePanel('showPwaPanel'); panelActions.setPanel('showInspectMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showPwaPanel ? 'text-blue-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                      PWA Check {showPwaPanel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    </button>
                  </div>
                </>)}
              </div>

              {/* Analyze dropdown */}
              <div className="relative">
                <button onClick={() => { panelActions.togglePanel('showAnalyzeMenu'); panelActions.setPanel('showInspectMenu', false); panelActions.setPanel('showDebugMenu', false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded transition-colors text-[9px] font-medium ${showAnalyzeMenu || showStatsPanel || showDepsPanel || showColorPalettePanel || showDepGraph || showPerfBudget || showBundlePanel || showUnusedCssPanel || showElementCountPanel || showTextStatsPanel || showTodoScanPanel ? 'text-cyan-400 bg-cyan-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Analysis & Stats tools">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                  Analyze
                </button>
                {showAnalyzeMenu && (<>
                  <div className="fixed inset-0 z-40" onClick={() => panelActions.setPanel('showAnalyzeMenu', false)} />
                  <div className="absolute left-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[180px] shadow-2xl shadow-black/60">
                    <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Analysis & Stats</div>
                    {[
                      { panel: 'showStatsPanel', label: 'Project Stats', active: showStatsPanel, color: 'cyan', icon: 'M18 20V10M12 20V4M6 20v-6' },
                      { panel: 'showDepsPanel', label: 'Dependencies', active: showDepsPanel, color: 'violet', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
                      { panel: 'showColorPalettePanel', label: 'Color Palette', active: showColorPalettePanel, color: 'pink', icon: '' },
                      { panel: 'showDepGraph', label: 'Dep Graph', active: showDepGraph, color: 'cyan', icon: '' },
                      { panel: 'showPerfBudget', label: 'Perf Budget', active: showPerfBudget, color: 'lime', icon: '' },
                      { panel: 'showBundlePanel', label: 'Bundle Size', active: showBundlePanel, color: 'green', icon: '' },
                      { panel: 'showUnusedCssPanel', label: 'Unused CSS', active: showUnusedCssPanel, color: 'amber', icon: '' },
                      { panel: 'showElementCountPanel', label: 'Element Count', active: showElementCountPanel, color: 'teal', icon: '' },
                      { panel: 'showTextStatsPanel', label: 'Text Stats', active: showTextStatsPanel, color: 'indigo', icon: '' },
                      { panel: 'showTodoScanPanel', label: 'TODO Scanner', active: showTodoScanPanel, color: 'lime', icon: '' },
                    ].map(item => (
                      <button key={item.panel} onClick={() => { panelActions.togglePanel(item.panel); panelActions.setPanel('showAnalyzeMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${item.active ? `text-${item.color}-400` : 'text-[#999]'}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.icon || 'M18 20V10M12 20V4M6 20v-6'}/></svg>
                        {item.label} {item.active && <span className={`ml-auto w-1.5 h-1.5 rounded-full bg-${item.color}-400`} />}
                      </button>
                    ))}
                  </div>
                </>)}
              </div>

              {/* Debug dropdown */}
              <div className="relative">
                <button onClick={() => { panelActions.togglePanel('showDebugMenu'); panelActions.setPanel('showInspectMenu', false); panelActions.setPanel('showAnalyzeMenu', false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded transition-colors text-[9px] font-medium ${showDebugMenu || layoutDebugActive || gridFlexDebugActive || breakpointTestActive || showResponsiveGrid || showDomTreePanel || showLinkCheckerPanel || showAnimPanel || showOgPreview || showConsoleFilter || showColorEdit || showRegexPanel || showSplitPreview || showOutlinePanel || showNetworkPanel ? 'text-sky-400 bg-sky-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Debug & Visual tools">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                  Debug
                </button>
                {showDebugMenu && (<>
                  <div className="fixed inset-0 z-40" onClick={() => panelActions.setPanel('showDebugMenu', false)} />
                  <div className="absolute left-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[180px] shadow-2xl shadow-black/60 max-h-[320px] overflow-y-auto">
                    <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Debug & Visual</div>
                    <button onClick={() => { setLayoutDebugActive(p => !p); panelActions.setPanel('showDebugMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${layoutDebugActive ? 'text-sky-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                      Layout Debug {layoutDebugActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />}
                    </button>
                    <button onClick={() => { setGridFlexDebugActive(p => !p); panelActions.setPanel('showDebugMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${gridFlexDebugActive ? 'text-pink-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                      Grid/Flex Visual {gridFlexDebugActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-400" />}
                    </button>
                    <button onClick={() => { setBreakpointTestActive(p => !p); panelActions.setPanel('showDebugMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${breakpointTestActive ? 'text-orange-400' : 'text-[#999]'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                      Breakpoint Test {breakpointTestActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
                    </button>
                    {[
                      { panel: 'showResponsiveGrid', label: 'Responsive Grid', active: showResponsiveGrid, color: 'violet' },
                      { panel: 'showDomTreePanel', label: 'DOM Tree', active: showDomTreePanel, color: 'emerald' },
                      { panel: 'showLinkCheckerPanel', label: 'Link Checker', active: showLinkCheckerPanel, color: 'cyan' },
                      { panel: 'showAnimPanel', label: 'CSS Animations', active: showAnimPanel, color: 'fuchsia' },
                      { panel: 'showOgPreview', label: 'OG Preview', active: showOgPreview, color: 'sky' },
                      { panel: 'showConsoleFilter', label: 'Console Filter', active: showConsoleFilter, color: 'emerald' },
                      { panel: 'showColorEdit', label: 'Color Picker', active: showColorEdit, color: 'pink' },
                      { panel: 'showRegexPanel', label: 'Regex Tester', active: showRegexPanel, color: 'rose' },
                    ].map(item => (
                      <button key={item.panel} onClick={() => { panelActions.togglePanel(item.panel); panelActions.setPanel('showDebugMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${item.active ? `text-${item.color}-400` : 'text-[#999]'}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                        {item.label} {item.active && <span className={`ml-auto w-1.5 h-1.5 rounded-full bg-${item.color}-400`} />}
                      </button>
                    ))}
                    <div className="border-t border-[#2a2a2a] my-1" />
                    <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Panels</div>
                    {[
                      { panel: 'showSplitPreview', label: 'Split Preview', active: showSplitPreview, color: 'lime' },
                      { panel: 'showOutlinePanel', label: 'Code Outline', active: showOutlinePanel, color: 'teal' },
                      { panel: 'showNetworkPanel', label: 'Network / API', active: showNetworkPanel, color: 'rose' },
                    ].map(item => (
                      <button key={item.panel} onClick={() => { panelActions.setPanel(item.panel, true); panelActions.setPanel('showDebugMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${item.active ? `text-${item.color}-400` : 'text-[#999]'}`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                        {item.label} {item.active && <span className={`ml-auto w-1.5 h-1.5 rounded-full bg-${item.color}-400`} />}
                      </button>
                    ))}
                  </div>
                </>)}
              </div>

              {/* Standalone actions */}
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
            <button onClick={() => panelActions.togglePanel('showDiffView')} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${showDiffView ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Diff View">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18"/></svg>
            </button>
            <button onClick={downloadProjectZip} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Download ZIP"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <button onClick={formatCurrentFile} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Format Document"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg></button>
            {/* Editor Tools dropdown */}
            <div className="relative">
              <button onClick={() => { panelActions.togglePanel('showCodeToolsMenu'); panelActions.setPanel('showMoreToolsMenu', false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded-md transition-colors text-[9px] font-medium ${showCodeToolsMenu || splitFile || minimapEnabled || wordWrapEnabled || showColorPicker ? 'text-violet-400 bg-violet-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Editor tools">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Editor
              </button>
              {showCodeToolsMenu && (<>
                <div className="fixed inset-0 z-40" onClick={() => panelActions.setPanel('showCodeToolsMenu', false)} />
                <div className="absolute right-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[190px] shadow-2xl shadow-black/60 max-h-[340px] overflow-y-auto">
                  <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Editor Tools</div>
                  <button onClick={() => { if (splitFile) { setSplitFile(null); } else { const files = Object.keys(projectFiles).filter(f => f !== selectedFile); if (files.length > 0) setSplitFile(files[0]); } panelActions.setPanel('showCodeToolsMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${splitFile ? 'text-white' : 'text-[#999]'}`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                    {splitFile ? 'Close Split' : 'Split Editor'} {splitFile && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                  <button onClick={() => { panelActions.setPanel('showComponentPalette', true); panelActions.setPanel('showCodeToolsMenu', false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17.5h7M17.5 14v7"/></svg>
                    Insert Component
                  </button>
                  <button onClick={() => { panelActions.setPanel('showVersionTimeline', true); panelActions.setPanel('showCodeToolsMenu', false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Version Timeline
                  </button>
                  <button onClick={() => { panelActions.setPanel('showBookmarks', true); panelActions.setPanel('showCodeToolsMenu', false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    Code Bookmarks
                  </button>
                  <button onClick={() => { panelActions.setPanel('showFindReplace', true); setTimeout(() => findInputRef.current?.focus(), 50); panelActions.setPanel('showCodeToolsMenu', false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Find & Replace <span className="ml-auto text-[8px] text-[#444]">⌘⇧H</span>
                  </button>
                  <button onClick={() => { explainCurrentCode(); panelActions.setPanel('showCodeToolsMenu', false); }} disabled={isStreaming || isExplaining} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999] disabled:opacity-30">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    AI Explain Code
                  </button>
                  <div className="border-t border-[#2a2a2a] my-1" />
                  <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Preferences</div>
                  <button onClick={() => { panelActions.setPanel('showThemeSelector', true); panelActions.setPanel('showCodeToolsMenu', false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                    Editor Theme
                  </button>
                  <button onClick={() => { setMinimapEnabled(p => !p); panelActions.setPanel('showCodeToolsMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${minimapEnabled ? 'text-white' : 'text-[#999]'}`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="14" y="3" width="7" height="18" rx="1"/><line x1="3" y1="6" x2="10" y2="6"/><line x1="3" y1="10" x2="10" y2="10"/><line x1="3" y1="14" x2="8" y2="14"/><line x1="3" y1="18" x2="10" y2="18"/></svg>
                    {minimapEnabled ? 'Hide Minimap' : 'Show Minimap'} {minimapEnabled && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                  <button onClick={() => { setWordWrapEnabled(p => !p); panelActions.setPanel('showCodeToolsMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${wordWrapEnabled ? 'text-white' : 'text-[#999]'}`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><polyline points="13 16 11 18 13 20"/><path d="M3 18h4"/></svg>
                    {wordWrapEnabled ? 'Disable Word Wrap' : 'Enable Word Wrap'} {wordWrapEnabled && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                  <button onClick={() => { panelActions.togglePanel('showColorPicker'); panelActions.setPanel('showCodeToolsMenu', false); }} className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors ${showColorPicker ? 'text-white' : 'text-[#999]'}`}>
                    <div className="w-3 h-3 rounded border border-[#444]" style={{ background: pickedColor }} />
                    Color Picker {showColorPicker && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                  <button onClick={() => { shareProjectUrl(); panelActions.setPanel('showCodeToolsMenu', false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    Share Project URL
                  </button>
                </div>
              </>)}
            </div>
            <div className="w-px h-4 bg-[#222]"/>
          </>
        )}
        <button onClick={() => panelActions.setPanel('showEnvPanel', true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Environment Variables">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </button>
        <button onClick={() => { panelActions.setPanel('showCommandPalette', true); setCommandQuery(''); }} className="flex items-center gap-1 px-2 py-1 rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors text-[10px]" title="Command Palette (Ctrl+K)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span className="hidden sm:inline">⌘K</span>
        </button>
        <button onClick={() => panelActions.togglePanel('showIntegrations')} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${showIntegrations ? 'text-white bg-[#1a1a1a]' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Integrations">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
        <button onClick={() => setShowStitchPanel(p => !p)} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${showStitchPanel ? 'text-purple-400 bg-purple-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Google Stitch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </button>
        <button onClick={() => panelActions.setPanel('showGitHubModal', true)} className="w-7 h-7 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"><GitHubIcon /></button>
        <button onClick={() => panelActions.setPanel('showCollabPanel', true)} className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors relative ${collabRoomId ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title={collabRoomId ? `Room ${collabRoomId}` : 'Collaborate'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          {(collabUsers as unknown[]).length > 1 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-bold">{(collabUsers as unknown[]).length}</span>}
        </button>
        <button onClick={() => setAutoFixEnabled(p => !p)} className={`flex items-center gap-1 px-1.5 h-6 rounded-md transition-colors text-[9px] font-medium ${autoFixEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="Auto-fix runtime errors">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          Fix {autoFixEnabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        </button>
        {/* Tools dropdown */}
        <div className="relative">
          <button onClick={() => { panelActions.togglePanel('showMoreToolsMenu'); panelActions.setPanel('showCodeToolsMenu', false); }} className={`flex items-center gap-1 px-1.5 h-6 rounded-md transition-colors text-[9px] font-medium ${showMoreToolsMenu ? 'text-amber-400 bg-amber-500/10' : 'text-[#555] hover:text-white hover:bg-[#1a1a1a]'}`} title="More tools">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Tools
          </button>
          {showMoreToolsMenu && (<>
            <div className="fixed inset-0 z-40" onClick={() => panelActions.setPanel('showMoreToolsMenu', false)} />
            <div className="absolute right-0 top-7 z-50 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] py-1 min-w-[190px] shadow-2xl shadow-black/60">
              <div className="px-3 py-1 text-[8px] font-medium text-[#444] uppercase tracking-wider">Tools</div>
              <button onClick={() => { panelActions.setPanel('showResearchPanel', true); panelActions.setPanel('showMoreToolsMenu', false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                <span>NotebookLM Research</span>
                {researchMode && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
              </button>
              <div className="h-px bg-[#222] my-1" />
              {[
                { panel: 'showFeedbackPanel', label: 'Send Feedback', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
                { panel: 'showVisualBuilder', label: 'Visual Builder', icon: '' },
                { panel: 'showDesignSystem', label: 'Design System', icon: '' },
                { panel: 'showApiTester', label: 'API Tester', icon: '' },
                { panel: 'showScreenshotAnalyzer', label: 'Screenshot to Code', icon: '' },
              ].map(item => (
                <button key={item.panel} onClick={() => { panelActions.setPanel(item.panel, true); panelActions.setPanel('showMoreToolsMenu', false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-[#222] transition-colors text-[#999]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.icon || 'M12 2L2 7l10 5 10-5-10-5z'}/></svg>
                  {item.label}
                </button>
              ))}
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
  );
});

export default TopBar;
