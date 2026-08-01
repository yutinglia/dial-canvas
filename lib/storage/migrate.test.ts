import { describe, expect, it } from 'vitest';
import { migrateStoreWithMeta } from './migrate';
import { DEFAULT_SETTINGS } from '../schemas/settings';
import { STORE_VERSION, getActiveWidgets } from '../schemas/store';

const validDial = {
  id: 'd1',
  title: 'Example',
  url: 'https://example.com/',
  showWhenNarrow: false,
  x: 0,
  y: 0,
  width: 64,
  height: 64,
};

describe('migrateStoreWithMeta edge cases', () => {
  it('preserves existing widgets arrays when migrating v2', () => {
    const clock = {
      id: 'w1',
      type: 'clock' as const,
      format: '24h' as const,
      showSeconds: false,
      showDate: true,
      showWhenNarrow: false,
      x: 200,
      y: 0,
      width: 160,
      height: 96,
    };
    const result = migrateStoreWithMeta({
      version: 2,
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [validDial],
          widgets: [clock],
        },
        null,
      ],
      activePageId: 'page-home',
      settings: DEFAULT_SETTINGS,
    });
    expect(result.repaired).toBe(true);
    expect(result.store.version).toBe(STORE_VERSION);
    expect(getActiveWidgets(result.store)).toEqual([clock]);
  });

  it('falls back when v1 settings are invalid', () => {
    const result = migrateStoreWithMeta({
      version: 1,
      dials: [validDial],
      settings: { gridSize: 2 },
    });
    expect(result.repaired).toBe(true);
    expect(result.store.version).toBe(STORE_VERSION);
    expect(result.store.settings.gridSize).toBe(DEFAULT_SETTINGS.gridSize);
  });

  it('marks future store versions as unsupported without repair write-back', () => {
    const result = migrateStoreWithMeta({
      version: STORE_VERSION + 1,
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [validDial],
          widgets: [],
        },
      ],
      activePageId: 'page-home',
      settings: DEFAULT_SETTINGS,
    });
    expect(result.unsupportedVersion).toBe(true);
    expect(result.repaired).toBe(false);
    expect(result.store.version).toBe(STORE_VERSION);
    expect(getActiveWidgets(result.store)).toEqual([]);
  });
});
