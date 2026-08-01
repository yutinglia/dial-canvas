import { describe, expect, it } from 'vitest';
import {
  defaultSizeForType,
  createWidget,
} from './createWidget';
import type { WidgetType } from '../schemas/widget';

const slot = { x: 10, y: 20, width: 160, height: 96 };
const types: WidgetType[] = [
  'clock',
  'weather',
  'note',
  'todo',
  'calendar',
  'holidays',
  'wallpaperInfo',
];

describe('defaultSizeForType', () => {
  it('returns a positive size for every widget type', () => {
    for (const type of types) {
      const size = defaultSizeForType(type, 20);
      expect(size.width).toBeGreaterThanOrEqual(64);
      expect(size.height).toBeGreaterThanOrEqual(64);
    }
  });
});

describe('createWidget', () => {
  it('creates typed widgets with sensible defaults', () => {
    const clock = createWidget('clock', slot);
    expect(clock).toMatchObject({
      type: 'clock',
      format: '24h',
      showSeconds: false,
      showDate: true,
      showWhenNarrow: false,
      ...slot,
    });
    expect(clock.id).toBeTruthy();

    expect(createWidget('weather', slot)).toMatchObject({
      type: 'weather',
      units: 'metric',
      ...slot,
    });
    expect(createWidget('note', slot)).toMatchObject({
      type: 'note',
      title: '',
      text: '',
      ...slot,
    });
    expect(createWidget('todo', slot)).toMatchObject({
      type: 'todo',
      title: '',
      items: [],
      ...slot,
    });
    expect(createWidget('calendar', slot)).toMatchObject({
      type: 'calendar',
      weekStartsOn: 'monday',
      ...slot,
    });
    expect(createWidget('holidays', slot)).toMatchObject({
      type: 'holidays',
      limit: 8,
      ...slot,
    });
    expect(createWidget('wallpaperInfo', slot)).toMatchObject({
      type: 'wallpaperInfo',
      showCopyright: true,
      ...slot,
    });
  });
});
