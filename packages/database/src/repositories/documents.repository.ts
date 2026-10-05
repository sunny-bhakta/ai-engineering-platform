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

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create conversation');
    }

    return mapDocument(row);
  }
}
