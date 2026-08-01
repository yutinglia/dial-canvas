import { describe, expect, it } from 'vitest';
import { createSeedDials } from './seed';
import { isAllowedDialUrl } from '../schemas/dial';
import { intersects } from '../layout/collision';

describe('createSeedDials', () => {
  it('returns four allowed sample dials on a non-overlapping grid', () => {
    const dials = createSeedDials(20);
    expect(dials).toHaveLength(4);
    expect(new Set(dials.map((d) => d.id)).size).toBe(4);
    for (const dial of dials) {
      expect(isAllowedDialUrl(dial.url)).toBe(true);
      expect(dial.width).toBeGreaterThanOrEqual(64);
      expect(dial.height).toBeGreaterThanOrEqual(64);
      expect(dial.showWhenNarrow).toBe(false);
    }
    for (let i = 0; i < dials.length; i++) {
      for (let j = i + 1; j < dials.length; j++) {
        expect(intersects(dials[i]!, dials[j]!)).toBe(false);
      }
    }
  });
});
