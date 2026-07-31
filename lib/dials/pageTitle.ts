/** Instant fallback title from a URL's hostname (strips leading www.). */
export function titleFromHostname(url: string): string {
  try {
    const { hostname } = new URL(url);
    if (!hostname) return '';
    return hostname.replace(/^www\./i, '') || hostname;
  } catch {
    return '';
  }
}

/** Extract and decode a document `<title>` from HTML markup. */
export function extractTitleFromHtml(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const captured = match?.[1];
  if (captured == null) return null;
  const raw = captured.replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  return decodeBasicEntities(raw);
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    });
}
