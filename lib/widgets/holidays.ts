export const NAGER_DATE_BASE_URL = 'https://date.nager.at/api/v3';
export const HOLIDAYS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type HolidayCountry = {
  countryCode: string;
  name: string;
};

export type PublicHoliday = {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  global: boolean;
};

export type HolidayCountriesResult =
  | { ok: true; countries: HolidayCountry[] }
  | { ok: false; error: string };

export type PublicHolidaysResult =
  | { ok: true; holidays: PublicHoliday[] }
  | { ok: false; error: string };

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const countriesCache: { entry: CacheEntry<HolidayCountry[]> | null } = {
  entry: null,
};
const holidaysCache = new Map<string, CacheEntry<PublicHoliday[]>>();

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** Normalize AvailableCountries payload. */
export function parseHolidayCountries(data: unknown): HolidayCountriesResult {
  if (!Array.isArray(data)) {
    return { ok: false, error: 'Invalid countries response.' };
  }

  const countries: HolidayCountry[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const countryCode = readString(row.countryCode)?.toUpperCase();
    const name = readString(row.name);
    if (!countryCode || !/^[A-Z]{2}$/.test(countryCode) || !name) continue;
    countries.push({ countryCode, name });
  }

  if (countries.length === 0) {
    return { ok: false, error: 'No countries available.' };
  }

  countries.sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, countries };
}

/** Normalize NextPublicHolidays / PublicHolidays payload. */
export function parsePublicHolidays(data: unknown): PublicHolidaysResult {
  if (!Array.isArray(data)) {
    return { ok: false, error: 'Invalid holidays response.' };
  }

  const holidays: PublicHoliday[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const date = readString(row.date);
    const localName = readString(row.localName);
    const name = readString(row.name);
    const countryCode = readString(row.countryCode)?.toUpperCase();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!localName || !name || !countryCode) continue;
    holidays.push({
      date,
      localName,
      name,
      countryCode,
      global: readBoolean(row.global) ?? true,
    });
  }

  holidays.sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, holidays };
}

/** Keep holidays on/after today, capped by limit. */
export function limitUpcomingHolidays(
  holidays: PublicHoliday[],
  limit: number,
  today = new Date(),
): PublicHoliday[] {
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return holidays.filter((h) => h.date >= todayKey).slice(0, Math.max(0, limit));
}

/** Format YYYY-MM-DD for display. */
export function formatHolidayDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

async function fetchJson(url: string): Promise<
  { ok: true; data: unknown } | { ok: false; error: string }
> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    return { ok: true, data: await response.json() };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : 'Network request failed.';
    return { ok: false, error: message };
  }
}

/** Fetch and cache supported countries. */
export async function fetchHolidayCountries(
  now = Date.now(),
): Promise<HolidayCountriesResult> {
  const cached = countriesCache.entry;
  if (cached && cached.expiresAt > now) {
    return { ok: true, countries: cached.value };
  }

  const result = await fetchJson(`${NAGER_DATE_BASE_URL}/AvailableCountries`);
  if (!result.ok) return result;

  const parsed = parseHolidayCountries(result.data);
  if (!parsed.ok) return parsed;

  countriesCache.entry = {
    value: parsed.countries,
    expiresAt: now + HOLIDAYS_CACHE_TTL_MS,
  };
  return parsed;
}

/** Fetch and cache upcoming holidays for a country. */
export async function fetchNextPublicHolidays(
  countryCode: string,
  limit = 8,
  now = Date.now(),
): Promise<PublicHolidaysResult> {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return { ok: false, error: 'Invalid country code.' };
  }

  const cacheKey = code;
  const cached = holidaysCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      ok: true,
      holidays: limitUpcomingHolidays(cached.value, limit),
    };
  }

  const result = await fetchJson(
    `${NAGER_DATE_BASE_URL}/NextPublicHolidays/${encodeURIComponent(code)}`,
  );
  if (!result.ok) return result;

  const parsed = parsePublicHolidays(result.data);
  if (!parsed.ok) return parsed;

  holidaysCache.set(cacheKey, {
    value: parsed.holidays,
    expiresAt: now + HOLIDAYS_CACHE_TTL_MS,
  });

  return {
    ok: true,
    holidays: limitUpcomingHolidays(parsed.holidays, limit),
  };
}

/** Test helper to clear in-memory caches. */
export function clearHolidaysCache(): void {
  countriesCache.entry = null;
  holidaysCache.clear();
}
