import { isAllowedFaviconUrl } from '../schemas/dial';

/** Letter/monogram fallback from a dial title (up to 2 chars). */
export function dialMonogram(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const a = parts[0]![0] ?? '';
  const b = parts[1]![0] ?? '';
  return `${a}${b}`.toUpperCase() || '?';
}

/**
 * Derive candidate favicon URLs for a site.
 * Prefer common high-quality paths; `/favicon.ico` is last resort.
 */
export function deriveFaviconCandidates(siteUrl: string): string[] {
  try {
    const { origin } = new URL(siteUrl);
    return [
      `${origin}/apple-touch-icon.png`,
      `${origin}/apple-touch-icon-precomposed.png`,
      `${origin}/favicon.ico`,
    ];
  } catch {
    return [];
  }
}

/** Derive a favicon URL from a site origin (last-resort /favicon.ico). */
export function deriveFaviconUrl(siteUrl: string): string {
  return deriveFaviconCandidates(siteUrl).at(-1) ?? '';
}

export function resolveFaviconUrl(
  siteUrl: string,
  override?: string,
): string {
  const trimmed = override?.trim();
  if (trimmed && isAllowedFaviconUrl(trimmed)) return trimmed;
  return deriveFaviconUrl(siteUrl);
}

/** Resolve primary + fallbacks for progressive icon loading. */
export function resolveFaviconChain(
  siteUrl: string,
  override?: string,
): string[] {
  const trimmed = override?.trim();
  if (trimmed && isAllowedFaviconUrl(trimmed)) {
    return [trimmed, ...deriveFaviconCandidates(siteUrl).filter((u) => u !== trimmed)];
  }
  return deriveFaviconCandidates(siteUrl);
}
