import { config } from 'dotenv';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../../../.env') });

import { fileURLToPath } from 'node:url';

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
