import type { Store } from '../schemas/store';
import { migrateStoreWithMeta } from './migrate';
import { STORAGE_KEYS } from './keys';
import {
  SYNC_CHUNK_KEY_PREFIX,
  SYNC_META_KEY,
  buildSyncItems,
  parseSyncMeta,
  reassembleSyncStoreJson,
  slimStoreForSync,
  staleSyncChunkKeys,
  type SyncStatus,
} from './syncPayload';

function isOurSyncKey(key: string): boolean {
  return key === SYNC_META_KEY || key.startsWith(SYNC_CHUNK_KEY_PREFIX);
}

export type { SyncStatus } from './syncPayload';

export type SetStoreOptions = {
  /** Skip scheduling a storage.sync push (used when applying remote sync). */
  skipSyncPush?: boolean;
  /**
   * Explicit LWW timestamp. When omitted and sync push is not skipped,
   * uses Date.now().
   */
  updatedAt?: number;
};

export type MergeFromSyncResult =
  | { action: 'disabled' }
  | { action: 'empty' }
  | { action: 'kept-local'; remoteUpdatedAt: number; localUpdatedAt: number }
  | {
      action: 'applied';
      store: Store;
      updatedAt: number;
      droppedDialCount: number;
      droppedWidgetCount: number;
      repaired: boolean;
    }
  | { action: 'error'; error: unknown };

const SYNC_PUSH_DELAY_MS = 1_500;

let syncPushTimer: ReturnType<typeof setTimeout> | undefined;
let syncPushPendingStore: Store | undefined;
let syncPushPendingUpdatedAt: number | undefined;
let syncPushInflight = 0;
/** When true, ignore storage.sync onChanged that we caused ourselves. */
let ignoreNextSyncEcho = false;

type PersistLocalFn = (
  store: Store,
  options?: SetStoreOptions,
) => Promise<void>;

let persistLocal: PersistLocalFn | null = null;

/** Wire repository.setStore so sync pull can write local without re-entrancy. */
export function registerSyncPersist(fn: PersistLocalFn): void {
  persistLocal = fn;
}

export async function getSyncEnabled(): Promise<boolean> {
  const result = await browser.storage.local.get(STORAGE_KEYS.syncEnabled);
  return result[STORAGE_KEYS.syncEnabled] === true;
}

export async function getLocalUpdatedAt(): Promise<number> {
  const result = await browser.storage.local.get(STORAGE_KEYS.localUpdatedAt);
  const value = result[STORAGE_KEYS.localUpdatedAt];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const result = await browser.storage.local.get(STORAGE_KEYS.syncStatus);
  const raw = result[STORAGE_KEYS.syncStatus];
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const status: SyncStatus = {};
  if (typeof record.lastPushAt === 'number') status.lastPushAt = record.lastPushAt;
  if (typeof record.lastPullAt === 'number') status.lastPullAt = record.lastPullAt;
  if (
    record.lastError === 'quota' ||
    record.lastError === 'oversized' ||
    record.lastError === 'unknown' ||
    record.lastError === null
  ) {
    status.lastError = record.lastError;
  }
  return status;
}

async function setSyncStatus(partial: SyncStatus): Promise<void> {
  const current = await getSyncStatus();
  const next: SyncStatus = { ...current, ...partial };
  if (partial.lastError === null) {
    next.lastError = null;
  }
  await browser.storage.local.set({ [STORAGE_KEYS.syncStatus]: next });
}

async function setLocalUpdatedAt(updatedAt: number): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.localUpdatedAt]: updatedAt,
  });
}

function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);
  return /quota/i.test(message);
}

/** Read and parse the remote slim store from storage.sync. */
export async function readRemoteSyncStore(): Promise<{
  store: Store;
  updatedAt: number;
  droppedDialCount: number;
  droppedWidgetCount: number;
  repaired: boolean;
} | null> {
  const area = (await browser.storage.sync.get(null)) as Record<
    string,
    unknown
  >;
  const assembled = reassembleSyncStoreJson(area);
  if (!assembled) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(assembled.json);
  } catch {
    return null;
  }

  const migrated = migrateStoreWithMeta(parsed);
  return {
    store: migrated.store,
    updatedAt: assembled.updatedAt,
    droppedDialCount: migrated.droppedDialCount,
    droppedWidgetCount: migrated.droppedWidgetCount,
    repaired: migrated.repaired,
  };
}

export async function pushStoreToSync(
  store: Store,
  updatedAt: number,
): Promise<{ ok: true } | { ok: false; reason: 'quota' | 'oversized' | 'unknown' }> {
  const enabled = await getSyncEnabled();
  if (!enabled) return { ok: true };

  const slim = slimStoreForSync(store);
  const built = buildSyncItems(slim, updatedAt);
  if (!built.ok) {
    await setSyncStatus({ lastError: 'oversized' });
    return { ok: false, reason: 'oversized' };
  }

  try {
    const existing = await browser.storage.sync.get(SYNC_META_KEY);
    const prevMeta = parseSyncMeta(existing[SYNC_META_KEY]);
    const stale = staleSyncChunkKeys(
      prevMeta?.chunkCount ?? 0,
      built.chunkCount,
    );

    ignoreNextSyncEcho = true;
    await browser.storage.sync.set(built.items);
    if (stale.length > 0) {
      await browser.storage.sync.remove(stale);
    }
    await setSyncStatus({ lastPushAt: Date.now(), lastError: null });
    return { ok: true };
  } catch (error) {
    ignoreNextSyncEcho = false;
    const reason = isQuotaError(error) ? 'quota' : 'unknown';
    await setSyncStatus({ lastError: reason });
    return { ok: false, reason };
  }
}

async function flushSyncPush(): Promise<void> {
  if (syncPushTimer) {
    clearTimeout(syncPushTimer);
    syncPushTimer = undefined;
  }
  const store = syncPushPendingStore;
  const updatedAt = syncPushPendingUpdatedAt;
  syncPushPendingStore = undefined;
  syncPushPendingUpdatedAt = undefined;
  if (!store || updatedAt === undefined) return;

  syncPushInflight += 1;
  try {
    await pushStoreToSync(store, updatedAt);
  } finally {
    syncPushInflight -= 1;
  }
}

/** After a local write, bump LWW clock and schedule a debounced sync push. */
export async function noteLocalWriteForSync(
  store: Store,
  options: SetStoreOptions = {},
): Promise<number> {
  if (options.skipSyncPush) {
    if (options.updatedAt !== undefined) {
      await setLocalUpdatedAt(options.updatedAt);
      return options.updatedAt;
    }
    return getLocalUpdatedAt();
  }

  const updatedAt = options.updatedAt ?? Date.now();
  await setLocalUpdatedAt(updatedAt);

  const enabled = await getSyncEnabled();
  if (!enabled) return updatedAt;

  syncPushPendingStore = store;
  syncPushPendingUpdatedAt = updatedAt;
  if (syncPushTimer) clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(() => {
    void flushSyncPush();
  }, SYNC_PUSH_DELAY_MS);

  return updatedAt;
}

export async function flushPendingSyncPush(): Promise<void> {
  await flushSyncPush();
}

export function hasPendingSyncPush(): boolean {
  return syncPushPendingStore !== undefined || syncPushInflight > 0;
}

/**
 * Pull from storage.sync and apply when remote updatedAt is newer (LWW).
 */
export async function mergeFromSync(): Promise<MergeFromSyncResult> {
  const enabled = await getSyncEnabled();
  if (!enabled) return { action: 'disabled' };

  let remote: Awaited<ReturnType<typeof readRemoteSyncStore>>;
  try {
    remote = await readRemoteSyncStore();
  } catch (error) {
    await setSyncStatus({ lastError: 'unknown' });
    return { action: 'error', error };
  }

  if (!remote) return { action: 'empty' };

  const localUpdatedAt = await getLocalUpdatedAt();
  if (remote.updatedAt <= localUpdatedAt) {
    return {
      action: 'kept-local',
      remoteUpdatedAt: remote.updatedAt,
      localUpdatedAt,
    };
  }

  if (!persistLocal) {
    return { action: 'error', error: new Error('Sync persist not registered') };
  }

  await persistLocal(remote.store, {
    skipSyncPush: true,
    updatedAt: remote.updatedAt,
  });
  await setSyncStatus({ lastPullAt: Date.now(), lastError: null });

  return {
    action: 'applied',
    store: remote.store,
    updatedAt: remote.updatedAt,
    droppedDialCount: remote.droppedDialCount,
    droppedWidgetCount: remote.droppedWidgetCount,
    repaired: remote.repaired,
  };
}

/**
 * Enable or disable sync. When enabling, merge remote if newer, else push local.
 */
export async function setSyncEnabled(
  enabled: boolean,
  currentStore: Store,
): Promise<MergeFromSyncResult | { action: 'pushed' } | { action: 'disabled' }> {
  await browser.storage.local.set({ [STORAGE_KEYS.syncEnabled]: enabled });

  if (!enabled) {
    if (syncPushTimer) {
      clearTimeout(syncPushTimer);
      syncPushTimer = undefined;
    }
    syncPushPendingStore = undefined;
    syncPushPendingUpdatedAt = undefined;
    return { action: 'disabled' };
  }

  // Ensure we have a local clock before comparing.
  let localUpdatedAt = await getLocalUpdatedAt();
  if (localUpdatedAt === 0) {
    localUpdatedAt = Date.now();
    await setLocalUpdatedAt(localUpdatedAt);
  }

  const merged = await mergeFromSync();
  if (merged.action === 'applied') return merged;
  if (merged.action === 'error') return merged;

  // empty or kept-local → push current local layout.
  const result = await pushStoreToSync(currentStore, localUpdatedAt);
  if (!result.ok) {
    return { action: 'error', error: new Error(result.reason) };
  }
  return { action: 'pushed' };
}

/**
 * Handle storage.onChanged for the sync area. Returns applied store when LWW
 * chooses remote.
 */
export async function handleSyncStorageChanged(
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
): Promise<MergeFromSyncResult | { action: 'ignored' }> {
  const touchedOurs = Object.keys(changes).some(isOurSyncKey);
  if (!touchedOurs) return { action: 'ignored' };

  if (ignoreNextSyncEcho) {
    ignoreNextSyncEcho = false;
    return { action: 'ignored' };
  }

  const enabled = await getSyncEnabled();
  if (!enabled) return { action: 'ignored' };

  return mergeFromSync();
}
