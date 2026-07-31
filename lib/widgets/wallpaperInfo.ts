import type { Background } from '../schemas/settings';

export type WallpaperInfoDisplay = {
  kind: Background['type'];
  title: string;
  subtitle?: string;
  empty?: boolean;
};

function truncateMiddle(value: string, max = 64): string {
  if (value.length <= max) return value;
  const keep = Math.max(8, Math.floor((max - 1) / 2));
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}

/**
 * Derive wallpaper caption fields from the active background setting.
 */
export function formatWallpaperInfo(
  background: Background,
  options: { showCopyright?: boolean } = {},
): WallpaperInfoDisplay {
  const showCopyright = options.showCopyright !== false;

  if (background.type === 'color') {
    return {
      kind: 'color',
      title: 'Solid color',
      subtitle: background.value,
    };
  }

  if (background.type === 'image') {
    const isData = background.value.startsWith('data:');
    return {
      kind: 'image',
      title: isData ? 'Uploaded image' : 'Custom image',
      subtitle: isData ? undefined : truncateMiddle(background.value),
    };
  }

  const title = background.cachedTitle?.trim();
  const copyright = background.cachedCopyright?.trim();
  if (!title && !copyright && !background.cachedUrl) {
    return {
      kind: 'bing',
      title: 'Bing daily wallpaper',
      subtitle: 'Waiting for today’s image…',
      empty: true,
    };
  }

  return {
    kind: 'bing',
    title: title || 'Bing daily wallpaper',
    subtitle: showCopyright
      ? copyright || (background.cachedDate ? background.cachedDate : undefined)
      : background.cachedDate,
  };
}
