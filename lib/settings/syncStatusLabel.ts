import type { SyncStatus } from '../storage/firefoxSync';

export function formatSyncTime(epochMs: number | undefined): string {
  if (!epochMs) return '';
  try {
    return new Date(epochMs).toLocaleString();
  } catch {
    return '';
  }
}

type BuildSyncStatusLabelArgs = {
  syncBusy: boolean;
  syncEnabled: boolean;
  syncStatus: SyncStatus;
  t: (key: string, ...args: string[]) => string;
};

export function buildSyncStatusLabel({
  syncBusy,
  syncEnabled,
  syncStatus,
  t,
}: BuildSyncStatusLabelArgs): string {
  if (syncBusy) return t('firefoxSyncBusy');
  if (syncStatus.lastError === 'quota' || syncStatus.lastError === 'oversized') {
    return t('firefoxSyncQuotaError');
  }
  if (syncStatus.lastError === 'unknown') {
    return t('firefoxSyncFailed');
  }
  if (!syncEnabled) return t('firefoxSyncOffHint');
  const at = syncStatus.lastPullAt ?? syncStatus.lastPushAt;
  if (at) return t('firefoxSyncLastSynced', formatSyncTime(at));
  return t('firefoxSyncEnabledHint');
}
