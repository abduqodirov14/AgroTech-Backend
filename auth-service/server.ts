import 'dotenv/config';
import { app } from './src/app';
import { connectDatabase, disconnectDatabase } from './src/config/database';
import { env } from './src/config/env';
import { logger } from './src/utils/logger';
import { initializeBot, stopBot } from './src/bot/bot';

/**
 * HTTP Server ishga tushirish
 */
const startServer = async () => {
  try {
    // Database ulanish
    await connectDatabase();

    // Telegram bot ishga tushirish
    try {
      await initializeBot();
    } catch (error: any) {
      logger.error('❌ Failed to start bot', { 
        message: error?.message || 'Unknown error',
        stack: error?.stack 
      });
    }

    // Server'ni tinglash
    app.listen(env.PORT, () => {
      logger.info(`🚀 Auth Service running on port ${env.PORT}`);
      logger.info(`📡 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server', { error });
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received - starting graceful shutdown`);
  
  // Stop Telegram bot
  await stopBot();
  
  // Disconnect database
  await disconnectDatabase();
  
  process.exit(0);
};

// Shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled errors
process.on('unhandledRejection', (reason) => {
  logger.error('❌ Unhandled Rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception', { error });
  process.exit(1);
});

// Start
startServer();
