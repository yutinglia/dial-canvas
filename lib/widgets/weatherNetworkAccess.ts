import {
  hasFetchHostPermission,
  requestFetchHostPermission,
} from '../dials/hostPermission';
import {
  hasLocationDataPermission,
  requestLocationDataPermission,
} from './weatherPermission';

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
 * Order: location data first (AMO consent), then fetch hosts.
 */
export async function requestWeatherNetworkAccess(): Promise<boolean> {
  const locationOk = await requestLocationDataPermission();
  if (!locationOk) return false;
  return requestFetchHostPermission();
}
