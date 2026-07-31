<script lang="ts">
  import type { Dial } from '../lib/schemas/dial';
  import { t } from '../lib/i18n';

  interface Props {
    dial: Dial | null;
    x: number;
    y: number;
    editMode: boolean;
    onClose: () => void;
    onEdit: (dial: Dial) => void;
    onDelete: (dial: Dial) => void;
    onOpen: (dial: Dial) => void;
    onCopyUrl: (dial: Dial) => void;
  }

  let {
    dial,
    x,
    y,
    editMode,
    onClose,
    onEdit,
    onDelete,
    onOpen,
    onCopyUrl,
  }: Props = $props();

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

{#if dial}
  <div
    class="fixed inset-0 z-[55]"
    role="presentation"
    onclick={onClose}
    onkeydown={onKeydown}
  >
    <div
      class="absolute min-w-[10rem] overflow-hidden rounded-md py-1 shadow-lg"
      style:left="{x}px"
      style:top="{y}px"
      style:background="#22262e"
      style:border="1px solid var(--dial-border)"
      role="menu"
      tabindex="-1"
      aria-label="Dial actions"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
        role="menuitem"
        onclick={() => {
          onOpen(dial);
          onClose();
        }}
      >
        {t('openDial')}
      </button>
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
        role="menuitem"
        onclick={() => {
          onCopyUrl(dial);
          onClose();
        }}
      >
        {t('copyUrl')}
      </button>
      {#if editMode}
        <button
          type="button"
          class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
          role="menuitem"
          onclick={() => {
            onEdit(dial);
            onClose();
          }}
        >
          {t('edit')}
        </button>
        <button
          type="button"
          class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
          style:color="var(--danger)"
          role="menuitem"
          onclick={() => {
            onDelete(dial);
            onClose();
          }}
        >
          {t('deleteDial')}
        </button>
      {/if}
    </div>
  </div>
{/if}
