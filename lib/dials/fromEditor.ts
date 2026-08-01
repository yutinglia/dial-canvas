import {
  isAllowedDialUrl,
  normalizeDialUrl,
  normalizeFaviconUrl,
  type Dial,
} from '../schemas/dial';
import { createId } from '../id';

export type DialEditorValues = {
  title: string;
  url: string;
  faviconUrl?: string;
  iconSize?: number;
  fontSize?: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  showWhenNarrow?: boolean;
  narrowOrder?: number;
};

export type DialEditorParseResult =
  | { ok: true; url: string; faviconUrl: string | undefined }
  | { ok: false };

/** Normalize and validate dial URL + favicon from the editor form. */
export function parseDialEditorValues(
  values: DialEditorValues,
): DialEditorParseResult {
  const url = normalizeDialUrl(values.url);
  if (!url || !isAllowedDialUrl(url)) {
    return { ok: false };
  }
  return {
    ok: true,
    url,
    faviconUrl: normalizeFaviconUrl(values.faviconUrl),
  };
}

/** Merge editor values into an existing dial (keeps id and placement). */
export function mergeDialFromEditor(
  dial: Dial,
  values: DialEditorValues,
  url: string,
  faviconUrl: string | undefined,
): Dial {
  const next: Dial = {
    ...dial,
    title: values.title,
    url,
    faviconUrl,
    showWhenNarrow: values.showWhenNarrow ?? false,
  };
  if (values.iconSize !== undefined) next.iconSize = values.iconSize;
  else delete next.iconSize;
  if (values.fontSize !== undefined) next.fontSize = values.fontSize;
  else delete next.fontSize;
  if (values.backgroundColor !== undefined) {
    next.backgroundColor = values.backgroundColor;
  } else {
    delete next.backgroundColor;
  }
  if (values.backgroundOpacity !== undefined) {
    next.backgroundOpacity = values.backgroundOpacity;
  } else {
    delete next.backgroundOpacity;
  }
  if (values.narrowOrder !== undefined) next.narrowOrder = values.narrowOrder;
  else delete next.narrowOrder;
  return next;
}

/** Build a new dial from editor values plus a resolved placement slot. */
export function createDialFromEditor(
  values: DialEditorValues,
  url: string,
  faviconUrl: string | undefined,
  slot: { x: number; y: number; width: number; height: number },
): Dial {
  return {
    id: createId(),
    title: values.title,
    url,
    faviconUrl,
    showWhenNarrow: values.showWhenNarrow ?? false,
    ...(values.iconSize !== undefined ? { iconSize: values.iconSize } : {}),
    ...(values.fontSize !== undefined ? { fontSize: values.fontSize } : {}),
    ...(values.backgroundColor !== undefined
      ? { backgroundColor: values.backgroundColor }
      : {}),
    ...(values.backgroundOpacity !== undefined
      ? { backgroundOpacity: values.backgroundOpacity }
      : {}),
    ...(values.narrowOrder !== undefined
      ? { narrowOrder: values.narrowOrder }
      : {}),
    ...slot,
  };
}
