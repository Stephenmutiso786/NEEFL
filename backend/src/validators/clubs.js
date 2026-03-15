import { z } from 'zod';

export const clubCreateSchema = z.object({
  name: z.string().min(3).max(128),
  slug: z.string().min(3).max(128).optional(),
  description: z.string().max(5000).optional(),
  logo_url: z.string().url().optional(),
  region: z.string().max(64).optional()
});
