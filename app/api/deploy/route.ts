/**
 * Deploy API Route â€” Auto-deploy to Vercel
 * 
 * Uses the server-side VERCEL_TOKEN to deploy generated HTML
 * to the owner's Vercel account. Users don't need their own token.
 * Supports single HTML or multi-file projects.
 */

import { NextRequest } from 'next/server';
import { deploySchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const VERCEL_API = 'https://api.vercel.com';

interface DeployFile {
  file: string;
  data: string;
  encoding?: string;
}

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.deploy);
  if (rateLimitError) return rateLimitError;

  const token = (process.env.VERCEL_DEPLOY_TOKEN || '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'VERCEL_DEPLOY_TOKEN not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: ReturnType<typeof deploySchema.parse>;
  try {
    body = deploySchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { html, files, projectName } = body;

  if (!html && (!files || Object.keys(files).length === 0)) {
    return new Response(JSON.stringify({ error: 'HTML content or files object is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const safeName = (projectName || 'aurion-app')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

  try {
    // Build file list â€” support both single HTML and multi-file projects
    const deployFiles: DeployFile[] = [];

    if (files && Object.keys(files).length > 0) {
      // Multi-file deployment
      for (const [filePath, content] of Object.entries(files)) {
        // Sanitize file path (prevent directory traversal)
        let safePath = filePath;
        while (safePath.includes('..')) safePath = safePath.replace(/\.\.\/?/g, '');
        safePath = safePath.replace(/^\/+/, '');
        if (safePath && content) {
          deployFiles.push({ file: safePath, data: content, encoding: 'utf-8' });
        }
      }
      // Ensure index.html exists
      if (!deployFiles.some(f => f.file === 'index.html')) {
        const firstHtml = deployFiles.find(f => f.file.endsWith('.html'));
        if (firstHtml) {
          deployFiles.push({ file: 'index.html', data: firstHtml.data, encoding: 'utf-8' });
        }
      }
    } else if (html) {
      // Single HTML deployment
      deployFiles.push({ file: 'index.html', data: html, encoding: 'utf-8' });
    }

    // Always add vercel.json for SPA routing
    deployFiles.push({
      file: 'vercel.json',
      data: JSON.stringify({
        rewrites: [{ source: "/(.*)", destination: "/index.html" }],
      }),
      encoding: 'utf-8',
    });

    // Deploy using Vercel's file-based deployment API
    const deployRes = await fetch(`${VERCEL_API}/v13/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: safeName,
        files: deployFiles,
        projectSettings: {
          framework: null,
        },
        target: 'production',
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!deployRes.ok) {
      const err = await deployRes.json().catch(() => ({}));
      return new Response(JSON.stringify({
        error: err?.error?.message || `Vercel API error: ${deployRes.status}`,
      }), {
        status: deployRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const deployData = await deployRes.json();

    // Disable Deployment Protection (Vercel Authentication) so the site is public
    try {
      await fetch(`${VERCEL_API}/v9/projects/${deployData.name}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ssoProtection: null,
        }),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      // Non-blocking â€” deploy still succeeded even if protection toggle fails
    }

    return new Response(JSON.stringify({
      success: true,
      url: `https://${deployData.url}`,
      projectName: deployData.name,
      deploymentId: deployData.id,
      readyState: deployData.readyState,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Deploy failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
