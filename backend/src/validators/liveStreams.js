import { z } from 'zod';

export const submitLiveStreamSchema = z.object({
  stream_platform: z.enum(['youtube', 'twitch', 'facebook']),
  stream_link: z.string().url(),
  stream_link_hd: z.string().url().optional(),
  stream_link_sd: z.string().url().optional(),
  stream_link_audio: z.string().url().optional(),
  access_level: z.enum(['public', 'registered', 'premium']).optional()
});

export const reviewLiveStreamSchema = z.object({
  notes: z.string().max(2000).optional()
});
