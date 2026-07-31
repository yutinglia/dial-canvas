import { describe, expect, it } from 'vitest';
import {
  buildBingImageUrl,
  normalizeBingDate,
  parseBingWallpaperResponse,
  utcDateString,
} from './bingWallpaper';

describe('utcDateString', () => {
  it('formats a date as YYYY-MM-DD in UTC', () => {
    expect(utcDateString(new Date('2026-08-01T12:34:56.000Z'))).toBe(
      '2026-08-01',
    );
  });
});

describe('normalizeBingDate', () => {
  it('parses YYYYMMDD startdate', () => {
    expect(normalizeBingDate('20260801')).toBe('2026-08-01');
  });

  it('keeps ISO date prefixes', () => {
    expect(normalizeBingDate('2026-08-01T00:00:00')).toBe('2026-08-01');
  });

  it('returns undefined for invalid values', () => {
    expect(normalizeBingDate('')).toBeUndefined();
    expect(normalizeBingDate(42)).toBeUndefined();
    expect(normalizeBingDate('not-a-date')).toBeUndefined();
  });
});

describe('buildBingImageUrl', () => {
  it('resolves relative Bing paths', () => {
    expect(buildBingImageUrl('/th?id=OHR.example')).toBe(
      'https://www.bing.com/th?id=OHR.example',
    );
  });

  it('accepts protocol-relative and absolute URLs', () => {
    expect(buildBingImageUrl('//www.bing.com/th?id=OHR.example')).toBe(
      'https://www.bing.com/th?id=OHR.example',
    );
    expect(buildBingImageUrl('https://www.bing.com/th?id=OHR.example')).toBe(
      'https://www.bing.com/th?id=OHR.example',
    );
  });

  it('returns undefined for empty values', () => {
    expect(buildBingImageUrl('')).toBeUndefined();
    expect(buildBingImageUrl(null)).toBeUndefined();
  });
});

describe('parseBingWallpaperResponse', () => {
  it('parses a normal archive payload using the fetch-day date', () => {
    expect(
      parseBingWallpaperResponse(
        {
          images: [
            {
              url: '/th?id=OHR.example_1920x1080.jpg',
              startdate: '20260801',
            },
          ],
        },
        '2026-08-02',
      ),
    ).toEqual({
      ok: true,
      url: 'https://www.bing.com/th?id=OHR.example_1920x1080.jpg',
      date: '2026-08-02',
    });
  });

  it('falls back to the provided date when startdate is missing', () => {
    expect(
      parseBingWallpaperResponse(
        { images: [{ url: '/th?id=OHR.example' }] },
        '2026-08-02',
      ),
    ).toEqual({
      ok: true,
      url: 'https://www.bing.com/th?id=OHR.example',
      date: '2026-08-02',
    });
  });

  it('returns errors for empty or invalid payloads', () => {
    expect(parseBingWallpaperResponse(null)).toEqual({
      ok: false,
      error: 'Invalid Bing response.',
    });
    expect(parseBingWallpaperResponse({ images: [] })).toEqual({
      ok: false,
      error: 'No Bing wallpaper images.',
    });
    expect(parseBingWallpaperResponse({ images: [{}] })).toEqual({
      ok: false,
      error: 'Bing wallpaper URL missing.',
    });
  });
});
