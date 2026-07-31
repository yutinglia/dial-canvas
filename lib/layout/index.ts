export type { Point, Rect, Size } from './types';
export { snapScalar, snapRect } from './snap';
export { intersects, hasOverlap } from './collision';
export {
  clampRect,
  resolveDrop,
  defaultDialSize,
  defaultClockWidgetSize,
  defaultWeatherWidgetSize,
  findFirstFreeSlot,
  type DropSettings,
} from './placement';
