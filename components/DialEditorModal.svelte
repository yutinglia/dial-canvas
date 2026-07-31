<script lang="ts">
  import type { Dial } from '../lib/schemas/dial';

  interface Props {
    open: boolean;
    dial: Dial | null;
    onClose: () => void;
    onSave: (values: { title: string; url: string; faviconUrl?: string }) => void;
    onDelete?: () => void;
  }

  let { open, dial, onClose, onSave, onDelete }: Props = $props();

  let title = $state('');
  let url = $state('');
  let faviconUrl = $state('');
  let error = $state('');

  $effect(() => {
    if (open) {
      title = dial?.title ?? '';
      url = dial?.url ?? 'https://';
      faviconUrl = dial?.faviconUrl ?? '';
      error = '';
    }
  });

  function submit(event: Event) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();
    if (!trimmedTitle) {
      error = 'Title is required.';
      return;
    }
    try {
      // Normalize / validate URL
      const parsed = new URL(trimmedUrl);
      onSave({
        title: trimmedTitle,
        url: parsed.toString(),
        faviconUrl: faviconUrl.trim() || undefined,
      });
    } catch {
      error = 'Enter a valid URL (including https://).';
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style:background="var(--overlay)"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={onKeydown}
  >
    <form
      class="w-full max-w-md rounded-xl p-5 shadow-lg"
      style:background="#22262e"
      style:border="1px solid var(--dial-border)"
      onsubmit={submit}
    >
      <h2 class="mb-4 text-lg font-medium">
        {dial ? 'Edit dial' : 'Add dial'}
      </h2>

      <label class="mb-3 block text-sm">
        <span class="mb-1 block text-[var(--text-muted)]">Title</span>
        <input
          class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
          style:border-color="var(--dial-border)"
          bind:value={title}
          autocomplete="off"
        />
      </label>

      <label class="mb-3 block text-sm">
        <span class="mb-1 block text-[var(--text-muted)]">URL</span>
        <input
          class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
          style:border-color="var(--dial-border)"
          bind:value={url}
          autocomplete="off"
          inputmode="url"
        />
      </label>

      <label class="mb-4 block text-sm">
        <span class="mb-1 block text-[var(--text-muted)]"
          >Favicon URL (optional)</span
        >
        <input
          class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
          style:border-color="var(--dial-border)"
          bind:value={faviconUrl}
          autocomplete="off"
          placeholder="Auto from site if empty"
        />
      </label>

      {#if error}
        <p class="mb-3 text-sm" style:color="var(--danger)">{error}</p>
      {/if}

      <div class="flex items-center justify-between gap-3">
        <div>
          {#if dial && onDelete}
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm"
              style:color="var(--danger)"
              onclick={onDelete}
            >
              Delete
            </button>
          {/if}
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm"
            style:border="1px solid var(--dial-border)"
            onclick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-md px-3 py-1.5 text-sm"
            style:background="var(--accent)"
            style:color="#0f1216"
          >
            Save
          </button>
        </div>
      </div>
    </form>
  </div>
{/if}
