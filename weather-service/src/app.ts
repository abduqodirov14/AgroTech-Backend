import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { logger, logRequest } from './utils/logger';
import weatherRoutes from './api/routes/weatherRoutes';
import historyRoutes from './api/routes/historyRoutes';

export const app: Application = express();

app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(req.method, req.originalUrl, res.statusCode, duration);
  });
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'weather-service',
  });
});

app.use('/api/v1', weatherRoutes);
app.use('/api/v1', historyRoutes);

app.use((req: Request, res: Response) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
