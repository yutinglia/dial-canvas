import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildBingImageUrl,
  buildBingThumbUrl,
  fetchBingArchiveJson,
  normalizeBingDate,
  parseBingWallpaperListResponse,
  parseBingWallpaperResponse,
  requestBingWallpaper,
  requestBingWallpaperList,
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

describe('buildBingThumbUrl', () => {
  it('builds a resized URL from urlbase', () => {
    expect(buildBingThumbUrl('/th?id=OHR.example', 'https://fallback')).toBe(
      'https://www.bing.com/th?id=OHR.example_640x360.jpg',
    );
  });

  it('falls back to the full image URL', () => {
    expect(buildBingThumbUrl('', 'https://www.bing.com/full.jpg')).toBe(
      'https://www.bing.com/full.jpg',
    );
    expect(buildBingThumbUrl(null, 'https://www.bing.com/full.jpg')).toBe(
      'https://www.bing.com/full.jpg',
    );
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
              title: 'Example peak',
              copyright: '© Example Photographer',
            },
          ],
        },
        '2026-08-02',
      ),
    ).toEqual({
      ok: true,
      url: 'https://www.bing.com/th?id=OHR.example_1920x1080.jpg',
      date: '2026-08-02',
      title: 'Example peak',
      copyright: '© Example Photographer',
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

describe('parseBingWallpaperListResponse', () => {
  it('parses multiple images with thumbnails and titles', () => {
    expect(
      parseBingWallpaperListResponse(
        {
          images: [
            {
              url: '/th?id=OHR.today_1920x1080.jpg',
              urlbase: '/th?id=OHR.today',
              startdate: '20260801',
              title: 'Today view',
              copyright: '© Today Photographer',
            },
            {
              url: '/th?id=OHR.yesterday_1920x1080.jpg',
              urlbase: '/th?id=OHR.yesterday',
              startdate: '20260731',
            },
          ],
        },
        '2026-08-01',
      ),
    ).toEqual({
      ok: true,
      images: [
        {
          url: 'https://www.bing.com/th?id=OHR.today_1920x1080.jpg',
          thumbUrl: 'https://www.bing.com/th?id=OHR.today_640x360.jpg',
          date: '2026-08-01',
          title: 'Today view',
          copyright: '© Today Photographer',
        },
        {
          url: 'https://www.bing.com/th?id=OHR.yesterday_1920x1080.jpg',
          thumbUrl: 'https://www.bing.com/th?id=OHR.yesterday_640x360.jpg',
          date: '2026-07-31',
        },
      ],
    });
  });

  it('skips invalid entries and falls back date for the first image', () => {
    expect(
      parseBingWallpaperListResponse(
        {
          images: [
            { url: '/th?id=OHR.a' },
            { url: '' },
            { url: '/th?id=OHR.b', startdate: '20260730' },
          ],
        },
        '2026-08-01',
      ),
    ).toEqual({
      ok: true,
      images: [
        {
          url: 'https://www.bing.com/th?id=OHR.a',
          thumbUrl: 'https://www.bing.com/th?id=OHR.a',
          date: '2026-08-01',
        },
        {
          url: 'https://www.bing.com/th?id=OHR.b',
          thumbUrl: 'https://www.bing.com/th?id=OHR.b',
          date: '2026-07-30',
        },
      ],
    });
  });

  it('returns errors for empty or invalid payloads', () => {
    expect(parseBingWallpaperListResponse(null)).toEqual({
      ok: false,
      error: 'Invalid Bing response.',
    });
    expect(parseBingWallpaperListResponse({ images: [] })).toEqual({
      ok: false,
      error: 'No Bing wallpaper images.',
    });
    expect(parseBingWallpaperListResponse({ images: [{}] })).toEqual({
      ok: false,
      error: 'Bing wallpaper URL missing.',
    });
  });
});

describe('fetchBingArchiveJson / request helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ images: [{ url: '/th?id=OHR.x' }] }),
      })),
    );
    await expect(
      fetchBingArchiveJson('https://www.bing.com/HPImageArchive.aspx'),
    ).resolves.toEqual({
      ok: true,
      data: { images: [{ url: '/th?id=OHR.x' }] },
    });
  });

  it('maps HTTP and network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => ({}),
      })),
    );
    await expect(
      fetchBingArchiveJson('https://www.bing.com/HPImageArchive.aspx'),
    ).resolves.toEqual({ ok: false, error: 'HTTP 503' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await expect(
      fetchBingArchiveJson('https://www.bing.com/HPImageArchive.aspx'),
    ).resolves.toEqual({
      ok: false,
      error: 'Failed to fetch Bing wallpaper (offline).',
    });
  });

  it('maps abort timeouts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      }),
    );
    await expect(
      fetchBingArchiveJson('https://www.bing.com/HPImageArchive.aspx'),
    ).resolves.toEqual({ ok: false, error: 'Request timed out.' });
  });

  it('requestBingWallpaper and list wrap fetch + parse', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          images: [
            {
              url: '/th?id=OHR.example_1920x1080.jpg',
              urlbase: '/th?id=OHR.example',
              startdate: '20260801',
            },
          ],
        }),
      })),
    );
    await expect(requestBingWallpaper()).resolves.toMatchObject({
      ok: true,
      url: 'https://www.bing.com/th?id=OHR.example_1920x1080.jpg',
    });
    await expect(requestBingWallpaperList()).resolves.toMatchObject({
      ok: true,
      images: [
        expect.objectContaining({
          url: 'https://www.bing.com/th?id=OHR.example_1920x1080.jpg',
        }),
      ],
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })),
    );
    await expect(requestBingWallpaper()).resolves.toEqual({
      ok: false,
      error: 'HTTP 500',
    });
    await expect(requestBingWallpaperList()).resolves.toEqual({
      ok: false,
      error: 'HTTP 500',
    });
  });
});
