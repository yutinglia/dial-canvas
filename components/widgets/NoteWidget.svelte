<script lang="ts">
  import {
    MAX_NOTE_TEXT_LENGTH,
    type NoteWidget as NoteWidgetModel,
  } from '../../lib/schemas/widget';
  import {
    clampNoteText,
    clampWidgetTitle,
  } from '../../lib/widgets/normalizeWidget';
  import { t } from '../../lib/i18n';

  interface Props {
    widget: NoteWidgetModel;
    editMode?: boolean;
    onPatch?: (widget: NoteWidgetModel) => void;
  }

  let { widget, editMode = false, onPatch }: Props = $props();

  let title = $state('');
  let text = $state('');
  let syncedId = $state('');
  let lastPatchedTitle = $state('');
  let lastPatchedText = $state('');
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if (widget.id !== syncedId) {
      syncedId = widget.id;
      title = widget.title;
      text = widget.text;
      lastPatchedTitle = widget.title;
      lastPatchedText = widget.text;
      return;
    }
    // Only mirror store → local when we are not mid-edit (caught up to last patch).
    if (title === lastPatchedTitle && text === lastPatchedText) {
      title = widget.title;
      text = widget.text;
      lastPatchedTitle = widget.title;
      lastPatchedText = widget.text;
    }
  });

  function flushPatch(nextTitle: string, nextText: string) {
    if (!onPatch) return;
    const clampedTitle = clampWidgetTitle(nextTitle);
    const clampedText = clampNoteText(nextText);
    lastPatchedTitle = clampedTitle;
    lastPatchedText = clampedText;
    onPatch({
      ...widget,
      title: clampedTitle,
      text: clampedText,
    });
  }

  function schedulePatch(nextTitle: string, nextText: string) {
    if (!onPatch) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      flushPatch(nextTitle, nextText);
    }, 300);
  }

  $effect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
        flushPatch(title, text);
      }
    };
  });

  function onTitleInput(value: string) {
    title = value.slice(0, 120);
    schedulePatch(title, text);
  }

  function onTextInput(value: string) {
    text = value.slice(0, MAX_NOTE_TEXT_LENGTH);
    schedulePatch(title, text);
  }

  const bodyFontSize = $derived(
    widget.fontSize !== undefined ? `${Math.max(12, Math.round(widget.fontSize * 0.55))}px` : undefined,
  );
</script>

<div class="flex h-full min-h-0 w-full flex-col gap-1 px-2.5 py-2">
  <input
    class="w-full bg-transparent text-sm font-medium text-[var(--dial-title)] outline-none placeholder:text-[var(--text-muted)]"
    placeholder={t('noteTitlePlaceholder')}
    value={title}
    readonly={editMode && !onPatch}
    maxlength={120}
    oninput={(e) => onTitleInput(e.currentTarget.value)}
  />
  <textarea
    class="min-h-0 w-full flex-1 resize-none bg-transparent text-[var(--dial-title)] outline-none placeholder:text-[var(--text-muted)]"
    class:text-sm={bodyFontSize === undefined}
    style:font-size={bodyFontSize}
    placeholder={t('noteTextPlaceholder')}
    value={text}
    maxlength={MAX_NOTE_TEXT_LENGTH}
    oninput={(e) => onTextInput(e.currentTarget.value)}
  ></textarea>
</div>
