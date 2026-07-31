import { z } from 'zod';

/** Allowed schemes for dial navigation targets. */
export const ALLOWED_DIAL_PROTOCOLS = new Set(['http:', 'https:', 'about:']);

/** Max length for data:image favicon URLs (short icons only). */
export const MAX_FAVICON_DATA_URL_LENGTH = 32_768;

/** Default fill used when composing a custom dial background. */
export const DEFAULT_DIAL_BACKGROUND_COLOR = '#14161c';

/** Default alpha used when composing a custom dial background. */
export const DEFAULT_DIAL_BACKGROUND_OPACITY = 0.72;

/** Alpha bump from rest → hover, matching `--dial-bg` (0.72) → `--dial-bg-hover` (0.85). */
export const DIAL_BACKGROUND_HOVER_ALPHA_DELTA = 0.13;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isAllowedDialUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return ALLOWED_DIAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function isAllowedFaviconUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return true;
    }
    if (parsed.protocol === 'data:') {
      // data:image/png;base64,... or data:image/svg+xml,...
      if (!/^data:image\/[a-z0-9.+-]+/i.test(value)) return false;
      return value.length <= MAX_FAVICON_DATA_URL_LENGTH;
    }
    return false;
  } catch {
    return false;
  }
}

/** Normalize a dial URL or return null if invalid / disallowed. */
export function normalizeDialUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (!ALLOWED_DIAL_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Normalize an optional favicon URL or return undefined if empty/invalid. */
export function normalizeFaviconUrl(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return isAllowedFaviconUrl(trimmed) ? trimmed : undefined;
}

export function isDialBackgroundColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

/** Normalize a hex background color or return undefined if empty/invalid. */
export function normalizeDialBackgroundColor(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return isDialBackgroundColor(trimmed) ? trimmed.toLowerCase() : undefined;
}

/** Clamp/normalize opacity 0–1, or undefined if empty/invalid. */
export function normalizeDialBackgroundOpacity(
  value: number | undefined | null,
): number | undefined {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return undefined;
  }
  if (value < 0 || value > 1) return undefined;
  return Math.round(value * 1000) / 1000;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isDialBackgroundColor(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

/**
 * Compose an rgba() background when the dial has a custom color and/or opacity.
 * Returns undefined so the CSS `--dial-bg` default applies.
 */
export function dialBackgroundCss(
  color?: string,
  opacity?: number,
): string | undefined {
  if (color === undefined && opacity === undefined) return undefined;
  const hex = normalizeDialBackgroundColor(color) ?? DEFAULT_DIAL_BACKGROUND_COLOR;
  const alpha =
    normalizeDialBackgroundOpacity(opacity) ?? DEFAULT_DIAL_BACKGROUND_OPACITY;
  const rgb = hexToRgb(hex);
  if (!rgb) return undefined;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Compose the hover rgba() for a custom dial background.
 * Returns undefined so the CSS `--dial-bg-hover` default applies.
 */
export function dialBackgroundHoverCss(
  color?: string,
  opacity?: number,
): string | undefined {
  if (color === undefined && opacity === undefined) return undefined;
  const hex = normalizeDialBackgroundColor(color) ?? DEFAULT_DIAL_BACKGROUND_COLOR;
  const alpha =
    normalizeDialBackgroundOpacity(opacity) ?? DEFAULT_DIAL_BACKGROUND_OPACITY;
  const rgb = hexToRgb(hex);
  if (!rgb) return undefined;
  const hoverAlpha = Math.min(1, alpha + DIAL_BACKGROUND_HOVER_ALPHA_DELTA);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${hoverAlpha})`;
}

const dialUrlString = z.string().refine(isAllowedDialUrl, {
  message: 'URL must use http:, https:, or about:',
});

const faviconUrlString = z.string().refine(isAllowedFaviconUrl, {
  message: 'Favicon must be http(s) or a short data:image URL',
});

const backgroundColorString = z.string().refine(isDialBackgroundColor, {
  message: 'Background color must be a #rrggbb hex value',
});

export const DialSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: dialUrlString,
  faviconUrl: faviconUrlString.optional(),
  iconSize: z.number().int().min(16).max(64).optional(),
  fontSize: z.number().int().min(10).max(24).optional(),
  backgroundColor: backgroundColorString.optional(),
  backgroundOpacity: z.number().finite().min(0).max(1).optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().min(64),
  height: z.number().finite().min(64),
});

export type Dial = z.infer<typeof DialSchema>;
