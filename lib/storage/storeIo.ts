import { dialsFromBookmarks, type BookmarkCandidate } from '../dials/bookmarks';
import { createSeedDials } from '../dials/seed';
import type { Size } from '../layout';
import { occupiedRects } from '../layout/occupiedRects';
import {
  createEmptyStore,
  getActiveDials,
  getActiveWidgets,
  withActiveDials,
  type Store,
} from '../schemas/store';
import { migrateStoreWithMeta } from './migrate';

export function downloadStoreJson(store: Store): void {
  const blob = new Blob([JSON.stringify(store, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dial-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportStoreResult = {
  store: Store;
  droppedDialCount: number;
  droppedWidgetCount: number;
};

export async function parseStoreImportFile(
  file: File,
): Promise<ImportStoreResult> {
  const text = await file.text();
  const raw = JSON.parse(text) as unknown;
  const migrated = migrateStoreWithMeta(raw);
  return {
    store: migrated.store,
    droppedDialCount: migrated.droppedDialCount,
    droppedWidgetCount: migrated.droppedWidgetCount,
  };
}

/** Build a user-facing import toast that mentions dropped dials/widgets. */
export function formatImportSuccessMessage(
  droppedDialCount: number,
  droppedWidgetCount: number,
  t: (key: string, substitutions?: string | string[]) => string,
): string {
  if (droppedDialCount === 0 && droppedWidgetCount === 0) {
    return t('importSuccess');
  }
  const parts = [
    droppedDialCount > 0
      ? droppedDialCount === 1
        ? t('dialRemovedOne')
        : t('dialRemovedMany', String(droppedDialCount))
      : '',
    droppedWidgetCount > 0
      ? droppedWidgetCount === 1
        ? t('widgetRemovedOne')
        : t('widgetRemovedMany', String(droppedWidgetCount))
      : '',
  ].filter(Boolean);
  return `${t('importSuccess')} ${parts.join(' ')}`;
}

export function createResetStore(): Store {
  return createEmptyStore(createSeedDials());
}

export type BookmarkImportResult =
  | { ok: true; store: Store; added: number }
  | { ok: false; reason: 'none' };

export function mergeBookmarksIntoStore(
  store: Store,
  bookmarks: BookmarkCandidate[],
  canvasSize: Size,
  maxFresh = 40,
): BookmarkImportResult {
  if (bookmarks.length === 0) return { ok: false, reason: 'none' };
  const existing = getActiveDials(store);
  const existingUrls = new Set(existing.map((d) => d.url));
  const fresh = bookmarks.filter((b) => !existingUrls.has(b.url));
  if (fresh.length === 0) return { ok: false, reason: 'none' };
  const widgets = getActiveWidgets(store);
  const nextDials = dialsFromBookmarks(
    fresh,
    existing,
    store.settings.gridSize,
    canvasSize,
    maxFresh,
    occupiedRects([], widgets),
  );
  const added = nextDials.length - existing.length;
  return {
    ok: true,
    store: withActiveDials(store, nextDials),
    added,
  };
}
