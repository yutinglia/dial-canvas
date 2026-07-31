import { afterEach, describe, expect, it } from 'vitest';
import {
  clearWeatherCache,
  formatTemperature,
  formatWindSpeed,
  parseForecastResponse,
  parseGeocodeSearchResponse,
  parseReverseGeocodeResponse,
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
