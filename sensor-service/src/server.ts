import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { SensorRepository } from './infrastructure/repositories/SensorRepository';
import { StoreSensorReadingUseCase } from './application/usecases/StoreSensorReadingUseCase';
import { MqttSubscriber } from './infrastructure/mqtt/MqttSubscriber';

const sensorRepository = new SensorRepository();
const storeSensorReadingUseCase = new StoreSensorReadingUseCase(sensorRepository);
const mqttSubscriber = new MqttSubscriber(storeSensorReadingUseCase);

const server = app.listen(config.port, () => {
  logger.info(`🚀 Sensor Service running on port ${config.port}`);
  logger.info(`📊 API available at http://localhost:${config.port}/api/v1/sensors`);
  logger.info(`🔌 MQTT Broker: ${config.mqtt.broker}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  mqttSubscriber.disconnect();
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  mqttSubscriber.disconnect();
  server.close(() => {
    logger.info('HTTP server closed');
  });
  process.exit(0);
});
