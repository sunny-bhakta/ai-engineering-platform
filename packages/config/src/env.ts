import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_HOST: z.string().default('0.0.0.0'),

  API_PORT: z.coerce.number().int().positive().default(3000),

  AI_DEFAULT_PROVIDER: z.enum(['openai', 'anthropic', 'gemini', 'groq']).default('openai'),

  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(2),

  AI_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(500),

  OPENAI_API_KEY: z.string().min(1).optional(),

  OPENAI_MODEL: z.string().default('gpt-5'),

  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5'),

  GEMINI_API_KEY: z.string().min(1).optional(),

  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),

  GROQ_API_KEY: z.string().min(1).optional(),

  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(env);
}
