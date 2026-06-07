import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => {
  logger.error(`Prisma error: ${e.message}`);
});

prisma.$on('warn', (e) => {
  logger.warn(`Prisma warning: ${e.message}`);
});

export default prisma;
