import { z } from 'zod';

export const approveResultSchema = z.object({
  approve: z.literal(true)
});

export const resolveDisputeSchema = z.object({
  status: z.enum(['resolved', 'rejected']),
  resolution: z.string().min(3)
});

export const setRoleSchema = z.object({
  role: z.enum(['admin', 'director', 'player', 'supervisor', 'referee', 'coach', 'fan', 'bettor', 'moderator', 'broadcaster'])
});

export const rejectResultSchema = z.object({
  reason: z.string().min(3).max(1000).optional()
});

export const updateTournamentSchema = z.object({
  name: z.string().min(3).max(128).optional(),
  format: z.enum(['league', 'knockout', 'group', 'hybrid']).optional(),
  entry_fee: z.number().nonnegative().optional(),
  prize_pool: z.number().nonnegative().optional(),
  rules: z.string().max(5000).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['draft', 'open', 'closed', 'ongoing', 'completed']).optional()
});

export const createMatchSchema = z.object({
  tournament_id: z.number().int().positive(),
  player1_id: z.number().int().positive(),
  player2_id: z.number().int().positive(),
  referee_id: z.number().int().positive().optional(),
  round: z.string().max(64).optional(),
  scheduled_at: z.string().min(3),
  match_fee: z.number().nonnegative(),
  odds_home: z.number().positive().optional(),
  odds_draw: z.number().positive().optional(),
  odds_away: z.number().positive().optional()
});

export const updateMatchSchema = z.object({
  scheduled_at: z.string().min(3).optional(),
  round: z.string().max(64).optional(),
  referee_id: z.number().int().positive().nullable().optional(),
  status: z.enum(['scheduled', 'played', 'submitted', 'confirmed', 'disputed', 'forfeit', 'approved']).optional(),
  match_fee: z.number().nonnegative().optional()
});

export const updateOddsSchema = z.object({
  odds_home: z.number().positive(),
  odds_draw: z.number().positive(),
  odds_away: z.number().positive()
});

const strongPassword = z.string().min(8).refine((value) => {
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  return hasUpper && hasLower && hasNumber && hasSymbol;
}, {
  message: 'weak_password'
});

export const resetUserPasswordSchema = z.object({
  new_password: strongPassword
});

export const settingsSchema = z.object({
  key: z.string().min(2).max(128),
  value: z.string().min(1).max(5000)
});

export const broadcastControlSchema = z.object({
  timer_mode: z.enum(['manual', 'auto']).optional(),
  phase: z.enum(['pre_match', 'first_half', 'half_time', 'second_half', 'extra_time', 'penalties', 'full_time']).optional(),
  clock: z.string().max(16).optional()
});

export const bettingStatusSchema = z.object({
  status: z.enum(['open', 'closed', 'suspended', 'voided'])
});

export const matchEventSchema = z.object({
  event_type: z.enum(['goal', 'red_card', 'yellow_card', 'penalty', 'kickoff', 'half_time', 'full_time', 'other']),
  side: z.enum(['home', 'away', 'neutral']).optional(),
  minute: z.number().int().min(0).max(200).optional(),
  description: z.string().max(255).optional()
});

export const liveStatsSchema = z.object({
  possession_home: z.number().int().min(0).max(100).optional(),
  possession_away: z.number().int().min(0).max(100).optional(),
  shots_home: z.number().int().min(0).optional(),
  shots_away: z.number().int().min(0).optional(),
  passes_home: z.number().int().min(0).optional(),
  passes_away: z.number().int().min(0).optional(),
  fouls_home: z.number().int().min(0).optional(),
  fouls_away: z.number().int().min(0).optional(),
  yellow_home: z.number().int().min(0).optional(),
  yellow_away: z.number().int().min(0).optional(),
  red_home: z.number().int().min(0).optional(),
  red_away: z.number().int().min(0).optional()
});

export const replaySchema = z.object({
  replay_url: z.string().url().optional(),
  highlights_url: z.string().url().optional()
});

export const chatSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  slow_mode_seconds: z.number().int().min(0).max(120).optional()
});

export const chatMuteSchema = z.object({
  user_id: z.number().int().positive().optional(),
  ip: z.string().min(3).max(64).optional(),
  minutes: z.number().int().min(1).max(1440).optional(),
  reason: z.string().max(255).optional()
}).refine((data) => data.user_id || data.ip, {
  message: 'user_or_ip_required'
});

export const featuredMatchSchema = z.object({
  match_id: z.number().int().positive()
});

export const premiumSchema = z.object({
  is_premium: z.boolean()
});

export const tournamentEntryStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'approved', 'withdrawn'])
});
