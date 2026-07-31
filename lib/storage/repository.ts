import type { Dial } from '../schemas/dial';
import type { Settings } from '../schemas/settings';
import {
  createEmptyStore,
  withActiveDials,
  type Store,
} from '../schemas/store';
import { STORAGE_KEYS } from './keys';
import { migrateStoreWithMeta } from './migrate';
import { createSeedDials } from '../dials/seed';
import {
  getSyncEnabled,
  noteLocalWriteForSync,
  readRemoteSyncStore,
  registerSyncPersist,
  type SetStoreOptions,
} from './firefoxSync';

export type LoadStoreResult = {
  store: Store;
  droppedDialCount: number;
  droppedWidgetCount: number;
  repaired: boolean;
};

/** Serialize concurrent storage.local writes. */
let writeChain: Promise<void> = Promise.resolve();

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  const run = writeChain.then(task, task);
  // Keep the chain alive even if a write fails.
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function getStore(): Promise<LoadStoreResult> {
  const result = await browser.storage.local.get(STORAGE_KEYS.store);
  const raw = result[STORAGE_KEYS.store];

  if (raw === undefined) {
    // Prefer a newer Firefox Sync payload over seed dials when sync is on.
    if (await getSyncEnabled()) {
      const remote = await readRemoteSyncStore();
      if (remote) {
        await setStore(remote.store, {
          skipSyncPush: true,
          updatedAt: remote.updatedAt,
        });
        return {
          store: remote.store,
          droppedDialCount: remote.droppedDialCount,
          droppedWidgetCount: remote.droppedWidgetCount,
          repaired: remote.repaired,
        };
      }
    }

    const seeded = createEmptyStore(createSeedDials());
    // Do not advance the LWW clock for an automatic seed — otherwise a
    // post-reinstall first open looks "newer" than Firefox Sync and overwrites
    // cloud data when the user re-enables sync.
    await setStore(seeded, { skipSyncPush: true });
    return {
      store: seeded,
      droppedDialCount: 0,
      droppedWidgetCount: 0,
      repaired: false,
    };
  }

  const migrated = migrateStoreWithMeta(raw);
  if (migrated.repaired) {
    await setStore(migrated.store);
  }
  return {
    store: migrated.store,
    droppedDialCount: migrated.droppedDialCount,
    droppedWidgetCount: migrated.droppedWidgetCount,
    repaired: migrated.repaired,
  };
}

export async function setStore(
  store: Store,
  options: SetStoreOptions = {},
): Promise<void> {
  // Svelte 5 $state wraps objects in Proxies; storage.local uses structured
  // clone and throws DataCloneError on Proxies. Store is plain JSON.
  const plain = JSON.parse(JSON.stringify(store)) as Store;
  await enqueueWrite(async () => {
    await browser.storage.local.set({ [STORAGE_KEYS.store]: plain });
  });
  await noteLocalWriteForSync(plain, options);
}

registerSyncPersist(setStore);

/**
 * Apply dial updates against an in-memory base store (never re-reads storage).
 * Prefer App's in-memory + debounced saver; this exists for callers that already
 * hold the current store and need a serialized write.
 */
export async function updateDials(
  base: Store,
  dials: Dial[],
): Promise<Store> {
  const next = withActiveDials(base, dials);
  await setStore(next);
  return next;
}

/**
 * Apply settings updates against an in-memory base store (never re-reads storage).
 */
export async function updateSettings(
  base: Store,
  partial: Partial<Settings>,
): Promise<Store> {
  const next: Store = {
    ...base,
    settings: { ...base.settings, ...partial },
  };
  await setStore(next);
  return next;
}

export type DebouncedSaverOptions = {
  onError?: (error: unknown) => void;
};

export function createDebouncedSaver(
  delayMs = 200,
  options: DebouncedSaverOptions = {},
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Store | undefined;
  let inflight = 0;

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (!pending) return;
    const store = pending;
    pending = undefined;
    inflight += 1;
    try {
      await setStore(store);
    } catch (error) {
      // Re-queue so a later flush/hasPending still reflects unsaved work.
      if (!pending) pending = store;
      options.onError?.(error);
      throw error;
    } finally {
      inflight -= 1;
    }
  };

  const schedule = (store: Store) => {
    pending = store;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void flush().catch(() => {
        // Error already reported via onError.
      });
    }, delayMs);
  };

  const saveNow = async (store: Store) => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    // Queue through flush so a concurrent schedule() during the write is not
    // wiped by clearing `pending` up front (old saveNow discarded newer work).
    pending = store;
    await flush();
  };

  const hasPending = () => pending !== undefined || inflight > 0;

  return { schedule, flush, saveNow, hasPending };
}
