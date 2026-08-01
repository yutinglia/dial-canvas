import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SETTINGS } from '../schemas/settings';
import {
  STORE_VERSION,
  createEmptyStore,
  getActiveDials,
  type Store,
} from '../schemas/store';
import { STORAGE_KEYS } from './keys';
import { getStore, setStore } from './repository';
import {
  getLocalUpdatedAt,
  getSyncEnabled,
  getSyncStatus,
  mergeFromSync,
  pushStoreToSync,
  setSyncEnabled,
} from './firefoxSync';
import {
  SYNC_META_KEY,
  buildSyncItems,
  slimStoreForSync,
  syncChunkKey,
} from './syncPayload';

const validDial = {
  id: 'd1',
  title: 'Example',
  url: 'https://example.com/',
  showWhenNarrow: false,
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

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  fakeBrowser.reset();
  await browser.storage.local.clear();
  await browser.storage.sync.clear();
});

describe('firefox sync LWW', () => {
  it('does not push while sync is disabled', async () => {
    const spy = vi.spyOn(browser.storage.sync, 'set');
    await setStore(sampleStore());
    await pushStoreToSync(sampleStore(), Date.now());
    expect(spy).not.toHaveBeenCalled();
    expect(await getSyncEnabled()).toBe(false);
  });

  it('pushes slim payload when sync is enabled', async () => {
    const store = sampleStore({
      settings: { ...DEFAULT_SETTINGS, gridSize: 24 },
    });
    await setStore(store, { updatedAt: 100 });
    await browser.storage.local.set({ [STORAGE_KEYS.syncEnabled]: true });

    const result = await pushStoreToSync(store, 100);
    expect(result).toEqual({ ok: true });

    const area = await browser.storage.sync.get(null);
    expect(area[SYNC_META_KEY]).toEqual({ updatedAt: 100, chunkCount: 1 });
    expect(typeof area[syncChunkKey(0)]).toBe('string');
    const slim = JSON.parse(area[syncChunkKey(0)] as string);
    expect(slim.settings.gridSize).toBe(24);
  });

  it('applies remote store when remote updatedAt is newer', async () => {
    const local = sampleStore({
      settings: { ...DEFAULT_SETTINGS, gridSize: 16 },
    });
    await setStore(local, { skipSyncPush: true, updatedAt: 100 });

    const remote = sampleStore({
      settings: { ...DEFAULT_SETTINGS, gridSize: 32 },
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [{ ...validDial, title: 'Remote' }],
          widgets: [],
        },
      ],
    });
    const built = buildSyncItems(slimStoreForSync(remote), 200);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    await browser.storage.sync.set(built.items);
    await browser.storage.local.set({ [STORAGE_KEYS.syncEnabled]: true });

    const merged = await mergeFromSync();
    expect(merged.action).toBe('applied');
    if (merged.action !== 'applied') return;
    expect(merged.store.settings.gridSize).toBe(32);
    expect(getActiveDials(merged.store)[0]?.title).toBe('Remote');
    expect(await getLocalUpdatedAt()).toBe(200);

    const loaded = await getStore();
    expect(loaded.store.settings.gridSize).toBe(32);
  });

  it('keeps local when local updatedAt is newer or equal', async () => {
    const local = sampleStore({
      settings: { ...DEFAULT_SETTINGS, gridSize: 40 },
    });
    await setStore(local, { skipSyncPush: true, updatedAt: 300 });

    const remote = sampleStore({
      settings: { ...DEFAULT_SETTINGS, gridSize: 8 },
    });
    const built = buildSyncItems(slimStoreForSync(remote), 200);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    await browser.storage.sync.set(built.items);
    await browser.storage.local.set({ [STORAGE_KEYS.syncEnabled]: true });

    const merged = await mergeFromSync();
    expect(merged.action).toBe('kept-local');
    const loaded = await getStore();
    expect(loaded.store.settings.gridSize).toBe(40);
  });

  it('records oversized status when buildSyncItems fails', async () => {
    await browser.storage.local.set({ [STORAGE_KEYS.syncEnabled]: true });

    const dials = Array.from({ length: 500 }, (_, i) => ({
      ...validDial,
      id: `d${i}`,
      title: `T${i}-${'z'.repeat(180)}`,
      url: `https://example.com/${i}/${'w'.repeat(180)}`,
    }));
    const huge = sampleStore({
      pages: [{ id: 'page-home', name: 'Home', dials, widgets: [] }],
    });

    const slim = slimStoreForSync(huge);
    const built = buildSyncItems(slim, 1);
    if (built.ok) {
      // Environment may still fit; force status path via mock.
      vi.spyOn(browser.storage.sync, 'set').mockRejectedValueOnce(
        new Error('QuotaExceededError: storage.sync API call exceeded'),
      );
      const result = await pushStoreToSync(huge, 1);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('quota');
      expect((await getSyncStatus()).lastError).toBe('quota');
      return;
    }

    const result = await pushStoreToSync(huge, 1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('oversized');
    expect((await getSyncStatus()).lastError).toBe('oversized');
  });

  it('setSyncEnabled pushes local when remote is empty', async () => {
    const store = sampleStore({
      settings: { ...DEFAULT_SETTINGS, iconSize: 48 },
    });
    await setStore(store, { skipSyncPush: true, updatedAt: 50 });

    const result = await setSyncEnabled(true, store);
    expect(result.action).toBe('pushed');
    expect(await getSyncEnabled()).toBe(true);

    const area = await browser.storage.sync.get(null);
    const chunk = area[syncChunkKey(0)] as string;
    expect(JSON.parse(chunk).settings.iconSize).toBe(48);
  });

  it('setSyncEnabled restores remote after reinstall seed (no local sync clock)', async () => {
    const remote = sampleStore({
      settings: { ...DEFAULT_SETTINGS, gridSize: 28, iconSize: 52 },
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [{ ...validDial, title: 'FromSync' }],
          widgets: [],
        },
      ],
    });
    const built = buildSyncItems(slimStoreForSync(remote), 100);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    await browser.storage.sync.set(built.items);

    // Simulate post-reinstall first open: seed local without advancing LWW clock.
    const seed = sampleStore();
    await setStore(seed, { skipSyncPush: true });
    expect(await getLocalUpdatedAt()).toBe(0);

    const result = await setSyncEnabled(true, seed);
    expect(result.action).toBe('applied');
    if (result.action !== 'applied') return;
    expect(result.store.settings.gridSize).toBe(28);
    expect(getActiveDials(result.store)[0]?.title).toBe('FromSync');
    expect(await getLocalUpdatedAt()).toBe(100);

    // Cloud payload must not be overwritten by the seed.
    const area = await browser.storage.sync.get(null);
    const meta = area[SYNC_META_KEY] as { updatedAt: number };
    expect(meta.updatedAt).toBe(100);
    const chunk = area[syncChunkKey(0)] as string;
    expect(JSON.parse(chunk).settings.gridSize).toBe(28);
  });
});
