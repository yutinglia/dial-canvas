<script lang="ts">
  interface Props {
    editMode: boolean;
    onToggleEdit: () => void;
    onAddDial: () => void;
    onOpenSettings: () => void;
  }

  let { editMode, onToggleEdit, onAddDial, onOpenSettings }: Props = $props();
</script>

<header
  class="pointer-events-auto absolute top-0 right-0 left-0 z-30 flex items-center justify-between gap-3 px-4 py-3"
>
  <div class="flex items-center gap-2">
    {#if editMode}
      <span
        class="rounded px-2 py-0.5 text-xs font-medium"
        style:background="rgba(107, 143, 113, 0.2)"
        style:color="var(--accent)"
      >
        Edit mode
      </span>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    {#if editMode}
      <button
        type="button"
        class="rounded-md px-3 py-1.5 text-sm transition-colors"
        style:background="var(--accent)"
        style:color="#0f1216"
        onclick={onAddDial}
      >
        + Add dial
      </button>
    {/if}
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-sm transition-colors"
      style:background="var(--toolbar-bg)"
      style:border="1px solid var(--dial-border)"
      onclick={onOpenSettings}
    >
      Settings
    </button>
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-sm transition-colors"
      style:background={editMode ? 'var(--accent)' : 'var(--toolbar-bg)'}
      style:color={editMode ? '#0f1216' : 'var(--dial-title)'}
      style:border="1px solid var(--dial-border)"
      onclick={onToggleEdit}
    >
      {editMode ? 'Done' : 'Edit'}
    </button>
  </div>
</header>
