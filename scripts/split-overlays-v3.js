/**
 * Split Overlays.tsx into sub-component files (v3)
 * Handles encoding carefully, produces clean output
 */
const fs = require('fs');
const path = require('path');

const overlaysPath = path.join(__dirname, '..', 'components', 'Overlays.tsx');
const overlaysOutputPath = path.join(__dirname, '..', 'components', 'Overlays.tsx');
const overlaysDir = path.join(__dirname, '..', 'components', 'overlays');

if (!fs.existsSync(overlaysDir)) fs.mkdirSync(overlaysDir, { recursive: true });

// Read as binary buffer, then convert to string
const buf = fs.readFileSync(overlaysPath);
const content = buf.toString('utf8');
const lines = content.split('\n');

// ─── Extract known variables from the component header ───

// Panel booleans (lines ~15-35 in the panelStore destructure block)
const panelBooleans = new Set();
let panelStoreEndCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('} = panelStore;')) {
    panelStoreEndCount++;
    if (panelStoreEndCount >= 2) break; // Second closing = end of boolean destructure
    continue;
  }
  if (panelStoreEndCount >= 1) {
    // We're inside the second panelStore destructure block
    const matches = lines[i].match(/show\w+/g);
    if (matches) matches.forEach(m => panelBooleans.add(m));
  }
}

// setShow aliases (const setShow* lines)
const setShowAliases = new Set();
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/const (setShow\w+)\s*=/);
  if (m) setShowAliases.add(m[1]);
}

// p-destructured variables (inside the big `const { ... } = p;` block)
const pVars = new Set();
let inPBlock = false;
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (inPBlock) {
    if (trimmed === '} = p;') break;
    const vars = trimmed.match(/\b([a-zA-Z_]\w*)/g);
    if (vars) vars.forEach(v => {
      if (v.length > 1) pVars.add(v);
    });
  }
  // Detect the line before BREAKPOINT_SIZES (the opening `const {`)
  if (!inPBlock && lines[i + 1] && lines[i + 1].includes('BREAKPOINT_SIZES')) {
    inPBlock = true;
  }
}

console.log(`Panel booleans: ${panelBooleans.size}, setShow aliases: ${setShowAliases.size}, p vars: ${pVars.size}`);

// ─── Find section boundaries ───
const sectionRe = /\{\/\*\s*\S+\s+(.*?)\s+\S+\s*\*\/\}/;
const sections = [];
let currentStart = null, currentName = null;

for (let i = 0; i < lines.length; i++) {
  // Only match lines that look like section headers (have the comment pattern and contain known keywords)
  const line = lines[i].trim();
  if (!line.startsWith('{/*')) continue;
  
  const m = line.match(sectionRe);
  if (m && m[1] && m[1].length > 3) {
    // Additional check: the non-whitespace chars around the name should be the box drawing chars
    // They appear as sequences containing char codes > 127
    const hasHighChars = [...line].some(c => c.charCodeAt(0) > 127);
    if (!hasHighChars) continue;
    
    if (currentStart !== null) {
      sections.push({ name: currentName, startLine: currentStart, endLine: i - 1 });
    }
    currentStart = i;
    currentName = m[1].trim();
  }
}

// Find end of last section (before breakpoint bar)
if (currentStart !== null) {
  let lastEnd = lines.length - 1;
  for (let i = currentStart + 1; i < lines.length; i++) {
    if (lines[i].includes('breakpointTestActive') && lines[i].includes('{')) {
      lastEnd = i - 1;
      while (lastEnd > currentStart && lines[lastEnd].trim() === '') lastEnd--;
      break;
    }
  }
  sections.push({ name: currentName, startLine: currentStart, endLine: lastEnd });
}

console.log(`Found ${sections.length} sections`);

// ─── Group sections ───
const groups = {
  'CommandPalette': ['Command Palette (Cmd+K)', 'File Search (Cmd+P)', 'Content Search (Cmd+Shift+F)'],
  'CodeToolsPanels': ['Code Bookmarks', 'Code Snippets Manager Panel', 'Bookmarked Lines Panel', 'Duplicate Code Panel', 'Code Folding Map Panel'],
  'ComponentPalette': ['Component Palette'],
  'ConversationHistory': ['Conversation History', 'AI Prompt Templates'],
  'CloneModal': ['Clone Website Modal'],
  'BackendGeneratorModal': ['Backend Generator Modal'],
  'GitHubModal': ['GitHub Modal'],
  'TemplatesModal': ['Templates Modal'],
  'EnvPanel': ['.env Management Modal'],
  'EditorPanels': ['Keyboard Shortcuts', 'Editor Theme Selector', 'Find & Replace', 'Version Timeline', 'Keyboard Shortcuts Reference'],
  'MediaGallery': ['Media Gallery'],
  'InspectorPanels': ['HTML Validator Panel', 'Font Inspector Panel', 'File Size Treemap Panel', 'Unused CSS Detector Panel', 'Link Checker Panel', 'DOM Tree Viewer Panel', 'Meta Tag Editor Panel', 'Color Contrast Checker Panel', 'Z-Index Map Panel', 'TODO/FIXME Scanner Panel', 'Regex Tester Panel', 'CSS Specificity Panel', 'Image Lazy Loading Panel', 'Text Statistics Panel', 'Element Counter Panel', 'Console Filter & Export Panel', 'Inline Color Picker Panel', 'Dependency Graph Panel', 'Performance Budget Panel', 'Responsive Preview Grid', 'CSS Animation Inspector Panel', 'Event Listener Audit Panel', 'Open Graph Preview Panel', 'Semantic HTML Checker Panel', 'File Change Summary Panel', 'Whitespace/Indent Checker Panel', 'PWA Checker Panel', 'Schema.org Validator Panel', 'Bundle Size Estimator Panel', 'ARIA Roles Inspector Panel', 'Security Headers Check Panel'],
  'CollabPanels': ['v23: Collaboration Room Panel', 'v24: Collab Chat', 'v23: Feedback Panel'],
  'StitchPanel': ['Google Stitch Design Panel'],
  'OnboardingPanels': ['v23: Onboarding Tour Overlay', "v23: Changelog / What's New"],
  'BuilderPanels': ['v24: Visual Drag & Drop Builder', 'v24: Animation Timeline Builder', 'v24: Design System Manager'],
  'DevToolsPanels': ['v24: REST API Tester', 'v24: Git Branch Manager'],
  'FigmaTestRunner': ['Figma Import Panel', 'Test Runner Panel'],
  'AIReviewPanels': ['AI Code Review Panel', 'v24: AI Screenshot Analyzer'],
};

const sectionMap = {};
for (const s of sections) sectionMap[s.name] = s;

// ─── Analyze and generate ───
const componentFiles = [];

// False positives to exclude from p-var detection
const jsKeywords = new Set([
  'div', 'span', 'button', 'input', 'label', 'select', 'option', 'form', 'textarea', 'pre', 'code', 'img', 'svg', 'path',
  'className', 'onClick', 'onChange', 'onKeyDown', 'onDragOver', 'onDrop', 'onPaste', 'disabled', 'value', 'type', 'placeholder',
  'key', 'ref', 'href', 'src', 'alt', 'target', 'rel', 'width', 'height', 'viewBox', 'fill', 'stroke', 'strokeWidth',
  'initial', 'animate', 'exit', 'transition', 'duration', 'repeat', 'ease', 'delay',
  'true', 'false', 'null', 'undefined', 'new', 'const', 'let', 'var', 'return',
  'map', 'filter', 'find', 'forEach', 'reduce', 'slice', 'join', 'split', 'replace', 'trim', 'length',
  'indexOf', 'includes', 'startsWith', 'endsWith', 'match', 'test', 'toString', 'toUpperCase', 'toLowerCase',
  'entries', 'keys', 'values', 'from', 'of', 'in', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Date',
  'navigator', 'clipboard', 'writeText', 'console', 'log', 'error', 'warn',
  'event', 'currentTarget', 'preventDefault', 'stopPropagation',
  'children', 'style', 'id', 'name', 'checked', 'htmlFor', 'readOnly', 'autoComplete', 'autoFocus',
  'text', 'number', 'url', 'email', 'password', 'submit', 'reset', 'file', 'checkbox', 'radio',
  'copy', 'delete', 'remove', 'add', 'update', 'create', 'save', 'load', 'open', 'close',
  'Infinity', 'linear', 'opacity', 'scale', 'rotate', 'AnimatePresence', 'motion',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'br', 'hr',
]);

for (const [compName, sectionNames] of Object.entries(groups)) {
  const sectionContents = [];
  
  for (const name of sectionNames) {
    const section = sectionMap[name];
    if (!section) { console.log(`  WARNING: "${name}" not found`); continue; }
    const sectionLines = lines.slice(section.startLine, section.endLine + 1);
    sectionContents.push(sectionLines.join('\n'));
    section.used = true;
  }
  if (sectionContents.length === 0) continue;
  
  const jsxContent = sectionContents.join('\n\n');
  
  // Strip the corrupt box-drawing comment headers, replace with clean ASCII
  const cleanJsx = jsxContent.replace(/\{\/\*\s*[^\x00-\x7F]+\s+(.*?)\s+[^\x00-\x7F]+\s*\*\/\}/g, '{/* --- $1 --- */}');
  
  // Analyze which variables this section uses
  const words = new Set((cleanJsx.match(/\b[a-zA-Z_]\w*\b/g) || []));
  
  const usedPanels = [...panelBooleans].filter(v => words.has(v)).sort();
  const usedSetters = [...setShowAliases].filter(v => words.has(v)).sort();
  const usedP = [...pVars].filter(v => words.has(v) && !jsKeywords.has(v)).sort();
  
  // Detect extra imports needed
  const needsFileIcon = cleanJsx.includes('FileIcon');
  const needsLinkIcon = cleanJsx.includes('LinkIcon');
  const needsDetectLanguage = cleanJsx.includes('detectLanguage');
  const needsTemplates = cleanJsx.includes('TEMPLATES');
  const needsBackendGenerator = cleanJsx.includes('BackendGenerator');
  const needsDynamic = cleanJsx.includes('dynamic(');
  const needsUseMemo = /\buseMemo\b/.test(cleanJsx);
  const needsUseState = /\buseState\b/.test(cleanJsx);
  const needsUseRef = /\buseRef\b/.test(cleanJsx);
  const needsUseCallback = /\buseCallback\b/.test(cleanJsx);
  
  // Build imports
  const importLines = ["'use client';"];
  const reactHooks = [];
  if (needsUseMemo) reactHooks.push('useMemo');
  if (needsUseState) reactHooks.push('useState');
  if (needsUseRef) reactHooks.push('useRef');
  if (needsUseCallback) reactHooks.push('useCallback');
  if (reactHooks.length > 0) importLines.push(`import { ${reactHooks.join(', ')} } from 'react';`);
  importLines.push("import { motion, AnimatePresence } from 'framer-motion';");
  if (needsDynamic) importLines.push("import dynamic from 'next/dynamic';");
  importLines.push("import { usePanelStore } from '@/stores/usePanelStore';");
  if (needsFileIcon || needsLinkIcon) {
    const icons = []; if (needsFileIcon) icons.push('FileIcon'); if (needsLinkIcon) icons.push('LinkIcon');
    importLines.push(`import { ${icons.join(', ')} } from '@/lib/page-helpers';`);
  }
  if (needsDetectLanguage) importLines.push("import { detectLanguage } from '@/lib/client-utils';");
  if (needsTemplates) importLines.push("import { TEMPLATES } from '@/lib/templates-data';");
  if (needsBackendGenerator) importLines.push("import { BackendGenerator } from '@/lib/backend-generator';");
  
  // Build panel destructure
  const panelDestructure = usedPanels.length > 0 ? ', ' + usedPanels.join(', ') : '';
  
  // Build setShow wrappers
  const setShowBlock = usedSetters.map(alias => {
    const panelName = alias.replace(/^set/, '');
    const panelKey = panelName.charAt(0).toLowerCase() + panelName.slice(1);
    return `  const ${alias} = (v: boolean) => setPanel('${panelKey}', v);`;
  }).join('\n');
  
  // Build p destructure
  const pBlock = usedP.length > 0
    ? `\n  const {\n    ${usedP.join(',\n    ')},\n  } = p;\n`
    : '';
  
  // Assemble component file
  const parts = [];
  parts.push(importLines.join('\n'));
  parts.push('');
  parts.push(`export default function ${compName}({ p }: { p: any }) {`);
  parts.push(`  const panelStore = usePanelStore();`);
  parts.push(`  const { setPanel${panelDestructure} } = panelStore;`);
  if (setShowBlock) { parts.push(''); parts.push(setShowBlock); }
  if (pBlock) { parts.push(pBlock); } else { parts.push(''); }
  parts.push('  return (');
  parts.push('    <>');
  parts.push(cleanJsx);
  parts.push('    </>');
  parts.push('  );');
  parts.push('}');
  parts.push('');
  
  const fileContent = parts.join('\n');
  
  const filePath = path.join(overlaysDir, `${compName}.tsx`);
  fs.writeFileSync(filePath, fileContent, 'utf8');
  componentFiles.push(compName);
  console.log(`  ${compName}: ${usedPanels.length}p ${usedSetters.length}s ${usedP.length}v ${cleanJsx.split('\n').length}L`);
}

// Report unused
const unused = sections.filter(s => !s.used);
if (unused.length) {
  console.log(`\nUnused: ${unused.map(s => s.name).join(', ')}`);
}

// ─── Orchestrator ───
const imports = componentFiles.map(n => `import ${n} from './overlays/${n}';`).join('\n');
const renders = componentFiles.map(n => `        <${n} p={p} />`).join('\n');

const newOverlays = [
  "'use client';",
  "import { usePanelStore } from '@/stores/usePanelStore';",
  imports,
  '',
  'export default function Overlays({ p }: { p: any }) {',
  '  const panelStore = usePanelStore();',
  '',
  '  return (',
  '    <>',
  renders,
  '',
  '      {/* Breakpoint test bar */}',
  '      {p.breakpointTestActive && (',
  "        <div className=\"fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#333] shadow-2xl\">",
  '          {p.BREAKPOINT_SIZES.map((bp: any, i: any) => (',
  '            <button key={bp.name} onClick={() => p.setBreakpointTestIdx(i)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${i === p.breakpointTestIdx ? \'bg-orange-500/20 text-orange-400 border border-orange-500/30\' : \'text-[#666] hover:text-white\'}`}>{bp.w}</button>',
  '          ))}',
  '          <span className="text-[10px] text-[#888] ml-1">{p.BREAKPOINT_SIZES[p.breakpointTestIdx].name}</span>',
  '          <button onClick={() => p.setBreakpointTestActive(false)} className="ml-2 text-[#555] hover:text-white transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>',
  '        </div>',
  '      )}',
  '    </>',
  '  );',
  '}',
  '',
].join('\n');

fs.writeFileSync(overlaysOutputPath, newOverlays, 'utf8');
console.log(`\nOverlays.tsx: ${newOverlays.split('\n').length} lines, ${componentFiles.length} sub-components`);
