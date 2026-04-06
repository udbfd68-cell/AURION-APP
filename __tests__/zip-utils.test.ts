import { describe, it, expect } from 'vitest';
import { buildProjectZip, downloadProjectAsZip } from '../lib/zip-utils';

describe('buildProjectZip', () => {
  it('returns null for empty files', () => {
    expect(buildProjectZip({})).toBeNull();
  });

  it('returns a Blob with correct MIME type', () => {
    const blob = buildProjectZip({
      'index.html': { content: '<h1>Hello</h1>', language: 'html' },
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.type).toBe('application/zip');
  });

  it('produces a valid ZIP starting with PK signature', async () => {
    const blob = buildProjectZip({
      'test.txt': { content: 'Hello World', language: 'plaintext' },
    });
    const buffer = await blob!.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // ZIP local file header signature: PK\x03\x04
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4B); // K
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });

  it('includes multiple files', async () => {
    const blob = buildProjectZip({
      'a.txt': { content: 'A', language: 'plaintext' },
      'b.txt': { content: 'B', language: 'plaintext' },
      'c.txt': { content: 'C', language: 'plaintext' },
    });
    const buffer = await blob!.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // EOCD record should say 3 entries
    // Find EOCD signature (0x06054b50) from the end
    let eocdOffset = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4B && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        eocdOffset = i;
        break;
      }
    }
    expect(eocdOffset).toBeGreaterThan(-1);
    const view = new DataView(buffer, eocdOffset);
    // Number of entries in central directory (offset 10)
    expect(view.getUint16(10, true)).toBe(3);
  });

  it('stores file content correctly', async () => {
    const content = 'Test content 123';
    const blob = buildProjectZip({
      'test.txt': { content, language: 'plaintext' },
    });
    const buffer = await blob!.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Content should appear as-is (stored, no compression)
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    // Find the content in the blob after the local file header
    const nameLen = 'test.txt'.length;
    const dataStart = 30 + nameLen; // local header is 30 bytes + filename
    for (let i = 0; i < contentBytes.length; i++) {
      expect(bytes[dataStart + i]).toBe(contentBytes[i]);
    }
  });
});

describe('downloadProjectAsZip', () => {
  it('returns 0 for empty files', () => {
    expect(downloadProjectAsZip({})).toBe(0);
  });

  it('returns file count for non-empty files', () => {
    // In test env, document.createElement and URL.createObjectURL may not work fully,
    // but the function should still return the count
    const result = downloadProjectAsZip({
      'a.html': { content: '<p>A</p>', language: 'html' },
      'b.css': { content: 'body {}', language: 'css' },
    });
    expect(result).toBe(2);
  });
});
