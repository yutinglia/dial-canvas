import { describe, expect, it } from 'vitest';
import {
  canvasOrigin,
  clampRect,
  defaultClockWidgetSize,
  defaultDialSize,
  defaultWeatherWidgetSize,
  findFirstFreeSlot,
  findNearestFreeSlot,
  firstLatticeAtOrAbove,
  latticeRange,
  resolveDrop,
  resolveGroupDrop,
  shiftRectForCanvasResize,
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

describe('shiftRectForCanvasResize', () => {
  const prev = { width: 1200, height: 800 };
  const next = { width: 1400, height: 900 };

  it('is a no-op when canvas size is unchanged', () => {
    expect(
      shiftRectForCanvasResize(rect(100, 80, 64, 64), prev, prev),
    ).toEqual(rect(100, 80, 64, 64));
  });

  it('keeps a centered rect centered after grow', () => {
    // 64×64 centered on 1200×800 mid (600, 400) → top-left (568, 368)
    const centered = rect(568, 368, 64, 64);
    // After grow mid is (700, 450); expect shift (+100, +50)
    expect(shiftRectForCanvasResize(centered, prev, next)).toEqual(
      rect(668, 418, 64, 64),
    );
  });

  it('preserves offset from canvas mid (lattice relative)', () => {
    // 20px grid slot one step left of mid: x = 600 - 20 = 580
    const slot = rect(580, 400, 80, 80);
    const shifted = shiftRectForCanvasResize(slot, prev, next);
    expect(shifted.x - next.width / 2).toBe(slot.x - prev.width / 2);
    expect(shifted.y - next.height / 2).toBe(slot.y - prev.height / 2);
    expect(shifted).toEqual(rect(680, 450, 80, 80));
  });

  it('clamps into the smaller canvas when shrinking', () => {
    const small = { width: 200, height: 160 };
    // Near bottom-right of large canvas — would leave bounds after shrink
    expect(
      shiftRectForCanvasResize(rect(1100, 700, 80, 80), prev, small),
    ).toEqual(rect(120, 80, 80, 80));
  });
});

describe('canvasOrigin / lattice helpers', () => {
  it('returns the canvas mid point', () => {
    expect(canvasOrigin(canvas)).toEqual({ x: 160, y: 120 });
  });

  it('lists lattice values through the mid', () => {
    expect(firstLatticeAtOrAbove(0, 160, 16)).toBe(0);
    expect(firstLatticeAtOrAbove(0, 120, 16)).toBe(8);
    expect(latticeRange(0, 48, 160, 16)).toEqual([0, 16, 32, 48]);
    expect(latticeRange(0, 40, 120, 16)).toEqual([8, 24, 40]);
  });
});

describe('resolveDrop', () => {
  const previous = rect(16, 16, 64, 64);
  const settings = { gridSize: 16, snapEnabled: true };

  it('snaps and clamps a free drop on the center-origin grid', () => {
    expect(
      resolveDrop(
        rect(18, 20, 70, 50),
        previous,
        [],
        settings,
        canvas,
      ),
    ).toEqual(rect(16, 24, 64, 48));
  });

  it('soft-snaps when a threshold is provided', () => {
    expect(
      resolveDrop(
        rect(18, 20, 70, 50),
        previous,
        [],
        { gridSize: 16, snapEnabled: true, snapThreshold: 4 },
        canvas,
      ),
    ).toEqual(rect(16, 24, 70, 48));
  });

  it('soft-snaps item center to page mid after grid snap', () => {
    const size = 64;
    const nearMid = rect(160 - size / 2 + 3, 120 - size / 2 - 2, size, size);
    expect(
      resolveDrop(
        nearMid,
        previous,
        [],
        { gridSize: 16, snapEnabled: true, snapThreshold: 8 },
        canvas,
      ),
    ).toEqual(rect(160 - size / 2, 120 - size / 2, size, size));
  });

  it('soft-snaps item center to another item center', () => {
    const other = rect(200, 40, 80, 40); // center (240, 60)
    const near = rect(210, 160, 64, 64);
    expect(
      resolveDrop(
        near,
        previous,
        [other],
        { gridSize: 16, snapEnabled: true, snapThreshold: 8 },
        canvas,
      ),
    ).toEqual(rect(208, 168, 64, 64));
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
    ).toEqual(rect(64, 8, 64, 64));
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

describe('resolveGroupDrop', () => {
  const settings = { gridSize: 16, snapEnabled: true };

  it('translates every origin by the primary snap delta', () => {
    const origins = {
      a: rect(16, 16, 64, 64),
      b: rect(96, 16, 64, 64),
    };
    expect(
      resolveGroupDrop(
        'a',
        rect(18, 20, 64, 64),
        origins,
        [],
        settings,
        canvas,
      ),
    ).toEqual({
      a: rect(16, 24, 64, 64),
      b: rect(96, 24, 64, 64),
    });
  });

  it('reverts all origins when any translated rect overlaps others', () => {
    const origins = {
      a: rect(0, 0, 64, 64),
      b: rect(80, 0, 64, 64),
    };
    const blocker = rect(16, 24, 64, 64);
    expect(
      resolveGroupDrop(
        'a',
        rect(18, 20, 64, 64),
        origins,
        [blocker],
        settings,
        canvas,
      ),
    ).toEqual(origins);
  });

  it('clamps siblings that would leave the canvas', () => {
    const origins = {
      a: rect(200, 0, 64, 64),
      b: rect(280, 0, 64, 64),
    };
    expect(
      resolveGroupDrop(
        'a',
        rect(240, 0, 64, 64),
        origins,
        [],
        { gridSize: 16, snapEnabled: false },
        canvas,
      ),
    ).toEqual({
      a: rect(240, 0, 64, 64),
      b: rect(256, 0, 64, 64),
    });
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

describe('default widget sizes', () => {
  it('uses 10×6 for clock and 10×7 for weather', () => {
    expect(defaultClockWidgetSize(16)).toEqual({ width: 160, height: 96 });
    expect(defaultWeatherWidgetSize(16)).toEqual({ width: 160, height: 112 });
  });
});

describe('findFirstFreeSlot', () => {
  it('returns the first center-origin lattice slot on an empty canvas', () => {
    // midY=120 → first Y lattice in range is 8
    expect(findFirstFreeSlot([], 16, canvas)).toEqual(
      rect(0, 8, 112, 96),
    );
  });

  it('skips occupied slots and finds the next free one', () => {
    const occupied = [rect(0, 8, 112, 96)];
    expect(findFirstFreeSlot(occupied, 16, canvas)).toEqual(
      rect(112, 8, 112, 96),
    );
  });

  it('falls back to the first lattice slot when the canvas is full', () => {
    const size = { width: 64, height: 64 };
    const tiny = { width: 64, height: 64 };
    // mid (32, 32); only lattice slot in range is (0, 0) for this tiny canvas? 
    // firstLatticeAtOrAbove(0, 32, 16) = 0; maxX=maxY=0 → only (0,0)
    const occupied = [rect(0, 0, 64, 64)];
    expect(findFirstFreeSlot(occupied, 16, tiny, size)).toEqual(
      rect(0, 0, 64, 64),
    );
  });
});

describe('findNearestFreeSlot', () => {
  const size = { width: 64, height: 64 };

  it('returns the center-origin snapped preferred slot when free', () => {
    expect(
      findNearestFreeSlot({ x: 50, y: 34 }, [], 16, canvas, size),
    ).toEqual(rect(48, 40, 64, 64));
  });

  it('clamps preferred coordinates onto an in-bounds lattice cell', () => {
    expect(
      findNearestFreeSlot({ x: 400, y: 300 }, [], 16, canvas, size),
    ).toEqual(rect(256, 168, 64, 64));
  });

  it('expands to a nearby free ring when preferred is occupied', () => {
    const occupied = [rect(48, 40, 64, 64)];
    expect(
      findNearestFreeSlot({ x: 48, y: 40 }, occupied, 16, canvas, size),
    ).toEqual(rect(112, 8, 64, 64));
  });

  it('picks an adjacent ring cell when only the preferred slot is blocked', () => {
    const occupied = [rect(48, 40, 16, 16)];
    expect(
      findNearestFreeSlot({ x: 48, y: 40 }, occupied, 16, canvas, size),
    ).toEqual(rect(64, 24, 64, 64));
  });

  it('falls back to findFirstFreeSlot when the canvas is full', () => {
    const tiny = { width: 64, height: 64 };
    const occupied = [rect(0, 0, 64, 64)];
    expect(
      findNearestFreeSlot({ x: 0, y: 0 }, occupied, 16, tiny, size),
    ).toEqual(rect(0, 0, 64, 64));
  });
});
