'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  PipelineStep, StepStatus, PipelineNode, CinematicState,
  ApiStatusResponse, EnrichResponse, ImageResponse, VideoResponse, SiteResponse,
} from '@/lib/cinematic/types';
import { CINEMATIC_TEMPLATES } from '@/lib/cinematic/templates';
import { DEFAULT_FPS } from '@/lib/cinematic/config';

// ═══════════════════════════════════════════════════════════════
// Cinematic 3D Scroll Builder — Main Component
// ═══════════════════════════════════════════════════════════════

const STEPS: { step: PipelineStep; label: string; icon: string }[] = [
  { step: 'prompt',  label: 'Prompt',  icon: '✦' },
  { step: 'image',   label: 'Image',   icon: '🖼' },
  { step: 'video',   label: 'Vidéo',   icon: '🎬' },
  { step: 'frames',  label: 'Frames',  icon: '🎞' },
  { step: 'site',    label: 'Site',    icon: '🌐' },
  { step: 'export',  label: 'Export',  icon: '📦' },
];

const initialNodes: PipelineNode[] = STEPS.map(s => ({
  step: s.step,
  label: s.label,
  status: 'idle' as StepStatus,
}));

export default function CinematicBuilder() {
  // ═══ State ═══
  const [state, setState] = useState<CinematicState>({
    nodes: initialNodes,
    prompt: '',
    enrichedPrompt: '',
    selectedTemplate: 'saas-dark',
    imageUrl: '',
    videoUrl: '',
    frames: [],
    siteHtml: '',
    fps: DEFAULT_FPS as 15 | 24 | 30,
    isRunning: false,
  });

  const [apiStatus, setApiStatus] = useState<ApiStatusResponse | null>(null);
  const [enrichData, setEnrichData] = useState<EnrichResponse | null>(null);
  const [activeStep, setActiveStep] = useState<PipelineStep>('prompt');
  const [log, setLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ═══ Helpers ═══
  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const updateNode = useCallback((step: PipelineStep, updates: Partial<PipelineNode>) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.step === step ? { ...n, ...updates } : n),
    }));
  }, []);

  const selectedTemplate = CINEMATIC_TEMPLATES.find(t => t.id === state.selectedTemplate) || CINEMATIC_TEMPLATES[0];

  // ═══ Check API status on mount ═══
  useEffect(() => {
    fetch('/api/cinematic/status')
      .then(r => r.json())
      .then(setApiStatus)
      .catch(() => addLog('⚠️ Failed to check API status'));
  }, [addLog]);

  // ═══ Step 1: Enrich Prompt ═══
  const enrichPrompt = useCallback(async () => {
    if (!state.prompt.trim()) return;
    updateNode('prompt', { status: 'running' });
    addLog('🔄 Enriching prompt...');
    setActiveStep('prompt');

    try {
      const res = await fetch('/api/cinematic/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: state.prompt, template: state.selectedTemplate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EnrichResponse = await res.json();
      setEnrichData(data);
      setState(prev => ({ ...prev, enrichedPrompt: data.enrichedPrompt }));
      updateNode('prompt', { status: 'done', preview: data.enrichedPrompt });
      addLog('✅ Prompt enriched');
      setActiveStep('image');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      updateNode('prompt', { status: 'error', error: msg });
      addLog(`❌ Enrich failed: ${msg}`);
    }
  }, [state.prompt, state.selectedTemplate, updateNode, addLog]);

  // ═══ Step 2: Generate Image ═══
  const generateImage = useCallback(async () => {
    if (!enrichData?.imagePrompt) return;
    updateNode('image', { status: 'running' });
    addLog('🔄 Generating image...');
    setActiveStep('image');

    try {
      const res = await fetch('/api/cinematic/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enrichData.imagePrompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ImageResponse = await res.json();
      setState(prev => ({ ...prev, imageUrl: data.imageUrl }));
      updateNode('image', { status: 'done', preview: data.imageUrl });
      addLog(`✅ Image generated via ${data.provider}`);
      setActiveStep('video');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      updateNode('image', { status: 'error', error: msg });
      addLog(`❌ Image failed: ${msg}`);
    }
  }, [enrichData, updateNode, addLog]);

  // ═══ Step 3: Generate Video ═══
  const generateVideo = useCallback(async () => {
    if (!enrichData?.videoPrompt) return;
    updateNode('video', { status: 'running' });
    addLog('🔄 Generating video (this may take 2-4 minutes)...');
    setActiveStep('video');

    try {
      const res = await fetch('/api/cinematic/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enrichData.videoPrompt,
          imageUrl: state.imageUrl || undefined,
          duration: 8,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: VideoResponse = await res.json();
      setState(prev => ({ ...prev, videoUrl: data.videoUrl }));
      updateNode('video', { status: 'done', preview: data.videoUrl });
      addLog(`✅ Video generated via ${data.provider}`);
      setActiveStep('frames');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      updateNode('video', { status: 'error', error: msg });
      addLog(`❌ Video failed: ${msg}`);
    }
  }, [enrichData, state.imageUrl, updateNode, addLog]);

  // ═══ Step 4: Extract Frames (Client-side) ═══
  const extractFrames = useCallback(async () => {
    if (!state.videoUrl) return;
    updateNode('frames', { status: 'running', progress: 0 });
    addLog(`🔄 Extracting frames at ${state.fps} fps...`);
    setActiveStep('frames');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error('Video/Canvas elements not ready');

      // Load the video
      video.crossOrigin = 'anonymous';
      video.src = state.videoUrl;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
      });

      const duration = video.duration;
      const totalFrames = Math.floor(duration * state.fps);
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d')!;

      addLog(`📐 Video: ${video.videoWidth}×${video.videoHeight}, ${duration.toFixed(1)}s, extracting ${totalFrames} frames`);

      const extractedFrames: string[] = [];

      for (let i = 0; i < totalFrames; i++) {
        const time = i / state.fps;
        video.currentTime = time;
        await new Promise<void>(resolve => {
          video.onseeked = () => resolve();
        });

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        extractedFrames.push(dataUrl);

        // Progress update every 10 frames
        if (i % 10 === 0) {
          updateNode('frames', { progress: Math.round((i / totalFrames) * 100) });
        }
      }

      setState(prev => ({ ...prev, frames: extractedFrames }));
      updateNode('frames', { status: 'done', progress: 100 });
      addLog(`✅ Extracted ${extractedFrames.length} frames`);
      setActiveStep('site');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      updateNode('frames', { status: 'error', error: msg });
      addLog(`❌ Frame extraction failed: ${msg}`);
    }
  }, [state.videoUrl, state.fps, updateNode, addLog]);

  // ═══ Step 5: Generate Site ═══
  const generateSite = useCallback(async () => {
    updateNode('site', { status: 'running' });
    addLog('🔄 Generating site HTML...');
    setActiveStep('site');

    try {
      const res = await fetch('/api/cinematic/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrichedPrompt: state.enrichedPrompt,
          template: state.selectedTemplate,
          frameCount: state.frames.length,
          fps: state.fps,
          siteDescription: enrichData?.siteDescription || state.enrichedPrompt,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SiteResponse = await res.json();
      setState(prev => ({ ...prev, siteHtml: data.html }));
      updateNode('site', { status: 'done' });
      addLog(`✅ Site generated (${data.provider})`);
      setActiveStep('export');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      updateNode('site', { status: 'error', error: msg });
      addLog(`❌ Site generation failed: ${msg}`);
    }
  }, [state.enrichedPrompt, state.selectedTemplate, state.frames.length, state.fps, enrichData, updateNode, addLog]);

  // ═══ Step 6: Export ZIP ═══
  const exportZip = useCallback(async () => {
    if (!state.siteHtml || state.frames.length === 0) return;
    updateNode('export', { status: 'running', progress: 0 });
    addLog('🔄 Assembling ZIP...');
    setActiveStep('export');

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add HTML
      zip.file('index.html', state.siteHtml);

      // Add frames
      const framesFolder = zip.folder('frames')!;
      for (let i = 0; i < state.frames.length; i++) {
        const dataUrl = state.frames[i];
        const base64 = dataUrl.split(',')[1];
        framesFolder.file(
          `frame_${String(i).padStart(4, '0')}.jpg`,
          base64,
          { base64: true }
        );
        if (i % 20 === 0) {
          updateNode('export', { progress: Math.round((i / state.frames.length) * 90) });
        }
      }

      // Generate ZIP
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cinematic-${state.selectedTemplate}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      updateNode('export', { status: 'done', progress: 100 });
      addLog(`✅ ZIP downloaded (${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      updateNode('export', { status: 'error', error: msg });
      addLog(`❌ Export failed: ${msg}`);
    }
  }, [state.siteHtml, state.frames, state.selectedTemplate, updateNode, addLog]);

  // ═══ Run Full Pipeline ═══
  const runFullPipeline = useCallback(async () => {
    if (!state.prompt.trim() || state.isRunning) return;
    setState(prev => ({ ...prev, isRunning: true, nodes: initialNodes }));
    abortRef.current = new AbortController();
    addLog('🚀 Starting full pipeline...');

    try {
      // Step 1: Enrich
      await enrichPrompt();
      // Remaining steps are triggered manually or can chain
    } catch {
      addLog('❌ Pipeline interrupted');
    }
    setState(prev => ({ ...prev, isRunning: false }));
  }, [state.prompt, state.isRunning, enrichPrompt, addLog]);

  // ═══ Status badge color ═══
  const statusColor = (status: StepStatus) => {
    switch (status) {
      case 'idle': return '#333';
      case 'running': return '#f59e0b';
      case 'done': return '#22c55e';
      case 'error': return '#ef4444';
      case 'skipped': return '#6b7280';
    }
  };

  const statusIcon = (status: StepStatus) => {
    switch (status) {
      case 'idle': return '○';
      case 'running': return '◎';
      case 'done': return '✓';
      case 'error': return '✕';
      case 'skipped': return '–';
    }
  };

  // ═══ Render ═══
  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white overflow-hidden">
      {/* Hidden elements for frame extraction */}
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#111118] border-b border-[#1a1a2a]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold">3D</div>
          <span className="text-[13px] font-bold tracking-tight">Cinematic 3D Builder</span>
        </div>

        {/* API Status indicators */}
        <div className="flex items-center gap-2 ml-4">
          {apiStatus?.providers.map(p => (
            <div key={p.name} className="flex items-center gap-1" title={p.name}>
              <div className={`w-1.5 h-1.5 rounded-full ${p.available ? 'bg-emerald-400' : 'bg-red-400/40'}`} />
              <span className="text-[8px] text-[#555]">{p.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowLog(v => !v)}
            className={`px-2 py-1 rounded text-[9px] font-medium transition-colors ${showLog ? 'bg-[#1a1a2a] text-white' : 'text-[#555] hover:text-white'}`}
          >
            📋 Log ({log.length})
          </button>
          <select
            value={state.fps}
            onChange={e => setState(prev => ({ ...prev, fps: Number(e.target.value) as 15 | 24 | 30 }))}
            className="bg-[#1a1a2a] border border-[#2a2a3a] rounded px-2 py-1 text-[10px] text-[#999]"
          >
            <option value={15}>15 fps (léger)</option>
            <option value={24}>24 fps (smooth)</option>
            <option value={30}>30 fps (ultra)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ═══ Left Panel — Pipeline ═══ */}
        <div className="w-[320px] flex-shrink-0 border-r border-[#1a1a2a] flex flex-col overflow-y-auto">
          {/* Template Selector */}
          <div className="p-3 border-b border-[#1a1a2a]">
            <div className="text-[9px] font-medium text-[#555] uppercase tracking-wider mb-2">Template</div>
            <div className="grid grid-cols-2 gap-1.5">
              {CINEMATIC_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setState(prev => ({ ...prev, selectedTemplate: t.id }))}
                  className={`p-2 rounded-lg text-left transition-all ${
                    state.selectedTemplate === t.id
                      ? 'bg-[#1a1a2a] ring-1 ring-violet-500/50'
                      : 'hover:bg-[#111118]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                    <span className="text-[10px] font-medium truncate">{t.name}</span>
                  </div>
                  <div className="text-[8px] text-[#555] mt-0.5 truncate">{t.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="p-3 border-b border-[#1a1a2a]">
            <div className="text-[9px] font-medium text-[#555] uppercase tracking-wider mb-2">Your Vision</div>
            <textarea
              value={state.prompt}
              onChange={e => setState(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Describe your cinematic website... (e.g., 'A futuristic AI company landing page with dark theme and neon accents')"
              className="w-full h-20 bg-[#0d0d14] border border-[#2a2a3a] rounded-lg p-2.5 text-[11px] text-white placeholder-[#333] resize-none focus:outline-none focus:border-violet-500/50"
            />
            <button
              onClick={enrichPrompt}
              disabled={!state.prompt.trim() || state.nodes[0].status === 'running'}
              className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-[11px] font-bold disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              {state.nodes[0].status === 'running' ? '⏳ Enriching...' : '✦ Enrich & Start Pipeline'}
            </button>
          </div>

          {/* Pipeline Nodes */}
          <div className="flex-1 p-3">
            <div className="text-[9px] font-medium text-[#555] uppercase tracking-wider mb-3">Pipeline</div>
            <div className="space-y-1">
              {STEPS.map((s, i) => {
                const node = state.nodes[i];
                const isActive = activeStep === s.step;
                return (
                  <div key={s.step}>
                    <button
                      onClick={() => setActiveStep(s.step)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all ${
                        isActive ? 'bg-[#1a1a2a] ring-1 ring-white/10' : 'hover:bg-[#111118]'
                      }`}
                    >
                      {/* Status indicator */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-colors ${
                          node.status === 'running' ? 'animate-pulse' : ''
                        }`}
                        style={{ background: `${statusColor(node.status)}20`, color: statusColor(node.status) }}
                      >
                        {node.status === 'running' ? '◎' : s.icon}
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <div className="text-[11px] font-medium flex items-center gap-1.5">
                          {s.label}
                          <span className="text-[8px]" style={{ color: statusColor(node.status) }}>
                            {statusIcon(node.status)}
                          </span>
                        </div>
                        {node.error && (
                          <div className="text-[8px] text-red-400 truncate">{node.error}</div>
                        )}
                        {node.status === 'running' && node.progress !== undefined && (
                          <div className="w-full h-1 bg-[#1a1a2a] rounded-full mt-1">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${node.progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#fff' : '#333'} strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>

                    {/* Connector line */}
                    {i < STEPS.length - 1 && (
                      <div className="flex justify-start ml-[18px] h-3">
                        <div className="w-px bg-[#2a2a3a]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ Main Panel — Step Detail ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto p-4"
            >
              {/* ═══ PROMPT STEP ═══ */}
              {activeStep === 'prompt' && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-bold flex items-center gap-2">✦ Prompt Enrichment</h3>
                  {enrichData ? (
                    <div className="space-y-3">
                      <div className="bg-[#111118] rounded-xl p-4 border border-[#1a1a2a]">
                        <div className="text-[9px] font-medium text-violet-400 uppercase mb-1">Enriched Prompt</div>
                        <p className="text-[12px] text-[#ccc] leading-relaxed">{enrichData.enrichedPrompt}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-[#111118] rounded-xl p-3 border border-[#1a1a2a]">
                          <div className="text-[9px] font-medium text-cyan-400 uppercase mb-1">Image Prompt</div>
                          <p className="text-[11px] text-[#999]">{enrichData.imagePrompt}</p>
                        </div>
                        <div className="bg-[#111118] rounded-xl p-3 border border-[#1a1a2a]">
                          <div className="text-[9px] font-medium text-amber-400 uppercase mb-1">Video Prompt</div>
                          <p className="text-[11px] text-[#999]">{enrichData.videoPrompt}</p>
                        </div>
                        <div className="bg-[#111118] rounded-xl p-3 border border-[#1a1a2a]">
                          <div className="text-[9px] font-medium text-emerald-400 uppercase mb-1">Site Description</div>
                          <p className="text-[11px] text-[#999]">{enrichData.siteDescription}</p>
                        </div>
                      </div>
                      <button onClick={generateImage} className="px-4 py-2 rounded-lg bg-cyan-600 text-[11px] font-bold hover:bg-cyan-500 transition-colors">
                        → Generate Image
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#111118] rounded-xl p-8 border border-[#1a1a2a] flex flex-col items-center justify-center text-center">
                      <div className="text-4xl mb-3">✦</div>
                      <p className="text-[12px] text-[#555]">Enter your prompt and click &quot;Enrich &amp; Start Pipeline&quot;</p>
                      <p className="text-[10px] text-[#333] mt-1">The AI will transform your prompt into optimized descriptions for each pipeline step</p>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ IMAGE STEP ═══ */}
              {activeStep === 'image' && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-bold flex items-center gap-2">🖼 Image Generation</h3>
                  {state.imageUrl ? (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-[#1a1a2a]">
                        <img src={state.imageUrl} alt="Generated" className="w-full object-contain max-h-[400px] bg-black" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={generateImage} className="px-3 py-1.5 rounded-lg bg-[#1a1a2a] text-[10px] font-medium hover:bg-[#222] transition-colors">
                          🔄 Regenerate
                        </button>
                        <button onClick={generateVideo} className="px-4 py-1.5 rounded-lg bg-amber-600 text-[11px] font-bold hover:bg-amber-500 transition-colors">
                          → Generate Video
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#111118] rounded-xl p-8 border border-[#1a1a2a] flex flex-col items-center justify-center text-center">
                      {state.nodes[1].status === 'running' ? (
                        <>
                          <div className="text-4xl mb-3 animate-pulse">🖼</div>
                          <p className="text-[12px] text-amber-400">Generating image...</p>
                        </>
                      ) : (
                        <>
                          <div className="text-4xl mb-3">🖼</div>
                          <p className="text-[12px] text-[#555]">Enrich your prompt first, then generate the image</p>
                          {enrichData && (
                            <button onClick={generateImage} className="mt-3 px-4 py-2 rounded-lg bg-cyan-600 text-[11px] font-bold">
                              Generate Image
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ VIDEO STEP ═══ */}
              {activeStep === 'video' && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-bold flex items-center gap-2">🎬 Video Generation</h3>
                  {state.videoUrl ? (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-[#1a1a2a] bg-black">
                        <video src={state.videoUrl} controls className="w-full max-h-[400px]" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={generateVideo} className="px-3 py-1.5 rounded-lg bg-[#1a1a2a] text-[10px] font-medium hover:bg-[#222] transition-colors">
                          🔄 Regenerate
                        </button>
                        <button onClick={extractFrames} className="px-4 py-1.5 rounded-lg bg-emerald-600 text-[11px] font-bold hover:bg-emerald-500 transition-colors">
                          → Extract Frames
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#111118] rounded-xl p-8 border border-[#1a1a2a] flex flex-col items-center justify-center text-center">
                      {state.nodes[2].status === 'running' ? (
                        <>
                          <div className="text-4xl mb-3 animate-pulse">🎬</div>
                          <p className="text-[12px] text-amber-400">Generating video (2-4 min)...</p>
                          <p className="text-[9px] text-[#555] mt-1">Polling provider for completion</p>
                        </>
                      ) : (
                        <>
                          <div className="text-4xl mb-3">🎬</div>
                          <p className="text-[12px] text-[#555]">Generate an image first</p>
                          {state.imageUrl && (
                            <button onClick={generateVideo} className="mt-3 px-4 py-2 rounded-lg bg-amber-600 text-[11px] font-bold">
                              Generate Video
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ FRAMES STEP ═══ */}
              {activeStep === 'frames' && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-bold flex items-center gap-2">
                    🎞 Frame Extraction
                    {state.frames.length > 0 && <span className="text-[10px] text-[#555] font-normal">{state.frames.length} frames</span>}
                  </h3>
                  {state.frames.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-6 gap-1 max-h-[350px] overflow-y-auto rounded-xl">
                        {state.frames.filter((_, i) => i % Math.max(1, Math.floor(state.frames.length / 36)) === 0).slice(0, 36).map((f, i) => (
                          <img key={i} src={f} alt={`Frame ${i}`} className="w-full aspect-video object-cover rounded" />
                        ))}
                      </div>
                      <button onClick={generateSite} className="px-4 py-1.5 rounded-lg bg-blue-600 text-[11px] font-bold hover:bg-blue-500 transition-colors">
                        → Generate Site
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#111118] rounded-xl p-8 border border-[#1a1a2a] flex flex-col items-center justify-center text-center">
                      {state.nodes[3].status === 'running' ? (
                        <>
                          <div className="text-4xl mb-3 animate-pulse">🎞</div>
                          <p className="text-[12px] text-amber-400">Extracting frames...</p>
                          {state.nodes[3].progress !== undefined && (
                            <div className="w-48 h-2 bg-[#1a1a2a] rounded-full mt-2">
                              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${state.nodes[3].progress}%` }} />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-4xl mb-3">🎞</div>
                          <p className="text-[12px] text-[#555]">Generate a video first</p>
                          {state.videoUrl && (
                            <button onClick={extractFrames} className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-[11px] font-bold">
                              Extract Frames ({state.fps} fps)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ SITE STEP ═══ */}
              {activeStep === 'site' && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-bold flex items-center gap-2">🌐 Site Generation</h3>
                  {state.siteHtml ? (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-[#1a1a2a] bg-black h-[350px]">
                        <iframe
                          srcDoc={state.siteHtml}
                          className="w-full h-full border-0"
                          sandbox="allow-scripts"
                          title="Site Preview"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={generateSite} className="px-3 py-1.5 rounded-lg bg-[#1a1a2a] text-[10px] font-medium hover:bg-[#222] transition-colors">
                          🔄 Regenerate
                        </button>
                        <button onClick={exportZip} className="px-4 py-1.5 rounded-lg bg-violet-600 text-[11px] font-bold hover:bg-violet-500 transition-colors">
                          → Export ZIP
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#111118] rounded-xl p-8 border border-[#1a1a2a] flex flex-col items-center justify-center text-center">
                      {state.nodes[4].status === 'running' ? (
                        <>
                          <div className="text-4xl mb-3 animate-pulse">🌐</div>
                          <p className="text-[12px] text-amber-400">Generating site HTML...</p>
                        </>
                      ) : (
                        <>
                          <div className="text-4xl mb-3">🌐</div>
                          <p className="text-[12px] text-[#555]">Extract frames first</p>
                          {state.frames.length > 0 && (
                            <button onClick={generateSite} className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-[11px] font-bold">
                              Generate Site
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ EXPORT STEP ═══ */}
              {activeStep === 'export' && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-bold flex items-center gap-2">📦 Export</h3>
                  <div className="bg-[#111118] rounded-xl p-6 border border-[#1a1a2a]">
                    {state.nodes[5].status === 'done' ? (
                      <div className="text-center">
                        <div className="text-5xl mb-3">✅</div>
                        <p className="text-[14px] font-bold text-emerald-400">ZIP Downloaded!</p>
                        <p className="text-[11px] text-[#555] mt-1">Open index.html in a browser and scroll to experience the cinematic effect</p>
                        <button onClick={exportZip} className="mt-4 px-4 py-2 rounded-lg bg-violet-600 text-[11px] font-bold">
                          📦 Download Again
                        </button>
                      </div>
                    ) : state.nodes[5].status === 'running' ? (
                      <div className="text-center">
                        <div className="text-4xl mb-3 animate-pulse">📦</div>
                        <p className="text-[12px] text-amber-400">Assembling ZIP...</p>
                        {state.nodes[5].progress !== undefined && (
                          <div className="w-48 h-2 bg-[#1a1a2a] rounded-full mt-2 mx-auto">
                            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${state.nodes[5].progress}%` }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-4xl mb-3">📦</div>
                        <p className="text-[12px] text-[#555] mb-1">Ready to export when site is generated</p>
                        <div className="text-[10px] text-[#444] space-y-0.5">
                          <p>• index.html — Scroll-driven cinematic site</p>
                          <p>• frames/ — {state.frames.length || '~192'} extracted JPEG frames</p>
                          <p>• Estimated size: 15-25 MB</p>
                        </div>
                        {state.siteHtml && state.frames.length > 0 && (
                          <button onClick={exportZip} className="mt-4 px-6 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-[12px] font-bold">
                            📦 Export ZIP
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {(state.siteHtml || state.frames.length > 0) && (
                    <div className="bg-[#111118] rounded-xl p-4 border border-[#1a1a2a]">
                      <div className="text-[9px] font-medium text-[#555] uppercase mb-2">Pipeline Summary</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-[#0d0d14] rounded-lg p-2">
                          <div className="text-[18px] font-bold text-violet-400">{state.frames.length}</div>
                          <div className="text-[8px] text-[#555]">Frames</div>
                        </div>
                        <div className="bg-[#0d0d14] rounded-lg p-2">
                          <div className="text-[18px] font-bold text-cyan-400">{state.fps}</div>
                          <div className="text-[8px] text-[#555]">FPS</div>
                        </div>
                        <div className="bg-[#0d0d14] rounded-lg p-2">
                          <div className="text-[18px] font-bold text-emerald-400">{selectedTemplate.name.split(' ')[0]}</div>
                          <div className="text-[8px] text-[#555]">Template</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ═══ Log Panel ═══ */}
          {showLog && (
            <div className="h-36 border-t border-[#1a1a2a] bg-[#0a0a10] overflow-y-auto px-3 py-2">
              <div className="text-[9px] font-medium text-[#555] uppercase mb-1">Pipeline Log</div>
              {log.map((l, i) => (
                <div key={i} className="text-[10px] text-[#666] font-mono leading-relaxed">{l}</div>
              ))}
              {log.length === 0 && <div className="text-[10px] text-[#333]">No logs yet</div>}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Missing providers warning ═══ */}
      {apiStatus && !apiStatus.canRunFullPipeline && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-[11px]">⚠️</span>
            <span className="text-[10px] text-amber-300/70">
              Missing: {apiStatus.missingCritical.join(' • ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
