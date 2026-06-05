import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { logger, logRequest } from './utils/logger';
import { AppError } from './utils/errors';
import authRoutes from './api/routes/authRoutes';

// Express app yaratish
export const app: Application = express();

/**
 * Middlewares
 */

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logger (Morgan + Winston)
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

// Custom request/response logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(req.method, req.originalUrl, res.statusCode, duration);
  });
  
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
  });
});

/**
 * API Routes
 */
app.use('/api/v1/auth', authRoutes);

/**
 * 404 Handler
 */
app.use((req: Request, res: Response) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

/**
 * Global error handler
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.error(`${err.statusCode} - ${err.message}`, {
      path: req.originalUrl,
      method: req.method,
    });

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Unknown errors
  logger.error('500 - Internal Server Error', {
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});
