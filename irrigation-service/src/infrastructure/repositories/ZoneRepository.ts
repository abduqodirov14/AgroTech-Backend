import { prisma } from '../../infrastructure/database/prismaClient';
import { IZoneRepository, ZoneWithDevice, CreateZoneDTO } from '../../domain/repositories/IZoneRepository';
import { DeviceStatus } from '@prisma/client';

export class ZoneRepository implements IZoneRepository {
  async findAll(): Promise<ZoneWithDevice[]> {
    const zones = await prisma.zone.findMany({
      include: {
        devices: {
          select: {
            id: true,
            macAddress: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return zones as ZoneWithDevice[];
  }

  async findById(id: string): Promise<ZoneWithDevice | null> {
    const zone = await prisma.zone.findUnique({
      where: { id },
      include: {
        devices: {
          select: {
            id: true,
            macAddress: true,
            name: true,
            status: true,
          },
        },
      },
    });
    return zone as ZoneWithDevice | null;
  }

  async findByUserId(userId: string): Promise<ZoneWithDevice[]> {
    const zones = await prisma.zone.findMany({
      where: { userId },
      include: {
        devices: {
          select: {
            id: true,
            macAddress: true,
            name: true,
            status: true,
          },
        },
      },
    });
    return zones as ZoneWithDevice[];
  }

  async findByDeviceId(deviceId: string): Promise<ZoneWithDevice | null> {
    const zone = await prisma.zone.findFirst({
      where: {
        devices: {
          some: { id: deviceId },
        },
      },
      include: {
        devices: {
          where: { id: deviceId },
          select: {
            id: true,
            macAddress: true,
            name: true,
            status: true,
          },
        },
      },
    });
    return zone as ZoneWithDevice | null;
  }

  async create(data: CreateZoneDTO): Promise<ZoneWithDevice> {
    const zone = await prisma.zone.create({
      data: {
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        userId: data.userId,
        devices: data.deviceId ? {
          connect: { id: data.deviceId },
        } : undefined,
      },
      include: {
        devices: {
          select: {
            id: true,
            macAddress: true,
            name: true,
            status: true,
          },
        },
      },
    });
    return zone as ZoneWithDevice;
  }

  async updateValveState(zoneId: string, _valveState: string): Promise<void> {
    await prisma.zone.update({
      where: { id: zoneId },
      data: {
        devices: {
          update: {
            where: { zoneId },
            data: { status: DeviceStatus.ONLINE },
          },
        },
      },
    });
  }
}
