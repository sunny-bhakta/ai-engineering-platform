import type { ZodType } from 'zod';

export type AIProvider = 'openai' | 'anthropic' | 'groq' | 'gemini';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];

  temperature?: number;
  maxTokens?: number;

  timeoutMs?: number;

  metadata?: Record<string, string>;
}

export interface ChatResponse {
  id: string;
  provider: AIProvider;
  model: string;
  text: string;
  usage: TokenUsage;
}

export interface ChatStreamChunk {
  text: string;
  provider: AIProvider;
  model: string;

  usage?: TokenUsage;

  done?: boolean;
}

export interface StructuredRequest<T> extends ChatRequest {
  schema: ZodType<T>;
  schemaName: string;
  schemaDescription?: string;
}

export interface StructuredResponse<T> {
  id: string;
  provider: AIProvider;
  model: string;
  data: T;
  usage: TokenUsage;
}

export interface ChatModel {
  readonly provider: AIProvider;
  readonly model: string;

  chat(request: ChatRequest): Promise<ChatResponse>;

  stream(request: ChatRequest): AsyncIterable<ChatStreamChunk>;

  structured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>>;
}

export interface EmbeddingModel {
  readonly provider: AIProvider;
  readonly model: string;

  embed(input: string | string[]): Promise<EmbeddingResponse>;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  usage?: TokenUsage;
}

export interface AIModel {
  readonly provider: AIProvider;
  readonly model: string;
}

export interface AIConfig {
  defaultProvider: AIProvider;

  openai: {
    apiKey?: string;
    model: string;
  };

  anthropic: {
    apiKey?: string;
    model: string;
  };

  gemini: {
    apiKey?: string;
    model: string;
  };

  groq: {
    apiKey?: string;
    model: string;
  };

  timeoutMs: number;

  maxRetries: number;

  retryBaseDelayMs: number;
}
