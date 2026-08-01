import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyBackground,
  canvasBackgroundColor,
  isBingCacheFresh,
} from './canvasBackground';
import { utcDateString } from './bingWallpaper';
import { DEFAULT_SETTINGS } from '../schemas/settings';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubCssRoot() {
  const props = new Map<string, string>();
  const root = {
    style: {
      setProperty: (key: string, value: string) => {
        props.set(key, value);
      },
    },
  };
  vi.stubGlobal('document', { documentElement: root });
  return props;
}

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

describe('applyBackground', () => {
  it('applies solid color backgrounds', () => {
    const props = stubCssRoot();
    applyBackground({
      ...DEFAULT_SETTINGS,
      background: { type: 'color', value: '#112233' },
    });
    expect(props.get('--canvas-bg')).toBe('#112233');
    expect(props.get('--canvas-bg-image')).toBe('none');
  });

  it('applies image fits including tile and contain', () => {
    const props = stubCssRoot();
    applyBackground({
      ...DEFAULT_SETTINGS,
      background: {
        type: 'image',
        value: 'https://example.com/a"b.jpg',
        fit: 'tile',
        opacity: 0.5,
      },
    });
    expect(props.get('--canvas-bg-image')).toBe(
      'url("https://example.com/a\\"b.jpg")',
    );
    expect(props.get('--canvas-bg-size')).toBe('auto');
    expect(props.get('--canvas-bg-repeat')).toBe('repeat');
    expect(props.get('--canvas-bg-opacity')).toBe('0.5');

    applyBackground({
      ...DEFAULT_SETTINGS,
      background: {
        type: 'image',
        value: 'https://example.com/a.jpg',
        fit: 'contain',
        opacity: 1,
      },
    });
    expect(props.get('--canvas-bg-size')).toBe('contain');
    expect(props.get('--canvas-bg-repeat')).toBe('no-repeat');
  });

  it('applies bing cache or clears when missing', () => {
    const props = stubCssRoot();
    applyBackground({
      ...DEFAULT_SETTINGS,
      background: {
        type: 'bing',
        fit: 'cover',
        opacity: 1,
        locked: false,
      },
    });
    expect(props.get('--canvas-bg-image')).toBe('none');

    applyBackground({
      ...DEFAULT_SETTINGS,
      background: {
        type: 'bing',
        fit: 'cover',
        opacity: 0.8,
        locked: false,
        cachedUrl: 'https://example.com/bing.jpg',
      },
    });
    expect(props.get('--canvas-bg-image')).toBe(
      'url("https://example.com/bing.jpg")',
    );
    expect(props.get('--canvas-bg-size')).toBe('cover');
  });
});

describe('canvasBackgroundColor', () => {
  it('returns color values or the css fallback', () => {
    expect(canvasBackgroundColor(undefined)).toBe('var(--canvas-bg)');
    expect(
      canvasBackgroundColor({ type: 'color', value: '#abc' }),
    ).toBe('#abc');
    expect(
      canvasBackgroundColor({
        type: 'image',
        value: 'https://example.com/a.jpg',
        fit: 'cover',
        opacity: 1,
      }),
    ).toBe('var(--canvas-bg)');
  });
});
