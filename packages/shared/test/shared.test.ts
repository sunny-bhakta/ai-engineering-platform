import { describe, expect, it } from 'vitest';

import type { Result } from '../src/index.js';

describe('shared types', () => {
  it('supports Result type', () => {
    const result: Result<string> = {
      success: true,
      data: 'hello',
    };

    expect(result.success).toBe(true);
    expect(result.data).toBe('hello');
  });
});
