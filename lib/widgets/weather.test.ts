import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearWeatherCache,
  fetchCurrentWeather,
  formatTemperature,
  formatWindSpeed,
  parseForecastResponse,
  parseGeocodeSearchResponse,
  parseReverseGeocodeResponse,
  requestBrowserGeolocation,
  reverseGeocode,
  searchLocations,
  weatherConditionFromCode,
} from './weather';

afterEach(() => {
  clearWeatherCache();
});

describe('weatherConditionFromCode', () => {
  it('maps common WMO codes', () => {
    expect(weatherConditionFromCode(0).icon).toBe('clear');
    expect(weatherConditionFromCode(3).label).toBe('Overcast');
    expect(weatherConditionFromCode(61).icon).toBe('rain');
    expect(weatherConditionFromCode(95).icon).toBe('storm');
  });
});

describe('parseGeocodeSearchResponse', () => {
  it('parses valid results and skips bad rows', () => {
    const results = parseGeocodeSearchResponse({
      results: [
        {
          name: 'Taipei',
          latitude: 25.03,
          longitude: 121.56,
          admin1: 'Taipei',
          country: 'Taiwan',
        },
        { name: 'Bad' },
      ],
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('Taipei, Taiwan');
    expect(results[0]?.latitude).toBe(25.03);
  });
});

describe('parseReverseGeocodeResponse', () => {
  it('falls back when reverse payload is empty', () => {
    const fallback = {
      name: 'Current location',
      latitude: 1,
      longitude: 2,
    };
    expect(parseReverseGeocodeResponse({}, fallback)).toEqual(fallback);
  });

  it('uses reverse name when present', () => {
    const fallback = {
      name: 'Current location',
      latitude: 25,
      longitude: 121,
    };
    expect(
      parseReverseGeocodeResponse(
        {
          results: [{ name: 'Taipei', country: 'Taiwan' }],
        },
        fallback,
      ),
    ).toEqual({
      name: 'Taipei, Taiwan',
      latitude: 25,
      longitude: 121,
    });
  });
});

describe('parseForecastResponse', () => {
  it('parses current weather fields', () => {
    const weather = parseForecastResponse(
      {
        current: {
          temperature_2m: 28.4,
          relative_humidity_2m: 70,
          wind_speed_10m: 12.2,
          weather_code: 1,
        },
      },
      { name: 'Taipei', latitude: 25, longitude: 121 },
      'metric',
      1_700_000_000_000,
    );
    expect(weather).toMatchObject({
      temperature: 28.4,
      humidity: 70,
      windSpeed: 12.2,
      units: 'metric',
      fetchedAt: 1_700_000_000_000,
    });
    expect(weather?.condition.icon).toBe('partly');
  });

  it('returns null for invalid payloads', () => {
    expect(
      parseForecastResponse(
        { current: {} },
        { name: 'X', latitude: 0, longitude: 0 },
        'metric',
      ),
    ).toBeNull();
  });
});

describe('format helpers', () => {
  it('formats temperature and wind', () => {
    expect(formatTemperature(28.6, 'metric')).toBe('29°C');
    expect(formatTemperature(72.2, 'imperial')).toBe('72°F');
    expect(formatWindSpeed(10.4, 'metric')).toBe('10 km/h');
    expect(formatWindSpeed(8.6, 'imperial')).toBe('9 mph');
  });
});

describe('searchLocations / fetchCurrentWeather / geolocation', () => {
  afterEach(() => {
    clearWeatherCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns empty results for blank queries and maps fetch failures', async () => {
    await expect(searchLocations('   ')).resolves.toEqual({
      ok: true,
      results: [],
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })),
    );
    await expect(searchLocations('Taipei')).resolves.toEqual({
      ok: false,
      error: 'Geocode failed (500)',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await expect(searchLocations('Taipei')).resolves.toEqual({
      ok: false,
      error: 'Geocode request failed',
    });
  });

  it('searches locations successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [
            {
              name: 'Taipei',
              latitude: 25.03,
              longitude: 121.56,
              country: 'Taiwan',
            },
          ],
        }),
      })),
    );
    await expect(searchLocations('Taipei')).resolves.toEqual({
      ok: true,
      results: [
        expect.objectContaining({
          name: 'Taipei, Taiwan',
          latitude: 25.03,
        }),
      ],
    });
  });

  it('fetches weather, caches it, and reuses the fresh cache', async () => {
    const location = { name: 'Taipei', latitude: 25, longitude: 121 };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 28.4,
          relative_humidity_2m: 70,
          wind_speed_10m: 12.2,
          weather_code: 1,
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchCurrentWeather(location, 'metric');
    expect(first.ok).toBe(true);
    const second = await fetchCurrentWeather(location, 'metric');
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns stale cache on HTTP failure and hard-fails without cache', async () => {
    const location = { name: 'Taipei', latitude: 25, longitude: 121 };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 20,
            relative_humidity_2m: 50,
            wind_speed_10m: 5,
            weather_code: 0,
          },
        }),
      })),
    );
    const warm = await fetchCurrentWeather(location, 'imperial');
    expect(warm.ok).toBe(true);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => ({}),
      })),
    );
    const stale = await fetchCurrentWeather(location, 'imperial', {
      force: true,
    });
    expect(stale).toEqual(warm);

    clearWeatherCache();
    await expect(
      fetchCurrentWeather(location, 'imperial', { force: true }),
    ).resolves.toEqual({
      ok: false,
      error: 'Weather failed (503)',
    });
  });

  it('handles invalid payloads, network errors, and geolocation', async () => {
    const location = { name: 'X', latitude: 1, longitude: 2 };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ current: {} }),
      })),
    );
    await expect(fetchCurrentWeather(location, 'metric')).resolves.toEqual({
      ok: false,
      error: 'Invalid weather response',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await expect(fetchCurrentWeather(location, 'metric')).resolves.toEqual({
      ok: false,
      error: 'Weather request failed',
    });

    await expect(reverseGeocode(1, 2)).resolves.toEqual({
      name: 'Current location',
      latitude: 1,
      longitude: 2,
    });

    vi.stubGlobal('navigator', {});
    await expect(requestBrowserGeolocation()).rejects.toThrow(
      /Geolocation is not available/,
    );

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (
          success: (position: { coords: GeolocationCoordinates }) => void,
        ) => {
          success({
            coords: {
              latitude: 10,
              longitude: 20,
            } as GeolocationCoordinates,
          });
        },
      },
    });
    await expect(requestBrowserGeolocation()).resolves.toMatchObject({
      latitude: 10,
      longitude: 20,
    });
  });
});
