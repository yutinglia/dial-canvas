<script lang="ts">
  import type { Widget } from '../lib/schemas/widget';
  import { t } from '../lib/i18n';
  import { closeAndRetargetContextMenu } from '../lib/ui/retargetContextMenu';

  interface Props {
    widget: Widget | null;
    x: number;
    y: number;
    editMode: boolean;
    onClose: () => void;
    onEdit: (widget: Widget) => void;
    onDelete: (widget: Widget) => void;
  }

  let {
    widget,
    x,
    y,
    editMode,
    onClose,
    onEdit,
    onDelete,
  }: Props = $props();

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

{#if widget}
  <div
    class="fixed inset-0 z-[55]"
    role="presentation"
    onclick={onClose}
    onkeydown={onKeydown}
    oncontextmenu={(e) =>
      closeAndRetargetContextMenu(e, e.currentTarget as HTMLElement, onClose)}
  >
    <div
      class="absolute min-w-[10rem] overflow-hidden rounded-md py-1 shadow-lg"
      style:left="{x}px"
      style:top="{y}px"
      style:background="#22262e"
      style:border="1px solid var(--dial-border)"
      role="menu"
      tabindex="-1"
      aria-label="Widget actions"
      onclick={(e) => e.stopPropagation()}
      oncontextmenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onkeydown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
        role="menuitem"
        onclick={() => {
          onEdit(widget);
          onClose();
        }}
      >
        {editMode ? t('edit') : t('editWidget')}
      </button>
      {#if editMode}
        <button
          type="button"
          class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
          style:color="var(--danger)"
          role="menuitem"
          onclick={() => {
            onDelete(widget);
            onClose();
          }}
        >
          {t('deleteWidget')}
        </button>
      {/if}
    </div>
  </div>
{/if}
