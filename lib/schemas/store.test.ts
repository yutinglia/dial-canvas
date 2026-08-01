import { describe, expect, it } from 'vitest';
import { DialSchema } from './dial';
import { DEFAULT_SETTINGS, SettingsSchema } from './settings';
import {
  STORE_VERSION,
  createEmptyStore,
  getActiveDials,
  getActiveWidgets,
  parseStore,
  parseStoreWithMeta,
} from './store';
import { migrateStore, migrateStoreWithMeta } from '../storage/migrate';

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

const validClock = {
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

const sampleStore = {
  version: STORE_VERSION,
  pages: [
    { id: 'page-home', name: 'Home', dials: [validDial], widgets: [validClock] },
  ],
  activePageId: 'page-home',
  settings: DEFAULT_SETTINGS,
};

describe('DialSchema', () => {
  it('accepts a well-formed dial', () => {
    expect(DialSchema.parse(validDial)).toEqual(validDial);
  });

  it('rejects invalid urls and undersized dims', () => {
    expect(DialSchema.safeParse({ ...validDial, url: 'not-a-url' }).success).toBe(
      false,
    );
    expect(
      DialSchema.safeParse({ ...validDial, width: 32 }).success,
    ).toBe(false);
  });

  it('rejects dangerous dial URL schemes', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,hi',
      'file:///tmp/x',
      'blob:https://example.com/uuid',
    ]) {
      expect(DialSchema.safeParse({ ...validDial, url }).success).toBe(false);
    }
  });

  it('accepts http(s) and about dial URLs', () => {
    expect(
      DialSchema.safeParse({ ...validDial, url: 'https://example.com/a' }).success,
    ).toBe(true);
    expect(
      DialSchema.safeParse({ ...validDial, url: 'http://example.com/' }).success,
    ).toBe(true);
    expect(
      DialSchema.safeParse({ ...validDial, url: 'about:blank' }).success,
    ).toBe(true);
  });

  it('validates faviconUrl schemes and data:image length', () => {
    expect(
      DialSchema.safeParse({
        ...validDial,
        faviconUrl: 'https://example.com/icon.png',
      }).success,
    ).toBe(true);
    expect(
      DialSchema.safeParse({
        ...validDial,
        faviconUrl: 'data:image/png;base64,abc',
      }).success,
    ).toBe(true);
    expect(
      DialSchema.safeParse({
        ...validDial,
        faviconUrl: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
    expect(
      DialSchema.safeParse({
        ...validDial,
        faviconUrl: 'data:text/html,hi',
      }).success,
    ).toBe(false);
  });

  it('accepts optional in-range iconSize and fontSize', () => {
    const withSizes = { ...validDial, iconSize: 48, fontSize: 18 };
    expect(DialSchema.parse(withSizes)).toEqual(withSizes);
    expect(DialSchema.parse(validDial).iconSize).toBeUndefined();
    expect(DialSchema.parse(validDial).fontSize).toBeUndefined();
  });

  it('defaults showWhenNarrow to false and accepts narrowOrder', () => {
    const withoutFlag = {
      id: 'd1',
      title: 'Example',
      url: 'https://example.com/',
      x: 0,
      y: 0,
      width: 64,
      height: 64,
    };
    expect(DialSchema.parse(withoutFlag).showWhenNarrow).toBe(false);
    expect(
      DialSchema.parse({
        ...withoutFlag,
        showWhenNarrow: true,
        narrowOrder: 2,
      }),
    ).toMatchObject({ showWhenNarrow: true, narrowOrder: 2 });
  });

  it('rejects out-of-range dial iconSize and fontSize', () => {
    expect(
      DialSchema.safeParse({ ...validDial, iconSize: 8 }).success,
    ).toBe(false);
    expect(
      DialSchema.safeParse({ ...validDial, iconSize: 128 }).success,
    ).toBe(false);
    expect(
      DialSchema.safeParse({ ...validDial, fontSize: 5 }).success,
    ).toBe(false);
    expect(
      DialSchema.safeParse({ ...validDial, fontSize: 32 }).success,
    ).toBe(false);
  });
});

describe('SettingsSchema', () => {
  it('fills defaults for an empty object', () => {
    expect(SettingsSchema.parse({})).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.locale).toBe('system');
    expect(DEFAULT_SETTINGS.gridSize).toBe(20);
    expect(DEFAULT_SETTINGS.snapThreshold).toBe(10);
    expect(DEFAULT_SETTINGS.snapEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.iconSize).toBe(40);
    expect(DEFAULT_SETTINGS.fontSize).toBe(15);
    expect(DEFAULT_SETTINGS.narrowBreakpoint).toBe(600);
  });

  it('rejects out-of-range gridSize', () => {
    expect(SettingsSchema.safeParse({ gridSize: 2 }).success).toBe(false);
    expect(SettingsSchema.safeParse({ gridSize: 128 }).success).toBe(false);
  });

  it('rejects out-of-range iconSize and fontSize', () => {
    expect(SettingsSchema.safeParse({ iconSize: 8 }).success).toBe(false);
    expect(SettingsSchema.safeParse({ iconSize: 128 }).success).toBe(false);
    expect(SettingsSchema.safeParse({ fontSize: 5 }).success).toBe(false);
    expect(SettingsSchema.safeParse({ fontSize: 32 }).success).toBe(false);
  });

  it('accepts image wallpaper backgrounds', () => {
    const parsed = SettingsSchema.parse({
      background: {
        type: 'image',
        value: 'https://example.com/wall.jpg',
        fit: 'contain',
      },
    });
    expect(parsed.background).toEqual({
      type: 'image',
      value: 'https://example.com/wall.jpg',
      fit: 'contain',
      opacity: 1,
    });
  });

  it('accepts bing wallpaper backgrounds', () => {
    const parsed = SettingsSchema.parse({
      background: {
        type: 'bing',
        fit: 'cover',
        cachedUrl: 'https://www.bing.com/th?id=OHR.example',
        cachedDate: '2026-08-01',
        cachedTitle: 'Example peak',
        cachedCopyright: '© Example Photographer',
        locked: true,
      },
    });
    expect(parsed.background).toEqual({
      type: 'bing',
      fit: 'cover',
      opacity: 1,
      cachedUrl: 'https://www.bing.com/th?id=OHR.example',
      cachedDate: '2026-08-01',
      cachedTitle: 'Example peak',
      cachedCopyright: '© Example Photographer',
      locked: true,
    });
  });

  it('defaults bing fit, locked, and allows empty cache', () => {
    const parsed = SettingsSchema.parse({
      background: { type: 'bing' },
    });
    expect(parsed.background).toEqual({
      type: 'bing',
      fit: 'cover',
      opacity: 1,
      locked: false,
    });
  });

  it('accepts wallpaper opacity for image and bing', () => {
    const image = SettingsSchema.parse({
      background: {
        type: 'image',
        value: 'https://example.com/wall.jpg',
        fit: 'cover',
        opacity: 0.4,
      },
    });
    expect(image.background).toMatchObject({ type: 'image', opacity: 0.4 });

    const bing = SettingsSchema.parse({
      background: {
        type: 'bing',
        fit: 'tile',
        opacity: 0,
      },
    });
    expect(bing.background).toMatchObject({ type: 'bing', opacity: 0 });
  });

  it('rejects invalid wallpaper opacity', () => {
    expect(
      SettingsSchema.safeParse({
        background: {
          type: 'image',
          value: 'https://example.com/wall.jpg',
          fit: 'cover',
          opacity: 1.5,
        },
      }).success,
    ).toBe(false);
    expect(
      SettingsSchema.safeParse({
        background: {
          type: 'bing',
          opacity: -0.1,
        },
      }).success,
    ).toBe(false);
  });
});

describe('parseStore', () => {
  it('parses a valid store payload', () => {
    expect(parseStore(sampleStore)).toEqual(sampleStore);
  });

  it('drops invalid dials and keeps valid ones', () => {
    const result = parseStore({
      version: STORE_VERSION,
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [
            validDial,
            { id: 'bad' },
            { ...validDial, id: 'd2', url: 'nope' },
          ],
          widgets: [],
        },
      ],
      activePageId: 'page-home',
      settings: { gridSize: 24, snapEnabled: false },
    });
    expect(getActiveDials(result)).toEqual([validDial]);
    expect(result.settings.gridSize).toBe(24);
    expect(result.settings.snapEnabled).toBe(false);
  });

  it('drops invalid widgets and keeps valid ones', () => {
    const result = parseStoreWithMeta({
      version: STORE_VERSION,
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [],
          widgets: [
            validClock,
            { id: 'bad', type: 'clock' },
            { ...validClock, id: 'w2', type: 'weather', location: { name: 'x' } },
          ],
        },
      ],
      activePageId: 'page-home',
      settings: DEFAULT_SETTINGS,
    });
    expect(result.droppedWidgetCount).toBe(2);
    expect(getActiveWidgets(result.store)).toEqual([validClock]);
  });

  it('drops dials with disallowed URL schemes during recovery', () => {
    const result = parseStore({
      version: STORE_VERSION,
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [
            validDial,
            { ...validDial, id: 'js', url: 'javascript:alert(1)' },
          ],
          widgets: [],
        },
      ],
      activePageId: 'page-home',
      settings: DEFAULT_SETTINGS,
    });
    expect(getActiveDials(result)).toEqual([validDial]);
  });

  it('falls back to default settings when settings are invalid', () => {
    const result = parseStore({
      version: STORE_VERSION,
      pages: [{ id: 'page-home', name: 'Home', dials: [], widgets: [] }],
      activePageId: 'page-home',
      settings: { gridSize: 999 },
    });
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps other settings when only background is invalid', () => {
    const result = parseStoreWithMeta({
      version: STORE_VERSION,
      pages: [{ id: 'page-home', name: 'Home', dials: [], widgets: [] }],
      activePageId: 'page-home',
      settings: {
        gridSize: 24,
        snapEnabled: true,
        snapThreshold: 12,
        canvasMinWidth: 1400,
        canvasMinHeight: 900,
        iconSize: 48,
        fontSize: 18,
        background: { type: 'image', value: 'javascript:alert(1)', fit: 'cover' },
      },
    });
    expect(result.repaired).toBe(true);
    expect(result.store.settings.gridSize).toBe(24);
    expect(result.store.settings.snapEnabled).toBe(true);
    expect(result.store.settings.iconSize).toBe(48);
    expect(result.store.settings.fontSize).toBe(18);
    expect(result.store.settings.background).toEqual(DEFAULT_SETTINGS.background);
  });

  it('returns an empty store for non-objects', () => {
    expect(parseStore(null)).toEqual(createEmptyStore());
    expect(parseStore('oops')).toEqual(createEmptyStore());
  });

  it('recovers legacy top-level dials arrays', () => {
    const result = parseStoreWithMeta({
      dials: [validDial],
      settings: DEFAULT_SETTINGS,
    });
    expect(result.repaired).toBe(true);
    expect(getActiveDials(result.store)).toEqual([validDial]);
    expect(getActiveWidgets(result.store)).toEqual([]);
    expect(result.store.version).toBe(STORE_VERSION);
  });
});

describe('migrateStore', () => {
  it('parses current-version payloads', () => {
    expect(migrateStore(sampleStore)).toEqual(sampleStore);
  });

  it('migrates v1 dials to a Home page with widgets and marks repaired', () => {
    const result = migrateStoreWithMeta({
      version: 1,
      dials: [validDial],
      settings: DEFAULT_SETTINGS,
    });
    expect(result.repaired).toBe(true);
    expect(result.store.version).toBe(STORE_VERSION);
    expect(result.store.pages).toHaveLength(1);
    expect(result.store.pages[0]?.name).toBe('Home');
    expect(getActiveDials(result.store)).toEqual([validDial]);
    expect(getActiveWidgets(result.store)).toEqual([]);
  });

  it('migrates v2 pages by adding empty widgets arrays', () => {
    const result = migrateStoreWithMeta({
      version: 2,
      pages: [{ id: 'page-home', name: 'Home', dials: [validDial] }],
      activePageId: 'page-home',
      settings: DEFAULT_SETTINGS,
    });
    expect(result.repaired).toBe(true);
    expect(result.store.version).toBe(STORE_VERSION);
    expect(getActiveDials(result.store)).toEqual([validDial]);
    expect(getActiveWidgets(result.store)).toEqual([]);
  });

  it('migrates v3 stores to v4 without forcing layoutSize', () => {
    const result = migrateStoreWithMeta({
      version: 3,
      pages: [
        {
          id: 'page-home',
          name: 'Home',
          dials: [validDial],
          widgets: [validClock],
        },
      ],
      activePageId: 'page-home',
      settings: DEFAULT_SETTINGS,
    });
    expect(result.repaired).toBe(true);
    expect(result.store.version).toBe(STORE_VERSION);
    expect(result.store.layoutSize).toBeUndefined();
    expect(getActiveDials(result.store)).toEqual([validDial]);
    expect(getActiveWidgets(result.store)).toEqual([validClock]);
  });

  it('still recovers unknown / missing version via parseStore', () => {
    expect(getActiveDials(migrateStore({ dials: [validDial] }))).toEqual([
      validDial,
    ]);
    expect(migrateStore(undefined)).toEqual(createEmptyStore());
  });
});
