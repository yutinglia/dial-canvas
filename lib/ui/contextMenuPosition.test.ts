import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampMenuPosition } from './contextMenuPosition';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('clampMenuPosition', () => {
  it('keeps the menu inside the viewport with padding', () => {
    vi.stubGlobal('window', { innerWidth: 400, innerHeight: 300 });

    expect(clampMenuPosition(10, 10, 120, 80)).toEqual({ x: 10, y: 10 });
    expect(clampMenuPosition(390, 290, 120, 80)).toEqual({
      x: 400 - 120 - 8,
      y: 300 - 80 - 8,
    });
    expect(clampMenuPosition(-20, -20, 50, 50, 4)).toEqual({ x: 4, y: 4 });
  });
});
