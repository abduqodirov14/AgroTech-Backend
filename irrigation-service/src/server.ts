import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';

const server = app.listen(config.port, () => {
  logger.info(`🚀 Irrigation Service running on port ${config.port}`);
  logger.info(`📊 API available at http://localhost:${config.port}/api/v1/irrigation`);
  logger.info(`🔌 MQTT Broker: ${config.mqtt.broker}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
  process.exit(0);
});
