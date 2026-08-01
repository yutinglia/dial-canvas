import { createId } from '../id';
import {
  defaultCalendarWidgetSize,
  defaultClockWidgetSize,
  defaultHolidaysWidgetSize,
  defaultNoteWidgetSize,
  defaultTodoWidgetSize,
  defaultWallpaperInfoWidgetSize,
  defaultWeatherWidgetSize,
} from '../layout';
import type { Widget, WidgetType } from '../schemas/widget';

export function defaultSizeForType(
  type: WidgetType,
  grid: number,
): { width: number; height: number } {
  const sizeByType: Record<WidgetType, { width: number; height: number }> = {
    clock: defaultClockWidgetSize(grid),
    weather: defaultWeatherWidgetSize(grid),
    note: defaultNoteWidgetSize(grid),
    todo: defaultTodoWidgetSize(grid),
    calendar: defaultCalendarWidgetSize(grid),
    holidays: defaultHolidaysWidgetSize(grid),
    wallpaperInfo: defaultWallpaperInfoWidgetSize(grid),
  };
  return sizeByType[type];
}

/** Create a new widget of `type` at the given slot (placement already resolved). */
export function createWidget(
  type: WidgetType,
  slot: { x: number; y: number; width: number; height: number },
): Widget {
  const base = {
    id: createId(),
    showWhenNarrow: false,
    ...slot,
  };

  switch (type) {
    case 'clock':
      return {
        ...base,
        type: 'clock',
        format: '24h',
        showSeconds: false,
        showDate: true,
      };
    case 'weather':
      return {
        ...base,
        type: 'weather',
        units: 'metric',
      };
    case 'note':
      return {
        ...base,
        type: 'note',
        title: '',
        text: '',
      };
    case 'todo':
      return {
        ...base,
        type: 'todo',
        title: '',
        items: [],
      };
    case 'calendar':
      return {
        ...base,
        type: 'calendar',
        weekStartsOn: 'monday',
      };
    case 'holidays':
      return {
        ...base,
        type: 'holidays',
        limit: 8,
      };
    case 'wallpaperInfo':
      return {
        ...base,
        type: 'wallpaperInfo',
        showCopyright: true,
      };
  }
}
