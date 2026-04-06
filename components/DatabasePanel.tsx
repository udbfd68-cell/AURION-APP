'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DatabaseIcon, INTEGRATIONS, SANDBOX_DB } from '@/lib/page-helpers';
import { SQL_KEYWORDS, SCHEMA_TEMPLATES } from '@/lib/database-live';

export interface DatabasePanelProps {
  dbActiveConnection: any;
  dbViewMode: string;
  setDbViewMode: (v: any) => void;
  dbSqlInput: string;
  setDbSqlInput: (v: any) => void;
  dbQueryRunning: boolean;
  dbQueryResult: any;
  dbSchema: any[];
  dbSchemaLoading: boolean;
  dbQueryHistory: any[];
  runDatabaseQuery: () => void;
  runSchemaTemplate: (key: string) => void;
  connectDatabase: (type: any, url: string, key: string) => void;
  integrationKeys: Record<string, string>;
  setIntegrationKeys: (v: any) => void;
  supabaseUrl: string;
  setSupabaseUrl: (v: any) => void;
  supabaseTable: string;
  setSupabaseTable: (v: any) => void;
  supabaseResult: any;
  setSupabaseResult: (v: any) => void;
  supabaseError: string | null;
  setSupabaseError: (v: any) => void;
  isSupabaseLoading: boolean;
  runSupabaseQuery: () => void;
  sandboxDb: boolean;
  setSandboxDb: (v: any) => void;
  sandboxDbTable: string;
  setSandboxDbTable: (v: any) => void;
  sandboxEmail: boolean;
  setSandboxEmail: (v: any) => void;
  sandboxEmailForm: { to: string; subject: string; body: string };
  setSandboxEmailForm: (v: any) => void;
  sandboxEmailLog: any[];
  setSandboxEmailLog: (v: any) => void;
  sendRealEmail: (to: string, subject: string, body: string) => Promise<boolean>;
  editingIntegration: string | null;
  setEditingIntegration: (v: any) => void;
  saveIntegrationKey: (name: string, value: string) => void;
  sendPrompt: (prompt: string) => void;
  dbEngineRef: React.MutableRefObject<any>;
  setDbSchema: (v: any) => void;
}

const DatabasePanel = React.memo(function DatabasePanel({
  dbActiveConnection,
  dbViewMode,
  setDbViewMode,
  dbSqlInput,
  setDbSqlInput,
  dbQueryRunning,
  dbQueryResult,
  dbSchema,
  dbSchemaLoading,
  dbQueryHistory,
  runDatabaseQuery,
  runSchemaTemplate,
  connectDatabase,
  integrationKeys,
  setIntegrationKeys,
  supabaseUrl,
  setSupabaseUrl,
  supabaseTable,
  setSupabaseTable,
  supabaseResult,
  setSupabaseResult,
  supabaseError,
  setSupabaseError,
  isSupabaseLoading,
  runSupabaseQuery,
  sandboxDb,
  setSandboxDb,
  sandboxDbTable,
  setSandboxDbTable,
  sandboxEmail,
  setSandboxEmail,
  sandboxEmailForm,
  setSandboxEmailForm,
  sandboxEmailLog,
  setSandboxEmailLog,
  sendRealEmail,
  editingIntegration,
  setEditingIntegration,
  saveIntegrationKey,
  sendPrompt,
  dbEngineRef,
  setDbSchema,
}: DatabasePanelProps) {
  return (
                  <motion.div key="database" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto bg-[#0c0c0c]">
                    <div className="max-w-2xl mx-auto p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-1">Database</h2>
                          <p className="text-[12px] text-[#555]">{dbActiveConnection ? 'Live database connected' : 'Connect and manage your project database'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {dbActiveConnection && <span className="px-2 py-1 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px]">Live</span>}
                          {integrationKeys['Supabase'] && <span className="px-2 py-1 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px]">Supabase</span>}
                        </div>
                      </div>
                      {/* Database mode tabs */}
                      <div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-[#111] border border-[#222]">
                        {(['query', 'schema', 'history', 'templates'] as const).map(mode => (
                          <button key={mode} onClick={() => setDbViewMode(mode)} className={`flex-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors capitalize ${dbViewMode === mode ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#555] hover:text-white'}`}>{mode === 'query' ? '⚡ SQL Editor' : mode === 'schema' ? '📊 Schema' : mode === 'history' ? '📋 History' : '🧱 Templates'}</button>
                        ))}
                      </div>

                      {/* ═══ SQL Editor View ═══ */}
                      {dbViewMode === 'query' && (
                        <div className="space-y-4">
                          {/* Quick connect if no active connection */}
                          {!dbActiveConnection && (
                            <div className="p-4 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5">
                              <p className="text-[12px] text-emerald-400 font-medium mb-3">Quick Connect</p>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => {
                                  const url = prompt('Supabase Project URL:');
                                  const key = prompt('Supabase API Key (service_role):');
                                  if (url && key) connectDatabase('supabase', url, key);
                                }} className="px-3 py-2 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] hover:bg-emerald-500/20 transition-colors">Connect Supabase</button>
                                <button onClick={() => {
                                  const url = prompt('Neon Connection String:');
                                  if (url) connectDatabase('neon', url, '');
                                }} className="px-3 py-2 rounded-md bg-blue-500/10 text-blue-400 text-[11px] hover:bg-blue-500/20 transition-colors">Connect Neon</button>
                              </div>
                              {integrationKeys['Supabase'] && (
                                <button onClick={() => connectDatabase('supabase', supabaseUrl || '', integrationKeys['Supabase'])} className="mt-2 w-full px-3 py-2 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors">Use saved Supabase key</button>
                              )}
                            </div>
                          )}
                          {/* SQL Editor */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-[#555] font-medium">SQL QUERY</span>
                              <div className="flex items-center gap-1">
                                {SQL_KEYWORDS.slice(0, 8).map(kw => (
                                  <button key={kw} onClick={() => setDbSqlInput((prev: string) => prev + (prev.endsWith(' ') ? '' : ' ') + kw + ' ')} className="px-1.5 py-0.5 rounded text-[9px] bg-[#1a1a1a] text-[#555] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">{kw}</button>
                                ))}
                              </div>
                            </div>
                            <textarea value={dbSqlInput} onChange={(e) => setDbSqlInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runDatabaseQuery(); } }} placeholder="SELECT * FROM users..." rows={5} className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-md px-3 py-2 text-[12px] text-emerald-300 placeholder-[#555] outline-none focus:border-emerald-500/30 font-mono resize-none" spellCheck={false} />
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[9px] text-[#555]">Ctrl+Enter to run</span>
                              <button onClick={runDatabaseQuery} disabled={dbQueryRunning || !dbActiveConnection} className="px-4 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-30">{dbQueryRunning ? 'Running...' : '▶ Execute'}</button>
                            </div>
                          </div>
                          {/* Query Result */}
                          {dbQueryResult && (
                            <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-[#555]">
                                  {dbQueryResult.error ? '✗ Error' : `✓ ${dbQueryResult.rowCount} row(s) — ${dbQueryResult.duration}ms`}
                                </span>
                                {dbQueryResult.rows.length > 0 && <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(dbQueryResult.rows, null, 2)); }} className="text-[9px] text-[#555] hover:text-white transition-colors">Copy JSON</button>}
                              </div>
                              {dbQueryResult.error ? (
                                <div className="p-3 rounded-md bg-red-500/10 text-red-400 text-[11px] font-mono">{dbQueryResult.error}</div>
                              ) : dbQueryResult.rows.length > 0 ? (
                                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                  <table className="w-full text-[10px]">
                                    <thead><tr className="border-b border-[#222]">{dbQueryResult.columns.map((c: string) => <th key={c} className="text-left py-1 px-2 text-[#888] font-medium sticky top-0 bg-[#111]">{c}</th>)}</tr></thead>
                                    <tbody>{dbQueryResult.rows.slice(0, 200).map((row: any, i: number) => <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#161616]">{dbQueryResult.columns.map((c: string) => <td key={c} className="py-1 px-2 text-gray-400 truncate max-w-[200px] font-mono">{String(row[c] ?? 'null')}</td>)}</tr>)}</tbody>
                                  </table>
                                </div>
                              ) : <p className="text-[11px] text-[#555]">Query executed successfully (no rows returned)</p>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ═══ Schema Browser View ═══ */}
                      {dbViewMode === 'schema' && (
                        <div className="space-y-4">
                          {dbSchemaLoading ? (
                            <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p className="text-[11px] text-[#555]">Loading schema...</p></div>
                          ) : dbSchema.length > 0 ? (
                            dbSchema.map(table => (
                              <div key={table.name} className="p-4 rounded-lg border border-[#222] bg-[#111]">
                                <div className="flex items-center gap-2 mb-3">
                                  <DatabaseIcon />
                                  <span className="text-[13px] text-white font-medium">{table.name}</span>
                                  <span className="text-[9px] text-[#555] ml-auto">{table.columns.length} columns</span>
                                </div>
                                <div className="space-y-0.5">
                                  {table.columns.map((col: any) => (
                                    <div key={col.name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors">
                                      <span className={`text-[10px] font-mono ${col.isPrimary ? 'text-amber-400' : col.references ? 'text-blue-400' : 'text-gray-400'}`}>{col.name}</span>
                                      <span className="text-[9px] text-[#555]">{col.type}</span>
                                      {col.isPrimary && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400">PK</span>}
                                      {col.references && <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400">FK</span>}
                                      {!col.nullable && <span className="text-[8px] text-red-400/50">NOT NULL</span>}
                                      {col.defaultValue && <span className="text-[8px] text-[#555] ml-auto">{col.defaultValue}</span>}
                                    </div>
                                  ))}
                                </div>
                                {(table.foreignKeys ?? []).length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-[#1e1e1e]">
                                    {(table.foreignKeys ?? []).map((fk: any, i: number) => <p key={i} className="text-[9px] text-blue-400/60">{fk.column} → {fk.referencedTable}.{fk.referencedColumn}</p>)}
                                  </div>
                                )}
                                <button onClick={() => setDbSqlInput(`SELECT * FROM ${table.name} LIMIT 20;`)} className="mt-2 px-2 py-1 rounded text-[10px] text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">Query this table</button>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center">
                              <p className="text-[12px] text-[#555]">{dbActiveConnection ? 'No tables found. Run a CREATE TABLE query.' : 'Connect a database to browse schema.'}</p>
                              {dbActiveConnection && <button onClick={() => dbEngineRef.current.getSchema(dbActiveConnection).then(setDbSchema)} className="mt-2 px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] hover:bg-emerald-500/30 transition-colors">Refresh Schema</button>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ═══ Query History View ═══ */}
                      {dbViewMode === 'history' && (
                        <div className="space-y-2">
                          {dbQueryHistory.length > 0 ? dbQueryHistory.map(entry => (
                            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors cursor-pointer group" onClick={() => { setDbSqlInput(entry.sql); setDbViewMode('query'); }}>
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${entry.error ? 'bg-red-400' : 'bg-emerald-400'}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-gray-300 font-mono truncate">{entry.sql}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] text-[#555]">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                  <span className="text-[9px] text-[#555]">{entry.duration}ms</span>
                                  {entry.rowCount !== undefined && <span className="text-[9px] text-[#555]">{entry.rowCount} rows</span>}
                                  {entry.error && <span className="text-[9px] text-red-400 truncate">{entry.error}</span>}
                                </div>
                              </div>
                              <span className="text-[9px] text-[#555] opacity-0 group-hover:opacity-100 transition-opacity">Re-run →</span>
                            </div>
                          )) : <p className="text-center text-[12px] text-[#555] py-8">No queries yet. Run a SQL query to see history.</p>}
                        </div>
                      )}

                      {/* ═══ Schema Templates View ═══ */}
                      {dbViewMode === 'templates' && (
                        <div className="space-y-3">
                          <p className="text-[11px] text-[#555]">Apply pre-built database schemas to quickly set up your project.</p>
                          {Object.entries(SCHEMA_TEMPLATES).map(([key, tmpl]) => (
                            <div key={key} className="p-4 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[13px] text-white font-medium">{tmpl.name}</span>
                                <div className="flex gap-1">
                                  <button onClick={() => { setDbSqlInput(tmpl.sql); setDbViewMode('query'); }} className="px-2.5 py-1 rounded-md bg-[#1a1a1a] text-[10px] text-[#888] hover:text-white transition-colors">View SQL</button>
                                  <button onClick={() => runSchemaTemplate(key)} disabled={!dbActiveConnection || dbQueryRunning} className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] hover:bg-emerald-500/30 transition-colors disabled:opacity-30">Apply</button>
                                </div>
                              </div>
                              <p className="text-[10px] text-[#555]">{tmpl.description}</p>
                              <div className="mt-2 flex gap-1 flex-wrap">{tmpl.tables.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[9px] text-[#888]">{t}</span>)}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ═══ Legacy Supabase Connection (if connected) ═══ */}
                      {integrationKeys['Supabase'] ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DatabaseIcon /></div>
                              <div><p className="text-[13px] text-white font-medium">Supabase Connected</p><p className="text-[10px] text-[#555]">Query your database directly from here</p></div>
                            </div>
                            <div className="space-y-2">
                              <div><label className="block text-[10px] text-[#555] mb-1">Project URL</label><input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxxx.supabase.co" className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" /></div>
                              <div><label className="block text-[10px] text-[#555] mb-1">Table Name</label><input type="text" value={supabaseTable} onChange={(e) => setSupabaseTable(e.target.value)} placeholder="users, posts, products..." className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" /></div>
                              <button onClick={runSupabaseQuery} disabled={!supabaseUrl || !supabaseTable || isSupabaseLoading} className="px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-30">{isSupabaseLoading ? 'Querying...' : `SELECT * FROM ${supabaseTable || '...'}`}</button>
                            </div>
                          </div>
                          {supabaseError && <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-[11px]">{supabaseError}</div>}
                          {supabaseResult && (
                            <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                              <p className="text-[10px] text-[#555] mb-2">Results ({Array.isArray(supabaseResult) ? supabaseResult.length : 0} rows)</p>
                              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                {Array.isArray(supabaseResult) && supabaseResult.length > 0 ? (
                                  <table className="w-full text-[10px]">
                                    <thead><tr className="border-b border-[#222]">{Object.keys(supabaseResult[0]).map(k => <th key={k} className="text-left py-1 px-2 text-[#888] font-medium">{k}</th>)}</tr></thead>
                                    <tbody>{supabaseResult.slice(0, 100).map((row, i) => <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#161616]">{Object.values(row).map((v, j) => <td key={j} className="py-1 px-2 text-gray-400 truncate max-w-[200px]">{String(v ?? 'null')}</td>)}</tr>)}</tbody>
                                  </table>
                                ) : <p className="text-[11px] text-[#555]">No rows returned</p>}
                              </div>
                            </div>
                          )}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Supabase auth flow with login/signup pages')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Generate auth flow with Supabase</button>
                              <button onClick={() => sendPrompt('Build a CRUD dashboard that connects to Supabase')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Build a CRUD dashboard</button>
                            </div>
                          </div>
                          <button onClick={() => { setIntegrationKeys((prev: Record<string, string>) => { const next = { ...prev }; delete next['Supabase']; return next; }); setSupabaseResult(null); setSupabaseError(null); }} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">Remove Supabase Key</button>
                        </div>
                      ) : sandboxDb ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[12px] text-amber-400 font-medium">Sandbox Mode</span>
                              </div>
                              <button onClick={() => setSandboxDb(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Exit Sandbox</button>
                            </div>
                            <p className="text-[10px] text-amber-400/60">Mock database with sample data. Connect a real database for live queries.</p>
                          </div>
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DatabaseIcon /></div>
                              <div><p className="text-[13px] text-white font-medium">Sandbox Database</p><p className="text-[10px] text-[#555]">3 tables &middot; {Object.values(SANDBOX_DB).reduce((a, b) => a + b.length, 0)} rows</p></div>
                            </div>
                            <div className="flex gap-2 mb-3">
                              {Object.keys(SANDBOX_DB).map(t => (
                                <button key={t} onClick={() => setSandboxDbTable(t)} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${sandboxDbTable === t ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>{t}</button>
                              ))}
                            </div>
                            <div className="bg-[#0c0c0c] rounded-md border border-[#1e1e1e] px-3 py-1.5 mb-3">
                              <span className="text-[10px] text-emerald-400 font-mono">SELECT * FROM {sandboxDbTable} LIMIT 100;</span>
                            </div>
                            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                              <table className="w-full text-[10px]">
                                <thead><tr className="border-b border-[#222]">{Object.keys(SANDBOX_DB[sandboxDbTable][0]).map(k => <th key={k} className="text-left py-1 px-2 text-[#888] font-medium">{k}</th>)}</tr></thead>
                                <tbody>{SANDBOX_DB[sandboxDbTable].map((row, i) => <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#161616]">{Object.values(row).map((v, j) => <td key={j} className="py-1 px-2 text-gray-400 truncate max-w-[200px]">{String(v ?? 'null')}</td>)}</tr>)}</tbody>
                              </table>
                            </div>
                          </div>
                          {/* Email Sandbox */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/></svg></div>
                                <div><p className="text-[13px] text-white font-medium">Email Sandbox</p><p className="text-[10px] text-[#555]">Test email sending (Resend / SendGrid)</p></div>
                              </div>
                              {!sandboxEmail && <button onClick={() => setSandboxEmail(true)} className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 text-[10px] hover:bg-blue-500/30 transition-colors">Open</button>}
                              {sandboxEmail && <button onClick={() => setSandboxEmail(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Close</button>}
                            </div>
                            {sandboxEmail && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <input type="text" value={sandboxEmailForm.to} onChange={(e) => setSandboxEmailForm((p: any) => ({ ...p, to: e.target.value }))} placeholder="to@example.com" className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" />
                                  <input type="text" value={sandboxEmailForm.subject} onChange={(e) => setSandboxEmailForm((p: any) => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333]" />
                                  <textarea value={sandboxEmailForm.body} onChange={(e) => setSandboxEmailForm((p: any) => ({ ...p, body: e.target.value }))} placeholder="Email body..." rows={3} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] resize-none" />
                                  <button onClick={async () => { if (sandboxEmailForm.to && sandboxEmailForm.subject) { const hasReal = !!(integrationKeys['Resend'] || integrationKeys['SendGrid']); if (hasReal) { const ok = await sendRealEmail(sandboxEmailForm.to, sandboxEmailForm.subject, sandboxEmailForm.body || '<p>No body</p>'); setSandboxEmailLog((prev: any[]) => [{ id: `em_${Date.now()}`, to: sandboxEmailForm.to, subject: sandboxEmailForm.subject, status: ok ? 'delivered' : 'failed', date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } else { setSandboxEmailLog((prev: any[]) => [{ id: `em_${Date.now()}`, to: sandboxEmailForm.to, subject: sandboxEmailForm.subject, status: 'delivered', date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } setSandboxEmailForm({ to: '', subject: '', body: '' }); } }} disabled={!sandboxEmailForm.to || !sandboxEmailForm.subject} className="px-3 py-1.5 rounded-md bg-blue-500/20 text-blue-400 text-[11px] font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-30">{integrationKeys['Resend'] || integrationKeys['SendGrid'] ? 'Send (Real)' : 'Send (Sandbox)'}</button>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-[#555]">Sent ({sandboxEmailLog.length})</p>
                                  {sandboxEmailLog.map(em => (
                                    <div key={em.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${em.status === 'delivered' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                        <span className="text-[10px] text-gray-400 truncate">{em.to}</span>
                                        <span className="text-[10px] text-[#555] truncate">{em.subject}</span>
                                      </div>
                                      <span className="text-[9px] text-[#555] shrink-0 ml-2">{em.date}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Supabase auth flow with login/signup pages')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Generate auth flow with Supabase</button>
                              <button onClick={() => sendPrompt('Build a CRUD dashboard that connects to Supabase')} className="w-full text-left px-3 py-2 rounded-md bg-emerald-500/5 text-emerald-400/80 text-[11px] hover:bg-emerald-500/10 transition-colors">Build a CRUD dashboard</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Sandbox CTA */}
                          <button onClick={() => setSandboxDb(true)} className="w-full p-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                              <div>
                                <p className="text-[13px] text-amber-400 font-medium group-hover:text-amber-300 transition-colors">Try Sandbox Mode</p>
                                <p className="text-[10px] text-[#555]">Explore database queries + email sending with mock data</p>
                              </div>
                            </div>
                          </button>
                          {INTEGRATIONS.filter(i => i.cat === 'Database').map(intg => (
                            <div key={intg.name} className="p-4 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><DatabaseIcon /></div>
                                  <div><p className="text-[13px] text-white font-medium">{intg.name}</p><p className="text-[11px] text-[#555]">{intg.desc}</p></div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${integrationKeys[intg.name] ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                              </div>
                              {editingIntegration === intg.name ? (
                                <div className="space-y-2 mt-2">
                                  {intg.name === 'Supabase' && (
                                    <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxxx.supabase.co" className="w-full bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444] font-mono" />
                                  )}
                                  <div className="flex gap-2">
                                    <input type="password" placeholder={intg.keyPlaceholder} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); if (intg.name === 'Supabase' && supabaseUrl) localStorage.setItem('aurion_supabase_url', supabaseUrl); } }} />
                                    <button onClick={() => setEditingIntegration(null)} className="px-2.5 py-1.5 rounded-md border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setEditingIntegration(intg.name)} className="mt-2 px-3 py-1.5 rounded-md bg-white text-black text-[11px] font-medium hover:bg-gray-200 transition-colors">
                                  {integrationKeys[intg.name] ? 'Reconnect' : 'Connect'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
  );
});

export default DatabasePanel;
