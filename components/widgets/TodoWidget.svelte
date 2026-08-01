<script lang="ts">
  import type { TodoWidget as TodoWidgetModel } from '../../lib/schemas/widget';
  import {
    addTodoItem,
    clearCompletedTodoItems,
    removeTodoItem,
    toggleTodoItem,
  } from '../../lib/widgets/todo';
  import { clampWidgetTitle } from '../../lib/widgets/normalizeWidget';
  import { t } from '../../lib/i18n';

  interface Props {
    widget: TodoWidgetModel;
    onPatch?: (widget: TodoWidgetModel) => void;
  }

  let { widget, onPatch }: Props = $props();

  let draft = $state('');

  function patchItems(
    items: TodoWidgetModel['items'],
    title = widget.title,
  ) {
    onPatch?.({ ...widget, title: clampWidgetTitle(title), items });
  }

  function onAdd() {
    const next = addTodoItem(widget.items, draft);
    if (next === widget.items) return;
    draft = '';
    patchItems(next);
  }

  const titleFontSize = $derived(
    widget.fontSize !== undefined
      ? `${Math.max(12, Math.round(widget.fontSize * 0.5))}px`
      : undefined,
  );
</script>

<div class="flex h-full min-h-0 w-full flex-col gap-1.5 px-2.5 py-2">
  <input
    class="w-full bg-transparent text-sm font-medium text-[var(--dial-title)] outline-none placeholder:text-[var(--text-muted)]"
    style:font-size={titleFontSize}
    placeholder={t('todoTitlePlaceholder')}
    value={widget.title}
    maxlength={120}
    oninput={(e) => patchItems(widget.items, e.currentTarget.value)}
  />

  <ul class="min-h-0 flex-1 space-y-1 overflow-y-auto">
    {#each widget.items as item (item.id)}
      <li class="flex items-start gap-1.5">
        <input
          type="checkbox"
          class="mt-0.5 shrink-0"
          checked={item.done}
          onchange={() => patchItems(toggleTodoItem(widget.items, item.id))}
        />
        <span
          class="min-w-0 flex-1 text-sm text-[var(--dial-title)]"
          class:line-through={item.done}
          class:text-[var(--text-muted)]={item.done}
        >
          {item.text}
        </span>
        <button
          type="button"
          class="shrink-0 rounded px-1 text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
          title={t('todoRemoveItem')}
          onclick={() => patchItems(removeTodoItem(widget.items, item.id))}
        >
          ×
        </button>
      </li>
    {/each}
  </ul>

  <div class="flex gap-1">
    <input
      class="min-w-0 flex-1 rounded-md px-2 py-1 text-sm text-[var(--dial-title)] outline-none"
      style:background="#14161c80"
      style:border="1px solid var(--dial-border)"
      placeholder={t('todoAddPlaceholder')}
      bind:value={draft}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onAdd();
        }
      }}
    />
    <button
      type="button"
      class="shrink-0 rounded-md px-2 py-1 text-xs"
      style:background="var(--toolbar-bg)"
      style:border="1px solid var(--dial-border)"
      style:color="var(--dial-title)"
      disabled={!draft.trim()}
      onclick={onAdd}
    >
      {t('todoAdd')}
    </button>
  </div>

  {#if widget.items.some((item) => item.done)}
    <button
      type="button"
      class="self-start text-xs text-[var(--text-muted)] hover:text-[var(--dial-title)]"
      onclick={() => patchItems(clearCompletedTodoItems(widget.items))}
    >
      {t('todoClearCompleted')}
    </button>
  {/if}
</div>
