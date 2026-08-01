/** Optional gecko data_collection type declared in wxt.config.ts. */
export const LOCATION_DATA_PERMISSION = 'locationInfo' as const;

type PermissionsSnapshot = {
  origins?: string[];
  permissions?: string[];
  data_collection?: string[];
};

type DataCollectionQuery = {
  data_collection: string[];
};

/**
 * Whether Firefox exposes built-in data-collection consent.
 * Absent key ⇒ treat location data as allowed (Chrome / older Firefox).
 */
export async function supportsDataCollectionPermissions(): Promise<boolean> {
  try {
    const all = (await browser.permissions.getAll()) as PermissionsSnapshot;
    return Object.prototype.hasOwnProperty.call(all, 'data_collection');
  } catch {
    return false;
  }
}

/** Whether optional locationInfo data collection is granted (or unsupported). */
export async function hasLocationDataPermission(): Promise<boolean> {
  try {
    if (!(await supportsDataCollectionPermissions())) return true;
    // Firefox-only `data_collection`; Chrome typings omit the field.
    return await browser.permissions.contains(
      { data_collection: [LOCATION_DATA_PERMISSION] } as DataCollectionQuery as never,
    );
  } catch {
    return false;
  }
}

/**
 * Prompt for locationInfo data collection. Must run from a user gesture.
 * No-ops as granted when the browser lacks data_collection support.
 */
export async function requestLocationDataPermission(): Promise<boolean> {
  try {
    if (!(await supportsDataCollectionPermissions())) return true;
    const already = await hasLocationDataPermission();
    if (already) return true;
    return await browser.permissions.request(
      { data_collection: [LOCATION_DATA_PERMISSION] } as DataCollectionQuery as never,
    );
  } catch {
    return false;
  }
}
