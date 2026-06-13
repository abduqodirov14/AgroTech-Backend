import { Router } from 'express';
import { registerDevice } from '../controllers/deviceController';

const router = Router();

/**
 * POST /api/v1/devices/register
 * MAC address + plainSecret bilan qurilma qo'shish
 */
router.post('/register', registerDevice);

export default router;
