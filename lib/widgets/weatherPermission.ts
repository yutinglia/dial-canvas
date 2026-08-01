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

function isUserGestureError(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return msg.includes('user input') || msg.includes('user gesture');
}

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
 * Call request() immediately — Firefox voids the gesture across awaits
 * (getAll / contains) before this API. Denial resolves false; unsupported
 * data_collection throws and is treated as allowed (except gesture errors).
 */
export async function requestLocationDataPermission(): Promise<boolean> {
  try {
    return await browser.permissions.request(
      { data_collection: [LOCATION_DATA_PERMISSION] } as DataCollectionQuery as never,
    );
  } catch (error) {
    if (isUserGestureError(error)) return false;
    return true;
  }
}
