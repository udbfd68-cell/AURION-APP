import type { VirtualFS } from './client-utils';

/** Build a minimal ZIP file in memory from VirtualFS entries (no external library). */
export function buildProjectZip(files: VirtualFS): Blob | null {
  const fileEntries = Object.entries(files);
  if (fileEntries.length === 0) return null;

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const [name, file] of fileEntries) {
    const nameBytes = encoder.encode(name);
    const contentBytes = encoder.encode(file.content);

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lView = new DataView(localHeader.buffer);
    lView.setUint32(0, 0x04034b50, true);
    lView.setUint16(4, 20, true);
    lView.setUint16(6, 0, true);
    lView.setUint16(8, 0, true);
    lView.setUint16(10, 0, true);
    lView.setUint16(12, 0, true);
    lView.setUint32(14, 0, true);
    lView.setUint32(18, contentBytes.length, true);
    lView.setUint32(22, contentBytes.length, true);
    lView.setUint16(26, nameBytes.length, true);
    lView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    // Central directory entry
    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(cdEntry.buffer);
    cView.setUint32(0, 0x02014b50, true);
    cView.setUint16(4, 20, true);
    cView.setUint16(6, 20, true);
    cView.setUint16(8, 0, true);
    cView.setUint16(10, 0, true);
    cView.setUint16(12, 0, true);
    cView.setUint16(14, 0, true);
    cView.setUint32(16, 0, true);
    cView.setUint32(20, contentBytes.length, true);
    cView.setUint32(24, contentBytes.length, true);
    cView.setUint16(28, nameBytes.length, true);
    cView.setUint16(30, 0, true);
    cView.setUint16(32, 0, true);
    cView.setUint16(34, 0, true);
    cView.setUint16(36, 0, true);
    cView.setUint32(38, 0, true);
    cView.setUint32(42, offset, true);
    cdEntry.set(nameBytes, 46);

    parts.push(localHeader, contentBytes);
    centralDir.push(cdEntry);
    offset += localHeader.length + contentBytes.length;
  }

  let cdSize = 0;
  for (const c of centralDir) cdSize += c.length;
  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054b50, true);
  eView.setUint16(4, 0, true);
  eView.setUint16(6, 0, true);
  eView.setUint16(8, fileEntries.length, true);
  eView.setUint16(10, fileEntries.length, true);
  eView.setUint32(12, cdSize, true);
  eView.setUint32(16, offset, true);
  eView.setUint16(20, 0, true);

  return new Blob(
    [...parts, ...centralDir, eocd].map(b => b.buffer as ArrayBuffer),
    { type: 'application/zip' },
  );
}

/** Downloads project files as a ZIP. Returns the number of files, or 0 if empty. */
export function downloadProjectAsZip(files: VirtualFS, filename = 'aurion-project.zip'): number {
  const blob = buildProjectZip(files);
  if (!blob) return 0;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return Object.keys(files).length;
}
