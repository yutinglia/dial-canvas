import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  dialsFromBookmarks,
  listBookmarkCandidates,
  requestBookmarksPermission,
} from './bookmarks';
import type { Dial } from '../schemas/dial';

const existing: Dial[] = [
  {
    id: 'existing',
    title: 'Existing',
    url: 'https://existing.example/',
    showWhenNarrow: false,
    x: 0,
    y: 0,
    width: 64,
    height: 64,
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
  fakeBrowser.reset();
});

describe('dialsFromBookmarks', () => {
  it('places new dials without overlapping existing ones and respects limit', () => {
    const bookmarks = Array.from({ length: 5 }, (_, i) => ({
      title: `Site ${i}`,
      url: `https://example.com/${i}`,
    }));
    const next = dialsFromBookmarks(
      bookmarks,
      existing,
      20,
      { width: 1200, height: 800 },
      2,
    );
    expect(next).toHaveLength(3);
    expect(next[1]?.width).toBeGreaterThanOrEqual(64);
    expect(next[1]?.height).toBeGreaterThanOrEqual(64);
    expect(next[1]?.url).toBe('https://example.com/0');
    expect(next[2]?.url).toBe('https://example.com/1');
    expect(next[1]?.x !== existing[0]!.x || next[1]?.y !== existing[0]!.y).toBe(
      true,
    );
  });

  it('falls back to url when title is empty and truncates long titles', () => {
    const long = 'x'.repeat(200);
    const next = dialsFromBookmarks(
      [
        { title: '', url: 'https://blank-title.example/' },
        { title: long, url: 'https://long-title.example/' },
      ],
      [],
      20,
      { width: 1200, height: 800 },
    );
    expect(next[0]?.title).toBe('https://blank-title.example/');
    expect(next[1]?.title).toHaveLength(120);
  });
});

describe('listBookmarkCandidates', () => {
  it('walks nested trees, normalizes urls, and dedupes', async () => {
    vi.spyOn(browser.bookmarks, 'getTree').mockResolvedValue([
      {
        title: 'Root',
        children: [
          {
            title: 'Folder',
            children: [
              { title: 'A', url: 'https://a.example/' },
              { title: 'A duplicate', url: 'https://a.example/' },
              { title: 'Bad', url: 'javascript:alert(1)' },
              { title: '  ', url: 'https://b.example/' },
            ],
          },
        ],
      },
    ] as never);

    await expect(listBookmarkCandidates()).resolves.toEqual([
      { title: 'A', url: 'https://a.example/' },
      { title: 'https://b.example/', url: 'https://b.example/' },
    ]);
  });
});

describe('requestBookmarksPermission', () => {
  it('calls request immediately without contains', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains');
    const request = vi
      .spyOn(browser.permissions, 'request')
      .mockImplementation(async () => true);
    await expect(requestBookmarksPermission()).resolves.toBe(true);
    expect(contains).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith({ permissions: ['bookmarks'] });
  });

  it('returns false when denied', async () => {
    vi.spyOn(browser.permissions, 'request').mockImplementation(
      async () => false,
    );
    await expect(requestBookmarksPermission()).resolves.toBe(false);
  });

  it('returns false when the permissions API throws', async () => {
    vi.spyOn(browser.permissions, 'request').mockRejectedValue(
      new Error('no api'),
    );
    await expect(requestBookmarksPermission()).resolves.toBe(false);
  });
});
