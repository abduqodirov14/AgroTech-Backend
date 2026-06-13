import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database/prismaClient';
import { hashDeviceSecret } from '../../services/deviceCrypto';
import { logger } from '../../utils/logger';

const registerSchema = z.object({
  macAddress: z.string().min(1),
  plainSecret: z.string().min(4),
  userId: z.string().min(1),
  name: z.string().optional(),
});

export const registerDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || 'Validation failed' });
    }
    const { macAddress, plainSecret, userId, name } = parsed.data;
    const normalizedMac = macAddress.toLowerCase();
    const existing = await prisma.device.findUnique({
      where: { macAddress: normalizedMac },
      select: { id: true },
    });

    const secretHash = await hashDeviceSecret(plainSecret);

    let zoneId = 'default';
    const firstZone = await prisma.zone.findFirst({
      where: { userId }
    });
    if (firstZone) {
      zoneId = firstZone.id;
    } else {
      const defaultZone = await prisma.zone.create({
        data: {
          name: 'Asosiy Zona',
          latitude: 41.3111,
          longitude: 69.2797,
          userId
        }
      });
      zoneId = defaultZone.id;
    }

    if (!existing) {
      const device = await prisma.device.create({
        data: {
          macAddress: normalizedMac,
          macHash: secretHash,
          secretKey: plainSecret,
          name: name || `Device ${normalizedMac.slice(-4)}`,
          status: 'ONLINE',
          lastSeen: new Date(),
          zoneId: zoneId,
        },
        select: { id: true, macAddress: true, status: true, createdAt: true },
      });
      await prisma.deviceOwnership.upsert({
        where: { deviceId_userId: { deviceId: device.id, userId } },
        create: { deviceId: device.id, userId, isOwner: true },
        update: { isOwner: true },
      });
      logger.info('Device registered', { deviceId: device.id, userId, mac: normalizedMac });
      return res.status(201).json({ success: true, device });
    }

    await prisma.device.update({
      where: { id: existing.id },
      data: { macHash: secretHash, status: 'ONLINE', lastSeen: new Date() },
    });
    await prisma.deviceOwnership.upsert({
      where: { deviceId_userId: { deviceId: existing.id, userId } },
      create: { deviceId: existing.id, userId, isOwner: true },
      update: { isOwner: true },
    });

    logger.info('Device registered/updated', { deviceId: existing.id, userId, mac: normalizedMac });
    return res.status(200).json({ success: true, device: { id: existing.id, macAddress: normalizedMac } });
  } catch (error: any) {
    logger.error('Device registration failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
};
