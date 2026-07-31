/** Derive a favicon URL from a site origin (img tag fetch; no extension host perms). */
export function deriveFaviconUrl(siteUrl: string): string {
  try {
    const { origin } = new URL(siteUrl);
    return `${origin}/favicon.ico`;
  } catch {
    return '';
  }
}

export function resolveFaviconUrl(
  siteUrl: string,
  override?: string,
): string {
  if (override && override.trim()) return override.trim();
  return deriveFaviconUrl(siteUrl);
}
