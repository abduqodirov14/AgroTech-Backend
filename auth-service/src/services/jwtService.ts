import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';

export interface JwtPayload {
  userId: string;
  phone: string;
  telegramId: string;
}

/**
 * JWT token yaratish
 */
export const generateToken = (user: User): string => {
  const payload: JwtPayload = {
    userId: user.id,
    phone: user.phone,
    telegramId: user.telegramId.toString(),
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * JWT token tekshirish
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Authorization header'dan token olish
 */
export const extractToken = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};
