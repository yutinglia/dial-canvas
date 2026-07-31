import { describe, expect, it } from 'vitest';
import { activeAlignGuides, alignSnapRect } from './align';
import type { Rect } from './types';

const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
): Rect => ({ x, y, width, height });

const canvas = { width: 400, height: 300 };

describe('alignSnapRect', () => {
  it('snaps item center to page mid when within threshold', () => {
    // Center at (198, 148); page mid (200, 150)
    const moved = rect(168, 118, 60, 60);
    expect(alignSnapRect(moved, { canvas, others: [] }, 8)).toEqual(
      rect(170, 120, 60, 60),
    );
  });

  it('leaves the rect unchanged when outside threshold', () => {
    const moved = rect(100, 100, 60, 60);
    expect(alignSnapRect(moved, { canvas, others: [] }, 8)).toEqual(moved);
  });

  it('snaps center X/Y independently to another item center', () => {
    const other = rect(200, 40, 80, 40); // center (240, 60)
    // Only X near other center; Y far from everything
    const nearX = rect(205, 150, 60, 60); // center (235, 180)
    expect(alignSnapRect(nearX, { canvas, others: [other] }, 8)).toEqual(
      rect(210, 150, 60, 60),
    );

    // Only Y near other center
    const nearY = rect(40, 25, 60, 60); // center (70, 55)
    expect(alignSnapRect(nearY, { canvas, others: [other] }, 8)).toEqual(
      rect(40, 30, 60, 60),
    );
  });

  it('picks the closest target when multiple are in range', () => {
    const a = rect(100, 0, 40, 40); // center X 120
    const b = rect(130, 0, 40, 40); // center X 150
    // Item center X 124 — closer to 120 than 150, both within 8
    const moved = rect(94, 200, 60, 60); // center (124, 230)
    expect(alignSnapRect(moved, { canvas, others: [a, b] }, 8)).toEqual(
      rect(90, 200, 60, 60),
    );
  });

  it('does not change size', () => {
    const moved = rect(168, 118, 72, 48);
    const snapped = alignSnapRect(moved, { canvas, others: [] }, 8);
    expect(snapped.width).toBe(72);
    expect(snapped.height).toBe(48);
  });
});

describe('activeAlignGuides', () => {
  it('reports page mid guides when center is near page mid', () => {
    const moved = rect(168, 118, 60, 60);
    expect(activeAlignGuides(moved, { canvas, others: [] }, 8)).toEqual({
      vertical: [200],
      horizontal: [150],
    });
  });

  it('reports empty guides when far from all targets', () => {
    const moved = rect(10, 10, 40, 40);
    expect(activeAlignGuides(moved, { canvas, others: [] }, 8)).toEqual({
      vertical: [],
      horizontal: [],
    });
  });

  it('reports another item center when aligned', () => {
    const other = rect(200, 40, 80, 40); // center (240, 60)
    const moved = rect(210, 30, 60, 60); // center (240, 60)
    expect(activeAlignGuides(moved, { canvas, others: [other] }, 8)).toEqual({
      vertical: [240],
      horizontal: [60],
    });
  });
});
