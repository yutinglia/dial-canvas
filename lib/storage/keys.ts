export const STORAGE_KEYS = {
  store: 'store',
  /** Local-only: whether Firefox Sync push/pull is enabled (default off). */
  syncEnabled: 'syncEnabled',
  /** Local-only: epoch ms of the last local revision used for LWW. */
  localUpdatedAt: 'localUpdatedAt',
  /** Local-only: last sync push/pull status for Settings UI. */
  syncStatus: 'syncStatus',
} as const;
