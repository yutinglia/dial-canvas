import { hasOverlap } from './collision';
import { snapRect } from './snap';
import type { Point, Rect, Size } from './types';

export type DropSettings = {
  gridSize: number;
  snapEnabled: boolean;
  /** Soft-snap distance; omit for hard snap when enabled. */
  snapThreshold?: number;
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
    next = snapRect(next, settings.gridSize, settings.snapThreshold);
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

/**
 * Place near a preferred point: snap to grid, clamp, then expand in
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
  const start = clampRect(
    {
      x: Math.round(preferred.x / step) * step,
      y: Math.round(preferred.y / step) * step,
      width: size.width,
      height: size.height,
    },
    canvasSize,
  );

  if (!hasOverlap(start, others)) return start;

  const maxX = Math.max(0, canvasSize.width - size.width);
  const maxY = Math.max(0, canvasSize.height - size.height);
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
