import { useCallback, useEffect } from 'react';
import type { Message } from '@/lib/types';
import type { ConversationEntry, Bookmark } from '@/hooks/useEditorState';
import type { VirtualFS } from '@/lib/types';

// Tiny IndexedDB helpers (inline to avoid extra imports)
const DB_NAME = 'aurion_db';
const STORE = 'kv';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbGet<T>(key: string): Promise<T | undefined> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }));
}
function idbSet(key: string, val: unknown): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

interface UseConversationsDeps {
  messages: Message[];
  activeConversationId: string;
  conversations: ConversationEntry[];
  bookmarks: Bookmark[];
  setConversations: React.Dispatch<React.SetStateAction<ConversationEntry[]>>;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string>>;
  setBookmarks: React.Dispatch<React.SetStateAction<Bookmark[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  panelActions: { setPanel: (key: string, value: boolean) => void };
  clearChat: () => void;
  selectedFile: string;
  projectFiles: VirtualFS;
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
}

export function useConversations(deps: UseConversationsDeps) {
  const {
    messages, activeConversationId, conversations, bookmarks,
    setConversations, setActiveConversationId, setBookmarks, setMessages,
    panelActions, clearChat, selectedFile, projectFiles, setProjectFiles,
  } = deps;

  // Load conversations from IndexedDB on mount
  useEffect(() => {
    idbGet<ConversationEntry[]>('aurion_conversations').then(saved => {
      if (saved && Array.isArray(saved)) setConversations(saved);
    }).catch(() => {});
  }, [setConversations]);

  const saveCurrentConversation = useCallback(() => {
    if (messages.length === 0) return;
    const title = messages[0]?.content?.slice(0, 60) || 'Untitled';
    setConversations(prev => {
      const existing = prev.findIndex(c => c.id === activeConversationId);
      const entry: ConversationEntry = { id: activeConversationId, title, messages: [...messages], timestamp: Date.now() };
      const updated = existing >= 0 ? prev.map(c => c.id === activeConversationId ? entry : c) : [entry, ...prev];
      idbSet('aurion_conversations', updated).catch(() => {});
      return updated;
    });
  }, [messages, activeConversationId, setConversations]);

  const loadConversation = useCallback((conv: ConversationEntry) => {
    saveCurrentConversation();
    setMessages(conv.messages);
    setActiveConversationId(conv.id);
    panelActions.setPanel('showConversationHistory', false);
  }, [saveCurrentConversation, setMessages, setActiveConversationId, panelActions]);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      idbSet('aurion_conversations', updated).catch(() => {});
      return updated;
    });
  }, [setConversations]);

  const newConversation = useCallback(() => {
    saveCurrentConversation();
    const newId = 'conv_' + Date.now().toString(36);
    setActiveConversationId(newId);
    clearChat();
  }, [saveCurrentConversation, setActiveConversationId, clearChat]);

  // Auto-save conversation periodically
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => saveCurrentConversation(), 5000);
      return () => clearTimeout(timer);
    }
  }, [messages, saveCurrentConversation]);

  // Load bookmarks from IndexedDB on mount
  useEffect(() => {
    idbGet<Bookmark[]>('aurion_bookmarks').then(saved => {
      if (saved && Array.isArray(saved)) setBookmarks(saved);
    }).catch(() => {});
  }, [setBookmarks]);

  const addBookmark = useCallback((label: string, code: string) => {
    const bm: Bookmark = { id: 'bm_' + Date.now().toString(36), label, code, language: projectFiles[selectedFile]?.language || 'html', file: selectedFile, timestamp: Date.now() };
    setBookmarks(prev => {
      const updated = [bm, ...prev].slice(0, 50);
      idbSet('aurion_bookmarks', updated).catch(() => {});
      return updated;
    });
  }, [selectedFile, projectFiles, setBookmarks]);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const updated = prev.filter(b => b.id !== id);
      idbSet('aurion_bookmarks', updated).catch(() => {});
      return updated;
    });
  }, [setBookmarks]);

  const insertBookmark = useCallback((code: string) => {
    if (!selectedFile || !projectFiles[selectedFile]) return;
    setProjectFiles(prev => ({
      ...prev,
      [selectedFile]: { ...prev[selectedFile], content: prev[selectedFile].content + '\n' + code },
    }));
    panelActions.setPanel('showBookmarks', false);
  }, [selectedFile, projectFiles, setProjectFiles, panelActions]);

  return {
    saveCurrentConversation, loadConversation, deleteConversation, newConversation,
    addBookmark, deleteBookmark, insertBookmark,
  };
}
