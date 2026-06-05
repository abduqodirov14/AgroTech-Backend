import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from './src/config/database';
import { initializeBot, stopBot } from './src/bot/bot';
import { logger } from './src/utils/logger';

/**
 * Telegram Bot ishga tushirish
 */
const startBot = async () => {
  try {
    // Database ulanish
    await connectDatabase();

    // Bot'ni ishga tushirish
    initializeBot();

    logger.info('✅ Telegram bot started successfully');
  } catch (error: any) {
    logger.error('❌ Failed to start bot', { 
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name
    });
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received - starting graceful shutdown`);
  
  await stopBot();
  await disconnectDatabase();
  
  process.exit(0);
};

// Shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled errors
process.on('unhandledRejection', (reason: any) => {
  logger.error('❌ Unhandled Rejection', { 
    message: reason?.message || 'Unknown rejection',
    reason: typeof reason === 'object' ? JSON.stringify(reason) : reason
  });
});

process.on('uncaughtException', (error: any) => {
  logger.error('❌ Uncaught Exception', { 
    message: error?.message || 'Unknown exception',
    stack: error?.stack
  });
  process.exit(1);
});

// Start
startBot();
