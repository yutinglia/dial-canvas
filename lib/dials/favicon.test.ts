import { describe, expect, it } from 'vitest';
import {
  deriveFaviconCandidates,
  deriveFaviconUrl,
  dialMonogram,
  resolveFaviconChain,
  resolveFaviconUrl,
} from './favicon';

describe('dialMonogram', () => {
  it('uses up to two initials from words', () => {
    expect(dialMonogram('Mozilla Firefox')).toBe('MF');
    expect(dialMonogram('GitHub')).toBe('GI');
    expect(dialMonogram('  ')).toBe('?');
  });
});

describe('favicon derivation', () => {
  it('lists apple-touch before favicon.ico', () => {
    expect(deriveFaviconCandidates('https://example.com/path')).toEqual([
      'https://example.com/apple-touch-icon.png',
      'https://example.com/apple-touch-icon-precomposed.png',
      'https://example.com/favicon.ico',
    ]);
    expect(deriveFaviconUrl('https://example.com/')).toBe(
      'https://example.com/favicon.ico',
    );
  });

  it('prefers an allowed override in the chain', () => {
    expect(
      resolveFaviconUrl('https://example.com/', 'https://cdn.test/icon.png'),
    ).toBe('https://cdn.test/icon.png');
    expect(
      resolveFaviconChain('https://example.com/', 'https://cdn.test/icon.png')[0],
    ).toBe('https://cdn.test/icon.png');
  });
});
