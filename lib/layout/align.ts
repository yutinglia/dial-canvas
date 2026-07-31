import type { Rect, Size } from './types';

export type AlignSnapOptions = {
  canvas: Size;
  others: Rect[];
};

export type AlignGuides = {
  /** X positions of active vertical guides (page / item centers). */
  vertical: number[];
  /** Y positions of active horizontal guides. */
  horizontal: number[];
};

function centerX(rect: Rect): number {
  return rect.x + rect.width / 2;
}

function centerY(rect: Rect): number {
  return rect.y + rect.height / 2;
}

/** Closest target within threshold, or `null` if none qualify. */
function nearestWithin(
  value: number,
  targets: number[],
  threshold: number,
): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const target of targets) {
    const dist = Math.abs(value - target);
    if (dist <= threshold && dist < bestDist) {
      best = target;
      bestDist = dist;
    }
  }
  return best;
}

function xTargets(canvas: Size, others: Rect[]): number[] {
  return [canvas.width / 2, ...others.map(centerX)];
}

function yTargets(canvas: Size, others: Rect[]): number[] {
  return [canvas.height / 2, ...others.map(centerY)];
}

/**
 * Soft-snap a rect's center to the page mid and other item centers.
 * Adjusts x/y only; size is unchanged. Closest in-range target wins per axis.
 */
export function alignSnapRect(
  rect: Rect,
  { canvas, others }: AlignSnapOptions,
  threshold: number,
): Rect {
  if (threshold < 0) return { ...rect };

  const cx = centerX(rect);
  const cy = centerY(rect);
  const snapX = nearestWithin(cx, xTargets(canvas, others), threshold);
  const snapY = nearestWithin(cy, yTargets(canvas, others), threshold);

  return {
    x: snapX === null ? rect.x : snapX - rect.width / 2,
    y: snapY === null ? rect.y : snapY - rect.height / 2,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Active guide positions for a rect whose center is within threshold of
 * page mid or another item's center.
 */
export function activeAlignGuides(
  rect: Rect,
  { canvas, others }: AlignSnapOptions,
  threshold: number,
): AlignGuides {
  if (threshold < 0) return { vertical: [], horizontal: [] };

  const cx = centerX(rect);
  const cy = centerY(rect);
  const snapX = nearestWithin(cx, xTargets(canvas, others), threshold);
  const snapY = nearestWithin(cy, yTargets(canvas, others), threshold);

  return {
    vertical: snapX === null ? [] : [snapX],
    horizontal: snapY === null ? [] : [snapY],
  };
}
