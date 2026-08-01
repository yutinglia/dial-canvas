import { describe, expect, it } from 'vitest';
import { occupiedRects } from './occupiedRects';

describe('occupiedRects', () => {
  it('maps dials and widgets to rects', () => {
    expect(
      occupiedRects(
        [{ x: 1, y: 2, width: 3, height: 4 }],
        [{ x: 5, y: 6, width: 7, height: 8 }],
      ),
    ).toEqual([
      { x: 1, y: 2, width: 3, height: 4 },
      { x: 5, y: 6, width: 7, height: 8 },
    ]);
  });
});
