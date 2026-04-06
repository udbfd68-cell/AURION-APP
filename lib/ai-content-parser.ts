/**
 * Pure parser for AI-generated content.
 * Extracts file definitions and action commands from streaming AI output.
 * No side-effects — returns structured data for the caller to apply.
 */

export interface ParsedFile {
  path: string;
  content: string;
  id: string;
}

export interface ParsedAction {
  type: string;
  payload: string;
  id: string;
}

export interface ParseResult {
  files: ParsedFile[];
  codeBlocks: ParsedFile[];
  actions: ParsedAction[];
}

const LANG_TO_FILENAME: Record<string, string> = {
  html: 'index.html',
  jsx: 'App.jsx',
  tsx: 'App.tsx',
  css: 'styles.css',
  js: 'script.js',
  javascript: 'script.js',
  typescript: 'script.ts',
};

/**
 * Parse AI content for file tags, code blocks, and action commands.
 * Deduplicates using the provided `seenIds` set (mutated in-place).
 */
export function parseAIContent(content: string, seenIds: Set<string>): ParseResult {
  const files: ParsedFile[] = [];
  const codeBlocks: ParsedFile[] = [];
  const actions: ParsedAction[] = [];

  // Phase 1: Closed file tags — <<FILE:path>>...<</FILE>> AND <FILE:path>...</FILE>
  const closedFilePatterns = [
    /<<FILE:([^>]+)>>([\s\S]*?)<<\/FILE>>/g,
    /<FILE:([^>]+)>([\s\S]*?)<\/FILE>/g,
  ];
  for (const regex of closedFilePatterns) {
    let m;
    while ((m = regex.exec(content)) !== null) {
      const id = 'file_' + m[0].slice(0, 30) + '_' + m.index;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const path = m[1].trim();
      const fileContent = m[2].trim();
      if (path && fileContent) {
        files.push({ path, content: fileContent, id });
      }
    }
  }

  // Phase 2: Unclosed file tags — streaming partial content
  const unclosedFilePatterns = [
    /<<FILE:([^>]+)>>([\s\S]+?)(?=<<FILE:|$)/g,
    /<FILE:([^>]+)>([\s\S]+?)(?=<FILE:|$)/g,
  ];
  for (const regex of unclosedFilePatterns) {
    let m;
    while ((m = regex.exec(content)) !== null) {
      const path = m[1].trim();
      let fileContent = m[2].trim();
      fileContent = fileContent.replace(/<\/?FILE>/gi, '').replace(/<<\/FILE>>/g, '');
      if (path.endsWith('.html')) {
        const htmlEnd = fileContent.search(/<\/html>/i);
        if (htmlEnd !== -1) fileContent = fileContent.slice(0, htmlEnd + 7);
      }
      if (path && fileContent && fileContent.length > 50) {
        const id = 'unclosed_' + path + '_' + fileContent.length;
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        files.push({ path, content: fileContent, id });
      }
    }
  }

  // Phase 3: Code blocks — ```lang ... ```
  const codeBlockRegex = /```(html|jsx|tsx|css|js|javascript|typescript)\s*\n([\s\S]*?)```/g;
  let cbMatch;
  while ((cbMatch = codeBlockRegex.exec(content)) !== null) {
    const lang = cbMatch[1];
    const code = cbMatch[2].trim();
    if (code.length < 50) continue;
    const id = 'codeblock_' + lang + '_' + cbMatch.index;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const fileName = LANG_TO_FILENAME[lang] || `file.${lang}`;
    codeBlocks.push({ path: fileName, content: code, id });
  }

  // Phase 4: Action tags — <<ACTION:payload>>
  const actionRegex = /<<(TERMINAL|CONNECT|DEPLOY|TAB|CLONE|SHOW_TERMINAL|SHOW_INTEGRATIONS|LTX_VIDEO|GEMINI_IMAGE|STITCH):?([^>]*)>>/g;
  let am;
  while ((am = actionRegex.exec(content)) !== null) {
    const id = am[0] + am.index;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    actions.push({ type: am[1], payload: am[2], id });
  }

  return { files, codeBlocks, actions };
}
