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
  let canvasMinWidthLocal = $state(DEFAULT_SETTINGS.canvasMinWidth);
  let canvasMinHeightLocal = $state(DEFAULT_SETTINGS.canvasMinHeight);
  let narrowBreakpointLocal = $state(DEFAULT_SETTINGS.narrowBreakpoint);

  $effect(() => {
    if (sliderDragging) return;
    canvasMinWidthLocal = settings.canvasMinWidth;
    canvasMinHeightLocal = settings.canvasMinHeight;
    narrowBreakpointLocal = settings.narrowBreakpoint;
  });

  function beginSliderDrag() {
    sliderDragging = true;
  }

  function endSliderDrag() {
    if (!sliderDragging) return;
    sliderDragging = false;
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

  function updateNarrowBreakpoint(
    narrowBreakpoint: number,
    immediate: boolean,
  ) {
    narrowBreakpointLocal = narrowBreakpoint;
    onChange({ narrowBreakpoint }, { immediate });
  }

  function flushNarrowBreakpoint() {
    endSliderDrag();
    updateNarrowBreakpoint(narrowBreakpointLocal, true);
  }
</script>

<section class="mb-6 border-t pt-5" style:border-color="var(--dial-border)">
  <h3
    class="mb-3 text-xs font-medium tracking-wide uppercase text-[var(--text-muted)]"
  >
    {t('settingsSectionCanvas')}
  </h3>

  <SettingsSliderField
    label={t('canvasMinWidth')}
    valueText={`${canvasMinWidthLocal}px`}
    showDefault={settings.canvasMinWidth !== DEFAULT_SETTINGS.canvasMinWidth}
    onResetDefault={() =>
      updateCanvasMinWidth(DEFAULT_SETTINGS.canvasMinWidth, true)
    }
    min={800}
    max={2400}
    step={50}
    bind:value={canvasMinWidthLocal}
    onBeginDrag={beginSliderDrag}
    onInput={(v) => updateCanvasMinWidth(v, false)}
    onCommit={flushCanvasMinWidth}
  />

  <div class="mb-1">
    <SettingsSliderField
      label={t('canvasMinHeight')}
      valueText={`${canvasMinHeightLocal}px`}
      showDefault={settings.canvasMinHeight !== DEFAULT_SETTINGS.canvasMinHeight}
      onResetDefault={() =>
        updateCanvasMinHeight(DEFAULT_SETTINGS.canvasMinHeight, true)
      }
      min={600}
      max={1800}
      step={50}
      bind:value={canvasMinHeightLocal}
      onBeginDrag={beginSliderDrag}
      onInput={(v) => updateCanvasMinHeight(v, false)}
      onCommit={flushCanvasMinHeight}
    />
  </div>

  <div class="mb-4 mt-4 flex items-center justify-between gap-3 text-sm">
    <div class="flex min-w-0 flex-1 items-center justify-between gap-2">
      <span class="text-[var(--text-muted)]">{t('narrowLayoutEnabled')}</span>
      {#if settings.narrowLayoutEnabled !== DEFAULT_SETTINGS.narrowLayoutEnabled}
        <button
          type="button"
          class="rounded px-2 py-0.5 text-xs"
          style:border="1px solid var(--dial-border)"
          style:color="var(--accent)"
          onclick={() =>
            onChange(
              { narrowLayoutEnabled: DEFAULT_SETTINGS.narrowLayoutEnabled },
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
      checked={settings.narrowLayoutEnabled}
      onchange={(e) =>
        onChange(
          {
            narrowLayoutEnabled: (e.currentTarget as HTMLInputElement).checked,
          },
          { immediate: true },
        )
      }
    />
  </div>

  {#if settings.narrowLayoutEnabled}
    <div class="mb-1">
      <SettingsSliderField
        label={t('narrowBreakpoint')}
        valueText={`${narrowBreakpointLocal}px`}
        showDefault={settings.narrowBreakpoint !==
          DEFAULT_SETTINGS.narrowBreakpoint}
        onResetDefault={() =>
          updateNarrowBreakpoint(DEFAULT_SETTINGS.narrowBreakpoint, true)
        }
        min={320}
        max={1600}
        step={20}
        bind:value={narrowBreakpointLocal}
        onBeginDrag={beginSliderDrag}
        onInput={(v) => updateNarrowBreakpoint(v, false)}
        onCommit={flushNarrowBreakpoint}
      />
    </div>
  {/if}
</section>
