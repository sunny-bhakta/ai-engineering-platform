import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  API_HOST: z.string().default('0.0.0.0'),

  API_PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(env);
}
