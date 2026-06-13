import { PrismaClient, DeviceStatus } from '@prisma/client';

const prisma = new PrismaClient();

export type DeviceWithSecret = {
  id: string;
  macAddress: string;
  secretKey: string;
  status: DeviceStatus;
};

export async function findDeviceByMac(macAddress: string): Promise<DeviceWithSecret | null> {
  const device = await prisma.device.findUnique({
    where: { macAddress },
    select: { id: true, macAddress: true, secretKey: true, status: true },
  });
  return device ?? null;
}

export async function updateDeviceStatus(id: string, status: DeviceStatus) {
  return prisma.device.update({ where: { id }, data: { status } });
}

export async function updateDeviceSecret(id: string, secretHash: string) {
  return prisma.device.update({ where: { id }, data: { secretKey: secretHash, macHash: secretHash } });
}

export async function createDeviceOwnership(deviceId: string, userId: string) {
  return prisma.deviceOwnership.upsert({
    where: { deviceId_userId: { deviceId, userId } },
    create: { deviceId, userId, isOwner: true },
    update: { isOwner: true },
  });
}
