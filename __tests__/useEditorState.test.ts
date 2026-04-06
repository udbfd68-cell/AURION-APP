import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorState } from '@/hooks/useEditorState';

describe('useEditorState', () => {
  it('returns all state and setter pairs', () => {
    const { result } = renderHook(() => useEditorState());
    expect(result.current.findQuery).toBe('');
    expect(result.current.replaceQuery).toBe('');
    expect(result.current.editorTheme).toBe('vs-dark');
    expect(result.current.minimapEnabled).toBe(true);
    expect(result.current.wordWrapEnabled).toBe(true);
    expect(result.current.newFileName).toBe('');
    expect(result.current.isExplaining).toBe(false);
    expect(result.current.conversations).toEqual([]);
    expect(result.current.bookmarks).toEqual([]);
    expect(result.current.splitFile).toBeNull();
    expect(result.current.gotoLineValue).toBe('');
    expect(result.current.explorerContextMenu).toBeNull();
    expect(result.current.renameTarget).toBeNull();
    expect(result.current.tabContextMenu).toBeNull();
    expect(result.current.hoveredImage).toBeNull();
    expect(result.current.savedFileContents).toEqual({});
    expect(result.current.pickedColor).toBe('#3b82f6');
    expect(result.current.cursorPosition).toEqual({ line: 1, col: 1 });
    expect(result.current.seoTitle).toBe('');
    expect(result.current.a11yIssues).toEqual([]);
  });

  it('updates state via setters', () => {
    const { result } = renderHook(() => useEditorState());
    act(() => { result.current.setFindQuery('test'); });
    expect(result.current.findQuery).toBe('test');

    act(() => { result.current.setEditorTheme('monokai'); });
    expect(result.current.editorTheme).toBe('monokai');

    act(() => { result.current.setMinimapEnabled(false); });
    expect(result.current.minimapEnabled).toBe(false);

    act(() => { result.current.setCursorPosition({ line: 5, col: 10 }); });
    expect(result.current.cursorPosition).toEqual({ line: 5, col: 10 });
  });

  it('returns refs that are not null', () => {
    const { result } = renderHook(() => useEditorState());
    expect(result.current.findInputRef).toBeDefined();
    expect(result.current.newFileInputRef).toBeDefined();
    expect(result.current.gotoLineRef).toBeDefined();
    expect(result.current.renameInputRef).toBeDefined();
  });

  it('findRegex and findCaseSensitive toggle correctly', () => {
    const { result } = renderHook(() => useEditorState());
    expect(result.current.findRegex).toBe(false);
    expect(result.current.findCaseSensitive).toBe(false);
    
    act(() => { result.current.setFindRegex(true); });
    expect(result.current.findRegex).toBe(true);
    
    act(() => { result.current.setFindCaseSensitive(true); });
    expect(result.current.findCaseSensitive).toBe(true);
  });
});
