/**
 * @file       server.ts
 * @module     FarmService
 * @description Listens for incoming HTTP traffic on the configured port.
 */

import app from './app';
import { farmServiceConfig } from './config/env';
import farmServiceLogger from './utils/logger';

const serverInstance = app.listen(farmServiceConfig.port, () => {
  farmServiceLogger.info(`Farm Service listening on port ${farmServiceConfig.port} in ${farmServiceConfig.nodeEnv} mode.`);
});

process.on('SIGTERM', () => {
  farmServiceLogger.info('SIGTERM signal received: closing HTTP server...');
  serverInstance.close(() => {
    farmServiceLogger.info('HTTP server closed.');
  });
});
