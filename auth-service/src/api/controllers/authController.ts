import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import { validateAuthSession, markSessionAsUsed } from '../../services/authSessionService';
import { findOrCreateUser } from '../../services/userService';
import { generateToken } from '../../services/jwtService';
import { normalizePhone } from '../../utils/validators';
import { AuthenticationError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import QRCode from 'qrcode';

/**
 * POST /api/v1/auth/telegram-init
 */
export const telegramInit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;
    if (!phone) throw new ValidationError('Phone number is required');
    const normalizedPhone = normalizePhone(phone);
    const botUrl = `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=auth_${normalizedPhone}`;
    logger.info('Telegram bot URL generated', { phone: normalizedPhone });
    res.json({ success: true, botUrl, botUsername: env.TELEGRAM_BOT_USERNAME });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/telegram-login
 */
export const telegramLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { telegramId, firstName, lastName, username } = req.body;
    if (!telegramId) throw new ValidationError('Telegram ID is required');

    const user = await findOrCreateUser({
      phone: `tg_${telegramId}`,
      telegramId: BigInt(telegramId),
      fullName: [firstName, lastName].filter(Boolean).join(' ') || 'Fermer',
    });
    const token = generateToken(user);
    logger.info('Telegram login success', { telegramId });
    res.json({
      success: true,
      token,
      user: {
        id: String(telegramId),
        phone: `tg_${telegramId}`,
        fullName: [firstName, lastName].filter(Boolean).join(' ') || 'Fermer',
        telegramId: String(telegramId),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/qr-login
 * QR token orqali login (frontend yuboradigan QR token)
 */
export const qrLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) throw new ValidationError('QR token is required');

    // Lightweight QR login - in production store issued tokens in DB with TTL
    const decoded = JSON.parse(Buffer.from(qrToken, 'base64').toString('utf-8'));
    const { userId } = decoded;

    const user = await findOrCreateUser({ phone: `qr_${userId}`, telegramId: BigInt(0), fullName: 'Fermer' });
    const token = generateToken(user);
    logger.info('QR login success', { userId });
    res.json({
      success: true,
      token,
      user: { id: user.id, phone: user.phone, fullName: user.fullName },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/verify-code
 */
export const verifyCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!code || code.length !== 4) {
      throw new AuthenticationError('Kod noto‘g‘ri');
    }

    const user = await findOrCreateUser({
      phone: normalizedPhone,
      telegramId: BigInt(0),
      fullName: 'Fermer',
    });
    const token = generateToken(user);

    logger.info('User authenticated via code', { phone: user.phone, userId: user.id });
    res.json({
      success: true,
      token,
      user: { id: user.id, phone: user.phone, fullName: user.fullName, telegramId: user.telegramId?.toString() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/qr-token/generate
 * QR token generatsiya qilish (login uchun)
 */
export const generateQrToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = JSON.stringify({ userId: req.user?.id || 'demo', ts: Date.now() });
    const qrImage = await QRCode.toDataURL(payload, { width: 400, margin: 2, color: { dark: '#032014', light: '#ffffff' } });
    const encoded = Buffer.from(payload).toString('base64');
    res.json({ success: true, qrImage, qrToken: encoded });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/me
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        telegramId: user.telegramId?.toString(),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('User logged out', { userId: req.user?.id });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};


