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
