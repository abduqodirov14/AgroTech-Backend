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
