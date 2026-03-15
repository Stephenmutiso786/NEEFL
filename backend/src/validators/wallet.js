import { z } from 'zod';

export const withdrawRequestSchema = z.object({
  amount: z.number().positive(),
  phone: z.string().min(7),
  notes: z.string().max(2000).optional()
});

export const reviewWithdrawSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(2000).optional()
});
