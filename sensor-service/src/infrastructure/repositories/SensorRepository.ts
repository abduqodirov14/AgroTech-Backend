import prisma from '../database/prismaClient';
import { ISensorRepository } from '../../domain/repositories/ISensorRepository';
import { SensorReading, CreateSensorReadingDTO } from '../../domain/entities/SensorReading';

export class SensorRepository implements ISensorRepository {
  async create(data: CreateSensorReadingDTO): Promise<SensorReading> {
    return prisma.sensorReading.create({
      data: {
        deviceId: data.deviceId,
        moisture: data.moisture ?? null,
        temperature: data.temperature ?? null,
        ph: data.ph ?? null,
        ec: data.ec ?? null,
        npk: data.npk ?? null,
        battery: data.battery ?? null,
        createdAt: data.timestamp ?? new Date(),
      },
    });
  }

  async findRecentByDevice(deviceId: string, limit: number): Promise<SensorReading[]> {
    return prisma.sensorReading.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findLatestByDevice(deviceId: string): Promise<SensorReading | null> {
    return prisma.sensorReading.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
