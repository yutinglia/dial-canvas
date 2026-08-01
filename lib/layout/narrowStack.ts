import { clampRect } from './placement';
import type { Rect, Size } from './types';

export const NARROW_STACK_GAP = 12;

export type NarrowStackItem = Rect & {
  id: string;
  showWhenNarrow?: boolean;
  narrowOrder?: number;
};

export type NarrowStackResult = {
  id: string;
  rect: Rect;
};

function compareNarrowItems(a: NarrowStackItem, b: NarrowStackItem): number {
  const aHasOrder = a.narrowOrder !== undefined;
  const bHasOrder = b.narrowOrder !== undefined;
  if (aHasOrder && bHasOrder && a.narrowOrder !== b.narrowOrder) {
    return a.narrowOrder! - b.narrowOrder!;
  }
  if (aHasOrder !== bHasOrder) {
    return aHasOrder ? -1 : 1;
  }
  if (a.y !== b.y) return a.y - b.y;
  if (a.x !== b.x) return a.x - b.x;
  return a.id.localeCompare(b.id);
}

/**
 * Filter keepers and return center-stacked rects for a narrow viewport.
 * Display-only — does not mutate stored positions.
 */
export function layoutNarrowStack(
  items: NarrowStackItem[],
  viewport: Size,
  gap = NARROW_STACK_GAP,
): NarrowStackResult[] {
  const keepers = items
    .filter((item) => item.showWhenNarrow === true)
    .slice()
    .sort(compareNarrowItems);

  if (keepers.length === 0) return [];

  const totalHeight =
    keepers.reduce((sum, item) => sum + item.height, 0) +
    gap * (keepers.length - 1);
  let y = (viewport.height - totalHeight) / 2;

  const out: NarrowStackResult[] = [];
  for (const item of keepers) {
    const rect = clampRect(
      {
        x: (viewport.width - item.width) / 2,
        y,
        width: item.width,
        height: item.height,
      },
      viewport,
    );
    out.push({ id: item.id, rect });
    y += item.height + gap;
  }
  return out;
}
