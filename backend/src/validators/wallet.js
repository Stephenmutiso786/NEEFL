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

export const topupRequestSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['manual', 'mpesa']).optional(),
  reference: z.string().max(128).optional(),
  sender_name: z.string().max(128).optional(),
  phone: z.string().min(6).max(32).optional(),
  receipt_url: z.string().url().optional(),
  notes: z.string().max(2000).optional()
});

export const reviewTopupSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(2000).optional()
});

export const adminCreditSchema = z.object({
  user_id: z.number().positive().optional(),
  email: z.string().email().optional(),
  gamer_tag: z.string().max(64).optional(),
  amount: z.number().positive(),
  method: z.enum(['manual', 'mpesa']).optional(),
  reference: z.string().max(128).optional(),
  sender_name: z.string().max(128).optional(),
  phone: z.string().min(6).max(32).optional(),
  receipt_url: z.string().url().optional(),
  notes: z.string().max(2000).optional()
}).refine((data) => data.user_id || data.email || data.gamer_tag, {
  message: 'user_identifier_required'
});
