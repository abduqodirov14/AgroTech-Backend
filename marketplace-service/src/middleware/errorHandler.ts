import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  logger.error('Unhandled error', {
    message: err.message,
    path: req.path,
    stack: err.stack,
  });

  return res.status(500).json({ success: false, error: 'Internal server error' });
};
