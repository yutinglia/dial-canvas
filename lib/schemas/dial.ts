import { z } from 'zod';

const urlString = z.string().refine(
  (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid URL' },
);

export const DialSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: urlString,
  faviconUrl: z.string().optional(),
  iconSize: z.number().int().min(16).max(64).optional(),
  fontSize: z.number().int().min(10).max(24).optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().min(64),
  height: z.number().finite().min(64),
});

export type Dial = z.infer<typeof DialSchema>;
