import { describe, expect, it } from 'vitest';
import {
  extractFaviconFromHtml,
  extractTitleFromHtml,
  titleFromHostname,
} from './pageTitle';

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

  it('decodes numeric and hex entities', () => {
    expect(extractTitleFromHtml('<title>A&#39;s &#x26; B</title>')).toBe(
      "A's & B",
    );
  });

  it('leaves invalid code points untouched', () => {
    expect(extractTitleFromHtml('<title>bad&#x110000;</title>')).toBe(
      'bad&#x110000;',
    );
    expect(extractTitleFromHtml('<title>bad&#55296;</title>')).toBe(
      'bad&#55296;',
    );
    expect(extractTitleFromHtml('<title>bad&#-1;</title>')).toBe('bad&#-1;');
  });

  it('returns null when no title is present', () => {
    expect(extractTitleFromHtml('<html><body>Hi</body></html>')).toBeNull();
  });
});

describe('extractFaviconFromHtml', () => {
  it('prefers rel=icon and resolves relative hrefs', () => {
    const html = `
      <html><head>
        <link rel="stylesheet" href="/app.css">
        <link rel="icon" href="/icons/favicon-32.png" sizes="32x32">
      </head></html>
    `;
    expect(extractFaviconFromHtml(html, 'https://example.com/page')).toBe(
      'https://example.com/icons/favicon-32.png',
    );
  });

  it('uses base href when present', () => {
    const html = `
      <base href="https://cdn.example.com/site/">
      <link rel="shortcut icon" href="icon.ico">
    `;
    expect(extractFaviconFromHtml(html, 'https://example.com/')).toBe(
      'https://cdn.example.com/site/icon.ico',
    );
  });

  it('returns null when no icon links exist', () => {
    expect(
      extractFaviconFromHtml('<html><head></head></html>', 'https://example.com/'),
    ).toBeNull();
  });

  it('scores apple-touch icons and skips non-http schemes', () => {
    const html = `
      <link rel="apple-touch-icon" href="/apple.png" sizes="180x180">
      <link rel="icon" href="data:image/png;base64,abc">
    `;
    expect(extractFaviconFromHtml(html, 'https://example.com/')).toBe(
      'https://example.com/apple.png',
    );
  });

  it('falls back when base href is invalid', () => {
    const html = `
      <base href="::bad::">
      <link rel="icon" href="/ok.ico">
    `;
    expect(extractFaviconFromHtml(html, 'https://example.com/page')).toBe(
      'https://example.com/ok.ico',
    );
    expect(extractFaviconFromHtml(html, 'not-a-url')).toBeNull();
  });
});
