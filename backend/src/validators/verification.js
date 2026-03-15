import { z } from 'zod';

export const verificationDetailsSchema = z.object({
  full_name: z.string().min(3).max(128),
  id_type: z.enum(['national_id', 'passport', 'drivers_license']),
  id_number: z.string().min(4).max(64),
  country: z.string().min(2).max(64),
  date_of_birth: z.string().min(4).max(32),
  phone: z.string().min(6).max(32).optional()
});

export const verificationReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(2000).optional()
});
