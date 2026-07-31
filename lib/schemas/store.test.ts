import { describe, expect, it } from 'vitest';
import { DialSchema } from './dial';
import { DEFAULT_SETTINGS, SettingsSchema } from './settings';
import {
  STORE_VERSION,
  createEmptyStore,
  parseStore,
} from './store';
import { migrateStore } from '../storage/migrate';

const validDial = {
  id: 'd1',
  title: 'Example',
  url: 'https://example.com/',
  x: 0,
  y: 0,
  width: 64,
  height: 64,
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
});

describe('SettingsSchema', () => {
  it('fills defaults for an empty object', () => {
    expect(SettingsSchema.parse({})).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.gridSize).toBe(16);
    expect(DEFAULT_SETTINGS.snapEnabled).toBe(true);
  });

  it('rejects out-of-range gridSize', () => {
    expect(SettingsSchema.safeParse({ gridSize: 2 }).success).toBe(false);
    expect(SettingsSchema.safeParse({ gridSize: 128 }).success).toBe(false);
  });
});

describe('parseStore', () => {
  it('parses a valid store payload', () => {
    const store = {
      version: STORE_VERSION,
      dials: [validDial],
      settings: DEFAULT_SETTINGS,
    };
    expect(parseStore(store)).toEqual(store);
  });

  it('drops invalid dials and keeps valid ones', () => {
    const result = parseStore({
      version: STORE_VERSION,
      dials: [validDial, { id: 'bad' }, { ...validDial, id: 'd2', url: 'nope' }],
      settings: { gridSize: 24, snapEnabled: false },
    });
    expect(result.dials).toEqual([validDial]);
    expect(result.settings.gridSize).toBe(24);
    expect(result.settings.snapEnabled).toBe(false);
  });

  it('falls back to default settings when settings are invalid', () => {
    const result = parseStore({
      version: STORE_VERSION,
      dials: [],
      settings: { gridSize: 999 },
    });
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('returns an empty store for non-objects', () => {
    expect(parseStore(null)).toEqual(createEmptyStore());
    expect(parseStore('oops')).toEqual(createEmptyStore());
  });
});

describe('migrateStore', () => {
  it('parses current-version payloads', () => {
    const raw = {
      version: STORE_VERSION,
      dials: [validDial],
      settings: DEFAULT_SETTINGS,
    };
    expect(migrateStore(raw)).toEqual(raw);
  });

  it('still recovers unknown / missing version via parseStore', () => {
    expect(migrateStore({ dials: [validDial] }).dials).toEqual([validDial]);
    expect(migrateStore(undefined)).toEqual(createEmptyStore());
  });
});
