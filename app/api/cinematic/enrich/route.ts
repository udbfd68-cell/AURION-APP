// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Cinematic 3D Scroll Builder â€” Prompt Enrichment
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export const runtime = 'edge';

import { LLM_PROVIDERS, resolveGoogleKey } from '@/lib/cinematic/config';
import { CINEMATIC_TEMPLATES } from '@/lib/cinematic/templates';
import { cinematicEnrichSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

const SYSTEM_PROMPT = `Tu es un expert en direction artistique cinÃ©matographique et en gÃ©nÃ©ration d'images/vidÃ©os par IA.

Ta mission : transformer un prompt utilisateur court en une description cinÃ©matique optimisÃ©e pour :
1. GÃ©nÃ©rer une IMAGE haute qualitÃ© (1920Ã—1080) avec profondeur et couches de parallaxe
2. Animer cette image en VIDÃ‰O avec mouvement de camÃ©ra subtil et effet 3D
3. CrÃ©er un SITE WEB scroll-driven avec l'effet "frames on scroll" (style Apple)

Tu dois retourner un JSON avec exactement ces 4 champs :
- "enrichedPrompt": le prompt enrichi global (2-3 phrases cinÃ©matiques)
- "imagePrompt": prompt optimisÃ© pour la gÃ©nÃ©ration d'image (dÃ©taille la composition, lumiÃ¨res, profondeur, couleurs)
- "videoPrompt": prompt optimisÃ© pour la vidÃ©o (mouvement de camÃ©ra, parallaxe, atmosphÃ¨re, durÃ©e 8s)
- "siteDescription": description courte du site final pour le gÃ©nÃ©rateur HTML

RÃ©ponds UNIQUEMENT en JSON valide, sans markdown, sans explication.`;

export async function POST(req: Request) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.ai);
  if (rateLimitError) return rateLimitError;

  let body;
  try { body = cinematicEnrichSchema.parse(await req.json()); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const { prompt, template: templateId } = body;

  const template = CINEMATIC_TEMPLATES.find(t => t.id === templateId);
  const templateContext = template
    ? `\n\nTemplate sÃ©lectionnÃ©: "${template.name}" (${template.category})\nStyle: ${template.description}\nSuffix image: ${template.imagePromptSuffix}\nSuffix vidÃ©o: ${template.videoPromptSuffix}`
    : '';

  const userMessage = `Prompt utilisateur: "${prompt}"${templateContext}\n\nTransforme ce prompt en description cinÃ©matique optimisÃ©e.`;

  // Try LLM providers in priority order
  for (const provider of LLM_PROVIDERS) {
    const apiKey = resolveGoogleKey();
    if (!apiKey) continue;

    try {
      const result = await callLlm(provider.id, apiKey, provider.model, SYSTEM_PROMPT, userMessage);
      if (result) {
        return Response.json(result);
      }
    } catch (e) {
      console.error(`[cinematic/enrich] ${provider.name} failed:`, e);
      continue;
    }
  }

  return Response.json({ error: 'No LLM provider available' }, { status: 503 });
}

async function callLlm(providerId: string, apiKey: string, model: string, system: string, user: string) {
  if (providerId === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseJsonResponse(text);
  }

  return null;
}

function parseJsonResponse(text: string) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse LLM response as JSON');
  }
}
