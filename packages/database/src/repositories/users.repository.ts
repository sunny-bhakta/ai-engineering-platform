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
    const sql = `
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
    `;
    const params = [email, displayName];

    const result = client
      ? await client.query<UserRow>(sql, params)
      : await this.database.query<UserRow>(sql, params);

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create user: no row returned');
    }

    return mapUser(row);
  }
}
