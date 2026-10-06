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
  public readonly originalCause?: unknown;

  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly provider: AIProvider,
    public readonly retryable: boolean,
    public readonly status?: number,
    cause?: unknown,
  ) {
    super(message, { cause });

    this.name = 'AIError';
    this.originalCause = cause;
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
