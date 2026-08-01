import type { Dial } from '../schemas/dial';
import {
  DEFAULT_SETTINGS,
  type Background,
  type Settings,
} from '../schemas/settings';
import {
  STORE_VERSION,
  type Page,
  type Store,
} from '../schemas/store';
import type { Widget } from '../schemas/widget';

/** Firefox / Chromium storage.sync total quota. */
export const SYNC_QUOTA_BYTES = 102_400;

/** Firefox / Chromium storage.sync per-item quota. */
export const SYNC_MAX_ITEM_BYTES = 8_192;

/**
 * Max characters per chunk string value so key length + JSON quotes stay under
 * SYNC_MAX_ITEM_BYTES with margin.
 */
export const SYNC_CHUNK_CHAR_BUDGET = 7_500;

export const SYNC_META_KEY = 'dial-canvas-sync-meta';
export const SYNC_CHUNK_KEY_PREFIX = 'dial-canvas-sync-chunk';

export type SyncMeta = {
  /** Epoch ms of the store revision this payload represents. */
  updatedAt: number;
  chunkCount: number;
};

export type SyncStatus = {
  lastPushAt?: number;
  lastPullAt?: number;
  /** null clears a previous error after a successful push/pull. */
  lastError?: 'quota' | 'oversized' | 'unknown' | null;
};

export function syncChunkKey(index: number): string {
  return `${SYNC_CHUNK_KEY_PREFIX}${index}`;
}

export function estimateSyncItemBytes(key: string, value: unknown): number {
  return key.length + JSON.stringify(value).length;
}

function slimFaviconUrl(faviconUrl: string | undefined): string | undefined {
  if (!faviconUrl) return undefined;
  if (faviconUrl.startsWith('data:')) return undefined;
  return faviconUrl;
}

function slimDial(dial: Dial): Dial {
  const faviconUrl = slimFaviconUrl(dial.faviconUrl);
  if (faviconUrl === dial.faviconUrl) return dial;
  const next = { ...dial };
  if (faviconUrl === undefined) delete next.faviconUrl;
  else next.faviconUrl = faviconUrl;
  return next;
}

function slimBackground(background: Background): Background {
  if (background.type === 'color') return background;

  if (background.type === 'image') {
    if (background.value.startsWith('data:')) {
      return { ...DEFAULT_SETTINGS.background };
    }
    return background;
  }

  // bing — drop large cached blobs; keep metadata that fits sync.
  const next: Background = {
    type: 'bing',
    fit: background.fit,
    opacity: background.opacity,
    locked: background.locked,
  };
  if (background.cachedDate) next.cachedDate = background.cachedDate;
  if (background.cachedTitle) next.cachedTitle = background.cachedTitle;
  if (background.cachedCopyright) {
    next.cachedCopyright = background.cachedCopyright;
  }
  if (
    background.cachedUrl &&
    !background.cachedUrl.startsWith('data:') &&
    background.cachedUrl.length < 2_000
  ) {
    next.cachedUrl = background.cachedUrl;
  }
  return next;
}

function slimSettings(settings: Settings): Settings {
  return {
    ...settings,
    background: slimBackground(settings.background),
  };
}

function slimPage(page: Page): Page {
  return {
    ...page,
    dials: page.dials.map(slimDial),
    widgets: page.widgets.map((widget: Widget) => widget),
  };
}

/** Strip oversized image bytes so the store can fit in storage.sync. */
export function slimStoreForSync(store: Store): Store {
  const next: Store = {
    version: STORE_VERSION,
    activePageId: store.activePageId,
    pages: store.pages.map(slimPage),
    settings: slimSettings(store.settings),
  };
  if (store.layoutSize) next.layoutSize = store.layoutSize;
  return next;
}

export type BuildSyncItemsResult =
  | {
      ok: true;
      items: Record<string, unknown>;
      chunkCount: number;
      totalBytes: number;
    }
  | { ok: false; reason: 'oversized'; totalBytes: number };

/**
 * Build storage.sync set() items for a slim store at `updatedAt`.
 * Splits JSON across chunk keys to stay under per-item limits.
 */
export function buildSyncItems(
  slim: Store,
  updatedAt: number,
): BuildSyncItemsResult {
  const json = JSON.stringify(slim);
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += SYNC_CHUNK_CHAR_BUDGET) {
    chunks.push(json.slice(i, i + SYNC_CHUNK_CHAR_BUDGET));
  }

  const meta: SyncMeta = { updatedAt, chunkCount: chunks.length };
  const items: Record<string, unknown> = { [SYNC_META_KEY]: meta };

  let totalBytes = estimateSyncItemBytes(SYNC_META_KEY, meta);
  for (let i = 0; i < chunks.length; i += 1) {
    const key = syncChunkKey(i);
    const value = chunks[i]!;
    const itemBytes = estimateSyncItemBytes(key, value);
    if (itemBytes > SYNC_MAX_ITEM_BYTES) {
      return { ok: false, reason: 'oversized', totalBytes: totalBytes + itemBytes };
    }
    items[key] = value;
    totalBytes += itemBytes;
  }

  if (totalBytes > SYNC_QUOTA_BYTES) {
    return { ok: false, reason: 'oversized', totalBytes };
  }

  return { ok: true, items, chunkCount: chunks.length, totalBytes };
}

export function parseSyncMeta(raw: unknown): SyncMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (
    typeof record.updatedAt !== 'number' ||
    !Number.isFinite(record.updatedAt) ||
    typeof record.chunkCount !== 'number' ||
    !Number.isInteger(record.chunkCount) ||
    record.chunkCount < 1
  ) {
    return null;
  }
  return {
    updatedAt: record.updatedAt,
    chunkCount: record.chunkCount,
  };
}

/**
 * Reassemble slim-store JSON from a storage.sync get() result.
 * Distinguishes true empty sync from incomplete/corrupt chunk sets.
 */
export type ReassembleSyncResult =
  | { ok: true; updatedAt: number; json: string }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'incomplete' };

function areaHasSyncKeys(area: Record<string, unknown>): boolean {
  return Object.keys(area).some(
    (key) => key === SYNC_META_KEY || key.startsWith(SYNC_CHUNK_KEY_PREFIX),
  );
}

export function reassembleSyncStoreJson(
  area: Record<string, unknown>,
): ReassembleSyncResult {
  const meta = parseSyncMeta(area[SYNC_META_KEY]);
  if (!meta) {
    return {
      ok: false,
      reason: areaHasSyncKeys(area) ? 'incomplete' : 'empty',
    };
  }

  const parts: string[] = [];
  for (let i = 0; i < meta.chunkCount; i += 1) {
    const chunk = area[syncChunkKey(i)];
    if (typeof chunk !== 'string') {
      return { ok: false, reason: 'incomplete' };
    }
    parts.push(chunk);
  }
  return { ok: true, updatedAt: meta.updatedAt, json: parts.join('') };
}

/** Keys to remove when shrinking chunk count after a smaller write. */
export function staleSyncChunkKeys(
  previousChunkCount: number,
  nextChunkCount: number,
): string[] {
  if (previousChunkCount <= nextChunkCount) return [];
  const keys: string[] = [];
  for (let i = nextChunkCount; i < previousChunkCount; i += 1) {
    keys.push(syncChunkKey(i));
  }
  return keys;
}
