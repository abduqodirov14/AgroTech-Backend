/**
 * @file       logger.ts
 * @module     FarmService/Utils
 * @description Winston structured logger with service-level metadata for farm-service.
 */

import winston from 'winston';

const LOG_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const farmServiceLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'farm-service' },
  format: winston.format.combine(
    winston.format.timestamp({ format: LOG_TIMESTAMP_FORMAT }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, service, ...rest }) => {
                const extraFields = Object.keys(rest).length
                  ? ` ${JSON.stringify(rest)}`
                  : '';
                return `${timestamp} [${service}] ${level}: ${message}${extraFields}`;
              })
            ),
    }),
  ],
});

export default farmServiceLogger;
