import { z } from 'zod';

export const supportTicketSchema = z.object({
  subject: z.string().min(3).max(255),
  message: z.string().min(5).max(5000),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().min(7).optional()
});

export const resolveTicketSchema = z.object({
  status: z.enum(['in_review', 'closed']),
  notes: z.string().min(3).max(2000).optional()
});
