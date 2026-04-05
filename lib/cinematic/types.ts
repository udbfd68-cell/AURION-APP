// ═══════════════════════════════════════════════════════════════
// Cinematic 3D Scroll Builder — Type Definitions
// ═══════════════════════════════════════════════════════════════

export type PipelineStep = 'prompt' | 'image' | 'video' | 'frames' | 'site' | 'export';

export type StepStatus = 'idle' | 'running' | 'done' | 'error' | 'skipped';

export interface PipelineNode {
  step: PipelineStep;
  label: string;
  status: StepStatus;
  progress?: number;       // 0-100
  error?: string;
  preview?: string;        // Data URL or blob URL for preview
  duration?: number;       // ms elapsed
}

export interface CinematicState {
  nodes: PipelineNode[];
  prompt: string;
  enrichedPrompt: string;
  selectedTemplate: string;
  imageUrl: string;
  videoUrl: string;
  frames: string[];        // Array of data URLs (extracted frames)
  siteHtml: string;
  fps: 15 | 24 | 30;
  isRunning: boolean;
}

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;           // Accent color for UI
  imagePromptSuffix: string;
  videoPromptSuffix: string;
  siteStyle: {
    fontFamily: string;
    bgColor: string;
    textColor: string;
    accentColor: string;
    overlayOpacity: number;
    sectionCount: number;
    heroTitle: string;
    heroSubtitle: string;
  };
  defaultFps: 15 | 24 | 30;
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  category: 'image' | 'video' | 'llm';
}

export interface ApiStatusResponse {
  providers: ProviderStatus[];
  canRunFullPipeline: boolean;
  missingCritical: string[];
}

export interface EnrichRequest {
  prompt: string;
  template: string;
}

export interface EnrichResponse {
  enrichedPrompt: string;
  imagePrompt: string;
  videoPrompt: string;
  siteDescription: string;
}

export interface ImageRequest {
  prompt: string;
  width?: number;
  height?: number;
}

export interface ImageResponse {
  imageUrl: string;
  provider: string;
}

export interface VideoRequest {
  prompt: string;
  imageUrl?: string;
  duration?: number;
}

export interface VideoResponse {
  videoUrl: string;
  provider: string;
  operationId?: string;     // For polling-based providers
  status?: 'processing' | 'completed' | 'failed';
}

export interface SiteRequest {
  enrichedPrompt: string;
  template: string;
  frameCount: number;
  fps: number;
  siteDescription: string;
}

export interface SiteResponse {
  html: string;
  provider: string;
}
