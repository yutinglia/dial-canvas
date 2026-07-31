export type WeekStartsOn = 'sunday' | 'monday';

export type CalendarDay = {
  date: Date;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

export type CalendarMonth = {
  year: number;
  month: number;
  title: string;
  weekdayLabels: string[];
  days: CalendarDay[];
};

const WEEKDAY_LABELS_SUNDAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAY_LABELS_MONDAY = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Format a month title like "August 2026". */
export function formatCalendarMonthTitle(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/** Weekday labels for the chosen week start. */
export function calendarWeekdayLabels(weekStartsOn: WeekStartsOn): string[] {
  return weekStartsOn === 'sunday'
    ? [...WEEKDAY_LABELS_SUNDAY]
    : [...WEEKDAY_LABELS_MONDAY];
}

/**
 * Build a 6×7 month grid including leading/trailing days from adjacent months.
 */
export function buildCalendarMonth(
  year: number,
  month: number,
  weekStartsOn: WeekStartsOn,
  today = new Date(),
): CalendarMonth {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const offset =
    weekStartsOn === 'sunday'
      ? firstWeekday
      : (firstWeekday + 6) % 7;

  const gridStart = new Date(year, month, 1 - offset);
  const todayStart = startOfDay(today);
  const days: CalendarDay[] = [];

  for (let i = 0; i < 42; i++) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    days.push({
      date,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: sameDay(date, todayStart),
    });
  }

  return {
    year,
    month,
    title: formatCalendarMonthTitle(year, month),
    weekdayLabels: calendarWeekdayLabels(weekStartsOn),
    days,
  };
}

/** Shift a year/month by delta months. */
export function shiftCalendarMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const next = new Date(year, month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}
