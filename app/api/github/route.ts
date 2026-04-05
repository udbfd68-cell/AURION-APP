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

/**
 * GET handler — Fetch repos, branches, commits, or diff
 * Query params:
 *   action=repos|branches|commits|diff
 *   token (required)
 *   owner, repo (for branches/commits/diff)
 *   branch (for commits)
 *   sha (for diff)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'repos';
    // Accept token from header (preferred) or query param (legacy fallback)
    const token = req.headers.get('x-github-token') || searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing GitHub token — pass via X-GitHub-Token header' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (action === 'repos') {
      // List user repos (recent 30)
      const resp = await fetch(`${GITHUB_API}/user/repos?sort=updated&per_page=30`, { headers });
      if (!resp.ok) return NextResponse.json({ error: 'Failed to fetch repos' }, { status: resp.status });
      const repos = await resp.json();
      return NextResponse.json(repos.map((r: Record<string, unknown>) => ({
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        url: r.html_url,
        description: r.description,
        updatedAt: r.updated_at,
        language: r.language,
        defaultBranch: r.default_branch,
      })));
    }

    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 });
    }

    if (action === 'branches') {
      const resp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=50`, { headers });
      if (!resp.ok) return NextResponse.json({ error: 'Failed to fetch branches' }, { status: resp.status });
      const branches = await resp.json();
      return NextResponse.json(branches.map((b: Record<string, unknown>) => ({
        name: b.name,
        sha: (b.commit as Record<string, unknown>)?.sha,
        protected: b.protected,
      })));
    }

    if (action === 'commits') {
      const branch = searchParams.get('branch') || 'main';
      const resp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=20`, { headers });
      if (!resp.ok) return NextResponse.json({ error: 'Failed to fetch commits' }, { status: resp.status });
      const commits = await resp.json();
      return NextResponse.json(commits.map((c: Record<string, unknown>) => ({
        sha: (c.sha as string)?.slice(0, 7),
        fullSha: c.sha,
        message: (c.commit as Record<string, unknown>)?.message || '',
        author: ((c.commit as Record<string, unknown>)?.author as Record<string, unknown>)?.name || '',
        date: ((c.commit as Record<string, unknown>)?.author as Record<string, unknown>)?.date || '',
        avatar: (c.author as Record<string, unknown>)?.avatar_url || '',
      })));
    }

    if (action === 'diff') {
      const sha = searchParams.get('sha');
      if (!sha) return NextResponse.json({ error: 'Missing commit SHA' }, { status: 400 });
      const resp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`, {
        headers: { ...headers, 'Accept': 'application/vnd.github.diff' },
      });
      if (!resp.ok) return NextResponse.json({ error: 'Failed to fetch diff' }, { status: resp.status });
      const diff = await resp.text();
      return NextResponse.json({ sha, diff: diff.slice(0, 100000) });
    }

    if (action === 'create-branch') {
      const branch = searchParams.get('branch');
      const from = searchParams.get('from') || 'main';
      if (!branch) return NextResponse.json({ error: 'Missing branch name' }, { status: 400 });
      // Get source branch SHA
      const refResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(from)}`, { headers });
      if (!refResp.ok) return NextResponse.json({ error: `Source branch "${from}" not found` }, { status: 404 });
      const refData = await refResp.json();
      const sha = refData.object.sha;
      const createResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, {
        method: 'POST', headers, body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
      });
      if (!createResp.ok) {
        const err = await createResp.json().catch(() => ({}));
        return NextResponse.json({ error: 'Failed to create branch', details: err }, { status: createResp.status });
      }
      return NextResponse.json({ success: true, branch, sha });
    }

    if (action === 'create-pr') {
      const title = searchParams.get('title') || 'Update from Aurion';
      const head = searchParams.get('head');
      const base = searchParams.get('base') || 'main';
      const body = searchParams.get('body') || '';
      if (!head) return NextResponse.json({ error: 'Missing head branch' }, { status: 400 });
      const prResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, {
        method: 'POST', headers, body: JSON.stringify({ title, head, base, body }),
      });
      if (!prResp.ok) {
        const err = await prResp.json().catch(() => ({}));
        return NextResponse.json({ error: 'Failed to create PR', details: err }, { status: prResp.status });
      }
      const pr = await prResp.json();
      return NextResponse.json({ success: true, number: pr.number, url: pr.html_url, title: pr.title, state: pr.state });
    }

    if (action === 'merge-pr') {
      const prNumber = searchParams.get('pr');
      const mergeMethod = searchParams.get('method') || 'merge'; // merge | squash | rebase
      if (!prNumber) return NextResponse.json({ error: 'Missing PR number' }, { status: 400 });
      const mergeResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(prNumber)}/merge`, {
        method: 'PUT', headers, body: JSON.stringify({ merge_method: mergeMethod }),
      });
      if (!mergeResp.ok) {
        const err = await mergeResp.json().catch(() => ({}));
        return NextResponse.json({ error: 'Failed to merge PR', details: err }, { status: mergeResp.status });
      }
      const merge = await mergeResp.json();
      return NextResponse.json({ success: true, sha: merge.sha, message: merge.message });
    }

    if (action === 'list-prs') {
      const state = searchParams.get('state') || 'open';
      const resp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=${encodeURIComponent(state)}&per_page=20`, { headers });
      if (!resp.ok) return NextResponse.json({ error: 'Failed to fetch PRs' }, { status: resp.status });
      const prs = await resp.json();
      return NextResponse.json(prs.map((pr: Record<string, unknown>) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
        head: (pr.head as Record<string, unknown>)?.ref,
        base: (pr.base as Record<string, unknown>)?.ref,
        author: (pr.user as Record<string, unknown>)?.login,
        avatar: (pr.user as Record<string, unknown>)?.avatar_url,
        createdAt: pr.created_at,
        mergeable: pr.mergeable,
      })));
    }

    if (action === 'merge-branch') {
      const head = searchParams.get('head');
      const base = searchParams.get('base') || 'main';
      if (!head) return NextResponse.json({ error: 'Missing head branch' }, { status: 400 });
      const mergeResp = await fetch(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/merges`, {
        method: 'POST', headers, body: JSON.stringify({ base, head, commit_message: `Merge ${head} into ${base}` }),
      });
      if (mergeResp.status === 409) {
        return NextResponse.json({ error: 'Merge conflict', conflict: true }, { status: 409 });
      }
      if (!mergeResp.ok) {
        const err = await mergeResp.json().catch(() => ({}));
        return NextResponse.json({ error: 'Merge failed', details: err }, { status: mergeResp.status });
      }
      const merge = await mergeResp.json();
      return NextResponse.json({ success: true, sha: merge.sha });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
