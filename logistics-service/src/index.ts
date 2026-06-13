import http from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initializeTrackingService } from './services/trackingService';
import { initializeLogisticsBot, setLogisticsServiceClient } from './bot/bot';

const server = http.createServer(app);

initializeTrackingService(server);

server.listen(env.PORT, () => {
  logger.info(`✅ Logistics service running on port ${env.PORT}`);
  logger.info(`📍 WebSocket tracking available at ws://localhost:${env.PORT}`);
  setLogisticsServiceClient({});
  initializeLogisticsBot();
});
