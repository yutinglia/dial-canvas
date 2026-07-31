import {
  extractFaviconFromHtml,
  extractTitleFromHtml,
  titleFromHostname,
} from '../lib/dials/pageTitle';
import { hasFetchHostPermission } from '../lib/dials/hostPermission';
import { isAllowedFaviconUrl } from '../lib/schemas/dial';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_CHARS = 256_000;

type FetchPageTitleMessage = {
  type: 'fetch-page-title';
  url: string;
};

type ExtensionCommandMessage = {
  type: 'extension-command';
  command: string;
};

type FetchPageTitleResponse =
  | {
      ok: true;
      title: string;
      source: 'html' | 'hostname';
      faviconUrl?: string;
    }
  | {
      ok: false;
      error: string;
      title: string;
      source: 'hostname';
      faviconUrl?: string;
    };

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

function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) return true; // missing header: still attempt parse
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return (
    mime === 'text/html' ||
    mime === 'application/xhtml+xml' ||
    mime === 'application/xml' ||
    mime === 'text/xml'
  );
}

/** Read at most `maxChars` decoded characters from the response body. */
async function readLimitedText(
  response: Response,
  maxChars: number,
): Promise<string> {
  if (!response.body) {
    return (await response.text()).slice(0, maxChars);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let result = '';

  try {
    while (result.length < maxChars) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
      if (result.length >= maxChars) {
        result = result.slice(0, maxChars);
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
    result += decoder.decode();
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // already canceled / released
    }
  }

  return result.slice(0, maxChars);
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

  if (!(await hasFetchHostPermission())) {
    return {
      ok: false,
      error: 'Host permission not granted.',
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

    if (!isHtmlContentType(response.headers.get('content-type'))) {
      return {
        ok: false,
        error: 'Response is not HTML.',
        title: fallback,
        source: 'hostname',
      };
    }

    const text = await readLimitedText(response, MAX_HTML_CHARS);
    const pageUrl = response.url || parsed.toString();
    const scrapedIcon = extractFaviconFromHtml(text, pageUrl);
    const faviconUrl =
      scrapedIcon && isAllowedFaviconUrl(scrapedIcon) ? scrapedIcon : undefined;

    const extracted = extractTitleFromHtml(text);
    if (extracted) {
      return { ok: true, title: extracted, source: 'html', faviconUrl };
    }
    return {
      ok: false,
      error: 'No title found.',
      title: fallback,
      source: 'hostname',
      faviconUrl,
    };
  } catch (err) {
    // Missing host permission often surfaces as a generic TypeError/NetworkError.
    if (!(await hasFetchHostPermission())) {
      return {
        ok: false,
        error: 'Host permission not granted.',
        title: fallback,
        source: 'hostname',
      };
    }
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out.'
        : err instanceof Error && err.message
          ? `Failed to fetch page (${err.message}).`
          : 'Failed to fetch page.';
    return { ok: false, error: message, title: fallback, source: 'hostname' };
  } finally {
    clearTimeout(timer);
  }
}

async function broadcastCommand(command: string) {
  const message: ExtensionCommandMessage = {
    type: 'extension-command',
    command,
  };
  try {
    await browser.runtime.sendMessage(message);
  } catch {
    // No receiving page open — ignore.
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

  browser.commands?.onCommand?.addListener((command) => {
    void broadcastCommand(command);
  });
});
