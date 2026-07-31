import { z } from 'zod';

/** Max length for wallpaper data:image URLs. */
export const MAX_WALLPAPER_DATA_URL_LENGTH = 1_500_000;

function isAllowedWallpaperValue(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return true;
    }
    if (parsed.protocol === 'data:') {
      if (!/^data:image\/[a-z0-9.+-]+/i.test(value)) return false;
      return value.length <= MAX_WALLPAPER_DATA_URL_LENGTH;
    }
    return false;
  } catch {
    return false;
  }
}

const BackgroundFitSchema = z.enum(['cover', 'contain', 'tile']).default('cover');

export const BackgroundSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('color'),
    value: z.string().min(1),
  }),
  z.object({
    type: z.literal('image'),
    value: z.string().min(1).refine(isAllowedWallpaperValue, {
      message: 'Wallpaper must be http(s) or a data:image URL',
    }),
    fit: BackgroundFitSchema,
  }),
  z.object({
    type: z.literal('bing'),
    fit: BackgroundFitSchema,
    cachedUrl: z
      .string()
      .min(1)
      .refine(isAllowedWallpaperValue, {
        message: 'Cached Bing URL must be http(s) or a data:image URL',
      })
      .optional(),
    /** UTC calendar day `YYYY-MM-DD` when `cachedUrl` was fetched. */
    cachedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
]);

export type BackgroundFit = z.infer<typeof BackgroundFitSchema>;

export const SettingsSchema = z.object({
  gridSize: z.number().int().min(4).max(64).default(16),
  snapEnabled: z.boolean().default(false),
  snapThreshold: z.number().finite().positive().default(8),
  canvasMinWidth: z.number().finite().positive().default(1200),
  canvasMinHeight: z.number().finite().positive().default(800),
  iconSize: z.number().int().min(16).max(64).default(40),
  fontSize: z.number().int().min(10).max(24).default(15),
  background: BackgroundSchema.default({ type: 'color', value: '#1a1d23' }),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type Background = z.infer<typeof BackgroundSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
