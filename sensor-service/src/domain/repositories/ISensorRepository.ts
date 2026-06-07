import { SensorReading, CreateSensorReadingDTO } from '../entities/SensorReading';

export interface ISensorRepository {
  create(data: CreateSensorReadingDTO): Promise<SensorReading>;
  findRecent(limit: number): Promise<SensorReading[]>;
}
