import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileToWallpaperDataUrl } from './wallpaperImage';
import { MAX_WALLPAPER_DATA_URL_LENGTH } from '../schemas/settings';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockFile(type: string, dataUrl: string): File {
  return {
    type,
    // Not used when FileReader is stubbed.
  } as File;
}

describe('fileToWallpaperDataUrl', () => {
  it('rejects non-image files', async () => {
    await expect(
      fileToWallpaperDataUrl(mockFile('text/plain', '')),
    ).resolves.toEqual({ ok: false, error: 'type' });
  });

  it('returns small images as-is', async () => {
    const dataUrl = 'data:image/png;base64,abc';
    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      readAsDataURL() {
        this.result = dataUrl;
        this.onload?.();
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    await expect(
      fileToWallpaperDataUrl(mockFile('image/png', dataUrl)),
    ).resolves.toEqual({ ok: true, dataUrl });
  });

  it('returns read errors from FileReader failures', async () => {
    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      error = new Error('fail');
      readAsDataURL() {
        this.onerror?.();
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    await expect(
      fileToWallpaperDataUrl(mockFile('image/png', '')),
    ).resolves.toEqual({ ok: false, error: 'read' });
  });

  it('compresses oversized images until under the schema limit', async () => {
    const huge = `data:image/png;base64,${'a'.repeat(MAX_WALLPAPER_DATA_URL_LENGTH)}`;
    const compressed = 'data:image/jpeg;base64,ok';

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      readAsDataURL() {
        this.result = huge;
        this.onload?.();
      }
    }

    class MockImage {
      width = 4000;
      height = 3000;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
      toDataURL: vi.fn(() => compressed),
    };

    vi.stubGlobal('FileReader', MockFileReader);
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return canvas;
        throw new Error(`unexpected element ${tag}`);
      }),
    });

    await expect(
      fileToWallpaperDataUrl(mockFile('image/png', huge)),
    ).resolves.toEqual({ ok: true, dataUrl: compressed });
    expect(canvas.toDataURL).toHaveBeenCalled();
  });

  it('reports too-large when compression cannot shrink enough', async () => {
    const huge = `data:image/png;base64,${'a'.repeat(MAX_WALLPAPER_DATA_URL_LENGTH)}`;
    const stillHuge = `data:image/jpeg;base64,${'b'.repeat(MAX_WALLPAPER_DATA_URL_LENGTH)}`;

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      readAsDataURL() {
        this.result = huge;
        this.onload?.();
      }
    }

    class MockImage {
      width = 4000;
      height = 3000;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('FileReader', MockFileReader);
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: vi.fn() }),
        toDataURL: () => stillHuge,
      })),
    });

    await expect(
      fileToWallpaperDataUrl(mockFile('image/png', huge)),
    ).resolves.toEqual({ ok: false, error: 'too-large' });
  });
});
