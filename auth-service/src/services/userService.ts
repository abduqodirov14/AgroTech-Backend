import { prisma } from '../config/database';
import { User, CreateUserInput } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Telefon raqam bo'yicha user topish
 */
export const findUserByPhone = async (phone: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { phone },
  });
};

/**
 * Telegram ID bo'yicha user topish
 */
export const findUserByTelegramId = async (telegramId: bigint): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { telegramId },
  });
};

/**
 * Yangi user yaratish
 */
export const createUser = async (data: CreateUserInput): Promise<User> => {
  const user = await prisma.user.create({
    data: {
      phone: data.phone,
      telegramId: data.telegramId,
      name: data.name,
      username: data.username,
    },
  });

  logger.info('✅ New user created', { phone: user.phone, telegramId: user.telegramId.toString() });
  return user;
};

/**
 * User yoki yaratish
 */
export const findOrCreateUser = async (data: CreateUserInput): Promise<User> => {
  // Avval telefon bo'yicha qidirish
  let user = await findUserByPhone(data.phone);
  
  if (!user) {
    // Telegram ID bo'yicha qidirish
    user = await findUserByTelegramId(data.telegramId);
  }

  if (!user) {
    // Yangi user yaratish
    user = await createUser(data);
  } else {
    // Mavjud user'ni yangilash (lastLogin)
    user = await updateLastLogin(user.id);
  }

  return user;
};

/**
 * Last login vaqtini yangilash
 */
export const updateLastLogin = async (userId: string): Promise<User> => {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLogin: new Date() },
  });
};

/**
 * User ID bo'yicha topish
 */
export const findUserById = async (userId: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { id: userId },
  });
};
