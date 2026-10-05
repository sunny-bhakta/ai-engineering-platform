import { config } from 'dotenv';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../../../.env') });

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;

import { loadEnv } from '@ai-platform/config';

const env = loadEnv();
if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const migrationsDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));

const client = new Client({
  connectionString: env.DATABASE_URL,
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
