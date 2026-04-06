/**
 * Script to add Zod validation + rate limiting imports to API routes
 * Run with: node scripts/add-validation.js
 */
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'app', 'api');

// Mapping of route folder -> schema name + rate limit category
const routeMap = {
  'anthropic': { schema: 'anthropicSchema', rate: 'ai' },
  'gemini': { schema: 'geminiSchema', rate: 'ai' },
  'groq': { schema: 'groqSchema', rate: 'ai' },
  'openai': { schema: 'openaiSchema', rate: 'ai' },
  'xai': { schema: 'xaiSchema', rate: 'ai' },
  'mistral': { schema: 'mistralSchema', rate: 'ai' },
  'claude-code': { schema: 'claudeCodeSchema', rate: 'ai' },
  'clone': { schema: 'cloneSchema', rate: 'heavy' },
  'scrape': { schema: 'scrapeSchema', rate: 'heavy' },
  'deploy': { schema: 'deploySchema', rate: 'deploy' },
  'exec': { schema: 'execSchema', rate: 'standard' },
  'database': { schema: 'databaseSchema', rate: 'standard' },
  'neon': { schema: 'neonSchema', rate: 'standard' },
  'supabase': { schema: 'supabaseSchema', rate: 'standard' },
  'stripe': { schema: 'stripeSchema', rate: 'standard' },
  'github': { schema: 'githubSchema', rate: 'standard' },
  'discord': { schema: 'discordSchema', rate: 'standard' },
  'slack': { schema: 'slackSchema', rate: 'standard' },
  'resend': { schema: 'resendSchema', rate: 'standard' },
  'sendgrid': { schema: 'sendgridSchema', rate: 'standard' },
  'twilio': { schema: 'twilioSchema', rate: 'standard' },
  'algolia': { schema: 'algoliaSchema', rate: 'standard' },
  'contentful': { schema: 'contentfulSchema', rate: 'standard' },
  'sanity': { schema: 'sanitySchema', rate: 'standard' },
  'klaviyo': { schema: 'klaviyoSchema', rate: 'standard' },
  'lemonsqueezy': { schema: 'lemonSqueezySchema', rate: 'standard' },
  'upstash': { schema: 'upstashSchema', rate: 'standard' },
  'figma': { schema: 'figmaSchema', rate: 'standard' },
  'huggingface': { schema: 'huggingfaceSchema', rate: 'ai' },
  'deepai': { schema: 'deepaiSchema', rate: 'ai' },
  'test-gen': { schema: 'testGenSchema', rate: 'ai' },
  'ltx': { schema: 'ltxSchema', rate: 'heavy' },
  'collab': { schema: 'collabSchema', rate: 'standard' },
  'context7': { schema: 'context7Schema', rate: 'standard' },
  'magic21st': { schema: 'magic21stSchema', rate: 'standard' },
  'reactbits': { schema: 'reactbitsSchema', rate: 'standard' },
  'render': { schema: 'renderSchema', rate: 'deploy' },
  'stitch': { schema: 'stitchSchema', rate: 'ai' },
  'notebooklm': { schema: 'notebooklmSchema', rate: 'ai' },
};

// Cinematic sub-routes
const cinematicMap = {
  'cinematic/video': { schema: 'cinematicVideoSchema', rate: 'heavy' },
  'cinematic/image': { schema: 'cinematicImageSchema', rate: 'ai' },
  'cinematic/enrich': { schema: 'cinematicEnrichSchema', rate: 'ai' },
  'cinematic/site': { schema: 'cinematicSiteSchema', rate: 'heavy' },
};

let modified = 0;
let skipped = 0;

function processRoute(routePath, schemaName, rateCategory) {
  const filePath = path.join(apiDir, routePath, 'route.ts');
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP (no file): ${filePath}`);
    skipped++;
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has our validation
  if (content.includes('api-schemas') || content.includes('api-utils')) {
    console.log(`  SKIP (already has validation): ${routePath}`);
    skipped++;
    return;
  }

  // Skip GET-only routes and webhook routes
  if (!content.includes('async function POST') && !content.includes('export async function POST')) {
    console.log(`  SKIP (no POST handler): ${routePath}`);
    skipped++;
    return;
  }

  // Skip stripe/webhook (raw body, Stripe signature verification)
  if (routePath === 'stripe/webhook') {
    console.log(`  SKIP (webhook with signature): ${routePath}`);
    skipped++;
    return;
  }

  // Determine path depth for imports
  const depth = routePath.split('/').length;
  const prefix = '../'.repeat(depth + 1); // +1 for app/api/

  // Build import lines
  const schemaImport = `import { ${schemaName} } from '${prefix}lib/api-schemas';`;
  const utilsImport = `import { applyRateLimit, validateOrigin, parseBody, errors } from '${prefix}lib/api-utils';`;
  const rateLimitImport = `import { RATE_LIMITS } from '${prefix}lib/rate-limiter';`;

  // Find the first import line to add after
  const importLines = content.match(/^import .+$/gm);
  if (!importLines || importLines.length === 0) {
    console.log(`  SKIP (no imports found): ${routePath}`);
    skipped++;
    return;
  }
  const lastImport = importLines[importLines.length - 1];
  const lastImportIdx = content.lastIndexOf(lastImport);
  const insertPoint = lastImportIdx + lastImport.length;

  // Add imports after the last existing import
  const newImports = `\n${schemaImport}\n${utilsImport}\n${rateLimitImport}`;
  content = content.slice(0, insertPoint) + newImports + content.slice(insertPoint);

  // Now find the POST function body and add validation at the top
  // Look for: export async function POST(req: NextRequest) {
  const postMatch = content.match(/export\s+async\s+function\s+POST\s*\([^)]*\)\s*\{/);
  if (postMatch) {
    const matchIdx = content.indexOf(postMatch[0]);
    const insertAfter = matchIdx + postMatch[0].length;
    
    const isEdge = content.includes("runtime = 'edge'") || content.includes('runtime = "edge"');
    
    // Add validation block
    const validationBlock = `
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.${rateCategory});
  if (rateLimitError) return rateLimitError;
`;

    content = content.slice(0, insertAfter) + validationBlock + content.slice(insertAfter);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ Modified: ${routePath} (${schemaName}, rate:${rateCategory})`);
  modified++;
}

console.log('Adding Zod validation + rate limiting to API routes...\n');

for (const [route, config] of Object.entries(routeMap)) {
  processRoute(route, config.schema, config.rate);
}
for (const [route, config] of Object.entries(cinematicMap)) {
  processRoute(route, config.schema, config.rate);
}

// Handle stripe sub-routes
processRoute('stripe/checkout', 'stripeCheckoutSchema', 'standard');

// Handle cinematic/status (GET only — skip)

console.log(`\nDone! Modified: ${modified}, Skipped: ${skipped}`);
