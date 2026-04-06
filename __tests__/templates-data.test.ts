import { describe, it, expect } from 'vitest';
import { TEMPLATES } from '@/lib/templates-data';

describe('templates-data', () => {
  it('TEMPLATES is a non-empty array', () => {
    expect(Array.isArray(TEMPLATES)).toBe(true);
    expect(TEMPLATES.length).toBeGreaterThan(0);
  });

  it('each template has required fields', () => {
    for (const t of TEMPLATES) {
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('desc');
      expect(t).toHaveProperty('icon');
      expect(t).toHaveProperty('files');
      expect(typeof t.name).toBe('string');
      expect(typeof t.desc).toBe('string');
      expect(typeof t.files).toBe('object');
    }
  });

  it('each template has at least one file', () => {
    for (const t of TEMPLATES) {
      expect(Object.keys(t.files).length).toBeGreaterThan(0);
    }
  });

  it('template file contents are strings', () => {
    for (const t of TEMPLATES) {
      for (const [path, file] of Object.entries(t.files)) {
        expect(typeof path).toBe('string');
        expect(file).toHaveProperty('content');
        expect(typeof file.content).toBe('string');
      }
    }
  });

  it('templates have unique names', () => {
    const names = TEMPLATES.map(t => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});
