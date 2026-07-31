import { describe, expect, it } from 'vitest';
import { formatWallpaperInfo } from './wallpaperInfo';

describe('formatWallpaperInfo', () => {
  it('describes solid color backgrounds', () => {
    expect(
      formatWallpaperInfo({ type: 'color', value: '#1a1d23' }),
    ).toEqual({
      kind: 'color',
      title: 'Solid color',
      subtitle: '#1a1d23',
    });
  });

  it('describes uploaded and remote images', () => {
    expect(
      formatWallpaperInfo({
        type: 'image',
        value: 'data:image/png;base64,abc',
        fit: 'cover',
        opacity: 1,
      }),
    ).toMatchObject({
      kind: 'image',
      title: 'Uploaded image',
    });

    expect(
      formatWallpaperInfo({
        type: 'image',
        value: 'https://example.com/wall.jpg',
        fit: 'cover',
        opacity: 1,
      }),
    ).toMatchObject({
      kind: 'image',
      title: 'Custom image',
      subtitle: 'https://example.com/wall.jpg',
    });
  });

  it('uses Bing cached title and copyright', () => {
    expect(
      formatWallpaperInfo(
        {
          type: 'bing',
          fit: 'cover',
          opacity: 1,
          cachedUrl: 'https://www.bing.com/th?id=OHR.example',
          cachedDate: '2026-08-01',
          cachedTitle: 'Mountain lake',
          cachedCopyright: '© Photographer',
          locked: false,
        },
        { showCopyright: true },
      ),
    ).toEqual({
      kind: 'bing',
      title: 'Mountain lake',
      subtitle: '© Photographer',
    });

    expect(
      formatWallpaperInfo(
        {
          type: 'bing',
          fit: 'cover',
          opacity: 1,
          cachedUrl: 'https://www.bing.com/th?id=OHR.example',
          cachedDate: '2026-08-01',
          cachedTitle: 'Mountain lake',
          cachedCopyright: '© Photographer',
          locked: false,
        },
        { showCopyright: false },
      ).subtitle,
    ).toBe('2026-08-01');
  });

  it('marks empty Bing cache', () => {
    expect(
      formatWallpaperInfo({
        type: 'bing',
        fit: 'cover',
        opacity: 1,
        locked: false,
      }),
    ).toMatchObject({
      kind: 'bing',
      empty: true,
    });
  });
});
