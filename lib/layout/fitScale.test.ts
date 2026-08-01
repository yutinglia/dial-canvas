import { describe, expect, it } from 'vitest';
import { fitCanvasInViewport } from './fitScale';

describe('fitCanvasInViewport', () => {
  it('returns identity when layout matches viewport', () => {
    expect(
      fitCanvasInViewport(
        { width: 1200, height: 800 },
        { width: 1200, height: 800 },
      ),
    ).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });

  it('scales down uniformly and centers (letterbox)', () => {
    // 1200×800 into 600×500 → scale limited by width: 0.5
    // scaled size 600×400; leftover height 100 → offsetY 50
    expect(
      fitCanvasInViewport(
        { width: 1200, height: 800 },
        { width: 600, height: 500 },
      ),
    ).toEqual({ scale: 0.5, offsetX: 0, offsetY: 50 });
  });

  it('scales up uniformly and centers (pillarbox)', () => {
    // 1200×800 into 2400×2000 → scale = min(2, 2.5) = 2
    // scaled 2400×1600; leftover height 400 → offsetY 200
    expect(
      fitCanvasInViewport(
        { width: 1200, height: 800 },
        { width: 2400, height: 2000 },
      ),
    ).toEqual({ scale: 2, offsetX: 0, offsetY: 200 });
  });

  it('pillarboxes when viewport is wider than layout aspect', () => {
    // 1200×800 into 1600×800 → scale = min(1600/1200, 1) = 1
    // leftover width 400 → offsetX 200
    expect(
      fitCanvasInViewport(
        { width: 1200, height: 800 },
        { width: 1600, height: 800 },
      ),
    ).toEqual({ scale: 1, offsetX: 200, offsetY: 0 });
  });

  it('guards against non-positive layout sizes', () => {
    expect(
      fitCanvasInViewport({ width: 0, height: 800 }, { width: 100, height: 100 }),
    ).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });
});
