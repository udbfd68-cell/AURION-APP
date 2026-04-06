'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { usePanelStore } from '@/stores/usePanelStore';
import { CodeIcon, FolderIcon, getFileIcon } from '@/lib/page-helpers';
import { detectLanguage } from '@/lib/utils';
import type { VirtualFS } from '@/lib/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const MonacoDiffEditor = dynamic(() => import('@monaco-editor/react').then(m => m.DiffEditor), { ssr: false });

export interface CodeEditorPanelProps {
  projectFiles: VirtualFS;
  selectedFile: string;
  setSelectedFile: (v: string) => void;
  openTabs: string[];
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  openFile: (path: string) => void;
  closeTab: (file: string, e?: React.MouseEvent) => void;
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
  expandedDirs: Set<string>;
  setExpandedDirs: React.Dispatch<React.SetStateAction<Set<string>>>;
  buildFileTree: (files: VirtualFS) => { entries: Array<{ path: string; name: string; isDir: boolean; depth: number }> };
  explorerContextMenu: { x: number; y: number; path: string; isDir: boolean } | null;
  setExplorerContextMenu: (v: { x: number; y: number; path: string; isDir: boolean } | null) => void;
  renameTarget: string | null;
  setRenameTarget: (v: string | null) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  hoveredImage: { path: string; x: number; y: number } | null;
  setHoveredImage: (v: { path: string; x: number; y: number } | null) => void;
  tabContextMenu: { x: number; y: number; file: string } | null;
  setTabContextMenu: (v: { x: number; y: number; file: string } | null) => void;
  isFileModified: (f: string) => boolean;
  editorTheme: string;
  minimapEnabled: boolean;
  wordWrapEnabled: boolean;
  monacoEditorRef: React.MutableRefObject<unknown>;
  setCursorPosition: (v: { line: number; col: number }) => void;
  showDiffView: boolean;
  vfsHistoryIdx: number;
  vfsHistory: VirtualFS[];
  splitFile: string | null;
  setSplitFile: (v: string | null) => void;
  isDragOver: boolean;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  codeBlocks: Array<{ code: string; language: string }>;
  CodeBlock: React.ComponentType<{ code: string; language: string }>;
  newFileName: string;
  setNewFileName: (v: string) => void;
  newFileInputRef: React.RefObject<HTMLInputElement | null>;
  createNewFile: (name: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const CodeEditorPanel = React.memo(function CodeEditorPanel(props: CodeEditorPanelProps) {
  const { showNewFileInput, showDiffView: showDiffPanel } = usePanelStore();
  const panelActions = usePanelStore();
  const {
    projectFiles, selectedFile, setSelectedFile, openTabs, setOpenTabs, openFile, closeTab,
    setProjectFiles, expandedDirs, setExpandedDirs, buildFileTree, explorerContextMenu,
    setExplorerContextMenu, renameTarget, setRenameTarget, renameValue, setRenameValue,
    renameInputRef, hoveredImage, setHoveredImage, tabContextMenu, setTabContextMenu,
    isFileModified, editorTheme, minimapEnabled, wordWrapEnabled, monacoEditorRef,
    setCursorPosition, showDiffView, vfsHistoryIdx, vfsHistory, splitFile, setSplitFile,
    isDragOver, handleDrop, handleDragOver, handleDragLeave, codeBlocks, CodeBlock,
    newFileName, setNewFileName, newFileInputRef, createNewFile, showToast,
  } = props;

  return (
    <div className="h-full flex bg-[#0c0c0c]" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-purple-500/10 border-2 border-dashed border-purple-500/40 rounded-lg flex items-center justify-center">
          <div className="text-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" className="mx-auto mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><p className="text-purple-400 text-sm font-medium">Drop files here</p></div>
        </div>
      )}
      {Object.keys(projectFiles).length > 0 ? (
        <>
          <div className="file-tree-sidebar w-[200px] shrink-0 border-r border-[#1e1e1e] bg-[#0f0f0f] flex flex-col overflow-hidden">
            <div className="px-3 py-2 text-[10px] font-medium text-[#555] uppercase tracking-wider border-b border-[#1e1e1e] flex items-center justify-between">
              <span>Explorer</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-[#444] normal-case tracking-normal">{Object.keys(projectFiles).length}</span>
                <button onClick={() => { panelActions.setPanel('showNewFileInput', true); setNewFileName(''); setTimeout(() => newFileInputRef.current?.focus(), 50); }} className="w-4 h-4 flex items-center justify-center rounded text-[#555] hover:text-white hover:bg-[#222] transition-colors" title="New File"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
                <button onClick={() => { const name = prompt('Folder name:'); if (name?.trim()) { const dirPath = name.trim(); setProjectFiles(prev => ({ ...prev, [`${dirPath}/.gitkeep`]: { content: '', language: 'text' } })); setExpandedDirs(prev => { const n = new Set(prev); n.add(dirPath); return n; }); showToast(`Created folder: ${dirPath}`, 'success'); } }} className="w-4 h-4 flex items-center justify-center rounded text-[#555] hover:text-white hover:bg-[#222] transition-colors" title="New Folder"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg></button>
              </div>
            </div>
            {showNewFileInput && (
              <div className="px-2 py-1.5 border-b border-[#1e1e1e]">
                <input ref={newFileInputRef} value={newFileName} onChange={(e) => setNewFileName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createNewFile(newFileName); if (e.key === 'Escape') panelActions.setPanel('showNewFileInput', false); }} onBlur={() => { if (!newFileName.trim()) panelActions.setPanel('showNewFileInput', false); }} placeholder="filename.ext" className="w-full bg-[#111] border border-[#333] focus:border-[#555] rounded px-2 py-1 text-[11px] text-white placeholder-[#555] outline-none" autoFocus />
              </div>
            )}
            <div className="flex-1 overflow-y-auto py-1">
              {(() => {
                const { entries } = buildFileTree(projectFiles);
                return entries.map((entry) => {
                  if (entry.isDir) {
                    const isOpen = expandedDirs.has(entry.path);
                    return (
                      <button key={entry.path} onClick={() => setExpandedDirs(prev => { const next = new Set(prev); if (next.has(entry.path)) next.delete(entry.path); else next.add(entry.path); return next; })}
                        onContextMenu={(e) => { e.preventDefault(); setExplorerContextMenu({ x: e.clientX, y: e.clientY, path: entry.path, isDir: true }); }}
                        className="w-full flex items-center gap-1.5 px-2 py-[3px] text-[11px] text-[#888] hover:text-white hover:bg-[#161616] transition-colors" style={{ paddingLeft: 8 + entry.depth * 12 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"/></svg>
                        <FolderIcon open={isOpen} size={12} />
                        <span className="truncate">{entry.name}</span>
                      </button>
                    );
                  }
                  const parentDir = entry.path.includes('/') ? entry.path.split('/').slice(0, -1).join('/') : null;
                  if (parentDir) {
                    const parts = entry.path.split('/');
                    for (let i = 1; i < parts.length; i++) {
                      const dir = parts.slice(0, i).join('/');
                      if (!expandedDirs.has(dir)) return null;
                    }
                  }
                  const isImage = /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp)$/i.test(entry.name);
                  return (
                    <div key={entry.path} className="relative">
                      {renameTarget === entry.path ? (
                        <div className="flex items-center gap-1 px-2 py-[3px]" style={{ paddingLeft: 8 + entry.depth * 12 + (parentDir ? 10 : 0) }}>
                          <input ref={renameInputRef} value={renameValue} onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && renameValue.trim() && renameValue.trim() !== entry.name) {
                                const dir = entry.path.includes('/') ? entry.path.split('/').slice(0, -1).join('/') + '/' : '';
                                const newPath = dir + renameValue.trim();
                                setProjectFiles(prev => { const next = { ...prev }; next[newPath] = { ...next[entry.path], language: detectLanguage(newPath) }; delete next[entry.path]; return next; });
                                if (selectedFile === entry.path) setSelectedFile(newPath);
                                setOpenTabs(prev => prev.map(t => t === entry.path ? newPath : t));
                                showToast(`Renamed to ${renameValue.trim()}`, 'success');
                                setRenameTarget(null); setRenameValue('');
                              }
                              if (e.key === 'Escape') { setRenameTarget(null); setRenameValue(''); }
                            }}
                            onBlur={() => { setRenameTarget(null); setRenameValue(''); }}
                            className="flex-1 bg-[#111] border border-[#555] rounded px-1.5 py-0.5 text-[11px] text-white outline-none" autoFocus />
                        </div>
                      ) : (
                        <button onClick={() => openFile(entry.path)}
                          onContextMenu={(e) => { e.preventDefault(); setExplorerContextMenu({ x: e.clientX, y: e.clientY, path: entry.path, isDir: false }); }}
                          onMouseEnter={(e) => { if (isImage) setHoveredImage({ path: entry.path, x: e.clientX, y: e.clientY }); }}
                          onMouseLeave={() => { if (isImage) setHoveredImage(null); }}
                          className={`w-full flex items-center gap-1.5 px-2 py-[3px] text-[11px] transition-colors ${selectedFile === entry.path ? 'text-white bg-[#1a1a1a]' : 'text-[#888] hover:text-white hover:bg-[#161616]'}`} style={{ paddingLeft: 8 + entry.depth * 12 + (parentDir ? 10 : 0) }}>
                          {getFileIcon(entry.name, 12)}
                          <span className="truncate flex-1">{entry.name}</span>
                          <span className="text-[9px] text-[#444] shrink-0">{projectFiles[entry.path] ? (projectFiles[entry.path].content.length < 1024 ? projectFiles[entry.path].content.length + 'B' : (projectFiles[entry.path].content.length / 1024).toFixed(1) + 'K') : ''}</span>
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="h-[32px] flex items-center border-b border-[#1e1e1e] bg-[#111] overflow-x-auto shrink-0">
              {openTabs.filter(f => projectFiles[f]).map(f => (
                <div key={f} onClick={() => setSelectedFile(f)} onContextMenu={(e) => { e.preventDefault(); setTabContextMenu({ x: e.clientX, y: e.clientY, file: f }); }} className={`h-full px-3 flex items-center gap-1.5 text-[11px] border-r border-[#1e1e1e] shrink-0 transition-colors cursor-pointer group ${f === selectedFile ? 'bg-[#0c0c0c] text-white' : 'text-[#555] hover:text-[#888]'}`}>
                  {isFileModified(f) && <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Modified" />}
                  {getFileIcon(f.split('/').pop() || f, 11)}
                  <span>{f.split('/').pop()}</span>
                  {openTabs.length > 1 && <button onClick={(e) => closeTab(f, e)} className="ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-[#333] opacity-0 group-hover:opacity-100 transition-opacity text-[#666] hover:text-white"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>}
                </div>
              ))}
            </div>
            {selectedFile.includes('/') && (
              <div className="h-[22px] flex items-center px-3 bg-[#0e0e0e] border-b border-[#1a1a1a] text-[10px] text-[#555] gap-1 shrink-0 overflow-x-auto">
                {selectedFile.split('/').map((part, i, arr) => (<span key={i} className="flex items-center gap-1 shrink-0">{i > 0 && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>}<span className={i === arr.length - 1 ? 'text-[#999]' : 'hover:text-[#999] cursor-pointer'}>{part}</span></span>))}
              </div>
            )}
            <div className="flex-1 overflow-hidden flex">
              <div className={`${splitFile ? 'w-1/2 border-r border-[#1e1e1e]' : 'flex-1'} overflow-hidden`}>
                {projectFiles[selectedFile] ? (
                  showDiffView && vfsHistoryIdx > 0 ? (
                    <MonacoDiffEditor height="100%" language={projectFiles[selectedFile]?.language || 'plaintext'} original={vfsHistory[vfsHistoryIdx - 1]?.[selectedFile]?.content || ''} modified={projectFiles[selectedFile]?.content || ''} theme={editorTheme} options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 13, automaticLayout: true }} />
                  ) : (
                    <MonacoEditor height="100%" language={projectFiles[selectedFile].language || 'plaintext'} value={projectFiles[selectedFile].content}
                      onChange={(val) => { if (val !== undefined) setProjectFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: val } })); }}
                      onMount={(editor) => { monacoEditorRef.current = editor; editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => setCursorPosition({ line: e.position.lineNumber, col: e.position.column })); }}
                      theme={editorTheme}
                      options={{
                        minimap: { enabled: minimapEnabled, scale: 2, showSlider: 'mouseover' }, fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace", fontLigatures: true,
                        lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: wordWrapEnabled ? 'on' : 'off', tabSize: 2,
                        automaticLayout: true, bracketPairColorization: { enabled: true },
                        'bracketPairColorization.independentColorPoolPerBracketType': true,
                        guides: { bracketPairs: true, indentation: true, highlightActiveIndentation: true },
                        padding: { top: 8, bottom: 8 }, suggestOnTriggerCharacters: true,
                        quickSuggestions: { other: true, comments: false, strings: true },
                        acceptSuggestionOnCommitCharacter: true, parameterHints: { enabled: true },
                        folding: true, foldingStrategy: 'indentation', showFoldingControls: 'mouseover',
                        renderWhitespace: 'selection', smoothScrolling: true, cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on', cursorStyle: 'line', formatOnPaste: true, formatOnType: true,
                        linkedEditing: true, autoClosingBrackets: 'always', autoClosingQuotes: 'always',
                        autoSurround: 'languageDefined', matchBrackets: 'always', renderLineHighlight: 'all',
                        renderLineHighlightOnlyWhenFocus: false, stickyScroll: { enabled: true },
                        colorDecorators: true, inlineSuggest: { enabled: true },
                      }}
                    />
                  )
                ) : (
                  <div className="text-[12px] text-[#555] p-4">Select a file from the explorer</div>
                )}
              </div>
              {splitFile && projectFiles[splitFile] && (
                <div className="w-1/2 flex flex-col overflow-hidden">
                  <div className="h-[28px] flex items-center justify-between px-3 bg-[#111] border-b border-[#1e1e1e] shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#888]">
                      {getFileIcon(splitFile.split('/').pop() || splitFile, 11)}<span>{splitFile.split('/').pop()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <select value={splitFile} onChange={e => setSplitFile(e.target.value)} className="bg-transparent text-[9px] text-[#666] outline-none max-w-[100px]">{Object.keys(projectFiles).filter(f => f !== selectedFile).map(f => <option key={f} value={f}>{f}</option>)}</select>
                      <button onClick={() => setSplitFile(null)} className="w-4 h-4 flex items-center justify-center text-[#555] hover:text-white rounded transition-colors"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <MonacoEditor height="100%" language={projectFiles[splitFile].language || 'plaintext'} value={projectFiles[splitFile].content}
                      onChange={(val) => { if (val !== undefined) setProjectFiles(prev => ({ ...prev, [splitFile]: { ...prev[splitFile], content: val } })); }}
                      theme={editorTheme}
                      options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace", fontLigatures: true, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2, automaticLayout: true, bracketPairColorization: { enabled: true }, padding: { top: 8, bottom: 8 } }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : codeBlocks.length > 0 ? (
        <div className="flex-1 p-4 space-y-4 overflow-auto">{codeBlocks.map((block, idx) => <CodeBlock key={idx} code={block.code} language={block.language} />)}</div>
      ) : (
        <div className="flex-1 flex items-center justify-center"><div className="text-center"><CodeIcon /><p className="text-[12px] text-[#555] mt-3">Code will appear here when you build something</p></div></div>
      )}
    </div>
  );
});

export default CodeEditorPanel;
