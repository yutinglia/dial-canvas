import { z } from 'zod';
import { DialSchema, type Dial } from './dial';
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from './settings';

export const STORE_VERSION = 2 as const;

export const PageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dials: z.array(DialSchema),
});

export type Page = z.infer<typeof PageSchema>;

export const StoreSchema = z.object({
  version: z.literal(STORE_VERSION),
  pages: z.array(PageSchema).min(1),
  activePageId: z.string().min(1),
  settings: SettingsSchema,
});

export type Store = z.infer<typeof StoreSchema>;

export type ParseStoreResult = {
  store: Store;
  /** True when the payload needed recovery (invalid dials/settings/shape). */
  repaired: boolean;
  droppedDialCount: number;
};

const DEFAULT_PAGE_ID = 'page-home';
const DEFAULT_PAGE_NAME = 'Home';

export function createPage(
  dials: Dial[] = [],
  name = DEFAULT_PAGE_NAME,
  id = DEFAULT_PAGE_ID,
): Page {
  return { id, name, dials };
}

export function createEmptyStore(dials: Dial[] = []): Store {
  const page = createPage(dials);
  return {
    version: STORE_VERSION,
    pages: [page],
    activePageId: page.id,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function getActivePage(store: Store): Page {
  return (
    store.pages.find((page) => page.id === store.activePageId) ?? store.pages[0]!
  );
}

export function getActiveDials(store: Store): Dial[] {
  return getActivePage(store).dials;
}

export function withActiveDials(store: Store, dials: Dial[]): Store {
  const pageId = getActivePage(store).id;
  return {
    ...store,
    activePageId: pageId,
    pages: store.pages.map((page) =>
      page.id === pageId ? { ...page, dials } : page,
    ),
  };
}

function parsePageDials(rawDials: unknown): {
  dials: Dial[];
  droppedDialCount: number;
} {
  const dials: Dial[] = [];
  let droppedDialCount = 0;
  if (!Array.isArray(rawDials)) {
    return { dials, droppedDialCount };
  }
  for (const item of rawDials) {
    const dial = DialSchema.safeParse(item);
    if (dial.success) dials.push(dial.data);
    else droppedDialCount += 1;
  }
  return { dials, droppedDialCount };
}

function parsePages(rawPages: unknown): {
  pages: Page[];
  droppedDialCount: number;
  repaired: boolean;
} {
  if (!Array.isArray(rawPages) || rawPages.length === 0) {
    return { pages: [createPage()], droppedDialCount: 0, repaired: true };
  }

  const pages: Page[] = [];
  let droppedDialCount = 0;
  let repaired = false;

  for (const item of rawPages) {
    if (!item || typeof item !== 'object') {
      repaired = true;
      continue;
    }
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' && record.id ? record.id : '';
    const name =
      typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : '';
    if (!id || !name) {
      repaired = true;
      continue;
    }
    const parsed = parsePageDials(record.dials);
    droppedDialCount += parsed.droppedDialCount;
    if (parsed.droppedDialCount > 0) repaired = true;
    pages.push({ id, name, dials: parsed.dials });
  }

  if (pages.length === 0) {
    return { pages: [createPage()], droppedDialCount, repaired: true };
  }
  return { pages, droppedDialCount, repaired };
}

function normalizeActivePageId(pages: Page[], activePageId: unknown): string {
  if (typeof activePageId === 'string') {
    const match = pages.find((page) => page.id === activePageId);
    if (match) return match.id;
  }
  return pages[0]!.id;
}

function recoverStore(raw: Record<string, unknown>): ParseStoreResult {
  let droppedDialCount = 0;
  let repaired = false;
  let pages: Page[];

  if (Array.isArray(raw.pages)) {
    const parsed = parsePages(raw.pages);
    pages = parsed.pages;
    droppedDialCount += parsed.droppedDialCount;
    repaired = repaired || parsed.repaired;
  } else if (Array.isArray(raw.dials)) {
    // Legacy v1 shape support during recovery.
    const parsed = parsePageDials(raw.dials);
    pages = [createPage(parsed.dials)];
    droppedDialCount += parsed.droppedDialCount;
    repaired = true;
  } else {
    pages = [createPage()];
    repaired = true;
  }

  const settingsResult = SettingsSchema.safeParse(raw.settings);
  const settings: Settings = settingsResult.success
    ? settingsResult.data
    : { ...DEFAULT_SETTINGS };
  if (!settingsResult.success) repaired = true;

  const activePageId = normalizeActivePageId(pages, raw.activePageId);
  if (activePageId !== raw.activePageId) repaired = true;

  return {
    store: {
      version: STORE_VERSION,
      pages,
      activePageId,
      settings,
    },
    repaired: repaired || droppedDialCount > 0,
    droppedDialCount,
  };
}

export function parseStoreWithMeta(raw: unknown): ParseStoreResult {
  const result = StoreSchema.safeParse(raw);
  if (result.success) {
    const activeOk = result.data.pages.some(
      (page) => page.id === result.data.activePageId,
    );
    if (activeOk) {
      return { store: result.data, repaired: false, droppedDialCount: 0 };
    }
    return {
      store: {
        ...result.data,
        activePageId: result.data.pages[0]!.id,
      },
      repaired: true,
      droppedDialCount: 0,
    };
  }

  if (raw && typeof raw === 'object') {
    return recoverStore(raw as Record<string, unknown>);
  }

  return {
    store: createEmptyStore(),
    repaired: true,
    droppedDialCount: 0,
  };
}

export function parseStore(raw: unknown): Store {
  return parseStoreWithMeta(raw).store;
}
