import { describe, it, expect } from 'vitest';
import {
  PROMPT_TEMPLATES,
  EDITOR_THEMES,
  KEYBOARD_SHORTCUTS,
  COMPONENT_SNIPPETS,
  INTEGRATION_ROUTE_MAP,
  ESCAPE_PANEL_PRIORITY,
} from '../lib/constants';

describe('PROMPT_TEMPLATES', () => {
  it('has multiple templates', () => {
    expect(PROMPT_TEMPLATES.length).toBeGreaterThan(5);
  });

  it('each template has title, icon, and prompt', () => {
    for (const t of PROMPT_TEMPLATES) {
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('icon');
      expect(t).toHaveProperty('prompt');
      expect(typeof t.title).toBe('string');
      expect(typeof t.prompt).toBe('string');
    }
  });
});

describe('EDITOR_THEMES', () => {
  it('has at least 3 themes', () => {
    expect(EDITOR_THEMES.length).toBeGreaterThanOrEqual(3);
  });

  it('each theme has id, name, and desc', () => {
    for (const t of EDITOR_THEMES) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('desc');
    }
  });
});

describe('KEYBOARD_SHORTCUTS', () => {
  it('has multiple shortcuts', () => {
    expect(KEYBOARD_SHORTCUTS.length).toBeGreaterThan(10);
  });

  it('each shortcut has keys and desc', () => {
    for (const s of KEYBOARD_SHORTCUTS) {
      expect(typeof s.keys).toBe('string');
      expect(typeof s.desc).toBe('string');
    }
  });
});

describe('COMPONENT_SNIPPETS', () => {
  it('has multiple snippets', () => {
    expect(COMPONENT_SNIPPETS.length).toBeGreaterThan(5);
  });

  it('each snippet has name, cat, and code', () => {
    for (const c of COMPONENT_SNIPPETS) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.cat).toBe('string');
      expect(typeof c.code).toBe('string');
      expect(c.code.length).toBeGreaterThan(0);
    }
  });
});

describe('INTEGRATION_ROUTE_MAP', () => {
  it('maps integration names to API routes', () => {
    expect(INTEGRATION_ROUTE_MAP['OpenAI']).toBe('/api/openai');
    expect(INTEGRATION_ROUTE_MAP['Stripe']).toBe('/api/stripe');
    expect(INTEGRATION_ROUTE_MAP['Supabase']).toBe('/api/supabase');
  });

  it('all routes start with /api/', () => {
    for (const [, route] of Object.entries(INTEGRATION_ROUTE_MAP)) {
      expect(route).toMatch(/^\/api\//);
    }
  });
});

describe('ESCAPE_PANEL_PRIORITY', () => {
  it('is an array of panel names', () => {
    expect(Array.isArray(ESCAPE_PANEL_PRIORITY)).toBe(true);
    expect(ESCAPE_PANEL_PRIORITY.length).toBeGreaterThan(30);
  });

  it('all entries start with "show"', () => {
    for (const p of ESCAPE_PANEL_PRIORITY) {
      expect(p).toMatch(/^show/);
    }
  });

  it('has no duplicates', () => {
    const unique = new Set(ESCAPE_PANEL_PRIORITY);
    expect(unique.size).toBe(ESCAPE_PANEL_PRIORITY.length);
  });

  it('starts with high-priority panels (CommandPalette, FileSearch)', () => {
    expect(ESCAPE_PANEL_PRIORITY[0]).toBe('showCommandPalette');
    expect(ESCAPE_PANEL_PRIORITY[1]).toBe('showFileSearch');
  });
});
