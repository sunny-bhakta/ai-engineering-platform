Yes. This is the right point to establish a **provider-neutral AI boundary**. OpenAI, Anthropic, and Gemini SDKs will live only inside `packages/ai`; `apps/api` will import `@ai-engineering/ai` and never import those SDKs directly.

The current official SDKs support the capabilities we need: OpenAI's Responses API supports streaming, structured JSON Schema output and usage; Gemini's current `@google/genai` supports generation/streaming and structured output; Anthropic's current Messages API supports streaming and structured output configuration. ([OpenAI Platform][1])

# BLOCK 3 — AI Model Abstraction

## 1. Target structure

Create:

```text
packages/ai/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types.ts
    ├── errors.ts
    ├── retry.ts
    ├── timeout.ts
    ├── structured.ts
    ├── model.ts
    ├── factory.ts
    └── providers/
        ├── openai.provider.ts
        ├── anthropic.provider.ts
        └── gemini.provider.ts
```

The dependency direction becomes:

```text
apps/api
   │
   ▼
@ai-engineering/ai
   │
   ├── OpenAI SDK
   ├── Anthropic SDK
   └── Gemini SDK
```

So:

```text
apps/api  ❌ → openai
apps/api  ❌ → @anthropic-ai/sdk
apps/api  ❌ → @google/genai

apps/api  ✅ → @ai-engineering/ai
```

---

# 2. `packages/ai/package.json`

Use the official SDKs. As of the current package releases, OpenAI is `7.17.0`, Anthropic `0.131.0`, and Google GenAI `2.24.0`. ([npm][2])

**Path**

```text
packages/ai/package.json
```

```json
{
  "name": "@ai-engineering/ai",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.131.0",
    "@google/genai": "^2.24.0",
    "openai": "^7.17.0",
    "zod": "^4.1.5"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.3",
    "vitest": "^3.2.4"
  },
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Install:

```powershell
pnpm --filter @ai-engineering/ai add openai@^7.17.0 @anthropic-ai/sdk@^0.131.0 @google/genai@^2.24.0 zod
```

---

# 3. TypeScript configuration

**Path**

```text
packages/ai/tsconfig.json
```

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "  "include": ["src/**/*.ts"]
}
```

---

# 4. Core AI types

This is the most important file.

**Path**

```text
packages/ai/src/types.ts
```

```ts
import type { ZodType } from 'zod';

export type AIProvider = 'openai' | 'anthropic' | 'gemini';

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

  timeoutMs: number;

  maxRetries: number;

  retryBaseDelayMs: number;
}
```

Notice that `EmbeddingModel` is **only an abstraction**.

We are **not implementing embeddings or RAG in Block 3**.

---

# 5. Normalized errors

**Path**

```text
packages/ai/src/errors.ts
```

```ts
import type { AIProvider } from './types.js';

export type AIErrorCode =
  | 'AUTHENTICATION'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'NETWORK'
  | 'PROVIDER_ERROR'
  | 'PARSE_ERROR'
  | 'UNKNOWN';

export class AIError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly provider: AIProvider,
    public readonly retryable: boolean,
    public readonly status?: number,
    public readonly cause?: unknown,
  ) {
    super(message);

    this.name = 'AIError';
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;

    return typeof status === 'number' ? status : undefined;
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string') {
      return message;
    }
  }

  return 'AI provider request failed';
}

export function normalizeAIError(provider: AIProvider, error: unknown): AIError {
  if (error instanceof AIError) {
    return error;
  }

  const status = getErrorStatus(error);
  const message = getErrorMessage(error);

  if (status === 401 || status === 403) {
    return new AIError('AUTHENTICATION', message, provider, false, status, error);
  }

  if (status === 429) {
    return new AIError('RATE_LIMIT', message, provider, true, status, error);
  }

  if (status !== undefined && status >= 400 && status < 500) {
    return new AIError('INVALID_REQUEST', message, provider, false, status, error);
  }

  if (status !== undefined && status >= 500) {
    return new AIError('PROVIDER_ERROR', message, provider, true, status, error);
  }

  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return new AIError('TIMEOUT', message, provider, true, undefined, error);
  }

  if (
    error instanceof Error &&
    (error.name === 'FetchError' || error.name === 'ECONNRESET' || error.name === 'ECONNREFUSED')
  ) {
    return new AIError('NETWORK', message, provider, true, undefined, error);
  }

  return new AIError('UNKNOWN', message, provider, false, status, error);
}
```

---

# 6. Timeout handling

**Path**

```text
packages/ai/src/timeout.ts
```

```ts
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort(new DOMException('AI request timed out', 'TimeoutError'));
  }, timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}
```

---

# 7. Retry handling

Retries should **not** retry authentication errors, validation errors, parsing errors, etc.

**Path**

```text
packages/ai/src/retry.ts
```

```ts
import { AIError } from './errors.js';

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!(error instanceof AIError)) {
        throw error;
      }

      if (!error.retryable || attempt >= options.maxRetries) {
        throw error;
      }

      const exponentialDelay = options.baseDelayMs * 2 ** attempt;

      const jitter = Math.floor(Math.random() * 100);

      await delay(exponentialDelay + jitter);

      attempt += 1;
    }
  }
}
```

---

# 8. Structured output helper

**Path**

```text
packages/ai/src/structured.ts
```

```ts
import { z, type ZodType } from 'zod';

export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  [key: string]: unknown;
}

export function toJsonSchema<T>(schema: ZodType<T>): JsonSchema {
  return z.toJSONSchema(schema) as JsonSchema;
}

export function parseStructuredOutput<T>(schema: ZodType<T>, text: string): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error('AI provider returned invalid JSON', {
      cause: error,
    });
  }

  return schema.parse(parsed);
}
```

This gives us an important boundary:

```text
LLM output
   ↓
JSON
   ↓
Zod validation
   ↓
trusted application object
```

We do **not** trust model-generated structured data blindly.

---

# 9. OpenAI provider

OpenAI's current TypeScript SDK uses the Responses API as the primary API, and it supports streaming and structured JSON Schema responses. ([OpenAI Platform][1])

**Path**

```text
packages/ai/src/providers/openai.provider.ts
```

```ts
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

export class OpenAIChatModel implements ChatModel {
  readonly provider = 'openai' as const;

  readonly model: string;

  private readonly client: OpenAI;

  private readonly config: AIConfig;

  constructor(config: AIConfig) {
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI provider');
    }

    this.model = config.openai.model;
    this.config = config;

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
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
```

---

# 10. Anthropic provider

Anthropic's current API uses the Messages API and exposes token usage on responses. Current Anthropic documentation also uses `output_config.format` for structured output configuration. ([Claude Platform Docs][3])

**Path**

```text
packages/ai/src/providers/anthropic.provider.ts
```

```ts
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
                        name: request.schemaName,
                        description: request.schemaDescription,
                        schema: toJsonSchema(request.schema),
                        strict: true,
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
```

---

# 11. Gemini provider

Use the current `@google/genai` SDK rather than the old `@google/generative-ai` package. Google explicitly identifies the former as the current SDK, and it supports `generateContent`, `generateContentStream`, and structured output. ([npm][4])

**Path**

```text
packages/ai/src/providers/gemini.provider.ts
```

```ts
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
```

---

# 12. AI factory

This is what `apps/api` will consume.

**Path**

```text
packages/ai/src/factory.ts
```

```ts
import { AnthropicChatModel } from './providers/anthropic.provider.js';

import { GeminiChatModel } from './providers/gemini.provider.js';

import { OpenAIChatModel } from './providers/openai.provider.js';

import type { AIConfig, AIProvider, ChatModel } from './types.js';

export interface AIClient {
  chatModel(provider?: AIProvider): ChatModel;
}

export function createAIClient(config: AIConfig): AIClient {
  const models = new Map<AIProvider, ChatModel>();

  if (config.openai.apiKey) {
    models.set('openai', new OpenAIChatModel(config));
  }

  if (config.anthropic.apiKey) {
    models.set('anthropic', new AnthropicChatModel(config));
  }

  if (config.gemini.apiKey) {
    models.set('gemini', new GeminiChatModel(config));
  }

  return {
    chatModel(provider = config.defaultProvider): ChatModel {
      const model = models.get(provider);

      if (!model) {
        throw new Error(`AI provider "${provider}" is not configured`);
      }

      return model;
    },
  };
}
```

---

# 13. Public package export

**Path**

```text
packages/ai/src/model.ts
```

```ts
export type { AIModel, ChatModel, EmbeddingModel } from './types.js';
```

**Path**

```text
packages/ai/src/index.ts
```

```ts
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
```

Notice that the provider classes themselves are **not exported**.

That is deliberate.

`apps/api` should not know that OpenAI/Anthropic/Gemini implementations exist.

---

# 14. Add AI environment configuration

You already have `packages/config`.

Do **not** create another environment configuration system.

Add these fields to your existing `envSchema`.

**Path**

```text
packages/config/src/index.ts
```

Add:

```ts
AI_DEFAULT_PROVIDER: z
  .enum([
    'openai',
    'anthropic',
    'gemini',
  ])
  .default('openai'),

AI_TIMEOUT_MS: z
  .coerce
  .number()
  .int()
  .positive()
  .default(30_000),

AI_MAX_RETRIES: z
  .coerce
  .number()
  .int()
  .min(0)
  .max(10)
  .default(2),

AI_RETRY_BASE_DELAY_MS: z
  .coerce
  .number()
  .int()
  .positive()
  .default(500),

OPENAI_API_KEY: z
  .string()
  .min(1)
  .optional(),

OPENAI_MODEL: z
  .string()
  .default('gpt-5'),

ANTHROPIC_API_KEY: z
  .string()
  .min(1)
  .optional(),

ANTHROPIC_MODEL: z
  .string()
  .default('claude-sonnet-5'),

GEMINI_API_KEY: z
  .string()
  .min(1)
  .optional(),

GEMINI_MODEL: z
  .string()
  .default('gemini-3.8-flash'),
```

The provider API keys are optional at configuration-validation time because you may only want one provider enabled locally.

The factory will fail clearly if you select an unconfigured provider.

---

# 15. `.env`

Your root:

```text
.env
```

can contain:

```env
NODE_ENV=development

API_HOST=0.0.0.0
API_PORT=3000

DATABASE_URL=postgresql://ai_engineering:ai_engineering_dev@localhost:5432/ai_engineering

AI_DEFAULT_PROVIDER=openai
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=2
AI_RETRY_BASE_DELAY_MS=500

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
```

**Never commit actual API keys.**

Your `.gitignore` must contain:

```gitignore
.env
.env.*
!.env.example
```

---

# 16. `.env.example`

**Path**

```text
.env.example
```

```env
NODE_ENV=development

API_HOST=0.0.0.0
API_PORT=3000

DATABASE_URL=postgresql://ai_engineering:ai_engineering_dev@localhost:5432/ai_engineering

AI_DEFAULT_PROVIDER=openai
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=2
AI_RETRY_BASE_DELAY_MS=500

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
```

OpenAI itself recommends keeping the API key in an environment variable rather than source code. ([OpenAI Platform][1])

---

# 17. API example

Add the workspace dependency:

**Path**

```text
apps/api/package.json
```

```json
{
  "dependencies": {
    "@ai-engineering/ai": "workspace:*",
    "@ai-engineering/config": "workspace:*"
  }
}
```

Then an API service can do:

**Path**

```text
apps/api/src/ai/ai.service.ts
```

```ts
import { createAIClient, type AIConfig } from '@ai-engineering/ai';

import { loadEnv } from '@ai-engineering/config';

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
}
```

There is **no**:

```ts
import OpenAI from 'openai';
```

in `apps/api`.

There is also no:

```ts
import Anthropic from '@anthropic-ai/sdk';
```

or:

```ts
import { GoogleGenAI } from '@google/genai';
```

in the API.

---

# 18. Streaming from API

The API can consume the same abstraction:

```ts
async *streamChat(
  message: string,
) {
  const model =
    this.ai.chatModel();

  for await (
    const chunk of model.stream({
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    })
  ) {
    yield chunk;
  }
}
```

The caller doesn't care whether this is:

```text
OpenAI
Anthropic
Gemini
```

---

# 19. Structured output from API

Example:

```ts
import { z } from 'zod';

const incidentSchema = z.object({
  title: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string(),
});

const result = await this.ai.chatModel().structured({
  messages: [
    {
      role: 'system',
      content: 'Analyze the incident and return structured data.',
    },
    {
      role: 'user',
      content: 'Database connections are failing.',
    },
  ],
  schema: incidentSchema,
  schemaName: 'incident',
  schemaDescription: 'Normalized incident information',
});

console.log(result.data);
```

The result is typed as:

```ts
{
  title: string;
  severity:
    | 'low'
    | 'medium'
    | 'high'
    | 'critical';
  summary: string;
}
```

This is an important foundation for later:

```text
AI
 ↓
structured output
 ↓
Zod validation
 ↓
agents/tools
```

---

# 20. Mock provider tests

For Block 3, we should test the **abstraction**, not make real API calls.

Create:

```text
packages/ai/tests/chat-model.spec.ts
```

```ts
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
```

---

# 21. Retry tests

**Path**

```text
packages/ai/tests/retry.spec.ts
```

```ts
import { describe, expect, it, vi } from 'vitest';

import { AIError } from '../src/errors.js';

import { withRetry } from '../src/retry.js';

describe('withRetry', () => {
  it('retries retryable errors', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new AIError('RATE_LIMIT', 'rate limited', 'openai', true))
      .mockResolvedValue('success');

    const result = await withRetry(operation, {
      maxRetries: 1,
      baseDelayMs: 0,
    });

    expect(result).toBe('success');

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable errors', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(new AIError('AUTHENTICATION', 'invalid key', 'openai', false));

    await expect(
      withRetry(operation, {
        maxRetries: 3,
        baseDelayMs: 0,
      }),
    ).rejects.toThrow('invalid key');

    expect(operation).toHaveBeenCalledTimes(1);
  });
});
```

---

# 22. Error normalization tests

**Path**

```text
packages/ai/tests/errors.spec.ts
```

```ts
import { describe, expect, it } from 'vitest';

import { normalizeAIError } from '../src/errors.js';

describe('normalizeAIError', () => {
  it('normalizes rate limits', () => {
    const error = normalizeAIError('openai', {
      status: 429,
      message: 'Too many requests',
    });

    expect(error.code).toBe('RATE_LIMIT');

    expect(error.retryable).toBe(true);
  });

  it('normalizes authentication failures', () => {
    const error = normalizeAIError('anthropic', {
      status: 401,
      message: 'Invalid API key',
    });

    expect(error.code).toBe('AUTHENTICATION');

    expect(error.retryable).toBe(false);
  });

  it('normalizes provider failures', () => {
    const error = normalizeAIError('gemini', {
      status: 503,
      message: 'Service unavailable',
    });

    expect(error.code).toBe('PROVIDER_ERROR');

    expect(error.retryable).toBe(true);
  });
});
```

---

# 23. Structured output validation test

**Path**

```text
packages/ai/tests/structured.spec.ts
```

```ts
import { describe, expect, it } from 'vitest';

import { z } from 'zod';

import { parseStructuredOutput } from '../src/structured.js';

describe('structured output', () => {
  const schema = z.object({
    name: z.string(),
    score: z.number(),
  });

  it('validates valid JSON', () => {
    const result = parseStructuredOutput(
      schema,
      JSON.stringify({
        name: 'Sunny',
        score: 100,
      }),
    );

    expect(result).toEqual({
      name: 'Sunny',
      score: 100,
    });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseStructuredOutput(schema, '{invalid}')).toThrow();
  });

  it('rejects invalid schema', () => {
    expect(() =>
      parseStructuredOutput(
        schema,
        JSON.stringify({
          name: 'Sunny',
          score: 'invalid',
        }),
      ),
    ).toThrow();
  });
});
```

---

# 24. Root scripts

Add to your root `package.json`:

```json
{
  "scripts": {
    "ai:test": "pnpm --filter @ai-engineering/ai test",
    "ai:typecheck": "pnpm --filter @ai-engineering/ai typecheck",
    "ai:build": "pnpm --filter @ai-engineering/ai build"
  }
}
```

Then:

```powershell
pnpm install
pnpm ai:typecheck
pnpm ai:test
pnpm ai:build
```

---

# 25. What Block 3 now provides

After this block, you have:

| Capability                 | Status           |
| -------------------------- | ---------------- |
| Internal AI abstraction    | ✅               |
| `AIModel`                  | ✅               |
| `ChatModel`                | ✅               |
| `EmbeddingModel` interface | ✅               |
| OpenAI                     | ✅               |
| Anthropic                  | ✅               |
| Gemini                     | ✅               |
| Chat completion            | ✅               |
| Streaming                  | ✅               |
| Structured output          | ✅               |
| Zod validation             | ✅               |
| Token usage                | ✅               |
| Model configuration        | ✅               |
| Timeout                    | ✅               |
| Retry                      | ✅               |
| Normalized errors          | ✅               |
| Mock-provider tests        | ✅               |
| API usage example          | ✅               |
| Secrets outside source     | ✅               |
| RAG                        | ❌ intentionally |
| Agents                     | ❌ intentionally |
| Frontend                   | ❌ intentionally |
| Embedding implementation   | ❌ intentionally |

### One architectural decision worth keeping

Do **not** add LangChain, Vercel AI SDK, or another orchestration framework here just to make the abstraction shorter.

For this project, `packages/ai` should remain the **lowest-level provider boundary**:

```text
                 apps/api
                    │
                    ▼
              packages/ai
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     OpenAI      Anthropic    Gemini
```

Later, when we implement agents, RAG, evaluation, or observability, those packages can depend on `@ai-engineering/ai` rather than knowing anything about provider SDKs.

Also, the retry implementation intentionally retries only normalized retryable failures. It does **not** retry authentication, invalid requests, or validation failures, which prevents an invalid AI request from being repeatedly sent.

**Block 3 should stop here.** No RAG, agents, embeddings implementation, tool calling, or frontend should be added yet.

[1]: https://platform.openai.com/docs/quickstart/make-your-first-api-request?utm_source=chatgpt.com 'Developer quickstart - OpenAI API'
[2]: https://www.npmjs.com/package/openai?activeTab=versions&utm_source=chatgpt.com 'openai - npm'
[3]: https://docs.anthropic.com/es/docs/build-with-claude/pdf-support?utm_source=chatgpt.com 'Soporte para PDF - Claude Platform Docs'
[4]: https://www.npmjs.com/package/%40google/genai?activeTab=versions&utm_source=chatgpt.com '@google/genai - npm'
ter this block, you have:

| Capability                 | Status          |
| -------------------------- | --------------- |
| Internal AI abstraction    | ✅               |
| `AIModel`                  | ✅               |
| `ChatModel`                | ✅               |
| `EmbeddingModel` interface | ✅               |
| OpenAI                     | ✅               |
| Anthropic                  | ✅               |
| Gemini                     | ✅               |
| Chat completion            | ✅               |
| Streaming                  | ✅               |
| Structured output          | ✅               |
| Zod validation             | ✅               |
| Token usage                | ✅               |
| Model configuration        | ✅               |
| Timeout                    | ✅               |
| Retry                      | ✅               |
| Normalized errors          | ✅               |
| Mock-provider tests        | ✅               |
| API usage example          | ✅               |
| Secrets outside source     | ✅               |
| RAG                        | ❌ intentionally |
| Agents                     | ❌ intentionally |
| Frontend                   | ❌ intentionally |
| Embedding implementation   | ❌ intentionally |

### One architectural decision worth keeping

Do **not** add LangChain, Vercel AI SDK, or another orchestration framework here just to make the abstraction shorter.

For this project, `packages/ai` should remain the **lowest-level provider boundary**:

```text
                 apps/api
                    │
                    ▼
              packages/ai
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     OpenAI      Anthropic    Gemini
```

Later, when we implement agents, RAG, evaluation, or observability, those packages can depend on `@ai-engineering/ai` rather than knowing anything about provider SDKs.

Also, the retry implementation intentionally retries only normalized retryable failures. It does **not** retry authentication, invalid requests, or validation failures, which prevents an invalid AI request from being repeatedly sent.

**Block 3 should stop here.** No RAG, agents, embeddings implementation, tool calling, or frontend should be added yet.

[1]: https://platform.openai.com/docs/quickstart/make-your-first-api-request?utm_source=chatgpt.com "Developer quickstart - OpenAI API"
[2]: https://www.npmjs.com/package/openai?activeTab=versions&utm_source=chatgpt.com "openai - npm"
[3]: https://docs.anthropic.com/es/docs/build-with-claude/pdf-support?utm_source=chatgpt.com "Soporte para PDF - Claude Platform Docs"
[4]: https://www.npmjs.com/package/%40google/genai?activeTab=versions&utm_source=chatgpt.com "@google/genai - npm"
