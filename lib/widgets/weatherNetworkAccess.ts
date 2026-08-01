import {
  FETCH_HOST_ORIGINS,
  hasFetchHostPermission,
} from '../dials/hostPermission';
import {
  LOCATION_DATA_PERMISSION,
  hasLocationDataPermission,
} from './weatherPermission';

type WeatherNetworkQuery = {
  origins: string[];
  data_collection: string[];
};

/** Both optional hosts and locationInfo are already granted (check only). */
export async function hasWeatherNetworkAccess(): Promise<boolean> {
  const [hosts, location] = await Promise.all([
    hasFetchHostPermission(),
    hasLocationDataPermission(),
  ]);
  return hosts && location;
}

/**
 * Request hosts + locationInfo from a user gesture before Open-Meteo calls.
 * Single permissions.request keeps the Firefox user-gesture; do not await
 * contains/getAll or chain two requests. On throw (no data_collection support),
 * fall back to hosts-only.
 */
export async function requestWeatherNetworkAccess(): Promise<boolean> {
  try {
    return await browser.permissions.request({
      origins: [...FETCH_HOST_ORIGINS],
      data_collection: [LOCATION_DATA_PERMISSION],
    } as WeatherNetworkQuery as never);
  } catch {
    try {
      return await browser.permissions.request({
        origins: [...FETCH_HOST_ORIGINS],
      });
    } catch {
      return false;
    }
  }
}
