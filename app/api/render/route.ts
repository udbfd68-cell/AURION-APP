import { NextRequest, NextResponse } from 'next/server';
import { renderSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

const RENDER_API = 'https://api.render.com/v1';

function getApiKey() {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error('RENDER_API_KEY not configured');
  return key;
}

async function renderFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RENDER_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Render API ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function getOwnerId(): Promise<string> {
  const owners = await renderFetch('/owners?limit=1');
  if (!Array.isArray(owners) || !owners.length || !owners[0]?.owner?.id) {
    throw new Error('No Render workspace found. Check your RENDER_API_KEY.');
  }
  return owners[0].owner.id;
}

// GET â€” list IDE services or get a specific service status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');

    if (serviceId) {
      const data = await renderFetch(`/services/${encodeURIComponent(serviceId)}`);
      const url = data?.serviceDetails?.url || null;
      return NextResponse.json({
        id: data.id,
        name: data.name,
        status: data.suspended,
        url,
        createdAt: data.createdAt,
        type: data.type,
      });
    }

    // List all aurion-ide services
    const services = await renderFetch('/services?type=web_service&limit=20');
    const list = Array.isArray(services) ? services : [];
    const ideServices = list
      .filter((s: { service?: { name?: string } }) => s?.service?.name?.startsWith('aurion-ide-'))
      .map((s: { service: { id: string; name: string; suspended: string; createdAt: string; serviceDetails?: { url?: string } } }) => ({
        id: s.service.id,
        name: s.service.name,
        status: s.service.suspended,
        url: s.service.serviceDetails?.url || null,
        createdAt: s.service.createdAt,
      }));

    return NextResponse.json({ services: ideServices });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST â€” create a new code-server IDE instance
export async function POST(req: NextRequest) {
  // â”€â”€ Security: Origin validation + Rate limiting â”€â”€
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.deploy);
  if (rateLimitError) return rateLimitError;

  try {
    const body = renderSchema.parse(await req.json());
    const projectName = String(body.projectName || 'default').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase().slice(0, 30);
    const suffix = Date.now().toString(36);
    const serviceName = `aurion-ide-${projectName}-${suffix}`;

    // Encode project files as base64 JSON for the container
    const files: Record<string, { content: string }> = body.files || {};
    const fileEntries = Object.entries(files).map(([path, f]) => ({
      p: path,
      c: (f as { content: string }).content || '',
    }));
    const projectDataB64 = Buffer.from(JSON.stringify(fileEntries)).toString('base64');

    const ownerId = await getOwnerId();

    const envVars = [
      { key: 'PORT', value: '8080' },
      { key: 'CS_DISABLE_IFRAME_PROTECTION', value: 'true' },
    ];
    // Only include PROJECT_DATA if files exist and fit in env var (< 512KB)
    if (fileEntries.length > 0 && projectDataB64.length < 512000) {
      envVars.push({ key: 'PROJECT_DATA', value: projectDataB64 });
    }

    // Node.js setup script: write project files then start code-server
    // This runs as eval(process.env.NODE_SETUP) â€” no shell quoting needed
    const nodeSetup = [
      'var fs=require("fs"),path=require("path"),cp=require("child_process");',
      'var dir="/home/coder/project";',
      'fs.mkdirSync(dir,{recursive:true});',
      'if(process.env.PROJECT_DATA){',
      'try{var d=JSON.parse(Buffer.from(process.env.PROJECT_DATA,"base64").toString());',
      'd.forEach(function(f){var p=path.join(dir,f.p);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,f.c);});}catch(e){console.error("File setup error:",e);}',
      '}',
      'cp.execFileSync("code-server",["--auth","none","--bind-addr","0.0.0.0:8080",dir],{stdio:"inherit"});',
    ].join('');
    envVars.push({ key: 'NODE_SETUP', value: nodeSetup });

    // Render splits dockerCommand into exec-form (no shell), so no pipes/&& allowed
    // code-server bundles node at /usr/lib/code-server/lib/node
    const dockerCommand = '/usr/lib/code-server/lib/node -e eval(process.env.NODE_SETUP)';

    const data = await renderFetch('/services', {
      method: 'POST',
      body: JSON.stringify({
        type: 'web_service',
        name: serviceName,
        ownerId,
        autoDeploy: 'no',
        image: {
          imagePath: 'docker.io/codercom/code-server:latest',
        },
        envVars,
        serviceDetails: {
          env: 'image',
          plan: 'starter',
          region: 'frankfurt',
          numInstances: 1,
          envSpecificDetails: {
            dockerCommand,
          },
        },
      }),
    });

    const svc = data?.service || data;
    return NextResponse.json({
      id: svc.id,
      name: svc.name,
      url: svc.serviceDetails?.url || null,
      status: 'creating',
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE â€” delete an IDE service
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('serviceId');
    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId required' }, { status: 400 });
    }

    await fetch(`${RENDER_API}/services/${encodeURIComponent(serviceId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Accept': 'application/json',
      },
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
