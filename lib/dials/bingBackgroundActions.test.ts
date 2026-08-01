import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../schemas/settings';
import { createEmptyStore, STORE_VERSION, type Store } from '../schemas/store';
import { utcDateString } from './bingWallpaper';

const requestBingWallpaper = vi.fn();
const requestBingWallpaperList = vi.fn();
const hasFetchHostPermission = vi.fn();
const requestFetchHostPermission = vi.fn();
const applyBackground = vi.fn();
const isBingCacheFresh = vi.fn();

vi.mock('./bingWallpaper', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./bingWallpaper')>();
  return {
    ...actual,
    requestBingWallpaper: (...args: unknown[]) => requestBingWallpaper(...args),
    requestBingWallpaperList: (...args: unknown[]) =>
      requestBingWallpaperList(...args),
  };
});

vi.mock('./hostPermission', () => ({
  hasFetchHostPermission: (...args: unknown[]) =>
    hasFetchHostPermission(...args),
  requestFetchHostPermission: (...args: unknown[]) =>
    requestFetchHostPermission(...args),
}));

vi.mock('./canvasBackground', () => ({
  applyBackground: (...args: unknown[]) => applyBackground(...args),
  isBingCacheFresh: (...args: unknown[]) => isBingCacheFresh(...args),
}));

import {
  ensureBingWallpaper,
  ensureHostPermissionForBing,
  loadBingWallpaperList,
  refreshBingWallpaper,
  selectBingBackground,
  selectBingWallpaperItem,
  type BingActionDeps,
} from './bingBackgroundActions';

function bingStore(
  overrides: Partial<Extract<Store['settings']['background'], { type: 'bing' }>> = {},
): Store {
  const base = createEmptyStore();
  return {
    ...base,
    version: STORE_VERSION,
    settings: {
      ...DEFAULT_SETTINGS,
      background: {
        type: 'bing' as const,
        fit: 'cover' as const,
        opacity: 1,
        locked: false,
        ...overrides,
      },
    },
  };
}

function makeDeps(store: Store | null): BingActionDeps & {
  persist: ReturnType<typeof vi.fn>;
  showToast: ReturnType<typeof vi.fn>;
  t: ReturnType<typeof vi.fn>;
} {
  const persist = vi.fn(async () => undefined);
  const showToast = vi.fn();
  const t = vi.fn((key: string) => key);
  return {
    getStore: () => store,
    persist,
    showToast,
    t,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hasFetchHostPermission.mockResolvedValue(true);
  requestFetchHostPermission.mockResolvedValue(true);
  isBingCacheFresh.mockReturnValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ensureHostPermissionForBing', () => {
  it('prompts and toasts when permission is denied', async () => {
    hasFetchHostPermission.mockResolvedValue(false);
    requestFetchHostPermission.mockResolvedValue(false);
    const deps = makeDeps(bingStore());
    await expect(ensureHostPermissionForBing(deps)).resolves.toBe(false);
    expect(deps.showToast).toHaveBeenCalledWith('bingHostPermission');
  });
});

describe('ensureBingWallpaper', () => {
  it('no-ops when background is not bing', async () => {
    const store = createEmptyStore();
    const deps = makeDeps(store);
    await ensureBingWallpaper(deps);
    expect(requestBingWallpaper).not.toHaveBeenCalled();
  });

  it('applies cached wallpaper when fresh', async () => {
    isBingCacheFresh.mockReturnValue(true);
    const store = bingStore({
      cachedUrl: 'https://example.com/a.jpg',
      cachedDate: utcDateString(),
    });
    const deps = makeDeps(store);
    await ensureBingWallpaper(deps);
    expect(applyBackground).toHaveBeenCalledWith(store.settings);
    expect(requestBingWallpaper).not.toHaveBeenCalled();
  });

  it('persists a successful fetch', async () => {
    requestBingWallpaper.mockResolvedValue({
      ok: true,
      url: 'https://example.com/new.jpg',
      date: '2026-08-01',
      title: 'Peak',
      copyright: '© Photographer',
    });
    let store = bingStore();
    const deps = makeDeps(null);
    deps.getStore = () => store;
    deps.persist.mockImplementation(async (next: Store) => {
      store = next;
    });

    await ensureBingWallpaper(deps, true);
    expect(deps.persist).toHaveBeenCalledOnce();
    expect(store.settings.background).toMatchObject({
      type: 'bing',
      cachedUrl: 'https://example.com/new.jpg',
      cachedDate: '2026-08-01',
      cachedTitle: 'Peak',
      cachedCopyright: '© Photographer',
      locked: false,
    });
  });

  it('toasts host-permission failures', async () => {
    requestBingWallpaper.mockResolvedValue({
      ok: false,
      error: 'Host permission required',
    });
    const store = bingStore();
    const deps = makeDeps(store);
    await ensureBingWallpaper(deps, true);
    expect(deps.showToast).toHaveBeenCalledWith('bingHostPermission');
    expect(applyBackground).toHaveBeenCalledWith(store.settings);
  });

  it('toasts generic fetch failures and exceptions', async () => {
    requestBingWallpaper.mockResolvedValue({
      ok: false,
      error: 'network down',
    });
    const store = bingStore();
    const deps = makeDeps(store);
    await ensureBingWallpaper(deps, true);
    expect(deps.showToast).toHaveBeenCalledWith('bingFetchFailed');

    requestBingWallpaper.mockRejectedValue(new Error('boom'));
    await ensureBingWallpaper(deps, true);
    expect(deps.showToast).toHaveBeenCalledWith('bingFetchFailed');
  });

  it('bails if background leaves bing during fetch', async () => {
    let store: Store | null = bingStore();
    const deps = makeDeps(null);
    deps.getStore = () => store;
    requestBingWallpaper.mockImplementation(async () => {
      store = createEmptyStore();
      return {
        ok: true,
        url: 'https://example.com/new.jpg',
        date: '2026-08-01',
      };
    });
    await ensureBingWallpaper(deps, true);
    expect(deps.persist).not.toHaveBeenCalled();
  });

  it('skips persist when the fetched wallpaper already matches cache', async () => {
    const store = bingStore({
      cachedUrl: 'https://example.com/same.jpg',
      cachedDate: '2026-08-01',
    });
    const deps = makeDeps(store);
    requestBingWallpaper.mockResolvedValue({
      ok: true,
      url: 'https://example.com/same.jpg',
      date: '2026-08-01',
    });
    await ensureBingWallpaper(deps, false);
    expect(deps.persist).not.toHaveBeenCalled();
    expect(applyBackground).toHaveBeenCalledWith(store.settings);
  });
});

describe('selectBingBackground', () => {
  it('switches to bing and kicks a wallpaper fetch', async () => {
    const store = createEmptyStore();
    const deps = makeDeps(store);
    requestBingWallpaper.mockResolvedValue({
      ok: true,
      url: 'https://example.com/a.jpg',
      date: utcDateString(),
    });
    await expect(selectBingBackground(deps)).resolves.toBe(true);
    expect(deps.persist).toHaveBeenCalledOnce();
    const next = deps.persist.mock.calls[0]?.[0] as Store;
    expect(next.settings.background.type).toBe('bing');
  });

  it('returns false without a store or permission', async () => {
    await expect(selectBingBackground(makeDeps(null))).resolves.toBe(false);
    hasFetchHostPermission.mockResolvedValue(false);
    requestFetchHostPermission.mockResolvedValue(false);
    await expect(selectBingBackground(makeDeps(createEmptyStore()))).resolves.toBe(
      false,
    );
  });
});

describe('loadBingWallpaperList', () => {
  it('returns permission errors and list results', async () => {
    hasFetchHostPermission.mockResolvedValue(false);
    requestFetchHostPermission.mockResolvedValue(false);
    const deps = makeDeps(bingStore());
    await expect(loadBingWallpaperList(deps)).resolves.toEqual({
      ok: false,
      error: 'Host permission not granted.',
    });

    hasFetchHostPermission.mockResolvedValue(true);
    requestBingWallpaperList.mockResolvedValue({
      ok: true,
      items: [],
    });
    await expect(loadBingWallpaperList(deps)).resolves.toEqual({
      ok: true,
      items: [],
    });

    requestBingWallpaperList.mockRejectedValue(new Error('list failed'));
    await expect(loadBingWallpaperList(deps)).resolves.toEqual({
      ok: false,
      error: 'list failed',
    });
  });
});

describe('selectBingWallpaperItem', () => {
  it('persists a locked historical wallpaper', async () => {
    const store = bingStore({
      cachedUrl: 'https://example.com/old.jpg',
      cachedDate: '2026-07-01',
    });
    const deps = makeDeps(store);
    await selectBingWallpaperItem(
      deps,
      {
        url: 'https://example.com/past.jpg',
        thumbUrl: 'https://example.com/past-thumb.jpg',
        date: '2026-07-20',
        title: 'Past',
        copyright: '© Past',
      },
      { locked: true },
    );
    expect(deps.persist).toHaveBeenCalledOnce();
    const next = deps.persist.mock.calls[0]?.[0] as Store;
    expect(next.settings.background).toMatchObject({
      type: 'bing',
      cachedUrl: 'https://example.com/past.jpg',
      cachedDate: '2026-07-20',
      locked: true,
      cachedTitle: 'Past',
      cachedCopyright: '© Past',
    });
  });

  it('ignores selection when background is not bing', async () => {
    let store = bingStore();
    store = {
      ...store,
      settings: {
        ...store.settings,
        background: {
          type: 'color',
          value: '#111',
        },
      },
    };
    const deps = makeDeps(store);
    await selectBingWallpaperItem(
      deps,
      {
        url: 'https://example.com/a.jpg',
        thumbUrl: 'https://example.com/a-thumb.jpg',
        date: '2026-01-01',
      },
      { locked: false },
    );
    expect(deps.persist).not.toHaveBeenCalled();
  });

  it('applies background when selection is unchanged', async () => {
    const today = utcDateString();
    const store = bingStore({
      cachedUrl: 'https://example.com/a.jpg',
      cachedDate: today,
      locked: false,
    });
    const deps = makeDeps(store);
    await selectBingWallpaperItem(
      deps,
      {
        url: 'https://example.com/a.jpg',
        thumbUrl: 'https://example.com/a-thumb.jpg',
        date: '2026-01-01',
      },
      { locked: false },
    );
    expect(deps.persist).not.toHaveBeenCalled();
    expect(applyBackground).toHaveBeenCalledWith(store.settings);
  });
});

describe('refreshBingWallpaper', () => {
  it('unlocks a locked bing background then force-fetches', async () => {
    let store = bingStore({
      locked: true,
      cachedUrl: 'https://example.com/a.jpg',
      cachedDate: '2026-01-01',
    });
    const deps = makeDeps(null);
    deps.getStore = () => store;
    deps.persist.mockImplementation(async (next: Store) => {
      store = next;
    });
    requestBingWallpaper.mockResolvedValue({
      ok: true,
      url: 'https://example.com/b.jpg',
      date: utcDateString(),
    });

    await refreshBingWallpaper(deps);
    expect(store.settings.background).toMatchObject({
      type: 'bing',
      locked: false,
    });
    expect(requestBingWallpaper).toHaveBeenCalled();
  });
});
