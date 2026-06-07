import prisma from '../database/prismaClient';
import { ISensorRepository } from '../../domain/repositories/ISensorRepository';
import { SensorReading, CreateSensorReadingDTO } from '../../domain/entities/SensorReading';

export class SensorRepository implements ISensorRepository {
  async create(data: CreateSensorReadingDTO): Promise<SensorReading> {
    return await prisma.sensorReading.create({
      data: {
        sensorId: data.sensorId,
        soilMoisture: data.soilMoisture,
        pH: data.pH,
        temperature: data.temperature,
        valveState: data.valveState,
        timestamp: data.timestamp,
      },
    });
  }

  async findRecent(limit: number): Promise<SensorReading[]> {
    return await prisma.sensorReading.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
