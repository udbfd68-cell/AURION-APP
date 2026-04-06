import { buildReactBitsContextSection } from '@/lib/system-prompts';
import type { VirtualFS, Message } from '@/lib/types';

interface WorkspaceContextParams {
  activeTab: string;
  previewHtml: string | null;
  clonedHtml: string | null;
  cloneUrl: string;
  codeBlocks: { language: string; code: string }[];
  selectedModel: { name: string };
  showTerminal: boolean;
  terminalLines: string[];
  integrationKeys: Record<string, string>;
  projectFiles: VirtualFS;
  selectedFile: string;
  deviceMode: string;
  runtimeErrors: { message: string; line?: number }[];
  outputFramework: string;
  researchMode: boolean;
  researchContext: string;
  stitchScreens: { page: string; html?: string }[];
  generationHistory: { font?: string; accent?: string; template?: string }[];
}

export function buildWorkspaceContext(p: WorkspaceContextParams): string {
  const parts: string[] = [];
  parts.push('[WORKSPACE STATE]');
  parts.push(`Active tab: ${p.activeTab}`);
  parts.push(`Preview: ${p.previewHtml ? 'has content' : 'empty'}`);
  if (p.clonedHtml) {
    parts.push(`Clone: active (from ${p.cloneUrl || 'URL'})`);
  }
  if (p.showTerminal && p.terminalLines.length > 0) {
    parts.push(`Terminal (last 5 lines):`);
    p.terminalLines.slice(-5).forEach(l => parts.push(`  ${l}`));
  } else {
    parts.push(`Terminal: ${p.showTerminal ? 'visible (empty)' : 'hidden'}`);
  }
  const connectedKeys = Object.keys(p.integrationKeys);
  if (connectedKeys.length > 0) {
    parts.push(`Connected integrations: ${connectedKeys.join(', ')}`);
  }
  const fileList = Object.keys(p.projectFiles);
  if (fileList.length > 0) {
    parts.push(`Project files (${fileList.length}): ${fileList.join(', ')}`);
    const selectedBudget = 2000;
    const otherBudget = fileList.length <= 3 ? 800 : fileList.length <= 8 ? 400 : 200;
    for (const path of fileList) {
      const file = p.projectFiles[path];
      const isSelected = path === p.selectedFile;
      const budget = isSelected ? selectedBudget : otherBudget;
      parts.push(`--- ${path} (${file.language}, ${file.content.length} chars)${isSelected ? ' [ACTIVE]' : ''} ---`);
      parts.push(file.content.slice(0, budget) + (file.content.length > budget ? '\n... (truncated)' : ''));
    }
  } else if (p.codeBlocks.length > 0) {
    parts.push(`Code blocks generated: ${p.codeBlocks.length}`);
  }
  parts.push(`Model: ${p.selectedModel.name}`);
  const fwDescriptions: Record<string, string> = {
    html: ' (Vanilla HTML/CSS/JS + Tailwind)',
    react: ' (React + TypeScript + Vite + Tailwind + shadcn/ui)',
    nextjs: ' (Next.js 14 App Router + React + TypeScript + Tailwind + shadcn/ui)',
    vue: ' (Vue 3 + Composition API + TypeScript + Vite + Tailwind)',
    svelte: ' (Svelte 4 + Vite + Tailwind)',
    angular: ' (Angular 17+ Standalone + TypeScript + Tailwind)',
    python: ' (Python FastAPI + SQLAlchemy + Pydantic)',
    fullstack: ' (React + TypeScript frontend + Express + TypeScript backend)',
  };
  parts.push(`Target framework: ${p.outputFramework}${fwDescriptions[p.outputFramework] || ''}`);
  parts.push(`Device preview: ${p.deviceMode}`);
  if (p.runtimeErrors.length > 0) {
    parts.push(`Runtime errors (${p.runtimeErrors.length}):`);
    p.runtimeErrors.slice(-5).forEach(e => parts.push(`  ✗ ${e.message}${e.line ? ` (line ${e.line})` : ''}`));
  }
  parts.push('');
  parts.push('Use <<FILE:path>>content<</FILE>> to create/update files (FULL content, not diffs).');
  parts.push('For incremental edits, only emit changed files. Other files are preserved.');
  parts.push('');
  parts.push('[VISUAL QUALITY — MANDATORY]');
  parts.push('Every page MUST achieve Awwwards/FWA visual quality. Dark theme #0a0a0a. Syne headings + DM Sans body. clamp() typography.');
  parts.push('Aurora/particle hero bg. Glass navbar. GSAP ScrollTrigger + Lenis smooth scroll. Noise grain. Shimmer text. Glow buttons.');
  parts.push('80-120px section padding. Scroll progress bar. Mobile hamburger 768px. 4-col footer. Accent color consistency.');
  parts.push('.reveal + IntersectionObserver on all sections. ALL CSS self-contained (define .glass, .card, .btn-primary, .container).');
  parts.push('');
  parts.push(buildReactBitsContextSection());
  parts.push('[/VISUAL QUALITY]');
  if (p.generationHistory.length > 0) {
    parts.push('');
    parts.push('[GENERATION MEMORY — avoid repeating these choices]');
    p.generationHistory.forEach((g, i) => {
      const items = [g.font && `font: ${g.font}`, g.accent && `accent: ${g.accent}`, g.template && `"${g.template}"`].filter(Boolean).join(', ');
      if (items) parts.push(`  Gen ${i + 1}: ${items}`);
    });
    parts.push('Pick DIFFERENT fonts and accent colors from the above. Vary the visual identity.');
    parts.push('[/GENERATION MEMORY]');
  }
  if (p.researchMode && p.researchContext) {
    parts.push('');
    parts.push('[NOTEBOOKLM RESEARCH CONTEXT]');
    parts.push(p.researchContext.slice(0, 12000));
    parts.push('[/NOTEBOOKLM RESEARCH CONTEXT]');
  }
  if (p.stitchScreens.length > 0) {
    parts.push('');
    parts.push('[STITCH DESIGN REFERENCE — use these AI-generated designs as structural inspiration]');
    p.stitchScreens.slice(-3).forEach((s, i) => {
      if (s.html && s.html.length > 100) {
        parts.push(`  Screen ${i + 1} (${s.page}): ${s.html.slice(0, 3000)}`);
      }
    });
    parts.push('Adapt layout patterns, component structure, and visual approach from these Stitch designs.');
    parts.push('[/STITCH DESIGN REFERENCE]');
  }
  parts.push('[/WORKSPACE STATE]');
  return parts.join('\n');
}
