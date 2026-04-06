import { describe, it, expect } from 'vitest';
import { computeSmartSuggestions, computeFollowUpSuggestions } from '@/lib/suggestions';
import type { Message } from '@/lib/types';

describe('computeSmartSuggestions', () => {
  it('returns starter suggestions for empty project', () => {
    const result = computeSmartSuggestions({});
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('SaaS Landing Page');
  });

  it('suggests responsive for HTML without media queries', () => {
    const result = computeSmartSuggestions({
      'index.html': { content: '<h1>Hello</h1>', language: 'html' },
    });
    expect(result.some(s => s.title === 'Make Responsive')).toBe(true);
  });

  it('does not suggest responsive if @media exists', () => {
    const result = computeSmartSuggestions({
      'index.html': { content: '<style>@media (max-width: 768px) {}</style>', language: 'html' },
    });
    expect(result.some(s => s.title === 'Make Responsive')).toBe(false);
  });

  it('returns max 3 suggestions', () => {
    const result = computeSmartSuggestions({
      'index.html': { content: '<h1>Basic</h1>', language: 'html' },
    });
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

describe('computeFollowUpSuggestions', () => {
  const makeMsg = (role: 'user' | 'assistant', content: string): Message => ({
    id: Math.random().toString(), role, content,
  });

  it('returns empty when streaming', () => {
    const result = computeFollowUpSuggestions([makeMsg('user', 'hi'), makeMsg('assistant', 'hello')], true);
    expect(result).toEqual([]);
  });

  it('returns empty for less than 2 messages', () => {
    const result = computeFollowUpSuggestions([makeMsg('user', 'hi')], false);
    expect(result).toEqual([]);
  });

  it('returns code suggestions for HTML code blocks', () => {
    const result = computeFollowUpSuggestions([
      makeMsg('user', 'create a page'),
      makeMsg('assistant', 'Here is the code:\n```html\n<h1>Hello</h1>\n```'),
    ], false);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it('returns generic suggestions for text-only response', () => {
    const result = computeFollowUpSuggestions([
      makeMsg('user', 'what is React?'),
      makeMsg('assistant', 'React is a JavaScript library for building user interfaces.'),
    ], false);
    expect(result).toContain('Show me the code');
  });

  it('returns CSS suggestions for CSS code blocks', () => {
    const result = computeFollowUpSuggestions([
      makeMsg('user', 'style it'),
      makeMsg('assistant', '```css\n.container { display: flex; }\n```'),
    ], false);
    expect(result).toContain('Add hover effects');
  });
});
