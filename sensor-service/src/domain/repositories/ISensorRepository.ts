import { SensorReading, CreateSensorReadingDTO } from '../../domain/entities/SensorReading';

export interface ISensorRepository {
  create(data: CreateSensorReadingDTO): Promise<SensorReading>;
  findRecentByDevice(deviceId: string, limit: number): Promise<SensorReading[]>;
  findLatestByDevice(deviceId: string): Promise<SensorReading | null>;
}
