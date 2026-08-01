<script lang="ts">
  import type { HolidaysWidget as HolidaysWidgetModel } from '../../lib/schemas/widget';
  import {
    fetchNextPublicHolidays,
    formatHolidayDate,
    type PublicHoliday,
  } from '../../lib/widgets/holidays';
  import { t } from '../../lib/i18n';

  interface Props {
    widget: HolidaysWidgetModel;
    onSetCountry?: () => void;
  }

  let { widget, onSetCountry }: Props = $props();

  let holidays = $state<PublicHoliday[]>([]);
  let loading = $state(false);
  let error = $state('');
  let fetchSeq = 0;

  async function loadHolidays() {
    const code = widget.countryCode;
    if (!code) {
      holidays = [];
      error = '';
      loading = false;
      return;
    }
    const seq = ++fetchSeq;
    loading = true;
    error = '';
    const result = await fetchNextPublicHolidays(code, widget.limit);
    if (seq !== fetchSeq) return;
    loading = false;
    if (result.ok) {
      holidays = result.holidays;
      error = '';
    } else {
      holidays = [];
      error = result.error;
    }
  }

  $effect(() => {
    void widget.id;
    void widget.countryCode;
    void widget.limit;
    void loadHolidays();
  });
</script>

<div class="flex h-full min-h-0 w-full flex-col gap-1.5 px-2.5 py-2">
  <div class="text-sm font-medium text-[var(--dial-title)]">
    {t('widgetHolidays')}
    {#if widget.countryCode}
      <span class="text-[var(--text-muted)]">· {widget.countryCode}</span>
    {/if}
  </div>

  {#if !widget.countryCode}
    <p class="text-sm text-[var(--text-muted)]">{t('holidaysNoCountry')}</p>
    {#if onSetCountry}
      <button
        type="button"
        class="mt-1 self-start rounded-md px-2.5 py-1 text-xs"
        style:background="var(--accent)"
        style:color="#0f1216"
        onclick={(e) => {
          e.stopPropagation();
          onSetCountry();
        }}
      >
        {t('holidaysSetCountry')}
      </button>
    {/if}
  {:else if loading && holidays.length === 0}
    <p class="text-sm text-[var(--text-muted)]">{t('holidaysLoading')}</p>
  {:else if error && holidays.length === 0}
    <p class="text-sm text-[var(--danger)]">{t('holidaysFailed')}</p>
  {:else if holidays.length === 0}
    <p class="text-sm text-[var(--text-muted)]">{t('holidaysEmpty')}</p>
  {:else}
    <ul class="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
      {#each holidays as holiday (holiday.date + holiday.name)}
        <li class="leading-snug">
          <div class="text-xs text-[var(--text-muted)]">
            {formatHolidayDate(holiday.date)}
          </div>
          <div class="text-sm text-[var(--dial-title)]">
            {holiday.localName}
          </div>
          {#if holiday.localName !== holiday.name}
            <div class="text-xs text-[var(--text-muted)]">{holiday.name}</div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
