<script lang="ts">
  import { t } from '../lib/i18n';
  import { closeAndRetargetContextMenu } from '../lib/ui/retargetContextMenu';

  interface Props {
    open: boolean;
    x: number;
    y: number;
    editMode: boolean;
    onClose: () => void;
    onToggleEdit: () => void;
    onAddDial: () => void;
    onAddWidget: () => void;
    onOpenSearch: () => void;
    onOpenSettings: () => void;
  }

  let {
    open,
    x,
    y,
    editMode,
    onClose,
    onToggleEdit,
    onAddDial,
    onAddWidget,
    onOpenSearch,
    onOpenSettings,
  }: Props = $props();

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

{#if open}
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
      aria-label="Canvas actions"
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
          onToggleEdit();
          onClose();
        }}
      >
        {editMode ? t('done') : t('edit')}
      </button>
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
        role="menuitem"
        onclick={() => {
          onAddDial();
          onClose();
        }}
      >
        {t('addDial')}
      </button>
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
        role="menuitem"
        onclick={() => {
          onAddWidget();
          onClose();
        }}
      >
        {t('addWidget')}
      </button>
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
        role="menuitem"
        onclick={() => {
          onOpenSearch();
          onClose();
        }}
      >
        {t('search')}
      </button>
      <button
        type="button"
        class="block w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
        role="menuitem"
        onclick={() => {
          onOpenSettings();
          onClose();
        }}
      >
        {t('settings')}
      </button>
    </div>
  </div>
{/if}
