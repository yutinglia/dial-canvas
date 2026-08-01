import type { Rect } from './types';

/** Build occupied rects from dials and widgets that share x/y/w/h. */
export function occupiedRects(
  dials: Array<{ x: number; y: number; width: number; height: number }>,
  widgets: Array<{ x: number; y: number; width: number; height: number }>,
): Rect[] {
  return [
    ...dials.map((d) => ({
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
    })),
    ...widgets.map((w) => ({
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
    })),
  ];
}
