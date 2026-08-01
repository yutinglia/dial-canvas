import { describe, expect, it } from 'vitest';
import { createId } from './id';

describe('createId', () => {
  it('returns a UUID string', () => {
    expect(createId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
