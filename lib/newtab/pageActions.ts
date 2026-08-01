import { createId } from '../id';
import { createPage, type Store } from '../schemas/store';

export function selectPage(store: Store, pageId: string): Store | null {
  if (pageId === store.activePageId) return null;
  return { ...store, activePageId: pageId };
}

export function addPage(store: Store): Store {
  const page = createPage([], `Page ${store.pages.length + 1}`, createId());
  return {
    ...store,
    pages: [...store.pages, page],
    activePageId: page.id,
  };
}

export function renamePage(
  store: Store,
  pageId: string,
  name: string,
): Store | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (!store.pages.some((p) => p.id === pageId)) return null;
  return {
    ...store,
    pages: store.pages.map((p) =>
      p.id === pageId ? { ...p, name: trimmed } : p,
    ),
  };
}

export function deletePage(store: Store, pageId: string): Store | null {
  if (store.pages.length <= 1) return null;
  const pages = store.pages.filter((p) => p.id !== pageId);
  if (pages.length === store.pages.length) return null;
  const activePageId =
    store.activePageId === pageId ? pages[0]!.id : store.activePageId;
  return { ...store, pages, activePageId };
}
