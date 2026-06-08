import http from 'http';
import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { createSocketServer } from './socket';

const server = http.createServer(app);

const io = createSocketServer(server);

app.set('io', io);

server.listen(config.port, () => {
  logger.info(`Sensor Service running on port ${config.port}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received');
  server.close(() => process.exit(0));
});
