import { describe, it, expect } from 'vitest';
import { buildPreviewHtml } from '@/lib/preview-builder';

const baseOpts = {
  isEditMode: false,
  layoutDebugActive: false,
  previewDarkMode: 'auto',
  gridFlexDebugActive: false,
};

describe('buildPreviewHtml', () => {
  it('replaces Gemini image placeholders with placehold.co URLs', () => {
    const html = '<html><head></head><body><img src="__GEMINI_IMAGE_hero123__"></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('placehold.co/800x600');
    expect(result).toContain('hero123');
    expect(result).not.toContain('__GEMINI_IMAGE_');
  });

  it('replaces LTX video placeholder', () => {
    const html = '<html><head></head><body><video src="__LTX_VIDEO_URL__"></video></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).not.toContain('__LTX_VIDEO_URL__');
  });

  it('strips Tailwind CDN script tags', () => {
    const html = '<html><head><script src="https://cdn.tailwindcss.com"></script></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('tailwind cdn removed');
    expect(result).not.toContain('cdn.tailwindcss.com');
  });

  it('injects premium fonts if not present', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('fonts.googleapis.com');
  });

  it('does not inject fonts if already present', () => {
    const html = '<html><head><link href="https://fonts.googleapis.com/css2?family=Inter"></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    // Should only have one fonts.googleapis reference (the original)
    const matches = result.match(/fonts\.googleapis\.com/g);
    expect(matches).toHaveLength(1);
  });

  it('injects design system CSS when not present', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('aurion-design-system');
  });

  it('does not inject design CSS when own CSS vars exist', () => {
    // Build HTML with sufficient inline CSS containing CSS vars
    const inlineCSS = ':root { --primary: #000; }' + ' '.repeat(300);
    const html = `<html><head><style>${inlineCSS}</style></head><body></body></html>`;
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).not.toContain('aurion-design-system');
  });

  it('injects GSAP CDN when gsap is referenced', () => {
    const html = '<html><head></head><body><script>gsap.to(".box", {x: 100})</script></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('gsap.min.js');
  });

  it('injects Lenis CDN when Lenis is referenced', () => {
    const html = '<html><head></head><body><script>new Lenis()</script></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('lenis.min.js');
  });

  it('injects Font Awesome when fa- classes are used', () => {
    const html = '<html><head></head><body><i class="fas fa-home"></i></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('font-awesome');
  });

  it('includes error capture script in non-edit mode', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('aurion_error');
    expect(result).toContain('aurion_console');
  });

  it('includes link interceptor in non-edit mode', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('e.preventDefault');
  });

  it('injects layout debugger CSS when active', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts, layoutDebugActive: true });
    expect(result).toContain('outline:1px solid rgba(59,130,246');
  });

  it('injects dark mode filter when previewDarkMode is dark', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts, previewDarkMode: 'dark' });
    expect(result).toContain('filter:invert(1)');
  });

  it('injects light mode CSS when previewDarkMode is light', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts, previewDarkMode: 'light' });
    expect(result).toContain('background:#fff');
  });

  it('injects grid/flex visualizer CSS when active', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts, gridFlexDebugActive: true });
    expect(result).toContain('#ec4899');
    expect(result).toContain('#a855f7');
  });

  it('produces visual editor script in edit mode', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts, isEditMode: true });
    expect(result).toContain('__ed_tb');
    expect(result).toContain('__ed_mv');
    expect(result).toContain('contentEditable');
    expect(result).toContain('notifySync');
  });

  it('includes drag handle in edit mode', () => {
    const html = '<html><head></head><body></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts, isEditMode: true });
    expect(result).toContain('Drag to move');
    expect(result).toContain('mvDrag');
  });

  it('injects scripts before </body> when tag exists', () => {
    const html = '<html><head></head><body><p>Hello</p></body></html>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    // Scripts should be before </body>
    const bodyEndIdx = result.indexOf('</body>');
    const scriptIdx = result.indexOf('aurion_error');
    expect(scriptIdx).toBeLessThan(bodyEndIdx);
  });

  it('appends scripts at end when no </body> tag', () => {
    const html = '<p>Hello world</p>';
    const result = buildPreviewHtml({ rawHtml: html, ...baseOpts });
    expect(result).toContain('aurion_error');
    expect(result.indexOf('Hello world')).toBeLessThan(result.indexOf('aurion_error'));
  });
});
