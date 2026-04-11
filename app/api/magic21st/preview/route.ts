import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/** Find the largest return(...) block using balanced parentheses */
function extractReturnJsx(code: string): string | null {
  const results: string[] = [];
  let searchFrom = 0;
  while (true) {
    const idx = code.indexOf('return (', searchFrom);
    if (idx === -1) break;
    const after = code.slice(idx + 7);
    let depth = 0, start = -1, end = -1;
    for (let i = 0; i < after.length; i++) {
      if (after[i] === '(') { if (depth === 0) start = i; depth++; }
      else if (after[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (start !== -1 && end !== -1) results.push(after.slice(start + 1, end).trim());
    searchFrom = idx + 1;
  }
  if (results.length === 0) return null;
  return results.reduce((a, b) => (a.length > b.length ? a : b));
}

/**
 * GET /api/magic21st/preview?code=<base64>
 * Renders a React/Tailwind component as a static HTML preview page.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return new NextResponse('Missing code parameter', { status: 400 });

  let decoded: string;
  try { decoded = atob(code); } catch { return new NextResponse('Invalid base64', { status: 400 }); }

  // Strip non-visual code
  let text = decoded
    .replace(/^["']use client["'];?\s*/gm, '')
    .replace(/^import\b.*$/gm, '')
    .replace(/(?:export\s+)?(?:interface|type)\s+\w+[^{]*\{[^}]*\}/gm, '')
    .replace(/^export\s+default\s+function/gm, 'function')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/:\s*(?:\w+(?:Props|Type|Interface)|React\.\w+|string|number|boolean)(?:\[\])?\s*/g, ' ');

  let jsx = extractReturnJsx(text);
  if (!jsx) { const m = text.match(/=>\s*\(([\s\S]+)\)\s*;?\s*(?:\}|$)/); jsx = m ? m[1] : text; }

  // Convert JSX → HTML
  jsx = jsx
    .replace(/className=/g, 'class=')
    .replace(/htmlFor=/g, 'for=')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\{`([^`]*)`\}/g, '$1')
    .replace(/\{"([^"]*)"\}/g, '$1')
    .replace(/\{'([^']*)'\}/g, '$1')
    .replace(/<(\w+)([^>]*)\s\/>/g, '<$1$2></$1>');

  for (let i = 0; i < 20; i++) { const prev: string = jsx; jsx = jsx.replace(/\{[^{}]*\}/g, ''); if (jsx === prev) break; }

  jsx = jsx
    .replace(/<([A-Z][a-zA-Z0-9]*)([\s>\/])/g, '<div$2')
    .replace(/<\/[A-Z][a-zA-Z0-9]*>/g, '</div>')
    .replace(/strokeWidth=/g, 'stroke-width=')
    .replace(/strokeLinecap=/g, 'stroke-linecap=')
    .replace(/strokeLinejoin=/g, 'stroke-linejoin=')
    .replace(/fillRule=/g, 'fill-rule=')
    .replace(/clipRule=/g, 'clip-rule=')
    .replace(/<>/g, '<div>').replace(/<\/>/g, '</div>');

  const html = `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config={darkMode:'class',theme:{extend:{colors:{background:'#09090b',foreground:'#fafafa',primary:{DEFAULT:'#818cf8',foreground:'#fff'},secondary:{DEFAULT:'#27272a',foreground:'#fafafa'},muted:{DEFAULT:'#27272a',foreground:'#a1a1aa'},accent:{DEFAULT:'#27272a',foreground:'#fafafa'},destructive:{DEFAULT:'#ef4444',foreground:'#fff'},border:'#27272a',input:'#27272a',ring:'#818cf8',card:{DEFAULT:'#111',foreground:'#fafafa'}},borderRadius:{lg:'0.5rem',md:'calc(0.5rem - 2px)',sm:'calc(0.5rem - 4px)'}}}}</script>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#09090b;color:#fafafa;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}body>*{max-width:100%}img{max-width:100%;height:auto}a{color:inherit;text-decoration:none}</style>
</head><body class="dark">${jsx}</body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
