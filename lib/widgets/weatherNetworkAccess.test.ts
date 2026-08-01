import { beforeEach, describe, expect, it, vi } from 'vitest';

const hasFetchHostPermission = vi.fn();
const requestFetchHostPermission = vi.fn();
const hasLocationDataPermission = vi.fn();
const requestLocationDataPermission = vi.fn();

vi.mock('../dials/hostPermission', () => ({
  hasFetchHostPermission: (...args: unknown[]) =>
    hasFetchHostPermission(...args),
  requestFetchHostPermission: (...args: unknown[]) =>
    requestFetchHostPermission(...args),
}));

vi.mock('./weatherPermission', () => ({
  hasLocationDataPermission: (...args: unknown[]) =>
    hasLocationDataPermission(...args),
  requestLocationDataPermission: (...args: unknown[]) =>
    requestLocationDataPermission(...args),
}));

import {
  hasWeatherNetworkAccess,
  requestWeatherNetworkAccess,
} from './weatherNetworkAccess';

beforeEach(() => {
  vi.clearAllMocks();
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
  it('stops when location data is denied', async () => {
    requestLocationDataPermission.mockResolvedValue(false);
    await expect(requestWeatherNetworkAccess()).resolves.toBe(false);
    expect(requestFetchHostPermission).not.toHaveBeenCalled();
  });

  it('requests hosts after location data is granted', async () => {
    requestLocationDataPermission.mockResolvedValue(true);
    requestFetchHostPermission.mockResolvedValue(true);
    await expect(requestWeatherNetworkAccess()).resolves.toBe(true);
    expect(requestFetchHostPermission).toHaveBeenCalledOnce();
  });

  it('returns false when hosts are denied', async () => {
    requestLocationDataPermission.mockResolvedValue(true);
    requestFetchHostPermission.mockResolvedValue(false);
    await expect(requestWeatherNetworkAccess()).resolves.toBe(false);
  });
});
