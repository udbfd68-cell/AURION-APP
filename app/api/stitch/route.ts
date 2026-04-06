/**
 * Google Stitch API Route â€” AI-powered UI/UX design generation
 * Uses the official @google/stitch-sdk to:
 * - Create Stitch projects
 * - Generate high-fidelity screens from text prompts
 * - Edit existing screens
 * - Generate design variants
 * - List projects & screens
 * - Download HTML + screenshots
 *
 * Requires STITCH_API_KEY env variable (from Google Cloud)
 */

import { NextRequest } from 'next/server';
import { Stitch, StitchToolClient, StitchError } from '@google/stitch-sdk';
import { stitchSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

// Server-only â€” cannot use edge runtime because SDK uses MCP protocol
export const runtime = 'nodejs';

function getClient(): Stitch {
  const apiKey = process.env.STITCH_API_KEY;
  if (!apiKey) throw new Error('STITCH_API_KEY not configured');
  const toolClient = new StitchToolClient({ apiKey });
  return new Stitch(toolClient);
}

export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.ai);
  if (rateLimitError) return rateLimitError;

  const apiKey = process.env.STITCH_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'STITCH_API_KEY not configured. Add it in your .env.local file.' }, { status: 500 });
  }

  let body: ReturnType<typeof stitchSchema.parse>;

  try {
    body = stitchSchema.parse(await req.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action } = body;
  if (!action) {
    return Response.json({ error: 'Missing action parameter' }, { status: 400 });
  }

  try {
    const stitch = getClient();

    switch (action) {
      // â”€â”€â”€ List all projects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'list_projects': {
        const projects = await stitch.projects();
        return Response.json({
          projects: projects.map(p => ({
            id: p.id,
            projectId: p.projectId,
          })),
        });
      }

      // â”€â”€â”€ Create a new project â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'create_project': {
        if (!body.title) return Response.json({ error: 'Missing title' }, { status: 400 });
        const project = await stitch.createProject(body.title);
        return Response.json({
          id: project.id,
          projectId: project.projectId,
        });
      }

      // â”€â”€â”€ Generate a screen from text prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'generate_screen': {
        if (!body.projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        if (!body.prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 });

        const project = stitch.project(body.projectId);
        const deviceType = (body.deviceType as 'DESKTOP' | 'MOBILE' | 'TABLET' | 'AGNOSTIC') || 'DESKTOP';
        const screen = await project.generate(body.prompt, deviceType);

        const [htmlUrl, imageUrl] = await Promise.all([
          screen.getHtml(),
          screen.getImage(),
        ]);

        return Response.json({
          screenId: screen.screenId,
          projectId: screen.projectId,
          htmlUrl,
          imageUrl,
        });
      }

      // â”€â”€â”€ Edit an existing screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'edit_screen': {
        if (!body.projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        if (!body.screenId) return Response.json({ error: 'Missing screenId' }, { status: 400 });
        if (!body.prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 });

        const project = stitch.project(body.projectId);
        const screen = await project.getScreen(body.screenId);
        const edited = await screen.edit(body.prompt);

        const [htmlUrl, imageUrl] = await Promise.all([
          edited.getHtml(),
          edited.getImage(),
        ]);

        return Response.json({
          screenId: edited.screenId,
          projectId: edited.projectId,
          htmlUrl,
          imageUrl,
        });
      }

      // â”€â”€â”€ Generate design variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'generate_variants': {
        if (!body.projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        if (!body.screenId) return Response.json({ error: 'Missing screenId' }, { status: 400 });
        if (!body.prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 });

        const project = stitch.project(body.projectId);
        const screen = await project.getScreen(body.screenId);
        const variants = await screen.variants(body.prompt, {
          variantCount: body.variantCount || 3,
          creativeRange: 'EXPLORE',
          aspects: ['COLOR_SCHEME', 'LAYOUT', 'TEXT_FONT'],
        });

        const results = await Promise.all(
          variants.map(async (v) => ({
            screenId: v.screenId,
            htmlUrl: await v.getHtml(),
            imageUrl: await v.getImage(),
          }))
        );

        return Response.json({ variants: results });
      }

      // â”€â”€â”€ List screens in a project â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'list_screens': {
        if (!body.projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });

        const project = stitch.project(body.projectId);
        const screens = await project.screens();

        return Response.json({
          screens: screens.map(s => ({
            id: s.id,
            screenId: s.screenId,
            projectId: s.projectId,
          })),
        });
      }

      // â”€â”€â”€ Get screen HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'get_screen_html': {
        if (!body.projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });
        if (!body.screenId) return Response.json({ error: 'Missing screenId' }, { status: 400 });

        const project = stitch.project(body.projectId);
        const screen = await project.getScreen(body.screenId);
        const htmlUrl = await screen.getHtml();

        // Fetch the actual HTML content
        const htmlRes = await fetch(htmlUrl);
        const html = await htmlRes.text();

        return Response.json({ html, htmlUrl });
      }

      // â”€â”€â”€ Enhance prompt (Stitch-optimized) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'enhance_prompt': {
        if (!body.prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 });
        const enhanced = enhanceStitchPrompt(body.prompt, body.designSystem);
        return Response.json({ enhanced });
      }

      // â”€â”€â”€ Stitch Loop: generate multiple pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'stitch_loop': {
        if (!body.projectId && !body.title) return Response.json({ error: 'Missing projectId or title' }, { status: 400 });
        if (!body.pages || !Array.isArray(body.pages) || body.pages.length === 0) {
          return Response.json({ error: 'Missing pages array [{name, prompt}]' }, { status: 400 });
        }

        // Create project if needed
        let projectId = body.projectId;
        if (!projectId) {
          const project = await stitch.createProject(body.title || 'Stitch Loop Project');
          projectId = project.projectId;
        }

        const project = stitch.project(projectId);
        const results: { page: string; screenId: string; htmlUrl: string; imageUrl: string; html?: string }[] = [];

        // Build pages sequentially (each may depend on previous for nav consistency)
        for (const page of body.pages) {
          const prompt = body.designSystem
            ? `${page.prompt}\n\n**DESIGN SYSTEM (REQUIRED):**\n${body.designSystem}`
            : page.prompt;

          const screen = await project.generate(prompt, 'DESKTOP');
          const [htmlUrl, imageUrl] = await Promise.all([
            screen.getHtml(),
            screen.getImage(),
          ]);

          // Fetch actual HTML for each page
          let html: string | undefined;
          try {
            const htmlRes = await fetch(htmlUrl);
            html = await htmlRes.text();
          } catch { /* HTML download optional */ }

          results.push({
            page: page.name || 'Untitled',
            screenId: screen.screenId,
            htmlUrl,
            imageUrl,
            html,
          });
        }

        return Response.json({ projectId, pages: results });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof StitchError) {
      const status = err.code === 'AUTH_FAILED' ? 401
        : err.code === 'NOT_FOUND' ? 404
        : err.code === 'RATE_LIMITED' ? 429
        : err.code === 'PERMISSION_DENIED' ? 403
        : 500;
      return Response.json({
        error: err.message,
        code: err.code,
        recoverable: err.recoverable,
      }, { status });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENHANCE PROMPT â€” Stitch-optimized prompt engineering
// Based on google-labs-code/stitch-skills enhance-prompt skill
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function enhanceStitchPrompt(rawPrompt: string, designSystem?: string): string {
  const parts: string[] = [];

  // 1. Analyze and enhance the core description
  let corePrompt = rawPrompt;

  // Replace vague terms with UI/UX keywords
  const replacements: [RegExp, string][] = [
    [/\bmenu at the top\b/gi, 'sticky navigation bar with logo and menu items'],
    [/\bnice header\b/gi, 'navigation bar with glassmorphism effect and centered logo'],
    [/\bbutton\b/gi, 'primary call-to-action button'],
    [/\blist of items\b/gi, 'card grid layout with thumbnails'],
    [/\bpicture area\b/gi, 'hero section with full-width image'],
    [/\bform\b/gi, 'form with labeled input fields and submit button'],
    [/\bsidebar\b/gi, 'collapsible sidebar with icon navigation'],
    [/\bfooter\b/gi, 'multi-column footer with links and social icons'],
    [/\bpopup\b/gi, 'modal dialog with backdrop blur'],
    [/\bslider\b/gi, 'image carousel with navigation dots'],
    [/\btable\b/gi, 'data table with sortable columns and row hover'],
  ];

  for (const [pattern, replacement] of replacements) {
    corePrompt = corePrompt.replace(pattern, replacement);
  }

  // Amplify the vibe if no style descriptors present
  const hasStyle = /minimal|modern|clean|bold|vibrant|elegant|dark|light|glass|gradient/i.test(corePrompt);
  if (!hasStyle) {
    corePrompt += '. Clean, modern design with generous whitespace and subtle shadows.';
  }

  parts.push(corePrompt);

  // 2. Inject design system if provided
  if (designSystem) {
    parts.push('');
    parts.push('**DESIGN SYSTEM (REQUIRED):**');
    parts.push(designSystem);
  }

  // 3. Add page structure if not already present
  const hasStructure = /\*\*.*structure|section|header|hero|footer/i.test(rawPrompt);
  if (!hasStructure) {
    parts.push('');
    parts.push('**Page Structure:**');
    parts.push('1. **Header:** Navigation with logo and menu items');
    parts.push('2. **Hero Section:** Headline, subtext, and primary CTA');
    parts.push('3. **Content Area:** Main content with visual elements');
    parts.push('4. **Footer:** Links, social icons, copyright');
  }

  return parts.join('\n');
}
