/**
 * @file       app.ts
 * @module     FintechService
 * @description Express application setup, mounting routes and global middleware.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import financeRouter from './routes/financeRoutes';
import creditRouter from './routes/creditRoutes';
import fintechLogger from './utils/logger';
import { DomainError } from './utils/errors';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  fintechLogger.info(`Incoming request ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/v1/finance', financeRouter);
app.use('/api/v1/credit', creditRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', service: 'fintech-service' });
});

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof DomainError) {
    fintechLogger.warn(`Domain exception processed: ${error.message}`, {
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

  fintechLogger.error('Unhandled internal server error', {
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
