import http from 'http';
import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { createSocketServer } from './socket';
import { SensorRepository } from './infrastructure/repositories/SensorRepository';
import { MqttSubscriber } from './infrastructure/mqtt/MqttSubscriber';
import { AlertEngine } from './services/alertEngine';
import prisma from './infrastructure/database/prismaClient';

console.log('[DEBUG] config.port:', config.port);
console.log('[DEBUG] process.env.PORT:', process.env.PORT);

const server = http.createServer(app);

const io = createSocketServer(server);
app.set('io', io);

let mqttSubscriber: MqttSubscriber | null = null;
const alertEngine = new AlertEngine();

server.listen(config.port, () => {
  logger.info(`Sensor Service running on port ${config.port}`);

  try {
    const sensorRepo = new SensorRepository();
    mqttSubscriber = new MqttSubscriber(sensorRepo, io);
    logger.info('MQTT subscriber started');
  } catch (err: any) {
    logger.warn(`MQTT subscriber failed to start: ${err.message}`);
  }

  try {
    alertEngine.start();
  } catch (err: any) {
    logger.error(`Alert Engine failed to start: ${err.message}`);
  }
});

const shutdown = () => {
  logger.info('Shutting down sensor service');
  mqttSubscriber?.disconnect();
  alertEngine.stop();
  prisma.$disconnect().finally(() => {
    server.close(() => process.exit(0));
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
