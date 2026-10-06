import OpenAI from 'openai';

import { AIError, normalizeAIError } from '../errors.js';

import { parseStructuredOutput, toJsonSchema } from '../structured.js';

import { withRetry } from '../retry.js';

import { withTimeout } from '../timeout.js';

import type {
  AIConfig,
  ChatModel,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  StructuredRequest,
  StructuredResponse,
  TokenUsage,
} from '../types.js';

export class GroqChatModel implements ChatModel {
  readonly provider = 'groq' as const;

  readonly model: string;

  private readonly client: OpenAI;

  private readonly config: AIConfig;

  constructor(config: AIConfig) {
    if (!config.groq.apiKey) {
      throw new Error('GROQ_API_KEY is required for Groq provider');
    }

    this.model = config.groq.model;
    this.config = config;

    this.client = new OpenAI({
      apiKey: config.groq.apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.model;

    try {
      return await withRetry(
        async () => {
          try {
            const response = await withTimeout(
              (signal) =>
                this.client.responses.create(
                  {
                    model,
                    input: request.messages.map((message) => ({
                      role: message.role,
                      content: message.content,
                    })),
                    temperature: request.temperature,
                    max_output_tokens: request.maxTokens,
                    store: false,
                  },
                  {
                    signal,
                  },
                ),
              request.timeoutMs ?? this.config.timeoutMs,
            );

            const usage: TokenUsage = {
              inputTokens: response.usage?.input_tokens ?? 0,
              outputTokens: response.usage?.output_tokens ?? 0,
              totalTokens: response.usage?.total_tokens ?? 0,
            };

            return {
              id: response.id,
              provider: this.provider,
              model: response.model,
              text: response.output_text,
              usage,
            };
          } catch (error) {
            throw normalizeAIError(this.provider, error);
          }
        },
        {
          maxRetries: this.config.maxRetries,
          baseDelayMs: this.config.retryBaseDelayMs,
        },
      );
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }

      throw normalizeAIError(this.provider, error);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const model = request.model ?? this.model;

    let stream: AsyncIterable<OpenAI.Responses.ResponseStreamEvent>;

    try {
      stream = await withRetry(
        async () => {
          try {
            return await withTimeout(
              (signal) =>
                this.client.responses.create(
                  {
                    model,
                    input: request.messages.map((message) => ({
                      role: message.role,
                      content: message.content,
                    })),
                    temperature: request.temperature,
                    max_output_tokens: request.maxTokens,
                    store: false,
                    stream: true,
                  },
                  {
                    signal,
                  },
                ),
              request.timeoutMs ?? this.config.timeoutMs,
            );
          } catch (error) {
            throw normalizeAIError(this.provider, error);
          }
        },
        {
          maxRetries: this.config.maxRetries,
          baseDelayMs: this.config.retryBaseDelayMs,
        },
      );
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }

      throw normalizeAIError(this.provider, error);
    }

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') {
        yield {
          text: event.delta,
          provider: this.provider,
          model,
        };
      }

      if (event.type === 'response.completed') {
        yield {
          text: '',
          provider: this.provider,
          model,
          usage: {
            inputTokens: event.response.usage?.input_tokens ?? 0,
            outputTokens: event.response.usage?.output_tokens ?? 0,
            totalTokens: event.response.usage?.total_tokens ?? 0,
          },
          done: true,
        };
      }
    }
  }

  async structured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
    const model = request.model ?? this.model;

    try {
      return await withRetry(
        async () => {
          try {
            const response = await withTimeout(
              (signal) =>
                this.client.responses.create(
                  {
                    model,
                    input: request.messages.map((message) => ({
                      role: message.role,
                      content: message.content,
                    })),
                    max_output_tokens: request.maxTokens,
                    store: false,
                    text: {
                      format: {
                        type: 'json_schema',
                        name: request.schemaName,
                        description: request.schemaDescription,
                        strict: true,
                        schema: toJsonSchema(request.schema),
                      },
                    },
                  },
                  {
                    signal,
                  },
                ),
              request.timeoutMs ?? this.config.timeoutMs,
            );

            const data = parseStructuredOutput(request.schema, response.output_text);

            return {
              id: response.id,
              provider: this.provider,
              model: response.model,
              data,
              usage: {
                inputTokens: response.usage?.input_tokens ?? 0,
                outputTokens: response.usage?.output_tokens ?? 0,
                totalTokens: response.usage?.total_tokens ?? 0,
              },
            };
          } catch (error) {
            throw normalizeAIError(this.provider, error);
          }
        },
        {
          maxRetries: this.config.maxRetries,
          baseDelayMs: this.config.retryBaseDelayMs,
        },
      );
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }

      throw normalizeAIError(this.provider, error);
    }
  }
}
