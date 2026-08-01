import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createResetStore,
  downloadStoreJson,
  formatImportSuccessMessage,
  mergeBookmarksIntoStore,
  parseStoreImportFile,
} from './storeIo';
import { createEmptyStore, getActiveDials, STORE_VERSION } from '../schemas/store';
import { DEFAULT_SETTINGS } from '../schemas/settings';

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('formatImportSuccessMessage', () => {
  const t = (key: string, substitutions?: string | string[]) => {
    if (substitutions === undefined) return key;
    const list = Array.isArray(substitutions) ? substitutions : [substitutions];
    return `${key}:${list.join(',')}`;
  };

  it('returns plain success when nothing was dropped', () => {
    expect(formatImportSuccessMessage(0, 0, t)).toBe('importSuccess');
  });

  it('mentions singular and plural drops', () => {
    expect(formatImportSuccessMessage(1, 0, t)).toBe(
      'importSuccess dialRemovedOne',
    );
    expect(formatImportSuccessMessage(0, 2, t)).toBe(
      'importSuccess widgetRemovedMany:2',
    );
    expect(formatImportSuccessMessage(3, 1, t)).toBe(
      'importSuccess dialRemovedMany:3 widgetRemovedOne',
    );
  });
});

describe('createResetStore', () => {
  it('seeds a fresh store with sample dials', () => {
    const store = createResetStore();
    expect(store.version).toBe(STORE_VERSION);
    expect(getActiveDials(store).length).toBeGreaterThan(0);
  });
});

describe('parseStoreImportFile', () => {
  it('parses and migrates a JSON backup file', async () => {
    const file = {
      text: async () =>
        JSON.stringify({
          version: 1,
          dials: [validDial],
          settings: DEFAULT_SETTINGS,
        }),
    } as File;

    const result = await parseStoreImportFile(file);
    expect(result.store.version).toBe(STORE_VERSION);
    expect(getActiveDials(result.store)).toEqual([validDial]);
    expect(result.droppedDialCount).toBe(0);
  });
});

describe('mergeBookmarksIntoStore', () => {
  it('returns none when there are no fresh bookmarks', () => {
    const store = createEmptyStore([validDial]);
    expect(
      mergeBookmarksIntoStore(store, [], { width: 1200, height: 800 }),
    ).toEqual({ ok: false, reason: 'none' });
    expect(
      mergeBookmarksIntoStore(
        store,
        [{ title: 'Example', url: 'https://example.com/' }],
        { width: 1200, height: 800 },
      ),
    ).toEqual({ ok: false, reason: 'none' });
  });

  it('adds only new bookmark urls', () => {
    const store = createEmptyStore([validDial]);
    const result = mergeBookmarksIntoStore(
      store,
      [
        { title: 'Example', url: 'https://example.com/' },
        { title: 'New', url: 'https://new.example/' },
      ],
      { width: 1200, height: 800 },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.added).toBe(1);
    expect(getActiveDials(result.store).map((d) => d.url)).toContain(
      'https://new.example/',
    );
  });
});

describe('downloadStoreJson', () => {
  it('creates and clicks a temporary download link', () => {
    const click = vi.fn();
    const revoke = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:mock');
    const anchor = { href: '', download: '', click } as unknown as HTMLAnchorElement;

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL: revoke,
    });
    vi.stubGlobal('Blob', class {
      constructor(public parts: unknown[], public options?: unknown) {}
    });
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    });

    downloadStoreJson(createEmptyStore([validDial]));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchor.download).toMatch(/^my-speed-dial-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:mock');
  });
});
