import type { ClockWidget, Widget } from '../schemas/widget';
import type { Size } from './types';

/** Synthetic id for the display-only empty-narrow clock (never persisted). */
export const NARROW_FALLBACK_CLOCK_ID = '__narrow_fallback_clock__';

export function isNarrowFallbackClockId(id: string): boolean {
  return id === NARROW_FALLBACK_CLOCK_ID;
}

export function hasNarrowKeepers(
  dials: Array<{ showWhenNarrow?: boolean }>,
  widgets: Array<{ showWhenNarrow?: boolean }>,
): boolean {
  return (
    dials.some((d) => d.showWhenNarrow === true) ||
    widgets.some((w) => w.showWhenNarrow === true)
  );
}

/** Prefer the top-left-most page clock; else a large synthetic clock. */
export function pickNarrowFallbackClock(
  widgets: Widget[],
  viewport: Size,
): ClockWidget {
  const clocks = widgets.filter((w): w is ClockWidget => w.type === 'clock');
  if (clocks.length > 0) {
    return clocks.slice().sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      return a.id.localeCompare(b.id);
    })[0]!;
  }
  return createNarrowFallbackClock(viewport);
}

/** Large temporary clock sized for phone viewports (display-only). */
export function createNarrowFallbackClock(viewport: Size): ClockWidget {
  const width = Math.max(64, Math.round(viewport.width * 0.8));
  const height = Math.max(
    64,
    Math.round(Math.min(viewport.height * 0.4, 220)),
  );
  return {
    id: NARROW_FALLBACK_CLOCK_ID,
    type: 'clock',
    x: 0,
    y: 0,
    width,
    height,
    format: '24h',
    showSeconds: false,
    showDate: true,
    showWhenNarrow: false,
  };
}
