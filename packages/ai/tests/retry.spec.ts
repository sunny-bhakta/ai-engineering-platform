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
