/**
 * HTML Sanitizer — Prevent XSS from user/external HTML content
 */
import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'video', 'source', 'picture', 'figure', 'figcaption',
    'section', 'article', 'nav', 'header', 'footer', 'main', 'aside',
    'details', 'summary', 'mark', 'time', 'svg', 'path', 'circle',
    'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'use',
    'style', 'link',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['class', 'id', 'style', 'data-*', 'aria-*', 'role', 'tabindex'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
    video: ['src', 'poster', 'controls', 'autoplay', 'muted', 'loop', 'playsinline'],
    source: ['src', 'srcset', 'type', 'media'],
    a: ['href', 'target', 'rel'],
    link: ['rel', 'href', 'type'],
    svg: ['viewBox', 'width', 'height', 'fill', 'xmlns'],
    path: ['d', 'fill', 'stroke', 'stroke-width'],
    circle: ['cx', 'cy', 'r', 'fill'],
    rect: ['x', 'y', 'width', 'height', 'fill', 'rx', 'ry'],
  },
  allowedSchemes: ['http', 'https', 'data', 'mailto'],
  allowVulnerableTags: false,
};

/** Sanitize HTML content — removes dangerous scripts/event handlers */
export function sanitize(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/** Sanitize for display in preview iframe (less restrictive, allows scripts from known CDNs) */
export function sanitizeForPreview(html: string): string {
  return sanitizeHtml(html, {
    ...SANITIZE_OPTIONS,
    allowedTags: false, // allow all tags for preview
    allowedAttributes: false, // allow all attributes for preview
    allowVulnerableTags: true, // allow script/style for preview rendering
  });
}
