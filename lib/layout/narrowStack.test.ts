import { describe, expect, it } from 'vitest';
import { layoutNarrowStack, NARROW_STACK_GAP } from './narrowStack';
import type { NarrowStackItem } from './narrowStack';

const viewport = { width: 400, height: 800 };

const item = (
  partial: Partial<NarrowStackItem> & Pick<NarrowStackItem, 'id'>,
): NarrowStackItem => ({
  x: 0,
  y: 0,
  width: 100,
  height: 80,
  showWhenNarrow: true,
  ...partial,
});

describe('layoutNarrowStack', () => {
  it('returns empty when no keepers', () => {
    expect(
      layoutNarrowStack(
        [
          item({ id: 'a', showWhenNarrow: false }),
          item({ id: 'b', showWhenNarrow: false }),
        ],
        viewport,
      ),
    ).toEqual([]);
    expect(layoutNarrowStack([], viewport)).toEqual([]);
  });

  it('centers a single keeper vertically and horizontally', () => {
    const [result] = layoutNarrowStack(
      [item({ id: 'only', width: 120, height: 60 })],
      viewport,
    );
    expect(result).toEqual({
      id: 'only',
      rect: {
        x: (400 - 120) / 2,
        y: (800 - 60) / 2,
        width: 120,
        height: 60,
      },
    });
  });

  it('sorts by narrowOrder before falling back to y then x', () => {
    const results = layoutNarrowStack(
      [
        item({ id: 'late', x: 10, y: 10, narrowOrder: 2, height: 40 }),
        item({ id: 'early', x: 200, y: 200, narrowOrder: 1, height: 40 }),
        item({ id: 'pos', x: 5, y: 5, height: 40 }), // no order → after numbered
      ],
      viewport,
    );
    expect(results.map((r) => r.id)).toEqual(['early', 'late', 'pos']);
  });

  it('falls back to original y then x when order is omitted', () => {
    const results = layoutNarrowStack(
      [
        item({ id: 'bottom', x: 50, y: 300, height: 40 }),
        item({ id: 'top-right', x: 200, y: 100, height: 40 }),
        item({ id: 'top-left', x: 10, y: 100, height: 40 }),
      ],
      viewport,
    );
    expect(results.map((r) => r.id)).toEqual([
      'top-left',
      'top-right',
      'bottom',
    ]);
  });

  it('stacks with gap and centers the column', () => {
    const results = layoutNarrowStack(
      [
        item({ id: 'a', height: 40, width: 80 }),
        item({ id: 'b', height: 60, width: 80 }),
      ],
      viewport,
    );
    const total = 40 + NARROW_STACK_GAP + 60;
    const startY = (800 - total) / 2;
    expect(results[0]!.rect).toEqual({
      x: (400 - 80) / 2,
      y: startY,
      width: 80,
      height: 40,
    });
    expect(results[1]!.rect).toEqual({
      x: (400 - 80) / 2,
      y: startY + 40 + NARROW_STACK_GAP,
      width: 80,
      height: 60,
    });
  });
});
