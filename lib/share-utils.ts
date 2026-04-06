import type { VirtualFS } from './client-utils';

/** Compress project files via gzip → base64url. Returns the encoded string. */
export async function compressProject(files: VirtualFS): Promise<string> {
  const json = JSON.stringify(files);
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const compressed = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
  let offset = 0;
  for (const c of chunks) { compressed.set(c, offset); offset += c.length; }
  let b64 = '';
  for (let i = 0; i < compressed.length; i++) b64 += String.fromCharCode(compressed[i]);
  return btoa(b64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Compress project files into a shareable URL string. */
export async function buildShareUrl(files: VirtualFS): Promise<string> {
  try {
    const hash = await compressProject(files);
    return `${window.location.origin}${window.location.pathname}#project=${hash}`;
  } catch {
    // Fallback: uncompressed base64
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(files))));
    return `${window.location.origin}${window.location.pathname}#project=${b64}`;
  }
}

/** Decompress project from a base64url hash. Returns null on failure. */
export async function decompressProject(encoded: string): Promise<VirtualFS | null> {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const result = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
    let off = 0;
    for (const c of chunks) { result.set(c, off); off += c.length; }
    const json = new TextDecoder().decode(result);
    const files = JSON.parse(json) as VirtualFS;
    if (files && typeof files === 'object' && Object.keys(files).length > 0) return files;
    return null;
  } catch {
    // Fallback: uncompressed base64
    try {
      const json = decodeURIComponent(escape(atob(encoded)));
      const files = JSON.parse(json) as VirtualFS;
      if (files && typeof files === 'object' && Object.keys(files).length > 0) return files;
      return null;
    } catch { return null; }
  }
}
