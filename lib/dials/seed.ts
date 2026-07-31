import { createId } from '../id';
import type { Dial } from '../schemas/dial';

/** First-run sample dials on a 16px grid. */
export function createSeedDials(gridSize = 16): Dial[] {
  const w = Math.max(64, gridSize * 4);
  const h = Math.max(64, gridSize * 3);
  const gap = gridSize;

  const seeds: Omit<Dial, 'id'>[] = [
    {
      title: 'Firefox',
      url: 'https://www.mozilla.org/firefox/',
      x: gap,
      y: gap,
      width: w,
      height: h,
    },
    {
      title: 'MDN',
      url: 'https://developer.mozilla.org/',
      x: gap + w + gap,
      y: gap,
      width: w,
      height: h,
    },
    {
      title: 'GitHub',
      url: 'https://github.com/',
      x: gap + (w + gap) * 2,
      y: gap,
      width: w,
      height: h,
    },
    {
      title: 'Wikipedia',
      url: 'https://www.wikipedia.org/',
      x: gap,
      y: gap + h + gap,
      width: w,
      height: h,
    },
  ];

  return seeds.map((dial) => ({ ...dial, id: createId() }));
}
