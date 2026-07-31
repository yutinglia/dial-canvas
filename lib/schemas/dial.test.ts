import { describe, expect, it } from 'vitest';
import {
  ALLOWED_DIAL_PROTOCOLS,
  DEFAULT_DIAL_BACKGROUND_COLOR,
  DEFAULT_DIAL_BACKGROUND_OPACITY,
  MAX_FAVICON_DATA_URL_LENGTH,
  dialBackgroundCss,
  isAllowedDialUrl,
  isAllowedFaviconUrl,
  isDialBackgroundColor,
  normalizeDialBackgroundColor,
  normalizeDialBackgroundOpacity,
  normalizeDialUrl,
  normalizeFaviconUrl,
} from './dial';

describe('dial URL protocol policy', () => {
  it('allows http, https, and about', () => {
    expect(ALLOWED_DIAL_PROTOCOLS.has('http:')).toBe(true);
    expect(isAllowedDialUrl('https://example.com/path')).toBe(true);
    expect(isAllowedDialUrl('http://localhost:3000')).toBe(true);
    expect(isAllowedDialUrl('about:blank')).toBe(true);
    expect(isAllowedDialUrl('about:config')).toBe(true);
  });

  it('blocks dangerous schemes', () => {
    expect(isAllowedDialUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedDialUrl('data:text/html,<h1>x</h1>')).toBe(false);
    expect(isAllowedDialUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedDialUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isAllowedDialUrl('not a url')).toBe(false);
  });

  it('normalizes valid dial URLs', () => {
    expect(normalizeDialUrl('  https://example.com  ')).toBe(
      'https://example.com/',
    );
    expect(normalizeDialUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('favicon URL policy', () => {
  it('allows http(s) and short data:image URLs', () => {
    expect(isAllowedFaviconUrl('https://cdn.example.com/i.png')).toBe(true);
    expect(isAllowedFaviconUrl('data:image/png;base64,aaaa')).toBe(true);
    expect(isAllowedFaviconUrl('data:image/svg+xml,<svg></svg>')).toBe(true);
  });

  it('rejects non-image data URLs and oversize payloads', () => {
    expect(isAllowedFaviconUrl('data:text/html,hi')).toBe(false);
    expect(isAllowedFaviconUrl('javascript:void(0)')).toBe(false);
    const huge = `data:image/png;base64,${'a'.repeat(MAX_FAVICON_DATA_URL_LENGTH)}`;
    expect(isAllowedFaviconUrl(huge)).toBe(false);
  });

  it('normalizeFaviconUrl drops invalid overrides', () => {
    expect(normalizeFaviconUrl('')).toBeUndefined();
    expect(normalizeFaviconUrl('javascript:x')).toBeUndefined();
    expect(normalizeFaviconUrl(' https://x.test/f.ico ')).toBe(
      'https://x.test/f.ico',
    );
  });
});

describe('dial background color / opacity', () => {
  it('accepts #rrggbb hex colors', () => {
    expect(isDialBackgroundColor('#14161c')).toBe(true);
    expect(isDialBackgroundColor('#ABCDEF')).toBe(true);
    expect(isDialBackgroundColor('#fff')).toBe(false);
    expect(isDialBackgroundColor('rgb(20,22,28)')).toBe(false);
    expect(isDialBackgroundColor('14161c')).toBe(false);
  });

  it('normalizes color and opacity', () => {
    expect(normalizeDialBackgroundColor(' #AbCdEf ')).toBe('#abcdef');
    expect(normalizeDialBackgroundColor('')).toBeUndefined();
    expect(normalizeDialBackgroundColor('#fff')).toBeUndefined();
    expect(normalizeDialBackgroundOpacity(0.72)).toBe(0.72);
    expect(normalizeDialBackgroundOpacity(0)).toBe(0);
    expect(normalizeDialBackgroundOpacity(1)).toBe(1);
    expect(normalizeDialBackgroundOpacity(1.5)).toBeUndefined();
    expect(normalizeDialBackgroundOpacity(NaN)).toBeUndefined();
  });

  it('dialBackgroundCss uses CSS default when unset', () => {
    expect(dialBackgroundCss()).toBeUndefined();
    expect(dialBackgroundCss(undefined, undefined)).toBeUndefined();
  });

  it('dialBackgroundCss fills missing color or opacity', () => {
    expect(dialBackgroundCss('#ff0000')).toBe(
      `rgba(255, 0, 0, ${DEFAULT_DIAL_BACKGROUND_OPACITY})`,
    );
    expect(dialBackgroundCss(undefined, 0.5)).toBe(
      `rgba(20, 22, 28, 0.5)`,
    );
    expect(DEFAULT_DIAL_BACKGROUND_COLOR).toBe('#14161c');
    expect(dialBackgroundCss('#00ff00', 0.25)).toBe('rgba(0, 255, 0, 0.25)');
  });
});
