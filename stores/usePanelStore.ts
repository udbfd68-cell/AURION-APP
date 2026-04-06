import { create } from 'zustand';

// All show[X] panel booleans in one store
interface PanelState {
  // All panels — alphabetical
  show21stBrowser: boolean;
  showA11yPanel: boolean;
  showAnalyzeMenu: boolean;
  showAnimBuilder: boolean;
  showAnimPanel: boolean;
  showApiTester: boolean;
  showAriaPanel: boolean;
  showBackendGenerator: boolean;
  showBookmarks: boolean;
  showBreakpointRuler: boolean;
  showBundlePanel: boolean;
  showChangelog: boolean;
  showChangeSummary: boolean;
  showChat: boolean;
  showCloneModal: boolean;
  showCodeReview: boolean;
  showCodeToolsMenu: boolean;
  showCollabPanel: boolean;
  showColorEdit: boolean;
  showColorPalettePanel: boolean;
  showColorPicker: boolean;
  showCommandPalette: boolean;
  showComplexityPanel: boolean;
  showComponentPalette: boolean;
  showConsoleFilter: boolean;
  showConsolePanel: boolean;
  showContentSearch: boolean;
  showContrastPanel: boolean;
  showConversationHistory: boolean;
  showCssVarsPanel: boolean;
  showDebugMenu: boolean;
  showDepGraph: boolean;
  showDepsPanel: boolean;
  showDesignSystem: boolean;
  showDiffStatsPanel: boolean;
  showDiffView: boolean;
  showDomTreePanel: boolean;
  showDuplicatePanel: boolean;
  showElementCountPanel: boolean;
  showEnvPanel: boolean;
  showEventAudit: boolean;
  showFeedbackPanel: boolean;
  showFigmaPanel: boolean;
  showFileSearch: boolean;
  showFindReplace: boolean;
  showFoldMap: boolean;
  showFontPanel: boolean;
  showGitHubModal: boolean;
  showGitPanel: boolean;
  showGotoLine: boolean;
  showHtmlValidatorPanel: boolean;
  showImageOptPanel: boolean;
  showInspectMenu: boolean;
  showIntegrations: boolean;
  showLazyImgPanel: boolean;
  showLinkCheckerPanel: boolean;
  showMediaGallery: boolean;
  showMetaEditorPanel: boolean;
  showModelMenu: boolean;
  showMoreToolsMenu: boolean;
  showNetworkPanel: boolean;
  showNewFileInput: boolean;
  showOgPreview: boolean;
  showOnboarding: boolean;
  showOutlinePanel: boolean;
  showPerfBudget: boolean;
  showPerfPanel: boolean;
  showProjectMenu: boolean;
  showPromptTemplates: boolean;
  showPwaPanel: boolean;
  showRegexPanel: boolean;
  showResearchPanel: boolean;
  showResponsiveGrid: boolean;
  showSchemaPanel: boolean;
  showScreenshotAnalyzer: boolean;
  showSecurityPanel: boolean;
  showSemanticPanel: boolean;
  showSeoPanel: boolean;
  showShortcuts: boolean;
  showShortcutsRef: boolean;
  showSnippetsPanel: boolean;
  showSpecificityPanel: boolean;
  showSplitPreview: boolean;
  showStatsPanel: boolean;
  showStitchPanel: boolean;
  showTailwindPanel: boolean;
  showTemplates: boolean;
  showTerminal: boolean;
  showTestRunner: boolean;
  showTextStatsPanel: boolean;
  showThemeSelector: boolean;
  showTodoScanPanel: boolean;
  showTreemapPanel: boolean;
  showUnusedCssPanel: boolean;
  showVersionTimeline: boolean;
  showVisualBuilder: boolean;
  showWhitespacePanel: boolean;
  showZIndexPanel: boolean;

  // Generic toggle & set
  togglePanel: (panel: string) => void;
  setPanel: (panel: string, value: boolean) => void;
  closeAll: () => void;
}

const defaultPanels: Record<string, boolean> = {
  show21stBrowser: false, showA11yPanel: false, showAnalyzeMenu: false, showAnimBuilder: false,
  showAnimPanel: false, showApiTester: false, showAriaPanel: false, showBackendGenerator: false,
  showBookmarks: false, showBreakpointRuler: false, showBundlePanel: false, showChangelog: false,
  showChangeSummary: false, showChat: true, showCloneModal: false, showCodeReview: false, showCodeToolsMenu: false,
  showCollabPanel: false, showColorEdit: false, showColorPalettePanel: false, showColorPicker: false,
  showCommandPalette: false, showComplexityPanel: false, showComponentPalette: false, showConsoleFilter: false,
  showConsolePanel: false, showContentSearch: false, showContrastPanel: false, showConversationHistory: false,
  showCssVarsPanel: false, showDebugMenu: false, showDepGraph: false, showDepsPanel: false,
  showDesignSystem: false, showDiffStatsPanel: false, showDiffView: false, showDomTreePanel: false,
  showDuplicatePanel: false, showElementCountPanel: false, showEnvPanel: false, showEventAudit: false,
  showFeedbackPanel: false, showFigmaPanel: false, showFileSearch: false, showFindReplace: false,
  showFoldMap: false, showFontPanel: false, showGitHubModal: false, showGitPanel: false,
  showGotoLine: false, showHtmlValidatorPanel: false, showImageOptPanel: false, showInspectMenu: false,
  showIntegrations: false, showLazyImgPanel: false, showLinkCheckerPanel: false, showMediaGallery: false,
  showMetaEditorPanel: false, showModelMenu: false, showMoreToolsMenu: false, showNetworkPanel: false,
  showNewFileInput: false, showOgPreview: false, showOnboarding: false, showOutlinePanel: false,
  showPerfBudget: false, showPerfPanel: false, showProjectMenu: false, showPromptTemplates: false,
  showPwaPanel: false, showRegexPanel: false, showResearchPanel: false, showResponsiveGrid: false,
  showSchemaPanel: false, showScreenshotAnalyzer: false, showSecurityPanel: false, showSemanticPanel: false,
  showSeoPanel: false, showShortcuts: false, showShortcutsRef: false, showSnippetsPanel: false, showSpecificityPanel: false,
  showSplitPreview: false, showStatsPanel: false, showStitchPanel: false, showTailwindPanel: false, showTemplates: false,
  showTerminal: true, showTestRunner: false, showTextStatsPanel: false, showThemeSelector: false,
  showTodoScanPanel: false, showTreemapPanel: false, showUnusedCssPanel: false, showVersionTimeline: false,
  showVisualBuilder: false, showWhitespacePanel: false, showZIndexPanel: false,
};

export const usePanelStore = create<PanelState>((set) => ({
  ...defaultPanels as unknown as Omit<PanelState, 'togglePanel' | 'setPanel' | 'closeAll'>,
  togglePanel: (panel) => set((s: any) => ({ [panel]: !s[panel] })),
  setPanel: (panel, value) => set({ [panel]: value }),
  closeAll: () => set(defaultPanels),
}));
