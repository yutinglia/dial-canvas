<script lang="ts">
  import type { Dial } from '../lib/schemas/dial';
  import { titleFromHostname } from '../lib/dials/pageTitle';

  interface Props {
    open: boolean;
    dial: Dial | null;
    globalIconSize: number;
    globalFontSize: number;
    onClose: () => void;
    onSave: (values: {
      title: string;
      url: string;
      faviconUrl?: string;
      iconSize?: number;
      fontSize?: number;
    }) => void;
    onDelete?: () => void;
  }

  let {
    open,
    dial,
    globalIconSize,
    globalFontSize,
    onClose,
    onSave,
    onDelete,
  }: Props = $props();

  let title = $state('');
  let url = $state('');
  let faviconUrl = $state('');
  let iconSizeOverride = $state<number | null>(null);
  let fontSizeOverride = $state<number | null>(null);
  let error = $state('');
  let titleStatus = $state('');
  let fetchingTitle = $state(false);
  let fetchSeq = 0;

  const effectiveIconSize = $derived(iconSizeOverride ?? globalIconSize);
  const effectiveFontSize = $derived(fontSizeOverride ?? globalFontSize);

  $effect(() => {
    if (open) {
      title = dial?.title ?? '';
      url = dial?.url ?? 'https://';
      faviconUrl = dial?.faviconUrl ?? '';
      iconSizeOverride = dial?.iconSize ?? null;
      fontSizeOverride = dial?.fontSize ?? null;
      error = '';
      titleStatus = '';
      fetchingTitle = false;
      fetchSeq += 1;
    }
  });

  type FetchResult = {
    ok: boolean;
    title?: string;
    error?: string;
    source?: 'html' | 'hostname';
  };

  async function requestPageTitle(targetUrl: string): Promise<FetchResult> {
    try {
      const result = (await browser.runtime.sendMessage({
        type: 'fetch-page-title',
        url: targetUrl,
      })) as FetchResult | undefined;
      if (!result || typeof result !== 'object') {
        return {
          ok: false,
          error: 'No response from background.',
          title: titleFromHostname(targetUrl),
          source: 'hostname',
        };
      }
      return result;
    } catch {
      return {
        ok: false,
        error: 'Failed to reach background.',
        title: titleFromHostname(targetUrl),
        source: 'hostname',
      };
    }
  }

  async function fetchTitle(opts: { overwrite: boolean }) {
    const trimmedUrl = url.trim();
    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
    } catch {
      titleStatus = 'Enter a valid URL first.';
      return;
    }

    if (!opts.overwrite && title.trim()) return;

    const seq = ++fetchSeq;
    fetchingTitle = true;
    titleStatus = 'Fetching title…';

    const result = await requestPageTitle(parsed.toString());
    if (seq !== fetchSeq) return;

    fetchingTitle = false;
    const nextTitle = (result.title ?? titleFromHostname(parsed.toString())).trim();

    if (opts.overwrite || !title.trim()) {
      if (nextTitle) title = nextTitle;
    }

    if (result.ok && result.source === 'html') {
      titleStatus = '';
    } else if (nextTitle) {
      titleStatus = result.error
        ? `${result.error} Using hostname.`
        : 'Using hostname.';
    } else {
      titleStatus = result.error ?? 'Could not fetch title.';
    }
  }

  function onUrlBlur() {
    void fetchTitle({ overwrite: false });
  }

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
        iconSize: iconSizeOverride ?? undefined,
        fontSize: fontSizeOverride ?? undefined,
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
        <span class="mb-1 block text-[var(--text-muted)]">URL</span>
        <input
          class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
          style:border-color="var(--dial-border)"
          bind:value={url}
          autocomplete="off"
          inputmode="url"
          onblur={onUrlBlur}
        />
      </label>

      <div class="mb-3 block text-sm">
        <div class="mb-1 flex items-center justify-between gap-2">
          <label for="dial-title" class="text-[var(--text-muted)]">Title</label>
          <button
            type="button"
            class="rounded px-2 py-0.5 text-xs transition-opacity"
            style:border="1px solid var(--dial-border)"
            style:color="var(--accent)"
            disabled={fetchingTitle}
            onclick={() => void fetchTitle({ overwrite: true })}
          >
            {fetchingTitle ? 'Fetching…' : 'Fetch title'}
          </button>
        </div>
        <input
          id="dial-title"
          class="w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
          style:border-color="var(--dial-border)"
          bind:value={title}
          autocomplete="off"
        />
        {#if titleStatus}
          <p class="mt-1 text-xs text-[var(--text-muted)]">{titleStatus}</p>
        {/if}
      </div>

      <label class="mb-3 block text-sm">
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

      <div class="mb-3 block text-sm">
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="text-[var(--text-muted)]">
            Icon size
            <span class="ml-1 text-[var(--text-muted)]">
              {effectiveIconSize}px{iconSizeOverride == null
                ? ' (global)'
                : ''}
            </span>
          </span>
          {#if iconSizeOverride != null}
            <button
              type="button"
              class="rounded px-2 py-0.5 text-xs"
              style:border="1px solid var(--dial-border)"
              style:color="var(--accent)"
              onclick={() => (iconSizeOverride = null)}
            >
              Use global
            </button>
          {/if}
        </div>
        <input
          type="range"
          min="16"
          max="64"
          step="1"
          value={effectiveIconSize}
          class="w-full"
          oninput={(e) => {
            iconSizeOverride = Number(
              (e.currentTarget as HTMLInputElement).value,
            );
          }}
        />
      </div>

      <div class="mb-4 block text-sm">
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="text-[var(--text-muted)]">
            Font size
            <span class="ml-1 text-[var(--text-muted)]">
              {effectiveFontSize}px{fontSizeOverride == null
                ? ' (global)'
                : ''}
            </span>
          </span>
          {#if fontSizeOverride != null}
            <button
              type="button"
              class="rounded px-2 py-0.5 text-xs"
              style:border="1px solid var(--dial-border)"
              style:color="var(--accent)"
              onclick={() => (fontSizeOverride = null)}
            >
              Use global
            </button>
          {/if}
        </div>
        <input
          type="range"
          min="10"
          max="24"
          step="1"
          value={effectiveFontSize}
          class="w-full"
          oninput={(e) => {
            fontSizeOverride = Number(
              (e.currentTarget as HTMLInputElement).value,
            );
          }}
        />
      </div>

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
