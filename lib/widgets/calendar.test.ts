import { describe, expect, it } from 'vitest';
import {
  buildCalendarMonth,
  calendarWeekdayLabels,
  formatCalendarMonthTitle,
  shiftCalendarMonth,
} from './calendar';

describe('formatCalendarMonthTitle', () => {
  it('formats year and month', () => {
    const title = formatCalendarMonthTitle(2026, 7);
    expect(title).toMatch(/2026/);
    expect(title.length).toBeGreaterThan(4);
  });
});

describe('calendarWeekdayLabels', () => {
  it('returns sunday-first and monday-first labels', () => {
    expect(calendarWeekdayLabels('sunday')[0]).toBe('Su');
    expect(calendarWeekdayLabels('monday')[0]).toBe('Mo');
  });
});

describe('buildCalendarMonth', () => {
  it('builds a 42-day grid with monday start', () => {
    const month = buildCalendarMonth(
      2026,
      7,
      'monday',
      new Date(2026, 7, 1),
    );
    expect(month.days).toHaveLength(42);
    expect(month.weekdayLabels[0]).toBe('Mo');
    // 2026-08-01 is a Saturday → leading days from July start Monday Jul 27
    expect(month.days[0]).toMatchObject({ day: 27, inMonth: false });
    const todayCell = month.days.find((d) => d.isToday);
    expect(todayCell?.day).toBe(1);
    expect(todayCell?.inMonth).toBe(true);
  });

  it('builds a sunday-start grid', () => {
    const month = buildCalendarMonth(
      2026,
      7,
      'sunday',
      new Date(2026, 7, 15),
    );
    expect(month.weekdayLabels[0]).toBe('Su');
    // 2026-08-01 Saturday → leading Sunday Jul 26
    expect(month.days[0]).toMatchObject({ day: 26, inMonth: false });
  });
});

describe('shiftCalendarMonth', () => {
  it('wraps across year boundaries', () => {
    expect(shiftCalendarMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftCalendarMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });
});
