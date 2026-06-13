/**
 * @file       server.ts
 * @module     AnalyticsService
 * @description Listens for incoming HTTP traffic on the configured port.
 */

import app from './app';
import analyticsEnv from './config/env';
import analyticsLogger from './utils/logger';

const serverInstance = app.listen(analyticsEnv.PORT, () => {
  analyticsLogger.info(`Analytics Service listening on port ${analyticsEnv.PORT} in ${analyticsEnv.NODE_ENV} mode.`);
});

process.on('SIGTERM', () => {
  analyticsLogger.info('SIGTERM signal received: closing HTTP server...');
  serverInstance.close(() => {
    analyticsLogger.info('HTTP server closed.');
  });
});
