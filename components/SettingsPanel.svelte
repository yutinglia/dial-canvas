<script lang="ts">
  import type { Settings } from '../lib/schemas/settings';
  import type {
    BingWallpaperItem,
    BingWallpaperListResult,
  } from '../lib/dials/bingWallpaper';
  import type { SyncStatus } from '../lib/storage/firefoxSync';
  import { t } from '../lib/i18n';
  import AboutModal from './AboutModal.svelte';
  import SettingsGeneralSection from './settings/SettingsGeneralSection.svelte';
  import SettingsLayoutSection from './settings/SettingsLayoutSection.svelte';
  import SettingsCanvasSection from './settings/SettingsCanvasSection.svelte';
  import SettingsBackgroundSection from './settings/SettingsBackgroundSection.svelte';
  import SettingsDataSection from './settings/SettingsDataSection.svelte';
  import SettingsAboutSection from './settings/SettingsAboutSection.svelte';

  interface Props {
    open: boolean;
    settings: Settings;
    syncEnabled: boolean;
    syncStatus: SyncStatus;
    syncBusy: boolean;
    onClose: () => void;
    onChange: (
      partial: Partial<Settings>,
      opts?: { immediate?: boolean },
    ) => void;
    onExport: () => void;
    onImportFile: (file: File) => void;
    onReset: () => void;
    onImportBookmarks: () => void;
    onSelectBing: () => boolean | Promise<boolean>;
    onRefreshBing: () => void | Promise<void>;
    onLoadBingList: () => Promise<BingWallpaperListResult>;
    onSelectBingWallpaper: (
      item: BingWallpaperItem,
      options: { locked: boolean },
    ) => void | Promise<void>;
    onSyncEnabledChange: (enabled: boolean) => void;
    onToast: (message: string) => void;
  }

  let {
    open,
    settings,
    syncEnabled,
    syncStatus,
    syncBusy,
    onClose,
    onChange,
    onExport,
    onImportFile,
    onReset,
    onImportBookmarks,
    onSelectBing,
    onRefreshBing,
    onLoadBingList,
    onSelectBingWallpaper,
    onSyncEnabledChange,
    onToast,
  }: Props = $props();

  let panelEl: HTMLDivElement | undefined = $state();
  let wasOpen = false;
  let aboutOpen = $state(false);

  $effect(() => {
    if (!open) {
      wasOpen = false;
      aboutOpen = false;
      return;
    }
    if (!wasOpen) {
      wasOpen = true;
      queueMicrotask(() => panelEl?.focus());
    }
  });

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    if (aboutOpen) {
      aboutOpen = false;
      return;
    }
    onClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex justify-end"
    style:background="var(--overlay)"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={onKeydown}
  >
    <div
      bind:this={panelEl}
      class="flex h-full w-full max-w-full flex-col shadow-lg sm:w-[23rem]"
      style:background="#22262e"
      style:border-left="1px solid var(--dial-border)"
      role="dialog"
      aria-modal="true"
      aria-label={t('settings')}
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => {
        e.stopPropagation();
        onKeydown(e);
      }}
    >
      <div
        class="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b px-5 py-4"
        style:background="#22262e"
        style:border-color="var(--dial-border)"
      >
        <h2 class="text-lg font-medium text-[var(--dial-title)]">
          {t('settings')}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-sm text-[var(--text-muted)]"
          onclick={onClose}
        >
          {t('close')}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4">
        <SettingsGeneralSection {settings} {onChange} />
        <SettingsLayoutSection {settings} {onChange} />
        <SettingsCanvasSection {settings} {onChange} />
        <SettingsBackgroundSection
          {open}
          {settings}
          {onChange}
          {onSelectBing}
          {onRefreshBing}
          {onLoadBingList}
          {onSelectBingWallpaper}
          {onToast}
        />
        <SettingsDataSection
          {syncEnabled}
          {syncStatus}
          {syncBusy}
          {onSyncEnabledChange}
          {onExport}
          {onImportFile}
          {onReset}
          {onImportBookmarks}
        />
        <SettingsAboutSection onOpenAbout={() => (aboutOpen = true)} />
      </div>
    </div>
  </div>

  <AboutModal open={aboutOpen} onClose={() => (aboutOpen = false)} />
{/if}
