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

/**
 * Snap x/y/w/h independently to the grid.
 * When `threshold` is set, soft-snaps (only when within threshold of a grid line).
 * Width/height become multiples of gridSize when snapped (min one cell).
 */
export function snapRect(
  rect: Rect,
  gridSize: number,
  threshold?: number,
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
    x: snapScalar(rect.x, gridSize, threshold),
    y: snapScalar(rect.y, gridSize, threshold),
    width,
    height,
  };
}
