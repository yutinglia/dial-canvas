import type { Rect } from './types';

/** Axis-aligned bounding box intersection (no padding). */
export function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function hasOverlap(candidate: Rect, others: Rect[]): boolean {
  return others.some((other) => intersects(candidate, other));
}
