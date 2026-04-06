'use client';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { getDatabaseEngine, SCHEMA_TEMPLATES, type DBTable, type QueryResult, type QueryHistoryEntry } from '@/lib/database-live';
import { CollaborationEngine, type CollabMessage, type CollabEvent } from '@/lib/collaboration-engine';
import { BackendGenerator, type GeneratedFile } from '@/lib/backend-generator';

type ProjectFile = { content: string; language: string };

export function useFeatures(
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
  panelActions: { setPanel: (name: string, value: boolean) => void; togglePanel: (name: string) => void },
  githubToken: string,
  projectFiles: Record<string, ProjectFile>,
  setProjectFiles: (v: Record<string, ProjectFile> | ((prev: Record<string, ProjectFile>) => Record<string, ProjectFile>)) => void,
  setSelectedFile: (f: string) => void,
  selectedFile: string,
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>,
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>,
  setActiveTab: React.Dispatch<React.SetStateAction<'app' | 'code' | 'database' | 'payments' | 'ide'>>,
  setInput: (v: string) => void,
) {
  // ═══ v23: Real-Time Collaboration ═══
  
  const [collabRoomId, setCollabRoomId] = useState('');
  const [collabUsers, setCollabUsers] = useState<{ id: string; name: string; color: string; active: boolean; cursor?: { file: string; line: number; col: number } }[]>([]);
  const [collabJoinInput, setCollabJoinInput] = useState('');
  const collabUserId = useRef(Math.random().toString(36).slice(2, 8));
  const collabUserName = useRef('User-' + Math.random().toString(36).slice(2, 5).toUpperCase());
  const collabColors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
  const collabColorRef = useRef(collabColors[Math.floor(Math.random() * collabColors.length)]);
  const collabChannelRef = useRef<BroadcastChannel | null>(null);
  const collabSSERef = useRef<EventSource | null>(null);
  const [collabMode, setCollabMode] = useState<'local' | 'remote'>('local');

  const connectCollabSSE = useCallback((roomId: string, selfId: string) => {
    if (collabSSERef.current) { collabSSERef.current.close(); collabSSERef.current = null; }
    const es = new EventSource(`/api/collab?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(selfId)}`);
    collabSSERef.current = es;
    es.addEventListener('users', (e) => {
      try {
        const users = JSON.parse(e.data);
        setCollabUsers(users.map((u: { id: string; name: string; color: string; cursor?: { file: string; line: number; col: number } }) => ({ ...u, active: true })));
      } catch {}
    });
    es.addEventListener('signals', (e) => {
      try { JSON.parse(e.data); /* handle WebRTC signals if needed */ } catch {}
    });
    es.addEventListener('file-ops', (e) => {
      try {
        const ops = JSON.parse(e.data);
        for (const op of ops) {
          setProjectFiles(prev => ({ ...prev, [op.path]: { content: op.content, language: op.language } }));
        }
      } catch {}
    });
    es.addEventListener('error', () => {
      // Auto-reconnect is built into EventSource
    });
  }, []);

  const startCollabRoom = useCallback(async () => {
    const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
    setCollabRoomId(roomId);
    const self = { id: collabUserId.current, name: collabUserName.current, color: collabColorRef.current, active: true };

    // Try API-based (cross-device)
    try {
      const res = await fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', roomId, userId: self.id, userName: self.name, userColor: self.color }),
      });
      if (res.ok) {
        setCollabMode('remote');
        setCollabUsers([self]);
        // Connect SSE stream for real-time updates
        connectCollabSSE(roomId, self.id);
        navigator.clipboard?.writeText(roomId).catch(() => {});
        return;
      }
    } catch { /* API unavailable, fall back to BroadcastChannel */ }

    // Fallback: BroadcastChannel (same-origin tabs)
    setCollabMode('local');
    const ch = new BroadcastChannel(`aurion-collab-${roomId}`);
    collabChannelRef.current = ch;
    setCollabUsers([self]);
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'join') {
        setCollabUsers(prev => {
          if (prev.find(u => u.id === msg.user.id)) return prev;
          return [...prev, { ...msg.user, active: true }];
        });
        ch.postMessage({ type: 'presence', user: self });
      } else if (msg.type === 'presence') {
        setCollabUsers(prev => {
          if (prev.find(u => u.id === msg.user.id)) return prev;
          return [...prev, { ...msg.user, active: true }];
        });
      } else if (msg.type === 'file-change' && msg.userId !== collabUserId.current) {
        setProjectFiles(prev => ({ ...prev, [msg.path]: { content: msg.content, language: msg.language } }));
      } else if (msg.type === 'cursor-update' && msg.userId !== collabUserId.current) {
        setCollabUsers(prev => prev.map(u => u.id === msg.userId ? { ...u, cursor: msg.cursor } : u));
      } else if (msg.type === 'leave') {
        setCollabUsers(prev => prev.filter(u => u.id !== msg.userId));
      }
    };
    navigator.clipboard?.writeText(roomId).catch(() => {});
  }, [connectCollabSSE]);

  const joinCollabRoom = useCallback(async (roomId: string) => {
    if (!roomId.trim()) return;
    const rid = roomId.trim().toUpperCase();
    setCollabRoomId(rid);
    const self = { id: collabUserId.current, name: collabUserName.current, color: collabColorRef.current, active: true };

    // Try API join first
    try {
      const res = await fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomId: rid, userId: self.id, userName: self.name, userColor: self.color }),
      });
      if (res.ok) {
        const data = await res.json();
        setCollabMode('remote');
        setCollabUsers(data.users.map((u: { id: string; name: string; color: string }) => ({ ...u, active: true })));
        // Connect SSE stream for real-time updates
        connectCollabSSE(rid, self.id);
        return;
      }
    } catch { /* fallback */ }

    // Fallback: BroadcastChannel
    setCollabMode('local');
    const ch = new BroadcastChannel(`aurion-collab-${rid}`);
    collabChannelRef.current = ch;
    setCollabUsers([self]);
    ch.postMessage({ type: 'join', user: self });
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'join' || msg.type === 'presence') {
        setCollabUsers(prev => {
          if (prev.find(u => u.id === msg.user.id)) return prev;
          return [...prev, { ...msg.user, active: true }];
        });
        if (msg.type === 'join') ch.postMessage({ type: 'presence', user: self });
      } else if (msg.type === 'file-change' && msg.userId !== collabUserId.current) {
        setProjectFiles(prev => ({ ...prev, [msg.path]: { content: msg.content, language: msg.language } }));
      } else if (msg.type === 'cursor-update' && msg.userId !== collabUserId.current) {
        setCollabUsers(prev => prev.map(u => u.id === msg.userId ? { ...u, cursor: msg.cursor } : u));
      } else if (msg.type === 'leave') {
        setCollabUsers(prev => prev.filter(u => u.id !== msg.userId));
      }
    };
  }, [connectCollabSSE]);

  const leaveCollabRoom = useCallback(() => {
    // Close SSE stream
    if (collabSSERef.current) {
      collabSSERef.current.close();
      collabSSERef.current = null;
    }
    // Notify server
    if (collabMode === 'remote' && collabRoomId) {
      fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', roomId: collabRoomId, userId: collabUserId.current }),
      }).catch(() => {});
    }
    // BroadcastChannel cleanup
    if (collabChannelRef.current) {
      collabChannelRef.current.postMessage({ type: 'leave', userId: collabUserId.current });
      collabChannelRef.current.close();
      collabChannelRef.current = null;
    }
    setCollabRoomId('');
    setCollabUsers([]);
    setCollabMode('local');
  }, [collabMode, collabRoomId]);

  // Broadcast file changes to collaborators
  useEffect(() => {
    if (!collabRoomId) return;
    const timer = setTimeout(() => {
      if (selectedFile && projectFiles[selectedFile]) {
        // Remote mode: send via API
        if (collabMode === 'remote') {
          fetch('/api/collab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'file-change',
              roomId: collabRoomId,
              userId: collabUserId.current,
              path: selectedFile,
              content: projectFiles[selectedFile].content,
              language: projectFiles[selectedFile].language,
            }),
          }).catch(() => {});
        }
        // BroadcastChannel (always send for local tabs)
        collabChannelRef.current?.postMessage({
          type: 'file-change',
          userId: collabUserId.current,
          path: selectedFile,
          content: projectFiles[selectedFile].content,
          language: projectFiles[selectedFile].language,
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFiles[selectedFile]?.content, collabRoomId, collabMode]);

  // Cleanup collab on unmount
  useEffect(() => {
    return () => {
      if (collabSSERef.current) collabSSERef.current.close();
      if (collabChannelRef.current) {
        collabChannelRef.current.postMessage({ type: 'leave', userId: collabUserId.current });
        collabChannelRef.current.close();
      }
    };
  }, []);

  // ═══ v23: Feedback & Rating System ═══
  
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<{ rating: number; comment: string; ts: number }[]>([]);

  // ═══ Toolbar dropdown menus ═══
  
  

  // ═══ v24: Live Database Engine ═══
  const dbEngineRef = useRef(getDatabaseEngine());
  const [dbActiveConnection, setDbActiveConnection] = useState<string | null>(null);
  const [dbSqlInput, setDbSqlInput] = useState('SELECT * FROM users LIMIT 20;');
  const [dbQueryResult, setDbQueryResult] = useState<QueryResult | null>(null);
  const [dbQueryRunning, setDbQueryRunning] = useState(false);
  const [dbSchema, setDbSchema] = useState<DBTable[]>([]);
  const [dbSchemaLoading, setDbSchemaLoading] = useState(false);
  const [dbQueryHistory, setDbQueryHistory] = useState<QueryHistoryEntry[]>([]);
  const [dbSchemaTemplate, setDbSchemaTemplate] = useState<string | null>(null);
  const [dbViewMode, setDbViewMode] = useState<'query' | 'schema' | 'history' | 'templates'>('query');

  const connectDatabase = useCallback((provider: 'supabase' | 'neon', url: string, apiKey: string) => {
    const id = `${provider}_${Date.now()}`;
    dbEngineRef.current.addConnection({ id, provider, name: `${provider} DB`, url, apiKey, status: 'disconnected' });
    setDbActiveConnection(id);
    setTerminalLines(prev => [...prev, `$ ✓ Database connected: ${provider}`]);
    // Auto-fetch schema
    setDbSchemaLoading(true);
    dbEngineRef.current.getSchema(id).then(schema => {
      setDbSchema(schema);
      setDbSchemaLoading(false);
    }).catch(() => setDbSchemaLoading(false));
  }, []);

  const runDatabaseQuery = useCallback(async () => {
    if (!dbActiveConnection || !dbSqlInput.trim()) return;
    setDbQueryRunning(true);
    setDbQueryResult(null);
    const result = await dbEngineRef.current.executeQuery(dbActiveConnection, dbSqlInput.trim());
    setDbQueryResult(result);
    setDbQueryHistory(dbEngineRef.current.getHistory());
    setDbQueryRunning(false);
    if (result.error) {
      setTerminalLines(prev => [...prev, `$ ✗ SQL error: ${result.error}`]);
    } else {
      setTerminalLines(prev => [...prev, `$ ✓ Query OK: ${result.rowCount} row(s) in ${result.duration}ms`]);
    }
  }, [dbActiveConnection, dbSqlInput]);

  const runSchemaTemplate = useCallback(async (templateKey: string) => {
    if (!dbActiveConnection) return;
    const template = SCHEMA_TEMPLATES[templateKey];
    if (!template) return;
    setDbQueryRunning(true);
    const result = await dbEngineRef.current.executeQuery(dbActiveConnection, template.sql);
    setDbQueryResult(result);
    setDbQueryHistory(dbEngineRef.current.getHistory());
    setDbQueryRunning(false);
    if (!result.error) {
      setTerminalLines(prev => [...prev, `$ ✓ Schema "${template.name}" applied`]);
      // Refresh schema
      dbEngineRef.current.getSchema(dbActiveConnection).then(setDbSchema);
    }
  }, [dbActiveConnection]);

  // ═══ v24: Collaboration Engine (CRDT upgrade) ═══
  const collabEngineRef = useRef<CollaborationEngine | null>(null);
  const [collabChatMessages, setCollabChatMessages] = useState<CollabMessage[]>([]);
  const [collabChatInput, setCollabChatInput] = useState('');

  const initCollabEngine = useCallback(() => {
    if (!collabEngineRef.current) {
      collabEngineRef.current = new CollaborationEngine(
        collabUserId.current,
        collabUserName.current,
        collabColorRef.current,
      );
      collabEngineRef.current.on((event: CollabEvent) => {
        switch (event.type) {
          case 'user-joined':
            setCollabUsers(prev => {
              if (prev.find(u => u.id === event.user.id)) return prev;
              return [...prev, { id: event.user.id, name: event.user.name, color: event.user.color, active: true }];
            });
            break;
          case 'user-left':
            setCollabUsers(prev => prev.filter(u => u.id !== event.userId));
            break;
          case 'file-change':
            setProjectFiles(prev => ({ ...prev, [event.file]: { content: event.content, language: prev[event.file]?.language || 'plaintext' } }));
            break;
          case 'file-create':
            setProjectFiles(prev => ({ ...prev, [event.file]: { content: event.content, language: event.language } }));
            break;
          case 'file-delete':
            setProjectFiles(prev => { const next = { ...prev }; delete next[event.file]; return next; });
            break;
          case 'cursor-move':
            setCollabUsers(prev => prev.map(u => u.id === event.userId ? { ...u, cursor: { file: event.cursor.file, line: event.cursor.line, col: event.cursor.column } } : u));
            break;
          case 'chat-message':
            setCollabChatMessages(prev => [...prev, event.message]);
            break;
          case 'sync-response':
            setProjectFiles(prev => {
              const merged = { ...prev };
              for (const [path, file] of Object.entries(event.files)) {
                merged[path] = { content: file.content, language: file.language };
              }
              return merged;
            });
            break;
        }
      });
    }
    return collabEngineRef.current;
  }, []);

  const sendCollabChat = useCallback(() => {
    if (!collabChatInput.trim() || !collabEngineRef.current) return;
    collabEngineRef.current.sendMessage(collabChatInput.trim());
    setCollabChatInput('');
  }, [collabChatInput]);

  // ═══ v24: Backend Generator ═══
  
  const [backendPreset, setBackendPreset] = useState<string>('saas-starter');
  const [backendEntityName, setBackendEntityName] = useState('items');
  const [backendGeneratedFiles, setBackendGeneratedFiles] = useState<GeneratedFile[]>([]);
  const backendGeneratorRef = useRef(new BackendGenerator());

  const generateBackend = useCallback(() => {
    const preset = BackendGenerator.presets[backendPreset];
    if (!preset) return;
    const files = backendGeneratorRef.current.generate(preset, backendEntityName || 'items');
    setBackendGeneratedFiles(files);
    // Optionally inject all files into VFS
    setProjectFiles(prev => {
      const next = { ...prev };
      for (const f of files) {
        next[f.path] = { content: f.content, language: f.language };
      }
      return next;
    });
    // Open first file
    if (files.length > 0) {
      const firstFile = files[0].path;
      setSelectedFile(firstFile);
      setOpenTabs(prev => prev.includes(firstFile) ? prev : [...prev, firstFile]);
    }
    setActiveTab('code');
    setTerminalLines(prev => [...prev, `$ ✓ Backend generated: ${files.length} files (${backendPreset})`, ...files.map(f => `  + ${f.path}`)]);
    panelActions.setPanel('showBackendGenerator', false);
  }, [backendPreset, backendEntityName]);
  
  
  

  // Load feedback history
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aurion_feedback');
      if (saved) setFeedbackHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const submitFeedback = useCallback(() => {
    if (feedbackRating === 0) return;
    const entry = { rating: feedbackRating, comment: feedbackComment, ts: Date.now() };
    const updated = [...feedbackHistory, entry];
    setFeedbackHistory(updated);
    try { localStorage.setItem('aurion_feedback', JSON.stringify(updated)); } catch { /* ignore */ }
    setFeedbackSubmitted(true);
    setFeedbackComment('');
    setTimeout(() => { setFeedbackSubmitted(false); setFeedbackRating(0); panelActions.setPanel('showFeedbackPanel', false); }, 2000);
  }, [feedbackRating, feedbackComment, feedbackHistory]);

  // ═══ v23: Onboarding Tour ═══
  
  const [onboardingStep, setOnboardingStep] = useState(0);
  const onboardingSteps = useMemo(() => [
    { title: 'Welcome to Aurion', desc: 'Build stunning web apps with AI. Type a prompt to get started!', icon: '01' },
    { title: 'AI Chat Panel', desc: 'Describe what you want to build in natural language. Aurion AI will generate the code.', icon: '02' },
    { title: 'Live Preview', desc: 'See your app in real-time as code is generated. Toggle between preview and code views.', icon: '03' },
    { title: 'Code Editor', desc: 'Full Monaco editor with syntax highlighting, autocomplete, and multi-file support.', icon: '04' },
    { title: 'Terminal', desc: 'Run shell commands, install packages, and manage your project with a real terminal.', icon: '05' },
    { title: '40+ Audit Tools', desc: 'Accessibility checker, SEO analyzer, performance budget, and more in the command palette (Ctrl+K).', icon: '06' },
    { title: 'Deploy to Vercel', desc: 'One-click deployment to Vercel. Your app goes live instantly.', icon: '07' },
    { title: 'Collaboration', desc: 'Share a room code with your team. Edit together in real-time.', icon: '08' },
  ], []);

  // Show onboarding on first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem('aurion_onboarded')) {
        panelActions.setPanel('showOnboarding', true);
      }
    } catch { /* ignore */ }
  }, []);

  const finishOnboarding = useCallback(() => {
    panelActions.setPanel('showOnboarding', false);
    setOnboardingStep(0);
    try { localStorage.setItem('aurion_onboarded', 'true'); } catch { /* ignore */ }
  }, []);

  // ═══ v23: Changelog / What's New ═══
  

  // ═══ v24: Drag & Drop Visual Builder ═══
  
  const [vbComponents] = useState([
    { id: 'hero', name: 'Hero Section', icon: '🏠', html: '<section class="py-20 px-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center"><h1 class="text-5xl font-bold mb-4">Hero Title</h1><p class="text-xl opacity-80 mb-8">Subtitle goes here</p><button class="px-8 py-3 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100 transition">Get Started</button></section>' },
    { id: 'navbar', name: 'Navigation Bar', icon: '🧭', html: '<nav class="flex items-center justify-between px-6 py-4 bg-gray-900 text-white"><div class="text-xl font-bold">Brand</div><div class="flex gap-6 text-sm"><a href="#" class="hover:text-indigo-400">Home</a><a href="#" class="hover:text-indigo-400">About</a><a href="#" class="hover:text-indigo-400">Services</a><a href="#" class="hover:text-indigo-400">Contact</a></div></nav>' },
    { id: 'features', name: 'Features Grid', icon: '✨', html: '<section class="py-16 px-6 bg-gray-950"><h2 class="text-3xl font-bold text-white text-center mb-12">Features</h2><div class="grid grid-cols-3 gap-8 max-w-5xl mx-auto"><div class="p-6 bg-gray-900 rounded-xl border border-gray-800"><div class="text-3xl mb-3">🚀</div><h3 class="text-lg font-semibold text-white mb-2">Fast</h3><p class="text-gray-400 text-sm">Lightning-fast performance</p></div><div class="p-6 bg-gray-900 rounded-xl border border-gray-800"><div class="text-3xl mb-3">🔒</div><h3 class="text-lg font-semibold text-white mb-2">Secure</h3><p class="text-gray-400 text-sm">Enterprise-grade security</p></div><div class="p-6 bg-gray-900 rounded-xl border border-gray-800"><div class="text-3xl mb-3">⚡</div><h3 class="text-lg font-semibold text-white mb-2">Modern</h3><p class="text-gray-400 text-sm">Built with latest tech</p></div></div></section>' },
    { id: 'pricing', name: 'Pricing Cards', icon: '💰', html: '<section class="py-16 px-6 bg-gray-950"><h2 class="text-3xl font-bold text-white text-center mb-12">Pricing</h2><div class="grid grid-cols-3 gap-8 max-w-5xl mx-auto"><div class="p-8 bg-gray-900 rounded-xl border border-gray-800 text-center"><h3 class="text-lg font-bold text-white mb-2">Free</h3><div class="text-4xl font-black text-white mb-4">$0</div><ul class="space-y-2 text-sm text-gray-400 mb-6"><li>5 Projects</li><li>Basic Support</li></ul><button class="w-full py-2 bg-gray-800 text-white rounded-lg">Start Free</button></div><div class="p-8 bg-indigo-600 rounded-xl border border-indigo-500 text-center ring-2 ring-indigo-400"><h3 class="text-lg font-bold text-white mb-2">Pro</h3><div class="text-4xl font-black text-white mb-4">$19</div><ul class="space-y-2 text-sm text-indigo-200 mb-6"><li>Unlimited Projects</li><li>Priority Support</li></ul><button class="w-full py-2 bg-white text-indigo-700 rounded-lg font-semibold">Upgrade</button></div><div class="p-8 bg-gray-900 rounded-xl border border-gray-800 text-center"><h3 class="text-lg font-bold text-white mb-2">Enterprise</h3><div class="text-4xl font-black text-white mb-4">Custom</div><ul class="space-y-2 text-sm text-gray-400 mb-6"><li>Everything in Pro</li><li>Custom SLA</li></ul><button class="w-full py-2 bg-gray-800 text-white rounded-lg">Contact</button></div></div></section>' },
    { id: 'testimonials', name: 'Testimonials', icon: '💬', html: '<section class="py-16 px-6 bg-gray-900"><h2 class="text-3xl font-bold text-white text-center mb-12">What People Say</h2><div class="grid grid-cols-3 gap-6 max-w-5xl mx-auto"><div class="p-6 bg-gray-800 rounded-xl"><p class="text-gray-300 text-sm mb-4">"Amazing product, saved us hours."</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">JD</div><span class="text-white text-sm font-medium">John Doe</span></div></div><div class="p-6 bg-gray-800 rounded-xl"><p class="text-gray-300 text-sm mb-4">"Best tool we ever used."</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">AS</div><span class="text-white text-sm font-medium">Alice Smith</span></div></div><div class="p-6 bg-gray-800 rounded-xl"><p class="text-gray-300 text-sm mb-4">"Incredible experience."</p><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">BJ</div><span class="text-white text-sm font-medium">Bob Jones</span></div></div></div></section>' },
    { id: 'footer', name: 'Footer', icon: '🔻', html: '<footer class="py-12 px-6 bg-gray-950 border-t border-gray-800"><div class="max-w-5xl mx-auto grid grid-cols-4 gap-8"><div><h4 class="text-white font-bold mb-4">Brand</h4><p class="text-gray-500 text-sm">Building the future.</p></div><div><h4 class="text-white font-bold mb-4">Product</h4><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Features</a><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Pricing</a></div><div><h4 class="text-white font-bold mb-4">Company</h4><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">About</a><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Blog</a></div><div><h4 class="text-white font-bold mb-4">Legal</h4><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Privacy</a><a href="#" class="block text-gray-400 text-sm hover:text-white mb-1">Terms</a></div></div></footer>' },
    { id: 'cta', name: 'Call to Action', icon: '📢', html: '<section class="py-20 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-center"><h2 class="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2><p class="text-lg text-purple-200 mb-8">Join thousands of happy customers today.</p><div class="flex gap-4 justify-center"><button class="px-8 py-3 bg-white text-indigo-700 rounded-lg font-semibold hover:bg-gray-100 transition">Start Free</button><button class="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition">Learn More</button></div></section>' },
    { id: 'contact', name: 'Contact Form', icon: '📧', html: '<section class="py-16 px-6 bg-gray-950"><div class="max-w-lg mx-auto"><h2 class="text-3xl font-bold text-white text-center mb-8">Contact Us</h2><form class="space-y-4"><input type="text" placeholder="Your Name" class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"><input type="email" placeholder="Email" class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"><textarea placeholder="Message" rows="4" class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none resize-none"></textarea><button type="submit" class="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">Send Message</button></form></div></section>' },
    { id: 'faq', name: 'FAQ Accordion', icon: '❓', html: '<section class="py-16 px-6 bg-gray-950"><h2 class="text-3xl font-bold text-white text-center mb-12">FAQ</h2><div class="max-w-2xl mx-auto space-y-3"><details class="group p-4 bg-gray-900 rounded-xl border border-gray-800"><summary class="text-white font-medium cursor-pointer flex items-center justify-between">What is this product? <span class="text-indigo-400 group-open:rotate-45 transition-transform text-xl">+</span></summary><p class="text-gray-400 text-sm mt-3">A powerful tool for building modern websites with AI.</p></details><details class="group p-4 bg-gray-900 rounded-xl border border-gray-800"><summary class="text-white font-medium cursor-pointer flex items-center justify-between">How does pricing work? <span class="text-indigo-400 group-open:rotate-45 transition-transform text-xl">+</span></summary><p class="text-gray-400 text-sm mt-3">We offer free, pro, and enterprise plans. See pricing above.</p></details><details class="group p-4 bg-gray-900 rounded-xl border border-gray-800"><summary class="text-white font-medium cursor-pointer flex items-center justify-between">Is there a trial? <span class="text-indigo-400 group-open:rotate-45 transition-transform text-xl">+</span></summary><p class="text-gray-400 text-sm mt-3">Yes! Start free and upgrade anytime.</p></details></div></section>' },
    { id: 'stats', name: 'Stats Counter', icon: '📊', html: '<section class="py-16 px-6 bg-gray-900"><div class="grid grid-cols-4 gap-8 max-w-4xl mx-auto text-center"><div><div class="text-4xl font-black text-white">10K+</div><div class="text-gray-400 text-sm mt-1">Users</div></div><div><div class="text-4xl font-black text-white">50M+</div><div class="text-gray-400 text-sm mt-1">Requests</div></div><div><div class="text-4xl font-black text-white">99.9%</div><div class="text-gray-400 text-sm mt-1">Uptime</div></div><div><div class="text-4xl font-black text-white">4.9★</div><div class="text-gray-400 text-sm mt-1">Rating</div></div></div></section>' },
    { id: 'gallery', name: 'Image Gallery', icon: '🖼️', html: '<section class="py-16 px-6 bg-gray-950"><h2 class="text-3xl font-bold text-white text-center mb-12">Gallery</h2><div class="grid grid-cols-3 gap-4 max-w-5xl mx-auto"><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 1</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 2</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 3</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 4</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 5</div><div class="aspect-video bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-sm">Image 6</div></div></section>' },
    { id: 'team', name: 'Team Section', icon: '👥', html: '<section class="py-16 px-6 bg-gray-900"><h2 class="text-3xl font-bold text-white text-center mb-12">Our Team</h2><div class="grid grid-cols-4 gap-6 max-w-5xl mx-auto"><div class="text-center"><div class="w-20 h-20 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl mb-3">👩‍💻</div><h4 class="text-white font-semibold">Sarah Chen</h4><p class="text-gray-400 text-xs">CEO</p></div><div class="text-center"><div class="w-20 h-20 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center text-2xl mb-3">👨‍💻</div><h4 class="text-white font-semibold">Alex Rivera</h4><p class="text-gray-400 text-xs">CTO</p></div><div class="text-center"><div class="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl mb-3">👩‍🎨</div><h4 class="text-white font-semibold">Maya Patel</h4><p class="text-gray-400 text-xs">Design Lead</p></div><div class="text-center"><div class="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center text-2xl mb-3">👨‍🔬</div><h4 class="text-white font-semibold">Tom Baker</h4><p class="text-gray-400 text-xs">Lead Engineer</p></div></div></section>' },
  ]);
  const [vbCanvas, setVbCanvas] = useState<string[]>([]);
  const [vbDragging, setVbDragging] = useState<string | null>(null);
  const [vbSelectedIdx, setVbSelectedIdx] = useState<number>(-1);
  const [vbPropertyTab, setVbPropertyTab] = useState<'style' | 'content'>('style');

  const vbAddComponent = useCallback((componentId: string) => {
    const comp = vbComponents.find(c => c.id === componentId);
    if (comp) setVbCanvas(prev => [...prev, comp.html]);
  }, [vbComponents]);

  const vbRemoveComponent = useCallback((idx: number) => {
    setVbCanvas(prev => prev.filter((_, i) => i !== idx));
    setVbSelectedIdx(-1);
  }, []);

  const vbMoveComponent = useCallback((idx: number, dir: 'up' | 'down') => {
    setVbCanvas(prev => {
      const next = [...prev];
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      setVbSelectedIdx(targetIdx);
      return next;
    });
  }, []);

  const vbGenerateCode = useCallback(() => {
    if (vbCanvas.length === 0) return;
    const fullHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Website</title>\n  <script src="https://cdn.tailwindcss.com"><\/script>\n  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">\n  <style>*{font-family:'Inter',sans-serif;}</style>\n</head>\n<body class="bg-gray-950 text-white">\n${vbCanvas.join('\n')}\n</body>\n</html>`;
    const newFiles: Record<string, { content: string; language: string }> = { 'index.html': { content: fullHtml, language: 'html' } };
    setProjectFiles(newFiles);
    setSelectedFile('index.html');
    panelActions.setPanel('showVisualBuilder', false);
  }, [vbCanvas]);

  // ═══ v24: Animation Timeline Builder ═══
  
  const [animKeyframes, setAnimKeyframes] = useState<{ id: string; name: string; frames: { pct: number; props: Record<string, string> }[]; duration: number; easing: string; iteration: string }[]>([]);
  const [animSelected, setAnimSelected] = useState<number>(-1);
  const [animPreviewPlaying, setAnimPreviewPlaying] = useState(false);

  const animAddNew = useCallback(() => {
    setAnimKeyframes(prev => [...prev, {
      id: `anim-${Date.now()}`,
      name: `animation-${prev.length + 1}`,
      frames: [
        { pct: 0, props: { opacity: '0', transform: 'translateY(20px)' } },
        { pct: 100, props: { opacity: '1', transform: 'translateY(0)' } },
      ],
      duration: 0.6,
      easing: 'ease-out',
      iteration: '1',
    }]);
    setAnimSelected(animKeyframes.length);
  }, [animKeyframes.length]);

  const animUpdateFrame = useCallback((animIdx: number, frameIdx: number, prop: string, value: string) => {
    setAnimKeyframes(prev => {
      const next = [...prev];
      const anim = { ...next[animIdx] };
      const frames = [...anim.frames];
      frames[frameIdx] = { ...frames[frameIdx], props: { ...frames[frameIdx].props, [prop]: value } };
      anim.frames = frames;
      next[animIdx] = anim;
      return next;
    });
  }, []);

  const animAddFrame = useCallback((animIdx: number) => {
    setAnimKeyframes(prev => {
      const next = [...prev];
      const anim = { ...next[animIdx], frames: [...next[animIdx].frames] };
      const lastPct = anim.frames[anim.frames.length - 1]?.pct ?? 0;
      anim.frames.push({ pct: Math.min(lastPct + 25, 100), props: { opacity: '1', transform: 'none' } });
      next[animIdx] = anim;
      return next;
    });
  }, []);

  const animDeleteAnim = useCallback((idx: number) => {
    setAnimKeyframes(prev => prev.filter((_, i) => i !== idx));
    setAnimSelected(-1);
  }, []);

  const animGenerateCSS = useCallback(() => {
    if (animKeyframes.length === 0) return '';
    return animKeyframes.map(anim => {
      const keyframeStr = anim.frames.map(f => `  ${f.pct}% { ${Object.entries(f.props).map(([k, v]) => `${k}: ${v}`).join('; ')}; }`).join('\n');
      return `@keyframes ${anim.name} {\n${keyframeStr}\n}\n.${anim.name} {\n  animation: ${anim.name} ${anim.duration}s ${anim.easing} ${anim.iteration === 'infinite' ? 'infinite' : anim.iteration};\n}`;
    }).join('\n\n');
  }, [animKeyframes]);

  const animCopyCSS = useCallback(() => {
    const css = animGenerateCSS();
    if (css) navigator.clipboard.writeText(css);
  }, [animGenerateCSS]);

  const animInjectToProject = useCallback(() => {
    const css = animGenerateCSS();
    if (!css) return;
    const file = selectedFile || 'index.html';
    const content = projectFiles[file]?.content || '';
    if (content.includes('</style>')) {
      const updated = content.replace('</style>', `\n/* Aurion Animations */\n${css}\n</style>`);
      setProjectFiles(prev => ({ ...prev, [file]: { ...prev[file], content: updated } }));
    } else if (content.includes('</head>')) {
      const updated = content.replace('</head>', `<style>\n/* Aurion Animations */\n${css}\n</style>\n</head>`);
      setProjectFiles(prev => ({ ...prev, [file]: { ...prev[file], content: updated } }));
    }
    panelActions.setPanel('showAnimBuilder', false);
  }, [animGenerateCSS, selectedFile, projectFiles]);

  // ═══ v24: Design System Manager ═══
  
  const [dsTab, setDsTab] = useState<'colors' | 'typography' | 'spacing' | 'shadows' | 'export'>('colors');
  const [dsColors, setDsColors] = useState<{ name: string; value: string; variants: string[] }[]>([
    { name: 'Primary', value: '#6366f1', variants: ['#eef2ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
    { name: 'Secondary', value: '#ec4899', variants: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
    { name: 'Success', value: '#10b981', variants: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'] },
    { name: 'Warning', value: '#f59e0b', variants: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
    { name: 'Error', value: '#ef4444', variants: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
    { name: 'Neutral', value: '#6b7280', variants: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'] },
  ]);
  const [dsFontPrimary, setDsFontPrimary] = useState('Inter');
  const [dsFontSecondary, setDsFontSecondary] = useState('JetBrains Mono');
  const [dsTypeScale, setDsTypeScale] = useState<{ name: string; size: string; weight: string; lineHeight: string }[]>([
    { name: 'Display', size: '4rem', weight: '800', lineHeight: '1.1' },
    { name: 'H1', size: '2.5rem', weight: '700', lineHeight: '1.2' },
    { name: 'H2', size: '2rem', weight: '700', lineHeight: '1.3' },
    { name: 'H3', size: '1.5rem', weight: '600', lineHeight: '1.4' },
    { name: 'H4', size: '1.25rem', weight: '600', lineHeight: '1.4' },
    { name: 'Body', size: '1rem', weight: '400', lineHeight: '1.6' },
    { name: 'Small', size: '0.875rem', weight: '400', lineHeight: '1.5' },
    { name: 'Caption', size: '0.75rem', weight: '500', lineHeight: '1.4' },
  ]);
  const [dsSpacing] = useState([4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]);
  const [dsShadows] = useState([
    { name: 'sm', value: '0 1px 2px rgba(0,0,0,0.05)' },
    { name: 'md', value: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' },
    { name: 'lg', value: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
    { name: 'xl', value: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' },
    { name: '2xl', value: '0 25px 50px -12px rgba(0,0,0,0.25)' },
    { name: 'glow', value: '0 0 20px rgba(99,102,241,0.3)' },
  ]);
  const [dsBorderRadius] = useState([0, 2, 4, 6, 8, 12, 16, 24, 9999]);

  const dsGenerateCSS = useCallback(() => {
    let css = ':root {\n';
    dsColors.forEach(c => {
      c.variants.forEach((v, i) => { css += `  --${c.name.toLowerCase()}-${(i + 1) * 100}: ${v};\n`; });
    });
    css += `\n  --font-primary: '${dsFontPrimary}', sans-serif;\n  --font-mono: '${dsFontSecondary}', monospace;\n`;
    dsSpacing.forEach(s => { css += `  --space-${s}: ${s}px;\n`; });
    dsShadows.forEach(s => { css += `  --shadow-${s.name}: ${s.value};\n`; });
    dsBorderRadius.forEach(r => { css += `  --radius-${r}: ${r}px;\n`; });
    css += '}\n\n';
    dsTypeScale.forEach(t => {
      css += `.text-${t.name.toLowerCase()} { font-size: ${t.size}; font-weight: ${t.weight}; line-height: ${t.lineHeight}; }\n`;
    });
    return css;
  }, [dsColors, dsFontPrimary, dsFontSecondary, dsTypeScale, dsSpacing, dsShadows, dsBorderRadius]);

  const dsGenerateTokensJSON = useCallback(() => {
    return JSON.stringify({
      colors: Object.fromEntries(dsColors.map(c => [c.name.toLowerCase(), { base: c.value, scale: Object.fromEntries(c.variants.map((v, i) => [`${(i + 1) * 100}`, v])) }])),
      typography: { primary: dsFontPrimary, mono: dsFontSecondary, scale: dsTypeScale },
      spacing: dsSpacing,
      shadows: Object.fromEntries(dsShadows.map(s => [s.name, s.value])),
      borderRadius: dsBorderRadius,
    }, null, 2);
  }, [dsColors, dsFontPrimary, dsFontSecondary, dsTypeScale, dsSpacing, dsShadows, dsBorderRadius]);

  const dsAddColor = useCallback((name: string, hex: string) => {
    const h = parseInt(hex.slice(1), 16);
    const r = (h >> 16) & 255, g = (h >> 8) & 255, b = h & 255;
    const variants = Array.from({ length: 9 }, (_, i) => {
      const factor = (i - 4) * 0.15;
      const nr = Math.min(255, Math.max(0, Math.round(r + (factor > 0 ? (255 - r) * factor * 2 : r * factor * 2))));
      const ng = Math.min(255, Math.max(0, Math.round(g + (factor > 0 ? (255 - g) * factor * 2 : g * factor * 2))));
      const nb = Math.min(255, Math.max(0, Math.round(b + (factor > 0 ? (255 - b) * factor * 2 : b * factor * 2))));
      return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
    });
    setDsColors(prev => [...prev, { name, value: hex, variants }]);
  }, []);

  // ═══ v24: REST API Tester ═══
  
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [apiUrl, setApiUrl] = useState('');
  const [apiHeaders, setApiHeaders] = useState<{ key: string; value: string }[]>([{ key: 'Content-Type', value: 'application/json' }]);
  const [apiBody, setApiBody] = useState('{\n  \n}');
  const [apiResponse, setApiResponse] = useState<{ status: number; time: number; data: string; headers: Record<string, string> } | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiHistory, setApiHistory] = useState<{ method: string; url: string; status: number; time: number; ts: number }[]>([]);
  const [apiTab, setApiTab] = useState<'body' | 'headers' | 'history'>('body');

  const apiSendRequest = useCallback(async () => {
    if (!apiUrl.trim()) return;
    setApiLoading(true);
    setApiResponse(null);
    const start = performance.now();
    try {
      const headers: Record<string, string> = {};
      apiHeaders.forEach(h => { if (h.key.trim()) headers[h.key.trim()] = h.value; });
      const opts: RequestInit = { method: apiMethod, headers };
      if (apiMethod !== 'GET' && apiMethod !== 'DELETE' && apiBody.trim()) {
        opts.body = apiBody;
      }
      const res = await fetch(apiUrl, opts);
      const elapsed = Math.round(performance.now() - start);
      const text = await res.text();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      setApiResponse({ status: res.status, time: elapsed, data: text, headers: resHeaders });
      setApiHistory(prev => [{ method: apiMethod, url: apiUrl, status: res.status, time: elapsed, ts: Date.now() }, ...prev].slice(0, 50));
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setApiResponse({ status: 0, time: elapsed, data: `Error: ${err instanceof Error ? err.message : String(err)}`, headers: {} });
    } finally {
      setApiLoading(false);
    }
  }, [apiUrl, apiMethod, apiHeaders, apiBody]);

  const apiAddHeader = useCallback(() => {
    setApiHeaders(prev => [...prev, { key: '', value: '' }]);
  }, []);

  const apiRemoveHeader = useCallback((idx: number) => {
    setApiHeaders(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ═══ v24: Git Branch Manager ═══
  
  const [gitBranches, setGitBranches] = useState<{ name: string; current: boolean; commits: number; lastCommit: string }[]>([
    { name: 'main', current: true, commits: 1, lastCommit: new Date().toISOString() },
  ]);
  const [gitBranchCommits, setGitBranchCommits] = useState<{ id: string; message: string; branch: string; files: string[]; timestamp: string }[]>([]);
  const [gitNewBranch, setGitNewBranch] = useState('');
  const [gitCommitMsg, setGitCommitMsg] = useState('');
  const [gitTab, setGitTab] = useState<'branches' | 'commits' | 'stash' | 'remote'>('branches');
  const [gitStash, setGitStash] = useState<{ id: string; message: string; files: Record<string, { content: string; language: string }>; timestamp: string }[]>([]);

  const gitCurrentBranch = useMemo(() => gitBranches.find(b => b.current)?.name || 'main', [gitBranches]);

  const gitCreateBranch = useCallback((name: string) => {
    if (!name.trim() || gitBranches.some(b => b.name === name.trim())) return;
    setGitBranches(prev => [
      ...prev.map(b => ({ ...b, current: false })),
      { name: name.trim(), current: true, commits: 0, lastCommit: new Date().toISOString() },
    ]);
    setGitNewBranch('');
  }, [gitBranches]);

  const gitSwitchBranch = useCallback((name: string) => {
    setGitBranches(prev => prev.map(b => ({ ...b, current: b.name === name })));
  }, []);

  const gitDeleteBranch = useCallback((name: string) => {
    if (name === 'main') return;
    setGitBranches(prev => {
      const next = prev.filter(b => b.name !== name);
      if (!next.some(b => b.current)) next[0].current = true;
      return next;
    });
    setGitBranchCommits(prev => prev.filter(c => c.branch !== name));
  }, []);

  const gitCommit = useCallback((message: string) => {
    if (!message.trim()) return;
    const changedFiles = Object.keys(projectFiles);
    const commit = { id: Math.random().toString(36).slice(2, 10), message: message.trim(), branch: gitCurrentBranch, files: changedFiles, timestamp: new Date().toISOString() };
    setGitBranchCommits(prev => [commit, ...prev]);
    setGitBranches(prev => prev.map(b => b.name === gitCurrentBranch ? { ...b, commits: b.commits + 1, lastCommit: commit.timestamp } : b));
    setGitCommitMsg('');
  }, [gitCurrentBranch, projectFiles]);

  const gitStashSave = useCallback(() => {
    setGitStash(prev => [{ id: Math.random().toString(36).slice(2, 10), message: `WIP on ${gitCurrentBranch}`, files: { ...projectFiles }, timestamp: new Date().toISOString() }, ...prev]);
  }, [gitCurrentBranch, projectFiles]);

  const gitStashPop = useCallback((idx: number) => {
    const stash = gitStash[idx];
    if (!stash) return;
    setProjectFiles(stash.files);
    setGitStash(prev => prev.filter((_, i) => i !== idx));
  }, [gitStash]);

  // ═══ v24: AI Screenshot Analyzer ═══
  
  const [ssImage, setSsImage] = useState<string | null>(null);
  const [ssAnalyzing, setSsAnalyzing] = useState(false);
  const [ssResult, setSsResult] = useState<string | null>(null);
  const [ssDragOver, setSsDragOver] = useState(false);

  // ═══ Figma Import Panel ═══
  
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [figmaLoading, setFigmaLoading] = useState(false);
  const [figmaData, setFigmaData] = useState<{ fileName: string; frameName: string; frameSize: { width: number; height: number } | null; screenshotUrl: string; colors: string[]; fonts: string[]; components: Array<{ name: string; type: string; count: number }>; designPrompt: string } | null>(null);
  const [figmaFrames, setFigmaFrames] = useState<{ pages: Array<{ name: string; frames: Array<{ id: string; name: string; width: number; height: number; childCount: number }> }> } | null>(null);

  const figmaImport = useCallback(async (nodeId?: string) => {
    if (!figmaUrl.trim()) return;
    setFigmaLoading(true);
    try {
      const url = nodeId ? figmaUrl + (figmaUrl.includes('?') ? '&' : '?') + `node-id=${nodeId}` : figmaUrl;
      const res = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token: figmaToken || undefined }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Failed' })); showToast(e.error || 'Figma import failed', 'error'); return; }
      const data = await res.json();
      setFigmaData(data);
    } catch { showToast('Figma import failed', 'error'); }
    finally { setFigmaLoading(false); }
  }, [figmaUrl, figmaToken, showToast]);

  const figmaListFrames = useCallback(async () => {
    if (!figmaUrl.trim()) return;
    setFigmaLoading(true);
    try {
      const res = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: figmaUrl, token: figmaToken || undefined, mode: 'frames' }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Failed' })); showToast(e.error || 'Failed to load frames', 'error'); return; }
      const data = await res.json();
      setFigmaFrames(data);
    } catch { showToast('Failed to load frames', 'error'); }
    finally { setFigmaLoading(false); }
  }, [figmaUrl, figmaToken, showToast]);

  const figmaGenCode = useCallback(() => {
    if (!figmaData?.designPrompt) return;
    panelActions.setPanel('showFigmaPanel', false);
    // Inject into input and trigger send (sendToAI is defined later, use input + button approach)
    const prompt = figmaData.designPrompt + (figmaData.screenshotUrl ? `\n\n[Screenshot: ${figmaData.screenshotUrl}]` : '');
    setInput(prompt);
    // Auto-send after a tick
    setTimeout(() => {
      const sendBtn = document.querySelector('[data-send-btn]') as HTMLButtonElement;
      if (sendBtn) sendBtn.click();
    }, 100);
  }, [figmaData]);

  // ═══ Git PR State ═══
  const [gitPRs, setGitPRs] = useState<Array<{ number: number; title: string; state: string; head: string; base: string; author: string; avatar: string; mergeable: boolean }>>([]);
  const [gitPRTitle, setGitPRTitle] = useState('');
  const [gitPRHead, setGitPRHead] = useState('');
  const [gitPRBase, setGitPRBase] = useState('main');
  const [gitRemoteCommits, setGitRemoteCommits] = useState<Array<{ sha: string; message: string; author: string; date: string; avatar: string }>>([]);
  const [gitRemoteLoading, setGitRemoteLoading] = useState(false);
  const [gitSelectedRepo, setGitSelectedRepo] = useState('');
  const [gitRepos, setGitRepos] = useState<Array<{ name: string; fullName: string; url: string; language: string; defaultBranch: string }>>([]);
  const [gitRemoteBranches, setGitRemoteBranches] = useState<Array<{ name: string; sha: string }>>([]);

  const gitFetchRepos = useCallback(async () => {
    if (!githubToken) return;
    setGitRemoteLoading(true);
    try {
      const res = await fetch(`/api/github?action=repos&token=${encodeURIComponent(githubToken)}`);
      if (res.ok) { const data = await res.json(); setGitRepos(data); }
    } catch {} finally { setGitRemoteLoading(false); }
  }, [githubToken]);

  const gitFetchBranches = useCallback(async (repo: string) => {
    if (!githubToken || !repo) return;
    const [owner, name] = repo.split('/');
    try {
      const res = await fetch(`/api/github?action=branches&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`);
      if (res.ok) { const data = await res.json(); setGitRemoteBranches(data); }
    } catch {}
  }, [githubToken]);

  const gitFetchCommits = useCallback(async (repo: string, branch?: string) => {
    if (!githubToken || !repo) return;
    const [owner, name] = repo.split('/');
    try {
      const res = await fetch(`/api/github?action=commits&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`);
      if (res.ok) { const data = await res.json(); setGitRemoteCommits(data); }
    } catch {}
  }, [githubToken]);

  const gitCreatePR = useCallback(async () => {
    if (!githubToken || !gitSelectedRepo || !gitPRHead || !gitPRTitle) return;
    const [owner, name] = gitSelectedRepo.split('/');
    try {
      const res = await fetch(`/api/github?action=create-pr&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}&title=${encodeURIComponent(gitPRTitle)}&head=${encodeURIComponent(gitPRHead)}&base=${encodeURIComponent(gitPRBase)}`);
      if (res.ok) { const data = await res.json(); showToast(`PR #${data.number} created`, 'success'); gitFetchPRs(); }
      else { const e = await res.json().catch(() => ({})); showToast(e.error || 'Failed to create PR', 'error'); }
    } catch { showToast('Failed to create PR', 'error'); }
  }, [githubToken, gitSelectedRepo, gitPRHead, gitPRTitle, gitPRBase, showToast]);

  const gitFetchPRs = useCallback(async () => {
    if (!githubToken || !gitSelectedRepo) return;
    const [owner, name] = gitSelectedRepo.split('/');
    try {
      const res = await fetch(`/api/github?action=list-prs&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`);
      if (res.ok) { const data = await res.json(); setGitPRs(data); }
    } catch {}
  }, [githubToken, gitSelectedRepo]);

  const gitMergePR = useCallback(async (prNumber: number) => {
    if (!githubToken || !gitSelectedRepo) return;
    const [owner, name] = gitSelectedRepo.split('/');
    try {
      const res = await fetch(`/api/github?action=merge-pr&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}&pr=${prNumber}`);
      if (res.ok) { showToast(`PR #${prNumber} merged`, 'success'); gitFetchPRs(); }
      else { const e = await res.json().catch(() => ({})); showToast(e.error || 'Merge failed', 'error'); }
    } catch { showToast('Merge failed', 'error'); }
  }, [githubToken, gitSelectedRepo, showToast, gitFetchPRs]);

  const gitMergeBranch = useCallback(async (head: string, base: string) => {
    if (!githubToken || !gitSelectedRepo) return;
    const [owner, name] = gitSelectedRepo.split('/');
    try {
      const res = await fetch(`/api/github?action=merge-branch&token=${encodeURIComponent(githubToken)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}&head=${encodeURIComponent(head)}&base=${encodeURIComponent(base)}`);
      if (res.ok) { showToast(`Merged ${head} into ${base}`, 'success'); }
      else {
        const e = await res.json().catch(() => ({}));
        if (e.conflict) { showToast('Merge conflict! Resolve manually on GitHub.', 'error'); }
        else { showToast(e.error || 'Merge failed', 'error'); }
      }
    } catch { showToast('Merge failed', 'error'); }
  }, [githubToken, gitSelectedRepo, showToast]);

  const ssHandleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setSsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setSsImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const ssHandlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => setSsImage(reader.result as string);
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  const ssAnalyze = useCallback(async () => {
    if (!ssImage) return;
    setSsAnalyzing(true);
    setSsResult(null);
    try {
      const base64 = ssImage.split(',')[1];
      const mimeType = ssImage.split(';')[0].split(':')[1] || 'image/png';
      const res = await fetch('/api/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Analyze this screenshot and generate a pixel-perfect HTML/Tailwind CSS recreation of this design. Include ALL visual details, exact colors, fonts, spacing, and layout. Generate COMPLETE, WORKING HTML with Tailwind CDN. Make it responsive.' }],
          model: 'claude-sonnet-4-20250514',
          images: [{ data: base64, type: mimeType }],
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      let fullText = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.text) fullText += parsed.text;
            } catch { /* skip */ }
          }
        }
      }
      setSsResult(fullText);
    } catch (err) {
      setSsResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSsAnalyzing(false);
    }
  }, [ssImage]);

  const ssApplyCode = useCallback(() => {
    if (!ssResult) return;
    const htmlMatch = ssResult.match(/```html\n([\s\S]*?)```/) || ssResult.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
    const code = htmlMatch ? htmlMatch[1] : ssResult;
    setProjectFiles(prev => ({ ...prev, 'screenshot-clone.html': { content: code, language: 'html' } }));
    setSelectedFile('screenshot-clone.html');
    panelActions.setPanel('showScreenshotAnalyzer', false);
  }, [ssResult]);

  return {
    collabRoomId,
    setCollabRoomId,
    collabUsers,
    setCollabUsers,
    collabJoinInput,
    setCollabJoinInput,
    collabMode,
    setCollabMode,
    feedbackRating,
    setFeedbackRating,
    feedbackComment,
    setFeedbackComment,
    feedbackSubmitted,
    setFeedbackSubmitted,
    feedbackHistory,
    setFeedbackHistory,
    dbActiveConnection,
    setDbActiveConnection,
    dbSqlInput,
    setDbSqlInput,
    dbQueryResult,
    setDbQueryResult,
    dbQueryRunning,
    setDbQueryRunning,
    dbSchema,
    setDbSchema,
    dbSchemaLoading,
    setDbSchemaLoading,
    dbQueryHistory,
    setDbQueryHistory,
    dbSchemaTemplate,
    setDbSchemaTemplate,
    dbViewMode,
    setDbViewMode,
    collabChatMessages,
    setCollabChatMessages,
    collabChatInput,
    setCollabChatInput,
    backendPreset,
    setBackendPreset,
    backendEntityName,
    setBackendEntityName,
    backendGeneratedFiles,
    setBackendGeneratedFiles,
    onboardingStep,
    setOnboardingStep,
    vbCanvas,
    setVbCanvas,
    vbDragging,
    setVbDragging,
    vbSelectedIdx,
    setVbSelectedIdx,
    vbPropertyTab,
    setVbPropertyTab,
    animKeyframes,
    setAnimKeyframes,
    animSelected,
    setAnimSelected,
    animPreviewPlaying,
    setAnimPreviewPlaying,
    dsTab,
    setDsTab,
    dsColors,
    setDsColors,
    dsFontPrimary,
    setDsFontPrimary,
    dsFontSecondary,
    setDsFontSecondary,
    dsTypeScale,
    setDsTypeScale,
    apiMethod,
    setApiMethod,
    apiUrl,
    setApiUrl,
    apiHeaders,
    setApiHeaders,
    apiBody,
    setApiBody,
    apiResponse,
    setApiResponse,
    apiLoading,
    setApiLoading,
    apiHistory,
    setApiHistory,
    apiTab,
    setApiTab,
    gitBranches,
    setGitBranches,
    gitBranchCommits,
    setGitBranchCommits,
    gitNewBranch,
    setGitNewBranch,
    gitCommitMsg,
    setGitCommitMsg,
    gitTab,
    setGitTab,
    gitStash,
    setGitStash,
    ssImage,
    setSsImage,
    ssAnalyzing,
    setSsAnalyzing,
    ssResult,
    setSsResult,
    ssDragOver,
    setSsDragOver,
    figmaUrl,
    setFigmaUrl,
    figmaToken,
    setFigmaToken,
    figmaLoading,
    setFigmaLoading,
    figmaData,
    setFigmaData,
    figmaFrames,
    setFigmaFrames,
    gitPRs,
    setGitPRs,
    gitPRTitle,
    setGitPRTitle,
    gitPRHead,
    setGitPRHead,
    gitPRBase,
    setGitPRBase,
    gitRemoteCommits,
    setGitRemoteCommits,
    gitRemoteLoading,
    setGitRemoteLoading,
    gitSelectedRepo,
    setGitSelectedRepo,
    gitRepos,
    setGitRepos,
    gitRemoteBranches,
    setGitRemoteBranches,
    connectCollabSSE,
    startCollabRoom,
    joinCollabRoom,
    leaveCollabRoom,
    connectDatabase,
    runDatabaseQuery,
    runSchemaTemplate,
    initCollabEngine,
    sendCollabChat,
    generateBackend,
    submitFeedback,
    finishOnboarding,
    vbAddComponent,
    vbRemoveComponent,
    vbMoveComponent,
    vbGenerateCode,
    animAddNew,
    animUpdateFrame,
    animAddFrame,
    animDeleteAnim,
    animGenerateCSS,
    animCopyCSS,
    animInjectToProject,
    dsGenerateCSS,
    dsGenerateTokensJSON,
    dsAddColor,
    apiSendRequest,
    apiAddHeader,
    apiRemoveHeader,
    gitCreateBranch,
    gitSwitchBranch,
    gitDeleteBranch,
    gitCommit,
    gitStashSave,
    gitStashPop,
    figmaImport,
    figmaListFrames,
    figmaGenCode,
    gitFetchRepos,
    gitFetchBranches,
    gitFetchCommits,
    gitCreatePR,
    gitFetchPRs,
    gitMergePR,
    gitMergeBranch,
    ssHandleDrop,
    ssHandlePaste,
    ssAnalyze,
    ssApplyCode,
    onboardingSteps,
    gitCurrentBranch,
    collabUserId,
    collabUserName,
    collabColorRef,
    collabChannelRef,
    collabSSERef,
    dbEngineRef,
    collabEngineRef,
    backendGeneratorRef,
    collabColors,
    dsSpacing,
    dsBorderRadius,
    dsShadows,
  };
}
