"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttSubscriber = void 0;
const mqtt_1 = __importDefault(require("mqtt"));
const prismaClient_1 = __importDefault(require("../database/prismaClient"));
const logger_1 = require("../../utils/logger");
const env_1 = require("../../config/env");
class MqttSubscriber {
    sensorRepository;
    io;
    client;
    constructor(sensorRepository, io) {
        this.sensorRepository = sensorRepository;
        this.io = io;
        this.client = mqtt_1.default.connect(env_1.config.mqtt.broker, {
            clientId: `sensor_service_${Math.random().toString(16).slice(2, 10)}`,
            clean: true,
            reconnectPeriod: 1000,
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('connect', () => {
            logger_1.logger.info(`Connected to MQTT Broker: ${env_1.config.mqtt.broker}`);
            this.subscribe();
        });
        this.client.on('message', async (topic, message) => {
            await this.handleMessage(topic, message);
        });
        this.client.on('error', (err) => {
            logger_1.logger.error(`MQTT connection error: ${err.message}`);
        });
        this.client.on('close', () => {
            logger_1.logger.warn('MQTT connection closed');
        });
    }
    subscribe() {
        this.client.subscribe(env_1.config.mqtt.topic, { qos: 1 }, (err) => {
            if (err) {
                logger_1.logger.error(`Failed to subscribe to topic: ${env_1.config.mqtt.topic}`);
            }
            else {
                logger_1.logger.info(`Subscribed to topic: ${env_1.config.mqtt.topic}`);
            }
        });
    }
    async handleMessage(topic, message) {
        try {
            const payload = JSON.parse(message.toString());
            logger_1.logger.info(`MQTT message from ${topic}`, { deviceMac: payload.device_mac });
            const deviceMac = payload.device_mac || payload.deviceMac;
            if (!deviceMac) {
                logger_1.logger.warn('MQTT payload missing device_mac');
                return;
            }
            const device = await prismaClient_1.default.device.findUnique({ where: { macAddress: deviceMac } });
            if (!device) {
                logger_1.logger.warn(`Unknown device MAC: ${deviceMac}`);
                return;
            }
            const data = {};
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
                if (payload.data.soilMoisture != null)
                    data.moisture = payload.data.soilMoisture;
                if (payload.data.temperature != null)
                    data.temperature = payload.data.temperature;
                if (payload.data.pH != null)
                    data.ph = payload.data.pH;
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
            await prismaClient_1.default.device.update({
                where: { id: device.id },
                data: { status: 'ONLINE' },
            });
            if (this.io) {
                this.io.to(`device:${device.id}`).emit('sensor:update', {
                    deviceId: device.id,
                    readings: [reading],
                });
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to process MQTT message: ${error.message}`);
        }
    }
    disconnect() {
        this.client.end();
        logger_1.logger.info('MQTT client disconnected');
    }
}
exports.MqttSubscriber = MqttSubscriber;
