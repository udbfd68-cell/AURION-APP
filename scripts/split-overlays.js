/**
 * Split Overlays.tsx into sub-component files
 */
const fs = require('fs');
const path = require('path');

const overlaysPath = path.join(__dirname, '..', 'components', 'Overlays.tsx');
const overlaysDir = path.join(__dirname, '..', 'components', 'overlays');

// Create directory
if (!fs.existsSync(overlaysDir)) {
  fs.mkdirSync(overlaysDir, { recursive: true });
}

const content = fs.readFileSync(overlaysPath, 'utf8');
const lines = content.split('\n');

// Find section boundaries using the ═══ comments
const sections = [];
let currentStart = null;
let currentName = null;

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/\{\/\*\s*[^\w\s{(/]+\s+(.*?)\s+[^\w\s})/]+\s*\*\/\}/);
  if (match) {
    if (currentStart !== null) {
      sections.push({ name: currentName, startLine: currentStart, endLine: i - 1 });
    }
    currentStart = i;
    currentName = match[1].trim();
  }
}

// Last section goes to the end of the return statement
if (currentStart !== null) {
  // Find the closing of the last section before the breakpoint bar and </> 
  const lastSectionEnd = lines.length - 1;
  sections.push({ name: currentName, startLine: currentStart, endLine: lastSectionEnd });
}

console.log(`Found ${sections.length} sections:`);
sections.forEach(s => console.log(`  ${s.startLine}-${s.endLine}: ${s.name}`));

// Group sections into logical components
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
  'OnboardingPanels': ['v23: Onboarding Tour Overlay', 'v23: Changelog / What\'s New'],
  'BuilderPanels': ['v24: Visual Drag & Drop Builder', 'v24: Animation Timeline Builder', 'v24: Design System Manager'],
  'DevToolsPanels': ['v24: REST API Tester', 'v24: Git Branch Manager'],
  'FigmaTestRunner': ['Figma Import Panel', 'Test Runner Panel'],
  'AIReviewPanels': ['AI Code Review Panel', 'v24: AI Screenshot Analyzer'],
};

// Map section names to their content
const sectionMap = {};
for (const s of sections) {
  sectionMap[s.name] = s;
}

// Generate sub-component files
const componentFiles = [];

for (const [compName, sectionNames] of Object.entries(groups)) {
  const sectionContents = [];
  
  for (const name of sectionNames) {
    const section = sectionMap[name];
    if (!section) {
      console.log(`  WARNING: Section "${name}" not found!`);
      continue;
    }
    // Extract the JSX for this section
    const sectionLines = lines.slice(section.startLine, section.endLine + 1);
    sectionContents.push(sectionLines.join('\n'));
    // Mark as used
    section.used = true;
  }
  
  if (sectionContents.length === 0) continue;
  
  const jsxContent = sectionContents.join('\n\n');
  
  const fileContent = `'use client';
import { motion, AnimatePresence } from 'framer-motion';

export default function ${compName}({ p, panelStore }: { p: any; panelStore: any }) {
  const { setPanel } = panelStore;

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
  console.log(`  Created: overlays/${compName}.tsx (${sectionContents.length} sections, ${jsxContent.split('\n').length} lines)`);
}

// Report unused sections
const unused = sections.filter(s => !s.used);
if (unused.length > 0) {
  console.log(`\nUnused sections (${unused.length}):`);
  unused.forEach(s => console.log(`  ${s.startLine}: ${s.name}`));
}

// Now rewrite Overlays.tsx as an orchestrator
const imports = componentFiles.map(name => 
  `import ${name} from './overlays/${name}';`
).join('\n');

const renders = componentFiles.map(name => 
  `        <${name} p={p} panelStore={panelStore} />`
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

console.log(`\nGenerated new Overlays.tsx orchestrator with ${componentFiles.length} sub-components.`);
console.log(`\nSub-components: ${componentFiles.join(', ')}`);

// Don't overwrite yet — let's just report
fs.writeFileSync(path.join(__dirname, '..', 'components', 'Overlays.new.tsx'), newOverlays, 'utf8');
console.log('\nWrote Overlays.new.tsx — review before replacing.');
