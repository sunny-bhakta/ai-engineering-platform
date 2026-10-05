import { Pool, type PoolClient, type QueryResultRow } from 'pg';

import type { Env } from '@ai-platform/config';

export interface Database {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{
    rows: T[];
    rowCount: number | null;
  }>;

  connect(): Promise<PoolClient>;

  close(): Promise<void>;
}

export function createDatabase(env: Env): Database {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DATABASE_CONNECTION_TIMEOUT_MS,
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
