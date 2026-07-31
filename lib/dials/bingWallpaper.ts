/** Bing HPImageArchive endpoint used for the daily wallpaper. */
export const BING_WALLPAPER_API_URL =
  'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1';

export type BingWallpaperResult =
  | { ok: true; url: string; date: string }
  | { ok: false; error: string };

type BingArchiveImage = {
  url?: unknown;
  startdate?: unknown;
  fullstartdate?: unknown;
};

type BingArchiveResponse = {
  images?: unknown;
};

/** Today's UTC calendar date as `YYYY-MM-DD`. */
export function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Normalize Bing archive `startdate` (`YYYYMMDD`) or ISO-like values to
 * `YYYY-MM-DD`. Returns undefined when the value cannot be parsed.
 */
export function normalizeBingDate(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const value = raw.trim();
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return undefined;
}

/** Build an absolute Bing image URL from an archive relative or absolute path. */
export function buildBingImageUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return undefined;
  const value = rawUrl.trim();
  try {
    if (value.startsWith('//')) {
      return new URL(`https:${value}`).toString();
    }
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return new URL(value).toString();
    }
    if (value.startsWith('/')) {
      return new URL(value, 'https://www.bing.com').toString();
    }
    return new URL(`/${value}`, 'https://www.bing.com').toString();
  } catch {
    return undefined;
  }
}

/** Parse Bing HPImageArchive JSON into a wallpaper URL + date. */
export function parseBingWallpaperResponse(
  data: unknown,
  fallbackDate = utcDateString(),
): BingWallpaperResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Invalid Bing response.' };
  }

  const images = (data as BingArchiveResponse).images;
  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, error: 'No Bing wallpaper images.' };
  }

  const first = images[0] as BingArchiveImage;
  const url = buildBingImageUrl(first?.url);
  if (!url) {
    return { ok: false, error: 'Bing wallpaper URL missing.' };
  }

  const date =
    normalizeBingDate(first.startdate) ??
    normalizeBingDate(first.fullstartdate) ??
    fallbackDate;

  return { ok: true, url, date };
}
