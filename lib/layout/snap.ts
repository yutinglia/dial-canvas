import type { Rect } from './types';

/** Snap a scalar toward the nearest grid line when within threshold (or always when threshold omitted / Infinity). */
export function snapScalar(
  n: number,
  gridSize: number,
  threshold?: number,
): number {
  if (gridSize <= 0) return n;
  const nearest = Math.round(n / gridSize) * gridSize;
  if (threshold === undefined || threshold === Infinity) return nearest;
  return Math.abs(n - nearest) <= threshold ? nearest : n;
}

/** Snap x/y/w/h independently to the grid. Width/height become multiples of gridSize (min one cell). */
export function snapRect(rect: Rect, gridSize: number): Rect {
  const width = Math.max(
    gridSize,
    Math.round(rect.width / gridSize) * gridSize,
  );
  const height = Math.max(
    gridSize,
    Math.round(rect.height / gridSize) * gridSize,
  );
  return {
    x: snapScalar(rect.x, gridSize),
    y: snapScalar(rect.y, gridSize),
    width,
    height,
  };
}
