import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ChatModel, ChatRequest } from '../src/types.js';

class MockChatModel implements ChatModel {
  readonly provider = 'openai' as const;

  readonly model = 'mock-model';

  async chat(request: ChatRequest) {
    return {
      id: 'mock-response',
      provider: this.provider,
      model: this.model,
      text: `Echo: ${request.messages.at(-1)?.content ?? ''}`,
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    };
  }

  async *stream(request: ChatRequest) {
    const text = `Echo: ${request.messages.at(-1)?.content ?? ''}`;

    yield {
      text: 'Echo: ',
      provider: this.provider,
      model: this.model,
    };

    yield {
      text,
      provider: this.provider,
      model: this.model,
    };

    yield {
      text: '',
      provider: this.provider,
      model: this.model,
      done: true,
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    };
  }

  async structured<T>({ schema }: { schema: z.ZodType<T> }) {
    const data = schema.parse({
      name: 'Sunny',
      score: 100,
    });

    return {
      id: 'mock-structured-response',
      provider: this.provider,
      model: this.model,
      data,
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      },
    };
  }
}

describe('ChatModel abstraction', () => {
  it('returns normalized chat response', async () => {
    const model = new MockChatModel();

    const result = await model.chat({
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    });

    expect(result.text).toContain('Hello');

    expect(result.usage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
    });
  });

  it('supports streaming', async () => {
    const model = new MockChatModel();

    const chunks: string[] = [];

    for await (const chunk of model.stream({
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    })) {
      chunks.push(chunk.text);
    }

    expect(chunks.join('')).toContain('Hello');
  });

  it('supports structured output', async () => {
    const model = new MockChatModel();

    const schema = z.object({
      name: z.string(),
      score: z.number(),
    });

    const result = await model.structured({
      messages: [
        {
          role: 'user',
          content: 'Return structured data',
        },
      ],
      schema,
      schemaName: 'score',
    });

    expect(result.data).toEqual({
      name: 'Sunny',
      score: 100,
    });
  });
});
