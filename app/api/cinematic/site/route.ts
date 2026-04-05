// ═══════════════════════════════════════════════════════════════
// Cinematic 3D Scroll Builder — Site HTML Generation via LLM
// ═══════════════════════════════════════════════════════════════
export const runtime = 'edge';

import { LLM_PROVIDERS, resolveGoogleKey } from '@/lib/cinematic/config';
import { CINEMATIC_TEMPLATES } from '@/lib/cinematic/templates';
import { generateScrollSiteHtml } from '@/lib/cinematic/site-template';

export async function POST(req: Request) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const { enrichedPrompt, template: templateId, frameCount, fps, siteDescription } = body;

  const template = CINEMATIC_TEMPLATES.find(t => t.id === templateId) || CINEMATIC_TEMPLATES[0];

  // Generate base HTML from template
  const baseHtml = generateScrollSiteHtml(template, frameCount || 192, fps || 24, enrichedPrompt || '');

  // If we have an LLM available, enhance the HTML with custom content
  const llmEnhanced = await enhanceWithLlm(baseHtml, template, siteDescription || enrichedPrompt || '');

  return Response.json({
    html: llmEnhanced || baseHtml,
    provider: llmEnhanced ? 'LLM-enhanced' : 'template-only',
  });
}

async function enhanceWithLlm(baseHtml: string, template: (typeof CINEMATIC_TEMPLATES)[number], description: string): Promise<string | null> {
  const system = `Tu es un expert en développement web front-end spécialisé dans les sites cinématiques scroll-driven.

Tu reçois un HTML de base pour un site avec animation de frames au scroll (style Apple).
Ta mission : améliorer UNIQUEMENT le contenu textuel des sections (titres h2, paragraphes, texte hero) pour correspondre à la description du projet.

RÈGLES STRICTES :
- Ne modifie PAS le JavaScript du scroll engine
- Ne modifie PAS la structure canvas/scroll-spacer
- Ne modifie PAS les noms de fichiers frames
- Tu peux ajouter des sections de contenu supplémentaires
- Tu peux améliorer le CSS pour plus de style
- Garde le même système de variables CSS
- Retourne le HTML COMPLET (pas un diff)
- Pas de markdown, pas d'explication, juste le HTML`;

  const userMsg = `Description du site : "${description}"
Template : ${template.name} (${template.category})
Style : font=${template.siteStyle.fontFamily}, accent=${template.siteStyle.accentColor}

Voici le HTML de base à améliorer :

${baseHtml}`;

  for (const provider of LLM_PROVIDERS) {
    const apiKey = resolveGoogleKey();
    if (!apiKey) continue;

    try {
      const result = await callLlmForHtml(provider.id, apiKey, provider.model, system, userMsg);
      if (result && result.includes('<canvas') && result.includes('cinematic-canvas')) {
        return result;
      }
    } catch (e) {
      console.error(`[cinematic/site] ${provider.name} failed:`, e);
      continue;
    }
  }

  return null;
}

async function callLlmForHtml(providerId: string, apiKey: string, model: string, system: string, user: string): Promise<string | null> {
  if (providerId === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: 8192 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    return extractHtml(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
  }

  return null;
}

function extractHtml(text: string): string {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:html)?\s*/g, '').replace(/```\s*/g, '').trim();
  // Find the HTML document
  const match = cleaned.match(/<!DOCTYPE[\s\S]*<\/html>/i);
  return match ? match[0] : cleaned;
}
