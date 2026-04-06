import { describe, it, expect } from 'vitest';
import { compressProject, decompressProject } from '../lib/share-utils';

describe('compressProject + decompressProject roundtrip', () => {
  it('roundtrips a simple project', async () => {
    const files = {
      'index.html': { content: '<h1>Hello</h1>', language: 'html' },
      'style.css': { content: 'body { color: red; }', language: 'css' },
    };
    const encoded = await compressProject(files);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const result = await decompressProject(encoded);
    expect(result).toEqual(files);
  });

  it('handles single-file project', async () => {
    const files = { 'app.js': { content: 'console.log("hi")', language: 'javascript' } };
    const encoded = await compressProject(files);
    const result = await decompressProject(encoded);
    expect(result).toEqual(files);
  });

  it('encoded string uses only base64url chars', async () => {
    const files = { 'a.txt': { content: 'test', language: 'plaintext' } };
    const encoded = await compressProject(files);
    // base64url: A-Z, a-z, 0-9, -, _ (no +, /, or =)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
