import express from 'express';
import cors from 'cors';
import sensorRoutes from './api/routes/sensorRoutes';
import { logger } from './utils/logger';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.use('/api/v1/sensors', sensorRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'sensor-service' });
});

export default app;
