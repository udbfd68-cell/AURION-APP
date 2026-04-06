'use client';
import React from 'react';
import { usePanelStore } from '@/stores/usePanelStore';
import TerminalPanel from '@/components/TerminalPanel';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from '@/lib/page-helpers';
import type { RuntimeError } from '@/lib/types';

export interface TerminalSectionProps {
  terminalHeight: number;
  termDragRef: React.MutableRefObject<boolean>;
  runtimeErrors: RuntimeError[];
  setRuntimeErrors: React.Dispatch<React.SetStateAction<RuntimeError[]>>;
  autoFixEnabled: boolean;
  setAutoFixEnabled: (v: boolean | ((p: boolean) => boolean)) => void;
  webContainer: { state: { status: string }; previewUrl?: string | null; startDevServer: () => void; [key: string]: any };
  outputFramework: string;
  setOutputFramework: (v: any) => void;
  setShowTestRunner: (v: boolean) => void;
  fixRuntimeError: (error: { message: string; line?: number }) => void;
  isStreaming: boolean;
  terminalLines: string[];
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
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

const TerminalSection = React.memo(function TerminalSection(props: TerminalSectionProps) {
  const { showTerminal } = usePanelStore();
  const panelActions = usePanelStore();
  const {
    terminalHeight, termDragRef, runtimeErrors, setRuntimeErrors,
    autoFixEnabled, setAutoFixEnabled, webContainer, outputFramework,
    setOutputFramework, setShowTestRunner, fixRuntimeError, isStreaming,
    terminalLines, setTerminalLines, terminalInput, setTerminalInput,
    runTerminalCommand, terminalHistory, historyIdx, setHistoryIdx,
    terminalInputRef, terminalEndRef,
    claudeCodeMode, setClaudeCodeMode, runClaudeCodeCommand, isClaudeCodeStreaming,
  } = props;

  return (
    <>
      {/* Terminal resize handle */}
      <div
        className="h-[4px] w-full cursor-row-resize hover:bg-[#444] active:bg-[#555] transition-colors shrink-0 z-10"
        onMouseDown={() => { termDragRef.current = true; document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; }}
      />

      {/* Terminal */}
      <div style={{ height: showTerminal ? terminalHeight : 32 }} className="border-t border-[#1e1e1e] bg-[#0c0c0c] flex flex-col shrink-0 transition-[height] duration-100">
        <button onClick={() => panelActions.togglePanel('showTerminal')} className="h-[32px] shrink-0 px-4 flex items-center justify-between text-[11px] text-[#555] hover:text-[#888] transition-colors w-full">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            <span>Terminal</span>
            {runtimeErrors.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">{runtimeErrors.length} error{runtimeErrors.length > 1 ? 's' : ''}</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-Fix toggle */}
            <div onClick={(e) => { e.stopPropagation(); setAutoFixEnabled(!autoFixEnabled); }} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors cursor-pointer ${autoFixEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a1a] text-[#555] hover:text-[#888]'}`} title="Auto-fix runtime errors">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Auto-Fix {autoFixEnabled ? 'ON' : 'OFF'}
            </div>
            {runtimeErrors.length > 0 && <div onClick={(e) => { e.stopPropagation(); setRuntimeErrors([]); }} className="text-[9px] text-[#555] hover:text-white cursor-pointer px-1">Clear</div>}
            {showTerminal ? <ChevronDownIcon /> : <ChevronUpIcon />}
            <PlusIcon />
          </div>
        </button>
        {showTerminal && (
          <TerminalPanel
            showTerminal={showTerminal}
            webContainer={webContainer}
            outputFramework={outputFramework}
            setOutputFramework={setOutputFramework}
            setShowTestRunner={setShowTestRunner}
            runtimeErrors={runtimeErrors}
            fixRuntimeError={fixRuntimeError}
            isStreaming={isStreaming}
            terminalLines={terminalLines}
            setTerminalLines={setTerminalLines}
            terminalInput={terminalInput}
            setTerminalInput={setTerminalInput}
            runTerminalCommand={runTerminalCommand}
            terminalHistory={terminalHistory}
            historyIdx={historyIdx}
            setHistoryIdx={setHistoryIdx}
            terminalInputRef={terminalInputRef}
            terminalEndRef={terminalEndRef}
            claudeCodeMode={claudeCodeMode}
            setClaudeCodeMode={setClaudeCodeMode}
            runClaudeCodeCommand={runClaudeCodeCommand}
            isClaudeCodeStreaming={isClaudeCodeStreaming}
          />
        )}
      </div>
    </>
  );
});

export default TerminalSection;
