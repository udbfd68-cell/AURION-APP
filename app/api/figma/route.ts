/**
 * Figma â†’ Code API Route
 *
 * Takes a Figma file/frame URL, fetches the design via Figma API,
 * and returns structured design data (layout, colors, typography, assets)
 * for the AI to convert into pixel-perfect HTML/CSS.
 *
 * Requires FIGMA_ACCESS_TOKEN env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { figmaSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const FIGMA_API = 'https://api.figma.com/v1';

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number }; opacity?: number }>;
  strokes?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number } }>;
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  characters?: string;
  style?: {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    lineHeightPx?: number;
    letterSpacing?: number;
    textAlignHorizontal?: string;
  };
  effects?: Array<{ type: string; radius?: number; offset?: { x: number; y: number }; color?: { r: number; g: number; b: number; a: number } }>;
  children?: FigmaNode[];
  layoutMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  constraints?: { vertical: string; horizontal: string };
  opacity?: number;
  visible?: boolean;
}

function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } | null {
  // Match patterns:
  // https://www.figma.com/file/KEY/Title
  // https://www.figma.com/design/KEY/Title?node-id=X-Y
  // https://www.figma.com/proto/KEY/Title
  const match = url.match(/figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/);
  if (!match) return null;

  const fileKey = match[1];
  const nodeMatch = url.match(/node-id=([^&]+)/);
  const nodeId = nodeMatch ? decodeURIComponent(nodeMatch[1]) : undefined;

  return { fileKey, nodeId };
}

function rgbaToHex(c: { r: number; g: number; b: number; a: number }): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

function extractColors(node: FigmaNode): string[] {
  const colors: string[] = [];
  if (node.fills) {
    for (const fill of node.fills) {
      if (fill.type === 'SOLID' && fill.color) {
        colors.push(rgbaToHex(fill.color));
      }
    }
  }
  if (node.strokes) {
    for (const stroke of node.strokes) {
      if (stroke.type === 'SOLID' && stroke.color) {
        colors.push(rgbaToHex(stroke.color));
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      colors.push(...extractColors(child));
    }
  }
  return [...new Set(colors)];
}

function extractTypography(node: FigmaNode): Array<{ font: string; weight: number; size: number; text: string }> {
  const typo: Array<{ font: string; weight: number; size: number; text: string }> = [];
  if (node.type === 'TEXT' && node.style && node.characters) {
    typo.push({
      font: node.style.fontFamily || 'sans-serif',
      weight: node.style.fontWeight || 400,
      size: node.style.fontSize || 16,
      text: node.characters.slice(0, 250),
    });
  }
  if (node.children) {
    for (const child of node.children) {
      typo.push(...extractTypography(child));
    }
  }
  return typo;
}

function flattenNodes(node: FigmaNode, depth = 0): Array<{ type: string; name: string; depth: number; bounds?: { w: number; h: number }; text?: string; layout?: string }> {
  const items: Array<{ type: string; name: string; depth: number; bounds?: { w: number; h: number }; text?: string; layout?: string }> = [];

  if (node.visible === false) return items;

  items.push({
    type: node.type,
    name: node.name,
    depth,
    bounds: node.absoluteBoundingBox ? { w: Math.round(node.absoluteBoundingBox.width), h: Math.round(node.absoluteBoundingBox.height) } : undefined,
    text: node.characters?.slice(0, 400),
    layout: node.layoutMode || undefined,
  });

  if (node.children) {
    for (const child of node.children) {
      items.push(...flattenNodes(child, depth + 1));
    }
  }
  return items;
}

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.standard);
  if (rateLimitError) return rateLimitError;

  try {
    const result = await parseBody(req, figmaSchema);
    if ('error' in result) return result.error;
    const { url, token, mode } = result.data;

    const figmaToken = token || process.env.FIGMA_ACCESS_TOKEN || '';
    if (!figmaToken) {
      return NextResponse.json({ error: 'Figma access token required. Set FIGMA_ACCESS_TOKEN env var or provide token in request.' }, { status: 400 });
    }

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing Figma URL' }, { status: 400 });
    }

    const parsed = parseFigmaUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid Figma URL. Expected: https://www.figma.com/design/FILE_KEY/...' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'X-Figma-Token': figmaToken,
    };

    // Fetch file data
    const fileUrl = parsed.nodeId
      ? `${FIGMA_API}/files/${parsed.fileKey}?ids=${encodeURIComponent(parsed.nodeId)}&depth=5`
      : `${FIGMA_API}/files/${parsed.fileKey}?depth=5`;

    const fileResp = await fetch(fileUrl, { headers, signal: AbortSignal.timeout(60000) });
    if (!fileResp.ok) {
      const err = await fileResp.text().catch(() => '');
      if (fileResp.status === 403) {
        return NextResponse.json({ error: 'Figma token invalid or no access to this file. Generate a token at figma.com/developers.' }, { status: 403 });
      }
      return NextResponse.json({ error: `Figma API error ${fileResp.status}: ${err.slice(0, 200)}` }, { status: fileResp.status });
    }

    const fileData = await fileResp.json();

    // Mode: 'components' â€” extract all components from the file
    if (mode === 'components') {
      const components: Array<{ id: string; name: string; description: string; type: string }> = [];
      const extractComponents = (node: FigmaNode) => {
        if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
          components.push({ id: node.id, name: node.name, description: '', type: node.type });
        }
        if (node.children) node.children.forEach(c => extractComponents(c));
      };
      extractComponents(fileData.document);
      return NextResponse.json({ components, fileName: fileData.name });
    }

    // Mode: 'frames' â€” list all top-level frames/pages
    if (mode === 'frames') {
      const frames: Array<{ id: string; name: string; type: string; width: number; height: number; childCount: number }>[] = [];
      const pages = fileData.document.children || [];
      for (const page of pages) {
        const pageFrames: typeof frames[0] = [];
        for (const child of (page.children || [])) {
          pageFrames.push({
            id: child.id,
            name: child.name,
            type: child.type,
            width: Math.round(child.absoluteBoundingBox?.width || 0),
            height: Math.round(child.absoluteBoundingBox?.height || 0),
            childCount: child.children?.length || 0,
          });
        }
        frames.push(pageFrames);
      }
      return NextResponse.json({
        fileName: fileData.name,
        pages: pages.map((p: FigmaNode, i: number) => ({ name: p.name, frames: frames[i] || [] })),
      });
    }

    // Default mode: extract full design data for a specific frame
    let targetNode: FigmaNode = fileData.document;
    if (parsed.nodeId) {
      function findNode(node: FigmaNode, id: string): FigmaNode | null {
        const normalizedId = id.replace('-', ':');
        if (node.id === normalizedId || node.id === id) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child, id);
            if (found) return found;
          }
        }
        return null;
      }
      const found = findNode(targetNode, parsed.nodeId);
      if (found) targetNode = found;
    } else {
      const firstPage = targetNode.children?.[0];
      if (firstPage?.children?.[0]) {
        targetNode = firstPage.children[0];
      }
    }

    // Extract design data
    const colors = extractColors(targetNode).slice(0, 40);
    const typography = extractTypography(targetNode).slice(0, 60);
    const structure = flattenNodes(targetNode).slice(0, 200);
    const bounds = targetNode.absoluteBoundingBox;

    // Extract components used in this frame
    const components: Array<{ name: string; type: string; count: number }> = [];
    const compCount = new Map<string, { type: string; count: number }>();
    const countComponents = (node: FigmaNode) => {
      if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
        const key = node.name;
        const existing = compCount.get(key) || { type: node.type, count: 0 };
        existing.count++;
        compCount.set(key, existing);
      }
      if (node.children) node.children.forEach(c => countComponents(c));
    };
    countComponents(targetNode);
    for (const [name, data] of compCount) {
      components.push({ name, type: data.type, count: data.count });
    }

    // Extract effects (shadows, blurs)
    const effects: Array<{ type: string; radius?: number }> = [];
    const extractEffects = (node: FigmaNode) => {
      if (node.effects) {
        for (const e of node.effects) {
          effects.push({ type: e.type, radius: e.radius });
        }
      }
      if (node.children) node.children.forEach(c => extractEffects(c));
    };
    extractEffects(targetNode);
    const uniqueEffects = [...new Map(effects.map(e => [`${e.type}-${e.radius}`, e])).values()].slice(0, 20);

    // Get image exports for the frame
    const nodeId = targetNode.id;
    const imgResp = await fetch(`${FIGMA_API}/images/${parsed.fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`, {
      headers,
      signal: AbortSignal.timeout(60000),
    });
    let screenshotUrl = '';
    if (imgResp.ok) {
      const imgData = await imgResp.json();
      screenshotUrl = imgData.images?.[nodeId] || '';
    }

    // Build design description for AI
    const fontFamilies = [...new Set(typography.map(t => t.font))];
    const fontSizes = [...new Set(typography.map(t => t.size))].sort((a, b) => b - a);

    const designData = {
      fileName: fileData.name || 'Untitled',
      frameName: targetNode.name,
      frameSize: bounds ? { width: Math.round(bounds.width), height: Math.round(bounds.height) } : null,
      screenshotUrl,
      colors,
      fonts: fontFamilies,
      fontSizes,
      typography: typography.slice(0, 30),
      structure: structure.slice(0, 120),
      components,
      effects: uniqueEffects,
      layoutMode: targetNode.layoutMode || 'NONE',
      designPrompt: buildDesignPrompt(fileData.name, targetNode.name, colors, fontFamilies, fontSizes, typography, structure, bounds, components),
    };

    return NextResponse.json(designData);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildDesignPrompt(
  fileName: string,
  frameName: string,
  colors: string[],
  fonts: string[],
  fontSizes: number[],
  typography: Array<{ font: string; weight: number; size: number; text: string }>,
  structure: Array<{ type: string; name: string; depth: number; bounds?: { w: number; h: number }; text?: string; layout?: string }>,
  bounds?: { x: number; y: number; width: number; height: number } | null,
  components?: Array<{ name: string; type: string; count: number }>,
): string {
  let prompt = `# Figma Design Import: "${fileName}" â†’ Frame: "${frameName}"\n`;
  if (bounds) prompt += `Canvas: ${Math.round(bounds.width)}x${Math.round(bounds.height)}px\n`;
  prompt += `\n## Color Palette (exact hex values â€” match these EXACTLY):\n${colors.join(', ')}\n`;
  prompt += `\n## Typography:\n- Fonts: ${fonts.join(', ')}\n- Size scale: ${fontSizes.join('px, ')}px\n`;
  prompt += `\n## Text Content (from design):\n`;
  for (const t of typography.slice(0, 25)) {
    prompt += `- "${t.text}" (${t.font} ${t.weight} ${t.size}px)\n`;
  }
  if (components && components.length > 0) {
    prompt += `\n## Components Used:\n`;
    for (const c of components.slice(0, 30)) {
      prompt += `- ${c.name} (${c.type}) x${c.count}\n`;
    }
  }
  prompt += `\n## Layout Structure:\n`;
  for (const s of structure.slice(0, 80)) {
    const indent = '  '.repeat(s.depth);
    const sizeInfo = s.bounds ? ` [${s.bounds.w}x${s.bounds.h}]` : '';
    const textInfo = s.text ? ` â†’ "${s.text.slice(0, 100)}"` : '';
    const layoutInfo = s.layout ? ` (${s.layout})` : '';
    prompt += `${indent}${s.type}: ${s.name}${sizeInfo}${layoutInfo}${textInfo}\n`;
  }
  prompt += `\nReproduce this design as pixel-perfect HTML/CSS with EXACT colors, fonts, sizes, and layout. Use the structure above as your blueprint. Create reusable CSS classes for repeated components.`;
  return prompt;
}
