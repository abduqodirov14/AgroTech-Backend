import express from 'express';
import cors from 'cors';
import marketplaceRoutes from './routes/marketplaceRoutes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import * as seedCtrl from './controllers/seedController';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      userId: req.headers['x-user-id'],
    });
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'marketplace-service', version: '2.0.0' });
});

// Main marketplace API
app.use('/api/v1/marketplace', marketplaceRoutes);

// Legacy seed path (frontend backward compat)
app.post('/api/v1/seed-demo', (req, res, next) => seedCtrl.seedDemo(req, res, next));

app.use(errorHandler);

export default app;
