import 'dotenv/config';
import { app } from './src/app';
import { env } from './src/config/env';
import { logger } from './src/utils/logger';

const startServer = async () => {
  try {
    app.listen(env.PORT, () => {
      logger.info(`🚀 Weather Service running on port ${env.PORT}`);
      logger.info(`📡 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
      logger.info(`🌤️  Weather API: http://localhost:${env.PORT}/api/v1/weather`);
      logger.info(`🌱 Soil API: http://localhost:${env.PORT}/api/v1/soil`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server', { error });
    process.exit(1);
  }
};

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} signal received - starting graceful shutdown`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('❌ Unhandled Rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception', { error });
  process.exit(1);
});

startServer();
