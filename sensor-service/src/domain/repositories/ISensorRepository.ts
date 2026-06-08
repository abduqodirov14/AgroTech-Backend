import { ISensorReading, CreateSensorReadingDTO } from '../../domain/entities/SensorReading';

export interface ISensorRepository {
  create(data: CreateSensorReadingDTO): Promise<ISensorReading>;
  findRecentByDevice(deviceId: string, limit: number): Promise<ISensorReading[]>;
  findLatestByDevice(deviceId: string): Promise<ISensorReading | null>;
}
