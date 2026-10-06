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
