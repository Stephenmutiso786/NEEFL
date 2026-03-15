import { z } from 'zod';

export const submitResultSchema = z.object({
  score1: z.number().int().min(0),
  score2: z.number().int().min(0),
  video_url: z.string().url().optional(),
  stream_url: z.string().url().optional()
});

export const confirmResultSchema = z.object({
  confirm: z.literal(true)
});

export const disputeSchema = z.object({
  reason: z.string().min(5)
});

export const liveDataSchema = z.object({
  score1: z.number().int().min(0),
  score2: z.number().int().min(0),
  clock: z.string().max(16).optional()
});
