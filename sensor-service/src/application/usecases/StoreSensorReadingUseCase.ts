import { ISensorRepository } from '../../domain/repositories/ISensorRepository';
import { CreateSensorReadingDTO } from '../../domain/entities/SensorReading';
import { logger } from '../../utils/logger';

export class StoreSensorReadingUseCase {
  constructor(private sensorRepository: ISensorRepository) {}

  async execute(data: CreateSensorReadingDTO): Promise<void> {
    try {
      const reading = await this.sensorRepository.create(data);
      logger.info(
        `✅ Stored sensor reading: ${reading.id} | Moisture: ${reading.moisture}% | pH: ${reading.ph} | Temp: ${reading.temperature}°C`
      );
    } catch (error: any) {
      logger.error(`Failed to store sensor reading: ${error.message}`);
      throw error;
    }
  }
}
