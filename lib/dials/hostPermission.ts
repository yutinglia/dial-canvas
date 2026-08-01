/** Match patterns declared in wxt.config.ts `optional_host_permissions`. */
export const FETCH_HOST_ORIGINS = ['http://*/*', 'https://*/*'] as const;

/** Whether the extension may fetch arbitrary http(s) pages for titles. */
export async function hasFetchHostPermission(): Promise<boolean> {
  try {
    return await browser.permissions.contains({
      origins: [...FETCH_HOST_ORIGINS],
    });
  } catch {
    return false;
  }
}

/**
 * Prompt for host access. Must be called from a user gesture
 * (e.g. Fetch title button click) — blur handlers cannot prompt.
 */
export async function requestFetchHostPermission(): Promise<boolean> {
  try {
    const already = await hasFetchHostPermission();
    if (already) return true;
    return await browser.permissions.request({
      origins: [...FETCH_HOST_ORIGINS],
    });
  } catch {
    return false;
  }
}
