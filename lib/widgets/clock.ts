export type ClockFormat = '12h' | '24h';

export type FormatClockOptions = {
  format: ClockFormat;
  showSeconds: boolean;
};

/** Format a time string for the clock widget. */
export function formatClockTime(
  date: Date,
  options: FormatClockOptions,
): string {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const pad = (n: number) => String(n).padStart(2, '0');

  if (options.format === '24h') {
    const base = `${pad(hours24)}:${pad(minutes)}`;
    return options.showSeconds ? `${base}:${pad(seconds)}` : base;
  }

  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const base = `${hours12}:${pad(minutes)}`;
  const withSeconds = options.showSeconds ? `${base}:${pad(seconds)}` : base;
  return `${withSeconds} ${period}`;
}

/** Format a short date string for the clock widget (e.g. Sat, Aug 1). */
export function formatClockDate(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
