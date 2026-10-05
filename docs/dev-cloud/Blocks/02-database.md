Yes. For **Block 2 — Database Foundation**, I would implement it as a dedicated `packages/database` package and keep the API layer thin.

One important choice: I recommend **`pg` (node-postgres) + explicit SQL migrations**, not Prisma/Drizzle at this stage. `pg` supports ESM, pooling, parameterized queries, and explicit transaction handling, which fits the architecture and keeps PostgreSQL itself as the source of truth. ([Node Postgres][1])

## Block 2 — Database Foundation

### Scope

```text
packages/
├── config/              # existing
├── shared/              # existing
└── database/            # NEW

infrastructure/
└── docker/
    └── docker-compose.yml   # PostgreSQL + pgvector
```

Database owns:

```text
connection/pool
transactions
migrations
health check
repositories
database types
schema SQL
seed/reset
```

It does **not** own:

```text
authentication
RAG
embeddings
agents
AI memory
business authorization
HTTP controllers
NestJS-specific business logic
```

---

# 1. Files to create

```text
packages/database/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── database.ts
│   ├── transaction.ts
│   ├── health.ts
│   ├── types.ts
│   └── repositories/
│       ├── users.repository.ts
│       ├── organizations.repository.ts
│       ├── projects.repository.ts
│       ├── conversations.repository.ts
│       ├── messages.repository.ts
│       ├── documents.repository.ts
│       └── document-chunks.repository.ts
├── migrations/
│   └── 001_initial_schema.sql
├── scripts/
│   ├── migrate.ts
│   ├── reset.ts
│   └── seed.ts
└── tests/
    └── database.integration.spec.ts
```

And:

```text
infrastructure/docker/docker-compose.yml
```

If your current repository already has a Docker Compose file, **merge the PostgreSQL service into it rather than creating a second Compose file**.

---

# 2. Database package

## `packages/database/package.json`

```json
{
  "name": "@ai-engineering/database",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "dependencies": {
    "pg": "^8.16.3"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.3",
    "vitest": "^3.2.4"
  },
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "tsx scripts/migrate.ts",
    "db:reset": "tsx scripts/reset.ts",
    "db:seed": "tsx scripts/seed.ts"
  }
}
```

**Note:** preserve the exact dependency versions already used by your repository if `typescript`, `vitest`, or `tsx` are already pinned at the root. Do not introduce duplicate versions unnecessarily.

---

# 3. TypeScript configuration

## `packages/database/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

The migration and seed scripts intentionally aren't part of the production package build because they are executed with `tsx`.

---

# 4. Database connection

## `packages/database/src/database.ts`

```ts
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

export interface DatabaseConfig {
  connectionString: string;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export interface Database {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;

  connect(): Promise<PoolClient>;

  close(): Promise<void>;
}

export function createDatabase(config: DatabaseConfig): Database {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    application_name: 'ai-engineering-platform',
  });

  pool.on('error', (error) => {
    console.error('PostgreSQL pool error', error);
  });

  return {
    async query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
      const result = await pool.query<T>(text, values);

      return {
        rows: result.rows,
        rowCount: result.rowCount,
      };
    },

    async connect() {
      return pool.connect();
    },

    async close() {
      await pool.end();
    },
  };
}
```

`pg` provides built-in pooling, and pooling is the appropriate default for an application making concurrent database requests. ([Node Postgres][2])

---

# 5. Transaction support

## `packages/database/src/transaction.ts`

```ts
import type { PoolClient } from 'pg';

import type { Database } from './database.js';

export async function withTransaction<T>(
  database: Database,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await database.connect();

  try {
    await client.query('BEGIN');

    const result = await operation(client);

    await client.query('COMMIT');

    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('PostgreSQL rollback failed', rollbackError);
    }

    throw error;
  } finally {
    client.release();
  }
}
```

This is important because PostgreSQL transactions must use the **same client connection** throughout the transaction. ([Node Postgres][3])

---

# 6. Health check

## `packages/database/src/health.ts`

```ts
import type { Database } from './database.js';

export interface DatabaseHealth {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

export async function checkDatabaseHealth(database: Database): Promise<DatabaseHealth> {
  const startedAt = Date.now();

  try {
    await database.query('SELECT 1');

    return {
      healthy: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}
```

Later `apps/api` can expose this through:

```text
GET /health
```

but the database package itself should remain HTTP-independent.

---

# 7. Database types

## `packages/database/src/types.ts`

```ts
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipRole = 'owner' | 'admin' | 'member';

export interface Membership {
  organizationId: string;
  userId: string;
  role: MembershipRole;
  createdAt: Date;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  projectId: string;
  userId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface Document {
  id: string;
  projectId: string;
  uploadedBy: string | null;
  name: string;
  mimeType: string | null;
  storageKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
```

Notice that `DocumentChunk` deliberately has **no embedding column yet**.

That belongs to the future RAG/vector-search block.

---

# 8. Initial migration

## `packages/database/migrations/001_initial_schema.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email TEXT NOT NULL,
    display_name TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_lower_unique
    ON users (LOWER(email));


CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    slug TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT organizations_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT organizations_slug_not_empty
        CHECK (length(trim(slug)) > 0)
);

CREATE UNIQUE INDEX organizations_slug_unique
    ON organizations (slug);


CREATE TABLE memberships (
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,

    role TEXT NOT NULL DEFAULT 'member',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (organization_id, user_id),

    CONSTRAINT memberships_organization_fk
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT memberships_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT memberships_role_check
        CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE INDEX memberships_user_id_idx
    ON memberships (user_id);


CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT projects_organization_fk
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT projects_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT projects_slug_not_empty
        CHECK (length(trim(slug)) > 0),

    CONSTRAINT projects_org_slug_unique
        UNIQUE (organization_id, slug)
);

CREATE INDEX projects_organization_id_idx
    ON projects (organization_id);


CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,
    user_id UUID,

    title TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT conversations_project_fk
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT conversations_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX conversations_project_id_idx
    ON conversations (project_id);

CREATE INDEX conversations_user_id_idx
    ON conversations (user_id);


CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL,

    role TEXT NOT NULL,
    content TEXT NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT messages_conversation_fk
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    CONSTRAINT messages_role_check
        CHECK (
            role IN (
                'system',
                'user',
                'assistant',
                'tool'
            )
        )
);

CREATE INDEX messages_conversation_created_idx
    ON messages (conversation_id, created_at);


CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,
    uploaded_by UUID,

    name TEXT NOT NULL,
    mime_type TEXT,
    storage_key TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT documents_project_fk
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT documents_uploaded_by_fk
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT documents_name_not_empty
        CHECK (length(trim(name)) > 0)
);

CREATE INDEX documents_project_id_idx
    ON documents (project_id);


CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID NOT NULL,

    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT document_chunks_document_fk
        FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE,

    CONSTRAINT document_chunks_index_positive
        CHECK (chunk_index >= 0),

    CONSTRAINT document_chunks_token_count_positive
        CHECK (
            token_count IS NULL
            OR token_count >= 0
        ),

    CONSTRAINT document_chunks_document_index_unique
        UNIQUE (document_id, chunk_index)
);

CREATE INDEX document_chunks_document_id_idx
    ON document_chunks (document_id);
```

### Why this schema is intentionally extensible

We already have:

```text
organization
    │
    └── projects
          │
          ├── conversations
          │      └── messages
          │
          └── documents
                 └── document_chunks
```

Future tables can attach naturally:

```text
projects
   │
   ├── embeddings
   ├── agent_runs
   ├── evaluations
   ├── usage
   └── audit_logs

conversations
   │
   ├── memories
   └── tool_calls

agent_runs
   │
   ├── tool_calls
   └── approvals
```

No future tables are implemented now.

---

# 9. Migration runner

I recommend **forward-only migrations**.

Once a migration has run:

```text
001_initial_schema.sql
002_add_x.sql
003_add_y.sql
```

we don't edit `001`.

Instead, create:

```text
004_new_change.sql
```

This is much safer once production environments exist.

## `packages/database/scripts/migrate.ts`

```ts
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const migrationsDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));

const client = new Client({
  connectionString: databaseUrl,
});

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith('.sql')).sort();

  const appliedResult = await client.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version',
  );

  const applied = new Set(appliedResult.rows.map((row) => row.version));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    console.log(`Applying migration: ${file}`);

    const sql = await readFile(join(migrationsDirectory, file), 'utf8');

    await client.query('BEGIN');

    try {
      await client.query(sql);

      await client.query(
        `
          INSERT INTO schema_migrations (version)
          VALUES ($1)
        `,
        [file],
      );

      await client.query('COMMIT');

      console.log(`Applied migration: ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');

      throw error;
    }
  }

  console.log('Database migrations complete.');
} finally {
  await client.end();
}
```

This uses parameterized queries for values rather than interpolating them into SQL. `node-postgres` explicitly recommends parameterized queries for user/data values. ([Node Postgres][4])

---

# 10. Reset

Reset is intentionally a **development-only** operation.

## `packages/database/scripts/reset.ts`

```ts
import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('Database reset is disabled when NODE_ENV=production');
}

const client = new Client({
  connectionString: databaseUrl,
});

await client.connect();

try {
  console.log('Resetting database...');

  await client.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);

  console.log('Database reset complete.');
} finally {
  await client.end();
}
```

---

# 11. Seed

We do **not** create authentication users yet.

The seed simply provides development data that later authentication can replace.

## `packages/database/scripts/seed.ts`

```ts
import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const client = new Client({
  connectionString: databaseUrl,
});

await client.connect();

try {
  await client.query('BEGIN');

  const userResult = await client.query<{ id: string }>(
    `
      INSERT INTO users (
        email,
        display_name
      )
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING id
    `,
    ['dev@example.local', 'Development User'],
  );

  let userId = userResult.rows[0]?.id;

  if (!userId) {
    const existing = await client.query<{ id: string }>(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
      `,
      ['dev@example.local'],
    );

    userId = existing.rows[0]?.id;
  }

  if (!userId) {
    throw new Error('Unable to create seed user');
  }

  const organizationResult = await client.query<{ id: string }>(
    `
      INSERT INTO organizations (
        name,
        slug
      )
      VALUES ($1, $2)
      ON CONFLICT (slug)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    ['Development Organization', 'development'],
  );

  const organizationId = organizationResult.rows[0]?.id;

  if (!organizationId) {
    throw new Error('Unable to create seed organization');
  }

  await client.query(
    `
      INSERT INTO memberships (
        organization_id,
        user_id,
        role
      )
      VALUES ($1, $2, 'owner')
      ON CONFLICT (
        organization_id,
        user_id
      )
      DO UPDATE SET role = 'owner'
    `,
    [organizationId, userId],
  );

  await client.query(
    `
      INSERT INTO projects (
        organization_id,
        name,
        slug,
        description
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (
        organization_id,
        slug
      )
      DO NOTHING
    `,
    [organizationId, 'Development Project', 'development', 'Local development project'],
  );

  await client.query('COMMIT');

  console.log('Database seed complete.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
```

---

# 12. Repository pattern

We don't need repositories for every possible query yet.

Start with repositories around the core domain entities.

## `packages/database/src/repositories/users.repository.ts`

```ts
import type { PoolClient } from 'pg';

import type { Database } from '../database.js';
import type { User } from '../types.js';

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UsersRepository {
  constructor(private readonly database: Database) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.database.query<UserRow>(
      `
        SELECT
          id,
          email,
          display_name,
          created_at,
          updated_at
        FROM users
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.database.query<UserRow>(
      `
        SELECT
          id,
          email,
          display_name,
          created_at,
          updated_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
      `,
      [email],
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async create(email: string, displayName: string | null, client?: PoolClient): Promise<User> {
    const executor = client ?? this.database;

    const result = await executor.query<UserRow>(
      `
        INSERT INTO users (
          email,
          display_name
        )
        VALUES ($1, $2)
        RETURNING
          id,
          email,
          display_name,
          created_at,
          updated_at
      `,
      [email, displayName],
    );

    return mapUser(result.rows[0]);
  }
}
```

The optional `PoolClient` is important.

It allows:

```ts
await users.create(..., transactionClient);
```

without creating a second connection.

---

# 13. Organizations repository

## `packages/database/src/repositories/organizations.repository.ts`

```ts
import type { Database } from '../database.js';
import type { Organization } from '../types.js';

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class OrganizationsRepository {
  constructor(private readonly database: Database) {}

  async findById(id: string): Promise<Organization | null> {
    const result = await this.database.query<OrganizationRow>(
      `
        SELECT
          id,
          name,
          slug,
          created_at,
          updated_at
        FROM organizations
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapOrganization(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const result = await this.database.query<OrganizationRow>(
      `
        SELECT
          id,
          name,
          slug,
          created_at,
          updated_at
        FROM organizations
        WHERE slug = $1
      `,
      [slug],
    );

    return result.rows[0] ? mapOrganization(result.rows[0]) : null;
  }

  async create(name: string, slug: string): Promise<Organization> {
    const result = await this.database.query<OrganizationRow>(
      `
        INSERT INTO organizations (
          name,
          slug
        )
        VALUES ($1, $2)
        RETURNING
          id,
          name,
          slug,
          created_at,
          updated_at
      `,
      [name, slug],
    );

    return mapOrganization(result.rows[0]);
  }
}
```

---

# 14. Projects repository

## `packages/database/src/repositories/projects.repository.ts`

```ts
import type { Database } from '../database.js';
import type { Project } from '../types.js';

interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProjectsRepository {
  constructor(private readonly database: Database) {}

  async findById(id: string): Promise<Project | null> {
    const result = await this.database.query<ProjectRow>(
      `
        SELECT
          id,
          organization_id,
          name,
          slug,
          description,
          created_at,
          updated_at
        FROM projects
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapProject(result.rows[0]) : null;
  }

  async listByOrganization(organizationId: string): Promise<Project[]> {
    const result = await this.database.query<ProjectRow>(
      `
        SELECT
          id,
          organization_id,
          name,
          slug,
          description,
          created_at,
          updated_at
        FROM projects
        WHERE organization_id = $1
        ORDER BY created_at ASC
      `,
      [organizationId],
    );

    return result.rows.map(mapProject);
  }

  async create(
    organizationId: string,
    name: string,
    slug: string,
    description: string | null = null,
  ): Promise<Project> {
    const result = await this.database.query<ProjectRow>(
      `
        INSERT INTO projects (
          organization_id,
          name,
          slug,
          description
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          organization_id,
          name,
          slug,
          description,
          created_at,
          updated_at
      `,
      [organizationId, name, slug, description],
    );

    return mapProject(result.rows[0]);
  }
}
```

---

# 15. Conversations repository

## `packages/database/src/repositories/conversations.repository.ts`

```ts
import type { Database } from '../database.js';
import type { Conversation } from '../types.js';

interface ConversationRow {
  id: string;
  project_id: string;
  user_id: string | null;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ConversationsRepository {
  constructor(private readonly database: Database) {}

  async findById(id: string): Promise<Conversation | null> {
    const result = await this.database.query<ConversationRow>(
      `
          SELECT
            id,
            project_id,
            user_id,
            title,
            created_at,
            updated_at
          FROM conversations
          WHERE id = $1
        `,
      [id],
    );

    return result.rows[0] ? mapConversation(result.rows[0]) : null;
  }

  async create(
    projectId: string,
    userId: string | null,
    title: string | null = null,
  ): Promise<Conversation> {
    const result = await this.database.query<ConversationRow>(
      `
          INSERT INTO conversations (
            project_id,
            user_id,
            title
          )
          VALUES ($1, $2, $3)
          RETURNING
            id,
            project_id,
            user_id,
            title,
            created_at,
            updated_at
        `,
      [projectId, userId, title],
    );

    return mapConversation(result.rows[0]);
  }
}
```

---

# 16. Messages repository

## `packages/database/src/repositories/messages.repository.ts`

```ts
import type { Database } from '../database.js';
import type { Message, MessageRole } from '../types.js';

interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export class MessagesRepository {
  constructor(private readonly database: Database) {}

  async create(
    conversationId: string,
    role: MessageRole,
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<Message> {
    const result = await this.database.query<MessageRow>(
      `
        INSERT INTO messages (
          conversation_id,
          role,
          content,
          metadata
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          conversation_id,
          role,
          content,
          metadata,
          created_at
      `,
      [conversationId, role, content, metadata],
    );

    return mapMessage(result.rows[0]);
  }

  async listByConversation(conversationId: string): Promise<Message[]> {
    const result = await this.database.query<MessageRow>(
      `
        SELECT
          id,
          conversation_id,
          role,
          content,
          metadata,
          created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `,
      [conversationId],
    );

    return result.rows.map(mapMessage);
  }
}
```

---

# 17. Documents repository

## `packages/database/src/repositories/documents.repository.ts`

```ts
import type { Database } from '../database.js';
import type { Document } from '../types.js';

interface DocumentRow {
  id: string;
  project_id: string;
  uploaded_by: string | null;
  name: string;
  mime_type: string | null;
  storage_key: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    projectId: row.project_id,
    uploadedBy: row.uploaded_by,
    name: row.name,
    mimeType: row.mime_type,
    storageKey: row.storage_key,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DocumentsRepository {
  constructor(private readonly database: Database) {}

  async findById(id: string): Promise<Document | null> {
    const result = await this.database.query<DocumentRow>(
      `
        SELECT
          id,
          project_id,
          uploaded_by,
          name,
          mime_type,
          storage_key,
          metadata,
          created_at,
          updated_at
        FROM documents
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapDocument(result.rows[0]) : null;
  }

  async listByProject(projectId: string): Promise<Document[]> {
    const result = await this.database.query<DocumentRow>(
      `
        SELECT
          id,
          project_id,
          uploaded_by,
          name,
          mime_type,
          storage_key,
          metadata,
          created_at,
          updated_at
        FROM documents
        WHERE project_id = $1
        ORDER BY created_at ASC
      `,
      [projectId],
    );

    return result.rows.map(mapDocument);
  }

  async create(input: {
    projectId: string;
    uploadedBy: string | null;
    name: string;
    mimeType: string | null;
    storageKey: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<Document> {
    const result = await this.database.query<DocumentRow>(
      `
        INSERT INTO documents (
          project_id,
          uploaded_by,
          name,
          mime_type,
          storage_key,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          project_id,
          uploaded_by,
          name,
          mime_type,
          storage_key,
          metadata,
          created_at,
          updated_at
      `,
      [
        input.projectId,
        input.uploadedBy,
        input.name,
        input.mimeType,
        input.storageKey,
        input.metadata ?? {},
      ],
    );

    return mapDocument(result.rows[0]);
  }
}
```

---

# 18. Document chunks repository

## `packages/database/src/repositories/document-chunks.repository.ts`

```ts
import type { Database } from '../database.js';
import type { DocumentChunk } from '../types.js';

interface DocumentChunkRow {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

function mapChunk(row: DocumentChunkRow): DocumentChunk {
  return {
    id: row.id,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    tokenCount: row.token_count,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export class DocumentChunksRepository {
  constructor(private readonly database: Database) {}

  async create(input: {
    documentId: string;
    chunkIndex: number;
    content: string;
    tokenCount?: number | null;
    metadata?: Record<string, unknown>;
  }): Promise<DocumentChunk> {
    const result = await this.database.query<DocumentChunkRow>(
      `
          INSERT INTO document_chunks (
            document_id,
            chunk_index,
            content,
            token_count,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            id,
            document_id,
            chunk_index,
            content,
            token_count,
            metadata,
            created_at
        `,
      [
        input.documentId,
        input.chunkIndex,
        input.content,
        input.tokenCount ?? null,
        input.metadata ?? {},
      ],
    );

    return mapChunk(result.rows[0]);
  }

  async listByDocument(documentId: string): Promise<DocumentChunk[]> {
    const result = await this.database.query<DocumentChunkRow>(
      `
          SELECT
            id,
            document_id,
            chunk_index,
            content,
            token_count,
            metadata,
            created_at
          FROM document_chunks
          WHERE document_id = $1
          ORDER BY chunk_index ASC
        `,
      [documentId],
    );

    return result.rows.map(mapChunk);
  }
}
```

---

# 19. Package exports

## `packages/database/src/index.ts`

```ts
export * from './database.js';
export * from './transaction.js';
export * from './health.js';
export * from './types.js';

export * from './repositories/users.repository.js';
export * from './repositories/organizations.repository.js';
export * from './repositories/projects.repository.js';
export * from './repositories/conversations.repository.js';
export * from './repositories/messages.repository.js';
export * from './repositories/documents.repository.js';
export * from './repositories/document-chunks.repository.js';
```

---

# 20. Docker PostgreSQL

Use PostgreSQL 18 for local development. PostgreSQL 18 is currently a released major version, while PostgreSQL 19 is still listed as beta in the current release information. ([PostgreSQL][5])

## `infrastructure/docker/docker-compose.yml`

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg18
    container_name: ai-engineering-postgres
    restart: unless-stopped

    environment:
      POSTGRES_DB: ai_engineering
      POSTGRES_USER: ai_engineering
      POSTGRES_PASSWORD: ai_engineering_dev

    ports:
      - '5432:5432'

    volumes:
      - postgres_data:/var/lib/postgresql/data

    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ai_engineering -d ai_engineering']
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

The `pgvector` image is intentional because the master architecture already specifies PostgreSQL + pgvector.

**But Block 2 does not create embeddings or vector indexes.**

That belongs to the RAG/vector-store block.

---

# 21. Environment variables

Your existing `packages/config` should ultimately own environment validation.

For this block, define:

```env
DATABASE_URL=postgresql://ai_engineering:ai_engineering_dev@localhost:5432/ai_engineering

DATABASE_POOL_MAX=10
DATABASE_IDLE_TIMEOUT_MS=30000
DATABASE_CONNECTION_TIMEOUT_MS=5000
```

For Docker-to-Docker connections, use:

```env
DATABASE_URL=postgresql://ai_engineering:ai_engineering_dev@postgres:5432/ai_engineering
```

Do **not** commit real passwords.

Add to `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

And commit:

```text
.env.example
```

with:

```env
DATABASE_URL=postgresql://ai_engineering:ai_engineering_dev@localhost:5432/ai_engineering

DATABASE_POOL_MAX=10
DATABASE_IDLE_TIMEOUT_MS=30000
DATABASE_CONNECTION_TIMEOUT_MS=5000
```

---

# 22. Connect `packages/config`

Because you already have a dedicated `packages/config`, the final implementation should avoid reading environment variables throughout the database package.

The desired dependency direction is:

```text
apps/api
   │
   ├── config
   │
   └── database
          │
          └── pg
```

The database package should receive configuration:

```ts
createDatabase({
  connectionString,
  maxConnections,
  idleTimeoutMillis,
  connectionTimeoutMillis,
});
```

rather than doing:

```ts
process.env.DATABASE_URL;
```

inside every repository.

This keeps `packages/database` reusable by:

```text
apps/api
apps/worker
apps/ingestion
```

later.

---

# 23. Integration test

## `packages/database/tests/database.integration.spec.ts`

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  checkDatabaseHealth,
  createDatabase,
  UsersRepository,
  OrganizationsRepository,
  ProjectsRepository,
  ConversationsRepository,
  MessagesRepository,
  withTransaction,
} from '../src/index.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run database integration tests');
}

const database = createDatabase({
  connectionString: databaseUrl,
  maxConnections: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

beforeAll(async () => {
  const health = await checkDatabaseHealth(database);

  if (!health.healthy) {
    throw new Error(`Database unavailable: ${health.error ?? 'unknown error'}`);
  }
});

afterAll(async () => {
  await database.close();
});

describe('database', () => {
  it('connects to PostgreSQL', async () => {
    const health = await checkDatabaseHealth(database);

    expect(health.healthy).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('creates related domain records', async () => {
    const users = new UsersRepository(database);
    const organizations = new OrganizationsRepository(database);
    const projects = new ProjectsRepository(database);
    const conversations = new ConversationsRepository(database);
    const messages = new MessagesRepository(database);

    const user = await users.create(
      `test-${crypto.randomUUID()}@example.local`,
      'Integration Test User',
    );

    const organization = await organizations.create(
      `Test ${crypto.randomUUID()}`,
      `test-${crypto.randomUUID()}`,
    );

    const project = await projects.create(
      organization.id,
      'Test Project',
      `project-${crypto.randomUUID()}`,
    );

    const conversation = await conversations.create(
      project.id,
      user.id,
      'Integration Test Conversation',
    );

    const message = await messages.create(conversation.id, 'user', 'Hello database');

    expect(message.conversationId).toBe(conversation.id);
    expect(message.content).toBe('Hello database');
  });

  it('rolls back a transaction on failure', async () => {
    const users = new UsersRepository(database);

    const email = `rollback-${crypto.randomUUID()}@example.local`;

    await expect(
      withTransaction(database, async (client) => {
        await users.create(email, 'Rollback User', client);

        throw new Error('intentional rollback');
      }),
    ).rejects.toThrow('intentional rollback');

    const user = await users.findByEmail(email);

    expect(user).toBeNull();
  });
});
```

---

# 24. Root workspace changes

Your root `package.json` needs to include the new workspace naturally through:

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

Then add a convenient database command set:

```json
{
  "scripts": {
    "db:migrate": "pnpm --filter @ai-engineering/database db:migrate",
    "db:reset": "pnpm --filter @ai-engineering/database db:reset",
    "db:seed": "pnpm --filter @ai-engineering/database db:seed",
    "db:test": "pnpm --filter @ai-engineering/database test"
  }
}
```

Don't replace your existing scripts; merge these into them.

---

# 25. Add database dependency to API

When we wire it into `apps/api`, the API should depend on:

```json
{
  "dependencies": {
    "@ai-engineering/database": "workspace:*"
  }
}
```

But **don't move database logic into the API**.

The API should eventually do something like:

```ts
const database = createDatabase(config.database);
```

and then inject/use repositories.

---

# 26. Local development commands

Start PostgreSQL:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
```

Check:

```bash
docker ps
```

Then:

```bash
pnpm install
```

Run migrations:

```bash
pnpm db:migrate
```

Seed:

```bash
pnpm db:seed
```

Run tests:

```bash
pnpm db:test
```

Build:

```bash
pnpm --filter @ai-engineering/database build
```

---

# 27. Reset database

For local development only:

```bash
pnpm db:reset
pnpm db:migrate
pnpm db:seed
```

Or completely destroy the Docker database volume:

```bash
docker compose -f infrastructure/docker/docker-compose.yml down -v
```

Then:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
pnpm db:migrate
pnpm db:seed
```

---

# 28. Migration strategy

From this point onward:

```text
migrations/
├── 001_initial_schema.sql
├── 002_xxx.sql
├── 003_xxx.sql
└── ...
```

Rules:

1. Never edit an already-applied migration.
2. Every schema change gets a new migration.
3. Migrations execute in filename order.
4. Every migration is recorded in `schema_migrations`.
5. Each migration executes inside a transaction.
6. Production uses migrations only.
7. `reset` is development/test tooling only.
8. Destructive migrations require explicit review.
9. Future embedding/RAG migrations are separate blocks.

---

# 29. Repository architecture

The resulting architecture is:

```text
                    apps/api
                       │
                       │
                       ▼
             packages/database
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   repositories     transaction     health
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                  node-postgres
                       │
                       ▼
                PostgreSQL
                  + pgvector
```

And importantly:

```text
packages/database
        X
        │
        └──────> apps/api
```

There must be **no dependency from database back into the API**.

---

# 30. Future schema extension

The initial schema deliberately leaves room for:

```text
embeddings
agent_runs
tool_calls
approvals
memories
evaluations
usage
audit_logs
```

For example, the future RAG block can add:

```text
document_chunks
       │
       └── embeddings
              │
              └── vector index
```

without changing the basic document model.

Similarly:

```text
conversations
      │
      └── messages
             │
             └── tool_calls
```

and:

```text
agent_runs
    │
    ├── tool_calls
    ├── approvals
    └── evaluations
```

Those are **future blocks**, not part of Block 2.

---

## Block 2 Definition of Done

```text
[ ] packages/database exists
[ ] PostgreSQL connection/pool implemented
[ ] Config passed into database layer
[ ] Transaction helper implemented
[ ] Database health check implemented
[ ] SQL migration strategy implemented
[ ] Initial schema implemented
[ ] users implemented
[ ] organizations implemented
[ ] memberships implemented
[ ] projects implemented
[ ] conversations implemented
[ ] messages implemented
[ ] documents implemented
[ ] document_chunks implemented
[ ] Repository pattern established
[ ] Seed implemented
[ ] Reset implemented
[ ] Integration tests implemented
[ ] Local PostgreSQL Docker service implemented
[ ] pgvector available locally
[ ] No embeddings implemented
[ ] No RAG implemented
[ ] No authentication implemented
[ ] No agents implemented
[ ] No API business logic moved into database
```

### One adjustment I would make to your overall roadmap

Don't put PostgreSQL configuration directly inside `apps/api`. Keep:

```text
packages/config
        │
        ▼
packages/database
        │
        ▼
PostgreSQL
```

Then both `apps/api` and the future `apps/worker` / `apps/ingestion` can reuse the same database package.

The next block after this should therefore be **Block 3 — API database integration / NestJS wiring**, not RAG yet. That lets us prove `/health`, repository access, and transaction behavior through the application before adding AI-specific persistence. ([Node Postgres][6])

[1]: https://node-postgres.com/features/esm?utm_source=chatgpt.com 'node-postgres'
[2]: https://node-postgres.com/features/pooling?utm_source=chatgpt.com 'node-postgres'
[3]: https://node-postgres.com/apis/client?utm_source=chatgpt.com 'node-postgres'
[4]: https://node-postgres.com/features/queries?utm_source=chatgpt.com 'node-postgres'
[5]: https://www.postgresql.org/docs/release/?utm_source=chatgpt.com 'PostgreSQL: Release Notes'
[6]: https://node-postgres.com/features/connecting?utm_source=chatgpt.com 'node-postgres'
