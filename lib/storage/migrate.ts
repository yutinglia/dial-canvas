import type { Store } from '../schemas/store';
import { STORE_VERSION, parseStore } from '../schemas/store';

/** Migrate persisted store payloads across schema versions. */
export function migrateStore(raw: unknown): Store {
  if (raw && typeof raw === 'object' && 'version' in raw) {
    const version = (raw as { version?: unknown }).version;
    if (version === STORE_VERSION) {
      return parseStore(raw);
    }
    // Future migrations land here (v1 → v2, …).
  }
  return parseStore(raw);
}
