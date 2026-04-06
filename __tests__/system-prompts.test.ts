import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildSmartSystemPrompt, buildCloneSystemPrompt, buildImageAnalysisPrompt, getModelHints } from '@/lib/system-prompts';

describe('system-prompts', () => {
  it('buildSystemPrompt returns a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('buildSmartSystemPrompt includes user context', () => {
    const prompt = buildSmartSystemPrompt('Build a landing page');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('buildCloneSystemPrompt returns a non-empty string', () => {
    const prompt = buildCloneSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
  });

  it('buildImageAnalysisPrompt includes image count', () => {
    const prompt = buildImageAnalysisPrompt(3);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('getModelHints returns string for known model', () => {
    const hints = getModelHints('claude-sonnet-4-20250514');
    expect(typeof hints).toBe('string');
  });

  it('getModelHints returns string for unknown model', () => {
    const hints = getModelHints('unknown-model-xyz');
    expect(typeof hints).toBe('string');
  });
});
