import rateLimit from 'express-rate-limit';

export function createRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message || 'too_many_requests' }
  });
}
