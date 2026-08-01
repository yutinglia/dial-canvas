import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../schemas/settings';
import {
  backgroundsEqual,
  currentFit,
  currentOpacity,
  deriveSource,
} from './backgroundUi';

describe('deriveSource', () => {
  it('maps background types to wallpaper sources', () => {
    expect(deriveSource({ type: 'color', value: '#000' })).toBe('color');
    expect(deriveSource({ type: 'bing', fit: 'cover', opacity: 1, locked: false })).toBe(
      'bing',
    );
    expect(
      deriveSource({
        type: 'image',
        value: 'data:image/png;base64,abc',
        fit: 'cover',
        opacity: 1,
      }),
    ).toBe('upload');
    expect(
      deriveSource({
        type: 'image',
        value: 'https://example.com/bg.jpg',
        fit: 'cover',
        opacity: 1,
      }),
    ).toBe('url');
  });
});

describe('currentFit', () => {
  it('returns cover for color backgrounds', () => {
    expect(currentFit({ type: 'color', value: '#000' })).toBe('cover');
  });

  it('returns stored fit for image and bing backgrounds', () => {
    expect(
      currentFit({
        type: 'image',
        value: 'https://example.com/bg.jpg',
        fit: 'tile',
        opacity: 1,
      }),
    ).toBe('tile');
    expect(
      currentFit({ type: 'bing', fit: 'contain', opacity: 0.5, locked: false }),
    ).toBe('contain');
  });
});

describe('currentOpacity', () => {
  it('returns default opacity for color backgrounds', () => {
    expect(currentOpacity({ type: 'color', value: '#000' })).toBe(1);
  });

  it('returns stored opacity for image and bing backgrounds', () => {
    expect(
      currentOpacity({
        type: 'image',
        value: 'https://example.com/bg.jpg',
        fit: 'cover',
        opacity: 0.75,
      }),
    ).toBe(0.75);
  });
});

describe('backgroundsEqual', () => {
  it('compares backgrounds by serialized value', () => {
    expect(
      backgroundsEqual(DEFAULT_SETTINGS.background, DEFAULT_SETTINGS.background),
    ).toBe(true);
    expect(
      backgroundsEqual(
        { type: 'color', value: '#111' },
        { type: 'color', value: '#222' },
      ),
    ).toBe(false);
  });
});
