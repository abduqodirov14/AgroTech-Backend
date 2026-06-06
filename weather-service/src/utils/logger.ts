import winston from 'winston';

const colors = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  http: '\x1b[35m',
  debug: '\x1b[37m',
  reset: '\x1b[0m',
};

const customFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const color = colors[level as keyof typeof colors] || colors.reset;
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${color}[${timestamp}] ${level}: ${message}${metaStr ? ' ' + metaStr : ''}${colors.reset}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [new winston.transports.Console()],
});

export const logRequest = (method: string, url: string, statusCode: number, duration: number) => {
  const color = statusCode >= 400 ? colors.error : statusCode >= 300 ? colors.warn : colors.info;
  logger.info(`${color}${method} ${url} ${statusCode} - ${duration}ms${colors.reset}`);
};
