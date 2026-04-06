/**
 * Claude Code Intelligence Engine v4.0 — REAL, No Theater
 * 
 * What this file does (honestly):
 * - Error classification + smart retry with exponential backoff
 * - Parallel execution with error isolation
 * - HTML compression for prompt injection
 * - Prompt budget management
 * - Output quality validation with REAL checks + severity scores
 * - Post-processing pipeline (auto-fix broken HTML)
 * - Request analysis via keyword matching (honest: it's regex, not AI)
 * - Subsystem capability registry
 * - Continuation prompt for truncated output
 * 
 * What was REMOVED (was dead code / theater):
 * - Ruflo Swarm (~600 lines): executeSwarm, calculateConsensus, runCheckpoint, 
 *   buildSwarmPrompt, patternMemory, recordPattern — NEVER CALLED from any route
 * - 10 "virtual agents" — were JSON objects injected as text, not separate LLM calls
 * - "Q-Learning routing" — was if/else on keyword counts
 * - "Pattern memory" — in-memory array, always empty on serverless cold starts
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

export interface QualityCheck {
  name: string;
  test: (output: string) => boolean;
  severity: 'error' | 'warning';
  description: string;
}

export const HTML_QUALITY_CHECKS: QualityCheck[] = [
  { name: 'has_doctype', test: (o) => /<!DOCTYPE html>/i.test(o), severity: 'error', description: 'Missing <!DOCTYPE html>' },
  { name: 'has_html_close', test: (o) => /<\/html>/i.test(o), severity: 'error', description: 'Missing </html> closing tag' },
  { name: 'has_head', test: (o) => /<head>/i.test(o), severity: 'error', description: 'Missing <head> section' },
  { name: 'has_body', test: (o) => /<body/i.test(o), severity: 'error', description: 'Missing <body> tag' },
  { name: 'has_title', test: (o) => /<title[^>]*>[^<]+<\/title>/i.test(o), severity: 'warning', description: 'Missing or empty <title>' },
  { name: 'has_meta_viewport', test: (o) => /viewport/i.test(o), severity: 'warning', description: 'Missing viewport meta (not responsive)' },
  { name: 'has_meta_charset', test: (o) => /charset/i.test(o), severity: 'warning', description: 'Missing charset declaration' },
  { name: 'no_markdown_fence', test: (o) => !/^```/m.test(o), severity: 'warning', description: 'Contains markdown code fences' },
  { name: 'has_style_or_link', test: (o) => /<style/i.test(o) || /<link[^>]+stylesheet/i.test(o), severity: 'warning', description: 'No CSS found' },
  { name: 'min_length', test: (o) => o.length > 500, severity: 'error', description: 'Output too short (<500 chars)' },
  { name: 'no_placeholder_text', test: (o) => !/lorem ipsum/i.test(o), severity: 'warning', description: 'Contains Lorem Ipsum' },
  { name: 'has_semantic_tags', test: (o) => /<(header|main|footer|nav|section|article)/i.test(o), severity: 'warning', description: 'No semantic HTML tags' },
  { name: 'has_lang_attr', test: (o) => /<html[^>]+lang=/i.test(o), severity: 'warning', description: 'Missing lang attribute on <html>' },
  { name: 'head_before_body', test: (o) => {
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
  const tail = truncatedOutput.slice(-2000);
  return `Output token limit hit. Resume directly — no apology, no recap of what you were doing. ` +
    `Pick up mid-thought from exactly where the output was cut. ` +
    `Continue generating the HTML from this point:\n\n${tail}`;
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
// SUBSYSTEM REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export type SubSystem =
  | 'anthropic' | 'gemini' | 'groq' | 'openai'
  | 'stitch' | 'notebooklm' | 'firecrawl'
  | 'reactbits' | '21stdev' | 'motionsite' | 'ui-ux-pro-max'
  | 'vercel' | 'system-prompts' | 'quality-gates' | 'templates'
  | 'media' | 'clone' | 'terminal' | 'github';

export interface JarvisTask {
  id: string;
  name: string;
  description: string;
  subsystems: SubSystem[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  dependencies?: string[];
  priority: number;
}

export interface JarvisPlan {
  id: string;
  goal: string;
  tasks: JarvisTask[];
  status: 'planning' | 'executing' | 'completed' | 'failed';
  created: number;
  completedTasks: number;
  totalTasks: number;
}

export interface JarvisContext {
  activeTab: string;
  projectFiles: string[];
  currentHtml?: string;
  researchContext?: string;
  integrationKeys: Record<string, string>;
  deviceMode: string;
  generationHistory: Array<{ prompt: string; font?: string; accent?: string }>;
  stitchProjectId?: string;
  cloneUrl?: string;
}

export const SUBSYSTEM_CAPABILITIES: Record<SubSystem, {
  name: string;
  description: string;
  actions: string[];
  endpoint?: string;
}> = {
  anthropic: {
    name: 'Claude AI',
    description: 'Most capable reasoning model. 128K output.',
    actions: ['generate-code', 'debug', 'refactor', 'explain'],
    endpoint: '/api/anthropic',
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Fast multimodal with vision.',
    actions: ['generate-code', 'analyze-image', 'screenshot-to-code'],
    endpoint: '/api/gemini',
  },
  groq: {
    name: 'Groq LLM',
    description: 'Ultra-fast inference.',
    actions: ['quick-generate', 'brainstorm'],
    endpoint: '/api/groq',
  },
  openai: {
    name: 'OpenAI GPT',
    description: 'Versatile model.',
    actions: ['refine-copy', 'accessibility-audit'],
    endpoint: '/api/openai',
  },
  stitch: {
    name: 'Google Stitch',
    description: 'AI UI/UX design generation.',
    actions: ['create-project', 'generate-screen', 'get-html'],
    endpoint: '/api/stitch',
  },
  notebooklm: {
    name: 'NotebookLM',
    description: 'Deep research engine.',
    actions: ['deep-analysis', 'research-topic'],
  },
  firecrawl: {
    name: 'Firecrawl',
    description: 'Web scraping + design token extraction.',
    actions: ['scrape', 'extract-tokens'],
    endpoint: '/api/scrape',
  },
  reactbits: {
    name: 'ReactBits',
    description: '135+ premium component patterns.',
    actions: ['get-component', 'suggest-components'],
  },
  '21stdev': {
    name: '21st.dev',
    description: 'Premium component aesthetics.',
    actions: ['get-pattern', 'suggest-effects'],
  },
  motionsite: {
    name: 'MotionSite',
    description: 'Video assets + templates.',
    actions: ['get-video', 'get-template'],
  },
  'ui-ux-pro-max': {
    name: 'UI/UX Pro Max',
    description: '67 styles, 96 palettes, 99 UX guidelines.',
    actions: ['get-palette', 'get-style'],
  },
  vercel: {
    name: 'Vercel Deploy',
    description: 'Auto-deploy to production.',
    actions: ['deploy', 'check-status'],
    endpoint: '/api/deploy',
  },
  'system-prompts': {
    name: 'System Prompts',
    description: 'Full prompt intelligence.',
    actions: ['get-full-prompt', 'get-section'],
  },
  'quality-gates': {
    name: 'Quality Gates',
    description: 'Output validation.',
    actions: ['validate-html', 'check-responsive'],
  },
  templates: {
    name: 'Templates',
    description: '22 premium HTML templates.',
    actions: ['find-template', 'mix-templates'],
  },
  media: {
    name: 'Media Generation',
    description: 'LTX Video + Gemini Images.',
    actions: ['generate-video', 'generate-image'],
  },
  clone: {
    name: 'Clone Engine',
    description: 'Pixel-perfect website cloning.',
    actions: ['clone-url', 'extract-design'],
    endpoint: '/api/clone',
  },
  terminal: {
    name: 'Terminal',
    description: 'Execute commands.',
    actions: ['run-command', 'build'],
    endpoint: '/api/exec',
  },
  github: {
    name: 'GitHub',
    description: 'Push code to repositories.',
    actions: ['push', 'create-repo'],
    endpoint: '/api/github',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST ANALYSIS — Keyword-based subsystem detection
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeRequest(prompt: string, _context: Partial<JarvisContext>): {
  subsystems: SubSystem[];
  reasoning: string;
  suggestedPlan: string[];
} {
  const lower = prompt.toLowerCase();
  const subsystems: Set<SubSystem> = new Set();
  const plan: string[] = [];

  subsystems.add('system-prompts');

  if (/clone|copy|replicate|reproduce|pixel.?perfect/i.test(lower) && /https?:\/\/|url|website|site/i.test(lower)) {
    subsystems.add('firecrawl');
    subsystems.add('clone');
    plan.push('Scrape target URL for design tokens');
    plan.push('Generate pixel-perfect clone');
  }

  if (/research|analyze|study|compare|best.?practices|benchmark|audit/i.test(lower)) {
    subsystems.add('notebooklm');
    plan.push('Research via NotebookLM');
  }

  if (/design|ui|ux|layout|component|screen|wireframe|mockup|prototype/i.test(lower)) {
    subsystems.add('stitch');
    subsystems.add('reactbits');
    plan.push('Generate UI via Stitch + ReactBits');
  }

  if (/website|landing|page|portfolio|saas|dashboard|app|ecommerce|shop/i.test(lower)) {
    subsystems.add('templates');
    subsystems.add('reactbits');
    subsystems.add('media');
    plan.push('Generate complete website');
  }

  if (/video|animation|media|image|photo|visual|hero.?image|product.?shot/i.test(lower)) {
    subsystems.add('media');
    plan.push('Generate media assets');
  }

  if (/deploy|publish|live|production|ship|launch/i.test(lower)) {
    subsystems.add('vercel');
    subsystems.add('quality-gates');
    plan.push('Validate + deploy');
  }

  if (/github|git|push|commit|repo|repository/i.test(lower)) {
    subsystems.add('github');
    plan.push('Push to GitHub');
  }

  if (/install|build|npm|yarn|package|command|terminal|lint|test/i.test(lower)) {
    subsystems.add('terminal');
    plan.push('Execute terminal commands');
  }

  if (/screenshot|image|picture|photo.*code|recreate|reproduce/i.test(lower)) {
    subsystems.add('gemini');
    plan.push('Analyze screenshot → generate HTML');
  }

  if (subsystems.size > 1) subsystems.add('quality-gates');

  if (subsystems.size <= 1) {
    subsystems.add('templates');
    subsystems.add('reactbits');
    plan.push('Generate with templates + ReactBits');
  }

  const systemList = Array.from(subsystems);
  return {
    subsystems: systemList,
    reasoning: `Activating ${systemList.length} subsystems: ${systemList.map(s => SUBSYSTEM_CAPABILITIES[s].name).join(', ')}`,
    suggestedPlan: plan,
  };
}

export function createPlan(goal: string, analysis: ReturnType<typeof analyzeRequest>): JarvisPlan {
  const tasks: JarvisTask[] = analysis.suggestedPlan.map((step, i) => ({
    id: `task-${i + 1}`,
    name: step.split(' ').slice(0, 4).join(' '),
    description: step,
    subsystems: analysis.subsystems.filter(s => {
      const cap = SUBSYSTEM_CAPABILITIES[s];
      return step.toLowerCase().includes(cap.name.toLowerCase().split(' ')[0].toLowerCase());
    }),
    status: 'pending' as const,
    priority: i + 1,
    dependencies: i > 0 ? [`task-${i}`] : undefined,
  }));

  return {
    id: `plan-${Date.now().toString(36)}`,
    goal,
    tasks,
    status: 'planning',
    created: Date.now(),
    completedTasks: 0,
    totalTasks: tasks.length,
  };
}

export function buildJarvisSystemContext(
  activeSubsystems: SubSystem[],
  plan?: JarvisPlan,
): string {
  const sections: string[] = [];
  sections.push(`[ORCHESTRATOR — ACTIVE]`);
  sections.push(`Active: ${activeSubsystems.length}/${Object.keys(SUBSYSTEM_CAPABILITIES).length} subsystems`);

  for (const sys of activeSubsystems) {
    const cap = SUBSYSTEM_CAPABILITIES[sys];
    sections.push(`- ${cap.name}: ${cap.actions.join(', ')}`);
  }

  if (plan && plan.tasks.length > 0) {
    sections.push('');
    sections.push(`Plan: "${plan.goal}"`);
    for (const task of plan.tasks) {
      sections.push(`  ${task.status === 'completed' ? '✅' : '⏳'} ${task.description}`);
    }
  }

  sections.push('[/ORCHESTRATOR]');
  return sections.join('\n');
}

export function formatJarvisStatus(plan: JarvisPlan): string {
  const pct = plan.totalTasks > 0 ? Math.round((plan.completedTasks / plan.totalTasks) * 100) : 0;
  const lines: string[] = [];
  lines.push(`Orchestrator • ${plan.status.toUpperCase()}`);
  lines.push(`Goal: ${plan.goal} — ${plan.completedTasks}/${plan.totalTasks} (${pct}%)`);
  for (const task of plan.tasks) {
    const icon = task.status === 'completed' ? '✅' : task.status === 'running' ? '⚡' : task.status === 'failed' ? '❌' : '○';
    lines.push(`${icon} ${task.description}${task.error ? ` — ${task.error}` : ''}`);
  }
  return lines.join('\n');
}
