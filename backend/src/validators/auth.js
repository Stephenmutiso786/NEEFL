import { z } from 'zod';

const strongPassword = z.string().min(8).refine((value) => {
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  return hasUpper && hasLower && hasNumber && hasSymbol;
}, {
  message: 'weak_password'
});

export const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  password: strongPassword,
  role: z.enum(['player', 'supervisor', 'referee', 'fan', 'bettor']).optional(),
  gamer_tag: z.string().min(3).max(64),
  real_name: z.string().max(128).optional(),
  country: z.string().max(64).optional(),
  region: z.string().max(64).optional(),
  preferred_team: z.string().max(64).optional()
}).refine((data) => data.email || data.phone, {
  message: 'email_or_phone_required'
});

export const loginSchema = z.object({
  email: z.string().min(3).optional(),
  phone: z.string().min(7).optional(),
  password: z.string().min(8),
  security_code: z.string().min(3).optional(),
  remember_me: z.boolean().optional()
}).refine((data) => data.email || data.phone, {
  message: 'email_or_phone_required'
});

export const passwordResetRequestSchema = z.object({
  email: z.string().min(3).optional(),
  phone: z.string().min(7).optional()
}).refine((data) => data.email || data.phone, {
  message: 'email_or_phone_required'
});

export const passwordResetSchema = z.object({
  token: z.string().min(10),
  new_password: strongPassword
});

export const verificationRequestSchema = z.object({
  type: z.enum(['email', 'phone'])
});

export const verificationConfirmSchema = z.object({
  type: z.enum(['email', 'phone']),
  token: z.string().min(4)
});
