/* ════════════════════════════════════════════
   Live Database Engine — Aurion App Builder
   Real SQL execution, schema introspection, migrations
   ════════════════════════════════════════════ */

// ── Types ──

export interface DBConnection {
  id: string;
  provider: 'supabase' | 'neon' | 'upstash' | 'planetscale' | 'local';
  name: string;
  url: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing?: number;
}

export interface DBTable {
  name: string;
  schema: string;
  columns: DBColumn[];
  rowCount?: number;
  indexes?: string[];
  foreignKeys?: DBForeignKey[];
}

export interface DBColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimary: boolean;
  isUnique: boolean;
  references?: { table: string; column: string };
}

export interface DBForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string;
  onUpdate: string;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  duration: number;
  error?: string;
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | 'UNKNOWN';
  affectedRows?: number;
}

export interface Migration {
  id: string;
  name: string;
  sql: string;
  status: 'pending' | 'applied' | 'failed';
  appliedAt?: number;
  error?: string;
}

export interface QueryHistoryEntry {
  id: string;
  sql: string;
  duration: number;
  timestamp: number;
  rowCount: number;
  error?: string;
  saved?: boolean;
  label?: string;
}

// ── SQL Parser Helpers ──

export function classifySQL(sql: string): QueryResult['type'] {
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) return 'SELECT';
  if (trimmed.startsWith('INSERT')) return 'INSERT';
  if (trimmed.startsWith('UPDATE')) return 'UPDATE';
  if (trimmed.startsWith('DELETE')) return 'DELETE';
  if (trimmed.startsWith('CREATE') || trimmed.startsWith('ALTER') || trimmed.startsWith('DROP') || trimmed.startsWith('TRUNCATE')) return 'DDL';
  return 'UNKNOWN';
}

/** Basic SQL syntax validation */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  const trimmed = sql.trim();
  if (!trimmed) return { valid: false, error: 'Empty query' };
  if (trimmed.length > 50000) return { valid: false, error: 'Query too long (max 50KB)' };

  // Check for balanced quotes
  const singleQuotes = (trimmed.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) return { valid: false, error: 'Unbalanced single quotes' };

  // Check for balanced parentheses
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) return { valid: false, error: 'Unbalanced parentheses' };
  }
  if (depth !== 0) return { valid: false, error: 'Unbalanced parentheses' };

  return { valid: true };
}

// ── Database Execution Engine ──

export class LiveDatabaseEngine {
  private connections: Map<string, DBConnection> = new Map();
  private queryHistory: QueryHistoryEntry[] = [];
  private schemaCache: Map<string, DBTable[]> = new Map();
  private schemaCacheTime: Map<string, number> = new Map();
  private readonly SCHEMA_CACHE_TTL = 60_000; // 1 minute

  // ── Connection Management ──

  addConnection(conn: DBConnection): void {
    this.connections.set(conn.id, { ...conn, status: 'disconnected' });
  }

  removeConnection(id: string): void {
    this.connections.delete(id);
    this.schemaCache.delete(id);
    this.schemaCacheTime.delete(id);
  }

  getConnection(id: string): DBConnection | undefined {
    return this.connections.get(id);
  }

  getAllConnections(): DBConnection[] {
    return Array.from(this.connections.values());
  }

  // ── Query Execution via API Routes ──

  async executeQuery(connectionId: string, sql: string): Promise<QueryResult> {
    const conn = this.connections.get(connectionId);
    if (!conn) return { rows: [], columns: [], rowCount: 0, duration: 0, error: 'Connection not found', type: 'UNKNOWN' };

    const validation = validateSQL(sql);
    if (!validation.valid) return { rows: [], columns: [], rowCount: 0, duration: 0, error: validation.error, type: 'UNKNOWN' };

    const type = classifySQL(sql);
    const start = performance.now();

    try {
      let result: QueryResult;

      switch (conn.provider) {
        case 'supabase':
          result = await this.executeSupabase(conn, sql, type);
          break;
        case 'neon':
          result = await this.executeNeon(conn, sql, type);
          break;
        case 'local':
          result = await this.executeLocal(sql, type);
          break;
        default:
          result = await this.executeGeneric(conn, sql, type);
      }

      const duration = Math.round(performance.now() - start);
      result.duration = duration;

      // Update connection status
      conn.status = 'connected';
      conn.lastPing = Date.now();

      // Add to history
      this.addToHistory(sql, duration, result.rowCount, result.error);

      // Invalidate schema cache on DDL
      if (type === 'DDL') {
        this.schemaCache.delete(connectionId);
        this.schemaCacheTime.delete(connectionId);
      }

      return result;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      const error = err instanceof Error ? err.message : 'Query failed';
      conn.status = 'error';
      this.addToHistory(sql, duration, 0, error);
      return { rows: [], columns: [], rowCount: 0, duration, error, type };
    }
  }

  private async executeSupabase(conn: DBConnection, sql: string, type: QueryResult['type']): Promise<QueryResult> {
    // Use Supabase's PostgREST RPC or direct SQL via pg_net
    const res = await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'supabase',
        url: conn.url,
        apiKey: conn.apiKey,
        sql,
      }),
    });

    const data = await res.json();
    if (data.error) return { rows: [], columns: [], rowCount: 0, duration: 0, error: data.error, type };

    const rows = data.rows || [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : data.columns || [];
    return { rows, columns, rowCount: rows.length, duration: 0, type, affectedRows: data.affectedRows };
  }

  private async executeNeon(conn: DBConnection, sql: string, type: QueryResult['type']): Promise<QueryResult> {
    const res = await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'neon',
        url: conn.url,
        apiKey: conn.apiKey,
        sql,
      }),
    });

    const data = await res.json();
    if (data.error) return { rows: [], columns: [], rowCount: 0, duration: 0, error: data.error, type };

    const rows = data.rows || [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : data.columns || [];
    return { rows, columns, rowCount: rows.length, duration: 0, type, affectedRows: data.affectedRows };
  }

  private async executeLocal(_sql: string, type: QueryResult['type']): Promise<QueryResult> {
    // Local sandbox — parse simple queries against in-memory data
    return { rows: [], columns: [], rowCount: 0, duration: 0, type, error: 'Local sandbox: use connected database for real queries' };
  }

  private async executeGeneric(conn: DBConnection, sql: string, type: QueryResult['type']): Promise<QueryResult> {
    const res = await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: conn.provider,
        url: conn.url,
        apiKey: conn.apiKey,
        sql,
      }),
    });

    const data = await res.json();
    if (data.error) return { rows: [], columns: [], rowCount: 0, duration: 0, error: data.error, type };

    const rows = data.rows || [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : data.columns || [];
    return { rows, columns, rowCount: rows.length, duration: 0, type, affectedRows: data.affectedRows };
  }

  // ── Schema Introspection ──

  async getSchema(connectionId: string): Promise<DBTable[]> {
    const cached = this.schemaCache.get(connectionId);
    const cacheTime = this.schemaCacheTime.get(connectionId) || 0;
    if (cached && Date.now() - cacheTime < this.SCHEMA_CACHE_TTL) return cached;

    const conn = this.connections.get(connectionId);
    if (!conn) return [];

    const introspectionSQL = `
      SELECT
        t.table_name,
        t.table_schema,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary,
        CASE WHEN un.column_name IS NOT NULL THEN true ELSE false END as is_unique
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      LEFT JOIN (
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name AND c.table_schema = pk.table_schema
      LEFT JOIN (
        SELECT ku.table_schema, ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'UNIQUE'
      ) un ON c.table_name = un.table_name AND c.column_name = un.column_name AND c.table_schema = un.table_schema
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `;

    const result = await this.executeQuery(connectionId, introspectionSQL);
    if (result.error) return [];

    // Group by table
    const tables = new Map<string, DBTable>();
    for (const row of result.rows) {
      const tableName = row.table_name as string;
      if (!tables.has(tableName)) {
        tables.set(tableName, {
          name: tableName,
          schema: row.table_schema as string,
          columns: [],
        });
      }
      tables.get(tableName)!.columns.push({
        name: row.column_name as string,
        type: row.data_type as string,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default as string | null,
        isPrimary: !!row.is_primary,
        isUnique: !!row.is_unique,
      });
    }

    const schema = Array.from(tables.values());
    this.schemaCache.set(connectionId, schema);
    this.schemaCacheTime.set(connectionId, Date.now());
    return schema;
  }

  // ── Migration System ──

  async runMigration(connectionId: string, migration: Migration): Promise<Migration> {
    const result = await this.executeQuery(connectionId, migration.sql);
    if (result.error) {
      return { ...migration, status: 'failed', error: result.error };
    }
    return { ...migration, status: 'applied', appliedAt: Date.now() };
  }

  async runMigrations(connectionId: string, migrations: Migration[]): Promise<Migration[]> {
    const results: Migration[] = [];
    for (const m of migrations) {
      if (m.status === 'applied') { results.push(m); continue; }
      const result = await this.runMigration(connectionId, m);
      results.push(result);
      if (result.status === 'failed') break; // Stop on first failure
    }
    return results;
  }

  // ── Query History ──

  private addToHistory(sql: string, duration: number, rowCount: number, error?: string): void {
    this.queryHistory.unshift({
      id: `qh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sql,
      duration,
      timestamp: Date.now(),
      rowCount,
      error,
    });
    // Keep last 100 entries
    if (this.queryHistory.length > 100) this.queryHistory = this.queryHistory.slice(0, 100);
  }

  getHistory(): QueryHistoryEntry[] {
    return [...this.queryHistory];
  }

  clearHistory(): void {
    this.queryHistory = [];
  }

  saveQuery(historyId: string, label: string): void {
    const entry = this.queryHistory.find(h => h.id === historyId);
    if (entry) {
      entry.saved = true;
      entry.label = label;
    }
  }

  getSavedQueries(): QueryHistoryEntry[] {
    return this.queryHistory.filter(h => h.saved);
  }

  // ── SQL Generation Helpers ──

  generateCreateTableSQL(table: DBTable): string {
    const cols = table.columns.map(c => {
      let def = `  "${c.name}" ${c.type}`;
      if (c.isPrimary) def += ' PRIMARY KEY';
      if (c.isUnique && !c.isPrimary) def += ' UNIQUE';
      if (!c.nullable) def += ' NOT NULL';
      if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
      return def;
    });
    return `CREATE TABLE IF NOT EXISTS "${table.name}" (\n${cols.join(',\n')}\n);`;
  }

  generateInsertSQL(tableName: string, data: Record<string, unknown>): string {
    const keys = Object.keys(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    return `INSERT INTO "${tableName}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')});`;
  }

  generateSelectSQL(tableName: string, options: { limit?: number; offset?: number; where?: string; orderBy?: string } = {}): string {
    let sql = `SELECT * FROM "${tableName}"`;
    if (options.where) sql += ` WHERE ${options.where}`;
    if (options.orderBy) sql += ` ORDER BY ${options.orderBy}`;
    if (options.limit) sql += ` LIMIT ${options.limit}`;
    if (options.offset) sql += ` OFFSET ${options.offset}`;
    return sql + ';';
  }

  // ── Connection Health Check ──

  async ping(connectionId: string): Promise<boolean> {
    const result = await this.executeQuery(connectionId, 'SELECT 1 as ping');
    return !result.error;
  }
}

// ── SQL Autocomplete Data ──

export const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'ILIKE',
  'IS', 'NULL', 'AS', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS',
  'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER',
  'DROP', 'INDEX', 'UNIQUE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CASCADE',
  'DEFAULT', 'NOT NULL', 'CHECK', 'CONSTRAINT', 'IF', 'EXISTS', 'RETURNING',
  'WITH', 'RECURSIVE', 'UNION', 'ALL', 'INTERSECT', 'EXCEPT', 'DISTINCT',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'CAST', 'EXTRACT', 'NOW', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'TRUE', 'FALSE',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'TRUNCATE', 'VACUUM', 'EXPLAIN', 'ANALYZE',
  'SERIAL', 'BIGSERIAL', 'UUID', 'TEXT', 'VARCHAR', 'INTEGER', 'BIGINT', 'BOOLEAN',
  'TIMESTAMP', 'TIMESTAMPTZ', 'DATE', 'JSONB', 'JSON', 'ARRAY', 'FLOAT', 'DOUBLE', 'NUMERIC',
];

export const SQL_FUNCTIONS = [
  'count()', 'sum()', 'avg()', 'min()', 'max()', 'coalesce()', 'nullif()',
  'lower()', 'upper()', 'trim()', 'length()', 'substring()', 'replace()', 'concat()',
  'now()', 'current_timestamp', 'extract()', 'date_trunc()', 'age()',
  'array_agg()', 'string_agg()', 'json_agg()', 'jsonb_build_object()',
  'gen_random_uuid()', 'row_number()', 'rank()', 'dense_rank()', 'lag()', 'lead()',
];

// ── Schema Templates for Quick Setup ──

export const SCHEMA_TEMPLATES: Record<string, { name: string; description: string; tables: string[]; sql: string }> = {
  auth: {
    name: 'Auth System',
    description: 'Users, sessions, password resets',
    tables: ['users', 'sessions', 'password_resets'],
    sql: `-- Auth System Tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_password_resets_token ON password_resets(token);`,
  },
  blog: {
    name: 'Blog Platform',
    description: 'Posts, categories, comments, tags',
    tables: ['categories', 'posts', 'comments', 'tags', 'post_tags'],
    sql: `-- Blog Platform Tables
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_comments_post ON comments(post_id);`,
  },
  ecommerce: {
    name: 'E-Commerce',
    description: 'Products, orders, customers, cart',
    tables: ['products', 'customers', 'orders', 'order_items', 'cart_items'],
    sql: `-- E-Commerce Tables
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(10,2),
  sku TEXT UNIQUE,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  images JSONB DEFAULT '[]',
  category TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  address JSONB,
  stripe_customer_id TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) DEFAULT 0,
  shipping NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_payment_id TEXT,
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_cart_session ON cart_items(session_id);`,
  },
  saas: {
    name: 'SaaS Platform',
    description: 'Organizations, teams, subscriptions, billing',
    tables: ['organizations', 'team_members', 'invitations', 'api_keys', 'usage_logs'],
    sql: `-- SaaS Platform Tables
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '["read"]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_team_members_org ON team_members(org_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_invitations_org ON invitations(org_id);
CREATE INDEX idx_api_keys_org ON api_keys(org_id);
CREATE INDEX idx_usage_logs_org ON usage_logs(org_id, recorded_at);`,
  },
};

/** Singleton factory */
let _instance: LiveDatabaseEngine | null = null;
export function getDatabaseEngine(): LiveDatabaseEngine {
  if (!_instance) _instance = new LiveDatabaseEngine();
  return _instance;
}
