import { z } from 'zod';

export const updateProfileSchema = z.object({
  gamer_tag: z.string().min(3).max(64).optional(),
  real_name: z.string().max(128).optional(),
  country: z.string().max(64).optional(),
  region: z.string().max(64).optional(),
  preferred_team: z.string().max(64).optional()
});
