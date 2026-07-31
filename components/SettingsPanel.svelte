<script lang="ts">
  import type { Background, Settings } from '../lib/schemas/settings';
  import { DEFAULT_BACKGROUND_OPACITY } from '../lib/schemas/settings';
  import { fileToWallpaperDataUrl } from '../lib/dials/wallpaperImage';
  import type {
    BingWallpaperItem,
    BingWallpaperListResult,
  } from '../lib/dials/bingWallpaper';
  import { t } from '../lib/i18n';

  type WallpaperSource = 'color' | 'url' | 'upload' | 'bing';

  interface Props {
    open: boolean;
    settings: Settings;
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
    onToast: (message: string) => void;
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
    onSelectBing,
    onRefreshBing,
    onLoadBingList,
    onSelectBingWallpaper,
    onToast,
  }: Props = $props();

  let fileInput: HTMLInputElement | undefined = $state();
  let wallpaperInput: HTMLInputElement | undefined = $state();
  let wallpaperUrl = $state('');
  let source = $state<WallpaperSource>('color');
  let uploading = $state(false);
  let bingImages = $state<BingWallpaperItem[]>([]);
  let bingListLoading = $state(false);
  let bingListError = $state('');
  let bingListLoaded = $state(false);

  function currentFit(): 'cover' | 'contain' | 'tile' {
    const bg = settings.background;
    if (bg.type === 'image' || bg.type === 'bing') return bg.fit;
    return 'cover';
  }

  function currentOpacity(): number {
    const bg = settings.background;
    if (bg.type === 'image' || bg.type === 'bing') return bg.opacity;
    return DEFAULT_BACKGROUND_OPACITY;
  }

  const opacityPercent = $derived(Math.round(currentOpacity() * 100));

  function deriveSource(bg: Background): WallpaperSource {
    if (bg.type === 'color') return 'color';
    if (bg.type === 'bing') return 'bing';
    if (bg.value.startsWith('data:')) return 'upload';
    return 'url';
  }

  $effect(() => {
    if (open) {
      source = deriveSource(settings.background);
      wallpaperUrl =
        settings.background.type === 'image' &&
        !settings.background.value.startsWith('data:')
          ? settings.background.value
          : '';
    }
  });

  $effect(() => {
    if (!open || source !== 'bing') return;
    if (bingListLoaded || bingListLoading) return;
    void loadBingList();
  });

  async function loadBingList() {
    bingListLoading = true;
    bingListError = '';
    try {
      const result = await onLoadBingList();
      if (!result.ok) {
        bingImages = [];
        bingListError = result.error;
        bingListLoaded = true;
        return;
      }
      bingImages = result.images;
      bingListLoaded = true;
    } catch {
      bingImages = [];
      bingListError = 'Failed to fetch Bing wallpaper list.';
      bingListLoaded = true;
    } finally {
      bingListLoading = false;
    }
  }

  function resetBingListCache() {
    bingImages = [];
    bingListError = '';
    bingListLoaded = false;
  }

  async function refreshBingToday() {
    resetBingListCache();
    await onRefreshBing();
    void loadBingList();
  }

  async function pickBingWallpaper(item: BingWallpaperItem, index: number) {
    await onSelectBingWallpaper(item, { locked: index !== 0 });
  }

  function isBingSelected(item: BingWallpaperItem): boolean {
    const bg = settings.background;
    return bg.type === 'bing' && bg.cachedUrl === item.url;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }

  function setColorBackground(value: string) {
    onChange({ background: { type: 'color', value } }, { immediate: true });
  }

  function applyWallpaperUrl() {
    const value = wallpaperUrl.trim();
    if (!value) {
      setColorBackground(
        settings.background.type === 'color'
          ? settings.background.value
          : '#1a1d23',
      );
      source = 'color';
      return;
    }
    onChange(
      {
        background: {
          type: 'image',
          value,
          fit: currentFit(),
          opacity: currentOpacity(),
        },
      },
      { immediate: true },
    );
  }

  function setFit(fit: 'cover' | 'contain' | 'tile') {
    const bg = settings.background;
    if (bg.type === 'image') {
      onChange(
        {
          background: { ...bg, fit } satisfies Background,
        },
        { immediate: true },
      );
      return;
    }
    if (bg.type === 'bing') {
      onChange(
        {
          background: { ...bg, fit } satisfies Background,
        },
        { immediate: true },
      );
    }
  }

  function setOpacityPercent(percent: number) {
    const bg = settings.background;
    if (bg.type !== 'image' && bg.type !== 'bing') return;
    const opacity = Math.min(100, Math.max(0, percent)) / 100;
    onChange(
      {
        background: { ...bg, opacity } satisfies Background,
      },
      { immediate: true },
    );
  }

  function selectSource(next: WallpaperSource) {
    source = next;
    if (next === 'color') {
      setColorBackground(
        settings.background.type === 'color'
          ? settings.background.value
          : '#1a1d23',
      );
      return;
    }
    if (next === 'url') {
      const existing =
        settings.background.type === 'image' &&
        !settings.background.value.startsWith('data:')
          ? settings.background.value
          : '';
      wallpaperUrl = existing;
      if (existing) {
        onChange(
          {
            background: {
              type: 'image',
              value: existing,
              fit: currentFit(),
              opacity: currentOpacity(),
            },
          },
          { immediate: true },
        );
      }
      return;
    }
    if (next === 'upload') {
      // Keep current uploaded image if present; otherwise wait for a file.
      if (
        settings.background.type === 'image' &&
        settings.background.value.startsWith('data:')
      ) {
        return;
      }
      return;
    }
    if (next === 'bing') {
      void (async () => {
        const ok = await onSelectBing();
        if (!ok) {
          source = deriveSource(settings.background);
          return;
        }
        resetBingListCache();
        void loadBingList();
      })();
    }
  }

  async function onWallpaperFile(file: File) {
    uploading = true;
    try {
      const result = await fileToWallpaperDataUrl(file);
      if (!result.ok) {
        if (result.error === 'type') onToast(t('wallpaperInvalidType'));
        else if (result.error === 'read') onToast(t('wallpaperReadFailed'));
        else onToast(t('wallpaperTooLarge'));
        return;
      }
      source = 'upload';
      onChange(
        {
          background: {
            type: 'image',
            value: result.dataUrl,
            fit: currentFit(),
            opacity: currentOpacity(),
          },
        },
        { immediate: true },
      );
    } finally {
      uploading = false;
    }
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
            onChange(
              {
                snapEnabled: (e.currentTarget as HTMLInputElement).checked,
              },
              { immediate: true },
            )
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

      <fieldset class="mb-4">
        <legend class="mb-2 text-sm text-[var(--text-muted)]">
          {t('backgroundSource')}
        </legend>
        <div class="flex flex-wrap gap-2 text-sm">
          {#each [
            ['color', t('backgroundSourceColor')],
            ['url', t('backgroundSourceUrl')],
            ['upload', t('backgroundSourceUpload')],
            ['bing', t('backgroundSourceBing')],
          ] as [value, label]}
            <button
              type="button"
              class="rounded-md px-3 py-1.5"
              style:border="1px solid var(--dial-border)"
              style:background={source === value
                ? 'rgba(107, 143, 113, 0.25)'
                : 'transparent'}
              onclick={() => selectSource(value as WallpaperSource)}
            >
              {label}
            </button>
          {/each}
        </div>
      </fieldset>

      {#if source === 'color'}
        <label class="mb-4 block text-sm">
          <span class="mb-1 block text-[var(--text-muted)]"
            >{t('backgroundColor')}</span
          >
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
      {:else if source === 'url'}
        <label class="mb-2 block text-sm">
          <span class="mb-1 block text-[var(--text-muted)]"
            >{t('backgroundImage')}</span
          >
          <input
            class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
            style:border-color="var(--dial-border)"
            bind:value={wallpaperUrl}
            placeholder="https://…"
            onchange={applyWallpaperUrl}
          />
        </label>
      {:else if source === 'upload'}
        <div class="mb-2 text-sm">
          <span class="mb-1 block text-[var(--text-muted)]"
            >{t('backgroundUpload')}</span
          >
          <button
            type="button"
            class="rounded-md px-3 py-1.5"
            style:border="1px solid var(--dial-border)"
            disabled={uploading}
            onclick={() => wallpaperInput?.click()}
          >
            {uploading ? t('wallpaperUploading') : t('backgroundChooseFile')}
          </button>
          {#if settings.background.type === 'image' && settings.background.value.startsWith('data:')}
            <p class="mt-2 text-xs text-[var(--text-muted)]">
              {t('wallpaperUploadActive')}
            </p>
          {/if}
          <input
            bind:this={wallpaperInput}
            type="file"
            accept="image/*"
            class="hidden"
            onchange={(e) => {
              const file = (e.currentTarget as HTMLInputElement).files?.[0];
              if (file) void onWallpaperFile(file);
              (e.currentTarget as HTMLInputElement).value = '';
            }}
          />
        </div>
      {:else}
        <div class="mb-2 text-sm">
          <p class="mb-2 text-[var(--text-muted)]">{t('backgroundBingHint')}</p>
          <button
            type="button"
            class="mb-3 rounded-md px-3 py-1.5"
            style:border="1px solid var(--dial-border)"
            onclick={() => void refreshBingToday()}
          >
            {t('backgroundBingRefresh')}
          </button>

          {#if bingListLoading && bingImages.length === 0}
            <p class="text-[var(--text-muted)]">{t('backgroundBingLoading')}</p>
          {:else if bingListError && bingImages.length === 0}
            <p class="text-[var(--text-muted)]">{t('backgroundBingListFailed')}</p>
          {:else if bingImages.length > 0}
            <div class="grid grid-cols-2 gap-2">
              {#each bingImages as item, index (item.url)}
                <button
                  type="button"
                  class="group overflow-hidden rounded-md text-left outline-none"
                  style:border={isBingSelected(item)
                    ? '2px solid var(--accent)'
                    : '1px solid var(--dial-border)'}
                  title={item.title ? `${item.date} — ${item.title}` : item.date}
                  aria-pressed={isBingSelected(item)}
                  onclick={() => void pickBingWallpaper(item, index)}
                >
                  <div class="relative aspect-video overflow-hidden bg-black/30">
                    <img
                      src={item.thumbUrl}
                      alt={item.title ?? item.date}
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {#if index === 0}
                      <span
                        class="absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] leading-none"
                        style:background="var(--toolbar-bg)"
                        style:color="var(--dial-title)"
                      >
                        {t('backgroundBingToday')}
                      </span>
                    {/if}
                  </div>
                  <div
                    class="truncate px-1.5 py-1 text-[11px] text-[var(--text-muted)]"
                  >
                    {item.date}
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      {#if source === 'url' || source === 'upload' || source === 'bing'}
        <label class="mb-4 block text-sm">
          <span class="mb-1 block text-[var(--text-muted)]"
            >{t('backgroundFit')}</span
          >
          <select
            class="w-full rounded-md border bg-transparent px-3 py-2 outline-none"
            style:border-color="var(--dial-border)"
            value={currentFit()}
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
        <div class="mb-5 block text-sm">
          <div class="mb-1 flex items-center justify-between gap-2">
            <span class="text-[var(--text-muted)]">
              {t('backgroundOpacity')}
              <span class="ml-1 text-[var(--text-muted)]">{opacityPercent}%</span>
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={opacityPercent}
            class="w-full"
            oninput={(e) => {
              setOpacityPercent(
                Number((e.currentTarget as HTMLInputElement).value),
              );
            }}
          />
        </div>
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
