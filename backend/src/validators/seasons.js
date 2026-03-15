import { z } from 'zod';

export const seasonCreateSchema = z.object({
  name: z.string().min(3).max(128),
  entry_fee: z.number().nonnegative(),
  prize_pool: z.number().nonnegative(),
  start_date: z.string().min(4).max(32),
  end_date: z.string().min(4).max(32),
  status: z.enum(['draft', 'active', 'completed']).optional()
});

export const seasonUpdateSchema = z.object({
  name: z.string().min(3).max(128).optional(),
  entry_fee: z.number().nonnegative().optional(),
  prize_pool: z.number().nonnegative().optional(),
  start_date: z.string().min(4).max(32).optional(),
  end_date: z.string().min(4).max(32).optional(),
  status: z.enum(['draft', 'active', 'completed']).optional()
});
