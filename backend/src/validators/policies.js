import { z } from 'zod';

export const policyCreateSchema = z.object({
  slug: z.string().min(2).max(128),
  title: z.string().min(3).max(255),
  category: z.string().min(2).max(64).optional(),
  body: z.string().min(10).max(20000),
  status: z.enum(['draft', 'published']).optional()
});

export const policyUpdateSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  category: z.string().min(2).max(64).optional(),
  body: z.string().min(10).max(20000).optional(),
  status: z.enum(['draft', 'published']).optional()
});
