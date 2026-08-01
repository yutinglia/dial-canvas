import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  FETCH_HOST_ORIGINS,
  hasFetchHostPermission,
  requestFetchHostPermission,
} from './hostPermission';

beforeEach(() => {
  vi.restoreAllMocks();
  fakeBrowser.reset();
});

describe('hasFetchHostPermission', () => {
  it('checks the declared host origins', async () => {
    const contains = vi
      .spyOn(browser.permissions, 'contains')
      .mockImplementation(async () => true);
    await expect(hasFetchHostPermission()).resolves.toBe(true);
    expect(contains).toHaveBeenCalledWith({
      origins: [...FETCH_HOST_ORIGINS],
    });
  });

  it('returns false when contains throws', async () => {
    vi.spyOn(browser.permissions, 'contains').mockRejectedValue(
      new Error('unavailable'),
    );
    await expect(hasFetchHostPermission()).resolves.toBe(false);
  });
});

describe('requestFetchHostPermission', () => {
  it('calls request immediately without contains', async () => {
    const contains = vi.spyOn(browser.permissions, 'contains');
    const request = vi
      .spyOn(browser.permissions, 'request')
      .mockImplementation(async () => true);
    await expect(requestFetchHostPermission()).resolves.toBe(true);
    expect(contains).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith({
      origins: [...FETCH_HOST_ORIGINS],
    });
  });

  it('returns the request result when denied', async () => {
    vi.spyOn(browser.permissions, 'request').mockImplementation(
      async () => false,
    );
    await expect(requestFetchHostPermission()).resolves.toBe(false);
  });

  it('returns false when request throws', async () => {
    vi.spyOn(browser.permissions, 'request').mockRejectedValue(
      new Error('blocked'),
    );
    await expect(requestFetchHostPermission()).resolves.toBe(false);
  });
});
