import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  checkDatabaseHealth,
  createDatabase,
  UsersRepository,
  OrganizationsRepository,
  ProjectsRepository,
  ConversationsRepository,
  MessagesRepository,
  withTransaction,
} from '../src/index.js';

import { loadEnv } from '@ai-platform/config';

const env = loadEnv();
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run database integration tests');
}

const database = createDatabase(env);

beforeAll(async () => {
  const health = await checkDatabaseHealth(database);

  if (!health.healthy) {
    throw new Error(`Database unavailable: ${health.error ?? 'unknown error'}`);
  }
});

afterAll(async () => {
  await database.close();
});

describe('database', () => {
  it('connects to PostgreSQL', async () => {
    const health = await checkDatabaseHealth(database);

    expect(health.healthy).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('creates related domain records', async () => {
    const users = new UsersRepository(database);
    const organizations = new OrganizationsRepository(database);
    const projects = new ProjectsRepository(database);
    const conversations = new ConversationsRepository(database);
    const messages = new MessagesRepository(database);

    const user = await users.create(
      `test-${crypto.randomUUID()}@example.local`,
      'Integration Test User',
    );

    const organization = await organizations.create(
      `Test ${crypto.randomUUID()}`,
      `test-${crypto.randomUUID()}`,
    );

    const project = await projects.create(
      organization.id,
      'Test Project',
      `project-${crypto.randomUUID()}`,
    );

    const conversation = await conversations.create(
      project.id,
      user.id,
      'Integration Test Conversation',
    );

    const message = await messages.create(conversation.id, 'user', 'Hello database');

    expect(message.conversationId).toBe(conversation.id);
    expect(message.content).toBe('Hello database');
  });

  it('rolls back a transaction on failure', async () => {
    const users = new UsersRepository(database);

    const email = `rollback-${crypto.randomUUID()}@example.local`;

    await expect(
      withTransaction(database, async (client) => {
        await users.create(email, 'Rollback User', client);

        throw new Error('intentional rollback');
      }),
    ).rejects.toThrow('intentional rollback');

    const user = await users.findByEmail(email);

    expect(user).toBeNull();
  });
});
