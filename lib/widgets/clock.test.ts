import { describe, expect, it } from 'vitest';
import { formatClockDate, formatClockTime } from './clock';

describe('formatClockTime', () => {
  const date = new Date(2026, 7, 1, 14, 5, 9);

  it('formats 24h without seconds', () => {
    expect(formatClockTime(date, { format: '24h', showSeconds: false })).toBe(
      '14:05',
    );
  });

  it('formats 24h with seconds', () => {
    expect(formatClockTime(date, { format: '24h', showSeconds: true })).toBe(
      '14:05:09',
    );
  });

  it('formats 12h with AM/PM', () => {
    expect(formatClockTime(date, { format: '12h', showSeconds: false })).toBe(
      '2:05 PM',
    );
    const morning = new Date(2026, 7, 1, 0, 0, 0);
    expect(
      formatClockTime(morning, { format: '12h', showSeconds: false }),
    ).toBe('12:00 AM');
  });
});

describe('formatClockDate', () => {
  it('formats a short weekday/month/day string', () => {
    const date = new Date(2026, 7, 1, 12, 0, 0);
    expect(formatClockDate(date, 'en-US')).toBe('Sat, Aug 1');
  });
});
