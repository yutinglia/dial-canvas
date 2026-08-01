import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { FETCH_HOST_ORIGINS } from '../dials/hostPermission';
import { LOCATION_DATA_PERMISSION } from './weatherPermission';

const hasFetchHostPermission = vi.fn();
const hasLocationDataPermission = vi.fn();

vi.mock('../dials/hostPermission', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../dials/hostPermission')>();
  return {
    ...actual,
    hasFetchHostPermission: (...args: unknown[]) =>
      hasFetchHostPermission(...args),
  };
});

vi.mock('./weatherPermission', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./weatherPermission')>();
  return {
    ...actual,
    hasLocationDataPermission: (...args: unknown[]) =>
      hasLocationDataPermission(...args),
  };
});

import {
  hasWeatherNetworkAccess,
  requestWeatherNetworkAccess,
} from './weatherNetworkAccess';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  fakeBrowser.reset();
});

describe('hasWeatherNetworkAccess', () => {
  it('requires both hosts and location data', async () => {
    hasFetchHostPermission.mockResolvedValue(true);
    hasLocationDataPermission.mockResolvedValue(true);
    await expect(hasWeatherNetworkAccess()).resolves.toBe(true);

    hasLocationDataPermission.mockResolvedValue(false);
    await expect(hasWeatherNetworkAccess()).resolves.toBe(false);

    hasFetchHostPermission.mockResolvedValue(false);
    hasLocationDataPermission.mockResolvedValue(true);
    await expect(hasWeatherNetworkAccess()).resolves.toBe(false);
  });
});

describe('requestWeatherNetworkAccess', () => {
  it('requests hosts and locationInfo in one call', async () => {
    const request = vi
      .spyOn(browser.permissions, 'request')
      .mockImplementation(async () => true);
    await expect(requestWeatherNetworkAccess()).resolves.toBe(true);
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith({
      origins: [...FETCH_HOST_ORIGINS],
      data_collection: [LOCATION_DATA_PERMISSION],
    });
  });

  it('returns false when the combined request is denied', async () => {
    vi.spyOn(browser.permissions, 'request').mockImplementation(
      async () => false,
    );
    await expect(requestWeatherNetworkAccess()).resolves.toBe(false);
  });

  it('falls back to hosts-only when combined request throws', async () => {
    const request = vi.spyOn(browser.permissions, 'request');
    request
      .mockImplementationOnce(async () => {
        throw new Error('Unexpected property: data_collection');
      })
      .mockImplementationOnce(async () => true);
    await expect(requestWeatherNetworkAccess()).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith({
      origins: [...FETCH_HOST_ORIGINS],
    });
  });

  it('returns false when hosts-only fallback also throws', async () => {
    const request = vi.spyOn(browser.permissions, 'request');
    request
      .mockImplementationOnce(async () => {
        throw new Error('Unexpected property: data_collection');
      })
      .mockImplementationOnce(async () => {
        throw new Error('blocked');
      });
    await expect(requestWeatherNetworkAccess()).resolves.toBe(false);
  });
});
