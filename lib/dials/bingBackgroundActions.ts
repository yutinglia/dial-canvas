import {
  requestBingWallpaper,
  requestBingWallpaperList,
  utcDateString,
  type BingWallpaperItem,
  type BingWallpaperListResult,
} from './bingWallpaper';
import {
  applyBackground,
  isBingCacheFresh,
} from './canvasBackground';
import { requestFetchHostPermission } from './hostPermission';
import type { Store } from '../schemas/store';

export type BingActionDeps = {
  getStore: () => Store | null;
  persist: (next: Store, immediate?: boolean) => Promise<void>;
  showToast: (message: string) => void;
  t: (key: string, substitutions?: string | string[]) => string;
};

let bingFetchInFlight = false;
/** When a force refresh arrives during an in-flight fetch, re-run after. */
let bingFetchForceQueued = false;

function isHostPermissionError(error: string | undefined): boolean {
  return Boolean(error?.toLowerCase().includes('host permission'));
}

export async function ensureHostPermissionForBing(
  deps: Pick<BingActionDeps, 'showToast' | 't'>,
): Promise<boolean> {
  // request() only — no contains() first (Firefox drops the user gesture).
  const allowed = await requestFetchHostPermission();
  if (!allowed) {
    deps.showToast(deps.t('bingHostPermission'));
    return false;
  }
  return true;
}

export async function ensureBingWallpaper(
  deps: BingActionDeps,
  force = false,
): Promise<void> {
  const store = deps.getStore();
  if (!store || store.settings.background.type !== 'bing') return;
  const bg = store.settings.background;
  if (!force && bg.locked) {
    applyBackground(store.settings);
    return;
  }
  if (!force && isBingCacheFresh(bg)) {
    applyBackground(store.settings);
    return;
  }
  if (bingFetchInFlight) {
    if (force) bingFetchForceQueued = true;
    return;
  }
  bingFetchInFlight = true;
  try {
    // Fetch directly from the newtab page. runtime.sendMessage to background
    // was returning undefined for Bing list/daily requests in Firefox.
    const result = await requestBingWallpaper();
    const currentStore = deps.getStore();
    if (!currentStore || currentStore.settings.background.type !== 'bing') {
      return;
    }
    if (!result?.ok) {
      deps.showToast(
        isHostPermissionError(result?.error)
          ? deps.t('bingHostPermission')
          : deps.t('bingFetchFailed'),
      );
      applyBackground(currentStore.settings);
      return;
    }
    const current = currentStore.settings.background;
    // User locked or picked another image while the fetch was in flight.
    if (current.locked) {
      applyBackground(currentStore.settings);
      return;
    }
    if (
      !force &&
      current.cachedUrl === result.url &&
      current.cachedDate === result.date
    ) {
      applyBackground(currentStore.settings);
      return;
    }
    // Another selection changed the cache mid-flight — do not overwrite it
    // unless this call forced a refresh of whatever was current at start.
    if (
      force &&
      (current.cachedUrl !== bg.cachedUrl || current.cachedDate !== bg.cachedDate)
    ) {
      applyBackground(currentStore.settings);
      return;
    }
    await deps.persist(
      {
        ...currentStore,
        settings: {
          ...currentStore.settings,
          background: {
            type: 'bing',
            fit: current.fit,
            opacity: current.opacity,
            cachedUrl: result.url,
            cachedDate: result.date,
            locked: false,
            ...(result.title ? { cachedTitle: result.title } : {}),
            ...(result.copyright
              ? { cachedCopyright: result.copyright }
              : {}),
          },
        },
      },
      true,
    );
  } catch {
    deps.showToast(deps.t('bingFetchFailed'));
    const fallback = deps.getStore();
    if (fallback) applyBackground(fallback.settings);
  } finally {
    bingFetchInFlight = false;
    if (bingFetchForceQueued) {
      bingFetchForceQueued = false;
      void ensureBingWallpaper(deps, true);
    }
  }
}

export async function selectBingBackground(
  deps: BingActionDeps,
): Promise<boolean> {
  const store = deps.getStore();
  if (!store) return false;
  if (!(await ensureHostPermissionForBing(deps))) return false;

  const existing =
    store.settings.background.type === 'bing'
      ? store.settings.background
      : null;
  const imageBg =
    store.settings.background.type === 'image'
      ? store.settings.background
      : null;
  const fit = existing?.fit ?? imageBg?.fit ?? 'cover';
  const opacity = existing?.opacity ?? imageBg?.opacity ?? 1;
  const next: Store = {
    ...store,
    settings: {
      ...store.settings,
      background: {
        type: 'bing',
        fit,
        opacity,
        locked: existing?.locked ?? false,
        ...(existing?.cachedUrl
          ? {
              cachedUrl: existing.cachedUrl,
              cachedDate: existing.cachedDate,
              ...(existing.cachedTitle
                ? { cachedTitle: existing.cachedTitle }
                : {}),
              ...(existing.cachedCopyright
                ? { cachedCopyright: existing.cachedCopyright }
                : {}),
            }
          : {}),
      },
    },
  };
  await deps.persist(next, true);
  void ensureBingWallpaper(deps, false);
  return true;
}

export async function loadBingWallpaperList(
  deps: Pick<BingActionDeps, 'showToast' | 't'>,
): Promise<BingWallpaperListResult> {
  if (!(await ensureHostPermissionForBing(deps))) {
    return { ok: false, error: 'Host permission not granted.' };
  }
  try {
    return await requestBingWallpaperList();
  } catch (err) {
    const detail =
      err instanceof Error && err.message
        ? err.message
        : 'Failed to fetch Bing wallpaper list.';
    return { ok: false, error: detail };
  }
}

export async function selectBingWallpaperItem(
  deps: BingActionDeps,
  item: BingWallpaperItem,
  options: { locked: boolean },
): Promise<void> {
  const store = deps.getStore();
  if (!store) return;
  if (store.settings.background.type !== 'bing') return;
  const current = store.settings.background;
  const cachedDate = options.locked ? item.date : utcDateString();
  if (
    current.cachedUrl === item.url &&
    current.cachedDate === cachedDate &&
    current.locked === options.locked
  ) {
    applyBackground(store.settings);
    return;
  }
  await deps.persist(
    {
      ...store,
      settings: {
        ...store.settings,
        background: {
          type: 'bing',
          fit: current.fit,
          opacity: current.opacity,
          cachedUrl: item.url,
          cachedDate,
          locked: options.locked,
          ...(item.title ? { cachedTitle: item.title } : {}),
          ...(item.copyright ? { cachedCopyright: item.copyright } : {}),
        },
      },
    },
    true,
  );
}

export async function refreshBingWallpaper(
  deps: BingActionDeps,
): Promise<void> {
  if (!(await ensureHostPermissionForBing(deps))) return;
  const store = deps.getStore();
  if (store && store.settings.background.type === 'bing') {
    const current = store.settings.background;
    if (current.locked) {
      await deps.persist(
        {
          ...store,
          settings: {
            ...store.settings,
            background: {
              ...current,
              locked: false,
            },
          },
        },
        true,
      );
    }
  }
  void ensureBingWallpaper(deps, true);
}
