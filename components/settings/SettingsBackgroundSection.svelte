<script lang="ts">
  import type { Background, Settings } from '../../lib/schemas/settings';
  import {
    DEFAULT_BACKGROUND_OPACITY,
    DEFAULT_SETTINGS,
  } from '../../lib/schemas/settings';
  import { fileToWallpaperDataUrl } from '../../lib/dials/wallpaperImage';
  import type {
    BingWallpaperItem,
    BingWallpaperListResult,
  } from '../../lib/dials/bingWallpaper';
  import {
    backgroundsEqual,
    currentFit,
    currentOpacity,
    deriveSource,
    type WallpaperSource,
  } from '../../lib/settings/backgroundUi';
  import { t } from '../../lib/i18n';
  import SettingsSliderField from './SettingsSliderField.svelte';

  interface Props {
    open: boolean;
    settings: Settings;
    onChange: (
      partial: Partial<Settings>,
      opts?: { immediate?: boolean },
    ) => void;
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
    onChange,
    onSelectBing,
    onRefreshBing,
    onLoadBingList,
    onSelectBingWallpaper,
    onToast,
  }: Props = $props();

  let wallpaperInput: HTMLInputElement | undefined = $state();
  let wallpaperUrl = $state('');
  let source = $state<WallpaperSource>('color');
  let uploading = $state(false);
  let bingImages = $state<BingWallpaperItem[]>([]);
  let bingListLoading = $state(false);
  let bingListError = $state('');
  let bingListLoaded = $state(false);
  let bingListLoadId = 0;
  /** Sync guard — Svelte state updates are async, so effects can double-fire. */
  let bingListInFlight = false;
  let sliderDragging = $state(false);
  let opacityPercentLocal = $state(
    Math.round(DEFAULT_BACKGROUND_OPACITY * 100),
  );

  const isDefaultBackground = $derived(
    backgroundsEqual(settings.background, DEFAULT_SETTINGS.background),
  );
  const isDefaultFit = $derived(currentFit(settings.background) === 'cover');
  const isDefaultOpacity = $derived(
    Math.abs(currentOpacity(settings.background) - DEFAULT_BACKGROUND_OPACITY) <
      0.001,
  );

  $effect(() => {
    if (!open) {
      sliderDragging = false;
      return;
    }
    if (!sliderDragging) {
      opacityPercentLocal = Math.round(
        currentOpacity(settings.background) * 100,
      );
    }
    source = deriveSource(settings.background);
    wallpaperUrl =
      settings.background.type === 'image' &&
      !settings.background.value.startsWith('data:')
        ? settings.background.value
        : '';
  });

  // Load only after Bing is persisted (permission already handled by onSelectBing).
  $effect(() => {
    if (!open || source !== 'bing') return;
    if (settings.background.type !== 'bing') return;
    if (bingListLoaded || bingListLoading) return;
    void loadBingList();
  });

  async function loadBingList() {
    if (bingListInFlight || bingListLoaded) return;
    bingListInFlight = true;
    const loadId = ++bingListLoadId;
    bingListLoading = true;
    bingListError = '';
    try {
      const result = await onLoadBingList();
      if (loadId !== bingListLoadId) return;
      if (!result.ok) {
        bingImages = [];
        bingListError = result.error;
        bingListLoaded = true;
        return;
      }
      bingImages = result.images;
      bingListError = '';
      bingListLoaded = true;
    } catch (err) {
      if (loadId !== bingListLoadId) return;
      bingImages = [];
      bingListError =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to fetch Bing wallpaper list.';
      bingListLoaded = true;
    } finally {
      if (loadId === bingListLoadId) {
        bingListLoading = false;
        bingListInFlight = false;
      }
    }
  }

  function resetBingListCache() {
    bingListLoadId += 1;
    bingListInFlight = false;
    bingImages = [];
    bingListError = '';
    bingListLoaded = false;
    bingListLoading = false;
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

  function beginSliderDrag() {
    sliderDragging = true;
  }

  function endSliderDrag() {
    if (!sliderDragging) return;
    sliderDragging = false;
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
          fit: currentFit(settings.background),
          opacity: currentOpacity(settings.background),
        },
      },
      { immediate: true },
    );
  }

  function setFit(fit: 'cover' | 'contain' | 'tile') {
    const bg = settings.background;
    if (bg.type === 'image' || bg.type === 'bing') {
      onChange(
        { background: { ...bg, fit } satisfies Background },
        { immediate: true },
      );
    }
  }

  function setOpacityPercent(percent: number, immediate: boolean) {
    const bg = settings.background;
    if (bg.type !== 'image' && bg.type !== 'bing') return;
    const opacity = Math.min(100, Math.max(0, percent)) / 100;
    opacityPercentLocal = Math.round(opacity * 100);
    onChange(
      { background: { ...bg, opacity } satisfies Background },
      { immediate },
    );
  }

  function flushOpacity() {
    endSliderDrag();
    setOpacityPercent(opacityPercentLocal, true);
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
              fit: currentFit(settings.background),
              opacity: currentOpacity(settings.background),
            },
          },
          { immediate: true },
        );
      }
      return;
    }
    if (next === 'upload') {
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
            fit: currentFit(settings.background),
            opacity: currentOpacity(settings.background),
          },
        },
        { immediate: true },
      );
    } finally {
      uploading = false;
    }
  }

  function resetBackground() {
    source = 'color';
    wallpaperUrl = '';
    opacityPercentLocal = Math.round(DEFAULT_BACKGROUND_OPACITY * 100);
    onChange(
      { background: structuredClone(DEFAULT_SETTINGS.background) },
      { immediate: true },
    );
  }
</script>

<section class="mb-6 border-t pt-5" style:border-color="var(--dial-border)">
  <div class="mb-3 flex items-center justify-between gap-2">
    <h3
      class="text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
    >
      {t('settingsSectionBackground')}
    </h3>
    {#if !isDefaultBackground}
      <button
        type="button"
        class="rounded px-2 py-0.5 text-xs"
        style:border="1px solid var(--dial-border)"
        style:color="var(--accent)"
        onclick={resetBackground}
      >
        {t('useDefault')}
      </button>
    {/if}
  </div>

  <fieldset class="mb-4">
    <legend class="mb-2 text-sm text-[var(--text-muted)]">
      {t('backgroundSource')}
    </legend>
    <div class="flex flex-wrap gap-2 text-sm" role="group">
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
          aria-pressed={source === value}
          onclick={() => selectSource(value as WallpaperSource)}
        >
          {label}
        </button>
      {/each}
    </div>
  </fieldset>

  {#if source === 'color'}
    <label class="mb-4 block text-sm">
      <span class="mb-1 block text-[var(--text-muted)]">{t('backgroundColor')}</span>
      <div class="flex items-center gap-3">
        <input
          type="color"
          value={settings.background.type === 'color'
            ? settings.background.value
            : '#1a1d23'}
          oninput={(e) => {
            setColorBackground((e.currentTarget as HTMLInputElement).value);
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
    <label class="mb-4 block text-sm">
      <span class="mb-1 block text-[var(--text-muted)]">{t('backgroundImage')}</span>
      <input
        class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
        style:border-color="var(--dial-border)"
        bind:value={wallpaperUrl}
        placeholder="https://…"
        onchange={applyWallpaperUrl}
      />
    </label>
  {:else if source === 'upload'}
    <div class="mb-4 text-sm">
      <span class="mb-1 block text-[var(--text-muted)]">{t('backgroundUpload')}</span>
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
    <div class="mb-4 text-sm">
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
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-[var(--text-muted)]">
            {t('backgroundBingListFailed')}
          </p>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-xs"
            style:border="1px solid var(--dial-border)"
            onclick={() => {
              resetBingListCache();
              void loadBingList();
            }}
          >
            {t('backgroundBingRetry')}
          </button>
        </div>
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
              <div class="truncate px-1.5 py-1 text-[11px] text-[var(--text-muted)]">
                {item.date}
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if source === 'url' || source === 'upload' || source === 'bing'}
    <div class="mb-4 block text-sm">
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="text-[var(--text-muted)]">{t('backgroundFit')}</span>
        {#if !isDefaultFit}
          <button
            type="button"
            class="rounded px-2 py-0.5 text-xs"
            style:border="1px solid var(--dial-border)"
            style:color="var(--accent)"
            onclick={() => setFit('cover')}
          >
            {t('useDefault')}
          </button>
        {/if}
      </div>
      <select
        class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
        style:border-color="var(--dial-border)"
        value={currentFit(settings.background)}
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
    </div>
    <div class="mb-1">
      <SettingsSliderField
        label={t('backgroundOpacity')}
        valueText={`${opacityPercentLocal}%`}
        showDefault={!isDefaultOpacity}
        onResetDefault={() =>
          setOpacityPercent(Math.round(DEFAULT_BACKGROUND_OPACITY * 100), true)
        }
        min={0}
        max={100}
        bind:value={opacityPercentLocal}
        onBeginDrag={beginSliderDrag}
        onInput={(v) => setOpacityPercent(v, false)}
        onCommit={flushOpacity}
      />
    </div>
  {/if}
</section>
