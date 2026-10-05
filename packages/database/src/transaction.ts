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
