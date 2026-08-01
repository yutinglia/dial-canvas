import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  LOCATION_DATA_PERMISSION,
  hasLocationDataPermission,
  requestLocationDataPermission,
  supportsDataCollectionPermissions,
} from './weatherPermission';

beforeEach(() => {
  vi.restoreAllMocks();
  fakeBrowser.reset();
});

describe('supportsDataCollectionPermissions', () => {
  it('is true when getAll includes data_collection', async () => {
    vi.spyOn(browser.permissions, 'getAll').mockImplementation(async () => ({
      origins: [],
      permissions: [],
      data_collection: [],
    }));
    await expect(supportsDataCollectionPermissions()).resolves.toBe(true);
  });

  it('is false when data_collection key is absent', async () => {
    vi.spyOn(browser.permissions, 'getAll').mockImplementation(async () => ({
      origins: [],
      permissions: [],
    }));
    await expect(supportsDataCollectionPermissions()).resolves.toBe(false);
  });

  it('is false when getAll throws', async () => {
    vi.spyOn(browser.permissions, 'getAll').mockRejectedValue(
      new Error('unavailable'),
    );
    await expect(supportsDataCollectionPermissions()).resolves.toBe(false);
  });
});

describe('hasLocationDataPermission', () => {
  it('returns true when data collection is unsupported', async () => {
    vi.spyOn(browser.permissions, 'getAll').mockImplementation(async () => ({
      origins: [],
      permissions: [],
    }));
    const contains = vi.spyOn(browser.permissions, 'contains');
    await expect(hasLocationDataPermission()).resolves.toBe(true);
    expect(contains).not.toHaveBeenCalled();
  });

  it('checks locationInfo when supported', async () => {
    vi.spyOn(browser.permissions, 'getAll').mockImplementation(async () => ({
      origins: [],
      permissions: [],
      data_collection: [],
    }));
    const contains = vi
      .spyOn(browser.permissions, 'contains')
      .mockImplementation(async () => true);
    await expect(hasLocationDataPermission()).resolves.toBe(true);
    expect(contains).toHaveBeenCalledWith({
      data_collection: [LOCATION_DATA_PERMISSION],
    });
  });

  it('returns false when contains throws', async () => {
    vi.spyOn(browser.permissions, 'getAll').mockImplementation(async () => ({
      origins: [],
      permissions: [],
      data_collection: [],
    }));
    vi.spyOn(browser.permissions, 'contains').mockRejectedValue(
      new Error('blocked'),
    );
    await expect(hasLocationDataPermission()).resolves.toBe(false);
  });
});

describe('requestLocationDataPermission', () => {
  it('calls request immediately without getAll or contains', async () => {
    const getAll = vi.spyOn(browser.permissions, 'getAll');
    const contains = vi.spyOn(browser.permissions, 'contains');
    const request = vi
      .spyOn(browser.permissions, 'request')
      .mockImplementation(async () => true);
    await expect(requestLocationDataPermission()).resolves.toBe(true);
    expect(getAll).not.toHaveBeenCalled();
    expect(contains).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith({
      data_collection: [LOCATION_DATA_PERMISSION],
    });
  });

  it('returns false when denied', async () => {
    vi.spyOn(browser.permissions, 'request').mockImplementation(
      async () => false,
    );
    await expect(requestLocationDataPermission()).resolves.toBe(false);
  });

  it('returns false on user-gesture errors', async () => {
    vi.spyOn(browser.permissions, 'request').mockRejectedValue(
      new Error('permissions.request may only be called from a user input handler'),
    );
    await expect(requestLocationDataPermission()).resolves.toBe(false);
  });

  it('treats unsupported data_collection throws as allowed', async () => {
    vi.spyOn(browser.permissions, 'request').mockRejectedValue(
      new Error('Unexpected property: data_collection'),
    );
    await expect(requestLocationDataPermission()).resolves.toBe(true);
  });
});
