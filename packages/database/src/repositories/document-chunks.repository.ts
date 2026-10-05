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

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create conversation');
    }

    return mapChunk(row);
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
