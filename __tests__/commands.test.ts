import { describe, it, expect } from 'vitest';
import { buildCommandList, filterCommands } from '@/lib/commands';

describe('commands', () => {
  const mockCtx = {
    setActiveTab: () => {},
    panelActions: { setPanel: () => {}, togglePanel: () => {}, closeAll: () => {} },
    formatCurrentFile: () => {},
    downloadProjectZip: () => {},
    deployToVercel: () => {},
    clearChat: () => {},
    vfsUndo: () => {},
    vfsRedo: () => {},
    newConversation: () => {},
    createProject: () => {},
    copyPreviewHtml: () => {},
    shareProjectUrl: () => Promise.resolve(''),
    exportSingleHtml: () => {},
    sendPrompt: () => {},
    generateGeminiImage: () => {},
    setView: () => {},
    formatCode: () => {},
    explainCurrentCode: () => {},
    generateAndRunTests: () => {},
    runA11yAudit: () => {},
    runPerfAudit: () => {},
    copyPreviewAsImage: () => {},
    exportProjectZip: () => {},
    enhanceWithResearch: () => {},
  };

  it('buildCommandList returns an array of commands', () => {
    const list = buildCommandList(mockCtx as any);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it('each command has required fields', () => {
    const list = buildCommandList(mockCtx as any);
    for (const cmd of list) {
      expect(cmd).toHaveProperty('label');
      expect(cmd).toHaveProperty('action');
      expect(typeof cmd.label).toBe('string');
      expect(typeof cmd.action).toBe('function');
    }
  });

  it('filterCommands filters by query', () => {
    const list = buildCommandList(mockCtx as any);
    const filtered = filterCommands(list, 'deploy');
    expect(filtered.length).toBeLessThanOrEqual(list.length);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('filterCommands with empty query returns all', () => {
    const list = buildCommandList(mockCtx as any);
    const filtered = filterCommands(list, '');
    expect(filtered.length).toBe(list.length);
  });

  it('filterCommands is case-insensitive', () => {
    const list = buildCommandList(mockCtx as any);
    const upper = filterCommands(list, 'DEPLOY');
    const lower = filterCommands(list, 'deploy');
    expect(upper.length).toBe(lower.length);
  });
});
