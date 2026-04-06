/**
 * Add accessibility attributes to overlay sub-components
 * - aria-label on close buttons (X buttons)
 * - role="dialog" + aria-modal on modal containers
 * - aria-label on input fields
 * - role="alert" on error messages
 */
const fs = require('fs');
const path = require('path');

const overlaysDir = path.join(__dirname, '..', 'components', 'overlays');
const componentsDir = path.join(__dirname, '..', 'components');

let totalFixes = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;
  let fixes = 0;
  const name = path.basename(filePath);
  
  // 1. Add role="dialog" and aria-modal="true" to modal containers
  // Pattern: modal containers that have onClick backdrop dismiss and fixed inset-0 z-50
  content = content.replace(
    /className="fixed inset-0 z-50([^"]*?)bg-black\/80"/g,
    (match) => {
      fixes++;
      return match.replace('className="', 'role="dialog" aria-modal="true" className="');
    }
  );
  
  // 2. Add aria-label="Close" to X/close buttons (svg with X path)
  // Pattern: buttons with close icon that don't already have aria-label
  content = content.replace(
    /<button(?![^>]*aria-label)([^>]*?)onClick=\{[^}]*(?:false|setShow\w+\(false\)|close)[^}]*\}([^>]*?)>(?:<svg[^>]*>[^<]*<path[^/]*d="M18 6L6 18M6 6l12 12"[^/]*\/>[^<]*<\/svg>|&times;|×)<\/button>/g,
    (match) => {
      fixes++;
      return match.replace('<button', '<button aria-label="Close"');
    }
  );
  
  // 3. Add aria-label to search inputs that don't have labels
  content = content.replace(
    /<input(?![^>]*aria-label)([^>]*?)placeholder="([^"]+)"([^>]*?)\/>/g,
    (match, before, placeholder, after) => {
      // Only for text/search type inputs
      if (match.includes('type="url"') || match.includes('type="email"') || match.includes('type="password"')) {
        return match; // These have different semantics
      }
      fixes++;
      return match.replace('<input', `<input aria-label="${placeholder}"`);
    }
  );

  // 4. Add role="alert" to error displays
  content = content.replace(
    /className="([^"]*?)text-red-\d+([^"]*?)"(?![^>]*role=)/g,
    (match) => {
      if (match.includes('error') || match.includes('Error') || match.includes('warning')) {
        fixes++;
        return match + ' role="alert"';
      }
      return match;
    }
  );
  
  // 5. Add role="tablist" to tab containers (button groups acting as tabs)
  // This is tricky to auto-detect, skip for now
  
  if (content.length !== originalLength) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ${name}: ${fixes} a11y fixes`);
    totalFixes += fixes;
  } else {
    console.log(`  ${name}: no changes`);
  }
}

// Process all overlay sub-components
const files = fs.readdirSync(overlaysDir).filter(f => f.endsWith('.tsx'));
console.log(`Processing ${files.length} overlay files...`);
for (const f of files) {
  processFile(path.join(overlaysDir, f));
}

// Process main components
const mainComponents = ['Header.tsx', 'Sidebar.tsx', 'Footer.tsx', 'Toasts.tsx', 'StatusBar.tsx'];
for (const f of mainComponents) {
  const p = path.join(componentsDir, f);
  if (fs.existsSync(p)) {
    processFile(p);
  }
}

console.log(`\nTotal: ${totalFixes} accessibility fixes applied`);
