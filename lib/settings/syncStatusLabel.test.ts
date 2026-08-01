import { describe, expect, it } from 'vitest';
import { buildSyncStatusLabel, formatSyncTime } from './syncStatusLabel';

const t = (key: string, ...args: string[]) =>
  args.length > 0 ? `${key}:${args.join(',')}` : key;

describe('formatSyncTime', () => {
  it('returns empty string for missing or invalid input', () => {
    expect(formatSyncTime(undefined)).toBe('');
    expect(formatSyncTime(0)).toBe('');
  });

  it('formats a valid epoch timestamp', () => {
    const formatted = formatSyncTime(Date.UTC(2024, 0, 15, 12, 0, 0));
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe('buildSyncStatusLabel', () => {
  const base = {
    syncBusy: false,
    syncEnabled: true,
    syncStatus: {},
    t,
  };

  it('prioritizes busy and error states', () => {
    expect(
      buildSyncStatusLabel({ ...base, syncBusy: true }),
    ).toBe('firefoxSyncBusy');
    expect(
      buildSyncStatusLabel({
        ...base,
        syncStatus: { lastError: 'quota' },
      }),
    ).toBe('firefoxSyncQuotaError');
    expect(
      buildSyncStatusLabel({
        ...base,
        syncStatus: { lastError: 'unknown' },
      }),
    ).toBe('firefoxSyncFailed');
  });

  it('shows off hint when sync is disabled', () => {
    expect(
      buildSyncStatusLabel({ ...base, syncEnabled: false }),
    ).toBe('firefoxSyncOffHint');
  });

  it('shows last synced time when available', () => {
    const at = Date.UTC(2024, 5, 1, 8, 30, 0);
    expect(
      buildSyncStatusLabel({
        ...base,
        syncStatus: { lastPullAt: at },
      }),
    ).toBe(`firefoxSyncLastSynced:${formatSyncTime(at)}`);
  });

  it('falls back to enabled hint', () => {
    expect(buildSyncStatusLabel(base)).toBe('firefoxSyncEnabledHint');
  });
});
