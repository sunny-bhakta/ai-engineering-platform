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

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create conversation');
    }

    return mapOrganization(row);
  }
}
