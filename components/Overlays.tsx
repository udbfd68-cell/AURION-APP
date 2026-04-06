'use client';
import { usePanelStore } from '@/stores/usePanelStore';
import CommandPalette from './overlays/CommandPalette';
import CodeToolsPanels from './overlays/CodeToolsPanels';
import ComponentPalette from './overlays/ComponentPalette';
import ConversationHistory from './overlays/ConversationHistory';
import CloneModal from './overlays/CloneModal';
import BackendGeneratorModal from './overlays/BackendGeneratorModal';
import GitHubModal from './overlays/GitHubModal';
import TemplatesModal from './overlays/TemplatesModal';
import EnvPanel from './overlays/EnvPanel';
import EditorPanels from './overlays/EditorPanels';
import MediaGallery from './overlays/MediaGallery';
import InspectorPanels from './overlays/InspectorPanels';
import CollabPanels from './overlays/CollabPanels';
import StitchPanel from './overlays/StitchPanel';
import OnboardingPanels from './overlays/OnboardingPanels';
import BuilderPanels from './overlays/BuilderPanels';
import DevToolsPanels from './overlays/DevToolsPanels';
import FigmaTestRunner from './overlays/FigmaTestRunner';
import AIReviewPanels from './overlays/AIReviewPanels';

export default function Overlays({ p }: { p: any }) {
  const panelStore = usePanelStore();

  return (
    <>
        <CommandPalette p={p} />
        <CodeToolsPanels p={p} />
        <ComponentPalette p={p} />
        <ConversationHistory p={p} />
        <CloneModal p={p} />
        <BackendGeneratorModal p={p} />
        <GitHubModal p={p} />
        <TemplatesModal p={p} />
        <EnvPanel p={p} />
        <EditorPanels p={p} />
        <MediaGallery p={p} />
        <InspectorPanels p={p} />
        <CollabPanels p={p} />
        <StitchPanel p={p} />
        <OnboardingPanels p={p} />
        <BuilderPanels p={p} />
        <DevToolsPanels p={p} />
        <FigmaTestRunner p={p} />
        <AIReviewPanels p={p} />

      {/* Breakpoint test bar */}
      {p.breakpointTestActive && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#333] shadow-2xl">
          {p.BREAKPOINT_SIZES.map((bp: any, i: any) => (
            <button key={bp.name} onClick={() => p.setBreakpointTestIdx(i)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${i === p.breakpointTestIdx ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-[#666] hover:text-white'}`}>{bp.w}</button>
          ))}
          <span className="text-[10px] text-[#888] ml-1">{p.BREAKPOINT_SIZES[p.breakpointTestIdx].name}</span>
          <button onClick={() => p.setBreakpointTestActive(false)} className="ml-2 text-[#555] hover:text-white transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
      )}
    </>
  );
}
