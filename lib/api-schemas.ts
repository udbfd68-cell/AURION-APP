/**
 * API Route Schemas — Zod validation for all API endpoints
 * Centralized to ensure consistency and reusability
 */
import { z } from 'zod';

// ─── Shared Schemas ────────────────────────────────
const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([z.string(), z.array(z.any())]),
});

const imageSchema = z.object({
  data: z.string().max(10_000_000), // ~10MB base64 limit
  type: z.string().max(50),
});

// ─── AI/LLM Routes ────────────────────────────────
export const anthropicSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  model: z.string().max(100).optional(),
  images: z.array(imageSchema).max(10).optional(),
});

export const geminiSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  model: z.string().max(100).optional(),
});

export const groqSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  model: z.string().max(100).optional(),
});

export const openaiSchema = z.object({
  apiKey: z.string().min(1).max(200),
  messages: z.array(messageSchema).min(1).max(200),
  model: z.string().max(100).optional(),
  stream: z.boolean().optional(),
});

export const xaiSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  model: z.string().max(100).optional(),
});

export const mistralSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  model: z.string().max(100).optional(),
});

export const claudeCodeSchema = z.object({
  action: z.string().max(100),
  prompt: z.string().max(100_000).optional(),
  model: z.string().max(100).optional(),
  code: z.string().max(500_000).optional(),
  researchContext: z.string().max(100_000).optional(),
  messages: z.array(messageSchema).max(200).optional(),
  images: z.array(imageSchema).max(10).optional(),
});

// ─── Clone/Scrape Routes ────────────────────────────
export const cloneSchema = z.object({
  prompt: z.string().min(1).max(500_000),
  model: z.string().max(100).optional(),
  images: z.array(imageSchema).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const scrapeSchema = z.object({
  url: z.string().url().max(2000),
  advanced: z.boolean().optional(),
});

// ─── Deploy ────────────────────────────────
export const deploySchema = z.object({
  html: z.string().max(5_000_000).optional(),
  files: z.record(z.string(), z.string().max(5_000_000)).optional(),
  projectName: z.string().max(100).optional(),
});

// ─── Exec ────────────────────────────────
export const execSchema = z.object({
  code: z.string().min(1).max(100_000),
  timeout: z.number().int().min(100).max(30_000).optional(),
});

// ─── Database ────────────────────────────────
export const databaseSchema = z.object({
  provider: z.enum(['supabase', 'neon']),
  url: z.string().url().max(500),
  apiKey: z.string().min(1).max(500),
  sql: z.string().min(1).max(50_000),
});

export const neonSchema = z.object({
  connectionString: z.string().min(1).max(500),
  sql: z.string().min(1).max(50_000),
  params: z.array(z.unknown()).max(100).optional(),
});

export const supabaseSchema = z.object({
  supabaseUrl: z.string().url().max(500),
  supabaseKey: z.string().min(1).max(500),
  query: z.string().max(50_000).optional(),
  table: z.string().max(200).optional(),
  method: z.string().max(50).optional(),
  body: z.record(z.string(), z.unknown()).optional(),
  select: z.string().max(1000).optional(),
});

// ─── Integrations ────────────────────────────────
export const stripeSchema = z.object({
  stripeKey: z.string().min(1).max(200),
  endpoint: z.string().max(200),
  method: z.string().max(10).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const stripeCheckoutSchema = z.object({
  priceId: z.string().min(1).max(200),
  userId: z.string().min(1).max(200),
  email: z.string().email().optional(),
});

export const githubSchema = z.object({
  token: z.string().min(1).max(200),
  repoName: z.string().min(1).max(200),
  files: z.record(z.string(), z.string().max(5_000_000)),
  isPrivate: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export const discordSchema = z.object({
  token: z.string().max(200).optional(),
  webhookUrl: z.string().url().max(500).optional(),
  content: z.string().max(4000).optional(),
  username: z.string().max(100).optional(),
  embeds: z.array(z.record(z.string(), z.unknown())).max(10).optional(),
  action: z.string().max(50).optional(),
  channelId: z.string().max(100).optional(),
});

export const slackSchema = z.object({
  token: z.string().max(200).optional(),
  webhookUrl: z.string().url().max(500).optional(),
  text: z.string().max(4000).optional(),
  channel: z.string().max(100).optional(),
  action: z.string().max(50).optional(),
});

export const resendSchema = z.object({
  apiKey: z.string().min(1).max(200),
  from: z.string().min(1).max(200),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(500),
  html: z.string().max(100_000).optional(),
  text: z.string().max(100_000).optional(),
  replyTo: z.string().email().optional(),
});

export const sendgridSchema = z.object({
  apiKey: z.string().min(1).max(200),
  from: z.union([z.string(), z.object({ email: z.string().email(), name: z.string().optional() })]),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(500),
  html: z.string().max(100_000).optional(),
  text: z.string().max(100_000).optional(),
});

export const twilioSchema = z.object({
  accountSid: z.string().min(1).max(100),
  authToken: z.string().min(1).max(200),
  from: z.string().min(1).max(50),
  to: z.string().min(1).max(50),
  body: z.string().min(1).max(1600),
  action: z.string().max(50).optional(),
});

export const algoliaSchema = z.object({
  appId: z.string().min(1).max(100),
  apiKey: z.string().min(1).max(200),
  indexName: z.string().max(200).optional(),
  query: z.string().max(1000).optional(),
  filters: z.string().max(1000).optional(),
  hitsPerPage: z.number().int().min(1).max(1000).optional(),
  page: z.number().int().min(0).optional(),
  action: z.string().max(50).optional(),
});

export const contentfulSchema = z.object({
  accessToken: z.string().min(1).max(200),
  spaceId: z.string().min(1).max(100),
  environmentId: z.string().max(100).optional(),
  contentType: z.string().max(200).optional(),
  entryId: z.string().max(200).optional(),
  query: z.string().max(2000).optional(),
});

export const sanitySchema = z.object({
  projectId: z.string().min(1).max(100),
  dataset: z.string().max(100).optional(),
  token: z.string().max(200).optional(),
  query: z.string().max(10_000).optional(),
  mutations: z.record(z.string(), z.unknown()).optional(),
  action: z.string().max(50).optional(),
});

export const klaviyoSchema = z.object({
  apiKey: z.string().min(1).max(200),
  endpoint: z.string().min(1).max(200),
  method: z.string().max(10).optional(),
  body: z.record(z.string(), z.unknown()).optional(),
});

export const lemonSqueezySchema = z.object({
  apiKey: z.string().min(1).max(200),
  endpoint: z.string().min(1).max(200),
  method: z.string().max(10).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const upstashSchema = z.object({
  url: z.string().url().max(500),
  token: z.string().min(1).max(200),
  command: z.string().min(1).max(50),
  args: z.array(z.unknown()).max(100).optional(),
});

export const figmaSchema = z.object({
  figmaToken: z.string().min(1).max(200),
  fileKey: z.string().min(1).max(100),
  nodeIds: z.array(z.string().max(100)).max(50).optional(),
});

// ─── Generation Routes ────────────────────────────
export const huggingfaceSchema = z.object({
  prompt: z.string().min(1).max(10_000),
});

export const deepaiSchema = z.object({
  prompt: z.string().min(1).max(10_000),
});

export const testGenSchema = z.object({
  code: z.string().min(1).max(500_000),
  fileName: z.string().max(200).optional(),
  framework: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
});

export const ltxSchema = z.object({
  prompt: z.string().min(1).max(10_000),
  mode: z.enum(['text-to-video', 'image-to-video']).optional(),
  image_uri: z.string().url().max(2000).optional(),
  model: z.string().max(100).optional(),
  duration: z.number().min(1).max(60).optional(),
  resolution: z.string().max(20).optional(),
  fps: z.number().int().min(1).max(60).optional(),
  camera_motion: z.string().max(50).optional(),
  generate_audio: z.boolean().optional(),
});

// ─── Cinematic Routes ────────────────────────────
export const cinematicVideoSchema = z.object({
  prompt: z.string().min(1).max(10_000),
  imageUrl: z.string().url().max(2000).optional(),
});

export const cinematicImageSchema = z.object({
  prompt: z.string().min(1).max(10_000),
  width: z.number().int().min(64).max(4096).optional(),
  height: z.number().int().min(64).max(4096).optional(),
});

export const cinematicEnrichSchema = z.object({
  prompt: z.string().min(1).max(10_000),
  template: z.string().max(100).optional(),
});

export const cinematicSiteSchema = z.object({
  enrichedPrompt: z.string().max(50_000).optional(),
  template: z.string().max(100).optional(),
  frameCount: z.number().int().min(1).max(100).optional(),
  fps: z.number().int().min(1).max(60).optional(),
  siteDescription: z.string().max(10_000).optional(),
});

// ─── Misc Routes ────────────────────────────
export const collabSchema = z.object({
  action: z.string().min(1).max(50),
  roomId: z.string().max(200).optional(),
  userId: z.string().max(200).optional(),
  userName: z.string().max(200).optional(),
});

export const context7Schema = z.object({
  action: z.string().min(1).max(50),
  libraryName: z.string().max(200).optional(),
  libraryId: z.string().max(200).optional(),
  topic: z.string().max(500).optional(),
  tokens: z.number().int().max(100_000).optional(),
});

export const magic21stSchema = z.object({
  query: z.string().max(500).optional(),
  action: z.string().max(50).optional(),
  slug: z.string().max(200).optional(),
  username: z.string().max(200).optional(),
});

export const reactbitsSchema = z.object({
  action: z.enum(['search', 'get', 'category', 'catalog']),
  query: z.string().max(500).optional(),
  name: z.string().max(200).optional(),
  category: z.string().max(200).optional(),
});

export const renderSchema = z.object({
  action: z.string().min(1).max(50),
  name: z.string().max(200).optional(),
});

export const stitchSchema = z.object({
  action: z.string().min(1).max(50),
  projectId: z.string().max(200).optional(),
  title: z.string().max(200).optional(),
  prompt: z.string().max(50_000).optional(),
  screenId: z.string().max(200).optional(),
  deviceType: z.string().max(50).optional(),
  variantCount: z.number().int().min(1).max(20).optional(),
});

export const notebooklmSchema = z.object({
  action: z.string().min(1).max(50),
  url: z.string().url().max(2000).optional(),
  query: z.string().max(10_000).optional(),
  sources: z.array(z.string().max(2000)).max(20).optional(),
  topic: z.string().max(500).optional(),
  depth: z.string().max(50).optional(),
});
