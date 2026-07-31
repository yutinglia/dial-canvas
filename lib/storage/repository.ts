import type { Dial } from '../schemas/dial';
import type { Settings } from '../schemas/settings';
import { createEmptyStore, type Store } from '../schemas/store';
import { STORAGE_KEYS } from './keys';
import { migrateStore } from './migrate';
import { createSeedDials } from '../dials/seed';

export async function getStore(): Promise<Store> {
  const result = await browser.storage.local.get(STORAGE_KEYS.store);
  const raw = result[STORAGE_KEYS.store];

  if (raw === undefined) {
    const seeded = createEmptyStore(createSeedDials());
    await setStore(seeded);
    return seeded;
  }

  return migrateStore(raw);
}

export async function setStore(store: Store): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.store]: store });
}

export async function updateDials(dials: Dial[]): Promise<Store> {
  const store = await getStore();
  const next: Store = { ...store, dials };
  await setStore(next);
  return next;
}

export async function updateSettings(
  partial: Partial<Settings>,
): Promise<Store> {
  const store = await getStore();
  const next: Store = {
    ...store,
    settings: { ...store.settings, ...partial },
  };
  await setStore(next);
  return next;
}

export function createDebouncedSaver(delayMs = 200) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Store | undefined;

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (!pending) return;
    const store = pending;
    pending = undefined;
    await setStore(store);
  };

  const schedule = (store: Store) => {
    pending = store;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, delayMs);
  };

  const saveNow = async (store: Store) => {
    pending = undefined;
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    await setStore(store);
  };

  return { schedule, flush, saveNow };
}
