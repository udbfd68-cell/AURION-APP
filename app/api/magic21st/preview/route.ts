import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/magic21st/preview?code=<base64>
 * Renders a React/Tailwind component as a static HTML preview page.
 * The component code is converted to pure HTML with Tailwind CDN.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return new NextResponse('Missing code parameter', { status: 400 });
  }

  let decoded: string;
  try {
    decoded = atob(code);
  } catch {
    return new NextResponse('Invalid base64', { status: 400 });
  }

  // Strip React-specific syntax: imports, "use client", export statements
  let cleaned = decoded
    .replace(/^["']use client["'];?\s*/gm, '')
    .replace(/^import\s+.*?;\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');

  // Extract JSX from the return statement of a function component
  const returnMatch = cleaned.match(/return\s*\(\s*([\s\S]*)\s*\)\s*;?\s*\}[\s\S]*$/);
  let jsx = returnMatch ? returnMatch[1] : cleaned;

  // Convert common React JSX patterns to HTML
  jsx = jsx
    .replace(/className=/g, 'class=')
    .replace(/htmlFor=/g, 'for=')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')              // Remove JSX comments
    .replace(/\{`([^`]*)`\}/g, '$1')                     // Template literals → text
    .replace(/\{"([^"]*)"\}/g, '$1')                      // String expressions → text
    .replace(/\{'([^']*)'\}/g, '$1')                      // String expressions → text
    .replace(/<(\w+)([^>]*)\s\/>/g, '<$1$2></$1>')       // Self-closing → explicit close
    .replace(/strokeWidth=/g, 'stroke-width=')
    .replace(/strokeLinecap=/g, 'stroke-linecap=')
    .replace(/strokeLinejoin=/g, 'stroke-linejoin=')
    .replace(/viewBox=/g, 'viewBox=')
    .replace(/fillRule=/g, 'fill-rule=')
    .replace(/clipRule=/g, 'clip-rule=')
    .replace(/\{[^{}]*\}/g, '')                           // Remove remaining JS expressions
    .replace(/<>/g, '<div>').replace(/<\/>/g, '</div>');   // Fragments → divs

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            background: '#09090b',
            foreground: '#fafafa',
            primary: { DEFAULT: '#818cf8', foreground: '#fff' },
            'primary-foreground': '#fff',
            secondary: { DEFAULT: '#27272a', foreground: '#fafafa' },
            'secondary-foreground': '#fafafa',
            muted: { DEFAULT: '#27272a', foreground: '#a1a1aa' },
            'muted-foreground': '#a1a1aa',
            accent: { DEFAULT: '#27272a', foreground: '#fafafa' },
            'accent-foreground': '#fafafa',
            destructive: { DEFAULT: '#ef4444', foreground: '#fff' },
            border: '#27272a',
            input: '#27272a',
            ring: '#818cf8',
          },
          borderRadius: { lg: '0.5rem', md: '0.375rem', sm: '0.25rem' },
        }
      }
    }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #09090b;
      color: #fafafa;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 12px;
    }
    body > div, body > section, body > main, body > article {
      width: 100%;
      max-width: 100%;
    }
    img { max-width: 100%; height: auto; }
    a { color: inherit; text-decoration: none; }
    /* Scale down large components to fit the preview */
    @media (max-height: 350px) {
      body { transform: scale(0.6); transform-origin: center center; }
    }
  </style>
</head>
<body class="dark">
  ${jsx}
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
