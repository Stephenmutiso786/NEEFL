import { z } from 'zod';

export const markReadSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1)
});

export const sendNotificationSchema = z.object({
  user_id: z.number().int().positive(),
  type: z.string().min(2).max(64),
  message: z.string().min(1).max(1000)
});
