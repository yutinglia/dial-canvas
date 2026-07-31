import { describe, expect, it } from 'vitest';
import { hasOverlap, intersects } from './collision';
import type { Rect } from './types';

const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
): Rect => ({ x, y, width, height });

describe('intersects', () => {
  it('detects overlapping rectangles', () => {
    expect(intersects(rect(0, 0, 64, 64), rect(32, 32, 64, 64))).toBe(true);
  });

  it('returns false for separated rectangles', () => {
    expect(intersects(rect(0, 0, 64, 64), rect(100, 0, 64, 64))).toBe(false);
    expect(intersects(rect(0, 0, 64, 64), rect(0, 100, 64, 64))).toBe(false);
  });

  it('treats edge-touching rectangles as non-overlapping', () => {
    expect(intersects(rect(0, 0, 64, 64), rect(64, 0, 64, 64))).toBe(false);
    expect(intersects(rect(0, 0, 64, 64), rect(0, 64, 64, 64))).toBe(false);
  });

  it('detects containment as intersection', () => {
    expect(intersects(rect(0, 0, 100, 100), rect(10, 10, 20, 20))).toBe(true);
    expect(intersects(rect(10, 10, 20, 20), rect(0, 0, 100, 100))).toBe(true);
  });
});

describe('hasOverlap', () => {
  it('returns false when there are no other rects', () => {
    expect(hasOverlap(rect(0, 0, 64, 64), [])).toBe(false);
  });

  it('returns true if any other rect intersects', () => {
    expect(
      hasOverlap(rect(0, 0, 64, 64), [
        rect(200, 200, 64, 64),
        rect(32, 0, 64, 64),
      ]),
    ).toBe(true);
  });

  it('returns false when all others are clear', () => {
    expect(
      hasOverlap(rect(0, 0, 64, 64), [
        rect(64, 0, 64, 64),
        rect(0, 64, 64, 64),
      ]),
    ).toBe(false);
  });
});
