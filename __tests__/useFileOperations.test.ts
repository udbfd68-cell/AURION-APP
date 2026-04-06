import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileOperations } from '@/hooks/useFileOperations';

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    selectedFile: 'index.html',
    projectFiles: {
      'index.html': { content: '<h1>Hello</h1>\n<p>World</p>', language: 'html' },
      'style.css': { content: 'body { color: red; }', language: 'css' },
    },
    findQuery: '',
    replaceQuery: '',
    findRegex: false,
    findCaseSensitive: false,
    isStreaming: false,
    setProjectFiles: vi.fn(),
    setTerminalLines: vi.fn(),
    setActiveTab: vi.fn(),
    setIsExplaining: vi.fn(),
    setNewFileName: vi.fn(),
    openFile: vi.fn(),
    sendPrompt: vi.fn(),
    panelActions: { setPanel: vi.fn() },
    ...overrides,
  } as any;
}

describe('useFileOperations', () => {
  it('findResults returns empty when findQuery is empty', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useFileOperations(deps));
    expect(result.current.findResults).toEqual([]);
  });

  it('findResults returns matches when findQuery is set', () => {
    const deps = makeDeps({ findQuery: 'Hello' });
    const { result } = renderHook(() => useFileOperations(deps));
    expect(result.current.findResults.length).toBe(1);
    expect(result.current.findResults[0].file).toBe('index.html');
    expect(result.current.findResults[0].line).toBe(1);
  });

  it('findResults with regex mode', () => {
    const deps = makeDeps({ findQuery: 'h[12]', findRegex: true });
    const { result } = renderHook(() => useFileOperations(deps));
    expect(result.current.findResults.length).toBeGreaterThanOrEqual(1);
  });

  it('findResults is case insensitive by default', () => {
    const deps = makeDeps({ findQuery: 'hello' });
    const { result } = renderHook(() => useFileOperations(deps));
    expect(result.current.findResults.length).toBe(1);
  });

  it('findResults is case sensitive when set', () => {
    const deps = makeDeps({ findQuery: 'hello', findCaseSensitive: true });
    const { result } = renderHook(() => useFileOperations(deps));
    expect(result.current.findResults.length).toBe(0);
  });

  it('replaceInFiles calls setProjectFiles', () => {
    const setProjectFiles = vi.fn();
    const deps = makeDeps({ findQuery: 'Hello', replaceQuery: 'Hi', setProjectFiles });
    const { result } = renderHook(() => useFileOperations(deps));
    act(() => { result.current.replaceInFiles(true); });
    expect(setProjectFiles).toHaveBeenCalled();
  });

  it('replaceInFiles does nothing without findQuery', () => {
    const setProjectFiles = vi.fn();
    const deps = makeDeps({ findQuery: '', replaceQuery: 'Hi', setProjectFiles });
    const { result } = renderHook(() => useFileOperations(deps));
    act(() => { result.current.replaceInFiles(true); });
    expect(setProjectFiles).not.toHaveBeenCalled();
  });

  it('explainCurrentCode sends prompt', async () => {
    const sendPrompt = vi.fn();
    const deps = makeDeps({ sendPrompt });
    const { result } = renderHook(() => useFileOperations(deps));
    await act(async () => { await result.current.explainCurrentCode(); });
    expect(sendPrompt).toHaveBeenCalledWith(expect.stringContaining('Explain this code'));
  });

  it('explainCurrentCode does nothing when streaming', async () => {
    const sendPrompt = vi.fn();
    const deps = makeDeps({ sendPrompt, isStreaming: true });
    const { result } = renderHook(() => useFileOperations(deps));
    await act(async () => { await result.current.explainCurrentCode(); });
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('createNewFile creates file and opens it', () => {
    const setProjectFiles = vi.fn();
    const openFile = vi.fn();
    const setActiveTab = vi.fn();
    const setNewFileName = vi.fn();
    const panelActions = { setPanel: vi.fn() };
    const deps = makeDeps({ setProjectFiles, openFile, setActiveTab, setNewFileName, panelActions });
    const { result } = renderHook(() => useFileOperations(deps));
    act(() => { result.current.createNewFile('app.js'); });
    expect(setProjectFiles).toHaveBeenCalled();
    expect(openFile).toHaveBeenCalledWith('app.js');
    expect(setActiveTab).toHaveBeenCalledWith('code');
    expect(panelActions.setPanel).toHaveBeenCalledWith('showNewFileInput', false);
  });

  it('createNewFile does nothing for empty name', () => {
    const setProjectFiles = vi.fn();
    const deps = makeDeps({ setProjectFiles });
    const { result } = renderHook(() => useFileOperations(deps));
    act(() => { result.current.createNewFile('  '); });
    expect(setProjectFiles).not.toHaveBeenCalled();
  });

  it('formatCurrentFile calls setProjectFiles for html', () => {
    const setProjectFiles = vi.fn();
    const deps = makeDeps({
      selectedFile: 'index.html',
      projectFiles: { 'index.html': { content: '<div>\n<p>test</p>\n</div>', language: 'html' } },
      setProjectFiles,
    });
    const { result } = renderHook(() => useFileOperations(deps));
    act(() => { result.current.formatCurrentFile(); });
    expect(setProjectFiles).toHaveBeenCalled();
  });

  it('insertComponent calls setProjectFiles', () => {
    const setProjectFiles = vi.fn();
    const panelActions = { setPanel: vi.fn() };
    const deps = makeDeps({ setProjectFiles, panelActions });
    const { result } = renderHook(() => useFileOperations(deps));
    act(() => { result.current.insertComponent('<button>Click</button>'); });
    expect(setProjectFiles).toHaveBeenCalled();
    expect(panelActions.setPanel).toHaveBeenCalledWith('showComponentPalette', false);
  });
});
