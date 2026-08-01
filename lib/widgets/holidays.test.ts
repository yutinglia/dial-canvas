import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearHolidaysCache,
  fetchHolidayCountries,
  fetchNextPublicHolidays,
  formatHolidayDate,
  limitUpcomingHolidays,
  parseHolidayCountries,
  parsePublicHolidays,
} from './holidays';

afterEach(() => {
  clearHolidaysCache();
});

describe('parseHolidayCountries', () => {
  it('parses and sorts countries', () => {
    expect(
      parseHolidayCountries([
        { countryCode: 'tw', name: 'Taiwan' },
        { countryCode: 'US', name: 'United States' },
        { countryCode: 'DE', name: 'Germany' },
        { bad: true },
      ]),
    ).toEqual({
      ok: true,
      countries: [
        { countryCode: 'DE', name: 'Germany' },
        { countryCode: 'TW', name: 'Taiwan' },
        { countryCode: 'US', name: 'United States' },
      ],
    });
  });

  it('rejects invalid payloads', () => {
    expect(parseHolidayCountries(null)).toEqual({
      ok: false,
      error: 'Invalid countries response.',
    });
    expect(parseHolidayCountries([])).toEqual({
      ok: false,
      error: 'No countries available.',
    });
  });
});

describe('parsePublicHolidays', () => {
  it('parses holiday rows', () => {
    expect(
      parsePublicHolidays([
        {
          date: '2026-10-10',
          localName: '國慶日',
          name: 'National Day',
          countryCode: 'TW',
          global: true,
        },
        { date: 'bad', localName: 'x', name: 'y', countryCode: 'TW' },
      ]),
    ).toEqual({
      ok: true,
      holidays: [
        {
          date: '2026-10-10',
          localName: '國慶日',
          name: 'National Day',
          countryCode: 'TW',
          global: true,
        },
      ],
    });
  });
});

describe('limitUpcomingHolidays', () => {
  it('filters past dates and applies limit', () => {
    const holidays = [
      {
        date: '2026-07-01',
        localName: 'Past',
        name: 'Past',
        countryCode: 'US',
        global: true,
      },
      {
        date: '2026-08-01',
        localName: 'Today',
        name: 'Today',
        countryCode: 'US',
        global: true,
      },
      {
        date: '2026-09-01',
        localName: 'Soon',
        name: 'Soon',
        countryCode: 'US',
        global: true,
      },
      {
        date: '2026-12-25',
        localName: 'Later',
        name: 'Later',
        countryCode: 'US',
        global: true,
      },
    ];
    expect(
      limitUpcomingHolidays(holidays, 2, new Date(2026, 7, 1)).map((h) => h.date),
    ).toEqual(['2026-08-01', '2026-09-01']);
  });
});

describe('formatHolidayDate', () => {
  it('formats ISO dates', () => {
    const formatted = formatHolidayDate('2026-08-01');
    expect(formatted).not.toBe('2026-08-01');
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatHolidayDate('not-a-date')).toBe('not-a-date');
  });
});

describe('fetchHolidayCountries / fetchNextPublicHolidays', () => {
  afterEach(() => {
    clearHolidaysCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches, caches, and reuses countries', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ countryCode: 'TW', name: 'Taiwan' }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchHolidayCountries(1_000);
    expect(first).toEqual({
      ok: true,
      countries: [{ countryCode: 'TW', name: 'Taiwan' }],
    });
    const second = await fetchHolidayCountries(1_100);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('maps HTTP and network failures for countries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 502,
        json: async () => ({}),
      })),
    );
    await expect(fetchHolidayCountries()).resolves.toEqual({
      ok: false,
      error: 'HTTP 502',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await expect(fetchHolidayCountries()).resolves.toEqual({
      ok: false,
      error: 'offline',
    });
  });

  it('validates country codes and caches holiday lists', async () => {
    await expect(fetchNextPublicHolidays('nope')).resolves.toEqual({
      ok: false,
      error: 'Invalid country code.',
    });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          date: '2099-01-01',
          localName: 'New Year',
          name: 'New Year',
          countryCode: 'US',
          global: true,
        },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchNextPublicHolidays('us', 1, 1_000);
    expect(first).toMatchObject({
      ok: true,
      holidays: [expect.objectContaining({ date: '2099-01-01' })],
    });
    const second = await fetchNextPublicHolidays('US', 1, 1_100);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
