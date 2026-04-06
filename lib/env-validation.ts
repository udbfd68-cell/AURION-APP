/**
 * Environment Variable Validation — Zod schema for all env vars
 * Validates at build time and provides typed access
 */
import { z } from 'zod';

const envSchema = z.object({
  // ── Ollama Cloud ──
  OLLAMA_API_KEY: z.string().optional(),

  // ── Clerk Authentication ──
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),

  // ── Stripe Billing ──
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PRO_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_BIZ_PRICE_ID: z.string().optional(),

  // ── Supabase ──
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // ── Firecrawl ──
  FIRECRAWL_API_KEY: z.string().optional(),

  // ── Vercel ──
  VERCEL_DEPLOY_TOKEN: z.string().optional(),

  // ── Google AI ──
  GOOGLE_AI_STUDIO_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // ── Direct API keys (optional) ──
  ANTHROPIC_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // ── Integrations ──
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  NEON_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_API_KEY: z.string().optional(),
  CONTENTFUL_SPACE_ID: z.string().optional(),
  CONTENTFUL_ACCESS_TOKEN: z.string().optional(),
  SANITY_PROJECT_ID: z.string().optional(),
  SANITY_DATASET: z.string().default('production'),
  SANITY_TOKEN: z.string().optional(),
  KLAVIYO_API_KEY: z.string().optional(),
  LEMON_SQUEEZY_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),
  DEEPAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/** Get validated environment variables */
export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    // Don't throw — allow graceful degradation
    _env = envSchema.parse({});
    return _env;
  }

  _env = result.data;
  return _env;
}
