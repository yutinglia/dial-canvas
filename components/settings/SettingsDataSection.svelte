<script lang="ts">
  import type { SyncStatus } from '../../lib/storage/firefoxSync';
  import { buildSyncStatusLabel } from '../../lib/settings/syncStatusLabel';
  import { t } from '../../lib/i18n';

  interface Props {
    syncEnabled: boolean;
    syncStatus: SyncStatus;
    syncBusy: boolean;
    onSyncEnabledChange: (enabled: boolean) => void;
    onExport: () => void;
    onImportFile: (file: File) => void;
    onReset: () => void;
    onImportBookmarks: () => void;
  }

  let {
    syncEnabled,
    syncStatus,
    syncBusy,
    onSyncEnabledChange,
    onExport,
    onImportFile,
    onReset,
    onImportBookmarks,
  }: Props = $props();

  let fileInput: HTMLInputElement | undefined = $state();

  const syncStatusLabel = $derived(
    buildSyncStatusLabel({ syncBusy, syncEnabled, syncStatus, t }),
  );
</script>

<section class="border-t pt-5" style:border-color="var(--dial-border)">
  <h3
    class="mb-3 text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
  >
    {t('settingsSectionData')}
  </h3>
  <div class="mb-4">
    <label class="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        class="mt-0.5"
        checked={syncEnabled}
        disabled={syncBusy}
        onchange={(e) =>
          onSyncEnabledChange((e.currentTarget as HTMLInputElement).checked)
        }
      />
      <span>
        <span class="block">{t('firefoxSyncEnable')}</span>
        <span class="mt-1 block text-xs text-[var(--text-muted)]">
          {t('firefoxSyncHint')}
        </span>
      </span>
    </label>
    <p class="mt-2 text-xs text-[var(--text-muted)]">
      {syncStatusLabel}
    </p>
  </div>
  <div class="mb-3 flex flex-wrap gap-2">
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-sm"
      style:border="1px solid var(--dial-border)"
      onclick={onExport}
    >
      {t('exportJson')}
    </button>
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-sm"
      style:border="1px solid var(--dial-border)"
      onclick={() => fileInput?.click()}
    >
      {t('importJson')}
    </button>
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-sm"
      style:border="1px solid var(--dial-border)"
      onclick={onImportBookmarks}
    >
      {t('bookmarksImport')}
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept="application/json,.json"
      class="hidden"
      onchange={(e) => {
        const file = (e.currentTarget as HTMLInputElement).files?.[0];
        if (file) onImportFile(file);
        (e.currentTarget as HTMLInputElement).value = '';
      }}
    />
  </div>
  <button
    type="button"
    class="rounded-md px-3 py-1.5 text-sm"
    style:color="var(--danger)"
    style:border="1px solid var(--dial-border)"
    onclick={onReset}
  >
    {t('resetDefaults')}
  </button>
</section>
