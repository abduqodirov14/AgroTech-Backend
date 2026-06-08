"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttPublisher = void 0;
const mqtt_1 = __importDefault(require("mqtt"));
const logger_1 = require("../../utils/logger");
const env_1 = require("../../config/env");
class MqttPublisher {
    client;
    isConnected = false;
    constructor() {
        this.client = mqtt_1.default.connect(env_1.config.mqtt.broker, {
            clientId: `irrigation_service_${Math.random().toString(16).slice(2, 10)}`,
            clean: true,
            reconnectPeriod: 1000,
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('connect', () => {
            this.isConnected = true;
            logger_1.logger.info(`✅ Connected to MQTT Broker: ${env_1.config.mqtt.broker}`);
        });
        this.client.on('error', (err) => {
            logger_1.logger.error(`MQTT connection error: ${err.message}`);
            this.isConnected = false;
        });
        this.client.on('close', () => {
            this.isConnected = false;
            logger_1.logger.warn('MQTT connection closed');
        });
    }
    async publishCommand(command) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('MQTT client not connected'));
                return;
            }
            this.client.publish(env_1.config.mqtt.commandTopic, command, { qos: 1 }, (err) => {
                if (err) {
                    logger_1.logger.error(`Failed to publish command: ${err.message}`);
                    reject(err);
                }
                else {
                    logger_1.logger.info(`📤 Published command: ${command} to topic: ${env_1.config.mqtt.commandTopic}`);
                    resolve();
                }
            });
        });
    }
    disconnect() {
        this.client.end();
        logger_1.logger.info('MQTT client disconnected');
    }
}
exports.MqttPublisher = MqttPublisher;
