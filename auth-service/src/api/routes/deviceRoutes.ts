import { Router } from 'express';
import { listDevices, bindDevice, removeDevice } from '../controllers/deviceController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', listDevices);
router.post('/register', bindDevice);
router.delete('/:deviceId', removeDevice);

export default router;
