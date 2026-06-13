import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  phone: string;
  telegramId: string;
}

const PUBLIC_PATHS = [
  '/api/v1/auth/telegram-init',
  '/api/v1/auth/verify-code',
  '/api/v1/sensors/upload',
  '/api/v1/marketplace/seed-demo',
  '/api/v1/seed-demo',
  '/api/v1/finance/seed-demo',
  '/api/v1/analytics/seed-demo',
  '/api/v1/farm/seed-demo',
  '/health',
];

const PUBLIC_PREFIXES = ['/api/v1/weather'];

const PUBLIC_GET_PREFIXES = ['/api/v1/marketplace', '/api/v1/logistics', '/api/v1/farm'];

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const path = req.originalUrl.split('?')[0];

  if (PUBLIC_PATHS.some((p) => path === p || path.endsWith(p))) {
    return next();
  }

  if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) {
    return next();
  }

  if (req.method === 'GET' && PUBLIC_GET_PREFIXES.some((p) => path.startsWith(p))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    (req as any).user = payload;
    req.headers['x-user-id'] = payload.userId;
    req.headers['x-user-phone'] = payload.phone;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
