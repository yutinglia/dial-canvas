import { z } from 'zod';

/** Allowed schemes for dial navigation targets. */
export const ALLOWED_DIAL_PROTOCOLS = new Set(['http:', 'https:', 'about:']);

/** Max length for data:image favicon URLs (short icons only). */
export const MAX_FAVICON_DATA_URL_LENGTH = 32_768;

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

const dialUrlString = z.string().refine(isAllowedDialUrl, {
  message: 'URL must use http:, https:, or about:',
});

const faviconUrlString = z.string().refine(isAllowedFaviconUrl, {
  message: 'Favicon must be http(s) or a short data:image URL',
});

export const DialSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: dialUrlString,
  faviconUrl: faviconUrlString.optional(),
  iconSize: z.number().int().min(16).max(64).optional(),
  fontSize: z.number().int().min(10).max(24).optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().min(64),
  height: z.number().finite().min(64),
});

export type Dial = z.infer<typeof DialSchema>;
