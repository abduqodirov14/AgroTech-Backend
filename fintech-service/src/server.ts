/**
 * @file       server.ts
 * @module     FintechService
 * @description Listens for incoming HTTP traffic on the configured port.
 */

import app from './app';
import fintechEnv from './config/env';
import fintechLogger from './utils/logger';

const serverInstance = app.listen(fintechEnv.PORT, () => {
  fintechLogger.info(`Fintech Service listening on port ${fintechEnv.PORT} in ${fintechEnv.NODE_ENV} mode.`);
});

process.on('SIGTERM', () => {
  fintechLogger.info('SIGTERM signal received: closing HTTP server...');
  serverInstance.close(() => {
    fintechLogger.info('HTTP server closed.');
  });
});
