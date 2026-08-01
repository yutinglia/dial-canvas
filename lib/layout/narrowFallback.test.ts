import { describe, expect, it } from 'vitest';
import type { ClockWidget, Widget } from '../schemas/widget';
import {
  NARROW_FALLBACK_CLOCK_ID,
  createNarrowFallbackClock,
  hasNarrowKeepers,
  pickNarrowFallbackClock,
} from './narrowFallback';

const viewport = { width: 390, height: 844 };

function clock(
  partial: Partial<ClockWidget> & Pick<ClockWidget, 'id' | 'x' | 'y'>,
): ClockWidget {
  return {
    type: 'clock',
    width: 200,
    height: 120,
    format: '24h',
    showSeconds: false,
    showDate: true,
    showWhenNarrow: false,
    ...partial,
  };
}

describe('hasNarrowKeepers', () => {
  it('is false when nothing opts in', () => {
    expect(
      hasNarrowKeepers(
        [{ showWhenNarrow: false }],
        [clock({ id: 'c1', x: 0, y: 0 })],
      ),
    ).toBe(false);
  });

  it('is true when a dial or widget opts in', () => {
    expect(hasNarrowKeepers([{ showWhenNarrow: true }], [])).toBe(true);
    expect(
      hasNarrowKeepers(
        [],
        [clock({ id: 'c1', x: 0, y: 0, showWhenNarrow: true })],
      ),
    ).toBe(true);
  });
});

describe('pickNarrowFallbackClock', () => {
  it('prefers the top-left-most page clock', () => {
    const picked = pickNarrowFallbackClock(
      [
        clock({ id: 'right', x: 400, y: 10 }),
        clock({ id: 'top', x: 100, y: 0 }),
        clock({ id: 'below', x: 0, y: 200 }),
      ],
      viewport,
    );
    expect(picked.id).toBe('top');
  });

  it('returns a large synthetic clock when the page has none', () => {
    const note: Widget = {
      id: 'n1',
      type: 'note',
      x: 0,
      y: 0,
      width: 200,
      height: 120,
      title: '',
      text: '',
      showWhenNarrow: false,
    };
    const picked = pickNarrowFallbackClock([note], viewport);
    expect(picked.id).toBe(NARROW_FALLBACK_CLOCK_ID);
    expect(picked.type).toBe('clock');
    expect(picked.width).toBe(Math.round(viewport.width * 0.8));
    expect(picked.height).toBe(
      Math.round(Math.min(viewport.height * 0.4, 220)),
    );
  });
});

describe('createNarrowFallbackClock', () => {
  it('clamps to at least 64px and caps height at 220', () => {
    const tiny = createNarrowFallbackClock({ width: 50, height: 1000 });
    expect(tiny.width).toBe(64);
    expect(tiny.height).toBe(220);
  });
});
