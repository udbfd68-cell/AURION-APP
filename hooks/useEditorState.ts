'use client';

import { useCallback, useRef, useState } from 'react';
import type { Message } from '@/lib/types';

export type ConversationEntry = { id: string; title: string; messages: Message[]; timestamp: number };
export type Bookmark = { id: string; label: string; code: string; language: string; file: string; timestamp: number };

export function useEditorState() {
  // Find & Replace
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [findRegex, setFindRegex] = useState(false);
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Editor settings
  const [editorTheme, setEditorTheme] = useState<string>('vs-dark');
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [wordWrapEnabled, setWordWrapEnabled] = useState(true);

  // Quick File Creator
  const [newFileName, setNewFileName] = useState('');
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // AI Explain
  const [isExplaining, setIsExplaining] = useState(false);

  // Conversation History
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv_default');

  // Code Snippet Bookmarks
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Split view
  const [splitFile, setSplitFile] = useState<string | null>(null);

  // Goto Line
  const [gotoLineValue, setGotoLineValue] = useState('');
  const gotoLineRef = useRef<HTMLInputElement>(null);

  // Explorer context menu
  const [explorerContextMenu, setExplorerContextMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Tab context menu
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; file: string } | null>(null);

  // Image preview hover
  const [hoveredImage, setHoveredImage] = useState<{ path: string; x: number; y: number } | null>(null);

  // Modified file tracking
  const [savedFileContents, setSavedFileContents] = useState<Record<string, string>>({});

  // Color picker
  const [pickedColor, setPickedColor] = useState('#3b82f6');

  // Cursor position tracking
  const [cursorPosition, setCursorPosition] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  // SEO Meta Editor
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoOgImage, setSeoOgImage] = useState('');

  // A11y
  const [a11yIssues, setA11yIssues] = useState<{ type: 'error' | 'warning' | 'info'; message: string; element: string }[]>([]);

  return {
    findQuery, setFindQuery, replaceQuery, setReplaceQuery,
    findRegex, setFindRegex, findCaseSensitive, setFindCaseSensitive, findInputRef,
    editorTheme, setEditorTheme, minimapEnabled, setMinimapEnabled,
    wordWrapEnabled, setWordWrapEnabled,
    newFileName, setNewFileName, newFileInputRef,
    isExplaining, setIsExplaining,
    conversations, setConversations, activeConversationId, setActiveConversationId,
    bookmarks, setBookmarks,
    splitFile, setSplitFile,
    gotoLineValue, setGotoLineValue, gotoLineRef,
    explorerContextMenu, setExplorerContextMenu,
    renameTarget, setRenameTarget, renameValue, setRenameValue, renameInputRef,
    tabContextMenu, setTabContextMenu,
    hoveredImage, setHoveredImage,
    savedFileContents, setSavedFileContents,
    pickedColor, setPickedColor,
    cursorPosition, setCursorPosition,
    seoTitle, setSeoTitle, seoDescription, setSeoDescription, seoOgImage, setSeoOgImage,
    a11yIssues, setA11yIssues,
  };
}
