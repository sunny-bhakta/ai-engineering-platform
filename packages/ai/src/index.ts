export { createAIClient } from './factory.js';

export { AIError, normalizeAIError } from './errors.js';

export type { AIErrorCode } from './errors.js';

export type {
  AIConfig,
  AIModel,
  AIProvider,
  ChatMessage,
  ChatModel,
  ChatRequest,
  ChatResponse,
  ChatRole,
  ChatStreamChunk,
  EmbeddingModel,
  EmbeddingResponse,
  StructuredRequest,
  StructuredResponse,
  TokenUsage,
} from './types.js';

export { parseStructuredOutput, toJsonSchema } from './structured.js';
