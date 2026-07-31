<script lang="ts">
  import type { Background, Settings } from '../lib/schemas/settings';
  import { t } from '../lib/i18n';

  interface Props {
    open: boolean;
    settings: Settings;
    onClose: () => void;
    onChange: (partial: Partial<Settings>) => void;
    onExport: () => void;
    onImportFile: (file: File) => void;
    onReset: () => void;
    onImportBookmarks: () => void;
  }

  let {
    open,
    settings,
    onClose,
    onChange,
    onExport,
    onImportFile,
    onReset,
    onImportBookmarks,
  }: Props = $props();

  let fileInput: HTMLInputElement | undefined = $state();
  let wallpaperUrl = $state('');

  $effect(() => {
    if (open) {
      wallpaperUrl =
        settings.background.type === 'image' ? settings.background.value : '';
    }
  });

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }

  function setColorBackground(value: string) {
    onChange({ background: { type: 'color', value } });
  }

  function applyWallpaper() {
    const value = wallpaperUrl.trim();
    if (!value) {
      setColorBackground(
        settings.background.type === 'color'
          ? settings.background.value
          : '#1a1d23',
      );
      return;
    }
    const fit =
      settings.background.type === 'image' ? settings.background.fit : 'cover';
    onChange({ background: { type: 'image', value, fit } });
  }

  function setFit(fit: 'cover' | 'contain' | 'tile') {
    if (settings.background.type !== 'image') return;
    onChange({
      background: { ...settings.background, fit } satisfies Background,
    });
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style:background="var(--overlay)"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={onKeydown}
  >
    <div
      class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl p-5 shadow-lg"
      style:background="#22262e"
      style:border="1px solid var(--dial-border)"
      role="dialog"
      aria-label={t('settings')}
    >
      <h2 class="mb-4 text-lg font-medium">{t('settings')}</h2>

      <label class="mb-4 block text-sm">
        <span class="mb-1 flex items-center justify-between text-[var(--text-muted)]">
          <span>{t('gridSize')}</span>
          <span>{settings.gridSize}px</span>
        </span>
        <input
          type="range"
          min="4"
          max="64"
          step="1"
          value={settings.gridSize}
          class="w-full"
          oninput={(e) => {
            const gridSize = Number((e.currentTarget as HTMLInputElement).value);
            onChange({
              gridSize,
              snapThreshold: Math.max(1, Math.floor(gridSize / 2)),
            });
          }}
        />
      </label>

      <label class="mb-4 flex items-center justify-between gap-3 text-sm">
        <span class="text-[var(--text-muted)]">{t('snapEnabled')}</span>
        <input
          type="checkbox"
          checked={settings.snapEnabled}
          onchange={(e) =>
            onChange({
              snapEnabled: (e.currentTarget as HTMLInputElement).checked,
            })
          }
        />
      </label>

      {#if settings.snapEnabled}
        <label class="mb-4 block text-sm">
          <span
            class="mb-1 flex items-center justify-between text-[var(--text-muted)]"
          >
            <span>{t('snapThreshold')}</span>
            <span>{settings.snapThreshold}px</span>
          </span>
          <input
            type="range"
            min="1"
            max={Math.max(2, settings.gridSize)}
            step="1"
            value={settings.snapThreshold}
            class="w-full"
            oninput={(e) => {
              onChange({
                snapThreshold: Number(
                  (e.currentTarget as HTMLInputElement).value,
                ),
              });
            }}
          />
        </label>
      {/if}

      <label class="mb-4 block text-sm">
        <span class="mb-1 flex items-center justify-between text-[var(--text-muted)]">
          <span>{t('iconSize')}</span>
          <span>{settings.iconSize}px</span>
        </span>
        <input
          type="range"
          min="16"
          max="64"
          step="1"
          value={settings.iconSize}
          class="w-full"
          oninput={(e) => {
            onChange({
              iconSize: Number((e.currentTarget as HTMLInputElement).value),
            });
          }}
        />
      </label>

      <label class="mb-4 block text-sm">
        <span class="mb-1 flex items-center justify-between text-[var(--text-muted)]">
          <span>{t('fontSize')}</span>
          <span>{settings.fontSize}px</span>
        </span>
        <input
          type="range"
          min="10"
          max="24"
          step="1"
          value={settings.fontSize}
          class="w-full"
          oninput={(e) => {
            onChange({
              fontSize: Number((e.currentTarget as HTMLInputElement).value),
            });
          }}
        />
      </label>

      <label class="mb-4 block text-sm">
        <span class="mb-1 flex items-center justify-between text-[var(--text-muted)]">
          <span>{t('canvasMinWidth')}</span>
          <span>{settings.canvasMinWidth}px</span>
        </span>
        <input
          type="range"
          min="800"
          max="2400"
          step="50"
          value={settings.canvasMinWidth}
          class="w-full"
          oninput={(e) => {
            onChange({
              canvasMinWidth: Number(
                (e.currentTarget as HTMLInputElement).value,
              ),
            });
          }}
        />
      </label>

      <label class="mb-4 block text-sm">
        <span class="mb-1 flex items-center justify-between text-[var(--text-muted)]">
          <span>{t('canvasMinHeight')}</span>
          <span>{settings.canvasMinHeight}px</span>
        </span>
        <input
          type="range"
          min="600"
          max="1800"
          step="50"
          value={settings.canvasMinHeight}
          class="w-full"
          oninput={(e) => {
            onChange({
              canvasMinHeight: Number(
                (e.currentTarget as HTMLInputElement).value,
              ),
            });
          }}
        />
      </label>

      <label class="mb-4 block text-sm">
        <span class="mb-1 block text-[var(--text-muted)]">{t('backgroundColor')}</span>
        <div class="flex items-center gap-3">
          <input
            type="color"
            value={settings.background.type === 'color'
              ? settings.background.value
              : '#1a1d23'}
            oninput={(e) => {
              const value = (e.currentTarget as HTMLInputElement).value;
              setColorBackground(value);
            }}
          />
          <input
            class="flex-1 rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
            style:border-color="var(--dial-border)"
            value={settings.background.type === 'color'
              ? settings.background.value
              : '#1a1d23'}
            onchange={(e) => {
              const value = (e.currentTarget as HTMLInputElement).value.trim();
              if (value) setColorBackground(value);
            }}
          />
        </div>
      </label>

      <label class="mb-2 block text-sm">
        <span class="mb-1 block text-[var(--text-muted)]">{t('backgroundImage')}</span>
        <input
          class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
          style:border-color="var(--dial-border)"
          bind:value={wallpaperUrl}
          placeholder="https://… or data:image/…"
          onchange={applyWallpaper}
        />
      </label>

      {#if settings.background.type === 'image'}
        <label class="mb-5 block text-sm">
          <span class="mb-1 block text-[var(--text-muted)]">{t('backgroundFit')}</span>
          <select
            class="w-full rounded-md border bg-transparent px-3 py-2 outline-none"
            style:border-color="var(--dial-border)"
            value={settings.background.fit}
            onchange={(e) =>
              setFit(
                (e.currentTarget as HTMLSelectElement).value as
                  | 'cover'
                  | 'contain'
                  | 'tile',
              )
            }
          >
            <option value="cover">{t('fitCover')}</option>
            <option value="contain">{t('fitContain')}</option>
            <option value="tile">{t('fitTile')}</option>
          </select>
        </label>
      {:else}
        <div class="mb-5"></div>
      {/if}

      <h3 class="mb-2 text-sm font-medium text-[var(--text-muted)]">
        {t('dataBackup')}
      </h3>
      <div class="mb-5 flex flex-wrap gap-2">
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
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-sm"
          style:color="var(--danger)"
          style:border="1px solid var(--dial-border)"
          onclick={onReset}
        >
          {t('resetDefaults')}
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

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-sm"
          style:background="var(--accent)"
          style:color="#0f1216"
          onclick={onClose}
        >
          {t('close')}
        </button>
      </div>
    </div>
  </div>
{/if}
