<script lang="ts">
  import { t } from '../lib/i18n';
  import type { WidgetType } from '../lib/schemas/widget';

  interface Props {
    open: boolean;
    onClose: () => void;
    onPick: (type: WidgetType) => void;
  }

  let { open, onClose, onPick }: Props = $props();

  const options: { type: WidgetType; titleKey: string; hintKey: string }[] = [
    { type: 'clock', titleKey: 'widgetClock', hintKey: 'widgetClockHint' },
    { type: 'weather', titleKey: 'widgetWeather', hintKey: 'widgetWeatherHint' },
    { type: 'note', titleKey: 'widgetNote', hintKey: 'widgetNoteHint' },
    { type: 'todo', titleKey: 'widgetTodo', hintKey: 'widgetTodoHint' },
    {
      type: 'calendar',
      titleKey: 'widgetCalendar',
      hintKey: 'widgetCalendarHint',
    },
    {
      type: 'holidays',
      titleKey: 'widgetHolidays',
      hintKey: 'widgetHolidaysHint',
    },
    {
      type: 'wallpaperInfo',
      titleKey: 'widgetWallpaperInfo',
      hintKey: 'widgetWallpaperInfoHint',
    },
  ];

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
      class="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg p-4 shadow-xl"
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
        {#each options as option (option.type)}
          <button
            type="button"
            class="rounded-md px-3 py-3 text-left transition-colors hover:bg-white/5"
            style:border="1px solid var(--dial-border)"
            onclick={() => onPick(option.type)}
          >
            <div class="text-sm font-medium text-[var(--dial-title)]">
              {t(option.titleKey)}
            </div>
            <div class="text-xs text-[var(--text-muted)]">
              {t(option.hintKey)}
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}
