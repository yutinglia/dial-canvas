import {
  STORE_VERSION,
  parseStoreWithMeta,
  type ParseStoreResult,
  type Store,
} from '../schemas/store';
import { SettingsSchema } from '../schemas/settings';

/** Migrate a v1 `{ version: 1, dials, settings }` payload to v2 multi-page. */
function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  const dials = Array.isArray(raw.dials) ? raw.dials : [];
  const settingsResult = SettingsSchema.safeParse(raw.settings);
  return {
    version: 2,
    pages: [{ id: 'page-home', name: 'Home', dials }],
    activePageId: 'page-home',
    settings: settingsResult.success ? settingsResult.data : raw.settings,
  };
}

/** Migrate a v2 multi-page payload to v3 by adding empty widgets arrays. */
function migrateV2ToV3(raw: Record<string, unknown>): Record<string, unknown> {
  const pages = Array.isArray(raw.pages)
    ? raw.pages.map((page) => {
        if (!page || typeof page !== 'object') return page;
        const record = page as Record<string, unknown>;
        return {
          ...record,
          widgets: Array.isArray(record.widgets) ? record.widgets : [],
        };
      })
    : raw.pages;
  return {
    ...raw,
    version: 3,
    pages,
  };
}

/**
 * Migrate v3 → v4: introduce optional layoutSize (locked at runtime on first
 * wide measure; leave absent so existing absolute coords stay valid).
 */
function migrateV3ToV4(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    version: STORE_VERSION,
  };
}

/** Migrate persisted store payloads across schema versions. */
export function migrateStore(raw: unknown): Store {
  return migrateStoreWithMeta(raw).store;
}

/** Migrate and report whether recovery dropped/fixed data. */
export function migrateStoreWithMeta(raw: unknown): ParseStoreResult {
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const version = record.version;

    if (version === STORE_VERSION) {
      return parseStoreWithMeta(raw);
    }

    if (version === 3) {
      const migrated = migrateV3ToV4(record);
      const parsed = parseStoreWithMeta(migrated);
      return { ...parsed, repaired: true };
    }

    if (version === 2) {
      const migrated = migrateV3ToV4(migrateV2ToV3(record));
      const parsed = parseStoreWithMeta(migrated);
      return { ...parsed, repaired: true };
    }

    if (version === 1) {
      const migrated = migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(record)));
      const parsed = parseStoreWithMeta(migrated);
      // Always treat version bumps as repaired so callers persist the new shape.
      return { ...parsed, repaired: true };
    }

    // Unknown / missing version: attempt recovery (supports loose v1-like shapes).
    return parseStoreWithMeta(raw);
  }

  return parseStoreWithMeta(raw);
}
