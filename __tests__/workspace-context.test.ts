import { describe, it, expect } from 'vitest';
import { buildWorkspaceContext } from '@/lib/workspace-context';

function makeParams(overrides: Record<string, unknown> = {}) {
  return {
    activeTab: 'app',
    previewHtml: '<h1>Hello</h1>',
    clonedHtml: null,
    cloneUrl: '',
    codeBlocks: [],
    selectedModel: { name: 'Claude 3.5' },
    showTerminal: false,
    terminalLines: [],
    integrationKeys: {},
    projectFiles: { 'index.html': { content: '<h1>Hello</h1>', language: 'html' } },
    selectedFile: 'index.html',
    deviceMode: 'desktop',
    runtimeErrors: [],
    outputFramework: 'html',
    researchMode: false,
    researchContext: '',
    stitchScreens: [],
    generationHistory: [],
    ...overrides,
  } as any;
}

describe('buildWorkspaceContext', () => {
  it('includes workspace state header and footer', () => {
    const result = buildWorkspaceContext(makeParams());
    expect(result).toContain('[WORKSPACE STATE]');
    expect(result).toContain('[/WORKSPACE STATE]');
  });

  it('includes active tab', () => {
    const result = buildWorkspaceContext(makeParams({ activeTab: 'code' }));
    expect(result).toContain('Active tab: code');
  });

  it('shows preview has content', () => {
    const result = buildWorkspaceContext(makeParams());
    expect(result).toContain('Preview: has content');
  });

  it('shows preview empty', () => {
    const result = buildWorkspaceContext(makeParams({ previewHtml: null }));
    expect(result).toContain('Preview: empty');
  });

  it('includes clone info when active', () => {
    const result = buildWorkspaceContext(makeParams({ clonedHtml: '<div/>', cloneUrl: 'https://example.com' }));
    expect(result).toContain('Clone: active (from https://example.com)');
  });

  it('includes terminal lines when visible', () => {
    const result = buildWorkspaceContext(makeParams({
      showTerminal: true,
      terminalLines: ['$ npm install', '$ done'],
    }));
    expect(result).toContain('Terminal (last 5 lines):');
    expect(result).toContain('$ npm install');
  });

  it('includes project files', () => {
    const result = buildWorkspaceContext(makeParams());
    expect(result).toContain('Project files (1): index.html');
    expect(result).toContain('[ACTIVE]');
  });

  it('includes model name', () => {
    const result = buildWorkspaceContext(makeParams());
    expect(result).toContain('Model: Claude 3.5');
  });

  it('includes framework description', () => {
    const result = buildWorkspaceContext(makeParams({ outputFramework: 'react' }));
    expect(result).toContain('Target framework: react (React + TypeScript + Vite + Tailwind + shadcn/ui)');
  });

  it('includes runtime errors', () => {
    const result = buildWorkspaceContext(makeParams({
      runtimeErrors: [{ message: 'TypeError', line: 5 }],
    }));
    expect(result).toContain('Runtime errors (1):');
    expect(result).toContain('TypeError');
  });

  it('includes generation memory', () => {
    const result = buildWorkspaceContext(makeParams({
      generationHistory: [{ font: 'Inter', accent: '#ff0000' }],
    }));
    expect(result).toContain('[GENERATION MEMORY');
    expect(result).toContain('font: Inter');
  });

  it('includes stitch screens', () => {
    const result = buildWorkspaceContext(makeParams({
      stitchScreens: [{ page: 'hero', html: '<section>' + 'x'.repeat(200) + '</section>' }],
    }));
    expect(result).toContain('[STITCH DESIGN REFERENCE');
  });

  it('includes research context', () => {
    const result = buildWorkspaceContext(makeParams({
      researchMode: true,
      researchContext: 'Some research data about the topic',
    }));
    expect(result).toContain('[NOTEBOOKLM RESEARCH CONTEXT]');
    expect(result).toContain('Some research data');
  });
});
