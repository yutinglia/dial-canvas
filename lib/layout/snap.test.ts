import { describe, expect, it } from 'vitest';
import { snapRect, snapScalar } from './snap';

describe('snapScalar', () => {
  it('snaps to the nearest grid line when threshold is omitted', () => {
    expect(snapScalar(0, 16)).toBe(0);
    expect(snapScalar(7, 16)).toBe(0);
    expect(snapScalar(8, 16)).toBe(16);
    expect(snapScalar(23, 16)).toBe(16);
    expect(snapScalar(24, 16)).toBe(32);
    expect(snapScalar(25, 16)).toBe(32);
  });

  it('snaps only when within the given threshold', () => {
    expect(snapScalar(10, 16, 4)).toBe(10);
    expect(snapScalar(13, 16, 4)).toBe(16);
    expect(snapScalar(3, 16, 4)).toBe(0);
    expect(snapScalar(5, 16, 4)).toBe(5);
  });

  it('always snaps when threshold is Infinity', () => {
    expect(snapScalar(1, 16, Infinity)).toBe(0);
    expect(snapScalar(15, 16, Infinity)).toBe(16);
  });

  it('returns the input unchanged when gridSize is non-positive', () => {
    expect(snapScalar(17, 0)).toBe(17);
    expect(snapScalar(17, -8)).toBe(17);
  });

  it('snaps relative to a non-zero origin', () => {
    // Lattice: …, 184, 200, 216, 232, …
    const origin = 200;
    expect(snapScalar(200, 16, undefined, origin)).toBe(200);
    expect(snapScalar(209, 16, undefined, origin)).toBe(216);
    expect(snapScalar(184, 16, undefined, origin)).toBe(184);
    expect(snapScalar(195, 16, 4, origin)).toBe(195);
    expect(snapScalar(197, 16, 4, origin)).toBe(200);
  });
});

describe('snapRect', () => {
  it('snaps position and size to grid multiples', () => {
    expect(
      snapRect({ x: 10, y: 22, width: 70, height: 50 }, 16),
    ).toEqual({ x: 16, y: 16, width: 64, height: 48 });
  });

  it('enforces a minimum size of one grid cell', () => {
    expect(
      snapRect({ x: 0, y: 0, width: 1, height: 1 }, 16),
    ).toEqual({ x: 0, y: 0, width: 16, height: 16 });
  });

  it('rounds half-cell sizes to the nearest grid multiple', () => {
    expect(
      snapRect({ x: 0, y: 0, width: 24, height: 40 }, 16),
    ).toEqual({ x: 0, y: 0, width: 32, height: 48 });
  });

  it('soft-snaps only when within threshold', () => {
    expect(
      snapRect({ x: 10, y: 10, width: 70, height: 50 }, 16, 4),
    ).toEqual({ x: 10, y: 10, width: 70, height: 48 });
    expect(
      snapRect({ x: 14, y: 2, width: 66, height: 50 }, 16, 4),
    ).toEqual({ x: 16, y: 0, width: 64, height: 48 });
  });

  it('snaps position relative to a canvas mid origin', () => {
    const origin = { x: 160, y: 120 };
    expect(
      snapRect({ x: 18, y: 20, width: 70, height: 50 }, 16, undefined, origin),
    ).toEqual({ x: 16, y: 24, width: 64, height: 48 });
    expect(
      snapRect({ x: 158, y: 118, width: 64, height: 64 }, 16, 4, origin),
    ).toEqual({ x: 160, y: 120, width: 64, height: 64 });
  });
});
