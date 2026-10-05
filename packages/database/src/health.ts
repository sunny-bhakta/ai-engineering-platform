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
