<script lang="ts">
  import {
    DEFAULT_SETTINGS,
    type Settings,
  } from '../../lib/schemas/settings';
  import { t } from '../../lib/i18n';
  import SettingsSliderField from './SettingsSliderField.svelte';

  interface Props {
    settings: Settings;
    onChange: (
      partial: Partial<Settings>,
      opts?: { immediate?: boolean },
    ) => void;
  }

  let { settings, onChange }: Props = $props();

  let sliderDragging = $state(false);
  let gridSizeLocal = $state(DEFAULT_SETTINGS.gridSize);
  let snapThresholdLocal = $state(DEFAULT_SETTINGS.snapThreshold);
  let iconSizeLocal = $state(DEFAULT_SETTINGS.iconSize);
  let fontSizeLocal = $state(DEFAULT_SETTINGS.fontSize);

  $effect(() => {
    if (sliderDragging) return;
    gridSizeLocal = settings.gridSize;
    snapThresholdLocal = settings.snapThreshold;
    iconSizeLocal = settings.iconSize;
    fontSizeLocal = settings.fontSize;
  });

  function beginSliderDrag() {
    sliderDragging = true;
  }

  function endSliderDrag() {
    if (!sliderDragging) return;
    sliderDragging = false;
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
</script>

<section class="mb-6 border-t pt-5" style:border-color="var(--dial-border)">
  <h3
    class="mb-3 text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
  >
    {t('settingsSectionLayout')}
  </h3>

  <SettingsSliderField
    label={t('gridSize')}
    valueText={`${gridSizeLocal}px`}
    showDefault={settings.gridSize !== DEFAULT_SETTINGS.gridSize}
    onResetDefault={() => updateGridSize(DEFAULT_SETTINGS.gridSize, true)}
    min={4}
    max={64}
    bind:value={gridSizeLocal}
    onBeginDrag={beginSliderDrag}
    onInput={(v) => updateGridSize(v, false)}
    onCommit={flushGridSize}
  />

  <div class="mb-4 flex items-center justify-between gap-3 text-sm">
    <div class="flex min-w-0 flex-1 items-center justify-between gap-2">
      <span class="text-[var(--text-muted)]">{t('snapEnabled')}</span>
      {#if settings.snapEnabled !== DEFAULT_SETTINGS.snapEnabled}
        <button
          type="button"
          class="rounded px-2 py-0.5 text-xs"
          style:border="1px solid var(--dial-border)"
          style:color="var(--accent)"
          onclick={() =>
            onChange(
              { snapEnabled: DEFAULT_SETTINGS.snapEnabled },
              { immediate: true },
            )
          }
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
    <SettingsSliderField
      label={t('snapThreshold')}
      valueText={`${snapThresholdLocal}px`}
      showDefault={settings.snapThreshold !== DEFAULT_SETTINGS.snapThreshold}
      onResetDefault={() =>
        updateSnapThreshold(DEFAULT_SETTINGS.snapThreshold, true)
      }
      min={1}
      max={Math.max(2, gridSizeLocal)}
      bind:value={snapThresholdLocal}
      onBeginDrag={beginSliderDrag}
      onInput={(v) => updateSnapThreshold(v, false)}
      onCommit={flushSnapThreshold}
    />
  {/if}

  <SettingsSliderField
    label={t('iconSize')}
    valueText={`${iconSizeLocal}px`}
    showDefault={settings.iconSize !== DEFAULT_SETTINGS.iconSize}
    onResetDefault={() => updateIconSize(DEFAULT_SETTINGS.iconSize, true)}
    min={16}
    max={64}
    bind:value={iconSizeLocal}
    onBeginDrag={beginSliderDrag}
    onInput={(v) => updateIconSize(v, false)}
    onCommit={flushIconSize}
  />

  <div class="mb-1">
    <SettingsSliderField
      label={t('fontSize')}
      valueText={`${fontSizeLocal}px`}
      showDefault={settings.fontSize !== DEFAULT_SETTINGS.fontSize}
      onResetDefault={() => updateFontSize(DEFAULT_SETTINGS.fontSize, true)}
      min={10}
      max={24}
      bind:value={fontSizeLocal}
      onBeginDrag={beginSliderDrag}
      onInput={(v) => updateFontSize(v, false)}
      onCommit={flushFontSize}
    />
  </div>
</section>
