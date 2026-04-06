/**
 * Fix broken imports in API routes — the previous script broke multi-line imports
 * This script finds and fixes the issue
 */
const fs = require('fs');
const path = require('path');
const apiDir = path.join(__dirname, '..', 'app', 'api');

function fixRoute(routePath) {
  const filePath = path.join(apiDir, routePath, 'route.ts');
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if our imports are inside a multi-line import block (between { and })
  // Pattern: import {\nimport { schema } from ...\nimport { utils } from ...\nimport { RATE } from ...\n  actual,
  const brokenPattern = /import\s*\{\s*\n(import \{[^\n]+\n){1,3}/g;
  
  if (!brokenPattern.test(content)) {
    // Also check for: the imports might be injected between `import {` and `}` 
    // Look for our signature imports that are misplaced
    const hasApiSchemas = content.includes('api-schemas');
    const hasApiUtils = content.includes('api-utils');
    
    if (!hasApiSchemas) return false;
    
    // Check if imports are properly placed (not inside another import statement)
    const lines = content.split('\n');
    let insideMultiImport = false;
    let needsFix = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import {') && !line.includes('}') && !line.includes('from')) {
        insideMultiImport = true;
      }
      if (insideMultiImport && (line.includes('api-schemas') || line.includes('api-utils') || line.includes('rate-limiter'))) {
        needsFix = true;
        break;
      }
      if (insideMultiImport && line.includes('}') && line.includes('from')) {
        insideMultiImport = false;
      }
    }
    
    if (!needsFix) return false;
  }

  // Extract our three injected import lines
  const schemaImportMatch = content.match(/import \{ \w+Schema \} from '[^']+api-schemas';/);
  const utilsImportMatch = content.match(/import \{ applyRateLimit, validateOrigin, parseBody, errors \} from '[^']+api-utils';/);
  const rateImportMatch = content.match(/import \{ RATE_LIMITS \} from '[^']+rate-limiter';/);

  if (!schemaImportMatch) return false;

  // Remove these three lines from wherever they are
  const schemaImport = schemaImportMatch[0];
  const utilsImport = utilsImportMatch ? utilsImportMatch[0] : '';
  const rateImport = rateImportMatch ? rateImportMatch[0] : '';

  content = content.replace(schemaImport + '\n', '');
  if (utilsImport) content = content.replace(utilsImport + '\n', '');
  if (rateImport) content = content.replace(rateImport + '\n', '');

  // Now find the REAL end of import section — after all import statements (including multi-line)
  const lines = content.split('\n');
  let lastImportEnd = 0;
  let inMultiLineImport = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('import ')) {
      if (line.includes(' from ') && (line.endsWith(';') || line.endsWith("'") || line.endsWith('"'))) {
        // Single-line import
        lastImportEnd = i;
      } else {
        // Start of multi-line import
        inMultiLineImport = true;
      }
    }
    
    if (inMultiLineImport) {
      if (line.includes('} from ')) {
        lastImportEnd = i;
        inMultiLineImport = false;
      }
    }
  }

  // Insert our imports AFTER lastImportEnd
  const newImports = [schemaImport, utilsImport, rateImport].filter(Boolean);
  lines.splice(lastImportEnd + 1, 0, ...newImports);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return true;
}

// Process all routes recursively
function walkDir(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let fixed = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      fixed += walkDir(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
    } else if (entry.name === 'route.ts') {
      const routePath = prefix;
      if (fixRoute(routePath)) {
        console.log(`  ✅ Fixed: ${routePath}`);
        fixed++;
      }
    }
  }
  return fixed;
}

console.log('Fixing broken imports in API routes...\n');
const fixed = walkDir(apiDir);
console.log(`\nFixed ${fixed} routes.`);
