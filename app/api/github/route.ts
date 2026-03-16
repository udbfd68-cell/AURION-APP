/**
 * GitHub Proxy Route — Create repos and push files via GitHub REST API
 * 
 * Uses the user's PAT (Personal Access Token) to create a repository
 * and push files from the VFS. No packages needed — pure fetch.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GITHUB_API = 'https://api.github.com';

export async function POST(req: NextRequest) {
  try {
    const { token, repoName, files, isPrivate, description } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing GitHub token' }, { status: 400 });
    }
    if (!repoName) {
      return NextResponse.json({ error: 'Missing repository name' }, { status: 400 });
    }
    if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
      return NextResponse.json({ error: 'No files to push' }, { status: 400 });
    }

    // Sanitize repo name
    if (!/^[a-zA-Z0-9._-]+$/.test(repoName)) {
      return NextResponse.json({ error: 'Invalid repository name. Use alphanumeric, dots, hyphens, and underscores only.' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Step 1: Get authenticated user
    const userResp = await fetch(`${GITHUB_API}/user`, { headers });
    if (!userResp.ok) {
      const err = await userResp.json().catch(() => ({}));
      return NextResponse.json({ error: 'Invalid GitHub token', details: err }, { status: 401 });
    }
    const user = await userResp.json();
    const owner = user.login;

    // Step 2: Create repo (or use existing)
    let repoExists = false;
    const checkResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`, { headers });
    if (checkResp.ok) {
      repoExists = true;
    } else {
      const createResp = await fetch(`${GITHUB_API}/user/repos`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: repoName,
          private: isPrivate ?? false,
          description: description || 'Created with Aurion',
          auto_init: true,
        }),
      });
      if (!createResp.ok) {
        const err = await createResp.json().catch(() => ({}));
        return NextResponse.json({ error: 'Failed to create repository', details: err }, { status: createResp.status });
      }
      // Wait a moment for GitHub to initialize the repo
      await new Promise(r => setTimeout(r, 1500));
    }

    // Step 3: Get the current commit SHA (default branch)
    const refResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/ref/heads/main`, { headers });
    if (!refResp.ok) {
      return NextResponse.json({ error: 'Repository not ready. Try again in a moment.', repoUrl: `https://github.com/${owner}/${repoName}` }, { status: 409 });
    }
    const refData = await refResp.json();
    const latestCommitSha = refData.object.sha;

    // Step 4: Get the base tree
    const commitResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/commits/${latestCommitSha}`, { headers });
    const commitData = await commitResp.json();
    const baseTreeSha = commitData.tree.sha;

    // Step 5: Create blobs for each file
    const tree: { path: string; mode: string; type: string; sha: string }[] = [];
    
    for (const [filePath, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue;
      
      const blobResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: content,
          encoding: 'utf-8',
        }),
      });

      if (!blobResp.ok) continue;
      const blobData = await blobResp.json();
      
      tree.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    if (tree.length === 0) {
      return NextResponse.json({ error: 'No files could be uploaded' }, { status: 400 });
    }

    // Step 6: Create tree
    const treeResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree,
      }),
    });
    const treeData = await treeResp.json();

    // Step 7: Create commit
    const newCommitResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: repoExists ? `Update from Aurion (${tree.length} files)` : `Initial commit from Aurion (${tree.length} files)`,
        tree: treeData.sha,
        parents: [latestCommitSha],
      }),
    });
    const newCommitData = await newCommitResp.json();

    // Step 8: Update ref
    await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/git/refs/heads/main`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: newCommitData.sha }),
    });

    return NextResponse.json({
      success: true,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      commitSha: newCommitData.sha,
      filesCount: tree.length,
      isNew: !repoExists,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
