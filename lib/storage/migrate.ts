import {
  STORE_VERSION,
  parseStoreWithMeta,
  type ParseStoreResult,
  type Store,
} from '../schemas/store';
import { SettingsSchema } from '../schemas/settings';

/** Migrate a v1 `{ version: 1, dials, settings }` payload to v2 multi-page. */
function migrateV1ToV2(raw: Record<string, unknown>): unknown {
  const dials = Array.isArray(raw.dials) ? raw.dials : [];
  const settingsResult = SettingsSchema.safeParse(raw.settings);
  return {
    version: STORE_VERSION,
    pages: [{ id: 'page-home', name: 'Home', dials }],
    activePageId: 'page-home',
    settings: settingsResult.success ? settingsResult.data : raw.settings,
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

    if (version === 1) {
      const migrated = migrateV1ToV2(record);
      const parsed = parseStoreWithMeta(migrated);
      // Always treat version bumps as repaired so callers persist the new shape.
      return { ...parsed, repaired: true };
    }

    // Unknown / missing version: attempt recovery (supports loose v1-like shapes).
    return parseStoreWithMeta(raw);
  }

  return parseStoreWithMeta(raw);
}
