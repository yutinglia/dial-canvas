import { describe, expect, it } from 'vitest';
import {
  ClockWidgetSchema,
  WeatherWidgetSchema,
  WidgetSchema,
  normalizeWidgetBackgroundColor,
  normalizeWidgetBackgroundOpacity,
} from './widget';

const baseRect = {
  id: 'w1',
  x: 0,
  y: 0,
  width: 160,
  height: 96,
};

describe('WidgetSchema', () => {
  it('parses a clock widget with defaults', () => {
    const parsed = ClockWidgetSchema.parse({
      ...baseRect,
      type: 'clock',
    });
    expect(parsed).toMatchObject({
      type: 'clock',
      format: '24h',
      showSeconds: false,
      showDate: true,
    });
  });

  it('parses a weather widget with location', () => {
    const parsed = WeatherWidgetSchema.parse({
      ...baseRect,
      type: 'weather',
      units: 'imperial',
      location: {
        name: 'Taipei, Taiwan',
        latitude: 25.03,
        longitude: 121.56,
      },
    });
    expect(parsed.units).toBe('imperial');
    expect(parsed.location?.name).toBe('Taipei, Taiwan');
  });

  it('rejects undersized widgets and invalid locations', () => {
    expect(
      WidgetSchema.safeParse({
        ...baseRect,
        type: 'clock',
        width: 32,
      }).success,
    ).toBe(false);
    expect(
      WidgetSchema.safeParse({
        ...baseRect,
        type: 'weather',
        location: { name: 'X', latitude: 200, longitude: 0 },
      }).success,
    ).toBe(false);
  });

  it('accepts optional background styling', () => {
    const parsed = WidgetSchema.parse({
      ...baseRect,
      type: 'clock',
      backgroundColor: '#14161c',
      backgroundOpacity: 0.5,
    });
    expect(parsed.backgroundColor).toBe('#14161c');
    expect(parsed.backgroundOpacity).toBe(0.5);
  });

  it('defaults showWhenNarrow to false and accepts narrowOrder', () => {
    expect(
      WidgetSchema.parse({ ...baseRect, type: 'clock' }).showWhenNarrow,
    ).toBe(false);
    expect(
      WidgetSchema.parse({
        ...baseRect,
        type: 'clock',
        showWhenNarrow: true,
        narrowOrder: 1,
      }),
    ).toMatchObject({ showWhenNarrow: true, narrowOrder: 1 });
  });

  it('accepts optional fontSize and weather iconSize', () => {
    expect(
      WidgetSchema.parse({
        ...baseRect,
        type: 'clock',
        fontSize: 32,
      }).fontSize,
    ).toBe(32);
    expect(
      WidgetSchema.parse({
        ...baseRect,
        type: 'weather',
        fontSize: 28,
        iconSize: 48,
      }),
    ).toMatchObject({ fontSize: 28, iconSize: 48 });
  });

  it('parses note, todo, calendar, holidays, and wallpaperInfo widgets', () => {
    expect(
      WidgetSchema.parse({
        ...baseRect,
        type: 'note',
      }),
    ).toMatchObject({ type: 'note', title: '', text: '' });

    expect(
      WidgetSchema.parse({
        ...baseRect,
        type: 'todo',
        title: 'Today',
        items: [{ id: 't1', text: 'Ship widgets', done: true }],
      }),
    ).toMatchObject({
      type: 'todo',
      title: 'Today',
      items: [{ id: 't1', text: 'Ship widgets', done: true }],
    });

    expect(
      WidgetSchema.parse({
        ...baseRect,
        type: 'calendar',
      }),
    ).toMatchObject({ type: 'calendar', weekStartsOn: 'monday' });

    expect(
      WidgetSchema.parse({
        ...baseRect,
        type: 'holidays',
        countryCode: 'tw',
      }),
    ).toMatchObject({ type: 'holidays', countryCode: 'TW', limit: 8 });

    expect(
      WidgetSchema.parse({
        ...baseRect,
        type: 'wallpaperInfo',
      }),
    ).toMatchObject({ type: 'wallpaperInfo', showCopyright: true });
  });

  it('rejects invalid holidays country codes and oversized todo lists', () => {
    expect(
      WidgetSchema.safeParse({
        ...baseRect,
        type: 'holidays',
        countryCode: 'USA',
      }).success,
    ).toBe(false);
    expect(
      WidgetSchema.safeParse({
        ...baseRect,
        type: 'todo',
        items: Array.from({ length: 51 }, (_, i) => ({
          id: `t${i}`,
          text: 'x',
          done: false,
        })),
      }).success,
    ).toBe(false);
  });

  it('rejects out-of-range fontSize and iconSize', () => {
    expect(
      WidgetSchema.safeParse({
        ...baseRect,
        type: 'clock',
        fontSize: 8,
      }).success,
    ).toBe(false);
    expect(
      WidgetSchema.safeParse({
        ...baseRect,
        type: 'clock',
        fontSize: 80,
      }).success,
    ).toBe(false);
    expect(
      WidgetSchema.safeParse({
        ...baseRect,
        type: 'weather',
        iconSize: 8,
      }).success,
    ).toBe(false);
    expect(
      WidgetSchema.safeParse({
        ...baseRect,
        type: 'weather',
        iconSize: 128,
      }).success,
    ).toBe(false);
  });
});

describe('normalizeWidgetBackground helpers', () => {
  it('delegates color and opacity normalization', () => {
    expect(normalizeWidgetBackgroundColor('#AaBbCc')).toBe('#aabbcc');
    expect(normalizeWidgetBackgroundColor('nope')).toBeUndefined();
    expect(normalizeWidgetBackgroundOpacity(0.5)).toBe(0.5);
    expect(normalizeWidgetBackgroundOpacity(2)).toBeUndefined();
  });
});
