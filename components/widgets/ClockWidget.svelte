<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getIntlLocale } from '../../lib/i18n';
  import { formatClockDate, formatClockTime } from '../../lib/widgets/clock';
  import type { ClockWidget } from '../../lib/schemas/widget';

  interface Props {
    widget: ClockWidget;
  }

  let { widget }: Props = $props();

  let now = $state(new Date());
  let timer: ReturnType<typeof setInterval> | undefined;

  function tick() {
    now = new Date();
  }

  $effect(() => {
    void widget.showSeconds;
    if (timer) clearInterval(timer);
    tick();
    const ms = widget.showSeconds ? 250 : 1000;
    timer = setInterval(tick, ms);
    return () => {
      if (timer) clearInterval(timer);
    };
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });

  const timeText = $derived(
    formatClockTime(now, {
      format: widget.format,
      showSeconds: widget.showSeconds,
    }),
  );
  const dateText = $derived(formatClockDate(now, getIntlLocale()));
  const timeFontSize = $derived(
    widget.fontSize !== undefined
      ? `${widget.fontSize}px`
      : 'clamp(1.25rem, 22%, 2.75rem)',
  );
  const dateFontSize = $derived(
    widget.fontSize !== undefined
      ? `${Math.max(11, Math.round(widget.fontSize * 0.42))}px`
      : undefined,
  );
</script>

<div
  class="flex h-full min-h-0 w-full flex-col items-center justify-center gap-1 px-3 py-2 text-center"
>
  <div
    class="font-semibold tracking-tight text-[var(--dial-title)] tabular-nums"
    style:font-size={timeFontSize}
  >
    {timeText}
  </div>
  {#if widget.showDate}
    <div
      class="text-[var(--text-muted)]"
      class:text-sm={dateFontSize === undefined}
      style:font-size={dateFontSize}
    >
      {dateText}
    </div>
  {/if}
</div>
