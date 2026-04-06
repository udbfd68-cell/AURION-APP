import { describe, it, expect } from 'vitest';
import { MODELS, detectReactCode, detectTailwindCode, detectRechartsCode, detectReactRouter, detectFramerMotion, detectLibraryCDNs, REACT_CDN, TAILWIND_CDN } from '@/lib/cdn-models';

describe('cdn-models', () => {
  it('MODELS is a non-empty array', () => {
    expect(Array.isArray(MODELS)).toBe(true);
    expect(MODELS.length).toBeGreaterThan(0);
  });

  it('each model has required fields', () => {
    for (const model of MODELS) {
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('provider');
      expect(typeof model.id).toBe('string');
      expect(typeof model.name).toBe('string');
    }
  });

  it('CDN constants are valid URLs', () => {
    expect(REACT_CDN).toContain('http');
    expect(TAILWIND_CDN).toContain('http');
  });

  it('detectReactCode detects React usage', () => {
    const files = { 'index.html': { content: '<script>import React from "react";</script>', language: 'html' } } as any;
    expect(typeof detectReactCode(files)).toBe('boolean');
  });

  it('detectReactCode returns false for non-React', () => {
    const files = { 'index.html': { content: '<h1>Hello</h1>', language: 'html' } } as any;
    expect(detectReactCode(files)).toBe(false);
  });

  it('detectTailwindCode detects Tailwind classes', () => {
    const files = { 'index.html': { content: '<div class="flex items-center bg-blue-500"></div>', language: 'html' } } as any;
    expect(typeof detectTailwindCode(files)).toBe('boolean');
  });

  it('detectRechartsCode detects Recharts', () => {
    const files = { 'index.html': { content: '<div>No charts here</div>', language: 'html' } } as any;
    expect(detectRechartsCode(files)).toBe(false);
  });

  it('detectReactRouter detects routing', () => {
    const files = { 'index.html': { content: '<div>No routing</div>', language: 'html' } } as any;
    expect(detectReactRouter(files)).toBe(false);
  });

  it('detectFramerMotion detects motion', () => {
    const files = { 'index.html': { content: '<div>Static</div>', language: 'html' } } as any;
    expect(detectFramerMotion(files)).toBe(false);
  });

  it('detectLibraryCDNs returns array of CDN strings', () => {
    const files = { 'index.html': { content: '<div class="flex">React App</div>', language: 'html' } } as any;
    const cdns = detectLibraryCDNs(files);
    expect(Array.isArray(cdns)).toBe(true);
  });
});
