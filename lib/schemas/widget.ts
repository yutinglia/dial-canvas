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
  fontSize: z.number().int().min(12).max(64).optional(),
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
  iconSize: z.number().int().min(16).max(96).optional(),
});

export const MAX_NOTE_TEXT_LENGTH = 4000;
export const MAX_TODO_ITEMS = 50;
export const MAX_TODO_ITEM_TEXT_LENGTH = 200;
export const MAX_HOLIDAYS_LIMIT = 20;

export const NoteWidgetSchema = WidgetRectSchema.extend({
  type: z.literal('note'),
  title: z.string().max(120).default(''),
  text: z.string().max(MAX_NOTE_TEXT_LENGTH).default(''),
});

export const TodoItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().max(MAX_TODO_ITEM_TEXT_LENGTH),
  done: z.boolean().default(false),
});

export const TodoWidgetSchema = WidgetRectSchema.extend({
  type: z.literal('todo'),
  title: z.string().max(120).default(''),
  items: z.array(TodoItemSchema).max(MAX_TODO_ITEMS).default([]),
});

export const CalendarWidgetSchema = WidgetRectSchema.extend({
  type: z.literal('calendar'),
  weekStartsOn: z.enum(['sunday', 'monday']).default('monday'),
});

export const HolidaysWidgetSchema = WidgetRectSchema.extend({
  type: z.literal('holidays'),
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase())
    .optional(),
  limit: z.number().int().min(1).max(MAX_HOLIDAYS_LIMIT).default(8),
});

export const WallpaperInfoWidgetSchema = WidgetRectSchema.extend({
  type: z.literal('wallpaperInfo'),
  showCopyright: z.boolean().default(true),
});

export const WidgetSchema = z.discriminatedUnion('type', [
  ClockWidgetSchema,
  WeatherWidgetSchema,
  NoteWidgetSchema,
  TodoWidgetSchema,
  CalendarWidgetSchema,
  HolidaysWidgetSchema,
  WallpaperInfoWidgetSchema,
]);

export type WeatherLocation = z.infer<typeof WeatherLocationSchema>;
export type ClockWidget = z.infer<typeof ClockWidgetSchema>;
export type WeatherWidget = z.infer<typeof WeatherWidgetSchema>;
export type NoteWidget = z.infer<typeof NoteWidgetSchema>;
export type TodoItem = z.infer<typeof TodoItemSchema>;
export type TodoWidget = z.infer<typeof TodoWidgetSchema>;
export type CalendarWidget = z.infer<typeof CalendarWidgetSchema>;
export type HolidaysWidget = z.infer<typeof HolidaysWidgetSchema>;
export type WallpaperInfoWidget = z.infer<typeof WallpaperInfoWidgetSchema>;
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
