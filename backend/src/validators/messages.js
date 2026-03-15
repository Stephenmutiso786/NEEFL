import { z } from 'zod';

export const messageSendSchema = z.object({
  message: z.string().min(1).max(2000)
});

export const threadQuerySchema = z.object({
  userId: z.string().regex(/^\d+$/)
});
