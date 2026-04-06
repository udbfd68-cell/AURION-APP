/* ════════════════════════════════════════════
   Shared Types — Aurion App Builder
   ════════════════════════════════════════════ */

export type ActiveTab = 'app' | 'code' | 'database' | 'payments' | 'ide';
export type DeviceMode = 'desktop' | 'tablet' | 'mobile';
export type PreviewDarkMode = 'dark' | 'auto' | 'light';
export type DbViewMode = 'templates' | 'query' | 'schema' | 'history';
export type OutputFramework = 'html' | 'react' | 'nextjs' | 'vue' | 'svelte' | 'angular' | 'python' | 'fullstack';
export type GitTab = 'commits' | 'branches' | 'remote' | 'stash';
export type ToastType = 'success' | 'error' | 'info';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp?: number;
}

export interface ProjectFile {
  content: string;
  language: string;
}

export type VirtualFS = Record<string, ProjectFile>;

export interface AIModel {
  id: string;
  name: string;
  provider: 'ollama';
  tags: string[];
}

export interface Integration {
  name: string;
  desc: string;
  cat: string;
  keyPlaceholder?: string;
  keyPrefix?: string;
  builtIn?: boolean;
}

export interface DeployResult {
  url: string;
  projectName: string;
  deploymentId: string;
  readyState: string;
}

export interface CloneResult {
  html: string;
  designTokens?: DesignTokens;
  screenshot?: string;
}

export interface DesignTokens {
  colors: { primary?: string; secondary?: string; background?: string; text?: string; accent?: string };
  fonts: string[];
  typography?: { headingFont?: string; bodyFont?: string; sizes?: Record<string, string> };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  files: VirtualFS;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  ownerId?: string;
  collaborators?: string[];
  isPublic?: boolean;
  deployedUrl?: string;
  template?: string;
  thumbnail?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'business' | 'enterprise';
  credits: number;
  creditsUsed: number;
  projects: string[];
  createdAt: number;
}

export interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'info';
  content: string;
  timestamp?: number;
}

export interface RuntimeError {
  message: string;
  source?: string;
  line?: number;
  column?: number;
  timestamp: number;
}

export interface WebContainerState {
  status: 'idle' | 'booting' | 'ready' | 'error';
  url?: string;
  error?: string;
}

export interface CollaborationCursor {
  userId: string;
  userName: string;
  color: string;
  position: { line: number; column: number };
  file?: string;
}

export interface GalleryProject {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  author: { name: string; avatar: string };
  likes: number;
  views: number;
  template?: string;
  tags: string[];
  deployedUrl?: string;
  createdAt: number;
}

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { file: string; line: number };
  lastSeen: number;
}

export interface FeedbackEntry {
  id: string;
  rating: number;
  comment: string;
  timestamp: number;
  context: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}
