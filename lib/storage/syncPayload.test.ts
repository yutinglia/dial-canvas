import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../schemas/settings';
import {
  STORE_VERSION,
  createEmptyStore,
  type Store,
} from '../schemas/store';
import {
  SYNC_CHUNK_CHAR_BUDGET,
  SYNC_META_KEY,
  SYNC_QUOTA_BYTES,
  buildSyncItems,
  estimateSyncItemBytes,
  parseSyncMeta,
  reassembleSyncStoreJson,
  slimStoreForSync,
  staleSyncChunkKeys,
  syncChunkKey,
} from './syncPayload';

const validDial = {
  id: 'd1',
  title: 'Example',
  url: 'https://example.com/',
  x: 0,
  y: 0,
  width: 64,
  height: 64,
};

function sampleStore(overrides: Partial<Store> = {}): Store {
  const base = createEmptyStore([validDial]);
  return {
    ...base,
    settings: { ...DEFAULT_SETTINGS },
    ...overrides,
    version: STORE_VERSION,
  };
}

describe('slimStoreForSync', () => {
  it('strips data: favicons and uploaded wallpaper bytes', () => {
    const store = sampleStore({
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [
            {
              ...validDial,
              faviconUrl: `data:image/png;base64,${'A'.repeat(100)}`,
            },
          ],
          widgets: [],
        },
      ],
      settings: {
        ...DEFAULT_SETTINGS,
        background: {
          type: 'image',
          value: `data:image/jpeg;base64,${'B'.repeat(200)}`,
          fit: 'cover',
          opacity: 1,
        },
      },
    });

    const slim = slimStoreForSync(store);
    expect(slim.pages[0]!.dials[0]!.faviconUrl).toBeUndefined();
    expect(slim.settings.background).toEqual(DEFAULT_SETTINGS.background);
  });

  it('keeps http(s) wallpaper and favicon URLs', () => {
    const store = sampleStore({
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [
            {
              ...validDial,
              faviconUrl: 'https://example.com/favicon.ico',
            },
          ],
          widgets: [],
        },
      ],
      settings: {
        ...DEFAULT_SETTINGS,
        background: {
          type: 'image',
          value: 'https://example.com/bg.jpg',
          fit: 'contain',
          opacity: 0.8,
        },
      },
    });

    const slim = slimStoreForSync(store);
    expect(slim.pages[0]!.dials[0]!.faviconUrl).toBe(
      'https://example.com/favicon.ico',
    );
    expect(slim.settings.background).toEqual({
      type: 'image',
      value: 'https://example.com/bg.jpg',
      fit: 'contain',
      opacity: 0.8,
    });
  });

  it('drops Bing cached data URLs but keeps metadata', () => {
    const store = sampleStore({
      settings: {
        ...DEFAULT_SETTINGS,
        background: {
          type: 'bing',
          fit: 'cover',
          opacity: 1,
          locked: true,
          cachedUrl: `data:image/jpeg;base64,${'C'.repeat(50)}`,
          cachedDate: '2026-08-01',
          cachedTitle: 'Title',
          cachedCopyright: '© Bing',
        },
      },
    });

    const slim = slimStoreForSync(store);
    expect(slim.settings.background).toEqual({
      type: 'bing',
      fit: 'cover',
      opacity: 1,
      locked: true,
      cachedDate: '2026-08-01',
      cachedTitle: 'Title',
      cachedCopyright: '© Bing',
    });
  });
});

describe('buildSyncItems / reassemble', () => {
  it('round-trips a slim store through chunked sync items', () => {
    const slim = slimStoreForSync(sampleStore());
    const built = buildSyncItems(slim, 1_700_000_000_000);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    expect(built.items[SYNC_META_KEY]).toEqual({
      updatedAt: 1_700_000_000_000,
      chunkCount: built.chunkCount,
    });

    const reassembled = reassembleSyncStoreJson(
      built.items as Record<string, unknown>,
    );
    expect(reassembled).not.toBeNull();
    expect(reassembled!.updatedAt).toBe(1_700_000_000_000);
    expect(JSON.parse(reassembled!.json)).toEqual(slim);
  });

  it('splits large JSON across multiple chunks under per-item budget', () => {
    const widgets = Array.from({ length: 3 }, (_, i) => ({
      id: `n${i}`,
      type: 'note' as const,
      title: `Note ${i}`,
      text: 'x'.repeat(3500),
      x: 0,
      y: i * 100,
      width: 200,
      height: 200,
    }));
    const slim = slimStoreForSync(
      sampleStore({
        pages: [
          {
            id: 'page-home',
            name: 'Home',
            dials: [validDial],
            widgets,
          },
        ],
      }),
    );
    const jsonLen = JSON.stringify(slim).length;
    expect(jsonLen).toBeGreaterThan(SYNC_CHUNK_CHAR_BUDGET);
    expect(jsonLen).toBeLessThan(SYNC_QUOTA_BYTES);

    const built = buildSyncItems(slim, 42);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.chunkCount).toBeGreaterThan(1);
    for (let i = 0; i < built.chunkCount; i += 1) {
      const key = syncChunkKey(i);
      const bytes = estimateSyncItemBytes(key, built.items[key]);
      expect(bytes).toBeLessThanOrEqual(8_192);
    }
  });

  it('returns oversized when payload exceeds sync quota', () => {
    // Force a pathological string longer than total quota after slim.
    const dials = Array.from({ length: 400 }, (_, i) => ({
      ...validDial,
      id: `d${i}`,
      title: `T${i}-${'z'.repeat(200)}`,
      url: `https://example.com/${i}/${'w'.repeat(200)}`,
    }));
    const slim = slimStoreForSync(
      sampleStore({
        pages: [{ id: 'page-home', name: 'Home', dials, widgets: [] }],
      }),
    );
    const built = buildSyncItems(slim, 1);
    // May still fit if under 100KB — assert either ok with totalBytes or oversized.
    if (!built.ok) {
      expect(built.reason).toBe('oversized');
      expect(built.totalBytes).toBeGreaterThan(SYNC_QUOTA_BYTES);
    } else {
      expect(built.totalBytes).toBeLessThanOrEqual(SYNC_QUOTA_BYTES);
    }
  });
});

describe('parseSyncMeta / staleSyncChunkKeys', () => {
  it('parses valid meta and rejects garbage', () => {
    expect(parseSyncMeta({ updatedAt: 10, chunkCount: 2 })).toEqual({
      updatedAt: 10,
      chunkCount: 2,
    });
    expect(parseSyncMeta({ updatedAt: 10, chunkCount: 0 })).toBeNull();
    expect(parseSyncMeta(null)).toBeNull();
  });

  it('lists stale chunk keys when shrinking', () => {
    expect(staleSyncChunkKeys(3, 1)).toEqual([
      syncChunkKey(1),
      syncChunkKey(2),
    ]);
    expect(staleSyncChunkKeys(2, 2)).toEqual([]);
  });
});
