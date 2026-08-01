import { z } from 'zod';
import { DialSchema, type Dial } from './dial';
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from './settings';
import { WidgetSchema, type Widget } from './widget';

export const STORE_VERSION = 4 as const;

export const PageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dials: z.array(DialSchema),
  widgets: z.array(WidgetSchema).default([]),
});

export type Page = z.infer<typeof PageSchema>;

/** Locked freeform layout coordinate space; set once on first wide measure. */
export const LayoutSizeSchema = z.object({
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});

export type LayoutSize = z.infer<typeof LayoutSizeSchema>;

export const StoreSchema = z.object({
  version: z.literal(STORE_VERSION),
  pages: z.array(PageSchema).min(1),
  activePageId: z.string().min(1),
  settings: SettingsSchema,
  layoutSize: LayoutSizeSchema.optional(),
});

export type Store = z.infer<typeof StoreSchema>;

export type ParseStoreResult = {
  store: Store;
  /** True when the payload needed recovery (invalid dials/settings/shape). */
  repaired: boolean;
  droppedDialCount: number;
  droppedWidgetCount: number;
};

const DEFAULT_PAGE_ID = 'page-home';
const DEFAULT_PAGE_NAME = 'Home';

export function createPage(
  dials: Dial[] = [],
  name = DEFAULT_PAGE_NAME,
  id = DEFAULT_PAGE_ID,
  widgets: Widget[] = [],
): Page {
  return { id, name, dials, widgets };
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

export function getActiveWidgets(store: Store): Widget[] {
  return getActivePage(store).widgets;
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

export function withActiveWidgets(store: Store, widgets: Widget[]): Store {
  const pageId = getActivePage(store).id;
  return {
    ...store,
    activePageId: pageId,
    pages: store.pages.map((page) =>
      page.id === pageId ? { ...page, widgets } : page,
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

function parsePageWidgets(rawWidgets: unknown): {
  widgets: Widget[];
  droppedWidgetCount: number;
} {
  const widgets: Widget[] = [];
  let droppedWidgetCount = 0;
  if (rawWidgets === undefined) {
    return { widgets, droppedWidgetCount };
  }
  if (!Array.isArray(rawWidgets)) {
    return { widgets, droppedWidgetCount: 1 };
  }
  for (const item of rawWidgets) {
    const widget = WidgetSchema.safeParse(item);
    if (widget.success) widgets.push(widget.data);
    else droppedWidgetCount += 1;
  }
  return { widgets, droppedWidgetCount };
}

function parsePages(rawPages: unknown): {
  pages: Page[];
  droppedDialCount: number;
  droppedWidgetCount: number;
  repaired: boolean;
} {
  if (!Array.isArray(rawPages) || rawPages.length === 0) {
    return {
      pages: [createPage()],
      droppedDialCount: 0,
      droppedWidgetCount: 0,
      repaired: true,
    };
  }

  const pages: Page[] = [];
  let droppedDialCount = 0;
  let droppedWidgetCount = 0;
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
    const parsedDials = parsePageDials(record.dials);
    const parsedWidgets = parsePageWidgets(record.widgets);
    droppedDialCount += parsedDials.droppedDialCount;
    droppedWidgetCount += parsedWidgets.droppedWidgetCount;
    if (parsedDials.droppedDialCount > 0 || parsedWidgets.droppedWidgetCount > 0) {
      repaired = true;
    }
    if (record.widgets === undefined) repaired = true;
    pages.push({
      id,
      name,
      dials: parsedDials.dials,
      widgets: parsedWidgets.widgets,
    });
  }

  if (pages.length === 0) {
    return {
      pages: [createPage()],
      droppedDialCount,
      droppedWidgetCount,
      repaired: true,
    };
  }
  return { pages, droppedDialCount, droppedWidgetCount, repaired };
}

function normalizeActivePageId(pages: Page[], activePageId: unknown): string {
  if (typeof activePageId === 'string') {
    const match = pages.find((page) => page.id === activePageId);
    if (match) return match.id;
  }
  return pages[0]!.id;
}

/**
 * Recover settings without wiping unrelated fields when only `background` is
 * invalid (e.g. a bad wallpaper URL).
 */
function recoverSettings(raw: unknown): { settings: Settings; repaired: boolean } {
  const settingsResult = SettingsSchema.safeParse(raw);
  if (settingsResult.success) {
    return { settings: settingsResult.data, repaired: false };
  }

  if (raw && typeof raw === 'object') {
    const retry = SettingsSchema.safeParse({
      ...(raw as Record<string, unknown>),
      background: DEFAULT_SETTINGS.background,
    });
    if (retry.success) {
      return { settings: retry.data, repaired: true };
    }
  }

  return { settings: { ...DEFAULT_SETTINGS }, repaired: true };
}

function recoverStore(raw: Record<string, unknown>): ParseStoreResult {
  let droppedDialCount = 0;
  let droppedWidgetCount = 0;
  let repaired = false;
  let pages: Page[];

  if (Array.isArray(raw.pages)) {
    const parsed = parsePages(raw.pages);
    pages = parsed.pages;
    droppedDialCount += parsed.droppedDialCount;
    droppedWidgetCount += parsed.droppedWidgetCount;
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

  const recoveredSettings = recoverSettings(raw.settings);
  if (recoveredSettings.repaired) repaired = true;

  const activePageId = normalizeActivePageId(pages, raw.activePageId);
  if (activePageId !== raw.activePageId) repaired = true;

  const layoutParsed = LayoutSizeSchema.safeParse(raw.layoutSize);
  const store: Store = {
    version: STORE_VERSION,
    pages,
    activePageId,
    settings: recoveredSettings.settings,
  };
  if (layoutParsed.success) {
    store.layoutSize = layoutParsed.data;
  } else if (raw.layoutSize !== undefined) {
    repaired = true;
  }

  return {
    store,
    repaired: repaired || droppedDialCount > 0 || droppedWidgetCount > 0,
    droppedDialCount,
    droppedWidgetCount,
  };
}

export function parseStoreWithMeta(raw: unknown): ParseStoreResult {
  const result = StoreSchema.safeParse(raw);
  if (result.success) {
    const activeOk = result.data.pages.some(
      (page) => page.id === result.data.activePageId,
    );
    if (activeOk) {
      return {
        store: result.data,
        repaired: false,
        droppedDialCount: 0,
        droppedWidgetCount: 0,
      };
    }
    return {
      store: {
        ...result.data,
        activePageId: result.data.pages[0]!.id,
      },
      repaired: true,
      droppedDialCount: 0,
      droppedWidgetCount: 0,
    };
  }

  if (raw && typeof raw === 'object') {
    return recoverStore(raw as Record<string, unknown>);
  }

  return {
    store: createEmptyStore(),
    repaired: true,
    droppedDialCount: 0,
    droppedWidgetCount: 0,
  };
}

export function parseStore(raw: unknown): Store {
  return parseStoreWithMeta(raw).store;
}
