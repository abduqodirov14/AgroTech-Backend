"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreSensorReadingUseCase = void 0;
const logger_1 = require("../../utils/logger");
class StoreSensorReadingUseCase {
    sensorRepository;
    constructor(sensorRepository) {
        this.sensorRepository = sensorRepository;
    }
    async execute(data) {
        try {
            const reading = await this.sensorRepository.create(data);
            logger_1.logger.info(`✅ Stored sensor reading: ${reading.id} | Moisture: ${reading.moisture}% | pH: ${reading.ph} | Temp: ${reading.temperature}°C`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to store sensor reading: ${error.message}`);
            throw error;
        }
    }
}
exports.StoreSensorReadingUseCase = StoreSensorReadingUseCase;
