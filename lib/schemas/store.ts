import { z } from 'zod';
import { DialSchema, type Dial } from './dial';
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from './settings';

export const STORE_VERSION = 1 as const;

export const StoreSchema = z.object({
  version: z.literal(STORE_VERSION),
  dials: z.array(DialSchema),
  settings: SettingsSchema,
});

export type Store = z.infer<typeof StoreSchema>;

export function createEmptyStore(dials: Dial[] = []): Store {
  return {
    version: STORE_VERSION,
    dials,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function parseStore(raw: unknown): Store {
  const result = StoreSchema.safeParse(raw);
  if (result.success) return result.data;

  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const dials: Dial[] = [];
    if (Array.isArray(record.dials)) {
      for (const item of record.dials) {
        const dial = DialSchema.safeParse(item);
        if (dial.success) dials.push(dial.data);
      }
    }
    const settingsResult = SettingsSchema.safeParse(record.settings);
    const settings: Settings = settingsResult.success
      ? settingsResult.data
      : { ...DEFAULT_SETTINGS };
    return { version: STORE_VERSION, dials, settings };
  }

  return createEmptyStore();
}
