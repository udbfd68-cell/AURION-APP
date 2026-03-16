export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { code, timeout = 5000 } = await req.json();

    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'Missing code' }, { status: 400 });
    }

    if (code.length > 5000) {
      return Response.json({ error: 'Code too long (max 5KB)' }, { status: 400 });
    }

    // Normalize code for pattern checking (collapse whitespace, lowercase for some checks)
    const normalized = code.replace(/\s+/g, ' ');

    // Block dangerous patterns — comprehensive list to prevent sandbox escape
    const blocked = [
      /\bfetch\b/i,
      /\bimport\b/i,
      /\brequire\b/i,
      /\bprocess\b/i,
      /\bglobalThis\b/i,
      /\beval\b/i,
      /\bFunction\b/,
      /\bself\b/,
      /\bwindow\b/i,
      /\bdocument\b/i,
      /\bXMLHttpRequest\b/i,
      /\bWebSocket\b/i,
      /\bWorker\b/,
      /\bSharedWorker\b/,
      /\bServiceWorker\b/,
      /\bProxy\b/,
      /\bReflect\b/,
      /\.constructor\b/,         // blocks constructor chain escapes
      /\.__proto__\b/,
      /\bprototype\b/,
      /\[\s*['"`]/,              // blocks bracket notation like self['fetch']
      /\\x[0-9a-f]{2}/i,        // blocks hex escape sequences
      /\\u[0-9a-f]{4}/i,        // blocks unicode escapes
      /String\.fromCharCode/i,   // blocks string building
      /atob\s*\(/i,             // blocks base64 decoding
      /decodeURI/i,             // blocks URI decoding
    ];

    for (const pattern of blocked) {
      if (pattern.test(normalized)) {
        return Response.json({ error: `Blocked: potentially unsafe pattern detected` }, { status: 400 });
      }
    }

    // Execute in a tightly constrained scope — shadow all dangerous globals
    const wrappedCode = `
      'use strict';
      const console = {
        _logs: [],
        log(...args) { this._logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')); },
        warn(...args) { this.log(...args); },
        error(...args) { this.log(...args); },
        info(...args) { this.log(...args); },
        table(data) { this.log(JSON.stringify(data, null, 2)); },
      };
      const setTimeout = undefined;
      const setInterval = undefined;
      const queueMicrotask = undefined;
      const fetch = undefined;
      const XMLHttpRequest = undefined;
      const WebSocket = undefined;
      const Worker = undefined;
      const importScripts = undefined;
      const self = undefined;
      const globalThis = undefined;

      try {
        ${code}
        return { logs: console._logs, result: undefined };
      } catch (e) {
        return { logs: console._logs, error: e.message || String(e) };
      }
    `;

    const fn = new Function(wrappedCode);

    const timer = setTimeout(() => { /* noop — edge runtime handles timeout */ }, timeout);

    try {
      const output = fn();
      clearTimeout(timer);
      return Response.json(output);
    } catch (err: unknown) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      return Response.json({ logs: [], error: msg });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Execution failed';
    return Response.json({ error: msg }, { status: 500 });
  }
}
