import mqtt, { MqttClient } from 'mqtt';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';

export class MqttPublisher {
  private client: MqttClient;
  private isConnected: boolean = false;

  constructor() {
    this.client = mqtt.connect(config.mqtt.broker, {
      clientId: `irrigation_service_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info(`✅ Connected to MQTT Broker: ${config.mqtt.broker}`);
    });

    this.client.on('error', (err) => {
      logger.error(`MQTT connection error: ${err.message}`);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('MQTT connection closed');
    });
  }

  async publishCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      this.client.publish(
        config.mqtt.commandTopic,
        command,
        { qos: 1 },
        (err) => {
          if (err) {
            logger.error(`Failed to publish command: ${err.message}`);
            reject(err);
          } else {
            logger.info(`📤 Published command: ${command} to topic: ${config.mqtt.commandTopic}`);
            resolve();
          }
        }
      );
    });
  }

  disconnect(): void {
    this.client.end();
    logger.info('MQTT client disconnected');
  }
}
