/** Bing HPImageArchive endpoint used for the daily wallpaper. */
export const BING_WALLPAPER_API_URL =
  'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1';

/** Bing HPImageArchive endpoint for recent wallpapers (~8 days). */
export const BING_WALLPAPER_LIST_URL =
  'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8';

/** Thumbnail resolution appended to Bing `urlbase`. */
export const BING_THUMB_SUFFIX = '_640x360.jpg';

export type BingWallpaperItem = {
  url: string;
  thumbUrl: string;
  date: string;
  title?: string;
  copyright?: string;
};

export type BingWallpaperResult =
  | {
      ok: true;
      url: string;
      date: string;
      title?: string;
      copyright?: string;
    }
  | { ok: false; error: string };

export type BingWallpaperListResult =
  | { ok: true; images: BingWallpaperItem[] }
  | { ok: false; error: string };

type BingArchiveImage = {
  url?: unknown;
  urlbase?: unknown;
  startdate?: unknown;
  fullstartdate?: unknown;
  title?: unknown;
  copyright?: unknown;
};

function optionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

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

/**
 * Build a thumbnail URL from Bing `urlbase`, falling back to the full image URL.
 */
export function buildBingThumbUrl(
  urlbase: unknown,
  fallbackUrl: string,
): string {
  if (typeof urlbase === 'string' && urlbase.trim()) {
    const thumb = buildBingImageUrl(`${urlbase.trim()}${BING_THUMB_SUFFIX}`);
    if (thumb) return thumb;
  }
  return fallbackUrl;
}

function parseArchiveImage(
  raw: unknown,
  index: number,
  fallbackDate: string,
): BingWallpaperItem | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const image = raw as BingArchiveImage;
  const url = buildBingImageUrl(image.url);
  if (!url) return undefined;

  const date =
    normalizeBingDate(image.startdate) ??
    normalizeBingDate(image.fullstartdate) ??
    (index === 0 ? fallbackDate : undefined);
  if (!date) return undefined;

  const title = optionalTrimmedString(image.title);
  const copyright = optionalTrimmedString(image.copyright);

  return {
    url,
    thumbUrl: buildBingThumbUrl(image.urlbase, url),
    date,
    ...(title ? { title } : {}),
    ...(copyright ? { copyright } : {}),
  };
}

/** Parse Bing HPImageArchive JSON into a wallpaper URL + fetch-day date. */
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

  const title = optionalTrimmedString(first?.title);
  const copyright = optionalTrimmedString(first?.copyright);

  // Freshness uses the fetch calendar day, not Bing's archive startdate
  // (which can lag UTC and would keep the cache looking stale forever).
  return {
    ok: true,
    url,
    date: fallbackDate,
    ...(title ? { title } : {}),
    ...(copyright ? { copyright } : {}),
  };
}

/** Parse Bing HPImageArchive JSON into a list of recent wallpapers. */
export function parseBingWallpaperListResponse(
  data: unknown,
  fallbackDate = utcDateString(),
): BingWallpaperListResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Invalid Bing response.' };
  }

  const images = (data as BingArchiveResponse).images;
  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, error: 'No Bing wallpaper images.' };
  }

  const parsed: BingWallpaperItem[] = [];
  for (let i = 0; i < images.length; i++) {
    const item = parseArchiveImage(images[i], i, fallbackDate);
    if (item) parsed.push(item);
  }

  if (parsed.length === 0) {
    return { ok: false, error: 'Bing wallpaper URL missing.' };
  }

  return { ok: true, images: parsed };
}

const BING_FETCH_TIMEOUT_MS = 8_000;

type BingJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

/** Fetch Bing HPImageArchive JSON from an extension page or background. */
export async function fetchBingArchiveJson(
  url: string,
): Promise<BingJsonResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BING_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data: unknown = await response.json();
    return { ok: true, data };
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out.'
        : err instanceof Error && err.message
          ? `Failed to fetch Bing wallpaper (${err.message}).`
          : 'Failed to fetch Bing wallpaper.';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch and parse today's Bing wallpaper. */
export async function requestBingWallpaper(): Promise<BingWallpaperResult> {
  const result = await fetchBingArchiveJson(BING_WALLPAPER_API_URL);
  if (!result.ok) return result;
  return parseBingWallpaperResponse(result.data, utcDateString());
}

/** Fetch and parse recent Bing wallpapers (~8 days). */
export async function requestBingWallpaperList(): Promise<BingWallpaperListResult> {
  const result = await fetchBingArchiveJson(BING_WALLPAPER_LIST_URL);
  if (!result.ok) return result;
  return parseBingWallpaperListResponse(result.data, utcDateString());
}
