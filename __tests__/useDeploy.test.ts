import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeploy } from '@/hooks/useDeploy';

// Mock fetch
global.fetch = vi.fn();

describe('useDeploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: 'https://test.vercel.app' }),
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useDeploy({
      previewHtml: '<html></html>',
      projectFiles: {},
      projectName: 'test',
      showToast: vi.fn(),
    } as any));
    
    expect(result.current.isDeploying).toBe(false);
    expect(result.current.deployResult).toBe(null);
  });

  it('provides deploy function', () => {
    const { result } = renderHook(() => useDeploy({
      previewHtml: '<html></html>',
      projectFiles: {},
      projectName: 'test',
      showToast: vi.fn(),
    } as any));
    
    expect(typeof result.current.deployToVercel).toBe('function');
  });
});
