import http from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initializeTrackingService } from './services/trackingService';
import { initializeLogisticsBot } from './bot/bot';

const server = http.createServer(app);

initializeTrackingService(server);

const start = async () => {
  await new Promise<void>((resolve) => server.listen(env.PORT, resolve));
  logger.info(`✅ Logistics service running on port ${env.PORT}`);
  logger.info(`📍 WebSocket tracking available at ws://localhost:${env.PORT}`);
  try {
    const mod: any = await import('./bot/bot');
    if (typeof mod?.initializeLogisticsBot === 'function') {
      mod.initializeLogisticsBot();
    } else {
      logger.warn('Logistics bot entrypoint missing');
    }
  } catch (e) {
    logger.warn('Logistics bot bootstrap failed', { error: (e as Error)?.message, stack: (e as Error)?.stack });
  }
};

start().catch((err) => {
  logger.error('Failed to start logistics service', { error: (err as Error).message });
  process.exit(1);
});
