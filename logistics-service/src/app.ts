import express from 'express';
import cors from 'cors';
import logisticsRoutes from './routes/logisticsRoutes';
import driverPublicRoutes from './routes/driverPublicRoutes';
import { logger } from './utils/logger';
import { env } from './config/env';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', { method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - start });
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'logistics-service', version: '2.0.0' });
});

// API routes
app.use('/api/v1/logistics', logisticsRoutes);

// Public driver page (no authentication required)
app.use('/driver-page', driverPublicRoutes);

export default app;
