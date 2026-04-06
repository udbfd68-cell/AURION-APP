/* ════════════════════════════════════════════
   Real-Time Collaboration Engine — Aurion App Builder
   CRDT-based collaboration with Yjs + WebRTC/BroadcastChannel
   ════════════════════════════════════════════ */

// ── Types ──

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
  activeFile?: string;
  connected: boolean;
  lastSeen: number;
}

export interface CursorPosition {
  file: string;
  line: number;
  column: number;
}

export interface SelectionRange {
  file: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface CollabMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'code-change' | 'file-create' | 'file-delete';
}

export interface CollabRoom {
  id: string;
  hostId: string;
  created: number;
  users: Map<string, CollabUser>;
  chatMessages: CollabMessage[];
}

export type CollabEvent =
  | { type: 'user-joined'; user: CollabUser }
  | { type: 'user-left'; userId: string }
  | { type: 'cursor-move'; userId: string; cursor: CursorPosition }
  | { type: 'selection-change'; userId: string; selection: SelectionRange | null }
  | { type: 'file-change'; userId: string; file: string; content: string }
  | { type: 'file-create'; userId: string; file: string; content: string; language: string }
  | { type: 'file-delete'; userId: string; file: string }
  | { type: 'chat-message'; message: CollabMessage }
  | { type: 'sync-request'; fromUser: string }
  | { type: 'sync-response'; files: Record<string, { content: string; language: string }>; fromUser: string };

// ── CRDT Document for Conflict-Free Editing ──

export class CRDTDocument {
  private content: string[] = [];
  private clock: number = 0;
  private siteId: string;
  private operations: Array<{ type: 'insert' | 'delete'; pos: number; char?: string; clock: number; siteId: string }> = [];

  constructor(siteId: string, initialContent: string = '') {
    this.siteId = siteId;
    this.content = initialContent.split('');
  }

  insert(pos: number, char: string): { type: 'insert'; pos: number; char: string; clock: number; siteId: string } {
    this.clock++;
    const op = { type: 'insert' as const, pos, char, clock: this.clock, siteId: this.siteId };
    this.content.splice(pos, 0, char);
    this.operations.push(op);
    return op;
  }

  delete(pos: number): { type: 'delete'; pos: number; clock: number; siteId: string } | null {
    if (pos < 0 || pos >= this.content.length) return null;
    this.clock++;
    const op = { type: 'delete' as const, pos, clock: this.clock, siteId: this.siteId };
    this.content.splice(pos, 1);
    this.operations.push(op);
    return op;
  }

  applyRemoteInsert(op: { pos: number; char: string; clock: number; siteId: string }): void {
    if (op.siteId === this.siteId) return; // Skip own operations
    this.content.splice(op.pos, 0, op.char!);
    this.clock = Math.max(this.clock, op.clock);
  }

  applyRemoteDelete(op: { pos: number; clock: number; siteId: string }): void {
    if (op.siteId === this.siteId) return;
    if (op.pos >= 0 && op.pos < this.content.length) {
      this.content.splice(op.pos, 1);
    }
    this.clock = Math.max(this.clock, op.clock);
  }

  getText(): string {
    return this.content.join('');
  }

  setText(text: string): void {
    this.content = text.split('');
  }

  getLength(): number {
    return this.content.length;
  }
}

// ── Collaboration Engine ──

export type CollabEventHandler = (event: CollabEvent) => void;

export class CollaborationEngine {
  private roomId: string | null = null;
  private userId: string;
  private userName: string;
  private userColor: string;
  private users: Map<string, CollabUser> = new Map();
  private documents: Map<string, CRDTDocument> = new Map();
  private chatMessages: CollabMessage[] = [];
  private handlers: Set<CollabEventHandler> = new Set();
  private channel: BroadcastChannel | null = null;
  private sseConnection: EventSource | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private mode: 'local' | 'remote' = 'local';

  constructor(userId: string, userName: string, userColor: string) {
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor;
  }

  // ── Event System ──

  on(handler: CollabEventHandler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  private emit(event: CollabEvent): void {
    for (const handler of this.handlers) handler(event);
  }

  // ── Room Management ──

  async createRoom(): Promise<string> {
    const roomId = this.generateRoomId();
    this.roomId = roomId;

    // Try remote (API-based) first for cross-device support
    try {
      const res = await fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          roomId,
          userId: this.userId,
          userName: this.userName,
          userColor: this.userColor,
        }),
      });
      if (res.ok) {
        this.mode = 'remote';
        this.setupSSE(roomId);
        this.startHeartbeat(roomId);
        this.addSelf();
        return roomId;
      }
    } catch { /* Fall through to local */ }

    // Fallback: BroadcastChannel (same-origin tabs)
    this.mode = 'local';
    this.setupBroadcastChannel(roomId);
    this.addSelf();
    return roomId;
  }

  async joinRoom(roomId: string): Promise<boolean> {
    this.roomId = roomId;

    // Try remote join
    try {
      const res = await fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomId,
          userId: this.userId,
          userName: this.userName,
          userColor: this.userColor,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        this.mode = 'remote';
        this.setupSSE(roomId);
        this.startHeartbeat(roomId);
        this.addSelf();
        // Load existing users
        if (data.users) {
          for (const u of data.users) {
            if (u.id !== this.userId) {
              const user: CollabUser = { id: u.id, name: u.name, color: u.color, connected: true, lastSeen: Date.now() };
              this.users.set(u.id, user);
              this.emit({ type: 'user-joined', user });
            }
          }
        }
        // Request full file sync from host
        this.broadcast({ type: 'sync-request', fromUser: this.userId });
        return true;
      }
    } catch { /* Fall through */ }

    // Fallback: BroadcastChannel
    this.mode = 'local';
    this.setupBroadcastChannel(roomId);
    this.addSelf();
    this.broadcast({ type: 'sync-request', fromUser: this.userId });
    return true;
  }

  leaveRoom(): void {
    if (!this.roomId) return;

    // Notify others
    this.broadcast({ type: 'user-left', userId: this.userId });

    // Cleanup
    if (this.channel) { this.channel.close(); this.channel = null; }
    if (this.sseConnection) { this.sseConnection.close(); this.sseConnection = null; }
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }

    this.roomId = null;
    this.users.clear();
    this.documents.clear();
    this.chatMessages = [];
  }

  // ── Document Operations ──

  getOrCreateDocument(file: string, initialContent: string = ''): CRDTDocument {
    let doc = this.documents.get(file);
    if (!doc) {
      doc = new CRDTDocument(this.userId, initialContent);
      this.documents.set(file, doc);
    }
    return doc;
  }

  updateFile(file: string, content: string): void {
    const doc = this.getOrCreateDocument(file, content);
    doc.setText(content);
    this.broadcast({ type: 'file-change', userId: this.userId, file, content });
  }

  createFile(file: string, content: string, language: string): void {
    this.getOrCreateDocument(file, content);
    this.broadcast({ type: 'file-create', userId: this.userId, file, content, language });
    this.addSystemMessage(`${this.userName} created ${file}`);
  }

  deleteFile(file: string): void {
    this.documents.delete(file);
    this.broadcast({ type: 'file-delete', userId: this.userId, file });
    this.addSystemMessage(`${this.userName} deleted ${file}`);
  }

  // ── Cursor & Selection ──

  moveCursor(cursor: CursorPosition): void {
    const self = this.users.get(this.userId);
    if (self) self.cursor = cursor;
    this.broadcast({ type: 'cursor-move', userId: this.userId, cursor });
  }

  setSelection(selection: SelectionRange | null): void {
    this.broadcast({ type: 'selection-change', userId: this.userId, selection });
  }

  // ── Chat ──

  sendMessage(content: string): void {
    const message: CollabMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: this.userId,
      userName: this.userName,
      userColor: this.userColor,
      content,
      timestamp: Date.now(),
      type: 'message',
    };
    this.chatMessages.push(message);
    this.broadcast({ type: 'chat-message', message });
    this.emit({ type: 'chat-message', message });
  }

  private addSystemMessage(content: string): void {
    const message: CollabMessage = {
      id: `sys_${Date.now()}`,
      userId: 'system',
      userName: 'System',
      userColor: '#6b7280',
      content,
      timestamp: Date.now(),
      type: 'system',
    };
    this.chatMessages.push(message);
    this.emit({ type: 'chat-message', message });
  }

  getMessages(): CollabMessage[] {
    return [...this.chatMessages];
  }

  // ── State Getters ──

  getUsers(): CollabUser[] {
    return Array.from(this.users.values());
  }

  getMode(): 'local' | 'remote' {
    return this.mode;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  isConnected(): boolean {
    return this.roomId !== null;
  }

  getSelf(): CollabUser | undefined {
    return this.users.get(this.userId);
  }

  // ── Private Helpers ──

  private addSelf(): void {
    const self: CollabUser = {
      id: this.userId,
      name: this.userName,
      color: this.userColor,
      connected: true,
      lastSeen: Date.now(),
    };
    this.users.set(this.userId, self);
    this.emit({ type: 'user-joined', user: self });
  }

  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }

  private broadcast(event: CollabEvent): void {
    if (this.mode === 'local' && this.channel) {
      this.channel.postMessage(event);
    } else if (this.mode === 'remote' && this.roomId) {
      // Send via API for remote distribution
      fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          roomId: this.roomId,
          userId: this.userId,
          event,
        }),
      }).catch(() => { /* Best effort */ });
    }
  }

  private handleRemoteEvent(event: CollabEvent): void {
    switch (event.type) {
      case 'user-joined':
        if (event.user.id !== this.userId) {
          this.users.set(event.user.id, event.user);
          this.addSystemMessage(`${event.user.name} joined`);
          this.emit(event);
        }
        break;

      case 'user-left':
        if (event.userId !== this.userId) {
          const user = this.users.get(event.userId);
          if (user) this.addSystemMessage(`${user.name} left`);
          this.users.delete(event.userId);
          this.emit(event);
        }
        break;

      case 'cursor-move':
        if (event.userId !== this.userId) {
          const user = this.users.get(event.userId);
          if (user) user.cursor = event.cursor;
          this.emit(event);
        }
        break;

      case 'selection-change':
        this.emit(event);
        break;

      case 'file-change':
        if (event.userId !== this.userId) {
          const doc = this.getOrCreateDocument(event.file, event.content);
          doc.setText(event.content);
          this.emit(event);
        }
        break;

      case 'file-create':
        if (event.userId !== this.userId) {
          this.getOrCreateDocument(event.file, event.content);
          this.emit(event);
        }
        break;

      case 'file-delete':
        if (event.userId !== this.userId) {
          this.documents.delete(event.file);
          this.emit(event);
        }
        break;

      case 'chat-message':
        if (event.message.userId !== this.userId) {
          this.chatMessages.push(event.message);
          this.emit(event);
        }
        break;

      case 'sync-request':
        // Someone wants all files — if we're the host, send them
        if (event.fromUser !== this.userId) {
          const files: Record<string, { content: string; language: string }> = {};
          for (const [path, doc] of this.documents) {
            files[path] = { content: doc.getText(), language: 'plaintext' };
          }
          this.broadcast({ type: 'sync-response', files, fromUser: this.userId });
        }
        break;

      case 'sync-response':
        if (event.fromUser !== this.userId) {
          for (const [path, file] of Object.entries(event.files)) {
            this.getOrCreateDocument(path, file.content);
          }
          this.emit(event);
        }
        break;
    }
  }

  private setupBroadcastChannel(roomId: string): void {
    this.channel = new BroadcastChannel(`aurion-collab-${roomId}`);
    this.channel.onmessage = (e) => {
      this.handleRemoteEvent(e.data as CollabEvent);
    };
  }

  private setupSSE(roomId: string): void {
    if (this.sseConnection) this.sseConnection.close();
    const es = new EventSource(`/api/collab?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(this.userId)}`);
    this.sseConnection = es;

    es.addEventListener('users', (e) => {
      try {
        const users = JSON.parse(e.data);
        for (const u of users) {
          if (u.id !== this.userId && !this.users.has(u.id)) {
            const user: CollabUser = { id: u.id, name: u.name, color: u.color, connected: true, lastSeen: Date.now() };
            this.users.set(u.id, user);
            this.emit({ type: 'user-joined', user });
          }
        }
      } catch { /* parse error */ }
    });

    es.addEventListener('event', (e) => {
      try {
        const event = JSON.parse(e.data) as CollabEvent;
        this.handleRemoteEvent(event);
      } catch { /* parse error */ }
    });

    es.addEventListener('file-ops', (e) => {
      try {
        const ops = JSON.parse(e.data);
        for (const op of ops) {
          this.handleRemoteEvent({
            type: 'file-change',
            userId: op.userId || 'remote',
            file: op.path,
            content: op.content,
          });
        }
      } catch { /* parse error */ }
    });
  }

  private startHeartbeat(roomId: string): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      fetch('/api/collab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat', roomId, userId: this.userId }),
      }).catch(() => { /* network error */ });

      // Clean stale users locally
      const now = Date.now();
      for (const [id, user] of this.users) {
        if (id !== this.userId && now - user.lastSeen > 30000) {
          user.connected = false;
        }
      }
    }, 10000);
  }
}

// ── Collaboration Color Palette ──

export const COLLAB_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#e11d48',
  '#a855f7', '#84cc16', '#0ea5e9', '#d946ef', '#22c55e',
];

export function getRandomCollabColor(): string {
  return COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];
}

export function getRandomUserName(): string {
  const adjectives = ['Swift', 'Bright', 'Cosmic', 'Neon', 'Pixel', 'Cyber', 'Lunar', 'Solar', 'Nova', 'Quantum'];
  const nouns = ['Fox', 'Wave', 'Star', 'Bolt', 'Sage', 'Reef', 'Peak', 'Zen', 'Arc', 'Flux'];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
}
