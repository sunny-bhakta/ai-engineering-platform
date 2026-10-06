import Anthropic from '@anthropic-ai/sdk';

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
} from '../types.js';

export class AnthropicChatModel implements ChatModel {
  readonly provider = 'anthropic' as const;

  readonly model: string;

  private readonly client: Anthropic;

  private readonly config: AIConfig;

  constructor(config: AIConfig) {
    if (!config.anthropic.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for Anthropic provider');
    }

    this.model = config.anthropic.model;
    this.config = config;

    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  private splitMessages(messages: ChatRequest['messages']) {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');

    const conversation = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: message.content,
      }));

    return {
      system,
      conversation,
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.model;
    const { system, conversation } = this.splitMessages(request.messages);

    try {
      return await withRetry(
        async () => {
          try {
            const response = await withTimeout(
              (signal) =>
                this.client.messages.create(
                  {
                    model,
                    max_tokens: request.maxTokens ?? 4096,
                    system: system || undefined,
                    messages: conversation,
                    temperature: request.temperature,
                  },
                  {
                    signal,
                  },
                ),
              request.timeoutMs ?? this.config.timeoutMs,
            );

            const text = response.content
              .filter((block): block is Anthropic.TextBlock => block.type === 'text')
              .map((block) => block.text)
              .join('');

            return {
              id: response.id,
              provider: this.provider,
              model: response.model,
              text,
              usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
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

  async *stream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    const model = request.model ?? this.model;
    const { system, conversation } = this.splitMessages(request.messages);

    let stream: ReturnType<Anthropic['messages']['stream']>;

    try {
      stream = await withRetry(
        async () => {
          try {
            return await withTimeout(
              (signal) =>
                Promise.resolve(
                  this.client.messages.stream(
                    {
                      model,
                      max_tokens: request.maxTokens ?? 4096,
                      system: system || undefined,
                      messages: conversation,
                      temperature: request.temperature,
                    },
                    {
                      signal,
                    },
                  ),
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
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield {
          text: event.delta.text,
          provider: this.provider,
          model,
        };
      }

      if (event.type === 'message_delta') {
        yield {
          text: '',
          provider: this.provider,
          model,
          usage: {
            inputTokens: 0,
            outputTokens: event.usage.output_tokens,
            totalTokens: event.usage.output_tokens,
          },
          done: true,
        };
      }
    }
  }

  async structured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
    const model = request.model ?? this.model;
    const { system, conversation } = this.splitMessages(request.messages);

    try {
      return await withRetry(
        async () => {
          try {
            const response = await withTimeout(
              (signal) =>
                this.client.messages.create(
                  {
                    model,
                    max_tokens: request.maxTokens ?? 4096,
                    system: system || undefined,
                    messages: conversation,
                    output_config: {
                      format: {
                        type: 'json_schema',
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

            const text = response.content
              .filter((block): block is Anthropic.TextBlock => block.type === 'text')
              .map((block) => block.text)
              .join('');

            const data = parseStructuredOutput(request.schema, text);

            return {
              id: response.id,
              provider: this.provider,
              model: response.model,
              data,
              usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
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
