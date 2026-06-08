import { prisma } from '../database/prismaClient';
import { Device, DeviceStatus, Zone } from '@prisma/client';

export type DeviceWithZone = Device & {
  zone: Zone | null;
};

export class DeviceRepository {
  async findByMac(macAddress: string): Promise<DeviceWithZone | null> {
    return prisma.device.findUnique({
      where: { macAddress },
      include: { zone: true },
    });
  }

  async findById(id: string): Promise<DeviceWithZone | null> {
    return prisma.device.findUnique({
      where: { id },
      include: { zone: true },
    });
  }

  async updateStatus(id: string, status: DeviceStatus): Promise<Device> {
    return prisma.device.update({
      where: { id },
      data: { status },
    });
  }

  async updateSecretKey(id: string, secretKey: string): Promise<Device> {
    return prisma.device.update({
      where: { id },
      data: { secretKey },
    });
  }

  async linkToUserAndZone(id: string, userId: string, zoneId: string | null): Promise<Device> {
    return prisma.device.update({
      where: { id },
      data: {
        userId,
        zoneId,
        status: DeviceStatus.ONLINE,
      },
    });
  }

  async create(data: {
    macAddress: string;
    secretKey: string;
    name?: string;
    userId?: string | null;
    zoneId?: string | null;
  }): Promise<Device> {
    return prisma.device.create({
      data: {
        macAddress: data.macAddress,
        secretKey: data.secretKey,
        name: data.name ?? null,
        userId: data.userId ?? null,
        zoneId: data.zoneId ?? null,
        status: DeviceStatus.OFFLINE,
      },
    });
  }
}
