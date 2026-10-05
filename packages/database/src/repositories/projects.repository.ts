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

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create conversation');
    }

    return mapProject(row);
  }
}
