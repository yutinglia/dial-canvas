import { describe, expect, it } from 'vitest';
import { extractTitleFromHtml, titleFromHostname } from './pageTitle';

describe('titleFromHostname', () => {
  it('returns the hostname without www', () => {
    expect(titleFromHostname('https://www.example.com/path')).toBe('example.com');
    expect(titleFromHostname('https://developer.mozilla.org/')).toBe(
      'developer.mozilla.org',
    );
  });

  it('returns empty for invalid URLs', () => {
    expect(titleFromHostname('not-a-url')).toBe('');
  });
});

describe('extractTitleFromHtml', () => {
  it('extracts a plain title', () => {
    expect(extractTitleFromHtml('<html><head><title>Hello</title></head></html>')).toBe(
      'Hello',
    );
  });

  it('decodes common entities and collapses whitespace', () => {
    expect(
      extractTitleFromHtml('<title>  Foo &amp;  Bar  </title>'),
    ).toBe('Foo & Bar');
  });

  it('returns null when no title is present', () => {
    expect(extractTitleFromHtml('<html><body>Hi</body></html>')).toBeNull();
  });
});
