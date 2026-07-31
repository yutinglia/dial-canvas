<script lang="ts">
  import { t } from '../lib/i18n';

  interface Props {
    editMode: boolean;
    showEditHint?: boolean;
    onToggleEdit: () => void;
    onAddDial: () => void;
    onAddWidget: () => void;
    onOpenSettings: () => void;
    onOpenSearch: () => void;
  }

  let {
    editMode,
    showEditHint = false,
    onToggleEdit,
    onAddDial,
    onAddWidget,
    onOpenSettings,
    onOpenSearch,
  }: Props = $props();
</script>

<div
  class="group/chrome pointer-events-none absolute top-0 right-0 z-30"
  role="toolbar"
  aria-label="Page controls"
>
  <div
    class="pointer-events-auto absolute top-0 right-0 h-36 w-52"
    aria-hidden="true"
  ></div>

  {#if showEditHint && !editMode}
    <div
      class="pointer-events-none absolute top-14 right-3 max-w-[14rem] rounded-md px-2.5 py-1.5 text-xs leading-snug opacity-90"
      style:background="var(--toolbar-bg)"
      style:border="1px solid var(--dial-border)"
      style:color="var(--text-muted)"
    >
      {t('editHint')}
    </div>
  {/if}

  <div
    class="absolute top-0 right-0 flex w-max items-center gap-2 p-3 opacity-0 transition-opacity pointer-events-none group-hover/chrome:pointer-events-auto group-hover/chrome:opacity-100 group-focus-within/chrome:pointer-events-auto group-focus-within/chrome:opacity-100"
  >
    {#if editMode}
      <span
        class="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium"
        style:background="rgba(107, 143, 113, 0.2)"
        style:color="var(--accent)"
      >
        {t('editMode')}
      </span>
      <button
        type="button"
        class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors"
        style:background="var(--accent)"
        style:color="#0f1216"
        onclick={onAddDial}
      >
        + {t('addDial')}
      </button>
      <button
        type="button"
        class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors"
        style:background="var(--toolbar-bg)"
        style:border="1px solid var(--dial-border)"
        style:color="var(--dial-title)"
        onclick={onAddWidget}
      >
        + {t('addWidget')}
      </button>
    {/if}
    <button
      type="button"
      class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors"
      style:background="var(--toolbar-bg)"
      style:border="1px solid var(--dial-border)"
      onclick={onOpenSearch}
      title={t('searchPlaceholder')}
    >
      {t('search')}
    </button>
    <button
      type="button"
      class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors"
      style:background="var(--toolbar-bg)"
      style:border="1px solid var(--dial-border)"
      onclick={onOpenSettings}
    >
      {t('settings')}
    </button>
    <button
      type="button"
      class="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors"
      style:background={editMode ? 'var(--accent)' : 'var(--toolbar-bg)'}
      style:color={editMode ? '#0f1216' : 'var(--dial-title)'}
      style:border="1px solid var(--dial-border)"
      onclick={onToggleEdit}
    >
      {editMode ? t('done') : t('edit')}
    </button>
  </div>
</div>
