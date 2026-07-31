import { z } from 'zod';

export const BackgroundSchema = z.object({
  type: z.literal('color'),
  value: z.string().min(1),
});

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
