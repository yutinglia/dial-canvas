import {
  MAX_NOTE_TEXT_LENGTH,
  MAX_TODO_ITEM_TEXT_LENGTH,
  type NoteWidget,
  type TodoWidget,
  type Widget,
} from '../schemas/widget';

const MAX_WIDGET_TITLE_LENGTH = 120;

export function clampWidgetTitle(title: string): string {
  return title.slice(0, MAX_WIDGET_TITLE_LENGTH);
}

export function clampNoteText(text: string): string {
  return text.slice(0, MAX_NOTE_TEXT_LENGTH);
}

export function clampTodoItemText(text: string): string {
  return text.slice(0, MAX_TODO_ITEM_TEXT_LENGTH);
}

/** Clamp note/todo string fields before persist so reload Zod parse cannot drop them. */
export function normalizeWidgetForPersist(widget: Widget): Widget {
  if (widget.type === 'note') {
    const next: NoteWidget = {
      ...widget,
      title: clampWidgetTitle(widget.title),
      text: clampNoteText(widget.text),
    };
    return next;
  }
  if (widget.type === 'todo') {
    const next: TodoWidget = {
      ...widget,
      title: clampWidgetTitle(widget.title),
      items: widget.items.map((item) => ({
        ...item,
        text: clampTodoItemText(item.text),
      })),
    };
    return next;
  }
  return widget;
}
