import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { validateAuthSession, markSessionAsUsed } from '../../services/authSessionService';
import { findOrCreateUser } from '../../services/userService';
import { generateToken } from '../../services/jwtService';
import { normalizePhone } from '../../utils/validators';
import { AuthenticationError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';

/**
 * POST /api/v1/auth/telegram-init
 * Telegram bot URL'ini qaytarish
 */
export const telegramInit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      throw new ValidationError('Phone number is required');
    }

    const normalizedPhone = normalizePhone(phone);
    const botUrl = `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=auth_${normalizedPhone}`;

    logger.info('🔗 Telegram bot URL generated', { phone: normalizedPhone });

    res.json({
      success: true,
      botUrl,
      botUsername: env.TELEGRAM_BOT_USERNAME,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/verify-code
 * 4 xonali kodni tekshirish va JWT token berish
 */
export const verifyCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, code } = req.body;
    const normalizedPhone = normalizePhone(phone);

    // Auth session'ni tekshirish
    const session = await validateAuthSession(normalizedPhone, code);

    if (!session) {
      throw new AuthenticationError('Invalid or expired code');
    }

    // Session'ni ishlatilgan deb belgilash
    await markSessionAsUsed(session.id);

    // User'ni topish yoki yaratish
    // Telegram ID va name'ni session'dan olib bo'lmaydi, 
    // shuning uchun bot'dan olish kerak bo'ladi
    // Hozircha session'dagi telegram ID'ni ishlatamiz
    const user = await findOrCreateUser({
      phone: normalizedPhone,
      telegramId: session.telegramId,
      name: 'Fermer', // TODO: Bot'dan to'liq ma'lumot olish
    });

    // JWT token yaratish
    const token = generateToken(user);

    logger.info('✅ User authenticated successfully', { 
      phone: user.phone,
      userId: user.id 
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        telegramId: user.telegramId.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 * JWT token orqali user ma'lumotini olish
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // authMiddleware orqali req.user to'ldirilgan
    const user = req.user!;

    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        username: user.username,
        telegramId: user.telegramId.toString(),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout (optional)
 * Session'ni o'chirish
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // JWT stateless bo'lgani uchun backend'da session o'chirish kerak emas
    // Frontend localStorage'dan token'ni o'chiradi

    logger.info('👋 User logged out', { userId: req.user?.id });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};
