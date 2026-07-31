import { afterEach, describe, expect, it } from 'vitest';
import {
  clearHolidaysCache,
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
