import { createId } from '../id';
import { defaultDialSize, findFirstFreeSlot } from '../layout/placement';
import { isAllowedDialUrl, normalizeDialUrl, type Dial } from '../schemas/dial';
import type { Size } from '../layout/types';

export type BookmarkCandidate = {
  title: string;
  url: string;
};

type BookmarkNode = {
  title?: string;
  url?: string;
  children?: BookmarkNode[];
};

function walkBookmarks(
  nodes: BookmarkNode[],
  out: BookmarkCandidate[],
): void {
  for (const node of nodes) {
    if (node.url) {
      const url = normalizeDialUrl(node.url);
      if (url && isAllowedDialUrl(url)) {
        out.push({
          title: (node.title || '').trim() || url,
          url,
        });
      }
    }
    if (node.children?.length) walkBookmarks(node.children, out);
  }
}

/**
 * Prompt for bookmarks access. Must run from a user gesture.
 * Call request() immediately — Firefox voids the gesture across awaits
 * (e.g. permissions.contains) before this API.
 */
export async function requestBookmarksPermission(): Promise<boolean> {
  try {
    return await browser.permissions.request({ permissions: ['bookmarks'] });
  } catch {
    return false;
  }
}

export async function listBookmarkCandidates(): Promise<BookmarkCandidate[]> {
  const tree = (await browser.bookmarks.getTree()) as BookmarkNode[];
  const out: BookmarkCandidate[] = [];
  walkBookmarks(tree, out);
  // De-dupe by URL, keep first title.
  const seen = new Set<string>();
  return out.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

/** Place imported bookmarks as new dials on the canvas. */
export function dialsFromBookmarks(
  bookmarks: BookmarkCandidate[],
  existing: Dial[],
  gridSize: number,
  canvasSize: Size,
  limit = 40,
  extraOccupied: Array<{ x: number; y: number; width: number; height: number }> = [],
): Dial[] {
  const dials = [...existing];
  const occupied = [
    ...dials.map((d) => ({
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
    })),
    ...extraOccupied,
  ];
  const size = defaultDialSize(gridSize);
  const slice = bookmarks.slice(0, limit);

  for (const bookmark of slice) {
    const slot = findFirstFreeSlot(occupied, gridSize, canvasSize, size);
    const dial: Dial = {
      id: createId(),
      title: bookmark.title.slice(0, 120) || bookmark.url,
      url: bookmark.url,
      showWhenNarrow: false,
      ...slot,
    };
    dials.push(dial);
    occupied.push(slot);
  }
  return dials;
}
