import { describe, expect, it } from 'vitest';
import { isBingCacheFresh } from './canvasBackground';
import { utcDateString } from './bingWallpaper';

describe('isBingCacheFresh', () => {
  it('treats locked cache with url as fresh', () => {
    expect(
      isBingCacheFresh({
        type: 'bing',
        fit: 'cover',
        opacity: 1,
        locked: true,
        cachedUrl: 'https://example.com/a.jpg',
        cachedDate: '2000-01-01',
      }),
    ).toBe(true);
  });

  it('requires today utc date when unlocked', () => {
    const today = utcDateString();
    expect(
      isBingCacheFresh({
        type: 'bing',
        fit: 'cover',
        opacity: 1,
        locked: false,
        cachedUrl: 'https://example.com/a.jpg',
        cachedDate: today,
      }),
    ).toBe(true);
    expect(
      isBingCacheFresh({
        type: 'bing',
        fit: 'cover',
        opacity: 1,
        locked: false,
        cachedUrl: 'https://example.com/a.jpg',
        cachedDate: '2000-01-01',
      }),
    ).toBe(false);
  });
});
