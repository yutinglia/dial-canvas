<script lang="ts">
  import type { Background, Settings } from '../lib/schemas/settings';
  import {
    DEFAULT_BACKGROUND_OPACITY,
    DEFAULT_SETTINGS,
  } from '../lib/schemas/settings';
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

  let panelEl: HTMLDivElement | undefined = $state();
  let fileInput: HTMLInputElement | undefined = $state();
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

  let wasOpen = false;
  let sliderDragging = $state(false);

  let gridSizeLocal = $state(DEFAULT_SETTINGS.gridSize);
  let snapThresholdLocal = $state(DEFAULT_SETTINGS.snapThreshold);
  let iconSizeLocal = $state(DEFAULT_SETTINGS.iconSize);
  let fontSizeLocal = $state(DEFAULT_SETTINGS.fontSize);
  let canvasMinWidthLocal = $state(DEFAULT_SETTINGS.canvasMinWidth);
  let canvasMinHeightLocal = $state(DEFAULT_SETTINGS.canvasMinHeight);
  let opacityPercentLocal = $state(
    Math.round(DEFAULT_BACKGROUND_OPACITY * 100),
  );

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

  function syncLocalsFromSettings() {
    gridSizeLocal = settings.gridSize;
    snapThresholdLocal = settings.snapThreshold;
    iconSizeLocal = settings.iconSize;
    fontSizeLocal = settings.fontSize;
    canvasMinWidthLocal = settings.canvasMinWidth;
    canvasMinHeightLocal = settings.canvasMinHeight;
    opacityPercentLocal = Math.round(currentOpacity() * 100);
  }

  function deriveSource(bg: Background): WallpaperSource {
    if (bg.type === 'color') return 'color';
    if (bg.type === 'bing') return 'bing';
    if (bg.value.startsWith('data:')) return 'upload';
    return 'url';
  }

  function backgroundsEqual(a: Background, b: Background): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  const isDefaultBackground = $derived(
    backgroundsEqual(settings.background, DEFAULT_SETTINGS.background),
  );

  const isDefaultFit = $derived(currentFit() === 'cover');
  const isDefaultOpacity = $derived(
    Math.abs(currentOpacity() - DEFAULT_BACKGROUND_OPACITY) < 0.001,
  );

  $effect(() => {
    if (!open) {
      wasOpen = false;
      sliderDragging = false;
      return;
    }

    if (!sliderDragging) {
      syncLocalsFromSettings();
    }

    source = deriveSource(settings.background);
    wallpaperUrl =
      settings.background.type === 'image' &&
      !settings.background.value.startsWith('data:')
        ? settings.background.value
        : '';

    if (!wasOpen) {
      wasOpen = true;
      queueMicrotask(() => panelEl?.focus());
    }
  });

  // Load only after Bing is persisted (permission already handled by onSelectBing).
  // Using `source === 'bing'` alone races ahead of the permission prompt and a
  // failed early fetch can overwrite a later successful one.
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

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
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

  function setOpacityPercent(percent: number, immediate: boolean) {
    const bg = settings.background;
    if (bg.type !== 'image' && bg.type !== 'bing') return;
    const opacity = Math.min(100, Math.max(0, percent)) / 100;
    opacityPercentLocal = Math.round(opacity * 100);
    onChange(
      {
        background: { ...bg, opacity } satisfies Background,
      },
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
        // Drop any in-flight/failed list fetch from before permission was granted.
        // The effect reloads once settings.background.type is 'bing'.
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

  function updateGridSize(gridSize: number, immediate: boolean) {
    gridSizeLocal = gridSize;
    const snapThreshold = Math.max(1, Math.floor(gridSize / 2));
    snapThresholdLocal = snapThreshold;
    onChange({ gridSize, snapThreshold }, { immediate });
  }

  function flushGridSize() {
    endSliderDrag();
    updateGridSize(gridSizeLocal, true);
  }

  function updateSnapThreshold(snapThreshold: number, immediate: boolean) {
    snapThresholdLocal = snapThreshold;
    onChange({ snapThreshold }, { immediate });
  }

  function flushSnapThreshold() {
    endSliderDrag();
    updateSnapThreshold(snapThresholdLocal, true);
  }

  function updateIconSize(iconSize: number, immediate: boolean) {
    iconSizeLocal = iconSize;
    onChange({ iconSize }, { immediate });
  }

  function flushIconSize() {
    endSliderDrag();
    updateIconSize(iconSizeLocal, true);
  }

  function updateFontSize(fontSize: number, immediate: boolean) {
    fontSizeLocal = fontSize;
    onChange({ fontSize }, { immediate });
  }

  function flushFontSize() {
    endSliderDrag();
    updateFontSize(fontSizeLocal, true);
  }

  function updateCanvasMinWidth(canvasMinWidth: number, immediate: boolean) {
    canvasMinWidthLocal = canvasMinWidth;
    onChange({ canvasMinWidth }, { immediate });
  }

  function flushCanvasMinWidth() {
    endSliderDrag();
    updateCanvasMinWidth(canvasMinWidthLocal, true);
  }

  function updateCanvasMinHeight(canvasMinHeight: number, immediate: boolean) {
    canvasMinHeightLocal = canvasMinHeight;
    onChange({ canvasMinHeight }, { immediate });
  }

  function flushCanvasMinHeight() {
    endSliderDrag();
    updateCanvasMinHeight(canvasMinHeightLocal, true);
  }

  function resetLocale() {
    onChange({ locale: DEFAULT_SETTINGS.locale }, { immediate: true });
  }

  function resetGridSize() {
    updateGridSize(DEFAULT_SETTINGS.gridSize, true);
  }

  function resetSnapEnabled() {
    onChange({ snapEnabled: DEFAULT_SETTINGS.snapEnabled }, { immediate: true });
  }

  function resetSnapThreshold() {
    updateSnapThreshold(DEFAULT_SETTINGS.snapThreshold, true);
  }

  function resetIconSize() {
    updateIconSize(DEFAULT_SETTINGS.iconSize, true);
  }

  function resetFontSize() {
    updateFontSize(DEFAULT_SETTINGS.fontSize, true);
  }

  function resetCanvasMinWidth() {
    updateCanvasMinWidth(DEFAULT_SETTINGS.canvasMinWidth, true);
  }

  function resetCanvasMinHeight() {
    updateCanvasMinHeight(DEFAULT_SETTINGS.canvasMinHeight, true);
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

  function resetFit() {
    setFit('cover');
  }

  function resetOpacity() {
    setOpacityPercent(Math.round(DEFAULT_BACKGROUND_OPACITY * 100), true);
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
        <section class="mb-6">
          <h3
            class="mb-3 text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
          >
            {t('settingsSectionGeneral')}
          </h3>
          <div class="mb-1 block text-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-[var(--text-muted)]">{t('language')}</span>
              {#if settings.locale !== DEFAULT_SETTINGS.locale}
                <button
                  type="button"
                  class="rounded px-2 py-0.5 text-xs"
                  style:border="1px solid var(--dial-border)"
                  style:color="var(--accent)"
                  onclick={resetLocale}
                >
                  {t('useDefault')}
                </button>
              {/if}
            </div>
            <select
              class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
              style:border-color="var(--dial-border)"
              value={settings.locale}
              onchange={(e) =>
                onChange(
                  {
                    locale: (e.currentTarget as HTMLSelectElement)
                      .value as Settings['locale'],
                  },
                  { immediate: true },
                )
              }
            >
              <option value="system">{t('languageSystem')}</option>
              <option value="en">{t('languageEn')}</option>
              <option value="zh_TW">{t('languageZhTw')}</option>
            </select>
          </div>
        </section>

        <section class="mb-6 border-t pt-5" style:border-color="var(--dial-border)">
          <h3
            class="mb-3 text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
          >
            {t('settingsSectionLayout')}
          </h3>

          <div class="mb-4 block text-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-[var(--text-muted)]">
                {t('gridSize')}
                <span class="ml-1">{gridSizeLocal}px</span>
              </span>
              {#if settings.gridSize !== DEFAULT_SETTINGS.gridSize}
                <button
                  type="button"
                  class="rounded px-2 py-0.5 text-xs"
                  style:border="1px solid var(--dial-border)"
                  style:color="var(--accent)"
                  onclick={resetGridSize}
                >
                  {t('useDefault')}
                </button>
              {/if}
            </div>
            <input
              type="range"
              min="4"
              max="64"
              step="1"
              bind:value={gridSizeLocal}
              class="w-full"
              onpointerdown={beginSliderDrag}
              onpointerup={flushGridSize}
              onpointercancel={flushGridSize}
              onchange={flushGridSize}
              oninput={() => updateGridSize(Number(gridSizeLocal), false)}
            />
          </div>

          <div class="mb-4 flex items-center justify-between gap-3 text-sm">
            <div class="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span class="text-[var(--text-muted)]">{t('snapEnabled')}</span>
              {#if settings.snapEnabled !== DEFAULT_SETTINGS.snapEnabled}
                <button
                  type="button"
                  class="rounded px-2 py-0.5 text-xs"
                  style:border="1px solid var(--dial-border)"
                  style:color="var(--accent)"
                  onclick={resetSnapEnabled}
                >
                  {t('useDefault')}
                </button>
              {/if}
            </div>
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
          </div>

          {#if settings.snapEnabled}
            <div class="mb-4 block text-sm">
              <div class="mb-1 flex items-center justify-between gap-2">
                <span class="text-[var(--text-muted)]">
                  {t('snapThreshold')}
                  <span class="ml-1">{snapThresholdLocal}px</span>
                </span>
                {#if settings.snapThreshold !== DEFAULT_SETTINGS.snapThreshold}
                  <button
                    type="button"
                    class="rounded px-2 py-0.5 text-xs"
                    style:border="1px solid var(--dial-border)"
                    style:color="var(--accent)"
                    onclick={resetSnapThreshold}
                  >
                    {t('useDefault')}
                  </button>
                {/if}
              </div>
              <input
                type="range"
                min="1"
                max={Math.max(2, gridSizeLocal)}
                step="1"
                bind:value={snapThresholdLocal}
                class="w-full"
                onpointerdown={beginSliderDrag}
                onpointerup={flushSnapThreshold}
                onpointercancel={flushSnapThreshold}
                onchange={flushSnapThreshold}
                oninput={() =>
                  updateSnapThreshold(Number(snapThresholdLocal), false)
                }
              />
            </div>
          {/if}

          <div class="mb-4 block text-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-[var(--text-muted)]">
                {t('iconSize')}
                <span class="ml-1">{iconSizeLocal}px</span>
              </span>
              {#if settings.iconSize !== DEFAULT_SETTINGS.iconSize}
                <button
                  type="button"
                  class="rounded px-2 py-0.5 text-xs"
                  style:border="1px solid var(--dial-border)"
                  style:color="var(--accent)"
                  onclick={resetIconSize}
                >
                  {t('useDefault')}
                </button>
              {/if}
            </div>
            <input
              type="range"
              min="16"
              max="64"
              step="1"
              bind:value={iconSizeLocal}
              class="w-full"
              onpointerdown={beginSliderDrag}
              onpointerup={flushIconSize}
              onpointercancel={flushIconSize}
              onchange={flushIconSize}
              oninput={() => updateIconSize(Number(iconSizeLocal), false)}
            />
          </div>

          <div class="mb-1 block text-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-[var(--text-muted)]">
                {t('fontSize')}
                <span class="ml-1">{fontSizeLocal}px</span>
              </span>
              {#if settings.fontSize !== DEFAULT_SETTINGS.fontSize}
                <button
                  type="button"
                  class="rounded px-2 py-0.5 text-xs"
                  style:border="1px solid var(--dial-border)"
                  style:color="var(--accent)"
                  onclick={resetFontSize}
                >
                  {t('useDefault')}
                </button>
              {/if}
            </div>
            <input
              type="range"
              min="10"
              max="24"
              step="1"
              bind:value={fontSizeLocal}
              class="w-full"
              onpointerdown={beginSliderDrag}
              onpointerup={flushFontSize}
              onpointercancel={flushFontSize}
              onchange={flushFontSize}
              oninput={() => updateFontSize(Number(fontSizeLocal), false)}
            />
          </div>
        </section>

        <section class="mb-6 border-t pt-5" style:border-color="var(--dial-border)">
          <h3
            class="mb-3 text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
          >
            {t('settingsSectionCanvas')}
          </h3>

          <div class="mb-4 block text-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-[var(--text-muted)]">
                {t('canvasMinWidth')}
                <span class="ml-1">{canvasMinWidthLocal}px</span>
              </span>
              {#if settings.canvasMinWidth !== DEFAULT_SETTINGS.canvasMinWidth}
                <button
                  type="button"
                  class="rounded px-2 py-0.5 text-xs"
                  style:border="1px solid var(--dial-border)"
                  style:color="var(--accent)"
                  onclick={resetCanvasMinWidth}
                >
                  {t('useDefault')}
                </button>
              {/if}
            </div>
            <input
              type="range"
              min="800"
              max="2400"
              step="50"
              bind:value={canvasMinWidthLocal}
              class="w-full"
              onpointerdown={beginSliderDrag}
              onpointerup={flushCanvasMinWidth}
              onpointercancel={flushCanvasMinWidth}
              onchange={flushCanvasMinWidth}
              oninput={() =>
                updateCanvasMinWidth(Number(canvasMinWidthLocal), false)
              }
            />
          </div>

          <div class="mb-1 block text-sm">
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-[var(--text-muted)]">
                {t('canvasMinHeight')}
                <span class="ml-1">{canvasMinHeightLocal}px</span>
              </span>
              {#if settings.canvasMinHeight !== DEFAULT_SETTINGS.canvasMinHeight}
                <button
                  type="button"
                  class="rounded px-2 py-0.5 text-xs"
                  style:border="1px solid var(--dial-border)"
                  style:color="var(--accent)"
                  onclick={resetCanvasMinHeight}
                >
                  {t('useDefault')}
                </button>
              {/if}
            </div>
            <input
              type="range"
              min="600"
              max="1800"
              step="50"
              bind:value={canvasMinHeightLocal}
              class="w-full"
              onpointerdown={beginSliderDrag}
              onpointerup={flushCanvasMinHeight}
              onpointercancel={flushCanvasMinHeight}
              onchange={flushCanvasMinHeight}
              oninput={() =>
                updateCanvasMinHeight(Number(canvasMinHeightLocal), false)
              }
            />
          </div>
        </section>

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
                    const value = (
                      e.currentTarget as HTMLInputElement
                    ).value.trim();
                    if (value) setColorBackground(value);
                  }}
                />
              </div>
            </label>
          {:else if source === 'url'}
            <label class="mb-4 block text-sm">
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
            <div class="mb-4 text-sm">
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
                      title={item.title
                        ? `${item.date} — ${item.title}`
                        : item.date}
                      aria-pressed={isBingSelected(item)}
                      onclick={() => void pickBingWallpaper(item, index)}
                    >
                      <div
                        class="relative aspect-video overflow-hidden bg-black/30"
                      >
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
            <div class="mb-4 block text-sm">
              <div class="mb-1 flex items-center justify-between gap-2">
                <span class="text-[var(--text-muted)]">{t('backgroundFit')}</span>
                {#if !isDefaultFit}
                  <button
                    type="button"
                    class="rounded px-2 py-0.5 text-xs"
                    style:border="1px solid var(--dial-border)"
                    style:color="var(--accent)"
                    onclick={resetFit}
                  >
                    {t('useDefault')}
                  </button>
                {/if}
              </div>
              <select
                class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
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
            </div>
            <div class="mb-1 block text-sm">
              <div class="mb-1 flex items-center justify-between gap-2">
                <span class="text-[var(--text-muted)]">
                  {t('backgroundOpacity')}
                  <span class="ml-1">{opacityPercentLocal}%</span>
                </span>
                {#if !isDefaultOpacity}
                  <button
                    type="button"
                    class="rounded px-2 py-0.5 text-xs"
                    style:border="1px solid var(--dial-border)"
                    style:color="var(--accent)"
                    onclick={resetOpacity}
                  >
                    {t('useDefault')}
                  </button>
                {/if}
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                bind:value={opacityPercentLocal}
                class="w-full"
                onpointerdown={beginSliderDrag}
                onpointerup={flushOpacity}
                onpointercancel={flushOpacity}
                onchange={flushOpacity}
                oninput={() =>
                  setOpacityPercent(Number(opacityPercentLocal), false)
                }
              />
            </div>
          {/if}
        </section>

        <section class="border-t pt-5" style:border-color="var(--dial-border)">
          <h3
            class="mb-3 text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
          >
            {t('settingsSectionData')}
          </h3>
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
      </div>
    </div>
  </div>
{/if}
