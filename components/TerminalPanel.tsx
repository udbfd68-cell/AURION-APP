'use client';
import React, { useState } from 'react';

interface TerminalPanelProps {
  showTerminal: boolean;
  webContainer: { state: { status: string }; previewUrl?: string | null; startDevServer: () => void; [key: string]: any };
  setShowTestRunner: (v: boolean) => void;
  runtimeErrors: Array<{ message: string; line?: number }>;
  fixRuntimeError: (err: { message: string; line?: number }) => void;
  isStreaming: boolean;
  terminalLines: string[];
  setTerminalLines: (fn: (prev: string[]) => string[]) => void;
  terminalInput: string;
  setTerminalInput: (v: string) => void;
  runTerminalCommand: (cmd: string) => void;
  terminalHistory: string[];
  historyIdx: number;
  setHistoryIdx: (v: number) => void;
  terminalInputRef: React.RefObject<HTMLInputElement | null>;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
  claudeCodeMode?: boolean;
  setClaudeCodeMode?: (v: boolean) => void;
  runClaudeCodeCommand?: (cmd: string) => void;
  isClaudeCodeStreaming?: boolean;
}

const TerminalPanel = React.memo(function TerminalPanel({
  showTerminal,
  webContainer,
  setShowTestRunner,
  runtimeErrors,
  fixRuntimeError,
  isStreaming,
  terminalLines,
  setTerminalLines,
  terminalInput,
  setTerminalInput,
  runTerminalCommand,
  terminalHistory,
  historyIdx,
  setHistoryIdx,
  terminalInputRef,
  terminalEndRef,
  claudeCodeMode = false,
  setClaudeCodeMode,
  runClaudeCodeCommand,
  isClaudeCodeStreaming = false,
}: TerminalPanelProps) {
  if (!showTerminal) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* WebContainer status bar */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#1a1a1a] text-[10px]">
        <div className={`w-1.5 h-1.5 rounded-full ${webContainer.state.status === 'ready' ? 'bg-emerald-400' : webContainer.state.status === 'booting' ? 'bg-yellow-400 animate-pulse' : webContainer.state.status === 'error' ? 'bg-red-400' : 'bg-[#555]'}`} />
        <span className="text-[#555]">WebContainer: {webContainer.state.status}</span>
        {webContainer.previewUrl && <span className="text-emerald-400/60 ml-auto truncate max-w-[120px]">{webContainer.previewUrl}</span>}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setShowTestRunner(true)} className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] hover:text-purple-400 hover:bg-purple-500/10 transition-colors" title="Test Runner">🧪</button>
          <button onClick={() => { webContainer.startDevServer(); }} className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#888] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="npm run dev">▶</button>
        </div>
      </div>
      {/* Error panel */}
      {runtimeErrors.length > 0 && (
        <div className="border-b border-[#1a1a1a] px-4 py-1.5 max-h-[120px] overflow-y-auto">
          {runtimeErrors.slice(-5).map((rtErr, rtIdx) => (
            <div key={rtIdx} className="flex items-start gap-2 py-1 group">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span className="text-[10px] text-red-400/90 flex-1 font-mono leading-4 break-all">{rtErr.message}{rtErr.line ? <span className="text-[#555]"> :L{rtErr.line}</span> : ''}</span>
              <button
                onClick={() => fixRuntimeError(rtErr)}
                disabled={isStreaming}
                className="shrink-0 text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
              >
                Fix
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto px-4 pb-1 font-mono text-[11px] text-[#888]" onClick={() => terminalInputRef.current?.focus()}>
        {terminalLines.map((ln, lnIdx) => (
          <div key={lnIdx} className={`leading-5 ${ln.startsWith('$') ? 'text-[#ccc]' : ln.startsWith('command not found') ? 'text-red-400' : ln.startsWith('✗') || ln.startsWith('❌') ? 'text-red-400' : ln.startsWith('⚠ ') ? 'text-yellow-400' : ln.startsWith('ℹ ') || ln.startsWith('✅') || ln.startsWith('📦') || ln.startsWith('🚀') || ln.startsWith('📁') || ln.startsWith('⚡') || ln.startsWith('🧪') || ln.startsWith('🖥️') ? 'text-blue-400' : ln.includes('PASS') || ln.includes('✓') ? 'text-emerald-400' : ln.includes('FAIL') || ln.includes('Error') || ln.includes('ERR!') ? 'text-red-400' : ln.includes('WARN') || ln.includes('warn') ? 'text-yellow-400' : ''}`}>{ln}</div>
        ))}
        <div ref={terminalEndRef} />
      </div>
      <div className={`flex items-center gap-1 px-4 pb-2 font-mono text-[11px] ${claudeCodeMode ? 'border-t border-purple-500/20' : ''}`}>
        <span className={claudeCodeMode ? 'text-purple-400' : 'text-emerald-400'}>
          {claudeCodeMode ? '⚡' : '$'}
        </span>
        <input
          ref={terminalInputRef}
          value={terminalInput}
          onChange={(ev) => setTerminalInput(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              if (claudeCodeMode && runClaudeCodeCommand) {
                runClaudeCodeCommand(terminalInput);
              } else {
                runTerminalCommand(terminalInput);
              }
            }
            if (ev.key === 'Tab' && !claudeCodeMode) {
              ev.preventDefault();
              const completions = ['clear','help','ls','cat','touch','rm','mkdir','tree','pwd','whoami','date','echo','npm','git','env','node','grep','find','cp','mv','head','tail','wc','which','uptime','hostname','history','stat','diff','du','sort','uniq'];
              const matches = completions.filter((c) => c.startsWith(terminalInput.trim().toLowerCase()));
              if (matches.length === 1) setTerminalInput(matches[0] + ' ');
              else if (matches.length > 1) setTerminalLines((prev) => [...prev, '$ ' + terminalInput, matches.join('  ')]);
            }
            if (ev.key === 'ArrowUp') { ev.preventDefault(); if (terminalHistory.length > 0) { const ni = historyIdx < 0 ? terminalHistory.length - 1 : Math.max(0, historyIdx - 1); setHistoryIdx(ni); setTerminalInput(terminalHistory[ni]); } }
            if (ev.key === 'ArrowDown') { ev.preventDefault(); if (historyIdx >= 0) { const ni = historyIdx + 1; if (ni >= terminalHistory.length) { setHistoryIdx(-1); setTerminalInput(''); } else { setHistoryIdx(ni); setTerminalInput(terminalHistory[ni]); } } }
          }}
          disabled={isClaudeCodeStreaming}
          className={`flex-1 bg-transparent outline-none placeholder-[#555] ${
            claudeCodeMode ? 'text-purple-200 caret-purple-400' : 'text-[#ccc] caret-emerald-400'
          } disabled:opacity-50`}
          placeholder={claudeCodeMode ? 'Ask anything... (natural language)' : 'Type a command...'}
          spellCheck={false}
        />
        {isClaudeCodeStreaming && (
          <span className="text-purple-400 text-[9px] animate-pulse">thinking...</span>
        )}
      </div>
    </div>
  );
});
export default TerminalPanel;
