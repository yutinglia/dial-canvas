export type { Point, Rect, Size } from './types';
export { occupiedRects } from './occupiedRects';
export { snapScalar, snapRect } from './snap';
export {
  alignSnapRect,
  activeAlignGuides,
  type AlignSnapOptions,
  type AlignGuides,
} from './align';
export { intersects, hasOverlap } from './collision';
export {
  clampRect,
  shiftRectForCanvasResize,
  canvasOrigin,
  firstLatticeAtOrAbove,
  latticeRange,
  resolveDrop,
  resolveGroupDrop,
  defaultDialSize,
  defaultClockWidgetSize,
  defaultWeatherWidgetSize,
  defaultNoteWidgetSize,
  defaultTodoWidgetSize,
  defaultCalendarWidgetSize,
  defaultHolidaysWidgetSize,
  defaultWallpaperInfoWidgetSize,
  findFirstFreeSlot,
  findNearestFreeSlot,
  type DropSettings,
} from './placement';
export { fitCanvasInViewport, type FitScale } from './fitScale';
export {
  layoutNarrowStack,
  NARROW_STACK_GAP,
  type NarrowStackItem,
  type NarrowStackResult,
} from './narrowStack';
export {
  NARROW_FALLBACK_CLOCK_ID,
  createNarrowFallbackClock,
  hasNarrowKeepers,
  isNarrowFallbackClockId,
  pickNarrowFallbackClock,
} from './narrowFallback';
