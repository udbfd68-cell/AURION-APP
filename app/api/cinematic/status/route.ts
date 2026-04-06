// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Cinematic 3D Scroll Builder â€” API Key Status Check
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export const runtime = 'edge';

import { IMAGE_PROVIDERS, VIDEO_PROVIDERS, LLM_PROVIDERS, resolveGoogleKey } from '@/lib/cinematic/config';
import type { ApiStatusResponse, ProviderStatus } from '@/lib/cinematic/types';

export async function GET() {
  const providers: ProviderStatus[] = [];
  let hasImage = false;
  let hasVideo = false;
  let hasLlm = false;
  const googleAvailable = !!resolveGoogleKey();

  for (const p of IMAGE_PROVIDERS) {
    const available = googleAvailable;
    if (available) hasImage = true;
    providers.push({ name: p.name, available, category: 'image' });
  }

  for (const p of VIDEO_PROVIDERS) {
    const available = googleAvailable;
    if (available) hasVideo = true;
    providers.push({ name: p.name, available, category: 'video' });
  }

  for (const p of LLM_PROVIDERS) {
    const available = googleAvailable;
    if (available) hasLlm = true;
    providers.push({ name: p.name, available, category: 'llm' });
  }

  const missingCritical: string[] = [];
  if (!hasImage) missingCritical.push('Image generation (GOOGLE_API_KEY)');
  if (!hasVideo) missingCritical.push('Video generation (GOOGLE_API_KEY)');
  if (!hasLlm) missingCritical.push('LLM (GOOGLE_API_KEY)');

  const resp: ApiStatusResponse = {
    providers,
    canRunFullPipeline: hasImage && hasVideo && hasLlm,
    missingCritical,
  };

  return Response.json(resp);
}
