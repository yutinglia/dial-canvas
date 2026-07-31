import type { WeatherLocation } from '../schemas/widget';

export const OPEN_METEO_GEOCODE_URL =
  'https://geocoding-api.open-meteo.com/v1/search';
export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export const WEATHER_CACHE_TTL_MS = 20 * 60 * 1000;

export type WeatherUnits = 'metric' | 'imperial';

export type GeocodeResult = WeatherLocation & {
  country?: string;
  admin1?: string;
};

export type WeatherCondition = {
  code: number;
  label: string;
  icon: 'clear' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
};

export type CurrentWeather = {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: WeatherCondition;
  fetchedAt: number;
  location: WeatherLocation;
  units: WeatherUnits;
};

export type WeatherResult =
  | { ok: true; weather: CurrentWeather }
  | { ok: false; error: string };

export type GeocodeSearchResult =
  | { ok: true; results: GeocodeResult[] }
  | { ok: false; error: string };

type CacheEntry = {
  weather: CurrentWeather;
  expiresAt: number;
};

const weatherCache = new Map<string, CacheEntry>();

function cacheKey(
  latitude: number,
  longitude: number,
  units: WeatherUnits,
): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)},${units}`;
}

/** Map WMO weather interpretation codes to a short label + icon key. */
export function weatherConditionFromCode(code: number): WeatherCondition {
  if (code === 0) return { code, label: 'Clear', icon: 'clear' };
  if (code === 1 || code === 2) {
    return { code, label: 'Partly cloudy', icon: 'partly' };
  }
  if (code === 3) return { code, label: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { code, label: 'Fog', icon: 'fog' };
  if (code >= 51 && code <= 57) {
    return { code, label: 'Drizzle', icon: 'drizzle' };
  }
  if (code >= 61 && code <= 67) return { code, label: 'Rain', icon: 'rain' };
  if (code >= 71 && code <= 77) return { code, label: 'Snow', icon: 'snow' };
  if (code >= 80 && code <= 82) {
    return { code, label: 'Showers', icon: 'rain' };
  }
  if (code >= 85 && code <= 86) {
    return { code, label: 'Snow showers', icon: 'snow' };
  }
  if (code >= 95 && code <= 99) {
    return { code, label: 'Thunderstorm', icon: 'storm' };
  }
  return { code, label: 'Unknown', icon: 'cloud' };
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function formatPlaceName(
  name: string,
  admin1?: string,
  country?: string,
): string {
  const parts = [name];
  if (admin1 && admin1 !== name) parts.push(admin1);
  if (country) parts.push(country);
  return parts.join(', ');
}

/** Parse Open-Meteo geocoding search JSON into location results. */
export function parseGeocodeSearchResponse(raw: unknown): GeocodeResult[] {
  if (!raw || typeof raw !== 'object') return [];
  const results = (raw as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  const out: GeocodeResult[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = readString(record.name);
    const latitude = readNumber(record.latitude);
    const longitude = readNumber(record.longitude);
    if (!name || latitude === undefined || longitude === undefined) continue;
    const admin1 = readString(record.admin1);
    const country = readString(record.country);
    out.push({
      name: formatPlaceName(name, admin1, country),
      latitude,
      longitude,
      admin1,
      country,
    });
  }
  return out;
}

/** Parse Open-Meteo reverse-geocode JSON into a single location. */
export function parseReverseGeocodeResponse(
  raw: unknown,
  fallback: WeatherLocation,
): WeatherLocation {
  if (!raw || typeof raw !== 'object') return fallback;
  const results = (raw as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) return fallback;
  const first = results[0];
  if (!first || typeof first !== 'object') return fallback;
  const record = first as Record<string, unknown>;
  const name = readString(record.name);
  if (!name) return fallback;
  const admin1 = readString(record.admin1);
  const country = readString(record.country);
  return {
    name: formatPlaceName(name, admin1, country),
    latitude: fallback.latitude,
    longitude: fallback.longitude,
  };
}

/** Build a location from browser geolocation (Open-Meteo has no reverse geocode). */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<WeatherLocation> {
  return {
    name: 'Current location',
    latitude,
    longitude,
  };
}

/** Parse Open-Meteo forecast JSON into current weather. */
export function parseForecastResponse(
  raw: unknown,
  location: WeatherLocation,
  units: WeatherUnits,
  fetchedAt = Date.now(),
): CurrentWeather | null {
  if (!raw || typeof raw !== 'object') return null;
  const current = (raw as { current?: unknown }).current;
  if (!current || typeof current !== 'object') return null;
  const record = current as Record<string, unknown>;
  const temperature = readNumber(record.temperature_2m);
  const humidity = readNumber(record.relative_humidity_2m);
  const windSpeed = readNumber(record.wind_speed_10m);
  const weatherCode = readNumber(record.weather_code);
  if (
    temperature === undefined ||
    humidity === undefined ||
    windSpeed === undefined ||
    weatherCode === undefined
  ) {
    return null;
  }
  return {
    temperature,
    humidity,
    windSpeed,
    condition: weatherConditionFromCode(weatherCode),
    fetchedAt,
    location,
    units,
  };
}

export async function searchLocations(
  query: string,
  count = 5,
): Promise<GeocodeSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: true, results: [] };

  try {
    const url = new URL(OPEN_METEO_GEOCODE_URL);
    url.searchParams.set('name', trimmed);
    url.searchParams.set('count', String(count));
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    const response = await fetch(url.toString());
    if (!response.ok) {
      return { ok: false, error: `Geocode failed (${response.status})` };
    }
    const json: unknown = await response.json();
    return { ok: true, results: parseGeocodeSearchResponse(json) };
  } catch {
    return { ok: false, error: 'Geocode request failed' };
  }
}

export function getCachedWeather(
  latitude: number,
  longitude: number,
  units: WeatherUnits,
): CurrentWeather | undefined {
  const entry = weatherCache.get(cacheKey(latitude, longitude, units));
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    // Keep stale entry available for UI while a refresh runs.
    return entry.weather;
  }
  return entry.weather;
}

export function isWeatherCacheFresh(
  latitude: number,
  longitude: number,
  units: WeatherUnits,
): boolean {
  const entry = weatherCache.get(cacheKey(latitude, longitude, units));
  return !!entry && entry.expiresAt >= Date.now();
}

function putCache(weather: CurrentWeather): void {
  weatherCache.set(
    cacheKey(weather.location.latitude, weather.location.longitude, weather.units),
    {
      weather,
      expiresAt: weather.fetchedAt + WEATHER_CACHE_TTL_MS,
    },
  );
}

/** Clear in-memory weather cache (tests). */
export function clearWeatherCache(): void {
  weatherCache.clear();
}

export async function fetchCurrentWeather(
  location: WeatherLocation,
  units: WeatherUnits,
  options?: { force?: boolean },
): Promise<WeatherResult> {
  if (
    !options?.force &&
    isWeatherCacheFresh(location.latitude, location.longitude, units)
  ) {
    const cached = getCachedWeather(
      location.latitude,
      location.longitude,
      units,
    );
    if (cached) return { ok: true, weather: cached };
  }

  try {
    const url = new URL(OPEN_METEO_FORECAST_URL);
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    );
    url.searchParams.set(
      'temperature_unit',
      units === 'imperial' ? 'fahrenheit' : 'celsius',
    );
    url.searchParams.set(
      'wind_speed_unit',
      units === 'imperial' ? 'mph' : 'kmh',
    );
    const response = await fetch(url.toString());
    if (!response.ok) {
      const stale = getCachedWeather(
        location.latitude,
        location.longitude,
        units,
      );
      if (stale) return { ok: true, weather: stale };
      return { ok: false, error: `Weather failed (${response.status})` };
    }
    const json: unknown = await response.json();
    const weather = parseForecastResponse(json, location, units);
    if (!weather) {
      const stale = getCachedWeather(
        location.latitude,
        location.longitude,
        units,
      );
      if (stale) return { ok: true, weather: stale };
      return { ok: false, error: 'Invalid weather response' };
    }
    putCache(weather);
    return { ok: true, weather };
  } catch {
    const stale = getCachedWeather(
      location.latitude,
      location.longitude,
      units,
    );
    if (stale) return { ok: true, weather: stale };
    return { ok: false, error: 'Weather request failed' };
  }
}

export function formatTemperature(value: number, units: WeatherUnits): string {
  return `${Math.round(value)}°${units === 'imperial' ? 'F' : 'C'}`;
}

export function formatWindSpeed(value: number, units: WeatherUnits): string {
  return `${Math.round(value)} ${units === 'imperial' ? 'mph' : 'km/h'}`;
}

export function requestBrowserGeolocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => reject(error),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}
