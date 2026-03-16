import { z } from 'zod';

export const submitLiveStreamSchema = z.object({
  stream_platform: z.enum(['youtube', 'twitch', 'facebook']),
  stream_link: z.string().url(),
  stream_platform_secondary: z.enum(['youtube', 'twitch', 'facebook']).optional(),
  stream_link_secondary: z.string().url().optional(),
  stream_link_hd: z.string().url().optional(),
  stream_link_sd: z.string().url().optional(),
  stream_link_audio: z.string().url().optional(),
  access_level: z.enum(['public', 'registered', 'premium']).optional()
}).refine((data) => {
  if (data.stream_platform_secondary && !data.stream_link_secondary) {
    return false;
  }
  return true;
}, {
  message: 'secondary_stream_requires_link'
});

export const reviewLiveStreamSchema = z.object({
  notes: z.string().max(2000).optional()
});
