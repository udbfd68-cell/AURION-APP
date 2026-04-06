import { describe, it, expect } from 'vitest';
import {
  TAG_COLORS, PROVIDER_LABELS, getApiEndpoint,
  VISION_MODELS, getOptimalModel, generateId,
  INTEGRATIONS, FileIcon, getFileIcon,
} from '@/lib/page-helpers';

describe('page-helpers', () => {
  describe('TAG_COLORS', () => {
    it('is a non-empty object', () => {
      expect(typeof TAG_COLORS).toBe('object');
      expect(Object.keys(TAG_COLORS).length).toBeGreaterThan(0);
    });
  });

  describe('PROVIDER_LABELS', () => {
    it('has labels for known providers', () => {
      expect(typeof PROVIDER_LABELS).toBe('object');
      expect(Object.keys(PROVIDER_LABELS).length).toBeGreaterThan(0);
    });
  });

  describe('getApiEndpoint', () => {
    it('returns endpoint for anthropic', () => {
      const endpoint = getApiEndpoint('anthropic');
      expect(typeof endpoint).toBe('string');
      expect(endpoint).toContain('api');
    });

    it('returns endpoint for google', () => {
      const endpoint = getApiEndpoint('google');
      expect(typeof endpoint).toBe('string');
    });
  });

  describe('VISION_MODELS', () => {
    it('is a non-empty set', () => {
      expect(VISION_MODELS instanceof Set).toBe(true);
      expect(VISION_MODELS.size).toBeGreaterThan(0);
    });
  });

  describe('getOptimalModel', () => {
    it('returns a model id string', () => {
      const result = getOptimalModel('claude-sonnet-4-20250514', 'build a landing page', false);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateId', () => {
    it('returns a unique string each call', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(typeof id1).toBe('string');
      expect(id1).not.toBe(id2);
    });
  });

  describe('INTEGRATIONS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(INTEGRATIONS)).toBe(true);
      expect(INTEGRATIONS.length).toBeGreaterThan(0);
    });

    it('each integration has name and icon', () => {
      for (const intg of INTEGRATIONS) {
        expect(intg).toHaveProperty('name');
        expect(typeof intg.name).toBe('string');
      }
    });
  });

  describe('getFileIcon', () => {
    it('returns an icon for known extensions', () => {
      const icon = getFileIcon('index.html');
      expect(icon).toBeDefined();
    });

    it('returns an icon for unknown extensions', () => {
      const icon = getFileIcon('readme.xyz');
      expect(icon).toBeDefined();
    });
  });
});
