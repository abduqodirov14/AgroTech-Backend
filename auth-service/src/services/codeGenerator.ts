import crypto from 'crypto';

/**
 * 4 xonali kod generatsiya qilish
 * Range: 1000 - 9999
 */
export const generateCode = (): string => {
  const code = crypto.randomInt(1000, 10000);
  return code.toString();
};

/**
 * Kod formatni tekshirish
 */
export const isValidCode = (code: string): boolean => {
  return /^\d{4}$/.test(code);
};
