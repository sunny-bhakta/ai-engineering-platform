import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/index.js';

describe('environment configuration', () => {
  it('uses development defaults', () => {
    const env = loadEnv({});

    expect(env.NODE_ENV).toBe('development');
    expect(env.API_HOST).toBe('0.0.0.0');
    expect(env.API_PORT).toBe(3000);
  });

  it('parses API port as a number', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      API_HOST: '127.0.0.1',
      API_PORT: '4000',
    });

    expect(env.API_PORT).toBe(4000);
  });
});
