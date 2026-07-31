import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addTodoItem,
  clearCompletedTodoItems,
  removeTodoItem,
  toggleTodoItem,
  updateTodoItemText,
} from './todo';
import { MAX_TODO_ITEMS } from '../schemas/widget';

vi.mock('../id', () => ({
  createId: () => 'generated-id',
}));

describe('todo helpers', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('adds, toggles, updates, and removes items', () => {
    const withItem = addTodoItem([], '  Buy milk  ');
    expect(withItem).toEqual([
      { id: 'generated-id', text: 'Buy milk', done: false },
    ]);

    const toggled = toggleTodoItem(withItem, 'generated-id');
    expect(toggled[0]?.done).toBe(true);

    const updated = updateTodoItemText(toggled, 'generated-id', 'Buy oat milk');
    expect(updated[0]?.text).toBe('Buy oat milk');

    expect(removeTodoItem(updated, 'generated-id')).toEqual([]);
  });

  it('clears completed items and refuses empty text', () => {
    const items = [
      { id: 'a', text: 'Done', done: true },
      { id: 'b', text: 'Open', done: false },
    ];
    expect(clearCompletedTodoItems(items)).toEqual([
      { id: 'b', text: 'Open', done: false },
    ]);
    expect(addTodoItem(items, '   ')).toEqual(items);
    expect(updateTodoItemText(items, 'b', '  ')).toEqual([
      { id: 'a', text: 'Done', done: true },
    ]);
  });

  it('caps the number of items', () => {
    const full = Array.from({ length: MAX_TODO_ITEMS }, (_, i) => ({
      id: `i${i}`,
      text: `Item ${i}`,
      done: false,
    }));
    expect(addTodoItem(full, 'Overflow')).toEqual(full);
  });
});
