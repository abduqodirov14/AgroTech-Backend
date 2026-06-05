import winston from 'winston';
import { env } from '../config/env';

// Custom format - rangli terminal output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] ${level}: ${message} ${metaStr}`;
  })
);

// File format - JSON structure
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Logger instance
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    // Console transport - rangli output
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Error logs file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
    }),
    // Combined logs file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
    }),
  ],
});

// HTTP request logger middleware uchun helper
export const logRequest = (method: string, url: string, statusCode: number, duration: number) => {
  const statusColor = statusCode >= 500 ? 'red' : statusCode >= 400 ? 'yellow' : 'green';
  logger.info(`${method} ${url} - ${statusCode} (${duration}ms)`, { statusColor });
};
