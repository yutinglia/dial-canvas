import { describe, expect, it } from 'vitest';
import {
  ClockWidgetSchema,
  WeatherWidgetSchema,
  WidgetSchema,
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
