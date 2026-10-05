import type { Database } from '../database.js';
import type { Conversation } from '../types.js';

interface ConversationRow {
  id: string;
  project_id: string;
  user_id: string | null;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ConversationsRepository {
  constructor(private readonly database: Database) {}

  async findById(id: string): Promise<Conversation | null> {
    const result = await this.database.query<ConversationRow>(
      `
          SELECT
            id,
            project_id,
            user_id,
            title,
            created_at,
            updated_at
          FROM conversations
          WHERE id = $1
        `,
      [id],
    );

    return result.rows[0] ? mapConversation(result.rows[0]) : null;
  }

  async create(
    projectId: string,
    userId: string | null,
    title: string | null = null,
  ): Promise<Conversation> {
    const result = await this.database.query<ConversationRow>(
      `
          INSERT INTO conversations (
            project_id,
            user_id,
            title
          )
          VALUES ($1, $2, $3)
          RETURNING
            id,
            project_id,
            user_id,
            title,
            created_at,
            updated_at
        `,
      [projectId, userId, title],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create conversation');
    }

    return mapConversation(row);
  }
}
