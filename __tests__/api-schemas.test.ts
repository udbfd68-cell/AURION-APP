import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  anthropicSchema, geminiSchema, groqSchema, openaiSchema,
  cloneSchema, scrapeSchema, deploySchema,
  githubSchema, discordSchema, stripeSchema,
  execSchema,
} from '@/lib/api-schemas';

describe('API Schemas', () => {
  describe('anthropicSchema', () => {
    it('accepts valid AI request', () => {
      const result = anthropicSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-3-opus',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty messages', () => {
      const result = anthropicSchema.safeParse({ messages: [] });
      expect(result.success).toBe(false);
    });

    it('accepts messages with images', () => {
      const result = anthropicSchema.safeParse({
        messages: [{ role: 'user', content: 'Describe this' }],
        images: [{ data: 'base64data', type: 'image/png' }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('geminiSchema', () => {
    it('accepts valid request', () => {
      const result = geminiSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gemini-pro',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing messages', () => {
      const result = geminiSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('cloneSchema', () => {
    it('accepts valid clone request', () => {
      const result = cloneSchema.safeParse({
        prompt: 'Clone this site',
      });
      expect(result.success).toBe(true);
    });

    it('rejects oversized prompt', () => {
      const result = cloneSchema.safeParse({
        prompt: 'x'.repeat(500_001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('scrapeSchema', () => {
    it('accepts valid URL', () => {
      const result = scrapeSchema.safeParse({
        url: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid URL', () => {
      const result = scrapeSchema.safeParse({
        url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('deploySchema', () => {
    it('accepts deploy with HTML', () => {
      const result = deploySchema.safeParse({
        html: '<html>content</html>',
        projectName: 'my-project',
      });
      expect(result.success).toBe(true);
    });

    it('accepts deploy with files', () => {
      const result = deploySchema.safeParse({
        files: { 'index.html': '<html/>', 'style.css': 'body{}' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('githubSchema', () => {
    it('accepts valid github action', () => {
      const result = githubSchema.safeParse({
        token: 'ghp_xxxx',
        repoName: 'my-repo',
        files: { 'index.html': '<html/>' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('execSchema', () => {
    it('accepts valid exec code', () => {
      const result = execSchema.safeParse({
        code: 'console.log("hello")',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty code', () => {
      const result = execSchema.safeParse({
        code: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
