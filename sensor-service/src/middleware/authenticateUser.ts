import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  phone: string;
  telegramId: string;
}

export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    (req as any).user = { userId };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as JwtPayload;
    (req as any).user = { userId: payload.userId, phone: payload.phone };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
