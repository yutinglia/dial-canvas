import { utcDateString } from './bingWallpaper';
import type { Background, Settings } from '../schemas/settings';

export function isBingCacheFresh(
  bg: Extract<Background, { type: 'bing' }>,
): boolean {
  if (bg.locked && bg.cachedUrl) return true;
  return Boolean(bg.cachedUrl && bg.cachedDate === utcDateString());
}

export function applyImageBackground(
  imageUrl: string | undefined,
  fit: string,
  opacity: number,
) {
  const root = document.documentElement;
  root.style.setProperty('--canvas-bg', '#1a1d23');
  root.style.setProperty('--canvas-bg-opacity', String(opacity));
  if (!imageUrl) {
    root.style.setProperty('--canvas-bg-image', 'none');
    root.style.setProperty('--canvas-bg-size', 'auto');
    root.style.setProperty('--canvas-bg-repeat', 'no-repeat');
    return;
  }
  root.style.setProperty(
    '--canvas-bg-image',
    `url("${imageUrl.replace(/"/g, '\\"')}")`,
  );
  if (fit === 'tile') {
    root.style.setProperty('--canvas-bg-size', 'auto');
    root.style.setProperty('--canvas-bg-repeat', 'repeat');
  } else if (fit === 'contain') {
    root.style.setProperty('--canvas-bg-size', 'contain');
    root.style.setProperty('--canvas-bg-repeat', 'no-repeat');
  } else {
    root.style.setProperty('--canvas-bg-size', 'cover');
    root.style.setProperty('--canvas-bg-repeat', 'no-repeat');
  }
}

export function applyBackground(settings: Settings) {
  const root = document.documentElement;
  const bg = settings.background;
  if (bg.type === 'color') {
    root.style.setProperty('--canvas-bg', bg.value);
    root.style.setProperty('--canvas-bg-image', 'none');
    root.style.setProperty('--canvas-bg-size', 'auto');
    root.style.setProperty('--canvas-bg-repeat', 'no-repeat');
    root.style.setProperty('--canvas-bg-opacity', '1');
    return;
  }
  if (bg.type === 'bing') {
    applyImageBackground(bg.cachedUrl, bg.fit, bg.opacity);
    return;
  }
  applyImageBackground(bg.value, bg.fit, bg.opacity);
}

/** Solid page color behind the wallpaper layer (or CSS var fallback). */
export function canvasBackgroundColor(background: Background | undefined): string {
  if (!background) return 'var(--canvas-bg)';
  if (background.type === 'color') return background.value;
  return 'var(--canvas-bg)';
}
