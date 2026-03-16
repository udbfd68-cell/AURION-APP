/**
 * Deploy API Route — Auto-deploy to Vercel
 * 
 * Uses the server-side VERCEL_TOKEN to deploy generated HTML
 * to the owner's Vercel account. Users don't need their own token.
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

const VERCEL_API = 'https://api.vercel.com';

export async function POST(req: NextRequest) {
  const token = process.env.VERCEL_DEPLOY_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'VERCEL_DEPLOY_TOKEN not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { html: string; projectName?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { html, projectName } = body;

  if (!html) {
    return new Response(JSON.stringify({ error: 'HTML content is required' }), {
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
    // Deploy using Vercel's file-based deployment API
    const deployRes = await fetch(`${VERCEL_API}/v13/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: safeName,
        files: [
          {
            file: 'index.html',
            data: html,
            encoding: 'utf-8',
          },
          {
            file: 'vercel.json',
            data: JSON.stringify({
              rewrites: [{ source: "/(.*)", destination: "/index.html" }],
            }),
            encoding: 'utf-8',
          },
        ],
        projectSettings: {
          framework: null,
        },
        target: 'production',
      }),
      signal: AbortSignal.timeout(30000),
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
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Non-blocking — deploy still succeeded even if protection toggle fails
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
