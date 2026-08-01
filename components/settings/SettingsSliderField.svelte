<script lang="ts">
  import { t } from '../../lib/i18n';

  interface Props {
    label: string;
    valueText: string;
    showDefault: boolean;
    onResetDefault: () => void;
    min: number;
    max: number;
    step?: number;
    value: number;
    onBeginDrag: () => void;
    onInput: (value: number) => void;
    onCommit: () => void;
    containerClass?: string;
  }

  let {
    label,
    valueText,
    showDefault,
    onResetDefault,
    min,
    max,
    step = 1,
    value = $bindable(),
    onBeginDrag,
    onInput,
    onCommit,
    containerClass = 'mb-4 block text-sm',
  }: Props = $props();
</script>

<div class={containerClass}>
  <div class="mb-1 flex items-center justify-between gap-2">
    <span class="text-[var(--text-muted)]">
      {label}
      <span class="ml-1">{valueText}</span>
    </span>
    {#if showDefault}
      <button
        type="button"
        class="rounded px-2 py-0.5 text-xs"
        style:border="1px solid var(--dial-border)"
        style:color="var(--accent)"
        onclick={onResetDefault}
      >
        {t('useDefault')}
      </button>
    {/if}
  </div>
  <input
    type="range"
    {min}
    {max}
    {step}
    {value}
    class="w-full"
    onpointerdown={onBeginDrag}
    onpointerup={onCommit}
    onpointercancel={onCommit}
    onchange={onCommit}
    oninput={(e) =>
      onInput(Number((e.currentTarget as HTMLInputElement).value))}
  />
</div>
