/**
 * Research Orchestrator — The ULTIMATE combo engine
 * Connects NotebookLM (research/analysis) ↔ Claude Code (execution/generation)
 * Feeds enhanced research context into ALL tools for superior output quality.
 */

import {
  NotebookLMEngine,
  buildResearchContext,
  buildCompactResearchContext,
  RESEARCH_TEMPLATES,
  type AnalysisResult,
  type ResearchResult,
  type ResearchTemplate,
} from './notebooklm-engine';

import {
  classifyError,
  withSmartRetry,
  executeParallel,
  compressHtmlForPrompt,
  budgetPromptSections,
  runQualityChecks,
  HTML_QUALITY_CHECKS,
  buildContinuationPrompt,
  type ParallelTask,
} from './claude-code-engine';

/* ────────── Types ────────── */

export interface OrchestratorConfig {
  /** NotebookLM mode: 'cli' for local, 'api' for serverless */
  nlmMode: 'cli' | 'api';
  /** Maximum research context chars to inject */
  maxResearchContext: number;
  /** Enable parallel research + generation */
  parallelResearch: boolean;
  /** Auto-research before generation */
  autoResearch: boolean;
  /** Research depth: fast or deep */
  researchDepth: 'fast' | 'deep';
}

export interface EnhancedGenerationRequest {
  /** The user's prompt/instruction */
  prompt: string;
  /** Type of generation */
  type: 'website' | 'clone' | 'component' | 'app' | 'api' | 'fix' | 'improve';
  /** URLs for reference/research */
  urls?: string[];
  /** Existing code context */
  existingCode?: string;
  /** Force a specific research template */
  researchTemplate?: ResearchTemplate;
  /** Skip research (use cached or none) */
  skipResearch?: boolean;
  /** Custom research questions */
  customQuestions?: string[];
}

export interface EnhancedGenerationResult {
  /** The generated output */
  output: string;
  /** Research context that was used */
  researchContext?: string;
  /** Quality check results */
  quality: { passed: boolean; errors: string[]; warnings: string[] };
  /** Research analysis (if performed) */
  analysis?: AnalysisResult;
  /** Total processing time */
  duration: number;
  /** Pipeline stages completed */
  stages: string[];
}

export interface ToolEnhancement {
  /** Additional system prompt context from research */
  systemPromptAddition: string;
  /** Specific recommendations for this tool */
  recommendations: string[];
  /** Reference data extracted from research */
  referenceData: Record<string, string>;
}

/* ────────── Research Cache ────────── */

const researchCache = new Map<string, { result: AnalysisResult; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedResearch(key: string): AnalysisResult | null {
  const cached = researchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  researchCache.delete(key);
  return null;
}

function cacheResearch(key: string, result: AnalysisResult): void {
  // Keep cache size bounded
  if (researchCache.size > 50) {
    const oldest = Array.from(researchCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) researchCache.delete(oldest[0]);
  }
  researchCache.set(key, { result, timestamp: Date.now() });
}

/* ────────── Main Orchestrator ────────── */

export class ResearchOrchestrator {
  private nlm: NotebookLMEngine;
  private config: OrchestratorConfig;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      nlmMode: config?.nlmMode || 'api',
      maxResearchContext: config?.maxResearchContext || 4000,
      parallelResearch: config?.parallelResearch ?? true,
      autoResearch: config?.autoResearch ?? true,
      researchDepth: config?.researchDepth || 'fast',
    };
    this.nlm = new NotebookLMEngine(this.config.nlmMode);
  }

  /* ── Core Pipeline: Research → Enhance → Generate → Verify ── */

  async enhancedGenerate(request: EnhancedGenerationRequest): Promise<EnhancedGenerationResult> {
    const startTime = Date.now();
    const stages: string[] = [];
    let researchContext = '';
    let analysis: AnalysisResult | undefined;

    // Stage 1: Research (if enabled)
    if (!request.skipResearch && this.config.autoResearch) {
      stages.push('research');
      const cacheKey = `${request.type}:${request.prompt.slice(0, 100)}`;
      const cached = getCachedResearch(cacheKey);

      if (cached) {
        analysis = cached;
        stages.push('research-cache-hit');
      } else {
        try {
          analysis = await this.performResearch(request);
          if (analysis) {
            cacheResearch(cacheKey, analysis);
            stages.push('research-complete');
          }
        } catch {
          stages.push('research-failed');
        }
      }

      if (analysis) {
        researchContext = this.config.maxResearchContext > 2000
          ? buildResearchContext(analysis)
          : buildCompactResearchContext(analysis, this.config.maxResearchContext);
      }
    }

    // Stage 2: Build enhanced prompt
    stages.push('prompt-building');
    const enhancedPrompt = this.buildEnhancedPrompt(request, researchContext);

    // Stage 3: Quality check the output (if code is provided)
    const quality = request.existingCode
      ? runQualityChecks(request.existingCode, HTML_QUALITY_CHECKS)
      : { passed: true, errors: [], warnings: [] };
    stages.push('quality-check');

    return {
      output: enhancedPrompt,
      researchContext: researchContext || undefined,
      quality,
      analysis,
      duration: Date.now() - startTime,
      stages,
    };
  }

  /* ── Research for different generation types ── */

  private async performResearch(request: EnhancedGenerationRequest): Promise<AnalysisResult> {
    const template = request.researchTemplate
      || this.inferResearchTemplate(request.type);

    const questions = [
      ...(RESEARCH_TEMPLATES[template]?.questions || []),
      ...(request.customQuestions || []),
    ];

    return this.nlm.deepAnalysis(
      request.prompt.slice(0, 200),
      request.urls || [],
      questions,
    );
  }

  private inferResearchTemplate(type: EnhancedGenerationRequest['type']): ResearchTemplate {
    switch (type) {
      case 'website':
      case 'clone':
        return 'website-audit';
      case 'component':
        return 'design-system';
      case 'app':
        return 'tech-stack';
      case 'api':
        return 'code-quality';
      case 'fix':
      case 'improve':
        return 'code-quality';
      default:
        return 'tech-stack';
    }
  }

  /* ── Tool Enhancement Interface ── */

  /**
   * Enhance any tool's output by providing research-backed context
   */
  async enhanceTool(
    toolName: string,
    userPrompt: string,
    currentContext?: string,
  ): Promise<ToolEnhancement> {
    // Determine what research would help this tool
    const researchQueries = this.getToolResearchQueries(toolName, userPrompt);

    let analysis: AnalysisResult | undefined;
    const cacheKey = `tool:${toolName}:${userPrompt.slice(0, 80)}`;
    const cached = getCachedResearch(cacheKey);

    if (cached) {
      analysis = cached;
    } else {
      try {
        analysis = await this.nlm.deepAnalysis(
          `${toolName}: ${userPrompt.slice(0, 150)}`,
          [],
          researchQueries,
        );
        if (analysis) cacheResearch(cacheKey, analysis);
      } catch { /* continue without research */ }
    }

    const systemPromptAddition = analysis
      ? buildCompactResearchContext(analysis, 2000)
      : '';

    const recommendations = analysis?.recommendations || [];

    const referenceData: Record<string, string> = {};
    if (analysis?.key_insights.length) {
      referenceData.insights = analysis.key_insights.slice(0, 3).join('\n');
    }
    if (analysis?.mind_map) {
      referenceData.structure = JSON.stringify(analysis.mind_map);
    }

    return { systemPromptAddition, recommendations, referenceData };
  }

  /**
   * Get tool-specific research queries
   */
  private getToolResearchQueries(toolName: string, prompt: string): string[] {
    const baseQueries: Record<string, string[]> = {
      'clone': [
        'What design patterns and UX best practices does this type of website use?',
        'What are the key visual elements and animations for a premium user experience?',
        'What accessibility and performance standards should be met?',
      ],
      'scrape': [
        'What are the most important content elements to extract from this type of page?',
        'What design tokens and style patterns are typically used?',
      ],
      'generate': [
        `What are current best practices for building: ${prompt.slice(0, 100)}?`,
        'What premium UI patterns and animations should be included?',
        'What is the ideal information architecture for this type of content?',
      ],
      'gemini': [
        `Research context for: ${prompt.slice(0, 100)}`,
        'What are the latest trends and best practices?',
      ],
      'anthropic': [
        `Deep analysis for: ${prompt.slice(0, 100)}`,
        'What are the expert-level considerations?',
      ],
    };

    return baseQueries[toolName] || [
      `What are the best practices for: ${prompt.slice(0, 100)}?`,
      'What recommendations do experts make?',
    ];
  }

  /* ── Parallel Research + Generation ── */

  async parallelResearchAndGenerate(
    requests: EnhancedGenerationRequest[],
    concurrency = 3,
  ): Promise<EnhancedGenerationResult[]> {
    const tasks: ParallelTask<EnhancedGenerationResult>[] = requests.map((req, i) => ({
      name: `gen-${i}-${req.type}`,
      fn: () => this.enhancedGenerate(req),
      critical: i === 0, // First request is critical
    }));

    const results = await executeParallel(tasks, concurrency);
    return results
      .filter(r => r.value)
      .map(r => r.value!);
  }

  /* ── Quick Research (for inline context) ── */

  async quickResearch(query: string): Promise<ResearchResult> {
    return this.nlm.webResearch(query, { mode: 'fast' });
  }

  async deepResearch(query: string, urls: string[] = []): Promise<AnalysisResult> {
    return this.nlm.deepAnalysis(query, urls);
  }

  /* ── Prompt Enhancement ── */

  private buildEnhancedPrompt(
    request: EnhancedGenerationRequest,
    researchContext: string,
  ): string {
    const sections: { name: string; content: string; priority: number }[] = [];

    // User's prompt (highest priority)
    sections.push({
      name: 'user_prompt',
      content: request.prompt,
      priority: 1,
    });

    // Research context
    if (researchContext) {
      sections.push({
        name: 'research',
        content: researchContext,
        priority: 2,
      });
    }

    // Existing code context
    if (request.existingCode) {
      sections.push({
        name: 'existing_code',
        content: compressHtmlForPrompt(request.existingCode, 3000),
        priority: 3,
      });
    }

    // Type-specific instructions
    const typeInstructions = this.getTypeInstructions(request.type);
    if (typeInstructions) {
      sections.push({
        name: 'type_instructions',
        content: typeInstructions,
        priority: 2,
      });
    }

    // Budget and compose
    const budgeted = budgetPromptSections(sections, 12000);
    return Array.from(budgeted.values()).filter(Boolean).join('\n\n');
  }

  private getTypeInstructions(type: EnhancedGenerationRequest['type']): string {
    const instructions: Record<string, string> = {
      website: '[ENHANCED GENERATION MODE: Website]\nApply research insights to create a premium, Awwwards-quality website. Follow discovered best practices. Use recommended design patterns. Include all suggested UX improvements.',
      clone: '[ENHANCED CLONE MODE]\nUse research to understand the original site\'s design philosophy. Apply 120% fidelity — match the original while improving based on research recommendations. Add discovered performance optimizations.',
      component: '[ENHANCED COMPONENT MODE]\nBuild components following research-verified patterns. Apply accessibility findings. Use recommended animation and interaction models.',
      app: '[ENHANCED APP MODE]\nArchitect the application using research-backed patterns. Follow discovered stack recommendations. Apply security and performance best practices from research.',
      fix: '[ENHANCED FIX MODE]\nDiagnose using research context. Apply known solutions for identified patterns. Verify fix against quality gates.',
      improve: '[ENHANCED IMPROVE MODE]\nApply all research recommendations. Upgrade to latest discovered best practices. Enhance visual quality, performance, and accessibility based on findings.',
    };
    return instructions[type] || '';
  }

  /* ── Research-Enhanced System Prompt Builder ── */

  buildResearchEnhancedSystemPrompt(
    basePrompt: string,
    analysis?: AnalysisResult,
  ): string {
    if (!analysis) return basePrompt;

    const researchSection = buildCompactResearchContext(analysis, 3000);

    return `${basePrompt}

${researchSection}

[RESEARCH-ENHANCED INSTRUCTIONS]
You have access to deep research analysis. Use the research context above to:
1. Apply discovered best practices and patterns
2. Follow expert recommendations
3. Avoid identified pitfalls and anti-patterns
4. Use suggested technologies, libraries, and approaches
5. Meet the quality standards identified in the research
Your output should demonstrate expert-level knowledge informed by this research.
[/RESEARCH-ENHANCED INSTRUCTIONS]`;
  }
}

/* ────────── Tool Integration Helpers ────────── */

/**
 * Enhance a clone operation with research context
 */
export async function enhanceCloneWithResearch(
  orchestrator: ResearchOrchestrator,
  url: string,
  scrapedData: Record<string, unknown>,
): Promise<ToolEnhancement> {
  return orchestrator.enhanceTool('clone', `Clone and improve: ${url}`, JSON.stringify(scrapedData).slice(0, 500));
}

/**
 * Enhance scraping with intelligent extraction priorities
 */
export async function enhanceScrapeWithResearch(
  orchestrator: ResearchOrchestrator,
  url: string,
): Promise<ToolEnhancement> {
  return orchestrator.enhanceTool('scrape', `Analyze and extract: ${url}`);
}

/**
 * Enhance AI generation with research-backed context
 */
export async function enhanceGenerationWithResearch(
  orchestrator: ResearchOrchestrator,
  prompt: string,
  type: 'gemini' | 'anthropic' = 'gemini',
): Promise<ToolEnhancement> {
  return orchestrator.enhanceTool(type, prompt);
}

/**
 * Create a pre-configured orchestrator for the Aurion app
 */
export function createAurionOrchestrator(config?: Partial<OrchestratorConfig>): ResearchOrchestrator {
  return new ResearchOrchestrator({
    nlmMode: 'api',
    maxResearchContext: 4000,
    parallelResearch: true,
    autoResearch: true,
    researchDepth: 'fast',
    ...config,
  });
}

/* ────────── Research-Enhanced Prompt Sections ────────── */

export const RESEARCH_ENHANCED_METHODOLOGY = `
[RESEARCH-ENHANCED DEVELOPMENT METHODOLOGY]

PHASE 1 — RESEARCH (NotebookLM)
Before generating any code, analyze available research context:
• Review key insights from deep analysis
• Identify applicable best practices and patterns
• Note recommended technologies and approaches
• Flag potential pitfalls and anti-patterns to avoid

PHASE 2 — PLAN (Claude Code Patterns)
Apply error-first thinking and parallel awareness:
• Map research findings to implementation decisions
• Identify critical tasks vs. parallelizable work
• Plan quality gates at each stage
• Budget context across prompt sections

PHASE 3 — EXECUTE (Enhanced Generation)
Generate code informed by research:
• Apply discovered patterns and best practices
• Use recommended libraries and CDNs
• Follow identified accessibility standards
• Include suggested animations and interactions
• Meet researched performance benchmarks

PHASE 4 — VERIFY (Quality Gates)
Validate output against research standards:
• HTML quality checks (structure, completeness)
• Design quality (colors, typography, spacing)
• Interaction quality (animations, responsiveness)
• Performance quality (loading, rendering)
• Accessibility quality (ARIA, contrast, keyboard)

[/RESEARCH-ENHANCED DEVELOPMENT METHODOLOGY]
`;
