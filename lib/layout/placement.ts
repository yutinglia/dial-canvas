import { alignSnapRect } from './align';
import { hasOverlap, intersects } from './collision';
import { snapRect } from './snap';
import type { Point, Rect, Size } from './types';

export type DropSettings = {
  gridSize: number;
  snapEnabled: boolean;
  /** Soft-snap distance; omit for hard snap when enabled. */
  snapThreshold?: number;
};

/** Canvas mid — origin for the center-anchored snap grid. */
export function canvasOrigin(canvas: Size): Point {
  return { x: canvas.width / 2, y: canvas.height / 2 };
}

/** First lattice value `origin + k*step` that is >= min. */
export function firstLatticeAtOrAbove(
  min: number,
  origin: number,
  step: number,
): number {
  return origin + Math.ceil((min - origin) / step) * step;
}

/** Lattice coordinates in [min, max] inclusive, centered on origin. */
export function latticeRange(
  min: number,
  max: number,
  origin: number,
  step: number,
): number[] {
  const out: number[] = [];
  if (step <= 0 || max < min) return out;
  let v = firstLatticeAtOrAbove(min, origin, step);
  for (; v <= max; v += step) out.push(v);
  return out;
}

/** Closest lattice value in [min, max] to `value` (falls back to min if empty). */
function nearestLatticeInRange(
  value: number,
  origin: number,
  step: number,
  min: number,
  max: number,
): number {
  const values = latticeRange(min, max, origin, step);
  if (values.length === 0) return min;
  let best = values[0]!;
  let bestDist = Math.abs(best - value);
  for (let i = 1; i < values.length; i++) {
    const v = values[i]!;
    const dist = Math.abs(v - value);
    if (dist < bestDist) {
      best = v;
      bestDist = dist;
    }
  }
  return best;
}

export function clampRect(rect: Rect, canvas: Size): Rect {
  const width = Math.min(Math.max(rect.width, 1), canvas.width);
  const height = Math.min(Math.max(rect.height, 1), canvas.height);
  const x = Math.min(Math.max(rect.x, 0), Math.max(0, canvas.width - width));
  const y = Math.min(Math.max(rect.y, 0), Math.max(0, canvas.height - height));
  return { x, y, width, height };
}

/**
 * Keep a rect's offset from canvas mid when the canvas size changes.
 * Translates by half the size delta, then clamps into the new canvas.
 */
export function shiftRectForCanvasResize(
  rect: Rect,
  prev: Size,
  next: Size,
): Rect {
  if (prev.width === next.width && prev.height === next.height) {
    return clampRect(rect, next);
  }
  const dx = (next.width - prev.width) / 2;
  const dy = (next.height - prev.height) / 2;
  return clampRect(
    {
      ...rect,
      x: rect.x + dx,
      y: rect.y + dy,
    },
    next,
  );
}

/**
 * Commit a proposed rect: optional snap → clamp → no-overlap check.
 * When snap is on: grid snap (center origin) → center align snap → clamp.
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
    next = snapRect(
      next,
      settings.gridSize,
      settings.snapThreshold,
      canvasOrigin(canvasSize),
    );
    const threshold = settings.snapThreshold;
    if (threshold !== undefined && Number.isFinite(threshold)) {
      next = alignSnapRect(
        next,
        { canvas: canvasSize, others },
        threshold,
      );
    }
  }
  next = clampRect(next, canvasSize);
  if (hasOverlap(next, others)) {
    return { ...previousValid };
  }
  return next;
}

/**
 * Commit a multi-item translate: snap/align the primary rect, apply the same
 * delta to every origin, clamp each, then all-or-nothing overlap revert.
 */
export function resolveGroupDrop(
  primaryId: string,
  proposedPrimary: Rect,
  origins: Record<string, Rect>,
  others: Rect[],
  settings: DropSettings,
  canvasSize: Size,
): Record<string, Rect> {
  const primaryOrigin = origins[primaryId];
  if (!primaryOrigin) {
    const copy: Record<string, Rect> = {};
    for (const [id, origin] of Object.entries(origins)) {
      copy[id] = { ...origin };
    }
    return copy;
  }

  let nextPrimary = { ...proposedPrimary };
  if (settings.snapEnabled) {
    nextPrimary = snapRect(
      nextPrimary,
      settings.gridSize,
      settings.snapThreshold,
      canvasOrigin(canvasSize),
    );
    const threshold = settings.snapThreshold;
    if (threshold !== undefined && Number.isFinite(threshold)) {
      nextPrimary = alignSnapRect(
        nextPrimary,
        { canvas: canvasSize, others },
        threshold,
      );
    }
  }
  nextPrimary = clampRect(nextPrimary, canvasSize);

  const dx = nextPrimary.x - primaryOrigin.x;
  const dy = nextPrimary.y - primaryOrigin.y;

  const translated: Record<string, Rect> = {};
  for (const [id, origin] of Object.entries(origins)) {
    translated[id] = clampRect(
      { ...origin, x: origin.x + dx, y: origin.y + dy },
      canvasSize,
    );
  }

  const revert = (): Record<string, Rect> => {
    const reverted: Record<string, Rect> = {};
    for (const [id, origin] of Object.entries(origins)) {
      reverted[id] = { ...origin };
    }
    return reverted;
  };

  for (const rect of Object.values(translated)) {
    if (hasOverlap(rect, others)) {
      return revert();
    }
  }

  // Independent edge-clamps can collapse siblings onto each other.
  const memberIds = Object.keys(translated);
  for (let i = 0; i < memberIds.length; i += 1) {
    for (let j = i + 1; j < memberIds.length; j += 1) {
      const a = translated[memberIds[i]!]!;
      const b = translated[memberIds[j]!]!;
      if (intersects(a, b)) {
        return revert();
      }
    }
  }

  return translated;
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

/** Default clock widget size in grid cells (10×6). */
export function defaultClockWidgetSize(gridSize: number): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(64, gridSize * 10),
    height: Math.max(64, gridSize * 6),
  };
}

/** Default weather widget size in grid cells (10×7). */
export function defaultWeatherWidgetSize(gridSize: number): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(64, gridSize * 10),
    height: Math.max(64, gridSize * 7),
  };
}

/** Default note widget size in grid cells (10×8). */
export function defaultNoteWidgetSize(gridSize: number): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(64, gridSize * 10),
    height: Math.max(64, gridSize * 8),
  };
}

/** Default todo widget size in grid cells (10×10). */
export function defaultTodoWidgetSize(gridSize: number): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(64, gridSize * 10),
    height: Math.max(64, gridSize * 10),
  };
}

/** Default calendar widget size in grid cells (12×11). */
export function defaultCalendarWidgetSize(gridSize: number): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(64, gridSize * 12),
    height: Math.max(64, gridSize * 11),
  };
}

/** Default holidays widget size in grid cells (10×10). */
export function defaultHolidaysWidgetSize(gridSize: number): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(64, gridSize * 10),
    height: Math.max(64, gridSize * 10),
  };
}

/** Default wallpaper info widget size in grid cells (12×5). */
export function defaultWallpaperInfoWidgetSize(gridSize: number): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(64, gridSize * 12),
    height: Math.max(64, gridSize * 5),
  };
}

/** Scan center-origin grid slots from top-left for the first free placement. */
export function findFirstFreeSlot(
  others: Rect[],
  gridSize: number,
  canvasSize: Size,
  size = defaultDialSize(gridSize),
): Rect {
  const step = Math.max(1, gridSize);
  const origin = canvasOrigin(canvasSize);
  const maxX = Math.max(0, canvasSize.width - size.width);
  const maxY = Math.max(0, canvasSize.height - size.height);
  const xs = latticeRange(0, maxX, origin.x, step);
  const ys = latticeRange(0, maxY, origin.y, step);

  for (const y of ys) {
    for (const x of xs) {
      const candidate: Rect = { x, y, width: size.width, height: size.height };
      if (!hasOverlap(candidate, others)) return candidate;
    }
  }

  // Fallback: first lattice slot (or top-left) even if overlapping.
  return {
    x: xs[0] ?? 0,
    y: ys[0] ?? 0,
    width: size.width,
    height: size.height,
  };
}

/**
 * Place near a preferred point: snap to center-origin grid, clamp, then expand in
 * Chebyshev rings until a free slot is found (falls back to findFirstFreeSlot).
 */
export function findNearestFreeSlot(
  preferred: Point,
  others: Rect[],
  gridSize: number,
  canvasSize: Size,
  size = defaultDialSize(gridSize),
): Rect {
  const step = Math.max(1, gridSize);
  const origin = canvasOrigin(canvasSize);
  const maxX = Math.max(0, canvasSize.width - size.width);
  const maxY = Math.max(0, canvasSize.height - size.height);

  const startX = nearestLatticeInRange(
    preferred.x,
    origin.x,
    step,
    0,
    maxX,
  );
  const startY = nearestLatticeInRange(
    preferred.y,
    origin.y,
    step,
    0,
    maxY,
  );
  const start: Rect = {
    x: startX,
    y: startY,
    width: size.width,
    height: size.height,
  };

  if (!hasOverlap(start, others)) return start;

  const maxRadius = Math.ceil(Math.max(maxX, maxY) / step) + 1;

  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = start.x + dx * step;
        const y = start.y + dy * step;
        if (x < 0 || y < 0 || x > maxX || y > maxY) continue;
        const candidate: Rect = {
          x,
          y,
          width: size.width,
          height: size.height,
        };
        if (!hasOverlap(candidate, others)) return candidate;
      }
    }
  }

  return findFirstFreeSlot(others, gridSize, canvasSize, size);
}
