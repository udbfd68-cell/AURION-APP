import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeForPreview } from '@/lib/sanitize';

describe('sanitize', () => {
  describe('sanitize (strict)', () => {
    it('strips script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitize(input);
      expect(result).not.toContain('<script');
      expect(result).toContain('Hello');
    });

    it('strips event handlers', () => {
      const input = '<div onmouseover="alert(1)">test</div>';
      const result = sanitize(input);
      expect(result).not.toContain('onmouseover');
    });

    it('strips javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      const result = sanitize(input);
      expect(result).not.toContain('javascript:');
    });

    it('allows safe HTML tags', () => {
      const input = '<p>paragraph</p><strong>bold</strong><em>italic</em>';
      const result = sanitize(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('allows safe attributes', () => {
      const input = '<a href="https://example.com" class="link">link</a>';
      const result = sanitize(input);
      expect(result).toContain('href="https://example.com"');
    });

    it('handles empty input', () => {
      expect(sanitize('')).toBe('');
    });
  });

  describe('sanitizeForPreview (permissive)', () => {
    it('allows more HTML for preview rendering', () => {
      const input = '<div style="color: red"><img src="test.png" /><table><tr><td>cell</td></tr></table></div>';
      const result = sanitizeForPreview(input);
      expect(result).toContain('<div');
      expect(result).toContain('<img');
      expect(result).toContain('<table');
    });

    it('allows script tags in preview mode', () => {
      const input = '<script>alert(1)</script><p>safe</p>';
      const result = sanitizeForPreview(input);
      expect(result).toContain('<p>safe</p>');
      // sanitizeForPreview intentionally allows scripts for preview iframe
      expect(result).toContain('<script');
    });
  });
});
