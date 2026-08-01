import { describe, expect, it } from 'vitest';
import { createEmptyStore, createPage } from '../schemas/store';
import { addPage, deletePage, renamePage, selectPage } from './pageActions';

describe('pageActions', () => {
  const base = createEmptyStore([]);

  it('selectPage switches active page', () => {
    const other = createPage([], 'Other', 'page-2');
    const store = {
      ...base,
      pages: [...base.pages, other],
    };
    const next = selectPage(store, other.id);
    expect(next?.activePageId).toBe(other.id);
    expect(selectPage(store, store.activePageId)).toBeNull();
  });

  it('addPage appends and activates', () => {
    const next = addPage(base);
    expect(next.pages).toHaveLength(2);
    expect(next.activePageId).toBe(next.pages[1]!.id);
  });

  it('renamePage updates name', () => {
    const pageId = base.pages[0]!.id;
    const next = renamePage(base, pageId, '  Home  ');
    expect(next?.pages[0]?.name).toBe('Home');
    expect(renamePage(base, pageId, '   ')).toBeNull();
  });

  it('deletePage refuses last page', () => {
    expect(deletePage(base, base.pages[0]!.id)).toBeNull();
    const other = createPage([], 'Other', 'page-2');
    const store = {
      ...base,
      pages: [...base.pages, other],
      activePageId: other.id,
    };
    const next = deletePage(store, other.id);
    expect(next?.pages).toHaveLength(1);
    expect(next?.activePageId).toBe(base.pages[0]!.id);
  });
});
