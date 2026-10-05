import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_HOST: z.string().default('0.0.0.0'),

  API_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(env);
}
