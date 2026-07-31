import { z } from 'zod';
import {
  isDialBackgroundColor,
  normalizeDialBackgroundColor,
  normalizeDialBackgroundOpacity,
} from './dial';

const backgroundColorString = z.string().refine(isDialBackgroundColor, {
  message: 'Background color must be a #rrggbb hex value',
});

const WidgetRectSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().min(64),
  height: z.number().finite().min(64),
  backgroundColor: backgroundColorString.optional(),
  backgroundOpacity: z.number().finite().min(0).max(1).optional(),
});

export const WeatherLocationSchema = z.object({
  name: z.string().min(1),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const ClockWidgetSchema = WidgetRectSchema.extend({
  type: z.literal('clock'),
  format: z.enum(['12h', '24h']).default('24h'),
  showSeconds: z.boolean().default(false),
  showDate: z.boolean().default(true),
});

export const WeatherWidgetSchema = WidgetRectSchema.extend({
  type: z.literal('weather'),
  units: z.enum(['metric', 'imperial']).default('metric'),
  location: WeatherLocationSchema.optional(),
});

export const WidgetSchema = z.discriminatedUnion('type', [
  ClockWidgetSchema,
  WeatherWidgetSchema,
]);

export type WeatherLocation = z.infer<typeof WeatherLocationSchema>;
export type ClockWidget = z.infer<typeof ClockWidgetSchema>;
export type WeatherWidget = z.infer<typeof WeatherWidgetSchema>;
export type Widget = z.infer<typeof WidgetSchema>;
export type WidgetType = Widget['type'];

export function normalizeWidgetBackgroundColor(
  value: string | undefined,
): string | undefined {
  return normalizeDialBackgroundColor(value);
}

export function normalizeWidgetBackgroundOpacity(
  value: number | undefined | null,
): number | undefined {
  return normalizeDialBackgroundOpacity(value);
}
