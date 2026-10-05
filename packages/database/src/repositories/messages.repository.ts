import type { Database } from '../database.js';
import type { Message, MessageRole } from '../types.js';

interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export class MessagesRepository {
  constructor(private readonly database: Database) {}

  async create(
    conversationId: string,
    role: MessageRole,
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<Message> {
    const result = await this.database.query<MessageRow>(
      `
        INSERT INTO messages (
          conversation_id,
          role,
          content,
          metadata
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          conversation_id,
          role,
          content,
          metadata,
          created_at
      `,
      [conversationId, role, content, metadata],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create conversation');
    }

    return mapMessage(row);
  }

  async listByConversation(conversationId: string): Promise<Message[]> {
    const result = await this.database.query<MessageRow>(
      `
        SELECT
          id,
          conversation_id,
          role,
          content,
          metadata,
          created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `,
      [conversationId],
    );

    return result.rows.map(mapMessage);
  }
}
