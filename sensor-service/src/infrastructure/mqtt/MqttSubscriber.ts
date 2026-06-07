import mqtt, { MqttClient } from 'mqtt';
import { StoreSensorReadingUseCase } from '../../application/usecases/StoreSensorReadingUseCase';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';

export class MqttSubscriber {
  private client: MqttClient;
  private storeSensorReadingUseCase: StoreSensorReadingUseCase;

  constructor(storeSensorReadingUseCase: StoreSensorReadingUseCase) {
    this.storeSensorReadingUseCase = storeSensorReadingUseCase;
    this.client = mqtt.connect(config.mqtt.broker, {
      clientId: `sensor_service_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info(`✅ Connected to MQTT Broker: ${config.mqtt.broker}`);
      this.subscribe();
    });

    this.client.on('message', async (topic, message) => {
      await this.handleMessage(topic, message);
    });

    this.client.on('error', (err) => {
      logger.error(`MQTT connection error: ${err.message}`);
    });

    this.client.on('close', () => {
      logger.warn('MQTT connection closed');
    });
  }

  private subscribe(): void {
    this.client.subscribe(config.mqtt.topic, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`Failed to subscribe to topic: ${config.mqtt.topic}`);
      } else {
        logger.info(`👂 Subscribed to topic: ${config.mqtt.topic}`);
      }
    });
  }

  private async handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      logger.info(`📨 Received message from ${topic}`);

      await this.storeSensorReadingUseCase.execute({
        sensorId: payload.sensorId,
        soilMoisture: payload.data.soilMoisture,
        pH: payload.data.pH,
        temperature: payload.data.temperature,
        valveState: payload.data.valveState,
        timestamp: new Date(payload.timestamp),
      });
    } catch (error: any) {
      logger.error(`Failed to process MQTT message: ${error.message}`);
    }
  }

  disconnect(): void {
    this.client.end();
    logger.info('MQTT client disconnected');
  }
}
