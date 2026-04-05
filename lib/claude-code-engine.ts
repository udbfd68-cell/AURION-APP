/**
 * Claude Code Intelligence Engine â€” Core patterns extracted from Claude Code architecture
 * 
 * Patterns integrated:
 * - Smart retry with exponential backoff + jitter (from query.ts state machine)
 * - Streaming tool execution with concurrency control (from StreamingToolExecutor.ts)
 * - Context compression / prompt budget management (from compact services)
 * - Parallel execution orchestrator (from tool orchestration)
 * - Error classification & recovery strategies (from query.ts error handling)
 * - Output quality gates (from stop hooks)
 * - Token budget awareness (from tokenBudget.ts)
 */

// â”€â”€â”€ ERROR CLASSIFICATION (from Claude Code's error handling patterns) â”€â”€â”€â”€â”€

export type ErrorClass =
  | 'auth_failure'       // 401/403 â€” stop immediately
  | 'rate_limit'         // 429 â€” backoff + retry
  | 'server_error'       // 500/502/503 â€” backoff + retry
  | 'context_overflow'   // prompt too long â€” compress + retry
  | 'output_truncated'   // max_output_tokens â€” escalate + retry
  | 'invalid_input'      // 400 â€” fix input + retry
  | 'timeout'            // request timeout â€” retry with longer timeout
  | 'network'            // connection failure â€” retry
  | 'model_error'        // model returned garbage â€” retry with different params
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

// â”€â”€â”€ SMART RETRY WITH EXPONENTIAL BACKOFF + JITTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// From Claude Code's query.ts: state machine loop with recovery strategies

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;       // ms
  maxDelay: number;        // ms
  jitterFactor: number;    // 0-1, randomization factor
  retryableClasses: Set<ErrorClass>;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 3000,
  maxDelay: 60000,
  jitterFactor: 0.3,
  retryableClasses: new Set(['rate_limit', 'server_error', 'timeout', 'network', 'model_error']),
};

/**
 * Calculate delay with exponential backoff + jitter (Claude Code pattern).
 * Jitter prevents thundering herd when multiple requests retry simultaneously.
 */
export function calculateBackoff(attempt: number, config: Partial<RetryConfig> = {}): number {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  const exponential = cfg.baseDelay * Math.pow(2, attempt);
  const capped = Math.min(exponential, cfg.maxDelay);
  const jitter = capped * cfg.jitterFactor * (Math.random() * 2 - 1); // Â±jitter
  return Math.max(1000, Math.round(capped + jitter));
}

/**
 * Smart retry executor â€” classifies errors and applies appropriate recovery.
 * Inspired by Claude Code's query loop state machine.
 */
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

      // Non-retryable errors â€” fail immediately
      if (!cfg.retryableClasses.has(errorClass)) {
        throw err;
      }

      // Last attempt â€” no more retries
      if (attempt >= cfg.maxAttempts - 1) break;

      const delay = calculateBackoff(attempt, cfg);
      onRetry?.(attempt, errorClass, delay);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error(`All ${cfg.maxAttempts} attempts failed: ${errors.join(' | ')}`);
}

// â”€â”€â”€ PARALLEL EXECUTION ORCHESTRATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// From Claude Code's StreamingToolExecutor: concurrent safe tools run in parallel,
// unsafe ones run sequentially. Adapted for Aurion's extraction pipeline.

export interface ParallelTask<T> {
  name: string;
  fn: () => Promise<T> | T;
  critical?: boolean;  // true = failure aborts all other tasks
}

export interface ParallelResult<T> {
  name: string;
  value?: T;
  error?: string;
  duration: number;
}

/**
 * Execute tasks in parallel with error isolation.
 * Critical task failure aborts remaining tasks (like StreamingToolExecutor's sibling abort).
 * Non-critical failures are collected but don't block other tasks.
 */
export async function executeParallel<T>(
  tasks: ParallelTask<T>[],
  concurrency: number = 6,
): Promise<ParallelResult<T>[]> {
  const results: ParallelResult<T>[] = [];
  const controller = new AbortController();
  let criticalFailure = false;

  // Process in batches respecting concurrency limit
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
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  return results;
}

// â”€â”€â”€ CONTEXT COMPRESSION (from Claude Code's compact services) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Intelligently compress prompt content to fit within model context windows.

/**
 * Compress HTML content for prompt inclusion.
 * Removes redundant whitespace, comments, empty elements, and data attributes
 * while preserving semantic structure and visible text.
 */
export function compressHtmlForPrompt(html: string, maxChars: number = 120000): string {
  let compressed = html;
  // Remove HTML comments
  compressed = compressed.replace(/<!--[\s\S]*?-->/g, '');
  // Remove inline styles that are redundant with extracted tokens
  compressed = compressed.replace(/\s*style="[^"]*"/gi, '');
  // Remove data-* attributes
  compressed = compressed.replace(/\s*data-[a-z-]+="[^"]*"/gi, '');
  // Remove aria-* that aren't critical for structure
  compressed = compressed.replace(/\s*aria-(?:hidden|expanded|selected|describedby|labelledby|controls)="[^"]*"/gi, '');
  // Collapse whitespace
  compressed = compressed.replace(/\s{2,}/g, ' ');
  // Remove empty elements
  compressed = compressed.replace(/<(div|span|p|section|article)\s*>\s*<\/\1>/gi, '');
  // Remove noscript blocks
  compressed = compressed.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  // Remove tracking/analytics scripts
  compressed = compressed.replace(/<script[^>]*(?:gtag|analytics|tracking|pixel|hotjar|clarity|segment)[^>]*>[\s\S]*?<\/script>/gi, '');

  // If still too long, progressively truncate less important parts
  if (compressed.length > maxChars) {
    // Remove SVGs (they're huge and we have image URLs)
    compressed = compressed.replace(/<svg[\s\S]*?<\/svg>/gi, '[svg]');
  }
  if (compressed.length > maxChars) {
    // Truncate with a marker
    compressed = compressed.slice(0, maxChars) + '\n<!-- [content truncated for context window] -->';
  }

  return compressed.trim();
}

/**
 * Smart prompt budget manager â€” allocates token space across prompt sections.
 * Inspired by Claude Code's token budget tracking.
 */
export function budgetPromptSections(
  sections: { name: string; content: string; priority: number }[],
  maxTotalChars: number,
): Map<string, string> {
  // Sort by priority (higher = more important, allocated first)
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
      // Truncate this section to fit remaining budget
      result.set(section.name, section.content.slice(0, remaining) + '\n[truncated]');
      remaining = 0;
    }
  }

  return result;
}

// â”€â”€â”€ STREAMING RESPONSE QUALITY GATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// From Claude Code's stop hooks: verify output quality before marking as done.

export interface QualityCheck {
  name: string;
  test: (output: string) => boolean;
  severity: 'error' | 'warning';
}

export const HTML_QUALITY_CHECKS: QualityCheck[] = [
  { name: 'has_doctype', test: (o) => /<!DOCTYPE html>/i.test(o), severity: 'error' },
  { name: 'has_html_close', test: (o) => /<\/html>/i.test(o), severity: 'error' },
  { name: 'has_head', test: (o) => /<head>/i.test(o), severity: 'error' },
  { name: 'has_body', test: (o) => /<body/i.test(o), severity: 'error' },
  { name: 'has_meta_viewport', test: (o) => /viewport/i.test(o), severity: 'warning' },
  { name: 'min_length', test: (o) => o.length > 200, severity: 'error' },
  { name: 'no_markdown_fence', test: (o) => !/^```/m.test(o), severity: 'warning' },
  { name: 'has_style_tag', test: (o) => /<style/i.test(o), severity: 'warning' },
  { name: 'no_placeholder_text', test: (o) => !/lorem ipsum/i.test(o), severity: 'warning' },
];

export function runQualityChecks(output: string, checks: QualityCheck[] = HTML_QUALITY_CHECKS): {
  passed: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const check of checks) {
    if (!check.test(output)) {
      if (check.severity === 'error') errors.push(check.name);
      else warnings.push(check.name);
    }
  }

  return { passed: errors.length === 0, errors, warnings };
}

// â”€â”€â”€ OUTPUT RECOVERY (from Claude Code's max_output_tokens recovery) â”€â”€â”€â”€â”€â”€â”€â”€
// When output is truncated, construct a continuation prompt.

export function buildContinuationPrompt(truncatedOutput: string): string {
  // Take the last ~2000 chars as context for continuation
  const tail = truncatedOutput.slice(-2000);
  return `Output token limit hit. Resume directly â€” no apology, no recap of what you were doing. ` +
    `Pick up mid-thought from exactly where the output was cut. ` +
    `Continue generating the HTML from this point:\n\n${tail}`;
}
