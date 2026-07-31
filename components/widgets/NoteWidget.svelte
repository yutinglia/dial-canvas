<script lang="ts">
  import type { NoteWidget as NoteWidgetModel } from '../../lib/schemas/widget';
  import { t } from '../../lib/i18n';

  interface Props {
    widget: NoteWidgetModel;
    editMode?: boolean;
    onPatch?: (widget: NoteWidgetModel) => void;
  }

  let { widget, editMode = false, onPatch }: Props = $props();

  let title = $state('');
  let text = $state('');
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    title = widget.title;
    text = widget.text;
  });

  function schedulePatch(nextTitle: string, nextText: string) {
    if (!onPatch) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onPatch({
        ...widget,
        title: nextTitle,
        text: nextText,
      });
    }, 300);
  }

  function onTitleInput(value: string) {
    title = value;
    schedulePatch(value, text);
  }

  function onTextInput(value: string) {
    text = value;
    schedulePatch(title, value);
  }

  const bodyFontSize = $derived(
    widget.fontSize !== undefined ? `${Math.max(12, Math.round(widget.fontSize * 0.55))}px` : undefined,
  );
</script>

<div
  class="flex h-full min-h-0 w-full flex-col gap-1 px-2.5 py-2"
  onpointerdown={(e) => e.stopPropagation()}
  role="presentation"
>
  <input
    class="w-full bg-transparent text-sm font-medium text-[var(--dial-title)] outline-none placeholder:text-[var(--text-muted)]"
    placeholder={t('noteTitlePlaceholder')}
    value={title}
    readonly={editMode && !onPatch}
    oninput={(e) => onTitleInput(e.currentTarget.value)}
  />
  <textarea
    class="min-h-0 w-full flex-1 resize-none bg-transparent text-[var(--dial-title)] outline-none placeholder:text-[var(--text-muted)]"
    class:text-sm={bodyFontSize === undefined}
    style:font-size={bodyFontSize}
    placeholder={t('noteTextPlaceholder')}
    value={text}
    oninput={(e) => onTextInput(e.currentTarget.value)}
  ></textarea>
</div>
