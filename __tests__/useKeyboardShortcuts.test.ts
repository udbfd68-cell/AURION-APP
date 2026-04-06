import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Mock dependencies
vi.mock('@/stores/usePanelStore', () => ({
  usePanelStore: () => ({
    setPanel: vi.fn(),
    showCommandPalette: false,
    showFileSearch: false,
    showFindReplace: false,
    showShortcuts: false,
    showGotoLine: false,
    showContentSearch: false,
  }),
}));

describe('useKeyboardShortcuts', () => {
  it('initializes without errors', () => {
    const mockP = {
      view: 'editor',
      setView: vi.fn(),
      input: '',
    };
    
    // Hook returns void — just verify it doesn't throw
    expect(() => {
      renderHook(() => useKeyboardShortcuts(mockP as any));
    }).not.toThrow();
  });

  it('registers keyboard event listeners', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    
    const mockP = {
      view: 'editor',
      setView: vi.fn(),
      input: '',
    };
    
    renderHook(() => useKeyboardShortcuts(mockP as any));
    
    const keydownListeners = addSpy.mock.calls.filter(
      ([event]) => event === 'keydown'
    );
    expect(keydownListeners.length).toBeGreaterThan(0);
    
    addSpy.mockRestore();
  });
});
