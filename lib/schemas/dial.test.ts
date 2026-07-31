import { describe, expect, it } from 'vitest';
import {
  ALLOWED_DIAL_PROTOCOLS,
  MAX_FAVICON_DATA_URL_LENGTH,
  isAllowedDialUrl,
  isAllowedFaviconUrl,
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
