'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanelStore } from '@/stores/usePanelStore';
import { INTEGRATIONS } from '@/lib/page-helpers';
import { INTEGRATION_ROUTE_MAP } from '@/lib/constants';

export interface IntegrationsSidePanelProps {
  integrationKeys: Record<string, string>;
  editingIntegration: string | null;
  testingIntegration: string | null;
  testResult: Record<string, { ok: boolean; msg: string }>;
  setEditingIntegration: (v: string | null) => void;
  saveIntegrationKey: (name: string, key: string) => void;
  testIntegration: (name: string) => void;
}

const IntegrationsSidePanel = React.memo(function IntegrationsSidePanel({
  integrationKeys, editingIntegration, testingIntegration, testResult,
  setEditingIntegration, saveIntegrationKey, testIntegration,
}: IntegrationsSidePanelProps) {
  const { showIntegrations } = usePanelStore();
  const panelActions = usePanelStore();

  return (
    <AnimatePresence>
      {showIntegrations && (
        <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="integration-side-panel h-full border-l border-[#1e1e1e] bg-[#0f0f0f] overflow-hidden shrink-0">
          <div className="w-[300px] h-full flex flex-col">
            <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between shrink-0">
              <h3 className="text-[13px] font-medium text-white">Integrations</h3>
              <button onClick={() => panelActions.setPanel('showIntegrations', false)} className="text-[#555] hover:text-white transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {INTEGRATIONS.map((intg) => {
                const isConnected = intg.builtIn || !!integrationKeys[intg.name];
                return (
                  <div key={intg.name} className="rounded-md hover:bg-[#161616] transition-colors">
                    {editingIntegration === intg.name ? (
                      <div className="px-3 py-2.5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[12px] text-white">{intg.name}</span>
                          <span className="text-[9px] text-[#444]">{intg.cat}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <input type="password" placeholder={intg.keyPlaceholder || 'API Key'} className="flex-1 bg-[#0c0c0c] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-[11px] text-gray-300 placeholder-[#555] outline-none focus:border-[#444]" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveIntegrationKey(intg.name, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingIntegration(null); }} />
                          <button onClick={() => setEditingIntegration(null)} className="px-2 py-1.5 rounded-md text-[10px] text-[#888] hover:text-white border border-[#2a2a2a] transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => !intg.builtIn && setEditingIntegration(intg.name)} className="w-full flex items-center gap-3 px-3 py-2 text-left cursor-default">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400' : 'bg-[#333]'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-white">{intg.name}</span>
                            <span className="text-[9px] text-[#444]">{intg.cat}</span>
                          </div>
                          <p className="text-[10px] text-[#555] truncate">{intg.desc}</p>
                          {testResult[intg.name] && (
                            <p className={`text-[9px] mt-0.5 ${testResult[intg.name].ok ? 'text-emerald-400' : 'text-red-400'}`}>{testResult[intg.name].msg}</p>
                          )}
                        </div>
                        {isConnected && !intg.builtIn && INTEGRATION_ROUTE_MAP[intg.name] ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); testIntegration(intg.name); }}
                            disabled={testingIntegration === intg.name}
                            className="text-[9px] px-2 py-1 rounded bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition-colors shrink-0 disabled:opacity-50"
                          >
                            {testingIntegration === intg.name ? '...' : 'Test'}
                          </button>
                        ) : isConnected ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 shrink-0">{intg.builtIn ? 'built-in' : 'connected'}</span>
                        ) : (
                          <span className="text-[9px] text-[#555] shrink-0 hover:text-white cursor-pointer">connect</span>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default IntegrationsSidePanel;
