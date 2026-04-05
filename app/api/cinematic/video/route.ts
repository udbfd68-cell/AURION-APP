// ═══════════════════════════════════════════════════════════════
// Cinematic 3D Scroll Builder — Video Generation (Google Veo 3)
// ═══════════════════════════════════════════════════════════════
export const runtime = 'edge';

import { VIDEO_PROVIDERS, MAX_POLL_ATTEMPTS, POLL_INTERVAL_MS, resolveGoogleKey } from '@/lib/cinematic/config';

export async function POST(req: Request) {
  const { prompt, imageUrl } = await req.json();
  if (!prompt || typeof prompt !== 'string') {
    return Response.json({ error: 'Missing prompt' }, { status: 400 });
  }

  for (const provider of VIDEO_PROVIDERS) {
    const apiKey = resolveGoogleKey();
    if (!apiKey) continue;

    try {
      if (provider.id === 'veo3') {
        const result = await generateWithVeo3(apiKey, prompt, imageUrl);
        if (result) return Response.json({ videoUrl: result, provider: provider.name, status: 'completed' });
      }
    } catch (e) {
      console.error(`[cinematic/video] ${provider.name} failed:`, e);
      continue;
    }
  }

  return Response.json({ error: 'No video provider available. Set GOOGLE_API_KEY.' }, { status: 503 });
}

// ═══ Google Veo 3 ═══
async function generateWithVeo3(apiKey: string, prompt: string, imageUrl?: string): Promise<string | null> {
  const requestBody: Record<string, unknown> = {
    instances: [{ prompt }],
    parameters: {
      aspectRatio: '16:9',
      personGeneration: 'allow_adult',
      sampleCount: 1,
    },
  };

  if (imageUrl) {
    (requestBody.instances as Record<string, unknown>[])[0].image = { imageUri: imageUrl };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/veo-3:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) throw new Error(`Veo3 create: ${res.status} ${await res.text()}`);
  const operation = await res.json();
  const opName = operation.name;
  if (!opName) throw new Error('No operation name from Veo3');

  // Poll for completion
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const pollRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${apiKey}`
    );
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();

    if (pollData.done) {
      const videoUri = pollData.response?.generatedSamples?.[0]?.video?.uri;
      if (videoUri) return videoUri;
      throw new Error('Veo3 completed but no video URI');
    }
  }

  throw new Error('Veo3 timed out');
}
