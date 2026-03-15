import { z } from 'zod';

export const friendRequestSchema = z.object({
  user_id: z.number().int().positive()
});

export const followSchema = z.object({
  user_id: z.number().int().positive()
});

export const privacySchema = z.object({
  privacy_profile: z.enum(['public', 'friends', 'private']).optional(),
  privacy_presence: z.boolean().optional(),
  privacy_friend_requests: z.boolean().optional(),
  privacy_follow: z.boolean().optional()
});
