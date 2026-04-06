import { describe, it, expect, beforeEach } from 'vitest';
import { usePanelStore } from '../stores/usePanelStore';

describe('usePanelStore', () => {
  beforeEach(() => {
    // Reset to defaults before each test
    usePanelStore.getState().closeAll();
  });

  it('has correct default values', () => {
    const state = usePanelStore.getState();
    expect(state.showChat).toBe(true);
    expect(state.showTerminal).toBe(true);
    expect(state.showA11yPanel).toBe(false);
    expect(state.showCommandPalette).toBe(false);
  });

  it('togglePanel flips a boolean', () => {
    const { togglePanel } = usePanelStore.getState();

    expect(usePanelStore.getState().showChat).toBe(true);
    togglePanel('showChat');
    expect(usePanelStore.getState().showChat).toBe(false);
    togglePanel('showChat');
    expect(usePanelStore.getState().showChat).toBe(true);
  });

  it('setPanel sets a specific value', () => {
    const { setPanel } = usePanelStore.getState();

    setPanel('showA11yPanel', true);
    expect(usePanelStore.getState().showA11yPanel).toBe(true);

    setPanel('showA11yPanel', false);
    expect(usePanelStore.getState().showA11yPanel).toBe(false);
  });

  it('closeAll resets everything to defaults', () => {
    const { setPanel, closeAll } = usePanelStore.getState();

    setPanel('showA11yPanel', true);
    setPanel('showChat', false);
    setPanel('showCommandPalette', true);

    closeAll();

    const state = usePanelStore.getState();
    expect(state.showA11yPanel).toBe(false);
    expect(state.showChat).toBe(true);
    expect(state.showCommandPalette).toBe(false);
  });

  it('multiple panels can be open simultaneously', () => {
    const { setPanel } = usePanelStore.getState();

    setPanel('showA11yPanel', true);
    setPanel('showPerfPanel', true);
    setPanel('showSecurityPanel', true);

    const state = usePanelStore.getState();
    expect(state.showA11yPanel).toBe(true);
    expect(state.showPerfPanel).toBe(true);
    expect(state.showSecurityPanel).toBe(true);
  });
});
