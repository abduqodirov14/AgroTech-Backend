/**
 * @file       logger.ts
 * @module     Utils
 * @description Winston structured logger for the analytics service with JSON and console transports.
 */

import winston from 'winston';
import analyticsEnv from '../config/env';

const SERVICE_NAME = 'analytics-service';

const analyticsLogger = winston.createLogger({
  level: analyticsEnv.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: SERVICE_NAME },
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...rest }) => {
          const extraFields = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${extraFields}`;
        })
      ),
    }),
  ],
});

export default analyticsLogger;
