import { AuthSession, CreateAuthSessionInput } from '../models/AuthSession';
import { generateCode } from './codeGenerator';
import { env } from '../config/env';
import { logger } from '../utils/logger';

type SessionRecord = {
  id: string;
  phone: string;
  telegramId: bigint;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
};

const sessions = new Map<string, SessionRecord>();

const makeId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const createAuthSession = async (
  phone: string,
  telegramId: bigint
): Promise<{ session: AuthSession; code: string }> => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.AUTH_CODE_EXPIRY_MINUTES * 60 * 1000);
  const record: SessionRecord = {
    id: makeId(),
    phone,
    telegramId,
    code,
    expiresAt,
    isUsed: false,
    createdAt: new Date(),
  };
  sessions.set(record.id, record);
  logger.info('📝 Creating auth session (in-memory)', { phone, code, expiresAt });
  return { session: record as unknown as AuthSession, code };
};

export const validateAuthSession = async (
  phone: string,
  code: string
): Promise<AuthSession | null> => {
  const now = new Date();
  for (const session of sessions.values()) {
    if (session.phone === phone && session.code === code && !session.isUsed && session.expiresAt >= now) {
      return session as unknown as AuthSession;
    }
  }
  return null;
};

export const markSessionAsUsed = async (sessionId: string): Promise<void> => {
  const session = sessions.get(sessionId);
  if (session) {
    session.isUsed = true;
    logger.info('✅ Auth session marked as used', { sessionId });
  }
};

export const cleanupExpiredSessions = async (): Promise<number> => {
  const before = sessions.size;
  for (const [id, session] of sessions.entries()) {
    if (session.expiresAt < new Date()) {
      sessions.delete(id);
    }
  }
  const count = before - sessions.size;
  if (count > 0) {
    logger.info(`🧹 Cleaned up ${count} expired auth sessions`);
  }
  return count;
};
