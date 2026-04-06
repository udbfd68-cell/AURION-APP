/* ════════════════════════════════════════════
   Backend Generator — Aurion App Builder
   Generates complete backend: API routes, auth, middleware,
   database schemas, server code, tRPC, WebSocket handlers
   ════════════════════════════════════════════ */

// ── Types ──

export interface BackendProject {
  framework: 'nextjs' | 'express' | 'fastify' | 'hono';
  database: 'supabase' | 'neon' | 'planetscale' | 'prisma' | 'drizzle' | 'none';
  auth: 'clerk' | 'nextauth' | 'supabase-auth' | 'custom-jwt' | 'none';
  features: BackendFeature[];
  orm: 'prisma' | 'drizzle' | 'raw-sql' | 'none';
  realtime: 'websocket' | 'sse' | 'pusher' | 'none';
  payment: 'stripe' | 'lemonsqueezy' | 'none';
  email: 'resend' | 'sendgrid' | 'nodemailer' | 'none';
  storage: 'supabase-storage' | 's3' | 'cloudflare-r2' | 'none';
}

export type BackendFeature =
  | 'crud-api'
  | 'auth-flow'
  | 'file-upload'
  | 'webhook-handler'
  | 'cron-jobs'
  | 'rate-limiting'
  | 'api-versioning'
  | 'search'
  | 'notifications'
  | 'analytics'
  | 'admin-dashboard'
  | 'multi-tenancy'
  | 'audit-logs'
  | 'realtime-events'
  | 'payment-integration'
  | 'email-templates';

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  description: string;
}

// ── Code Templates ──

const TEMPLATES = {
  // ─── Next.js API Route Templates ───
  nextjsApiRoute: (name: string, method: string, body: string) => `import { NextRequest, NextResponse } from 'next/server';

export async function ${method}(req: NextRequest) {
${body}
}
`,

  // ─── Express Route Template ───
  expressRoute: (name: string, body: string) => `import { Router } from 'express';
import { z } from 'zod';

const router = Router();

${body}

export default router;
`,

  // ─── Prisma Schema Template ───
  prismaModel: (name: string, fields: string) => `model ${name} {
${fields}
}
`,

  // ─── Drizzle Schema Template ───
  drizzleTable: (name: string, fields: string) => `import { pgTable, uuid, text, timestamp, boolean, integer, numeric, jsonb } from 'drizzle-orm/pg-core';

export const ${name} = pgTable('${name}', {
${fields}
});
`,

  // ─── Middleware Template ───
  middleware: (name: string, body: string) => `import { NextRequest, NextResponse } from 'next/server';

export function ${name}(req: NextRequest) {
${body}
}
`,
};

// ── Backend Generator Engine ──

export class BackendGenerator {

  // ── Generate Complete Backend ──

  generate(config: BackendProject, entityName: string = 'items'): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Database schema
    if (config.database !== 'none') {
      files.push(...this.generateDatabaseSchema(config, entityName));
    }

    // Auth system
    if (config.auth !== 'none') {
      files.push(...this.generateAuthSystem(config));
    }

    // CRUD API routes
    if (config.features.includes('crud-api')) {
      files.push(...this.generateCrudApi(config, entityName));
    }

    // Middleware
    files.push(...this.generateMiddleware(config));

    // Webhook handler
    if (config.features.includes('webhook-handler')) {
      files.push(...this.generateWebhookHandler(config));
    }

    // Payment integration
    if (config.payment !== 'none' || config.features.includes('payment-integration')) {
      files.push(...this.generatePaymentIntegration(config));
    }

    // File upload
    if (config.features.includes('file-upload')) {
      files.push(...this.generateFileUpload(config));
    }

    // Real-time
    if (config.realtime !== 'none' || config.features.includes('realtime-events')) {
      files.push(...this.generateRealtime(config));
    }

    // Email templates
    if (config.email !== 'none' || config.features.includes('email-templates')) {
      files.push(...this.generateEmailSystem(config));
    }

    // Rate limiting
    if (config.features.includes('rate-limiting')) {
      files.push(this.generateRateLimiter(config));
    }

    // Env template
    files.push(this.generateEnvTemplate(config));

    return files;
  }

  // ── Database Schema Generation ──

  private generateDatabaseSchema(config: BackendProject, entity: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (config.orm === 'prisma') {
      const schema = `// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${config.database === 'planetscale' ? 'mysql' : 'postgresql'}"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  avatar        String?
  role          Role      @default(USER)
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  ${entity}s       ${capitalize(entity)}[]
  sessions      Session[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@map("sessions")
}

model ${capitalize(entity)} {
  id          String   @id @default(cuid())
  title       String
  description String?
  content     String?  @db.Text
  status      Status   @default(DRAFT)
  metadata    Json?
  authorId    String
  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([authorId])
  @@index([status])
  @@map("${entity}s")
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

enum Status {
  DRAFT
  PUBLISHED
  ARCHIVED
}`;
      files.push({ path: 'prisma/schema.prisma', content: schema, language: 'prisma', description: 'Prisma database schema' });

    } else if (config.orm === 'drizzle') {
      const schema = `import { pgTable, text, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const roleEnum = pgEnum('role', ['user', 'admin', 'moderator']);
export const statusEnum = pgEnum('status', ['draft', 'published', 'archived']);

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').unique().notNull(),
  name: text('name'),
  avatar: text('avatar'),
  role: roleEnum('role').default('user').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  token: text('token').unique().notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ${entity}s = pgTable('${entity}s', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description'),
  content: text('content'),
  status: statusEnum('status').default('draft').notNull(),
  metadata: jsonb('metadata'),
  authorId: text('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ${capitalize(entity)} = typeof ${entity}s.$inferSelect;
export type New${capitalize(entity)} = typeof ${entity}s.$inferInsert;
`;
      files.push({ path: 'lib/db/schema.ts', content: schema, language: 'typescript', description: 'Drizzle database schema' });

      // DB connection
      const dbSetup = `import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
`;
      files.push({ path: 'lib/db/index.ts', content: dbSetup, language: 'typescript', description: 'Database connection setup' });

    } else {
      // Raw SQL migrations
      const migration = `-- Migration: Create ${entity}s table
-- Generated by Aurion Backend Generator

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ${entity}s (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  metadata JSONB DEFAULT '{}',
  author_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_${entity}s_author ON ${entity}s(author_id);
CREATE INDEX IF NOT EXISTS idx_${entity}s_status ON ${entity}s(status);
`;
      files.push({ path: `migrations/001_create_${entity}s.sql`, content: migration, language: 'sql', description: `SQL migration for ${entity}s` });
    }

    return files;
  }

  // ── Auth System Generation ──

  private generateAuthSystem(config: BackendProject): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (config.auth === 'custom-jwt') {
      // JWT auth utilities
      const authLib = `import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'change-me-in-production');
const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<TokenPayload> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function requireAdmin(): Promise<TokenPayload> {
  const session = await requireAuth();
  if (session.role !== 'admin') throw new Error('Forbidden');
  return session;
}
`;
      files.push({ path: 'lib/auth.ts', content: authLib, language: 'typescript', description: 'JWT authentication utilities' });

      // Auth API routes
      const loginRoute = TEMPLATES.nextjsApiRoute('login', 'POST', `  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // TODO: Replace with your database lookup
    // const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    // const valid = await bcrypt.compare(password, user.passwordHash);

    // For now, create token directly (wire to your DB)
    const token = await createToken({ userId: 'user_1', email, role: 'user' });

    const response = NextResponse.json({ success: true, user: { email } });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }`);
      files.push({ path: 'app/api/auth/login/route.ts', content: `import { NextRequest, NextResponse } from 'next/server';\nimport { createToken } from '@/lib/auth';\n\n${loginRoute}`, language: 'typescript', description: 'Login API endpoint' });

      const signupRoute = TEMPLATES.nextjsApiRoute('signup', 'POST', `  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // TODO: Hash password and save to database
    // const hashedPassword = await bcrypt.hash(password, 12);
    // const user = await db.insert(users).values({ email, passwordHash: hashedPassword, name }).returning();

    const token = await createToken({ userId: 'new_user', email, role: 'user' });

    const response = NextResponse.json({ success: true, user: { email, name } });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }`);
      files.push({ path: 'app/api/auth/signup/route.ts', content: `import { NextRequest, NextResponse } from 'next/server';\nimport { createToken } from '@/lib/auth';\n\n${signupRoute}`, language: 'typescript', description: 'Signup API endpoint' });

      const logoutRoute = `import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth-token');
  return response;
}
`;
      files.push({ path: 'app/api/auth/logout/route.ts', content: logoutRoute, language: 'typescript', description: 'Logout API endpoint' });

      const meRoute = `import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ user: session });
}
`;
      files.push({ path: 'app/api/auth/me/route.ts', content: meRoute, language: 'typescript', description: 'Current user API endpoint' });

    } else if (config.auth === 'nextauth') {
      const nextAuthConfig = `import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TODO: Verify credentials against your database
        if (!credentials?.email || !credentials?.password) return null;
        return { id: '1', email: credentials.email as string, name: 'User' };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },
});
`;
      files.push({ path: 'lib/auth.ts', content: nextAuthConfig, language: 'typescript', description: 'NextAuth.js configuration' });

      const authRoute = `import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
`;
      files.push({ path: 'app/api/auth/[...nextauth]/route.ts', content: authRoute, language: 'typescript', description: 'NextAuth API route handler' });
    }

    // Auth middleware for protected routes
    if (config.auth !== 'clerk') { // Clerk has its own middleware
      const authMiddleware = `import { NextRequest, NextResponse } from 'next/server';
${config.auth === 'custom-jwt' ? "import { verifyToken } from '@/lib/auth';" : ''}

const PROTECTED_PATHS = ['/api/protected', '/dashboard', '/settings'];
const AUTH_PATHS = ['/login', '/signup', '/forgot-password'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some(p => path.startsWith(p));
  const isAuthPage = AUTH_PATHS.some(p => path.startsWith(p));

  ${config.auth === 'custom-jwt' ? `const token = req.cookies.get('auth-token')?.value;
  const session = token ? await verifyToken(token) : null;` : `const token = req.cookies.get('next-auth.session-token')?.value || req.cookies.get('__Secure-next-auth.session-token')?.value;
  const session = !!token;`}

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/api/protected/:path*', '/login', '/signup'],
};
`;
      files.push({ path: 'middleware.ts', content: authMiddleware, language: 'typescript', description: 'Auth middleware for protected routes' });
    }

    return files;
  }

  // ── CRUD API Generation ──

  private generateCrudApi(config: BackendProject, entity: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const cap = capitalize(entity);

    const validationSchema = `import { z } from 'zod';

export const create${cap}Schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  metadata: z.record(z.unknown()).optional(),
});

export const update${cap}Schema = create${cap}Schema.partial();

export const list${cap}Schema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type Create${cap} = z.infer<typeof create${cap}Schema>;
export type Update${cap} = z.infer<typeof update${cap}Schema>;
export type List${cap}Params = z.infer<typeof list${cap}Schema>;
`;
    files.push({ path: `lib/validations/${entity}.ts`, content: validationSchema, language: 'typescript', description: `${cap} validation schemas` });

    // List + Create route
    const listCreateRoute = `import { NextRequest, NextResponse } from 'next/server';
import { create${cap}Schema, list${cap}Schema } from '@/lib/validations/${entity}';
${config.auth !== 'none' ? `import { ${config.auth === 'custom-jwt' ? 'requireAuth' : 'auth'} } from '@/lib/auth';` : ''}

// GET /api/${entity}s — List with pagination, filtering, sorting
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, limit, status, search, sortBy, sortOrder } = list${cap}Schema.parse(params);
    const offset = (page - 1) * limit;

    // TODO: Replace with your database query
    // const items = await db.query.${entity}s.findMany({
    //   where: and(
    //     status ? eq(${entity}s.status, status) : undefined,
    //     search ? ilike(${entity}s.title, \`%\${search}%\`) : undefined,
    //   ),
    //   orderBy: sortOrder === 'desc' ? desc(${entity}s[sortBy]) : asc(${entity}s[sortBy]),
    //   limit,
    //   offset,
    // });

    const items: unknown[] = []; // Replace with DB query
    const total = 0; // Replace with count query

    return NextResponse.json({
      data: items,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid parameters', details: err }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/${entity}s — Create new
export async function POST(req: NextRequest) {
  try {
    ${config.auth !== 'none' ? `const session = await ${config.auth === 'custom-jwt' ? 'requireAuth()' : 'auth()'};
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });` : ''}

    const body = await req.json();
    const data = create${cap}Schema.parse(body);

    // TODO: Insert into database
    // const [item] = await db.insert(${entity}s).values({
    //   ...data,
    //   authorId: session.userId,
    // }).returning();

    const item = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() };

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: err }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
`;
    files.push({ path: `app/api/${entity}s/route.ts`, content: listCreateRoute, language: 'typescript', description: `${cap}s list + create API` });

    // Read + Update + Delete route
    const crudRoute = `import { NextRequest, NextResponse } from 'next/server';
import { update${cap}Schema } from '@/lib/validations/${entity}';
${config.auth !== 'none' ? `import { ${config.auth === 'custom-jwt' ? 'requireAuth' : 'auth'} } from '@/lib/auth';` : ''}

type Params = { params: Promise<{ id: string }> };

// GET /api/${entity}s/:id — Read one
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // TODO: Replace with database query
    // const item = await db.query.${entity}s.findFirst({ where: eq(${entity}s.id, id) });
    // if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: { id } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/${entity}s/:id — Update
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    ${config.auth !== 'none' ? `const session = await ${config.auth === 'custom-jwt' ? 'requireAuth()' : 'auth()'};
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });` : ''}

    const { id } = await params;
    const body = await req.json();
    const data = update${cap}Schema.parse(body);

    // TODO: Update in database
    // const [item] = await db.update(${entity}s)
    //   .set({ ...data, updatedAt: new Date() })
    //   .where(eq(${entity}s.id, id))
    //   .returning();

    return NextResponse.json({ data: { id, ...data } });
  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: err }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/${entity}s/:id — Delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    ${config.auth !== 'none' ? `const session = await ${config.auth === 'custom-jwt' ? 'requireAuth()' : 'auth()'};
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });` : ''}

    const { id } = await params;

    // TODO: Delete from database
    // await db.delete(${entity}s).where(eq(${entity}s.id, id));

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
`;
    files.push({ path: `app/api/${entity}s/[id]/route.ts`, content: crudRoute, language: 'typescript', description: `${cap} CRUD by ID` });

    return files;
  }

  // ── Middleware Generation ──

  private generateMiddleware(config: BackendProject): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // CORS middleware (for Express/Fastify)
    if (config.framework !== 'nextjs') {
      const cors = `export function corsMiddleware(allowedOrigins: string[] = ['*']) {
  return (req: any, res: any, next: any) => {
    const origin = req.headers.origin || '';
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}
`;
      files.push({ path: 'lib/middleware/cors.ts', content: cors, language: 'typescript', description: 'CORS middleware' });
    }

    // Error handler
    const errorHandler = `import { NextRequest, NextResponse } from 'next/server';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(\`\${resource} not found\`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  console.error('Unhandled error:', error);
  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

/** Wrap an API handler with error handling */
export function withErrorHandler(
  handler: (req: NextRequest, ctx?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx?: unknown) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return handleApiError(err);
    }
  };
}
`;
    files.push({ path: 'lib/errors.ts', content: errorHandler, language: 'typescript', description: 'Error handling utilities' });

    return files;
  }

  // ── Webhook Handler Generation ──

  private generateWebhookHandler(config: BackendProject): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (config.payment === 'stripe') {
      const stripeWebhook = `import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    // Verify webhook signature
    const stripe = (await import('stripe')).default;
    const client = new stripe(process.env.STRIPE_SECRET_KEY!);
    const event = client.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // TODO: Fulfill the order
        console.log('Payment successful:', session.id);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        // TODO: Update user subscription status
        console.log('Subscription updated:', subscription.id);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        // TODO: Handle cancellation
        console.log('Subscription cancelled:', subscription.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        // TODO: Notify user of failed payment
        console.log('Payment failed:', invoice.id);
        break;
      }
      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }
}
`;
      files.push({ path: 'app/api/webhooks/stripe/route.ts', content: stripeWebhook, language: 'typescript', description: 'Stripe webhook handler' });
    }

    return files;
  }

  // ── Payment Integration ──

  private generatePaymentIntegration(config: BackendProject): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (config.payment === 'stripe') {
      const stripeLib = `import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function createCheckoutSession(params: {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: params.priceId, quantity: 1 }],
    customer: params.customerId,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  });
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId);
}
`;
      files.push({ path: 'lib/stripe.ts', content: stripeLib, language: 'typescript', description: 'Stripe payment utilities' });

      const checkoutRoute = `import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { priceId } = await req.json();
    if (!priceId) return NextResponse.json({ error: 'Price ID required' }, { status: 400 });

    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const session = await createCheckoutSession({
      priceId,
      successUrl: \`\${origin}/success?session_id={CHECKOUT_SESSION_ID}\`,
      cancelUrl: \`\${origin}/pricing\`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
`;
      files.push({ path: 'app/api/checkout/route.ts', content: checkoutRoute, language: 'typescript', description: 'Stripe checkout API' });
    }

    return files;
  }

  // ── File Upload Generation ──

  private generateFileUpload(config: BackendProject): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    const uploadRoute = `import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    ${config.storage === 'supabase-storage' ? `// Upload to Supabase Storage
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const fileName = \`\${Date.now()}-\${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}\`;
    const { data, error } = await supabase.storage.from('uploads').upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(data.path);
    return NextResponse.json({ url: urlData.publicUrl, path: data.path, size: file.size });` : `// Save to local filesystem or cloud storage
    const fileName = \`\${Date.now()}-\${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}\`;
    // TODO: Upload to your storage provider (S3, R2, etc.)
    return NextResponse.json({ url: \`/uploads/\${fileName}\`, size: file.size });`}
  } catch (err) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
`;
    files.push({ path: 'app/api/upload/route.ts', content: uploadRoute, language: 'typescript', description: 'File upload API endpoint' });

    return files;
  }

  // ── Real-time Generation ──

  private generateRealtime(config: BackendProject): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (config.realtime === 'websocket' || config.realtime === 'sse') {
      const sseRoute = `import { NextRequest } from 'next/server';

// Server-Sent Events endpoint for real-time updates
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const channel = req.nextUrl.searchParams.get('channel') || 'default';

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(\`event: connected\\ndata: \${JSON.stringify({ channel, timestamp: Date.now() })}\\n\\n\`));

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(\`: heartbeat\\n\\n\`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // TODO: Subscribe to your event system (Redis pub/sub, database changes, etc.)
      // Example: subscribe to a channel and push events to the client
      // const unsubscribe = eventBus.on(channel, (data) => {
      //   controller.enqueue(encoder.encode(\`event: message\\ndata: \${JSON.stringify(data)}\\n\\n\`));
      // });

      // Cleanup on disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        // unsubscribe();
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
`;
      files.push({ path: 'app/api/events/route.ts', content: sseRoute, language: 'typescript', description: 'Real-time SSE endpoint' });

      // Client-side event hook
      const eventHook = `'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type EventHandler = (data: unknown) => void;

export function useRealtimeEvents(channel: string = 'default') {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<unknown>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const esRef = useRef<EventSource | null>(null);

  const on = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(handler);
    return () => { handlersRef.current.get(event)?.delete(handler); };
  }, []);

  useEffect(() => {
    const es = new EventSource(\`/api/events?channel=\${encodeURIComponent(channel)}\`);
    esRef.current = es;

    es.addEventListener('connected', () => setConnected(true));

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastEvent(data);
        const handlers = handlersRef.current.get('message');
        if (handlers) handlers.forEach(h => h(data));
      } catch { /* parse error */ }
    });

    es.onerror = () => setConnected(false);

    return () => { es.close(); esRef.current = null; };
  }, [channel]);

  const emit = useCallback(async (event: string, data: unknown) => {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, event, data }),
    });
  }, [channel]);

  return { connected, lastEvent, on, emit };
}
`;
      files.push({ path: 'hooks/useRealtimeEvents.ts', content: eventHook, language: 'typescript', description: 'Real-time events React hook' });
    }

    return files;
  }

  // ── Email System Generation ──

  private generateEmailSystem(config: BackendProject): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    const emailLib = `${config.email === 'resend' ? `import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);` : config.email === 'sendgrid' ? `import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);` : ''}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const from = options.from || process.env.EMAIL_FROM || 'noreply@yourdomain.com';

  try {
    ${config.email === 'resend' ? `await resend.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
    });` : config.email === 'sendgrid' ? `await sgMail.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || '',
    });` : `// TODO: Configure your email provider
    console.log('Email sent:', { from, to: options.to, subject: options.subject });`}
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

// ── Email Templates ──

export function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: 'Welcome! 🎉',
    html: \`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Welcome, \${name}!</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Thanks for signing up. We're excited to have you on board.</p>
        <a href="\${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">Get Started →</a>
      </div>\`,
  };
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: 'Reset Your Password',
    html: \`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Password Reset</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.6;">Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="\${resetUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">Reset Password →</a>
        <p style="color: #999; font-size: 14px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
      </div>\`,
  };
}

export function invoiceEmail(invoiceId: string, amount: string, date: string): { subject: string; html: string } {
  return {
    subject: \`Invoice #\${invoiceId}\`,
    html: \`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Invoice #\${invoiceId}</h1>
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p style="color: #666; margin: 0;">Amount: <strong style="color: #1a1a1a;">\${amount}</strong></p>
          <p style="color: #666; margin: 8px 0 0;">Date: \${date}</p>
        </div>
        <a href="\${process.env.NEXT_PUBLIC_APP_URL}/billing" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px;">View Invoice →</a>
      </div>\`,
  };
}
`;
    files.push({ path: 'lib/email.ts', content: emailLib, language: 'typescript', description: 'Email utilities and templates' });

    return files;
  }

  // ── Rate Limiter ──

  private generateRateLimiter(_config: BackendProject): GeneratedFile {
    const rateLimiter = `const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,  // 1 minute
  maxRequests: 60,    // 60 requests per minute
};

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // Cleanup stale entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  return {
    allowed: entry.count <= config.maxRequests,
    remaining,
    resetAt: entry.resetAt,
  };
}

/** Helper to extract client IP from request */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Rate limit middleware for Next.js routes */
export function withRateLimit(config?: RateLimitConfig) {
  return (handler: (req: Request) => Promise<Response>) => {
    return async (req: Request): Promise<Response> => {
      const ip = getClientIp(req);
      const { allowed, remaining, resetAt } = rateLimit(ip, config);

      if (!allowed) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        });
      }

      const response = await handler(req);
      // Clone and add headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('X-RateLimit-Remaining', String(remaining));
      newResponse.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
      return newResponse;
    };
  };
}
`;
    return { path: 'lib/rate-limit.ts', content: rateLimiter, language: 'typescript', description: 'Rate limiting middleware' };
  }

  // ── Env Template ──

  private generateEnvTemplate(config: BackendProject): GeneratedFile {
    const lines: string[] = [
      '# Generated by Aurion Backend Generator',
      '# Copy this to .env.local and fill in your values',
      '',
      '# App',
      'NEXT_PUBLIC_APP_URL=http://localhost:3000',
      '',
    ];

    if (config.database !== 'none') {
      lines.push('# Database');
      if (config.database === 'supabase') {
        lines.push('NEXT_PUBLIC_SUPABASE_URL=');
        lines.push('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
        lines.push('SUPABASE_SERVICE_KEY=');
      } else if (config.database === 'neon') {
        lines.push('DATABASE_URL=postgresql://...');
      } else {
        lines.push('DATABASE_URL=');
      }
      lines.push('');
    }

    if (config.auth === 'custom-jwt') {
      lines.push('# Auth (JWT)');
      lines.push('JWT_SECRET=change-me-to-a-random-64-char-string');
      lines.push('');
    } else if (config.auth === 'nextauth') {
      lines.push('# NextAuth');
      lines.push('NEXTAUTH_URL=http://localhost:3000');
      lines.push('NEXTAUTH_SECRET=');
      lines.push('GOOGLE_CLIENT_ID=');
      lines.push('GOOGLE_CLIENT_SECRET=');
      lines.push('GITHUB_ID=');
      lines.push('GITHUB_SECRET=');
      lines.push('');
    } else if (config.auth === 'clerk') {
      lines.push('# Clerk');
      lines.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=');
      lines.push('CLERK_SECRET_KEY=');
      lines.push('');
    }

    if (config.payment === 'stripe') {
      lines.push('# Stripe');
      lines.push('STRIPE_SECRET_KEY=');
      lines.push('STRIPE_WEBHOOK_SECRET=');
      lines.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=');
      lines.push('');
    }

    if (config.email === 'resend') {
      lines.push('# Email (Resend)');
      lines.push('RESEND_API_KEY=');
      lines.push('EMAIL_FROM=noreply@yourdomain.com');
      lines.push('');
    } else if (config.email === 'sendgrid') {
      lines.push('# Email (SendGrid)');
      lines.push('SENDGRID_API_KEY=');
      lines.push('EMAIL_FROM=noreply@yourdomain.com');
      lines.push('');
    }

    if (config.storage === 'supabase-storage') {
      lines.push('# Storage');
      lines.push('# Uses Supabase Storage (same keys as database)');
      lines.push('');
    } else if (config.storage === 's3') {
      lines.push('# AWS S3');
      lines.push('AWS_ACCESS_KEY_ID=');
      lines.push('AWS_SECRET_ACCESS_KEY=');
      lines.push('AWS_REGION=us-east-1');
      lines.push('AWS_S3_BUCKET=');
      lines.push('');
    }

    return {
      path: '.env.example',
      content: lines.join('\n'),
      language: 'plaintext',
      description: 'Environment variables template',
    };
  }

  // ── Quick Presets ──

  static presets: Record<string, BackendProject> = {
    'saas-starter': {
      framework: 'nextjs',
      database: 'supabase',
      auth: 'custom-jwt',
      orm: 'drizzle',
      features: ['crud-api', 'auth-flow', 'payment-integration', 'webhook-handler', 'rate-limiting', 'email-templates', 'file-upload'],
      realtime: 'sse',
      payment: 'stripe',
      email: 'resend',
      storage: 'supabase-storage',
    },
    'blog-platform': {
      framework: 'nextjs',
      database: 'neon',
      auth: 'nextauth',
      orm: 'prisma',
      features: ['crud-api', 'auth-flow', 'search', 'file-upload', 'email-templates'],
      realtime: 'none',
      payment: 'none',
      email: 'resend',
      storage: 'supabase-storage',
    },
    'ecommerce': {
      framework: 'nextjs',
      database: 'supabase',
      auth: 'custom-jwt',
      orm: 'drizzle',
      features: ['crud-api', 'auth-flow', 'payment-integration', 'webhook-handler', 'file-upload', 'search', 'email-templates', 'notifications'],
      realtime: 'sse',
      payment: 'stripe',
      email: 'resend',
      storage: 'supabase-storage',
    },
    'api-only': {
      framework: 'nextjs',
      database: 'neon',
      auth: 'custom-jwt',
      orm: 'raw-sql',
      features: ['crud-api', 'auth-flow', 'rate-limiting', 'webhook-handler'],
      realtime: 'none',
      payment: 'none',
      email: 'none',
      storage: 'none',
    },
    'realtime-app': {
      framework: 'nextjs',
      database: 'supabase',
      auth: 'clerk',
      orm: 'drizzle',
      features: ['crud-api', 'realtime-events', 'file-upload', 'notifications'],
      realtime: 'sse',
      payment: 'none',
      email: 'none',
      storage: 'supabase-storage',
    },
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
