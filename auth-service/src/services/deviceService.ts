import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface RegisterDeviceInput {
  macAddress: string;
  userId: string;
  name?: string;
  zoneId?: string;
}

export interface DeviceOwnershipInfo {
  id: string;
  macAddress: string;
  macHash: string;
  name: string | null;
  status: string;
  lastSeen: Date | null;
  isOwner: boolean;
  zoneId: string | null;
  createdAt: Date;
}

const BCRYPT_ROUNDS = 10;

export const hashMacAddress = async (macAddress: string): Promise<string> => {
  const normalized = macAddress.toLowerCase().replace(/[^a-f0-9:]/g, '');
  return bcrypt.hash(normalized, BCRYPT_ROUNDS);
};

export const compareMacAddress = async (macAddress: string, hash: string): Promise<boolean> => {
  const normalized = macAddress.toLowerCase().replace(/[^a-f0-9:]/g, '');
  return bcrypt.compare(normalized, hash);
};

export const registerDevice = async (data: RegisterDeviceInput): Promise<DeviceOwnershipInfo> => {
  const normalizedMac = data.macAddress.toLowerCase().replace(/[^a-f0-9:]/g, '');
  const macHash = await hashMacAddress(normalizedMac);

  let zoneId = data.zoneId;
  if (!zoneId) {
    const firstZone = await prisma.zone.findFirst({
      where: { userId: data.userId }
    });
    if (firstZone) {
      zoneId = firstZone.id;
    } else {
      const defaultZone = await prisma.zone.create({
        data: {
          name: 'Asosiy Zona',
          latitude: 41.3111,
          longitude: 69.2797,
          userId: data.userId
        }
      });
      zoneId = defaultZone.id;
    }
  }

  let device: any = await prisma.device.findUnique({
    where: { macAddress: normalizedMac },
    include: { ownerships: { where: { userId: data.userId } } },
  });

  if (!device) {
    device = await prisma.device.create({
      data: {
        macAddress: normalizedMac,
        macHash,
        name: data.name || `Device ${normalizedMac.slice(-4)}`,
        secretKey: uuidv4(),
        status: 'ONLINE',
        lastSeen: new Date(),
        zoneId: zoneId,
        ownerships: {
          create: {
            userId: data.userId,
            isOwner: true,
          },
        },
      },
      include: { ownerships: { where: { userId: data.userId } } },
    }) as any;
  } else {
    const existingOwnership = device.ownerships[0];
    if (existingOwnership) {
      device = await prisma.device.update({
        where: { id: device.id },
        data: {
          macHash,
          name: data.name || device.name,
          status: 'ONLINE',
          lastSeen: new Date(),
          ownerships: {
            upsert: {
              where: { deviceId_userId: { deviceId: device.id, userId: data.userId } },
              create: { userId: data.userId, isOwner: true },
              update: { isOwner: true },
            },
          },
        },
        include: { ownerships: { where: { userId: data.userId } } },
      }) as any;
    } else {
      await prisma.deviceOwnership.create({
        data: { deviceId: device.id, userId: data.userId, isOwner: true },
      });
      device = await prisma.device.update({
        where: { id: device.id },
        data: { macHash, status: 'ONLINE', lastSeen: new Date() },
        include: { ownerships: { where: { userId: data.userId } } },
      }) as any;
    }
  }

  logger.info('✅ Device registered', { userId: data.userId, deviceId: device.id, mac: normalizedMac });

  return {
    id: device.id,
    macAddress: device.macAddress,
    macHash: device.macHash,
    name: device.name,
    status: device.status,
    lastSeen: device.lastSeen,
    isOwner: device.ownerships[0]?.isOwner ?? true,
    zoneId: device.zoneId,
    createdAt: device.createdAt,
  };
};

export const getDevicesByUserId = async (userId: string): Promise<DeviceOwnershipInfo[]> => {
  const ownerships = await prisma.deviceOwnership.findMany({
    where: { userId },
    include: { device: true },
    orderBy: { id: 'desc' },
  });

  return ownerships.map((o) => ({
    id: o.device.id,
    macAddress: o.device.macAddress,
    macHash: o.device.macHash,
    name: o.device.name,
    status: o.device.status,
    lastSeen: o.device.lastSeen,
    isOwner: o.isOwner,
    zoneId: o.device.zoneId,
    createdAt: o.device.createdAt,
  }));
};

export const verifyDeviceOwner = async (macAddress: string, userId: string): Promise<boolean> => {
  const normalizedMac = macAddress.toLowerCase().replace(/[^a-f0-9:]/g, '');
  const device = await prisma.device.findUnique({
    where: { macAddress: normalizedMac },
    include: { ownerships: { where: { userId } } },
  });

  if (!device || device.ownerships.length === 0) {
    return false;
  }

  return device.ownerships[0].isOwner;
};

export const findDeviceByMac = async (macAddress: string) => {
  const normalizedMac = macAddress.toLowerCase().replace(/[^a-f0-9:]/g, '');
  return prisma.device.findUnique({
    where: { macAddress: normalizedMac },
    include: { ownerships: { include: { user: true } } },
  });
};

export const revokeDeviceAccess = async (deviceId: string, userId: string): Promise<void> => {
  await prisma.deviceOwnership.updateMany({
    where: { deviceId, userId },
    data: { isOwner: false },
  });
  logger.info('🔒 Device access revoked', { deviceId, userId });
};
