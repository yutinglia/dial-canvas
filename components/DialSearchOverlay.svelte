<script lang="ts">
  import { t } from '../lib/i18n';

  interface Props {
    open: boolean;
    query: string;
    onQueryChange: (value: string) => void;
    onClose: () => void;
  }

  let { open, query, onQueryChange, onClose }: Props = $props();
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (open) {
      queueMicrotask(() => inputEl?.focus());
    }
  });

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  }
</script>

{#if open}
  <div
    class="pointer-events-none absolute top-16 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4"
  >
    <div
      class="pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 shadow-lg"
      style:background="var(--toolbar-bg)"
      style:border="1px solid var(--dial-border)"
    >
      <input
        bind:this={inputEl}
        class="min-w-0 flex-1 bg-transparent text-sm outline-none"
        style:color="var(--dial-title)"
        placeholder={t('searchPlaceholder')}
        value={query}
        oninput={(e) => onQueryChange((e.currentTarget as HTMLInputElement).value)}
        onkeydown={onKeydown}
      />
      <button
        type="button"
        class="shrink-0 rounded px-2 py-0.5 text-xs"
        style:color="var(--text-muted)"
        onclick={onClose}
      >
        {t('close')}
      </button>
    </div>
  </div>
{/if}
