import { describe, expect, it } from 'vitest';
import {
  BackgroundSchema,
  MAX_WALLPAPER_DATA_URL_LENGTH,
  SettingsSchema,
} from './settings';

describe('BackgroundSchema wallpaper values', () => {
  it('accepts http(s) and data:image wallpapers', () => {
    expect(
      BackgroundSchema.safeParse({
        type: 'image',
        value: 'https://example.com/a.jpg',
      }).success,
    ).toBe(true);
    expect(
      BackgroundSchema.safeParse({
        type: 'image',
        value: 'data:image/png;base64,abc',
      }).success,
    ).toBe(true);
    expect(
      BackgroundSchema.safeParse({
        type: 'bing',
        cachedUrl: 'http://example.com/b.jpg',
      }).success,
    ).toBe(true);
  });

  it('rejects disallowed schemes and oversized data urls', () => {
    expect(
      BackgroundSchema.safeParse({
        type: 'image',
        value: 'file:///tmp/a.jpg',
      }).success,
    ).toBe(false);
    expect(
      BackgroundSchema.safeParse({
        type: 'image',
        value: 'data:text/plain,hi',
      }).success,
    ).toBe(false);
    expect(
      BackgroundSchema.safeParse({
        type: 'image',
        value: `data:image/png;base64,${'a'.repeat(MAX_WALLPAPER_DATA_URL_LENGTH)}`,
      }).success,
    ).toBe(false);
  });

  it('rejects invalid bing cachedDate formats', () => {
    expect(
      BackgroundSchema.safeParse({
        type: 'bing',
        cachedDate: '20260801',
      }).success,
    ).toBe(false);
  });
});

describe('SettingsSchema narrow layout bounds', () => {
  it('rejects out-of-range narrow breakpoints', () => {
    expect(
      SettingsSchema.safeParse({ narrowBreakpoint: 100 }).success,
    ).toBe(false);
    expect(
      SettingsSchema.safeParse({ narrowBreakpoint: 2000 }).success,
    ).toBe(false);
  });
});
