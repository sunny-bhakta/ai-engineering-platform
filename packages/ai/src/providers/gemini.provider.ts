import { GoogleGenAI } from '@google/genai';

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

export class GeminiChatModel implements ChatModel {
  readonly provider = 'gemini' as const;

  readonly model: string;

  private readonly client: GoogleGenAI;

  private readonly config: AIConfig;

  constructor(config: AIConfig) {
    if (!config.gemini.apiKey) {
      throw new Error('GEMINI_API_KEY is required for Gemini provider');
    }

    this.model = config.gemini.model;
    this.config = config;

    this.client = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
    });
  }

  private buildContents(messages: ChatRequest['messages']) {
    return messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [
          {
            text: message.content,
          },
        ],
      }));
  }

  private getSystemInstruction(messages: ChatRequest['messages']): string | undefined {
    const instructions = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content);

    return instructions.length > 0 ? instructions.join('\n\n') : undefined;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model ?? this.model;

    try {
      return await withRetry(
        async () => {
          try {
            const response = await withTimeout(
              () =>
                this.client.models.generateContent({
                  model,
                  contents: this.buildContents(request.messages),
                  config: {
                    systemInstruction: this.getSystemInstruction(request.messages),
                    temperature: request.temperature,
                    maxOutputTokens: request.maxTokens,
                  },
                }),
              request.timeoutMs ?? this.config.timeoutMs,
            );

            const usage = response.usageMetadata;

            return {
              id: response.responseId ?? crypto.randomUUID(),
              provider: this.provider,
              model,
              text: response.text ?? '',
              usage: {
                inputTokens: usage?.promptTokenCount ?? 0,
                outputTokens: usage?.candidatesTokenCount ?? 0,
                totalTokens: usage?.totalTokenCount ?? 0,
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

    let stream: AsyncIterable<{
      text?: string;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    }>;

    try {
      stream = await withRetry(
        async () => {
          try {
            return await withTimeout(
              () =>
                this.client.models.generateContentStream({
                  model,
                  contents: this.buildContents(request.messages),
                  config: {
                    systemInstruction: this.getSystemInstruction(request.messages),
                    temperature: request.temperature,
                    maxOutputTokens: request.maxTokens,
                  },
                }),
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

    let lastUsage:
      | {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        }
      | undefined;

    for await (const chunk of stream) {
      lastUsage = chunk.usageMetadata ?? lastUsage;

      if (chunk.text) {
        yield {
          text: chunk.text,
          provider: this.provider,
          model,
        };
      }
    }

    yield {
      text: '',
      provider: this.provider,
      model,
      usage: {
        inputTokens: lastUsage?.promptTokenCount ?? 0,
        outputTokens: lastUsage?.candidatesTokenCount ?? 0,
        totalTokens: lastUsage?.totalTokenCount ?? 0,
      },
      done: true,
    };
  }

  async structured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
    const model = request.model ?? this.model;

    try {
      return await withRetry(
        async () => {
          try {
            const response = await withTimeout(
              () =>
                this.client.models.generateContent({
                  model,
                  contents: this.buildContents(request.messages),
                  config: {
                    systemInstruction: this.getSystemInstruction(request.messages),
                    responseMimeType: 'application/json',
                    responseSchema: toJsonSchema(request.schema),
                    maxOutputTokens: request.maxTokens,
                  },
                }),
              request.timeoutMs ?? this.config.timeoutMs,
            );

            const data = parseStructuredOutput(request.schema, response.text ?? '');

            const usage = response.usageMetadata;

            return {
              id: response.responseId ?? crypto.randomUUID(),
              provider: this.provider,
              model,
              data,
              usage: {
                inputTokens: usage?.promptTokenCount ?? 0,
                outputTokens: usage?.candidatesTokenCount ?? 0,
                totalTokens: usage?.totalTokenCount ?? 0,
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
