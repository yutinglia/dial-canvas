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

/**
 * Prefer `<link rel="icon">` / shortcut / apple-touch-icon from HTML.
 * Returns an absolute URL resolved against `pageUrl`, or null.
 */
export function extractFaviconFromHtml(
  html: string,
  pageUrl: string,
): string | null {
  let baseHref: string | null = null;
  const baseMatch = /<base\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(
    html,
  );
  if (baseMatch) {
    baseHref = (baseMatch[1] ?? baseMatch[2] ?? baseMatch[3] ?? '').trim() || null;
  }

  let resolvedBase: URL;
  try {
    resolvedBase = baseHref ? new URL(baseHref, pageUrl) : new URL(pageUrl);
  } catch {
    try {
      resolvedBase = new URL(pageUrl);
    } catch {
      return null;
    }
  }

  const linkTagRe = /<link\b[^>]*>/gi;
  type Candidate = { href: string; score: number };
  const candidates: Candidate[] = [];

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = linkTagRe.exec(html)) !== null) {
    const tag = tagMatch[0];
    const relMatch = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    if (!relMatch || !hrefMatch) continue;

    const rel = (relMatch[1] ?? relMatch[2] ?? relMatch[3] ?? '')
      .toLowerCase()
      .trim();
    const href = (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '').trim();
    if (!href) continue;

    const tokens = rel.split(/\s+/);
    let score = 0;
    if (tokens.includes('icon')) score = 30;
    else if (tokens.includes('shortcut')) score = 25;
    else if (tokens.some((t) => t === 'apple-touch-icon' || t === 'apple-touch-icon-precomposed'))
      score = 20;
    else continue;

    if (tokens.includes('mask-icon')) score -= 5;

    const sizesMatch = /\bsizes\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const sizes = (sizesMatch?.[1] ?? sizesMatch?.[2] ?? sizesMatch?.[3] ?? '').trim();
    if (sizes && sizes !== 'any') {
      const dim = sizes.split('x')[0];
      const n = Number(dim);
      if (Number.isFinite(n) && n > 0) score += Math.min(n, 256) / 256;
    }

    candidates.push({ href, score });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);

  for (const candidate of candidates) {
    try {
      const absolute = new URL(candidate.href, resolvedBase).toString();
      if (absolute.startsWith('http:') || absolute.startsWith('https:')) {
        return absolute;
      }
    } catch {
      // try next
    }
  }
  return null;
}

function codePointToChar(n: number, fallback: string): string {
  // Valid Unicode scalar values only (excludes surrogates and out-of-range).
  if (
    !Number.isInteger(n) ||
    n < 0 ||
    n > 0x10ffff ||
    (n >= 0xd800 && n <= 0xdfff)
  ) {
    return fallback;
  }
  try {
    return String.fromCodePoint(n);
  } catch {
    return fallback;
  }
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (match, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? codePointToChar(n, match) : match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? codePointToChar(n, match) : match;
    });
}
