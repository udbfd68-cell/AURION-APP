import { useEffect } from 'react';
import { usePanelStore } from '@/stores/usePanelStore';
import { ESCAPE_PANEL_PRIORITY } from '@/lib/constants';

interface UseKeyboardShortcutsDeps {
  panelActions: { togglePanel: (key: string) => void; setPanel: (key: string, value: boolean) => void };
  setCommandQuery: (v: string) => void;
  setFileSearchQuery: (v: string) => void;
  setContentSearchQuery: (v: string) => void;
  refreshPreview: () => void;
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: React.Dispatch<React.SetStateAction<'app' | 'code' | 'database' | 'payments' | 'ide'>>;
  vfsUndo: () => void;
  vfsRedo: () => void;
  setFindQuery: (v: string) => void;
  setReplaceQuery: (v: string) => void;
  findInputRef: React.RefObject<HTMLInputElement | null>;
  setGotoLineValue: (v: string) => void;
  gotoLineRef: React.RefObject<HTMLInputElement | null>;
  tabContextMenu: unknown;
  setTabContextMenu: (v: null) => void;
  explorerContextMenu: unknown;
  setExplorerContextMenu: (v: null) => void;
  renameTarget: unknown;
  setRenameTarget: (v: null) => void;
  setRenameValue: (v: string) => void;
  showStitchPanel: boolean;
  setShowStitchPanel: (v: boolean) => void;
  showOnboarding: boolean;
  finishOnboarding: () => void;
  showCloneModal: boolean;
  setShowCloneModal: (v: boolean) => void;
}

export function useKeyboardShortcuts(deps: UseKeyboardShortcutsDeps) {
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;

      if (isCmd && e.key === 'k') {
        e.preventDefault();
        deps.panelActions.togglePanel('showCommandPalette');
        deps.setCommandQuery('');
        return;
      }
      if (isCmd && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        deps.panelActions.togglePanel('showFileSearch');
        deps.setFileSearchQuery('');
        return;
      }
      if (isCmd && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        deps.panelActions.togglePanel('showContentSearch');
        deps.setContentSearchQuery('');
        return;
      }
      if (isCmd && e.key === 's') {
        e.preventDefault();
        deps.refreshPreview();
        deps.setTerminalLines(prev => [...prev, '$ ✓ Saved & refreshed preview']);
        return;
      }
      if (isCmd && e.key === 'e' && !e.shiftKey) {
        e.preventDefault();
        deps.setIsEditMode(prev => !prev);
        return;
      }
      if (isCmd && e.key === '`') {
        e.preventDefault();
        deps.panelActions.togglePanel('showTerminal');
        return;
      }
      if (isCmd && e.key === 'b' && !e.shiftKey) {
        e.preventDefault();
        deps.panelActions.togglePanel('showChat');
        return;
      }
      if (isCmd && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs: ('app' | 'code' | 'database' | 'payments' | 'ide')[] = ['app', 'code', 'database', 'payments', 'ide'];
        deps.setActiveTab(tabs[parseInt(e.key) - 1] || 'app');
        return;
      }
      if (isCmd && e.key === 'z' && !(e.target as HTMLElement)?.closest('.monaco-editor')) {
        e.preventDefault();
        if (e.shiftKey) deps.vfsRedo();
        else deps.vfsUndo();
        return;
      }
      if (isCmd && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        deps.panelActions.togglePanel('showFindReplace');
        deps.setFindQuery('');
        deps.setReplaceQuery('');
        setTimeout(() => deps.findInputRef.current?.focus(), 50);
        return;
      }
      if (isCmd && e.key === '/') {
        e.preventDefault();
        deps.panelActions.togglePanel('showShortcuts');
        return;
      }
      if (isCmd && e.key === 'g') {
        e.preventDefault();
        deps.panelActions.togglePanel('showGotoLine');
        deps.setGotoLineValue('');
        setTimeout(() => deps.gotoLineRef.current?.focus(), 50);
        return;
      }

      if (e.key !== 'Escape') return;
      if (deps.tabContextMenu) { deps.setTabContextMenu(null); return; }
      if (deps.explorerContextMenu) { deps.setExplorerContextMenu(null); return; }
      if (deps.renameTarget) { deps.setRenameTarget(null); deps.setRenameValue(''); return; }
      if (deps.showStitchPanel) { deps.setShowStitchPanel(false); return; }
      if (deps.showOnboarding) { deps.finishOnboarding(); return; }
      if (deps.showCloneModal) { deps.setShowCloneModal(false); return; }
      const store = usePanelStore.getState();
      for (const panel of ESCAPE_PANEL_PRIORITY) {
        if ((store as unknown as Record<string, unknown>)[panel]) {
          deps.panelActions.setPanel(panel as keyof typeof store, false);
          return;
        }
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [deps.tabContextMenu, deps.explorerContextMenu, deps.renameTarget, deps.showStitchPanel, deps.showOnboarding, deps.showCloneModal, deps.finishOnboarding, deps.vfsUndo, deps.vfsRedo]);
}
