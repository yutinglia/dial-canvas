import type { Size } from './types';

export type FitScale = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

/**
 * Uniformly scale a layout canvas to fit inside the viewport and center it.
 * Preserves aspect ratio (letterbox / pillarbox as needed).
 */
export function fitCanvasInViewport(layout: Size, viewport: Size): FitScale {
  if (layout.width <= 0 || layout.height <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(
    viewport.width / layout.width,
    viewport.height / layout.height,
  );
  if (!Number.isFinite(scale) || scale <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  return {
    scale,
    offsetX: (viewport.width - layout.width * scale) / 2,
    offsetY: (viewport.height - layout.height * scale) / 2,
  };
}
