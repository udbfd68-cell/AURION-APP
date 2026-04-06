'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PaymentsIcon, INTEGRATIONS, SANDBOX_STRIPE } from '@/lib/page-helpers';

export interface PaymentsPanelProps {
  integrationKeys: Record<string, string>;
  setIntegrationKeys: (v: any) => void;
  stripeBalance: any;
  setStripeBalance: (v: any) => void;
  stripeProducts: any[];
  setStripeProducts: (v: any) => void;
  stripeError: string | null;
  setStripeError: (v: any) => void;
  isStripeLoading: boolean;
  fetchStripeData: () => void;
  sandboxPay: boolean;
  setSandboxPay: (v: any) => void;
  sandboxMsg: boolean;
  setSandboxMsg: (v: any) => void;
  sandboxMsgForm: any;
  setSandboxMsgForm: (v: any) => void;
  sandboxMsgLog: any[];
  setSandboxMsgLog: (v: any) => void;
  sendRealMessage: (platform: string, channel: string, text: string) => Promise<boolean>;
  editingIntegration: string | null;
  setEditingIntegration: (v: any) => void;
  saveIntegrationKey: (name: string, value: string) => void;
  sendPrompt: (text: string) => void;
}

const PaymentsPanel: React.FC<PaymentsPanelProps> = ({
  integrationKeys,
  setIntegrationKeys,
  stripeBalance,
  setStripeBalance,
  stripeProducts,
  setStripeProducts,
  stripeError,
  setStripeError,
  isStripeLoading,
  fetchStripeData,
  sandboxPay,
  setSandboxPay,
  sandboxMsg,
  setSandboxMsg,
  sandboxMsgForm,
  setSandboxMsgForm,
  sandboxMsgLog,
  setSandboxMsgLog,
  sendRealMessage,
  editingIntegration,
  setEditingIntegration,
  saveIntegrationKey,
  sendPrompt,
}) => {
  return (
                  <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-auto bg-[#0c0c0c]">
                    <div className="max-w-2xl mx-auto p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-1">Payments</h2>
                          <p className="text-[12px] text-[#555]">Payment processing for your app</p>
                        </div>
                        {integrationKeys['Stripe'] && <span className="px-2 py-1 rounded-md bg-purple-400/10 text-purple-400 text-[10px]">Connected</span>}
                      </div>
                      {integrationKeys['Stripe'] ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><PaymentsIcon /></div>
                                <div><p className="text-[13px] text-white font-medium">Stripe Connected</p><p className="text-[10px] text-[#555]">{integrationKeys['Stripe'].startsWith('sk_live') ? 'Live mode' : 'Test mode'}</p></div>
                              </div>
                              <button onClick={fetchStripeData} disabled={isStripeLoading} className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-400 text-[10px] hover:bg-purple-500/30 transition-colors disabled:opacity-30">{isStripeLoading ? 'Loading...' : 'Fetch Data'}</button>
                            </div>
                            {stripeBalance && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                  <p className="text-[10px] text-[#555] mb-1">Available</p>
                                  <span className="text-[13px] text-emerald-400 font-medium">${(stripeBalance.available / 100).toFixed(2)}</span>
                                </div>
                                <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                  <p className="text-[10px] text-[#555] mb-1">Pending</p>
                                  <span className="text-[13px] text-amber-400 font-medium">${(stripeBalance.pending / 100).toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          {stripeError && <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-[11px]">{stripeError}</div>}
                          {stripeProducts.length > 0 && (
                            <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                              <p className="text-[10px] text-[#555] mb-2">Products ({stripeProducts.length})</p>
                              <div className="space-y-1.5">
                                {stripeProducts.map((p: unknown) => {
                                  const prod = p as { id: string; name: string; active: boolean };
                                  return (
                                    <div key={prod.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                      <span className="text-[11px] text-gray-300">{prod.name}</span>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${prod.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#333] text-[#888]'}`}>{prod.active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Stripe checkout page with a pricing table using my Stripe key')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Generate a checkout page</button>
                              <button onClick={() => sendPrompt('Create a subscription pricing page with 3 tiers using Stripe')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Build a pricing page</button>
                            </div>
                          </div>
                          <button onClick={() => { setIntegrationKeys((prev: Record<string, string>) => { const next = { ...prev }; delete next['Stripe']; return next; }); setStripeBalance(null); setStripeProducts([]); setStripeError(null); }} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">Remove Stripe Key</button>
                        </div>
                      ) : sandboxPay ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[12px] text-amber-400 font-medium">Sandbox Mode</span>
                              </div>
                              <button onClick={() => setSandboxPay(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Exit Sandbox</button>
                            </div>
                            <p className="text-[10px] text-amber-400/60">Mock payment data. Connect a real Stripe key for live data.</p>
                          </div>
                          {/* Mock Balance */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><PaymentsIcon /></div>
                              <div><p className="text-[13px] text-white font-medium">Stripe Sandbox</p><p className="text-[10px] text-[#555]">Test mode &middot; sk_test_sandbox</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                <p className="text-[10px] text-[#555] mb-1">Available</p>
                                <span className="text-[13px] text-emerald-400 font-medium">${(SANDBOX_STRIPE.balance.available / 100).toFixed(2)}</span>
                              </div>
                              <div className="p-3 rounded-md bg-[#0c0c0c] border border-[#1e1e1e]">
                                <p className="text-[10px] text-[#555] mb-1">Pending</p>
                                <span className="text-[13px] text-amber-400 font-medium">${(SANDBOX_STRIPE.balance.pending / 100).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          {/* Mock Products */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[10px] text-[#555] mb-2">Products ({SANDBOX_STRIPE.products.length})</p>
                            <div className="space-y-1.5">
                              {SANDBOX_STRIPE.products.map(prod => (
                                <div key={prod.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                  <span className="text-[11px] text-gray-300">{prod.name}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${prod.active ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[#333] text-[#888]'}`}>{prod.active ? 'Active' : 'Inactive'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Mock Transactions */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[10px] text-[#555] mb-2">Recent Transactions ({SANDBOX_STRIPE.transactions.length})</p>
                            <div className="space-y-1.5">
                              {SANDBOX_STRIPE.transactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'succeeded' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    <span className="text-[10px] text-gray-400">{tx.customer}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-white font-medium">${(tx.amount / 100).toFixed(2)}</span>
                                    <span className="text-[9px] text-[#555]">{tx.date}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Messaging Sandbox */}
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                                <div><p className="text-[13px] text-white font-medium">Messaging Sandbox</p><p className="text-[10px] text-[#555]">Test Slack / Discord / Twilio messaging</p></div>
                              </div>
                              {!sandboxMsg && <button onClick={() => setSandboxMsg(true)} className="px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-400 text-[10px] hover:bg-cyan-500/30 transition-colors">Open</button>}
                              {sandboxMsg && <button onClick={() => setSandboxMsg(false)} className="text-[10px] text-[#888] hover:text-white transition-colors">Close</button>}
                            </div>
                            {sandboxMsg && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    {['Slack', 'Discord', 'Twilio'].map(p => (
                                      <button key={p} onClick={() => setSandboxMsgForm((f: any) => ({ ...f, platform: p }))} className={`px-2.5 py-1 rounded-md text-[10px] transition-colors ${sandboxMsgForm.platform === p ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>{p}</button>
                                    ))}
                                  </div>
                                  <input type="text" value={sandboxMsgForm.channel} onChange={(e) => setSandboxMsgForm((p: any) => ({ ...p, channel: e.target.value }))} placeholder={sandboxMsgForm.platform === 'Twilio' ? '+1 555-0123' : '#channel-name'} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] font-mono" />
                                  <textarea value={sandboxMsgForm.text} onChange={(e) => setSandboxMsgForm((p: any) => ({ ...p, text: e.target.value }))} placeholder="Message..." rows={2} className="w-full bg-[#0c0c0c] border border-[#1e1e1e] rounded-md px-2.5 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#333] resize-none" />
                                  <button onClick={async () => { if (sandboxMsgForm.channel && sandboxMsgForm.text) { const hasReal = !!integrationKeys[sandboxMsgForm.platform]; if (hasReal) { const ok = await sendRealMessage(sandboxMsgForm.platform, sandboxMsgForm.channel, sandboxMsgForm.text); setSandboxMsgLog((prev: any[]) => [{ id: `msg_${Date.now()}`, channel: sandboxMsgForm.channel, text: sandboxMsgForm.text, platform: sandboxMsgForm.platform + (ok ? '' : ' ✗'), date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } else { setSandboxMsgLog((prev: any[]) => [{ id: `msg_${Date.now()}`, channel: sandboxMsgForm.channel, text: sandboxMsgForm.text, platform: sandboxMsgForm.platform, date: new Date().toISOString().slice(0, 16).replace('T', ' ') }, ...prev]); } setSandboxMsgForm((f: any) => ({ ...f, channel: '', text: '' })); } }} disabled={!sandboxMsgForm.channel || !sandboxMsgForm.text} className="px-3 py-1.5 rounded-md bg-cyan-500/20 text-cyan-400 text-[11px] font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-30">{integrationKeys[sandboxMsgForm.platform] ? `Send via ${sandboxMsgForm.platform}` : 'Send (Sandbox)'}</button>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] text-[#555]">Messages ({sandboxMsgLog.length})</p>
                                  {sandboxMsgLog.map(msg => (
                                    <div key={msg.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-[#0c0c0c]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 shrink-0">{msg.platform}</span>
                                        <span className="text-[10px] text-gray-400 truncate">{msg.channel}</span>
                                        <span className="text-[10px] text-[#555] truncate">{msg.text}</span>
                                      </div>
                                      <span className="text-[9px] text-[#555] shrink-0 ml-2">{msg.date}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-4 rounded-lg border border-[#222] bg-[#111]">
                            <p className="text-[12px] text-white mb-2">Ask the AI to:</p>
                            <div className="space-y-1.5">
                              <button onClick={() => sendPrompt('Create a Stripe checkout page with a pricing table using my Stripe key')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Generate a checkout page</button>
                              <button onClick={() => sendPrompt('Create a subscription pricing page with 3 tiers using Stripe')} className="w-full text-left px-3 py-2 rounded-md bg-purple-500/5 text-purple-400/80 text-[11px] hover:bg-purple-500/10 transition-colors">Build a pricing page</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Sandbox CTA */}
                          <button onClick={() => setSandboxPay(true)} className="w-full p-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                              <div>
                                <p className="text-[13px] text-amber-400 font-medium group-hover:text-amber-300 transition-colors">Try Sandbox Mode</p>
                                <p className="text-[10px] text-[#555]">Explore payments dashboard + messaging with mock data</p>
                              </div>
                            </div>
                          </button>
                          {INTEGRATIONS.filter(i => i.cat === 'Payments').map(intg => (
                            <div key={intg.name} className="p-4 rounded-lg border border-[#222] bg-[#111] hover:border-[#333] transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center"><PaymentsIcon /></div>
                                  <div><p className="text-[13px] text-white font-medium">{intg.name}</p><p className="text-[11px] text-[#555]">{intg.desc}</p></div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${integrationKeys[intg.name] ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                              </div>
                              {editingIntegration === intg.name ? (
                                <div className="flex gap-2 mt-2">
                                  <input type="password" placeholder={intg.keyPlaceholder} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2.5 py-1.5 text-[12px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); }} />
                                  <button onClick={() => setEditingIntegration(null)} className="px-2.5 py-1.5 rounded-md border border-[#2a2a2a] text-[11px] text-[#888] hover:text-white transition-colors">Cancel</button>
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
};

export default React.memo(PaymentsPanel);
