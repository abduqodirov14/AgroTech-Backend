"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const socket_1 = require("./socket");
const SensorRepository_1 = require("./infrastructure/repositories/SensorRepository");
const MqttSubscriber_1 = require("./infrastructure/mqtt/MqttSubscriber");
const alertEngine_1 = require("./services/alertEngine");
const server = http_1.default.createServer(app_1.default);
const io = (0, socket_1.createSocketServer)(server);
app_1.default.set('io', io);
let mqttSubscriber = null;
const alertEngine = new alertEngine_1.AlertEngine();
server.listen(env_1.config.port, () => {
    logger_1.logger.info(`Sensor Service running on port ${env_1.config.port}`);
    try {
        const sensorRepo = new SensorRepository_1.SensorRepository();
        mqttSubscriber = new MqttSubscriber_1.MqttSubscriber(sensorRepo, io);
        logger_1.logger.info('MQTT subscriber started');
    }
    catch (err) {
        logger_1.logger.warn(`MQTT subscriber failed to start: ${err.message}`);
    }
    try {
        alertEngine.start();
    }
    catch (err) {
        logger_1.logger.error(`Alert Engine failed to start: ${err.message}`);
    }
});
const shutdown = () => {
    logger_1.logger.info('Shutting down sensor service');
    mqttSubscriber?.disconnect();
    alertEngine.stop();
    server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
