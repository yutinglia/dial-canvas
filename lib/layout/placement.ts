import { hasOverlap } from './collision';
import { snapRect } from './snap';
import type { Rect, Size } from './types';

export type DropSettings = {
  gridSize: number;
  snapEnabled: boolean;
};

export function clampRect(rect: Rect, canvas: Size): Rect {
  const width = Math.min(Math.max(rect.width, 1), canvas.width);
  const height = Math.min(Math.max(rect.height, 1), canvas.height);
  const x = Math.min(Math.max(rect.x, 0), Math.max(0, canvas.width - width));
  const y = Math.min(Math.max(rect.y, 0), Math.max(0, canvas.height - height));
  return { x, y, width, height };
}

/**
 * Commit a proposed rect: optional snap → clamp → no-overlap check.
 * On overlap, revert to previousValid.
 */
export function resolveDrop(
  proposed: Rect,
  previousValid: Rect,
  others: Rect[],
  settings: DropSettings,
  canvasSize: Size,
): Rect {
  let next = { ...proposed };
  if (settings.snapEnabled) {
    next = snapRect(next, settings.gridSize);
  }
  next = clampRect(next, canvasSize);
  if (hasOverlap(next, others)) {
    return { ...previousValid };
  }
  return next;
}

/** Default dial size in grid cells (7×6). */
export function defaultDialSize(gridSize: number): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(64, gridSize * 7),
    height: Math.max(64, gridSize * 6),
  };
}

/** Scan snapped slots from top-left for the first free placement. */
export function findFirstFreeSlot(
  others: Rect[],
  gridSize: number,
  canvasSize: Size,
  size = defaultDialSize(gridSize),
): Rect {
  const step = Math.max(1, gridSize);
  const maxX = Math.max(0, canvasSize.width - size.width);
  const maxY = Math.max(0, canvasSize.height - size.height);

  for (let y = 0; y <= maxY; y += step) {
    for (let x = 0; x <= maxX; x += step) {
      const candidate: Rect = { x, y, width: size.width, height: size.height };
      if (!hasOverlap(candidate, others)) return candidate;
    }
  }

  // Fallback: top-left even if overlapping (caller may still place; rare on empty-ish canvas).
  return { x: 0, y: 0, width: size.width, height: size.height };
}
