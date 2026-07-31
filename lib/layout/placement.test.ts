import { describe, expect, it } from 'vitest';
import {
  clampRect,
  defaultDialSize,
  findFirstFreeSlot,
  resolveDrop,
} from './placement';
import type { Rect } from './types';

const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
): Rect => ({ x, y, width, height });

const canvas = { width: 320, height: 240 };

describe('clampRect', () => {
  it('keeps an in-bounds rect unchanged', () => {
    expect(clampRect(rect(16, 16, 64, 64), canvas)).toEqual(
      rect(16, 16, 64, 64),
    );
  });

  it('clamps position into the canvas', () => {
    expect(clampRect(rect(-20, -10, 64, 64), canvas)).toEqual(
      rect(0, 0, 64, 64),
    );
    expect(clampRect(rect(400, 300, 64, 64), canvas)).toEqual(
      rect(256, 176, 64, 64),
    );
  });

  it('shrinks oversized rects to fit the canvas', () => {
    expect(clampRect(rect(0, 0, 500, 500), canvas)).toEqual(
      rect(0, 0, 320, 240),
    );
  });

  it('enforces a minimum size of 1px', () => {
    expect(clampRect(rect(10, 10, 0, -5), canvas)).toEqual(
      rect(10, 10, 1, 1),
    );
  });
});

describe('resolveDrop', () => {
  const previous = rect(16, 16, 64, 64);
  const settings = { gridSize: 16, snapEnabled: true };

  it('snaps and clamps a free drop', () => {
    expect(
      resolveDrop(
        rect(18, 20, 70, 50),
        previous,
        [],
        settings,
        canvas,
      ),
    ).toEqual(rect(16, 16, 64, 48));
  });

  it('skips snap when snapEnabled is false', () => {
    expect(
      resolveDrop(
        rect(18, 20, 70, 50),
        previous,
        [],
        { gridSize: 16, snapEnabled: false },
        canvas,
      ),
    ).toEqual(rect(18, 20, 70, 50));
  });

  it('reverts to previousValid on overlap after snap/clamp', () => {
    const blocker = rect(64, 0, 64, 64);
    expect(
      resolveDrop(
        rect(48, 0, 64, 64),
        previous,
        [blocker],
        settings,
        canvas,
      ),
    ).toEqual(previous);
  });

  it('accepts an edge-adjacent placement (no overlap)', () => {
    const blocker = rect(0, 0, 64, 64);
    expect(
      resolveDrop(
        rect(64, 0, 64, 64),
        previous,
        [blocker],
        settings,
        canvas,
      ),
    ).toEqual(rect(64, 0, 64, 64));
  });

  it('clamps out-of-bounds proposals before the overlap check', () => {
    expect(
      resolveDrop(
        rect(-40, -40, 64, 64),
        previous,
        [],
        settings,
        canvas,
      ),
    ).toEqual(rect(0, 0, 64, 64));
  });
});

describe('defaultDialSize', () => {
  it('uses 7×6 grid cells when above the 64px floor', () => {
    expect(defaultDialSize(16)).toEqual({ width: 112, height: 96 });
    expect(defaultDialSize(24)).toEqual({ width: 168, height: 144 });
    expect(defaultDialSize(32)).toEqual({ width: 224, height: 192 });
  });

  it('floors width and height at 64px for small grids', () => {
    expect(defaultDialSize(8)).toEqual({ width: 64, height: 64 });
    expect(defaultDialSize(10)).toEqual({ width: 70, height: 64 });
  });
});

describe('findFirstFreeSlot', () => {
  it('returns the top-left slot on an empty canvas', () => {
    expect(findFirstFreeSlot([], 16, canvas)).toEqual(
      rect(0, 0, 112, 96),
    );
  });

  it('skips occupied slots and finds the next free one', () => {
    const occupied = [rect(0, 0, 112, 96)];
    expect(findFirstFreeSlot(occupied, 16, canvas)).toEqual(
      rect(112, 0, 112, 96),
    );
  });

  it('falls back to top-left when the canvas is full', () => {
    const size = { width: 64, height: 64 };
    const tiny = { width: 64, height: 64 };
    const occupied = [rect(0, 0, 64, 64)];
    expect(findFirstFreeSlot(occupied, 16, tiny, size)).toEqual(
      rect(0, 0, 64, 64),
    );
  });
});
