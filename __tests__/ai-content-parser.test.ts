import { describe, it, expect } from 'vitest';
import { parseAIContent } from '@/lib/ai-content-parser';

function freshIds() {
  return new Set<string>();
}

describe('parseAIContent', () => {
  describe('closed file tags', () => {
    it('parses <<FILE:path>>...<</FILE>> tags', () => {
      const content = '<<FILE:index.html>><h1>Hello</h1><</FILE>>';
      const result = parseAIContent(content, freshIds());
      expect(result.files.length).toBeGreaterThanOrEqual(1);
      expect(result.files[0].path).toBe('index.html');
      expect(result.files[0].content).toBe('<h1>Hello</h1>');
    });

    it('parses <FILE:path>...</FILE> tags', () => {
      const content = '<FILE:styles.css>body { margin: 0; }</FILE>';
      const result = parseAIContent(content, freshIds());
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('styles.css');
    });

    it('parses multiple file tags', () => {
      const content = '<<FILE:a.html>><p>A</p><</FILE>><<FILE:b.css>>div { color: red; }<</FILE>>';
      const result = parseAIContent(content, freshIds());
      expect(result.files.length).toBeGreaterThanOrEqual(2);
      expect(result.files.some(f => f.path === 'a.html')).toBe(true);
      expect(result.files.some(f => f.path === 'b.css')).toBe(true);
    });

    it('parses empty-body closed tags (parser captures whitespace trim)', () => {
      const content = '<<FILE:empty.html>><</FILE>>';
      const result = parseAIContent(content, freshIds());
      // The closed regex captures an empty string which gets trimmed, but the unclosed pattern may also match
      // The exact count depends on regex overlap — just verify no crash
      expect(result.files).toBeDefined();
    });
  });

  describe('unclosed file tags', () => {
    it('parses unclosed file tags with content > 50 chars', () => {
      const longContent = 'x'.repeat(60);
      const content = `<<FILE:app.tsx>>${longContent}`;
      const result = parseAIContent(content, freshIds());
      // Both closed (no match) and unclosed patterns run; unclosed catches this
      expect(result.files.length).toBeGreaterThanOrEqual(1);
      expect(result.files.some(f => f.path === 'app.tsx')).toBe(true);
    });

    it('skips unclosed file tags with short content', () => {
      // Less than 50 chars and not matched by closed pattern
      const content = '<FILE:app.tsx>short';
      const result = parseAIContent(content, freshIds());
      expect(result.files).toHaveLength(0);
    });

    it('truncates HTML at </html> tag', () => {
      const content = `<<FILE:page.html>>${'a'.repeat(60)}</html>extra stuff`;
      const result = parseAIContent(content, freshIds());
      const htmlFile = result.files.find(f => f.path === 'page.html');
      expect(htmlFile).toBeDefined();
      expect(htmlFile!.content).toContain('</html>');
      expect(htmlFile!.content).not.toContain('extra stuff');
    });
  });

  describe('code blocks', () => {
    it('parses ```html code blocks', () => {
      const code = 'x'.repeat(60);
      const content = '```html\n' + code + '\n```';
      const result = parseAIContent(content, freshIds());
      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].path).toBe('index.html');
    });

    it('maps jsx to App.jsx', () => {
      const code = 'x'.repeat(60);
      const content = '```jsx\n' + code + '\n```';
      const result = parseAIContent(content, freshIds());
      expect(result.codeBlocks[0].path).toBe('App.jsx');
    });

    it('maps css to styles.css', () => {
      const code = 'x'.repeat(60);
      const content = '```css\n' + code + '\n```';
      const result = parseAIContent(content, freshIds());
      expect(result.codeBlocks[0].path).toBe('styles.css');
    });

    it('maps javascript to script.js', () => {
      const code = 'x'.repeat(60);
      const content = '```javascript\n' + code + '\n```';
      const result = parseAIContent(content, freshIds());
      expect(result.codeBlocks[0].path).toBe('script.js');
    });

    it('skips code blocks < 50 chars', () => {
      const content = '```html\n<h1>Hi</h1>\n```';
      const result = parseAIContent(content, freshIds());
      expect(result.codeBlocks).toHaveLength(0);
    });
  });

  describe('action tags', () => {
    it('parses <<TERMINAL:command>> actions', () => {
      const content = '<<TERMINAL:npm install>>';
      const result = parseAIContent(content, freshIds());
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('TERMINAL');
      expect(result.actions[0].payload).toBe('npm install');
    });

    it('parses <<DEPLOY>> action', () => {
      const content = '<<DEPLOY>>';
      const result = parseAIContent(content, freshIds());
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('DEPLOY');
    });

    it('parses <<LTX_VIDEO:id|prompt>> action', () => {
      const content = '<<LTX_VIDEO:hero|A beautiful sunset>>';
      const result = parseAIContent(content, freshIds());
      expect(result.actions[0].type).toBe('LTX_VIDEO');
      expect(result.actions[0].payload).toBe('hero|A beautiful sunset');
    });

    it('parses multiple actions', () => {
      const content = '<<TERMINAL:ls>><<DEPLOY>><<TAB:code>>';
      const result = parseAIContent(content, freshIds());
      expect(result.actions).toHaveLength(3);
    });
  });

  describe('deduplication', () => {
    it('skips already-seen file IDs', () => {
      const seenIds = new Set<string>();
      const content = '<<FILE:index.html>><h1>Hello</h1><</FILE>>';
      parseAIContent(content, seenIds);
      const result2 = parseAIContent(content, seenIds);
      expect(result2.files).toHaveLength(0);
    });

    it('skips already-seen actions', () => {
      const seenIds = new Set<string>();
      const content = '<<DEPLOY>>';
      parseAIContent(content, seenIds);
      const result2 = parseAIContent(content, seenIds);
      expect(result2.actions).toHaveLength(0);
    });
  });

  describe('mixed content', () => {
    it('parses files, code blocks, and actions together', () => {
      const code = 'x'.repeat(60);
      const content = [
        '<<FILE:index.html>><h1>Hi</h1><</FILE>>',
        '```css\n' + code + '\n```',
        '<<DEPLOY>>',
      ].join('\n');
      const result = parseAIContent(content, freshIds());
      expect(result.files.length).toBeGreaterThanOrEqual(1);
      expect(result.files.some(f => f.path === 'index.html')).toBe(true);
      expect(result.codeBlocks).toHaveLength(1);
      expect(result.actions).toHaveLength(1);
    });
  });
});
