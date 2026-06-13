import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

export interface AuthUser {
  userId: string;
  phone: string;
  telegramId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const gatewayUserId = req.headers['x-user-id'] as string;
  if (gatewayUserId) {
    req.user = {
      userId: gatewayUserId,
      phone: (req.headers['x-user-phone'] as string) || '',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError());
  }

  try {
    const payload = jwt.verify(authHeader.substring(7), env.JWT_SECRET) as AuthUser & { userId: string };
    req.user = {
      userId: payload.userId,
      phone: payload.phone,
      telegramId: payload.telegramId,
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const gatewayUserId = req.headers['x-user-id'] as string;
  if (gatewayUserId) {
    req.user = { userId: gatewayUserId, phone: (req.headers['x-user-phone'] as string) || '' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.substring(7), env.JWT_SECRET) as AuthUser & { userId: string };
      req.user = { userId: payload.userId, phone: payload.phone };
    } catch {
      // ignore
    }
  }
  next();
};
