import { Router } from 'express';
import { telegramInit, verifyCode, getMe, logout, telegramLogin, generateQrToken } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validateRequest, verifyCodeSchema } from '../middlewares/validateRequest';

const router = Router();

router.post('/telegram-init', telegramInit);
router.post('/telegram-login', telegramLogin);
router.post('/qr-login', telegramLogin);
router.post('/qr-token/generate', authMiddleware, generateQrToken);
router.post('/verify-code', validateRequest(verifyCodeSchema), verifyCode);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);

export default router;
