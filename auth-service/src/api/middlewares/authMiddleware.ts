import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken } from '../../services/jwtService';
import { findUserById } from '../../services/userService';
import { AuthenticationError } from '../../utils/errors';
import { User } from '../../models/User';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * JWT authentication middleware
 * Protected route'lar uchun
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Token'ni verify qilish
    const payload = verifyToken(token);

    // User'ni database'dan olish
    const user = await findUserById(payload.userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // req.user ga qo'shish
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
