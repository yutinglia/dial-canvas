import {
  extractTitleFromHtml,
  titleFromHostname,
} from '../lib/dials/pageTitle';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_CHARS = 256_000;

type FetchPageTitleMessage = {
  type: 'fetch-page-title';
  url: string;
};

type FetchPageTitleResponse =
  | { ok: true; title: string; source: 'html' | 'hostname' }
  | { ok: false; error: string; title: string; source: 'hostname' };

function isFetchPageTitleMessage(
  message: unknown,
): message is FetchPageTitleMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as FetchPageTitleMessage).type === 'fetch-page-title' &&
    typeof (message as FetchPageTitleMessage).url === 'string'
  );
}

async function fetchPageTitle(url: string): Promise<FetchPageTitleResponse> {
  const fallback = titleFromHostname(url);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'Invalid URL.', title: fallback, source: 'hostname' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      error: 'Only http(s) URLs are supported.',
      title: fallback,
      source: 'hostname',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
        title: fallback,
        source: 'hostname',
      };
    }
    const text = (await response.text()).slice(0, MAX_HTML_CHARS);
    const extracted = extractTitleFromHtml(text);
    if (extracted) {
      return { ok: true, title: extracted, source: 'html' };
    }
    return {
      ok: false,
      error: 'No title found.',
      title: fallback,
      source: 'hostname',
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out.'
        : 'Failed to fetch page.';
    return { ok: false, error: message, title: fallback, source: 'hostname' };
  } finally {
    clearTimeout(timer);
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isFetchPageTitleMessage(message)) return;

    void fetchPageTitle(message.url).then((result) => {
      sendResponse(result);
    });

    // Keep the message channel open for the async response.
    return true;
  });
});
