import { prisma } from '../config/database';
import { AuthSession, CreateAuthSessionInput } from '../models/AuthSession';
import { generateCode } from './codeGenerator';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Yangi auth session yaratish
 */
export const createAuthSession = async (
  phone: string,
  telegramId: bigint
): Promise<{ session: AuthSession; code: string }> => {
  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + env.AUTH_CODE_EXPIRY_MINUTES * 60 * 1000);

    logger.info('📝 Creating auth session', { phone, telegramId: telegramId.toString() });

    const session = await prisma.authSession.create({
      data: {
        phone,
        telegramId,
        code,
        expiresAt,
      },
    });

    logger.info('🔑 Auth code generated', { phone, code, expiresAt });
    return { session, code };
  } catch (error: any) {
    logger.error('❌ Failed to create auth session', {
      message: error?.message,
      code: error?.code,
      phone,
      telegramId: telegramId.toString()
    });
    throw error;
  }
};

/**
 * Kod orqali session topish va tekshirish
 */
export const validateAuthSession = async (
  phone: string,
  code: string
): Promise<AuthSession | null> => {
  const session = await prisma.authSession.findFirst({
    where: {
      phone,
      code,
      isUsed: false,
      expiresAt: {
        gte: new Date(), // hali muddati o'tmagan
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!session) {
    logger.warn('⚠️ Invalid or expired auth code', { phone, code });
    return null;
  }

  return session;
};

/**
 * Session'ni ishlatilgan deb belgilash
 */
export const markSessionAsUsed = async (sessionId: string): Promise<void> => {
  await prisma.authSession.update({
    where: { id: sessionId },
    data: { isUsed: true },
  });
  
  logger.info('✅ Auth session marked as used', { sessionId });
};

/**
 * Eski session'larni tozalash (cron job uchun)
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
  const result = await prisma.authSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  if (result.count > 0) {
    logger.info(`🧹 Cleaned up ${result.count} expired auth sessions`);
  }

  return result.count;
};
