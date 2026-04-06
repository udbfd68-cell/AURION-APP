/* Client-side utility functions extracted from page.tsx */

/* ────────── Fetch with Retry + Timeout ────────── */
async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  maxRetries = 0,
): Promise<Response> {
  const { timeout = 0, ...fetchOpts } = options;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    if (fetchOpts.signal) {
      fetchOpts.signal.addEventListener('abort', () => controller.abort(), { once: true });
      if (fetchOpts.signal.aborted) { controller.abort(); }
    }
    const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
      if (timer) clearTimeout(timer);
      if (!res.ok && res.status >= 500 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return res;
    } catch (err: unknown) {
      if (timer) clearTimeout(timer);
      const isAbort = (err as Error).name === 'AbortError';
      if (isAbort && fetchOpts.signal?.aborted) throw err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      if (isAbort && !fetchOpts.signal?.aborted) {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw err;
    }
  }
  throw new Error('Request failed');
}

/* ────────── IndexedDB helpers ────────── */
const IDB_NAME = 'aurion_db';
const IDB_STORE = 'project_files';
const IDB_VERSION = 1;

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }));
}

function idbSet(key: string, val: unknown): Promise<void> {
  return openIDB().then(db => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  })).catch((err: DOMException | null) => {
    // Handle QuotaExceededError: clean up old entries and retry once
    if (err?.name === 'QuotaExceededError') {
      return idbCleanup().then(() =>
        openIDB().then(db => new Promise<void>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(val, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }))
      );
    }
    throw err;
  });
}

/** Remove old project VFS snapshots when storage is running low */
function idbCleanup(): Promise<void> {
  return openIDB().then(db => new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = req.result as string[];
      // Remove old project VFS entries (keep current project + index)
      const vfsKeys = keys.filter(k => k.startsWith('vfs_') && k !== 'vfs');
      // Keep the 5 most recent, delete the rest
      if (vfsKeys.length > 5) {
        const toDelete = vfsKeys.slice(0, vfsKeys.length - 5);
        for (const k of toDelete) {
          store.delete(k);
        }
      }
      resolve();
    };
    req.onerror = () => resolve();
  }));
}

/* ────────── Types ────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ProjectFile {
  content: string;
  language: string;
}

type VirtualFS = Record<string, ProjectFile>;

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css', js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript', json: 'json', md: 'markdown',
    py: 'python', sql: 'sql', sh: 'bash', yml: 'yaml', yaml: 'yaml',
    svg: 'xml', xml: 'xml', env: 'bash', toml: 'toml',
  };
  return map[ext] || 'plaintext';
}

function buildFileTree(files: VirtualFS): { dirs: Set<string>; entries: { path: string; name: string; depth: number; isDir: boolean }[] } {
  const dirs = new Set<string>();
  const allPaths = Object.keys(files).sort();
  for (const p of allPaths) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  const entries: { path: string; name: string; depth: number; isDir: boolean }[] = [];
  const sortedAll = [...Array.from(dirs), ...allPaths].sort((a, b) => {
    const aParts = a.split('/'), bParts = b.split('/');
    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
      if (aParts[i] !== bParts[i]) {
        const aIsDir = i < aParts.length - 1 || dirs.has(a);
        const bIsDir = i < bParts.length - 1 || dirs.has(b);
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
        return aParts[i].localeCompare(bParts[i]);
      }
    }
    return aParts.length - bParts.length;
  });
  const seen = new Set<string>();
  for (const p of sortedAll) {
    if (seen.has(p)) continue;
    seen.add(p);
    const parts = p.split('/');
    const isDir = dirs.has(p);
    entries.push({ path: p, name: parts[parts.length - 1], depth: parts.length - 1, isDir });
  }
  return { dirs, entries };
}


export { fetchWithRetry, openIDB, idbGet, idbSet, idbCleanup, detectLanguage, buildFileTree, IDB_NAME, IDB_STORE, IDB_VERSION };
export type { Message, ProjectFile, VirtualFS };
