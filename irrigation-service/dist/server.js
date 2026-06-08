"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const server = app_1.default.listen(env_1.config.port, () => {
    logger_1.logger.info(`🚀 Irrigation Service running on port ${env_1.config.port}`);
    logger_1.logger.info(`📊 API available at http://localhost:${env_1.config.port}/api/v1/irrigation`);
    logger_1.logger.info(`🔌 MQTT Broker: ${env_1.config.mqtt.broker}`);
});
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger_1.logger.info('HTTP server closed');
    });
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger_1.logger.info('HTTP server closed');
    });
    process.exit(0);
});
