import { describe, expect, it } from 'vitest';

import { z } from 'zod';

import { parseStructuredOutput } from '../src/structured.js';

describe('structured output', () => {
  const schema = z.object({
    name: z.string(),
    score: z.number(),
  });

  it('validates valid JSON', () => {
    const result = parseStructuredOutput(
      schema,
      JSON.stringify({
        name: 'Sunny',
        score: 100,
      }),
    );

    expect(result).toEqual({
      name: 'Sunny',
      score: 100,
    });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseStructuredOutput(schema, '{invalid}')).toThrow();
  });

  it('rejects invalid schema', () => {
    expect(() =>
      parseStructuredOutput(
        schema,
        JSON.stringify({
          name: 'Sunny',
          score: 'invalid',
        }),
      ),
    ).toThrow();
  });
});
