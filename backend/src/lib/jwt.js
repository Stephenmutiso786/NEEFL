import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(payload, options = {}) {
  const expiresIn = options.expiresIn ?? env.jwtExpiresIn;
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
