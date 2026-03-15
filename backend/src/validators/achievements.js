import { z } from 'zod';

export const achievementCreateSchema = z.object({
  name: z.string().min(2).max(128),
  description: z.string().max(5000).optional(),
  icon_url: z.string().url().optional(),
  points: z.number().int().min(0).max(10000).optional()
});

export const achievementAwardSchema = z.object({
  user_id: z.number().int().positive()
});
