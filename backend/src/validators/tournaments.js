import { z } from 'zod';

export const createTournamentSchema = z.object({
  name: z.string().min(3).max(128),
  format: z.enum(['league', 'knockout', 'group', 'hybrid']),
  entry_fee: z.number().nonnegative(),
  prize_pool: z.number().nonnegative(),
  rules: z.string().max(5000).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  season_id: z.number().optional()
});

export const joinTournamentSchema = z.object({
  tournament_id: z.number().optional()
});

export const scheduleSchema = z.object({
  start_datetime: z.string().optional(),
  match_time: z.string().optional(),
  days_between_rounds: z.number().int().min(0).optional()
});
