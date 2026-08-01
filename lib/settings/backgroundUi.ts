import type { Background } from '../schemas/settings';
import { DEFAULT_BACKGROUND_OPACITY } from '../schemas/settings';

export type WallpaperSource = 'color' | 'url' | 'upload' | 'bing';

export function currentFit(bg: Background): 'cover' | 'contain' | 'tile' {
  if (bg.type === 'image' || bg.type === 'bing') return bg.fit;
  return 'cover';
}

export function currentOpacity(bg: Background): number {
  if (bg.type === 'image' || bg.type === 'bing') return bg.opacity;
  return DEFAULT_BACKGROUND_OPACITY;
}

export function deriveSource(bg: Background): WallpaperSource {
  if (bg.type === 'color') return 'color';
  if (bg.type === 'bing') return 'bing';
  if (bg.value.startsWith('data:')) return 'upload';
  return 'url';
}

export function backgroundsEqual(a: Background, b: Background): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
