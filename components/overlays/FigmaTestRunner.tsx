'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

export default function FigmaTestRunner({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showFigmaPanel, showTestRunner } = panelStore;

  const setShowFigmaPanel = (v: boolean) => setPanel('showFigmaPanel', v);
  const setShowTestRunner = (v: boolean) => setPanel('showTestRunner', v);

  const {
    figmaData,
    figmaFrames,
    figmaGenCode,
    figmaImport,
    figmaListFrames,
    figmaLoading,
    figmaToken,
    figmaUrl,
    generateAndRunTests,
    openFile,
    projectFiles,
    runTestsInContainer,
    selectedFile,
    setFigmaToken,
    setFigmaUrl,
    testFile,
    testRawOutput,
    testResults,
    testRunning,
    webContainer,
  } = p;

  return (
    <>
      {/* --- Figma Import Panel --- */}
      {showFigmaPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setShowFigmaPanel(false); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[700px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                <span className="text-[14px] font-bold text-white">Import from Figma</span>
              </div>
              <button aria-label="Close" onClick={() => setShowFigmaPanel(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-3">
                <div><label className="block text-[11px] text-[#888] mb-1">Figma URL</label><input value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)} placeholder="https://www.figma.com/design/..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-purple-500/50" /></div>
                <div><label className="block text-[11px] text-[#888] mb-1">Access Token <span className="text-[#555]">(from figma.com/developers)</span></label><input type="password" value={figmaToken} onChange={e => setFigmaToken(e.target.value)} placeholder="figd_..." className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-purple-500/50" /></div>
                <div className="flex gap-2">
                  <button onClick={() => figmaImport()} disabled={figmaLoading || !figmaUrl.trim()} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-bold rounded-lg transition-colors disabled:opacity-30 flex items-center justify-center gap-2">{figmaLoading ? 'Loading...' : 'Import Frame'}</button>
                  <button onClick={() => figmaListFrames()} disabled={figmaLoading || !figmaUrl.trim()} className="px-4 py-2.5 bg-[#222] hover:bg-[#2a2a2a] text-white text-[12px] rounded-lg transition-colors disabled:opacity-30">List All Frames</button>
                </div>
              </div>

              {figmaFrames && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#888]">Pages & Frames</div>
                  {figmaFrames.pages.map((page: any, pi: any) => (
                    <div key={pi} className="space-y-1">
                      <div className="text-[10px] text-purple-400 font-medium">{page.name}</div>
                      {page.frames.map((frame: any) => (
                        <button key={frame.id} onClick={() => figmaImport(frame.id)} className="w-full flex items-center justify-between p-2.5 bg-[#1a1a1a] rounded-lg border border-[#222] hover:border-purple-500/30 transition-colors text-left">
                          <div>
                            <div className="text-[11px] text-white">{frame.name}</div>
                            <div className="text-[9px] text-[#555]">{frame.width}x{frame.height} Â· {frame.childCount} children</div>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {figmaData && (
                <div className="space-y-3 pt-2 border-t border-[#222]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12px] text-white font-medium">{figmaData.frameName}</div>
                      <div className="text-[9px] text-[#555]">{figmaData.fileName} {figmaData.frameSize ? `Â· ${figmaData.frameSize.width}x${figmaData.frameSize.height}` : ''}</div>
                    </div>
                    <button onClick={figmaGenCode} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all">Generate Code</button>
                  </div>
                  {figmaData.screenshotUrl && <img src={figmaData.screenshotUrl} alt="Frame" className="w-full rounded-lg border border-[#222] max-h-[200px] object-contain bg-[#0a0a0a]" />}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-[#888] mb-1.5">Colors</div>
                      <div className="flex flex-wrap gap-1">{figmaData.colors.map((c: any, i: any) => (<div key={i} className="w-5 h-5 rounded border border-[#333]" style={{ background: c }} title={c} />))}</div>
                    </div>
                    <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-[#888] mb-1.5">Fonts</div>
                      <div className="text-[10px] text-white">{figmaData.fonts.join(', ') || 'None detected'}</div>
                    </div>
                  </div>
                  {figmaData.components && figmaData.components.length > 0 && (
                    <div className="p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-[#888] mb-1.5">Components ({figmaData.components.length})</div>
                      <div className="flex flex-wrap gap-1">{figmaData.components.slice(0, 12).map((c: any, i: any) => (
                        <span key={i} className="px-2 py-0.5 text-[9px] rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">{c.name} x{c.count}</span>
                      ))}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}


      {/* --- Test Runner Panel --- */}
      {showTestRunner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[750px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">Test Runner</span>
                <span className="text-[10px] text-[#555]">Vitest â€¢ {webContainer.state.status === 'ready' ? 'WebContainer Ready' : 'WebContainer Idle'}</span>
              </div>
              <button aria-label="Close" onClick={() => setShowTestRunner(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => generateAndRunTests()} disabled={testRunning || !selectedFile} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-30 flex items-center gap-1.5">
                  {testRunning ? <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                  Generate & Run Tests
                </button>
                <button onClick={() => runTestsInContainer()} disabled={testRunning} className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-[11px] font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-30">
                  Run All Tests
                </button>
                {testFile && (
                  <button onClick={() => { openFile(testFile); setShowTestRunner(false); }} className="px-3 py-1.5 rounded-lg bg-[#222] text-[#888] text-[11px] hover:bg-[#2a2a2a] transition-colors">
                    Open {testFile}
                  </button>
                )}
              </div>
              {/* Results */}
              {testResults.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[#888] font-medium">Results ({testResults.filter((r: any) => r.status === 'pass').length}/{testResults.length} passed)</div>
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#222] divide-y divide-[#1a1a1a]">
                    {testResults.map((t: any, i: any) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 text-[11px]">
                        {t.status === 'pass' ? <span className="text-emerald-400">âœ“</span> : t.status === 'fail' ? <span className="text-red-400">âœ—</span> : <span className="text-yellow-400">â—‹</span>}
                        <span className={t.status === 'pass' ? 'text-emerald-400/80' : t.status === 'fail' ? 'text-red-400/80' : 'text-yellow-400/80'}>{t.name}</span>
                        {t.duration && <span className="text-[#555] ml-auto">{t.duration}ms</span>}
                      </div>
                    ))}
                  </div>
                  {/* Summary bar */}
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-emerald-400">{testResults.filter((r: any) => r.status === 'pass').length} passed</span>
                    <span className="text-red-400">{testResults.filter((r: any) => r.status === 'fail').length} failed</span>
                    <span className="text-yellow-400">{testResults.filter((r: any) => r.status === 'skip').length} skipped</span>
                  </div>
                </div>
              )}
              {/* Raw output */}
              {testRawOutput && (
                <details className="text-[10px]">
                  <summary className="text-[#555] cursor-pointer hover:text-[#888]">Raw terminal output</summary>
                  <pre className="mt-2 p-3 bg-[#0a0a0a] rounded-lg border border-[#222] text-[#888] overflow-auto max-h-[200px] whitespace-pre-wrap font-mono text-[10px]">{testRawOutput}</pre>
                </details>
              )}
              {/* Test files in project */}
              {Object.keys(projectFiles).filter(f => f.includes('.test.') || f.includes('.spec.')).length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[#888] font-medium">Test files in project</div>
                  <div className="space-y-1">
                    {Object.keys(projectFiles).filter(f => f.includes('.test.') || f.includes('.spec.')).map(f => (
                      <div key={f} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-[#222] text-[11px]">
                        <span className="text-purple-400">ðŸ§ª</span>
                        <span className="text-[#888] flex-1">{f}</span>
                        <button onClick={() => runTestsInContainer(f)} disabled={testRunning} className="text-[10px] text-blue-400 hover:text-blue-300">Run</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Getting started */}
              {testResults.length === 0 && !testRunning && (
                <div className="text-center py-6 text-[#555] text-[11px]">
                  <div className="text-2xl mb-2">ðŸ§ª</div>
                  <div>Select a source file and click &quot;Generate &amp; Run Tests&quot;</div>
                  <div className="mt-1 text-[10px]">Tests are generated by AI and executed in a real WebContainer runtime</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </>
  );
}
