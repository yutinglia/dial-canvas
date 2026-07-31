import { createId } from '../id';
import {
  MAX_TODO_ITEM_TEXT_LENGTH,
  MAX_TODO_ITEMS,
  type TodoItem,
} from '../schemas/widget';

function clampItemText(text: string): string {
  return text.trim().slice(0, MAX_TODO_ITEM_TEXT_LENGTH);
}

/** Append a todo item when under the max and text is non-empty. */
export function addTodoItem(items: TodoItem[], text: string): TodoItem[] {
  const trimmed = clampItemText(text);
  if (!trimmed || items.length >= MAX_TODO_ITEMS) return items;
  return [...items, { id: createId(), text: trimmed, done: false }];
}

/** Toggle done for a todo item by id. */
export function toggleTodoItem(items: TodoItem[], id: string): TodoItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  );
}

/** Remove a todo item by id. */
export function removeTodoItem(items: TodoItem[], id: string): TodoItem[] {
  return items.filter((item) => item.id !== id);
}

/** Drop completed items. */
export function clearCompletedTodoItems(items: TodoItem[]): TodoItem[] {
  return items.filter((item) => !item.done);
}

/** Update text for a todo item by id. */
export function updateTodoItemText(
  items: TodoItem[],
  id: string,
  text: string,
): TodoItem[] {
  const trimmed = clampItemText(text);
  if (!trimmed) return removeTodoItem(items, id);
  return items.map((item) =>
    item.id === id ? { ...item, text: trimmed } : item,
  );
}
