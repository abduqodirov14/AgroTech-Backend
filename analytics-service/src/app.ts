/**
 * @file       app.ts
 * @module     AnalyticsService
 * @description Express application setup, mounting routes and global middleware.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import analyticsRouter from './routes/analyticsRoutes';
import analyticsLogger from './utils/logger';
import { DomainError } from './utils/errors';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  analyticsLogger.info(`Incoming request ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/v1/analytics', analyticsRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', service: 'analytics-service' });
});

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof DomainError) {
    analyticsLogger.warn(`Domain exception processed: ${error.message}`, {
      statusCode: error.statusCode,
      url: req.originalUrl,
    });
    res.status(error.statusCode).json({
      success: false,
      error: error.constructor.name,
      message: error.message,
    });
    return;
  }

  analyticsLogger.error('Unhandled internal server error', {
    errorMessage: error.message,
    stackTrace: error.stack,
    url: req.originalUrl,
  });

  res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: 'An unexpected internal error occurred on the server.',
  });
});

export default app;
