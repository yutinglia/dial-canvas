import { describe, expect, it } from 'vitest';
import {
  MAX_NOTE_TEXT_LENGTH,
  MAX_TODO_ITEM_TEXT_LENGTH,
} from '../schemas/widget';
import {
  clampNoteText,
  clampTodoItemText,
  clampWidgetTitle,
  normalizeWidgetForPersist,
} from './normalizeWidget';

describe('normalizeWidgetForPersist', () => {
  it('clamps note title and text', () => {
    const widget = normalizeWidgetForPersist({
      id: 'n1',
      type: 'note',
      title: 't'.repeat(200),
      text: 'x'.repeat(MAX_NOTE_TEXT_LENGTH + 50),
      showWhenNarrow: false,
      x: 0,
      y: 0,
      width: 160,
      height: 160,
    });
    expect(widget.type).toBe('note');
    if (widget.type !== 'note') return;
    expect(widget.title).toHaveLength(120);
    expect(widget.text).toHaveLength(MAX_NOTE_TEXT_LENGTH);
  });

  it('clamps todo title and item text', () => {
    const widget = normalizeWidgetForPersist({
      id: 't1',
      type: 'todo',
      title: 'T'.repeat(150),
      items: [
        {
          id: 'i1',
          text: 'i'.repeat(MAX_TODO_ITEM_TEXT_LENGTH + 10),
          done: false,
        },
      ],
      showWhenNarrow: false,
      x: 0,
      y: 0,
      width: 160,
      height: 160,
    });
    expect(widget.type).toBe('todo');
    if (widget.type !== 'todo') return;
    expect(widget.title).toHaveLength(120);
    expect(widget.items[0]?.text).toHaveLength(MAX_TODO_ITEM_TEXT_LENGTH);
  });

  it('exposes clamp helpers', () => {
    expect(clampWidgetTitle('a'.repeat(130))).toHaveLength(120);
    expect(clampNoteText('b'.repeat(10))).toHaveLength(10);
    expect(clampTodoItemText('c'.repeat(300))).toHaveLength(
      MAX_TODO_ITEM_TEXT_LENGTH,
    );
  });
});
