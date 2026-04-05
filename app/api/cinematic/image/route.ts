// ═══════════════════════════════════════════════════════════════
// Cinematic 3D Scroll Builder — Image Generation (Google Imagen 3)
// ═══════════════════════════════════════════════════════════════
export const runtime = 'edge';

import { IMAGE_PROVIDERS, resolveGoogleKey } from '@/lib/cinematic/config';

export async function POST(req: Request) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const { prompt, width = 1920, height = 1080 } = body;
  if (!prompt || typeof prompt !== 'string') {
    return Response.json({ error: 'Missing prompt' }, { status: 400 });
  }

  for (const provider of IMAGE_PROVIDERS) {
    const apiKey = resolveGoogleKey();
    if (!apiKey) continue;

    try {
      if (provider.id === 'imagen') {
        const result = await generateWithImagen(apiKey, provider.model, prompt, width, height);
        if (result) return Response.json({ imageUrl: result, provider: provider.name });
      }
    } catch (e) {
      console.error(`[cinematic/image] ${provider.name} failed:`, e);
      continue;
    }
  }

  return Response.json({ error: 'No image provider available. Set GOOGLE_API_KEY.' }, { status: 503 });
}

async function generateWithImagen(apiKey: string, model: string, prompt: string, width: number, height: number): Promise<string | null> {
  // Determine aspect ratio from dimensions
  const aspectRatio = width > height ? '16:9' : height > width ? '9:16' : '1:1';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImages?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio,
          outputOptions: { mimeType: 'image/jpeg' },
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Imagen create: ${res.status} ${await res.text().catch(() => '')}`);
  const data = await res.json();

  const imageBytes = data.generatedImages?.[0]?.image?.imageBytes;
  if (imageBytes) {
    return `data:image/jpeg;base64,${imageBytes}`;
  }

  throw new Error('No image in Imagen response');
}
