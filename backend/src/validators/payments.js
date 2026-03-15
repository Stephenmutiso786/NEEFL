import { z } from 'zod';

export const stkPushSchema = z.object({
  amount: z.number().positive(),
  phone: z.string().min(7),
  type: z.enum(['entry_fee', 'wallet_topup']).optional(),
  tournament_id: z.number().optional(),
  account_reference: z.string().min(2).optional(),
  transaction_desc: z.string().min(2).optional()
});

export const payoutSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive(),
  phone: z.string().min(7),
  remarks: z.string().optional(),
  occasion: z.string().optional()
});
