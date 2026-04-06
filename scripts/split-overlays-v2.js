/**
 * Split Overlays.tsx into sub-component files (v2)
 * - Analyzes variable usage per sub-component
 * - Each sub-component destructures only what it needs from p and panelStore
 */
const fs = require('fs');
const path = require('path');

const overlaysPath = path.join(__dirname, '..', 'components', 'Overlays.tsx');
const overlaysDir = path.join(__dirname, '..', 'components', 'overlays');

if (!fs.existsSync(overlaysDir)) fs.mkdirSync(overlaysDir, { recursive: true });

const content = fs.readFileSync(overlaysPath, 'utf8');
const lines = content.split('\n');

// ─── Extract all panel booleans and all p-destructured vars ───
// Panel booleans from panelStore (lines ~15-35)
const panelBooleans = new Set();
const panelBoolRe = /show\w+/g;
for (let i = 14; i < 40; i++) {
  let m;
  while ((m = panelBoolRe.exec(lines[i])) !== null) {
    panelBooleans.add(m[0]);
  }
}

// setShow* aliases (lines ~38-130)
const setShowAliases = new Set();
const setShowRe = /const (setShow\w+)/g;
for (let i = 37; i < 130; i++) {
  let m;
  while ((m = setShowRe.exec(lines[i])) !== null) {
    setShowAliases.add(m[1]);
  }
}

// p-destructured vars (lines ~130-168)
const pVars = new Set();
const pVarRe = /\b([a-zA-Z_]\w*)/g;
for (let i = 130; i < 168; i++) {
  const line = lines[i].trim();
  if (line.startsWith('//') || line === '} = p;' || line === '{') continue;
  let m;
  while ((m = pVarRe.exec(line)) !== null) {
    const v = m[1];
    if (v !== 'showToast' && v !== 'p' && !v.startsWith('show') && v.length > 1) {
      pVars.add(v);
    }
  }
}
// showToast is from p, not panelStore
pVars.add('showToast');

// Special imports needed by specific sections
const NEEDED_IMPORTS = {
  'BackendGeneratorModal': ["import { BackendGenerator } from '@/lib/backend-generator';"],
  'TemplatesModal': ["import { TEMPLATES } from '@/lib/templates-data';"],
  'ComponentPalette': [],
  'EnvPanel': [],
  'CloneModal': [],
};

console.log(`Panel booleans: ${panelBooleans.size}`);
console.log(`setShow aliases: ${setShowAliases.size}`);
console.log(`p vars: ${pVars.size}`);

// ─── Find sections ───
const sections = [];
let currentStart = null, currentName = null;
const sectionRe = /\{\/\*\s*[^\w\s{(/]+\s+(.*?)\s+[^\w\s})/]+\s*\*\/\}/;

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(sectionRe);
  if (match) {
    if (currentStart !== null) {
      sections.push({ name: currentName, startLine: currentStart, endLine: i - 1 });
    }
    currentStart = i;
    currentName = match[1].trim();
  }
}
if (currentStart !== null) {
  // Find where the breakpoint bar starts (end of last real section)
  let lastEnd = lines.length - 1;
  for (let i = currentStart + 1; i < lines.length; i++) {
    if (lines[i].includes('breakpointTestActive')) {
      // Go back to find the preceding blank/closing line
      lastEnd = i - 1;
      // Trim trailing blank lines
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

for (const [compName, sectionNames] of Object.entries(groups)) {
  const sectionContents = [];
  
  for (const name of sectionNames) {
    const section = sectionMap[name];
    if (!section) { console.log(`  WARNING: "${name}" not found`); continue; }
    sectionContents.push(lines.slice(section.startLine, section.endLine + 1).join('\n'));
    section.used = true;
  }
  if (sectionContents.length === 0) continue;
  
  const jsxContent = sectionContents.join('\n\n');
  
  // Analyze which variables are referenced in this JSX
  const usedPanelBooleans = new Set();
  const usedSetShowAliases = new Set();
  const usedPVars = new Set();
  
  // Use word boundary matching
  const words = new Set(jsxContent.match(/\b[a-zA-Z_]\w*\b/g) || []);
  
  for (const v of panelBooleans) {
    if (words.has(v)) usedPanelBooleans.add(v);
  }
  for (const v of setShowAliases) {
    if (words.has(v)) usedSetShowAliases.add(v);
  }
  for (const v of pVars) {
    if (words.has(v)) usedPVars.add(v);
  }
  
  // Remove false positives (common JS keywords, HTML attributes, CSS classes)
  const falsePositives = new Set([
    'div', 'span', 'button', 'input', 'label', 'select', 'option', 'form', 'textarea', 'pre', 'code', 'img', 'svg', 'path',
    'className', 'onClick', 'onChange', 'onKeyDown', 'onDragOver', 'onDrop', 'onPaste', 'disabled', 'value', 'type', 'placeholder',
    'key', 'ref', 'href', 'src', 'alt', 'target', 'rel', 'width', 'height', 'viewBox', 'fill', 'stroke', 'strokeWidth',
    'initial', 'animate', 'exit', 'transition', 'duration', 'repeat', 'ease', 'delay',
    'flex', 'grid', 'block', 'inline', 'hidden', 'fixed', 'absolute', 'relative', 'sticky',
    'true', 'false', 'null', 'undefined', 'new', 'const', 'let', 'var', 'return',
    'map', 'filter', 'find', 'forEach', 'reduce', 'slice', 'join', 'split', 'replace', 'trim', 'length',
    'indexOf', 'includes', 'startsWith', 'endsWith', 'match', 'test', 'toString', 'toUpperCase', 'toLowerCase',
    'entries', 'keys', 'values', 'from', 'of', 'in', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Date',
    'navigator', 'clipboard', 'writeText', 'console', 'log', 'error', 'warn',
    'event', 'currentTarget', 'preventDefault', 'stopPropagation',
    'children', 'style', 'id', 'name', 'checked', 'htmlFor', 'readOnly', 'autoComplete', 'autoFocus',
    'text', 'number', 'url', 'email', 'password', 'submit', 'reset', 'file', 'checkbox', 'radio',
    'copy', 'delete', 'remove', 'add', 'update', 'create', 'save', 'load', 'open', 'close',
    'Infinity', 'linear', 'opacity', 'scale', 'rotate',
  ]);
  
  for (const v of falsePositives) {
    usedPVars.delete(v);
  }
  
  // Build the setShow* wrappers
  const setShowLines = [...usedSetShowAliases].sort().map(alias => {
    const panelName = alias.replace('setS', 's'); // setShowFoo -> showFoo
    return `  const ${alias} = (v: boolean) => setPanel('${panelName}', v);`;
  }).join('\n');
  
  // Build panel destructure
  const panelDestructure = [...usedPanelBooleans].sort().join(', ');
  
  // Extra imports
  const extraImports = (NEEDED_IMPORTS[compName] || []).join('\n');
  
  // Check if we need FileIcon, LinkIcon, detectLanguage, TEMPLATES, BackendGenerator etc.
  const needsFileIcon = jsxContent.includes('FileIcon');
  const needsLinkIcon = jsxContent.includes('LinkIcon');
  const needsDetectLanguage = jsxContent.includes('detectLanguage');
  const needsTemplates = jsxContent.includes('TEMPLATES');
  const needsBackendGenerator = jsxContent.includes('BackendGenerator');
  const needsUseMemo = jsxContent.includes('useMemo');
  const needsUseState = jsxContent.includes('useState');
  const needsUseRef = jsxContent.includes('useRef');
  const needsUseCallback = jsxContent.includes('useCallback');
  const needsDynamic = jsxContent.includes('dynamic(');
  
  let reactImports = [];
  if (needsUseMemo) reactImports.push('useMemo');
  if (needsUseState) reactImports.push('useState');
  if (needsUseRef) reactImports.push('useRef');
  if (needsUseCallback) reactImports.push('useCallback');
  
  let importLines = ["'use client';"];
  if (reactImports.length > 0) {
    importLines.push(`import { ${reactImports.join(', ')} } from 'react';`);
  }
  importLines.push("import { motion, AnimatePresence } from 'framer-motion';");
  if (needsDynamic) importLines.push("import dynamic from 'next/dynamic';");
  importLines.push("import { usePanelStore } from '@/stores/usePanelStore';");
  if (needsFileIcon || needsLinkIcon) {
    const icons = [];
    if (needsFileIcon) icons.push('FileIcon');
    if (needsLinkIcon) icons.push('LinkIcon');
    importLines.push(`import { ${icons.join(', ')} } from '@/lib/page-helpers';`);
  }
  if (needsDetectLanguage) importLines.push("import { detectLanguage } from '@/lib/client-utils';");
  if (needsTemplates) importLines.push("import { TEMPLATES } from '@/lib/templates-data';");
  if (needsBackendGenerator) importLines.push("import { BackendGenerator } from '@/lib/backend-generator';");
  
  // Build p destructure (skip if empty)
  const pDestructureBlock = usedPVars.size > 0 
    ? `\n  const {\n    ${[...usedPVars].sort().join(',\n    ')},\n  } = p;\n`
    : '';
  
  const fileContent = `${importLines.join('\n')}

export default function ${compName}({ p }: { p: any }) {
  const panelStore = usePanelStore();
  const { setPanel${panelDestructure ? ', ' + panelDestructure : ''} } = panelStore;
${setShowLines ? '\n' + setShowLines + '\n' : ''}${pDestructureBlock}
  return (
    <>
${jsxContent}
    </>
  );
}
`;
  
  const filePath = path.join(overlaysDir, `${compName}.tsx`);
  fs.writeFileSync(filePath, fileContent, 'utf8');
  componentFiles.push(compName);
  console.log(`  ${compName}: ${usedPanelBooleans.size} panels, ${usedSetShowAliases.size} setters, ${usedPVars.size} p-vars, ${jsxContent.split('\n').length} lines`);
}

// ─── Unused sections ───
const unused = sections.filter(s => !s.used);
if (unused.length > 0) {
  console.log(`\nUnused sections (${unused.length}):`);
  unused.forEach(s => console.log(`  ${s.startLine}: ${s.name}`));
}

// ─── New Overlays.tsx orchestrator ───
const imports = componentFiles.map(name => 
  `import ${name} from './overlays/${name}';`
).join('\n');

const renders = componentFiles.map(name => 
  `        <${name} p={p} />`
).join('\n');

const newOverlays = `'use client';
import { usePanelStore } from '@/stores/usePanelStore';
${imports}

export default function Overlays({ p }: { p: any }) {
  const panelStore = usePanelStore();

  return (
    <>
${renders}

      {/* Breakpoint test bar */}
      {p.breakpointTestActive && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#333] shadow-2xl">
          {p.BREAKPOINT_SIZES.map((bp: any, i: any) => (
            <button key={bp.name} onClick={() => p.setBreakpointTestIdx(i)} className={\`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors \${i === p.breakpointTestIdx ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-[#666] hover:text-white'}\`}>{bp.w}</button>
          ))}
          <span className="text-[10px] text-[#888] ml-1">{p.BREAKPOINT_SIZES[p.breakpointTestIdx].name}</span>
          <button onClick={() => p.setBreakpointTestActive(false)} className="ml-2 text-[#555] hover:text-white transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
      )}
    </>
  );
}
`;

const overlaysOutputPath = path.join(__dirname, '..', 'components', 'Overlays.tsx');

fs.writeFileSync(overlaysOutputPath, newOverlays, 'utf8');
console.log(`\nRewrote Overlays.tsx (${newOverlays.split('\n').length} lines, ${componentFiles.length} sub-components)`);
console.log(`Components: ${componentFiles.join(', ')}`);
