import mqtt, { MqttClient } from 'mqtt';
import { Server } from 'socket.io';
import { SensorRepository } from '../repositories/SensorRepository';
import prisma from '../database/prismaClient';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';

export class MqttSubscriber {
  private client: MqttClient;

  constructor(
    private sensorRepository: SensorRepository,
    private io?: Server
  ) {
    this.client = mqtt.connect(config.mqtt.broker, {
      clientId: `sensor_service_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info(`Connected to MQTT Broker: ${config.mqtt.broker}`);
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
        logger.info(`Subscribed to topic: ${config.mqtt.topic}`);
      }
    });
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const payload = JSON.parse(message.toString());
      logger.info(`MQTT message from ${topic}`, { deviceMac: payload.device_mac });

      const deviceMac = payload.device_mac || payload.deviceMac;
      if (!deviceMac) {
        logger.warn('MQTT payload missing device_mac');
        return;
      }

      const device = await prisma.device.findUnique({ where: { macAddress: deviceMac } });
      if (!device) {
        logger.warn(`Unknown device MAC: ${deviceMac}`);
        return;
      }

      const data: Record<string, number> = {};
      const readings = payload.readings || [];

      for (const r of readings) {
        switch (r.type) {
          case 'soil_moisture':
          case 'soil_moisture_shallow':
          case 'soil_moisture_deep':
            data.moisture = r.value;
            break;
          case 'soil_temperature':
          case 'air_temperature':
            data.temperature = r.value;
            break;
          case 'ph':
            data.ph = r.value;
            break;
          case 'ec':
            data.ec = r.value;
            break;
          case 'battery':
            data.battery = r.value;
            break;
          case 'npk':
            data.npk = r.value;
            break;
        }
      }

      if (payload.data) {
        if (payload.data.soilMoisture != null) data.moisture = payload.data.soilMoisture;
        if (payload.data.temperature != null) data.temperature = payload.data.temperature;
        if (payload.data.pH != null) data.ph = payload.data.pH;
      }

      const reading = await this.sensorRepository.create({
        deviceId: device.id,
        moisture: data.moisture,
        temperature: data.temperature,
        ph: data.ph,
        ec: data.ec,
        npk: data.npk,
        battery: data.battery,
      });

      await prisma.device.update({
        where: { id: device.id },
        data: { status: 'ONLINE' },
      });

      if (this.io) {
        this.io.to(`device:${device.id}`).emit('sensor:update', {
          deviceId: device.id,
          readings: [reading],
        });
      }
    } catch (error: any) {
      logger.error(`Failed to process MQTT message: ${error.message}`);
    }
  }

  disconnect(): void {
    this.client.end();
    logger.info('MQTT client disconnected');
  }
}
