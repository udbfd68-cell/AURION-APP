import { describe, it, expect } from 'vitest';
import { detectLanguage, buildFileTree } from '../lib/client-utils';

describe('detectLanguage', () => {
  it('detects common web extensions', () => {
    expect(detectLanguage('index.html')).toBe('html');
    expect(detectLanguage('styles.css')).toBe('css');
    expect(detectLanguage('app.js')).toBe('javascript');
    expect(detectLanguage('app.jsx')).toBe('javascript');
    expect(detectLanguage('app.ts')).toBe('typescript');
    expect(detectLanguage('app.tsx')).toBe('typescript');
    expect(detectLanguage('data.json')).toBe('json');
  });

  it('detects other extensions', () => {
    expect(detectLanguage('main.py')).toBe('python');
    expect(detectLanguage('schema.sql')).toBe('sql');
    expect(detectLanguage('README.md')).toBe('markdown');
    expect(detectLanguage('config.yml')).toBe('yaml');
    expect(detectLanguage('config.yaml')).toBe('yaml');
    expect(detectLanguage('.env')).toBe('bash');
  });

  it('returns plaintext for unknown extensions', () => {
    expect(detectLanguage('file.xyz')).toBe('plaintext');
    expect(detectLanguage('Makefile')).toBe('plaintext');
  });

  it('handles nested paths', () => {
    expect(detectLanguage('src/components/App.tsx')).toBe('typescript');
    expect(detectLanguage('public/index.html')).toBe('html');
  });
});

describe('buildFileTree', () => {
  it('builds tree from flat file list', () => {
    const files = {
      'index.html': { content: '', language: 'html' },
      'styles.css': { content: '', language: 'css' },
    };
    const { dirs, entries } = buildFileTree(files);
    expect(dirs.size).toBe(0);
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('index.html');
    expect(entries[0].isDir).toBe(false);
    expect(entries[0].depth).toBe(0);
  });

  it('creates directory entries for nested files', () => {
    const files = {
      'src/App.tsx': { content: '', language: 'typescript' },
      'src/main.ts': { content: '', language: 'typescript' },
      'index.html': { content: '', language: 'html' },
    };
    const { dirs, entries } = buildFileTree(files);
    expect(dirs.has('src')).toBe(true);
    const srcDir = entries.find(e => e.path === 'src');
    expect(srcDir).toBeDefined();
    expect(srcDir!.isDir).toBe(true);
  });

  it('sorts directories before files at same depth', () => {
    const files = {
      'z-file.js': { content: '', language: 'javascript' },
      'a-dir/nested.ts': { content: '', language: 'typescript' },
    };
    const { entries } = buildFileTree(files);
    const dirIdx = entries.findIndex(e => e.path === 'a-dir');
    const fileIdx = entries.findIndex(e => e.path === 'z-file.js');
    expect(dirIdx).toBeLessThan(fileIdx);
  });

  it('handles empty file set', () => {
    const { dirs, entries } = buildFileTree({});
    expect(dirs.size).toBe(0);
    expect(entries).toHaveLength(0);
  });
});
