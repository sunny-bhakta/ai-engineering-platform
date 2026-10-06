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
