import winston from 'winston';

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const colorMap: Record<string, string> = {
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      debug: '\x1b[35m',
    };
    const reset = '\x1b[0m';
    const color = colorMap[level] || reset;

    const emoji: Record<string, string> = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
    };

    return `${color}[${timestamp}] ${emoji[level] || ''} ${level.toUpperCase()}: ${message}${reset}${
      stack ? `\n${stack}` : ''
    }`;
  })
);

export const logger = winston.createLogger({
  level: 'info',
  format: customFormat,
  transports: [new winston.transports.Console()],
});
