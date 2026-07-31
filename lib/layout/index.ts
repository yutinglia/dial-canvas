export type { Point, Rect, Size } from './types';
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
  canvasOrigin,
  firstLatticeAtOrAbove,
  latticeRange,
  resolveDrop,
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
