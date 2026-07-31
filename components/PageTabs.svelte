<script lang="ts">
  import type { Page } from '../lib/schemas/store';
  import { t } from '../lib/i18n';

  interface Props {
    pages: Page[];
    activePageId: string;
    editMode: boolean;
    onSelect: (pageId: string) => void;
    onAdd: () => void;
    onRename: (pageId: string) => void;
    onDelete: (pageId: string) => void;
  }

  let {
    pages,
    activePageId,
    editMode,
    onSelect,
    onAdd,
    onRename,
    onDelete,
  }: Props = $props();
</script>

<div
  class="pointer-events-none absolute bottom-0 left-0 right-0 z-30 flex justify-center p-3"
>
  <div
    class="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-lg px-2 py-1.5"
    style:background="var(--toolbar-bg)"
    style:border="1px solid var(--dial-border)"
    role="tablist"
    aria-label={t('pages')}
  >
    {#each pages as page (page.id)}
      <button
        type="button"
        class="shrink-0 rounded-md px-3 py-1 text-sm transition-colors"
        style:background={page.id === activePageId
          ? 'rgba(107, 143, 113, 0.25)'
          : 'transparent'}
        style:color={page.id === activePageId
          ? 'var(--accent)'
          : 'var(--dial-title)'}
        role="tab"
        aria-selected={page.id === activePageId}
        onclick={() => onSelect(page.id)}
        ondblclick={() => {
          if (editMode) onRename(page.id);
        }}
      >
        {page.name}
      </button>
    {/each}

    {#if editMode}
      <button
        type="button"
        class="shrink-0 rounded-md px-2 py-1 text-sm"
        style:color="var(--accent)"
        title={t('addPage')}
        onclick={onAdd}
      >
        +
      </button>
      {#if pages.length > 1}
        <button
          type="button"
          class="shrink-0 rounded-md px-2 py-1 text-xs"
          style:color="var(--danger)"
          title={t('deletePage')}
          onclick={() => onDelete(activePageId)}
        >
          ×
        </button>
      {/if}
    {/if}
  </div>
</div>
