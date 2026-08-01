import { createId } from '../id';
import { defaultDialSize } from '../layout/placement';
import type { Dial } from '../schemas/dial';

/** First-run sample dials on the default grid. */
export function createSeedDials(gridSize = 20): Dial[] {
  const { width: w, height: h } = defaultDialSize(gridSize);
  const gap = gridSize;

  const seeds: Omit<Dial, 'id'>[] = [
    {
      title: 'Firefox',
      url: 'https://www.mozilla.org/firefox/',
      showWhenNarrow: false,
      x: gap,
      y: gap,
      width: w,
      height: h,
    },
    {
      title: 'MDN',
      url: 'https://developer.mozilla.org/',
      showWhenNarrow: false,
      x: gap + w + gap,
      y: gap,
      width: w,
      height: h,
    },
    {
      title: 'GitHub',
      url: 'https://github.com/',
      showWhenNarrow: false,
      x: gap + (w + gap) * 2,
      y: gap,
      width: w,
      height: h,
    },
    {
      title: 'Wikipedia',
      url: 'https://www.wikipedia.org/',
      showWhenNarrow: false,
      x: gap,
      y: gap + h + gap,
      width: w,
      height: h,
    },
  ];

  return seeds.map((dial) => ({ ...dial, id: createId() }));
}
