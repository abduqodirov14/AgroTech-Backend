import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Prisma Client instance - Singleton pattern
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

// Query logging (development faqat)
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e: any) => {
    logger.debug(`Query: ${e.query}`, { duration: `${e.duration}ms` });
  });
}

// Database connection test
export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL database connected successfully');
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed', { error });
    process.exit(1);
  }
};

// Graceful shutdown
export const disconnectDatabase = async () => {
  await prisma.$disconnect();
  logger.info('📴 PostgreSQL database disconnected');
};
