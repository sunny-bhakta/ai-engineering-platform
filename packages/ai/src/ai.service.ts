import { createAIClient, type AIConfig } from '@ai-platform/ai';

import { loadEnv } from '@ai-platform/config';

import { z } from 'zod';

const incidentSchema = z.object({
  title: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string(),
});

export class AiService {
  private readonly ai;

  constructor() {
    const env = loadEnv();

    const config: AIConfig = {
      defaultProvider: env.AI_DEFAULT_PROVIDER,

      openai: {
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
      },

      anthropic: {
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_MODEL,
      },

      gemini: {
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
      },

      groq: {
        apiKey: env.GROQ_API_KEY,
        model: env.GROQ_MODEL,
      },

      timeoutMs: env.AI_TIMEOUT_MS,

      maxRetries: env.AI_MAX_RETRIES,

      retryBaseDelayMs: env.AI_RETRY_BASE_DELAY_MS,
    };

    this.ai = createAIClient(config);
  }

  async chat(message: string) {
    const model = this.ai.chatModel();

    return model.chat({
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });
  }

  async *streamChat(message: string) {
    const model = this.ai.chatModel();

    for await (const chunk of model.stream({
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    })) {
      yield chunk;
    }
  }

  async analyzeIncident(message: string) {
    const result = await this.ai.chatModel().structured({
      messages: [
        {
          role: 'system',
          content: 'Analyze the incident and return structured data.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      schema: incidentSchema,
      schemaName: 'incident',
      schemaDescription: 'Normalized incident information',
    });

    return result.data;
  }
}
