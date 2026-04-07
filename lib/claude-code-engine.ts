/**
 * Claude Code Intelligence Engine v4.2 — REAL, No Theater
 * 
 * What this file does:
 * - Error classification + smart retry with exponential backoff
 * - Parallel execution with error isolation (used by research-orchestrator)
 * - HTML compression for prompt injection
 * - Prompt budget management
 * - Output quality validation with 14 real checks + severity scores
 * - Post-processing pipeline (auto-fix broken HTML)
 * - Subsystem detection (notebooklm, stitch)
 * - Continuation prompt for truncated output
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export type ErrorClass =
  | 'auth_failure'
  | 'rate_limit'
  | 'server_error'
  | 'context_overflow'
  | 'output_truncated'
  | 'invalid_input'
  | 'timeout'
  | 'network'
  | 'model_error'
  | 'unknown';

export function classifyError(status: number, message: string): ErrorClass {
  if (status === 401 || status === 403 || /auth|unauthorized|forbidden/i.test(message)) return 'auth_failure';
  if (status === 429 || /rate.?limit|too.?many.?requests|quota/i.test(message)) return 'rate_limit';
  if (status === 413 || /prompt.?too.?long|context.?length|token.?limit/i.test(message)) return 'context_overflow';
  if (/max.?output|output.?token|truncat/i.test(message)) return 'output_truncated';
  if (status === 400 || /invalid|bad.?request/i.test(message)) return 'invalid_input';
  if (status >= 500 || /server.?error|internal|overloaded|capacity/i.test(message)) return 'server_error';
  if (/timeout|timed.?out|deadline|ETIMEDOUT|ECONNRESET/i.test(message)) return 'timeout';
  if (/network|ENOTFOUND|ECONNREFUSED|fetch.?fail/i.test(message)) return 'network';
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART RETRY WITH EXPONENTIAL BACKOFF + JITTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
  retryableClasses: Set<ErrorClass>;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 3000,
  maxDelay: 60000,
  jitterFactor: 0.3,
  retryableClasses: new Set(['rate_limit', 'server_error', 'timeout', 'network', 'model_error']),
};

export function calculateBackoff(attempt: number, config: Partial<RetryConfig> = {}): number {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  const exponential = cfg.baseDelay * Math.pow(2, attempt);
  const capped = Math.min(exponential, cfg.maxDelay);
  const jitter = capped * cfg.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(1000, Math.round(capped + jitter));
}

export async function withSmartRetry<T>(
  fn: (attempt: number) => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, errorClass: ErrorClass, delay: number) => void,
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  const errors: string[] = [];

  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number })?.status || 0;
      const errorClass = classifyError(status, message);
      errors.push(`[${attempt + 1}/${cfg.maxAttempts}] ${errorClass}: ${message.slice(0, 100)}`);

      if (!cfg.retryableClasses.has(errorClass)) throw err;
      if (attempt >= cfg.maxAttempts - 1) break;

      const delay = calculateBackoff(attempt, cfg);
      onRetry?.(attempt, errorClass, delay);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error(`All ${cfg.maxAttempts} attempts failed: ${errors.join(' | ')}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARALLEL EXECUTION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParallelTask<T> {
  name: string;
  fn: () => Promise<T> | T;
  critical?: boolean;
}

export interface ParallelResult<T> {
  name: string;
  value?: T;
  error?: string;
  duration: number;
}

export async function executeParallel<T>(
  tasks: ParallelTask<T>[],
  concurrency: number = 6,
): Promise<ParallelResult<T>[]> {
  const results: ParallelResult<T>[] = [];
  const controller = new AbortController();
  let criticalFailure = false;

  for (let i = 0; i < tasks.length; i += concurrency) {
    if (criticalFailure) break;

    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (task) => {
        if (controller.signal.aborted) {
          return { name: task.name, error: 'Aborted: critical task failed', duration: 0 } as ParallelResult<T>;
        }
        const start = Date.now();
        try {
          const value = await task.fn();
          return { name: task.name, value, duration: Date.now() - start } as ParallelResult<T>;
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          if (task.critical) {
            criticalFailure = true;
            controller.abort();
          }
          return { name: task.name, error, duration: Date.now() - start } as ParallelResult<T>;
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') results.push(result.value);
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT COMPRESSION
// ═══════════════════════════════════════════════════════════════════════════════

export function compressHtmlForPrompt(html: string, maxChars: number = 120000): string {
  let compressed = html;
  compressed = compressed.replace(/<!--[\s\S]*?-->/g, '');
  compressed = compressed.replace(/\s*style="[^"]*"/gi, '');
  compressed = compressed.replace(/\s*data-[a-z-]+="[^"]*"/gi, '');
  compressed = compressed.replace(/\s*aria-(?:hidden|expanded|selected|describedby|labelledby|controls)="[^"]*"/gi, '');
  compressed = compressed.replace(/\s{2,}/g, ' ');
  compressed = compressed.replace(/<(div|span|p|section|article)\s*>\s*<\/\1>/gi, '');
  compressed = compressed.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  compressed = compressed.replace(/<script[^>]*(?:gtag|analytics|tracking|pixel|hotjar|clarity|segment)[^>]*>[\s\S]*?<\/script>/gi, '');

  if (compressed.length > maxChars) {
    compressed = compressed.replace(/<svg[\s\S]*?<\/svg>/gi, '[svg]');
  }
  if (compressed.length > maxChars) {
    compressed = compressed.slice(0, maxChars) + '\n<!-- [content truncated for context window] -->';
  }

  return compressed.trim();
}

export function budgetPromptSections(
  sections: { name: string; content: string; priority: number }[],
  maxTotalChars: number,
): Map<string, string> {
  const sorted = [...sections].sort((a, b) => b.priority - a.priority);
  let remaining = maxTotalChars;
  const result = new Map<string, string>();

  for (const section of sorted) {
    if (remaining <= 0) {
      result.set(section.name, '');
      continue;
    }
    if (section.content.length <= remaining) {
      result.set(section.name, section.content);
      remaining -= section.content.length;
    } else {
      result.set(section.name, section.content.slice(0, remaining) + '\n[truncated]');
      remaining = 0;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT QUALITY GATES — REAL VALIDATION WITH SCORES
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// CODE VALIDATION — Structural checks for generated code (no runtime needed)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileIssues: { file: string; issue: string }[];
}

export function validateGeneratedCode(output: string): CodeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fileIssues: { file: string; issue: string }[] = [];

  const isReact = /<<FILE:src\//.test(output);

  if (isReact) {
    // Extract all file blocks
    const fileRegex = /<<FILE:([^>]+)>>([\s\S]*?)(?:<\/FILE>>|<<\/FILE>>)/g;
    const files: { path: string; content: string }[] = [];
    let match;
    while ((match = fileRegex.exec(output)) !== null) {
      files.push({ path: match[1].trim(), content: match[2] });
    }

    if (files.length === 0) {
      errors.push('No valid file blocks found — output may be truncated or malformed');
    }

    // Check for essential files in a React project
    const paths = files.map(f => f.path);
    if (!paths.some(p => /package\.json$/i.test(p))) warnings.push('Missing package.json');
    if (!paths.some(p => /App\.(tsx|jsx|ts|js)$/i.test(p))) warnings.push('Missing App component');
    if (!paths.some(p => /main\.(tsx|jsx|ts|js)$/i.test(p)) && !paths.some(p => /index\.(tsx|jsx|ts|js)$/i.test(p))) {
      warnings.push('Missing entry point (main.tsx or index.tsx)');
    }

    for (const file of files) {
      const { path: filePath, content } = file;
      const isTsx = /\.(tsx|jsx)$/i.test(filePath);

      if (isTsx) {
        // Unclosed JSX — count opening vs closing divs
        const openDivs = (content.match(/<div[\s>]/g) || []).length;
        const closeDivs = (content.match(/<\/div>/g) || []).length;
        if (openDivs - closeDivs > 2) {
          fileIssues.push({ file: filePath, issue: `Unclosed <div> tags (${openDivs} opened, ${closeDivs} closed)` });
        }

        // Check for unterminated template literals
        const backticks = (content.match(/`/g) || []).length;
        if (backticks % 2 !== 0) {
          fileIssues.push({ file: filePath, issue: 'Possibly unterminated template literal' });
        }

        // Check for missing return statement in component
        if (/export (default )?function/.test(content) && !/(return|=>)\s*[\(\<]/.test(content)) {
          fileIssues.push({ file: filePath, issue: 'Component may be missing return statement with JSX' });
        }
      }

      // Duplicate declarations
      const funcNames = content.match(/(?:function|const|let|var)\s+(\w+)/g) || [];
      const nameCount: Record<string, number> = {};
      for (const fn of funcNames) {
        const name = fn.split(/\s+/).pop() || '';
        nameCount[name] = (nameCount[name] || 0) + 1;
      }
      for (const [name, count] of Object.entries(nameCount)) {
        if (count > 2) fileIssues.push({ file: filePath, issue: `"${name}" declared ${count} times` });
      }

      if (content.trim().length < 10) {
        fileIssues.push({ file: filePath, issue: 'File is nearly empty' });
      }
    }
  } else if (/<html/i.test(output)) {
    // HTML single-file checks
    const tags = ['html', 'head', 'body', 'style', 'script'];
    for (const tag of tags) {
      const opens = (output.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
      const closes = (output.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
      if (opens > closes) {
        errors.push(`Unclosed <${tag}> tag (${opens} opened, ${closes} closed)`);
      }
    }
  }

  if (output.includes('undefined') && /\bundefined\b.*\bundefined\b/s.test(output.slice(0, 2000))) {
    warnings.push('Multiple "undefined" values — possible variable resolution issue');
  }

  return { valid: errors.length === 0, errors, warnings, fileIssues };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT QUALITY GATES
// ═══════════════════════════════════════════════════════════════════════════════

export interface QualityCheck {
  name: string;
  test: (output: string) => boolean;
  severity: 'error' | 'warning';
  description: string;
}

/* ── Detect if output is a React multi-file project (not HTML) ── */
function isReactMultiFile(output: string): boolean {
  return (output.match(/<<FILE:/g) || []).length > 1 && /<<FILE:src\//.test(output);
}

export const HTML_QUALITY_CHECKS: QualityCheck[] = [
  { name: 'has_doctype', test: (o) => isReactMultiFile(o) || /<!DOCTYPE html>/i.test(o), severity: 'error', description: 'Missing <!DOCTYPE html>' },
  { name: 'has_html_close', test: (o) => isReactMultiFile(o) || /<\/html>/i.test(o), severity: 'error', description: 'Missing </html> closing tag' },
  { name: 'has_head', test: (o) => isReactMultiFile(o) || /<head>/i.test(o), severity: 'error', description: 'Missing <head> section' },
  { name: 'has_body', test: (o) => isReactMultiFile(o) || /<body/i.test(o), severity: 'error', description: 'Missing <body> tag' },
  { name: 'has_title', test: (o) => isReactMultiFile(o) || /<title[^>]*>[^<]+<\/title>/i.test(o), severity: 'warning', description: 'Missing or empty <title>' },
  { name: 'has_meta_viewport', test: (o) => isReactMultiFile(o) || /viewport/i.test(o), severity: 'warning', description: 'Missing viewport meta (not responsive)' },
  { name: 'has_meta_charset', test: (o) => isReactMultiFile(o) || /charset/i.test(o), severity: 'warning', description: 'Missing charset declaration' },
  { name: 'no_markdown_fence', test: (o) => !/^```/m.test(o), severity: 'warning', description: 'Contains markdown code fences' },
  { name: 'has_style_or_css', test: (o) => isReactMultiFile(o) || /<style/i.test(o) || /<link[^>]+stylesheet/i.test(o), severity: 'warning', description: 'No CSS found' },
  { name: 'min_length', test: (o) => o.length > 500, severity: 'error', description: 'Output too short (<500 chars)' },
  { name: 'no_placeholder_text', test: (o) => !/lorem ipsum/i.test(o), severity: 'warning', description: 'Contains Lorem Ipsum' },
  { name: 'has_components', test: (o) => isReactMultiFile(o) ? /export (default |)function/.test(o) : /<(header|main|footer|nav|section|article)/i.test(o), severity: 'warning', description: 'No semantic HTML tags or React components' },
  { name: 'has_multiple_files', test: (o) => !isReactMultiFile(o) || (o.match(/<<FILE:/g) || []).length >= 4, severity: 'warning', description: 'React project should have at least 4 files' },
  { name: 'head_before_body', test: (o) => {
    if (isReactMultiFile(o)) return true;
    const headPos = o.search(/<head/i);
    const bodyPos = o.search(/<body/i);
    return headPos < 0 || bodyPos < 0 || headPos < bodyPos;
  }, severity: 'error', description: '<head> must come before <body>' },
];

export interface QualityResult {
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  details: { name: string; passed: boolean; severity: string; description: string }[];
}

export function runQualityChecks(output: string, checks: QualityCheck[] = HTML_QUALITY_CHECKS): QualityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: { name: string; passed: boolean; severity: string; description: string }[] = [];

  for (const check of checks) {
    const passed = check.test(output);
    details.push({ name: check.name, passed, severity: check.severity, description: check.description });
    if (!passed) {
      if (check.severity === 'error') errors.push(check.description);
      else warnings.push(check.description);
    }
  }

  const totalChecks = checks.length;
  const passedChecks = details.filter(d => d.passed).length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  return { passed: errors.length === 0, score, errors, warnings, details };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT RECOVERY — CONTINUATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

export function buildContinuationPrompt(truncatedOutput: string): string {
  const isReact = /<<FILE:src\//.test(truncatedOutput) || /import.*from ['"]/.test(truncatedOutput);
  
  if (isReact) {
    // Build a file inventory: list all <<FILE:path>> blocks with status
    const fileRegex = /<<FILE:([^>]+)>>/g;
    const closeRegex = /<\/FILE>>/g;
    const openFiles: string[] = [];
    let match;
    while ((match = fileRegex.exec(truncatedOutput)) !== null) {
      openFiles.push(match[1].trim());
    }
    const closedCount = (truncatedOutput.match(closeRegex) || []).length;
    const completedFiles = openFiles.slice(0, closedCount);
    const lastOpenFile = openFiles.length > closedCount ? openFiles[openFiles.length - 1] : null;
    
    // Get the tail from the last file being generated
    const tail = truncatedOutput.slice(-3000);
    
    return `Output token limit hit. Resume EXACTLY where cut off — no recap, no apology, no re-generating completed files.\n\n` +
      `FILE INVENTORY (already generated — do NOT repeat):\n${completedFiles.map(f => `  ✓ ${f}`).join('\n')}\n\n` +
      (lastOpenFile ? `CURRENTLY MID-FILE: ${lastOpenFile} (continue from where it was cut)\n\n` : '') +
      `REMAINING: Generate any files that haven't been started yet.\n\n` +
      `Continue from this exact point:\n${tail}`;
  }
  
  const tail = truncatedOutput.slice(-2000);
  return `Output token limit hit. Resume directly — no apology, no recap of what you were doing. ` +
    `Pick up mid-thought from exactly where the output was cut. ` +
    `Continue generating the code from this point:\n\n${tail}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST-PROCESSING PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface PostProcessResult {
  code: string;
  fixes: string[];
  warnings: string[];
  fileCount: number;
  languages: string[];
}

export function postProcessOutput(raw: string): PostProcessResult {
  const fixes: string[] = [];
  const warnings: string[] = [];
  let code = raw;

  const fileBlocks = extractFileBlocks(code);
  const languages = detectLanguages(fileBlocks);

  code = fixUnclosedHtmlTags(code, fixes);
  code = stripMarkdownFences(code, fixes);
  code = deduplicateCdnLinks(code, fixes);
  code = ensureViewportMeta(code, fixes);
  code = fixInlineStyles(code, fixes);
  code = ensureHtmlLang(code, fixes);

  if (/lorem ipsum/i.test(code)) warnings.push('Contains placeholder text (Lorem ipsum)');
  if (code.length < 500 && /<html/i.test(code)) warnings.push('Output seems too short for a complete page');
  if ((code.match(/<script/gi) || []).length > 10) warnings.push('Excessive <script> tags');

  return { code, fixes, warnings, fileCount: Math.max(1, fileBlocks.length), languages };
}

function extractFileBlocks(code: string): { path: string; content: string }[] {
  const blocks: { path: string; content: string }[] = [];
  const regex = /<<FILE:([^>]+)>>([\s\S]*?)(?:<\/FILE>>|<<\/FILE>>|(?=<<FILE:))/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    blocks.push({ path: match[1].trim(), content: match[2] });
  }
  return blocks;
}

function detectLanguages(files: { path: string; content: string }[]): string[] {
  const langs = new Set<string>();
  const extMap: Record<string, string> = {
    '.html': 'HTML', '.htm': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.less': 'LESS',
    '.js': 'JavaScript', '.jsx': 'JSX', '.ts': 'TypeScript', '.tsx': 'TSX',
    '.vue': 'Vue', '.svelte': 'Svelte', '.py': 'Python', '.rb': 'Ruby',
    '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.kt': 'Kotlin',
    '.swift': 'Swift', '.php': 'PHP', '.sql': 'SQL',
    '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.toml': 'TOML',
    '.md': 'Markdown', '.mdx': 'MDX', '.sh': 'Shell', '.bash': 'Shell',
    '.dockerfile': 'Dockerfile', '.prisma': 'Prisma', '.graphql': 'GraphQL',
  };
  for (const f of files) {
    const ext = f.path.includes('.') ? '.' + f.path.split('.').pop()!.toLowerCase() : '';
    if (extMap[ext]) langs.add(extMap[ext]);
    if (f.path.toLowerCase() === 'dockerfile') langs.add('Dockerfile');
  }
  return Array.from(langs);
}

function fixUnclosedHtmlTags(code: string, fixes: string[]): string {
  if (/<html/i.test(code) && !/<\/html\s*>/i.test(code)) {
    if (/<body/i.test(code) && !/<\/body\s*>/i.test(code)) {
      code += '\n</body>\n</html>';
      fixes.push('Added missing </body> and </html>');
    } else {
      code += '\n</html>';
      fixes.push('Added missing </html>');
    }
  }
  if (/<head/i.test(code) && !/<\/head\s*>/i.test(code) && /<body/i.test(code)) {
    code = code.replace(/(<body)/i, '</head>\n$1');
    fixes.push('Added missing </head>');
  }
  const styleOpens = (code.match(/<style[^>]*>/gi) || []).length;
  const styleCloses = (code.match(/<\/style>/gi) || []).length;
  if (styleOpens > styleCloses) {
    const insertPoint = code.search(/<\/head>|<body/i);
    if (insertPoint > 0) {
      code = code.slice(0, insertPoint) + '\n</style>\n' + code.slice(insertPoint);
      fixes.push('Added missing </style>');
    }
  }
  const scriptOpens = (code.match(/<script[^>]*>/gi) || []).length;
  const scriptCloses = (code.match(/<\/script>/gi) || []).length;
  if (scriptOpens > scriptCloses) {
    code += '\n</script>';
    fixes.push('Added missing </script>');
  }
  return code;
}

function stripMarkdownFences(code: string, fixes: string[]): string {
  if (/^```\w*\n/m.test(code) && /\n```\s*$/m.test(code)) {
    code = code.replace(/^```\w*\n/gm, '').replace(/\n```\s*$/gm, '');
    fixes.push('Stripped markdown code fences');
  }
  return code;
}

function deduplicateCdnLinks(code: string, fixes: string[]): string {
  const seen = new Set<string>();
  let duplicates = 0;
  code = code.replace(/<(script[^>]+src=["']([^"']+)["'][^>]*><\/script>|link[^>]+href=["']([^"']+)["'][^>]*\/?>)/gi, (match, _tag, src, href) => {
    const url = src || href;
    if (!url) return match;
    const key = url.split('?')[0].toLowerCase();
    if (seen.has(key)) {
      duplicates++;
      return `<!-- duplicate removed: ${url} -->`;
    }
    seen.add(key);
    return match;
  });
  if (duplicates > 0) fixes.push(`Removed ${duplicates} duplicate CDN link(s)`);
  return code;
}

function ensureViewportMeta(code: string, fixes: string[]): string {
  if (/<head/i.test(code) && !/viewport/i.test(code)) {
    code = code.replace(/<head([^>]*)>/i, '<head$1>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    fixes.push('Added viewport meta');
  }
  return code;
}

function fixInlineStyles(code: string, fixes: string[]): string {
  let fixed = 0;
  code = code.replace(/style="([^"]+)"/g, (match, styles: string) => {
    const trimmed = styles.trim();
    if (trimmed && !trimmed.endsWith(';')) {
      fixed++;
      return `style="${trimmed};"`;
    }
    return match;
  });
  if (fixed > 0) fixes.push(`Fixed ${fixed} inline style(s)`);
  return code;
}

function ensureHtmlLang(code: string, fixes: string[]): string {
  if (/<html(?![^>]*lang=)/i.test(code)) {
    code = code.replace(/<html/i, '<html lang="en"');
    fixes.push('Added lang="en"');
  }
  return code;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSYSTEM DETECTION — Keyword → which real API calls to make
// Only subsystems with ACTUAL fetch calls matter: notebooklm, stitch
// The rest are prompt library sections (handled by buildSmartSystemPrompt)
// ═══════════════════════════════════════════════════════════════════════════════

/** Subsystems that trigger real API calls or have real meaning */
export type ActiveSubsystem = 'notebooklm' | 'stitch';

/**
 * Detect which subsystems a prompt needs.
 * Returns only subsystems that trigger REAL actions (API calls).
 * This is NOT "analysis" — it's keyword matching. Honest name.
 */
export function detectSubsystems(prompt: string): ActiveSubsystem[] {
  const lower = prompt.toLowerCase();
  const result: ActiveSubsystem[] = [];

  if (/research|analyze|study|compare|best.?practices|benchmark|audit/i.test(lower)) {
    result.push('notebooklm');
  }

  // Only trigger Stitch on explicit requests — "design" and "ui" are too broad
  if (/stitch|wireframe|mockup|prototype|design.?system|figma/i.test(lower)) {
    result.push('stitch');
  }

  return result;
}
