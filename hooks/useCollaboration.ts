/* ════════════════════════════════════════════
   Collaboration Hook — Real-time with Supabase
   ════════════════════════════════════════════ */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { CollaborationCursor, VirtualFS } from '@/lib/types';

const CURSOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
];

interface CollabPresence {
  userId: string;
  userName: string;
  color: string;
  cursor?: { line: number; column: number; file?: string } | null;
  lastSeen: number;
}

export function useCollaboration(projectId: string | null, userId?: string, userName?: string) {
  const [peers, setPeers] = useState<CollaborationCursor[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    supabaseRef.current = createClient(url, key);
  }, []);

  // Join collaboration room
  const join = useCallback(async () => {
    if (!projectId || !userId || !supabaseRef.current) return;

    const color = CURSOR_COLORS[Math.abs(hashCode(userId)) % CURSOR_COLORS.length];

    const channel = supabaseRef.current.channel(`project:${projectId}`, {
      config: { presence: { key: userId } },
    });

    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<CollabPresence>();
        const cursors: CollaborationCursor[] = [];
        for (const [, presences] of Object.entries(state)) {
          for (const p of presences) {
            if (p.userId !== userId && p.cursor) {
              cursors.push({
                userId: p.userId,
                userName: p.userName,
                color: p.color,
                position: p.cursor,
                file: p.cursor.file,
              });
            }
          }
        }
        setPeers(cursors);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        for (const p of newPresences) {
          console.log(`${(p as unknown as CollabPresence).userName} joined`);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        for (const p of leftPresences) {
          console.log(`${(p as unknown as CollabPresence).userName} left`);
        }
      })
      // Listen for file changes from other users
      .on('broadcast', { event: 'file-change' }, ({ payload }) => {
        if (payload.userId !== userId) {
          onRemoteFileChange?.(payload.path, payload.content);
        }
      });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId,
          userName: userName || 'Anonymous',
          color,
          cursor: null,
          lastSeen: Date.now(),
        } satisfies CollabPresence);
        setIsConnected(true);
      }
    });

    channelRef.current = channel;
  }, [projectId, userId, userName]);

  // Update cursor position
  const updateCursor = useCallback((line: number, column: number, file?: string) => {
    const channel = channelRef.current;
    if (!channel || !userId) return;

    channel.track({
      userId,
      userName: userName || 'Anonymous',
      color: CURSOR_COLORS[Math.abs(hashCode(userId)) % CURSOR_COLORS.length],
      cursor: { line, column, file },
      lastSeen: Date.now(),
    } satisfies CollabPresence);
  }, [userId, userName]);

  // Broadcast file change to peers
  const broadcastFileChange = useCallback((path: string, content: string) => {
    const channel = channelRef.current;
    if (!channel || !userId) return;

    channel.send({
      type: 'broadcast',
      event: 'file-change',
      payload: { userId, path, content },
    });
  }, [userId]);

  // Leave room
  const leave = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setIsConnected(false);
    setPeers([]);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => { leave(); };
  }, [leave]);

  // Callback for remote file changes (set by consumer)
  let onRemoteFileChange: ((path: string, content: string) => void) | undefined;

  return {
    peers,
    isConnected,
    join,
    leave,
    updateCursor,
    broadcastFileChange,
    setOnRemoteFileChange: (fn: (path: string, content: string) => void) => {
      onRemoteFileChange = fn;
    },
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
