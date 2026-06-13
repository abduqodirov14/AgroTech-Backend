import { Request, Response, NextFunction } from 'express';
import { getDevicesByUserId, registerDevice, revokeDeviceAccess } from '../../services/deviceService';
import { AuthenticationError, ValidationError } from '../../utils/errors';

export const listDevices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AuthenticationError('User not authenticated');

    const devices = await getDevicesByUserId(userId);
    res.json({ success: true, devices });
  } catch (error) {
    next(error);
  }
};

export const bindDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AuthenticationError('User not authenticated');

    const { macAddress, plainSecret, name } = req.body;
    if (!macAddress || !plainSecret) {
      throw new ValidationError('MAC address and secret are required');
    }

    const device = await registerDevice({
      macAddress,
      userId,
      name,
    });

    res.status(201).json({ success: true, device });
  } catch (error) {
    next(error);
  }
};

export const removeDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { deviceId } = req.params;
    if (!userId) throw new AuthenticationError('User not authenticated');

    await revokeDeviceAccess(deviceId, userId);
    res.json({ success: true, message: 'Device access revoked' });
  } catch (error) {
    next(error);
  }
};
