import type { Point, Rect } from './types';

/** Snap a scalar toward the nearest grid line when within threshold (or always when threshold omitted / Infinity). */
export function snapScalar(
  n: number,
  gridSize: number,
  threshold?: number,
  origin = 0,
): number {
  if (gridSize <= 0) return n;
  const nearest = origin + Math.round((n - origin) / gridSize) * gridSize;
  if (threshold === undefined || threshold === Infinity) return nearest;
  return Math.abs(n - nearest) <= threshold ? nearest : n;
}

/**
 * Snap x/y/w/h independently to the grid.
 * When `threshold` is set, soft-snaps (only when within threshold of a grid line).
 * Width/height become multiples of gridSize when snapped (min one cell).
 * Position snaps relative to `origin` (default top-left / `{ x: 0, y: 0 }`).
 */
export function snapRect(
  rect: Rect,
  gridSize: number,
  threshold?: number,
  origin: Point = { x: 0, y: 0 },
): Rect {
  if (gridSize <= 0) return { ...rect };

  const soft = threshold !== undefined && threshold !== Infinity;

  let width: number;
  let height: number;

  if (soft) {
    const nearestW = Math.max(
      gridSize,
      Math.round(rect.width / gridSize) * gridSize,
    );
    const nearestH = Math.max(
      gridSize,
      Math.round(rect.height / gridSize) * gridSize,
    );
    width =
      Math.abs(rect.width - nearestW) <= threshold ? nearestW : rect.width;
    height =
      Math.abs(rect.height - nearestH) <= threshold ? nearestH : rect.height;
  } else {
    width = Math.max(gridSize, Math.round(rect.width / gridSize) * gridSize);
    height = Math.max(gridSize, Math.round(rect.height / gridSize) * gridSize);
  }

  return {
    x: snapScalar(rect.x, gridSize, threshold, origin.x),
    y: snapScalar(rect.y, gridSize, threshold, origin.y),
    width,
    height,
  };
}
