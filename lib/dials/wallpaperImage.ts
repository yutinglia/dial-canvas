import { MAX_WALLPAPER_DATA_URL_LENGTH } from '../schemas/settings';

const MAX_EDGE_PX = 1920;

export type WallpaperImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: 'type' | 'too-large' | 'read' };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Unexpected FileReader result.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image decode failed.'));
    image.src = dataUrl;
  });
}

function canvasToJpegDataUrl(
  image: HTMLImageElement,
  maxEdge: number,
  quality: number,
): string {
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Convert an uploaded image file to a wallpaper data URL under the schema size
 * limit, downscaling/recompressing when needed.
 */
export async function fileToWallpaperDataUrl(
  file: File,
): Promise<WallpaperImageResult> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'type' };
  }

  let dataUrl: string;
  try {
    dataUrl = await readFileAsDataUrl(file);
  } catch {
    return { ok: false, error: 'read' };
  }

  if (!/^data:image\//i.test(dataUrl)) {
    return { ok: false, error: 'type' };
  }

  if (dataUrl.length <= MAX_WALLPAPER_DATA_URL_LENGTH) {
    return { ok: true, dataUrl };
  }

  try {
    const image = await loadImage(dataUrl);
    const qualities = [0.85, 0.7, 0.55, 0.4];
    const edges = [MAX_EDGE_PX, 1280, 960];

    for (const edge of edges) {
      for (const quality of qualities) {
        const compressed = canvasToJpegDataUrl(image, edge, quality);
        if (compressed.length <= MAX_WALLPAPER_DATA_URL_LENGTH) {
          return { ok: true, dataUrl: compressed };
        }
      }
    }
  } catch {
    return { ok: false, error: 'too-large' };
  }

  return { ok: false, error: 'too-large' };
}
