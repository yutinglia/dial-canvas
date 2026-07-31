<script lang="ts">
  import type { CalendarWidget as CalendarWidgetModel } from '../../lib/schemas/widget';
  import {
    buildCalendarMonth,
    shiftCalendarMonth,
  } from '../../lib/widgets/calendar';
  import { t } from '../../lib/i18n';

  interface Props {
    widget: CalendarWidgetModel;
  }

  let { widget }: Props = $props();

  const now = new Date();
  let year = $state(now.getFullYear());
  let month = $state(now.getMonth());

  const calendar = $derived(
    buildCalendarMonth(year, month, widget.weekStartsOn),
  );

  function go(delta: number) {
    const next = shiftCalendarMonth(year, month, delta);
    year = next.year;
    month = next.month;
  }

  function goToday() {
    const today = new Date();
    year = today.getFullYear();
    month = today.getMonth();
  }
</script>

<div
  class="flex h-full min-h-0 w-full flex-col gap-1.5 px-2.5 py-2"
  onpointerdown={(e) => e.stopPropagation()}
  role="presentation"
>
  <div class="flex items-center gap-1">
    <button
      type="button"
      class="rounded px-1.5 py-0.5 text-sm text-[var(--dial-title)]"
      style:border="1px solid var(--dial-border)"
      title={t('calendarPrev')}
      onclick={() => go(-1)}
    >
      ‹
    </button>
    <button
      type="button"
      class="min-w-0 flex-1 truncate text-center text-sm font-medium text-[var(--dial-title)]"
      title={t('calendarToday')}
      onclick={goToday}
    >
      {calendar.title}
    </button>
    <button
      type="button"
      class="rounded px-1.5 py-0.5 text-sm text-[var(--dial-title)]"
      style:border="1px solid var(--dial-border)"
      title={t('calendarNext')}
      onclick={() => go(1)}
    >
      ›
    </button>
  </div>

  <div class="grid grid-cols-7 gap-0.5 text-center text-[10px] text-[var(--text-muted)]">
    {#each calendar.weekdayLabels as label (label)}
      <div class="py-0.5 font-medium">{label}</div>
    {/each}
  </div>

  <div class="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-0.5">
    {#each calendar.days as day, index (index)}
      <div
        class="flex items-center justify-center rounded text-xs tabular-nums"
        class:text-[var(--dial-title)]={day.inMonth}
        class:text-[var(--text-muted)]={!day.inMonth}
        class:opacity-45={!day.inMonth}
        style:background={day.isToday ? 'var(--accent)' : undefined}
        style:color={day.isToday ? '#0f1216' : undefined}
        style:font-weight={day.isToday ? '600' : undefined}
      >
        {day.day}
      </div>
    {/each}
  </div>
</div>
