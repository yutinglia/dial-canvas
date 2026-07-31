import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SETTINGS } from '../schemas/settings';
import {
  STORE_VERSION,
  createEmptyStore,
  getActiveDials,
  withActiveDials,
  type Store,
} from '../schemas/store';
import { STORAGE_KEYS } from './keys';
import {
  createDebouncedSaver,
  getStore,
  setStore,
  updateDials,
  updateSettings,
} from './repository';

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

beforeEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  fakeBrowser.reset();
  await browser.storage.local.clear();
});

describe('setStore write queue', () => {
  it('serializes concurrent writes so the last write wins', async () => {
    const first = withActiveDials(sampleStore(), [
      { ...validDial, title: 'First' },
    ]);
    const second = withActiveDials(sampleStore(), [
      { ...validDial, title: 'Second' },
    ]);

    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const originalSet = browser.storage.local.set.bind(browser.storage.local);
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async (items) => {
      const store = (items as Record<string, Store>)[STORAGE_KEYS.store]!;
      const title = getActiveDials(store)[0]?.title ?? '';
      order.push(title);
      if (title === 'First') await firstGate;
      return originalSet(items);
    });

    const p1 = setStore(first);
    // Let the first write acquire the queue lock and hit the gate.
    await Promise.resolve();
    await Promise.resolve();
    const p2 = setStore(second);
    releaseFirst();
    await Promise.all([p1, p2]);

    expect(order).toEqual(['First', 'Second']);
    const stored = await browser.storage.local.get(STORAGE_KEYS.store);
    expect(getActiveDials(stored[STORAGE_KEYS.store] as Store)[0]?.title).toBe(
      'Second',
    );
  });
});

describe('updateSettings vs dials race', () => {
  it('does not re-read storage and clobber in-memory dial updates', async () => {
    const base = sampleStore();
    await setStore(base);

    const withMovedDial = withActiveDials(base, [
      { ...validDial, x: 128, y: 64 },
    ]);

    const next = await updateSettings(withMovedDial, { snapEnabled: true });

    expect(getActiveDials(next)[0]?.x).toBe(128);
    expect(getActiveDials(next)[0]?.y).toBe(64);
    expect(next.settings.snapEnabled).toBe(true);

    const stored = await browser.storage.local.get(STORAGE_KEYS.store);
    const persisted = stored[STORAGE_KEYS.store] as Store;
    expect(getActiveDials(persisted)[0]?.x).toBe(128);
    expect(persisted.settings.snapEnabled).toBe(true);
  });

  it('updateDials also writes from the provided base store', async () => {
    const base = sampleStore({
      settings: { ...DEFAULT_SETTINGS, gridSize: 24 },
    });
    const dials = [{ ...validDial, id: 'd2', title: 'Moved', x: 32 }];
    const next = await updateDials(base, dials);
    expect(next.settings.gridSize).toBe(24);
    expect(getActiveDials(next)).toEqual(dials);
  });
});

describe('getStore migrate write-back', () => {
  it('persists a cleaned store when Zod drops invalid dials', async () => {
    await browser.storage.local.set({
      [STORAGE_KEYS.store]: {
        version: STORE_VERSION,
        pages: [
          {
            id: 'page-home',
            name: 'Home',
            dials: [
              validDial,
              { id: 'bad' },
              { ...validDial, id: 'evil', url: 'javascript:alert(1)' },
            ],
          },
        ],
        activePageId: 'page-home',
        settings: DEFAULT_SETTINGS,
      },
    });

    const loaded = await getStore();
    expect(loaded.repaired).toBe(true);
    expect(loaded.droppedDialCount).toBe(2);
    expect(getActiveDials(loaded.store)).toEqual([validDial]);

    const stored = await browser.storage.local.get(STORAGE_KEYS.store);
    expect(stored[STORAGE_KEYS.store]).toEqual(loaded.store);
  });

  it('migrates v1 payloads and write-backs v2', async () => {
    await browser.storage.local.set({
      [STORAGE_KEYS.store]: {
        version: 1,
        dials: [validDial],
        settings: DEFAULT_SETTINGS,
      },
    });

    const loaded = await getStore();
    expect(loaded.repaired).toBe(true);
    expect(loaded.store.version).toBe(2);
    expect(getActiveDials(loaded.store)).toEqual([validDial]);

    const stored = await browser.storage.local.get(STORAGE_KEYS.store);
    expect((stored[STORAGE_KEYS.store] as Store).version).toBe(2);
  });

  it('seeds and persists when storage is empty', async () => {
    const loaded = await getStore();
    expect(getActiveDials(loaded.store).length).toBeGreaterThan(0);
    expect(loaded.repaired).toBe(false);
    const stored = await browser.storage.local.get(STORAGE_KEYS.store);
    expect(stored[STORAGE_KEYS.store]).toEqual(loaded.store);
  });
});

describe('createDebouncedSaver', () => {
  it('exposes hasPending while a write is scheduled', () => {
    const saver = createDebouncedSaver(60_000);
    expect(saver.hasPending()).toBe(false);
    saver.schedule(sampleStore());
    expect(saver.hasPending()).toBe(true);
  });

  it('reports errors and keeps pending after a failed saveNow', async () => {
    const onError = vi.fn();
    const saver = createDebouncedSaver(50, { onError });
    vi.spyOn(browser.storage.local, 'set').mockRejectedValueOnce(
      new Error('quota'),
    );

    const store = sampleStore();
    await expect(saver.saveNow(store)).rejects.toThrow('quota');
    expect(onError).toHaveBeenCalledOnce();
    expect(saver.hasPending()).toBe(true);
  });
});

describe('createEmptyStore helper', () => {
  it('builds a versioned empty store', () => {
    expect(getActiveDials(createEmptyStore())).toEqual([]);
    expect(createEmptyStore().pages).toHaveLength(1);
    expect(createEmptyStore().version).toBe(STORE_VERSION);
  });
});
