'use client';
import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';

function DevToolsPanels({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel, showApiTester, showGitPanel } = panelStore;

  const setShowApiTester = (v: boolean) => setPanel('showApiTester', v);
  const setShowGitPanel = (v: boolean) => setPanel('showGitPanel', v);

  const {
    apiAddHeader,
    apiBody,
    apiHeaders,
    apiHistory,
    apiLoading,
    apiMethod,
    apiRemoveHeader,
    apiResponse,
    apiSendRequest,
    apiTab,
    apiUrl,
    gitBranchCommits,
    gitBranches,
    gitCommit,
    gitCommitMsg,
    gitCreateBranch,
    gitCreatePR,
    gitCurrentBranch,
    gitDeleteBranch,
    gitFetchBranches,
    gitFetchCommits,
    gitFetchPRs,
    gitFetchRepos,
    gitMergeBranch,
    gitMergePR,
    gitNewBranch,
    gitPRBase,
    gitPRHead,
    gitPRTitle,
    gitPRs,
    gitRemoteBranches,
    gitRemoteCommits,
    gitRemoteLoading,
    gitRepos,
    gitSelectedRepo,
    gitStash,
    gitStashPop,
    gitStashSave,
    gitSwitchBranch,
    gitTab,
    githubToken,
    projectFiles,
    setApiBody,
    setApiHeaders,
    setApiMethod,
    setApiTab,
    setApiUrl,
    setGitCommitMsg,
    setGitNewBranch,
    setGitPRBase,
    setGitPRHead,
    setGitPRTitle,
    setGitSelectedRepo,
    setGitTab,
    setGithubToken,
  } = p;

  return (
    <>
      {/* --- v24: REST API Tester --- */}
      {showApiTester && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-[850px] max-h-[85vh] bg-[#111] rounded-2xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <span className="text-[14px] font-bold text-white">API Tester</span>
              <button aria-label="Close" onClick={() => setShowApiTester(false)} className="text-[#555] hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>

            {/* Request Bar */}
            <div className="px-4 py-3 border-b border-[#222] flex items-center gap-2">
              <select value={apiMethod} onChange={e => setApiMethod(e.target.value as typeof apiMethod)} className={`px-3 py-2 rounded-lg text-[12px] font-bold border border-[#2a2a2a] focus:outline-none ${apiMethod === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : apiMethod === 'POST' ? 'bg-amber-500/10 text-amber-400' : apiMethod === 'PUT' ? 'bg-blue-500/10 text-blue-400' : apiMethod === 'PATCH' ? 'bg-purple-500/10 text-purple-400' : 'bg-red-500/10 text-red-400'}`}>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://api.example.com/endpoint" className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-white placeholder-[#444] focus:border-amber-500 focus:outline-none" onKeyDown={e => e.key === 'Enter' && apiSendRequest()} />
              <button onClick={apiSendRequest} disabled={apiLoading || !apiUrl.trim()} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold rounded-lg transition-colors disabled:opacity-30 flex items-center gap-2">
                {apiLoading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : null}
                Send
              </button>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Request Panel */}
              <div className="w-1/2 border-r border-[#222] flex flex-col">
                <div className="flex border-b border-[#222]">
                  {(['body', 'headers', 'history'] as const).map(tab => (
                    <button key={tab} onClick={() => setApiTab(tab)} className={`flex-1 py-2 text-[10px] font-medium transition-colors border-b-2 ${apiTab === tab ? 'text-amber-400 border-amber-400' : 'text-[#555] border-transparent hover:text-white'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}{tab === 'headers' ? ` (${apiHeaders.length})` : tab === 'history' ? ` (${apiHistory.length})` : ''}</button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {apiTab === 'body' && (
                    <textarea value={apiBody} onChange={e => setApiBody(e.target.value)} className="w-full h-full bg-[#0a0a0a] border border-[#222] rounded-lg p-3 text-[11px] text-amber-400 font-mono focus:border-amber-500 focus:outline-none resize-none" placeholder='{ "key": "value" }' spellCheck={false} />
                  )}
                  {apiTab === 'headers' && (
                    <div className="space-y-2">
                      {apiHeaders.map((h: any, i: any) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={h.key} onChange={e => setApiHeaders((prev: any) => { const n = [...prev]; n[i] = { ...n[i], key: e.target.value }; return n; })} placeholder="Key" className="flex-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#222] rounded text-[10px] text-white focus:border-amber-500 focus:outline-none" />
                          <input value={h.value} onChange={e => setApiHeaders((prev: any) => { const n = [...prev]; n[i] = { ...n[i], value: e.target.value }; return n; })} placeholder="Value" className="flex-1 px-2 py-1.5 bg-[#1a1a1a] border border-[#222] rounded text-[10px] text-white focus:border-amber-500 focus:outline-none" />
                          <button onClick={() => apiRemoveHeader(i)} className="text-[#555] hover:text-red-400"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                        </div>
                      ))}
                      <button onClick={apiAddHeader} className="w-full py-1.5 border border-dashed border-[#333] rounded text-[10px] text-[#555] hover:text-amber-400 hover:border-amber-500/30 transition-colors">+ Add Header</button>
                    </div>
                  )}
                  {apiTab === 'history' && (
                    <div className="space-y-1">
                      {apiHistory.length === 0 ? <p className="text-[11px] text-[#444] text-center py-8">No requests yet</p> :
                        apiHistory.map((h: any, i: any) => (
                          <button key={i} onClick={() => { setApiMethod(h.method as typeof apiMethod); setApiUrl(h.url); }} className="w-full p-2 bg-[#1a1a1a] rounded-lg border border-[#222] hover:border-[#333] transition-colors text-left flex items-center gap-2">
                            <span className={`text-[9px] font-bold ${h.method === 'GET' ? 'text-emerald-400' : h.method === 'POST' ? 'text-amber-400' : h.method === 'DELETE' ? 'text-red-400' : 'text-blue-400'}`}>{h.method}</span>
                            <span className="text-[10px] text-[#888] truncate flex-1">{h.url}</span>
                            <span className={`text-[9px] ${h.status < 300 ? 'text-emerald-400' : h.status < 400 ? 'text-amber-400' : 'text-red-400'}`}>{h.status}</span>
                            <span className="text-[9px] text-[#555]">{h.time}ms</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Response Panel */}
              <div className="w-1/2 flex flex-col">
                <div className="px-3 py-2 border-b border-[#222] flex items-center gap-3">
                  <span className="text-[10px] text-[#555]">Response</span>
                  {apiResponse && (
                    <>
                      <span className={`text-[10px] font-bold ${apiResponse.status < 300 ? 'text-emerald-400' : apiResponse.status < 400 ? 'text-amber-400' : 'text-red-400'}`}>{apiResponse.status || 'Error'}</span>
                      <span className="text-[10px] text-[#555]">{apiResponse.time}ms</span>
                      <span className="text-[10px] text-[#555]">{(apiResponse.data.length / 1024).toFixed(1)} KB</span>
                    </>
                  )}
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {apiResponse ? (
                    <pre className="text-[10px] text-emerald-400 font-mono whitespace-pre-wrap break-all">{(() => { try { return JSON.stringify(JSON.parse(apiResponse.data), null, 2); } catch { return apiResponse.data; } })()}</pre>
                  ) : (
                    <p className="text-[12px] text-[#333] text-center py-12">Send a request to see the response</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}


      {/* --- v24: Git Branch Manager --- */}
      {showGitPanel && (
        <div className="fixed top-16 right-4 z-40 w-[420px] max-h-[70vh] bg-[#111] rounded-xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
              <span className="text-[13px] font-bold text-white">Git</span>
              <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[9px] rounded-full border border-orange-500/20">{gitCurrentBranch}</span>
            </div>
            <button aria-label="Close" onClick={() => setShowGitPanel(false)} className="text-[#555] hover:text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#222]">
            {(['branches', 'commits', 'stash', 'remote'] as const).map(tab => (
              <button key={tab} onClick={() => setGitTab(tab as 'branches' | 'commits' | 'stash')} className={`flex-1 py-2 text-[10px] font-medium transition-colors border-b-2 ${gitTab === tab ? 'text-orange-400 border-orange-400' : 'text-[#555] border-transparent hover:text-white'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}{tab === 'branches' ? ` (${gitBranches.length})` : tab === 'commits' ? ` (${gitBranchCommits.length})` : tab === 'stash' ? ` (${gitStash.length})` : ''}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {gitTab === 'branches' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input value={gitNewBranch} onChange={e => setGitNewBranch(e.target.value)} placeholder="New branch name..." className="flex-1 px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white placeholder-[#444] focus:border-orange-500 focus:outline-none" onKeyDown={e => e.key === 'Enter' && gitCreateBranch(gitNewBranch)} />
                  <button onClick={() => gitCreateBranch(gitNewBranch)} disabled={!gitNewBranch.trim()} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30">Create</button>
                </div>
                {gitBranches.map((branch: any) => (
                  <div key={branch.name} className={`p-3 rounded-lg border transition-colors ${branch.current ? 'bg-orange-500/10 border-orange-500/20' : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {branch.current && <div className="w-2 h-2 rounded-full bg-orange-400" />}
                        <span className={`text-[11px] font-medium ${branch.current ? 'text-orange-400' : 'text-white'}`}>{branch.name}</span>
                        <span className="text-[9px] text-[#555]">{branch.commits} commits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!branch.current && <button onClick={() => gitSwitchBranch(branch.name)} className="px-2 py-0.5 text-[9px] text-[#888] hover:text-white bg-[#222] rounded transition-colors">Checkout</button>}
                        {branch.name !== 'main' && !branch.current && <button onClick={() => gitDeleteBranch(branch.name)} className="px-2 py-0.5 text-[9px] text-red-400/50 hover:text-red-400 bg-[#222] rounded transition-colors">Delete</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {gitTab === 'commits' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input value={gitCommitMsg} onChange={e => setGitCommitMsg(e.target.value)} placeholder="Commit message..." className="flex-1 px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white placeholder-[#444] focus:border-orange-500 focus:outline-none" onKeyDown={e => e.key === 'Enter' && gitCommit(gitCommitMsg)} />
                  <button onClick={() => gitCommit(gitCommitMsg)} disabled={!gitCommitMsg.trim()} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30">Commit</button>
                </div>
                <div className="text-[9px] text-[#555]">{Object.keys(projectFiles).length} files in working tree</div>
                {gitBranchCommits.length === 0 ? <p className="text-[11px] text-[#444] text-center py-6">No commits yet</p> :
                  <div className="relative pl-4 border-l border-[#2a2a2a] space-y-3">
                    {gitBranchCommits.map((commit: any) => (
                      <div key={commit.id} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-[#111]" />
                        <div className="p-2.5 bg-[#1a1a1a] rounded-lg border border-[#222]">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-white">{commit.message}</span>
                            <span className="text-[8px] text-orange-400 font-mono">{commit.id}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-[#555]">{commit.branch}</span>
                            <span className="text-[9px] text-[#555]">{commit.files.length} files</span>
                            <span className="text-[9px] text-[#555]">{new Date(commit.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}

            {gitTab === 'stash' && (
              <div className="space-y-2">
                <button onClick={gitStashSave} className="w-full py-2 border border-dashed border-[#333] rounded-lg text-[11px] text-[#888] hover:text-orange-400 hover:border-orange-500/30 transition-colors">Stash Current Changes</button>
                {gitStash.length === 0 ? <p className="text-[11px] text-[#444] text-center py-6">No stashes</p> :
                  gitStash.map((stash: any, i: any) => (
                    <div key={stash.id} className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-white">{stash.message}</div>
                        <div className="text-[9px] text-[#555] mt-0.5">{Object.keys(stash.files).length} files Â· {new Date(stash.timestamp).toLocaleString()}</div>
                      </div>
                      <button onClick={() => gitStashPop(i)} className="px-2.5 py-1 text-[9px] text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded hover:bg-orange-500/20 transition-colors">Pop</button>
                    </div>
                  ))
                }
              </div>
            )}

            {gitTab === 'remote' && (
              <div className="space-y-3">
                {/* GitHub Token */}
                <div><input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} placeholder="GitHub token (ghp_...)" className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white placeholder-[#444] focus:border-orange-500 focus:outline-none" /></div>
                <button onClick={gitFetchRepos} disabled={!githubToken || gitRemoteLoading} className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30">{gitRemoteLoading ? 'Loading...' : 'Fetch Repos'}</button>

                {gitRepos.length > 0 && (
                  <div className="space-y-2">
                    <select value={gitSelectedRepo} onChange={e => { setGitSelectedRepo(e.target.value); if (e.target.value) { gitFetchBranches(e.target.value); gitFetchPRs(); gitFetchCommits(e.target.value); } }} className="w-full px-2.5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[11px] text-white focus:border-orange-500 focus:outline-none">
                      <option value="">Select repo...</option>
                      {gitRepos.map((r: any) => <option key={r.fullName} value={r.fullName}>{r.fullName} {r.language ? `(${r.language})` : ''}</option>)}
                    </select>
                  </div>
                )}

                {gitSelectedRepo && (
                  <>
                    {/* Branches */}
                    {gitRemoteBranches.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] text-[#888] font-medium">Branches ({gitRemoteBranches.length})</div>
                        <div className="max-h-[100px] overflow-y-auto space-y-1">
                          {gitRemoteBranches.map((b: any) => (
                            <div key={b.name} className="flex items-center justify-between p-1.5 bg-[#1a1a1a] rounded border border-[#222] text-[10px]">
                              <span className="text-white truncate">{b.name}</span>
                              <div className="flex gap-1">
                                <button onClick={() => gitFetchCommits(gitSelectedRepo, b.name)} className="px-1.5 py-0.5 text-[8px] text-[#888] bg-[#222] rounded hover:text-white">Log</button>
                                {b.name !== 'main' && <button onClick={() => gitMergeBranch(b.name, 'main')} className="px-1.5 py-0.5 text-[8px] text-orange-400 bg-orange-500/10 rounded hover:bg-orange-500/20">Mergeâ†’main</button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Create PR */}
                    <div className="space-y-2 p-3 bg-[#0a0a0a] rounded-lg border border-[#222]">
                      <div className="text-[9px] text-orange-400 font-medium">Create Pull Request</div>
                      <input value={gitPRTitle} onChange={e => setGitPRTitle(e.target.value)} placeholder="PR title..." className="w-full px-2 py-1.5 bg-[#111] border border-[#2a2a2a] rounded text-[10px] text-white placeholder-[#444] focus:outline-none" />
                      <div className="flex gap-2">
                        <select value={gitPRHead} onChange={e => setGitPRHead(e.target.value)} className="flex-1 px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-[10px] text-white focus:outline-none">
                          <option value="">Head branch...</option>
                          {gitRemoteBranches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                        <span className="text-[10px] text-[#555] self-center">â†’</span>
                        <select value={gitPRBase} onChange={e => setGitPRBase(e.target.value)} className="flex-1 px-2 py-1 bg-[#111] border border-[#2a2a2a] rounded text-[10px] text-white focus:outline-none">
                          {gitRemoteBranches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                      <button onClick={gitCreatePR} disabled={!gitPRTitle || !gitPRHead} className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-bold rounded transition-colors disabled:opacity-30">Create PR</button>
                    </div>

                    {/* Open PRs */}
                    {gitPRs.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] text-[#888] font-medium">Pull Requests ({gitPRs.length})</div>
                        {gitPRs.map((pr: any) => (
                          <div key={pr.number} className="p-2 bg-[#1a1a1a] rounded-lg border border-[#222] flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-white truncate">#{pr.number} {pr.title}</div>
                              <div className="text-[8px] text-[#555]">{pr.head} â†’ {pr.base} Â· {pr.author}</div>
                            </div>
                            <button onClick={() => gitMergePR(pr.number)} className="px-2 py-1 text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 ml-2 shrink-0">Merge</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Remote Commits */}
                    {gitRemoteCommits.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] text-[#888] font-medium">Recent Commits</div>
                        <div className="max-h-[120px] overflow-y-auto space-y-1">
                          {gitRemoteCommits.slice(0, 10).map((c: any) => (
                            <div key={c.sha} className="flex items-center gap-2 p-1.5 bg-[#1a1a1a] rounded border border-[#222]">
                              {c.avatar && <img src={c.avatar} alt="" className="w-4 h-4 rounded-full" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] text-white truncate">{c.message}</div>
                                <div className="text-[8px] text-[#555]">{c.sha} Â· {c.author}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}

export default memo(DevToolsPanels);
