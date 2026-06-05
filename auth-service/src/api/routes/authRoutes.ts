import { Router } from 'express';
import {
  telegramInit,
  verifyCode,
  getMe,
  logout,
} from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateRequest, verifyCodeSchema } from '../middlewares/validateRequest';

const router = Router();

/**
 * POST /api/v1/auth/telegram-init
 * Telegram bot URL'ini olish
 */
router.post('/telegram-init', telegramInit);

/**
 * POST /api/v1/auth/verify-code
 * 4 xonali kodni tekshirish va JWT token olish
 */
router.post('/verify-code', validateRequest(verifyCodeSchema), verifyCode);

/**
 * GET /api/v1/auth/me
 * JWT token orqali foydalanuvchi ma'lumotini olish
 * Protected route - authMiddleware kerak
 */
router.get('/me', authMiddleware, getMe);

/**
 * POST /api/v1/auth/logout
 * Logout (optional - JWT stateless)
 */
router.post('/logout', authMiddleware, logout);

export default router;
