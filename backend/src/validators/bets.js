import { z } from 'zod';

export const placeBetSchema = z.object({
  match_id: z.number().positive(),
  amount: z.number().positive(),
  choice: z.enum(['home', 'draw', 'away'])
});
