/**
 * Collaboration Signaling Route — Persistent via Upstash Redis
 *
 * Uses Upstash Redis REST API for persistent room storage.
 * Falls back to in-memory if UPSTASH env vars not set.
 * Rooms survive Vercel cold starts when Redis is configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { collabSchema } from '@/lib/api-schemas';
import { applyRateLimit, validateOrigin, parseBody, errors } from '@/lib/api-utils';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'edge';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const USE_REDIS = !!(UPSTASH_URL && UPSTASH_TOKEN);

// ── Redis helpers ──
async function redisCmd(command: string[]): Promise<unknown> {
  const res = await fetch(`${UPSTASH_URL}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  return data.result;
}

// Room TTL: 2 hours
const ROOM_TTL = 7200;
const USER_STALE_MS = 15000;

// ── In-memory fallback ──
const memRooms = new Map<string, {
  created: number;
  users: Map<string, { name: string; color: string; cursor?: { file: string; line: number; col: number }; lastSeen: number }>;
  signals: Array<{ from: string; to: string; type: string; data: unknown; ts: number }>;
  fileOps: Array<{ userId: string; path: string; content: string; language: string; ts: number }>;
}>();

function memCleanup() {
  const now = Date.now();
  for (const [id, room] of memRooms) {
    if (now - room.created > ROOM_TTL * 1000) { memRooms.delete(id); continue; }
    for (const [uid, user] of room.users) {
      if (now - user.lastSeen > USER_STALE_MS) room.users.delete(uid);
    }
    if (room.signals.length > 50) room.signals.splice(0, room.signals.length - 50);
    if (room.fileOps.length > 20) room.fileOps.splice(0, room.fileOps.length - 20);
    if (room.users.size === 0 && now - room.created > 60000) memRooms.delete(id);
  }
}

// ── Redis-backed room operations ──
async function redisGetRoom(roomId: string) {
  const raw = await redisCmd(['GET', `room:${roomId}`]) as string | null;
  return raw ? JSON.parse(raw) : null;
}

async function redisSaveRoom(roomId: string, room: Record<string, unknown>) {
  await redisCmd(['SET', `room:${roomId}`, JSON.stringify(room), 'EX', String(ROOM_TTL)]);
}

export async function POST(req: NextRequest) {
  // ── Security: Origin validation + Rate limiting ──
  const originError = validateOrigin(req);
  if (originError) return originError;
  const rateLimitError = applyRateLimit(req, RATE_LIMITS.standard);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json();
    const { action, roomId, userId, userName, userColor } = body;

    // ── REDIS PATH ──
    if (USE_REDIS) {
      if (action === 'create') {
        const id = roomId || Math.random().toString(36).slice(2, 8).toUpperCase();
        let room = await redisGetRoom(id);
        if (!room) {
          room = { created: Date.now(), users: {}, signals: [], fileOps: [] };
        }
        room.users[userId] = { name: userName || 'Anonymous', color: userColor || '#6366f1', lastSeen: Date.now() };
        await redisSaveRoom(id, room);
        return NextResponse.json({ success: true, roomId: id, users: Object.entries(room.users).map(([id, u]: [string, unknown]) => ({ id, ...(u as Record<string, unknown>) })), persistent: true });
      }

      if (action === 'join') {
        const room = await redisGetRoom(roomId);
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        room.users[userId] = { name: userName || 'Anonymous', color: userColor || '#6366f1', lastSeen: Date.now() };
        await redisSaveRoom(roomId, room);
        return NextResponse.json({ success: true, roomId, users: Object.entries(room.users).map(([id, u]: [string, unknown]) => ({ id, ...(u as Record<string, unknown>) })), persistent: true });
      }

      if (action === 'signal') {
        const room = await redisGetRoom(roomId);
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        room.signals.push({ from: userId, to: body.to, type: body.signalType, data: body.signalData, ts: Date.now() });
        if (room.signals.length > 100) room.signals = room.signals.slice(-50);
        await redisSaveRoom(roomId, room);
        return NextResponse.json({ success: true });
      }

      if (action === 'heartbeat') {
        const room = await redisGetRoom(roomId);
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        if (room.users[userId]) {
          room.users[userId].lastSeen = Date.now();
          if (body.cursor) room.users[userId].cursor = body.cursor;
        }
        // Clean stale users
        const now = Date.now();
        for (const uid of Object.keys(room.users)) {
          if (now - room.users[uid].lastSeen > USER_STALE_MS) delete room.users[uid];
        }
        const since = body.since || 0;
        const signals = room.signals.filter((s: { to: string; ts: number }) => s.to === userId && s.ts > since);
        const fileOps = room.fileOps.filter((op: { userId: string; ts: number }) => op.userId !== userId && op.ts > since);
        await redisSaveRoom(roomId, room);
        return NextResponse.json({ users: Object.entries(room.users).map(([id, u]: [string, unknown]) => ({ id, ...(u as Record<string, unknown>) })), signals, fileOps, ts: Date.now(), persistent: true });
      }

      if (action === 'file-change') {
        const room = await redisGetRoom(roomId);
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        room.fileOps.push({ userId, path: body.path, content: body.content, language: body.language, ts: Date.now() });
        // Dedupe per file
        const seen = new Set<string>();
        room.fileOps.reverse();
        room.fileOps = room.fileOps.filter((op: { path: string }) => { if (seen.has(op.path)) return false; seen.add(op.path); return true; });
        room.fileOps.reverse();
        await redisSaveRoom(roomId, room);
        return NextResponse.json({ success: true });
      }

      if (action === 'leave') {
        const room = await redisGetRoom(roomId);
        if (room) { delete room.users[userId]; await redisSaveRoom(roomId, room); }
        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // ── IN-MEMORY FALLBACK ──
    memCleanup();

    if (action === 'create') {
      const id = roomId || Math.random().toString(36).slice(2, 8).toUpperCase();
      if (!memRooms.has(id)) {
        memRooms.set(id, { created: Date.now(), users: new Map(), signals: [], fileOps: [] });
      }
      const room = memRooms.get(id)!;
      room.users.set(userId, { name: userName || 'Anonymous', color: userColor || '#6366f1', lastSeen: Date.now() });
      return NextResponse.json({ success: true, roomId: id, users: Array.from(room.users.entries()).map(([id, u]) => ({ id, ...u })), persistent: false });
    }

    if (action === 'join') {
      if (!roomId || !memRooms.has(roomId)) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      const room = memRooms.get(roomId)!;
      room.users.set(userId, { name: userName || 'Anonymous', color: userColor || '#6366f1', lastSeen: Date.now() });
      return NextResponse.json({ success: true, roomId, users: Array.from(room.users.entries()).map(([id, u]) => ({ id, ...u })), persistent: false });
    }

    if (action === 'signal') {
      const room = memRooms.get(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      room.signals.push({ from: userId, to: body.to, type: body.signalType, data: body.signalData, ts: Date.now() });
      return NextResponse.json({ success: true });
    }

    if (action === 'heartbeat') {
      const room = memRooms.get(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      const user = room.users.get(userId);
      if (user) { user.lastSeen = Date.now(); if (body.cursor) user.cursor = body.cursor; }
      const since = body.since || 0;
      const signals = room.signals.filter(s => s.to === userId && s.ts > since);
      const fileOps = room.fileOps.filter(op => op.userId !== userId && op.ts > since);
      return NextResponse.json({ users: Array.from(room.users.entries()).map(([id, u]) => ({ id, ...u })), signals, fileOps, ts: Date.now(), persistent: false });
    }

    if (action === 'file-change') {
      const room = memRooms.get(roomId);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      room.fileOps.push({ userId, path: body.path, content: body.content, language: body.language, ts: Date.now() });
      const seen = new Set<string>();
      room.fileOps.reverse();
      const deduped = room.fileOps.filter(op => { if (seen.has(op.path)) return false; seen.add(op.path); return true; });
      deduped.reverse();
      room.fileOps.length = 0;
      room.fileOps.push(...deduped);
      return NextResponse.json({ success: true });
    }

    if (action === 'leave') {
      const room = memRooms.get(roomId);
      if (room) room.users.delete(userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET — Server-Sent Events stream for real-time collaboration
 * Client connects: GET /api/collab?roomId=XXX&userId=YYY
 * Receives: user joins/leaves, cursor updates, file changes — all in real-time
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  const userId = searchParams.get('userId');

  if (!roomId || !userId) {
    return NextResponse.json({ error: 'Missing roomId or userId' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      };

      // Send initial state
      send('connected', { roomId, userId, ts: Date.now() });

      let lastTs = Date.now();
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }

        try {
          if (USE_REDIS) {
            const room = await redisGetRoom(roomId);
            if (!room) { send('error', { message: 'Room expired' }); clearInterval(interval); return; }
            // Update user heartbeat
            if (room.users[userId]) room.users[userId].lastSeen = Date.now();
            // Clean stale users
            const now = Date.now();
            for (const uid of Object.keys(room.users)) {
              if (now - room.users[uid].lastSeen > USER_STALE_MS) {
                delete room.users[uid];
                send('user-left', { userId: uid });
              }
            }
            await redisSaveRoom(roomId, room);
            // Send updates
            const signals = (room.signals || []).filter((s: { to: string; ts: number }) => s.to === userId && s.ts > lastTs);
            const fileOps = (room.fileOps || []).filter((op: { userId: string; ts: number }) => op.userId !== userId && op.ts > lastTs);
            if (signals.length > 0) send('signals', signals);
            if (fileOps.length > 0) send('file-ops', fileOps);
            send('users', Object.entries(room.users).map(([id, u]: [string, unknown]) => ({ id, ...(u as Record<string, unknown>) })));
          } else {
            memCleanup();
            const room = memRooms.get(roomId);
            if (!room) { send('error', { message: 'Room expired' }); clearInterval(interval); return; }
            const user = room.users.get(userId);
            if (user) user.lastSeen = Date.now();
            const signals = room.signals.filter(s => s.to === userId && s.ts > lastTs);
            const fileOps = room.fileOps.filter(op => op.userId !== userId && op.ts > lastTs);
            if (signals.length > 0) send('signals', signals);
            if (fileOps.length > 0) send('file-ops', fileOps);
            send('users', Array.from(room.users.entries()).map(([id, u]) => ({ id, ...u })));
          }
          lastTs = Date.now();
        } catch {
          // SSE connection may be broken
        }
      }, 1000); // 1s interval — much faster than HTTP polling

      // Keep-alive: send heartbeat every 15s to prevent proxy/CDN timeout
      const keepAlive = setInterval(() => {
        if (closed) { clearInterval(keepAlive); return; }
        try { controller.enqueue(encoder.encode(': keepalive\n\n')); } catch { closed = true; }
      }, 15000);

      // Cleanup when client disconnects
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        clearInterval(keepAlive);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
