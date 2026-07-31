import { describe, expect, it } from 'vitest';
import { formatClockDate, formatClockTime } from './clock';
import { getIntlLocale, setLocalePreference } from '../i18n';

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
  const date = new Date(2026, 7, 1, 12, 0, 0);

  it('formats a short weekday/month/day string in English', () => {
    expect(formatClockDate(date, 'en')).toBe('Sat, Aug 1');
  });

  it('formats a short weekday/month/day string in Traditional Chinese', () => {
    const text = formatClockDate(date, 'zh-TW');
    expect(text).toMatch(/週六|星期六/);
    expect(text).toMatch(/8月/);
    expect(text).toMatch(/1/);
  });
});

describe('getIntlLocale', () => {
  it('maps explicit preferences to BCP 47 tags', () => {
    setLocalePreference('en');
    expect(getIntlLocale()).toBe('en');
    setLocalePreference('zh_TW');
    expect(getIntlLocale()).toBe('zh-TW');
    setLocalePreference('system');
  });
});
