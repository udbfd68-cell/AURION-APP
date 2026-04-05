// ═══════════════════════════════════════════════════════════════
// Cinematic 3D Scroll Builder — Provider Configuration
// ═══════════════════════════════════════════════════════════════

/** Resolve Google API key from any of the possible env var names */
export function resolveGoogleKey(): string {
  return process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || '';
}

/** Image generation — Google Imagen 3 */
export const IMAGE_PROVIDERS = [
  {
    id: 'imagen',
    name: 'Google Imagen 3',
    envKey: 'GOOGLE_API_KEY',
    model: 'imagen-3.0-generate-002',
  },
] as const;

/** Video generation — Google Veo 3 */
export const VIDEO_PROVIDERS = [
  {
    id: 'veo3',
    name: 'Google Veo 3',
    envKey: 'GOOGLE_API_KEY',
    model: 'veo-3',
  },
] as const;

/** LLM for prompt enrichment and site generation — Gemini */
export const LLM_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash',
    envKey: 'GOOGLE_API_KEY',
    model: 'gemini-2.5-flash',
  },
] as const;

export const DEFAULT_FPS = 24;
export const DEFAULT_VIDEO_DURATION = 8; // seconds
export const MAX_POLL_ATTEMPTS = 60;
export const POLL_INTERVAL_MS = 5000;
