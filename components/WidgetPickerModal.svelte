<script lang="ts">
  import { t } from '../lib/i18n';
  import type { WidgetType } from '../lib/schemas/widget';

  interface Props {
    open: boolean;
    onClose: () => void;
    onPick: (type: WidgetType) => void;
  }

  let { open, onClose, onPick }: Props = $props();

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 p-4"
    role="presentation"
    onclick={onClose}
    onkeydown={onKeydown}
  >
    <div
      class="w-full max-w-sm rounded-lg p-4 shadow-xl"
      style:background="#1e2229"
      style:border="1px solid var(--dial-border)"
      role="dialog"
      aria-modal="true"
      aria-label={t('addWidget')}
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2 class="text-base font-medium text-[var(--dial-title)]">
          {t('addWidget')}
        </h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-sm text-[var(--text-muted)]"
          onclick={onClose}
        >
          {t('close')}
        </button>
      </div>
      <p class="mb-3 text-sm text-[var(--text-muted)]">{t('pickWidget')}</p>
      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="rounded-md px-3 py-3 text-left transition-colors hover:bg-white/5"
          style:border="1px solid var(--dial-border)"
          onclick={() => onPick('clock')}
        >
          <div class="text-sm font-medium text-[var(--dial-title)]">
            {t('widgetClock')}
          </div>
          <div class="text-xs text-[var(--text-muted)]">
            {t('widgetClockHint')}
          </div>
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-3 text-left transition-colors hover:bg-white/5"
          style:border="1px solid var(--dial-border)"
          onclick={() => onPick('weather')}
        >
          <div class="text-sm font-medium text-[var(--dial-title)]">
            {t('widgetWeather')}
          </div>
          <div class="text-xs text-[var(--text-muted)]">
            {t('widgetWeatherHint')}
          </div>
        </button>
      </div>
    </div>
  </div>
{/if}
