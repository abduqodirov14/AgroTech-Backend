import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Telegram bot deep link URL generatsiya
 */
export const generateBotUrl = (phone: string): string => {
  // https://t.me/bot_username?start=auth_+998901234567
  const encodedPhone = encodeURIComponent(phone);
  return `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=auth_${encodedPhone}`;
};

/**
 * Telegram username format tekshirish
 */
export const isValidTelegramUsername = (username: string): boolean => {
  return /^@?[a-zA-Z0-9_]{5,32}$/.test(username);
};

/**
 * Telegram deep link parser
 */
export const parseDeepLink = (startParam: string): { type: string; data: string } | null => {
  // Format: auth_+998901234567
  const match = startParam.match(/^([a-z]+)_(.+)$/);
  
  if (!match) {
    return null;
  }
  
  return {
    type: match[1], // 'auth'
    data: match[2], // '+998901234567'
  };
};

/**
 * Telegram user ma'lumotini format qilish
 */
export interface TelegramUserInfo {
  telegramId: bigint;
  firstName: string;
  lastName?: string;
  username?: string;
  fullName: string;
}

export const formatTelegramUser = (telegramUser: any): TelegramUserInfo => {
  const firstName = telegramUser.first_name || '';
  const lastName = telegramUser.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Fermer';
  
  return {
    telegramId: BigInt(telegramUser.id),
    firstName,
    lastName,
    username: telegramUser.username,
    fullName,
  };
};

logger.debug('Telegram service initialized');
